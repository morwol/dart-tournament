const express = require('express');
const { db } = require('../db/db');
const { verifyToken, requireAuth } = require('../middleware/auth');

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

// Checkout-Tabelle: haeufigste Checkout-Kombinationen
const CHECKOUTS = {
  170: ['T20 T20 Bull'],
  167: ['T20 T19 Bull'],
  164: ['T20 T18 Bull'],
  161: ['T20 T17 Bull'],
  160: ['T20 T20 D20'],
  158: ['T20 T20 D19'],
  157: ['T20 T19 D20'],
  156: ['T20 T20 D18'],
  155: ['T20 T19 D19'],
  154: ['T20 T18 D20'],
  153: ['T20 T19 D18'],
  152: ['T20 T20 D16'],
  151: ['T20 T17 D20'],
  150: ['T20 T18 D18'],
  149: ['T20 T19 D16'],
  148: ['T20 T16 D20'],
  147: ['T20 T17 D18'],
  146: ['T20 T18 D16'],
  145: ['T20 T15 D20'],
  144: ['T20 T18 D15'],
  143: ['T20 T17 D16'],
  142: ['T20 T14 D20'],
  141: ['T20 T19 D12'],
  140: ['T20 T20 D10'],
  139: ['T20 T13 D20'],
  138: ['T20 T18 D12'],
  137: ['T20 T15 D16'],
  136: ['T20 T20 D8'],
  135: ['T20 T17 D12'],
  134: ['T20 T14 D16'],
  133: ['T20 T19 D8'],
  132: ['T20 T16 D12'],
  131: ['T20 T13 D16'],
  130: ['T20 T18 D8'],
  129: ['T19 T16 D12'],
  128: ['T18 T14 D16'],
  127: ['T20 T17 D8'],
  126: ['T19 T15 D12'],
  125: ['T20 T15 D10', 'T18 T13 D16'],
  124: ['T20 T16 D8'],
  123: ['T19 T16 D9'],
  122: ['T18 T18 D7'],
  121: ['T20 T11 D14'],
  120: ['T20 20 D20'],
  119: ['T19 T12 D13'],
  118: ['T20 18 D20'],
  117: ['T20 17 D20'],
  116: ['T20 16 D20'],
  115: ['T20 15 D20'],
  114: ['T20 14 D20'],
  113: ['T20 13 D20'],
  112: ['T20 12 D20'],
  111: ['T20 11 D20'],
  110: ['T20 10 D20'],
  109: ['T20 9 D20'],
  108: ['T20 16 D16'],
  107: ['T19 10 D20'],
  106: ['T20 6 D20'],
  105: ['T20 5 D20'],
  104: ['T18 10 D20'],
  103: ['T20 3 D20'],
  102: ['T20 10 D16'],
  101: ['T20 1 D20'],
  100: ['T20 D20'],
  99: ['T19 10 D16'],
  98: ['T20 D19'],
  97: ['T19 D20'],
  96: ['T20 D18'],
  95: ['T19 D19'],
  94: ['T18 D20'],
  93: ['T19 D18'],
  92: ['T20 D16'],
  91: ['T17 D20'],
  90: ['T18 D18'],
  89: ['T19 D16'],
  88: ['T16 D20'],
  87: ['T17 D18'],
  86: ['T18 D16'],
  85: ['T15 D20'],
  84: ['T20 D12'],
  83: ['T17 D16'],
  82: ['T14 D20'],
  81: ['T19 D12'],
  80: ['T20 D10'],
  79: ['T13 D20'],
  78: ['T18 D12'],
  77: ['T15 D16'],
  76: ['T20 D8'],
  75: ['T17 D12'],
  74: ['T14 D16'],
  73: ['T19 D8'],
  72: ['T16 D12'],
  71: ['T13 D16'],
  70: ['T18 D8'],
  69: ['T19 D6'],
  68: ['T20 D4'],
  67: ['T17 D8'],
  66: ['T10 D18'],
  65: ['T19 D4'],
  64: ['T16 D8'],
  63: ['T13 D12'],
  62: ['T10 D16'],
  61: ['T15 D8'],
  60: ['20 D20'],
  59: ['19 D20'],
  58: ['18 D20'],
  57: ['17 D20'],
  56: ['16 D20'],
  55: ['15 D20'],
  54: ['14 D20'],
  53: ['13 D20'],
  52: ['12 D20'],
  51: ['11 D20'],
  50: ['Bull'],
  49: ['9 D20'],
  48: ['8 D20'],
  47: ['7 D20'],
  46: ['6 D20'],
  45: ['5 D20'],
  44: ['4 D20'],
  43: ['3 D20'],
  42: ['10 D16'],
  41: ['9 D16'],
  40: ['D20'],
  39: ['7 D16'],
  38: ['D19'],
  36: ['D18'],
  34: ['D17'],
  32: ['D16'],
  30: ['D15'],
  28: ['D14'],
  26: ['D13'],
  24: ['D12'],
  22: ['D11'],
  20: ['D10'],
  18: ['D9'],
  16: ['D8'],
  14: ['D7'],
  12: ['D6'],
  10: ['D5'],
  8: ['D4'],
  6: ['D3'],
  4: ['D2'],
  2: ['D1'],
};

