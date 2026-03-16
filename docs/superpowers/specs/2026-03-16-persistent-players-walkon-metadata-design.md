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

Migration läuft beim Server-Start in `db.js` via `ALTER TABLE IF NOT EXISTS`-Pattern (SQLite: try/catch auf ALTER).

---

### Backend

#### 1. `GET /api/players/search?q=<term>&tournament_id=<id>`

- Sucht in `name`, `nickname`, `vorname`, `nachname` (LIKE, case-insensitive)
- Optionaler Parameter `tournament_id`: filtert Spieler die bereits in diesem Turnier angemeldet sind heraus
- Gibt max. 10 Treffer zurück
- Response pro Spieler:
  ```json
  {
    "id": 1,
    "name": "Martin \"Ace\" Hofmann",
    "vorname": "Martin",
    "nickname": "Ace",
    "nachname": "Hofmann",
    "walkon_title": "Seven Nation Army",
    "walkon_artist": "The White Stripes",
    "walkon_file": "/path/or/null",
    "tournaments_count": 3,
    "wins": 12,
    "losses": 4
  }
  ```
- Kein Auth erforderlich (öffentliche Spielerdaten)

#### 2. `POST /api/tournaments/:id/players` — Erweiterung

Neuer optionaler Body-Parameter: `player_id` (Integer).

- Wenn `player_id` gesetzt: Spieler muss existieren → direkt `tournament_registrations` Eintrag anlegen, kein neues Profil erstellen
- Wenn `player_id` nicht gesetzt: bisheriges Verhalten (Profil per Nickname suchen oder neu anlegen)
- Duplikat-Check bleibt: gleicher Spieler darf nicht zweimal im selben Turnier angemeldet sein

#### 3. Walk-On Route — Metadaten-Extraktion

Nach erfolgreichem yt-dlp Audio-Download:

```bash
yt-dlp --no-playlist --print title --print uploader <url>
```

Gibt zwei Zeilen aus: Zeile 1 = Titel, Zeile 2 = Uploader/Artist.

```js
db.prepare('UPDATE players SET walkon_title = ?, walkon_artist = ? WHERE id = ?')
  .run(title, artist, playerId);
```

Fehler bei der Metadaten-Extraktion sind unkritisch — Download-Status bleibt `ready`, Felder bleiben `NULL`.

#### 4. Player-Responses erweitern

`walkon_title` und `walkon_artist` in allen bestehenden Player-Responses ergänzen:
- `GET /api/players`
- `GET /api/tournaments/:id/players`
- `GET /api/walkon/:playerId/status`

---

### Frontend

#### Spieler-Karte (Badge-Stil)

Wenn Walk-On vorhanden (`walkon_youtube` gesetzt) und Status bekannt:

| Status | Badge |
|--------|-------|
| `ready` | `♪ Artist — Titel` (grüner Badge) |
| `pending` / `downloading` | `⏳ lädt…` (gelber Badge) |
| `error` | `✗ Fehler` (roter Badge) |
| kein Walk-On | kein Badge |

Badge-Stil:
```css
background: rgba(0,229,160,0.1);
border: 1px solid rgba(0,229,160,0.3);
border-radius: 6px;
padding: 2px 7px;
font-size: 11px;
color: var(--pe-success);
```

Wenn `walkon_title` / `walkon_artist` vorhanden: `♪ {artist} — {title}` anzeigen.
Wenn nicht vorhanden aber ready: `♪ bereit` anzeigen.

#### Spieler hinzufügen — Suchflow

Das bestehende Formular (Vorname / Nickname / Nachname) wird durch einen 2-Modus-Flow ersetzt:

**Modus 1: Suche (Standard)**

1. Suchfeld (Debounce 300ms) → `GET /api/players/search?q=...&tournament_id=...`
2. Ergebnisliste: Avatar (Initialen), Name, Stats, Walk-On Badge
3. Klick auf Spieler → Confirm-Panel erscheint:
   - Spielerinfo (Name, Stats, Walk-On)
   - Optionales Setzungs-Feld
   - "Anmelden" → `POST /api/tournaments/:id/players` mit `{ player_id, seed }`
4. Unten: "+ Neuen Spieler anlegen" → wechselt zu Modus 2

**Modus 2: Neuer Spieler**

- Bisheriges Formular (Vorname / Nickname / Nachname / Walk-On URL / Start / Dauer)
- "Zurück zur Suche" Link oben
- Nickname wird aus dem Suchbegriff vorausgefüllt wenn vorhanden

---

## Fehlerbehandlung

- Suchfeld leer oder < 2 Zeichen: keine API-Anfrage, keine Ergebnisliste
- Keine Treffer: leerer Zustand mit "+ Neuen Spieler anlegen" CTA
- `player_id` nicht gefunden: Backend gibt `404` zurück
- Spieler bereits im Turnier: Backend gibt `409` zurück mit erklärender Meldung
- yt-dlp Metadaten-Fehler: stilles Fallback, kein Einfluss auf Download-Status

---

## Implementierungsreihenfolge

1. DB-Migration (walkon_title, walkon_artist)
2. Backend: Search-Endpunkt
3. Backend: POST players mit player_id
4. Backend: Walk-On Metadaten-Extraktion
5. Backend: Player-Responses erweitern
6. Frontend: Spieler-Karte Badge
7. Frontend: Suchflow

---

## Nicht geändert

- Walk-On ist und bleibt am `players`-Profil gebunden (nicht an `tournament_registrations`)
- `cancel_token` Mechanismus bleibt unverändert
- Spielerprofil-Daten (Name, Nickname) bleiben editierbar im bestehenden Edit-Dialog
