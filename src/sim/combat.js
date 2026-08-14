// Damage resolution. Spec: docs/rogule-spec.md §5.
//
// The blow always goes attacker -> defender and there is NO counter-attack:
// only whoever moved gets to hit. A duel is therefore strictly alternating.

import { HIT_CHANCE, RAGE_MULT } from './balance.js';
import { drawChance, drawInt } from './rng.js';

// Monsters have no inventory at all, so they never get a weapon bonus — the
// item they carry lives in `drop`, which is not counted. Spec §5.
export function weaponDamage(entity) {
  if (!entity.inventory) return 0;
  return entity.inventory.reduce((sum, item) => sum + (item.dmg || 0), 0);
}

// The other half of a weapon: how far off the FLOOR of the die it lifts the
// roll. `dmg` widens the die upward, `dmgMin` raises its bottom — a weapon
// with `dmgMin` cannot whiff for zero the way a bare fist can. Most items
// leave it unset (0), so this reads as "no weapon changes the floor" until
// one does.
export function weaponMinDamage(entity) {
  if (!entity.inventory) return 0;
  return entity.inventory.reduce((sum, item) => sum + (item.dmgMin || 0), 0);
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
// A weapon WIDENS the die: the roll is uniform over min .. xp-1+weapons and
// only lands `HIT_CHANCE` of the time. `dmg` raises the top, and each point
// of it is worth HALF a point of expected damage. Divergence from the
// original, which added the weapon after the roll; decided ON because gear
// is the resource that runs away over a descent, and this blunts it without
// capping what can be carried.
//
// `minDamage` raises the BOTTOM instead, and a point there is worth a point
// of expected damage on the blows that land — twice what a point of `dmg`
// buys, because it lifts every face of the die rather than adding one more
// face at the top. It cannot cross the top: a floor above the ceiling would
// be an empty range, so it clamps and the die simply becomes a constant.
//
// The defender does not enter the formula: armour is extra hp, so toughness
// changes how many blows are survived, never how hard one lands.
// How far the TOP of an attacker's die is stretched right now. 1 for
// everything in the game except a hero mid-rage (src/sim/step.js) — a
// multiplier rather than a bonus, so it means the same thing to a bare hero
// and an armed one instead of being enormous early and irrelevant later.
//
// A function rather than a field read inline, because BOTH halves of combat
// have to agree about the die: the roll below and the estimate the bot
// prices fights with. Two copies of this test is how a bot ends up
// underestimating its own damage for five turns and nothing fails.
export function rageMultiplier(entity) {
  return entity && entity.raging > 0 ? RAGE_MULT : 1;
}

export function expectedDamage(attackerXp, weapons = 0, minDamage = 0, topMult = 1) {
  const max = Math.max(0, Math.round((attackerXp + weapons - 1) * topMult));
  const min = Math.min(Math.max(0, minDamage), max);

  let total = 0;
  for (let roll = min; roll <= max; roll++) {
    total += roll;
  }
  return HIT_CHANCE * (total / (max - min + 1));
}

// One blow. Mutates `defender.hp` and returns what happened.
//
// Both dice are always drawn, even on a miss, so that the stream advances
// the same way the original's does (engine.cljs:257-258).
export function resolveAttack(state, attacker, defender) {
  const weapons = weaponDamage(attacker);
  const weaponFloor = weaponMinDamage(attacker);

  // `state.sim` marks a hypothetical world, never the real game. There,
  // blows land for their average instead of being rolled, so a simulation
  // stays deterministic and free of luck branches.
  const topMult = rageMultiplier(attacker);

  if (state.sim) {
    const damage = expectedDamage(attacker.xp, weapons, weaponFloor, topMult);
    applyDamage(defender, damage);
    return { damage, killed: defender.hp <= 0, hit: true };
  }

  const hit = drawChance(state, 'combat', HIT_CHANCE) ? 1 : 0;

  // Same clamp as expectedDamage above, for the same reason — and drawInt
  // spends exactly one stream value whatever the range, so raising the
  // floor cannot shift any later draw.
  // Same arithmetic as `expectedDamage` above, and it has to stay the same:
  // the estimate the bot plans with and the die the engine rolls are one
  // rule. `drawInt` spends exactly one stream value whatever the range, so
  // widening the die cannot shift any later draw.
  const max = Math.max(0, Math.round((attacker.xp + weapons - 1) * topMult));
  const roll = drawInt(state, 'combat', Math.min(weaponFloor, max), max);

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

  // THE BLOW THE HERO JUST LANDED, on the state rather than only in the log:
  // `cloneState` does not carry it, so it exists for exactly one turn and the
  // Observation of that turn can report it (src/sim/observe.js). The log has
  // the same numbers but keys the target by NAME, which cannot say WHICH of
  // the three skeletons was hit.
  //
  // Nothing unrevealed crosses here. How hard the hero hit is his own arm,
  // not the creature's health — what it does downstream is let the bot
  // SUBTRACT from a guess it made itself, and a guess minus known blows is
  // still a guess.
  state.blow = { id: monster.id, damage: result.damage };

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

  // `toHp` is how much of the blow got past the armour bar. Recorded so a
  // reader of the log can tell a blow the shield ate from one the hero took
  // — U10; `damage` alone cannot say it, and the two look identical on the
  // hp bar because armour is a second bar.
  state.log.push({
    type: 'attack', by: monster.name, target: 'player',
    damage: result.damage, toHp: result.toHp, killed: result.killed, turn: state.turn,
  });
  return result;
}
