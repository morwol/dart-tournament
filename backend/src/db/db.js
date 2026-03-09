const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || './data/dartevent.db';
const absoluteDbPath = path.resolve(__dirname, '../../', dbPath);

// Ensure data directory exists
const dbDir = path.dirname(absoluteDbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(absoluteDbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initialize() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  // NEU: Spalten zu bestehenden Tabellen hinzufuegen (mit try/catch da IF NOT EXISTS nicht unterstuetzt)
  const alterStatements = [
    "ALTER TABLE tournaments ADD COLUMN board_count INTEGER DEFAULT 1",
    "ALTER TABLE tournaments ADD COLUMN prelim_format TEXT DEFAULT '301_single_out'",
    "ALTER TABLE tournaments ADD COLUMN prelim_legs INTEGER DEFAULT 1",
    "ALTER TABLE tournaments ADD COLUMN qf_format TEXT DEFAULT '501_double_out'",
    "ALTER TABLE tournaments ADD COLUMN qf_legs INTEGER DEFAULT 3",
    "ALTER TABLE tournaments ADD COLUMN sf_format TEXT DEFAULT '501_double_out'",
    "ALTER TABLE tournaments ADD COLUMN sf_legs INTEGER DEFAULT 3",
    "ALTER TABLE tournaments ADD COLUMN final_format TEXT DEFAULT '501_double_out'",
    "ALTER TABLE tournaments ADD COLUMN final_legs INTEGER DEFAULT 5",
    "ALTER TABLE tournaments ADD COLUMN group_draw_done BOOLEAN DEFAULT 0",
    "ALTER TABLE tournaments ADD COLUMN locked BOOLEAN DEFAULT 0",
    "ALTER TABLE players ADD COLUMN vorname TEXT",
    "ALTER TABLE players ADD COLUMN nickname TEXT",
    "ALTER TABLE players ADD COLUMN nachname TEXT",
    "ALTER TABLE players ADD COLUMN walkon_youtube TEXT",
    "ALTER TABLE throws ADD COLUMN segment TEXT",
    "ALTER TABLE throws ADD COLUMN undo_of INTEGER REFERENCES throws(id)",
    "ALTER TABLE products ADD COLUMN sort_order INTEGER DEFAULT 0",
    "ALTER TABLE products ADD COLUMN image_url TEXT",
    "ALTER TABLE games ADD COLUMN board_id INTEGER REFERENCES boards(id)",
    "ALTER TABLE boards ADD COLUMN is_final BOOLEAN DEFAULT 0",
    "ALTER TABLE groups ADD COLUMN board_id INTEGER REFERENCES boards(id)",
    "ALTER TABLE players ADD COLUMN cancel_token TEXT UNIQUE",
  ];

  for (const stmt of alterStatements) {
    try {
      db.exec(stmt);
    } catch (e) {
      // Spalte existiert bereits — ignorieren
    }
  }

  // App-Konfigurationstabelle anlegen
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Audit-Log anlegen
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id        INTEGER PRIMARY KEY,
      ts        DATETIME DEFAULT CURRENT_TIMESTAMP,
      actor     TEXT NOT NULL,
      role      TEXT NOT NULL,
      category  TEXT NOT NULL,
      action    TEXT NOT NULL,
      detail    TEXT,
      target_id INTEGER
    )
  `);

  // Standardwerte eintragen (nur wenn noch nicht vorhanden)
  const defaults = [
    ['app_name',           'DartEvent Manager'],
    ['logo_url',           '/logo.jpeg'],
    ['color_primary',      '#1A4FD6'],
    ['color_mid',          '#1E7FEB'],
    ['color_accent',       '#00B8FF'],
    ['color_accent_light', '#5DD5FF'],
    ['color_bg',           '#090E1A'],
    ['color_bg_card',      '#101829'],
    ['color_success',      '#00E5A0'],
    ['color_warning',      '#FFB020'],
    ['color_danger',       '#FF4560'],
  ];
  const insertDefault = db.prepare('INSERT OR IGNORE INTO app_config (key, value) VALUES (?, ?)');
  for (const [key, value] of defaults) insertDefault.run(key, value);

  // Create default admin if none exists
  const adminExists = db.prepare('SELECT COUNT(*) as count FROM admins').get();
  if (adminExists.count === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin';
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, hash);
    console.log(`Default admin "${username}" created.`);
  }
}

module.exports = { db, initialize };
