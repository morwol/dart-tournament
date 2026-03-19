const express = require('express');
const { db } = require('../db/db');
const { verifyToken, requireAuth } = require('../middleware/auth');
const { isBust: checkBust, validateThrow } = require('../gamelogic/scoring');
const { getCheckoutSuggestions } = require('../gamelogic/checkout');
const { advanceBracket } = require('../gamelogic/bracket');
const { isValidBulloffScore, resolveBulloff } = require('../gamelogic/bulloff');

const router = express.Router();

// NEU: Segment-Parser — wandelt Segment-String in Punktzahl um
function parseSegment(segment) {
  if (!segment || typeof segment !== 'string') return null;
  const s = segment.toUpperCase().trim();
  if (s === 'MISS') return { score: 0, multiplier: 0, base: 0, isDouble: false };
  if (s === 'D-BULL' || s === 'DBULL') return { score: 50, multiplier: 2, base: 25, isDouble: true };
  if (s === 'BULL') return { score: 25, multiplier: 1, base: 25, isDouble: false };
  const match = s.match(/^([SDT])(\d+)$/);
  if (!match) return null;
  const [, type, numStr] = match;
  const num = parseInt(numStr, 10);
  if (num < 1 || num > 20) return null;
  switch (type) {
    case 'S': return { score: num, multiplier: 1, base: num, isDouble: false };
    case 'D': return { score: num * 2, multiplier: 2, base: num, isDouble: true };
    case 'T': return { score: num * 3, multiplier: 3, base: num, isDouble: false };
    default: return null;
  }
}

// Returns active (non-bulloff, non-undo) throws for the current leg of a game.
// Uses the `leg` column on throws to filter by game.current_leg.
function activeThrowsQuery(gameId) {
  const game = db.prepare('SELECT current_leg FROM games WHERE id = ?').get(gameId);
  const currentLeg = game ? (game.current_leg || 1) : 1;
  return db.prepare(`
    SELECT * FROM throws
    WHERE game_id = ? AND is_bulloff = 0 AND undo_of IS NULL
      AND COALESCE(leg, 1) = ?
    AND id NOT IN (
      SELECT COALESCE(undo_of, 0) FROM throws WHERE game_id = ? AND undo_of IS NOT NULL
    )
    ORDER BY id ASC
  `).all(gameId, currentLeg, gameId);
}

function getRemaining(gameId, playerId) {
  const game = db.prepare('SELECT start_score FROM games WHERE id = ?').get(gameId);
  if (!game) return null;
  const throws = activeThrowsQuery(gameId).filter(t => t.player_id === playerId);
  const total = throws.reduce((s, t) => s + t.score, 0);
  return game.start_score - total;
}

function getThrows(gameId, playerId) {
  return activeThrowsQuery(gameId)
    .filter(t => t.player_id === playerId)
    .map(({ id, score, remaining, segment, created_at }) => ({ id, score, remaining, segment, created_at }));
}

function getCurrentTurn(game) {
  const allThrows = activeThrowsQuery(game.id);
  const starter = game.bull_winner_id || game.player1_id;
  const other   = starter === game.player1_id ? game.player2_id : game.player1_id;

  let currentPlayer = starter;
  let throwsInTurn  = 0;

  for (const t of allThrows) {
    throwsInTurn++;
    const isBust = t.segment === 'BUST';
    if (throwsInTurn >= 3 || isBust) {
      currentPlayer = currentPlayer === starter ? other : starter;
      throwsInTurn  = 0;
    }
  }
  return currentPlayer;
}

function getCurrentRoundThrows(game) {
  const allThrows = activeThrowsQuery(game.id);
  const starter   = game.bull_winner_id || game.player1_id;
  const other     = starter === game.player1_id ? game.player2_id : game.player1_id;

  let currentPlayer     = starter;
  let currentTurnThrows = [];

  for (const t of allThrows) {
    currentTurnThrows.push(t);
    const isBust = t.segment === 'BUST';
    if (currentTurnThrows.length >= 3 || isBust) {
      currentPlayer     = currentPlayer === starter ? other : starter;
      currentTurnThrows = [];
    }
  }
  return currentTurnThrows;
}

