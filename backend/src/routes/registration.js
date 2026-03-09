const express = require('express');
const { db } = require('../db/db');

const router = express.Router();

// GET /api/registration/cancel/:token — Anmeldung prüfen (für Bestätigungsseite)
router.get('/cancel/:token', (req, res) => {
  const player = db.prepare(`
    SELECT p.id, p.name, p.vorname, p.nickname, p.nachname,
           t.id as tournament_id, t.name as tournament_name,
           t.date as tournament_date, t.status as tournament_status,
           t.format, t.checkout
    FROM players p
    JOIN tournaments t ON p.tournament_id = t.id
    WHERE p.cancel_token = ?
  `).get(req.params.token);

  if (!player) {
    return res.status(404).json({ error: 'Ungültiger oder bereits verwendeter Abmelde-Link' });
  }

  res.json({
    player_name: player.name,
    tournament_name: player.tournament_name,
    tournament_date: player.tournament_date,
    tournament_format: player.format,
    can_cancel: player.tournament_status === 'open',
    tournament_status: player.tournament_status,
  });
});

// DELETE /api/registration/cancel/:token — Anmeldung stornieren
router.delete('/cancel/:token', (req, res) => {
  const player = db.prepare(`
    SELECT p.id, p.name, t.status as tournament_status, t.name as tournament_name
    FROM players p
    JOIN tournaments t ON p.tournament_id = t.id
    WHERE p.cancel_token = ?
  `).get(req.params.token);

  if (!player) {
    return res.status(404).json({ error: 'Ungültiger oder bereits verwendeter Abmelde-Link' });
  }

  if (player.tournament_status !== 'open') {
    return res.status(400).json({
      error: `Das Turnier "${player.tournament_name}" hat bereits begonnen – eine Abmeldung ist nicht mehr möglich`,
    });
  }

  db.prepare('DELETE FROM players WHERE id = ?').run(player.id);

  console.log(`[ABMELDUNG] Spieler "${player.name}" hat sich vom Turnier "${player.tournament_name}" abgemeldet.`);

  res.json({ success: true, player_name: player.name });
});

module.exports = router;
