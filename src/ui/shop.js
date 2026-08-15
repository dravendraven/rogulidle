// U6e — docs/backlog.md. The purchase options at run end, priced per the
// fixed table (docs/project/candidates.md's old U6 has the derivation:
// shield 1, dagger 5, axe 8, since doubled — see below). Flat prices,
// multi-buy allowed — the stacking asymmetry between armour (linear,
// uncapped) and weapons (sharply diminishing per point) is accepted on
// purpose here; fixing it is out of scope for this item (filed as M32,
// blocked on the lab).
//
// Item templates come straight from src/sim/balance.js's ITEM_TABLE
// rather than being redefined here — src/sim/game.js's `startingItems`
// (U6d) needs objects shaped exactly like what the engine already grants
// on a chest pickup (.dmg/.armour/.emoji), so reusing the real table is
// what keeps a shop purchase indistinguishable from a chest find.

import { ITEM_TABLE } from '../sim/balance.js';
import { drawWeighted } from '../sim/rng.js';

const byName = (name) => ITEM_TABLE.find((item) => item.name === name);

// Doubled with `COIN_RATE` (owner, 2026-08-15): the rate went 10 → 20 to
// give the payout finer steps, and these follow it so what a run can
// actually afford stays where it was. The RATIO between the three is
// untouched — this is a change of unit, not of the ladder, and the
// stacking defect below is exactly as unbalanced as it was.
// The potion is the CHANGE's item, added with the doubled scale: a run's
// balance is odd about half the time, and at a cheapest price of 2 that odd
// coin was thrown away at the door. At 1 it always buys something.
//
// It is also the only consumable on the shelf, and that is the point of
// picking it rather than a cheaper shield — measured A/B against its own
// price in shields, baseline hero, paired seeds: two potions beat one shield
// on opening deaths by about 5 points (~2.8 sigma over 800 runs) and tied on
// everything else; at four against two the two converge. The opening is the
// run's bottleneck (rules.md §5), armour only pays once the hero lives long
// enough to stack it, so the cheap slot buys the early floors and the shield
// still buys the middle ones. Neither dominates, which is the shape the
// ladder was missing.
export const SHOP_ITEMS = [
  { item: byName('health'), price: 1 },
  { item: byName('shield'), price: 2 },
  { item: byName('dagger'), price: 10 },
  { item: byName('axe'), price: 16 },
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
