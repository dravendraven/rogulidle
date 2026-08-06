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
// Fixing it is a game-design choice, not a tuning one: slow the growth
// (xp is currently +1 every 2 kills, uncapped, and 10 floors is ~70 kills),
// cap what can be carried (15 items is not a thing Rogule ever intended,
// since a Rogule run is one floor), or drop some of it on the stairs.

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
    };

    const run = playGame(
      hashSeeds(seed, level),
      makePolicy({ ...plan, monsterCount: plan.monsters }),
      { maxTurns, counts },
    );

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
