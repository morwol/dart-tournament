// NEU: Schedule-Verwaltung Route (Spiel ueberspringen / aktivieren)
const express = require('express');
const router = express.Router();
const { db } = require('../db/db');
const { requireAny } = require('../middleware/auth');

// GET /api/schedule — Alle Schedule-Einträge
router.get('/', (req, res) => {
  try {
    const entries = db.prepare(`
      SELECT s.*,
        g.player1_id, g.player2_id, g.status as game_status, g.start_score,
        g.round, g.board_id,
        p1.name as player1_name, p2.name as player2_name,
        b.number as board_number
      FROM schedule s
      JOIN games g ON s.game_id = g.id
      LEFT JOIN players p1 ON g.player1_id = p1.id
      LEFT JOIN players p2 ON g.player2_id = p2.id
      LEFT JOIN boards b ON s.board_id = b.id
      WHERE s.status != 'skipped'
      ORDER BY s.scheduled_at ASC, s.id ASC
    `).all();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NEU: Spiel ueberspringen (admin oder referee)
router.put('/:id/skip', requireAny(['admin', 'referee']), (req, res) => {
  const { id } = req.params;
  const { skipped_reason } = req.body;

  const schedule = db.prepare('SELECT id, status FROM schedule WHERE id = ?').get(id);
  if (!schedule) {
    return res.status(404).json({ error: 'Schedule entry not found' });
  }

  db.prepare(
    'UPDATE schedule SET status = ?, skipped_reason = ? WHERE id = ?'
  ).run('skipped', skipped_reason || null, id);

  res.json({ message: 'Game skipped', id: Number(id) });
});

// NEU: Spiel als aktiv setzen (admin oder referee)
router.put('/:id/activate', requireAny(['admin', 'referee']), (req, res) => {
  const { id } = req.params;

  const schedule = db.prepare('SELECT id, board_id, status FROM schedule WHERE id = ?').get(id);
  if (!schedule) {
    return res.status(404).json({ error: 'Schedule entry not found' });
  }

  // Pruefen ob bereits ein aktives Spiel auf dieser Scheibe laeuft
  const activeOnBoard = db.prepare(
    'SELECT id FROM schedule WHERE board_id = ? AND status = ? AND id != ?'
  ).get(schedule.board_id, 'active', id);

  if (activeOnBoard) {
    return res.status(409).json({ error: 'Another game is already active on this board' });
  }

  db.prepare('UPDATE schedule SET status = ? WHERE id = ?').run('active', id);

  res.json({ message: 'Game activated', id: Number(id) });
});

module.exports = router;
