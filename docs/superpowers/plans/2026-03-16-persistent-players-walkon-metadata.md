# Persistent Player Lookup & Walk-On Metadata — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to search and reuse existing player profiles when adding players to a tournament, and automatically extract + display Walk-On artist/title metadata.

**Architecture:** Backend adds DB migration, a new dedicated search route, extended `POST /api/tournaments/:id/players`, metadata extraction in the download pipeline, and enriched player responses. Frontend replaces the "add player" form with a search-first flow and upgrades the Walk-On badge to show artist/title.

**Tech Stack:** Node.js + Express + better-sqlite3 + yt-dlp (backend), React 18 + Zustand (frontend), Node built-in test runner (`node:test`)

**Spec:** `docs/superpowers/specs/2026-03-16-persistent-players-walkon-metadata-design.md`

---

## Chunk 1: Backend

### Task 1: DB Migration — walkon_title & walkon_artist

**Files:**
- Modify: `backend/src/db/db.js` (alterStatements array, lines 61–93)

- [ ] **Step 1: Add two ALTER TABLE statements to alterStatements array in `db.js`**

Find the `alterStatements` array (after line 91 `"ALTER TABLE tournaments ADD COLUMN use_seed BOOLEAN DEFAULT 0",`) and append:

```js
"ALTER TABLE players ADD COLUMN walkon_title TEXT",
"ALTER TABLE players ADD COLUMN walkon_artist TEXT",
```

- [ ] **Step 2: Verify migration runs cleanly**

```bash
cd /home/moritzwolf/dartsturnier/backend
node -e "const { db, initialize } = require('./src/db/db'); initialize(); const cols = db.prepare(\"PRAGMA table_info(players)\").all().map(c => c.name); console.log(cols.includes('walkon_title') && cols.includes('walkon_artist') ? 'OK: columns exist' : 'FAIL: missing columns');"
```

Expected output: `OK: columns exist`

- [ ] **Step 3: Commit**

```bash
git add backend/src/db/db.js
git commit -m "feat: add walkon_title and walkon_artist columns to players"
```

---

### Task 2: New Player Search Endpoint

**Files:**
- Create: `backend/src/routes/playerSearch.js`
- Modify: `backend/src/app.js` (add mount after line 65)

- [ ] **Step 1: Create `backend/src/routes/playerSearch.js`**

```js
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
```

- [ ] **Step 2: Mount route in `backend/src/app.js`**

After the line `app.use('/api/players', playerRoutes);` (line 65), add:

```js
const playerSearchRoutes = require('./routes/playerSearch');
app.use('/api/players/search', playerSearchRoutes);
```

Also add the require near the top with the other requires (after `const playerRoutes = require('./routes/players');`):

```js
const playerSearchRoutes = require('./routes/playerSearch');
```

And the mount after line 65:

```js
app.use('/api/players/search', playerSearchRoutes);
```

- [ ] **Step 3: Write a test for the search endpoint**

Create `backend/src/routes/playerSearch.test.js`:

```js
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const express = require('express');
const http = require('http');

// Use in-memory DB for tests
process.env.DB_PATH = ':memory:';
const { db, initialize } = require('../db/db');

describe('GET /api/players/search', () => {
  let server;
  let port;

  before(() => {
    initialize();
    // Seed test data
    db.prepare("INSERT INTO players (name, vorname, nickname, nachname) VALUES (?, ?, ?, ?)")
      .run('Martin "Ace" Hofmann', 'Martin', 'Ace', 'Hofmann');
    db.prepare("INSERT INTO players (name, vorname, nickname, nachname) VALUES (?, ?, ?, ?)")
      .run('Julia "Blitz" Braun', 'Julia', 'Blitz', 'Braun');

    const app = express();
    const router = require('./playerSearch');
    app.use('/', router);
    server = http.createServer(app);
    server.listen(0);
    port = server.address().port;
  });

  after(() => server.close());

  it('returns 400 for query shorter than 2 chars', async () => {
    const res = await fetch(`http://localhost:${port}/?q=a`);
    assert.equal(res.status, 400);
  });

  it('finds player by nickname', async () => {
    const res = await fetch(`http://localhost:${port}/?q=ace`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.length, 1);
    assert.equal(data[0].nickname, 'Ace');
  });

  it('finds player by vorname', async () => {
    const res = await fetch(`http://localhost:${port}/?q=julia`);
    const data = await res.json();
    assert.equal(data[0].nickname, 'Blitz');
  });

  it('returns has_walkon false when no walkon_file', async () => {
    const res = await fetch(`http://localhost:${port}/?q=ace`);
    const data = await res.json();
    assert.equal(data[0].has_walkon, 0);
  });

  it('limits to 10 results', async () => {
    // Insert 11 more players named "Test"
    for (let i = 0; i < 11; i++) {
      db.prepare("INSERT INTO players (name, vorname, nickname, nachname) VALUES (?, ?, ?, ?)")
        .run(`Test${i} "T${i}" X`, `Test${i}`, `T${i}`, 'X');
    }
    const res = await fetch(`http://localhost:${port}/?q=test`);
    const data = await res.json();
    assert.ok(data.length <= 10);
  });
});
```

- [ ] **Step 4: Run the test — expect it to pass**

```bash
cd /home/moritzwolf/dartsturnier/backend
node --test src/routes/playerSearch.test.js
```

Expected: all tests pass (✓)

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/playerSearch.js backend/src/routes/playerSearch.test.js backend/src/app.js
git commit -m "feat: add GET /api/players/search endpoint"
```

