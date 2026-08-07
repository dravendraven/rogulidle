// DECISION (M7 landed real clustering in the engine; this file's call to
// make, per the M7 report and docs/backlog.md's "metrics owns this file").
//
// `toGrouped()` below CANNOT be made to "call the engine's placement" and
// still answer I2's question. The engine's mechanism (`src/sim/spawn.js`,
// `clusterAround`) draws ONE shared tier per cluster as it places it — tier
// and position are chosen together, which is the whole point (M7's mid-build
// finding: position-only clustering with independent tiers moved CV growth
// 0.944 -> 0.945, nothing; same-type clusters moved it to 0.954+). I2 needed
// the opposite: hold the roster's IDENTITIES fixed and vary only position,
// to isolate spatial concentration from everything else. Those are two
// different experiments, not two implementations of one.
//
// So: DEPRECATED, not reconciled. `toGrouped`, `clusterExperiment`,
// `signTest` and everything they feed stay exactly as I2/I3 left them —
// already DONE, already reviewed, describing THIS instrument's definition
// of "grouped" (post-hoc, spatial-only, no zone awareness, cluster size
// fixed at 3). Do not read them as a description of the shipped game after
// M7, and do not extend them for a new clustering question.
//
// A NEW clustering question against the REAL engine mechanism (any question
// after this one) should toggle `DIFFICULTY_REBALANCED`'s "on" state
// directly — `src/analysis/observed-ruler.js` exports `M7_ON`
// (`makeFloorPlan` from `src/sim/difficulty.js`, already built for reading a
// flag's alternate state) — and drive the real bot or a probe against it,
// the same way M7's own "settle the mechanism" reading does. No file here
// needs editing for that; it needs calling correctly from wherever the new
// question lives.
//
// ---
//
// I2 — does spatial clustering change LETHALITY, holding the roster fixed?
//
// A previous test spread the same roster out or grouped it and found no
// change in cost. That result used a 400-hp measuring hero, which is blind
// to the one thing clustering actually changes: spread or grouped, the hero
// meets the same creatures and takes a similar TOTAL number of blows — what
// changes is their CONCENTRATION IN TIME. Three adjacent creatures strike in
// the same turn. To a 400-hp hero that is noise; to the real 10-hp hero it
// is the difference between living and dying. This file re-runs the
// comparison with the real hero and the real bot, and asks about lethality
// and adjacency instead of cost.
//
// A second confound the backlog calls out: the bot actively prices being
// reachable by two monsters at once (src/bot/threat.js, CROWD_PENALTY) and
// routes around it. A competent bot can convert a cluster back into
// sequential duels using a corridor — so "grouping changed nothing" might
// mean "the bot un-grouped it". Both questions are answered here: whether
// clustering raises lethality, and whether the bot is visibly un-grouping
// (fraction of turns with two or more live monsters adjacent, grouped
// against spread).
//
// WHAT "GROUPED" MEANS HERE. The roster (each monster's xp, hp, activation,
// drop) is generated completely normally by the shipped `populate()` — this
// file changes nothing about generation. Only monster POSITION is
// rewritten afterwards, as a pure post-processing step: monsters are
// gathered into clusters of a few tiles each instead of being scattered
// independently across the free-tile pool. The map, player, shrine and
// chests are untouched.
//
// SIMPLIFICATION, DISCLOSED. Clustering here ignores the spine/side split
// (src/sim/spine.js) — a monster keeps its original `.side` tag (so R0 still
// reads sensibly to the bot) but its new position is not guaranteed to sit
// in a room of the same zone. This is a mechanism probe, not a proposed map
// change: M2, if this supports it, is where zone-aware clustering would be
// built for real.
//
// FROZEN, LIKE THE I1 PROBES. No import from src/bot/ for the mechanism
// itself — only the measurement driver below imports `makeBot`, because the
// whole question is about the REAL bot's behaviour, same as I4.

