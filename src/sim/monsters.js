// Monster behaviour. Spec: docs/rogule-spec.md §7.
//
// Monsters only ever chase. They never flee, never wander, never pick items
// up — and they are completely STATIC while the player is further away than
// their `activation`. That property is what the bot's "cold zone" is built
// on (bot-strategy §1), so it has to stay exact.

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
    if (monster.dead) continue;
    if (state.outcome) return;

    const path = findPath(
      monster.pos, state.player.pos, monsterPassable(state, map, monster),
    );

    // The original short-circuits: when the activation test fails the skip
    // die is never rolled. Drawing it anyway would desync every later roll,
    // so the order here is load-bearing. FAITHFUL engine.cljs:350.
    if (path.length >= monster.activation) continue;
    if (drawChance(state, 'combat', MONSTER_SKIP_CHANCE)) continue;

    // path[0] is the monster itself, so path[1] is the step it wants. With
    // no route at all the path is empty and it simply rests.
    const next = path[1];
    if (!next) continue;

    if (samePos(next, state.player.pos)) {
      monsterAttacks(state, monster);
    } else {
      moveMonster(state, monster, next);
    }
  }
}
