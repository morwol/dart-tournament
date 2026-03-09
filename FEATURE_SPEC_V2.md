# FEATURE SPEC v2 — DartEvent Manager
# Für Claude Code Agent Team — Erweiterung des bestehenden Projekts
# Stand: Basis-App läuft (Backend Port 3001, Frontend Port 5173)

---

## WICHTIG: Bestehenden Code NICHT löschen
Alle neuen Features werden ERGÄNZT. Bestehende Routen, Komponenten
und das Datenbankschema werden ERWEITERT, nicht ersetzt.
Vor jeder Änderung an bestehenden Dateien: Backup-Kommentar einfügen.

---

## DATENBANK-ERWEITERUNGEN (backend/src/db/schema.sql)

```sql
-- NEUE TABELLEN ergänzen:

-- Mitarbeiter/User-Verwaltung (zusätzlich zu admin)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'referee',
  -- Rollen: 'admin', 'referee', 'gastronomy', 'staff'
  email TEXT,
  display_name TEXT,
  created_by INTEGER REFERENCES users(id),
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Dartscheiben
CREATE TABLE IF NOT EXISTS boards (
  id INTEGER PRIMARY KEY,
  number INTEGER UNIQUE NOT NULL,  -- Scheibennummer (1, 2, 3...)
  name TEXT,                        -- z.B. "Board 1", "Hauptbühne"
  active BOOLEAN DEFAULT 1,
  tournament_id INTEGER REFERENCES tournaments(id)
);

-- Turnier-Konfiguration erweitern
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS board_count INTEGER DEFAULT 1;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS prelim_format TEXT DEFAULT '301_single_out';
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS prelim_legs INTEGER DEFAULT 1;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS qf_format TEXT DEFAULT '501_double_out';
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS qf_legs INTEGER DEFAULT 3;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS sf_format TEXT DEFAULT '501_double_out';
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS sf_legs INTEGER DEFAULT 3;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS final_format TEXT DEFAULT '501_double_out';
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS final_legs INTEGER DEFAULT 5;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS group_draw_done BOOLEAN DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT 0;
-- locked=1: Turnier abgeschlossen, nur noch lesbar

-- Spieler erweitern
ALTER TABLE players ADD COLUMN IF NOT EXISTS walkon_youtube TEXT;
-- YouTube URL für Walk-On Song ab Viertelfinale

-- Spielplan / Scheduling
CREATE TABLE IF NOT EXISTS schedule (
  id INTEGER PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id),
  game_id INTEGER REFERENCES games(id),
  board_id INTEGER REFERENCES boards(id),
  scheduled_at DATETIME,
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'active', 'skipped', 'done'
  skipped_reason TEXT
);

-- Würfe erweitern (für Schiedsrichter-Eingabe)
ALTER TABLE throws ADD COLUMN IF NOT EXISTS segment TEXT;
-- z.B. 'T20', 'D16', 'S5', 'BULL', 'MISS'
ALTER TABLE throws ADD COLUMN IF NOT EXISTS undo_of INTEGER REFERENCES throws(id);
-- Für Rückgängig-Funktion

-- Gruppen-Auslosung
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id),
  name TEXT NOT NULL,  -- 'Gruppe A', 'Gruppe B'...
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_players (
  group_id INTEGER REFERENCES groups(id),
  player_id INTEGER REFERENCES players(id),
  PRIMARY KEY (group_id, player_id)
);

-- Mailing-Vorbereitung
CREATE TABLE IF NOT EXISTS mail_templates (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,       -- 'event_summary', 'results', 'thank_you'
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mail_log (
  id INTEGER PRIMARY KEY,
  template_id INTEGER REFERENCES mail_templates(id),
  recipient_email TEXT NOT NULL,
  sent_at DATETIME,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  tournament_id INTEGER REFERENCES tournaments(id)
);

-- Produkte und Gastronomie erweitern
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Abrechnung
CREATE TABLE IF NOT EXISTS settlements (
  id INTEGER PRIMARY KEY,
  guest_id INTEGER REFERENCES guests(id),
  total_amount DECIMAL(10,2) NOT NULL,
  settled_by INTEGER REFERENCES users(id),
  settled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  note TEXT
);
```