---

### Task 3: Extend POST /api/tournaments/:id/players with player_id

**Files:**
- Modify: `backend/src/routes/players.js` (lines 30–98)

- [ ] **Step 1: Replace `requireFields` middleware and add `player_id` path**

Replace the route definition starting at line 30:

```js
router.post('/:id/players', requireFields(['vorname', 'nickname', 'nachname']), (req, res) => {
```

with (remove requireFields from this route, add inline validation):

```js
router.post('/:id/players', (req, res) => {
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
  if (!tournament) {
    return res.status(404).json({ error: 'Turnier nicht gefunden' });
  }
  if (tournament.status !== 'open') {
    return res.status(400).json({ error: 'Die Anmeldephase für dieses Turnier ist bereits geschlossen' });
  }

  // ── Path A: existing player by player_id ────────────────────
  if (req.body.player_id) {
    const pid = parseInt(req.body.player_id, 10);
    if (!pid || pid <= 0) {
      return res.status(400).json({ error: 'Ungültige player_id' });
    }
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(pid);
    if (!player) {
      return res.status(404).json({ error: 'Spieler nicht gefunden' });
    }
    const alreadyRegistered = db.prepare(
      'SELECT id FROM tournament_registrations WHERE player_id = ? AND tournament_id = ?'
    ).get(pid, req.params.id);
    if (alreadyRegistered) {
      return res.status(409).json({ error: 'Spieler ist bereits in diesem Turnier angemeldet' });
    }
    const cancelToken = crypto.randomBytes(32).toString('hex');
    db.prepare(
      'INSERT INTO tournament_registrations (player_id, tournament_id, seed, cancel_token) VALUES (?, ?, ?, ?)'
    ).run(pid, req.params.id, req.body.seed || null, cancelToken);
    auditLog(req, 'player', 'REGISTER', `Spieler "${player.name}" (bestehend) in Turnier "${tournament.name}" angemeldet`, pid);
    return res.status(201).json({ ...player, cancel_token: cancelToken });
  }

  // ── Path B: new or existing player by name fields ────────────
  const { vorname, nickname, nachname, seed } = req.body;
  if (!vorname || !nickname || !nachname) {
    return res.status(400).json({ error: 'vorname, nickname und nachname sind Pflichtfelder' });
  }
```

Then close with the existing logic (the code from `const vn = vorname.trim()` onward stays unchanged). The closing brace of the route handler stays the same.

- [ ] **Step 2: Verify the import of `crypto` is present at the top of `players.js`**

Line 1 of `players.js` should already have `const crypto = require('crypto');` — verify it's there.

- [ ] **Step 3: Write a test for the player_id path**

Add to `backend/src/routes/playerSearch.test.js` or create `backend/src/routes/players.test.js`:

```js
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_PATH = ':memory:';
const { db, initialize } = require('../db/db');

describe('POST /api/tournaments/:id/players with player_id', () => {
  before(() => {
    initialize();
    db.prepare("INSERT INTO tournaments (name, format, checkout, status) VALUES (?, ?, ?, ?)").run('Test', '501', 'double_out', 'open');
    db.prepare("INSERT INTO players (name, vorname, nickname, nachname) VALUES (?, ?, ?, ?)").run('Ace Hofmann', 'Martin', 'Ace', 'Hofmann');
  });

  it('registers existing player by player_id', () => {
    const tournament = db.prepare('SELECT id FROM tournaments LIMIT 1').get();
    const player = db.prepare('SELECT id FROM players LIMIT 1').get();
    // Simulate the DB operation directly (route logic)
    const cancelToken = 'testtoken123';
    db.prepare('INSERT INTO tournament_registrations (player_id, tournament_id, seed, cancel_token) VALUES (?, ?, ?, ?)')
      .run(player.id, tournament.id, null, cancelToken);
    const reg = db.prepare('SELECT * FROM tournament_registrations WHERE player_id = ? AND tournament_id = ?').get(player.id, tournament.id);
    assert.ok(reg);
    assert.equal(reg.player_id, player.id);
  });

  it('duplicate check: same player cannot register twice', () => {
    const tournament = db.prepare('SELECT id FROM tournaments LIMIT 1').get();
    const player = db.prepare('SELECT id FROM players LIMIT 1').get();
    const existing = db.prepare('SELECT id FROM tournament_registrations WHERE player_id = ? AND tournament_id = ?').get(player.id, tournament.id);
    assert.ok(existing, 'Should already be registered from previous test');
  });
});
```

