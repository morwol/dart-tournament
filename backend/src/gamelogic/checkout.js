/**
 * Checkout suggestions module — pure functions for double-out checkout combinations.
 * No Express dependency.
 */

// All possible single-dart scores
const SINGLES = [];
for (let i = 1; i <= 20; i++) {
  SINGLES.push({ label: `S${i}`, value: i });
  SINGLES.push({ label: `D${i}`, value: i * 2, isDouble: true });
  SINGLES.push({ label: `T${i}`, value: i * 3 });
}
SINGLES.push({ label: 'S25', value: 25 });
SINGLES.push({ label: 'Bull', value: 50, isDouble: true });

// All valid finishing darts (doubles + bull)
const DOUBLES = SINGLES.filter(s => s.isDouble);

/**
 * Returns all 1/2/3-dart checkout combinations for double-out.
 * Only returns results for remaining <= 170 and >= 2.
 * Each combination ends with a double or Bull (50).
 *
 * @param {number} remaining - Current remaining score
 * @returns {string[][]} Array of combinations, each combination is an array of dart labels
 */
function getSuggestions(remaining) {
  if (remaining > 170 || remaining < 2) return [];

  const results = [];

  // 1-dart checkouts
  for (const d of DOUBLES) {
    if (d.value === remaining) {
      results.push([d.label]);
    }
  }

  // 2-dart checkouts
  for (const s1 of SINGLES) {
    const rest = remaining - s1.value;
    if (rest < 2) continue;
    for (const d of DOUBLES) {
      if (d.value === rest) {
        results.push([s1.label, d.label]);
      }
    }
  }

  // 3-dart checkouts
  for (const s1 of SINGLES) {
    for (const s2 of SINGLES) {
      const rest = remaining - s1.value - s2.value;
      if (rest < 2) continue;
      for (const d of DOUBLES) {
        if (d.value === rest) {
          results.push([s1.label, s2.label, d.label]);
        }
      }
    }
  }

  // Deduplicate: sort darts within non-finishing portion, then stringify
  const seen = new Set();
  const unique = [];
  for (const combo of results) {
    const key = combo.join(',');
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(combo);
    }
  }

  return unique;
}

