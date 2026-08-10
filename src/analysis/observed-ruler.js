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
import { findPath, playerPassable } from '../sim/mapgen.js';
import { classifyRooms, spineShare } from '../sim/spine.js';
import { step } from '../sim/step.js';
import { observe, emptyBelief, foldBelief } from '../sim/observe.js';
import { effectiveHp, expectedDamage, weaponDamage } from '../sim/combat.js';
import {
  PLAYER_HP, PLAYER_XP, OUT_OF_DEPTH_CHANCE_PER_LEVEL, OUT_OF_DEPTH_CHANCE_CAP,
} from '../sim/balance.js';
import {
  makeFloorPlan, MONSTER_GROWTH_REBALANCED, STRENGTH_GROWTH_REBALANCED, CLUSTER_SIZE,
} from '../sim/difficulty.js';

// M7's "on" state, built from its own exported constants via the model
// override `makeFloorPlan` already provides for exactly this — no src/sim/
// change needed to read a flag's alternate state.
//
// STALE NOTE, kept for the record rather than silently fixed: this used to
// say `floorPlan(level)` reads the "off" state by default. That was true
// when this constant was built and is not true any more — M7 was adopted
// (`DIFFICULTY_REBALANCED = true`, commit `25f45a1`, mid-I7), so the
// shipped `floorPlan(level)` now reads what THIS constant encodes, and
// `makeFloorPlan({})` (`DEFAULT_MODEL`, untouched) is the one that reads
// the pre-M7 "off" state. `M7_ON` is still exactly what M3's "off" arm
// needs below, though — it is the current shipped baseline either way.
export const M7_ON = makeFloorPlan({
  monsterGrowth: MONSTER_GROWTH_REBALANCED,
  strengthGrowth: STRENGTH_GROWTH_REBALANCED,
  clusterSize: CLUSTER_SIZE,
});