function getCheckoutSuggestions(remaining, checkout) {
  if (remaining > 170 || remaining < 2) return [];
  if (checkout === 'single_out' && remaining <= 60) {
    // For single out, any single field finish is also valid
    const suggestions = CHECKOUTS[remaining] || [];
    return suggestions;
  }
  return CHECKOUTS[remaining] || [];
}

// Gibt alle aktiven Wuerfe fuer ein Spiel zurueck (ohne bulloff, ohne rueckgaengig gemachte)
// Rueckgaengig gemachte: entweder geloescht (neue Methode) oder per undo_of markiert (alte Methode)
function activeThrowsQuery(gameId) {
  return db.prepare(`
    SELECT * FROM throws
    WHERE game_id = ? AND is_bulloff = 0 AND undo_of IS NULL
    AND id NOT IN (
      SELECT COALESCE(undo_of, 0) FROM throws WHERE game_id = ? AND undo_of IS NOT NULL
    )
    ORDER BY id ASC
  `).all(gameId, gameId);
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
    res.status(500).json({ error: err.message });
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

    // Determine current turn
    const currentTurn = game.status === 'active' ? getCurrentTurn(game) : null;

    // Checkout suggestions for the active player
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
    res.status(500).json({ error: err.message });
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

    if (![0, 25, 50].includes(p1s) || ![0, 25, 50].includes(p2s)) {
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

    if (p1s === p2s) {
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
      winnerId = p1s > p2s ? game.player1_id : game.player2_id;
    }

    db.prepare("UPDATE games SET bull_winner_id = ?, status = 'active' WHERE id = ?").run(winnerId, game.id);
    return res.json({ status: 'active', bull_winner_id: winnerId });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    if (typeof score !== 'number' || score < 0 || score > 180) {
      return res.status(400).json({ error: 'Ungültige Punktzahl – muss zwischen 0 und 180 liegen' });
    }

    // Check turn order
    const expectedTurn = getCurrentTurn(game);
    if (player_id !== expectedTurn) {
      return res.status(400).json({ error: 'Not this player\'s turn' });
    }

    const tournament = db.prepare('SELECT checkout FROM tournaments WHERE id = ?').get(game.tournament_id);
    const checkoutMode = tournament ? tournament.checkout : 'single_out';

    const currentRemaining = getRemaining(game.id, player_id);
    const newRemaining = currentRemaining - score;

    let actualScore = score;
    let actualRemaining = newRemaining;
    let isBust = false;

    if (checkoutMode === 'double_out') {
      // Bust conditions for double out:
      // 1. remaining goes below 0
      // 2. remaining equals 1 (can't finish with a double from 1)
      // 3. remaining equals 0 but is_double is not true
      if (newRemaining < 0 || newRemaining === 1) {
        isBust = true;
      } else if (newRemaining === 0 && !is_double) {
        isBust = true;
      }
    } else {
      // Single out: bust only if remaining goes below 0
      if (newRemaining < 0) {
        isBust = true;
      }
    }

    if (isBust) {
      actualScore = 0;
      actualRemaining = currentRemaining;
    }

    // Save throw
    db.prepare(
      'INSERT INTO throws (game_id, player_id, score, remaining, is_bulloff) VALUES (?, ?, ?, ?, 0)'
    ).run(game.id, player_id, actualScore, actualRemaining);

    // Check for game over (checkout)
    if (!isBust && newRemaining === 0) {
      db.prepare('UPDATE games SET status = ?, winner_id = ? WHERE id = ?').run('finished', player_id, game.id);
      advanceBracket(game);

      return res.json({
        status: 'finished',
        winner_id: player_id,
        remaining: 0,
        bust: false,
        message: `Spieler ${player_id} hat ausgecheckt!`,
      });
    }

    const checkoutSuggestions = !isBust ? getCheckoutSuggestions(actualRemaining, checkoutMode) : [];

    return res.json({
      status: 'active',
      remaining: actualRemaining,
      bust: isBust,
      score: actualScore,
      checkout_suggestions: checkoutSuggestions,
      message: isBust ? 'Bust! Runde ungueltig.' : undefined,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    advanceBracket(game);

    res.json({
      status: 'finished',
      winner_id,
      message: `Spiel manuell beendet. Gewinner: Spieler ${winner_id}.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Advance bracket: check if all games in current round are finished, then generate next round
function advanceBracket(game) {
  const roundGames = db.prepare(
    'SELECT * FROM games WHERE tournament_id = ? AND round = ?'
  ).all(game.tournament_id, game.round);

  const allFinished = roundGames.every(g => g.status === 'finished');
  if (!allFinished) return;

  const winners = roundGames.map(g => g.winner_id).filter(Boolean);

  if (winners.length <= 1) {
    // Tournament is finished
    db.prepare('UPDATE tournaments SET status = ? WHERE id = ?').run('finished', game.tournament_id);
    return;
  }

  // Generate next round games (pair winners)
  const nextRound = game.round + 1;
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(game.tournament_id);
  const startScore = tournament ? (tournament.format === '301' ? 301 : 501) : 501;

  for (let i = 0; i < winners.length; i += 2) {
    const p1 = winners[i];
    const p2 = winners[i + 1] || null;

    if (p2) {
      db.prepare(
        'INSERT INTO games (tournament_id, round, player1_id, player2_id, status, start_score) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(game.tournament_id, nextRound, p1, p2, 'pending', startScore);
    } else {
      // Odd player gets a bye — auto-advance
      db.prepare(
        'INSERT INTO games (tournament_id, round, player1_id, player2_id, status, start_score, winner_id) VALUES (?, ?, ?, NULL, ?, ?, ?)'
      ).run(game.tournament_id, nextRound, p1, 'finished', startScore, p1);
    }
  }
}

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
      return res.status(400).json({ error: 'Not this player\'s turn' });
    }

    const tournament = db.prepare('SELECT checkout FROM tournaments WHERE id = ?').get(game.tournament_id);
    const checkoutMode = tournament ? tournament.checkout : 'single_out';

    // Zaehle Wuerfe in der aktuellen Runde (simuliert, korrekt auch bei Busts und Undos)
    const throwsInRound = getCurrentRoundThrows(game).length;

    const currentRemaining = getRemaining(game.id, player_id);
    const newRemaining = currentRemaining - parsed.score;

    let isBust = false;
    if (checkoutMode === 'double_out') {
      if (newRemaining < 0 || newRemaining === 1) {
        isBust = true;
      } else if (newRemaining === 0 && !parsed.isDouble) {
        isBust = true;
      }
    } else {
      if (newRemaining < 0) isBust = true;
    }

    const actualScore = isBust ? 0 : parsed.score;
    const actualRemaining = isBust ? currentRemaining : newRemaining;

    // Wurf speichern
    const result = db.prepare(
      'INSERT INTO throws (game_id, player_id, score, remaining, is_bulloff, segment) VALUES (?, ?, ?, ?, 0, ?)'
    ).run(game.id, player_id, actualScore, actualRemaining, isBust ? 'BUST' : segment.toUpperCase());

    // Pruefen ob Spiel gewonnen
    if (!isBust && newRemaining === 0) {
      db.prepare('UPDATE games SET status = ?, winner_id = ? WHERE id = ?').run('finished', player_id, game.id);
      advanceBracket(game);
      return res.json({
        throw_id: result.lastInsertRowid,
        segment: segment.toUpperCase(),
        score: actualScore,
        remaining: 0,
        bust: false,
        round_complete: true,
        game_finished: true,
        winner_id: player_id,
      });
    }

    // Nach 3 Wuerfen: Runde automatisch beenden (Wechsel zum anderen Spieler)
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
      checkout_suggestions: checkoutSuggestions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
      return res.status(400).json({ error: 'Nur die letzten 9 Würfe können rückgängig gemacht werden' });
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
    res.status(500).json({ error: err.message });
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

    // Anzahl Legs anhand der Runde ableiten
    let legs = 1;
    if (tournament) {
      if (game.round === 0) {
        legs = tournament.prelim_legs || 1;
      } else {
        const maxRound = db.prepare(
          'SELECT MAX(round) as max FROM games WHERE tournament_id = ? AND round > 0'
        ).get(game.tournament_id);
        const max = maxRound ? maxRound.max : game.round;
        if (game.round >= max) legs = tournament.final_legs || 5;
        else if (game.round === max - 1) legs = tournament.sf_legs || 3;
        else if (game.round === max - 2) legs = tournament.qf_legs || 3;
        else legs = tournament.prelim_legs || 1;
      }
    }

    // Aktive Wuerfe (ohne undo) pro Spieler
    const allActiveThrows = activeThrowsQuery(game.id);
    const activeThrowsP1 = game.player1_id ? allActiveThrows.filter(t => t.player_id === game.player1_id) : [];
    const activeThrowsP2 = game.player2_id ? allActiveThrows.filter(t => t.player_id === game.player2_id) : [];

    const p1Remaining = game.player1_id ? getRemaining(game.id, game.player1_id) : game.start_score;
    const p2Remaining = game.player2_id ? getRemaining(game.id, game.player2_id) : game.start_score;

    const currentTurn = game.status === 'active' ? getCurrentTurn(game) : null;

    // Würfe der aktuellen unvollständigen Runde des aktiven Spielers (korrekt via Simulation)
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
        legs,
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
    res.status(500).json({ error: err.message });
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
    // Ensure board belongs to the same tournament as the game
    if (board.tournament_id !== null && game.tournament_id !== null && board.tournament_id !== game.tournament_id) {
      return res.status(400).json({ error: 'Scheibe gehört nicht zum Turnier des Spiels' });
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
      return res.status(400).json({ error: 'Nur ausstehende Spiele können übersprungen werden' });
    }
    db.prepare('UPDATE games SET board_id = NULL WHERE id = ?').run(req.params.id);
    const updated = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /games/:id/reset — Bulloff zurücksetzen (Spiel auf pending, nur wenn bulloff oder pending)
router.post('/:id/reset', requireAuth, (req, res) => {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
  if (!game) return res.status(404).json({ error: 'Spiel nicht gefunden' });
  if (!['pending', 'bulloff'].includes(game.status)) {
    return res.status(400).json({ error: 'Spiel kann nicht zurückgesetzt werden (bereits aktiv oder beendet)' });
  }
  db.prepare("DELETE FROM throws WHERE game_id = ? AND is_bulloff = 1").run(game.id);
  db.prepare("UPDATE games SET status = 'pending', bull_winner_id = NULL WHERE id = ?").run(game.id);
  res.json({ success: true });
});

module.exports = router;
