// NEU: Board-Verwaltung Route
const express = require('express');
const router = express.Router();
const { db } = require('../db/db');
const { requireAdmin, requireAdminOrDirector, requireAny } = require('../middleware/auth');

// NEU: Alle Scheiben auflisten — optional gefiltert nach ?tournament_id=X
router.get('/', (req, res) => {
  const { tournament_id } = req.query;
  let boards;
  if (tournament_id !== undefined && tournament_id !== '') {
    boards = db.prepare('SELECT * FROM boards WHERE tournament_id = ? ORDER BY number').all(parseInt(tournament_id, 10));
  } else {
    boards = db.prepare('SELECT * FROM boards ORDER BY number').all();
  }
  res.json(boards);
});

// NEU: Scheibe anlegen (nur admin)
router.post('/', requireAdmin, (req, res) => {
  const { number, name, tournament_id } = req.body;

  if (number === undefined) {
    return res.status(400).json({ error: 'Missing required field: number' });
  }

  // Uniqueness check is scoped to the tournament (if tournament_id provided)
  let existing;
  if (tournament_id) {
    existing = db.prepare('SELECT id FROM boards WHERE number = ? AND tournament_id = ?').get(number, tournament_id);
  } else {
    existing = db.prepare('SELECT id FROM boards WHERE number = ? AND tournament_id IS NULL').get(number);
  }
  if (existing) {
    return res.status(409).json({ error: 'Diese Board-Nummer ist bereits vergeben' });
  }

  const result = db.prepare(
    'INSERT INTO boards (number, name, tournament_id) VALUES (?, ?, ?)'
  ).run(number, name || null, tournament_id || null);

  res.status(201).json({
    id: result.lastInsertRowid,
    number,
    name: name || null,
    active: 1,
    tournament_id: tournament_id || null
  });
});

// Resolve a board by its display number for the currently active tournament
router.get('/by-number/:number', (req, res) => {
  const number = parseInt(req.params.number, 10);
  if (isNaN(number)) return res.status(400).json({ error: 'Invalid board number' });

  const activeTournament = db.prepare("SELECT id FROM tournaments WHERE status = 'active' LIMIT 1").get();
  if (!activeTournament) return res.status(404).json({ error: 'No active tournament' });

  const board = db.prepare('SELECT * FROM boards WHERE number = ? AND tournament_id = ?').get(number, activeTournament.id);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  res.json(board);
});

// Aktuelles Spiel auf einer Scheibe — nur laufende Partien (bulloff oder active)
router.get('/:id/current-game', (req, res) => {
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id);
  if (!board) return res.status(404).json({ error: 'Scheibe nicht gefunden' });

  const game = db.prepare(`
    SELECT g.*, p1.name as player1_name, p2.name as player2_name
    FROM games g
    LEFT JOIN players p1 ON g.player1_id = p1.id
    LEFT JOIN players p2 ON g.player2_id = p2.id
    WHERE g.board_id = ? AND g.status IN ('bulloff', 'active')
    ORDER BY g.id DESC LIMIT 1
  `).get(req.params.id);

  if (!game) return res.json(null);
  res.json({ game_id: game.id, ...game });
});

// NEU: Naechstes geplantes Spiel auf einer Scheibe (status='scheduled')
router.get('/:id/next-game', (req, res) => {
  const { id } = req.params;

  const board = db.prepare('SELECT id FROM boards WHERE id = ?').get(id);
  if (!board) {
    return res.status(404).json({ error: 'Scheibe nicht gefunden' });
  }

  const schedule = db.prepare(`
    SELECT s.*, g.player1_id, g.player2_id, g.status AS game_status, g.start_score,
           p1.name AS player1_name, p2.name AS player2_name
    FROM schedule s
    JOIN games g ON s.game_id = g.id
    LEFT JOIN players p1 ON g.player1_id = p1.id
    LEFT JOIN players p2 ON g.player2_id = p2.id
    WHERE s.board_id = ? AND s.status = 'scheduled'
      AND g.status NOT IN ('bulloff', 'active', 'finished')
    ORDER BY s.scheduled_at ASC, s.id ASC
    LIMIT 1
  `).get(id);

  if (!schedule) {
    return res.json(null);
  }

  res.json(schedule);
});

