// A dungeon: ten floors, each harder than the last.
//
// A single floor is a complete game — the shrine ends it. A dungeon strings
// ten of them together, and the shrine becomes a staircase for the first
// nine. What the hero IS carries down; where they stood does not.
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
  };
}

// Plays a whole dungeon. `makePolicy(floor)` is called once per floor and
// must return a fresh policy — a bot carries plan state that means nothing
// on the next map down.
//
// Ends when the hero dies, when a floor runs out of turns, or when floor
// ten is cleared.
export function playDungeon(seed, makePolicy, options = {}) {
  const maxTurns = options.maxTurns ?? 1500;
  // Both overridable so a tuning page can ask "what if" without editing
  // the shipped model. Defaults ARE the shipped model.
  const depth = options.levels ?? LEVELS;
  const planFor = options.floorPlan ?? floorPlan;
  const levels = [];
  let carry = null;

  for (let level = 1; level <= depth; level++) {
    const plan = planFor(level);
    const counts = {
      monsters: plan.monsters,
      chests: plan.chests,
      difficultyScale: plan.difficultyScale,
      clusterSize: plan.clusterSize,
      outOfDepthChance: plan.outOfDepthChance,
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
      carry,
      // Rule variants apply to every floor of the descent.
      xpFromKills: options.xpFromKills,
      hpFromKills: options.hpFromKills,
      attackWhenAdjacent: options.attackWhenAdjacent,
      weaponsWidenRoll: options.weaponsWidenRoll,
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
      return { seed, cleared: false, depth: level, levels,
        killedBy: run.state.killedBy || null };
    }
    carry = carryFrom(player);
  }

  return { seed, cleared: true, depth, levels, killedBy: null };
}
