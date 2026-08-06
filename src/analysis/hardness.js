// How hard a floor is, measured rather than modelled.
//
// Drop the SAME hero into floor N many times and count how often they walk
// out. That is the whole idea.
//
// Two reasons it beats what came before:
//
//   - It assumes nothing. The modelled net challenge priced clean one-on-one
//     duels, so once floors held fifteen creatures it read 0.23 on a floor
//     that killed four heroes out of seven. Being swarmed, cornered, or hit
//     while crossing a room never entered the sum. A survival count cannot
//     miss any of that, because it is the outcome.
//
//   - It has no survivor bias. Per-floor survival taken from a real descent
//     measures whoever happened to get that deep: floors 8 and 10 both read
//     100% in a run where only the three and two survivors of floor 7 ever
//     arrived. A fixed reference hero removes the selection entirely.
//
// The cost is that it is not the player's experience — a real hero arrives
// at floor 8 shaped by floors 1 to 7. For that, read the funnel instead.
// The two answer different questions and both are worth having.

import { newGame, playGame } from '../sim/game.js';
import { makeBot } from '../bot/bot.js';
import { floorPlan } from '../sim/dungeon.js';
import { PLAYER_HP, PLAYER_XP } from '../sim/balance.js';

// A yardstick, not a realistic hero. Fixed so that a number measured today
// can be compared with one measured after the next mechanic change.
export const REFERENCE_HERO = {
  hp: PLAYER_HP,
  hpMax: PLAYER_HP,
  armour: 6,
  xp: PLAYER_XP,
  inventory: [{ name: 'axe', emoji: '🪓', dmg: 2, armour: 0, heal: 0 }],
  kills: [],
};

function heroCopy(hero) {
  return { ...hero, inventory: hero.inventory.map((i) => ({ ...i })), kills: [] };
}

// Survival rate of the reference hero on one floor.
export function floorHardness(level, options = {}) {
  const { runs = 20, firstSeed = 70000, maxTurns = 1200, hero = REFERENCE_HERO } = options;
  const plan = floorPlan(level);

  let survived = 0;
  let cleared = 0;
  let damage = 0;

  for (let i = 0; i < runs; i++) {
    const run = playGame(firstSeed + i, makeBot({ monsterCount: plan.monsters }), {
      maxTurns,
      counts: { ...plan, carry: heroCopy(hero) },
    });

    if (run.outcome !== 'died') survived++;
    if (run.outcome === 'ascended') cleared++;
    damage += run.state.log
      .filter((e) => e.type === 'attack' && e.target === 'player')
      .reduce((sum, e) => sum + e.damage, 0);
  }

  const capacity = hero.hp + (hero.armour || 0);
  const perRun = damage / runs;

  return {
    level,
    monsters: plan.monsters,
    runs,
    // Survival is the outcome you care about, but it is a coin per run —
    // at a dozen runs one unlucky descent swings it eight points. Read it
    // for the extremes, not for the shape.
    survivalPct: +((100 * survived) / runs).toFixed(0),
    clearedPct: +((100 * cleared) / runs).toFixed(0),
    // THE ONE TO WATCH. Continuous, so every run adds information and the
    // curve is readable at small samples where survival is still noise.
    damagePerRun: +perRun.toFixed(1),
    // Same number against what the reference hero can absorb. This is net
    // challenge, measured instead of modelled: 1.00 means the floor costs
    // exactly everything the hero brought.
    netChallenge: +(perRun / capacity).toFixed(2),
  };
}

// The whole ladder, one reference hero throughout.
export function hardnessCurve(levels, options = {}) {
  return levels.map((level) => floorHardness(level, options));
}

// Sanity check that a floor was generated near what was asked for.
export function floorRoster(level, seed) {
  const plan = floorPlan(level);
  const state = newGame(seed, plan);
  return state.monsters.map((m) => m.name);
}
