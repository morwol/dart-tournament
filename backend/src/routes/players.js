const express = require('express');
const crypto = require('crypto');
const { db } = require('../db/db');
const { requireAdmin, requireAdminOrDirector } = require('../middleware/auth');
const { requireFields } = require('../middleware/validate');
const { auditLog } = require('../lib/auditLog');

const router = express.Router();

// GET /api/tournaments/:id/players
router.get('/:id/players', (req, res) => {
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: 'Turnier nicht gefunden' });
  }

  const players = db.prepare(
    'SELECT * FROM players WHERE tournament_id = ? ORDER BY seed, registered_at'
  ).all(req.params.id);

  res.json(players);
});

// POST /api/tournaments/:id/players
router.post('/:id/players', requireFields(['vorname', 'nickname', 'nachname']), (req, res) => {
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: 'Turnier nicht gefunden' });
  }
  if (tournament.status !== 'open') {
    return res.status(400).json({ error: 'Die Anmeldephase für dieses Turnier ist bereits geschlossen' });
  }

  const { vorname, nickname, nachname, seed } = req.body;
  const vn = vorname.trim();
  const nn = nickname.trim();
  const na = nachname.trim();

  // Doppelte Anmeldung verhindern (gleicher Nickname im selben Turnier)
  const duplicate = db.prepare(
    'SELECT id FROM players WHERE tournament_id = ? AND LOWER(TRIM(nickname)) = LOWER(?)'
  ).get(req.params.id, nn);
  if (duplicate) {
    return res.status(409).json({
      error: `Der Nickname "${nn}" ist in diesem Turnier bereits vergeben. Bitte wähle einen anderen.`,
    });
  }

  const displayName = `${vn} "${nn}" ${na}`;
  const cancelToken = crypto.randomBytes(32).toString('hex');

  const result = db.prepare(
    'INSERT INTO players (name, vorname, nickname, nachname, tournament_id, seed, cancel_token) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(displayName, vn, nn, na, req.params.id, seed || null, cancelToken);

  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid);

  // Abmelde-Link ausgeben (später SMS/E-Mail)
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const cancelUrl = `${appUrl}/cancel/${cancelToken}`;
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║           NEUE SPIELER-ANMELDUNG                    ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Spieler:  ${displayName}`);
  console.log(`║  Turnier:  ${tournament.name}`);
  console.log(`║  Abmelde-Link:`);
  console.log(`║  ${cancelUrl}`);
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  auditLog(req, 'player', 'REGISTER', `Spieler "${displayName}" in Turnier "${tournament.name}" angemeldet`, result.lastInsertRowid);
  res.status(201).json({ ...player, cancel_token: cancelToken, cancel_url: cancelUrl });
});

// PUT /api/tournaments/:id/players/:playerId (Admin) — Namen ändern
router.put('/:id/players/:playerId', requireAdminOrDirector, (req, res) => {
  const player = db.prepare('SELECT * FROM players WHERE id = ? AND tournament_id = ?').get(req.params.playerId, req.params.id);
  if (!player) return res.status(404).json({ error: 'Spieler nicht gefunden' });

  const vorname = (req.body.vorname || player.vorname || '').trim();
  const nickname = (req.body.nickname || player.nickname || '').trim();
  const nachname = (req.body.nachname || player.nachname || '').trim();
  if (!vorname || !nickname || !nachname) {
    return res.status(400).json({ error: 'Vorname, Nickname und Nachname sind Pflichtfelder und dürfen nicht leer sein' });
  }

  const displayName = `${vorname} "${nickname}" ${nachname}`;
  db.prepare('UPDATE players SET name = ?, vorname = ?, nickname = ?, nachname = ? WHERE id = ?')
    .run(displayName, vorname, nickname, nachname, req.params.playerId);

  const updated = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.playerId);
  auditLog(req, 'player', 'UPDATE', `Spieler umbenannt zu "${displayName}"`, req.params.playerId);
  res.json(updated);
});

// DELETE /api/tournaments/:id/players/:playerId (Admin)
router.delete('/:id/players/:playerId', requireAdminOrDirector, (req, res) => {
  const tournament = db.prepare('SELECT status FROM tournaments WHERE id = ?').get(req.params.id);
  if (tournament && tournament.status === 'active') {
    return res.status(400).json({ error: 'Spieler können nicht gelöscht werden während das Turnier aktiv ist.' });
  }
  const player = db.prepare('SELECT * FROM players WHERE id = ? AND tournament_id = ?').get(req.params.playerId, req.params.id);
  if (!player) return res.status(404).json({ error: 'Spieler nicht gefunden' });
  db.prepare('DELETE FROM players WHERE id = ?').run(req.params.playerId);
  auditLog(req, 'player', 'DELETE', `Spieler "${player.name}" gelöscht`, player.id);
  res.json({ success: true });
});

module.exports = router;
