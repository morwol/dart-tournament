const express = require('express');
const crypto = require('crypto');
const { db } = require('../db/db');
const { verifyToken, requireAny } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');

const router = express.Router();

function hashUid(uid) {
  return crypto.createHash('sha256').update(uid).digest('hex');
}

// POST /api/nfc/scan
router.post('/scan', requireFields(['uid']), (req, res) => {
  const hashedUid = hashUid(req.body.uid);
  const guest = db.prepare('SELECT * FROM guests WHERE nfc_uid = ?').get(hashedUid);

  if (!guest) {
    return res.status(404).json({ error: 'Dieser NFC-Tag ist nicht registriert' });
  }

  if (guest.active === 0) {
    return res.status(403).json({ error: 'Armband gesperrt' });
  }

  res.json(guest);
});

// POST /api/nfc/create (Admin)
router.post('/create', verifyToken, requireFields(['uid', 'name']), (req, res) => {
  const { uid, name, tournament_id } = req.body;
  const hashedUid = hashUid(uid);

  const existing = db.prepare('SELECT * FROM guests WHERE nfc_uid = ?').get(hashedUid);
  if (existing) {
    return res.status(409).json({ error: 'Dieser NFC-Tag ist bereits registriert' });
  }

  const result = db.prepare(
    'INSERT INTO guests (nfc_uid, name, tournament_id) VALUES (?, ?, ?)'
  ).run(hashedUid, name, tournament_id || null);

  const guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(guest);
});

// GET /api/nfc/guests — Alle Gäste für manuelle Auswahl (Gastronomy + Admin)
router.get('/guests', requireAny(['admin', 'gastronomy']), (req, res) => {
  const guests = db.prepare('SELECT * FROM guests ORDER BY name ASC').all();
  res.json(guests);
});

// POST /api/nfc/create-manual — Gast ohne NFC-Hardware anlegen (Gastronomy + Admin)
router.post('/create-manual', requireAny(['admin', 'gastronomy']), requireFields(['name']), (req, res) => {
  const { name, tournament_id } = req.body;
  const uid = 'MANUAL-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();
  const result = db.prepare('INSERT INTO guests (nfc_uid, name, tournament_id) VALUES (?, ?, ?)').run(uid, name, tournament_id || null);
  const guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(guest);
});

// PUT /api/nfc/:uid/deactivate — Armband sperren
router.put('/:uid/deactivate', requireAny(['admin', 'gastronomy']), (req, res) => {
  const hashedUid = hashUid(req.params.uid);
  const guest = db.prepare('SELECT * FROM guests WHERE nfc_uid = ?').get(hashedUid);
  if (!guest) return res.status(404).json({ error: 'Gast nicht gefunden' });

  db.prepare('UPDATE guests SET active = 0 WHERE id = ?').run(guest.id);
  res.json({ success: true, guest: { id: guest.id, name: guest.name, active: 0 } });
});

// PUT /api/nfc/:uid/activate — Armband reaktivieren
router.put('/:uid/activate', requireAny(['admin', 'gastronomy']), (req, res) => {
  const hashedUid = hashUid(req.params.uid);
  const guest = db.prepare('SELECT * FROM guests WHERE nfc_uid = ?').get(hashedUid);
  if (!guest) return res.status(404).json({ error: 'Gast nicht gefunden' });

  db.prepare('UPDATE guests SET active = 1 WHERE id = ?').run(guest.id);
  res.json({ success: true, guest: { id: guest.id, name: guest.name, active: 1 } });
});

// GET /api/nfc/:uid/statement — Kontoauszug (public, für Gast-Self-Service)
router.get('/:uid/statement', (req, res) => {
  const hashedUid = hashUid(req.params.uid);
  const guest = db.prepare('SELECT id, name, active FROM guests WHERE nfc_uid = ?').get(hashedUid);
  if (!guest) return res.status(404).json({ error: 'Gast nicht gefunden' });

  const orders = db.prepare(`
    SELECT o.id, p.name as product_name, o.quantity,
           p.price, ROUND(o.quantity * p.price, 2) as total,
           o.status, o.ordered_at
    FROM orders o
    JOIN products p ON o.product_id = p.id
    WHERE o.guest_id = ?
    ORDER BY o.ordered_at DESC
  `).all(guest.id);

  const total_open = Math.round(orders.filter(o => o.status === 'open').reduce((s, o) => s + o.total, 0) * 100) / 100;
  const total_paid = Math.round(orders.filter(o => o.status === 'paid').reduce((s, o) => s + o.total, 0) * 100) / 100;

  res.json({
    guest,
    orders,
    summary: { total_open, total_paid, total: Math.round((total_open + total_paid) * 100) / 100 },
  });
});

// GET /api/nfc/:uid/orders
router.get('/:uid/orders', (req, res) => {
  const hashedUid = hashUid(req.params.uid);
  const guest = db.prepare('SELECT * FROM guests WHERE nfc_uid = ?').get(hashedUid);

  if (!guest) {
    return res.status(404).json({ error: 'Kein Gast für diesen NFC-Tag gefunden' });
  }

  const orders = db.prepare(`
    SELECT o.*, p.name as product_name, p.price, p.category
    FROM orders o
    JOIN products p ON o.product_id = p.id
    WHERE o.guest_id = ?
    ORDER BY o.ordered_at DESC
  `).all(guest.id);

  res.json({ guest, orders });
});

module.exports = router;
