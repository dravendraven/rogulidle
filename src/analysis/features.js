// What a generated map is made of, as numbers.
//
// The point is a difficulty coefficient: some combination of generation
// features that predicts whether the run is winnable, independently of
// which bot is playing. If it works, tuning generation stops being guesswork
// — you dial the coefficient instead of the raw counts.
//
// Everything here reads the true state, not a belief. It describes the map,
// not what anyone knows about it.

import { findPath, playerPassable, tileAt } from '../sim/mapgen.js';
import { analyseSeed } from './winnable.js';

function countWalkable(map) {
  let walkable = 0;
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      const kind = tileAt(map, x, y);
      if (kind === 'room' || kind === 'corridor' || kind === 'door') walkable++;
    }
  }
  return walkable;
}

// Gear lying in chests plus gear carried by monsters — everything the map
// is willing to give up over the whole run.
function loot(state) {
  const all = [
    ...state.items,
    ...state.chests.map((c) => c.drop).filter(Boolean),
    ...state.monsters.map((m) => m.drop).filter(Boolean),
  ];
  return {
    damage: all.reduce((sum, i) => sum + (i.dmg || 0), 0),
    armour: all.reduce((sum, i) => sum + (i.armour || 0), 0),
    potions: all.filter((i) => i.heal).length,
    items: all.length,
  };
}

export function mapFeatures(state) {
  const live = state.monsters.filter((m) => !m.dead);
  const walkable = countWalkable(state.map);
  const gear = loot(state);

  const sumXp = live.reduce((s, m) => s + m.xp, 0);
  const sumHp = live.reduce((s, m) => s + m.hpMax, 0);
  const maxXp = live.reduce((s, m) => Math.max(s, m.xp), 0);
  const sumActivation = live.reduce((s, m) => s + m.activation, 0);

  const passable = playerPassable(state.map);
  const toShrine = findPath(state.player.pos, state.shrine.pos, passable).length;

  // The optimistic solver already knows what a perfect line costs and how
  // much hp the map hands out, so its margin is a strong candidate on its
  // own — everything else is here to see whether anything beats it.
  const solved = analyseSeed(state);

  return {
    // raw counts
    monsters: live.length,
    walkable,
    rooms: state.map.rooms.length,
    chests: state.chests.length,

    // threat
    sumXp,
    sumHp,
    maxXp,
    sumActivation,
    // Total damage-dealing potential, roughly: how hard they hit times how
    // long they last.
    threatMass: sumXp * sumHp,

    // resources
    gearDamage: gear.damage,
    gearArmour: gear.armour,
    potions: gear.potions,
    gearTotal: gear.damage + gear.armour,

    // shape
    toShrine,
    density: +(live.length / Math.max(1, walkable)).toFixed(5),
    xpPerTile: +(sumXp / Math.max(1, walkable)).toFixed(5),
    // How much the map arms you against how much it throws at you.
    gearPerThreat: +(((gear.damage + gear.armour) / Math.max(1, sumXp))).toFixed(4),
    potionsPerThreat: +((gear.potions / Math.max(1, sumXp))).toFixed(4),
    // Aggro radius against room to move: crowded aggro is worse than spread.
    aggroPerTile: +(sumActivation / Math.max(1, walkable)).toFixed(5),

    // what the perfect-line solver says
    optimalCost: solved.cost,
    budget: solved.budget,
    margin: solved.margin,
  };
}

export const FEATURE_NAMES = [
  'monsters', 'walkable', 'rooms', 'chests',
  'sumXp', 'sumHp', 'maxXp', 'sumActivation', 'threatMass',
  'gearDamage', 'gearArmour', 'potions', 'gearTotal',
  'toShrine', 'density', 'xpPerTile', 'gearPerThreat', 'potionsPerThreat',
  'aggroPerTile', 'optimalCost', 'budget', 'margin',
];

// Point-biserial correlation: a plain Pearson between a number and a 0/1
// outcome. Positive means the feature goes with winning.
export function correlation(values, outcomes) {
  const n = values.length;
  const meanX = values.reduce((a, b) => a + b, 0) / n;
  const meanY = outcomes.reduce((a, b) => a + b, 0) / n;
  let top = 0;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    const dx = values[i] - meanX;
    const dy = outcomes[i] - meanY;
    top += dx * dy; sx += dx * dx; sy += dy * dy;
  }
  return sx && sy ? top / Math.sqrt(sx * sy) : 0;
}

// Plain logistic regression by gradient descent. Few features, few hundred
// rows — no need for anything cleverer, and hand-rolling keeps the promise
// of no dependencies.
export function fitLogistic(rows, names, { steps = 4000, rate = 0.5 } = {}) {
  // Standardise, or features on wildly different scales make the descent crawl.
  const stats = names.map((name) => {
    const values = rows.map((r) => r.features[name]);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sd = Math.sqrt(
      values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length,
    ) || 1;
    return { name, mean, sd };
  });

  const x = rows.map((r) => stats.map((s) => (r.features[s.name] - s.mean) / s.sd));
  const y = rows.map((r) => r.won);

  const w = new Array(names.length).fill(0);
  let b = 0;

  for (let step = 0; step < steps; step++) {
    const gw = new Array(names.length).fill(0);
    let gb = 0;
    for (let i = 0; i < x.length; i++) {
      let z = b;
      for (let j = 0; j < w.length; j++) z += w[j] * x[i][j];
      const p = 1 / (1 + Math.exp(-z));
      const err = p - y[i];
      for (let j = 0; j < w.length; j++) gw[j] += err * x[i][j];
      gb += err;
    }
    for (let j = 0; j < w.length; j++) w[j] -= (rate * gw[j]) / x.length;
    b -= (rate * gb) / x.length;
  }

  const model = { stats, weights: w, bias: b };
  model.winChance = (features) => {
    let z = model.bias;
    for (let j = 0; j < model.stats.length; j++) {
      const s = model.stats[j];
      z += model.weights[j] * ((features[s.name] - s.mean) / s.sd);
    }
    return 1 / (1 + Math.exp(-z));
  };
  // 1 = as hard as it gets, 0 = a walkover. Exactly the coefficient asked for.
  model.difficulty = (features) => 1 - model.winChance(features);
  return model;
}
