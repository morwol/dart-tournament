const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { validateThrow, calculateRemaining, isBust, resetRound } = require('./scoring');
const { getSuggestions } = require('./checkout');
const { generateBracket, assignByes, nextPowerOf2 } = require('./bracket');
const { resolveBulloff, isValidBulloffScore } = require('./bulloff');

// ============================================================
// scoring.js
// ============================================================

describe('validateThrow', () => {
  it('accepts valid scores 0-180', () => {
    assert.equal(validateThrow(0), true);
    assert.equal(validateThrow(60), true);
    assert.equal(validateThrow(180), true);
    assert.equal(validateThrow(1), true);
  });

  it('rejects scores above 180', () => {
    assert.equal(validateThrow(181), false);
    assert.equal(validateThrow(300), false);
  });

  it('rejects negative scores', () => {
    assert.equal(validateThrow(-1), false);
    assert.equal(validateThrow(-50), false);
  });

  it('rejects non-integer and non-number', () => {
    assert.equal(validateThrow(1.5), false);
    assert.equal(validateThrow('60'), false);
    assert.equal(validateThrow(null), false);
    assert.equal(validateThrow(undefined), false);
  });
});

describe('calculateRemaining', () => {
  it('subtracts score from current', () => {
    assert.equal(calculateRemaining(501, 60), 441);
    assert.equal(calculateRemaining(301, 180), 121);
    assert.equal(calculateRemaining(40, 40), 0);
  });

  it('can return negative values (for bust detection)', () => {
    assert.equal(calculateRemaining(20, 60), -40);
  });
});

describe('isBust', () => {
  it('detects bust when score exceeds remaining (double_out)', () => {
    assert.equal(isBust(20, 60, 'double_out'), true);
  });

  it('detects bust when remaining would be 1 (double_out)', () => {
    assert.equal(isBust(41, 40, 'double_out'), true);
  });

  it('detects bust when checkout is 0 but not double (double_out)', () => {
    assert.equal(isBust(40, 40, 'double_out', false), true);
  });

  it('allows checkout with double (double_out)', () => {
    assert.equal(isBust(40, 40, 'double_out', true), false);
  });

  it('allows checkout without double (single_out)', () => {
    assert.equal(isBust(40, 40, 'single_out', false), false);
  });

  it('detects bust on overshoot (single_out)', () => {
    assert.equal(isBust(20, 60, 'single_out'), true);
  });

  it('does not bust when remaining is still positive', () => {
    assert.equal(isBust(501, 60, 'double_out'), false);
    assert.equal(isBust(100, 50, 'single_out'), false);
  });
});

describe('resetRound', () => {
  it('returns a copy of the throws array', () => {
    const throws = [
      { id: 1, score: 60, remaining: 441 },
      { id: 2, score: 26, remaining: 415 },
    ];
    const result = resetRound(throws);
    assert.deepEqual(result, throws);
    assert.notEqual(result, throws); // should be a copy
  });
});

// ============================================================
// checkout.js
// ============================================================

describe('getSuggestions', () => {
  it('returns T20 T20 Bull for 170', () => {
    const suggestions = getSuggestions(170);
    const has170 = suggestions.some(
      s => s.length === 3 && s[0] === 'T20' && s[1] === 'T20' && s[2] === 'Bull'
    );
    assert.equal(has170, true);
  });

  it('returns D20 for 40', () => {
    const suggestions = getSuggestions(40);
    const hasD20 = suggestions.some(s => s.length === 1 && s[0] === 'D20');
    assert.equal(hasD20, true);
  });

  it('returns empty for remaining > 170', () => {
    assert.deepEqual(getSuggestions(171), []);
    assert.deepEqual(getSuggestions(501), []);
  });

  it('returns empty for remaining < 2', () => {
    assert.deepEqual(getSuggestions(1), []);
    assert.deepEqual(getSuggestions(0), []);
  });

  it('all suggestions end with a double or Bull', () => {
    const suggestions = getSuggestions(100);
    for (const combo of suggestions) {
      const last = combo[combo.length - 1];
      const isDouble = last.startsWith('D') || last === 'Bull';
      assert.equal(isDouble, true, `${combo.join(', ')} does not end with double`);
    }
  });

  it('returns Bull for 50', () => {
    const suggestions = getSuggestions(50);
    const hasBull = suggestions.some(s => s.length === 1 && s[0] === 'Bull');
    assert.equal(hasBull, true);
  });
});

