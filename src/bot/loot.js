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
// take, and both are worth their full face value — B14 (docs/backlog.md).
// A potion used to be capped by the current hp gap because that was the
// truth: drinking was on contact, so healing above the cap was wasted on
// the spot. M35 made drinking its own action and carrying free, so a
// potion is never wasted — it is worth its whole heal for as long as the
// run lasts to spend it, same as armour was already priced.

import {
  CHEST_LOOT_CHANCE, ITEM_TABLE, LOOT_CAMPAIGN_HORIZON, MONSTER_COUNT,
  MONSTER_DROP_CHANCE, MONSTER_TABLE, UNKNOWN_MONSTER_ESTIMATE,
  WEAPON_AXE_MIN_TIER,
} from '../sim/balance.js';
import { itemWeights } from '../sim/spawn.js';
import { campaignCost } from './duel.js';

// Borrowed from the generator rather than recomputed, so the bot's guess at
// what a chest holds cannot drift away from what chests actually hold.
// The CHEST pool specifically — armour only, since M26 moved weapons onto
// the monster source (docs/backlog.md M26) and potions already only fell
// off monsters. Includes the empty slot, so a chest full of nothing drags
// the expected value down instead of being invisible.
//
// Computed live from `itemWeights`, not hand-copied — this comment used to
// say "weapons and armour" and stayed wrong for a whole item's worth of
// commits after weapons moved. The VALUE was never wrong (it reads the
// function, not the comment); only the description of it was.
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
// `horizon` defaults to the SAME constant `monstersAhead` is scaled by at
// the call site in bot.js (`settings.horizon`) — B14 (docs/backlog.md)
// reuses it rather than inventing a second discount for "will the run last
// long enough to use this". For a weapon that discount is already embedded
// in `future`'s monster count; a potion has no monster count to shrink, so
// it is applied directly as the plain multiplier `LOOT_CAMPAIGN_HORIZON`'s
// own comment already says it is: "a plain discount rather than a modelled
// survival curve".
export function valueByItemName(belief, total = MONSTER_COUNT, future = 0, crowd = true,
  horizon = LOOT_CAMPAIGN_HORIZON) {
  const player = belief.player;
  const monsters = monstersStillToFight(belief, total, future);
  const baseline = campaignCost(player, monsters, undefined, crowd);

  const values = new Map();
  for (const template of ITEM_TABLE) {
    if (template.heal) {
      values.set(template.name, template.heal * horizon);
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
    values.set(template.name,
      baseline - campaignCost(withItem(player, template), monsters, undefined, crowd));
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

// B9 (docs/backlog.md). What a live creature is expected to be carrying,
// in the same hp currency as everything else — M26 put a weapon-or-potion
// pool on every creature, gated by its own tier, and until now nothing
// priced it: `tactics.js` scores a duel on damage and distance alone, so a
// creature with an axe under it scored identically to an empty one.
//
// Read from the creature's TIER, not from `monster.drop` — the belief
// object happens to carry the real, already-rolled drop (`observe.js`
// clones the whole entity), but pricing the exact item would be reading a
// fog-of-war leak rather than an inference, and would make "expected"
// meaningless. `weaponWeightsFor` in spawn.js is the live mechanism that
// decides what a creature of this tier can carry; this calls the same
// `itemWeights` shape rather than a second copy of its logic, so the
// bot's guess cannot drift from what generation actually rolls.
//
// Chest scarcity is not modelled here either, matching `ITEM_MIX` above —
// that map has always assumed scarcity 1 rather than reading
// `armourScarcity`, and the monster side of this stays consistent with it
// rather than inventing a new standard of precision for one drop source.
export function expectedMonsterDropValue(monster, values) {
  const tier = MONSTER_TABLE.findIndex((template) => template.name === monster.name);
  if (tier < 0) return 0;

  const quality = tier / (MONSTER_TABLE.length - 1);
  const exclude = tier < WEAPON_AXE_MIN_TIER ? ['axe'] : [];
  const weights = itemWeights({}, 'monster', quality, exclude);

  let sum = 0;
  for (const [template, probability] of weights) {
    if (!template) continue;
    sum += probability * (values.get(template.name) || 0);
  }
  return MONSTER_DROP_CHANCE * sum;
}