import { newGame } from '../sim/game.js';
import { floorPlan, LEVELS } from '../sim/dungeon.js';
import { hashSeeds, makeRng } from '../sim/rng.js';
import { posKey, playerPassable, walkablePositions } from '../sim/mapgen.js';
import { step } from '../sim/step.js';
import { observe, emptyBelief, foldBelief } from '../sim/observe.js';
import { makeBot } from '../bot/bot.js';
import { REFERENCE_HERO } from './hardness.js';

function heroCopy(hero) {
  return { ...hero, inventory: hero.inventory.map((i) => ({ ...i })), kills: [] };
}

// ***** grouping: a pure post-processing pass over an already-generated floor ***** //

// Breadth-first order from `start`, over terrain only (no entity blocking) —
// nearest tiles first. Used to find "the K free tiles closest to this
// anchor", which is the entire clustering mechanism.
function floodOrder(start, passable) {
  const order = [];
  const seen = new Set([posKey(start)]);
  const queue = [start];
  let head = 0;
  while (head < queue.length) {
    const [x, y] = queue[head++];
    order.push([x, y]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const k = nx + ',' + ny;
      if (seen.has(k) || !passable(nx, ny)) continue;
      seen.add(k);
      queue.push([nx, ny]);
    }
  }
  return order;
}

// Takes a normally-generated state and returns a new one where monster
// IDENTITIES are unchanged but positions are gathered into clusters of
// `clusterSize` tiles each, nearest-neighbour, instead of being independent
// draws over the whole free pool. Deterministic from `seed`, on its own rng
// instance — never touches the game's own rng streams, so this is a pure
// analysis-time transform, not a second way to play the same seed.
export function toGrouped(state, clusterSize, seed) {
  const map = state.map;
  const passable = playerPassable(map);
  const rng = makeRng(hashSeeds(seed, 0xc1005e));

  const taken = new Set([
    posKey(state.player.pos),
    posKey(state.shrine.pos),
    ...state.chests.map((c) => posKey(c.pos)),
  ]);
  const free = new Set(
    walkablePositions(map).map(posKey).filter((k) => !taken.has(k)),
  );

  const monsters = state.monsters.map((m) => ({ ...m }));
  let i = 0;
  while (i < monsters.length) {
    const cluster = monsters.slice(i, i + clusterSize);
    const freeArr = [...free];
    if (!freeArr.length) break; // out of room — should not happen, floor is sparse
    const anchorKey = freeArr[Math.floor(rng() * freeArr.length)];
    const anchor = anchorKey.split(',').map(Number);
    const order = floodOrder(anchor, passable).map(posKey).filter((k) => free.has(k));

    for (let j = 0; j < cluster.length; j++) {
      const chosenKey = order[j];
      if (!chosenKey) break; // this pocket ran out — leftover monsters start a new cluster
      const pos = chosenKey.split(',').map(Number);
      cluster[j].pos = pos;
      if (cluster[j].drop) cluster[j].drop = { ...cluster[j].drop, pos: pos.slice() };
      free.delete(chosenKey);
    }
    i += clusterSize;
  }

  return { ...state, monsters, chests: state.chests.map((c) => ({ ...c })), items: state.items.slice() };
}

