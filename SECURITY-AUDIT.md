# Security Audit — DartEvent Manager

**Auditor:** Koal (Security Agent)
**Date:** 2026-03-16
**Scope:** All backend endpoints in `backend/src/`

---

## Executive Summary

**Critical issues found: 7**
**High issues found: 5**
**Medium issues found: 8**

### Critical Issues
1. **bcrypt rounds too low** — Default admin created with 10 rounds instead of required 12 (`db.js:185`)
2. **User creation uses 10 rounds** — `users.js:44` uses `bcrypt.hash(password, 10)` instead of 12
3. **User update uses 10 rounds** — `users.js:79` uses `bcrypt.hash(password, 10)` instead of 12
4. **CORS wildcard in production** — `app.js:33` uses `cors()` with no origin restriction
5. **POST /orders has no auth** — Anyone can create orders without authentication (`orders.js:8`)
6. **Walk-on command injection** — YouTube URL passed to `spawn('yt-dlp', ...)` without sanitization (`walkon.js:28-33`)
7. **NFC UID in /orders/by-guest response** — `nfc_uid` hash leaked in response (`orders.js:219`)

### High Issues
1. **No JWT_SECRET validation on startup** — Server runs with undefined secret if .env missing
2. **Stack traces leaked to client** — Multiple `catch(err) { res.status(500).json({ error: err.message }) }` across routes
3. **cancel_token exposed in GET /tournaments/:id** — Leaks cancel tokens for all players (`tournaments.js:50,80`)
4. **Manual NFC guest UID not hashed** — `nfc.js:56` stores `MANUAL-*` UID in plain text, not SHA-256
5. **Path traversal in walkon audio** — `walkon_file` from DB used directly as file path (`walkon.js:182`)

---

## Endpoint Assessment

### Auth

| Endpoint | Auth | Input Validation | Injection Risk | Rate Limit | Sensitive Data |
|----------|------|-----------------|----------------|------------|----------------|
| `POST /auth/login` | None (correct) | `requireFields(['username','password'])` — OK | SQL: Safe (prepared) | Login-specific limiter (20/15min) — OK | Response OK (no hash) |
| `GET /auth/me` | `requireAuth` — OK | None needed | None | General API limit | Returns JWT payload — OK |

**Issues:**
- Login limiter is per-IP (20 attempts/15min) — acceptable for event use

### Tournaments

| Endpoint | Auth | Input Validation | Injection Risk | Rate Limit | Sensitive Data |
|----------|------|-----------------|----------------|------------|----------------|
| `GET /tournaments` | None (public) — OK | None needed | SQL: Safe | General | None |
| `POST /tournaments` | `verifyToken` — OK | Format/checkout validated | SQL: Safe (prepared) | General | None |
| `GET /tournaments/:id` | None (public) — OK | ID from params | SQL: Safe | General | **CRITICAL: cancel_token leaked** |
| `GET /tournaments/active` | None (public) — OK | None | SQL: Safe | General | **CRITICAL: cancel_token leaked** |
| `PUT /tournaments/:id` | `verifyToken` — OK | Allowlist of fields — good | **MEDIUM: Dynamic SQL column names from allowlist** — safe because keys are hardcoded | General | None |
| `PUT /tournaments/:id/start` | `verifyToken` — OK | Status check — OK | SQL: Safe | General | None |
| `DELETE /tournaments/:id` | `requireAdmin` — OK | ID validated | SQL: Safe | General | None |
| `POST /tournaments/:id/draw-groups` | `requireAdminOrDirector` — OK | numGroups validated | SQL: Safe | General | None |
| `GET /tournaments/:id/groups` | None (public) — OK | ID from params | SQL: Safe | General | None |
| `PUT /tournaments/:id/groups/:groupId/board` | `requireAdminOrDirector` — OK | Minimal | SQL: Safe | General | None |
| `POST /tournaments/:id/generate-group-schedule` | `requireAdminOrDirector` — OK | Various checks | SQL: Safe | General | None |
| `POST /tournaments/:id/generate-bracket` | `requireAdminOrDirector` — OK | Various checks | SQL: Safe | General | None |
| `PUT /tournaments/:id/lock` | `requireAdminOrDirector` — OK | ID check | SQL: Safe | General | None |
| `POST /tournaments/:id/reset` | `requireAdmin` — OK | ID check | SQL: Safe | General | None |
| `POST /tournaments/:id/mock` | `requireAdmin` — OK | count validated | SQL: Safe | General | None |

