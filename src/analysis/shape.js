// The shape of the game's curve, measured rather than inferred.
//
// Six quantities per floor, and the definitions matter as much as the
// numbers — a bad one here contaminates every balancing decision after it.
// Each choice is argued where it is made.
//
// THE STRUCTURE, and it is forced by survivor bias:
//
//   CHALLENGE, REWARD and their two CVs are properties of the FLOOR AS
//   GENERATED. They do not depend on who walks in, so they are measured on
//   floors generated directly — a thousand floor tens, never mind whether a
//   hero got there. Survivor bias is zero by construction, not by
//   correction.
//
//   POWER and BUFFER are properties of the HERO ON ARRIVAL. They only exist
//   for heroes who got that deep, so the bias is intrinsic: the hero on
//   floor 10 IS a survivor. It cannot be removed. It CAN be measured, and
//   `selectionCheck` below does exactly that instead of waving at it.
//
// Everything is in hp where possible, because hp is the resource that
// actually runs out, and because two quantities in the same unit can be
// divided to make a ratio that means something.

import { newGame, playGame } from '../sim/game.js';
import { makeBot } from '../bot/bot.js';
import { floorPlan, playDungeon, LEVELS } from '../sim/dungeon.js';
import { hashSeeds } from '../sim/rng.js';
import { campaignCost } from '../bot/duel.js';
import { effectiveHp, expectedDamage, weaponDamage } from '../sim/combat.js';
import { ITEM_TABLE, UNKNOWN_MONSTER_ESTIMATE } from '../sim/balance.js';
import { REFERENCE_HERO } from './hardness.js';

// ***** 1. CHALLENGE ***** //
//
// `campaignCost(REFERENCE_HERO, roster)` — the hp a fixed hero expects to
// lose clearing the floor's whole roster, cheapest fight first.
//
// Chosen over threat mass (`Σ hp × (xp−1)`) although both were computed and
// they track closely. Two reasons:
//
//   - threat mass is a PROXY that difficulty.js introduces as tracking cost
//     "almost exactly"; campaignCost IS the cost, running the same
//     alternating-duel maths the engine runs. When the question is what a
//     floor costs, use the cost.
//   - it comes out in hp, so it divides against reward and buffer to give
//     ratios that mean something. Threat mass is in hp×xp, which divides
//     into nothing.
//
// The hero is FIXED and not the arriving one. Using the arriving hero would
// make a floor "cheaper" simply because the hero got stronger, which folds
// power into challenge and makes the challenge/power ratio circular.
export function floorChallenge(state) {
  return campaignCost(REFERENCE_HERO,
    state.monsters.map((m) => ({ xp: m.xp, hp: m.hpMax })));
}

export function floorThreatMass(state) {
  return state.monsters.reduce((sum, m) => sum + m.hpMax * Math.max(0, m.xp - 1), 0);
}

// ***** 3. REWARD ***** //
//
// Every item the floor CONTAINS — in chests and carried by creatures —
// valued in hp, summed.
//
// Contains, not collects. What the bot picks up is a fact about the bot and
// about how long it survived; what the floor holds is a fact about the
// floor, and only the second is comparable across floors without dragging
// survivor bias back in through the side door.
//
// Each item type is valued ONCE against a fixed standard workload, so the
// same axe is worth the same on floor 2 and floor 9. Valuing a weapon
// against the floor it sits on would make reward rise merely because the
// floor is bigger, which is exactly the correlation with challenge that the
// reward/challenge ratio is supposed to detect.
//
// The workload is 20 creatures of `UNKNOWN_MONSTER_ESTIMATE` — the table's
// median, which is what the bot already uses to price gear it cannot see.
const STANDARD_WORKLOAD = Array.from({ length: 20 }, () => ({ ...UNKNOWN_MONSTER_ESTIMATE }));

export const ITEM_VALUE = (() => {
  const values = new Map();
  const base = campaignCost(REFERENCE_HERO, STANDARD_WORKLOAD);

  for (const item of ITEM_TABLE) {
    if (item.heal) {
      // Restores hp directly, so it is worth its face value in hp.
      values.set(item.name, item.heal);
    } else if (item.armour) {
      // The armour bar is spent hp-for-hp, so a shield is its face value too.
      values.set(item.name, item.armour);
    } else if (item.dmg) {
      // A weapon is worth the hp it SAVES over the standard workload: kills
      // arrive faster, so fewer blows land. This is the only item whose
      // value has to be computed rather than read.
      const armed = { ...REFERENCE_HERO, inventory: [...REFERENCE_HERO.inventory, item] };
      values.set(item.name, base - campaignCost(armed, STANDARD_WORKLOAD));
    } else {
      // A collectible with no mechanical effect. None exist today — Rogule's
      // chestnut, mushroom and gem are gone — but the branch stays so that
      // adding one cannot silently inflate reward.
      values.set(item.name, 0);
    }
  }
  return values;
})();