---

## BACKEND-ERWEITERUNGEN

### 1. User-Verwaltung (backend/src/routes/users.js) NEU ERSTELLEN

```
GET    /api/users              → Alle User (nur admin)
POST   /api/users              → User anlegen (nur admin)
PUT    /api/users/:id          → User bearbeiten (nur admin)
DELETE /api/users/:id          → User deaktivieren (nur admin)
POST   /api/auth/login         → Bereits vorhanden — erweitern für alle Rollen
GET    /api/auth/me            → Eigenes Profil + Rolle
```

Rollen-Middleware erweitern:
- `requireAdmin` — nur admin
- `requireRole('referee')` — Schiedsrichter
- `requireRole('gastronomy')` — Gastronomie
- `requireAny(['admin','referee'])` — Admin oder Schiedsrichter

### 2. Board-Verwaltung (backend/src/routes/boards.js) NEU ERSTELLEN

```
GET    /api/boards                        → Alle Scheiben
POST   /api/boards                        → Scheibe anlegen (admin)
GET    /api/boards/:id/current-game       → Aktuelles Spiel auf dieser Scheibe
GET    /api/boards/:id/next-game          → Nächstes geplantes Spiel
PUT    /api/schedule/:id/skip             → Spiel überspringen
PUT    /api/schedule/:id/activate         → Spiel als aktiv setzen
```

### 3. Gruppen-Auslosung (backend/src/routes/tournaments.js erweitern)

```
POST   /api/tournaments/:id/draw-groups   → Automatische Gruppenauslosung
GET    /api/tournaments/:id/groups        → Gruppen anzeigen
POST   /api/tournaments/:id/generate-bracket → KO-Bracket aus Gruppenphase generieren
PUT    /api/tournaments/:id/lock          → Turnier abschließen (locked=true)
```

Auslosungslogik:
- Bei 4-7 Spielern: 2 Gruppen
- Bei 8-15 Spielern: 4 Gruppen  
- Bei 16+ Spielern: 8 Gruppen
- Serpentinen-Verteilung (Seed 1→Gruppe A, Seed 2→Gruppe B, etc.)

### 4. Schiedsrichter-Eingabe (backend/src/routes/games.js erweitern)

```
POST   /api/games/:id/throw-segment      → Segment eingeben (T20, D16, S5, BULL, MISS)
DELETE /api/games/:id/throw/:throwId     → Wurf rückgängig (mehrfach möglich)
GET    /api/games/:id/live               → Live-Spielstand für CurrentGameView
```

Segment-Berechnung:
- S{n} = n Punkte
- D{n} = n*2 Punkte  
- T{n} = n*3 Punkte
- BULL/D-BULL = 25/50 Punkte
- MISS = 0 Punkte
- Nach 3 Würfen: Runde automatisch beenden

### 5. Mailing-Vorbereitung (backend/src/routes/mail.js) NEU ERSTELLEN

```
GET    /api/mail/templates               → Templates anzeigen
POST   /api/mail/templates               → Template anlegen
POST   /api/mail/send-test               → Test-Mail an Admin
POST   /api/mail/send-event-summary      → Event-Zusammenfassung versenden
```

Konfiguration via .env:
```
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=
MAIL_PASS=
MAIL_FROM=events@example.com
```
Nodemailer installieren: `npm install nodemailer`
Wenn MAIL_HOST nicht konfiguriert → Mail nur in Konsole loggen (dry-run)

### 6. Gastronomie-Erweiterungen (backend/src/routes/orders.js erweitern)

```
POST   /api/orders/settle/:guestId       → Gast abrechnen (alle open→paid)
GET    /api/orders/dashboard             → Admin-Dashboard: Gesamtumsatz, pro Artikel
GET    /api/orders/by-guest              → Alle Gäste mit offenem Betrag
PUT    /api/products/:id                 → Produkt bearbeiten (Preis, Name, Verfügbar)
POST   /api/products                     → Produkt anlegen
DELETE /api/products/:id                 → Produkt deaktivieren
```