// M3's "on" state, same shipped baseline as `M7_ON` plus the out-of-depth
// reskin chance turned on. `DEFAULT_MODEL`'s own
// `outOfDepthChancePerLevel`/`outOfDepthChanceCap` default to 0/the shipped
// cap respectively — 0 reproduces "off" regardless of `OUT_OF_DEPTH_TAIL`'s
// live value (mirrors how `DEFAULT_MODEL` freezes the pre-M7 monster/
// strength growth too) — so `M7_ON` above already IS "M3 off": the current
// shipped state, standing duty's baseline arm. This is only the "on" arm.
export const M3_ON = makeFloorPlan({
  monsterGrowth: MONSTER_GROWTH_REBALANCED,
  strengthGrowth: STRENGTH_GROWTH_REBALANCED,
  clusterSize: CLUSTER_SIZE,
  outOfDepthChancePerLevel: OUT_OF_DEPTH_CHANCE_PER_LEVEL,
  outOfDepthChanceCap: OUT_OF_DEPTH_CHANCE_CAP,
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
  // U3 — cumulative xp earned from kills, separate from `xp` (the level
  // stat, XP_FROM_KILLS-gated). `newGame`'s carry handling copies this
  // field with no `?? 0` fallback, so a carry object missing it turns
  // xpEarned into `undefined`, then NaN the first kill after. Found while
  // wiring coinShape below — every carry-builder in this file needs this.
  xpEarned: 0,
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
//
// ANCHOR — third of the three modes in this file, and the only one M38
// cannot reach. `carry` is ALWAYS set here, so `newGame` applies the shipped
// `STARTING_ITEMS` and the carry then overwrites the inventory: this probe is
// PROBE_HERO's axe and nothing else, whatever balance.js ships. That is
// deliberate and it is why `challenge`/`reward` are a fixed ruler — they
// describe the FLOOR, and must not move when the hero's kit does. It is also
// why `--selftest`'s rewardShape anchors still matched across M38 while the
// descent drivers' hero changed underneath. See the anchor note on
// `driveDescent` for the two modes that DO track the shipped kit.
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
  return {
    clearedAll, damage, turns: run.turns, xpGained: run.state.player.xpEarned - hero.xpEarned,
  };
}

// ***** statistics, duplicated from analysis/shape.js — see file header ***** //

export function summarise(xs) {
  const n = xs.length;
  if (!n) return { n: 0, mean: NaN, sd: 0, se: 0, cv: 0, cvSe: 0, p90: NaN };
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1 ? xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
  const sd = Math.sqrt(variance);
  // p90 — nearest-rank: the value below which 90% of the samples fall.
  // One-sided on purpose, unlike cv above: cv treats an easier-than-usual
  // run and a harder-than-usual run as the same size of surprise, but for
  // "how bad can this floor get" only the harder side is the question.
  const sorted = [...xs].sort((a, b) => a - b);
  const p90 = sorted[Math.min(n - 1, Math.ceil(0.9 * n) - 1)];
  return {
    n,
    mean,
    sd,
    se: sd / Math.sqrt(n),
    cv: mean !== 0 ? sd / mean : 0,
    cvSe: mean !== 0 ? (sd / mean) / Math.sqrt(2 * n) : 0,
    p90,
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

// ***** theoretical coins: xp/turn, scaled, summed over a run ***** //
//
// coins(floor) = round(xp gained that floor / turns spent that floor × 10).
// Summed across all ten floors for one "run" — Sonda A and B never carry
// anything between floors (each is a fresh isolated sample, same as
// challenge/reward), so a run here is ten INDEPENDENT floor draws sharing
// one seed index, not a connected descent. That mirrors exactly how
// challenge/reward already treat the ladder, so it costs nothing new to
// generate — reuses `driveFloor`, now also returning `xpGained`.
export function coinShape(options = {}) {
  const {
    runs = 15, firstSeed = 830000, maxTurns = 4000, levels = LEVELS,
    gameOptions = {}, floorPlanFn = floorPlan,
  } = options;
  const coinsA = [];
  const coinsB = [];

  for (let i = 0; i < runs; i++) {
    let totalA = 0;
    let totalB = 0;
    for (let level = 1; level <= levels; level++) {
      const plan = floorPlanFn(level);
      const seed = hashSeeds(firstSeed + i, level);
      const a = driveFloor(seed, plan, false, maxTurns, gameOptions);
      const b = driveFloor(seed, plan, true, maxTurns, gameOptions);
      if (a.turns > 0) totalA += Math.round((a.xpGained / a.turns) * 10);
      if (b.turns > 0) totalB += Math.round((b.xpGained / b.turns) * 10);
    }
    coinsA.push(totalA);
    coinsB.push(totalB);
  }

  return { coinsA: summarise(coinsA), coinsB: summarise(coinsB), runs };
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
    level: i + 1, power: [], buffer: [], damage: [], effHp: [], reached: 0,
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
      // I11 — hp + armour ON ARRIVAL, from the MORTAL series. This is the
      // honest "what a hero plausibly has by here" figure, and it replaces
      // the death-suppressed probe's version, which was not one: with no
      // regen and death suppressed, that hero's hp pins at 0 and every
      // floor past the third reads ~0, so a cost/capacity ratio built on it
      // divided by zero. Measured at the panel's own defaults: exp hp+armour
      // 10.00, 4.93, 1.67, 0.40, 0.00, ... and the panel printed Infinity.
      //
      // SURVIVOR-SELECTED, intrinsically and on purpose — a hero who never
      // reached floor 9 has no arrival state there to average. That makes
      // this "what floor 9 costs someone who gets to floor 9", which is the
      // question the ratio is actually asking. Say so wherever it is shown.
      row.effHp.push(effectiveHp(lvl.arrivedWith));
    }
  }

  return {
    rows: rows.filter((r) => r.reached > 0).map((r) => {
      const damage = summarise(r.damage);
      const capacity = summarise(r.effHp);
      return {
      level: r.level,
      reached: r.reached,
      power: summarise(r.power),
      buffer: summarise(r.buffer.filter(Number.isFinite)),
      damage,
      effectiveHp: capacity,
      // C1 — the same two lines `capacityShape` returns, from the same
      // already-paid-for pass: `damage` is the traversal's cost and
      // `effHp` is the capacity the hero arrived with, both off this
      // descent. Exposed here so run-check.html can read them without
      // computing anything itself, and without a second descent.
      // ANCHOR: mortal sonda, no startHero, so `newGame` hands it the
      // shipped STARTING_ITEMS — the real base, not the 400 hp probe.
      pressure: capacity.mean ? damage.mean / capacity.mean : null,
      spread: damage.mean ? damage.p90 / damage.mean : null,
      };
    }),
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
    // No `?? 0` at the newGame end that reads this back — omitting it
    // turns every kill's xpEarned accumulation to NaN from here on.
    xpEarned: player.xpEarned,
  };
}

function driveDescent(seed, makePolicy, startHero, maxTurns, levels, dungeonOptions = {}, floorPlanFn = floorPlan) {
  // ***** WHICH HERO THIS PROBE STARTS AS — read before comparing runs *****
  //
  // M38 shipped `STARTING_ITEMS` (src/sim/balance.js): `newGame` gives EVERY
  // hero that kit unless a `carry` overwrites the inventory. That makes the
  // line below an anchor decision, not bookkeeping, so it is stated rather
  // than left to be rediscovered:
  //
  //   startHero: null   -> no carry on floor 1, so `newGame` applies the
  //                        shipped kit. The probe starts holding whatever
  //                        STARTING_ITEMS is (a dagger today) and carries it
  //                        down. This tracks the real game as it ships.
  //   startHero: <hero> -> `carry` overwrites the inventory outright and the
  //                        shipped kit never lands. The probe is exactly the
  //                        hero passed in — PROBE_HERO's axe, or a bare hero
  //                        if one is handed over. This is FROZEN against
  //                        balance changes, which is what a calibration
  //                        weight wants and what a game-tracking read does
  //                        not.
  //
  // Neither is wrong; they answer different questions. What was wrong was
  // that they diverged silently the moment M38 landed — I11. Measured, same
  // 300 seeds: bare vs the shipped dagger moves the floor-3 hazard 0.095 ->
  // 0.264 and the share of runs over by floor 3 from 0.977 to 0.847, so the
  // choice is not a detail.
  let carry = startHero ? carryFromPlayer(startHero) : null;
  const perFloor = [];
  let totalCoins = 0;

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
      // I11 — what the hero brings INTO the run, the shop's own channel
      // (U6d/U6e). Forwarded to every floor exactly as `playDungeon`
      // does; `carry` wins from floor 2 on, so it only ever arms floor
      // 1. Undefined by default, so every number taken before this
      // reproduces unchanged.
      startingItems: dungeonOptions.startingItems,
      noPickup: dungeonOptions.noPickup,
    };

    // The floor-1 branch used to hard-code `inventory: []`, which stopped
    // being true when M38 shipped STARTING_ITEMS: the engine hands the hero a
    // dagger and this said the hero had nothing, so `heroPower` read floor 1
    // with a weapon damage of zero. Read the hero the engine actually built
    // instead of restating what it was assumed to be — the same class of
    // mistake as restating a balance value in prose.
    const run = playGame(hashSeeds(seed, level), makePolicy(), { maxTurns, counts });
    const arrivedWith = carry
      ? carryFromPlayer(carry)
      : carryFromPlayer(newGame(hashSeeds(seed, level), counts).player);
    const xpEarnedStart = carry ? carry.xpEarned : 0;

    const damage = run.state.log
      .filter((e) => e.type === 'attack' && e.target === 'player')
      .reduce((sum, e) => sum + e.damage, 0);
    if (run.turns > 0) {
      totalCoins += Math.round(((run.state.player.xpEarned - xpEarnedStart) / run.turns) * 10);
    }

    perFloor.push({
      level, arrivedWith, damage, outcome: run.outcome || 'timeout',
    });

    if (run.outcome !== 'ascended') return { levels: perFloor, cleared: false, depth: level, totalCoins };
    carry = carryFromPlayer(run.state.player);
  }
  return {
    levels: perFloor, cleared: true, depth: levels, totalCoins,
  };
}

