# CLAUDE.md — Dartsturnier App (DartEvent Manager)

## Design-Vorgaben — P Entertainment Corporate Design

Schrift: Verdana, Geneva, sans-serif (PFLICHT, keine andere)

CSS Design Tokens (IMMER verwenden):
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

Logo: /frontend/public/logo.png (wird vom User bereitgestellt)
Dark Mode: immer — kein Light Mode
Mobile-first: Touch-Targets minimum 64px

## Projektübersicht

Full-Stack Web-App für Darts-Turniere mit integriertem Bestell- und Zahlungssystem via NFC.
Gehostet auf eigenem Linux-Server, erreichbar über öffentliche Domain.
Mobile-first PWA (Progressive Web App) — aufrufbar im Browser auf Windows, iOS, Android.

---

## Tech-Stack (PFLICHT — nicht abweichen)

```
Frontend:   React 18 + Vite + TailwindCSS
Backend:    Node.js + Express + REST API
Datenbank:  SQLite (via better-sqlite3) — später migrierbar zu PostgreSQL
Auth:       JWT (JSON Web Tokens) für Admin-Login
NFC:        Web NFC API (Chrome Android) + QR-Code Fallback
PWA:        Vite PWA Plugin + manifest.json + Service Worker
Hosting:    nginx Reverse Proxy → Node.js Backend auf Port 3001
```

---

## Monorepo-Struktur

```
dartsturnier/
├── CLAUDE.md
├── frontend/                  # React PWA
│   ├── src/
│   │   ├── components/
│   │   │   ├── tournament/    # Bracket, Spielplan, Ergebnisse
│   │   │   ├── player/        # Spielerverwaltung, Anmeldung
│   │   │   ├── game/          # 501/301, Ausbullen, Scoring
│   │   │   ├── nfc/           # NFC-Scan, Bestellansicht
│   │   │   ├── order/         # Speise & Getränke, Warenkorb
│   │   │   └── admin/         # Admin Dashboard
│   │   ├── pages/
│   │   ├── store/             # Zustand (Zustand oder Context API)
│   │   ├── api/               # API-Client (fetch wrapper)
│   │   └── main.jsx
│   ├── public/
│   │   └── manifest.json
│   └── vite.config.js
│
├── backend/                   # Node.js API Server
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js        # Login, JWT
│   │   │   ├── tournaments.js # CRUD Turniere
│   │   │   ├── players.js     # CRUD Spieler
│   │   │   ├── games.js       # Spiellogik, Scores
│   │   │   ├── nfc.js         # NFC-Codes, Gast-Tokens
│   │   │   └── orders.js      # Bestellungen, Abrechnung
│   │   ├── db/
│   │   │   ├── schema.sql     # Datenbankschema
│   │   │   └── db.js          # SQLite Verbindung
│   │   ├── middleware/
│   │   │   ├── auth.js        # JWT-Middleware
│   │   │   └── validate.js
│   │   └── app.js
│   └── package.json
│
└── deploy/
    ├── nginx.conf             # nginx Konfiguration
    └── setup.sh               # Server-Setup Script
```

---

## Agents & Aufgaben

### Agent 1: BACKEND-AGENT
**Prompt:** "Du bist der Backend-Agent. Erstelle das komplette Node.js Backend gemäß CLAUDE.md."

Aufgaben:
- Express-Server mit allen Routen
- SQLite Datenbankschema und Verbindung
- JWT-Auth für Admin
- Alle REST-API Endpunkte (siehe unten)
- NFC-Code Generierung und Validierung

### Agent 2: FRONTEND-AGENT
**Prompt:** "Du bist der Frontend-Agent. Erstelle das React Frontend gemäß CLAUDE.md."

Aufgaben:
- Vite + React + TailwindCSS Setup
- Alle Seiten und Komponenten
- PWA manifest.json und Service Worker
- API-Client zum Backend
- Mobile-first Responsive Design

### Agent 3: GAME-LOGIC-AGENT
**Prompt:** "Du bist der Game-Logic-Agent. Implementiere die Dart-Spiellogik gemäß CLAUDE.md."

Aufgaben:
- 501 und 301 Spiellogik (Single Out, Double Out)
- Ausbullen-Mechanismus (Bullscheibe-Wurf, höchster gewinnt, Gleichstand = Wiederholung)
- Bracket-Generierung (K.O.-System)
- Punkte-Validierung und Checkout-Berechnung

### Agent 4: DEPLOY-AGENT
**Prompt:** "Du bist der Deploy-Agent. Erstelle alle Deployment-Dateien gemäß CLAUDE.md."

Aufgaben:
- nginx.conf mit Reverse Proxy
- systemd Service für Node.js
- Setup-Script für neuen Server
- Umgebungsvariablen-Vorlage (.env.example)

---

## Datenbank-Schema (SQLite)

