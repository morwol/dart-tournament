#!/usr/bin/env node
// ============================================================
// DartEvent — User-Management Script (lokales Dev-Tool)
// Aufruf aus backend/:
//   node scripts/users.js              — alle User anzeigen
//   node scripts/users.js reset <name> <neues-pw>  — Passwort setzen
// ============================================================

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../data/dartevent.db');
const db = new Database(dbPath);

const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const CYAN  = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW= '\x1b[33m';
const RED   = '\x1b[31m';
const MUTED = '\x1b[90m';

const ROLE_COLOR = {
  admin:      '\x1b[31m',
  director:   '\x1b[34m',
  referee:    '\x1b[33m',
  gastronomy: '\x1b[32m',
};

function listUsers() {
  const admins = db.prepare('SELECT id, username, created_at FROM admins ORDER BY id').all();
  const users  = db.prepare('SELECT id, username, role, active, display_name, created_at FROM users ORDER BY id').all();

  console.log(`\n${BOLD}${CYAN}═══ ADMINS (legacy) ═══${RESET}`);
  if (admins.length === 0) {
    console.log(`${MUTED}  keine Einträge${RESET}`);
  } else {
    admins.forEach(a => {
      console.log(`  ${BOLD}[${a.id}]${RESET} ${GREEN}${a.username}${RESET} ${MUTED}— angelegt: ${a.created_at}${RESET}`);
    });
  }

  console.log(`\n${BOLD}${CYAN}═══ USERS ═══${RESET}`);
  if (users.length === 0) {
    console.log(`${MUTED}  keine Einträge${RESET}`);
  } else {
    users.forEach(u => {
      const roleColor = ROLE_COLOR[u.role] || RESET;
      const activeStr = u.active ? `${GREEN}aktiv${RESET}` : `${RED}inaktiv${RESET}`;
      const display   = u.display_name ? `${MUTED}(${u.display_name})${RESET}` : '';
      console.log(`  ${BOLD}[${u.id}]${RESET} ${BOLD}${u.username}${RESET} ${display}`);
      console.log(`       Rolle: ${roleColor}${u.role}${RESET}  Status: ${activeStr}  ${MUTED}angelegt: ${u.created_at}${RESET}`);
    });
  }

  console.log(`\n${MUTED}Passwörter sind bcrypt-gehasht und können nicht eingesehen werden.${RESET}`);
  console.log(`${MUTED}Zum Zurücksetzen: node scripts/users.js reset <username> <neues-passwort>${RESET}\n`);
}

function resetPassword(username, newPassword) {
  if (!username || !newPassword) {
    console.error(`${RED}Verwendung: node scripts/users.js reset <username> <neues-passwort>${RESET}`);
    process.exit(1);
  }

  if (newPassword.length < 8) {
    console.error(`${RED}Passwort muss mindestens 8 Zeichen lang sein.${RESET}`);
    process.exit(1);
  }

  const hash = bcrypt.hashSync(newPassword, 12);

  // Erst in users suchen, dann admins
  const user = db.prepare('SELECT id, username FROM users WHERE LOWER(username) = ?').get(username.toLowerCase());
  if (user) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
    console.log(`\n${GREEN}✓ Passwort für User "${user.username}" wurde gesetzt.${RESET}\n`);
    return;
  }

  const admin = db.prepare('SELECT id, username FROM admins WHERE LOWER(username) = ?').get(username.toLowerCase());
  if (admin) {
    db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, admin.id);
    console.log(`\n${GREEN}✓ Passwort für Admin "${admin.username}" wurde gesetzt.${RESET}\n`);
    return;
  }

  console.error(`${RED}User "${username}" nicht gefunden.${RESET}`);
  process.exit(1);
}

// ── Main ──────────────────────────────────────────────────
const [,, command, ...args] = process.argv;

if (!command || command === 'list') {
  listUsers();
} else if (command === 'reset') {
  resetPassword(args[0], args[1]);
} else {
  console.error(`${RED}Unbekannter Befehl: ${command}${RESET}`);
  console.log(`Verfügbar: list, reset`);
  process.exit(1);
}