export function floorReward(state) {
  let total = 0;
  for (const chest of state.chests) {
    if (chest.drop) total += ITEM_VALUE.get(chest.drop.name) || 0;
  }
  for (const monster of state.monsters) {
    if (monster.drop) total += ITEM_VALUE.get(monster.drop.name) || 0;
  }
  return total;
}

// ***** 2. POWER ***** //
//
// `effectiveHp × expectedDamage` — how much damage the hero can deliver
// before dying, against a fixed opponent.
//
// The owner asked for offence and survivability together rather than either
// alone, and this is the product that combines them without a free
// parameter: a hero survives `effectiveHp / theirBlow` turns and deals
// `myBlow` on each, so total output is proportional to the product. Doubling
// either doubles it, which is the property that makes it a reasonable single
// number for "what the hero can do".
//
// The unit is hp², which is meaningless on its own — which is fine, because
// only its GROWTH RATE is read, and a rate is dimensionless.
export function heroPower(player) {
  return effectiveHp(player) * expectedDamage(player.xp, weaponDamage(player));
}

// ***** 4. BUFFER ***** //
//
// `effectiveHp / mean blow of THIS floor's creatures` — how many typical
// hits the hero survives here.
//
// Deliberately not just effectiveHp. The owner asked for how much error can
// be absorbed, and an error is measured in blows taken, not in hp: ten hp is
// a lot against bats and nothing against a dragon. Counting blows also makes
// it dimensionless and so comparable between floors, and it falls correctly
// whether the hero got weaker or the floor got nastier.
export function heroBuffer(player, roster) {
  const live = roster.filter((m) => m.xp > 1);
  if (!live.length) return Infinity;
  const meanBlow = live.reduce((sum, m) => sum + expectedDamage(m.xp, 0), 0) / live.length;
  return meanBlow > 0 ? effectiveHp(player) / meanBlow : Infinity;
}

// ***** statistics ***** //

export function summarise(xs) {
  const n = xs.length;
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  // Sample sd (n−1): these are samples of a distribution, not the whole of it.
  const variance = n > 1
    ? xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)
    : 0;
  const sd = Math.sqrt(variance);
  return {
    n,
    mean,
    sd,
    se: sd / Math.sqrt(n),
    cv: mean !== 0 ? sd / mean : 0,
    // For roughly normal data the standard error of a CV is CV/sqrt(2n).
    // Reported so a CV difference between floors can be judged rather than
    // assumed — balance.md has one case on record of a conclusion drawn
    // from a gap that was inside its own error bar.
    cvSe: mean !== 0 ? (sd / mean) / Math.sqrt(2 * n) : 0,
  };
}

