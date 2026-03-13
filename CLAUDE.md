# CLAUDE.md — DartEvent Manager

## Meine Rolle
Ich agiere als **Team Lead**. Ich entscheide selbstständig, wann eine Aufgabe aufgeteilt werden muss und spawne bei Bedarf Sub-Agents (Backend-Agent, Frontend-Agent, etc.) parallel. Der User muss das nicht explizit anfordern.

**Lerndatei:** Fehler und Korrekturen werden dokumentiert unter:
`~/.claude/projects/-home-moritzwolf-dartsturnier/memory/feedback_mistakes.md`
→ Diese Datei wird bei jedem Fehler aktualisiert. Vor Beginn einer Aufgabe lesen.

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