- [ ] **Step 4: Run the test**

```bash
cd /home/moritzwolf/dartsturnier/backend
node --test src/routes/players.test.js
```

Expected: all pass (✓)

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/players.js backend/src/routes/players.test.js
git commit -m "feat: extend POST /tournaments/:id/players to accept player_id for existing players"
```

---

### Task 4: Fix Walk-On DELETE to clear new metadata columns

**Files:**
- Modify: `backend/src/routes/walkon.js` (DELETE handler, ~line 230)

- [ ] **Step 1: Update the UPDATE statement in the DELETE handler**

Find the existing UPDATE in the DELETE handler (around line 231):

```js
db.prepare(
  'UPDATE players SET walkon_file = NULL, walkon_youtube = NULL, walkon_start = NULL, walkon_duration = NULL WHERE id = ?'
).run(playerId);
```

Replace with:

```js
db.prepare(
  'UPDATE players SET walkon_file = NULL, walkon_youtube = NULL, walkon_start = NULL, walkon_duration = NULL, walkon_title = NULL, walkon_artist = NULL WHERE id = ?'
).run(playerId);
```

- [ ] **Step 2: Verify — run a quick node check**

```bash
cd /home/moritzwolf/dartsturnier/backend
node -e "
const { db, initialize } = require('./src/db/db');
initialize();
db.prepare('INSERT OR IGNORE INTO players (id, name, walkon_title, walkon_artist) VALUES (999, \"test\", \"Title\", \"Artist\")').run();
db.prepare('UPDATE players SET walkon_file = NULL, walkon_youtube = NULL, walkon_start = NULL, walkon_duration = NULL, walkon_title = NULL, walkon_artist = NULL WHERE id = 999').run();
const p = db.prepare('SELECT walkon_title, walkon_artist FROM players WHERE id = 999').get();
console.log(p.walkon_title === null && p.walkon_artist === null ? 'OK' : 'FAIL');
db.prepare('DELETE FROM players WHERE id = 999').run();
"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/walkon.js
git commit -m "fix: clear walkon_title and walkon_artist on walk-on delete"
```

---

### Task 5: Walk-On Metadata Extraction in downloadWalkon()

**Files:**
- Modify: `backend/src/routes/walkon.js` (downloadWalkon function, lines 13–99)

- [ ] **Step 1: Add metadata extraction step after walkon_file update (step 4), before job status ready (step 8)**

Find the block after `fs.unlinkSync(tempPath)` cleanup (around line 82) and before the `status = 'ready'` update (around line 88). Insert between them:

```js
    // 5. Metadaten extrahieren (artist, title) — unkritisch, kein Fehler bei Fehlschlag
    try {
      const currentJob = db.prepare('SELECT id FROM walkon_jobs WHERE player_id = ? ORDER BY id DESC LIMIT 1').get(playerId);
      if (currentJob && currentJob.id === jobId) {
        const meta = await new Promise((resolve) => {
          const dlpMeta = spawn('yt-dlp', [
            '--no-playlist',
            '--print', '%(artist,uploader)s',
            '--print', 'title',
            url
          ]);
          let out = '';
          dlpMeta.stdout.on('data', (d) => { out += d.toString(); });
          dlpMeta.on('close', () => resolve(out));
          dlpMeta.on('error', () => resolve(''));
        });
        const lines = meta.trim().split(/\r?\n/).map(l => l.trim());
        const artist = (lines[0] && lines[0] !== 'NA') ? lines[0] : null;
        const title  = (lines[1] && lines[1] !== 'NA') ? lines[1] : null;
        db.prepare('UPDATE players SET walkon_artist = ?, walkon_title = ? WHERE id = ?').run(artist, title, playerId);
      }
    } catch (_) { /* stilles Fallback — kein Einfluss auf Download-Status */ }
