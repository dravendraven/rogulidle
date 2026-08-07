import {
  CHEST_GUARD_RADIUS,
  FLOOR_SPREAD_BASE, FLOOR_SPREAD_CAP, FLOOR_SPREAD_PER_LEVEL, MONSTER_TABLE,
  OUT_OF_DEPTH_CHANCE_BASE, OUT_OF_DEPTH_CHANCE_CAP, OUT_OF_DEPTH_CHANCE_PER_LEVEL,
  OUT_OF_DEPTH_TAIL,
  SIDE_ACTIVATION_CAP, SIDE_CHEST_BIAS, SIDE_ROOM_DEPTH_BONUS, SPINE_THREAT_SHARE,
  TIER_FLOOR_SHARE_BASE, TIER_FLOOR_SHARE_CAP, TIER_FLOOR_SHARE_PER_LEVEL,
} from './balance.js';
import { monsterWeightsAround } from './spawn.js';

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

// GUESS — how fast that ceiling rises per floor. 1.0 means it does not, which
// is the shipped behaviour and what every measurement to date assumed.
//
// Difficulty grows one way today: creature count. This dial exists so the
// SPLIT between count and strength can be swept while total growth is held at
// the calibrated 1.30 per floor. It is an instrument, not a shipped change.
//
// Note the hard ceiling it runs into: `min(1, depth * strength)` in spawn.js
// clamps at 1, and the table has 11 entries, so once strength reaches 1.0 the
// deepest corner is already the t-rex and the ramp stops meaning anything.
export const STRENGTH_GROWTH = 1.0;

// What the deepest corner of floor N reaches up the monster table. Clamped
// at 1, which is where the table runs out — `saturatedAt` reports the floor
// that happens on so a sweep cannot quietly measure a dead ramp.
export function floorStrength(level, model = {}) {
  const base = model.strength ?? MONSTER_STRENGTH;
  const growth = model.strengthGrowth ?? STRENGTH_GROWTH;
  return Math.min(1, base * Math.pow(growth, Math.max(0, level)));
}

// First floor (1-based) on which the strength ramp hits the table ceiling,
// or null if it never does within `levels`.
export function saturatedAt(model = {}, levels = 10) {
  for (let n = 1; n <= levels; n++) {
    if (floorStrength(n - 1, model) >= 1) return n;
  }
  return null;
}

// ***** M7 — moving the budget off count, onto strength and grouping ***** //
// docs/backlog.md M7. CV of challenge falls with depth (measured 0.944 per
// floor) because difficulty grows entirely by CREATURE COUNT, and the CV of
// a sum of n independent draws is CV_single / sqrt(n) — more draws dilutes,
// however variable each draw is individually. Nothing per-creature can fix
// a per-n problem.
//
// ONE FLAG, THREE LEVERS, moved together because they share one budget and
// cannot be attributed apart: move one and the other two must move to hold
// challenge fixed.
//
// ADOPTED (docs/backlog.md M7, Review 2): CV moved 0.941 → 0.986 per floor,
// about 3σ and within one standard error of the ≥1.00 target; challenge/power
// and finishes both held their bands. Review 2 also recorded that the probe
// under-reads clustering's effect on a competent player — challenge read
// unchanged while real-bot finishes fell 11.3 points — so "challenge held"
// describes the instrument, not a claim that difficulty is unchanged.
export const DIFFICULTY_REBALANCED = true;

