// Is this seed winnable at all?
//
// Answers the question the bot cannot: when a run is lost, was that the
// bot playing badly or the map being unfair? Without this you tune the bot
// against maps that no one could have won, and never know it.
//
// This reads the true GameState, not a Belief. It is an analysis tool, not
// a player — nothing here may be imported by src/bot/.
//
// It computes an OPTIMISTIC UPPER BOUND on a perfect run. The imaginary
// player it scores:
//   - collects every item on the map, at no risk and no cost in hp
//   - always fights one on one, never cornered, never ambushed
//   - fights in the ideal order, so xp snowballs as early as possible
//   - takes exactly the average damage, never an unlucky streak
//   - drinks every potion at the perfect moment, for full value
//
// So the verdict is one-sided and that is the point:
//   NOT winnable  -> proof. No policy wins this seed. The map is at fault.
//   winnable      -> only means nothing makes it impossible. It can still
//                    be brutally hard in practice.

import {
  KILLS_PER_XP, PLAYER_HP, PLAYER_XP, POTION_HEAL,
} from '../sim/balance.js';
import { duelCost } from '../bot/duel.js';

// Everything lying on the floor, inside a chest, or carried by a monster.
function inventoryOfTheWholeMap(state) {
  const loose = [];
  const carried = new Map();          // monster id -> its drop

  for (const item of state.items) loose.push(item);
  for (const chest of state.chests) if (chest.drop) loose.push(chest.drop);
  for (const monster of state.monsters) {
    if (monster.drop) carried.set(monster.id, monster.drop);
  }
  return { loose, carried };
}

function asPlayer(hp, xp, gear) {
  return { hp, hpMax: PLAYER_HP, xp, inventory: gear };
}

export function analyseSeed(state) {
  const { loose, carried } = inventoryOfTheWholeMap(state);

  // Free loot first: the perfect player has already swept the map.
  const gear = loose.filter((item) => !item.heal);
  let potions = loose.filter((item) => item.heal).length;


  let xp = PLAYER_XP;
  let kills = 0;
  let spent = 0;                       // total hp paid across every duel
  const order = [];

  const remaining = state.monsters.filter((m) => !m.dead).map((m) => ({ ...m }));

  while (remaining.length) {
    // Reprice every time: each kill may add gear and xp, which reorders
    // what is left. This is the snowball from docs/bot-strategy.md §3.
    const me = asPlayer(PLAYER_HP, xp, gear);
    let best = 0;
    let bestCost = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const cost = duelCost(me, remaining[i]).hpLost;
      if (cost < bestCost) { bestCost = cost; best = i; }
    }

    const [victim] = remaining.splice(best, 1);
    spent += bestCost;
    order.push({ name: victim.name, hpLost: +bestCost.toFixed(2) });

    kills++;
    if (kills % KILLS_PER_XP === 0) xp++;

    const drop = carried.get(victim.id);
    if (drop) {
      if (drop.heal) potions++;
      else gear.push(drop);
    }
  }

  // Total damage the hero can absorb across the run. Shields count here
  // rather than in the duel maths, because armour is a buffer that soaks
  // blows whole (spec §13.2) — it never softens one.
  const shieldHp = gear.reduce((sum, g) => sum + (g.armour || 0), 0);
  const budget = PLAYER_HP + shieldHp + potions * POTION_HEAL;
  const margin = budget - spent;

  let verdict;
  if (margin <= 0) verdict = 'impossible';
  else if (margin < 3) verdict = 'marginal';
  else verdict = 'comfortable';

  return {
    seed: state.seed,
    verdict,
    margin: +margin.toFixed(2),
    budget,
    cost: +spent.toFixed(2),
    potions,
    weapons: gear.filter((g) => g.dmg).length,
    shields: gear.filter((g) => g.armour).length,
    finalXp: xp,
    order,
  };
}