---

## FRONTEND-ERWEITERUNGEN

### Neue Routen in App.jsx ergänzen:

```
/                          → HomePage (öffentlich — Turnier-Info, Spieler-Stats)
/board/:boardId            → CurrentGameView (öffentlich, read-only)
/referee/:boardId          → Referee-Modus (Login erforderlich: referee/admin)
/admin                     → Admin Dashboard (Login erforderlich: admin)
/admin/users               → User-Verwaltung
/admin/tournament/:id      → Turnier-Detail mit Konfiguration
/admin/gastronomy          → Gastronomie-Dashboard
/gastronomy                → Gastronomie Bestellerfassung (Login: gastronomy/admin)
/nfc-scan                  → NFC Scanner (Login: gastronomy/admin)
```

### HomePage (src/pages/HomePage.jsx) KOMPLETT ÜBERARBEITEN

Öffentliche Turnier-Übersicht:
- Aktuelles Turnier: Name, Datum, Status, Teilnehmerzahl
- Spielerliste mit Karten: Name, W/L, Average, Highest Out
- Nächste Spiele pro Scheibe (aktualisiert alle 10 Sekunden)
- Gruppenübersicht falls Gruppenphase läuft
- Bracket-Ansicht für KO-Phase

### CurrentGameView (src/pages/CurrentGameView.jsx) NEU ERSTELLEN

URL: `/board/:boardId` — Read-only, für Beamer/TV

Layout (Vollbild, Dark Mode):
```
┌─────────────────────────────────────────────┐
│  [Sponsor Logo]     Board 1     [P Entertainment Logo] │
├──────────────┬──────────────────┬────────────┤
│  SPIELER 1   │   vs   │  SPIELER 2   │
│  [Name groß] │        │  [Name groß] │
│  [Score 501] │        │  [Score 501] │
│  [Avg: 58.4] │        │  [Avg: 52.1] │
├──────────────┴──────────────────┴────────────┤
│  Aktuelles Leg: Würfe diese Runde            │
│  S20 (20) + T19 (57) + D16 (32) = 109       │
├──────────────────────────────────────────────┤
│  Stats dieser Partie: Legs 2-1               │
├──────────────────────────────────────────────┤
│  Nächstes Spiel: Meyer vs. Huber (Board 1)   │
└──────────────────────────────────────────────┘
```

Auto-Refresh alle 2 Sekunden via polling `/api/games/:id/live`
Walk-On Song: Bei Viertelfinale+ erscheint YouTube-Embed-Button

### Referee-Modus (src/pages/RefereePage.jsx) NEU ERSTELLEN

URL: `/referee/:boardId` — Login erforderlich

Eingabe-Interface:
```
Aktuelle Punkte groß angezeigt (beide Spieler)

Zahlenfeld:
[1][2][3][4][5][6][7][8][9][10]
[11][12][13][14][15][16][17][18][19][20]
[BULL][D-BULL][MISS]

Modifier (vor Zahl drücken):
[Single] [Double] [Triple]

Letzte Würfe dieser Runde:
Wurf 1: T20 (60)  [↩ Rückgängig]
Wurf 2: T19 (57)  [↩ Rückgängig]
Wurf 3: —

[Runde bestätigen] (nach 3 Würfen oder manuell)

Mehrfach-Undo: Bis zu 9 Würfe zurück möglich
```

### Admin Dashboard (src/pages/AdminPage.jsx) ERWEITERN

Neue Tabs/Sektionen:
1. **Übersicht** — Alle laufenden Spiele, Boards-Status
2. **Turnier** — Konfiguration, Gruppenauslosung, Bracket
3. **Spieler** — Anlegen, Walk-On Song, Statistiken
4. **Boards** — Scheiben verwalten, Spielplan, Skip-Funktion
5. **User** — Mitarbeiter anlegen, Rollen vergeben
6. **Gastronomie** — Produkte, Abrechnung, Dashboard
7. **Mailing** — Templates, Versand (Post-Event)

### Gastronomie-Frontend (src/pages/GastronomyPage.jsx) ERWEITERN

