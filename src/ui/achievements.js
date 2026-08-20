// U11 — the two things a sitting can produce that a single run cannot.
//
// `docs/project/objectives.md` judges a sitting on the distribution of how
// far attempts get, and the history strip already shows that. What it
// cannot show is the FIRST time something happened, because a chip falls
// off the end after twelve runs. These two do not fall off.
//
// Deliberately two, and deliberately not a list that grows. An achievement
// per milestone turns into a checklist, and a checklist is a quantity to
// push — the shape `objectives.md` refuses. These are the two outcomes the
// game is actually about: the wall on the way down, and the bottom.
//
// localStorage only, same reasoning as score.js and wallet.js: `step()`
// takes no storage access, so this stays out of `src/sim/` in both
// directions. Nothing here is read by the engine and nothing here changes
// what a run does.
//
// WHAT AN ACHIEVEMENT NOW DOES. Both rows used to be pure record — earned,
// displayed, inert. `butcher` is the first rung of the ladder in
// `docs/project/candidates.md` (U11): until the pig on floor 4 is down, the
// rail offers no hero but the base one. The gate's key and the sentence
// that explains it therefore both live in this file — a gate whose id is in
// one file and whose reason is in another drifts the first time the reason
// is reworded.
//
// AND SO A FLAG IS NO LONGER ENOUGH. The moment an achievement unlocks
// something, `{"butcher": true}` typed into the console is the whole feature
// defeated. So what gets stored is not the boolean but the RECEIPT — the
// seed and the configuration of the run that earned it — and every load
// re-runs those receipts and checks the pig actually died.
//
// **This is not anti-cheat and does not pretend to be.** There is no server,
// `localStorage` is editable, and anyone can brute-force seeds in Node until
// one kills the Butcher. That is the point: brute-forcing seeds until the
// pig dies IS running the simulation until the pig dies. Forging costs
// exactly what earning costs, which is the only kind of friction a static
// site can honestly charge.
//
// It is also not wasted work. `{name, date, config, runSeed, branch}` is
// what U12's board submits, and the receipt is four fifths of that already.
//
// THE PRICE, stated plainly because it will be paid: a receipt is only
// replayable by the code that recorded it. Change the engine, the bot, or a
// shipped dial and every stored receipt stops reproducing, so every player's
// unlock re-locks. Nothing here can detect the difference between that and a
// forgery. Storage is therefore never rewritten by verification — a receipt
// that stops reproducing is ignored, not deleted, so a change that broke
// them can be reverted and everyone's unlocks come straight back.

import { playRun } from './run.js';

const KEY = 'rogulidle-achievements';

// `emoji` has to be a glyph `src/ui/tiles.js` carries a sprite for — the
// renderer draws Twemoji SVGs, not system emoji, and returns nothing for a
// glyph it does not know. That is how the Butcher shipped invisible.
export const ACHIEVEMENTS = [
  {
    id: 'butcher',
    emoji: '🐷',
    title: 'Açougue fechado',
    locked: 'o porco do andar 4 ainda está de pé',
    earned: 'você derrubou o Butcher',
  },
  {
    id: 'bottom',
    emoji: '🕳️',
    title: 'Fundo do poço',
    locked: 'dez andares. ninguém chegou ainda',
    earned: 'desceu até onde não há mais escada',
  },
];

// The one gate that exists today. Named rather than spelled 'butcher' at
// the rail, so the day a second gate appears the pattern is already here.
export const HERO_GATE = 'butcher';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch {
    // Private browsing, quota, or corrupt JSON — the page just shows
    // everything locked rather than breaking.
    return {};
  }
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Same cases as load().
  }
}

// Receipts that have been re-run and reproduced, keyed by id. `null` means
// `verifyAchievements()` has not run yet, and the honest answer to "what has
// this player earned" before it does is NOTHING — a page that showed the raw
// store first and corrected itself a third of a second later would flash an
// unlock a forger could screenshot, and would open the picker for a frame.
let verified = null;

