// What a fight is going to cost, before taking it. docs/bot-strategy.md §3.
//
// This is the number that orders targets — NOT the xp printed above the
// monster's head. xp only says how hard it hits; the cost of a duel also
// depends on how long it takes to kill, so a wolf and an ogre share xp 4
// while the ogre costs about half again as much.

import { KILLS_PER_XP, MONSTER_SKIP_CHANCE, XP_FROM_KILLS } from '../sim/balance.js';
import { armourValue, expectedDamage, weaponDamage } from '../sim/combat.js';

// Monsters carry no inventory, so they never get a weapon bonus and never
// have armour — the item they hold sits in `drop`, outside the maths.
export function duelCost(player, monster) {
  const mine = expectedDamage(player.xp, weaponDamage(player), 0);
  const theirs = expectedDamage(monster.xp, 0, armourValue(player));

  if (mine <= 0) {
    return { hpLost: Infinity, turns: Infinity, survivable: false };
  }

  const turns = monster.hp / mine;

  // They land (1 - skip) of their turns, and they never get the last one:
  // the blow that kills them happens on the player's turn.
  const hpLost = (1 - MONSTER_SKIP_CHANCE) * Math.max(0, turns - 1) * theirs;

  return { hpLost, turns, survivable: hpLost < player.hp };
}

// What killing ALL of them costs, fighting in the cheapest-first order.
//
// Not just a sum: every second kill raises xp, which makes everything left
// cheaper, so the order changes the total. This is the snowball from
// docs/bot-strategy.md §3, and it is why a piece of gear has to be priced
// against the whole remaining campaign rather than against one fight.
// `growsXp` defaults to the rule actually in force. It used to default to
// true regardless, which quietly credited the hero with levelling up
// mid-campaign after xp growth had been switched off — making every cost
// this produced optimistic.
export function campaignCost(player, monsters, growsXp = XP_FROM_KILLS) {
  let xp = player.xp;
  let kills = player.kills ? player.kills.length : 0;
  let total = 0;
  const left = [...monsters];

  while (left.length) {
    const me = { ...player, xp };
    let cheapest = 0;
    let cheapestCost = Infinity;
    for (let i = 0; i < left.length; i++) {
      const cost = duelCost(me, left[i]).hpLost;
      if (cost < cheapestCost) { cheapestCost = cost; cheapest = i; }
    }
    left.splice(cheapest, 1);
    total += cheapestCost;

    kills++;
    if (growsXp && kills % KILLS_PER_XP === 0) xp++;
  }
  return total;
}
