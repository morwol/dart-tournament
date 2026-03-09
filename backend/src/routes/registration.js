const express = require('express');
const { db } = require('../db/db');

const router = express.Router();

// GET /api/registration/cancel/:token — Anmeldung prüfen (für Bestätigungsseite)
router.get('/cancel/:token', (req, res) => {
  const reg = db.prepare(`
    SELECT p.id, p.name, p.vorname, p.nickname, p.nachname,
           t.id as tournament_id, t.name as tournament_name,
           t.date as tournament_date, t.status as tournament_status,
           t.format, t.checkout
    FROM tournament_registrations tr
    JOIN players p ON p.id = tr.player_id
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE tr.cancel_token = ?
  `).get(req.params.token);

  if (!reg) {
    return res.status(404).json({ error: 'Ungültiger oder bereits verwendeter Abmelde-Link' });
  }

  res.json({
    player_name: reg.name,
    tournament_name: reg.tournament_name,
    tournament_date: reg.tournament_date,
    tournament_format: reg.format,
    can_cancel: reg.tournament_status === 'open',
    tournament_status: reg.tournament_status,
  });
});

// DELETE /api/registration/cancel/:token — Anmeldung stornieren (Profil bleibt erhalten)
router.delete('/cancel/:token', (req, res) => {
  const reg = db.prepare(`
    SELECT tr.id, tr.player_id, p.name, t.status as tournament_status, t.name as tournament_name
    FROM tournament_registrations tr
    JOIN players p ON p.id = tr.player_id
    JOIN tournaments t ON tr.tournament_id = t.id
    WHERE tr.cancel_token = ?
  `).get(req.params.token);

  if (!reg) {
    return res.status(404).json({ error: 'Ungültiger oder bereits verwendeter Abmelde-Link' });
  }

  if (reg.tournament_status !== 'open') {
    return res.status(400).json({
      error: `Das Turnier "${reg.tournament_name}" hat bereits begonnen – eine Abmeldung ist nicht mehr möglich`,
    });
  }

  db.prepare('DELETE FROM tournament_registrations WHERE id = ?').run(reg.id);

  console.log(`[ABMELDUNG] Spieler "${reg.name}" hat sich vom Turnier "${reg.tournament_name}" abgemeldet.`);

  res.json({ success: true, player_name: reg.name });
});

module.exports = router;
