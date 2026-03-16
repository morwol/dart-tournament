# DartEvent Manager — API Contract

Dieser Vertrag ist die einzige Quelle der Wahrheit für alle Agents.
Backend implementiert exakt diese Endpunkte. Frontend konsumiert exakt diese Endpunkte.

---

## Base URL

Development: `http://localhost:3001/api`
Production:  `https://<domain>/api`

---

## Auth

Alle Endpunkte außer `POST /auth/login` und `GET /tournaments` (public) benötigen:
```
Authorization: Bearer <jwt-token>
```

JWT Payload:
```js
/** @typedef {{ id: number, username: string, role: 'admin' | 'user' }} JWTPayload */
```

---

## Shared Types (JSDoc)

```js
/**
 * @typedef {Object} Tournament
 * @property {number} id
 * @property {string} name
 * @property {string} date            - ISO date string (YYYY-MM-DD)
 * @property {'501'|'301'} format
 * @property {'single_out'|'double_out'} checkout
 * @property {'open'|'active'|'finished'} status
 * @property {string} created_at
 */

/**
 * @typedef {Object} Player
 * @property {number} id
 * @property {string} name
 * @property {string} created_at
 */

/**
 * @typedef {Object} Registration
 * @property {number} id
 * @property {number} player_id
 * @property {number} tournament_id
 * @property {number|null} seed
 * @property {string} cancel_token
 * @property {string} registered_at
 */

/**
 * @typedef {Object} Game
 * @property {number} id
 * @property {number} tournament_id
 * @property {number} round
 * @property {number} player1_id
 * @property {number} player2_id
 * @property {number|null} winner_id
 * @property {number|null} bull_winner_id
 * @property {'pending'|'bulloff'|'active'|'finished'} status
 * @property {number} start_score
 * @property {string} created_at
 */

/**
 * @typedef {Object} Throw
 * @property {number} id
 * @property {number} game_id
 * @property {number} player_id
 * @property {number} score
 * @property {number} remaining
 * @property {boolean} is_bulloff
 * @property {string} created_at
 */

/**
 * @typedef {Object} Guest
 * @property {number} id
 * @property {string} nfc_uid        - SHA-256 hashed
 * @property {string|null} name
 * @property {number} tournament_id
 * @property {string} created_at
 */

/**
 * @typedef {Object} Product
 * @property {number} id
 * @property {string} name
 * @property {'food'|'drink'} category
 * @property {number} price           - decimal, e.g. 3.50
 * @property {boolean} available
 */

/**
 * @typedef {Object} Order
 * @property {number} id
 * @property {number} guest_id
 * @property {number} product_id
 * @property {number} quantity
 * @property {'open'|'paid'} status
 * @property {string} ordered_at
 */

/**
 * @typedef {Object} ApiError
 * @property {string} error           - human readable message
 * @property {string} [field]         - field name if validation error
 */

/**
 * @typedef {Object} ApiSuccess
 * @property {string} message
 */
```

---

## Endpoints

### Auth

#### POST /auth/login
Request:
```json
{ "username": "string", "password": "string" }
```
Response 200:
```json
{ "token": "string", "user": { "id": 1, "username": "admin", "role": "admin" } }
```
Response 401: `ApiError`

---

### Tournaments

#### GET /tournaments
Auth: optional (public read)
Response 200: `Tournament[]`

#### POST /tournaments
Auth: required
Request:
```json
{
  "name": "string",
  "date": "YYYY-MM-DD",
  "format": "501|301",
  "checkout": "single_out|double_out"
}
```
Response 201: `Tournament`

#### GET /tournaments/:id
Auth: optional
Response 200:
```json
{
  "tournament": "Tournament",
  "players": "Player[]",
  "games": "Game[]"
}
```

#### PUT /tournaments/:id/start
Auth: required
Response 200: `{ "tournament": Tournament, "games": Game[] }`

#### DELETE /tournaments/:id
Auth: required
Response 200: `ApiSuccess`
Note: Löscht nur tournament_registrations + games + throws. NICHT players.

---

### Players & Registration

#### GET /tournaments/:id/players
Response 200: `Player[]`

#### POST /tournaments/:id/players
Auth: optional (self-registration)
Request:
```json
{ "name": "string" }
```
Response 201:
```json
{ "player": "Player", "registration": "Registration", "cancel_token": "string" }
```

#### DELETE /tournaments/:id/players/:cancel_token
Auth: optional (cancel via token)
Response 200: `ApiSuccess`

---

### Games