// Verfügbare (auswählbare) Partien auf einem Board — alle pending Spiele mit echten Spielern
router.get('/:id/available-games', (req, res) => {
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id);
  if (!board) return res.status(404).json({ error: 'Scheibe nicht gefunden' });

  const games = db.prepare(`
    SELECT g.*, p1.name as player1_name, p2.name as player2_name
    FROM games g
    JOIN players p1 ON g.player1_id = p1.id
    JOIN players p2 ON g.player2_id = p2.id
    WHERE g.board_id = ? AND g.status = 'pending'
    ORDER BY g.id ASC
  `).all(req.params.id);

  res.json(games);
});

// DELETE /api/boards/:id (Admin)
router.delete('/:id', requireAdmin, (req, res) => {
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id);
  if (!board) return res.status(404).json({ error: 'Scheibe nicht gefunden' });

  // Schutz: Keine Löschung wenn ein Spiel aktiv/laufend auf dieser Scheibe
  const runningGame = db.prepare(
    "SELECT id FROM games WHERE board_id = ? AND status IN ('bulloff', 'active')"
  ).get(req.params.id);
  if (runningGame) {
    return res.status(409).json({ error: 'Scheibe kann nicht gelöscht werden – es läuft gerade ein Spiel. Bitte erst das Spiel abschließen oder im Turnierleiter-Tab freigeben.' });
  }

  // Ausstehende Zuweisungen automatisch aufheben
  db.prepare('UPDATE games SET board_id = NULL WHERE board_id = ?').run(req.params.id);
  try { db.prepare('DELETE FROM schedule WHERE board_id = ?').run(req.params.id); } catch (_) {}
  db.prepare('DELETE FROM boards WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// PUT /api/boards/:id/final (Admin) — Final-Board markieren
router.put('/:id/final', requireAdminOrDirector, (req, res) => {
  const { is_final } = req.body;
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id);
  if (!board) return res.status(404).json({ error: 'Scheibe nicht gefunden' });

  if (is_final) {
    const existingFinal = db.prepare('SELECT id FROM boards WHERE is_final = 1 AND id != ?').get(req.params.id);
    if (existingFinal) {
      return res.status(400).json({ error: 'Es kann nur ein Final-Board geben. Bitte zuerst das andere Board als Final deaktivieren.' });
    }
  }

  db.prepare('UPDATE boards SET is_final = ? WHERE id = ?').run(is_final ? 1 : 0, req.params.id);
  const updated = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// GET /api/boards/:id/player-stats/:playerId — Lieblings-Felder eines Spielers
router.get('/:id/player-stats/:playerId', (req, res) => {
  try {
    const { playerId } = req.params;

    const favSingle = db.prepare(`
      SELECT segment, COUNT(*) as cnt FROM throws
      WHERE player_id = ? AND is_bulloff = 0
        AND segment LIKE 'S%'
        AND segment NOT IN ('MISS', 'BUST')
      GROUP BY segment ORDER BY cnt DESC LIMIT 1
    `).get(playerId);

    const favDouble = db.prepare(`
      SELECT segment, COUNT(*) as cnt FROM throws
      WHERE player_id = ? AND is_bulloff = 0
        AND segment LIKE 'D%' AND segment != 'D-BULL'
        AND segment NOT IN ('MISS', 'BUST')
      GROUP BY segment ORDER BY cnt DESC LIMIT 1
    `).get(playerId);

    res.json({
      player_id: parseInt(playerId),
      fav_single: favSingle ? favSingle.segment : null,
      fav_single_count: favSingle ? favSingle.cnt : 0,
      fav_double: favDouble ? favDouble.segment : null,
      fav_double_count: favDouble ? favDouble.cnt : 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
