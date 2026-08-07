// The observed ruler — challenge, reward, power and buffer measured by
// actually playing the game, not by summing a duel model over a roster.
//
// WHY THIS EXISTS. `campaignCost` (src/bot/duel.js) sums clean one-on-one
// duels. It was built to answer the bot's question — "which fight do I take
// now" — which is genuinely sequential. It got reused to answer "what does
// this floor cost", which is not sequential: creatures gang up and land
// blows the same turn, and a sum cannot see that. A multiplicative crowd
// correction was tried and does not fix this either, because the next
// design work is CLUSTERING creatures on the map without changing how many
// there are — and a correction that reads only the count is blind to that
// by construction. See docs/curve-shape.md for the full argument.
//
// The fix is to stop using a model as the ruler. Two probes clear a floor
// for real and the difference between them — not a formula — is read off.
//
// THE TWO PROBES, and they differ in exactly one thing:
//
//   Sonda A — clears the whole floor, picks up nothing.
//   Sonda B — clears the whole floor, picks up whatever is in the way.
//
// Both run the IDENTICAL movement policy below: kill every known monster,
// explore every frontier, then head for the shrine. Loot is never a
// movement target for either one — B does not detour for it, so the only
// difference between the two runs is whether stepping onto an item's tile
// keeps it. That is `noPickup` (src/sim/step.js), a one-line engine toggle,
// off by default, that only Sonda A turns on.
//
// FROZEN ON PURPOSE. This file must never import anything from src/bot/ and
// must never be "the bot with options off" — seeing the two as
// interchangeable is exactly the coupling that made the modelled ruler
// unable to survive the bot's own tuning. A copy, not a configuration. The
// policy here is deliberately simple and is not meant to play well; it is a
// calibration weight, not an athlete, and should stay dumb even after the
// bot gets smarter.
//
// A few tiny statistics helpers (summarise, growthOf) and formulas
// (heroPower, heroBuffer) are duplicated here rather than imported from
// analysis/shape.js, because that file imports src/bot/bot.js — importing
// it would drag a bot dependency into a file whose entire point is to have
// none.
//
// WHAT THIS RULER CANNOT MEASURE. It fixes exactly the count-vs-clustering
// blindness described above for CHALLENGE — challenge and reward are read
// off real damage, so they already reflect however the current map places
// creatures. What they do NOT reflect is a CHANGE in clustering while count
// stays fixed. Under clustering, cost and lethality diverge: scattered or
// grouped, the same creatures land roughly the same total blows over a
// floor — what changes is how concentrated those blows are in time. A
// 400-hp probe cannot feel that concentration; a 10-hp hero can, because
// two blows in the same turn kill and two blows ten turns apart do not. An
// earlier measurement asked whether grouping changed cost, found no effect,
// and concluded clustering does not matter — that conclusion almost
// certainly measured the wrong quantity. Clustering needs its own
// instrument: something like peak damage taken in a single turn, or the
// fraction of turns spent adjacent to two or more live monsters at once.
// Do not reach for isolatedShape() to answer a clustering question.

import { newGame, playGame } from '../sim/game.js';
import { playDungeon, floorPlan, LEVELS } from '../sim/dungeon.js';
import { hashSeeds } from '../sim/rng.js';
import { findPath } from '../sim/mapgen.js';
import { step } from '../sim/step.js';
import { observe, emptyBelief, foldBelief } from '../sim/observe.js';
import { effectiveHp, expectedDamage, weaponDamage } from '../sim/combat.js';
import { PLAYER_HP, PLAYER_XP } from '../sim/balance.js';
import {
  makeFloorPlan, MONSTER_GROWTH_REBALANCED, STRENGTH_GROWTH_REBALANCED, CLUSTER_SIZE,
} from '../sim/difficulty.js';

