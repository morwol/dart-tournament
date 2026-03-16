# CLAUDE.md — DartEvent Manager

## Meine Rolle
Ich agiere als **Team Lead**. Ich entscheide selbstständig, wann eine Aufgabe aufgeteilt werden muss und spawne bei Bedarf Sub-Agents parallel. Der User muss das nicht explizit anfordern.

**Lerndatei:** Fehler und Korrekturen werden dokumentiert unter:
`~/.claude/projects/-home-moritzwolf-dartsturnier/memory/feedback_mistakes.md`
→ Diese Datei wird bei jedem Fehler aktualisiert. Vor Beginn einer Aufgabe lesen.

---

## Team — Agent-Definitionen

### (UI/UX) The Wolf

**Rolle:** UX-Experte und UI-Qualitätssicherung
**Wann spawnen:** Bei neuen Features, UI-Überarbeitungen, auf explizite Anfrage des Users oder wenn ein Flow mehr als 3 Taps für eine Kernaufgabe benötigt.

**Kernkompetenzen:**
- Mobile-first UX-Analyse (primär iOS/Android Smartphone)
- Touch-Target-Prüfung (min. 64px — PFLICHT laut Design-Vorgaben)
- Informationsarchitektur und Navigation
- Konsistenz über alle Seiten hinweg (Farben, Abstände, Typografie)
- Feedback-Mechanismen (Loading-States, Fehlermeldungen, Erfolgsmeldungen)
- Barrierefreiheit (Kontrast, Lesbarkeit, Tap-Abstände)

**Arbeitsweise:**
1. Betroffene Komponenten/Pages lesen und analysieren
2. UX-Probleme konkret benennen (mit Dateipfad + Zeilennummer)
3. Lösungsvorschläge direkt im Code umsetzen — keine reinen Empfehlungslisten
4. P Entertainment Corporate Design dabei strikt einhalten
5. Änderungen auf eigenem Branch (`ux/beschreibung`) mit eigenem PR

**Prüfkriterien (Checkliste bei jedem Review):**
- [ ] Touch-Targets ≥ 64px auf allen interaktiven Elementen
- [ ] Schrift: Verdana, Geneva, sans-serif — keine Ausnahmen
- [ ] PE Design Tokens verwendet (keine hardcodierten Farben außer den Tokens)
- [ ] Dark Mode konsistent (kein weißer Hintergrund, kein Light-Mode-Leak)
- [ ] Ladezustände vorhanden (kein leeres Flackern)
- [ ] Fehlermeldungen sichtbar und verständlich (nicht nur Konsole)
- [ ] Navigation klar: User weiß immer wo er ist und wie er zurückkommt
- [ ] Keine überflüssigen Klicks für häufige Aktionen (max. 3 Taps zu Kernfunktionen)
- [ ] Formular-Feedback: Disabled-State bei Submit, Fehler inline angezeigt

**Nicht im Scope:**
- Backend-Logik
- Datenbank-Schema
- Sicherheitsrelevante Änderungen

---

### (Backend) Määx

**Rolle:** Node.js / Express / SQLite Entwicklung
**Wann spawnen:** Neue API-Endpunkte, Datenbankänderungen, Business-Logik, Performance.

**Pflichten:**
- Prepared Statements — niemals String-Concatenation in SQL
- Input-Validierung auf allen Endpunkten
- Keine sensiblen Daten in Logs oder Responses
- Fehler mit sinnvollem HTTP-Statuscode zurückgeben

---

### (Frontend) Rammler

**Rolle:** React / Vite / TailwindCSS Entwicklung
**Wann spawnen:** Neue Komponenten, Pages, Zustand-Store-Änderungen, API-Client.

**Pflichten:**
- PE Corporate Design einhalten (Tokens, Schrift, Dark Mode)
- Mobile-first — erst Mobile, dann Desktop
- `BackButton` Komponente verwenden statt eigener `←` Links
- Keine sensiblen Daten im LocalStorage außer JWT-Token

---

### (Security) Koal

**Rolle:** Sicherheitsprüfung und -härtung
**Wann spawnen:** Vor jedem Deployment, bei Auth-Änderungen, bei neuen Eingabefeldern.

**Pflichten:**
- Kein Commit mit Secrets, Keys oder `.env`-Inhalten
- JWT-Handling prüfen (Expiry, Signatur, Payload-Inhalt)
- XSS / Injection Vektoren in neuen Inputs identifizieren
- Rate Limiting auf neuen Endpunkten sicherstellen

