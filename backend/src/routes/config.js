const express = require('express');
const { db } = require('../db/db');
const { requireAdmin } = require('../middleware/auth');
const { auditLog } = require('../lib/auditLog');

const router = express.Router();

const ALLOWED_KEYS = [
  'app_name', 'logo_url',
  'color_primary', 'color_mid', 'color_accent', 'color_accent_light',
  'color_bg', 'color_bg_card', 'color_success', 'color_warning', 'color_danger',
];

function getConfig() {
  const rows = db.prepare('SELECT key, value FROM app_config').all();
  const config = {};
  for (const { key, value } of rows) config[key] = value;
  return config;
}

// GET /api/config — öffentlich (wird beim App-Start geladen)
router.get('/', (req, res) => {
  res.json(getConfig());
});

// PUT /api/config — nur Admin
router.put('/', requireAdmin, (req, res) => {
  const stmt = db.prepare(
    'INSERT OR REPLACE INTO app_config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
  );
  const update = db.transaction((data) => {
    for (const key of ALLOWED_KEYS) {
      if (data[key] !== undefined && data[key] !== null) {
        stmt.run(key, String(data[key]).trim());
      }
    }
  });
  update(req.body);
  const changed = ALLOWED_KEYS.filter(k => req.body[k] !== undefined && req.body[k] !== null);
  auditLog(req, 'config', 'UPDATE', `App-Konfiguration geändert: ${changed.join(', ')}`);
  res.json(getConfig());
});

// POST /api/config/reset — setzt alles auf Standardwerte zurück (nur Admin)
router.post('/reset', requireAdmin, (req, res) => {
  const defaults = {
    app_name: 'DartEvent Manager',
    logo_url: '/logo.jpeg',
    color_primary: '#1A4FD6',
    color_mid: '#1E7FEB',
    color_accent: '#00B8FF',
    color_accent_light: '#5DD5FF',
    color_bg: '#090E1A',
    color_bg_card: '#101829',
    color_success: '#00E5A0',
    color_warning: '#FFB020',
    color_danger: '#FF4560',
  };
  const stmt = db.prepare(
    'INSERT OR REPLACE INTO app_config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
  );
  const reset = db.transaction(() => {
    for (const [key, value] of Object.entries(defaults)) stmt.run(key, value);
  });
  reset();
  auditLog(req, 'config', 'RESET', 'App-Konfiguration auf Standardwerte zurückgesetzt');
  res.json(getConfig());
});

module.exports = router;
