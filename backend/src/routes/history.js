const express = require('express');
const { db } = require('../db/db');

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/history — List all finished tournaments
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  try {
    const tournaments = db.prepare(`
      SELECT
        t.id, t.name, t.date, t.format, t.checkout, t.status, t.created_at,
        COUNT(DISTINCT tr.player_id) AS player_count,
        COUNT(DISTINCT CASE WHEN g.status = 'finished' THEN g.id END) AS games_played,
        w.name AS winner_name, w.id AS winner_id
      FROM tournaments t
      LEFT JOIN tournament_registrations tr ON tr.tournament_id = t.id
      LEFT JOIN games g ON g.tournament_id = t.id
      LEFT JOIN (
        SELECT g2.tournament_id, g2.winner_id
        FROM games g2
        WHERE g2.status = 'finished'
          AND g2.round = (
            SELECT MAX(g3.round) FROM games g3
            WHERE g3.tournament_id = g2.tournament_id AND g3.status = 'finished'
          )
      ) final_game ON final_game.tournament_id = t.id
      LEFT JOIN players w ON w.id = final_game.winner_id
      WHERE t.status = 'finished'
      GROUP BY t.id
      ORDER BY t.date DESC, t.created_at DESC
    `).all();

    res.json(tournaments);
  } catch (err) {
    console.error('[history]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/history/:id — Tournament detail + per-player stats
// Stats: 3-dart average, W/L, 180s, checkout%, best leg, highest checkout
// ---------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id, 10);
    if (!tournamentId || tournamentId <= 0) {
      return res.status(400).json({ error: 'Invalid tournament ID' });
    }

    const tournament = db.prepare(`
      SELECT id, name, date, format, checkout, status, created_at
      FROM tournaments WHERE id = ?
    `).get(tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Registered players
    const players = db.prepare(`
      SELECT p.id, p.name, p.nickname
      FROM players p
      JOIN tournament_registrations tr ON tr.player_id = p.id
      WHERE tr.tournament_id = ?
      ORDER BY p.name
    `).all(tournamentId);

    // Prepared statements reused per player
    const stmtGames = db.prepare(`
      SELECT COUNT(*) AS cnt FROM games
      WHERE tournament_id = ? AND status = 'finished'
        AND (player1_id = ? OR player2_id = ?)
    `);
    const stmtWins = db.prepare(`
      SELECT COUNT(*) AS cnt FROM games
      WHERE tournament_id = ? AND status = 'finished' AND winner_id = ?
    `);
    const stmtThrows = db.prepare(`
      SELECT t.score, t.remaining, t.segment
      FROM throws t
      JOIN games g ON t.game_id = g.id
      WHERE g.tournament_id = ? AND t.player_id = ? AND t.is_bulloff = 0
        AND t.undo_of IS NULL
        AND t.id NOT IN (
          SELECT COALESCE(undo_of, 0) FROM throws
          WHERE undo_of IS NOT NULL
            AND game_id IN (SELECT id FROM games WHERE tournament_id = ?)
        )
      ORDER BY t.id ASC
    `);
    const stmtCheckouts = db.prepare(`
      SELECT t.score AS checkout_score
      FROM throws t
      JOIN games g ON t.game_id = g.id
      WHERE g.tournament_id = ? AND t.player_id = ? AND t.is_bulloff = 0
        AND t.remaining = 0
        AND t.undo_of IS NULL
        AND t.id NOT IN (
          SELECT COALESCE(undo_of, 0) FROM throws
          WHERE undo_of IS NOT NULL
            AND game_id IN (SELECT id FROM games WHERE tournament_id = ?)
        )
    `);
    const stmtBestLeg = db.prepare(`
      SELECT g.id AS game_id, COUNT(t.id) AS throw_count
      FROM games g
      JOIN throws t ON t.game_id = g.id AND t.player_id = ? AND t.is_bulloff = 0
        AND t.undo_of IS NULL
        AND t.id NOT IN (
          SELECT COALESCE(undo_of, 0) FROM throws
          WHERE undo_of IS NOT NULL AND game_id = g.id
        )
      WHERE g.tournament_id = ? AND g.status = 'finished' AND g.winner_id = ?
      GROUP BY g.id
      ORDER BY throw_count ASC
      LIMIT 1
    `);

    const playerStats = players.map(p => {
      const gamesPlayed = stmtGames.get(tournamentId, p.id, p.id).cnt;
      const wins = stmtWins.get(tournamentId, p.id).cnt;
      const losses = gamesPlayed - wins;

      const throws = stmtThrows.all(tournamentId, p.id, tournamentId);
      const totalScore = throws.reduce((s, t) => s + t.score, 0);
      const throwCount = throws.length;
      const threeDartAvg = throwCount >= 3
        ? Math.round((totalScore / throwCount) * 3 * 100) / 100
        : null;

      // 180s: groups of 3 consecutive throws summing to 180
      let oneEighties = 0;
      for (let i = 0; i + 2 < throws.length; i += 3) {
        if (throws[i].score + throws[i + 1].score + throws[i + 2].score === 180) {
          oneEighties++;
        }
      }

      const checkouts = stmtCheckouts.all(tournamentId, p.id, tournamentId);
      const highestCheckout = checkouts.length > 0
        ? Math.max(...checkouts.map(c => c.checkout_score))
        : null;
      const checkoutPct = wins > 0
        ? Math.round((checkouts.length / wins) * 100 * 100) / 100
        : null;

      const bestLeg = stmtBestLeg.get(p.id, tournamentId, p.id);

      return {
        id: p.id,
        name: p.name,
        nickname: p.nickname,
        games_played: gamesPlayed,
        wins,
        losses,
        three_dart_avg: threeDartAvg,
        one_eighties: oneEighties,
        checkout_pct: checkoutPct,
        highest_checkout: highestCheckout,
        best_leg: bestLeg ? bestLeg.throw_count : null,
      };
    });

    // Games list
    const games = db.prepare(`
      SELECT g.id, g.round, g.status, g.winner_id,
        p1.name AS player1_name, p1.id AS player1_id,
        p2.name AS player2_name, p2.id AS player2_id,
        w.name AS winner_name
      FROM games g
      LEFT JOIN players p1 ON g.player1_id = p1.id
      LEFT JOIN players p2 ON g.player2_id = p2.id
      LEFT JOIN players w ON g.winner_id = w.id
      WHERE g.tournament_id = ?
      ORDER BY g.round, g.id
    `).all(tournamentId);

    res.json({
      tournament,
      players: playerStats,
      games,
    });
  } catch (err) {
    console.error('[history]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