// Curated checkout lookup table — most common checkout paths (space-separated strings).
// Used by the API to return concise, human-readable suggestions.
const CHECKOUTS = {
  170: ['T20 T20 Bull'],
  167: ['T20 T19 Bull'],
  164: ['T20 T18 Bull'],
  161: ['T20 T17 Bull'],
  160: ['T20 T20 D20'],
  158: ['T20 T20 D19'],
  157: ['T20 T19 D20'],
  156: ['T20 T20 D18'],
  155: ['T20 T19 D19'],
  154: ['T20 T18 D20'],
  153: ['T20 T19 D18'],
  152: ['T20 T20 D16'],
  151: ['T20 T17 D20'],
  150: ['T20 T18 D18'],
  149: ['T20 T19 D16'],
  148: ['T20 T16 D20'],
  147: ['T20 T17 D18'],
  146: ['T20 T18 D16'],
  145: ['T20 T15 D20'],
  144: ['T20 T18 D15'],
  143: ['T20 T17 D16'],
  142: ['T20 T14 D20'],
  141: ['T20 T19 D12'],
  140: ['T20 T20 D10'],
  139: ['T20 T13 D20'],
  138: ['T20 T18 D12'],
  137: ['T20 T15 D16'],
  136: ['T20 T20 D8'],
  135: ['T20 T17 D12'],
  134: ['T20 T14 D16'],
  133: ['T20 T19 D8'],
  132: ['T20 T16 D12'],
  131: ['T20 T13 D16'],
  130: ['T20 T18 D8'],
  129: ['T19 T16 D12'],
  128: ['T18 T14 D16'],
  127: ['T20 T17 D8'],
  126: ['T19 T15 D12'],
  125: ['T20 T15 D10', 'T18 T13 D16'],
  124: ['T20 T16 D8'],
  123: ['T19 T16 D9'],
  122: ['T18 T18 D7'],
  121: ['T20 T11 D14'],
  120: ['T20 20 D20'],
  119: ['T19 T12 D13'],
  118: ['T20 18 D20'],
  117: ['T20 17 D20'],
  116: ['T20 16 D20'],
  115: ['T20 15 D20'],
  114: ['T20 14 D20'],
  113: ['T20 13 D20'],
  112: ['T20 12 D20'],
  111: ['T20 11 D20'],
  110: ['T20 10 D20'],
  109: ['T20 9 D20'],
  108: ['T20 16 D16'],
  107: ['T19 10 D20'],
  106: ['T20 6 D20'],
  105: ['T20 5 D20'],
  104: ['T18 10 D20'],
  103: ['T20 3 D20'],
  102: ['T20 10 D16'],
  101: ['T20 1 D20'],
  100: ['T20 D20'],
  99: ['T19 10 D16'],
  98: ['T20 D19'],
  97: ['T19 D20'],
  96: ['T20 D18'],
  95: ['T19 D19'],
  94: ['T18 D20'],
  93: ['T19 D18'],
  92: ['T20 D16'],
  91: ['T17 D20'],
  90: ['T18 D18'],
  89: ['T19 D16'],
  88: ['T16 D20'],
  87: ['T17 D18'],
  86: ['T18 D16'],
  85: ['T15 D20'],
  84: ['T20 D12'],
  83: ['T17 D16'],
  82: ['T14 D20'],
  81: ['T19 D12'],
  80: ['T20 D10'],
  79: ['T13 D20'],
  78: ['T18 D12'],
  77: ['T15 D16'],
  76: ['T20 D8'],
  75: ['T17 D12'],
  74: ['T14 D16'],
  73: ['T19 D8'],
  72: ['T16 D12'],
  71: ['T13 D16'],
  70: ['T18 D8'],
  69: ['T19 D6'],
  68: ['T20 D4'],
  67: ['T17 D8'],
  66: ['T10 D18'],
  65: ['T19 D4'],
  64: ['T16 D8'],
  63: ['T13 D12'],
  62: ['T10 D16'],
  61: ['T15 D8'],
  60: ['20 D20'],
  59: ['19 D20'],
  58: ['18 D20'],
  57: ['17 D20'],
  56: ['16 D20'],
  55: ['15 D20'],
  54: ['14 D20'],
  53: ['13 D20'],
  52: ['12 D20'],
  51: ['11 D20'],
  50: ['Bull'],
  49: ['9 D20'],
  48: ['8 D20'],
  47: ['7 D20'],
  46: ['6 D20'],
  45: ['5 D20'],
  44: ['4 D20'],
  43: ['3 D20'],
  42: ['10 D16'],
  41: ['9 D16'],
  40: ['D20'],
  39: ['7 D16'],
  38: ['D19'],
  36: ['D18'],
  34: ['D17'],
  32: ['D16'],
  30: ['D15'],
  28: ['D14'],
  26: ['D13'],
  24: ['D12'],
  22: ['D11'],
  20: ['D10'],
  18: ['D9'],
  16: ['D8'],
  14: ['D7'],
  12: ['D6'],
  10: ['D5'],
  8: ['D4'],
  6: ['D3'],
  4: ['D2'],
  2: ['D1'],
};

/**
 * Returns curated checkout suggestions from the lookup table.
 * @param {number} remaining - Current remaining score
 * @param {'single_out'|'double_out'} checkout - Checkout mode
 * @returns {string[]} Array of space-separated dart combinations
 */
function getCheckoutSuggestions(remaining, checkout) {
  if (remaining > 170 || remaining < 2) return [];
  return CHECKOUTS[remaining] || [];
}

module.exports = { getSuggestions, getCheckoutSuggestions };