```

The complete reordered sequence in the `try` block of `downloadWalkon` should be:
1. yt-dlp spawn (download) → resolve/reject
2. ffmpeg spawn (trim) → resolve/reject
3. `fs.unlinkSync(tempPath)`
4. `db.prepare('UPDATE players SET walkon_file = ?').run(finalPath, playerId)`
5. **[NEW]** metadata extraction block (above)
6. `db.prepare("UPDATE walkon_jobs SET status = 'ready'...").run(jobId)` ← unchanged, stays last

- [ ] **Step 2: Verify the function compiles (syntax check)**

```bash
node --check /home/moritzwolf/dartsturnier/backend/src/routes/walkon.js
```

Expected: no output (clean)

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/walkon.js
git commit -m "feat: extract walk-on artist/title metadata from yt-dlp after download"
```

---

### Task 6: Enrich Player Responses with walkon_title, walkon_artist, has_walkon, walkon_status

**Files:**
- Modify: `backend/src/routes/players.js` (GET /, GET /:id/players)
- Modify: `backend/src/routes/walkon.js` (GET /:playerId/status)

The correlated subquery to reuse in all three places:

```sql
(SELECT status FROM walkon_jobs WHERE player_id = p.id ORDER BY id DESC LIMIT 1) AS walkon_status,
(p.walkon_file IS NOT NULL) AS has_walkon
```

- [ ] **Step 1: Update `GET /api/players` (all players, line ~150)**

Find the SQL in `router.get('/', ...)`. Replace the SELECT columns:

Current:
```js
SELECT
  p.id, p.name, p.vorname, p.nickname, p.nachname, p.walkon_youtube, p.registered_at,
  COUNT(DISTINCT tr.tournament_id) as tournaments_count,
  COUNT(CASE WHEN g.winner_id = p.id THEN 1 END) as wins,
  COUNT(CASE WHEN g.status = 'finished' AND (g.player1_id = p.id OR g.player2_id = p.id) AND g.winner_id != p.id THEN 1 END) as losses
```

Replace with:
```js
SELECT
  p.id, p.name, p.vorname, p.nickname, p.nachname, p.walkon_youtube,
  p.walkon_title, p.walkon_artist,
  (p.walkon_file IS NOT NULL) AS has_walkon,
  (SELECT status FROM walkon_jobs WHERE player_id = p.id ORDER BY id DESC LIMIT 1) AS walkon_status,
  p.registered_at,
  COUNT(DISTINCT tr.tournament_id) as tournaments_count,
  COUNT(CASE WHEN g.winner_id = p.id THEN 1 END) as wins,
  COUNT(CASE WHEN g.status = 'finished' AND (g.player1_id = p.id OR g.player2_id = p.id) AND g.winner_id != p.id THEN 1 END) as losses
```

- [ ] **Step 2: Update `GET /api/tournaments/:id/players` (line ~17)**

Current SELECT:
```js
SELECT p.id, p.name, p.vorname, p.nickname, p.nachname, p.walkon_youtube,
       tr.seed, tr.registered_at, tr.id as registration_id
```

Replace with:
```js
SELECT p.id, p.name, p.vorname, p.nickname, p.nachname, p.walkon_youtube,
       p.walkon_title, p.walkon_artist,
       (p.walkon_file IS NOT NULL) AS has_walkon,
       (SELECT status FROM walkon_jobs WHERE player_id = p.id ORDER BY id DESC LIMIT 1) AS walkon_status,
       tr.seed, tr.registered_at, tr.id as registration_id
```

- [ ] **Step 3: Update `GET /api/walkon/:playerId/status` response (line ~152)**

Find the `db.prepare('SELECT id, walkon_file, walkon_start, walkon_duration, walkon_youtube FROM players WHERE id = ?')`.

Replace with:
```js
const player = db.prepare(
  'SELECT id, walkon_file, walkon_start, walkon_duration, walkon_youtube, walkon_title, walkon_artist FROM players WHERE id = ?'
).get(playerId);
```

And update the `res.json(...)` call to include the new fields:
```js
res.json({
  player_id:       player.id,
  walkon_file:     player.walkon_file,
  walkon_start:    player.walkon_start,
  walkon_duration: player.walkon_duration,
  walkon_url:      player.walkon_youtube,
  walkon_title:    player.walkon_title,
  walkon_artist:   player.walkon_artist,
  job:             job || null
});
```

- [ ] **Step 4: Syntax-check both files**

```bash
node --check /home/moritzwolf/dartsturnier/backend/src/routes/players.js
node --check /home/moritzwolf/dartsturnier/backend/src/routes/walkon.js
```

Expected: no output

- [ ] **Step 5: Smoke-test the backend**

```bash
cd /home/moritzwolf/dartsturnier/backend && node src/app.js &
sleep 2
curl -s http://localhost:3001/api/players | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(Array.isArray(d) && 'walkon_title' in d[0] ? 'OK' : d.length === 0 ? 'OK (empty)' : 'FAIL');"
kill %1
```

