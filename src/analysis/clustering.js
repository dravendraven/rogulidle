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
