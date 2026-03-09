-- Admins
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Turniere
CREATE TABLE IF NOT EXISTS tournaments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE,
  format TEXT NOT NULL,
  checkout TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Spieler (persistente Profile, turnierübergreifend)
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Turnier-Anmeldungen (Spieler ↔ Turnier, Many-to-Many)
CREATE TABLE IF NOT EXISTS tournament_registrations (
  id INTEGER PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id),
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
  seed INTEGER,
  cancel_token TEXT UNIQUE,
  registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(player_id, tournament_id)
);

-- Spiele
CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id),
  round INTEGER NOT NULL,
  player1_id INTEGER REFERENCES players(id),
  player2_id INTEGER REFERENCES players(id),
  winner_id INTEGER REFERENCES players(id),
  bull_winner_id INTEGER,
  status TEXT DEFAULT 'pending',
  start_score INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Wuerfe (Leg-by-Leg)
CREATE TABLE IF NOT EXISTS throws (
  id INTEGER PRIMARY KEY,
  game_id INTEGER REFERENCES games(id),
  player_id INTEGER REFERENCES players(id),
  score INTEGER NOT NULL,
  remaining INTEGER NOT NULL,
  is_bulloff BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- NFC Gaeste (ein NFC-Tag = ein Gast)
CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY,
  nfc_uid TEXT UNIQUE NOT NULL,
  name TEXT,
  tournament_id INTEGER REFERENCES tournaments(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Produkte (Speise & Getraenke)
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  available BOOLEAN DEFAULT 1
);

-- Bestellungen
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  guest_id INTEGER REFERENCES guests(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'open',
  ordered_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- NEU: User-Verwaltung mit Rollen
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'referee',
  email TEXT,
  display_name TEXT,
  created_by INTEGER REFERENCES users(id),
  active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- NEU: Dartscheiben
CREATE TABLE IF NOT EXISTS boards (
  id INTEGER PRIMARY KEY,
  number INTEGER UNIQUE NOT NULL,
  name TEXT,
  active BOOLEAN DEFAULT 1,
  tournament_id INTEGER REFERENCES tournaments(id)
);

-- NEU: Spielplan / Scheduling
CREATE TABLE IF NOT EXISTS schedule (
  id INTEGER PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id),
  game_id INTEGER REFERENCES games(id),
  board_id INTEGER REFERENCES boards(id),
  scheduled_at DATETIME,
  status TEXT DEFAULT 'scheduled',
  skipped_reason TEXT
);

-- NEU: Gruppen-Auslosung
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id),
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_players (
  group_id INTEGER REFERENCES groups(id),
  player_id INTEGER REFERENCES players(id),
  PRIMARY KEY (group_id, player_id)
);

-- NEU: Mailing
CREATE TABLE IF NOT EXISTS mail_templates (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mail_log (
  id INTEGER PRIMARY KEY,
  template_id INTEGER REFERENCES mail_templates(id),
  recipient_email TEXT NOT NULL,
  sent_at DATETIME,
  status TEXT DEFAULT 'pending',
  tournament_id INTEGER REFERENCES tournaments(id)
);

-- NEU: Abrechnung
CREATE TABLE IF NOT EXISTS settlements (
  id INTEGER PRIMARY KEY,
  guest_id INTEGER REFERENCES guests(id),
  total_amount DECIMAL(10,2) NOT NULL,
  settled_by INTEGER REFERENCES users(id),
  settled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  note TEXT
);
