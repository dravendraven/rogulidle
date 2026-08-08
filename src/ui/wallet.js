// U3a — docs/backlog.md, first of six in U3's arc. The drawer, empty:
// a persisted coin balance and a held starting item that survive a page
// reload, plus the death rule that clears or carries them. Nothing about
// payout (U3b), banking (U3c), the engine accepting a loadout (U3d), or
// the shop (U3e) lives here yet — those build on this module, this module
// doesn't reach for them.
//
// localStorage only, same reasoning as score.js: step() takes no storage
// access, so this stays out of src/sim/ in both directions — nothing here
// is read by the engine, and nothing here changes what a run does.

const KEY = 'rogulidle-wallet';

// Off by default: die, and the balance/held item both reset to zero — the
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
      heldItem: parsed.heldItem ?? null,
    };
  } catch {
    // Private browsing, quota, or corrupt JSON — the wallet just doesn't
    // persist rather than breaking the page.
    return { balance: 0, heldItem: null };
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

export function getHeldItem() {
  return load().heldItem;
}

export function setHeldItem(item) {
  const data = load();
  data.heldItem = item ?? null;
  save(data);
  return data.heldItem;
}

// The death rule, U3a's own scope — not U3c's wiring of it into a real
// run ending, just the rule itself, callable in isolation. `persist`
// takes PERSIST_BALANCE_ACROSS_DEATH as its default so ordinary callers
// get the shipped behaviour, but U3f (the end-to-end check) can pass
// either value explicitly to compare both without touching the constant
// or reloading the page.
//
// persist=false (default): balance and held item both reset to zero.
// persist=true: both left exactly as they were — there is nothing to
// bank on a death either way, since the run's own unbanked earnings
// (U3b/U3c) are lost regardless of this flag. Only pre-existing state
// survives, and only if the flag says it should.
export function resetOnDeath(persist = PERSIST_BALANCE_ACROSS_DEATH) {
  if (persist) return load();
  save({ balance: 0, heldItem: null });
  return { balance: 0, heldItem: null };
}
