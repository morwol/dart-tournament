const express = require('express');
const { db } = require('../db/db');
const { verifyToken, requireAdmin, requireAdminOrDirector } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');
const { auditLog } = require('../lib/auditLog');

const router = express.Router();

// GET /api/tournaments
router.get('/', (req, res) => {
  const tournaments = db.prepare('SELECT * FROM tournaments ORDER BY created_at DESC').all();
  res.json(tournaments);
});

// POST /api/tournaments (Admin)
router.post('/', verifyToken, requireFields(['name', 'format', 'checkout']), (req, res) => {
  const { name, date, format, checkout, use_seed } = req.body;

  if (!['501', '301'].includes(format)) {
    return res.status(400).json({ error: 'Format must be 501 or 301' });
  }
  if (!['single_out', 'double_out'].includes(checkout)) {
    return res.status(400).json({ error: 'Checkout must be single_out or double_out' });
  }

  const useSeedValue = use_seed ? 1 : 0;

  const result = db.prepare(
    'INSERT INTO tournaments (name, date, format, checkout, use_seed) VALUES (?, ?, ?, ?, ?)'
  ).run(name, date || null, format, checkout, useSeedValue);

  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(result.lastInsertRowid);
  auditLog(req, 'tournament', 'CREATE', `Turnier "${name}" angelegt`, tournament.id);
  res.status(201).json(tournament);
});

// GET /api/tournaments/active — Aktives Turnier
router.get('/active', (req, res) => {
  const tournament = db.prepare("SELECT * FROM tournaments WHERE status = 'active' ORDER BY created_at DESC LIMIT 1").get();
  if (!tournament) return res.json(null);
  const games = db.prepare(`
    SELECT g.*, p1.name as player1_name, p2.name as player2_name, w.name as winner_name
    FROM games g
    LEFT JOIN players p1 ON g.player1_id = p1.id
    LEFT JOIN players p2 ON g.player2_id = p2.id
    LEFT JOIN players w ON g.winner_id = w.id
    WHERE g.tournament_id = ? ORDER BY g.round, g.id
  `).all(tournament.id);
  const players = db.prepare(`
    SELECT p.*, tr.seed, tr.registered_at as registered_at
    FROM players p JOIN tournament_registrations tr ON tr.player_id = p.id
    WHERE tr.tournament_id = ? ORDER BY tr.seed, tr.registered_at
  `).all(tournament.id);
  res.json({ ...tournament, games, players });
});

// GET /api/tournaments/:id
router.get('/:id', (req, res) => {
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }

  const games = db.prepare(`
    SELECT g.*,
      p1.name as player1_name,
      p2.name as player2_name,
      w.name as winner_name
    FROM games g
    LEFT JOIN players p1 ON g.player1_id = p1.id
    LEFT JOIN players p2 ON g.player2_id = p2.id
    LEFT JOIN players w ON g.winner_id = w.id
    WHERE g.tournament_id = ?
    ORDER BY g.round, g.id
  `).all(req.params.id);

  const players = db.prepare(`
    SELECT p.*, tr.seed, tr.registered_at as registered_at
    FROM players p JOIN tournament_registrations tr ON tr.player_id = p.id
    WHERE tr.tournament_id = ? ORDER BY tr.seed, tr.registered_at
  `).all(req.params.id);

  res.json({ ...tournament, games, players });
});

