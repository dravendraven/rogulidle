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

import { ITEM_TABLE, SHOP_PRICES } from '../sim/balance.js';
import { readSlice, writeSlice } from './save.js';

const byName = (name) => ITEM_TABLE.find((item) => item.name === name);

// THE PRICES, AND THE ONE RULER BEHIND THEM (owner, 2026-08-16): an item
// costs what it is worth IN HP TO A HERO WITH EMPTY HANDS, over the opening
// (floors 1-3). Not what it is worth to a hero who already owns three — the
// price never falls for the second copy, and stacking is the player's
// choice, deliberately. The shield anchors the scale: 3 hp for 2 coins.
//
// Measured with the model the bot already carries (`dropValue` / `duelCost`,
// src/bot/bot.js — a weapon is priced as the duel it shortens, so no
// exchange rate had to be invented), against the fights real runs actually
// had: dagger 8.9 hp, axe 16.1 hp. That is 6 and 11 on the ruler, and the
// dagger's old 10 was the worst deal on the shelf — 0.89 hp per coin where
// the shield gave 1.50.
//
// The axe was 16 until E2 (owner, 2026-08-21): 12 is the bridge half of
// the E2 pair, shipped together with the floors 1-3 weapon cut in
// dial-overrides.json — the cut alone strangles the farm->buy->win loop
// (E1's pair rule), and the cheap axe was the only bridge measured that
// adds ONLY bought-axe kills without reinflating the paths the cut
// closes. It stays the run's rare event the same way as before, just by
// income instead of price: a wall death pays ~5-7, so 12 is still only
// reachable by a good run. The old 16 was where two rulers met (hp value
// 11, Butcher value higher); decisions.md "E2 swept" has the sweep.
//
// The potion stays at 1 rather than rising to 2 for the same kind of reason
// in the other direction: the hp ruler OVERRATES it. Sixteen of them move
// the Butcher not at all (11.2% against 10.0% empty-handed), and adding four
// to an axe makes that basket worse. Its job is the opening and the change —
// a run's balance is odd about half the time, and without a 1-coin item that
// coin is discarded at the door.
//
// Both rulers, the baskets and the sigmas are in decisions.md (U6g, U6h).
// The numbers themselves moved to `SHOP_PRICES` (src/sim/balance.js) so the
// bot's xp-to-hp conversion can read them without importing the UI; the
// paragraphs above remain the derivation.
export const SHOP_ITEMS = Object.entries(SHOP_PRICES).map(
  ([name, price]) => ({ item: byName(name), price }),
);

// ***** what the shop buys when nobody is watching *****
//
// The no-input path is not a fallback: Rogulidle plays itself, so most runs
// end with nobody at the keyboard and this IS the shop. What it used to do
// was draw ONE item weighted by price, out of the run's own seed. Two things
// were wrong with that, and neither was the randomness:
//
//   - it spent one item and threw the rest away, so a viewer who stayed got
//     multi-buy and a viewer who left got a single purchase — the game
//     punished not watching, which is the opposite of what it is for;
//   - a weighted draw is nobody's decision. The player had no way to say
//     "save for the axe" or "stack shields", and a shop that decides for you
//     is not a choice in the sense objectives.md means.
//
// So the balance is now SPENT DOWN a declared order: the first item the
// balance still reaches, over and over, until it reaches nothing. Owner's
// call on both halves (2026-08-15) — drain rather than one item, and
// "most expensive affordable first" as what everyone gets by default.
//
// THE DEFAULT ORDER IS DERIVED, NOT DECLARED: the price ladder read
// backwards. That is deliberate — a hand-written list here would be a
// second copy of the prices above, free to drift from them the next time
// one moves, and it would need a row in docs/balance.md of its own. This
// way the only value is the price, which already has one.
//
// Expensive-first is also the least inflationary drain there is: the change
// only falls through to the cheap items at the end, so a balance buys one
// good thing and a little rather than a pile of shields.
export const DEFAULT_ORDER = SHOP_ITEMS
  .slice()
  .sort((a, b) => b.price - a.price)
  .map((entry) => entry.item.name);

// One slice of the save document (src/ui/save.js), which owns the storage
// and the failure cases this used to carry itself.
const SLICE = 'shopOrder';

// Unknown names dropped, duplicates dropped, MISSING ones appended in the
// default order. That last half is what lets a fifth item join the shelf
// later without vanishing from every stored order that predates it — the
// same reasoning dials.js's `rolledNotches` uses when it writes back an
// incomplete roll instead of rerolling the lot.
//
// Also the reason `nextPurchase` runs it on whatever it is handed: a caller
// passing a stale or partial list still gets every item considered, just at
// the end of the list rather than nowhere.
function sanitiseOrder(names) {
  const known = new Set(SHOP_ITEMS.map((entry) => entry.item.name));
  const out = [];
  for (const name of Array.isArray(names) ? names : []) {
    if (known.has(name) && !out.includes(name)) out.push(name);
  }
  for (const name of DEFAULT_ORDER) if (!out.includes(name)) out.push(name);
  return out;
}

// localStorage only, the same rule score.js, wallet.js and roster.js state:
// `step()` takes no storage access, so nothing here is read by the engine —
// it only decides what the page hands it as the next run's startingItems.
export function getShopOrder() {
  // sanitiseOrder already answers for anything that is not a list of names
  // it knows, which is every shape a broken store can hand back.
  return sanitiseOrder(readSlice(SLICE));
}

export function setShopOrder(names) {
  const order = sanitiseOrder(names);
  writeSlice(SLICE, order);
  return order;
}

// ONE purchase, and the caller loops. The rule lives here; the pacing —
// how long a drained coin stays on screen — belongs to whoever is drawing,
// which is why this returns a single entry rather than the whole basket.
//
// It is also a pure function of its two arguments, so a test can ask it
// what an order buys without touching localStorage or a clock.
export function nextPurchase(balance, order) {
  for (const name of sanitiseOrder(order)) {
    const entry = SHOP_ITEMS.find((e) => e.item.name === name);
    if (entry && entry.price <= balance) return entry;
  }
  return null;
}