// Slower than MONSTER_GROWTH (1.3), cutting the dilution at its source —
// fewer draws means less to dilute with.
//
// RAISED for M12 (docs/backlog.md, "fill the floors back up"): floor 10 held
// only 7 creatures on a 32x32 map at 1.15, the price of fighting CV decay
// paid without anyone looking at what it did to the floor's population. CV
// depends on DRAWS, not creature count — M10's per-member quota check is
// what actually holds effective cluster size down (measured ~1.7-2.2
// regardless of CLUSTER_SIZE, see below), so raising count here does not
// undo M7's CV win the way raising it at MONSTER_GROWTH's own 1.3 would.
// 1.22 is the ceiling the EXISTING budget test allows — see
// STRENGTH_GROWTH_REBALANCED's own comment for why growth*strength^2.356
// staying within 15% of MONSTER_GROWTH is a real constraint, not a
// suggestion, and 1.22 sits at 10% over, the edge of the band this was
// already being held to.
export const MONSTER_GROWTH_REBALANCED = 1.22;

// Faster than STRENGTH_GROWTH (1.0, i.e. flat), replacing the difficulty
// count no longer supplies. Sized against the CORRECTED exponent from the
// archived count->strength sweep — 2.356, not 2, because strength indexes
// an 11-row table whose mass runs 0 to 108, not a linear scale. Using 2
// here would overshoot the budget the same way it did in that sweep.
export const STRENGTH_GROWTH_REBALANCED = 1.07;

// How many creatures share one placement anchor. 1 means every monster
// still draws its own independent position — byte-identical to no
// clustering at all, which is what the flag being off resolves to.
//
// This is the lever the archived sweep could not reach: pure count/strength
// reallocation still has the CV falling at every point on the budget that
// leaves the floor populated (only the degenerate count-1.00 case, two
// creatures forever, flips the sign). Clustering cuts the number of
// independent draws WITHOUT emptying the floor — twelve creatures in four
// clusters are four draws with twelve bodies, not twelve.
//
// RAISED for M12, alongside MONSTER_GROWTH_REBALANCED — but MEASURED, not
// assumed, to matter less than expected: M10's per-member quota check
// (spawn.js) cuts a cluster the moment the zone quota flips, and that check
// fires on the roster's MASS BALANCE, not on how large CLUSTER_SIZE allows
// a cluster to grow. Swept 6/12/20 at the shipped growth and got IDENTICAL
// effective cluster sizes at every floor — the constant stopped being the
// binding limit well before 6. Raised anyway, to 10, so a floor with more
// creatures still has room for genuinely large clusters if the roster or
// the quota's own shape changes later; it is not doing the compensating
// work the item's own theory expected it to.
export const CLUSTER_SIZE = 10;

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

// How wide this floor's shared roll is. Zero means every floor comes out at
// its nominal size, which is what every measurement before this assumed.
//
// Rises with depth ON PURPOSE, and it is the only thing here that does. The
// count law already makes deep floors bigger; this makes them less certain,
// which the count law by itself makes strictly worse (see balance.js).
export function floorSpread(level, model = {}) {
  const base = model.spreadBase ?? FLOOR_SPREAD_BASE;
  const perLevel = model.spreadPerLevel ?? FLOOR_SPREAD_PER_LEVEL;
  const cap = model.spreadCap ?? FLOOR_SPREAD_CAP;
  return Math.max(0, Math.min(cap, base + perLevel * Math.max(0, level)));
}

// ***** M3 — an out-of-depth tail, docs/backlog.md M3 ("the gap M7 left") ***** //
// Zero on floor 1 by design (nothing is out of depth yet at the very top),
// rising with depth and capped well under certainty — see balance.js for
// why this has to stay rare. `level` here is 0-based, matching floorStrength
// and floorSpread above.
export function outOfDepthChanceAt(level, model = {}) {
  const base = model.outOfDepthChanceBase ?? OUT_OF_DEPTH_CHANCE_BASE;
  const perLevel = model.outOfDepthChancePerLevel ?? OUT_OF_DEPTH_CHANCE_PER_LEVEL;
  const cap = model.outOfDepthChanceCap ?? OUT_OF_DEPTH_CHANCE_CAP;
  return Math.max(0, Math.min(cap, base + perLevel * Math.max(0, level)));
}

