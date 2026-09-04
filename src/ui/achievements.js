// U11 — the things a sitting can produce that a single run cannot.
//
// `docs/project/objectives.md` judges a sitting on the distribution of how
// far attempts get, and the history strip already shows that. What it
// cannot show is the FIRST time something happened, because a chip falls
// off the end after twelve runs. These do not fall off.
//
// Deliberately few, and deliberately not a list that grows on its own. An
// achievement per milestone turns into a checklist, and a checklist is a
// quantity to push — the shape `objectives.md` refuses. Three rows, each an
// outcome the game is actually about: the wall on the way down, the shelf's
// rare event (the first axe bought — the answer to the wall, priced at a
// whole lucky run; owner's addition, 2026-08-21), and the bottom.
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
// THE AXE IS THE ONE ROW A RUN RESULT CANNOT CARRY. The shop is the page's,
// not the engine's, so no replay ever shows a purchase — a click is free.
// What its receipt stores is the run whose coins PAID for it, and what a
// replay can honestly prove is that those coins were really earned
// (`coinsBanked` below). Forging one therefore still costs finding a run
// that banks an axe's price, which is the hard part of buying one — the
// same kind of friction the other two receipts charge.
//
// THE PRICE, stated plainly because it will be paid: a receipt is only
// replayable by the code that recorded it. Change the engine, the bot, or a
// shipped dial and every stored receipt stops reproducing, so every player's
// unlock re-locks. Nothing here can detect the difference between that and a
// forgery. Storage is therefore never rewritten by verification — a receipt
// that stops reproducing is ignored, not deleted, so a change that broke
// them can be reverted and everyone's unlocks come straight back.

import { playRun } from './run.js';
import { readSlice, writeSlice } from './save.js';
import { SHOP_ITEMS } from './shop.js';
import { GAME_VERSION } from '../sim/balance.js';
import { LEVELS } from '../sim/dungeon.js';

// One slice of the save document (src/ui/save.js), which owns the storage
// and the failure cases this used to carry itself.
const SLICE = 'achievements';

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
    id: 'axe',
    emoji: '🪓',
    title: 'Lenhador',
    locked: 'o machado da loja ainda espera um comprador',
    earned: 'comprou o primeiro machado da loja',
  },
  {
    id: 'bottom',
    emoji: '🕳️',
    title: 'Fundo do poço',
    locked: 'dez andares. ninguém chegou ainda',
    earned: 'desceu até onde não há mais escada',
  },
];

// The axe's price, read off the shelf rather than restated here — the one
// number this file needs from the shop, and it must be the shop's own.
const AXE_PRICE = SHOP_ITEMS.find((entry) => entry.item.name === 'axe').price;

// The one gate that exists today. Named rather than spelled 'butcher' at
// the rail, so the day a second gate appears the pattern is already here.
export const HERO_GATE = 'butcher';

function load() {
  const parsed = readSlice(SLICE);
  return (parsed && typeof parsed === 'object') ? parsed : {};
}

