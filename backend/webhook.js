#!/usr/bin/env node
// ============================================================
// DartEvent — GitHub Webhook Receiver
//
// Listens on 127.0.0.1:9001 (proxied by nginx at /webhook).
// On push to 'dev' branch: runs deploy/update-dev.sh
//
// Requires env vars (loaded from /var/www/dartsturnier/backend/.env):
//   WEBHOOK_SECRET  — must match the secret set in GitHub
//   WEBHOOK_PORT    — optional, default 9001
// ============================================================

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const http   = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');

const PORT   = process.env.WEBHOOK_PORT || 9001;
const SECRET = process.env.WEBHOOK_SECRET || '';
const SCRIPT = '/var/www/dartsturnier/deploy/update-dev.sh';

// ── HMAC-SHA256 signature verification ─────────────────────
function verifySignature(secret, payload, signature) {
  if (!secret) return true; // no secret configured → skip (dev only)
  const hmac     = crypto.createHmac('sha256', secret);
  const expected = 'sha256=' + hmac.update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ── HTTP server ─────────────────────────────────────────────
const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404); res.end(); return;
  }

  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const payload   = Buffer.concat(chunks);
    const signature = req.headers['x-hub-signature-256'] || '';

    if (!verifySignature(SECRET, payload, signature)) {
      console.warn('[webhook] Invalid signature — rejected');
      res.writeHead(401); res.end('Unauthorized'); return;
    }

    let event;
    try { event = JSON.parse(payload.toString()); }
    catch { res.writeHead(400); res.end('Bad JSON'); return; }

    const githubEvent = req.headers['x-github-event'];
    const ref         = event.ref || '';

    // Only react to pushes on the dev branch
    if (githubEvent !== 'push' || ref !== 'refs/heads/dev') {
      res.writeHead(200); res.end('ignored'); return;
    }

    const pusher  = event.pusher?.name || 'unknown';
    const commits = event.commits?.length || 0;
    console.log(`[webhook] Push to dev by ${pusher} (${commits} commit(s)) — deploying...`);

    res.writeHead(200); res.end('deploying');

    exec(`bash ${SCRIPT}`, { timeout: 300000 }, (err, stdout, stderr) => {
      if (err) {
        console.error('[webhook] Deploy FAILED:', err.message);
        if (stderr) console.error(stderr.slice(-500));
      } else {
        console.log('[webhook] Deploy successful');
        if (stdout) console.log(stdout.slice(-300));
      }
    });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[webhook] Listening on 127.0.0.1:${PORT}`);
});
