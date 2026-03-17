const express = require('express');
const { db } = require('../db/db');
const { verifyToken, requireAuth, requireAdmin, requireAny } = require('../middleware/auth');

const router = express.Router();

// POST /api/orders — requires guest validation (guest must exist)
router.post('/', requireAuth, (req, res) => {
  const { guest_id, guest_uid, product_id, quantity } = req.body;
  if (!product_id) return res.status(400).json({ error: 'Produkt-ID fehlt' });
  const qty = quantity !== undefined ? parseInt(quantity, 10) : 1;
  if (isNaN(qty) || qty < 1) return res.status(400).json({ error: 'Ungültige Menge – muss mindestens 1 sein' });

  let guest;
  if (guest_uid) {
    guest = db.prepare('SELECT * FROM guests WHERE nfc_uid = ?').get(guest_uid);
  } else if (guest_id) {
    guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(guest_id);
  }
  if (!guest) return res.status(404).json({ error: 'Gast nicht gefunden' });

  const product = db.prepare('SELECT * FROM products WHERE id = ? AND available = 1').get(product_id);
  if (!product) {
    return res.status(404).json({ error: 'Produkt nicht verfügbar oder nicht vorhanden' });
  }

  const result = db.prepare(
    'INSERT INTO orders (guest_id, product_id, quantity) VALUES (?, ?, ?)'
  ).run(guest.id, product_id, qty);

  const order = db.prepare(`
    SELECT o.*, p.name as product_name, p.price, p.category
    FROM orders o
    JOIN products p ON o.product_id = p.id
    WHERE o.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(order);
});

// PUT /api/orders/:id/pay (Admin)
router.put('/:id/pay', verifyToken, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('paid', req.params.id);

  const updated = db.prepare(`
    SELECT o.*, p.name as product_name, p.price, p.category
    FROM orders o
    JOIN products p ON o.product_id = p.id
    WHERE o.id = ?
  `).get(req.params.id);

  res.json(updated);
});

// GET /api/orders/summary (Admin)
router.get('/summary', verifyToken, (req, res) => {
  const summary = db.prepare(`
    SELECT
      p.name as product_name,
      p.category,
      p.price,
      SUM(o.quantity) as total_quantity,
      SUM(o.quantity * p.price) as total_amount,
      SUM(CASE WHEN o.status = 'paid' THEN o.quantity ELSE 0 END) as paid_quantity,
      SUM(CASE WHEN o.status = 'paid' THEN o.quantity * p.price ELSE 0 END) as paid_amount,
      SUM(CASE WHEN o.status = 'open' THEN o.quantity ELSE 0 END) as open_quantity,
      SUM(CASE WHEN o.status = 'open' THEN o.quantity * p.price ELSE 0 END) as open_amount
    FROM orders o
    JOIN products p ON o.product_id = p.id
    WHERE DATE(o.ordered_at) = DATE('now')
    GROUP BY p.id
    ORDER BY p.category, p.name
  `).all();

  const totals = db.prepare(`
    SELECT
      SUM(o.quantity * p.price) as grand_total,
      SUM(CASE WHEN o.status = 'paid' THEN o.quantity * p.price ELSE 0 END) as total_paid,
      SUM(CASE WHEN o.status = 'open' THEN o.quantity * p.price ELSE 0 END) as total_open
    FROM orders o
    JOIN products p ON o.product_id = p.id
    WHERE DATE(o.ordered_at) = DATE('now')
  `).get();

  res.json({ products: summary, totals: totals || { grand_total: 0, total_paid: 0, total_open: 0 } });
});

// NEU: Gast abrechnen (alle open orders -> paid, Settlement anlegen)
router.post('/settle/:guestId', requireAuth, (req, res) => {
  try {
    const guestId = parseInt(req.params.guestId, 10);
    const guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(guestId);
    if (!guest) return res.status(404).json({ error: 'Guest not found' });

    const openOrders = db.prepare(`
      SELECT o.id, o.quantity, p.price
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.guest_id = ? AND o.status = 'open'
    `).all(guestId);

    if (openOrders.length === 0) {
      return res.json({ message: 'No open orders to settle', total_amount: 0 });
    }

    const totalAmount = openOrders.reduce((sum, o) => sum + (o.quantity * o.price), 0);

    const settleTransaction = db.transaction(() => {
      // Alle offenen Bestellungen auf paid setzen
      db.prepare("UPDATE orders SET status = 'paid' WHERE guest_id = ? AND status = 'open'").run(guestId);

      // Settlement anlegen
      // settled_by references users(id) — admins live in a separate table,
      // so only set it for role-based users (not legacy admins).
      const settledBy = (req.user && req.user.role) ? req.user.id : null;
      const note = req.body.note || null;
      db.prepare(
        'INSERT INTO settlements (guest_id, total_amount, settled_by, note) VALUES (?, ?, ?, ?)'
      ).run(guestId, totalAmount, settledBy, note);
    });

    settleTransaction();

    return res.json({
      guest_id: guestId,
      guest_name: guest.name,
      orders_settled: openOrders.length,
      total_amount: totalAmount,
    });
  } catch (err) {
    console.error('[orders/settle]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEU: Admin-Dashboard (Gesamtumsatz, pro Artikel)
router.get('/dashboard', requireAuth, (req, res) => {
  try {
    const byProduct = db.prepare(`
      SELECT
        p.id as product_id,
        p.name as product_name,
        p.category,
        p.price,
        COALESCE(SUM(o.quantity), 0) as total_quantity,
        COALESCE(SUM(o.quantity * p.price), 0) as total_amount,
        COALESCE(SUM(CASE WHEN o.status = 'paid' THEN o.quantity ELSE 0 END), 0) as paid_quantity,
        COALESCE(SUM(CASE WHEN o.status = 'paid' THEN o.quantity * p.price ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN o.status = 'open' THEN o.quantity ELSE 0 END), 0) as open_quantity,
        COALESCE(SUM(CASE WHEN o.status = 'open' THEN o.quantity * p.price ELSE 0 END), 0) as open_amount
      FROM products p
      LEFT JOIN orders o ON o.product_id = p.id
      GROUP BY p.id
      ORDER BY p.category, p.sort_order, p.name
    `).all();

    const totals = db.prepare(`
      SELECT
        COALESCE(SUM(o.quantity * p.price), 0) as grand_total,
        COALESCE(SUM(CASE WHEN o.status = 'paid' THEN o.quantity * p.price ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN o.status = 'open' THEN o.quantity * p.price ELSE 0 END), 0) as total_open,
        COUNT(DISTINCT o.guest_id) as total_guests
      FROM orders o
      JOIN products p ON o.product_id = p.id
    `).get();

    const settlements = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM settlements
    `).get();

    return res.json({
      products: byProduct,
      totals: totals || { grand_total: 0, total_paid: 0, total_open: 0, total_guests: 0 },
      settlements: settlements || { count: 0, total: 0 },
    });
  } catch (err) {
    console.error('[orders/dashboard]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEU: Offene Bestellungen eines bestimmten Gastes (fuer Bestellungs-Ansicht)
router.get('/guest/:guestId', requireAuth, (req, res) => {
  try {
    const guestId = parseInt(req.params.guestId, 10);
    const guest = db.prepare('SELECT * FROM guests WHERE id = ?').get(guestId);
    if (!guest) return res.status(404).json({ error: 'Gast nicht gefunden' });

    const items = db.prepare(`
      SELECT p.name as product_name, SUM(o.quantity) as quantity,
             p.price, SUM(o.quantity * p.price) as total
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.guest_id = ? AND o.status = 'open'
      GROUP BY p.id
      ORDER BY p.name
    `).all(guestId);

    const total = items.reduce((sum, i) => sum + i.total, 0);
    return res.json({ guest, items, total });
  } catch (err) {
    console.error('[orders/guest]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEU: Alle Gaeste mit offenem Betrag + Artikel-Liste
router.get('/by-guest', requireAuth, (req, res) => {
  try {
    const guests = db.prepare(`
      SELECT
        g.id as guest_id,
        g.name as guest_name,
        COUNT(o.id) as open_orders,
        COALESCE(SUM(o.quantity * p.price), 0) as total,
        MIN(o.ordered_at) as oldest_order_at
      FROM guests g
      JOIN orders o ON o.guest_id = g.id AND o.status = 'open'
      JOIN products p ON o.product_id = p.id
      GROUP BY g.id
      HAVING open_orders > 0
      ORDER BY total DESC
    `).all();

    const result = guests.map(g => {
      const items = db.prepare(`
        SELECT p.name as product_name, SUM(o.quantity) as quantity,
               SUM(o.quantity * p.price) as total
        FROM orders o
        JOIN products p ON o.product_id = p.id
        WHERE o.guest_id = ? AND o.status = 'open'
        GROUP BY p.id
        ORDER BY p.name
      `).all(g.guest_id);
      return { ...g, items };
    });

    return res.json(result);
  } catch (err) {
    console.error('[orders/by-guest]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;
