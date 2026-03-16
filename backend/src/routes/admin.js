// Admin-spezifische Verwaltungsrouten (Wipe, System, Logs)
const express = require('express');
const router = express.Router();
const { db } = require('../db/db');
const { requireAdmin, requireAdminOrDirector, requireAny } = require('../middleware/auth');
const { auditLog } = require('../lib/auditLog');

// POST /api/admin/wipe — Alle Turnierdaten löschen (Boards + Users + Produkte bleiben)
router.post('/wipe', requireAdmin, (req, res) => {
  const wipeTx = db.transaction(() => {
    db.prepare('DELETE FROM throws').run();
    db.prepare('DELETE FROM group_players').run();
    db.prepare('DELETE FROM games').run();
    db.prepare('DELETE FROM groups').run();
    db.prepare('DELETE FROM tournament_registrations').run();
    try { db.prepare('DELETE FROM schedule').run(); } catch (_) {}
    db.prepare('DELETE FROM tournaments').run();
    // Spielerprofile bleiben erhalten (persistent über Turniere)
    // Boards zurücksetzen aber behalten
    try { db.prepare("UPDATE boards SET is_final = 0").run(); } catch (_) {}
    // Bestellungen/Gäste für sauberen Start ebenfalls leeren
    try { db.prepare('DELETE FROM orders').run(); } catch (_) {}
    try { db.prepare('DELETE FROM guests').run(); } catch (_) {}
    try { db.prepare('DELETE FROM settlements').run(); } catch (_) {}
  });

  wipeTx();
  auditLog(req, 'system', 'WIPE', 'Alle Turnierdaten gelöscht (Spielerprofile, Boards, User, Produkte bleiben)');
  res.json({ success: true, message: 'Alle Turnierdaten wurden gelöscht. Spielerprofile, Admins, User, Boards und Produkte bleiben erhalten.' });
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

// GET /api/admin/logs/export — Audit-Log als CSV exportieren (nur Admin, nicht Director)
router.get('/logs/export', requireAdmin, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Nur Admins dürfen den Log exportieren.' });
  }

  const rows = db.prepare('SELECT id, ts, actor, role, category, action, detail, target_id FROM audit_log ORDER BY id DESC').all();

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const header = 'id,ts,actor,role,category,action,detail,target_id';
  const lines = rows.map(r =>
    [r.id, r.ts, r.actor, r.role, r.category, r.action, r.detail, r.target_id]
      .map(escapeCSV)
      .join(',')
  );
  const csv = [header, ...lines].join('\n');

  const filename = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// GET /api/admin/reports/gastro — Gastro report (admin/gastro only)
router.get('/reports/gastro', requireAny(['admin', 'gastro']), (req, res) => {
  try {
    const revenue = db.prepare(`
      SELECT
        COALESCE(SUM(o.quantity * p.price), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN o.status = 'paid' THEN o.quantity * p.price ELSE 0 END), 0) AS paid_revenue,
        COALESCE(SUM(CASE WHEN o.status = 'open' THEN o.quantity * p.price ELSE 0 END), 0) AS open_revenue,
        COUNT(DISTINCT o.id) AS total_orders,
        COUNT(DISTINCT o.guest_id) AS total_guests
      FROM orders o
      JOIN products p ON o.product_id = p.id
    `).get();

    const topProducts = db.prepare(`
      SELECT
        p.id, p.name, p.category, p.price,
        COALESCE(SUM(o.quantity), 0) AS total_quantity,
        COALESCE(SUM(o.quantity * p.price), 0) AS total_revenue
      FROM products p
      LEFT JOIN orders o ON o.product_id = p.id
      GROUP BY p.id
      HAVING total_quantity > 0
      ORDER BY total_revenue DESC
    `).all();

    const ordersPerGuest = db.prepare(`
      SELECT
        g.id AS guest_id, g.name AS guest_name,
        COUNT(o.id) AS order_count,
        COALESCE(SUM(o.quantity), 0) AS total_items,
        COALESCE(SUM(o.quantity * p.price), 0) AS total_spent,
        COALESCE(SUM(CASE WHEN o.status = 'open' THEN o.quantity * p.price ELSE 0 END), 0) AS open_amount,
        COALESCE(SUM(CASE WHEN o.status = 'paid' THEN o.quantity * p.price ELSE 0 END), 0) AS paid_amount
      FROM guests g
      JOIN orders o ON o.guest_id = g.id
      JOIN products p ON o.product_id = p.id
      GROUP BY g.id
      ORDER BY total_spent DESC
    `).all();

    const byCategory = db.prepare(`
      SELECT
        p.category,
        COALESCE(SUM(o.quantity), 0) AS total_quantity,
        COALESCE(SUM(o.quantity * p.price), 0) AS total_revenue
      FROM orders o
      JOIN products p ON o.product_id = p.id
      GROUP BY p.category
      ORDER BY total_revenue DESC
    `).all();

    const settlements = db.prepare(`
      SELECT COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS total
      FROM settlements
    `).get();

    res.json({
      revenue,
      top_products: topProducts,
      orders_per_guest: ordersPerGuest,
      by_category: byCategory,
      settlements,
    });
  } catch (err) {
    console.error('[admin/reports/gastro]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
