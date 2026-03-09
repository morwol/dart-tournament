// NEU: User-Verwaltung Route
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db/db');
const { requireAdmin } = require('../middleware/auth');
const { auditLog } = require('../lib/auditLog');

// NEU: Alle User auflisten (nur admin)
router.get('/', requireAdmin, (req, res) => {
  const users = db.prepare(
    'SELECT id, username, role, email, display_name, active, created_at FROM users'
  ).all();
  res.json(users);
});

// NEU: User anlegen (nur admin)
router.post('/', requireAdmin, async (req, res) => {
  const { username, password, role, email, display_name } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields: username, password, role' });
  }

  const validRoles = ['admin', 'director', 'referee', 'gastronomy'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Ungültige Rolle. Erlaubt: ${validRoles.join(', ')}` });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const result = db.prepare(
      'INSERT INTO users (username, password_hash, role, email, display_name, created_by) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(username, password_hash, role, email || null, display_name || null, req.user.id);

    auditLog(req, 'user', 'CREATE', `User "${username}" (${role}) angelegt`, result.lastInsertRowid);
    res.status(201).json({
      id: result.lastInsertRowid,
      username,
      role,
      email: email || null,
      display_name: display_name || null,
      active: 1
    });
  } catch (err) {
    res.status(500).json({ error: 'Benutzer konnte nicht angelegt werden' });
  }
});

// NEU: User bearbeiten (nur admin)
router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { username, password, role, email, display_name } = req.body;

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const updates = [];
  const params = [];

  if (username !== undefined) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id);
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    updates.push('username = ?');
    params.push(username);
  }
  if (password !== undefined) {
    const password_hash = await bcrypt.hash(password, 10);
    updates.push('password_hash = ?');
    params.push(password_hash);
  }
  if (role !== undefined) {
    const validRoles = ['admin', 'director', 'referee', 'gastronomy'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Ungültige Rolle. Erlaubt: ${validRoles.join(', ')}` });
    }
    updates.push('role = ?');
    params.push(role);
  }
  if (email !== undefined) {
    updates.push('email = ?');
    params.push(email);
  }
  if (display_name !== undefined) {
    updates.push('display_name = ?');
    params.push(display_name);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare(
    'SELECT id, username, role, email, display_name, active, created_at FROM users WHERE id = ?'
  ).get(id);
  res.json(updated);
});

// NEU: User deaktivieren (nur admin, active=0)
router.delete('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const target = db.prepare('SELECT username, role FROM users WHERE id = ?').get(id);
  db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(id);
  auditLog(req, 'user', 'DELETE', `User "${target?.username}" (${target?.role}) deaktiviert`, id);
  res.json({ message: 'User deaktiviert' });
});

module.exports = router;