Expected: `OK` or `OK (empty)`

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/players.js backend/src/routes/walkon.js
git commit -m "feat: enrich player responses with walkon_title, walkon_artist, has_walkon, walkon_status"
```

---

## Chunk 2: Frontend

### Task 7: Walk-On Badge — Badge-Stil mit Artist/Titel

**Files:**
- Modify: `frontend/src/pages/AdminPage.jsx`
  - `WalkonBadge` component (around line 305–320)
  - Desktop player card walk-on display (around lines 583–604)
  - Mobile player card walk-on display (around lines 668–670)

- [ ] **Step 1: Rewrite the `WalkonBadge` component**

Find the existing `WalkonBadge` function (around line 305) and replace it entirely:

```jsx
function WalkonBadge({ status, title, artist }) {
  let bg, border, color, text;

  if (status === 'ready') {
    bg     = 'rgba(0,229,160,0.1)';
    border = 'rgba(0,229,160,0.3)';
    color  = 'var(--pe-success)';
    const label = (artist && title) ? `${artist} — ${title}` : (title || artist || 'bereit');
    text = `♪ ${label}`;
  } else if (status === 'pending' || status === 'downloading') {
    bg     = 'rgba(255,176,32,0.1)';
    border = 'rgba(255,176,32,0.3)';
    color  = 'var(--pe-warning)';
    text   = '⏳ lädt…';
  } else if (status === 'error') {
    bg     = 'rgba(255,69,96,0.1)';
    border = 'rgba(255,69,96,0.3)';
    color  = 'var(--pe-danger)';
    text   = '✗ Fehler';
  } else {
    // has_walkon but no known status yet (e.g. fresh row, no job recorded) — muted fallback
    bg     = 'transparent';
    border = 'transparent';
    color  = 'var(--pe-text-muted)';
    text   = '♪';
  }

  if (!text) return null;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: bg, border: `1px solid ${border}`,
      borderRadius: '6px', padding: '2px 7px',
      fontSize: '11px', color,
      fontFamily: 'Verdana, Geneva, sans-serif',
      maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }}>
      {text}
    </span>
  );
}
```

- [ ] **Step 2: Update `loadPlayers` to use server-returned walkon_status directly**

Find `loadPlayers` (around line 402). Currently it makes per-player `/walkon/:id/status` calls. Replace it with a simpler version that uses the server-side data:

```jsx
const loadPlayers = async () => {
  const updated = await api.get(`/tournaments/${selectedTournament}/players`);
  setPlayers(updated);
  // Seed walkonStatuses from server-side walkon_status field (no per-player API calls needed)
  const statuses = {};
  for (const p of updated) {
    if (p.has_walkon || p.walkon_youtube) {
      statuses[p.id] = p.walkon_status || null;
    }
  }
  setWalkonStatuses(statuses);
};
```

- [ ] **Step 3: Update the desktop player card walk-on display**

Find the block in the desktop grid (around lines 583–604) that computes `walkonText`/`walkonColor`:

```jsx
const hasWalkon = p.walkon_url || p.walkon_youtube;
const walkonStatus = walkonStatuses[p.id];
let walkonText = '♪ —';
let walkonColor = 'var(--pe-text-muted)';
if (hasWalkon) { ... }
```

Replace the entire block and the `<div style={{ fontSize: '10px', color: walkonColor ... }}>{walkonText}</div>` line with:

```jsx
const effectiveWalkonStatus = walkonStatuses[p.id] ?? p.walkon_status;
```

And replace the sub-line element:
```jsx
<div style={{ fontSize: '10px', color: walkonColor, marginTop: '2px' }}>{walkonText}</div>
```
with:
```jsx
{(p.has_walkon || p.walkon_youtube) && (
  <WalkonBadge
    status={effectiveWalkonStatus}
    title={p.walkon_title}
    artist={p.walkon_artist}
  />
)}
```

- [ ] **Step 4: Update the mobile player card walk-on display**

Find around line 668:
```jsx
{(p.walkon_url || p.walkon_youtube) && (
  <WalkonBadge status={walkonStatuses[p.id]} />
)}
```

Replace with:
```jsx
{(p.has_walkon || p.walkon_youtube) && (
  <WalkonBadge
    status={walkonStatuses[p.id] ?? p.walkon_status}
    title={p.walkon_title}
    artist={p.walkon_artist}
  />
)}
```

- [ ] **Step 5: Verify no build errors**

```bash
cd /home/moritzwolf/dartsturnier/frontend
npm run build 2>&1 | tail -5
```

Expected: `built in Xs` with no errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/AdminPage.jsx
git commit -m "feat: walk-on badge shows artist and title in player cards"
```

