// Monster behaviour. Spec: docs/rogule-spec.md §7.
//
// Monsters only ever chase. They never flee, never wander, never pick items
// up — and they are completely STATIC while the player is further away than
// their `activation`. That property is what the bot's "cold zone" is built
// on (docs/bot.md), so it has to stay exact.

import { MONSTER_SKIP_CHANCE } from './balance.js';
import { drawChance } from './rng.js';
import { findPath, isWalkable, posKey, samePos } from './mapgen.js';
import { monsterAttacks } from './combat.js';

// Monsters block each other but NOT the player — walking onto the player is
// how they attack. FAITHFUL engine.cljs:328.
function monsterPassable(state, map, self) {
  const blocked = new Set();
  for (const other of state.monsters) {
    if (other.dead || other === self) continue;
    blocked.add(posKey(other.pos));
  }
  return (x, y) => isWalkable(map, x, y) && !blocked.has(x + ',' + y);
}

function moveMonster(state, monster, pos) {
  monster.pos = pos;
  // Anything it carries travels with it. FAITHFUL engine.cljs:88.
  if (monster.drop) monster.drop.pos = pos.slice();
}

export function updateMonsters(state, map) {
  for (const monster of state.monsters) {
    // How many ACTIONS this creature takes per hero turn, each one a step
    // or a blow. DIVERGENCE: the original has no such thing and neither did
    // this game until M44 — every row of MONSTER_TABLE leaves it unset and
    // therefore acts once, exactly as before, so the shipped bestiary is
    // untouched. Only the vault's occupant sets it.
    //
    // It exists because it is the ONLY property found that raises what a
    // fight costs without raising what the bot prices it at (see duelCost
    // in src/bot/bot.js, and docs/project/decisions.md for the sweep that
    // established there is no other). Everything reachable through hp and
    // xp moves entry and lethality together.
    const actions = monster.speed ?? 1;
    for (let act = 0; act < actions; act++) {
      if (monster.dead) break;
      if (state.outcome) return;

      const path = findPath(
        monster.pos, state.player.pos, monsterPassable(state, map, monster),
      );

      // The original short-circuits: when the activation test fails the skip
      // die is never rolled. Drawing it anyway would desync every later roll,
      // so the order here is load-bearing. FAITHFUL engine.cljs:350.
      if (path.length >= monster.activation) break;
      // Inside a hypothetical world the bot assumes monsters never skip a
      // turn: pessimistic in both directions, and it keeps the search free of
      // chance branches.
      //
      // `continue`, not `break`: the die is rolled per ACTION, so a fast
      // creature that fumbles its first step may still take the second.
      // Rolling once for the whole turn would make speed 2 exactly twice as
      // reliable as speed 1, which is a different creature.
      if (!state.sim && drawChance(state, 'combat', MONSTER_SKIP_CHANCE)) continue;

      // path[0] is the monster itself, so path[1] is the step it wants. With
      // no route at all the path is empty and it simply rests.
      const next = path[1];
      if (!next) break;

      if (samePos(next, state.player.pos)) {
        monsterAttacks(state, monster);
      } else {
        moveMonster(state, monster, next);
      }
    }
  }
}
