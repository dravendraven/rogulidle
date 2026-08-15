// One coherent difficulty curve: every per-floor number falls out of DEPTH
// through the functions here, and a harder dungeon tier is `makeFloorPlan`
// handed a modified model — never a parallel system.
//
// The dial of dials is the creature COUNT. Clearing cost tracks
// `sum of hp × (xp − 1)` almost exactly, so count scales demand linearly —
// the property a dial wants — while individual strength scales it
// quadratically. Growth is exponential, not additive: `2 + 2N` and
// `2 × 1.3^N` land in the same place, but the additive form front-loads its
// jumps exactly where the hero is weakest (measured: all attrition sat in
// the first three floors).

import {
  CHEST_GUARD_RADIUS, CHEST_LOOT_CHANCE, CORRIDOR_MIN, corridorRange, EARLY_TIER_CUT,
  FLOOR_SPREAD_CAP, FLOOR_SPREAD_PER_LEVEL, MAP_DUG_PERCENTAGE, MAP_SIZE,
  HUB_BRANCHES, HUB_EVERY, HUB_RINGS,
  ROOM_BIAS, ROOM_HEIGHT, ROOM_SCALE, ROOM_WIDTH, roomRange,
  MONSTER_DROP_CHANCE, MONSTER_TABLE,
  OUT_OF_DEPTH_CHANCE_CAP, OUT_OF_DEPTH_CHANCE_PER_LEVEL,
  SHRINE_DISTANCE_SHARE,
  SIDE_CHEST_BIAS, SIDE_ROOM_DEPTH_BONUS, SPINE_THREAT_SHARE,
  TIER_FLOOR_CAP, TIER_FLOOR_PER_LEVEL, TIER_SLACK_CAP, TIER_SLACK_PER_LEVEL,
  VAULT_LEVEL,
} from './balance.js';
import { monsterWeightsAround } from './spawn.js';

// GUESS — creatures on floor 1. Floor N holds `base × growth^(N-1)`.
export const MONSTERS_BASE = 4;

// GUESS — solved, not swept: `(8/4)^(1/9)` lands floor 10 at 8 creatures
// from a floor-1 base of 4. Slow on purpose — strength carries most of the
// climb (below), because count growth dilutes the floor's own variance.
export const MONSTER_GROWTH = 1.0801;

// GUESS — FLAT, not per-monster. Loot tied to the creature count grows as
// fast as threat, and since the hero ACCUMULATES while each floor's threat
// is spent once, the hero wins (measured: capacity 118 against a starting
// 10). Flat chests are what makes threat outpace supply.
export const CHESTS_PER_FLOOR = 6;

// GUESS — how far up the monster table the deepest corner of floor 1
// reaches, as a 0..1 share. The strength curve's base.
export const MONSTER_STRENGTH = 0.26;

// GUESS — solved against the anchored floor 10: the ceiling climbs so the
// product of count growth and strength growth holds the calibrated ~1.3
// cost climb per floor (the budget the tests read from the generated mass
// itself).
export const STRENGTH_GROWTH = 1.1452;

// GUESS — how many creatures share one placement anchor AND one tier draw.
// Grouping is what keeps deep floors uncertain: twelve creatures in four
// clusters are four draws with twelve bodies, not twelve draws.
export const CLUSTER_SIZE = 10;

// GUESS — scarcity per item kind: 1 draw in S holds something of the kind,
// the rest come up empty. Armour and potion are chest kinds, weapon is the
// creature kind. Solved for the owner's target (a chest holds something
// half the time, 25% potion / 25% armour) — note the target is a product of
// TWO gates, this one and the positional `hasLoot` roll, so "set it to 2
// for 50%" is the mistake these numbers exist to prevent.
export const ARMOUR_SCARCITY = 1.32;
export const POTION_SCARCITY = 1.32;
export const WEAPON_SCARCITY = 4;