// NEU: PUT /api/tournaments/:id — Turnier-Konfiguration speichern (Admin)
router.put('/:id', verifyToken, (req, res) => {
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  const allowed = ['prelim_format','prelim_legs','qf_format','qf_legs','sf_format','sf_legs','final_format','final_legs','board_count','name','date','use_seed'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

  const setClauses = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), req.params.id];
  db.prepare(`UPDATE tournaments SET ${setClauses} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  return res.json(updated);
});

// PUT /api/tournaments/:id/start (Admin)
router.put('/:id/start', verifyToken, (req, res) => {
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: 'Tournament not found' });
  }
  if (tournament.status !== 'open') {
    return res.status(400).json({ error: 'Tournament is not in open status' });
  }

  const players = db.prepare(`
    SELECT p.*, tr.seed FROM players p
    JOIN tournament_registrations tr ON tr.player_id = p.id
    WHERE tr.tournament_id = ? ORDER BY tr.seed, tr.registered_at
  `).all(req.params.id);

  if (players.length < 2) {
    return res.status(400).json({ error: 'Need at least 2 players to start' });
  }

  // Shuffle players (Fisher-Yates) — unless they have seeds
  const hasSeeds = players.some(p => p.seed !== null);
  const ordered = hasSeeds
    ? [...players].sort((a, b) => (a.seed || 999) - (b.seed || 999))
    : shuffleArray([...players]);

  // Pad to next power of 2 for proper bracket
  const bracketSize = nextPowerOf2(ordered.length);
  while (ordered.length < bracketSize) {
    ordered.push(null); // bye
  }

  const startScore = parseInt(tournament.format, 10);

  // Create round 1 games
  const insertGame = db.prepare(
    'INSERT INTO games (tournament_id, round, player1_id, player2_id, status, start_score) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const createBracket = db.transaction(() => {
    db.prepare('UPDATE tournaments SET status = ? WHERE id = ?').run('active', req.params.id);

    const round1Games = [];
    for (let i = 0; i < ordered.length; i += 2) {
      const p1 = ordered[i];
      const p2 = ordered[i + 1];

      if (p1 && p2) {
        const result = insertGame.run(req.params.id, 1, p1.id, p2.id, 'pending', startScore);
        round1Games.push(result.lastInsertRowid);
      } else if (p1) {
        // Bye — p1 auto-advances, create game as finished
        const result = insertGame.run(req.params.id, 1, p1.id, null, 'finished', startScore);
        db.prepare('UPDATE games SET winner_id = ? WHERE id = ?').run(p1.id, result.lastInsertRowid);
        round1Games.push(result.lastInsertRowid);
      }
    }

    // Create placeholder games for subsequent rounds
    let previousRoundGames = round1Games.length;
    let round = 2;
    while (previousRoundGames > 1) {
      const gamesInRound = Math.floor(previousRoundGames / 2);
      for (let i = 0; i < gamesInRound; i++) {
        insertGame.run(req.params.id, round, null, null, 'pending', startScore);
      }
      previousRoundGames = gamesInRound;
      round++;
    }
  });

  createBracket();

  const updatedTournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  const games = db.prepare('SELECT * FROM games WHERE tournament_id = ? ORDER BY round, id').all(req.params.id);
  auditLog(req, 'tournament', 'START', `Turnier "${updatedTournament.name}" gestartet (${games.length} Spiele)`, updatedTournament.id);
  res.json({ ...updatedTournament, games });
});

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function nextPowerOf2(n) {
  let power = 1;
  while (power < n) power *= 2;
  return power;
}

// DELETE /api/tournaments/:id (Admin) — Turnier und alle Daten löschen
router.delete('/:id', requireAdmin, (req, res) => {
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  const deleteTx = db.transaction(() => {
    const games = db.prepare('SELECT id FROM games WHERE tournament_id = ?').all(req.params.id);
    for (const game of games) {
      db.prepare('DELETE FROM schedule WHERE game_id = ?').run(game.id);
      db.prepare('DELETE FROM throws WHERE game_id = ?').run(game.id);
    }
    db.prepare('DELETE FROM games WHERE tournament_id = ?').run(req.params.id);
    const groups = db.prepare('SELECT id FROM groups WHERE tournament_id = ?').all(req.params.id);
    for (const g of groups) {
      db.prepare('DELETE FROM group_players WHERE group_id = ?').run(g.id);
    }
    db.prepare('DELETE FROM groups WHERE tournament_id = ?').run(req.params.id);
    db.prepare('DELETE FROM tournament_registrations WHERE tournament_id = ?').run(req.params.id);
    db.prepare('DELETE FROM boards WHERE tournament_id = ?').run(req.params.id);
    db.prepare('DELETE FROM tournaments WHERE id = ?').run(req.params.id);
  });

  deleteTx();
  auditLog(req, 'tournament', 'DELETE', `Turnier "${tournament.name}" gelöscht`, tournament.id);
  res.json({ success: true });
});

// NEU: Automatische Gruppenauslosung
router.post('/:id/draw-groups', requireAdminOrDirector, (req, res) => {
  try {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
    if (tournament.group_draw_done) return res.status(400).json({ error: 'Group draw already done' });

    const players = db.prepare(`
      SELECT p.*, tr.seed FROM players p
      JOIN tournament_registrations tr ON tr.player_id = p.id
      WHERE tr.tournament_id = ? ORDER BY tr.seed ASC, tr.registered_at ASC
    `).all(req.params.id);

    if (players.length < 4) return res.status(400).json({ error: 'Need at least 4 players for group draw' });

    // Gruppenanzahl bestimmen
    let numGroups;
    if (req.body.numGroups !== undefined) {
      const requested = parseInt(req.body.numGroups, 10);
      if (!Number.isInteger(requested) || requested < 2 || requested > 8) {
        return res.status(400).json({ error: 'numGroups must be an integer between 2 and 8' });
      }
      if (requested > Math.floor(players.length / 2)) {
        return res.status(400).json({ error: `numGroups too large for ${players.length} players (max ${Math.floor(players.length / 2)})` });
      }
      numGroups = requested;
    } else {
      // Fallback: automatische Berechnung
      if (players.length <= 7) numGroups = 2;
      else if (players.length <= 15) numGroups = 4;
      else numGroups = 8;
    }

    // Gruppennamen: A, B, C, ...
    const groupNames = Array.from({ length: numGroups }, (_, i) => String.fromCharCode(65 + i));

    // Determine draw order based on tournament.use_seed setting
    let orderedPlayers;
    if (tournament.use_seed) {
      // Seed-aware draw: sort by seed (nulls last), then snake-draft across groups
      orderedPlayers = [...players].sort((a, b) => {
        if (a.seed == null && b.seed == null) return 0;
        if (a.seed == null) return 1;
        if (b.seed == null) return -1;
        return a.seed - b.seed;
      });
    } else {
      // Completely random draw: Fisher-Yates shuffle
      orderedPlayers = [...players];
      for (let i = orderedPlayers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [orderedPlayers[i], orderedPlayers[j]] = [orderedPlayers[j], orderedPlayers[i]];
      }
    }

    const drawTransaction = db.transaction(() => {
      // Gruppen anlegen
      const groupIds = [];
      for (const name of groupNames) {
        const result = db.prepare(
          'INSERT INTO groups (tournament_id, name) VALUES (?, ?)'
        ).run(req.params.id, name);
        groupIds.push(result.lastInsertRowid);
      }

      // Snake-draft distribution: 1->A, 2->B, ..., N->N, N+1->N (reverse), ...
      // Ensures top seeds (or random players) spread across different groups
      let direction = 1; // 1 = forward, -1 = backward
      let groupIndex = 0;
      for (const player of orderedPlayers) {
        db.prepare(
          'INSERT INTO group_players (group_id, player_id) VALUES (?, ?)'
        ).run(groupIds[groupIndex], player.id);

        // Advance to next group (snake direction)
        if (direction === 1) {
          if (groupIndex >= numGroups - 1) {
            direction = -1;
          } else {
            groupIndex++;
          }
        } else {
          if (groupIndex <= 0) {
            direction = 1;
          } else {
            groupIndex--;
          }
        }
      }

      // group_draw_done setzen
      db.prepare('UPDATE tournaments SET group_draw_done = 1 WHERE id = ?').run(req.params.id);
    });

    drawTransaction();

    // Gruppen mit Spielern zurueckgeben
    const groups = db.prepare('SELECT * FROM groups WHERE tournament_id = ?').all(req.params.id);
    const result = groups.map(g => {
      const groupPlayers = db.prepare(`
        SELECT p.*, tr.seed FROM players p
        JOIN group_players gp ON gp.player_id = p.id
        JOIN tournament_registrations tr ON tr.player_id = p.id AND tr.tournament_id = ?
        WHERE gp.group_id = ?
        ORDER BY tr.seed ASC
      `).all(req.params.id, g.id);
      return { ...g, players: groupPlayers };
    });

    return res.json({ groups: result, num_groups: numGroups });
  } catch (err) {
    console.error('[tournaments]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEU: Gruppen anzeigen
router.get('/:id/groups', (req, res) => {
  try {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const groups = db.prepare('SELECT * FROM groups WHERE tournament_id = ? ORDER BY name').all(req.params.id);
    const result = groups.map(g => {
      const standings = db.prepare(`
        SELECT p.id, p.name, tr.seed,
          COALESCE((SELECT COUNT(*) FROM games WHERE tournament_id = ? AND round = 0 AND winner_id = p.id), 0) as wins,
          COALESCE((SELECT COUNT(*) FROM games WHERE tournament_id = ? AND round = 0 AND status = 'finished'
            AND (player1_id = p.id OR player2_id = p.id) AND winner_id != p.id), 0) as losses
        FROM players p
        JOIN group_players gp ON gp.player_id = p.id
        JOIN tournament_registrations tr ON tr.player_id = p.id AND tr.tournament_id = ?
        WHERE gp.group_id = ?
        ORDER BY wins DESC, tr.seed ASC, p.name ASC
      `).all(tournament.id, tournament.id, tournament.id, g.id).map(p => ({ ...p, points: p.wins * 2 }));
      return { ...g, standings };
    });

    return res.json({ groups: result, group_draw_done: !!tournament.group_draw_done });
  } catch (err) {
    console.error('[tournaments]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEU: Gruppe einer Scheibe zuordnen
router.put('/:id/groups/:groupId/board', requireAdminOrDirector, (req, res) => {
  const { board_id } = req.body;
  db.prepare('UPDATE groups SET board_id = ? WHERE id = ? AND tournament_id = ?').run(board_id || null, req.params.groupId, req.params.id);
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.groupId);
  res.json(group);
});

// AUTO: Boards einlosen + Round-Robin Spielplan generieren
router.post('/:id/generate-group-schedule', requireAdminOrDirector, (req, res) => {
  try {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
    if (!tournament.group_draw_done) return res.status(400).json({ error: 'Group draw must be done first' });

    const groups = db.prepare('SELECT * FROM groups WHERE tournament_id = ? ORDER BY name').all(req.params.id);
    if (groups.length === 0) return res.status(400).json({ error: 'No groups found' });

    const groupsWithPlayers = groups.map(g => ({
      ...g,
      players: db.prepare(`
        SELECT p.*, tr.seed FROM players p
        JOIN group_players gp ON gp.player_id = p.id
        JOIN tournament_registrations tr ON tr.player_id = p.id AND tr.tournament_id = ?
        WHERE gp.group_id = ? ORDER BY p.id ASC
      `).all(req.params.id, g.id)
    }));

    let boards = db.prepare('SELECT * FROM boards WHERE tournament_id = ? ORDER BY number').all(req.params.id);
    if (boards.length === 0) {
      const count = tournament.board_count || 1;
      for (let i = 1; i <= count; i++) {
        db.prepare('INSERT INTO boards (number, tournament_id) VALUES (?, ?)').run(i, req.params.id);
      }
      boards = db.prepare('SELECT * FROM boards WHERE tournament_id = ? ORDER BY number').all(req.params.id);
    }

    // Randomly shuffle boards for the draw
    const shuffled = [...boards].sort(() => Math.random() - 0.5);

    // Assign one board per group (wrap around if fewer boards than groups)
    const groupBoardAssignments = {}; // groupId -> boardId
    groupsWithPlayers.forEach((g, i) => {
      groupBoardAssignments[g.id] = shuffled[i % shuffled.length].id;
    });

    // Persist board assignments on groups
    for (const [gid, bid] of Object.entries(groupBoardAssignments)) {
      db.prepare('UPDATE groups SET board_id = ? WHERE id = ?').run(bid, gid);
    }

    // Circle-method round-robin generator
    // Returns array of rounds; each round = array of [p1, p2] pairs
    function roundRobin(players) {
      const list = [...players];
      if (list.length % 2 !== 0) list.push(null); // bye player
      const total = list.length;
      const fixed = list[0];
      const rotating = list.slice(1);
      const rounds = [];
      for (let r = 0; r < total - 1; r++) {
        const round = [];
        if (fixed && rotating[0]) round.push([fixed, rotating[0]]);
        for (let i = 1; i < total / 2; i++) {
          const a = rotating[rotating.length - i];
          const b = rotating[i];
          if (a && b) round.push([a, b]);
        }
        rounds.push(round);
        // Rotate: move last element to front
        rotating.unshift(rotating.pop());
      }
      return rounds;
    }

    // Build per-board game list: collect rounds from each group on that board,
    // then interleave by round so all round-1 games come before round-2 etc.
    // This ensures players get rest between their matches.
    const boardRoundMap = {}; // boardId -> { roundIndex -> [[p1,p2]...] }
    for (const group of groupsWithPlayers) {
      const boardId = groupBoardAssignments[group.id];
      if (!boardRoundMap[boardId]) boardRoundMap[boardId] = {};
      const rounds = roundRobin(group.players);
      rounds.forEach((pairs, ri) => {
        if (!boardRoundMap[boardId][ri]) boardRoundMap[boardId][ri] = [];
        boardRoundMap[boardId][ri].push(...pairs);
      });
    }

    // Flatten each board's games in round order
    const boardGameList = {}; // boardId -> [[p1,p2], ...]
    for (const [boardId, roundMap] of Object.entries(boardRoundMap)) {
      boardGameList[boardId] = [];
      const roundIndices = Object.keys(roundMap).map(Number).sort((a, b) => a - b);
      for (const ri of roundIndices) {
        boardGameList[boardId].push(...roundMap[ri]);
      }
    }

    // Delete any existing group-phase games (round = 0) for this tournament
    const existingGroupGames = db.prepare('SELECT id FROM games WHERE tournament_id = ? AND round = 0').all(req.params.id);
    for (const g of existingGroupGames) {
      db.prepare('DELETE FROM schedule WHERE game_id = ?').run(g.id);
      db.prepare('DELETE FROM throws WHERE game_id = ?').run(g.id);
      db.prepare('DELETE FROM games WHERE id = ?').run(g.id);
    }

    const startScore = parseInt(tournament.format) || 501;
    let totalCreated = 0;

    const insertGames = db.transaction(() => {
      for (const [boardId, pairs] of Object.entries(boardGameList)) {
        for (const [p1, p2] of pairs) {
          const gameResult = db.prepare(
            'INSERT INTO games (tournament_id, round, player1_id, player2_id, start_score, board_id, status) VALUES (?, 0, ?, ?, ?, ?, ?)'
          ).run(req.params.id, p1.id, p2.id, startScore, parseInt(boardId), 'pending');

          db.prepare(
            'INSERT INTO schedule (tournament_id, game_id, board_id, scheduled_at, status) VALUES (?, ?, ?, ?, ?)'
          ).run(req.params.id, gameResult.lastInsertRowid, parseInt(boardId), null, 'scheduled');

          totalCreated++;
        }
      }
      // Set tournament to active
      db.prepare("UPDATE tournaments SET status = 'active' WHERE id = ?").run(req.params.id);
    });

    insertGames();

    return res.json({
      success: true,
      games_created: totalCreated,
      board_assignments: groupBoardAssignments,
    });
  } catch (err) {
    console.error('[tournaments]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEU: KO-Bracket aus Gruppenphase generieren
router.post('/:id/generate-bracket', requireAdminOrDirector, (req, res) => {
  try {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
    if (!tournament.group_draw_done) return res.status(400).json({ error: 'Group draw must be done first' });

    // Erwarte qualifizierte Spieler pro Gruppe im Body, oder nimm Top 2 aus jeder Gruppe
    const { qualifiers_per_group } = req.body;
    const qPerGroup = qualifiers_per_group || 2;

    const groups = db.prepare('SELECT * FROM groups WHERE tournament_id = ? ORDER BY name').all(req.params.id);

    // Fuer jede Gruppe: Spiele zaehlen (Siege) um Rangliste zu bestimmen
    // Alternativ: req.body.qualified_players als explizite Liste
    let bracketPlayers = [];

    if (req.body.qualified_players && Array.isArray(req.body.qualified_players)) {
      // Explizite Liste der qualifizierten Spieler
      bracketPlayers = req.body.qualified_players;
    } else {
      // Automatisch: Top N jeder Gruppe nach Siegen
      for (const group of groups) {
        const players = db.prepare(`
          SELECT p.id, p.name, tr.seed,
            (SELECT COUNT(*) FROM games g WHERE g.winner_id = p.id AND g.tournament_id = ?) as wins
          FROM players p
          JOIN group_players gp ON gp.player_id = p.id
          JOIN tournament_registrations tr ON tr.player_id = p.id AND tr.tournament_id = ?
          WHERE gp.group_id = ?
          ORDER BY wins DESC, tr.seed ASC
          LIMIT ?
        `).all(req.params.id, req.params.id, group.id, qPerGroup);
        bracketPlayers.push(...players.map(p => p.id));
      }
    }

    if (bracketPlayers.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 qualified players for bracket' });
    }

    const startScore = parseInt(tournament.format, 10);
    const bracketSize = nextPowerOf2(bracketPlayers.length);

    // Pad mit null (byes)
    while (bracketPlayers.length < bracketSize) {
      bracketPlayers.push(null);
    }

    const insertGame = db.prepare(
      'INSERT INTO games (tournament_id, round, player1_id, player2_id, status, start_score) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const generateTransaction = db.transaction(() => {
      // Status auf active setzen
      db.prepare("UPDATE tournaments SET status = 'active' WHERE id = ?").run(req.params.id);

      const round1Games = [];
      for (let i = 0; i < bracketPlayers.length; i += 2) {
        const p1 = bracketPlayers[i];
        const p2 = bracketPlayers[i + 1];

        if (p1 && p2) {
          const result = insertGame.run(req.params.id, 1, p1, p2, 'pending', startScore);
          round1Games.push(result.lastInsertRowid);
        } else if (p1) {
          const result = insertGame.run(req.params.id, 1, p1, null, 'finished', startScore);
          db.prepare('UPDATE games SET winner_id = ? WHERE id = ?').run(p1, result.lastInsertRowid);
          round1Games.push(result.lastInsertRowid);
        }
      }

      // Platzhalter fuer weitere Runden
      let previousRoundGames = round1Games.length;
      let round = 2;
      while (previousRoundGames > 1) {
        const gamesInRound = Math.floor(previousRoundGames / 2);
        for (let i = 0; i < gamesInRound; i++) {
          insertGame.run(req.params.id, round, null, null, 'pending', startScore);
        }
        previousRoundGames = gamesInRound;
        round++;
      }
    });

    generateTransaction();

    const games = db.prepare('SELECT * FROM games WHERE tournament_id = ? ORDER BY round, id').all(req.params.id);
    return res.json({ bracket_size: bracketSize, players: bracketPlayers.length, games });
  } catch (err) {
    console.error('[tournaments]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEU: Turnier abschliessen (locked = 1)
router.put('/:id/lock', requireAdminOrDirector, (req, res) => {
  try {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    db.prepare('UPDATE tournaments SET locked = 1 WHERE id = ?').run(req.params.id);

    const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    auditLog(req, 'tournament', 'LOCK', `Turnier "${tournament.name}" abgeschlossen`, tournament.id);
    return res.json(updated);
  } catch (err) {
    console.error('[tournaments]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tournaments/:id/reset — Turnier auf open zurücksetzen (Gruppen + Spiele löschen)
router.post('/:id/reset', requireAdmin, (req, res) => {
  try {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const resetTx = db.transaction(() => {
      const games = db.prepare('SELECT id FROM games WHERE tournament_id = ?').all(req.params.id);
      for (const g of games) db.prepare('DELETE FROM throws WHERE game_id = ?').run(g.id);
      db.prepare('DELETE FROM games WHERE tournament_id = ?').run(req.params.id);
      const groups = db.prepare('SELECT id FROM groups WHERE tournament_id = ?').all(req.params.id);
      for (const g of groups) db.prepare('DELETE FROM group_players WHERE group_id = ?').run(g.id);
      db.prepare('DELETE FROM groups WHERE tournament_id = ?').run(req.params.id);
      db.prepare("UPDATE tournaments SET status = 'open', group_draw_done = 0, locked = 0 WHERE id = ?").run(req.params.id);
    });
    resetTx();

    const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
    return res.json(updated);
  } catch (err) {
    console.error('[tournaments]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEU: Mock-Turnier mit Fake-Spielern befüllen und starten
router.post('/:id/mock', requireAdmin, (req, res) => {
  const count = parseInt(req.body.player_count) || 8;
  if (isNaN(count) || count < 2 || count > 64) {
    return res.status(400).json({ error: 'player_count muss zwischen 2 und 64 liegen' });
  }

  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  const firstNames = ['Max','Anna','Tom','Lisa','Peter','Sara','Klaus','Maria','Jan','Eva','Felix','Julia','Hans','Laura','Markus','Sandra','Paul','Nina','Stefan','Karin','Tim','Monika','Frank','Petra','Alex','Susanne','David','Claudia','Martin','Andrea','Michael','Christine','Lena','Tobias','Sabine','Rolf','Ines','Bruno','Helga','Dieter'];
  const lastNames  = ['Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz','Hoffmann','Koch','Richter','Klein','Wolf','Schröder','Neumann','Schwarz','Zimmermann','Braun','Krüger','Hofmann','Hartmann','Lange','Schmitt','Werner','Schmitz','Krause','Meier','Lehmann','Schmid','Huber','Maier','Keller','Berger','Roth','Frank','Fuchs','Wirth','Stein','Kaiser'];
  const nicknames  = ['Bullseye','Dart-King','Thunderbolt','Iron-Fist','Flash','Laser','Sniper','Bomber','Eagle','Falcon','Maverick','Viper','Ghost','Shadow','Rocket','Crusher','Titan','Blitz','Cobra','Hunter','Wizard','Legend','Phoenix','Ace','Spike','Arrow','Predator','Storm','Striker','Venom'];

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const usedNicks = new Set();
  const uniqueNick = () => {
    for (let attempt = 0; attempt < 100; attempt++) {
      const n = pick(nicknames) + (attempt > nicknames.length ? String(Math.floor(Math.random() * 99) + 1) : '');
      if (!usedNicks.has(n)) { usedNicks.add(n); return n; }
    }
    return `Mock${Date.now()}`;
  };

  const mockTx = db.transaction(() => {
    // Bestehende Mock-Anmeldungen für dieses Turnier löschen
    const existingRegs = db.prepare(`
      SELECT tr.player_id FROM tournament_registrations tr
      JOIN players p ON p.id = tr.player_id
      WHERE tr.tournament_id = ? AND p.nickname LIKE '%(Mock)%'
    `).all(req.params.id);
    for (const r of existingRegs) {
      db.prepare('DELETE FROM tournament_registrations WHERE player_id = ? AND tournament_id = ?').run(r.player_id, req.params.id);
    }
    // Neue Spieler anlegen
    for (let i = 0; i < count; i++) {
      const vn = pick(firstNames);
      const na = pick(lastNames);
      const nn = uniqueNick() + '(Mock)';
      const displayName = `${vn} "${nn}" ${na}`;
      // Globales Profil suchen oder neu anlegen
      let player = db.prepare('SELECT id FROM players WHERE nickname = ?').get(nn);
      if (!player) {
        const r = db.prepare(
          'INSERT INTO players (name, vorname, nickname, nachname) VALUES (?, ?, ?, ?)'
        ).run(displayName, vn, nn, na);
        player = { id: r.lastInsertRowid };
      }
      db.prepare('INSERT OR IGNORE INTO tournament_registrations (player_id, tournament_id, seed) VALUES (?, ?, ?)')
        .run(player.id, req.params.id, i + 1);
    }
  });
  mockTx();

  const players = db.prepare(`
    SELECT p.*, tr.seed FROM players p
    JOIN tournament_registrations tr ON tr.player_id = p.id
    WHERE tr.tournament_id = ? ORDER BY tr.seed
  `).all(req.params.id);
  res.json({ success: true, players_created: count, players });
});

module.exports = router;
