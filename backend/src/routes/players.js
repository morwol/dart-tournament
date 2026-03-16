const express = require('express');
const crypto = require('crypto');
const { db } = require('../db/db');
const { requireAdmin, requireAdminOrDirector } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');
const { auditLog } = require('../lib/auditLog');

const router = express.Router();

// GET /api/tournaments/:id/players — Spieler eines Turniers
router.get('/:id/players', (req, res) => {
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: 'Turnier nicht gefunden' });
  }

  const players = db.prepare(`
    SELECT p.id, p.name, p.vorname, p.nickname, p.nachname, p.walkon_youtube,
           tr.seed, tr.registered_at, tr.id as registration_id
    FROM players p
    JOIN tournament_registrations tr ON tr.player_id = p.id
    WHERE tr.tournament_id = ?
    ORDER BY tr.seed, tr.registered_at
  `).all(req.params.id);

  res.json(players);
});

// POST /api/tournaments/:id/players — Spieler anmelden (findet existierendes Profil oder legt neues an)
router.post('/:id/players', requireFields(['vorname', 'nickname', 'nachname']), (req, res) => {
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: 'Turnier nicht gefunden' });
  }
  if (tournament.status !== 'open') {
    return res.status(400).json({ error: 'Die Anmeldephase für dieses Turnier ist bereits geschlossen' });
  }

  const { vorname, nickname, nachname, seed } = req.body;
  const vn = vorname.trim();
  const nn = nickname.trim();
  const na = nachname.trim();

  // Doppelte Anmeldung verhindern (gleicher Nickname im selben Turnier)
  const duplicate = db.prepare(`
    SELECT p.id FROM players p
    JOIN tournament_registrations tr ON tr.player_id = p.id
    WHERE tr.tournament_id = ? AND LOWER(TRIM(p.nickname)) = LOWER(?)
  `).get(req.params.id, nn);
  if (duplicate) {
    return res.status(409).json({
      error: `Der Nickname "${nn}" ist in diesem Turnier bereits vergeben. Bitte wähle einen anderen.`,
    });
  }

  const displayName = `${vn} "${nn}" ${na}`;
  const cancelToken = crypto.randomBytes(32).toString('hex');

  const registerTx = db.transaction(() => {
    // Existierendes Spielerprofil suchen (global, nach Nickname)
    let player = db.prepare(
      'SELECT * FROM players WHERE LOWER(TRIM(nickname)) = LOWER(?)'
    ).get(nn);

    if (!player) {
      // Neues Profil anlegen
      const result = db.prepare(
        'INSERT INTO players (name, vorname, nickname, nachname, walkon_youtube) VALUES (?, ?, ?, ?, ?)'
      ).run(displayName, vn, nn, na, req.body.walkon_youtube || null);
      player = db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid);
    }

    // Turnier-Anmeldung anlegen
    db.prepare(
      'INSERT INTO tournament_registrations (player_id, tournament_id, seed, cancel_token) VALUES (?, ?, ?, ?)'
    ).run(player.id, req.params.id, seed || null, cancelToken);

    return player;
  });

  const player = registerTx();

  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const cancelUrl = `${appUrl}/cancel/${cancelToken}`;
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║           NEUE SPIELER-ANMELDUNG                    ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Spieler:  ${displayName}`);
  console.log(`║  Turnier:  ${tournament.name}`);
  console.log(`║  Abmelde-Link:`);
  console.log(`║  ${cancelUrl}`);
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  auditLog(req, 'player', 'REGISTER', `Spieler "${displayName}" in Turnier "${tournament.name}" angemeldet`, player.id);
  res.status(201).json({ ...player, cancel_token: cancelToken, cancel_url: cancelUrl });
});

// PUT /api/tournaments/:id/players/:playerId (Admin) — Profil-Daten ändern
router.put('/:id/players/:playerId', requireAdminOrDirector, (req, res) => {
  const player = db.prepare(`
    SELECT p.* FROM players p
    JOIN tournament_registrations tr ON tr.player_id = p.id
    WHERE p.id = ? AND tr.tournament_id = ?
  `).get(req.params.playerId, req.params.id);
  if (!player) return res.status(404).json({ error: 'Spieler nicht gefunden' });

  const vorname = (req.body.vorname || player.vorname || '').trim();
  const nickname = (req.body.nickname || player.nickname || '').trim();
  const nachname = (req.body.nachname || player.nachname || '').trim();
  if (!vorname || !nickname || !nachname) {
    return res.status(400).json({ error: 'Vorname, Nickname und Nachname sind Pflichtfelder und dürfen nicht leer sein' });
  }

  const displayName = `${vorname} "${nickname}" ${nachname}`;
  db.prepare('UPDATE players SET name = ?, vorname = ?, nickname = ?, nachname = ? WHERE id = ?')
    .run(displayName, vorname, nickname, nachname, req.params.playerId);

  // Seed in registration aktualisieren falls übergeben
  if (req.body.seed !== undefined) {
    db.prepare('UPDATE tournament_registrations SET seed = ? WHERE player_id = ? AND tournament_id = ?')
      .run(req.body.seed || null, req.params.playerId, req.params.id);
  }

  const updated = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.playerId);
  auditLog(req, 'player', 'UPDATE', `Spieler umbenannt zu "${displayName}"`, req.params.playerId);
  res.json(updated);
});

// DELETE /api/tournaments/:id/players/:playerId (Admin) — Nur Turnier-Anmeldung löschen, Profil bleibt
router.delete('/:id/players/:playerId', requireAdminOrDirector, (req, res) => {
  const tournament = db.prepare('SELECT status FROM tournaments WHERE id = ?').get(req.params.id);
  if (tournament && tournament.status === 'active') {
    return res.status(400).json({ error: 'Spieler können nicht abgemeldet werden während das Turnier aktiv ist.' });
  }
  const reg = db.prepare(
    'SELECT tr.id, p.name FROM tournament_registrations tr JOIN players p ON p.id = tr.player_id WHERE tr.player_id = ? AND tr.tournament_id = ?'
  ).get(req.params.playerId, req.params.id);
  if (!reg) return res.status(404).json({ error: 'Spieler nicht in diesem Turnier gefunden' });

  db.prepare('DELETE FROM tournament_registrations WHERE player_id = ? AND tournament_id = ?')
    .run(req.params.playerId, req.params.id);
  auditLog(req, 'player', 'DELETE', `Spieler "${reg.name}" vom Turnier abgemeldet`, req.params.playerId);
  res.json({ success: true });
});

// GET /api/players — Alle Spielerprofile mit Gesamt-Stats
router.get('/', (req, res) => {
  const players = db.prepare(`
    SELECT
      p.id, p.name, p.vorname, p.nickname, p.nachname, p.walkon_youtube, p.registered_at,
      COUNT(DISTINCT tr.tournament_id) as tournaments_count,
      COUNT(CASE WHEN g.winner_id = p.id THEN 1 END) as wins,
      COUNT(CASE WHEN g.status = 'finished' AND (g.player1_id = p.id OR g.player2_id = p.id) AND g.winner_id != p.id THEN 1 END) as losses
    FROM players p
    LEFT JOIN tournament_registrations tr ON tr.player_id = p.id
    LEFT JOIN games g ON (g.player1_id = p.id OR g.player2_id = p.id) AND g.status = 'finished'
    GROUP BY p.id
    ORDER BY p.name ASC
  `).all();
  res.json(players);
});

// GET /api/players/:id/stats — Career stats across all tournaments
router.get('/:id/stats', (req, res) => {
  try {
    const playerId = parseInt(req.params.id, 10);
    if (!playerId || playerId <= 0) {
      return res.status(400).json({ error: 'Invalid player ID' });
    }

    const player = db.prepare(
      'SELECT id, name, vorname, nickname, nachname, registered_at FROM players WHERE id = ?'
    ).get(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const totalGames = db.prepare(`
      SELECT COUNT(*) AS cnt FROM games
      WHERE status = 'finished' AND (player1_id = ? OR player2_id = ?)
    `).get(playerId, playerId).cnt;

    const totalWins = db.prepare(`
      SELECT COUNT(*) AS cnt FROM games
      WHERE status = 'finished' AND winner_id = ?
    `).get(playerId).cnt;

    const totalLosses = totalGames - totalWins;

    // All active throws (non-bulloff, non-undone)
    const allThrows = db.prepare(`
      SELECT t.score, t.remaining, t.segment
      FROM throws t
      JOIN games g ON t.game_id = g.id
      WHERE t.player_id = ? AND t.is_bulloff = 0
        AND t.undo_of IS NULL
        AND t.id NOT IN (
          SELECT COALESCE(undo_of, 0) FROM throws WHERE undo_of IS NOT NULL
        )
      ORDER BY t.id ASC
    `).all(playerId);

    const totalScore = allThrows.reduce((s, t) => s + t.score, 0);
    const throwCount = allThrows.length;
    const threeDartAvg = throwCount >= 3
      ? Math.round((totalScore / throwCount) * 3 * 100) / 100
      : null;

    let oneEighties = 0;
    for (let i = 0; i + 2 < throwCount; i += 3) {
      if (allThrows[i].score + allThrows[i + 1].score + allThrows[i + 2].score === 180) {
        oneEighties++;
      }
    }

    const checkouts = allThrows.filter(t => t.remaining === 0);
    const highestCheckout = checkouts.length > 0
      ? Math.max(...checkouts.map(c => c.score))
      : null;
    const checkoutPct = totalWins > 0
      ? Math.round((checkouts.length / totalWins) * 100 * 100) / 100
      : null;

    const bestLeg = db.prepare(`
      SELECT g.id AS game_id, COUNT(t.id) AS throw_count
      FROM games g
      JOIN throws t ON t.game_id = g.id AND t.player_id = ? AND t.is_bulloff = 0
        AND t.undo_of IS NULL
        AND t.id NOT IN (
          SELECT COALESCE(undo_of, 0) FROM throws WHERE undo_of IS NOT NULL AND game_id = g.id
        )
      WHERE g.status = 'finished' AND g.winner_id = ?
      GROUP BY g.id
      ORDER BY throw_count ASC
      LIMIT 1
    `).get(playerId, playerId);

    const tournamentsPlayed = db.prepare(`
      SELECT COUNT(DISTINCT tr.tournament_id) AS cnt
      FROM tournament_registrations tr WHERE tr.player_id = ?
    `).get(playerId).cnt;

    const tournamentWins = db.prepare(`
      SELECT COUNT(DISTINCT g.tournament_id) AS cnt
      FROM games g
      WHERE g.status = 'finished' AND g.winner_id = ?
        AND g.round = (
          SELECT MAX(g2.round) FROM games g2
          WHERE g2.tournament_id = g.tournament_id AND g2.status = 'finished'
        )
    `).get(playerId).cnt;

    const tournamentHistory = db.prepare(`
      SELECT
        t.id, t.name, t.date, t.format, t.status AS tournament_status,
        COUNT(CASE WHEN g.winner_id = ? THEN 1 END) AS wins,
        COUNT(CASE WHEN g.status = 'finished' AND (g.player1_id = ? OR g.player2_id = ?) AND g.winner_id != ? THEN 1 END) AS losses
      FROM tournament_registrations tr
      JOIN tournaments t ON tr.tournament_id = t.id
      LEFT JOIN games g ON g.tournament_id = t.id AND (g.player1_id = ? OR g.player2_id = ?) AND g.status = 'finished'
      WHERE tr.player_id = ?
      GROUP BY t.id
      ORDER BY t.date DESC, t.created_at DESC
    `).all(playerId, playerId, playerId, playerId, playerId, playerId, playerId);

    res.json({
      player,
      career: {
        tournaments_played: tournamentsPlayed,
        tournament_wins: tournamentWins,
        games_played: totalGames,
        wins: totalWins,
        losses: totalLosses,
        win_rate: totalGames > 0 ? Math.round((totalWins / totalGames) * 100 * 100) / 100 : null,
        three_dart_avg: threeDartAvg,
        one_eighties: oneEighties,
        checkout_pct: checkoutPct,
        highest_checkout: highestCheckout,
        best_leg: bestLeg ? bestLeg.throw_count : null,
      },
      tournament_history: tournamentHistory,
    });
  } catch (err) {
    console.error('[players/stats]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/players/:id/profile — Spielerprofil mit Turnierhistorie
router.get('/:id/profile', (req, res) => {
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
  if (!player) return res.status(404).json({ error: 'Spieler nicht gefunden' });

  const history = db.prepare(`
    SELECT
      t.id, t.name, t.date, t.format, t.status as tournament_status,
      tr.seed,
      COUNT(CASE WHEN g.winner_id = ? THEN 1 END) as wins,
      COUNT(CASE WHEN g.status = 'finished' AND (g.player1_id = ? OR g.player2_id = ?) AND g.winner_id != ? THEN 1 END) as losses
    FROM tournament_registrations tr
    JOIN tournaments t ON tr.tournament_id = t.id
    LEFT JOIN games g ON g.tournament_id = t.id AND (g.player1_id = ? OR g.player2_id = ?) AND g.status = 'finished'
    WHERE tr.player_id = ?
    GROUP BY t.id
    ORDER BY t.date DESC, t.created_at DESC
  `).all(player.id, player.id, player.id, player.id, player.id, player.id, player.id);

  res.json({ ...player, history });
});

module.exports = router;