// Determines the legs_to_win for a game based on tournament config and round number.
function getLegsToWin(tournamentId, round) {
  const tournament = db.prepare(
    'SELECT legs_to_win, prelim_legs, qf_legs, sf_legs, final_legs FROM tournaments WHERE id = ?'
  ).get(tournamentId);
  if (!tournament) return 1;

  if (round === 0) return tournament.prelim_legs || 1;

  const maxRound = db.prepare(
    'SELECT MAX(round) as max FROM games WHERE tournament_id = ? AND round > 0'
  ).get(tournamentId);
  const max = maxRound ? maxRound.max : round;

  if (round >= max) return tournament.final_legs || 5;
  if (round === max - 1) return tournament.sf_legs || 3;
  if (round === max - 2) return tournament.qf_legs || 3;
  return tournament.prelim_legs || 1;
}

// Handles a leg win: updates leg counters, records the leg result, starts next leg or finishes game.
// Returns { gameFinished, legs_won_p1, legs_won_p2 }
function finishLeg(game, winnerId) {
  const legsToWin = getLegsToWin(game.tournament_id, game.round);
  const currentLeg = game.current_leg || 1;
  const isP1 = winnerId === game.player1_id;
  const newLegsWonP1 = (game.legs_won_p1 || 0) + (isP1 ? 1 : 0);
  const newLegsWonP2 = (game.legs_won_p2 || 0) + (!isP1 ? 1 : 0);

  // Record completed leg
  db.prepare(
    'INSERT INTO legs (game_id, leg_number, winner_id) VALUES (?, ?, ?)'
  ).run(game.id, currentLeg, winnerId);

  const gameFinished = newLegsWonP1 >= legsToWin || newLegsWonP2 >= legsToWin;

  if (gameFinished) {
    db.prepare(
      'UPDATE games SET status = ?, winner_id = ?, legs_won_p1 = ?, legs_won_p2 = ? WHERE id = ?'
    ).run('finished', winnerId, newLegsWonP1, newLegsWonP2, game.id);
  } else {
    // Start next leg: increment current_leg
    db.prepare(
      'UPDATE games SET current_leg = ?, legs_won_p1 = ?, legs_won_p2 = ? WHERE id = ?'
    ).run(currentLeg + 1, newLegsWonP1, newLegsWonP2, game.id);
  }

  return { gameFinished, legs_won_p1: newLegsWonP1, legs_won_p2: newLegsWonP2 };
}

