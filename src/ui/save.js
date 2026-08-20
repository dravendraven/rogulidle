// EVERYTHING THIS BROWSER REMEMBERS, in one document.
//
// It used to be seven keys — score, wallet, highscores, achievements, hero,
// shop order, lab notches — each module reading and writing its own, each
// with the same five lines of try/catch around it. Nothing was wrong with
// that until something had to read them TOGETHER: a save that follows a
// player to another device is one thing to send, not seven things to keep
// in step (`docs/project/persistencia-e-login.md`).
//
// So the shape is a document with SLICES. A module still owns its slice and
// still exports the same functions it always did; what it no longer owns is
// where the bytes live.
//
//     rogulidle:save:<slot>  →  { v, rev, updatedAt, slices: { ... } }
//
// `rev` counts writes and `updatedAt` stamps them. Nothing reads either one
// today — they exist so the day a server does, the document it receives can
// already say which of two copies is later, without a migration.
//
// THE SLOT IS THE PLAYER'S NAME, and 'local' until one is given. That is the
// whole of the "login" the study describes: no password, no account, no
// server — a name is an ADDRESS, and typing the same one opens the same
// save. Two names in one browser are two independent games.
//
// localStorage only, the same rule every module it replaced already stated:
// `step()` takes no storage access, determinism is the strongest rule in the
// repo, and nothing in `src/sim/` may reach this. It also has to survive
// having no `localStorage` at all — private browsing, a full quota, and
// Node, where `tools/measure.mjs` imports modules that import this one.

const VERSION = 1;
// Where the current name is kept. Not a slice — it names which document to
// open, so it cannot live inside one.
const PLAYER_KEY = 'rogulidle:player';
// The save every browser had before names existed, and the one a first name
// adopts (see `setPlayer`).
const DEFAULT_SLOT = 'local';
// Short on purpose: a name has to be retypeable from memory on a second
// device, which is the only thing it is for.
const NAME_MAX = 16;

const keyFor = (name) => `rogulidle:save:${name}`;

// Resolved once, lazily, so the page can set a name before anything reads a
// slice. null means "not looked yet", never "no player".
let slot = null;

function currentSlot() {
  if (slot === null) slot = getRaw(PLAYER_KEY) || DEFAULT_SLOT;
  return slot;
}

// The seven keys this replaced, and how each one stored its value. Read once
// on the first load that finds no document, then deleted: two copies of the
// same truth is exactly the problem this file exists to end.
//
// `hero` is the odd one — it was a bare string, never JSON, so parsing it
// would turn 'vito' into a corrupt-value fallback.
const LEGACY = [
  ['wallet', 'rogulidle-wallet', 'json'],
  ['highscores', 'rogulidle-highscores', 'json'],
  ['achievements', 'rogulidle-achievements', 'json'],
  ['score', 'rogulidle-score', 'json'],
  ['shopOrder', 'rogulidle-shop-order', 'json'],
  ['notches', 'rogulidle-notches', 'json'],
  ['hero', 'rogulidle-hero', 'text'],
];

// The document, in memory, once loaded. Every read after the first is free,
// and every write goes through here so the copy on screen and the copy on
// disk cannot disagree.
let doc = null;

function blank() {
  return { v: VERSION, rev: 0, updatedAt: 0, slices: {} };
}

function getRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    // Private browsing, a full quota, or no localStorage in this runtime at
    // all — the save simply stops persisting rather than breaking the page.
    return null;
  }
}

function setRaw(key, text) {
  try {
    localStorage.setItem(key, text);
    return true;
  } catch {
    return false;
  }
}

// The seven old keys, if this browser still has them. Returns null when
// there was nothing to carry over — a fresh visitor, or one who has already
// been migrated.
function legacySlices() {
  const slices = {};
  let found = false;
  for (const [slice, key, how] of LEGACY) {
    const raw = getRaw(key);
    if (raw === null) continue;
    found = true;
    if (how === 'text') {
      slices[slice] = raw;
      continue;
    }
    try {
      slices[slice] = JSON.parse(raw);
    } catch {
      // A corrupt old value is dropped rather than carried: every module
      // already treated it as absent, so this changes nothing for them.
    }
  }
  return found ? slices : null;
}

function dropLegacy() {
  for (const [, key] of LEGACY) {
    try {
      localStorage.removeItem(key);
    } catch {
      // As getRaw.
    }
  }
}

