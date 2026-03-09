# DartEvent Manager

Full-stack web app for darts tournaments with integrated food & drink ordering and payment via NFC. Mobile-first PWA for referees, players, and guests—runs in the browser on Windows, iOS, and Android. Designed for self-hosted deployment on a Linux server behind nginx.

## Features

- **Tournament management** — Create tournaments, 501/301 formats, single/double out, bracket generation (K.O.)
- **Game flow** — Bull-off, leg-by-leg scoring, checkout suggestions, referee and scoreboard views
- **Player registration** — Sign-up and cancellation; optional seed list
- **NFC & orders** — One NFC tag per guest; scan to order food/drinks; QR fallback; mark orders as paid
- **Admin** — JWT-protected dashboard, daily settlement, product and guest management
- **PWA** — Offline-capable frontend, installable on mobile devices

## Tech stack

| Layer      | Stack |
|-----------|--------|
| Frontend  | React 18, Vite, TailwindCSS, Zustand |
| Backend   | Node.js, Express, REST API |
| Database  | SQLite (better-sqlite3), migratable to PostgreSQL |
| Auth      | JWT for admin |
| NFC       | Web NFC API (Chrome Android) + QR code fallback |
| Hosting   | nginx reverse proxy → Node on port 3001 |

## Repository structure

```
dartsturnier/
├── frontend/     # React PWA (tournament, games, orders, admin)
├── backend/      # Express API, SQLite, JWT, NFC endpoints
├── deploy/       # nginx config, setup script
└── CLAUDE.md     # Internal project spec (German)
```

## Getting started

### Prerequisites

- Node.js 18+
- npm or yarn

### Backend

```bash
cd backend
npm install
cp .env.example .env   # edit DB_PATH, JWT_SECRET, etc.
npm run dev            # or npm start
```

API runs at `http://localhost:3001` (or your configured port).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the URL shown by Vite (e.g. `http://localhost:5173`). For production, run `npm run build` and serve the `dist/` folder (e.g. via nginx as in `deploy/`).

### Database

SQLite DB path is set via `DB_PATH` (default: `./data/dartevent.db`). Schema and migrations are in `backend/src/db/`. Create the `backend/data/` directory if it does not exist.

## API overview

- `POST /api/auth/login` — Admin login, returns JWT
- `GET/POST /api/tournaments`, `GET/PUT /api/tournaments/:id` — Tournaments and start
- `GET/POST /api/tournaments/:id/players` — Players
- `GET /api/games/:id`, `POST /api/games/:id/bulloff`, `POST /api/games/:id/throw`, `POST /api/games/:id/finish` — Games and scoring
- `POST /api/nfc/scan`, `POST /api/nfc/create`, `GET /api/nfc/:uid/orders` — NFC guests and orders
- `GET/POST /api/products`, `POST /api/orders`, `PUT /api/orders/:id/pay`, `GET /api/orders/summary` — Products and orders

## Security

- Admin routes protected by JWT; use HTTPS in production (e.g. Let’s Encrypt via nginx).
- NFC UIDs stored hashed (SHA-256); secrets and DB path via environment variables.
- See `deploy/` for a sample nginx configuration and setup script.

## License

Proprietary. See repository owner for terms.