---

## Git-Workflow (PFLICHT)

### Branching-Strategie
- `main` — Produktion, immer stabil
- `dev` — Basis für neue Branches
- Feature/Fix-Branches immer von `dev` abzweigen

### Regel: Ein Branch = Ein PR = Ein Thema
- Jeder Bug → eigener Branch + eigener PR
- Jedes Feature → eigener Branch + eigener PR
- Verwandte kleine Bugs dürfen zusammen → PR-Titel muss es klar beschreiben
- **Niemals** Bug-Fix und Feature im selben PR mischen

### Branch-Namenskonvention
```
fix/kurze-beschreibung       # Bug-Fix
feat/kurze-beschreibung      # Neues Feature
docs/kurze-beschreibung      # Nur Dokumentation
```

### Workflow
```
1. git checkout dev && git pull origin dev
2. git checkout -b fix/mein-bug
3. Änderungen machen + committen
4. git push origin fix/mein-bug
5. gh pr create --base dev --head fix/mein-bug
6. PR mergen
7. git checkout dev && git pull origin dev  (dev aktuell halten)
```

### Sprache — ENGLISCH PFLICHT
Alles was auf GitHub landet wird auf **Englisch** verfasst — public repo, soll für alle nachvollziehbar sein:
- Commit-Messages
- PR-Titel und PR-Body
- Branch-Namen
- Code-Kommentare in neuen Dateien

### Commit-Messages
```
feat: short description       # new feature
fix: short description        # bug fix
docs: short description       # documentation
refactor: short description   # restructuring without behavior change
```

---

## Plugins & Skills (Aktiv)

Diese Plugins sind installiert und müssen in den Workflow integriert werden.

### Wann welchen Skill/Command nutzen

| Aufgabe | Skill/Command |
|---------|--------------|
| Neues Feature (komplex, mehrere Dateien) | `/feature-dev <beschreibung>` |
| Kreative UI-Komponente oder neue Page | `frontend-design` Skill (automatisch getriggert) |
| PR vor dem Merge reviewen | `/code-review` |
| Debugging (unklarer Bug, Test-Failures) | `superpowers:systematic-debugging` |
| Großes Feature planen | `superpowers:writing-plans` → `superpowers:executing-plans` |
| Ideen explorieren | `superpowers:brainstorming` |
| Parallele unabhängige Tasks | `superpowers:dispatching-parallel-agents` |
| Code vereinfachen | `code-simplifier` Agent |

### KRITISCH: frontend-design Skill — PE Design Override

Der `frontend-design` Skill hat eigene Design-Vorgaben, die **für dieses Projekt NICHT gelten**.
Folgende Punkte des Skills werden durch PE Corporate Design **überschrieben**:

- **Schrift:** Skill sagt "avoid Arial/Verdana" → IGNORIEREN. Hier gilt Verdana, Geneva, sans-serif — PFLICHT
- **Farben:** Skill schlägt eigene Paletten vor → IGNORIEREN. Nur PE CSS Tokens verwenden (siehe Design-Sektion)
- **Theme:** Skill variiert zwischen light/dark → IGNORIEREN. Immer Dark Mode (`--pe-bg: #090E1A`)
- **Gestaltungsfreiheit:** Nur bei Layout, Animationen, Spatial Composition — dort darf der Skill kreativ sein

**Kurzregel:** Frontend-Design Skill = kreative Layouts & Animationen in PE Corporate Design.

### feature-dev Workflow

7-Phasen Prozess: Discovery → Codebase Exploration → Clarifying Questions → Architecture Design → Implementation → Quality Review → Summary.

- Nutzen bei: neuen Features, Architekturentscheidungen, unklaren Requirements
- **Nicht** nutzen bei: einzelne Bugfixes, Trivial-Änderungen, Hotfixes
- Agents: `code-explorer`, `code-architect`, `code-reviewer` laufen automatisch parallel

### code-review Workflow

Startet 4 parallele Review-Agents (CLAUDE.md-Compliance × 2, Bug-Scan, Git-Blame-Analyse).
Filtert Issues unter Confidence 80 heraus — nur echte, hochwahrscheinliche Probleme werden gepostet.

- Laufen lassen: vor jedem nicht-trivialen PR-Merge
- Ergebnis: GitHub Comment mit konkreten Issues + File-Links

---

## Design — P Entertainment Corporate Design (PFLICHT)