// ***** M13 — the tier floor rises with depth, docs/backlog.md M13 ***** //
// What SHARE of the floor's own ceiling INDEX the minimum tier climbs to.
// A share rather than an absolute index keeps the floor at or under the
// ceiling by construction at every depth, however far `difficultyScale`
// itself has climbed — no clamping needed to keep floor <= ceiling.
export function tierFloorShare(level, model = {}) {
  const base = model.tierFloorShareBase ?? TIER_FLOOR_SHARE_BASE;
  const perLevel = model.tierFloorSharePerLevel ?? TIER_FLOOR_SHARE_PER_LEVEL;
  const cap = model.tierFloorShareCap ?? TIER_FLOOR_SHARE_CAP;
  return Math.max(0, Math.min(cap, base + perLevel * Math.max(0, level)));
}

// Everything the generator needs for floor N, zero-based.
//
// With DIFFICULTY_REBALANCED off, this is byte-identical to before M7: the
// three lines below all read the ORIGINAL constants (MONSTER_GROWTH,
// STRENGTH_GROWTH's own default, clusterSize 1). The flag is the only
// branch in this function, alongside OUT_OF_DEPTH_TAIL for M3. M13's
// `tierFloorShare` has no flag — it is a structural fix, on unconditionally.
export function floorParams(level) {
  const growth = DIFFICULTY_REBALANCED ? MONSTER_GROWTH_REBALANCED : MONSTER_GROWTH;
  const strengthGrowth = DIFFICULTY_REBALANCED ? STRENGTH_GROWTH_REBALANCED : STRENGTH_GROWTH;
  const clusterSize = DIFFICULTY_REBALANCED ? CLUSTER_SIZE : 1;
  const monsters = monstersAt(MONSTERS_BASE, growth, Math.max(0, level));
  return {
    level,
    monsters,
    monsterSpread: floorSpread(level),
    chests: CHESTS_PER_FLOOR,
    difficultyScale: floorStrength(level, { strengthGrowth }),
    clusterSize,
    tierFloorShare: tierFloorShare(level),
    // Zero when the flag is off, so spawn.js skips the roll entirely rather
    // than drawing a `drawChance(..., 0)` that always fails — a draw of any
    // kind, even one that never fires, would still perturb the RNG stream.
    outOfDepthChance: OUT_OF_DEPTH_TAIL ? outOfDepthChanceAt(level) : 0,
    // M15. Flat, like CHESTS_PER_FLOOR above — no per-level growth asked
    // for, just a fixed "how close counts as guarded".
    chestGuardRadius: CHEST_GUARD_RADIUS,
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
  strengthGrowth: STRENGTH_GROWTH,
  // M7. clusterSize 1 is no clustering — every monster still an independent
  // draw, same as the shipped default (DIFFICULTY_REBALANCED off).
  clusterSize: 1,
  // M3. Both 0 by default — off means off here too, same shape as
  // `monstersPerLevel`: a page opts in by setting `outOfDepthChancePerLevel`
  // above 0, rather than this sandbox silently carrying the shipped rate.
  outOfDepthChanceBase: 0,
  outOfDepthChancePerLevel: 0,
  outOfDepthChanceCap: OUT_OF_DEPTH_CHANCE_CAP,
  // M13. Unconditional — a page opts OUT by setting these to 0, not in, the
  // same way spread/spine dials above already work.
  tierFloorShareBase: TIER_FLOOR_SHARE_BASE,
  tierFloorSharePerLevel: TIER_FLOOR_SHARE_PER_LEVEL,
  tierFloorShareCap: TIER_FLOOR_SHARE_CAP,
  // M15. Flat, same shape as `chests` above.
  chestGuardRadius: CHEST_GUARD_RADIUS,
  dropChance: DROP_CHANCE,
  weaponScarcity: SCARCITY,
  armourScarcity: SCARCITY,
  potionScarcity: SCARCITY,
  levels: 10,

  // Map design (docs/map-design.md). Mirrored from balance.js so the lab
  // page can show and sweep them; populate() would fall back to the same
  // values if these were left out.
  spreadBase: FLOOR_SPREAD_BASE,
  spreadPerLevel: FLOOR_SPREAD_PER_LEVEL,
  spreadCap: FLOOR_SPREAD_CAP,
  spineThreatShare: SPINE_THREAT_SHARE,
  sideRoomDepthBonus: SIDE_ROOM_DEPTH_BONUS,
  sideChestBias: SIDE_CHEST_BIAS,
  sideActivationCap: SIDE_ACTIVATION_CAP,
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
      monsterSpread: floorSpread(level - 1, m),
      chests: Math.max(0, Math.round(m.chests + m.chestsPerMonster * monsters)),
      difficultyScale: floorStrength(level - 1, m),
      clusterSize: m.clusterSize,
      tierFloorShare: tierFloorShare(level - 1, m),
      outOfDepthChance: outOfDepthChanceAt(level - 1, m),
      chestGuardRadius: m.chestGuardRadius,
      dropChance: m.dropChance,
      weaponScarcity: m.weaponScarcity,
      armourScarcity: m.armourScarcity,
      potionScarcity: m.potionScarcity,
      // Map-design dials. Undefined falls through to balance.js in populate.
      sideActivationCap: m.sideActivationCap,
      sideRoomDepthBonus: m.sideRoomDepthBonus,
      spineThreatShare: m.spineThreatShare,
      sideChestBias: m.sideChestBias,
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

// ***** M11 — floor n+1 is never easier than floor n ***** //
// docs/backlog.md M11. EXACT expected value, not a sample: spawn.js draws a
// cluster's tier from `depth * scale` where `depth` ranges roughly uniformly
// over a floor's tiles, so the index a real floor lands on is `floor(depth *
// scale * 10)` — a step function of `depth`. Integrating that exactly, rather
// than sampling it, means this can never itself be the source of a false
// "it dropped" — the closed form has no sampling noise to produce one.
// `minIndex` folds in M13's tier floor — spawn.js draws the slot from the
// natural centre-index spread and THEN clamps the result up to minIndex
// (clamping the centre alone is not enough: `monsterWeightsAround`'s own
// -2 offset still reaches slot 0 from a centre as high as 2). `massAt`
// mirrors that exactly — clamp each slot in the blend, not the centre —
// so at minIndex 0 it reduces to exactly the pre-M13 integral.
function expectedMonsterMass(scale, minIndex = 0) {
  const mass = (t) => t.hp * Math.max(0, t.xp - 1);
  const massAt = (index) => {
    const entries = monsterWeightsAround(index);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    return entries.reduce(
      (sum, [slot, w]) => sum + w * mass(MONSTER_TABLE[Math.max(slot, minIndex)]), 0,
    ) / total;
  };

  const top = MONSTER_TABLE.length - 1;
  if (scale <= 0) return massAt(0);

  // depth ~ Uniform(0, 1); index(depth) = floor(depth * denom), denom = scale
  // * top. Each full index below the ceiling covers a bucket of width
  // 1/denom; the top index absorbs whatever width is left over.
  const denom = scale * top;
  const ceiling = Math.min(top, Math.floor(denom));
  let total = 0;
  for (let index = 0; index < ceiling; index++) {
    total += (1 / denom) * massAt(index);
  }
  total += (1 - ceiling / denom) * massAt(ceiling);
  return total;
}

// Expected total roster mass for floor N (0-based), from the SHIPPED
// generation parameters — `floorParams`, not a swept model, so this always
// describes the game that actually runs.
export function expectedFloorMass(level) {
  const p = floorParams(level);
  const ceilingIndex = Math.floor(p.difficultyScale * (MONSTER_TABLE.length - 1));
  const minIndex = Math.floor(p.tierFloorShare * ceilingIndex);
  return p.monsters * expectedMonsterMass(p.difficultyScale, minIndex);
}
