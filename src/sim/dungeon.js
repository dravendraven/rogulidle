// A run: ten floors, crossed twenty times — down to the bottom and back up.
//
// A single traversal is a complete game — the shrine ends it. A run strings
// twenty of them together, and the shrine becomes a staircase for all but the
// last. What the hero IS carries across; where they stood does not.
//
// R1 built the structure and nothing else: traversals 11–20 reuse the map
// their descent twins generated and are otherwise identical to them. What
// makes the return DIFFERENT — a new creature seed, no chests, a widening
// draw — is R2, R3 and R4 laid on top, deliberately separate so each can be
// measured against the one before it.
//
// THE REQUIREMENT: floor 1 is the gentlest and floor 10 the hardest, for
// the REAL hero — the one who arrives at floor 10 carrying everything the
// nine floors above handed over. Not for a yardstick hero.
//
// MET. Measured over 24 descents (src/analysis/hardness.js, descentCurve):
//
//   floor        1     3     5     7     9    10
//   capacity   10.0   8.7  11.2   9.8   9.2   6.5
//   damage      2.7   5.0   4.1   5.8   8.0   6.5
//   net        0.27  0.58  0.37  0.59  0.87  1.00
//
// Net challenge is the floor's cost over what the hero walked in with. It
// climbs 0.27 to 1.00, and 1.00 means floor ten demands everything the hero
// still has.
//
// The load-bearing column is CAPACITY, and it falls: 10.0 down to 6.5. The
// hero reaches the bottom weaker than they started. That is what closed the
// old problem, where the descent got easier because power ran away from the
// floors faster than the floors grew.
//
// Three things did it, and none of them was the dial:
//
//   - armour became a second bar that is SPENT, not permanent mitigation
//   - passive regeneration removed, so damage taken is damage kept
//   - xp frozen, so kills stop compounding into output
//
// Earlier attempts that failed are worth remembering, because they all
// share one shape: freezing xp, halving weapon value and making armour
// scarce each slowed the RATE of accumulation, and none of them capped it.
// Only spending the resource did.
//
// FRONT-LOADED ATTRITION, since fixed. Under the old additive law all 24
// heroes met floor 2 and only 2 met floor 10 — the hardest floors were the
// ones almost nobody saw. Exponential growth moved the jumps downward and
// bought back the bottom of the dungeon:
//
//                       additive      exponential
//   cleared               1/16            8/24
//   average depth          5.1             7.1
//   reached floor 10         2               9
//
// WHAT IS WRONG NOW: capacity climbs again, 10.0 -> 11.8. A gentle opening
// lets the hero bank gear cheaply — six chests on a three-creature floor is
// generous — so they outgrow the dungeon by the middle. Net challenge on
// floor 10 fell from 1.00 to 0.71 as a result. Chests are the lever, not
// the growth rate.

import { PLAYER_HP, PLAYER_XP } from './balance.js';
import { hashSeeds } from './rng.js';
import {
  floorParams, monstersAt, MONSTERS_BASE, MONSTER_GROWTH,
} from './difficulty.js';
import { playGame } from './game.js';

export const LEVELS = 10;

// R1 — docs/backlog.md, design in docs/map-design.md ("The run laid out").
// A run is TWENTY TRAVERSALS over ten floors: down to the bottom and back up,
// every floor crossed exactly twice.
//
// DERIVED, not a dial. "Every floor is crossed exactly twice" is the shape
// the design states, so this cannot drift away from `LEVELS` — there is
// nothing here for balance.md to hold a row for.
export const TRAVERSALS = LEVELS * 2;

// Which floor a traversal crosses. THE pairing rule, written once: ascent
// traversal `k` crosses floor `2 × floors + 1 − k`, so traversal 11 is the
// second crossing of the deepest floor and traversal 20 the second crossing
// of the first.
//
// This is also what makes the map come back for free. A floor is generated
// from `hashSeeds(seed, level)` and its `floorPlan(level)`, and neither reads
// the hero — so asking for the same floor number a second time reproduces the
// same map AND the same roster, tile for tile, with no cache and no second
// seed. R2 is what will pull the creature seed away from the map seed; R1
// only has to avoid making that harder, which keeping one seed does.
//
// DIFFICULTY IS INDEXED BY FLOOR, NOT BY TRAVERSAL — every caller that wants
// a plan asks for `floorPlan(floorOfTraversal(k))`, so traversal 12 gets
// floor 9's roster size on the way up, exactly as it had on the way down.
export function floorOfTraversal(traversal, floors = LEVELS) {
  return traversal <= floors ? traversal : (2 * floors) + 1 - traversal;
}

