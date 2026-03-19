const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Keine Anmeldedaten vorhanden – bitte anmelden' });
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    // NEU: req.user als einheitliches User-Objekt setzen
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Session abgelaufen – bitte neu anmelden' });
  }
}

// NEU: Auth-Middleware die nur Authentifizierung prueft (alle Rollen erlaubt)
const requireAuth = verifyToken;

// Prueft ob User explizit die Rolle 'admin' hat — kein Fallback auf fehlende Rolle
const requireAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role === 'admin') {
      return next();
    }
    return res.status(403).json({ error: 'Keine Admin-Berechtigung für diese Aktion' });
  });
};

// Middleware-Factory fuer eine bestimmte Rolle — kein Fallback auf fehlende Rolle
const requireRole = (role) => (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role === role) {
      return next();
    }
    return res.status(403).json({ error: 'Keine Berechtigung für diese Aktion' });
  });
};

// Middleware-Factory fuer mehrere erlaubte Rollen — 403 wenn role fehlt oder nicht enthalten
const requireAny = (roles) => (req, res, next) => {
  verifyToken(req, res, () => {
    const userRole = req.user.role;
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ error: 'Keine Berechtigung für diese Aktion' });
    }
    return next();
  });
};

// Admin oder Turnierleitung — für alle Turnier-Management-Operationen
const requireAdminOrDirector = (req, res, next) => {
  verifyToken(req, res, () => {
    const role = req.user.role;
    if (role === 'admin' || role === 'director') return next();
    return res.status(403).json({ error: 'Keine Berechtigung – Admin oder Turnierleitung erforderlich' });
  });
};

module.exports = { verifyToken, requireAuth, requireAdmin, requireAdminOrDirector, requireRole, requireAny };