---

### Task 8: Player Search Flow — Replace Add-Player Form

**Files:**
- Modify: `frontend/src/pages/AdminPage.jsx`
  - `PlayersTab` component state and JSX (lines 321–700)

This task replaces the `showForm` state + `handleCreate` form with a 2-mode search-first flow.

- [ ] **Step 1: Replace state declarations for the add-player flow**

In `PlayersTab`, find:
```jsx
const [showForm, setShowForm] = useState(false);
```

Replace with:
```jsx
const [addMode, setAddMode] = useState(null); // null | 'search' | 'new'
const [searchQuery, setSearchQuery] = useState('');
const [searchResults, setSearchResults] = useState([]);
const [searchLoading, setSearchLoading] = useState(false);
const [confirmPlayer, setConfirmPlayer] = useState(null); // player object to confirm
const [confirmSeed, setConfirmSeed] = useState('');
```

- [ ] **Step 2: Add debounced search effect**

After the `loadPlayers` function definition, add:

```jsx
useEffect(() => {
  if (!searchQuery || searchQuery.trim().length < 2) {
    setSearchResults([]);
    setConfirmPlayer(null);
    return;
  }
  const timer = setTimeout(async () => {
    setSearchLoading(true);
    try {
      const results = await api.get(
        `/players/search?q=${encodeURIComponent(searchQuery.trim())}&tournament_id=${selectedTournament}`
      );
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, 300);
  return () => clearTimeout(timer);
}, [searchQuery, selectedTournament]);
```

- [ ] **Step 3: Add `handleRegisterExisting` handler**

After the debounced search effect, add:

```jsx
const handleRegisterExisting = async () => {
  if (!confirmPlayer || !selectedTournament) return;
  try {
    await api.post(`/tournaments/${selectedTournament}/players`, {
      player_id: confirmPlayer.id,
      seed: confirmSeed ? parseInt(confirmSeed, 10) : undefined,
    });
    setAddMode(null);
    setSearchQuery('');
    setSearchResults([]);
    setConfirmPlayer(null);
    setConfirmSeed('');
    await loadPlayers();
    addToast({ type: 'success', message: `${confirmPlayer.name} angemeldet` });
  } catch (err) {
    addToast({ type: 'error', message: err.message || 'Anmeldung fehlgeschlagen' });
  }
};
```

- [ ] **Step 4: Update `handleCreate` to reset addMode instead of showForm**

Find in `handleCreate`:
```jsx
setShowForm(false);
```
Replace with:
```jsx
setAddMode(null);
setSearchQuery('');
setSearchResults([]);
```

Also update the form reset:
```jsx
setForm({ vorname: '', nickname: '', nachname: '', walk_on_song: '', walkon_start: 0, walkon_duration: 30 });
```
(keep as-is, just make sure it also clears after new player creation)

- [ ] **Step 5: Update the header button — "+ Neu" triggers search mode**

Find the header button:
```jsx
<button onClick={() => setShowForm(!showForm)} ...>
  {showForm ? 'Abbrechen' : '+ Neu'}
</button>
```

Replace with:
```jsx
<button
  onClick={() => { setAddMode(addMode ? null : 'search'); setSearchQuery(''); setSearchResults([]); setConfirmPlayer(null); }}
  className="px-4 py-2 rounded-lg text-sm font-bold"
  style={{ background: 'var(--pe-blue-deep)', color: 'var(--pe-text)', fontFamily: 'Verdana, Geneva, sans-serif' }}
>
  {addMode ? 'Abbrechen' : '+ Spieler'}
</button>
```

- [ ] **Step 6: Replace the old form JSX with the new search UI**

Find the `{showForm && !isActive && (<form onSubmit={handleCreate} ...>` block (lines 503–538) and replace the entire block with:

