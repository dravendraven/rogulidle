// How hard a floor is, from one number: how many creatures are on it.
//
// Everything else follows by formula. There is no calibration table, no
// measured win-rate curve, no interpolation between anchors — those all
// went stale every time a mechanic changed, and every one of them did.
//
// WHY COUNT IS THE RIGHT DIAL
//
// The cost of clearing a roster tracks `sum of hp × (xp − 1)` almost
// exactly. Measured against the real duel maths:
//
//   roster              sum xp   hp×(xp−1)   cost
//   3 ghosts (xp 3)        9         18      5.85
//   6 rats   (xp 1)        6          0      0.00
//   1 genie  (xp 6)        6         50     20.63
//   1 dragon (xp 8)        8        105     44.63
//
// Note that summing xp predicts nothing: six rats and one genie both total
// 6, and one costs nothing while the other costs twenty. A strong monster
// hits harder AND lasts longer, and those multiply — so individual strength
// scales cost quadratically while COUNT scales it linearly.
//
// Linear is what you want in a dial. Doubling the creatures doubles the
// demand, predictably, with no thresholds to fall off.

// Creatures on floor N: `base × growth^N`, so 2, 3, 3, 4, 6, 7, 10, 13, 16, 21.
//
// EXPONENTIAL, not additive, and the difference is about where the growth
// sits rather than where it ends. `2 + 2N` and `2 × 1.3^N` both land near 20
// on floor ten, but the additive one front-loads: floor 2 has TWICE floor
// one, while floor 10 has 11% more than floor nine. Growth that fades is
// backwards — the hero is at their weakest at the top, with nothing looted
// yet, and that is exactly where the old curve threw its biggest jump.
//
// Measured on the additive model: of 24 heroes, all 24 met floor 2 and 2 met
// floor 10. Attrition sat in the first three floors. The exponential form
// spends floors 1-4 gently (2, 3, 3, 4 against the old 2, 4, 6, 8) and buys
// it back below.
export const MONSTERS_BASE = 2;

// WHY 1.3. Net challenge is floor cost over hero capacity, so with cost
// exponential and capacity roughly flat, net eventually multiplies by this
// number every floor. The span from "half the hero's capacity" to "all of
// it" is therefore ln2 / ln(growth) floors:
//
//   growth  1.15   1.25   1.30   1.5   2.0
//   floors   5.0    3.1    2.6    1.7   1.0
//
// Past about 1.4 the ladder stops being a ramp and becomes a wall: trivial,
// trivial, trivial, dead. 1.3 is the largest value that still leaves a
// couple of floors of real fight, and it is also what lands floor ten near
// the 20 creatures the additive model ended on (10^(1/9) = 1.29).
export const MONSTER_GROWTH = 1.3;

// FLAT, not per-monster. Rogule ships 15 chests to 5 monsters, but Rogule
// is one floor — nothing carries forward, so the ratio can be generous.
//
// Tying chests to the creature count was tried and fails: loot then grows
// at exactly the same rate as threat, and since the hero ACCUMULATES while
// each floor's threat is spent once, the hero wins. Measured that way, the
// tenth floor handed over 64 items and capacity reached 118 against a
// starting 10.
//
// Flat chests are what makes threat outpace supply, which is the whole
// requirement.
export const CHESTS_PER_FLOOR = 6;

// How far up the monster table the deepest corner of a floor reaches.
// Rogule's constant, and now fixed rather than scaled per floor: strength
// varies WITHIN a map by distance from the start, and floors differ by how
// many creatures they hold, not by what kind.
export const MONSTER_STRENGTH = 0.35;

// One draw in three yields something; the rest come up empty. Equal across
// weapons, armour and potions.
export const SCARCITY = 3;

// Chance a corpse leaves a potion behind.
export const DROP_CHANCE = 0.5;

// Creature count on a floor, `step` floors below the first.
//
// Both growth laws live here so the lab page can put them side by side.
// `growth` above 1 compounds; pass a `perLevel` instead for the old additive
// form. At least one creature always, or a "floor" is just a walk.
export function monstersAt(base, growth, step, perLevel = null) {
  const raw = perLevel === null
    ? base * Math.pow(growth, step)
    : base + step * perLevel;
  return Math.max(1, Math.round(raw));
}

// Everything the generator needs for floor N, zero-based.
export function floorParams(level) {
  const monsters = monstersAt(MONSTERS_BASE, MONSTER_GROWTH, Math.max(0, level));
  return {
    level,
    monsters,
    chests: CHESTS_PER_FLOOR,
    difficultyScale: MONSTER_STRENGTH,
    dropChance: DROP_CHANCE,
    weaponScarcity: SCARCITY,
    armourScarcity: SCARCITY,
    potionScarcity: SCARCITY,
  };
}

// The same model with every constant turned into a field, so a page can
// vary it without editing this file. `floorParams` above is this with the
// shipped defaults — that stays the single source of truth for what the
// game actually runs; this is for asking "what if".
export const DEFAULT_MODEL = {
  monstersBase: MONSTERS_BASE,
  // The shipped law. Set `monstersPerLevel` above 0 to switch the plan back
  // to the additive form and compare the two curves.
  monsterGrowth: MONSTER_GROWTH,
  monstersPerLevel: 0,
  chests: CHESTS_PER_FLOOR,
  // Chests tied to the creature count. Zero by default, and deliberately:
  // at 2 per monster loot grows exactly as fast as threat, and since the
  // hero accumulates while each floor's threat is spent once, the hero
  // runs away with it. Exposed so that result stays re-checkable.
  chestsPerMonster: 0,
  strength: MONSTER_STRENGTH,
  dropChance: DROP_CHANCE,
  weaponScarcity: SCARCITY,
  armourScarcity: SCARCITY,
  potionScarcity: SCARCITY,
  levels: 10,
};

// Turns a model into the `floorPlan(level)` function the dungeon wants.
// Level is 1-based here, matching dungeon.js rather than floorParams.
export function makeFloorPlan(model = {}) {
  const m = { ...DEFAULT_MODEL, ...model };
  return (level) => {
    const monsters = monstersAt(m.monstersBase, m.monsterGrowth,
      Math.max(0, level - 1), m.monstersPerLevel > 0 ? m.monstersPerLevel : null);
    return {
      level,
      monsters,
      chests: Math.max(0, Math.round(m.chests + m.chestsPerMonster * monsters)),
      difficultyScale: m.strength,
      dropChance: m.dropChance,
      weaponScarcity: m.weaponScarcity,
      armourScarcity: m.armourScarcity,
      potionScarcity: m.potionScarcity,
    };
  };
}

// For the single-floor spectator, which still thinks in a 0..1 slider.
// Maps the slider onto the same ladder the dungeon walks.
export const DIAL_MAX_LEVEL = 9;

export function difficultyToParams(dial) {
  const d = Math.max(0, Math.min(1, dial));
  return floorParams(Math.round(d * DIAL_MAX_LEVEL));
}

// What a generated floor actually demands, in the currency that predicts
// duel cost. Use this to check a floor came out near what was asked, or to
// compare two rosters that look different but weigh the same.
export function threatMass(state) {
  return state.monsters
    .filter((m) => !m.dead)
    .reduce((sum, m) => sum + m.hpMax * Math.max(0, m.xp - 1), 0);
}
