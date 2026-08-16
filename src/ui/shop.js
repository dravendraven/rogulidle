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

const ORDER_KEY = 'rogulidle-shop-order';

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
  try {
    return sanitiseOrder(JSON.parse(localStorage.getItem(ORDER_KEY) || 'null'));
  } catch {
    // Private browsing, quota, corrupt JSON — the order simply stops being
    // remembered rather than breaking the page.
    return [...DEFAULT_ORDER];
  }
}

export function setShopOrder(names) {
  const order = sanitiseOrder(names);
  try {
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  } catch {
    // As above.
  }
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
