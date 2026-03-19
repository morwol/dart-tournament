# Design: Persistente Spieler — Turnier-Lookup & Walk-On Metadaten

**Date:** 2026-03-16
**Status:** Approved
**Scope:** Backend + Frontend

---

## Problem

Spielerprofile sind bereits persistent (eigene `players` Tabelle, losgelöst von Turnieren). Dennoch gibt es beim Hinzufügen eines Spielers zu einem Turnier nur ein leeres Formular — bestehende Spieler können nicht gesucht oder wiederverwendet werden.

Zusätzlich fehlen zwei UX-Verbesserungen in der Spielerliste:
1. Walk-On Metadaten (Interpret, Titel) werden von yt-dlp nicht extrahiert und nicht angezeigt.
2. Die Walk-On Anzeige in der Spieler-Karte ist zu klein und informationsarm.

---

## Ziele

1. Admin kann beim Turnier-Spieler-Management bestehende Spielerprofile suchen und direkt anmelden.
2. Beim Walk-On Download werden Interpret und Titel automatisch per yt-dlp extrahiert und gespeichert.
3. Die Spieler-Karte zeigt Walk-On als lesbaren Badge mit Interpret und Titel.

---

## Nicht im Scope

- Spielerprofil-Detailseite / History (eigenes Feature #76)
- Walk-On Audio Player im Admin (bereits vorhanden)
- Öffentliche Spielersuche / Public API

---

## Architektur

### Datenbank

Zwei neue Spalten in `players`:

```sql
ALTER TABLE players ADD COLUMN walkon_title  TEXT;
ALTER TABLE players ADD COLUMN walkon_artist TEXT;
```

Migration in `db.js` via try/catch auf ALTER TABLE (identisches Pattern zu bestehenden `vorname`/`nickname`/`nachname` Migrationen).

---

### Backend

#### 1. `GET /api/players/search?q=<term>&tournament_id=<id>`

**Routing — wichtig:** `players.js` ist in `app.js` an **zwei** Pfaden gemountet: `/api/tournaments` und `/api/players`. Eine neue Route in `players.js` würde also auch unter `/api/tournaments/search` erreichbar sein. Um diese Kollision zu vermeiden, wird der Search-Endpoint in einer **eigenen Datei** `backend/src/routes/playerSearch.js` implementiert und in `app.js` ausschließlich unter `/api/players/search` gemountet:

```js
// app.js
const playerSearchRoutes = require('./routes/playerSearch');
app.use('/api/players/search', playerSearchRoutes);
```

- Kein Auth erforderlich (konsistent mit bestehendem `GET /api/players`; beide Endpunkte sind interne Admin-Tools ohne Zugriff von außen via CORS)
- Nur ausgeführt wenn `q` mindestens 2 Zeichen lang ist, sonst `400`
- Sucht in `name`, `nickname`, `vorname`, `nachname` (LIKE `%q%`, case-insensitive via `LOWER()`)
- Optionaler Parameter `tournament_id`: filtert Spieler die bereits in diesem Turnier angemeldet sind heraus (Subquery auf `tournament_registrations`)
- Gibt max. 10 Treffer zurück

SQL-Grundstruktur:
```sql
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
  LOWER(p.name) LIKE LOWER(?)
  OR LOWER(p.nickname) LIKE LOWER(?)
  OR LOWER(p.vorname) LIKE LOWER(?)
  OR LOWER(p.nachname) LIKE LOWER(?)
)
AND (? IS NULL OR p.id NOT IN (
  SELECT player_id FROM tournament_registrations WHERE tournament_id = ?
))
GROUP BY p.id
ORDER BY p.name ASC
LIMIT 10
```

Die correlated Subquery für `walkon_status` steht im SELECT-List (nicht im WHERE/JOIN) — kein Einfluss auf GROUP BY.

Response pro Spieler:
```json
{
  "id": 1,
  "name": "Martin \"Ace\" Hofmann",
  "vorname": "Martin",
  "nickname": "Ace",
  "nachname": "Hofmann",
  "walkon_title": "Seven Nation Army",
  "walkon_artist": "The White Stripes",
  "has_walkon": true,
  "walkon_status": "ready",
  "tournaments_count": 3,
  "wins": 12,
  "losses": 4
}
```

#### 2. `POST /api/tournaments/:id/players` — Erweiterung

Neuer optionaler Body-Parameter: `player_id` (Integer).

**Wenn `player_id` gesetzt:**
- Bestehende `requireFields(['vorname', 'nickname', 'nachname'])` Middleware wird durch **inline konditionelle Validierung** ersetzt (Middleware komplett entfernen, Validierung in den Route-Handler verlagern):
  ```js
  if (req.body.player_id) {
    const pid = parseInt(req.body.player_id, 10);
    if (!pid || pid <= 0) return res.status(400).json({ error: 'Ungültige player_id' });
  } else {
    if (!req.body.vorname || !req.body.nickname || !req.body.nachname) {
      return res.status(400).json({ error: 'vorname, nickname und nachname sind Pflichtfelder' });
    }
  }
  ```
- Tournament-Status-Prüfung (`status !== 'open'` → 400) gilt **auch** für den `player_id`-Pfad
- Spieler muss in `players` existieren → 404 wenn nicht gefunden
- Expliziter Duplikat-Check: `SELECT id FROM tournament_registrations WHERE player_id = ? AND tournament_id = ?` → 409 mit Meldung `"Spieler ist bereits in diesem Turnier angemeldet"`
- Direkt `tournament_registrations` Eintrag anlegen ohne Profil anzulegen
- `walkon_youtube` aus dem Body wird bei `player_id`-Pfad ignoriert
- `seed`: optionaler Integer (kein Eindeutigkeits-Check — konsistent mit bestehendem Verhalten)

**Wenn `player_id` nicht gesetzt:**
- Bisheriges Verhalten vollständig erhalten (Profil per Nickname suchen oder neu anlegen, `walkon_youtube` aus Body verarbeiten)

#### 3. Walk-On Route — Metadaten-Extraktion

Metadaten-Extraktion läuft **vor** dem finalen `status = 'ready'` Update.

Reihenfolge in `downloadWalkon()`:

```
1. yt-dlp download → tempPath
2. ffmpeg trim → finalPath
3. tempPath löschen
4. walkon_file in players aktualisieren
5. [NEU] yt-dlp --print metadata → walkon_artist/walkon_title extrahieren (try/catch, jobId-Check)
6. [NEU] walkon_title + walkon_artist in players aktualisieren
7. Job status → 'ready'
```

Metadaten-Extraktion (Schritt 5):

```js
try {
  // Prüfen ob dieser Job noch der aktuelle ist (Race-Condition-Schutz)
  const currentJob = db.prepare('SELECT id FROM walkon_jobs WHERE player_id = ? ORDER BY id DESC LIMIT 1').get(playerId);
  if (currentJob && currentJob.id === jobId) {
    const meta = await new Promise((resolve) => {
      const dlp = spawn('yt-dlp', [
        '--no-playlist',
        '--print', '%(artist,uploader)s',
        '--print', 'title',
        url
      ]);
      let out = '';
      dlp.stdout.on('data', (d) => { out += d.toString(); });
      dlp.on('close', () => resolve(out));
      dlp.on('error', () => resolve(''));
    });
    const lines = meta.trim().split(/\r?\n/).map(l => l.trim());
    const artist = (lines[0] && lines[0] !== 'NA') ? lines[0] : null;
    const title  = (lines[1] && lines[1] !== 'NA') ? lines[1] : null;
    db.prepare('UPDATE players SET walkon_artist = ?, walkon_title = ? WHERE id = ?').run(artist, title, playerId);
  }
} catch (_) { /* stilles Fallback */ }
```

**DELETE `/api/walkon/:playerId`:** Bestehender Handler muss `walkon_title` und `walkon_artist` ebenfalls auf NULL zurücksetzen:
```sql
UPDATE players SET walkon_file = NULL, walkon_youtube = NULL,
  walkon_start = NULL, walkon_duration = NULL,
  walkon_title = NULL, walkon_artist = NULL
WHERE id = ?
```

Wenn `has_walkon = false` (nach DELETE), ist `walkon_status` aus der Subquery NULL — kein Badge wird angezeigt. Der Fall "kein Badge" greift sobald `has_walkon` falsy ist, unabhängig von `walkon_status`.

#### 4. Player-Responses erweitern

`walkon_title`, `walkon_artist`, `has_walkon` und `walkon_status` in folgenden Responses ergänzen:

- **`GET /api/players`** — `walkon_title`, `walkon_artist`, `has_walkon`, `walkon_status` (correlated Subquery im SELECT-List, nicht als JOIN — bestehende GROUP BY-Aggregation bleibt erhalten)
- **`GET /api/tournaments/:id/players`** — `walkon_title`, `walkon_artist`, `walkon_status`, `has_walkon` via correlated Subquery ergänzen:
  ```sql
  (SELECT status FROM walkon_jobs WHERE player_id = p.id ORDER BY id DESC LIMIT 1) AS walkon_status,
  (p.walkon_file IS NOT NULL) AS has_walkon
  ```
- **`GET /api/walkon/:playerId/status`** — Response um `walkon_title`, `walkon_artist` erweitern:
  ```json
  {
    "player_id": 1,
    "walkon_file": "/abs/path",
    "walkon_start": 30,
    "walkon_duration": 20,
    "walkon_url": "https://...",
    "walkon_title": "Seven Nation Army",
    "walkon_artist": "The White Stripes",
    "job": { "status": "ready", "id": 5 }
  }
  ```

---

### Frontend

#### Spieler-Karte (Badge-Stil)

Badge liest `walkon_status` direkt aus dem Player-Objekt (kein separater Polling-Call beim initialen Laden). Polling für laufende Downloads läuft weiterhin via `GET /api/walkon/:playerId/status`.

| Bedingung | Badge |
|-----------|-------|
| `has_walkon` + `ready` + Metadaten vorhanden | `♪ {artist} — {title}` (grüner Badge) |
| `has_walkon` + `ready` + keine Metadaten | `♪ bereit` (grüner Badge) |
| `pending` / `downloading` | `⏳ lädt…` (gelber Badge) |
| `error` | `✗ Fehler` (roter Badge) |
| `!has_walkon` | kein Badge |

Badge-CSS (PE-Tokens):
```css
/* ready */  background: rgba(0,229,160,0.1); border: 1px solid rgba(0,229,160,0.3); color: var(--pe-success);
/* warning */ background: rgba(255,176,32,0.1); border: 1px solid rgba(255,176,32,0.3); color: var(--pe-warning);
/* error */  background: rgba(255,69,96,0.1);  border: 1px solid rgba(255,69,96,0.3);  color: var(--pe-danger);
/* shared */ border-radius: 6px; padding: 2px 7px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;
```

#### Spieler hinzufügen — Suchflow

Das bestehende Formular wird durch einen 2-Modus-Flow ersetzt:

**Modus 1: Suche (Standard)**

1. Suchfeld — Debounce 300ms, min. 2 Zeichen → `GET /api/players/search?q=...&tournament_id=...`
2. Ergebnisliste: Avatar (Initialen), Name, Stats, Walk-On Badge wenn `has_walkon`
3. 0 Treffer → Leer-Zustand + `+ Neuen Spieler anlegen "{Suchbegriff}"` CTA
4. Klick auf Spieler → Confirm-Panel:
   - Name, Stats, Walk-On Badge
   - Optionales Setzungs-Feld (positive Integer)
   - „Anmelden" → `POST /api/tournaments/:id/players` mit `{ player_id, seed }`
   - „Abbrechen" → zurück zur Liste
5. Unten: `+ Neuen Spieler anlegen` → Modus 2

**Modus 2: Neuer Spieler**

- Bisheriges Formular (Vorname / Nickname / Nachname / Walk-On URL / Start / Dauer)
- Nickname vorausgefüllt aus Suchbegriff (falls aus Modus 1 gewechselt)
- `← Zurück zur Suche` Link oben

---

## Fehlerbehandlung

| Szenario | Verhalten |
|----------|-----------|
| `q` < 2 Zeichen | Keine API-Anfrage |
| 0 Suchergebnisse | Leer-Zustand + CTA |
| `player_id` nicht gefunden | 404 → Toast |
| Spieler bereits im Turnier | 409 → Toast |
| Turnier nicht `open` | 400 → Toast |
| yt-dlp Metadaten-Fehler | Stilles Fallback, Status bleibt `ready` |
| Zweiter Download während Metadaten-Extraktion | jobId-Check verhindert falschen Metadaten-Write |

---

## Implementierungsreihenfolge

1. DB-Migration (`walkon_title`, `walkon_artist` in `db.js`)
2. Backend: `playerSearch.js` neu anlegen + in `app.js` mounten
3. Backend: `POST /api/tournaments/:id/players` um `player_id` erweitern
4. Backend: Walk-On `DELETE` Handler um neue Felder erweitern
5. Backend: Walk-On Metadaten-Extraktion in `downloadWalkon()` (inkl. jobId-Check)
6. Backend: Player-Responses um neue Felder erweitern
7. Frontend: Walk-On Badge in Spieler-Karte
8. Frontend: Suchflow (Modus 1 + Modus 2)

---

## Nicht geändert

- Walk-On bleibt am `players`-Profil gebunden
- `cancel_token` Mechanismus unverändert
- Edit-Dialog für Spielerprofil-Daten unverändert
- Audio-Streaming via `GET /api/walkon/:playerId/audio` unverändert