// ***** mortal sonda coins — same base, same seed, as the bot's own ***** //
//
// coinShape's Sonda A/B are the 400-hp calibration probe: never dies, so it
// always fully clears, which is a different reason to earn xp/turn than the
// bot's — the bot refuses fights it prices as lost, the calibration probe
// has no reason to refuse anything. Comparing the two rates mixed
// "efficiency" with "willingness to risk it". This uses `driveDescent`
// directly (bypassing `capacityShape`'s per-floor power/hpMax aggregation,
// not needed here) with `startHero: null` — real `PLAYER_HP` base, dies for
// real — so both sides of the comparison can die, same reason to hold back.
// `noPickup` is `driveDescent`'s new passthrough (was already accepted by
// `driveFloor`, just never wired into the multi-floor driver until now).
export function mortalCoinShape(options = {}) {
  const {
    runs = 15, firstSeed = 900000, maxTurns = 4000, levels = LEVELS,
    noPickup = false, floorPlanFn = floorPlan,
  } = options;
  const coins = [];
  for (let i = 0; i < runs; i++) {
    const result = driveDescent(
      firstSeed + i, makeSondaPolicy, null, maxTurns, levels, { noPickup }, floorPlanFn,
    );
    coins.push(result.totalCoins);
  }
  return { coins: summarise(coins), runs };
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
  // ***** WHICH HERO THIS PROBE STARTS AS — read before comparing runs *****
  //
  // M38 shipped `STARTING_ITEMS` (src/sim/balance.js): `newGame` gives EVERY
  // hero that kit unless a `carry` overwrites the inventory. That makes the
  // line below an anchor decision, not bookkeeping, so it is stated rather
  // than left to be rediscovered:
  //
  //   startHero: null   -> no carry on floor 1, so `newGame` applies the
  //                        shipped kit. The probe starts holding whatever
  //                        STARTING_ITEMS is (a dagger today) and carries it
  //                        down. This tracks the real game as it ships.
  //   startHero: <hero> -> `carry` overwrites the inventory outright and the
  //                        shipped kit never lands. The probe is exactly the
  //                        hero passed in — PROBE_HERO's axe, or a bare hero
  //                        if one is handed over. This is FROZEN against
  //                        balance changes, which is what a calibration
  //                        weight wants and what a game-tracking read does
  //                        not.
  //
  // Neither is wrong; they answer different questions. What was wrong was
  // that they diverged silently the moment M38 landed — I11. Measured, same
  // 300 seeds: bare vs the shipped dagger moves the floor-3 hazard 0.095 ->
  // 0.264 and the share of runs over by floor 3 from 0.977 to 0.847, so the
  // choice is not a detail.
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
      // I11 — what the hero brings INTO the run, the shop's own channel
      // (U6d/U6e). Forwarded to every floor exactly as `playDungeon`
      // does; `carry` wins from floor 2 on, so it only ever arms floor
      // 1. Undefined by default, so every number taken before this
      // reproduces unchanged.
      startingItems: dungeonOptions.startingItems,
    };

    let state = newGame(hashSeeds(seed, level), counts);
    // Read off the generated state, not a restatement of it — see the same
    // fix in `driveDescent` above for why the hard-coded empty inventory
    // became false the moment M38 shipped STARTING_ITEMS.
    const arrivedWith = carry ? carryFromPlayer(carry) : carryFromPlayer(state.player);

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
    level: i + 1, power: [], hpMax: [], effHp: [], cost: [], reached: 0, died: 0,
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
      row.effHp.push(effectiveHp(lvl.arrivedWith));
      // C1 — the traversal's cost, from THIS pass. `damage` is already
      // computed by both drivers; it was simply never collected here.
      // Attaching it to the same descent is the whole design decision of
      // that item: `rewardShape`'s challenge is a 400-hp probe on an
      // ISOLATED floor, and dividing it by a capacity measured on a hero
      // that DESCENDED mixes two heroes, so the ratio would mean nothing.
      // Same run, same seed, same hero, same floor.
      row.cost.push(lvl.damage);
      if (lvl.diedCount) row.died++;
    }
  }

  return {
    rows: rows.filter((r) => r.reached > 0).map((r) => {
      const cost = summarise(r.cost);
      const capacity = summarise(r.effHp);
      return {
        level: r.level,
        reached: r.reached,
        power: summarise(r.power),
        hpMax: summarise(r.hpMax),
        // hp + armour on arrival — used by run-check.html (Map's difficulty
        // reading) as the bot-independent "what a hero plausibly has by
        // here" denominator, in place of the flat PLAYER_HP constant. Needs
        // `suppressDeath: true, startHero: null` to mean that; under the
        // default (immortal 400-hp PROBE_HERO) this number describes the
        // calibration tank, not a real hero, and should not be used that way.
        effectiveHp: capacity,
        // ***** C1 — the two lines of docs/map-design.md, same pass *****
        //
        // cost      what this traversal took, in hp, from the hero who walked
        //           it. Summarised, so `p90` and `mean` are both here.
        // pressure  cost / capacity-on-arrival. `1.0` = the traversal costs
        //           exactly everything the hero has.
        // spread    the traversal's own upper tail over its own mean.
        //           ONE-SIDED on purpose — a symmetric statistic calls
        //           "cheaper than usual" the same size of surprise as "harder
        //           than usual", and the tail's whole design is about one of
        //           those. `summarise` already carries the p90 for this.
        //
        // Ratio of means, not mean of ratios. Per-run `cost_i / effHp_i` blows
        // up whenever a hero arrives on fumes, and at depth most of them do —
        // that is the same near-zero denominator that made the old cost table
        // print Infinity. The aggregate question is "what does this floor cost
        // against what heroes bring to it", which the ratio of means answers.
        //
        // NO NEW STATISTIC AND NO NEW DIAL, which is the item's own test that
        // the language was already present: both lines are arithmetic over
        // `summarise` output that existed before this.
        cost,
        pressure: capacity.mean ? cost.mean / capacity.mean : null,
        spread: cost.mean ? cost.p90 / cost.mean : null,
        // Only meaningful under suppressDeath — how many of the descents that
        // REACHED this floor had already had a death suppressed getting
        // there. 0 always under the default (PROBE_HERO never dies).
        diedBeforeOrOn: r.died,
      };
    }),
    cleared,
    runs,
    depths: depths.slice().sort((a, b) => a - b),
  };
}

