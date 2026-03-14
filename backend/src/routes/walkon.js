const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { db } = require('../db/db');
const { requireAuth, requireAdmin, requireAdminOrDirector } = require('../middleware/auth');

const router = express.Router();

const WALKON_DIR = path.join(__dirname, '../../data/walkon');

// Hintergrund-Download: yt-dlp + ffmpeg
async function downloadWalkon(playerId, url, start, duration, jobId) {
  // 1. Job status → 'downloading', started_at setzen
  db.prepare(
    "UPDATE walkon_jobs SET status = 'downloading', started_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(jobId);

  // 2. Verzeichnis anlegen falls nicht vorhanden
  fs.mkdirSync(WALKON_DIR, { recursive: true });

  const tempPath  = path.join(WALKON_DIR, `walkon_raw_${playerId}.mp3`);
  const finalPath = path.join(WALKON_DIR, `walkon_${playerId}.mp3`);

  try {
    // 4. yt-dlp ausführen
    await new Promise((resolve, reject) => {
      const dlp = spawn('yt-dlp', [
        '-x',
        '--audio-format', 'mp3',
        '--no-playlist',
        '-o', tempPath,
        url
      ]);

      let stderr = '';
      dlp.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
      dlp.stdout.on('data', () => {});

      dlp.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
        }
      });

      dlp.on('error', (err) => {
        reject(new Error(`yt-dlp spawn error: ${err.message}`));
      });
    });

    // 5. ffmpeg ausführen
    await new Promise((resolve, reject) => {
      const ff = spawn('ffmpeg', [
        '-y',
        '-i', tempPath,
        '-ss', String(start),
        '-t', String(duration),
        '-acodec', 'libmp3lame',
        finalPath
      ]);

      let stderr = '';
      ff.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
      ff.stdout.on('data', () => {});

      ff.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`));
        }
      });

      ff.on('error', (err) => {
        reject(new Error(`ffmpeg spawn error: ${err.message}`));
      });
    });

    // 6. Temp-Datei löschen
    try { fs.unlinkSync(tempPath); } catch (_) {}

    // 7. walkon_file in players aktualisieren
    db.prepare('UPDATE players SET walkon_file = ? WHERE id = ?').run(finalPath, playerId);

    // 8. Job status → 'ready', finished_at setzen
    db.prepare(
      "UPDATE walkon_jobs SET status = 'ready', finished_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(jobId);

  } catch (err) {
    // Temp-Datei aufräumen
    try { fs.unlinkSync(tempPath); } catch (_) {}

    db.prepare(
      "UPDATE walkon_jobs SET status = 'error', error_msg = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(err.message, jobId);
  }
}

// POST /api/walkon/:playerId — Walk-On Song einrichten und Download starten
router.post('/:playerId', requireAdminOrDirector, (req, res) => {
  const playerId = parseInt(req.params.playerId, 10);
  const { url, start, duration } = req.body;

  // Validierung
  if (!url || start === undefined || duration === undefined) {
    return res.status(400).json({ error: 'url, start und duration sind Pflichtfelder' });
  }
  if (
    typeof url !== 'string' ||
    (!url.startsWith('https://www.youtube.com/') && !url.startsWith('https://youtu.be/'))
  ) {
    return res.status(400).json({ error: 'url muss eine gültige YouTube-URL sein' });
  }
  const startInt    = parseInt(start, 10);
  const durationInt = parseInt(duration, 10);
  if (!Number.isInteger(startInt) || startInt < 0) {
    return res.status(400).json({ error: 'start muss eine nicht-negative Ganzzahl sein' });
  }
  if (!Number.isInteger(durationInt) || durationInt <= 0) {
    return res.status(400).json({ error: 'duration muss eine positive Ganzzahl sein' });
  }

  const player = db.prepare('SELECT id FROM players WHERE id = ?').get(playerId);
  if (!player) {
    return res.status(404).json({ error: 'Spieler nicht gefunden' });
  }

  // URL und Zeiten in players speichern
  db.prepare(
    'UPDATE players SET walkon_youtube = ?, walkon_start = ?, walkon_duration = ? WHERE id = ?'
  ).run(url, startInt, durationInt, playerId);

  // Neuen Job anlegen
  const result = db.prepare(
    "INSERT INTO walkon_jobs (player_id, status) VALUES (?, 'pending')"
  ).run(playerId);
  const jobId = result.lastInsertRowid;

  // Download asynchron starten (nicht awaiten)
  downloadWalkon(playerId, url, startInt, durationInt, jobId).catch(() => {});

  res.json({ success: true, jobId });
});

// GET /api/walkon/:playerId/status — Job-Status und Spieler-Infos
router.get('/:playerId/status', (req, res) => {
  const playerId = parseInt(req.params.playerId, 10);

  const player = db.prepare(
    'SELECT id, walkon_file, walkon_start, walkon_duration, walkon_youtube FROM players WHERE id = ?'
  ).get(playerId);
  if (!player) {
    return res.status(404).json({ error: 'Spieler nicht gefunden' });
  }

  const job = db.prepare(
    'SELECT * FROM walkon_jobs WHERE player_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(playerId);

  res.json({
    player_id:       player.id,
    walkon_file:     player.walkon_file,
    walkon_start:    player.walkon_start,
    walkon_duration: player.walkon_duration,
    walkon_url:      player.walkon_youtube,
    job:             job || null
  });
});

// GET /api/walkon/:playerId/audio — MP3 streamen (Range-Request-fähig)
router.get('/:playerId/audio', (req, res) => {
  const playerId = parseInt(req.params.playerId, 10);

  const player = db.prepare('SELECT walkon_file FROM players WHERE id = ?').get(playerId);
  if (!player || !player.walkon_file) {
    return res.status(404).json({ error: 'Kein Walk-On Song vorhanden' });
  }

  const filePath = player.walkon_file;
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Audiodatei nicht gefunden' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // Range-Request (iOS/Safari Kompatibilität)
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end   = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range':  `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges':  'bytes',
      'Content-Length': chunkSize,
      'Content-Type':   'audio/mpeg'
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type':   'audio/mpeg',
      'Accept-Ranges':  'bytes'
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// DELETE /api/walkon/:playerId — Walk-On Song löschen
router.delete('/:playerId', requireAdmin, (req, res) => {
  const playerId = parseInt(req.params.playerId, 10);

  const player = db.prepare('SELECT walkon_file FROM players WHERE id = ?').get(playerId);
  if (!player) {
    return res.status(404).json({ error: 'Spieler nicht gefunden' });
  }

  // Datei von Disk löschen (falls vorhanden)
  if (player.walkon_file) {
    try { fs.unlinkSync(player.walkon_file); } catch (_) {}
  }

  // Spalten in players zurücksetzen
  db.prepare(
    'UPDATE players SET walkon_file = NULL, walkon_youtube = NULL, walkon_start = NULL, walkon_duration = NULL WHERE id = ?'
  ).run(playerId);

  // Alle Jobs für diesen Spieler löschen
  db.prepare('DELETE FROM walkon_jobs WHERE player_id = ?').run(playerId);

  res.json({ success: true });
});

module.exports = router;
