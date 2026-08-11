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

import { driveTurns, newGame } from '../sim/game.js';
import {
  floorPlan, floorOfTraversal, LEVELS, TRAVERSALS,
} from '../sim/dungeon.js';
import { hashSeeds, makeRng } from '../sim/rng.js';
import { posKey, playerPassable, walkablePositions } from '../sim/mapgen.js';
import { step } from '../sim/step.js';
import { observe, emptyBelief, foldBelief } from '../sim/observe.js';
import { makeBot } from '../bot/bot.js';
import { duelCost } from '../bot/duel.js';
import { effectiveHp, weaponDamage } from '../sim/combat.js';
import { DUEL_SAFETY_MARGIN } from '../sim/balance.js';
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

// ***** driving a pre-built state ***** //
//
// E1 — this used to reimplement `playGame`'s loop here, because `playGame`
// takes a seed and this needs a state that already exists. The loop now
// lives in `src/sim/` as `driveTurns` and this is a per-turn READER on top
// of it: the hook returns nothing, so the run is untouched.
function manhattan(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function playFromState(initialState, policy, maxTurns) {
  const turns = []; // { dmg, adjacent } per turn actually played

  const driven = driveTurns(initialState, policy, {
    maxTurns,
    onTurn: ({ state, before }) => {
      const dmg = state.log.slice(before.log.length)
        .filter((e) => e.type === 'attack' && e.target === 'player')
        .reduce((sum, e) => sum + e.damage, 0);
      const adjacent = state.monsters
        .filter((m) => !m.dead && manhattan(m.pos, state.player.pos) === 1).length;
      turns.push({ dmg, adjacent });
    },
  });

  return { state: driven.state, turns };
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
    // No `?? 0` at the newGame end that reads this back — omitting it
    // turns every kill's xpEarned accumulation to NaN from here on.
    xpEarned: player.xpEarned,
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

// ***** M10 reading — effective cluster size, post-fix ***** //
//
// `CLUSTER_SIZE = 6` is the ROLL, not what a floor ends up holding — M10
// (docs/backlog.md) cuts a cluster short the moment adding its next member
// would flip the zone quota, so the constant stopped describing floors the
// moment M10 landed. `spawn.js` does not tag a monster with which cluster
// placed it (no field for it, and this file does not add one — that would
// be touching src/sim/ to answer a question src/sim/ already exposes the
// answer to another way).
//
// What `state.monsters` DOES preserve is PUSH ORDER: `populate()`'s outer
// loop finishes placing every member of one cluster (the inner `for` over
// `positions`) before it starts the next, and never interleaves two
// clusters' pushes. So a cluster is exactly a maximal run of CONSECUTIVE
// array entries sharing one `template` — same `name` (which pins `xp`/`hp`
// too, since both come from the same table row). Reading that run length
// back off the array is the generation's own record of what it did, not a
// second opinion about it.
//
// The one failure mode: two DIFFERENT clusters land back to back in the
// array and happen to draw the identical monster tier, which merges them
// into one apparent run. This undercounts the number of clusters and
// overcounts their size, in the same direction the constant itself was
// already wrong in — worth naming, not worth chasing further for a reading
// this cheap to just re-run at a different sample size instead.
export function effectiveClusterSizes(options = {}) {
  const {
    runs = 60, firstSeed = 660000, levels = LEVELS, floorPlanFn = floorPlan,
  } = options;

  const perLevel = Array.from({ length: levels }, () => []);
  for (let level = 1; level <= levels; level++) {
    const plan = floorPlanFn(level);
    for (let i = 0; i < runs; i++) {
      const seed = hashSeeds(firstSeed + i, level);
      const state = newGame(seed, plan);
      let runLen = 0;
      let lastName = null;
      for (const m of state.monsters) {
        if (m.name === lastName) {
          runLen++;
        } else {
          if (runLen > 0) perLevel[level - 1].push(runLen);
          runLen = 1;
          lastName = m.name;
        }
      }
      if (runLen > 0) perLevel[level - 1].push(runLen);
    }
  }

  return perLevel.map((sizes, i) => {
    const counts = new Map();
    for (const s of sizes) counts.set(s, (counts.get(s) || 0) + 1);
    return {
      level: i + 1,
      clusters: sizes.length,
      mean: sizes.reduce((a, b) => a + b, 0) / (sizes.length || 1),
      max: sizes.length ? Math.max(...sizes) : 0,
      distribution: [...counts.entries()].sort((a, b) => a[0] - b[0])
        .map(([size, n]) => ({ size, n })),
    };
  });
}

// ***** I8 — one combined real-bot descent pass, for Product and Bot ***** //
//
// Seven of I8's twelve numbers (median/spread of depth reached, finishes,
// turns between events, damage per kill, reversal rate, turns per floor,
// lost fights started) all come from watching the SAME real ten-floor bot
// descents, so this is one turn-by-turn pass collecting all seven rather
// than seven separate ones — `botFinishesAndSpike` above already showed
// the real-bot descent is the expensive part (~1s/run), and running it
// seven times over instead of once would be the difference between "seconds"
// and not.
//
// Every quantity below reads state the loop already has in hand, or calls
// an existing exported function on it — nothing here re-derives what the
// bot decided:
//   - reversal rate compares consecutive ACTIONS the policy already
//     returned, against the same up/down/left/right opposite-pairing
//     bot.js's own reversal PENALTY uses (stated in its own comment) —
//     this observes the sequence, it does not touch bot.js.
//   - "a fight started" is detected the same way bot.js itself describes
//     attacking as working: "walking into it is the attack" — the first
//     time the player's chosen direction lands on a live monster's tile,
//     that monster's id goes in `engaged` and stays there, so a multi-turn
//     fight against the same monster is not recounted.
//   - "lost" reuses `duelCost` + `effectiveHp` + `DUEL_SAFETY_MARGIN`
//     (`src/bot/duel.js`, `src/sim/combat.js`, `src/sim/balance.js`, all
//     already exported) against the monster's OWN live stats at the
//     moment the fight actually started — the exact formula
//     `priceMonsters` uses internally for `worthStarting`, re-applied
//     externally to the engagement that happened rather than to every
//     candidate the bot considered and did not take. It answers "was the
//     fight the bot ended up in already priced as a loss when it began",
//     which is what "started" means here — not a reconstruction of
//     `chooseGoal`'s own target selection.
//   - events are the log's own `ascend`/`open`/a killing `attack` entries;
//     turn numbers reset to 0 every floor (`newGame`), so gaps spanning a
//     floor change are computed against a running offset kept across the
//     whole run, not per floor.
const DIRS4 = {
  up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
};
const OPPOSITE4 = {
  up: 'down', down: 'up', left: 'right', right: 'left',
};

// ***** I9 — bucketing for the conditional survival table ***** //
//
// COARSE ON PURPOSE. Every extra split costs support, the deep floors are
// thin already, and a table nobody can read answers nothing. These are
// presentation edges for an aggregation, not balance dials: they decide how
// the same runs are grouped, never what the game does.
//
// hp edges are pinned to the hero's own starting point rather than to
// quantiles, so the buckets keep meaning when the distribution moves. A hero
// starts at PLAYER_HP with no armour, which is why `10-14` exists as its own
// band and why floor 1 lands entirely inside it — that is what makes the
// floor-1 sanity check a real check of the plumbing.
const HP_EDGES = [5, 10, 15];
const HP_LABELS = ['1-4', '5-9', '10-14', '15+'];
// Weapon damage is a small integer sum (dagger 1, axe 2), so these are
// values rather than ranges until the hero has found several.
const WPN_EDGES = [2, 3];
const WPN_LABELS = ['1', '2', '3+'];

// Below this a cell is not a probability. At n=20 and p near the observed
// finish rate the standard error is about 8 points, which is coarse but
// usable; under that it is noise wearing a decimal point.
const MIN_SUPPORT = 20;

function bucketIndex(value, edges) {
  let i = 0;
  while (i < edges.length && value >= edges[i]) i++;
  return i;
}
const hpBucketOf = (v) => HP_LABELS[bucketIndex(v, HP_EDGES)];
const wpnBucketOf = (v) => WPN_LABELS[bucketIndex(v, WPN_EDGES)];

export function descentCheck(options = {}) {
  const {
    runs = 8, firstSeed = 800000, maxTurns = 1500, levels = LEVELS, hpFromKills = false,
    // I11 — see the counts block below.
    startingItems,
    // I13 — a run is TWENTY TRAVERSALS, not ten floors. This loop had its
    // own `for (level = 1; level <= levels; level++)` and never learned R1's
    // rule, so everything below it measured the descent half and called it a
    // run. Pass `traversals: LEVELS` to pin a plain descent, the same escape
    // hatch `playDungeon` gives for the same reason.
    traversals = TRAVERSALS,
    // I13 — forwarded to `makeBot` so a reading can be reproduced against a
    // DIFFERENT bot configuration than today's shipped one. Needed here
    // specifically: R1 measured 3.0% before the owner turned B22's
    // `lowWaterVeto` on, so checking this item against R1's number requires
    // R1's bot. Empty by default, so the shipped bot is what runs unless a
    // caller says otherwise.
    botOptions = {},
  } = options;

  const depths = [];
  let cleared = 0;
  let totalKills = 0;
  let totalDamage = 0;
  let totalActions = 0;
  let totalReversals = 0;
  let totalFloorTurns = 0;
  let floorAttempts = 0;
  let fightsStarted = 0;
  let lostFightsStarted = 0;
  let totalCoins = 0;
  const eventGaps = [];

  // ***** I12 — what a potion is actually worth today ***** //
  //
  // Generated is counted off the FRESH state of every floor the hero
  // actually reached, so the denominator is "potions the played floors
  // contained", not "potions the ten-floor ladder would contain". A floor
  // nobody reaches generates nothing and must not dilute the share.
  //
  // Drunk counts `heal` log events, which is the one signal that survives
  // M35 unchanged: pre-M35 the engine logs it on contact, post-M35 on the
  // drink action. Same event, same meaning, so the before/after comparison
  // this feeds is reading one quantity rather than two lookalikes.
  //
  // Refused is the channel M35 deletes and the reason this item exists:
  // pre-M35 a potion walked over at full hp is left on the map. Detected by
  // the hero standing on a potion still in `state.items` — under the shipped
  // rule pickup resolves on arrival, so an unclaimed potion underfoot IS a
  // refusal. Counted by item id, since the hero can stand there for several
  // turns or come back. Post-M35 this necessarily reads zero, which is the
  // point: it measures the size of the hole the feature fills.
  let potionsGenerated = 0;
  let potionsDrunk = 0;
  let healDelivered = 0;
  let healOverheal = 0;
  let drinksWasted = 0;
  let deaths = 0;
  let deathsHoldingPotion = 0;
  const refusedPotionIds = new Set();

  // ***** I9 — P(finish | floor, hero state) *****
  //
  // An AGGREGATION over the descents this function already drives, not a
  // rollout: every arrival state the table talks about is already visited
  // here. Record where the hero stood on arrival at each floor, then, once
  // the run has ended and its outcome is known, credit every one of those
  // arrivals with that outcome. A hero who reached floor 4 contributes one
  // observation to floor 1, 2, 3 and 4 — which is exactly what conditional
  // means: "from HERE, how often does the run finish".
  const arrivalsThisRun = [];
  const cells = new Map();

  for (let i = 0; i < runs; i++) {
    let carry = null;
    let lastAction = null;
    let runTurnOffset = 0;
    let lastEventTurn = 0;
    let depthReached = 0;
    let finishedThisRun = false;
    arrivalsThisRun.length = 0;

    // I13 — indexed by TRAVERSAL, and the floor comes from `dungeon.js`'s own
    // `floorOfTraversal` rather than a second copy of the pairing rule. The
    // map returns for free: a floor is generated from `hashSeeds(seed, level)`
    // and `floorPlan(level)`, neither of which reads the hero, so asking for
    // floor 9 again on the way up reproduces it tile for tile — exactly what
    // `playDungeon` does.
    for (let traversal = 1; traversal <= traversals; traversal++) {
      const level = floorOfTraversal(traversal, levels);
      const direction = traversal <= levels ? 'down' : 'up';
      const plan = floorPlan(level);
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
        outOfDepthChance: plan.outOfDepthChance,
        carry,
        hpFromKills,
        // I11 — the shop's channel (U6d/U6e): what the hero brings INTO the
        // run. Same forwarding `playDungeon` does, and `carry` wins from
        // floor 2 on, so it only ever arms floor 1. Undefined by default,
        // so every reading taken before this reproduces unchanged.
        startingItems,
      };
      const seed = hashSeeds(firstSeed + i, level);
      let state = newGame(seed, counts);
      // I9 — the hero as they ARRIVE, read off the state the engine built
      // rather than reconstructed from `carry`. Floor 1 has no carry, so the
      // engine's own STARTING_ITEMS land here and only a read of the built
      // state sees them — the mistake I11 found in observed-ruler's
      // `arrivedWith`, not repeated.
      // I13 — keyed by TRAVERSAL, not floor. Floor 4 going down and floor 4
      // coming back are different states: different hero, different band,
      // and after R3 different loot. One key for both folds them together
      // and averages two questions into one meaningless number.
      arrivalsThisRun.push({
        traversal,
        level,
        direction,
        effHp: effectiveHp(state.player),
        wpn: weaponDamage(state.player),
      });
      const xpStart = state.player.xpEarned;
      // Every potion this floor holds, wherever it is sitting: still inside a
      // chest, still on a monster, or already loose. All three are decided by
      // `newGame` before a tile is walked, so this is the floor's supply, not
      // what any policy managed to find. Read here rather than from a second
      // generation pass — same state, no extra cost, no chance of the two
      // disagreeing.
      const isPotion = (drop) => Boolean(drop) && drop.heal > 0;
      potionsGenerated += state.chests.filter((c) => isPotion(c.drop)).length
        + state.monsters.filter((m) => isPotion(m.drop)).length
        + state.items.filter(isPotion).length;
      const bot = makeBot({ monsterCount: plan.monsters, level, levels, ...botOptions });
      const engaged = new Set();

      // E1 — this used to be a fifth hand-written turn loop, not one of the
      // four the item named. Everything it did BEFORE the step is derivable
      // from `before` (the pre-step state) plus the action, so it folds into
      // the one after-step hook without the driver needing a second one.
      const driven = driveTurns(state, bot, {
        maxTurns,
        onTurn: ({ state: after, before, action }) => {
        if (lastAction && action === OPPOSITE4[lastAction]) totalReversals++;
        totalActions++;
        lastAction = action;

        const delta = DIRS4[action];
        if (delta) {
          const targetPos = [before.player.pos[0] + delta[0], before.player.pos[1] + delta[1]];
          const target = before.monsters.find((m) => !m.dead
            && m.pos[0] === targetPos[0] && m.pos[1] === targetPos[1]);
          if (target && !engaged.has(target.id)) {
            engaged.add(target.id);
            fightsStarted++;
            const duel = duelCost(before.player, target);
            if (duel.hpLost > effectiveHp(before.player) * DUEL_SAFETY_MARGIN) lostFightsStarted++;
          }
        }

        const beforeLog = before.log.length;
        // hp entering the step, and the ceiling it heals against. Both are
        // read from the PRE-STEP state because a heal always resolves inside
        // the player's own action, before any monster acts — so this is the
        // hp the engine's own `Math.min(hpMax, hp + heal)` sees. See the heal
        // accounting below for why the logged amount cannot be trusted on
        // its own. hpMax cannot move mid-step here: `hpFromKills` is off.
        const hpBefore = before.player.hp;
        const hpCeiling = before.player.hpMax;
        const state = after;

        // Standing on a potion that is still on the map. Pre-M35 pickup
        // resolves on arrival, so this can only mean the full-hp refusal
        // fired. By id, because the hero may stand here for several turns.
        for (const item of state.items) {
          if (item.heal > 0
            && item.pos[0] === state.player.pos[0] && item.pos[1] === state.player.pos[1]) {
            refusedPotionIds.add(item.id);
          }
        }

        // Heal delivered, reconstructed rather than read off the log — the
        // one number that is NOT comparable across the M35 boundary if you
        // trust `amount`.
        //
        // Pre-M35 the engine logged `amount: item.heal`, the potion's FACE
        // value, while actually giving `min(hpMax, hp + heal) - hp`. A potion
        // walked over 1 hp short of full delivered 1 and logged 3. That
        // overheal is precisely the waste M35 recovers, so a baseline that
        // reads the log overstates the "before" by every point of it and
        // hides the feature's main effect. Post-M35 `amount` IS the real
        // gain.
        //
        // Applying the engine's own cap to the logged amount is correct on
        // BOTH sides, which is why there is one implementation and not two:
        // pre-M35 it recovers the true gain from the face value; post-M35
        // `hp + gain` never exceeds hpMax by construction, so the cap is a
        // no-op and it returns the gain unchanged.
        let hpRunning = hpBefore;
        for (const e of state.log.slice(beforeLog)) {
          if (e.type === 'heal') {
            const delivered = Math.min(hpCeiling, hpRunning + e.amount) - hpRunning;
            hpRunning += delivered;
            potionsDrunk++;
            healDelivered += delivered;
            // Logged minus delivered. Pre-M35 this is real waste to the cap.
            // Post-M35 it is structurally 0 — NOT because overheal stopped
            // happening, but because the log no longer carries face value,
            // so the instrument cannot see it. Reading a 0 here after M35 as
            // "no overheal" would be wrong; measuring it would need the
            // engine to log both numbers, which is not worth an engine
            // change for a quantity B14's policy exists to drive to zero.
            healOverheal += e.amount - delivered;
            // I12b. A drink that gained nothing. Pre-M35 unreachable (the
            // engine refuses a potion at full hp instead of wasting it), so
            // a 0 in the baseline is the shipped rule, not a dead counter.
            if (delivered === 0) drinksWasted++;
          }
          if (e.type === 'attack' && e.target === 'player') totalDamage += e.damage;
          const isEvent = e.type === 'ascend' || e.type === 'open'
            || (e.type === 'attack' && e.by === 'player' && e.killed);
          if (isEvent) {
            const at = runTurnOffset + state.turn;
            eventGaps.push(at - lastEventTurn);
            lastEventTurn = at;
          }
        }
        },
      });
      state = driven.state;

      totalFloorTurns += state.turn;
      floorAttempts++;
      runTurnOffset += state.turn;
      // I13 — depth counts TRAVERSALS survived, matching `playDungeon`'s own
      // `depth`. On a pinned descent (traversals: LEVELS) the two are the
      // same number, so a caller measuring a plain descent sees no change.
      depthReached = traversal;
      // Theoretical coins: round(xp gained ÷ turns spent × 10), this floor,
      // added into the run's running total.
      if (state.turn > 0) {
        totalCoins += Math.round(((state.player.xpEarned - xpStart) / state.turn) * 10);
      }

      if (state.outcome !== 'ascended') {
        // The tripwire (I12): died with a potion still unspent. Structurally
        // impossible pre-M35 — the engine never lets a potion into the
        // inventory — so a zero here is the shipped rule, not evidence the
        // counter works. It becomes a real signal only once M35 lands.
        if (state.outcome === 'died') {
          deaths++;
          if (state.player.inventory.some((i) => i.heal > 0)) deathsHoldingPotion++;
        }
        totalKills += state.player.kills.length;
        break;
      }
      carry = carryFromPlayer(state.player);
      // I13 — VICTORY IS THE LAST TRAVERSAL. Reaching the bottom clears
      // nothing on its own; it is the halfway point.
      if (traversal === traversals) {
        cleared++;
        finishedThisRun = true;
        totalKills += state.player.kills.length;
      }
    }
    depths.push(depthReached);

    // I9 — the run's outcome is known now, so every state it passed through
    // gets credited with it.
    for (const a of arrivalsThisRun) {
      const hp = hpBucketOf(a.effHp);
      const wpn = wpnBucketOf(a.wpn);
      const key = `${a.traversal}|${hp}|${wpn}`;
      const cell = cells.get(key) ?? {
        traversal: a.traversal, level: a.level, direction: a.direction, hp, wpn, n: 0, finished: 0,
      };
      cell.n++;
      if (finishedThisRun) cell.finished++;
      cells.set(key, cell);
    }
  }

  const sortedDepths = [...depths].sort((a, b) => a - b);
  const mid = Math.floor(sortedDepths.length / 2);
  const medianDepth = sortedDepths.length % 2
    ? sortedDepths[mid]
    : (sortedDepths[mid - 1] + sortedDepths[mid]) / 2;
  const meanDepth = depths.reduce((a, b) => a + b, 0) / (depths.length || 1);
  const depthSpread = Math.sqrt(
    depths.reduce((s, d) => s + (d - meanDepth) ** 2, 0) / (depths.length || 1),
  );

  const sortedGaps = [...eventGaps].sort((a, b) => a - b);
  const gapMid = Math.floor(sortedGaps.length / 2);
  const medianGap = sortedGaps.length
    ? (sortedGaps.length % 2 ? sortedGaps[gapMid] : (sortedGaps[gapMid - 1] + sortedGaps[gapMid]) / 2)
    : null;

  return {
    runs,
    cleared,
    finishRate: runs ? cleared / runs : 0,
    // Standard error of `finishRate` as a proportion, so a before/after
    // comparison has the sigma CLAUDE.md requires without recomputing it.
    // At the rates involved (~0.25%) this is the number that decides whether
    // a sample can resolve the difference at all.
    finishRateSe: runs ? Math.sqrt((cleared / runs) * (1 - cleared / runs) / runs) : 0,
    // ***** I9 — P(finish | floor, effective hp, weapon damage) *****
    //
    // One row per populated cell. `p` is the share of runs that passed
    // through that state and went on to finish all ten floors; `se` is its
    // binomial standard error. `readable` is `n >= MIN_SUPPORT` — a caller
    // that shows a cell below it is showing noise, and the Map cost table
    // already learned (I11) that a blank beats a confident number nobody can
    // use.
    //
    // AVERAGED OVER DUNGEONS, not conditional on any one of them: every
    // seed's map sits in the same bucket. Right for design, wrong for a live
    // on-screen number — that is U2, and it is blocked on E1.
    //
    // NOT "hope". objectives.md's property is broader than the finish: a run
    // with several questions still open has hope when one of them closes, so
    // a zero here says the FINISH is decided, not that the run stopped being
    // worth watching. Do not relabel it on any page.
    survival: {
      hpLabels: HP_LABELS,
      wpnLabels: WPN_LABELS,
      minSupport: MIN_SUPPORT,
      traversals,
      // I13 — every cell carries `traversal`, `level` and `direction`. The
      // key is the traversal: floor 4 down and floor 4 up are separate rows,
      // and `level` rides along only so a reader can see which floor a
      // traversal crossed.
      cells: [...cells.values()]
        .sort((a, b) => a.traversal - b.traversal
          || HP_LABELS.indexOf(a.hp) - HP_LABELS.indexOf(b.hp)
          || WPN_LABELS.indexOf(a.wpn) - WPN_LABELS.indexOf(b.wpn))
        .map((c) => {
          const p = c.n ? c.finished / c.n : null;
          return {
            ...c,
            p,
            se: c.n ? Math.sqrt((p * (1 - p)) / c.n) : null,
            readable: c.n >= MIN_SUPPORT,
          };
        }),
    },
    // I12. Totals, deliberately, alongside the share: potions that stop
    // being wasted make runs last longer, so any rate here moves partly
    // because its denominator moved. Report both and say which did what.
    potionsGenerated,
    potionsDrunk,
    potionsRefusedAtFullHp: refusedPotionIds.size,
    potionShareDrunk: potionsGenerated ? potionsDrunk / potionsGenerated : null,
    // The number M35 moves most directly, and the only heal figure that
    // means the same thing on both sides of that change. Per GENERATED
    // potion, not per drunk one: "what the floor's supply is worth to a
    // hero", which is what the feature is trying to raise. Totals sit
    // beside it because runs that stop wasting potions last longer, and a
    // longer run reaches more potions — the denominator moves too.
    healDelivered,
    healPerPotionGenerated: potionsGenerated ? healDelivered / potionsGenerated : null,
    // Pre-M35 only — see the accounting above for why this reads 0 after
    // M35 whether or not overheal is still happening.
    healOverheal,
    // I12b — a tripwire, not a scoreboard. Fires when a drink policy drinks
    // at the wrong moment; `deathsHoldingPotion` catches the opposite error.
    drinksWasted,
    drinksUseful: potionsDrunk - drinksWasted,
    deaths,
    deathsHoldingPotion,
    depths,
    medianDepth,
    depthSpread,
    eventGapMedian: medianGap,
    eventGapN: eventGaps.length,
    damagePerKill: totalKills ? totalDamage / totalKills : null,
    totalKills,
    reversalRate: totalActions ? totalReversals / totalActions : null,
    totalActions,
    // I13 — one attempt per TRAVERSAL now, so a completed run contributes
    // twenty of these rather than ten. The name is kept because every reader
    // of it means "per crossing", which is what it still counts; what moved
    // is how many crossings a run has.
    turnsPerFloor: floorAttempts ? totalFloorTurns / floorAttempts : null,
    floorAttempts,
    traversals,
    fightsStarted,
    lostFightsStarted,
    lostFightRate: fightsStarted ? lostFightsStarted / fightsStarted : null,
    meanCoins: runs ? totalCoins / runs : null,
  };
}
