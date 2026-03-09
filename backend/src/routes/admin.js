// Admin-spezifische Verwaltungsrouten (Wipe, System, Logs)
const express = require('express');
const router = express.Router();
const { db } = require('../db/db');
const { requireAdmin, requireAdminOrDirector } = require('../middleware/auth');
const { auditLog } = require('../lib/auditLog');

// POST /api/admin/wipe — Alle Turnierdaten löschen (Boards + Users + Produkte bleiben)
router.post('/wipe', requireAdmin, (req, res) => {
  const wipeTx = db.transaction(() => {
    db.prepare('DELETE FROM throws').run();
    db.prepare('DELETE FROM group_players').run();
    db.prepare('DELETE FROM games').run();
    db.prepare('DELETE FROM groups').run();
    db.prepare('DELETE FROM players').run();
    try { db.prepare('DELETE FROM schedule').run(); } catch (_) {}
    db.prepare('DELETE FROM tournaments').run();
    // Boards zurücksetzen aber behalten
    try { db.prepare("UPDATE boards SET is_final = 0").run(); } catch (_) {}
    // Bestellungen/Gäste für sauberen Start ebenfalls leeren
    try { db.prepare('DELETE FROM orders').run(); } catch (_) {}
    try { db.prepare('DELETE FROM guests').run(); } catch (_) {}
    try { db.prepare('DELETE FROM settlements').run(); } catch (_) {}
  });

  wipeTx();
  auditLog(req, 'system', 'WIPE', 'Alle Turnierdaten gelöscht (Boards, User, Produkte bleiben)');
  res.json({ success: true, message: 'Alle Turnierdaten wurden gelöscht. Admins, User, Boards und Produkte bleiben erhalten.' });
});

// GET /api/admin/logs — Audit-Log abrufen (Admin + Director)
router.get('/logs', requireAdminOrDirector, (req, res) => {
  const limit    = Math.min(parseInt(req.query.limit)    || 200, 500);
  const category = req.query.category || null;
  const action   = req.query.action   || null;

  let sql = 'SELECT * FROM audit_log';
  const params = [];
  const where = [];

  if (category) { where.push('category = ?'); params.push(category); }
  if (action)   { where.push('action = ?');   params.push(action); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY id DESC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// DELETE /api/admin/logs — Audit-Log leeren (nur Admin)
router.delete('/logs', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM audit_log').run();
  auditLog(req, 'system', 'LOG_CLEAR', 'Audit-Log geleert');
  res.json({ success: true });
});

module.exports = router;