// M7's "on" state, built from its own exported constants via the model
// override `makeFloorPlan` already provides for exactly this — no src/sim/
// change needed to read a flag's alternate state. `floorPlan(level)` (the
// default everywhere above) already reads the "off" state, so passing this
// as `floorPlanFn`/`dungeonOptions.floorPlan` is the whole toggle.
export const M7_ON = makeFloorPlan({
  monsterGrowth: MONSTER_GROWTH_REBALANCED,
  strengthGrowth: STRENGTH_GROWTH_REBALANCED,
  clusterSize: CLUSTER_SIZE,
});

// ***** the calibration hero ***** //
//
// Fixed and absurdly tanky (400 hp — Rogule floors never get close to that)
// so that death never selects which samples survive to be counted. The doc
// asking for this is explicit: challenge does not depend on the hero's hp,
// only on the damage the floor lands, so hp only has to be "enough", not
// realistic. Weapon and xp match the yardstick hero used elsewhere
// (analysis/hardness.js's REFERENCE_HERO) so the two are reading the same
// kind of hero, not duplicated by coincidence.
export const PROBE_HERO = {
  hp: 400,
  hpMax: 400,
  armour: 0,
  xp: PLAYER_XP,
  inventory: [{
    name: 'axe', emoji: '🪓', dmg: 2, armour: 0, heal: 0,
  }],
  kills: [],
};

function heroCopy(hero) {
  return { ...hero, inventory: hero.inventory.map((i) => ({ ...i })), kills: hero.kills.slice() };
}

// ***** movement: the one policy both probes share ***** //

const DIRS = {
  up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
};
const WALKABLE_KIND = new Set(['room', 'door', 'corridor']);

function posKey(pos) {
  return pos[0] + ',' + pos[1];
}