// What the page may act on: the verified receipts, never the raw store.
// Every existing caller — the achievement rows, the rail's gate — is right
// without changing, which is why the check lives behind this door rather
// than at each of them.
export function getAchievements() {
  return verified || {};
}

export function isEarned(id) {
  return Boolean(getAchievements()[id]);
}

// A stored entry is only a receipt if it carries the two things a replay
// needs. The old shape (`{run, at}`, written before this existed) fails here
// and so do hand-typed flags — neither can be re-run, and a claim that
// cannot be checked is not accepted.
function isReceipt(entry) {
  return Boolean(entry)
    && typeof entry === 'object'
    && Number.isFinite(entry.seed)
    && Boolean(entry.config)
    && typeof entry.config === 'object';
}

// Re-run every stored receipt and keep only the ones that produce the
// achievement they claim. Call it once, before anything reads an
// achievement; costs one full run per stored receipt (~0.3s each, two
// maximum), and costs a fresh visitor nothing at all.
export function verifyAchievements() {
  const stored = load();
  const out = {};
  for (const a of ACHIEVEMENTS) {
    const entry = stored[a.id];
    if (!isReceipt(entry)) continue;
    let produced;
    try {
      produced = earnedBy(playRun(entry.seed, entry.config));
    } catch {
      // A receipt the current code cannot even run — a config from a version
      // that had different dials, say. Not a forgery, but not a proof
      // either, and there is nothing here that can tell them apart.
      continue;
    }
    if (produced.includes(a.id)) out[a.id] = entry;
  }
  verified = out;
  return out;
}

// Why a gate is shut, in the achievement's OWN words — the rail prints the
// same sentence the locked achievement row already shows, so a player reads
// one explanation for one fact instead of two that could disagree.
export function lockedReason(id) {
  const found = ACHIEVEMENTS.find((a) => a.id === id);
  return found ? found.locked : '';
}

// Records `id` as earned, and reports whether this was the FIRST time —
// which is what the page uses to decide whether to celebrate. Earning
// something twice is silent.
//
// `receipt` is `{ seed, config }`: the run that just did it, exactly as
// `playRun` takes them. It is marked verified here WITHOUT being re-run —
// the page just watched it happen, and re-running it would only prove that
// the same code gives the same answer twice.
//
// THE RUN NUMBER IS NOT STORED, and used to be. `session.runNumber` is a
// per-page-load counter (src/ui/spectator.js) written into a store that
// outlives the page, so an achievement earned on run 3 of one sitting kept
// saying "run 3" over the NEXT sitting's run 3, which is a different run
// with a different ending. Reported as a bug, and it read like one: the
// history strip beside it showed that run dying to a boar. Nothing was
// wrong with the claim — `earnedBy` only ever reports the pig dead when the
// hero landed the blow — only with the label, so the label is gone. `at`
// is a real instant and the strip's own green chip says which run it was,
// for as long as that run is still in the strip to point at.
//
// Entries written before this still carry `run`; nothing reads it, and it
// is left alone rather than migrated — `isReceipt` never asked for it, so
// an old entry keeps verifying and nobody's unlock re-locks.
export function earn(id, receipt) {
  const data = load();
  if (data[id]) return false;
  data[id] = { at: Date.now(), seed: receipt.seed, config: receipt.config };
  save(data);
  if (verified) verified[id] = data[id];
  return true;
}

export function resetAchievements() {
  save({});
  verified = {};
  return {};
}

// What a finished run earned, read off `playDungeon`'s own result rather
// than from anything the page tracked separately — one source of truth for
// "did this happen", and it keeps this file out of the run loop.
//
// The vault's occupant is the roster row tagged `vault` (src/sim/spawn.js);
// `dead` is set by the engine when the hero lands the killing blow.
export function earnedBy(runResult) {
  const out = [];
  if (runResult.cleared) out.push('bottom');
  for (const level of runResult.levels) {
    if (level.roster.some((m) => m.vault && m.dead)) {
      out.push('butcher');
      break;
    }
  }
  return out;
}
