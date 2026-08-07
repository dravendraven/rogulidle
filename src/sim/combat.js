// Damage resolution. Spec: docs/rogule-spec.md §5.
//
// The blow always goes attacker -> defender and there is NO counter-attack:
// only whoever moved gets to hit. A duel is therefore strictly alternating.

import {
  HIT_CHANCE, HP_FROM_KILLS, HP_GRANT_AMOUNT, HP_GRANT_PER_KILLS,
  KILLS_PER_XP, WEAPONS_WIDEN_ROLL, XP_FROM_KILLS,
} from './balance.js';
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
// this (docs/bot-strategy.md §3) and it must stay in step with the roll
// below — one formula, one place.
//
// The roll is uniform over 0 .. xp-1 and the whole thing only lands
// `HIT_CHANCE` of the time. The defender does not enter the formula at all:
// armour is extra hp rather than damage reduction, so how tough the target
// is changes how many blows they survive, never how hard a blow lands.
export function expectedDamage(attackerXp, weapons, widen = WEAPONS_WIDEN_ROLL) {
  // Two ways a weapon can help, and they behave very differently.
  //
  // FLAT (faithful): the roll is 0..xp-1 and the weapon is added after, so
  // it raises the FLOOR — an armed hero can no longer roll low. Each point
  // of weapon is worth a full point of expected damage.
  //
  // WIDENED: the weapon enlarges the die instead, 0..xp-1+weapons. The floor
  // stays at zero, so even a well-armed hero still whiffs, and each point is
  // worth only half a point of expected damage.
  const sides = Math.max(1, widen ? attackerXp + weapons : attackerXp);
  const bonus = widen ? 0 : weapons;

  let total = 0;
  for (let roll = 0; roll < sides; roll++) {
    total += roll + bonus;
  }
  return HIT_CHANCE * (total / sides);
}

// One blow. Mutates `defender.hp` and returns what happened.
//
// Both dice are always drawn, even on a miss, so that the stream advances
// the same way the original's does (engine.cljs:257-258).
export function resolveAttack(state, attacker, defender) {
  const weapons = weaponDamage(attacker);
  const widen = state.weaponsWidenRoll ?? WEAPONS_WIDEN_ROLL;

  // `state.sim` marks a hypothetical world the bot is thinking inside, never
  // the real game (test/tests.js guards that). There, blows land for their
  // average instead of being rolled: the search stays deterministic, no
  // branch on luck, and no lucky streak fools the bot into a bad plan.
  if (state.sim) {
    const damage = expectedDamage(attacker.xp, weapons, widen);
    applyDamage(defender, damage);
    return { damage, killed: defender.hp <= 0, hit: true };
  }

  const hit = drawChance(state, 'combat', HIT_CHANCE) ? 1 : 0;

  const roll = drawInt(state, 'combat', 0,
    Math.max(0, (widen ? attacker.xp + weapons : attacker.xp) - 1));

  const damage = (roll + (widen ? 0 : weapons)) * hit;
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
    // U3, docs/backlog.md — separate from `kills` on purpose: `kills` holds
    // only the name, and M3 can reskin a creature's stats after it was
    // placed, so reading xp back off MONSTER_TABLE by name later would give
    // the wrong number for a reskinned kill. Recorded here, at the moment
    // of the kill, against the monster's actual live xp.
    state.player.xpEarned += monster.xp;
    // One xp every second kill. FAITHFUL engine.cljs:272.
    const growsXp = state.xpFromKills ?? XP_FROM_KILLS;
    if (growsXp && state.player.kills.length % KILLS_PER_XP === 0) state.player.xp++;

    // Defensive half of the same idiom — M6, docs/backlog.md. Same shape as
    // the xp grant just above: every HP_GRANT_PER_KILLS kills, both the
    // ceiling and the current value rise, so the grant shows up in the
    // buffer measured on arrival, not just in a maximum nothing refills.
    const growsHp = state.hpFromKills ?? HP_FROM_KILLS;
    if (growsHp && state.player.kills.length % HP_GRANT_PER_KILLS === 0) {
      state.player.hpMax += HP_GRANT_AMOUNT;
      state.player.hp += HP_GRANT_AMOUNT;
    }
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