function save(data) {
  writeSlice(SLICE, data);
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

// What a run banks for the shop that follows it: every completed traversal's
// pay, minus what the engineer already spent at the stairs (rules.md §9 —
// floors that end in death or timeout pay nothing). The same sum
// spectator.js accumulates floor by floor while playing, read here off the
// run result's own rows so a replay can reproduce it.
function coinsBanked(runResult) {
  return runResult.levels.reduce((sum, level) =>
    sum + (level.outcome === 'ascended' ? level.coins - (level.spent ?? 0) : 0), 0);
}

// Whether a replayed receipt proves its achievement. The run-produced pair
// is read straight off the result (`earnedBy`); the axe's receipt is the
// run whose coins paid for it, and the replayable half of that claim is
// that the balance really covered the price — the header says why the
// click itself is not, and cannot be, part of the proof.
function receiptProves(id, runResult) {
  if (id === 'axe') return coinsBanked(runResult) >= AXE_PRICE;
  return earnedBy(runResult).includes(id);
}

// Re-run every stored receipt and keep only the ones that produce the
// achievement they claim. Call it once, before anything reads an
// achievement; costs one full run per stored receipt (~0.3s each, three
// maximum), and costs a fresh visitor nothing at all.
export function verifyAchievements() {
  const stored = load();
  const out = {};
  for (const a of ACHIEVEMENTS) {
    const entry = stored[a.id];
    if (!isReceipt(entry)) continue;
    // THE VERSION SEAL (owner, 2026-08-31). A replay only proves anything
    // on the engine that recorded the receipt: the day the coin pile
    // reshuffled every seed, honest players watched their pig un-die on
    // load. So a receipt stamped by an OLDER engine is accepted as legacy
    // — it verified on the version that earned it — and only receipts from
    // THIS engine are re-run. Entries from before the stamp existed read
    // as version 0. Forging a legacy stamp is free and stated in
    // GAME_VERSION's own comment: the friction was already unenforceable
    // against engines that no longer exist.
    if ((entry.version ?? 0) !== GAME_VERSION) {
      out[a.id] = entry;
      continue;
    }
    let run;
    try {
      run = playRun(entry.seed, entry.config);
    } catch {
      // A receipt the current code cannot even run — a config from a version
      // that had different dials, say. Not a forgery, but not a proof
      // either, and there is nothing here that can tell them apart.
      continue;
    }
    if (receiptProves(a.id, run)) out[a.id] = entry;
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
  data[id] = {
    at: Date.now(),
    seed: receipt.seed,
    config: receipt.config,
    // The engine that recorded it — what decides, on every future load,
    // whether this receipt is re-run (same engine) or trusted as legacy.
    version: GAME_VERSION,
  };
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

// What a SHOP purchase earns, the moment the item lands in the wallet — the
// counterpart of `earnedBy` for the one row a run result cannot carry. The
// shop (src/ui/spectator.js) calls this with the name of what was bought,
// clicked and no-input purchases alike, and hands `earn` the receipt of the
// run whose coins paid.
export function earnedByPurchase(itemName) {
  return itemName === 'axe' ? ['axe'] : [];
}

// HOW CLOSE A RUN HAS COME to each row still locked — docs/project/
// feitos-progresso.md. The owner's complaint was that a feito arrives while
// they sleep, with no history behind it; what these show is the best any
// run has done against the fixed threshold, and they vanish the moment the
// threshold is crossed. Not a scoreboard: the target never moves.
//
// Only the Butcher's record needs a home of its own. Depth and coins already
// live in the highscore rows, per hero, and the closest a PLAYER has come is
// the best of those — `getProgress` is handed the rows rather than importing
// them, because highscores.js reaches roster.js and roster.js reaches this
// file, and that would be a cycle.
//
// The record sits under a key no achievement will ever be called, in the
// same slice, so the reset that wipes the receipts wipes it with them. No
// receipt and no replay: a number that unlocks nothing is a number, like the
// highscores are. A forged one earns a drawing.
const PROGRESS = 'progress';

// The Butcher's remaining hp at the end of the vault floor, kept only when
// this run left him lower than any before it. A run that killed him records
// nothing — that is the achievement's own job, and the bar is gone by then.
export function recordProgress(runResult) {
  let lowest = null;
  for (const level of runResult.levels) {
    for (const m of level.roster) {
      if (!m.vault || m.dead || !Number.isFinite(m.hpLeft)) continue;
      if (lowest === null || m.hpLeft < lowest.hpLeft) lowest = { hpLeft: m.hpLeft, hpMax: m.hp };
    }
  }
  if (!lowest) return false;
  const data = load();
  const best = data[PROGRESS] && data[PROGRESS].butcher;
  if (best && best.hpLeft <= lowest.hpLeft) return false;
  data[PROGRESS] = { ...(data[PROGRESS] || {}), butcher: lowest };
  save(data);
  return true;
}

// `{ [id]: { fraction, text } }` for every row that has something to show;
// a row absent here shows its `locked` sentence. `fraction` is 0..1 of the
// way to the threshold. `highscores` is `getHighscores()`'s result.
export function getProgress(highscores = {}) {
  const out = {};
  const stored = load()[PROGRESS];
  const pig = stored && stored.butcher;
  if (pig && Number.isFinite(pig.hpLeft) && pig.hpMax > 0) {
    out.butcher = {
      fraction: 1 - pig.hpLeft / pig.hpMax,
      text: pig.hpLeft < pig.hpMax
        ? `o porco já ficou com ${pig.hpLeft} de ${pig.hpMax} de vida`
        : 'já chegou ao porco, sem o arranhar',
    };
  }
  const rows = Object.values(highscores || {});
  const coins = Math.max(0, ...rows.map((r) => Number(r.maxCoins) || 0));
  if (coins > 0) {
    out.axe = {
      fraction: Math.min(1, coins / AXE_PRICE),
      text: `a melhor run pagou ${coins} de ${AXE_PRICE} moedas`,
    };
  }
  const depth = Math.max(0, ...rows.map((r) => Number(r.bestDepth) || 0));
  if (depth > 0) {
    out.bottom = {
      fraction: Math.min(1, depth / LEVELS),
      text: `já chegou ao andar ${depth} de ${LEVELS}`,
    };
  }
  return out;
}