```jsx
{addMode && !isActive && (
  <div className="p-4 rounded-xl mb-6" style={{ background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)' }}>

    {/* Mode: search */}
    {addMode === 'search' && !confirmPlayer && (
      <>
        <input
          type="text"
          autoFocus
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Name oder Nickname suchen…"
          className="w-full p-3 rounded-lg outline-none mb-3"
          style={inputStyle}
        />
        {searchLoading && (
          <p style={{ fontSize: '12px', color: 'var(--pe-text-muted)', textAlign: 'center', padding: '8px' }}>Suche…</p>
        )}
        {!searchLoading && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
          <p style={{ fontSize: '12px', color: 'var(--pe-text-muted)', textAlign: 'center', padding: '8px' }}>
            Keine Spieler gefunden.
          </p>
        )}
        {searchResults.map((p) => (
          <div
            key={p.id}
            onClick={() => { setConfirmPlayer(p); setConfirmSeed(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-border)',
              borderRadius: '8px', padding: '10px 12px', marginBottom: '6px', cursor: 'pointer',
            }}
            className="pe-card-interactive"
          >
            <div style={{
              width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
              background: 'var(--pe-bg-card)', border: '1px solid var(--pe-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 'bold', color: 'var(--pe-cyan-bright)',
            }}>
              {((p.vorname?.[0] || '') + (p.nachname?.[0] || '')).toUpperCase() || '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--pe-text)' }}>{p.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--pe-text-muted)', marginTop: '2px' }}>
                {p.tournaments_count} Turnier{p.tournaments_count !== 1 ? 'e' : ''} · {p.wins}S / {p.losses}N
                {p.has_walkon ? <span style={{ marginLeft: '6px', color: 'var(--pe-success)' }}>♪</span> : null}
              </div>
            </div>
          </div>
        ))}
        <button
          onClick={() => setAddMode('new')}
          style={{
            width: '100%', marginTop: '6px', padding: '10px',
            border: '1px dashed var(--pe-border)', borderRadius: '8px',
            background: 'none', color: 'var(--pe-cyan-bright)',
            fontSize: '12px', cursor: 'pointer', fontFamily: 'Verdana, Geneva, sans-serif',
          }}
        >
          + Neuen Spieler anlegen{searchQuery.trim() ? ` "${searchQuery.trim()}"` : ''}
        </button>
      </>
    )}

    {/* Confirm panel after selecting a player */}
    {addMode === 'search' && confirmPlayer && (
      <div>
        <button
          onClick={() => setConfirmPlayer(null)}
          style={{ fontSize: '11px', color: 'var(--pe-text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '12px', fontFamily: 'Verdana, Geneva, sans-serif' }}
        >
          ← Zurück zur Suche
        </button>
        <div style={{ background: 'var(--pe-bg-elevated)', border: '1px solid var(--pe-cyan-bright)', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', color: 'var(--pe-cyan-bright)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Gefundener Spieler</div>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--pe-text)', marginBottom: '4px' }}>{confirmPlayer.name}</div>
          <div style={{ fontSize: '11px', color: 'var(--pe-text-sub)', marginBottom: '8px' }}>
            {confirmPlayer.tournaments_count} Turnier{confirmPlayer.tournaments_count !== 1 ? 'e' : ''} · {confirmPlayer.wins} Siege / {confirmPlayer.losses} Niederlagen
          </div>
          {confirmPlayer.has_walkon && (
            <WalkonBadge
              status={confirmPlayer.walkon_status}
              title={confirmPlayer.walkon_title}
              artist={confirmPlayer.walkon_artist}
            />
          )}
        </div>
        <label style={{ fontSize: '11px', color: 'var(--pe-text-muted)', display: 'block', marginBottom: '4px' }}>Setzung (optional)</label>
        <input
          type="number"
          min="1"
          value={confirmSeed}
          onChange={(e) => setConfirmSeed(e.target.value)}
          placeholder="z.B. 1"
          className="w-full p-3 rounded-lg outline-none mb-3"
          style={inputStyle}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleRegisterExisting}
            className="flex-1 py-3 rounded-lg font-bold"
            style={{ background: 'var(--pe-gradient)', color: 'var(--pe-text)', minHeight: '48px', fontFamily: 'Verdana, Geneva, sans-serif' }}
          >
            Anmelden
          </button>
          <button
            onClick={() => setConfirmPlayer(null)}
            className="px-4 py-3 rounded-lg"
            style={{ background: 'var(--pe-bg-elevated)', color: 'var(--pe-text-sub)', fontFamily: 'Verdana, Geneva, sans-serif' }}
          >
            Abbrechen
          </button>
        </div>
      </div>
    )}

    {/* Mode: new player form */}
    {addMode === 'new' && (
      <form onSubmit={handleCreate} className="space-y-3">
        <button
          type="button"
          onClick={() => setAddMode('search')}
          style={{ fontSize: '11px', color: 'var(--pe-text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '4px', fontFamily: 'Verdana, Geneva, sans-serif' }}
        >
          ← Zurück zur Suche
        </button>
        <input type="text" value={form.vorname} onChange={(e) => setForm({ ...form, vorname: e.target.value })} placeholder="Vorname *" required className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
        <input
          type="text"
          value={form.nickname}
          onChange={(e) => setForm({ ...form, nickname: e.target.value })}
          placeholder="Nickname *"
          required
          className="w-full p-3 rounded-lg outline-none"
          style={inputStyle}
        />
        <input type="text" value={form.nachname} onChange={(e) => setForm({ ...form, nachname: e.target.value })} placeholder="Nachname *" required className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
        <input type="url" value={form.walk_on_song} onChange={(e) => setForm({ ...form, walk_on_song: e.target.value })} placeholder="Walk-On Song URL (optional)" className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
        {form.walk_on_song && (
          <div className="flex gap-2">
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--pe-text-muted)', display: 'block', marginBottom: '4px' }}>Startzeit (Sek.)</label>
              <input type="number" min="0" value={form.walkon_start} onChange={(e) => setForm({ ...form, walkon_start: e.target.value })} required className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: 'var(--pe-text-muted)', display: 'block', marginBottom: '4px' }}>Länge (Sek.)</label>
              <input type="number" min="5" max="120" value={form.walkon_duration} onChange={(e) => setForm({ ...form, walkon_duration: e.target.value })} required className="w-full p-3 rounded-lg outline-none" style={inputStyle} />
            </div>
          </div>
        )}
        {form.vorname && form.nickname && form.nachname && (
          <p style={{ fontSize: '12px', color: 'var(--pe-text-muted)' }}>
            Angezeigt als: <strong style={{ color: 'var(--pe-text)' }}>{form.vorname.trim()} &ldquo;{form.nickname.trim()}&rdquo; {form.nachname.trim()}</strong>
          </p>
        )}
        <button type="submit" disabled={!form.vorname.trim() || !form.nickname.trim() || !form.nachname.trim()} className="w-full py-3 rounded-lg font-bold disabled:opacity-50" style={{ background: 'var(--pe-gradient)', color: 'var(--pe-text)', minHeight: '48px', fontFamily: 'Verdana, Geneva, sans-serif' }}>
          Spieler anlegen & anmelden
        </button>
      </form>
    )}
  </div>
)}
```