### Players & Registration

| Endpoint | Auth | Input Validation | Injection Risk | Rate Limit | Sensitive Data |
|----------|------|-----------------|----------------|------------|----------------|
| `GET /tournaments/:id/players` | None (public) — OK | ID from params | SQL: Safe | General | cancel_token exposed |
| `POST /tournaments/:id/players` | None (self-reg) — OK | `requireFields`, trim, dup check | SQL: Safe | General | Returns cancel_token (intended) |
| `PUT /tournaments/:id/players/:playerId` | `requireAdminOrDirector` — OK | Trim, empty check | SQL: Safe | General | None |
| `DELETE /tournaments/:id/players/:playerId` | `requireAdminOrDirector` — OK | Status check | SQL: Safe | General | None |
| `GET /players` | None (public) — OK | None | SQL: Safe | General | None |
| `GET /players/:id/profile` | None (public) — OK | ID from params | SQL: Safe | General | None |

**Issues:**
- `cancel_token` in GET endpoints allows anyone to cancel any player's registration
- Self-registration has no rate limiting beyond general API limit — could be abused for spam registrations

### Games

| Endpoint | Auth | Input Validation | Injection Risk | Rate Limit | Sensitive Data |
|----------|------|-----------------|----------------|------------|----------------|
| `GET /games` | None — OK | Query params for filter | **MEDIUM: Dynamic WHERE clause** — safe (params used in prepared stmt) | General | None |
| `GET /games/:id` | None — OK | ID from params | SQL: Safe | General | None |
| `POST /games/:id/bulloff` | `verifyToken` — OK | Score validated (0/25/50) | SQL: Safe | General | None |
| `POST /games/:id/throw` | `verifyToken` — OK | Score 0-180, player check, turn check | SQL: Safe | General | None |
| `POST /games/:id/throw-segment` | `requireAuth` — OK | Segment parsed + validated | SQL: Safe | General | None |
| `DELETE /games/:id/throw/:throwId` | `requireAuth` — OK | ID check, 9-throw limit | SQL: Safe | General | None |
| `POST /games/:id/finish` | `verifyToken` — OK | winner_id validated | SQL: Safe | General | None |
| `GET /games/:id/live` | None (public) — OK | ID from params | SQL: Safe | General | None |
| `PUT /games/:id/assign-board` | `requireAuth` — OK | Board existence + tournament match | SQL: Safe | General | None |
| `DELETE /games/:id/assign-board` | `requireAuth` — OK | ID from params | SQL: Safe | General | None |
| `POST /games/:id/skip` | `requireAuth` — OK | Status check | SQL: Safe | General | None |
| `POST /games/:id/reset` | `requireAuth` — OK | Status check | SQL: Safe | General | None |

### NFC / Guests

| Endpoint | Auth | Input Validation | Injection Risk | Rate Limit | Sensitive Data |
|----------|------|-----------------|----------------|------------|----------------|
| `POST /nfc/scan` | None — **REVIEW** | `requireFields(['uid'])` | SQL: Safe, UID hashed — good | General | Guest data returned |
| `POST /nfc/create` | `verifyToken` — OK | `requireFields(['uid','name'])` | SQL: Safe, UID hashed | General | None |
| `GET /nfc/guests` | `requireAny(['admin','gastronomy'])` — OK | None | SQL: Safe | General | **nfc_uid hashes exposed** |
| `POST /nfc/create-manual` | `requireAny(['admin','gastronomy'])` — OK | `requireFields(['name'])` | SQL: Safe | General | **UID not hashed** |
| `PUT /nfc/:uid/deactivate` | `requireAny(['admin','gastronomy'])` — OK | UID hashed | SQL: Safe | General | None |
| `PUT /nfc/:uid/activate` | `requireAny(['admin','gastronomy'])` — OK | UID hashed | SQL: Safe | General | None |
| `GET /nfc/:uid/statement` | None (public) — **RISK** | UID hashed | SQL: Safe | General | Order history exposed if UID known |
| `GET /nfc/:uid/orders` | None — **RISK** | UID hashed | SQL: Safe | General | Full order data if UID known |

**Issues:**
- `POST /nfc/scan` has no auth — acceptable for NFC terminal use, but should have stricter rate limiting
- `POST /nfc/create-manual` stores UID in plain text (`MANUAL-*` prefix) instead of SHA-256 hash
- `/nfc/:uid/statement` and `/nfc/:uid/orders` are public — UID acts as authentication token, which is OK for the NFC self-service use case