iPad/Tablet optimiert:
- NFC-Scan → Gast laden
- Große Produkt-Buttons (min. 80px) mit Preis
- Warenkorb rechts: Artikel + Summe
- [Zurück] Button prominent (Fehl-Klick korrigieren)
- [Bestellen] → Speichern
- [Abrechnen] → Settlement + Quittungs-Ansicht

Kassen-Ansicht (fixes iPad):
- Zeigt alle offenen Bestellungen live
- Pro Gast: Name/NFC-ID, Artikel, Betrag, [Jetzt abrechnen]
- Tages-Summe oben prominent

---

## DESIGN-REGELN (alle neuen Komponenten)

Schrift: Verdana, Geneva, sans-serif (PFLICHT)
Farben ausschließlich aus CSS Tokens:
  --pe-blue-deep:    #1A4FD6
  --pe-blue-mid:     #1E7FEB
  --pe-cyan-bright:  #00B8FF
  --pe-gradient:     linear-gradient(135deg, #5DD5FF, #1E7FEB, #1A4FD6)
  --pe-bg:           #090E1A
  --pe-bg-card:      #101829
  --pe-bg-elevated:  #172035
  --pe-border:       #1E3154
  --pe-success:      #00E5A0
  --pe-warning:      #FFB020
  --pe-danger:       #FF4560

Touch-Targets: minimum 64px für alle interaktiven Elemente
Mobile-first, aber CurrentGameView ist Desktop/TV optimiert
Logo: /frontend/public/logo.jpeg einbinden wo sinnvoll

---

## AGENT TEAM PROMPT (direkt in Claude Code eingeben)

```
Lies die CLAUDE.md und diese FEATURE_SPEC_V2.md vollständig.

Erstelle ein Agent Team für die Erweiterung des bestehenden DartEvent Managers.
Der bestehende Code in /backend und /frontend darf NICHT gelöscht werden.

Team-Struktur:

Teammate "db-migration":
- Erweitert backend/src/db/schema.sql um alle neuen Tabellen
- Aktualisiert backend/src/db/db.js für automatische Migration
- Arbeitet NUR in backend/src/db/
- Muss als ERSTES fertig sein (alle anderen warten auf diesen Task)

Teammate "backend-users-boards":
- Erstellt backend/src/routes/users.js (User-Verwaltung, Rollen)
- Erstellt backend/src/routes/boards.js (Scheiben, Scheduling)
- Erweitert backend/src/middleware/auth.js (Rollen-Middleware)
- Arbeitet in backend/src/routes/ und backend/src/middleware/
- Wartet auf db-migration

Teammate "backend-game-gastro":
- Erweitert backend/src/routes/games.js (Schiedsrichter-Segmente, Undo, Live)
- Erweitert backend/src/routes/orders.js (Settlement, Dashboard)
- Erweitert backend/src/routes/tournaments.js (Auslosung, Lock)
- Erstellt backend/src/routes/mail.js (Mailing-Vorbereitung mit nodemailer)
- Wartet auf db-migration

Teammate "frontend-public":
- Überarbeitet src/pages/HomePage.jsx (öffentliche Turnier-Info)
- Erstellt src/pages/CurrentGameView.jsx (Board-Ansicht, read-only)
- Aktualisiert src/App.jsx (neue Routen)
- Wartet auf backend-users-boards und backend-game-gastro

Teammate "frontend-referee-admin":
- Erstellt src/pages/RefereePage.jsx (Schiedsrichter-Eingabe)
- Erweitert src/pages/AdminPage.jsx (neue Tabs: Users, Boards, Mailing)
- Erweitert src/pages/GastronomyPage.jsx (iPad-Kassen-Ansicht)
- Wartet auf frontend-public

Alle Teammates:
- Verwenden ausschließlich die Design Tokens aus CLAUDE.md
- Schrift: Verdana, Geneva, sans-serif
- Touch-Targets minimum 64px
- Kommentieren jeden neuen Codeblock mit // NEU: [Beschreibung]
- Melden sich beim Lead wenn sie fertig sind
```
