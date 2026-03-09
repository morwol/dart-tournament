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

// NEU: Rollen-basierte Middleware — prueft ob User die Rolle 'admin' hat
// Kompatibel mit alten Admin-JWTs (ohne role-Feld) und neuen User-JWTs
const requireAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    // Alte Admin-JWTs haben kein role-Feld — diese sind immer admin
    if (!req.user.role || req.user.role === 'admin') {
      return next();
    }
    return res.status(403).json({ error: 'Keine Admin-Berechtigung für diese Aktion' });
  });
};

// NEU: Middleware-Factory fuer eine bestimmte Rolle
const requireRole = (role) => (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role === role || (!req.user.role && role === 'admin')) {
      return next();
    }
    return res.status(403).json({ error: 'Keine Berechtigung für diese Aktion' });
  });
};

// NEU: Middleware-Factory fuer mehrere erlaubte Rollen
const requireAny = (roles) => (req, res, next) => {
  verifyToken(req, res, () => {
    // Alte Admin-JWTs (ohne role) gelten als 'admin'
    const userRole = req.user.role || 'admin';
    if (roles.includes(userRole)) {
      return next();
    }
    return res.status(403).json({ error: 'Keine Berechtigung für diese Aktion' });
  });
};

// Admin oder Turnierleitung — für alle Turnier-Management-Operationen
const requireAdminOrDirector = (req, res, next) => {
  verifyToken(req, res, () => {
    const role = req.user.role || 'admin';
    if (role === 'admin' || role === 'director') return next();
    return res.status(403).json({ error: 'Keine Berechtigung – Admin oder Turnierleitung erforderlich' });
  });
};

module.exports = { verifyToken, requireAuth, requireAdmin, requireAdminOrDirector, requireRole, requireAny };
