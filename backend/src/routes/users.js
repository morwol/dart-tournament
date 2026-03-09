// NEU: User-Verwaltung Route
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db/db');
const { requireAdmin } = require('../middleware/auth');
const { auditLog } = require('../lib/auditLog');

const COLS = 'id, username, role, email, display_name, vorname, nickname, nachname, active, created_at';

// Alle User auflisten (nur admin)
router.get('/', requireAdmin, (req, res) => {
  const users = db.prepare(`SELECT ${COLS} FROM users`).all();
  res.json(users);
});

// User anlegen (nur admin)
router.post('/', requireAdmin, async (req, res) => {
  const { username, password, role, email, vorname, nickname, nachname } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Pflichtfelder fehlen: username, password, role' });
  }
  if (!vorname?.trim() || !nickname?.trim() || !nachname?.trim()) {
    return res.status(400).json({ error: 'Vorname, Nickname und Nachname sind Pflichtfelder' });
  }

  const validRoles = ['admin', 'director', 'referee', 'gastronomy'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Ungültige Rolle. Erlaubt: ${validRoles.join(', ')}` });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Benutzername bereits vergeben' });
  }

  const vn = vorname.trim();
  const nn = nickname.trim();
  const na = nachname.trim();
  const display_name = `${vn} "${nn}" ${na}`;

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const result = db.prepare(
      'INSERT INTO users (username, password_hash, role, email, display_name, vorname, nickname, nachname, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(username, password_hash, role, email || null, display_name, vn, nn, na, req.user.id);

    auditLog(req, 'user', 'CREATE', `User "${display_name}" (${role}) angelegt`, result.lastInsertRowid);
    res.status(201).json({
      id: result.lastInsertRowid,
      username, role,
      email: email || null,
      display_name, vorname: vn, nickname: nn, nachname: na,
      active: 1
    });
  } catch (err) {
    res.status(500).json({ error: 'Benutzer konnte nicht angelegt werden' });
  }
});

// User bearbeiten (nur admin)
router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { username, password, role, email, vorname, nickname, nachname } = req.body;

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'User nicht gefunden' });

  const updates = [];
  const params = [];

  if (username !== undefined) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id);
    if (existing) return res.status(409).json({ error: 'Benutzername bereits vergeben' });
    updates.push('username = ?'); params.push(username);
  }
  if (password) {
    const password_hash = await bcrypt.hash(password, 10);
    updates.push('password_hash = ?'); params.push(password_hash);
  }
  if (role !== undefined) {
    const validRoles = ['admin', 'director', 'referee', 'gastronomy'];
    if (!validRoles.includes(role)) return res.status(400).json({ error: `Ungültige Rolle` });
    updates.push('role = ?'); params.push(role);
  }
  if (email !== undefined) { updates.push('email = ?'); params.push(email); }

  // Namensfelder — wenn eines geändert wird, display_name neu bauen
  const current = db.prepare('SELECT vorname, nickname, nachname FROM users WHERE id = ?').get(id);
  const vn = (vorname !== undefined ? vorname : current?.vorname || '').trim();
  const nn = (nickname !== undefined ? nickname : current?.nickname || '').trim();
  const na = (nachname !== undefined ? nachname : current?.nachname || '').trim();

  if (vorname !== undefined) { updates.push('vorname = ?'); params.push(vn); }
  if (nickname !== undefined) { updates.push('nickname = ?'); params.push(nn); }
  if (nachname !== undefined) { updates.push('nachname = ?'); params.push(na); }

  if ((vorname !== undefined || nickname !== undefined || nachname !== undefined) && vn && nn && na) {
    const display_name = `${vn} "${nn}" ${na}`;
    updates.push('display_name = ?'); params.push(display_name);
  }

  if (updates.length === 0) return res.status(400).json({ error: 'Keine Felder zum Aktualisieren' });

  params.push(id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare(`SELECT ${COLS} FROM users WHERE id = ?`).get(id);
  res.json(updated);
});

// User deaktivieren (nur admin, active=0)
router.delete('/:id', requireAdmin, (req, res) => {
  const user = db.prepare('SELECT username, role FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User nicht gefunden' });

  db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(req.params.id);
  auditLog(req, 'user', 'DELETE', `User "${user.username}" (${user.role}) deaktiviert`, req.params.id);
  res.json({ message: 'User deaktiviert' });
});

module.exports = router;
