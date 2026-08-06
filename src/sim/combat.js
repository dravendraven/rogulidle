// Damage resolution. Spec: docs/rogule-spec.md §5.
//
// The blow always goes attacker -> defender and there is NO counter-attack:
// only whoever moved gets to hit. A duel is therefore strictly alternating.

import { HIT_CHANCE, KILLS_PER_XP } from './balance.js';
import { drawChance, drawInt } from './rng.js';

// Monsters have no inventory at all, so they never get a weapon bonus — the
// item they carry lives in `drop`, which is not counted. Spec §5.
export function weaponDamage(entity) {
  if (!entity.inventory) return 0;
  return entity.inventory.reduce((sum, item) => sum + (item.dmg || 0), 0);
}

export function armourValue(entity) {
  if (!entity.inventory) return 0;
  return entity.inventory.reduce((sum, item) => sum + (item.armour || 0), 0);
}

// One blow. Mutates `defender.hp` and returns what happened.
//
// Both dice are always drawn, even on a miss, so that the stream advances
// the same way the original's does (engine.cljs:257-258).
export function resolveAttack(state, attacker, defender) {
  const hit = drawChance(state, 'combat', HIT_CHANCE) ? 1 : 0;
  const roll = drawInt(state, 'combat', 0, Math.max(0, attacker.xp - 1));
  const weapons = weaponDamage(attacker);
  const armour = armourValue(defender);

  const damage = Math.max(0, (roll + weapons - armour) * hit);
  defender.hp = Math.max(0, defender.hp - damage);

  return { damage, killed: defender.hp === 0, hit: hit === 1 };
}

// The player walks into a monster.
export function playerAttacks(state, monster) {
  const result = resolveAttack(state, state.player, monster);

  if (result.killed) {
    monster.dead = true;
    if (monster.drop) {
      // Whatever it was carrying falls where it stood.
      monster.drop.pos = monster.pos.slice();
      state.items.push(monster.drop);
      monster.drop = null;
    }
    state.player.kills.push(monster.name);
    // One xp every second kill. FAITHFUL engine.cljs:272.
    if (state.player.kills.length % KILLS_PER_XP === 0) state.player.xp++;
  }

  state.log.push({
    type: 'attack', by: 'player', target: monster.name,
    damage: result.damage, killed: result.killed, turn: state.turn,
  });
  return result;
}

// A monster walks into the player.
export function monsterAttacks(state, monster) {
  const result = resolveAttack(state, monster, state.player);

  if (result.killed) {
    state.outcome = 'died';
    state.killedBy = monster.name;
  }

  state.log.push({
    type: 'attack', by: monster.name, target: 'player',
    damage: result.damage, killed: result.killed, turn: state.turn,
  });
  return result;
}
