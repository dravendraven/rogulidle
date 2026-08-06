// What a fight is going to cost, before taking it. docs/bot-strategy.md §3.
//
// This is the number that orders targets — NOT the xp printed above the
// monster's head. xp only says how hard it hits; the cost of a duel also
// depends on how long it takes to kill, so a wolf and an ogre share xp 4
// while the ogre costs about half again as much.

import { MONSTER_SKIP_CHANCE } from '../sim/balance.js';
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
