// The net challenge curve: what each floor actually asks of the hero who
// walks into it.
//
// This is a gauge, not a controller. Difficulty is NOT adjusted from hero
// power at runtime — that nullifies progression, because finding a shield
// stops meaning anything when the next floor compensates. The curve exists
// so both sides can be tuned by hand while watching what the combination
// does: generation on one side, hero accumulation on the other.
//
// Everything is in hp, which is what lets the two be subtracted.

import { playDungeon, LEVELS } from '../sim/dungeon.js';
import { campaignCost } from '../bot/duel.js';
import { heroPower } from './power.js';

export function runCurve(options) {
  const {
    count = 12, firstSeed = 9800, makePolicy, dungeonOptions = {},
  } = options;

  const floors = Array.from({ length: LEVELS + 1 }, () => ({
    arrivals: 0, deaths: 0, hp: 0, power: 0, floorCost: 0, gear: 0, xp: 0,
  }));

  const runs = [];
  for (let i = 0; i < count; i++) {
    const run = playDungeon(firstSeed + i, makePolicy, dungeonOptions);
    runs.push(run);

    for (const level of run.levels) {
      const f = floors[level.level];
      f.arrivals++;
      if (level.outcome !== 'ascended') f.deaths++;

      const hero = level.arrivedWith;
      f.hp += hero.hp;
      // Strength on arrival, against the fixed yardstick.
      f.power += heroPower(hero);
      // What THIS floor's roster costs THAT hero — the demand side.
      f.floorCost += campaignCost(hero, level.roster);
      f.gear += hero.inventory.filter((it) => it.dmg || it.armour).length;
      f.xp += hero.xp;
    }
  }

  const rows = floors.slice(1).map((f, index) => {
    if (!f.arrivals) return { floor: index + 1, arrivals: 0 };
    const n = f.arrivals;
    const hp = f.hp / n;
    const floorCost = f.floorCost / n;
    return {
      floor: index + 1,
      arrivals: n,
      deaths: f.deaths,
      survivalPct: +(100 * (1 - f.deaths / n)).toFixed(0),
      hpOnArrival: +hp.toFixed(1),
      gearOnArrival: +(f.gear / n).toFixed(1),
      xpOnArrival: +(f.xp / n).toFixed(1),
      // Lower means stronger: hp to clear a fixed reference band.
      heroCost: +(f.power / n).toFixed(2),
      // What this floor demands of that hero, in hp.
      floorCost: +floorCost.toFixed(2),
      // The number to watch. Above 1 the floor asks for more hp than the
      // hero has, so it is expected to kill. Rising with depth is the goal.
      netChallenge: +(floorCost / Math.max(0.001, hp)).toFixed(2),
    };
  });

  return {
    runs: runs.length,
    cleared: runs.filter((r) => r.cleared).length,
    avgDepth: +(runs.reduce((a, r) => a + r.depth, 0) / runs.length).toFixed(1),
    depths: runs.map((r) => r.depth).sort((a, b) => a - b),
    rows,
  };
}
