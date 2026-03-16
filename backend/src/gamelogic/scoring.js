/**
 * Scoring module — pure functions for dart score validation and calculation.
 * No Express dependency.
 */

// Valid single scores: 1-20, 25 (outer bull), 50 (bullseye)
// Valid double scores: 2,4,6,...,40, 50
// Valid triple scores: 3,6,9,...,60
// Max single dart: 60 (T20), max 3 darts: 180

const VALID_SINGLE_SCORES = new Set();
// Singles: 1-20, 25, 50
for (let i = 1; i <= 20; i++) VALID_SINGLE_SCORES.add(i);
VALID_SINGLE_SCORES.add(25);
VALID_SINGLE_SCORES.add(50);
// Doubles: 2-40 even, 50
for (let i = 1; i <= 20; i++) VALID_SINGLE_SCORES.add(i * 2);
// Triples: 3-60 multiples of 3 (subset of above, but ensures coverage)
for (let i = 1; i <= 20; i++) VALID_SINGLE_SCORES.add(i * 3);

/**
 * Validates a throw score (sum of up to 3 darts).
 * @param {number} score - The total score for the throw (0-180)
 * @returns {boolean}
 */
function validateThrow(score) {
  if (typeof score !== 'number' || !Number.isInteger(score)) return false;
  return score >= 0 && score <= 180;
}

/**
 * Calculates remaining score after a throw.
 * @param {number} current - Current remaining score
 * @param {number} score - Score thrown
 * @returns {number} New remaining score (can be negative for bust detection)
 */
function calculateRemaining(current, score) {
  return current - score;
}

/**
 * Determines if a throw is a bust.
 * @param {number} remaining - Current remaining score BEFORE the throw
 * @param {number} score - Score thrown
 * @param {'single_out'|'double_out'} checkout - Checkout mode
 * @param {boolean} [isDouble=false] - Whether the finishing dart was a double/bull
 * @returns {boolean}
 */
function isBust(remaining, score, checkout, isDouble = false) {
  const newRemaining = remaining - score;

  if (checkout === 'double_out') {
    // Bust: went below 0
    if (newRemaining < 0) return true;
    // Bust: remaining = 1 (can't finish with a double from 1)
    if (newRemaining === 1) return true;
    // Bust: hit 0 but not with a double
    if (newRemaining === 0 && !isDouble) return true;
  } else {
    // Single out: bust only if below 0
    if (newRemaining < 0) return true;
  }

  return false;
}

/**
 * Returns the throws from the current round that need to be reset on bust.
 * @param {Array<{id: number, score: number, remaining: number}>} throwsThisRound
 * @returns {Array<{id: number, score: number, remaining: number}>}
 */
function resetRound(throwsThisRound) {
  return [...throwsThisRound];
}

module.exports = { validateThrow, calculateRemaining, isBust, resetRound };