### Orders

| Endpoint | Auth | Input Validation | Injection Risk | Rate Limit | Sensitive Data |
|----------|------|-----------------|----------------|------------|----------------|
| `POST /orders` | **NONE — CRITICAL** | product_id required, qty validated | SQL: Safe | General | None |
| `PUT /orders/:id/pay` | `verifyToken` — OK | ID from params | SQL: Safe | General | None |
| `GET /orders/summary` | `verifyToken` — OK | None | SQL: Safe | General | Revenue data (auth-gated) |
| `POST /orders/settle/:guestId` | `requireAuth` — OK | guestId parsed | SQL: Safe | General | None |
| `GET /orders/dashboard` | `requireAuth` — OK | None | SQL: Safe | General | Revenue data (auth-gated) |
| `GET /orders/guest/:guestId` | `requireAuth` — OK | guestId parsed | SQL: Safe | General | None |
| `GET /orders/by-guest` | `requireAuth` — OK | None | SQL: Safe | General | **nfc_uid hash in response** |

**Issues:**
- `POST /orders` has NO authentication — anyone with a guest_id or guest_uid can create orders
- `GET /orders/by-guest` exposes `nfc_uid` hashes

### Products

| Endpoint | Auth | Input Validation | Injection Risk | Rate Limit | Sensitive Data |
|----------|------|-----------------|----------------|------------|----------------|
| `GET /products` | None (public) — OK | None | SQL: Safe | General | None |
| `POST /products` | `requireAuth` — OK | Name/category/price checked | SQL: Safe | General | None |
| `PUT /products/:id` | `requireAuth` — OK | Category validated | **MEDIUM: Dynamic SET clause** — safe (column names hardcoded) | General | None |
| `DELETE /products/:id` | `requireAuth` — OK | Open order check | SQL: Safe | General | None |

**Issues:**
- `POST/PUT/DELETE /products` only require `requireAuth` (any logged-in user) — should be `requireAdmin` or `requireAdminOrDirector`

### Registration (Cancel)

| Endpoint | Auth | Input Validation | Injection Risk | Rate Limit | Sensitive Data |
|----------|------|-----------------|----------------|------------|----------------|
| `GET /registration/cancel/:token` | None (token-based) — OK | Token from params | SQL: Safe | General | Player + tournament info |
| `DELETE /registration/cancel/:token` | None (token-based) — OK | Token + status check | SQL: Safe | General | None |

### Boards

| Endpoint | Auth | Input Validation | Injection Risk | Rate Limit | Sensitive Data |
|----------|------|-----------------|----------------|------------|----------------|
| `GET /boards` | None (public) — OK | Optional tournament_id filter | SQL: Safe | General | None |
| `POST /boards` | `requireAdmin` — OK | Number required, uniqueness check | SQL: Safe | General | None |
| `GET /boards/by-number/:number` | None — OK | Number parsed + validated | SQL: Safe | General | None |
| `GET /boards/:id/current-game` | None — OK | ID from params | SQL: Safe | General | None |
| `GET /boards/:id/next-game` | None — OK | ID validated | SQL: Safe | General | None |
| `GET /boards/:id/available-games` | None — OK | ID validated | SQL: Safe | General | None |
| `DELETE /boards/:id` | `requireAdmin` — OK | Running game check | SQL: Safe | General | None |
| `PUT /boards/:id/final` | `requireAdminOrDirector` — OK | is_final boolean | SQL: Safe | General | None |
| `GET /boards/:id/player-stats/:playerId` | None — OK | IDs from params | SQL: Safe | General | None |

### Users

| Endpoint | Auth | Input Validation | Injection Risk | Rate Limit | Sensitive Data |
|----------|------|-----------------|----------------|------------|----------------|
| `GET /users` | `requireAdmin` — OK | None | SQL: Safe | General | Excludes password_hash — good |
| `POST /users` | `requireAdmin` — OK | Role validated, fields checked | SQL: Safe | General | None |
| `PUT /users/:id` | `requireAdmin` — OK | Username uniqueness, role validated | SQL: Safe | General | None |
| `PUT /users/:id/reactivate` | `requireAdmin` — OK | ID check | SQL: Safe | General | None |
| `DELETE /users/:id` | `requireAdmin` — OK | ID check (soft delete) | SQL: Safe | General | None |

**Issues:**
- bcrypt rounds = 10 (should be 12 per CLAUDE.md requirement)

