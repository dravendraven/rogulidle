// Damage resolution. Spec: docs/rogule-spec.md §5.
//
// The blow always goes attacker -> defender and there is NO counter-attack:
// only whoever moved gets to hit. A duel is therefore strictly alternating.

import { HIT_CHANCE } from './balance.js';
import { drawChance, drawInt } from './rng.js';

// Monsters have no inventory at all, so they never get a weapon bonus — the
// item they carry lives in `drop`, which is not counted. Spec §5.
export function weaponDamage(entity) {
  if (!entity.inventory) return 0;
  return entity.inventory.reduce((sum, item) => sum + (item.dmg || 0), 0);
}

// Armour a shield is worth when picked up. The hero's CURRENT armour lives
// in `player.armour`, not here — this only reads the item side.
export function armourValue(entity) {
  if (!entity.inventory) return 0;
  return entity.inventory.reduce((sum, item) => sum + (item.armour || 0), 0);
}

// Damage the hero can take before dying: both bars together. Anything
// deciding whether a fight is survivable has to use this, not `hp` alone,
// or it throws away everything the armour bar is holding.
export function effectiveHp(entity) {
  return entity.hp + (entity.armour || 0);
}

// Spends a blow against the armour bar first, then hp. Armour is a buffer
// that is consumed, never a reduction — a blow lands for its full size
// whatever the target is wearing, it just may land on the buffer.
//
// Returns how much of the blow reached hp.
export function applyDamage(defender, damage) {
  let left = damage;

  if (defender.armour > 0) {
    const soaked = Math.min(defender.armour, left);
    defender.armour -= soaked;
    left -= soaked;
  }

  defender.hp = Math.max(0, defender.hp - left);
  return left;
}

// Average damage of one blow, without rolling for it. The bot plans with
// this and it must stay in step with the roll below — one formula, one place.
//
// A weapon WIDENS the die: the roll is uniform over 0 .. xp-1+weapons and
// only lands `HIT_CHANCE` of the time. The floor stays at zero — a well-
// armed hero still whiffs — and each weapon point is worth HALF a point of
// expected damage. Divergence from the original, which added the weapon
// after the roll; decided ON because gear is the resource that runs away
// over a descent, and this blunts it without capping what can be carried.
// The defender does not enter the formula: armour is extra hp, so toughness
// changes how many blows are survived, never how hard one lands.
export function expectedDamage(attackerXp, weapons = 0) {
  const sides = Math.max(1, attackerXp + weapons);

  let total = 0;
  for (let roll = 0; roll < sides; roll++) {
    total += roll;
  }
  return HIT_CHANCE * (total / sides);
}

// One blow. Mutates `defender.hp` and returns what happened.
//
// Both dice are always drawn, even on a miss, so that the stream advances
// the same way the original's does (engine.cljs:257-258).
export function resolveAttack(state, attacker, defender) {
  const weapons = weaponDamage(attacker);

  // `state.sim` marks a hypothetical world, never the real game. There,
  // blows land for their average instead of being rolled, so a simulation
  // stays deterministic and free of luck branches.
  if (state.sim) {
    const damage = expectedDamage(attacker.xp, weapons);
    applyDamage(defender, damage);
    return { damage, killed: defender.hp <= 0, hit: true };
  }

  const hit = drawChance(state, 'combat', HIT_CHANCE) ? 1 : 0;

  const roll = drawInt(state, 'combat', 0, Math.max(0, attacker.xp + weapons - 1));

  const damage = roll * hit;
  const toHp = applyDamage(defender, damage);

  // `damage` is the size of the blow; `toHp` is how much got past armour.
  return { damage, toHp, killed: defender.hp === 0, hit: hit === 1 };
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
    // Separate from `kills` on purpose: `kills` holds only the name, and
    // the out-of-depth reskin can change a creature's stats after placement,
    // so this records the monster's actual live xp at the moment of death.
    //
    // The hero's own xp and hpMax never grow from kills — decided, measured,
    // recorded in decisions.md. Gear and potions are the only ladder.
    state.player.xpEarned += monster.xp;
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