// ***** I6 — reward: what the floor holds, not what a policy finds ***** //
//
// `isolatedShape`'s reward describes Sonda B's OWN pickup policy, not the
// floor: loot is never a movement target for either probe (see the file
// header), so anything off the explore/kill path is invisible to it. I1's
// own review flagged this and it stayed open — this closes it.
//
// `state.chests[].drop` and `state.monsters[].drop` are decided the instant
// `newGame` returns, before a single tile has been walked. Reading them
// off a fresh, unplayed state is "what the floor contains, whether or not
// anyone takes it" (docs/backlog.md's own framing for this item) with zero
// play involved — and it already looks at WHO holds an item, not a flat
// item table, which is the thing M9 (drop value tied to the carrying
// creature) needs and this item's own Watch note asked for.
//
// Turning that manifest into an hp figure comparable to challenge still
// needs real play, for the same reason the whole observed-ruler exists: a
// hand-rolled point value per item is exactly the kind of model this
// project replaced `campaignCost` to get away from. So the manifest is
// handed to a probe from turn 0 rather than priced by formula — but ALL of
// it at once, not accumulated by walking a path, which is what removes the
// policy dependence Sonda B had.
//
// Weapons and armour equip cleanly at turn 0: `weaponDamage`/the armour
// bar already SUM across everything ever picked up (src/sim/combat.js,
// spec-faithful, not a choice made here), so handing over the floor's full
// weapon/armour manifest at once reproduces exactly what a hero who found
// every last one of them would be carrying — no ordering effect exists to
// get wrong.
//
// Potions do not equip this way. A potion at full hp heals nothing and is
// not consumed (step.js's own pickup rule) — crediting every potion at
// turn 0, when the probe is still at full hp, would silently discard
// almost all of their value. They travel as a queue instead and are drunk
// turn-by-turn, only when hurt: the same "wasted at full health" rule the
// engine already enforces, just not tied to a map tile. That untying is a
// real simplification — a real potion needs the hero to walk to it, this
// one is drunk on demand — and is stated here rather than left implicit.
function driveReward(seed, plan, maxTurns, gameOptions = {}) {
  const scan = newGame(seed, { ...plan, ...gameOptions, carry: heroCopy(PROBE_HERO) });
  const manifest = [...scan.chests.map((c) => c.drop), ...scan.monsters.map((m) => m.drop)]
    .filter(Boolean);
  const potionQueue = manifest.filter((i) => i.heal > 0).map((i) => i.heal);
  const gear = manifest.filter((i) => !(i.heal > 0));

  const hero = heroCopy(PROBE_HERO);
  hero.inventory.push(...gear.map((i) => ({ ...i })));
  hero.armour += gear.reduce((sum, i) => sum + (i.armour || 0), 0);

  let state = newGame(seed, {
    ...plan, ...gameOptions, carry: hero, noPickup: true,
  });
  let observation = observe(state);
  let belief = foldBelief(emptyBelief(), observation);
  const policy = makeSondaPolicy();
  let decisions = 0;
  const maxDecisions = maxTurns * 4;

  while (!state.outcome && state.turn < maxTurns && decisions < maxDecisions) {
    while (potionQueue.length && state.player.hp < state.player.hpMax) {
      state.player.hp = Math.min(state.player.hpMax, state.player.hp + potionQueue.shift());
    }
    const action = policy(belief, observation);
    const result = step(state, action);
    state = result.state;
    observation = result.observation;
    belief = foldBelief(belief, observation);
    decisions++;
  }

  const clearedAll = state.monsters.length > 0 && state.monsters.every((m) => m.dead);
  const damage = state.log
    .filter((e) => e.type === 'attack' && e.target === 'player')
    .reduce((sum, e) => sum + e.damage, 0);
  // Mean xp of the roster `scan` already generated — free, since `scan` was
  // already made to read the loot manifest above; no extra newGame call.
  const meanXp = scan.monsters.length
    ? scan.monsters.reduce((sum, m) => sum + m.xp, 0) / scan.monsters.length
    : 0;
  return {
    clearedAll, damage, potionsHeld: potionQueue.length, gearHeld: gear.length, meanXp,
  };
}

