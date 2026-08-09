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

// Off by default: die, and the balance/held items both reset to zero — the
// owner's rule, no flag needed to get it. This flag exists so the softer
// rule (carry through a death) can be measured against the default
// without an argument, same pattern XP_FROM_KILLS/HP_FROM_KILLS already
// use for a mechanic the owner wants on record both ways. Flip it here to
// compare; nothing else in this module reads it implicitly — resetOnDeath
// takes it as an explicit argument so a caller (or a test) is never
// guessing which rule just ran.
export const PERSIST_BALANCE_ACROSS_DEATH = false;

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
// rule itself, callable in isolation. `persist` takes
// PERSIST_BALANCE_ACROSS_DEATH as its default so ordinary callers get the
// shipped behaviour, but U6f (the end-to-end check) can pass either value
// explicitly to compare both without touching the constant or reloading
// the page.
//
// persist=false (default): balance and held items both reset to zero.
// persist=true: both left exactly as they were — there is nothing to
// bank on a death either way, since the run's own unbanked earnings
// (U6b/U6c) are lost regardless of this flag. Only pre-existing state
// survives, and only if the flag says it should.
export function resetOnDeath(persist = PERSIST_BALANCE_ACROSS_DEATH) {
  if (persist) return load();
  save({ balance: 0, heldItems: [] });
  return { balance: 0, heldItems: [] };
}