function load() {
  if (doc) return doc;

  const raw = getRaw(keyFor(currentSlot()));
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object'
          && parsed.slices && typeof parsed.slices === 'object') {
        doc = {
          v: VERSION,
          rev: Number(parsed.rev) || 0,
          updatedAt: Number(parsed.updatedAt) || 0,
          slices: parsed.slices,
        };
        return doc;
      }
    } catch {
      // Corrupt document — fall through to a fresh one. The alternative is a
      // page that will not load at all, which is worse than a lost save.
    }
  }

  doc = blank();
  const old = legacySlices();
  if (old) {
    doc.slices = old;
    // The old keys go ONLY once the new document is really on disk. If the
    // write failed — quota, private browsing — the seven keys are still the
    // only copy that exists and deleting them would be the one way to
    // actually lose a save.
    if (flush()) dropLegacy();
  }
  return doc;
}

function flush() {
  doc.rev += 1;
  doc.updatedAt = Date.now();
  return setRaw(keyFor(currentSlot()), JSON.stringify(doc));
}

// A COPY IN BOTH DIRECTIONS, and it is not a nicety.
//
// Storing the caller's own object would leave the document holding a live
// reference to state that keeps changing. It cost a real defect to find:
// `spectator.js` wrote its session with `history: session.history`, the run
// after it pushed a chip onto that same array, and the next write of ANY
// slice — a shop purchase touching the wallet — flushed a history one run
// ahead of the run counter beside it. A save has to be a photograph.
//
// The round trip is safe because everything here is already JSON: it is what
// the document is serialised to on every write.
function copy(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

// null for a slice that was never written — the same answer `getItem` gave,
// which is what lets `roster.js` keep telling "never chose" apart from
// "chose the plain hero".
export function readSlice(name) {
  const value = copy(load().slices[name]);
  return value === undefined ? null : value;
}

export function writeSlice(name, value) {
  load();
  doc.slices[name] = copy(value);
  flush();
  return value;
}

export function clearSlice(name) {
  load();
  delete doc.slices[name];
  flush();
}

// ***** the name *****
//
// FOLDED TO SOMETHING RETYPEABLE. Accents come off ('joão' and 'joao' are
// one player, and one of them is hard to type on a borrowed keyboard),
// case goes, spaces and underscores become the single separator, and
// anything left over is dropped. What comes back is the id; an empty string
// means the input was not a name at all.
export function normalisePlayerName(raw) {
  return String(raw == null ? '' : raw)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, NAME_MAX);
}

// null when nobody has ever given one — which is what makes the page ask.
export function getPlayer() {
  return getRaw(PLAYER_KEY) || null;
}

// THE FIRST NAME ADOPTS THE UNNAMED SAVE. Everyone who played before names
// existed has their progress in `local`, and a login screen that greeted
// them with an empty history would have cost them the very thing this arc
// is about. It happens once: once carried, `local` is gone, so the SECOND
// name in the same browser starts clean, which is what two names in one
// browser have to mean.
//
// Returns the name that was actually taken, or null if the input was not a
// name.
export function setPlayer(name) {
  const clean = normalisePlayerName(name);
  if (!clean) return null;

  const unnamed = getRaw(keyFor(DEFAULT_SLOT));
  if (unnamed !== null && getRaw(keyFor(clean)) === null && clean !== DEFAULT_SLOT) {
    if (setRaw(keyFor(clean), unnamed)) {
      try {
        localStorage.removeItem(keyFor(DEFAULT_SLOT));
      } catch {
        // As getRaw. A copy left behind is harmless — it is simply never
        // read again — where a delete without the copy would be the one way
        // to lose a save.
      }
    }
  }

  setRaw(PLAYER_KEY, clean);
  slot = clean;
  doc = null;
  return clean;
}

// ***** the whole document *****
//
// One caller: the sync (src/ui/sync.js), which sends the document up and
// puts a downloaded one in its place. Nothing else has any business reading
// or writing more than its own slice.

export function readSave() {
  return copy(load());
}

// Adopt a document that came from somewhere else. It is written straight to
// disk rather than merged: a save is a photograph of one player's game, and
// half of one is not a save.
export function replaceSave(save) {
  if (!save || typeof save !== 'object' || !save.slices) return false;
  doc = {
    v: VERSION,
    rev: Number(save.rev) || 0,
    updatedAt: Number(save.updatedAt) || 0,
    slices: copy(save.slices),
  };
  return flush();
}

// Drop the in-memory copy, so the next read goes back to disk.
//
// For anything that changes the document behind this module's back: the test
// suite, which writes a forged store and puts the real one back afterwards
// (`test/tests.js`), and — later — a save adopted from a server.
export function reloadSave() {
  doc = null;
  slot = null;
}