// The two chest numbers above stopped being a RATE at M46 and became a
// RATIO — `allowEmpty: false` for chests means only their proportion
// survives, so 1.32/1.32 and 5/5 are the same game and moving one alone
// only tilts which of the two kinds comes out. The panel still offered
// them as two "1 em S" sliders, which promised a scarcity neither of them
// can produce.
//
// So the MODEL carries the one number that is actually live: the potion's
// share of a filled chest. 0 is all shield, 1 is all potion, 0.5 is the
// even split the shipped pair already produced.
//
// It is not a new parameter — it is the two old ones with their dead
// degree of freedom removed. `chestScarcity` is the single place the pair
// is rebuilt, so nothing downstream learns a new shape: `itemWeights`
// still takes a per-kind scarcity, which is right, because the weapon side
// IS still a rate.
export const CHEST_MIX = ARMOUR_SCARCITY / (ARMOUR_SCARCITY + POTION_SCARCITY);

// Away from 0 and 1 so neither kind can divide by zero on the way to the
// pool — the ends of the slider mean "almost never", not "never".
const MIX_EDGE = 0.02;

// NOTE THE CROSS: a kind's weight is 1/scarcity, so the potion's share of
// the draw is `armour / (armour + potion)`. Feeding the mix straight into
// `potion` would invert the slider.
export function chestScarcity(mix = CHEST_MIX) {
  const share = Math.min(1 - MIX_EDGE, Math.max(MIX_EDGE, mix));
  return { armour: share, potion: 1 - share };
}

// What the deepest corner of floor N reaches up the table, 0-based level.
// Clamped at 1, where the table runs out — `saturatedAt` reports the floor
// that happens on, so a sweep cannot quietly measure a dead ramp.
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

// How wide this floor's shared count roll is.
export function floorSpread(step, model = {}) {
  const perLevel = model.spreadPerLevel ?? FLOOR_SPREAD_PER_LEVEL;
  const cap = model.spreadCap ?? FLOOR_SPREAD_CAP;
  const start = model.spreadStart ?? 0;
  return Math.max(0, Math.min(cap, start + perLevel * Math.max(0, step)));
}

// Chance of the rare out-of-depth reskin. Zero on floor 1 by construction.
export function outOfDepthChanceAt(step, model = {}) {
  const perLevel = model.outOfDepthChancePerLevel ?? OUT_OF_DEPTH_CHANCE_PER_LEVEL;
  const cap = model.outOfDepthChanceCap ?? OUT_OF_DEPTH_CHANCE_CAP;
  const start = model.outOfDepthChanceStart ?? 0;
  return Math.max(0, Math.min(cap, start + perLevel * Math.max(0, step)));
}

// The tier band's lower clamp: what SHARE of the floor's own ceiling index
// the minimum tier climbs to. A share keeps floor <= ceiling by
// construction at every depth.
export function tierFloorShare(step, model = {}) {
  const perLevel = model.tierFloorPerLevel ?? TIER_FLOOR_PER_LEVEL;
  const cap = model.tierFloorCap ?? TIER_FLOOR_CAP;
  const start = model.tierFloorStart ?? 0;
  return Math.max(0, Math.min(cap, start + perLevel * Math.max(0, step)));
}

// The tier band's upper clamp, in WHOLE TABLE ROWS relative to the floor's
// ceiling index: negative on floor 1 (the early cut), 0 through the middle,
// +1 from floor 8. One signed number where three share families used to be
// — two of them were literally the same expression with different constants.
export function tierSlack(step, model = {}) {
  const perLevel = model.tierSlackPerLevel ?? TIER_SLACK_PER_LEVEL;
  const cap = model.tierSlackCap ?? TIER_SLACK_CAP;
  const start = model.tierSlackStart ?? 0;
  const earlyCut = model.earlyTierCut ?? EARLY_TIER_CUT;
  const above = Math.floor(Math.min(cap, start + perLevel * Math.max(0, step)) * 2);
  // The tutorial discount lands on the FIRST FLOOR OF THE SEGMENT — floor 1
  // when there is only one, which is the shipped game. A segment started
  // deeper opens on 0 (see SEGMENT_RESETS), so it does not hand out a second
  // tutorial half way down.
  return above - (step === 0 ? earlyCut : 0);
}

// Creature count on a floor, `step` floors below the first. At least one
// creature always, or a "floor" is just a walk.
// WHICH GENERATOR DRAWS FLOOR `floor` — 1-based, the number the player
// sees. Every Nth floor is a hub and the rest are ROT's accretion; 0 is
// never. One place, so `floorParams` and `makeFloorPlan` cannot disagree
// about which floors are which, and the one place a third layout is added.
export function layoutFor(floor, every = HUB_EVERY) {
  return every > 0 && floor % every === 0 ? 'hub' : 'digger';
}

