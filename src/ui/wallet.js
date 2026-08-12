// U6a — docs/backlog.md, first of six in U6's arc (originally U3a; the
// project agent renumbered the whole meta-progression arc since). The
// drawer: a persisted coin balance and the held items a purchase (U6e)
// adds to, plus the death rule that clears or carries them.
//
// localStorage only, same reasoning as score.js: step() takes no storage
// access, so this stays out of src/sim/ in both directions — nothing here
// is read by the engine, and nothing here changes what a run does.
//
// U6e — held item became held ITEMS (a list): multiple copies of a
// purchase are allowed and both already stack in the engine
// (weaponDamage sums the inventory, player.armour += accumulates), so
// the wallet needs to hold more than one.

const KEY = 'rogulidle-wallet';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      balance: Number.isFinite(parsed.balance) ? parsed.balance : 0,
      heldItems: Array.isArray(parsed.heldItems) ? parsed.heldItems : [],
    };
  } catch {
    // Private browsing, quota, or corrupt JSON — the wallet just doesn't
    // persist rather than breaking the page.
    return { balance: 0, heldItems: [] };
  }
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Same cases as load() — nothing to do about it here.
  }
}

export function getBalance() {
  return load().balance;
}

export function setBalance(balance) {
  const data = load();
  data.balance = Number.isFinite(balance) ? balance : 0;
  save(data);
  return data.balance;
}

export function getHeldItems() {
  return load().heldItems;
}

export function setHeldItems(items) {
  const data = load();
  data.heldItems = Array.isArray(items) ? items : [];
  save(data);
  return data.heldItems;
}

export function addHeldItem(item) {
  const data = load();
  data.heldItems = [...data.heldItems, item];
  save(data);
  return data.heldItems;
}

// The death rule — not U6c's wiring of it into a real run ending, just the
// rule itself, callable in isolation. Die, and the balance and held items
// both reset to zero — the owner's rule. The run's own unbanked earnings
// were already lost before this runs.
export function resetOnDeath() {
  save({ balance: 0, heldItems: [] });
  return { balance: 0, heldItems: [] };
}