```sql
-- Admins
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
  format TEXT NOT NULL,        -- '501', '301'
  checkout TEXT NOT NULL,      -- 'single_out', 'double_out'
  status TEXT DEFAULT 'open',  -- 'open', 'active', 'finished'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Spieler
CREATE TABLE players (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  tournament_id INTEGER REFERENCES tournaments(id),
  seed INTEGER,                -- Setzliste
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
  bull_winner_id INTEGER,      -- Gewinner des Ausbullens
  status TEXT DEFAULT 'pending', -- 'pending', 'bulloff', 'active', 'finished'
  start_score INTEGER,         -- 501 oder 301
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Würfe (Leg-by-Leg)
CREATE TABLE throws (
  id INTEGER PRIMARY KEY,
  game_id INTEGER REFERENCES games(id),
  player_id INTEGER REFERENCES players(id),
  score INTEGER NOT NULL,
  remaining INTEGER NOT NULL,
  is_bulloff BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- NFC Gäste (ein NFC-Tag = ein Gast)
CREATE TABLE guests (
  id INTEGER PRIMARY KEY,
  nfc_uid TEXT UNIQUE NOT NULL,  -- eindeutiger NFC-Code
  name TEXT,
  tournament_id INTEGER REFERENCES tournaments(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Produkte (Speise & Getränke)
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,      -- 'food', 'drink'
  price DECIMAL(10,2) NOT NULL,
  available BOOLEAN DEFAULT 1
);

-- Bestellungen
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  guest_id INTEGER REFERENCES guests(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'open',  -- 'open', 'paid'
  ordered_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## REST API Endpunkte

```
POST   /api/auth/login              → Admin Login, gibt JWT zurück

GET    /api/tournaments             → Alle Turniere
POST   /api/tournaments             → Neues Turnier (Admin)
GET    /api/tournaments/:id         → Turnier Detail + Bracket
PUT    /api/tournaments/:id/start   → Turnier starten (Admin)

GET    /api/tournaments/:id/players → Spielerliste
POST   /api/tournaments/:id/players → Spieler anmelden

GET    /api/games/:id               → Spielstand
POST   /api/games/:id/bulloff       → Ausbullen Ergebnis speichern
POST   /api/games/:id/throw         → Wurf eintragen
POST   /api/games/:id/finish        → Spiel beenden

POST   /api/nfc/scan                → NFC-Code scannen → gibt Gast zurück
POST   /api/nfc/create              → Neuen Gast + NFC-Code anlegen (Admin)
GET    /api/nfc/:uid/orders         → Alle Bestellungen eines Gastes

GET    /api/products                → Produktliste
POST   /api/products                → Produkt anlegen (Admin)
POST   /api/orders                  → Bestellung aufgeben
PUT    /api/orders/:id/pay          → Bestellung als bezahlt markieren (Admin)
GET    /api/orders/summary          → Tagesabrechnung (Admin)
```

---

## Spiellogik: Ausbullen

```
1. Beide Spieler werfen auf die Bullscheibe (Bull = 50, Bull-Eye = 50, 25 = 25)
2. Höchstes Ergebnis gewinnt den Anwurf
3. Bei Gleichstand: Beide werfen erneut
4. Ergebnis wird in der DB gespeichert (is_bulloff = true)
5. Gewinner beginnt das Spiel
```

## Spiellogik: 501 / 301

```
Single Out:  Letzter Wurf kann auf jedes Feld gehen (auch Single)
Double Out:  Letzter Wurf MUSS auf ein Double-Feld (oder Bull = D25)
Bust:        Überwurf oder Single-Out bei Double-Out Pflicht → Runde ungültig
Checkout:    Bei Double Out: System zeigt mögliche Checkout-Kombinationen an
```

---

## Design-Vorgaben

- **Mobile-first** — primär für Smartphone-Nutzung
- **Dark Mode** als Standard (Turnier-Ambiente)
- **Farben:** Dunkelgrau #1a1a2e, Akzent Grün #00d4aa, Weiß für Text
- **Schrift:** System-Font Stack (schnell, kein Google Fonts Laden)
- **Große Touch-Targets** für Score-Eingabe (min. 64px)
- **Echtzeit-Updates:** Polling alle 5 Sekunden oder WebSocket für Live-Bracket

---

## Sicherheit

- Admin-Bereich unter `/admin` mit JWT-Schutz
- NFC-UIDs werden gehasht gespeichert (SHA-256)
- Rate Limiting auf API-Endpunkten
- CORS nur für eigene Domain
- HTTPS über nginx (Let's Encrypt)
- Umgebungsvariablen für alle Secrets (.env)

---

## Deployment (nginx)

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

---

## Start-Reihenfolge für Agents

1. **BACKEND-AGENT** zuerst → Schema + API
2. **GAME-LOGIC-AGENT** parallel oder danach → Spiellogik in Backend integrieren
3. **FRONTEND-AGENT** danach → baut gegen fertiges API
4. **DEPLOY-AGENT** zum Schluss → alles zusammenführen