// ***** driving a pre-built state, since playGame only ever builds its own ***** //
//
// Reimplements playGame's loop (src/sim/game.js) against a state that
// already exists instead of a seed, using nothing but already-exported pure
// functions (step, observe, foldBelief). No engine file changes needed for
// this — game.js keeps generating floors exactly as it always has.
function manhattan(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function playFromState(initialState, policy, maxTurns) {
  let state = initialState;
  let observation = observe(state);
  let belief = foldBelief(emptyBelief(), observation);
  let decisions = 0;
  const maxDecisions = maxTurns * 4;

  const turns = []; // { dmg, adjacent } per turn actually played

  while (!state.outcome && state.turn < maxTurns && decisions < maxDecisions) {
    const beforeLog = state.log.length;
    const action = policy(belief, observation);
    const result = step(state, action);
    state = result.state;
    observation = result.observation;
    belief = foldBelief(belief, observation);
    decisions++;

    const dmg = state.log.slice(beforeLog)
      .filter((e) => e.type === 'attack' && e.target === 'player')
      .reduce((sum, e) => sum + e.damage, 0);
    const adjacent = state.monsters
      .filter((m) => !m.dead && manhattan(m.pos, state.player.pos) === 1).length;
    turns.push({ dmg, adjacent });
  }

  return { state, turns };
}

// ***** the experiment ***** //

// Same seed drives both conditions: `spread` is the shipped `populate()`
// unchanged; `grouped` takes its exact roster and re-places it. Both are
// played by the SAME real bot (this is a question about the bot, like I4).
//
// Floors are ISOLATED (one level, not a ten-floor descent), same as I1's
// challenge/reward and hardness.js's floorHardness — a level-10 floor is
// calibrated for a hero who arrived with nine floors of gear, so testing it
// with the bare level-1 starting kit saturates death near 100% in BOTH
// conditions and the comparison loses all power (checked: 5/5 spread, 4/5
// grouped at level 10 with the bare kit, before this fix). The hero is
// therefore `REFERENCE_HERO` — this project's existing fixed yardstick (10
// hp, +6 armour, an axe; see analysis/hardness.js) — not a literal fresh
// level-1 hero and not the 400-hp calibration tank either. It is still an
// ordinary, killable hero, which is what "normal hero" in the acceptance
// criteria is asking for: someone who CAN die, at every floor tested.
export function clusterExperiment(options = {}) {
  const {
    runs = 100, firstSeed = 300000, maxTurns = 1500, clusterSize = 3,
    levels = LEVELS, hero = REFERENCE_HERO,
  } = options;

  const rows = [];
  for (let level = 1; level <= levels; level++) {
    const plan = { ...floorPlan(level), carry: heroCopy(hero) };
    const cond = { spread: [], grouped: [] };

    for (let i = 0; i < runs; i++) {
      const seed = hashSeeds(firstSeed + i, level);
      const spreadInit = newGame(seed, plan);
      const groupedInit = toGrouped(spreadInit, clusterSize, seed);

      for (const [name, init] of [['spread', spreadInit], ['grouped', groupedInit]]) {
        // A fresh bot per run — it carries plan state that means nothing
        // on a different floor (same reason playDungeon makes one per floor).
        const bot = makeBot({ monsterCount: plan.monsters });
        // Deep-clone the pre-built state so both conditions start from an
        // untouched copy — `newGame`'s output is otherwise shared/mutated
        // by `step`'s clone-on-write, which is safe, but cloning here keeps
        // the two playthroughs from ever being able to alias each other.
        const initClone = {
          ...init,
          player: {
            ...init.player,
            pos: init.player.pos.slice(),
            inventory: init.player.inventory.map((it) => ({ ...it })),
            kills: init.player.kills.slice(),
          },
          monsters: init.monsters.map((m) => ({ ...m, pos: m.pos.slice() })),
          chests: init.chests.map((c) => ({ ...c, pos: c.pos.slice() })),
          items: init.items.slice(),
          log: init.log.slice(),
        };
        const { state, turns } = playFromState(initClone, bot, maxTurns);

        const worstTurn = turns.reduce((max, t) => Math.max(max, t.dmg), 0);
        const crowdedTurns = turns.filter((t) => t.adjacent >= 2).length;
        cond[name].push({
          died: state.outcome === 'died',
          worstTurn,
          crowdedFraction: turns.length ? crowdedTurns / turns.length : 0,
          turns: turns.length,
        });
      }
    }

    rows.push({ level, monsters: plan.monsters, runs, ...summariseCondition(cond) });
  }
  return rows;
}

function rate(xs, pred) {
  const hit = xs.filter(pred).length;
  const n = xs.length;
  const p = n ? hit / n : 0;
  const se = n ? Math.sqrt(p * (1 - p) / n) : 0;
  return { hit, n, p, se };
}

function mean(xs) {
  const n = xs.length;
  if (!n) return { n: 0, mean: NaN, se: 0 };
  const m = xs.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1 ? xs.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1) : 0;
  return { n, mean: m, se: Math.sqrt(variance) / Math.sqrt(n) };
}