### Admin

| Endpoint | Auth | Input Validation | Injection Risk | Rate Limit | Sensitive Data |
|----------|------|-----------------|----------------|------------|----------------|
| `POST /admin/wipe` | `requireAdmin` — OK | None needed | SQL: Safe | General | None |
| `GET /admin/logs` | `requireAdminOrDirector` — OK | Limit capped at 500 | **MEDIUM: Dynamic WHERE** — safe (params in prepared stmt) | General | Audit data (auth-gated) |
| `GET /admin/logs/export` | `requireAdmin` — OK | None | SQL: Safe | General | CSV with audit data |

### Config

| Endpoint | Auth | Input Validation | Injection Risk | Rate Limit | Sensitive Data |
|----------|------|-----------------|----------------|------------|----------------|
| `GET /config` | None (public) — OK | None | SQL: Safe | General | App config only |
| `PUT /config` | `requireAdmin` — OK | Allowlist of keys — good | SQL: Safe | General | None |
| `POST /config/reset` | `requireAdmin` — OK | None needed | SQL: Safe | General | None |

### Mail

| Endpoint | Auth | Input Validation | Injection Risk | Rate Limit | Sensitive Data |
|----------|------|-----------------|----------------|------------|----------------|
| `GET /mail/templates` | `requireAuth` — OK | None | SQL: Safe | General | None |
| `POST /mail/templates` | `requireAdmin` — OK | Fields required | **MEDIUM: body_html stored as-is** — XSS if rendered unescaped | General | None |
| `POST /mail/send-test` | `requireAdmin` — OK | Email required | SQL: Safe | General | None |
| `POST /mail/send-event-summary` | `requireAdmin` — OK | Email required | **HIGH: Template injection** — `{{placeholders}}` replaced with DB data that could contain HTML | General | None |

**Issues:**
- Mail templates with HTML body stored and used without sanitization — if tournament names contain `<script>`, they get injected into email HTML

### Schedule

| Endpoint | Auth | Input Validation | Injection Risk | Rate Limit | Sensitive Data |
|----------|------|-----------------|----------------|------------|----------------|
| `GET /schedule` | None (public) — OK | None | SQL: Safe | General | None |
| `PUT /schedule/:id/skip` | `requireAny(['admin','referee'])` — OK | ID check | SQL: Safe | General | None |
| `PUT /schedule/:id/activate` | `requireAny(['admin','referee'])` — OK | Active game check | SQL: Safe | General | None |

### Walk-On

| Endpoint | Auth | Input Validation | Injection Risk | Rate Limit | Sensitive Data |
|----------|------|-----------------|----------------|------------|----------------|
| `POST /walkon/:playerId` | `requireAdminOrDirector` — OK | URL, start, duration validated | **HIGH: URL passed to yt-dlp spawn** — mitigated by YouTube URL prefix check | General | None |
| `GET /walkon/:playerId/status` | None (public) — OK | ID parsed | SQL: Safe | General | File path exposed |
| `GET /walkon/:playerId/audio` | None (public) — OK | ID parsed | **HIGH: Path traversal** — `walkon_file` from DB used as file path | General | Audio data |
| `DELETE /walkon/:playerId` | `requireAdmin` — OK | ID check | SQL: Safe | General | None |

---

## JWT Requirements

### Claims Required
| Endpoint Group | Required Claims | Notes |
|---------------|----------------|-------|
| Public endpoints | None | GET tournaments, players, games, config, boards, schedule |
| General auth (`verifyToken`/`requireAuth`) | `id`, `username` | Any valid JWT |
| Admin (`requireAdmin`) | `id`, `username`, `role='admin'` | Or legacy JWT without role field |
| Admin/Director (`requireAdminOrDirector`) | `id`, `username`, `role` in `['admin','director']` | |
| Role-specific (`requireAny`) | `id`, `username`, `role` in allowed list | |

### JWT Configuration
- **Algorithm:** HS256 (default jsonwebtoken) — OK
- **Expiry:** 8h — OK for event-day use
- **Secret:** Must be min 32 characters — **NOT VALIDATED ON STARTUP**
- **Refresh tokens:** Not implemented — acceptable for 8h event sessions

### Recommendations
1. Validate `JWT_SECRET` length on startup (min 32 chars), refuse to start if too short
2. Consider adding `iat` (issued at) validation
3. Token revocation: currently no blacklist — acceptable for event use

---

## Input Validation Matrix

