const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db/db');
const { requireFields } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { auditLog } = require('../lib/auditLog');

const router = express.Router();

// POST /api/auth/login
router.post('/login', requireFields(['username', 'password']), (req, res) => {
  const { username, password } = req.body;

  const normalizedUsername = username.toLowerCase();

  // NEU: Zuerst in admins-Tabelle suchen (Abwaertskompatibilitaet)
  const admin = db.prepare('SELECT * FROM admins WHERE LOWER(username) = ?').get(normalizedUsername);
  if (admin) {
    const valid = bcrypt.compareSync(password, admin.password_hash);
    if (valid) {
      const token = jwt.sign(
        { id: admin.id, username: admin.username, role: 'admin', source: 'admins' },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );
      req.user = { id: admin.id, username: admin.username, role: 'admin' };
      auditLog(req, 'auth', 'LOGIN', `Admin "${admin.username}" angemeldet`, admin.id);
      return res.json({ token, user: { id: admin.id, username: admin.username, role: 'admin' } });
    }
  }

  // NEU: Dann in users-Tabelle suchen
  const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = ? AND active = 1').get(normalizedUsername);
  if (user) {
    const valid = bcrypt.compareSync(password, user.password_hash);
    if (valid) {
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, source: 'users' },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );
      req.user = { id: user.id, username: user.username, role: user.role };
      auditLog(req, 'auth', 'LOGIN', `User "${user.username}" (${user.role}) angemeldet`, user.id);
      return res.json({
        token,
        user: { id: user.id, username: user.username, role: user.role, display_name: user.display_name }
      });
    }
  }

  return res.status(401).json({ error: 'Benutzername oder Passwort ungültig' });
});

// NEU: GET /api/auth/me — Eigenes Profil + Rolle
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
