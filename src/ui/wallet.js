// U6a — docs/backlog.md, first of six in U6's arc. The drawer: what the
// hero starts the NEXT run holding, bought in the shop that follows every
// run's end.
//
// No persisted coin balance any more (owner decision, see spectator.js's
// showShop): every run earns its own coins and the shop spends them on the
// spot, win or lose. Nothing is banked for later, so there is nothing here
// to carry between runs except the ONE thing actually purchased.
//
// localStorage only, same reasoning as score.js: step() takes no storage
// access, so this stays out of src/sim/ in both directions — nothing here
// is read by the engine, and nothing here changes what a run does.

import { readSlice, writeSlice } from './save.js';

// One slice of the save document (src/ui/save.js), which owns the storage
// and the failure cases this used to carry itself.
const SLICE = 'wallet';

function load() {
  const parsed = readSlice(SLICE) || {};
  return {
    heldItems: Array.isArray(parsed.heldItems) ? parsed.heldItems : [],
  };
}

function save(data) {
  writeSlice(SLICE, data);
}

export function getHeldItems() {
  return load().heldItems;
}

export function setHeldItems(items) {
  const data = { heldItems: Array.isArray(items) ? items : [] };
  save(data);
  return data.heldItems;
}

export function addHeldItem(item) {
  const items = [...load().heldItems, item];
  save({ heldItems: items });
  return items;
}

// The death rule — not U6c's wiring of it into a real run ending, just the
// rule itself, callable in isolation. Die (or time out), and whatever the
// hero was carrying INTO that failed run is lost — the owner's rule. The
// run's own coins were already spent (or not) before this runs; there is
// no balance left for it to touch.
export function resetOnDeath() {
  save({ heldItems: [] });
  return { heldItems: [] };
}