#### GET /games/:id
Response 200:
```json
{
  "game": "Game",
  "throws": "Throw[]",
  "player1": "Player",
  "player2": "Player",
  "scores": { "player1": 501, "player2": 501 },
  "currentPlayer": "number"
}
```

#### POST /games/:id/bulloff
Request:
```json
{ "player_id": "number", "score": "number (25 or 50)" }
```
Response 200: `{ "throw": Throw, "game": Game }`

#### POST /games/:id/throw
Request:
```json
{ "player_id": "number", "score": "number (0-180)" }
```
Response 200:
```json
{
  "throw": "Throw",
  "game": "Game",
  "bust": false,
  "checkout": false,
  "suggestions": "string[]"
}
```

#### DELETE /games/:id/throw
Auth: required (undo)
Response 200: `{ "game": Game, "throws": Throw[] }`

#### POST /games/:id/finish
Auth: required
Request: `{ "winner_id": "number" }`
Response 200: `{ "game": Game, "nextGame": Game | null }`

---

### NFC / Gastro

#### POST /nfc/scan
Request: `{ "nfc_uid": "string" }`
Response 200: `{ "guest": Guest, "orders": Order[] }`
Response 404: `ApiError` (kein Gast bekannt)

#### POST /nfc/create
Request: `{ "nfc_uid": "string", "name": "string", "tournament_id": "number" }`
Response 201: `{ "guest": Guest }`

#### GET /nfc/:uid/orders
Response 200: `{ "guest": Guest, "orders": Order[], "total": number }`

#### GET /products
Response 200: `Product[]`

#### POST /products
Auth: required
Request: `{ "name": "string", "category": "food|drink", "price": "number" }`
Response 201: `Product`

#### POST /orders
Request: `{ "guest_id": "number", "product_id": "number", "quantity": "number" }`
Response 201: `Order`

#### PUT /orders/:id/pay
Auth: required
Response 200: `{ "order": Order }`

#### GET /orders/summary
Auth: required
Response 200:
```json
{
  "open": "Order[]",
  "total_revenue": "number",
  "by_product": [{ "product": "Product", "quantity": "number", "revenue": "number" }]
}
```

---

## DB Schema

```sql
CREATE TABLE admins (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,       -- bcrypt, min 12 rounds
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tournaments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE,
  format TEXT NOT NULL,              -- '501', '301'
  checkout TEXT NOT NULL,            -- 'single_out', 'double_out'
  status TEXT DEFAULT 'open',        -- 'open', 'active', 'finished'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE players (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  -- PERSISTENT: kein tournament_id hier!
);

CREATE TABLE tournament_registrations (
  id INTEGER PRIMARY KEY,
  player_id INTEGER REFERENCES players(id),
  tournament_id INTEGER REFERENCES tournaments(id),
  seed INTEGER,
  cancel_token TEXT UNIQUE,
  registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE games (
  id INTEGER PRIMARY KEY,
  tournament_id INTEGER REFERENCES tournaments(id),
  round INTEGER NOT NULL,
  player1_id INTEGER REFERENCES players(id),
  player2_id INTEGER REFERENCES players(id),
  winner_id INTEGER REFERENCES players(id),
  bull_winner_id INTEGER,
  status TEXT DEFAULT 'pending',     -- 'pending', 'bulloff', 'active', 'finished'
  start_score INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE throws (
  id INTEGER PRIMARY KEY,
  game_id INTEGER REFERENCES games(id),
  player_id INTEGER REFERENCES players(id),
  score INTEGER NOT NULL,
  remaining INTEGER NOT NULL,
  is_bulloff BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE guests (
  id INTEGER PRIMARY KEY,
  nfc_uid TEXT UNIQUE NOT NULL,      -- SHA-256 hashed
  name TEXT,
  tournament_id INTEGER REFERENCES tournaments(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,            -- 'food', 'drink'
  price DECIMAL(10,2) NOT NULL,
  available BOOLEAN DEFAULT 1
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  guest_id INTEGER REFERENCES guests(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'open',        -- 'open', 'paid'
  ordered_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Game Logic Rules

### Bulloff
- Gültige Werte: 25, 50
- Höchster Wert gewinnt den Anwurf
- Gleichstand → beide werfen erneut

### Scoring (501/301)
- Max Wurf: 180
- Gültige Felder: 1-20 (single/double/triple), 25, 50
- Bust: Überwurf, oder verbleibender Score = 1, oder Double-Out ohne Double/Bull
- Bei Bust: Runde ungültig, Score zurückgesetzt

### Checkout Suggestions (Double Out)
- Nur anzeigen wenn remaining ≤ 170
- Immer auf Double oder Bull (50) enden
- Max 3 Darts berücksichtigen