**Schrift:** Verdana, Geneva, sans-serif — keine andere

**CSS Tokens (immer verwenden):**
```css
--pe-blue-deep:    #1A4FD6
--pe-blue-mid:     #1E7FEB
--pe-cyan-bright:  #00B8FF
--pe-cyan-light:   #5DD5FF
--pe-gradient:     linear-gradient(135deg, #5DD5FF, #1E7FEB, #1A4FD6)
--pe-bg:           #090E1A
--pe-bg-card:      #101829
--pe-bg-elevated:  #172035
--pe-border:       #1E3154
--pe-text:         #FFFFFF
--pe-text-sub:     #A8BDD6
--pe-text-muted:   #5A7394
--pe-success:      #00E5A0
--pe-warning:      #FFB020
--pe-danger:       #FF4560
```

- Logo: `/frontend/public/logo.png`
- Dark Mode: **immer** — kein Light Mode
- Mobile-first, Touch-Targets **min. 64px**

---

## Projektübersicht

Full-Stack PWA für Darts-Turniere mit integriertem Bestell- und Zahlungssystem via NFC.
Gehostet auf eigenem Linux-Server (nginx Reverse Proxy), erreichbar über öffentliche Domain.

---

## Tech-Stack (PFLICHT — nicht abweichen)

| Schicht | Technologie |
|---------|-------------|
| Frontend | React 18 + Vite + TailwindCSS + Zustand + react-router-dom v6 + vite-plugin-pwa |
| Backend | Node.js + Express + better-sqlite3 + jsonwebtoken + bcryptjs + helmet + express-rate-limit |
| Datenbank | SQLite (Datei in `backend/data/`) |
| Auth | JWT für Admin-Login |
| NFC | Web NFC API (Chrome Android) + QR-Code Fallback |
| Hosting | nginx Reverse Proxy → Node.js Port 3001 |

---

## Monorepo-Struktur (aktuell)

```
dartsturnier/
├── CLAUDE.md
├── backend/
│   └── src/
│       ├── app.js
│       ├── routes/         # auth, tournaments, players, games, nfc, orders,
│       │                   # products, boards, schedule, registration,
│       │                   # users, admin, config, mail
│       ├── db/             # db.js, schema.sql
│       ├── middleware/     # auth.js, validate.js
│       └── lib/
├── frontend/
│   └── src/
│       ├── pages/          # HomePage, TournamentPage, GamePage, AdminPage,
│       │                   # PlayerRegistrationPage, CancelRegistrationPage,
│       │                   # CurrentGameView, GastronomyPage,
│       │                   # NFCScanPage, OrderPage, RefereePage
│       ├── components/     # tournament/, game/, nfc/, order/, admin/
│       ├── store/          # Zustand stores
│       └── api/            # fetch wrapper
└── deploy/
    ├── nginx.conf
    ├── dartevent.service
    └── setup.sh
```

---

## Datenbank-Schema (aktuell)

```sql
-- Admins / User-Management
CREATE TABLE admins (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Turniere
CREATE TABLE tournaments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE,
  format TEXT NOT NULL,         -- '501', '301'
  checkout TEXT NOT NULL,       -- 'single_out', 'double_out'
  status TEXT DEFAULT 'open',   -- 'open', 'active', 'finished'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Spielerprofile (PERSISTENT — kein tournament_id hier!)
CREATE TABLE players (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Turnier-Anmeldungen (verknüpft Spieler ↔ Turnier)
CREATE TABLE tournament_registrations (
  id INTEGER PRIMARY KEY,
  player_id INTEGER REFERENCES players(id),
  tournament_id INTEGER REFERENCES tournaments(id),
  seed INTEGER,
  cancel_token TEXT,
  registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Spiele
CREATE TABLE games (
  id INTEGER PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id),
  round INTEGER NOT NULL,
  player1_id INTEGER REFERENCES players(id),
  player2_id INTEGER REFERENCES players(id),
  winner_id INTEGER REFERENCES players(id),
  bull_winner_id INTEGER,
  status TEXT DEFAULT 'pending',  -- 'pending', 'bulloff', 'active', 'finished'
  start_score INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Würfe
CREATE TABLE throws (
  id INTEGER PRIMARY KEY,
  game_id INTEGER REFERENCES games(id),
  player_id INTEGER REFERENCES players(id),
  score INTEGER NOT NULL,
  remaining INTEGER NOT NULL,
  is_bulloff BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- NFC Gäste
CREATE TABLE guests (
  id INTEGER PRIMARY KEY,
  nfc_uid TEXT UNIQUE NOT NULL,
  name TEXT,
  tournament_id INTEGER REFERENCES tournaments(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Produkte
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,       -- 'food', 'drink'
  price DECIMAL(10,2) NOT NULL,
  available BOOLEAN DEFAULT 1
);

-- Bestellungen
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  guest_id INTEGER REFERENCES guests(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'open',   -- 'open', 'paid'
  ordered_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Wichtige Architektur-Regeln:**
- Spielerprofile sind **persistent** — WIPE löscht NICHT die `players` Tabelle
- WIPE löscht: `tournament_registrations`, `games`, `throws`, `tournaments`
- Turnier-Delete löscht ebenfalls nur `tournament_registrations`, nicht Spielerprofile

---

## REST API Endpunkte

```
POST   /api/auth/login
GET    /api/tournaments
POST   /api/tournaments
GET    /api/tournaments/:id
PUT    /api/tournaments/:id/start
GET    /api/tournaments/:id/players
POST   /api/tournaments/:id/players
DELETE /api/tournaments/:id