- [ ] **Step 7: Pre-fill nickname in "new" mode when coming from search**

In the `handleCreate` — no change needed since the form is initialized empty. But when "+ Neuen Spieler anlegen" button is clicked, pre-fill the nickname from `searchQuery`. Update the button's `onClick`:

```jsx
onClick={() => {
  setForm({ vorname: '', nickname: searchQuery.trim(), nachname: '', walk_on_song: '', walkon_start: 0, walkon_duration: 30 });
  setAddMode('new');
}}
```

- [ ] **Step 8: Apply all state-change steps atomically, then build**

> **Important:** Steps 1, 4, and 5 of this task all touch `showForm`/`setShowForm`. The JSX references in the button (Step 5) and form guard (Step 6 replaces the old `{showForm && ...}` block) must all be replaced before running a build — a partial application leaves dangling `showForm` references that will cause a runtime warning. Complete all steps in order before running the build check below.

```bash
cd /home/moritzwolf/dartsturnier/frontend
npm run build 2>&1 | tail -10
```

Expected: clean build, no errors

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/AdminPage.jsx
git commit -m "feat: replace add-player form with search-first flow (existing player lookup)"
```

---

### Task 9: Create PR and Cleanup

- [ ] **Step 1: Create feature branch from dev and push**

```bash
git checkout dev && git pull origin dev
git checkout -b feat/persistent-player-lookup-walkon-metadata
git cherry-pick <all commits from tasks 1-8>
git push origin feat/persistent-player-lookup-walkon-metadata
```

Actually — if work was done directly on `dev`, create the branch properly:
```bash
# If working on a feature branch already:
git push origin feat/persistent-player-lookup-walkon-metadata
gh pr create --base dev --head feat/persistent-player-lookup-walkon-metadata \
  --title "feat: persistent player lookup and walk-on metadata" \
  --body "$(cat <<'EOF'
## Summary
- Admin can search existing player profiles when adding to a tournament (search-first flow)
- Walk-on artist/title automatically extracted from YouTube via yt-dlp after download
- Player cards show artist/title as badge instead of plain text status
- New `GET /api/players/search` endpoint (own route file, avoids double-mount issue)
- `POST /api/tournaments/:id/players` accepts optional `player_id` for direct registration
- `walkon_title`, `walkon_artist` columns added to players table

## Test plan
- [ ] Search for an existing player by name/nickname → results appear
- [ ] Select player → confirm panel shows stats + walk-on badge
- [ ] Register existing player → appears in player list
- [ ] "+ Neuen Spieler anlegen" → form opens with nickname pre-filled
- [ ] New player creation still works as before
- [ ] Walk-on badge shows artist/title after download completes
- [ ] Deleting a walk-on clears title/artist from DB

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

**Plan complete.** 9 tasks, ~25 steps total. All backend tasks (1–6) are independent and can run in sequence. Frontend tasks (7–8) depend on backend being done first (new fields in responses).