function summariseCondition(cond) {
  const out = {};
  for (const name of ['spread', 'grouped']) {
    const xs = cond[name];
    out[name] = {
      death: rate(xs, (x) => x.died),
      worstTurn: mean(xs.map((x) => x.worstTurn)),
      crowded: mean(xs.map((x) => x.crowdedFraction)),
    };
  }
  return out;
}

// Difference of two proportions, pooled SE — same test analysis.js already
// uses (hardness.js's compareRates) for exactly this reason: don't report a
// gap without its z.
export function compareRates(a, b) {
  if (!a.n || !b.n) return { gap: null, z: null };
  const pooled = (a.hit + b.hit) / (a.n + b.n);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / a.n + 1 / b.n));
  const gap = a.p - b.p;
  return { gap, z: se > 0 ? gap / se : null };
}

// Difference of two means, independent-sample SE.
export function compareMeans(a, b) {
  if (!a.n || !b.n) return { gap: null, z: null };
  const gap = a.mean - b.mean;
  const se = Math.sqrt(a.se ** 2 + b.se ** 2);
  return { gap, z: se > 0 ? gap / se : null };
}

// ***** I3 Q1 — sign test on I2's death-rate gap ***** //
//
// SCOPE, after I3 was cut back to this question alone: this re-analyses
// data I2 already collected — no new floor is generated, no new game is
// played, nothing about `src/sim/` changes. It is math over a published
// table, which is why it is still a metrics-agent task when "build a
// variant to study the game" is not. What it settles is the SIGN of the
// gap `clusterExperiment`'s `toGrouped()` produces — the instrument's
// definition of grouped (post-processing, cluster size 3, spine/side
// ignored). It is not a statement about clustering as `src/sim/` will
// generate it once M2 builds that switched off by default; I3's other two
// questions wait for M2 to exist for exactly this reason. Report it as a
// direction for M2, not a verdict on M2.
//
// Two-sided exact sign test: under H0 every non-tied floor is a fair coin
// flip (grouped costlier or cheaper, 50/50), so if `hits` of `n` non-tied
// floors all land the same way, p = 2 x 0.5^n (capped at 1). Takes counts
// rather than the raw gaps so it can be checked against the table by eye.
export function signTest(hits, n) {
  if (n === 0) return { n, hits, p: 1 };
  const extreme = Math.max(hits, n - hits);
  const p = Math.min(1, 2 * Math.pow(0.5, n) * binomCoeffSum(n, extreme));
  return { n, hits, p };
}

// Sum of C(n, k) for k = extreme..n — the tail mass on ONE side, before the
// 2x for two-sided. At `extreme === n` (all-one-direction, I2's case) this
// is exactly 1 and the caller's 2 x 0.5^n is the whole answer; kept general
// so a future re-run with a mixed record still gets the right p.
function binomCoeffSum(n, kFrom) {
  let sum = 0;
  let coeff = 1; // C(n, 0)
  for (let k = 0; k <= n; k++) {
    if (k >= kFrom) sum += coeff;
    coeff = coeff * (n - k) / (k + 1);
  }
  return sum;
}

// ***** M7 — finishes and per-turn spike, against the REAL engine flag ***** //
//
// The thing the file header above decided: a NEW clustering-adjacent
// question, answered against `src/sim/`'s actual mechanism
// (`floorPlanFn` — pass `M7_ON` from `src/analysis/observed-ruler.js` for
// the flag's "on" state, omit for shipped/off), not against `toGrouped`.
//
// Real bot (`makeBot`), full ten-floor descents. Two things the Sonda-based
// ruler cannot answer: "finishes" (Sonda B does not survive descents at all,
// on or off — measured 0/1500 and 3/1500 in the same session's ruler
// reading, which is not what "finishes" means anywhere else in this
// project) and per-turn damage percentiles (`builtShape` only has
// per-FLOOR damage; the spike question is about concentration WITHIN a
// floor, which needs per-turn granularity).
//
// Reimplements the descent loop locally, same reasoning as
// `observed-ruler.js`'s `driveDescent`: no hook in `playDungeon` for
// per-turn tracking, and reaching into `src/sim/` for one is not this
// file's call to make alone. `playFromState` below already exists for
// exactly this (built for I2), so this just drives it across ten floors
// with carry propagation instead of one.
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