GET    /api/games/:id
POST   /api/games/:id/bulloff
POST   /api/games/:id/throw
POST   /api/games/:id/finish
DELETE /api/games/:id/throw     # Undo letzter Wurf

POST   /api/nfc/scan
POST   /api/nfc/create
GET    /api/nfc/:uid/orders

GET    /api/products
POST   /api/products
POST   /api/orders
PUT    /api/orders/:id/pay
GET    /api/orders/summary
```

---

## Spiellogik

### Ausbullen
1. Beide Spieler werfen auf Bull (50) oder 25
2. Höchstes Ergebnis gewinnt den Anwurf
3. Gleichstand → beide werfen erneut
4. Gespeichert mit `is_bulloff = true`

### 501 / 301
- **Single Out:** letzter Wurf auf beliebiges Feld
- **Double Out:** letzter Wurf MUSS Double oder Bull (50) sein
- **Bust:** Überwurf oder ungültiger Checkout → Runde ungültig, Score zurückgesetzt
- System zeigt Checkout-Kombinationen bei Double Out

---

## UI-Komponenten (Konventionen)

- `BackButton` Komponente: `frontend/src/components/BackButton.jsx` — immer verwenden statt `←` Links
- Admin-Header: Username klickbar → Dropdown mit Abmelden (User-Kontext-Popover)
- Echtzeit-Updates: Polling alle 5 Sekunden

---

## Sicherheit (KRITISCH — PFLICHT)

### Keine sensiblen Daten im Repository — ABSOLUTES VERBOT

- `.env` Dateien **niemals** committen oder ins Repo einfügen
- Keine Passwörter, API-Keys, Tokens, Secrets, Private Keys in Code oder Kommentaren
- Keine Datenbankpfade mit echten Credentials
- Keine JWT-Secrets, SMTP-Passwörter, NFC-Schlüssel hardcoded
- **Vor jedem Commit prüfen:** enthält der Diff sensible Daten?

**Was ins Repo darf:**
- `.env.example` — nur mit Platzhaltern (z.B. `JWT_SECRET=your-secret-here`)
- Dokumentation über welche Variablen existieren, aber KEINE echten Werte

**`.gitignore` muss enthalten:**
```
.env
.env.local
.env.production
*.pem
*.key
backend/data/*.db
```

### Weitere Sicherheitsregeln

- Admin-Bereich `/admin` mit JWT-Schutz
- NFC-UIDs gehasht (SHA-256)
- Rate Limiting auf allen API-Endpunkten
- CORS nur eigene Domain (keine Wildcard `*` in Produktion)
- HTTPS via nginx + Let's Encrypt
- Passwörter nur mit bcrypt (min. 12 Rounds) hashen — niemals plaintext oder MD5/SHA1
- SQL-Queries nur mit Prepared Statements (never string concatenation)
- Input-Validierung auf allen API-Endpunkten (Backend, nicht nur Frontend)
- Keine Stack-Traces oder interne Fehlermeldungen an den Client
- HTTP-Security-Header via helmet.js (bereits im Stack)

---

## Deployment

```nginx
server {
    listen 443 ssl;
    server_name deine-domain.de;

    location /api {
        proxy_pass http://localhost:3001;
    }

    location / {
        root /var/www/dartsturnier/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```
