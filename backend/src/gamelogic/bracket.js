/**
 * Bracket generation module — pure functions for KO bracket and bye assignment.
 * No Express dependency.
 */

/**
 * Returns the next power of 2 >= n.
 * @param {number} n
 * @returns {number}
 */
function nextPowerOf2(n) {
  let power = 1;
  while (power < n) power *= 2;
  return power;
}

/**
 * Assigns byes for players when count is not a power of 2.
 * Top seeds (lowest seed numbers) get byes.
 * Players should be pre-sorted by seed.
 *
 * @param {Array<{id: number, seed?: number}>} players - Sorted by seed (ascending)
 * @returns {Array<{id: number, seed?: number}|null>} Players with null entries for byes
 */
function assignByes(players) {
  const bracketSize = nextPowerOf2(players.length);
  const byeCount = bracketSize - players.length;
  const result = [...players];

  // Pad with nulls (byes) at the end — when paired, top seeds face byes
  for (let i = 0; i < byeCount; i++) {
    result.push(null);
  }

  return result;
}

/**
 * Generates a KO bracket from a list of players.
 * Seeding: 1 vs last, 2 vs second-to-last, etc.
 * Byes are assigned for uneven player counts (top seeds get byes).
 *
 * @param {Array<{id: number, seed?: number}>} players - Sorted by seed
 * @returns {Array<{round: number, player1_id: number|null, player2_id: number|null, status: string}>}
 */
function generateBracket(players) {
  if (players.length < 2) return [];

  const bracketSize = nextPowerOf2(players.length);
  const paddedPlayers = assignByes(players);

  // Standard seeding: pair 1 vs N, 2 vs N-1, etc.
  const paired = [];
  for (let i = 0; i < bracketSize / 2; i++) {
    const p1 = paddedPlayers[i] || null;
    const p2 = paddedPlayers[bracketSize - 1 - i] || null;
    paired.push([p1, p2]);
  }

  const games = [];

  // Round 1
  for (const [p1, p2] of paired) {
    const p1Id = p1 ? p1.id : null;
    const p2Id = p2 ? p2.id : null;

    if (p1Id && p2Id) {
      games.push({
        round: 1,
        player1_id: p1Id,
        player2_id: p2Id,
        status: 'pending',
      });
    } else if (p1Id) {
      // Bye — p1 auto-advances
      games.push({
        round: 1,
        player1_id: p1Id,
        player2_id: null,
        status: 'finished',
        winner_id: p1Id,
      });
    } else if (p2Id) {
      // Bye — p2 auto-advances
      games.push({
        round: 1,
        player1_id: p2Id,
        player2_id: null,
        status: 'finished',
        winner_id: p2Id,
      });
    }
  }

  // Generate placeholder games for subsequent rounds
  let gamesInPrevRound = games.length;
  let round = 2;
  while (gamesInPrevRound > 1) {
    const gamesInRound = Math.floor(gamesInPrevRound / 2);
    for (let i = 0; i < gamesInRound; i++) {
      games.push({
        round,
        player1_id: null,
        player2_id: null,
        status: 'pending',
      });
    }
    gamesInPrevRound = gamesInRound;
    round++;
  }

  return games;
}

/**
 * Advances the bracket after a game finishes.
 * Checks if all games in the current round are done, then generates next round matchups.
 * @param {object} db - better-sqlite3 database instance
 * @param {object} game - The game that just finished (must have tournament_id, round)
 */
function advanceBracket(db, game) {
  const roundGames = db.prepare(
    'SELECT * FROM games WHERE tournament_id = ? AND round = ?'
  ).all(game.tournament_id, game.round);

  const allFinished = roundGames.every(g => g.status === 'finished');
  if (!allFinished) return;

  const winners = roundGames.map(g => g.winner_id).filter(Boolean);

  if (winners.length <= 1) {
    // Tournament is finished
    db.prepare('UPDATE tournaments SET status = ? WHERE id = ?').run('finished', game.tournament_id);
    return;
  }

  // Generate next round games (pair winners)
  const nextRound = game.round + 1;
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(game.tournament_id);
  const startScore = tournament ? (tournament.format === '301' ? 301 : 501) : 501;

  for (let i = 0; i < winners.length; i += 2) {
    const p1 = winners[i];
    const p2 = winners[i + 1] || null;

    if (p2) {
      db.prepare(
        'INSERT INTO games (tournament_id, round, player1_id, player2_id, status, start_score) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(game.tournament_id, nextRound, p1, p2, 'pending', startScore);
    } else {
      // Odd player gets a bye — auto-advance
      db.prepare(
        'INSERT INTO games (tournament_id, round, player1_id, player2_id, status, start_score, winner_id) VALUES (?, ?, ?, NULL, ?, ?, ?)'
      ).run(game.tournament_id, nextRound, p1, 'finished', startScore, p1);
    }
  }
}

module.exports = { generateBracket, assignByes, nextPowerOf2, advanceBracket };
