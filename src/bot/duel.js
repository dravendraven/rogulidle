// What a fight is going to cost, before taking it. docs/bot-strategy.md §3.
//
// This is the number that orders targets — NOT the xp printed above the
// monster's head. xp only says how hard it hits; the cost of a duel also
// depends on how long it takes to kill, so a wolf and an ogre share xp 4
// while the ogre costs about half again as much.

import {
  CROWD_COST_OVERHEAD, KILLS_PER_XP, MONSTER_SKIP_CHANCE, XP_FROM_KILLS,
} from '../sim/balance.js';
import { effectiveHp, expectedDamage, weaponDamage } from '../sim/combat.js';

// Monsters carry no inventory, so they never get a weapon bonus — the item
// they hold sits in `drop`, outside the maths.
//
// What a monster hits for no longer depends on the hero at all, since
// armour became extra hp rather than damage reduction. That is one fewer
// coupling: a monster's bite is a constant, and gear changes how many of
// them the hero can absorb.
export function duelCost(player, monster) {
  const mine = expectedDamage(player.xp, weaponDamage(player));
  const theirs = expectedDamage(monster.xp, 0);

  if (mine <= 0) {
    return { hpLost: Infinity, turns: Infinity, survivable: false };
  }

  const turns = monster.hp / mine;

  // They land (1 - skip) of their turns, and they never get the last one:
  // the blow that kills them happens on the player's turn.
  const hpLost = (1 - MONSTER_SKIP_CHANCE) * Math.max(0, turns - 1) * theirs;

  return { hpLost, turns, survivable: hpLost < effectiveHp(player) };
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
// How much the clean-duel sum under-states a real crowd, as a flat hp
// overhead — see balance.js for why additive-in-blowSum beat the
// multiplicative-in-count form this replaced. One multiply and one sum over
// a roster already in hand, against an O(n^2) loop: free.
export function crowdOverhead(monsters, on = true) {
  if (!on || !monsters.length) return 0;
  let blows = 0;
  for (const m of monsters) blows += expectedDamage(m.xp, 0);
  return CROWD_COST_OVERHEAD * blows;
}

// `crowd` is a flag rather than a constant so the correction can be A/B'd
// against the model it replaces. OFF reproduces every number measured
// before it exactly.
export function campaignCost(player, monsters, growsXp = XP_FROM_KILLS, crowd = true) {
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
  // The correction lands here and not inside the loop on purpose: the
  // per-duel maths is not what is wrong, the assumption that duels happen
  // one at a time is. It is measured against the ORIGINAL roster, not
  // `left` — the overhead is what a crowded floor costs, and shrinks as
  // creatures die same as `total` does, one roster-worth at a time.
  return total + crowdOverhead(monsters, crowd);
}
