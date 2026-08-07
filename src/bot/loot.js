// What loot is worth, in hp.
//
// Everything the bot decides is priced in hp, because hp is the resource
// that actually runs out (the regen cap, spec §13.1). So an item is worth
// exactly the hp it saves over the rest of the run:
//
//   value(weapon) = cost of killing everything left WITHOUT it
//                 - cost of killing everything left WITH it
//
// That prices a weapon properly: it is worth more when there is a lot left
// to kill, and nearly nothing on an empty floor.
//
// Armour and potions are simpler, because both are just damage the hero can
// take. Armour is worth its full value every time, since the bar refills
// regardless; a potion is worth only the gap it can actually fill.

import {
  CHEST_LOOT_CHANCE, ITEM_TABLE, MONSTER_COUNT, POTION_HEAL,
  UNKNOWN_MONSTER_ESTIMATE,
} from '../sim/balance.js';
import { itemWeights } from '../sim/spawn.js';
import { campaignCost } from './duel.js';

// Borrowed from the generator rather than recomputed, so the bot's guess at
// what a chest holds cannot drift away from what chests actually hold.
// The CHEST pool specifically — weapons and armour, no potions, since
// potions now only fall off monsters. Includes the empty slot, so a chest
// full of nothing drags the expected value down instead of being invisible.
const ITEM_MIX = (() => {
  const weights = itemWeights({}, 'chest');
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  return weights.map(([item, w]) => [item, w / total]);
})();

// Known live monsters, plus a stand-in for each one still unaccounted for.
// Without the stand-ins the bot would value gear at zero whenever it cannot
// currently see anything — exactly when it should be stocking up.
//
// `future` extends the count past this floor. A sword taken on floor 3 is
// swung on floors 4 to 10, and pricing it against floor 3 alone made the
// bot structurally blind to the long game the owner's map design is built
// around: it could not tell a detour that pays for the rest of the descent
// from one that pays for the next ten minutes.
//
// The future floors are counted as unknowns rather than modelled, because
// their rosters genuinely are unknown — the bot has not seen them and the
// generator has not built them yet.
export function monstersStillToFight(belief, total = MONSTER_COUNT, future = 0) {
  const known = [...belief.monsters.values()];
  const live = known.filter((m) => !m.dead);
  const unaccounted = Math.max(0, total - known.length) + Math.max(0, future);

  const out = live.map((m) => ({ xp: m.xp, hp: m.hp }));
  for (let i = 0; i < unaccounted; i++) out.push({ ...UNKNOWN_MONSTER_ESTIMATE });
  return out;
}

// How many creatures the hero still has to face AFTER this floor, given the
// dungeon's growth law. Returns 0 on the last floor, and 0 when the bot was
// not told where it is — a single floor played on its own has no future to
// discount against, and must keep behaving exactly as before.
export function monstersAhead(level, levels, base, growth) {
  if (!level || !levels || level >= levels) return 0;
  let sum = 0;
  for (let n = level + 1; n <= levels; n++) {
    sum += Math.max(1, Math.round(base * Math.pow(growth, n - 1)));
  }
  return sum;
}

function withItem(player, item) {
  return { ...player, inventory: [...player.inventory, item] };
}

// One value per item TYPE rather than per item on the floor — there are 7
// types and can be dozens of items, and the value only depends on the type.
export function valueByItemName(belief, total = MONSTER_COUNT, future = 0) {
  const player = belief.player;
  const monsters = monstersStillToFight(belief, total, future);
  const baseline = campaignCost(player, monsters);

  const values = new Map();
  for (const template of ITEM_TABLE) {
    if (template.heal) {
      // A potion is worth the healing it can actually deliver. At full
      // health that is zero — and the engine leaves it on the floor rather
      // than wasting it, so the bot is right to walk past and come back.
      values.set(template.name, Math.min(POTION_HEAL, player.hpMax - player.hp));
      continue;
    }
    if (template.armour) {
      // Refills the armour bar, which soaks damage before hp does. Always
      // worth its full face value — unlike a potion it is not capped by how
      // hurt the hero currently is.
      values.set(template.name, template.armour);
      continue;
    }
    if (!template.dmg) {
      values.set(template.name, 0);           // no combat use
      continue;
    }
    values.set(template.name, baseline - campaignCost(withItem(player, template), monsters));
  }
  return values;
}

// What an unopened chest is worth on average: the chance it holds anything,
// times the mix of what it could be.
export function expectedChestValue(values) {
  let sum = 0;
  for (const [template, probability] of ITEM_MIX) {
    if (!template) continue;                 // the empty slot is worth nothing
    sum += probability * (values.get(template.name) || 0);
  }
  return CHEST_LOOT_CHANCE * sum;
}
