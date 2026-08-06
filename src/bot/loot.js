// What loot is worth, in hp.
//
// Everything the bot decides is priced in hp, because hp is the resource
// that actually runs out (the regen cap, spec §13.1). So an item is worth
// exactly the hp it saves over the rest of the run:
//
//   value(item) = cost of killing everything left WITHOUT it
//               - cost of killing everything left WITH it
//
// That gets the thresholds right for free. A shield is not worth "a bit of
// defence" — against a bat it is worth the entire fight, because armour 1
// clamps an xp-2 monster to zero damage (docs/bot-strategy.md §3). No table
// of hand-tuned item weights can express that; this subtraction can.

import {
  COVER_LOOT_CHANCE, ITEM_TABLE, MONSTER_COUNT, POTION_HEAL,
  UNKNOWN_MONSTER_ESTIMATE,
} from '../sim/balance.js';
import { itemWeights } from '../sim/spawn.js';
import { campaignCost } from './duel.js';

// Borrowed from the generator rather than recomputed, so the bot's guess at
// what a cover holds cannot drift away from what covers actually hold.
// Includes the empty slot, so a cover full of nothing correctly drags the
// expected value down instead of being invisible to the bot.
const ITEM_MIX = (() => {
  const weights = itemWeights();
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  return weights.map(([item, w]) => [item, w / total]);
})();

// Known live monsters, plus a stand-in for each one still unaccounted for.
// Without the stand-ins the bot would value gear at zero whenever it cannot
// currently see anything — exactly when it should be stocking up.
export function monstersStillToFight(belief, total = MONSTER_COUNT) {
  const known = [...belief.monsters.values()];
  const live = known.filter((m) => !m.dead);
  const unaccounted = Math.max(0, total - known.length);

  const out = live.map((m) => ({ xp: m.xp, hp: m.hp }));
  for (let i = 0; i < unaccounted; i++) out.push({ ...UNKNOWN_MONSTER_ESTIMATE });
  return out;
}

function withItem(player, item) {
  return { ...player, inventory: [...player.inventory, item] };
}

// One value per item TYPE rather than per item on the floor — there are 7
// types and can be dozens of items, and the value only depends on the type.
export function valueByItemName(belief, total = MONSTER_COUNT) {
  const player = belief.player;
  const monsters = monstersStillToFight(belief, total);
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
    if (!template.dmg && !template.armour) {
      values.set(template.name, 0);           // pure collectible, no combat use
      continue;
    }
    values.set(template.name, baseline - campaignCost(withItem(player, template), monsters));
  }
  return values;
}

// What an unopened cover is worth on average: the chance it holds anything,
// times the mix of what it could be.
export function expectedCoverValue(values) {
  let sum = 0;
  for (const [template, probability] of ITEM_MIX) {
    if (!template) continue;                 // the empty slot is worth nothing
    sum += probability * (values.get(template.name) || 0);
  }
  return COVER_LOOT_CHANCE * sum;
}