export function monstersAt(base, growth, step) {
  return Math.max(1, Math.round(base * Math.pow(growth, step)));
}

// Everything the generator needs for floor N, ZERO-based.
export function floorParams(level) {
  return {
    level,
    monsters: monstersAt(MONSTERS_BASE, MONSTER_GROWTH, Math.max(0, level)),
    monsterSpread: floorSpread(level),
    chests: CHESTS_PER_FLOOR,
    difficultyScale: floorStrength(level),
    clusterSize: CLUSTER_SIZE,
    tierFloorShare: tierFloorShare(level),
    tierSlack: tierSlack(level),
    outOfDepthChance: outOfDepthChanceAt(level),
    chestGuardRadius: CHEST_GUARD_RADIUS,
    dropChance: MONSTER_DROP_CHANCE,
    weaponScarcity: WEAPON_SCARCITY,
    armourScarcity: ARMOUR_SCARCITY,
    potionScarcity: POTION_SCARCITY,
    chestLootChance: CHEST_LOOT_CHANCE,
    dugPercentage: MAP_DUG_PERCENTAGE,
    roomBias: ROOM_BIAS,
    corridorLength: corridorRange(),
    mapSize: MAP_SIZE,
    layout: layoutFor(level + 1),
    hubBranches: HUB_BRANCHES,
    hubRings: HUB_RINGS,
    roomWidth: roomRange(ROOM_WIDTH),
    roomHeight: roomRange(ROOM_HEIGHT),
    shrineDistanceShare: SHRINE_DISTANCE_SHARE,
    // M43 — which floor carries the authored room, travelling as a plan
    // field like everything else so a sweep can turn it off without editing
    // balance.js. Not derived from `level`: it names a floor, and spawn.js
    // compares it against the floor it is building.
    vaultLevel: VAULT_LEVEL,
  };
}

// The same model with every dial turned into a field. THIS is the tier
// mechanism: a harder dungeon is `makeFloorPlan({ ...overrides })`, the
// same curve with other constants — never a second system. `floorParams`
// above stays the single source of truth for the game that actually runs.
export const DEFAULT_MODEL = {
  monstersBase: MONSTERS_BASE,
  monsterGrowth: MONSTER_GROWTH,
  chests: CHESTS_PER_FLOOR,
  strength: MONSTER_STRENGTH,
  strengthGrowth: STRENGTH_GROWTH,
  clusterSize: CLUSTER_SIZE,
  spreadPerLevel: FLOOR_SPREAD_PER_LEVEL,
  spreadCap: FLOOR_SPREAD_CAP,
  outOfDepthChancePerLevel: OUT_OF_DEPTH_CHANCE_PER_LEVEL,
  outOfDepthChanceCap: OUT_OF_DEPTH_CHANCE_CAP,
  tierFloorPerLevel: TIER_FLOOR_PER_LEVEL,
  tierFloorCap: TIER_FLOOR_CAP,
  tierSlackPerLevel: TIER_SLACK_PER_LEVEL,
  tierSlackCap: TIER_SLACK_CAP,
  earlyTierCut: EARLY_TIER_CUT,
  // WHERE EACH RATE FAMILY STARTS, so a curve re-anchored part way down the
  // dungeon continues instead of restarting at zero. 0 on the first segment
  // is the shipped game — the four families always counted from nothing,
  // because there was only ever one anchor to count from.
  //
  // This makes all six growth families the same shape: a starting VALUE and
  // a rate. `monstersBase`/`monsterGrowth` was already that pair; these four
  // were the rate alone with the start left implicit.
  tierFloorStart: 0,
  tierSlackStart: 0,
  outOfDepthChanceStart: 0,
  spreadStart: 0,
  chestGuardRadius: CHEST_GUARD_RADIUS,
  dropChance: MONSTER_DROP_CHANCE,
  weaponScarcity: WEAPON_SCARCITY,
  // ONE number where there were two: the potion's share of a filled chest.
  // See CHEST_MIX above for why the pair could not stay.
  chestMix: CHEST_MIX,
  // Whether a chest holds anything at all. This is the gate players were
  // reaching for when they moved the scarcity sliders, and it was the one
  // number the panel did not offer.
  chestLootChance: CHEST_LOOT_CHANCE,
  levels: 10,
  spineThreatShare: SPINE_THREAT_SHARE,
  sideRoomDepthBonus: SIDE_ROOM_DEPTH_BONUS,
  sideChestBias: SIDE_CHEST_BIAS,
  // The map's own SHAPE, as opposed to what gets placed on it. Both were
  // already read by the generator — dugPercentage by mapgen.js through
  // game.js's passthrough, shrineDistanceShare by spawn.js — but neither
  // travelled in the model, so the lab could not reach them.
  dugPercentage: MAP_DUG_PERCENTAGE,
  // The other half of the map's shape: dugPercentage says HOW MUCH is dug,
  // these two say into what. `corridorMin` is the scalar the lab moves; the
  // pair the generator wants is derived from it in makeFloorPlan below, so
  // the span lives in balance.js and nowhere else.
  roomBias: ROOM_BIAS,
  corridorMin: CORRIDOR_MIN,
  // How much floor there is, and how finely it is cut. These two are the
  // pair that decides how many DESTINATIONS a floor offers — measured, the
  // scale moves that count further than dugPercentage and roomBias
  // together, because those two argue about area and this one divides it.
  mapSize: MAP_SIZE,
  roomScale: ROOM_SCALE,
  // Which generator draws the floor, and the hub's own two numbers.
  hubEvery: HUB_EVERY,
  hubBranches: HUB_BRANCHES,
  hubRings: HUB_RINGS,
  shrineDistanceShare: SHRINE_DISTANCE_SHARE,
  vaultLevel: VAULT_LEVEL,
  vaultChestItems: undefined,
  vaultBoss: undefined,
};