function samePos(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

// Pathing only ever crosses tiles the belief already knows are floor. This
// is deliberately dumber than "unexplored is walkable" (bot-strategy §4.3):
// that convention exists to let a bot plan INTO the dark on purpose, which
// is exactly the kind of judgement call this instrument must not make.
function knownPassable(belief) {
  return (x, y) => WALKABLE_KIND.has(belief.tiles.get(x + ',' + y));
}

// A known, walkable tile with at least one unknown neighbour: the boundary
// of what has been seen so far.
function frontierTiles(belief) {
  const out = [];
  for (const [key, kind] of belief.tiles) {
    if (!WALKABLE_KIND.has(kind)) continue;
    const [x, y] = key.split(',').map(Number);
    const neighbours = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (const [nx, ny] of neighbours) {
      if (!belief.tiles.has(nx + ',' + ny)) { out.push([x, y]); break; }
    }
  }
  return out;
}

// Nearest reachable candidate by path length, over KNOWN tiles only.
function nearestPath(from, candidates, passable) {
  let best = null;
  for (const pos of candidates) {
    const path = findPath(from, pos, passable);
    if (path.length < 2) continue; // unreachable, or already standing on it
    if (!best || path.length < best.path.length) best = { pos, path };
  }
  return best;
}

function stepToward(from, path) {
  const [x0, y0] = from;
  const [x1, y1] = path[1];
  for (const [name, [dx, dy]] of Object.entries(DIRS)) {
    if (x1 - x0 === dx && y1 - y0 === dy) return name;
  }
  return null;
}

// The whole strategy: fight what is known, then explore, then leave.
// Loot is never a goal — that is what makes the A/B difference attributable
// to pickup alone rather than to a route B chose and A did not.
//
//   1. A known, reachable, live monster — go kill the nearest one.
//   2. No monster known: the nearest frontier tile — go widen what is seen.
//   3. Nothing left to fight or explore: the shrine, if known.
//   4. Nothing at all: rest (should only ever be hit at the very end).
//
// PERFORMANCE NOTE, not a behaviour change: monsters are re-targeted fresh
// EVERY turn (cheap — few candidates, one A* each) because they can move,
// so nothing about them is safe to cache. Frontier and shrine targets are
// different: terrain never moves, so once a leg toward one is planned it
// stays valid for the whole walk, and only that leg is cached across turns.
// This is what makes the exploration phase cheap — the frontier scan reads
// every known tile and A*s to each candidate, and used to run on every
// single turn of every walk instead of once per walk. A monster becoming
// reachable still pre-empts the cached leg immediately, every turn, exactly
// as it did before caching existed — so the ROUTE PRIORITY is unchanged.
// The one real approximation: once a frontier tile is committed to, the
// walk does not re-check whether vision revealed an even closer one along
// the way: it did not before, this is not the kill-order-relevant behaviour.
export function makeSondaPolicy() {
  let cachedPath = null; // only ever a leg toward a frontier tile or the shrine

  return function sondaPolicy(belief) {
    const from = belief.player.pos;
    const passable = knownPassable(belief);

    const liveMonsters = [...belief.monsters.values()]
      .filter((m) => !m.dead)
      .map((m) => m.pos);
    const monster = nearestPath(from, liveMonsters, passable);
    if (monster) {
      cachedPath = null; // a monster always pre-empts an exploration leg
      return stepToward(from, monster.path) || 'rest';
    }

    if (cachedPath) {
      if (samePos(cachedPath[0], from)) {
        // Did not move last turn (blocked opening a chest, say) — same leg.
      } else if (cachedPath.length > 1 && samePos(cachedPath[1], from)) {
        cachedPath = cachedPath.slice(1);
      } else {
        cachedPath = null; // desynced from reality somehow — replan below
      }
      if (cachedPath && cachedPath.length < 2) cachedPath = null;
    }

    if (!cachedPath) {
      let target = nearestPath(from, frontierTiles(belief), passable);
      if (!target && belief.shrine) target = nearestPath(from, [belief.shrine.pos], passable);
      if (!target) return 'rest';
      cachedPath = target.path;
    }

    return stepToward(from, cachedPath) || 'rest';
  };
}

// ***** driving a single isolated floor ***** //

// `collect` picks Sonda B (true) or Sonda A (false). Same seed, same plan,
// same policy — only the pickup toggle differs. `gameOptions` is an escape
// hatch for engine-level rule variants (e.g. `hpFromKills`) that postdate
// this file and were never meant to require editing it — merged into
// `counts` last, so a rule variant can never silently override the pickup
// toggle or the probe hero this instrument depends on.
function driveFloor(seed, plan, collect, maxTurns, gameOptions = {}) {
  const hero = heroCopy(PROBE_HERO);
  const run = playGame(seed, makeSondaPolicy(), {
    maxTurns,
    counts: { ...plan, ...gameOptions, carry: hero, noPickup: !collect },
  });
  const clearedAll = run.state.monsters.length > 0
    && run.state.monsters.every((m) => m.dead);
  const damage = run.state.log
    .filter((e) => e.type === 'attack' && e.target === 'player')
    .reduce((sum, e) => sum + e.damage, 0);
  return { clearedAll, damage, turns: run.turns };
}

// ***** statistics, duplicated from analysis/shape.js — see file header ***** //

export function summarise(xs) {
  const n = xs.length;
  if (!n) return { n: 0, mean: NaN, sd: 0, se: 0, cv: 0, cvSe: 0 };
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1 ? xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
  const sd = Math.sqrt(variance);
  return {
    n,
    mean,
    sd,
    se: sd / Math.sqrt(n),
    cv: mean !== 0 ? sd / mean : 0,
    cvSe: mean !== 0 ? (sd / mean) / Math.sqrt(2 * n) : 0,
  };
}

export function growthOf(series) {
  const points = series
    .map((y, i) => ({ x: i + 1, y }))
    .filter((p) => Number.isFinite(p.y) && p.y > 0);
  if (points.length < 3) return { perFloor: null, se: null, n: points.length };

  const n = points.length;
  const mx = points.reduce((a, p) => a + p.x, 0) / n;
  const my = points.reduce((a, p) => a + Math.log(p.y), 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (const p of points) {
    sxy += (p.x - mx) * (Math.log(p.y) - my);
    sxx += (p.x - mx) ** 2;
  }
  const slope = sxy / sxx;

  let residual = 0;
  for (const p of points) {
    residual += (Math.log(p.y) - (my + slope * (p.x - mx))) ** 2;
  }
  const slopeSe = n > 2 ? Math.sqrt(residual / (n - 2) / sxx) : 0;

  return { perFloor: Math.exp(slope), se: Math.exp(slope) * slopeSe, n };
}

// effectiveHp x expectedDamage — see analysis/shape.js for the argument.
function heroPower(player) {
  return effectiveHp(player) * expectedDamage(player.xp, weaponDamage(player));
}

// effectiveHp / mean blow of the roster — see analysis/shape.js.
function heroBuffer(player, roster) {
  const live = roster.filter((m) => m.xp > 1);
  if (!live.length) return Infinity;
  const meanBlow = live.reduce((sum, m) => sum + expectedDamage(m.xp, 0), 0) / live.length;
  return meanBlow > 0 ? effectiveHp(player) / meanBlow : Infinity;
}

// ***** 1 & 2. challenge and reward: isolated floors, paired A vs B ***** //
//
// Each floor is generated fresh per sample — never connected to a
// descent — so the series is a property of the floor as designed, the same
// guarantee analysis/shape.js's generatedShape made for the modelled
// numbers. Challenge is what Sonda A pays. Reward is A's cost minus B's on
// the SAME seed: B picks up gear along the way and so should clear for
// LESS, so a positive reward is what "loot pays" looks like — it is what
// the loot picked up saved, in hp.
export function isolatedShape(options = {}) {
  const {
    runs = 60, firstSeed = 800000, maxTurns = 4000, levels = LEVELS,
    // See driveFloor: a passthrough for engine rule variants that postdate
    // this file, empty by default so every committed number above is
    // reproduced exactly when this is omitted.
    gameOptions = {},
    // Same idea, for map-design flags (M7 and after) that change which
    // floor gets generated rather than a play-time rule. Default is the
    // shipped generator; pass `makeFloorPlan({...})` (src/sim/difficulty.js,
    // already exported for exactly this) to read a flag's "on" state
    // without editing that file.
    floorPlanFn = floorPlan,
  } = options;
  const rows = [];

  for (let level = 1; level <= levels; level++) {
    const plan = floorPlanFn(level);
    const challenge = [];
    const reward = [];
    let discardedA = 0;
    let discardedB = 0;

    for (let i = 0; i < runs; i++) {
      const seed = hashSeeds(firstSeed + i, level);
      const a = driveFloor(seed, plan, false, maxTurns, gameOptions);
      const b = driveFloor(seed, plan, true, maxTurns, gameOptions);
      if (!a.clearedAll) { discardedA++; continue; }
      if (!b.clearedAll) { discardedB++; continue; }
      challenge.push(a.damage);
      reward.push(a.damage - b.damage);
    }

    rows.push({
      level,
      nominal: plan.monsters,
      n: challenge.length,
      discardedA,
      discardedB,
      challenge: summarise(challenge),
      reward: summarise(reward),
    });
  }
  return rows;
}

// ***** 3 & 4. power and buffer: a real descent, Sonda B only ***** //
//
// Power and buffer are properties of the hero on arrival, which only exist
// for heroes who got that deep — the bias is intrinsic, not removable, and
// must come from Sonda B specifically: the real bot's hero is shaped by the
// bot's OWN decisions, which would measure the bot rather than the map, and
// is itself already known to be survivor-selected (z = 4.89, see
// docs/curve-shape.md). Sonda B starts at the ordinary starting hero (not
// the tank) so the build-up is the real one, not a calibration fiction.
export function builtShape(options = {}) {
  const {
    runs = 60, firstSeed = 900000, maxTurns = 4000, levels = LEVELS,
    // Same escape hatch as isolatedShape's gameOptions, threaded to
    // playDungeon instead of playGame — empty by default, so omitting it
    // reproduces every committed number exactly.
    dungeonOptions = {},
  } = options;

  const rows = Array.from({ length: levels }, (_, i) => ({
    level: i + 1, power: [], buffer: [], damage: [], reached: 0,
  }));
  const depths = [];
  let cleared = 0;

  for (let i = 0; i < runs; i++) {
    const dungeon = playDungeon(firstSeed + i, () => makeSondaPolicy(),
      { maxTurns, levels, ...dungeonOptions });
    depths.push(dungeon.depth);
    if (dungeon.cleared) cleared++;

    for (const lvl of dungeon.levels) {
      const row = rows[lvl.level - 1];
      row.reached++;
      row.power.push(heroPower(lvl.arrivedWith));
      row.buffer.push(heroBuffer(lvl.arrivedWith, lvl.roster));
      // Attrition (I5): what this floor actually took from a hero who can
      // die, as opposed to capacityShape's immortal hero, which cannot
      // spend anything. Same descents, same survivor selection as
      // power/buffer above — carried, not removed, see I5.
      row.damage.push(lvl.damage);
    }
  }

  return {
    rows: rows.filter((r) => r.reached > 0).map((r) => ({
      level: r.level,
      reached: r.reached,
      power: summarise(r.power),
      buffer: summarise(r.buffer.filter(Number.isFinite)),
      damage: summarise(r.damage),
    })),
    cleared,
    runs,
    depths: depths.slice().sort((a, b) => a - b),
  };
}

// ***** I5 — capacity: what an immortal Sonda B accumulates, all 10 floors ***** //
//
// "Buffer" was two quantities glued together. `builtShape` above measures
// it with a MORTAL hero, so it is intrinsically survivor-selected and its
// window shrinks with depth (Sonda B dies). What it cannot separate is how
// much of "hp on arrival" is CAPACITY (what the build accumulated — ceiling,
// gear, grants) against ATTRITION (what floors already spent from it).
// `builtShape`'s new `damage` column is attrition. This is capacity: an
// immortal hero earns every grant and kills every roster exactly like the
// mortal one, but cannot die, so there is no survivor selection and no
// truncated window — all 10 floors, every run.
//
// `playDungeon` (src/sim/dungeon.js) has no way to seed a starting hero
// other than the default PLAYER_HP, and the protocol since the M6 episode
// is: the metrics agent does not reach into src/sim/ for a hook like that —
// ask the work agent and wait. Rather than block I5 on that, the descent
// loop is reimplemented locally instead, the same way clustering.js
// reimplements playGame's turn loop rather than touching game.js: floor
// generation (`floorPlan`) and single-floor play (`playGame`) are already
// exported engine primitives, and driving them across ten floors with a
// chosen starting hero needs none of dungeon.js's own code changed. The
// per-floor `counts` built below mirror `playDungeon`'s exactly.
function carryFromPlayer(player) {
  return {
    hp: player.hp,
    hpMax: player.hpMax,
    armour: player.armour,
    xp: player.xp,
    inventory: player.inventory.map((i) => ({ ...i })),
    kills: player.kills.slice(),
  };
}

function driveDescent(seed, makePolicy, startHero, maxTurns, levels, dungeonOptions = {}, floorPlanFn = floorPlan) {
  let carry = startHero ? carryFromPlayer(startHero) : null;
  const perFloor = [];

  for (let level = 1; level <= levels; level++) {
    const plan = floorPlanFn(level);
    const counts = {
      monsters: plan.monsters,
      chests: plan.chests,
      difficultyScale: plan.difficultyScale,
      clusterSize: plan.clusterSize,
      dropChance: plan.dropChance,
      weaponScarcity: plan.weaponScarcity,
      armourScarcity: plan.armourScarcity,
      potionScarcity: plan.potionScarcity,
      monsterSpread: plan.monsterSpread,
      sideActivationCap: plan.sideActivationCap,
      sideRoomDepthBonus: plan.sideRoomDepthBonus,
      spineThreatShare: plan.spineThreatShare,
      sideChestBias: plan.sideChestBias,
      carry,
      xpFromKills: dungeonOptions.xpFromKills,
      hpFromKills: dungeonOptions.hpFromKills,
      attackWhenAdjacent: dungeonOptions.attackWhenAdjacent,
      weaponsWidenRoll: dungeonOptions.weaponsWidenRoll,
    };

    const arrivedWith = carry
      ? carryFromPlayer(carry)
      : {
        hp: PLAYER_HP, hpMax: PLAYER_HP, armour: 0, xp: PLAYER_XP, inventory: [], kills: [],
      };

    const run = playGame(hashSeeds(seed, level), makePolicy(), { maxTurns, counts });
    const damage = run.state.log
      .filter((e) => e.type === 'attack' && e.target === 'player')
      .reduce((sum, e) => sum + e.damage, 0);

    perFloor.push({
      level, arrivedWith, damage, outcome: run.outcome || 'timeout',
    });

    if (run.outcome !== 'ascended') return { levels: perFloor, cleared: false, depth: level };
    carry = carryFromPlayer(run.state.player);
  }
  return { levels: perFloor, cleared: true, depth: levels };
}

// ***** I7 — capacity at the MORTAL series' own base ***** //
//
// I5's capacity used `PROBE_HERO` (400 hp) so the probe would never die —
// but that welds two independent things into one number: immortality AND
// a 400-hp base. A growth rate is not scale-invariant (the same +42 hp
// grant reads ~×1.011/floor on 400 and ~×1.20/floor on a real hero's 10),
// so capacity's own rate was mostly an artefact of the instrument's size,
// and subtracting it from the mortal series (`builtShape`, base
// `PLAYER_HP`) mixed that dilution in with the survivor-selection effect
// I5 was trying to isolate — unattributably, since the two series differed
// in mortality AND base at once.
//
// The fix: start at `PLAYER_HP`, same as the mortal series, and suppress
// DEATH ONLY — not damage. `step()` (src/sim/step.js) freezes a floor the
// instant `state.outcome` is set, which is exactly what stops a mortal run;
// there is no flag for "keep playing after hp hits 0" because nothing
// needed one before. Rather than ask the work agent to add a suppression
// flag to `src/sim/combat.js` and wait, this drives `step()` directly, one
// turn at a time (same move as `clustering.js`'s `playFromState`, built for
// I2), and clears `outcome` back to null the instant it reads 'died' —
// BEFORE the next `step()` call, which is the only place the engine checks
// it. Everything else about that turn already happened: `applyDamage`
// clamps hp at 0 without touching the LOGGED blow size, so attrition keeps
// accumulating normally even after hp cannot fall any further — the probe
// really does "reach hp 0 and keep going," not stop losing hp, which is
// what makes the two series subtractable at all.
function driveDescentSuppressed(seed, makePolicy, startHero, maxTurns, levels, dungeonOptions = {}, floorPlanFn = floorPlan) {
  let carry = startHero ? carryFromPlayer(startHero) : null;
  const perFloor = [];

  for (let level = 1; level <= levels; level++) {
    const plan = floorPlanFn(level);
    const counts = {
      monsters: plan.monsters,
      chests: plan.chests,
      difficultyScale: plan.difficultyScale,
      clusterSize: plan.clusterSize,
      dropChance: plan.dropChance,
      weaponScarcity: plan.weaponScarcity,
      armourScarcity: plan.armourScarcity,
      potionScarcity: plan.potionScarcity,
      monsterSpread: plan.monsterSpread,
      sideActivationCap: plan.sideActivationCap,
      sideRoomDepthBonus: plan.sideRoomDepthBonus,
      spineThreatShare: plan.spineThreatShare,
      sideChestBias: plan.sideChestBias,
      carry,
      xpFromKills: dungeonOptions.xpFromKills,
      hpFromKills: dungeonOptions.hpFromKills,
      attackWhenAdjacent: dungeonOptions.attackWhenAdjacent,
      weaponsWidenRoll: dungeonOptions.weaponsWidenRoll,
    };

    const arrivedWith = carry
      ? carryFromPlayer(carry)
      : {
        hp: PLAYER_HP, hpMax: PLAYER_HP, armour: 0, xp: PLAYER_XP, inventory: [], kills: [],
      };

    let state = newGame(hashSeeds(seed, level), counts);
    let observation = observe(state);
    let belief = foldBelief(emptyBelief(), observation);
    const policy = makePolicy();
    let decisions = 0;
    const maxDecisions = maxTurns * 4;
    let damage = 0;
    let diedCount = 0; // how many times this floor suppressed a death — reported, not hidden

    while (!state.outcome && state.turn < maxTurns && decisions < maxDecisions) {
      const beforeLog = state.log.length;
      const action = policy(belief, observation);
      const result = step(state, action);
      let next = result.state;

      damage += next.log.slice(beforeLog)
        .filter((e) => e.type === 'attack' && e.target === 'player')
        .reduce((sum, e) => sum + e.damage, 0);

      if (next.outcome === 'died') {
        diedCount++;
        next = { ...next, outcome: null, killedBy: null };
      }
      state = next;
      observation = observe(state); // re-derive from the corrected state, not result.observation
      belief = foldBelief(belief, observation);
      decisions++;
    }

    perFloor.push({
      level, arrivedWith, damage, diedCount, outcome: state.outcome || 'timeout',
    });

    // 'died' cannot reach here (suppressed above); only 'ascended' or a
    // genuine timeout stop the sequence.
    if (state.outcome !== 'ascended') return { levels: perFloor, cleared: false, depth: level };
    carry = carryFromPlayer(state.player);
  }
  return { levels: perFloor, cleared: true, depth: levels };
}

export function capacityShape(options = {}) {
  const {
    runs = 150, firstSeed = 950000, maxTurns = 4000, levels = LEVELS,
    dungeonOptions = {}, floorPlanFn = floorPlan,
    // I7: default unchanged (PROBE_HERO, no suppression needed since it
    // never dies) so every number already committed reproduces exactly.
    // Pass `startHero: <PLAYER_HP hero>, suppressDeath: true` to read
    // capacity at the mortal series' own base instead.
    startHero = PROBE_HERO, suppressDeath = false,
  } = options;

  const rows = Array.from({ length: levels }, (_, i) => ({
    level: i + 1, power: [], hpMax: [], reached: 0, died: 0,
  }));
  const depths = [];
  let cleared = 0;
  const drive = suppressDeath ? driveDescentSuppressed : driveDescent;

  for (let i = 0; i < runs; i++) {
    const result = drive(firstSeed + i, makeSondaPolicy, startHero, maxTurns, levels, dungeonOptions, floorPlanFn);
    depths.push(result.depth);
    if (result.cleared) cleared++;

    for (const lvl of result.levels) {
      const row = rows[lvl.level - 1];
      row.reached++;
      row.power.push(heroPower(lvl.arrivedWith));
      row.hpMax.push(lvl.arrivedWith.hpMax);
      if (lvl.diedCount) row.died++;
    }
  }

  return {
    rows: rows.filter((r) => r.reached > 0).map((r) => ({
      level: r.level,
      reached: r.reached,
      power: summarise(r.power),
      hpMax: summarise(r.hpMax),
      // Only meaningful under suppressDeath — how many of the descents that
      // REACHED this floor had already had a death suppressed getting
      // there. 0 always under the default (PROBE_HERO never dies).
      diedBeforeOrOn: r.died,
    })),
    cleared,
    runs,
    depths: depths.slice().sort((a, b) => a - b),
  };
}