// Floor N holds `MONSTERS_BASE × MONSTER_GROWTH^(N-1)` creatures, and
// everything else on the floor follows from that count. Floor 1 gets two,
// floor 10 gets twenty-one.
//
// No interpolation, no anchors, no calibration table. Difficulty is the
// creature count, and count is the right dial because clearing cost scales
// linearly with how many there are — individual strength scales it
// quadratically, which no one can steer by (see difficulty.js).
export function floorPlan(level) {
  return { ...floorParams(level - 1), level };
}

export function monstersOnFloor(level) {
  return monstersAt(MONSTERS_BASE, MONSTER_GROWTH, level - 1);
}

// What survives the stairs.
function carryFrom(player) {
  return {
    hp: player.hp,
    hpMax: player.hpMax,
    armour: player.armour,
    xp: player.xp,
    inventory: player.inventory,
    kills: player.kills,
    // U3, docs/backlog.md — survives the stairs the same way xp and
    // inventory already do.
    xpEarned: player.xpEarned,
  };
}

// Plays a whole run. `makePolicy(floor)` is called once per TRAVERSAL and
// must return a fresh policy — a bot carries plan state that means nothing
// on the next map, and floor 9 met on the way up is a new problem even
// though the tiles are familiar.
//
// R1 — a run is twenty traversals, not ten floors. Ends when the hero dies,
// when a traversal runs out of turns, or when the LAST TRAVERSAL is cleared.
// Reaching the bottom is now the halfway point.
//
// `options.traversals` is what a caller pins to keep measuring a plain
// descent: the analysis modules that read per-floor rows off `levels` below
// would otherwise get each floor twice and quietly average the two crossings
// together. They pass `traversals: LEVELS` and say so at the call site.
export function playDungeon(seed, makePolicy, options = {}) {
  const maxTurns = options.maxTurns ?? 1500;
  // All overridable so a tuning page can ask "what if" without editing
  // the shipped model. Defaults ARE the shipped model.
  const floors = options.levels ?? LEVELS;
  const depth = options.traversals ?? floors * 2;
  const planFor = options.floorPlan ?? floorPlan;
  const levels = [];
  let carry = null;

  for (let traversal = 1; traversal <= depth; traversal++) {
    const level = floorOfTraversal(traversal, floors);
    const plan = planFor(level);
    const counts = {
      // M19 — docs/backlog.md. spawn.js reads this to fade the early-chest
      // quality boost by floor; every other field here was already read
      // off `plan`, but `plan.level` itself was never forwarded, which
      // would have made the boost a no-op outside direct populate() calls.
      level: plan.level,
      monsters: plan.monsters,
      chests: plan.chests,
      difficultyScale: plan.difficultyScale,
      clusterSize: plan.clusterSize,
      tierFloorShare: plan.tierFloorShare,
      tierCeilingShare: plan.tierCeilingShare,
      earlyTierCapShare: plan.earlyTierCapShare,
      outOfDepthChance: plan.outOfDepthChance,
      chestGuardRadius: plan.chestGuardRadius,
      dropChance: plan.dropChance,
      // A fixed rate overrides the per-floor one, for sweeping.
      weaponScarcity: options.scarcity ?? plan.weaponScarcity,
      // options.armourScarcity is the narrow dial, options.scarcity the
      // blunt one. This key used to appear TWICE in this object, and the
      // second copy — a bare `options.armourScarcity`, undefined in every
      // normal run — silently won.
      armourScarcity: options.armourScarcity ?? options.scarcity ?? plan.armourScarcity,
      potionScarcity: options.scarcity ?? plan.potionScarcity,
      // Map-design dials ride along untouched; undefined means "use the
      // shipped value", which populate() resolves against balance.js.
      monsterSpread: plan.monsterSpread,
      sideActivationCap: plan.sideActivationCap,
      sideRoomDepthBonus: plan.sideRoomDepthBonus,
      spineThreatShare: plan.spineThreatShare,
      sideChestBias: plan.sideChestBias,
      // A fixed value overrides the per-floor one, for sweeping — same
      // pattern as weaponScarcity above.
      earlyChestQualityBoost: options.earlyChestQualityBoost ?? plan.earlyChestQualityBoost,
      carry,
      // U6d — docs/backlog.md. What the hero starts the WHOLE RUN holding
      // (the shop, U6e). Forwarded to every floor rather than gated to
      // floor 1 only: game.js applies `carry` after `startingItems`, so
      // any floor past the first — which always has a `carry` by then —
      // overwrites it with the more current inventory regardless. Nothing
      // here needs to know which floor is "first".
      startingItems: options.startingItems,
      // Rule variants apply to every floor of the descent.
      xpFromKills: options.xpFromKills,
      hpFromKills: options.hpFromKills,
      attackWhenAdjacent: options.attackWhenAdjacent,
      weaponsWidenRoll: options.weaponsWidenRoll,
      guaranteeFirstWeapon: options.guaranteeFirstWeapon,
    };

    const run = playGame(
      hashSeeds(seed, level),
      makePolicy({ ...plan, monsterCount: plan.monsters }),
      { maxTurns, counts },
    );

    // What the hero brought DOWN THE STAIRS, and what this floor actually
    // held. Both are needed to read net challenge: the floor's cost is only
    // meaningful against the hero who walked into it.
    const arrivedWith = carry
      ? { hp: carry.hp, hpMax: carry.hpMax, armour: carry.armour, xp: carry.xp,
        inventory: carry.inventory.map((i) => ({ ...i })), kills: carry.kills.slice() }
      : { hp: PLAYER_HP, hpMax: PLAYER_HP, armour: 0, xp: PLAYER_XP,
        inventory: [], kills: [] };

    // hpMax and xp survive a monster's death, so the roster can be read back
    // from the finished state without regenerating the floor.
    const roster = run.state.monsters.map((m) => ({
      xp: m.xp, hp: m.hpMax, side: m.side, edge: m.edge, dead: m.dead,
    }));

    // Which chests were opened and which were walked past. An opened chest
    // is removed from the list, so what remains is what the hero declined.
    const stillShut = new Set(run.state.chests.map((c) => c.id));
    const chests = run.start.chests.map((c) => ({ ...c, opened: !stillShut.has(c.id) }));

    // What the floor actually took out of the hero. Read from the log
    // rather than from hp before/after, because potions and shields picked
    // up mid-floor would otherwise hide the cost.
    const blowsTaken = run.state.log
      .filter((e) => e.type === 'attack' && e.target === 'player')
      .map((e) => e.damage);
    const damage = blowsTaken.reduce((sum, d) => sum + d, 0);

    const player = run.state.player;
    levels.push({
      level,
      // R1 — which crossing this was, and which way the hero was going. The
      // floor number alone no longer identifies a row: floor 9 appears twice
      // in a completed run, and anything keyed on `level` would fold the two
      // together. `direction` is derived from the same rule as `level`, not
      // tracked separately, so the two cannot disagree.
      traversal,
      direction: traversal <= floors ? 'down' : 'up',
      dial: plan.dial,
      monsters: plan.monsters,
      outcome: run.outcome || 'timeout',
      turns: run.turns,
      kills: player.kills.length,
      damage,
      // Every blow that landed, not just the total. The tail is what kills:
      // damage is 0..xp-1, so a single roll at the top of the table can take
      // most of a 10 hp hero, and a mean hides that completely.
      blowsTaken,
      hp: player.hp,
      armour: player.armour,
      xp: player.xp,
      gear: player.inventory.filter((i) => i.dmg || i.armour).length,
      arrivedWith,
      roster,
      chests,
      replay: run.replay,
    });

    if (run.outcome !== 'ascended') {
      // `depth` counts TRAVERSALS survived, not floors — how far the run got,
      // which is what it always meant. On a pinned descent the two are the
      // same number, so every instrument reading this is unchanged; on a full
      // run "died on traversal 14" says something "died on floor 7" cannot,
      // namely which crossing of floor 7 it was.
      return { seed, cleared: false, depth: traversal, levels,
        killedBy: run.state.killedBy || null };
    }
    carry = carryFrom(player);
  }

  // R1 — VICTORY IS COMPLETING THE LAST TRAVERSAL. Reaching the bottom is
  // the halfway point and clears nothing on its own; the loop above simply
  // keeps going, which is why there is no "turn" branch anywhere here.
  return { seed, cleared: true, depth, levels, killedBy: null };
}
