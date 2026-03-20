// NEU: Mailing-Route mit nodemailer
const express = require('express');
const { db } = require('../db/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// NEU: Nodemailer nur laden wenn MAIL_HOST konfiguriert
let transporter = null;
if (process.env.MAIL_HOST) {
  try {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT, 10) || 587,
      secure: process.env.MAIL_SECURE === 'true',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
    console.log('[MAIL] Transporter configured for', process.env.MAIL_HOST);
  } catch (err) {
    console.warn('[MAIL] Failed to configure transporter:', err.message);
  }
}

// NEU: Helper — Mail senden oder dry-run
async function sendMail(to, subject, html) {
  if (!transporter) {
    console.log(`[MAIL DRY-RUN] To: ${to} | Subject: ${subject}`);
    console.log(`[MAIL DRY-RUN] Body: ${html.substring(0, 200)}...`);
    return { mode: 'dry-run', to, subject };
  }

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to,
    subject,
    html,
  });

  return { mode: 'sent', messageId: info.messageId, to, subject };
}

// NEU: Templates anzeigen
router.get('/templates', requireAuth, (req, res) => {
  try {
    const templates = db.prepare('SELECT * FROM mail_templates ORDER BY created_at DESC').all();
    return res.json(templates);
  } catch (err) {
    console.error('[mail]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEU: Template anlegen
router.post('/templates', requireAdmin, (req, res) => {
  try {
    const { name, subject, body_html } = req.body;
    if (!name || !subject || !body_html) {
      return res.status(400).json({ error: 'name, subject and body_html required' });
    }

    const result = db.prepare(
      'INSERT INTO mail_templates (name, subject, body_html) VALUES (?, ?, ?)'
    ).run(name, subject, body_html);

    const template = db.prepare('SELECT * FROM mail_templates WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json(template);
  } catch (err) {
    console.error('[mail]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a template
router.delete('/templates/:id', requireAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'Invalid template id' });
    }

    const template = db.prepare('SELECT id FROM mail_templates WHERE id = ?').get(id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    db.prepare('DELETE FROM mail_templates WHERE id = ?').run(id);
    return res.json({ success: true });
  } catch (err) {
    console.error('[mail]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEU: Test-Mail an Admin
router.post('/send-test', requireAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });

    const result = await sendMail(
      email,
      'DartEvent Test-Mail',
      '<h1>Test</h1><p>Dies ist eine Test-Mail vom DartEvent System.</p>'
    );

    // Log in mail_log
    db.prepare(
      "INSERT INTO mail_log (recipient_email, sent_at, status) VALUES (?, datetime('now'), ?)"
    ).run(email, result.mode === 'sent' ? 'sent' : 'dry-run');

    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('[mail]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEU: Event-Zusammenfassung versenden
router.post('/send-event-summary', requireAdmin, async (req, res) => {
  try {
    const { tournament_id, email, template_id } = req.body;
    if (!email) return res.status(400).json({ error: 'email required' });

    // Turnier-Daten sammeln
    let tournament = null;
    let players = [];
    let games = [];

    if (tournament_id) {
      tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournament_id);
      players = db.prepare(`
        SELECT p.* FROM players p
        JOIN tournament_registrations tr ON tr.player_id = p.id
        WHERE tr.tournament_id = ?
        ORDER BY tr.seed, p.name
      `).all(tournament_id);
      games = db.prepare(`
        SELECT g.*, p1.name as player1_name, p2.name as player2_name, w.name as winner_name
        FROM games g
        LEFT JOIN players p1 ON g.player1_id = p1.id
        LEFT JOIN players p2 ON g.player2_id = p2.id
        LEFT JOIN players w ON g.winner_id = w.id
        WHERE g.tournament_id = ?
        ORDER BY g.round, g.id
      `).all(tournament_id);
    }

    // Template laden oder Standard verwenden
    let subject = 'DartEvent Zusammenfassung';
    let html = '';

    if (template_id) {
      const template = db.prepare('SELECT * FROM mail_templates WHERE id = ?').get(template_id);
      if (template) {
        subject = template.subject;
        html = template.body_html;
        // Platzhalter ersetzen
        if (tournament) {
          html = html.replace(/\{\{tournament_name\}\}/g, tournament.name || '');
          html = html.replace(/\{\{tournament_date\}\}/g, tournament.date || '');
          html = html.replace(/\{\{player_count\}\}/g, String(players.length));
          html = html.replace(/\{\{game_count\}\}/g, String(games.length));
        }
      }
    } else {
      // Standard-Zusammenfassung generieren
      const tName = tournament ? tournament.name : 'Unbekannt';
      const finishedGames = games.filter(g => g.status === 'finished');
      const finalGame = finishedGames.length > 0 ? finishedGames[finishedGames.length - 1] : null;

      html = `
        <h1>Event-Zusammenfassung: ${tName}</h1>
        <p>Teilnehmer: ${players.length}</p>
        <p>Spiele gesamt: ${games.length}</p>
        <p>Abgeschlossene Spiele: ${finishedGames.length}</p>
        ${finalGame && finalGame.winner_name ? `<p><strong>Gewinner: ${finalGame.winner_name}</strong></p>` : ''}
        <h2>Ergebnisse</h2>
        <ul>
          ${finishedGames.map(g =>
            `<li>Runde ${g.round}: ${g.player1_name || '?'} vs ${g.player2_name || '?'} — Gewinner: ${g.winner_name || '?'}</li>`
          ).join('')}
        </ul>
      `;
      subject = `DartEvent Zusammenfassung: ${tName}`;
    }

    const result = await sendMail(email, subject, html);

    // Log
    db.prepare(
      "INSERT INTO mail_log (template_id, recipient_email, sent_at, status, tournament_id) VALUES (?, ?, datetime('now'), ?, ?)"
    ).run(template_id || null, email, result.mode === 'sent' ? 'sent' : 'dry-run', tournament_id || null);

    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('[mail]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mail configuration status — for frontend indicator
// Returns configured status and host (no credentials)
router.get('/status', requireAuth, (req, res) => {
  try {
    return res.json({
      configured: transporter !== null,
      host: process.env.MAIL_HOST || null,
      from: process.env.MAIL_FROM || process.env.MAIL_USER || null,
    });
  } catch (err) {
    console.error('[mail]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