// GET /api/games — Liste aller Spiele (optional ?status=active&tournament_id=X)
router.get('/', (req, res) => {
  try {
    const { status, tournament_id } = req.query;
    let query = `
      SELECT g.*,
        p1.name as player1_name, p2.name as player2_name,
        w.name as winner_name,
        b.number as board_number
      FROM games g
      LEFT JOIN players p1 ON g.player1_id = p1.id
      LEFT JOIN players p2 ON g.player2_id = p2.id
      LEFT JOIN players w ON g.winner_id = w.id
      LEFT JOIN boards b ON g.board_id = b.id
    `;
    const params = [];
    const conditions = [];
    if (status) { conditions.push("g.status = ?"); params.push(status); }
    if (tournament_id) { conditions.push("g.tournament_id = ?"); params.push(tournament_id); }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY g.round, g.id';
    const games = db.prepare(query).all(...params);
    res.json(games);
  } catch (err) {
    console.error('[games]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/games/:id — Spielstand abrufen
router.get('/:id', (req, res) => {
  try {
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
    if (!game) {
      return res.status(404).json({ error: 'Spiel nicht gefunden' });
    }

    const player1 = db.prepare('SELECT id, name FROM players WHERE id = ?').get(game.player1_id);
    const player2 = db.prepare('SELECT id, name FROM players WHERE id = ?').get(game.player2_id);

    const p1Remaining = getRemaining(game.id, game.player1_id);
    const p2Remaining = getRemaining(game.id, game.player2_id);
    const p1Throws = getThrows(game.id, game.player1_id);
    const p2Throws = getThrows(game.id, game.player2_id);

    const tournament = db.prepare('SELECT checkout FROM tournaments WHERE id = ?').get(game.tournament_id);
    const checkout = tournament ? tournament.checkout : 'single_out';
    const legsToWin = getLegsToWin(game.tournament_id, game.round);

    const currentTurn = game.status === 'active' ? getCurrentTurn(game) : null;

    let checkoutSuggestions = [];
    if (game.status === 'active') {
      if (p1Remaining <= 170) {
        checkoutSuggestions = getCheckoutSuggestions(p1Remaining, checkout);
      }
      if (p2Remaining <= 170) {
        const p2Suggestions = getCheckoutSuggestions(p2Remaining, checkout);
        if (p2Suggestions.length > 0 && checkoutSuggestions.length === 0) {
          checkoutSuggestions = p2Suggestions;
        }
      }
    }

    res.json({
      game: {
        id: game.id,
        tournament_id: game.tournament_id,
        round: game.round,
        status: game.status,
        start_score: game.start_score,
        bull_winner_id: game.bull_winner_id,
        winner_id: game.winner_id,
        current_turn: currentTurn,
        legs_to_win: legsToWin,
        legs_won_p1: game.legs_won_p1 || 0,
        legs_won_p2: game.legs_won_p2 || 0,
        current_leg: game.current_leg || 1,
      },
      player1: {
        id: player1 ? player1.id : null,
        name: player1 ? player1.name : null,
        remaining: p1Remaining,
        throws: p1Throws,
        checkout_suggestions: game.status === 'active' ? getCheckoutSuggestions(p1Remaining, checkout) : [],
      },
      player2: {
        id: player2 ? player2.id : null,
        name: player2 ? player2.name : null,
        remaining: p2Remaining,
        throws: p2Throws,
        checkout_suggestions: game.status === 'active' ? getCheckoutSuggestions(p2Remaining, checkout) : [],
      },
    });
  } catch (err) {
    console.error('[games]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/games/:id/bulloff — Ausbullen Ergebnis
// Body: { player1_score: 0|25|50, player2_score: 0|25|50, winner_id?: number }
// winner_id is required when both scores are 0 (both MISS — referee picks who was closer)
router.post('/:id/bulloff', verifyToken, (req, res) => {
  try {
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
    if (!game) return res.status(404).json({ error: 'Spiel nicht gefunden' });
    if (game.status !== 'pending' && game.status !== 'bulloff') {
      return res.status(400).json({ error: 'Das Spiel befindet sich nicht in der Ausbull-Phase' });
    }

    const { player1_score, player2_score, winner_id } = req.body;
    if (player1_score === undefined || player2_score === undefined) {
      return res.status(400).json({ error: 'Ausbull-Ergebnisse für beide Spieler erforderlich' });
    }

    const p1s = Number(player1_score);
    const p2s = Number(player2_score);

    if (!isValidBulloffScore(p1s) || !isValidBulloffScore(p2s)) {
      return res.status(400).json({ error: 'Ungültiger Ausbull-Wert – erlaubt: MISS (0), Bull (25) oder D-Bull (50)' });
    }

    // Clear previous bulloff throws (re-throw scenario)
    db.prepare('DELETE FROM throws WHERE game_id = ? AND is_bulloff = 1').run(game.id);

    // Save both throws
    db.prepare('INSERT INTO throws (game_id, player_id, score, remaining, is_bulloff) VALUES (?, ?, ?, ?, 1)')
      .run(game.id, game.player1_id, p1s, game.start_score || 501);
    db.prepare('INSERT INTO throws (game_id, player_id, score, remaining, is_bulloff) VALUES (?, ?, ?, ?, 1)')
      .run(game.id, game.player2_id, p2s, game.start_score || 501);

    let winnerId;
    const bullResult = resolveBulloff(p1s, p2s);

    if (bullResult === 'tie') {
      if (p1s === 0 && winner_id) {
        // Both MISS — referee picked who was closer
        const wid = Number(winner_id);
        if (wid !== game.player1_id && wid !== game.player2_id) {
          return res.status(400).json({ error: 'Ungültiger Gewinner – Spieler gehört nicht zu diesem Spiel' });
        }
        winnerId = wid;
      } else {
        // True tie (both BULL or both D-BULL) — re-throw
        db.prepare('DELETE FROM throws WHERE game_id = ? AND is_bulloff = 1').run(game.id);
        db.prepare("UPDATE games SET status = 'bulloff' WHERE id = ?").run(game.id);
        return res.json({ status: 'bulloff', bull_winner_id: null, message: 'Gleichstand — erneut werfen!' });
      }
    } else {
      winnerId = bullResult === 'p1' ? game.player1_id : game.player2_id;
    }

    db.prepare("UPDATE games SET bull_winner_id = ?, status = 'active' WHERE id = ?").run(winnerId, game.id);
    return res.json({ status: 'active', bull_winner_id: winnerId });
  } catch (err) {
    console.error('[games]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/games/:id/throw — Wurf eintragen
router.post('/:id/throw', verifyToken, (req, res) => {
  try {
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
    if (!game) {
      return res.status(404).json({ error: 'Spiel nicht gefunden' });
    }

    if (game.status !== 'active') {
      return res.status(400).json({ error: 'Das Spiel ist gerade nicht aktiv' });
    }

    const { player_id, score, is_double } = req.body;
    if (!player_id || score === undefined) {
      return res.status(400).json({ error: 'Spieler-ID und Punktzahl erforderlich' });
    }

    if (player_id !== game.player1_id && player_id !== game.player2_id) {
      return res.status(400).json({ error: 'Dieser Spieler ist nicht Teil des Spiels' });
    }

    if (!validateThrow(score)) {
      return res.status(400).json({ error: 'Ungültige Punktzahl – muss zwischen 0 und 180 liegen' });
    }

    // Check turn order
    const expectedTurn = getCurrentTurn(game);
    if (player_id !== expectedTurn) {
      return res.status(400).json({ error: "Not this player's turn" });
    }

    const tournament = db.prepare('SELECT checkout FROM tournaments WHERE id = ?').get(game.tournament_id);
    const checkoutMode = tournament ? tournament.checkout : 'single_out';

    const currentRemaining = getRemaining(game.id, player_id);
    const newRemaining = currentRemaining - score;

    let actualScore = score;
    let actualRemaining = newRemaining;
    const isBust = checkBust(currentRemaining, score, checkoutMode, is_double);

    if (isBust) {
      actualScore = 0;
      actualRemaining = currentRemaining;
    }

    const currentLeg = game.current_leg || 1;

    // Save throw with leg number
    db.prepare(
      'INSERT INTO throws (game_id, player_id, score, remaining, is_bulloff, leg) VALUES (?, ?, ?, ?, 0, ?)'
    ).run(game.id, player_id, actualScore, actualRemaining, currentLeg);

    // Check for leg win (checkout)
    if (!isBust && newRemaining === 0) {
      const legResult = finishLeg(game, player_id);
      if (legResult.gameFinished) {
        advanceBracket(db, game);
        return res.json({
          status: 'finished',
          winner_id: player_id,
          remaining: 0,
          bust: false,
          leg_won: true,
          legs_won_p1: legResult.legs_won_p1,
          legs_won_p2: legResult.legs_won_p2,
          message: `Spieler ${player_id} hat ausgecheckt!`,
        });
      }
      return res.json({
        status: 'active',
        remaining: 0,
        bust: false,
        leg_won: true,
        legs_won_p1: legResult.legs_won_p1,
        legs_won_p2: legResult.legs_won_p2,
        message: 'Leg gewonnen! Naechstes Leg beginnt.',
      });
    }

    const checkoutSuggestions = !isBust ? getCheckoutSuggestions(actualRemaining, checkoutMode) : [];

    return res.json({
      status: 'active',
      remaining: actualRemaining,
      bust: isBust,
      score: actualScore,
      leg_won: false,
      checkout_suggestions: checkoutSuggestions,
      message: isBust ? 'Bust! Runde ungueltig.' : undefined,
    });
  } catch (err) {
    console.error('[games]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/games/:id/finish — Spiel manuell beenden
router.post('/:id/finish', verifyToken, (req, res) => {
  try {
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
    if (!game) {
      return res.status(404).json({ error: 'Spiel nicht gefunden' });
    }

    const { winner_id } = req.body;
    if (!winner_id) {
      return res.status(400).json({ error: 'Gewinner-ID erforderlich' });
    }

    if (winner_id !== game.player1_id && winner_id !== game.player2_id) {
      return res.status(400).json({ error: 'Gewinner ist kein Spieler in diesem Spiel' });
    }

    db.prepare('UPDATE games SET status = ?, winner_id = ? WHERE id = ?').run('finished', winner_id, game.id);
    advanceBracket(db, game);

    res.json({
      status: 'finished',
      winner_id,
      message: `Spiel manuell beendet. Gewinner: Spieler ${winner_id}.`,
    });
  } catch (err) {
    console.error('[games]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEU: Segment-basierte Wurf-Eingabe (T20, D16, S5, BULL, D-BULL, MISS)
router.post('/:id/throw-segment', requireAuth, (req, res) => {
  try {
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
    if (!game) return res.status(404).json({ error: 'Spiel nicht gefunden' });
    if (game.status !== 'active') return res.status(400).json({ error: 'Das Spiel ist gerade nicht aktiv' });

    const { segment, player_id } = req.body;
    if (!segment || !player_id) return res.status(400).json({ error: 'Segment und Spieler-ID sind erforderlich' });
    if (player_id !== game.player1_id && player_id !== game.player2_id) {
      return res.status(400).json({ error: 'Dieser Spieler ist nicht Teil des Spiels' });
    }

    const parsed = parseSegment(segment);
    if (!parsed) return res.status(400).json({ error: 'Ungültiges Segment – erlaubt: S1–S20, D1–D20, T1–T20, BULL, D-BULL, MISS' });

    // Check turn order
    const expectedTurn = getCurrentTurn(game);
    if (player_id !== expectedTurn) {
      return res.status(400).json({ error: "Not this player's turn" });
    }

    const tournament = db.prepare('SELECT checkout FROM tournaments WHERE id = ?').get(game.tournament_id);
    const checkoutMode = tournament ? tournament.checkout : 'single_out';

    const throwsInRound = getCurrentRoundThrows(game).length;

    const currentRemaining = getRemaining(game.id, player_id);
    const newRemaining = currentRemaining - parsed.score;

    const isBust = checkBust(currentRemaining, parsed.score, checkoutMode, parsed.isDouble);

    const actualScore = isBust ? 0 : parsed.score;
    const actualRemaining = isBust ? currentRemaining : newRemaining;

    const currentLeg = game.current_leg || 1;

    // Save throw with leg number
    const result = db.prepare(
      'INSERT INTO throws (game_id, player_id, score, remaining, is_bulloff, segment, leg) VALUES (?, ?, ?, ?, 0, ?, ?)'
    ).run(game.id, player_id, actualScore, actualRemaining, isBust ? 'BUST' : segment.toUpperCase(), currentLeg);

    // Check for leg win
    if (!isBust && newRemaining === 0) {
      const legResult = finishLeg(game, player_id);
      if (legResult.gameFinished) {
        advanceBracket(db, game);
        return res.json({
          throw_id: result.lastInsertRowid,
          segment: segment.toUpperCase(),
          score: actualScore,
          remaining: 0,
          bust: false,
          round_complete: true,
          game_finished: true,
          leg_won: true,
          legs_won_p1: legResult.legs_won_p1,
          legs_won_p2: legResult.legs_won_p2,
          winner_id: player_id,
        });
      }
      return res.json({
        throw_id: result.lastInsertRowid,
        segment: segment.toUpperCase(),
        score: actualScore,
        remaining: 0,
        bust: false,
        round_complete: true,
        game_finished: false,
        leg_won: true,
        legs_won_p1: legResult.legs_won_p1,
        legs_won_p2: legResult.legs_won_p2,
        message: 'Leg gewonnen! Naechstes Leg beginnt.',
      });
    }

    const roundComplete = (throwsInRound + 1) >= 3 || isBust;

    const checkoutSuggestions = !isBust ? getCheckoutSuggestions(actualRemaining, checkoutMode) : [];

    return res.json({
      throw_id: result.lastInsertRowid,
      segment: isBust ? 'BUST' : segment.toUpperCase(),
      score: actualScore,
      remaining: actualRemaining,
      bust: isBust,
      round_complete: roundComplete,
      game_finished: false,
      leg_won: false,
      checkout_suggestions: checkoutSuggestions,
    });
  } catch (err) {
    console.error('[games]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEU: Wurf rueckgaengig machen (loescht Wuerfe ab diesem ID)
router.delete('/:id/throw/:throwId', requireAuth, (req, res) => {
  try {
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
    if (!game) return res.status(404).json({ error: 'Spiel nicht gefunden' });
    if (game.status !== 'active') return res.status(400).json({ error: 'Das Spiel ist gerade nicht aktiv' });

    const throwId = parseInt(req.params.throwId, 10);
    const throwRow = db.prepare(
      'SELECT * FROM throws WHERE id = ? AND game_id = ? AND is_bulloff = 0'
    ).get(throwId, game.id);
    if (!throwRow) return res.status(404).json({ error: 'Wurf nicht gefunden' });

    // Maximal 9 Wuerfe zurueck pruefen
    const recentThrows = db.prepare(
      'SELECT id FROM throws WHERE game_id = ? AND is_bulloff = 0 ORDER BY id DESC LIMIT 9'
    ).all(game.id);
    const recentIds = recentThrows.map(t => t.id);
    if (!recentIds.includes(throwId)) {
      return res.status(400).json({ error: 'Nur die letzten 9 Wuerfe koennen rueckgaengig gemacht werden' });
    }

    // Diesen und alle nachfolgenden Wuerfe loeschen
    const result = db.prepare(
      'DELETE FROM throws WHERE game_id = ? AND id >= ? AND is_bulloff = 0'
    ).run(game.id, throwId);

    const p1Remaining = getRemaining(game.id, game.player1_id);
    const p2Remaining = getRemaining(game.id, game.player2_id);

    return res.json({
      undone_count: result.changes,
      player1_remaining: p1Remaining,
      player2_remaining: p2Remaining,
    });
  } catch (err) {
    console.error('[games]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEU: Live-Spielstand fuer CurrentGameView
router.get('/:id/live', (req, res) => {
  try {
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
    if (!game) return res.status(404).json({ error: 'Spiel nicht gefunden' });

    const player1 = db.prepare('SELECT id, name FROM players WHERE id = ?').get(game.player1_id);
    const player2 = game.player2_id ? db.prepare('SELECT id, name FROM players WHERE id = ?').get(game.player2_id) : null;

    const tournament = db.prepare(
      'SELECT name, format, checkout, prelim_legs, qf_legs, sf_legs, final_legs FROM tournaments WHERE id = ?'
    ).get(game.tournament_id);
    const checkoutMode = tournament ? tournament.checkout : 'single_out';

    const legsToWin = getLegsToWin(game.tournament_id, game.round);

    // Active throws for the current leg per player
    const allActiveThrows = activeThrowsQuery(game.id);
    const activeThrowsP1 = game.player1_id ? allActiveThrows.filter(t => t.player_id === game.player1_id) : [];
    const activeThrowsP2 = game.player2_id ? allActiveThrows.filter(t => t.player_id === game.player2_id) : [];

    const p1Remaining = game.player1_id ? getRemaining(game.id, game.player1_id) : game.start_score;
    const p2Remaining = game.player2_id ? getRemaining(game.id, game.player2_id) : game.start_score;

    const currentTurn = game.status === 'active' ? getCurrentTurn(game) : null;
    const currentRoundThrows = game.status === 'active' ? getCurrentRoundThrows(game) : [];

    return res.json({
      game: {
        id: game.id,
        tournament_id: game.tournament_id,
        tournament_name: tournament ? tournament.name : null,
        round: game.round,
        status: game.status,
        start_score: game.start_score,
        format: tournament ? tournament.format : null,
        checkout: checkoutMode,
        legs: legsToWin,
        legs_to_win: legsToWin,
        legs_won_p1: game.legs_won_p1 || 0,
        legs_won_p2: game.legs_won_p2 || 0,
        current_leg: game.current_leg || 1,
        bull_winner_id: game.bull_winner_id,
        winner_id: game.winner_id,
        current_turn: currentTurn,
      },
      player1: {
        id: player1 ? player1.id : null,
        name: player1 ? player1.name : null,
        remaining: p1Remaining,
        throws_count: activeThrowsP1.length,
        last_throws: activeThrowsP1.slice(-3),
        checkout_suggestions: game.status === 'active' ? getCheckoutSuggestions(p1Remaining, checkoutMode) : [],
      },
      player2: {
        id: player2 ? player2.id : null,
        name: player2 ? player2.name : null,
        remaining: p2Remaining,
        throws_count: activeThrowsP2.length,
        last_throws: activeThrowsP2.slice(-3),
        checkout_suggestions: game.status === 'active' ? getCheckoutSuggestions(p2Remaining, checkoutMode) : [],
      },
      current_round_throws: currentRoundThrows,
    });
  } catch (err) {
    console.error('[games]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEU: Spiel einer Scheibe zuweisen
router.put('/:id/assign-board', requireAuth, (req, res) => {
  const { board_id } = req.body;
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Spiel nicht gefunden' });
  if (board_id) {
    const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(board_id);
    if (!board) return res.status(404).json({ error: 'Scheibe nicht gefunden' });
    if (board.tournament_id !== null && game.tournament_id !== null && board.tournament_id !== game.tournament_id) {
      return res.status(400).json({ error: 'Scheibe gehoert nicht zum Turnier des Spiels' });
    }
  }
  db.prepare('UPDATE games SET board_id = ? WHERE id = ?').run(board_id || null, req.params.id);
  res.json({ success: true, game_id: req.params.id, board_id: board_id || null });
});

// NEU: Spiel von Scheibe entfernen
router.delete('/:id/assign-board', requireAuth, (req, res) => {
  db.prepare('UPDATE games SET board_id = NULL WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /games/:id/skip — Spiel aus Board-Warteschlange entfernen (board_id = NULL)
router.post('/:id/skip', requireAuth, (req, res) => {
  try {
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
    if (!game) return res.status(404).json({ error: 'Spiel nicht gefunden' });
    if (game.status !== 'pending') {
      return res.status(400).json({ error: 'Nur ausstehende Spiele koennen uebersprungen werden' });
    }
    db.prepare('UPDATE games SET board_id = NULL WHERE id = ?').run(req.params.id);
    const updated = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('[games]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /games/:id/reset — Bulloff zuruecksetzen (Spiel auf pending, nur wenn bulloff oder pending)
router.post('/:id/reset', requireAuth, (req, res) => {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Spiel nicht gefunden' });
  if (!['pending', 'bulloff'].includes(game.status)) {
    return res.status(400).json({ error: 'Spiel kann nicht zurueckgesetzt werden (bereits aktiv oder beendet)' });
  }
  db.prepare("DELETE FROM throws WHERE game_id = ? AND is_bulloff = 1").run(game.id);
  db.prepare("UPDATE games SET status = 'pending', bull_winner_id = NULL WHERE id = ?").run(game.id);
  res.json({ success: true });
});

module.exports = router;
