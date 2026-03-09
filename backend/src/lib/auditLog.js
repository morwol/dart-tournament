const { db } = require('../db/db');

/**
 * Schreibt einen Eintrag ins Audit-Log.
 * @param {object} req   — Express Request (für actor + role aus JWT)
 * @param {string} category — 'tournament' | 'player' | 'game' | 'config' | 'user' | 'board' | 'system' | 'auth'
 * @param {string} action   — z.B. 'CREATE', 'UPDATE', 'DELETE', 'START', 'FINISH', 'RESET', 'WIPE', 'LOGIN'
 * @param {string} detail   — Menschenlesbare Beschreibung
 * @param {number|null} [targetId] — ID des betroffenen Datensatzes
 */
function auditLog(req, category, action, detail, targetId = null) {
  try {
    const user = req.user || req.admin || null;
    const actor = user?.username || 'anon';
    const role  = user?.role    || 'admin';
    db.prepare(
      'INSERT INTO audit_log (actor, role, category, action, detail, target_id) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(actor, role, category, action, String(detail), targetId);
  } catch (_) {
    // Logging darf niemals den Request-Flow unterbrechen
  }
}

module.exports = { auditLog };
