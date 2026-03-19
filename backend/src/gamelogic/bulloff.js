/**
 * Bulloff module — pure functions for bull-off (who throws first) logic.
 * No Express dependency.
 */

/**
 * Validates a bulloff score. Only 25 (outer bull) or 50 (bullseye) are valid hits.
 * 0 is also valid (miss).
 * @param {number} score
 * @returns {boolean}
 */
function isValidBulloffScore(score) {
  if (typeof score !== 'number') return false;
  return score === 0 || score === 25 || score === 50;
}

/**
 * Resolves a bulloff round.
 * @param {number} p1Score - Player 1's bulloff score (0, 25, or 50)
 * @param {number} p2Score - Player 2's bulloff score (0, 25, or 50)
 * @returns {'p1'|'p2'|'tie'} - Who wins the throw, or tie if scores are equal
 */
function resolveBulloff(p1Score, p2Score) {
  if (p1Score > p2Score) return 'p1';
  if (p2Score > p1Score) return 'p2';
  return 'tie';
}

module.exports = { resolveBulloff, isValidBulloffScore };
