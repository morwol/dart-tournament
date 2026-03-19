require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { initialize } = require('./db/db');

const authRoutes = require('./routes/auth');
const tournamentRoutes = require('./routes/tournaments');
const playerRoutes = require('./routes/players');
const playerSearchRoutes = require('./routes/playerSearch');
const gameRoutes = require('./routes/games');
const nfcRoutes = require('./routes/nfc');
const orderRoutes = require('./routes/orders');
// NEU: User-, Board- und Schedule-Routen
const userRoutes = require('./routes/users');
const boardRoutes = require('./routes/boards');
const scheduleRoutes = require('./routes/schedule');
// NEU: Mail-Route
const mailRoutes = require('./routes/mail');
const adminRoutes = require('./routes/admin');
const productRoutes = require('./routes/products');
const registrationRoutes = require('./routes/registration');
const configRoutes = require('./routes/config');
const walkonRoutes = require('./routes/walkon');
const historyRoutes = require('./routes/history');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust nginx reverse proxy (required for express-rate-limit + X-Forwarded-For)
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
};
app.use(cors(corsOptions));
app.use(express.json());

// NEU: Strengeres Rate-Limit für Login (Brute-Force Schutz)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Zu viele Login-Versuche. Bitte in 15 Minuten erneut versuchen.' }
});
app.use('/api/auth/login', loginLimiter);

// Rate limiting — großzügig für Turnierbetrieb (viele Displays, Auto-Refresh)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/tournaments', playerRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/players/search', playerSearchRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/nfc', nfcRoutes);
app.use('/api/orders', orderRoutes);
// NEU: Neue Routen registrieren
app.use('/api/users', userRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/schedule', scheduleRoutes);
// NEU: Mail-Route registrieren
app.use('/api/mail', mailRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/registration', registrationRoutes);
app.use('/api/config', configRoutes);
app.use('/api/walkon', walkonRoutes);
app.use('/api/history', historyRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Validate JWT_SECRET on startup
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be set and at least 32 characters long.');
  process.exit(1);
}

// Initialize DB and start server
initialize();

app.listen(PORT, () => {
  console.log(`DartEvent Backend running on port ${PORT}`);
});

module.exports = app;