// Turns a model into the `floorPlan(level)` function the dungeon wants.
// Level is 1-based here, matching dungeon.js rather than floorParams.
// FIELDS THAT BELONG TO THE RUN, not to a floor. A segment cannot hold a
// different answer for these and mean anything by it: `levels` is how long
// the descent is, `vaultLevel` already NAMES a floor, and the two vault
// contents only exist on that floor. Read from the model's root whichever
// segment is active.
const RUN_WIDE = ['levels', 'vaultLevel', 'vaultChestItems', 'vaultBoss'];

// …and fields a NEW segment does not inherit. `earlyTierCut` is the
// tutorial discount: it belongs to the start of the game, not to the start
// of every stretch, so a segment begun half way down opens without one.
const SEGMENT_RESETS = { earlyTierCut: 0 };

// The curve, in pieces. `model.floors` is a list of anchors —
// `[{ from: 1, ...dials }, { from: 4, ...dials }]` — and a floor is drawn by
// whichever anchor is the last one at or above it, with its own dials and
// its own step count.
//
// A MODEL WITH NO `floors` IS ONE SEGMENT FROM FLOOR 1, which is the shipped
// game and every dial-overrides.json written before this existed. That is
// why the shape is an optional field rather than a new argument: nothing
// that already works has to learn anything.
export function segmentsOf(model = {}) {
  const list = Array.isArray(model.floors) && model.floors.length
    ? model.floors
    : [{ from: 1 }];
  return list
    .map((seg, i) => ({
      ...DEFAULT_MODEL,
      ...model,
      // A segment that is not the first drops what belongs to the start of
      // the GAME rather than to the start of a stretch — unless it names the
      // field itself, since an explicit value always wins over a reset.
      ...(i === 0 ? {} : SEGMENT_RESETS),
      ...seg,
      from: Math.max(1, seg.from ?? 1),
    }))
    .sort((a, b) => a.from - b.from);
}

// Which anchor draws `level`, and how many floors past its own start that
// is. The step is what every growth formula counts in — floor 1 of a
// segment is step 0, exactly as floor 1 of the dungeon always was.
export function segmentAt(level, segments) {
  let active = segments[0];
  for (const seg of segments) if (seg.from <= level) active = seg;
  return { seg: active, step: Math.max(0, level - active.from) };
}