// Same pairing shape as `isolatedShape` (isolated floors, paired same-seed
// probes, discarded on non-clear) so the two series sit side by side and
// the reward/challenge ratio can be rebuilt exactly as before. `reward`
// here is challenge minus the manifest-equipped probe's own damage, same
// sign convention as the original: positive means the floor's loot, ALL of
// it, saves hp.
export function rewardShape(options = {}) {
  const {
    runs = 60, firstSeed = 800000, maxTurns = 4000, levels = LEVELS,
    gameOptions = {}, floorPlanFn = floorPlan,
  } = options;
  const rows = [];

  for (let level = 1; level <= levels; level++) {
    const plan = floorPlanFn(level);
    const challenge = [];
    const reward = [];
    const gearCount = [];
    const potionCount = [];
    const xpSamples = [];
    let discardedA = 0;
    let discardedR = 0;

    for (let i = 0; i < runs; i++) {
      const seed = hashSeeds(firstSeed + i, level);
      const a = driveFloor(seed, plan, false, maxTurns, gameOptions);
      const r = driveReward(seed, plan, maxTurns, gameOptions);
      if (!a.clearedAll) { discardedA++; continue; }
      if (!r.clearedAll) { discardedR++; continue; }
      challenge.push(a.damage);
      reward.push(a.damage - r.damage);
      gearCount.push(r.gearHeld);
      potionCount.push(r.potionsHeld);
      xpSamples.push(r.meanXp);
    }

    rows.push({
      level,
      nominal: plan.monsters,
      n: challenge.length,
      discardedA,
      discardedR,
      challenge: summarise(challenge),
      reward: summarise(reward),
      // Manifest size, for sanity-checking the number against what the
      // floor actually generated — not a statistic anyone should plot.
      meanGear: gearCount.reduce((s, x) => s + x, 0) / (gearCount.length || 1),
      meanPotions: potionCount.reduce((s, x) => s + x, 0) / (potionCount.length || 1),
      // Mean xp of the roster THIS floor generated (not the hero's own xp) —
      // a free read off the same manifest scan `driveReward` already does,
      // no extra play. Companion to `nominal` (creature count): count says
      // how full a floor is, this says how strong what's on it reads on
      // average, straight off generation rather than a modelled duel score.
      meanXp: xpSamples.reduce((s, x) => s + x, 0) / (xpSamples.length || 1),
    });
  }
  return rows;
}

