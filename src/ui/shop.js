// U6e — docs/backlog.md. Three purchase options at run end, priced per
// the fixed table (docs/project/candidates.md's old U6 has the
// derivation: shield 1, dagger 5, axe 8). Flat prices, multi-buy allowed
// — the stacking asymmetry between armour (linear, uncapped) and weapons
// (sharply diminishing per point) is accepted on purpose here; fixing it
// is out of scope for this item (filed as M32, blocked on the lab).
//
// Item templates come straight from src/sim/balance.js's ITEM_TABLE
// rather than being redefined here — src/sim/game.js's `startingItems`
// (U6d) needs objects shaped exactly like what the engine already grants
// on a chest pickup (.dmg/.armour/.emoji), so reusing the real table is
// what keeps a shop purchase indistinguishable from a chest find.

import { ITEM_TABLE } from '../sim/balance.js';
import { drawWeighted } from '../sim/rng.js';

const byName = (name) => ITEM_TABLE.find((item) => item.name === name);

export const SHOP_ITEMS = [
  { item: byName('shield'), price: 1 },
  { item: byName('dagger'), price: 5 },
  { item: byName('axe'), price: 8 },
];

// The no-input default, applied when nothing is clicked before the shop
// screen's own timer runs out — and per the item's own warning, that IS
// what happens in most runs, not a fallback: Rogulidle plays itself,
// nobody is guaranteed to be watching. "Cheapest affordable" would mean
// every run buys shields forever, which the item explicitly warns
// against. This weights by price among what's affordable instead, so the
// pricier purchase wins more often without being deterministic — keeps
// what's watched varying run to run rather than converging on one answer
// either way once the balance clears the shield price.
//
// `seed` — caller-supplied, derived the same way a run's own seed is
// (hashSeeds(sessionSeed, runNumber)). This used to draw from
// Math.random(), which was the one thing in src/ui/ that broke "?seed=
// makes the whole session reproducible": the default purchase becomes
// the next run's startingItems, so an unseeded draw meant the same
// ?seed= produced a different loadout, and therefore a different run,
// on replay — found in review, not by this file's own testing.
// drawWeighted (src/sim/rng.js) rather than a hand-rolled weighted pick,
// so this shares the one implementation of "pick weighted by X" instead
// of carrying a second copy that could drift from it.
export function pickDefaultPurchase(balance, seed) {
  const affordable = SHOP_ITEMS.filter((entry) => entry.price <= balance);
  if (affordable.length === 0) return null;
  const state = { rng: { shop: seed } };
  return drawWeighted(state, 'shop', affordable.map((entry) => [entry, entry.price]));
}
