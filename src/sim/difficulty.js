// One knob for how hard a floor is.
//
//   difficulty 0   -> the bot wins nearly always
//   difficulty 1   -> the bot wins nearly never
//
// The idea is that generation gets a dial and the bot is left alone. You do
// not tune the bot to hit a win rate; you tune the floor.
//
// Four generation parameters move together along the dial, because moving
// one alone runs out of room long before the extremes:
//
//   monsters         how many there are to kill
//   covers           how much the map arms you
//   difficultyScale  how far up the monster table the deepest tiles reach
//   dropChance       how often a corpse leaves something behind
//
// The last one is not obvious and was found by measurement: piling on
// monsters also piles on their drops, so crowding the floor arms the player
// too. Without a separate drop dial the win rate bottoms out near 13% no
// matter how many monsters are added.
//
// The numbers in CALIBRATION are MEASURED, not derived. Win rate over 30–40
// held-out floors per point, bot v5:
//
//   dial   0.00  0.25  0.50  0.75  1.00
//   wins    95%   70%   45%   17%    0%
//
// They are only valid for the bot they were measured against; a materially
// better bot needs recalibrating. That is the honest price of defining
// difficulty against an opponent rather than in the abstract — and the
// reason the dial is stored as measured anchors rather than a formula
// pretending to be a law.
//
// Note the ceiling is not 100%: about half of a run's outcome is combat
// dice rather than the floor (measured — see docs/balance.md), so even a
// generous floor loses sometimes and no generation setting can prevent it.

// Anchor points: dial position -> generation parameters.
// Interpolated between, clamped outside.
// Threat climbs steeply; gear opens up slowly. That gap is deliberate — it
// is what stops a ten-floor descent from being decided on floor one.
//
//   monsters  x7 across the dial, and they get stronger with it
//   gear      scarcity only x5 the other way, and covers barely move
//
// Floor one is meant to be clearable with nothing in hand: few weak
// monsters, and gear as a bonus for what comes after rather than a
// prerequisite for surviving the room you are in.
// gearScarcity stays at 1 across the board on purpose: the owner wants
// weapons, armour and potions equally scarce, and that dial would tilt the
// first two against the third. How much loot exists is set by how many
// covers there are and how often a corpse leaves something — both of which
// hit all three kinds alike.
//
// The counts look small next to earlier versions because the junk is gone.
// Chestnuts and mushrooms used to be 53% of the pool, so half of every
// cover opened was wasted; now every one that pays, pays in something real.
// One scarcity per kind, held equal for now by owner decision. What they do
// not claim comes up as an empty cover, which is what replaced Rogule's junk
// collectibles — so this dial sets both the mix AND how often opening a
// cover pays at all.
const CALIBRATION = [
  { at: 0.0, monsters: 2, covers: 14, difficultyScale: 0.12, dropChance: 0.5, scarcity: 3.0 },
  { at: 0.25, monsters: 5, covers: 14, difficultyScale: 0.40, dropChance: 0.5, scarcity: 3.0 },
  { at: 0.5, monsters: 9, covers: 15, difficultyScale: 0.75, dropChance: 0.5, scarcity: 3.0 },
  { at: 0.75, monsters: 14, covers: 15, difficultyScale: 0.90, dropChance: 0.5, scarcity: 3.0 },
  { at: 1.0, monsters: 21, covers: 16, difficultyScale: 1.00, dropChance: 0.5, scarcity: 3.0 },
];

const lerp = (a, b, t) => a + (b - a) * t;

// Generation parameters for a dial position in [0, 1].
export function difficultyToParams(dial) {
  const d = Math.max(0, Math.min(1, dial));

  let lower = CALIBRATION[0];
  let upper = CALIBRATION[CALIBRATION.length - 1];
  for (let i = 0; i < CALIBRATION.length - 1; i++) {
    if (d >= CALIBRATION[i].at && d <= CALIBRATION[i + 1].at) {
      lower = CALIBRATION[i];
      upper = CALIBRATION[i + 1];
      break;
    }
  }

  const span = upper.at - lower.at;
  const t = span === 0 ? 0 : (d - lower.at) / span;

  return {
    monsters: Math.round(lerp(lower.monsters, upper.monsters, t)),
    covers: Math.round(lerp(lower.covers, upper.covers, t)),
    difficultyScale: +lerp(lower.difficultyScale, upper.difficultyScale, t).toFixed(3),
    dropChance: +lerp(lower.dropChance, upper.dropChance, t).toFixed(3),
    // Held equal across the three kinds for now, but kept as three fields
    // so they can be split without touching anything downstream.
    weaponScarcity: +lerp(lower.scarcity, upper.scarcity, t).toFixed(3),
    armourScarcity: +lerp(lower.scarcity, upper.scarcity, t).toFixed(3),
    potionScarcity: +lerp(lower.scarcity, upper.scarcity, t).toFixed(3),
  };
}

// Measured win rate at each anchor, for showing alongside the dial. Same
// batch that produced CALIBRATION.
const MEASURED_WIN_RATE = [0.95, 0.70, 0.45, 0.17, 0.0];

// Roughly what share of runs the bot is expected to win at this setting.
// Interpolated between measured points — a long-run rate, never a promise
// about any single run.
export function expectedWinRate(dial) {
  const d = Math.max(0, Math.min(1, dial));
  const span = 1 / (MEASURED_WIN_RATE.length - 1);
  const i = Math.min(MEASURED_WIN_RATE.length - 2, Math.floor(d / span));
  const t = (d - i * span) / span;
  return lerp(MEASURED_WIN_RATE[i], MEASURED_WIN_RATE[i + 1], t);
}

// Describes a map that already exists, on the same 0..1 scale. Not the
// inverse of the dial — it reads a generated floor rather than setting one —
// but useful for spotting a seed that came out far from what was asked.
//
// Threat weighed against what the map hands over. Measured win rates by
// band, over 270 floors at the shipped settings:
//   under 1.5 -> 100%   under 2.5 -> 77%   under 3.5 -> 75%
//   under 5   ->  56%   under 7   -> 50%   above    -> 29%
export function pressureOf(state) {
  const live = state.monsters.filter((m) => !m.dead);
  const threat = live.reduce((sum, m) => sum + m.xp, 0);

  const loot = [
    ...state.items,
    ...state.covers.map((c) => c.drop).filter(Boolean),
    ...state.monsters.map((m) => m.drop).filter(Boolean),
  ];
  const gear = loot.reduce((sum, i) => sum + (i.dmg || 0) + (i.armour || 0), 0);

  return threat / (1 + gear);
}
