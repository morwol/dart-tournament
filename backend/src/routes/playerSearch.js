// backend/src/routes/playerSearch.js
const express = require('express');
const { db } = require('../db/db');

const router = express.Router();

// GET /api/players/search?q=<term>&tournament_id=<id>
// Mounted at /api/players/search in app.js (NOT in players.js to avoid double-mount collision)
router.get('/', (req, res) => {
  const { q, tournament_id } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Suchbegriff muss mindestens 2 Zeichen lang sein' });
  }

  const term = `%${q.trim()}%`;
  const tid = tournament_id ? parseInt(tournament_id, 10) : null;

  const players = db.prepare(`
    SELECT
      p.id, p.name, p.vorname, p.nickname, p.nachname,
      p.walkon_title, p.walkon_artist,
      (p.walkon_file IS NOT NULL) AS has_walkon,
      (SELECT status FROM walkon_jobs WHERE player_id = p.id ORDER BY id DESC LIMIT 1) AS walkon_status,
      COUNT(DISTINCT tr.tournament_id) AS tournaments_count,
      COUNT(CASE WHEN g.winner_id = p.id THEN 1 END) AS wins,
      COUNT(CASE WHEN g.status = 'finished'
            AND (g.player1_id = p.id OR g.player2_id = p.id)
            AND g.winner_id != p.id THEN 1 END) AS losses
    FROM players p
    LEFT JOIN tournament_registrations tr ON tr.player_id = p.id
    LEFT JOIN games g ON (g.player1_id = p.id OR g.player2_id = p.id) AND g.status = 'finished'
    WHERE (
      LOWER(p.name)     LIKE LOWER(?) OR
      LOWER(p.nickname) LIKE LOWER(?) OR
      LOWER(p.vorname)  LIKE LOWER(?) OR
      LOWER(p.nachname) LIKE LOWER(?)
    )
    AND (? IS NULL OR p.id NOT IN (
      SELECT player_id FROM tournament_registrations WHERE tournament_id = ?
    ))
    GROUP BY p.id
    ORDER BY p.name ASC
    LIMIT 10
  `).all(term, term, term, term, tid, tid);

  res.json(players);
});

module.exports = router;