// WHAT AN ANCHOR STARTED AT `floor` WOULD HAVE TO HOLD to continue the curve
// that already runs through it — the dial values, not the plan's output.
//
// This is what the Lab shows on a floor that is not an anchor (greyed out,
// the numbers the current curve produces there) and what it stores the
// moment you make one. It lives here rather than in the panel because
// recovering a starting value from a plan is not possible from outside:
// `tierSlack` leaves as whole table ROWS, and the share it came from cannot
// be read back off it.
//
// EXACT for the five that carry a real number. The creature count drifts by
// up to one, because it is a whole number — see docs/map-design.md.
export function anchorAt(model = {}, floor = 1) {
  const segments = segmentsOf(model);
  const { seg, step } = segmentAt(floor, segments);
  const inherited = { ...seg };
  delete inherited.from;
  for (const key of RUN_WIDE) delete inherited[key];

  return {
    ...inherited,
    ...(floor > 1 ? SEGMENT_RESETS : {}),
    // The six growth families, re-based on this floor.
    monstersBase: monstersAt(seg.monstersBase, seg.monsterGrowth, step),
    strength: floorStrength(step, seg),
    tierFloorStart: tierFloorShare(step, seg),
    // NOT the plan's `tierSlack`, which is rows and has the tutorial cut
    // already taken off it. The share is what a segment carries.
    tierSlackStart: Math.max(0, Math.min(
      seg.tierSlackCap, (seg.tierSlackStart ?? 0) + seg.tierSlackPerLevel * step,
    )),
    outOfDepthChanceStart: outOfDepthChanceAt(step, seg),
    spreadStart: floorSpread(step, seg),
  };
}

export function makeFloorPlan(model = {}) {
  const root = { ...DEFAULT_MODEL, ...model };
  const segments = segmentsOf(model);
  // Everything below asks for the floor's own segment; the run-wide four
  // come off the root regardless.
  const at = (level) => {
    const { seg, step } = segmentAt(level, segments);
    const m = { ...seg };
    for (const key of RUN_WIDE) m[key] = root[key];
    return { m, step };
  };

  // HOW MUCH OF THE RUN'S THREAT IS STILL IN FRONT OF THIS FLOOR, as a share
  // of the whole descent — 1 on floor 1, and falling. One number, computed
  // once from THIS model rather than from the code constants, because the
  // two are different games (see `massOfPlan`).
  //
  // It exists so a decision about spending a once-per-run resource can be
  // made against what the run still demands, instead of against a floor
  // number somebody picked. The mass is heavily back-loaded, so this stays
  // near 1 for the first half of the descent and then falls away — which is
  // the honest shape of the danger, not a defect in the measure.
  const plainPlan = (level) => {
    const { m, step } = at(level);
    return {
      monsters: monstersAt(m.monstersBase, m.monsterGrowth, step),
      difficultyScale: floorStrength(step, m),
      tierFloorShare: tierFloorShare(step, m),
      tierSlack: tierSlack(step, m),
    };
  };
  const levels = root.levels ?? 10;
  const masses = [];
  for (let i = 1; i <= levels; i++) masses.push(massOfPlan(plainPlan(i)));
  const total = masses.reduce((a, b) => a + b, 0) || 1;
  const aheadOf = (level) => masses.slice(Math.max(0, level - 1))
    .reduce((a, b) => a + b, 0) / total;

  // The share of FLOORS still ahead, and it is not a poorer version of
  // `threatAhead` — it is the other half of the same question. Threat is
  // heavily back-loaded, so `threatAhead` sits near 1 for the whole first
  // half of the descent and can only tell floor 8 from floor 10. Floors are
  // uniform by construction, so this separates floor 2 from floor 5, which
  // is exactly where the other one is blind.
  //
  // Which to use is a question about the decision, not about the measure: a
  // hero saving something for "when the dungeon still owes me everything"
  // wants the threat; one saving it for "later in the run" wants the floors.
  const floorsAheadOf = (level) => (levels - level + 1) / levels;

  return (level) => {
    const { m, step } = at(level);
    return {
    level,
    threatAhead: aheadOf(level),
    floorsAhead: floorsAheadOf(level),
    monsters: monstersAt(m.monstersBase, m.monsterGrowth, step),
    monsterSpread: floorSpread(step, m),
    chests: m.chests,
    difficultyScale: floorStrength(step, m),
    clusterSize: m.clusterSize,
    tierFloorShare: tierFloorShare(step, m),
    tierSlack: tierSlack(step, m),
    outOfDepthChance: outOfDepthChanceAt(step, m),
    chestGuardRadius: m.chestGuardRadius,
    dropChance: m.dropChance,
    weaponScarcity: m.weaponScarcity,
    // Rebuilt into the per-kind pair the engine wants, in one place.
    armourScarcity: chestScarcity(m.chestMix).armour,
    potionScarcity: chestScarcity(m.chestMix).potion,
    chestLootChance: m.chestLootChance,
    sideRoomDepthBonus: m.sideRoomDepthBonus,
    spineThreatShare: m.spineThreatShare,
    sideChestBias: m.sideChestBias,
    dugPercentage: m.dugPercentage,
    roomBias: m.roomBias,
    corridorLength: corridorRange(m.corridorMin),
    mapSize: m.mapSize,
    layout: layoutFor(level, m.hubEvery),
    hubBranches: m.hubBranches,
    hubRings: m.hubRings,
    roomWidth: roomRange(ROOM_WIDTH, m.roomScale),
    roomHeight: roomRange(ROOM_HEIGHT, m.roomScale),
    shrineDistanceShare: m.shrineDistanceShare,
    vaultLevel: m.vaultLevel,
    vaultChestItems: m.vaultChestItems,
    vaultBoss: m.vaultBoss,
    };
  };
}

