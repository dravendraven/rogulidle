// A dungeon: ten floors, each harder than the last.
//
// A single floor is a complete game — the shrine ends it. A dungeon strings
// ten of them together, and the shrine becomes a staircase for the first
// nine. What the hero IS carries down; where they stood does not.
//
// MEASURED, 20 dungeons: the descent gets EASIER, not harder.
//
//   floor          1     3     5     7     10
//   xp at exit    4.8   9.8  15.6  23.1   42.3
//   gear at exit  2.9   6.7   9.8  12.8   14.9
//   hp at exit    8.5   9.3   9.8   9.7    9.6
//
//   16 of 20 dungeons cleared all ten floors, and the deadliest floor by
//   far is the FIRST — two of the four failures happened there.
//
// The dial is not at fault; it describes the floor and does that correctly.
// The hero simply outgrows it. Damage is drawn from 0..xp-1, so xp 42 means
// about 17 damage a blow, and the toughest monster in the game has 15 hit
// points — one swing. A dial that runs 0.2 to 0.9 cannot express a range
// wide enough to keep up with that.
//
// THREE FIXES TRIED AND MEASURED, none of which changed the shape:
//
//   freeze xp (XP_FROM_KILLS)        8/10 cleared -> 7/10
//   halve weapons (WEAPONS_WIDEN_ROLL) 8/10 -> 8/10
//   make armour scarce (armourScarcity 4)  5/10 -> 4/10, hp at floor 10
//                                          8.3 -> 7.2
//
// The first two aimed at damage OUTPUT, which was never the constraint —
// the hero finishes floor ten on 10 hp out of 10. Scarcity does bite at
// depth, but the outcome distribution stays stubbornly bimodal:
//
//   depths reached, ten dungeons:  1, 1, 1, 3, 10, 10, 10, 10, 10, 10
//
// The dungeon is decided in its first three floors. Survive the opening,
// where the hero has nothing, and the accumulation carries the rest.
//
// That is a curve problem, not a mechanic problem. Floor difficulty climbs
// from dial 0.2 to 0.9 while the hero's power multiplies several times
// over, and 1.0 is as far as the dial goes. Closing it needs one of:
// a difficulty range that runs past what a single floor can express, a
// hard cap on accumulation (equipment slots), or progress surrendered on
// the stairs.

import { hashSeeds } from './rng.js';
import { difficultyToParams } from './difficulty.js';
import { playGame } from './game.js';

export const LEVELS = 10;

// Floor 1 is gentle, floor 10 is nearly the hardest the dial goes. Linear
// between, which is the simplest thing that could work and therefore the
// right thing to measure before reaching for a curve.
export const FIRST_LEVEL_DIFFICULTY = 0.2;
export const LAST_LEVEL_DIFFICULTY = 0.9;

export function difficultyForLevel(level) {
  const t = (level - 1) / (LEVELS - 1);
  return FIRST_LEVEL_DIFFICULTY
    + t * (LAST_LEVEL_DIFFICULTY - FIRST_LEVEL_DIFFICULTY);
}

export function floorPlan(level) {
  const dial = difficultyForLevel(level);
  return { level, dial: +dial.toFixed(3), ...difficultyToParams(dial) };
}

// What survives the stairs.
function carryFrom(player) {
  return {
    hp: player.hp,
    hpMax: player.hpMax,
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
  const levels = [];
  let carry = null;

  for (let level = 1; level <= LEVELS; level++) {
    const plan = floorPlan(level);
    const counts = {
      monsters: plan.monsters,
      covers: plan.covers,
      difficultyScale: plan.difficultyScale,
      dropChance: plan.dropChance,
      carry,
      // Rule variants apply to every floor of the descent.
      xpFromKills: options.xpFromKills,
      attackWhenAdjacent: options.attackWhenAdjacent,
      weaponsWidenRoll: options.weaponsWidenRoll,
      armourScarcity: options.armourScarcity,
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
      ? { hp: carry.hp, hpMax: carry.hpMax, xp: carry.xp,
        inventory: carry.inventory.map((i) => ({ ...i })), kills: carry.kills.slice() }
      : { hp: 10, hpMax: 10, xp: 3, inventory: [], kills: [] };

    // hpMax and xp survive a monster's death, so the roster can be read back
    // from the finished state without regenerating the floor.
    const roster = run.state.monsters.map((m) => ({ xp: m.xp, hp: m.hpMax }));

    const player = run.state.player;
    levels.push({
      level,
      dial: plan.dial,
      monsters: plan.monsters,
      outcome: run.outcome || 'timeout',
      turns: run.turns,
      kills: player.kills.length,
      hp: player.hp,
      xp: player.xp,
      gear: player.inventory.filter((i) => i.dmg || i.armour).length,
      arrivedWith,
      roster,
      replay: run.replay,
    });

    if (run.outcome !== 'ascended') {
      return { seed, cleared: false, depth: level, levels,
        killedBy: run.state.killedBy || null };
    }
    carry = carryFrom(player);
  }

  return { seed, cleared: true, depth: LEVELS, levels, killedBy: null };
}