// ***** map topology: alternative routes, and what a direct walk wakes ***** //
//
// All three numbers below read a FRESH, UNPLAYED newGame() state — pure
// generation, no probe, no play, same "read the manifest before a tile is
// walked" move rewardShape's driveReward already makes for loot.
function threatMassOf(m) {
  return m.hpMax * Math.max(0, m.xp - 1);
}

// BFS from `from` over `passable` tiles to the NEAREST tile in `targets` (a
// Set of 'x,y' keys). Mirrors the exact check monsters.js makes to decide
// whether a monster wakes (`path.length >= monster.activation`) — multi-
// target so one search answers "how close does the hero's walk ever get",
// instead of one findPath per route tile per monster.
function nearestDistance(from, targets, passable) {
  const start = `${from[0]},${from[1]}`;
  if (targets.has(start)) return 0;
  const seen = new Set([start]);
  const queue = [[from[0], from[1], 0]];
  let head = 0;
  while (head < queue.length) {
    const [x, y, d] = queue[head++];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx; const ny = y + dy;
      const key = `${nx},${ny}`;
      if (seen.has(key) || !passable(nx, ny)) continue;
      if (targets.has(key)) return d + 1;
      seen.add(key);
      queue.push([nx, ny, d + 1]);
    }
  }
  return Infinity;
}