// For the single-floor spectator, which still thinks in a 0..1 slider.
export const DIAL_MAX_LEVEL = 9;

export function difficultyToParams(dial) {
  const d = Math.max(0, Math.min(1, dial));
  return floorParams(Math.round(d * DIAL_MAX_LEVEL));
}

// What a generated floor actually demands, in the currency that predicts
// duel cost.
// M43 — the vault's occupant is excluded, same rule as spineShare(). This
// function's whole job is to say what a floor DEMANDS, and a creature the
// hero can walk past demands nothing. Including it would also break the
// monotonic-mass guarantee below, since one authored creature outweighs
// every ordinary one on its floor put together.
export function threatMass(state) {
  return state.monsters
    .filter((m) => !m.dead && !m.vault)
    .reduce((sum, m) => sum + m.hpMax * Math.max(0, m.xp - 1), 0);
}

// ***** floor n+1 is never easier than floor n (M11) ***** //
// EXACT expected value, not a sample: spawn.js draws a cluster's tier from
// `depth × scale` with depth roughly uniform over the floor's tiles, then
// clamps the drawn slot into the band. Integrating that exactly means this
// can never itself produce a false "it dropped" — no sampling noise.
function expectedMonsterMass(scale, minIndex = 0, maxIndex = MONSTER_TABLE.length - 1) {
  const mass = (t) => t.hp * Math.max(0, t.xp - 1);
  const massAt = (index) => {
    const entries = monsterWeightsAround(index);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    return entries.reduce(
      (sum, [slot, w]) => sum + w * mass(MONSTER_TABLE[Math.min(maxIndex, Math.max(slot, minIndex))]), 0,
    ) / total;
  };

  const top = MONSTER_TABLE.length - 1;
  if (scale <= 0) return massAt(0);

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
// generation parameters — so this always describes the game that runs.
// Mirrors spawn.js's band arithmetic exactly; one source of truth for what
// the band means is `floorParams` feeding both.
// Takes a PLAN, so it describes whatever model produced that plan. The
// version below that takes a level number reads the code constants, which
// are not the shipped game once dial-overrides.json says otherwise — this is
// the half a caller with a model should use.
export function massOfPlan(p) {
  const ceilingIndex = Math.floor(p.difficultyScale * (MONSTER_TABLE.length - 1));
  const minIndex = Math.floor(p.tierFloorShare * ceilingIndex);
  const maxIndex = Math.max(minIndex,
    Math.min(MONSTER_TABLE.length - 1, ceilingIndex + p.tierSlack));
  return p.monsters * expectedMonsterMass(p.difficultyScale, minIndex, maxIndex);
}

export function expectedFloorMass(level) {
  return massOfPlan(floorParams(level));
}