| Endpoint | Field | Type | Min/Max | Required | Sanitization |
|----------|-------|------|---------|----------|-------------|
| `POST /auth/login` | username | string | - | Yes | `.toLowerCase()` |
| `POST /auth/login` | password | string | - | Yes | None (compared via bcrypt) |
| `POST /tournaments` | name | string | - | Yes | None — **should trim** |
| `POST /tournaments` | date | string | ISO date | No | None — **should validate format** |
| `POST /tournaments` | format | enum | `501\|301` | Yes | Validated |
| `POST /tournaments` | checkout | enum | `single_out\|double_out` | Yes | Validated |
| `POST /tournaments/:id/players` | vorname | string | - | Yes | `.trim()` |
| `POST /tournaments/:id/players` | nickname | string | - | Yes | `.trim()` |
| `POST /tournaments/:id/players` | nachname | string | - | Yes | `.trim()` |
| `POST /games/:id/bulloff` | player1_score | number | 0/25/50 | Yes | Validated |
| `POST /games/:id/bulloff` | player2_score | number | 0/25/50 | Yes | Validated |
| `POST /games/:id/throw` | player_id | number | - | Yes | Validated against game players |
| `POST /games/:id/throw` | score | number | 0-180 | Yes | Validated |
| `POST /games/:id/throw-segment` | segment | string | enum | Yes | Parsed + validated |
| `POST /nfc/scan` | uid | string | - | Yes | SHA-256 hashed |
| `POST /nfc/create` | uid | string | - | Yes | SHA-256 hashed |
| `POST /nfc/create` | name | string | - | Yes | None |
| `POST /orders` | guest_id | number | - | Conditional | None |
| `POST /orders` | product_id | number | - | Yes | None |
| `POST /orders` | quantity | number | min 1 | No (default 1) | `parseInt` validated |
| `POST /products` | name | string | - | Yes | None — **should trim** |
| `POST /products` | category | enum | `food\|drink` | Yes | Validated |
| `POST /products` | price | number | - | Yes | `parseFloat` |
| `POST /users` | username | string | - | Yes | None — **should trim** |
| `POST /users` | password | string | - | Yes | bcrypt hashed |
| `POST /users` | role | enum | admin/director/referee/gastronomy | Yes | Validated |
| `POST /walkon/:playerId` | url | string | YouTube URL | Yes | Prefix validated |
| `POST /walkon/:playerId` | start | number | ≥0 | Yes | `parseInt` validated |
| `POST /walkon/:playerId` | duration | number | >0 | Yes | `parseInt` validated |
| `POST /mail/send-test` | email | string | - | Yes | **No email format validation** |

---

## CORS Configuration

**Current state:** `app.use(cors())` — **OPEN TO ALL ORIGINS**

### Required configuration:
```js
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24h preflight cache
};
app.use(cors(corsOptions));
```

---

## Prioritized Fix List

### CRITICAL (Must fix before deployment)
1. **CORS wildcard** → Restrict to `CORS_ORIGIN` env var
2. **bcrypt 10 rounds** → Change to 12 in `db.js:185`, `users.js:44`, `users.js:79`
3. **POST /orders no auth** → Add `requireAny(['admin', 'gastronomy'])`
4. **cancel_token leak in GET** → Remove from public tournament/player queries
5. **JWT_SECRET startup validation** → Refuse to start if missing or < 32 chars
6. **Stack traces to client** → Replace `err.message` with generic error in all 500 handlers
7. **Manual NFC UID not hashed** → Hash the generated UID before storing

### HIGH (Fix before production)
1. **Products CRUD auth too permissive** → `requireAuth` should be `requireAdmin` for POST/PUT/DELETE
2. **nfc_uid hash in /orders/by-guest** → Exclude from SELECT
3. **walkon_file path traversal** → Validate file is within WALKON_DIR before serving
4. **Mail template HTML injection** → Escape HTML entities in template variables
5. **express.json() body size** → Add `{ limit: '100kb' }` to prevent large payload DoS

### MEDIUM (Improve security posture)
1. Tournament name/date input trimming and validation
2. Product name trimming
3. Email format validation in mail endpoints
4. Stricter rate limiting on `/nfc/scan` (50/15min per IP)
5. Stricter rate limiting on player self-registration (10/15min per IP)
6. Add `X-Content-Type-Options: nosniff` header (helmet should handle this)
7. Log failed login attempts with IP for monitoring
8. Add request ID to error responses for debugging (without stack trace)
