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
import { floorPlan, playDungeon } from '../sim/dungeon.js';
import { DEFAULT_MODEL, makeFloorPlan } from '../sim/difficulty.js';
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
  const {
    runs = 20, firstSeed = 70000, maxTurns = 1200,
    hero = REFERENCE_HERO, model,
  } = options;
  const plan = model ? makeFloorPlan(model)(level) : floorPlan(level);

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

// The OTHER half, and the one the owner actually asked about: the same
// curve for a REAL hero, who arrives at floor 8 carrying everything floors
// 1 to 7 gave them.
//
// This is the requirement — floor 10 must be the hardest DESPITE the gear —
// so it has to be measured against the hero who is really there, not
// against a yardstick. Net challenge is the floor's cost over what the hero
// walked in with; above 1.00 the floor demands more than they brought.
//
// Survivor bias is real here and is NOT a flaw: deep floors are measured
// only on heroes who got that far, because those are the only heroes who
// ever meet them. The `reached` column is the honest sample size — a 0.40
// off two runs means much less than a 0.40 off thirty.
export function descentCurve(options = {}) {
  const {
    runs = 30, firstSeed = 90000, maxTurns = 1500,
    model = {}, botOptions = {}, onProgress,
  } = options;

  const planFor = makeFloorPlan(model);
  const levels = model.levels ?? DEFAULT_MODEL.levels;
  const floors = [];
  const depths = [];
  let cleared = 0;

  for (let i = 0; i < runs; i++) {
    const dungeon = playDungeon(firstSeed + i,
      (floor) => makeBot({
        monsterCount: floor.monsterCount,
        // Where this floor sits, so gear can be priced against the descent
        // still ahead rather than against this room alone.
        level: floor.level, levels,
        ...botOptions,
      }),
      { maxTurns, levels, floorPlan: planFor });

    depths.push(dungeon.depth);
    if (dungeon.cleared) cleared++;

    for (const lvl of dungeon.levels) {
      const row = floors[lvl.level - 1] || (floors[lvl.level - 1] = {
        level: lvl.level, monsters: lvl.monsters, chests: planFor(lvl.level).chests,
        reached: 0, died: 0, stalled: 0, damage: 0, capacity: 0,
        turns: 0, kills: 0, gear: 0, mass: 0,
      });
      row.reached++;
      if (lvl.outcome === 'died') row.died++;
      else if (lvl.outcome !== 'ascended') row.stalled++;
      row.damage += lvl.damage;
      row.capacity += lvl.arrivedWith.hp + (lvl.arrivedWith.armour || 0);
      row.turns += lvl.turns;
      // `lvl.kills` is the hero's LIFETIME count — the kills list rides the
      // stairs down. Subtract what they arrived with to get this floor's.
      row.kills += lvl.kills - lvl.arrivedWith.kills.length;
      row.gear += lvl.arrivedWith.inventory.filter((it) => it.dmg || it.armour).length;
      // What the floor was actually built out of, in the currency that
      // predicts duel cost. Lets a floor that came out soft be told apart
      // from a bot that played it well.
      row.mass += lvl.roster.reduce((sum, m) => sum + m.hp * Math.max(0, m.xp - 1), 0);
    }

    if (onProgress) onProgress(i + 1, runs);
  }

  const rows = floors.map((row) => ({
    level: row.level,
    monsters: row.monsters,
    chests: row.chests,
    reached: row.reached,
    survivalPct: +((100 * (row.reached - row.died)) / row.reached).toFixed(0),
    stalled: row.stalled,
    // Mean capacity the hero brought down the stairs. If this climbs faster
    // than damage does, the descent gets easier and the requirement fails.
    capacity: +(row.capacity / row.reached).toFixed(1),
    gear: +(row.gear / row.reached).toFixed(1),
    threatMass: +(row.mass / row.reached).toFixed(0),
    damagePerRun: +(row.damage / row.reached).toFixed(1),
    turns: +(row.turns / row.reached).toFixed(0),
    kills: +(row.kills / row.reached).toFixed(1),
    netChallenge: +(row.damage / row.capacity).toFixed(2),
  }));

  return {
    rows, runs, cleared, levels,
    depths: depths.slice().sort((a, b) => a - b),
    avgDepth: +(depths.reduce((a, b) => a + b, 0) / depths.length).toFixed(1),
    // Does the curve actually rise? The whole requirement in one number:
    // net challenge of the last floor minus the first.
    rise: rows.length > 1
      ? +(rows[rows.length - 1].netChallenge - rows[0].netChallenge).toFixed(2)
      : 0,
  };
}

// Sanity check that a floor was generated near what was asked for.
export function floorRoster(level, seed) {
  const plan = floorPlan(level);
  const state = newGame(seed, plan);
  return state.monsters.map((m) => m.name);
}