export function topologyShape(options = {}) {
  const {
    runs = 100, firstSeed = 1100000, levels = LEVELS, gameOptions = {}, floorPlanFn = floorPlan,
  } = options;
  const rows = [];

  for (let level = 1; level <= levels; level++) {
    const plan = floorPlanFn(level);
    const spineShares = [];
    const altShares = [];
    const directShares = [];

    for (let i = 0; i < runs; i++) {
      const seed = hashSeeds(firstSeed + i, level);
      const state = newGame(seed, { ...plan, ...gameOptions });
      const passable = playerPassable(state.map);
      const info = classifyRooms(state.map, state.player.pos, state.shrine.pos);

      // B1 — spine vs side mass split. `spineShare` (src/sim/spine.js)
      // already does exactly this and is already tested against the
      // [0.6, 0.95] band in test/tests.js — reused rather than
      // reimplemented. Kept here only because B2 below needs the same
      // total mass to normalise against.
      const totalMass = state.monsters.reduce((s, m) => s + threatMassOf(m), 0);
      spineShares.push(spineShare(state));

      // M-A — alternative routes. For every spine room BETWEEN hero and
      // shrine (the two endpoint rooms cannot meaningfully be "bypassed",
      // so they are excluded), block its tiles and ask whether the shrine
      // is still reachable some other way. A room with no bypass is a true
      // bottleneck; one with a bypass is a real alternative, not a forced
      // tile dressed up as a choice.
      const startRoom = info.roomOf(state.player.pos);
      const endRoom = info.roomOf(state.shrine.pos);
      const middleSpine = info.spine.filter((r) => r !== startRoom && r !== endRoom);
      if (middleSpine.length > 0) {
        let bypassable = 0;
        for (const room of middleSpine) {
          const blocked = new Set();
          for (let x = room.x1; x <= room.x2; x++) {
            for (let y = room.y1; y <= room.y2; y++) blocked.add(`${x},${y}`);
          }
          const withoutRoom = (x, y) => !blocked.has(`${x},${y}`) && passable(x, y);
          const path = findPath(state.player.pos, state.shrine.pos, withoutRoom);
          if (path.length >= 2) bypassable++;
        }
        altShares.push(bypassable / middleSpine.length);
      }

      // B2 — what a hero who ONLY walks the direct route (no exploring, no
      // detours) wakes up along the way: any monster whose activation
      // radius reaches a tile on that route, by the identical distance rule
      // monsters.js checks at play time. Static geometry on the unplayed
      // state rather than a played probe — cheaper, and reads the mechanic
      // directly instead of approximating it through a policy.
      const routeTiles = new Set(info.path.map(([x, y]) => `${x},${y}`));
      let directMass = 0;
      for (const m of state.monsters) {
        const dist = nearestDistance(m.pos, routeTiles, passable);
        if (dist < m.activation) directMass += threatMassOf(m);
      }
      if (totalMass > 0) directShares.push(directMass / totalMass);
    }

    rows.push({
      level,
      spineMassShare: summarise(spineShares),
      altRouteShare: summarise(altShares),
      directEncounterShare: summarise(directShares),
    });
  }
  return rows;
}
