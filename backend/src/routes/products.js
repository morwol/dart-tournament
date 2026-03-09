const express = require('express');
const { db } = require('../db/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/products
router.get('/', (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY category, sort_order, name').all();
  res.json(products);
});

// POST /api/products (Admin)
router.post('/', requireAuth, (req, res) => {
  try {
    const { name, category, price, sort_order, image_url } = req.body;
    if (!name || !category || price === undefined) {
      return res.status(400).json({ error: 'name, category and price required' });
    }
    if (!['food', 'drink'].includes(category)) {
      return res.status(400).json({ error: 'Category must be food or drink' });
    }
    const result = db.prepare(
      'INSERT INTO products (name, category, price, sort_order, image_url) VALUES (?, ?, ?, ?, ?)'
    ).run(name, category, parseFloat(price), sort_order || 0, image_url || null);
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id
router.put('/:id', requireAuth, (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const { name, category, price, available, sort_order, image_url } = req.body;
    const updates = [];
    const values = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (category !== undefined) {
      if (!['food', 'drink'].includes(category)) return res.status(400).json({ error: 'Category must be food or drink' });
      updates.push('category = ?'); values.push(category);
    }
    if (price !== undefined) { updates.push('price = ?'); values.push(parseFloat(price)); }
    if (available !== undefined) { updates.push('available = ?'); values.push(available ? 1 : 0); }
    if (sort_order !== undefined) { updates.push('sort_order = ?'); values.push(sort_order); }
    if (image_url !== undefined) { updates.push('image_url = ?'); values.push(image_url); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    values.push(req.params.id);
    db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    return res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id — nur wenn keine offenen Bestellungen
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const openOrder = db.prepare(
      "SELECT id FROM orders WHERE product_id = ? AND status = 'open' LIMIT 1"
    ).get(req.params.id);
    if (openOrder) {
      return res.status(409).json({ error: 'Artikel kann nicht gelöscht werden – es gibt noch offene Bestellungen dafür.' });
    }

    db.prepare('DELETE FROM orders WHERE product_id = ?').run(req.params.id);
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