// ============================================================
// bracket.js
// ============================================================

describe('nextPowerOf2', () => {
  it('returns correct power of 2', () => {
    assert.equal(nextPowerOf2(1), 1);
    assert.equal(nextPowerOf2(2), 2);
    assert.equal(nextPowerOf2(3), 4);
    assert.equal(nextPowerOf2(5), 8);
    assert.equal(nextPowerOf2(8), 8);
    assert.equal(nextPowerOf2(9), 16);
  });
});

describe('assignByes', () => {
  it('pads to next power of 2 with nulls', () => {
    const players = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = assignByes(players);
    assert.equal(result.length, 4);
    assert.equal(result[3], null);
  });

  it('does not add byes when count is already power of 2', () => {
    const players = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    const result = assignByes(players);
    assert.equal(result.length, 4);
    assert.equal(result.filter(p => p === null).length, 0);
  });
});

describe('generateBracket', () => {
  it('creates correct number of round 1 games for 4 players', () => {
    const players = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    const games = generateBracket(players);
    const round1 = games.filter(g => g.round === 1);
    assert.equal(round1.length, 2);
  });

  it('seeds 1 vs 4, 2 vs 3 for 4 players', () => {
    const players = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    const games = generateBracket(players);
    const round1 = games.filter(g => g.round === 1);
    // Game 1: seed 1 (id:1) vs seed 4 (id:4)
    assert.equal(round1[0].player1_id, 1);
    assert.equal(round1[0].player2_id, 4);
    // Game 2: seed 2 (id:2) vs seed 3 (id:3)
    assert.equal(round1[1].player1_id, 2);
    assert.equal(round1[1].player2_id, 3);
  });

  it('creates bye games for 3 players', () => {
    const players = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const games = generateBracket(players);
    const round1 = games.filter(g => g.round === 1);
    // One game should be a bye (finished with winner)
    const byeGames = round1.filter(g => g.status === 'finished');
    assert.equal(byeGames.length, 1);
    // Top seed gets the bye
    assert.equal(byeGames[0].winner_id, 1);
  });

  it('generates subsequent round placeholders', () => {
    const players = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    const games = generateBracket(players);
    const round2 = games.filter(g => g.round === 2);
    assert.equal(round2.length, 1); // final
  });

  it('returns empty for fewer than 2 players', () => {
    assert.deepEqual(generateBracket([{ id: 1 }]), []);
    assert.deepEqual(generateBracket([]), []);
  });
});

// ============================================================
// bulloff.js
// ============================================================

describe('isValidBulloffScore', () => {
  it('accepts 0, 25, and 50', () => {
    assert.equal(isValidBulloffScore(0), true);
    assert.equal(isValidBulloffScore(25), true);
    assert.equal(isValidBulloffScore(50), true);
  });

  it('rejects other values', () => {
    assert.equal(isValidBulloffScore(10), false);
    assert.equal(isValidBulloffScore(100), false);
    assert.equal(isValidBulloffScore(-1), false);
    assert.equal(isValidBulloffScore('25'), false);
  });
});

describe('resolveBulloff', () => {
  it('p1 wins with higher score', () => {
    assert.equal(resolveBulloff(50, 25), 'p1');
    assert.equal(resolveBulloff(25, 0), 'p1');
  });

  it('p2 wins with higher score', () => {
    assert.equal(resolveBulloff(25, 50), 'p2');
    assert.equal(resolveBulloff(0, 25), 'p2');
  });

  it('returns tie on equal scores', () => {
    assert.equal(resolveBulloff(50, 50), 'tie');
    assert.equal(resolveBulloff(25, 25), 'tie');
    assert.equal(resolveBulloff(0, 0), 'tie');
  });
});