// Nearest-rank percentile, matching I3's definition (removed with the rest
// of I3's Q2 build, needed again here for the same reason).
function percentile(xs, p) {
  if (!xs.length) return NaN;
  const sorted = [...xs].sort((a, b) => a - b);
  const rank = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1);
  return sorted[Math.max(0, rank)];
}

export function botFinishesAndSpike(options = {}) {
  const {
    runs = 150, firstSeed = 970000, maxTurns = 1500, levels = LEVELS,
    floorPlanFn = floorPlan, hpFromKills = false,
  } = options;

  let cleared = 0;
  const allTurnDamage = [];
  const perLevel = Array.from({ length: levels }, () => []);
  // M7 review 2: the pooled p95/p99 above are dominated by walking turns —
  // the overwhelming majority of a descent is not combat, so p95=0 mostly
  // says "most turns aren't a fight," not "the fights are gentle." These
  // two mirror the pooled ones but condition on `adjacent >= 1` (at least
  // one live monster next to the player that turn) — cheap, since `turns`
  // already carries `adjacent` per turn from playFromState, no replay
  // needed.
  const allTurnDamageAdjacent = [];
  const perLevelAdjacent = Array.from({ length: levels }, () => []);

  for (let i = 0; i < runs; i++) {
    let carry = null;
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
        // M3's field. Missing here since before this fix, meaning any
        // floorPlanFn that set it (e.g. M3_ON) silently read as "off" —
        // spawn.js falls back to `counts.outOfDepthChance ?? 0`. Found
        // while trying to actually measure M3's on/off difference through
        // the real bot: both arms came back byte-identical over 150 runs,
        // which isolatedShape's own (correct) reading had already shown
        // was not possible once the reskin chance is non-zero.
        outOfDepthChance: plan.outOfDepthChance,
        carry,
        hpFromKills,
      };
      const seed = hashSeeds(firstSeed + i, level);
      const state = newGame(seed, counts);
      const bot = makeBot({ monsterCount: plan.monsters, level, levels });
      const { state: endState, turns } = playFromState(state, bot, maxTurns);

      for (const t of turns) {
        allTurnDamage.push(t.dmg);
        perLevel[level - 1].push(t.dmg);
        if (t.adjacent >= 1) {
          allTurnDamageAdjacent.push(t.dmg);
          perLevelAdjacent[level - 1].push(t.dmg);
        }
      }

      if (endState.outcome !== 'ascended') { carry = null; break; }
      carry = carryFromPlayer(endState.player);
      if (level === levels) cleared++;
    }
  }

  return {
    cleared,
    runs,
    finishRate: runs ? cleared / runs : 0,
    finishSe: runs ? Math.sqrt((cleared / runs) * (1 - cleared / runs) / runs) : 0,
    pooled: {
      n: allTurnDamage.length,
      p95: percentile(allTurnDamage, 0.95),
      p99: percentile(allTurnDamage, 0.99),
    },
    perLevel: perLevel.map((xs, i) => ({
      level: i + 1, n: xs.length, p95: percentile(xs, 0.95), p99: percentile(xs, 0.99),
    })),
    // Conditioned on a live monster adjacent that turn — see the note above
    // allTurnDamageAdjacent. `n` here is turns-in-a-fight, not turns overall,
    // so it is far smaller than `pooled.n` by construction; that shrink is
    // the point, not a defect.
    pooledAdjacent: {
      n: allTurnDamageAdjacent.length,
      p95: percentile(allTurnDamageAdjacent, 0.95),
      p99: percentile(allTurnDamageAdjacent, 0.99),
    },
    perLevelAdjacent: perLevelAdjacent.map((xs, i) => ({
      level: i + 1, n: xs.length, p95: percentile(xs, 0.95), p99: percentile(xs, 0.99),
    })),
  };
}