// Growth per floor, fitted rather than taken pairwise.
//
// A pairwise ratio between two adjacent floors is a ratio of two noisy
// numbers and is much noisier than either. A log-linear fit over the whole
// ladder uses every floor, and its slope exponentiates straight into "×
// per floor", which is the dimensionless rate that lets quantities in
// different units be compared at all.
export function growthOf(series) {
  const points = series
    .map((y, i) => ({ x: i + 1, y }))
    .filter((p) => Number.isFinite(p.y) && p.y > 0);
  if (points.length < 3) return { perFloor: null, se: null, n: points.length };

  const n = points.length;
  const mx = points.reduce((a, p) => a + p.x, 0) / n;
  const my = points.reduce((a, p) => a + Math.log(p.y), 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (const p of points) {
    sxy += (p.x - mx) * (Math.log(p.y) - my);
    sxx += (p.x - mx) ** 2;
  }
  const slope = sxy / sxx;

  let residual = 0;
  for (const p of points) {
    residual += (Math.log(p.y) - (my + slope * (p.x - mx))) ** 2;
  }
  const slopeSe = n > 2 ? Math.sqrt(residual / (n - 2) / sxx) : 0;

  return {
    perFloor: Math.exp(slope),
    // Turned into a multiplier band the same way the point estimate is.
    se: Math.exp(slope) * slopeSe,
    n,
  };
}

// ***** the generated half: challenge, reward, and their spread ***** //
//
// Floors are generated directly and independently. No hero is involved, so
// no floor is missing because somebody died before reaching it.
//
// Seeded `hashSeeds(base + i, level)` — exactly how playDungeon seeds its
// floors — so each floor draws its own shared multiplier. Reusing one seed
// list across floors instead would hand every floor the SAME first spawn
// draw, correlating the whole ladder; that artifact is on record in
// balance.md and it moved a measurement by 9%.
export function generatedShape(options = {}) {
  const { runs = 400, firstSeed = 1000, levels = LEVELS } = options;
  const rows = [];

  for (let level = 1; level <= levels; level++) {
    const plan = floorPlan(level);
    const challenge = [];
    const reward = [];
    const mass = [];
    const counts = [];

    for (let i = 0; i < runs; i++) {
      const state = newGame(hashSeeds(firstSeed + i, level), plan);
      challenge.push(floorChallenge(state));
      reward.push(floorReward(state));
      mass.push(floorThreatMass(state));
      counts.push(state.monsters.length);
    }

    rows.push({
      level,
      nominal: plan.monsters,
      creatures: summarise(counts),
      challenge: summarise(challenge),
      reward: summarise(reward),
      mass: summarise(mass),
    });
  }
  return rows;
}

// ***** the experienced half: power and buffer ***** //
//
// These need a real descent, so they carry survivor bias by construction.
// `reached` is reported on every row as the honest sample size, and
// `selection` below measures the bias rather than assuming it away.
export function experiencedShape(options = {}) {
  const { runs = 120, firstSeed = 50000, maxTurns = 1500, levels = LEVELS } = options;

  const rows = Array.from({ length: levels }, (_, i) => ({
    level: i + 1, power: [], buffer: [], reached: 0,
  }));
  // For the selection check: every hero's power at a mid floor, tagged with
  // how deep that hero eventually got.
  const midFloorPower = [];
  const depths = [];
  let cleared = 0;

  for (let i = 0; i < runs; i++) {
    const dungeon = playDungeon(firstSeed + i,
      (floor) => makeBot({
        monsterCount: floor.monsterCount, level: floor.level, levels,
      }),
      {
        maxTurns,
        levels,
      // R1 — PINNED TO A DESCENT. `playDungeon` now plays twenty
      // traversals; this instrument reads per-FLOOR rows off `levels`
      // and would fold each floor's two crossings together. Pinned so
      // every number it has ever produced still reproduces. Measuring
      // the return is a separate instrument, not a default change here.
      traversals: levels,
      });

    depths.push(dungeon.depth);
    if (dungeon.cleared) cleared++;

    for (const lvl of dungeon.levels) {
      const row = rows[lvl.level - 1];
      row.reached++;
      row.power.push(heroPower(lvl.arrivedWith));
      row.buffer.push(heroBuffer(lvl.arrivedWith, lvl.roster));
      if (lvl.level === SELECTION_FLOOR) {
        midFloorPower.push({ power: heroPower(lvl.arrivedWith), depth: dungeon.depth });
      }
    }
  }

  return {
    rows: rows.filter((r) => r.reached > 0).map((r) => ({
      level: r.level,
      reached: r.reached,
      power: summarise(r.power),
      buffer: summarise(r.buffer.filter(Number.isFinite)),
    })),
    selection: selectionCheck(midFloorPower),
    cleared,
    runs,
    depths: depths.slice().sort((a, b) => a - b),
  };
}

// The floor the selection check is taken at: deep enough that heroes have
// diverged, shallow enough that most of them are still alive to be counted.
export const SELECTION_FLOOR = 5;
const DEEP_ENOUGH = 9;

// How much of the deep-floor sample is selection rather than progression.
//
// Take every hero standing on floor 5 and split them by how far they went
// on to get. If the ones who reached floor 9+ were ALREADY stronger back on
// floor 5, then the deep rows are not measuring "heroes get stronger" — they
// are partly measuring "weak heroes were removed". The ratio below is that
// effect, isolated, and it is the number to subtract mentally from the
// power growth rate.
function selectionCheck(samples) {
  const deep = samples.filter((s) => s.depth >= DEEP_ENOUGH).map((s) => s.power);
  const shallow = samples.filter((s) => s.depth < DEEP_ENOUGH).map((s) => s.power);
  if (!deep.length || !shallow.length) return null;

  const a = summarise(deep);
  const b = summarise(shallow);
  const diff = a.mean - b.mean;
  const se = Math.sqrt(a.se ** 2 + b.se ** 2);

  return {
    floor: SELECTION_FLOOR,
    deepMean: a.mean, deepN: a.n,
    shallowMean: b.mean, shallowN: b.n,
    ratio: b.mean !== 0 ? a.mean / b.mean : null,
    z: se > 0 ? diff / se : null,
  };
}
