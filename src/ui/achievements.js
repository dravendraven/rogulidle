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
// WHAT AN ACHIEVEMENT NOW DOES. The rows used to be pure record — earned,
// displayed, inert. `butcher` and `bottom` are the two rungs of the ladder
// in `docs/project/candidates.md` (U11): until the pig on floor 4 is down
// the rail offers no hero but the base one, and until a run is cleared it
// offers only the pair the pig opened. The gates' keys and the sentences
// that explain them therefore both live in this file — a gate whose id is
// in one file and whose reason is in another drifts the first time the
// reason is reworded.
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

// THE LADDER FEATS' THRESHOLDS — values, so their row is in docs/balance.md.
// Each was set by playing naked runs of its class (no shop) and taking a
// value roughly one run in six to twenty reaches: an hour's watching at
// most, and never a clear. The class's own trait is what moves each one —
// the other heroes measured at or near zero on the same bar.
export const OFICINA_FLOORS = 8;   // floors whose stairs bought Pawa a plate
export const FARO_CHESTS = 10;     // full chests opened before the first empty
export const SANGUE_FLOORS = 3;    // floors cleared…
export const SANGUE_DAMAGE = 5;    // …taking at most this much damage in all
export const LEITURA_HEAL = 9;     // hp one read restored, on a floor survived

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
  // THE CLASS LADDER'S FEATS (front B) — one per class above the first, each
  // read off the run result by `LADDER_FEATS` below. `ladder: true` keeps
  // them off the strip and unearned while the switch is off, so off the
  // page shows the three rows it always did.
  {
    id: 'oficina',
    emoji: '🛡️',
    ladder: true,
    title: 'Oficina',
    locked: `o Pawa ainda não vestiu chapa nova em ${OFICINA_FLOORS} andares de uma run`,
    earned: `vestiu chapa nova em ${OFICINA_FLOORS} andares de uma só run`,
  },
  {
    id: 'faro',
    emoji: '📦',
    ladder: true,
    title: 'Faro',
    locked: `o Ricardo ainda não abriu ${FARO_CHESTS} baús cheios antes do primeiro vazio`,
    earned: `abriu ${FARO_CHESTS} baús cheios antes de abrir um vazio`,
  },
  {
    id: 'sangue',
    emoji: '🗡️',
    ladder: true,
    title: 'Sangue frio',
    locked: `o Vito ainda não chegou ao andar ${SANGUE_FLOORS + 1} levando ${SANGUE_DAMAGE} de dano ou menos`,
    earned: `chegou ao andar ${SANGUE_FLOORS + 1} levando ${SANGUE_DAMAGE} de dano ou menos`,
  },
  {
    id: 'leitura',
    emoji: '📜',
    ladder: true,
    title: 'Leitura de risco',
    locked: `o Papazito ainda não leu o livro curando ${LEITURA_HEAL} de vida e saiu vivo do andar`,
    earned: `leu o livro curando ${LEITURA_HEAL} de vida, e saiu vivo do andar`,
  },
];

// The rows the page shows: the ladder's only while the ladder is on.
export function shownAchievements() {
  return ACHIEVEMENTS.filter((a) => !a.ladder || ladderOn);
}

// The axe's price, read off the shelf rather than restated here — the one
// number this file needs from the shop, and it must be the shop's own.
const AXE_PRICE = SHOP_ITEMS.find((entry) => entry.item.name === 'axe').price;

// THE LADDER, two rungs (docs/backlog.md item 3, owner 2026-08-20): the pig
// opens the pair the chained analysis measured as the WEAKER one, and the
// first clear opens the strong pair — Papazito was dominant there
// (information beats force on the themed maps), so he and Vito sit behind
// the harder key. Keyed by hero name so the rail asks one question per
// face; a hero absent from this table is open, which is how `base` stays
// free without a rule of its own.
export const HERO_GATES = {
  pawa: 'butcher',
  ricardo: 'butcher',
  vito: 'bottom',
  papazito: 'bottom',
};

// The rung a hero stands behind, or '' when he is free.
export function heroGate(name) {
  return HERO_GATES[name] || '';
}

// THE CLASS LADDER (docs/project/plano-2026-11.md, front B). Each class is a
// level: the player plays the current one and ONLY it, and its feat opens
// the next. Every rung closed, the whole cast is free. Ordered from the
// weakest class measured to the strongest; each feat exercises the class's
// own trait and never needs a clear (a clear is too rare to gate on).
//
// Behind a switch that ships OFF, and off it is HERO_GATES above, untouched.
// The switch is a run dial (`classLadder`, src/ui/dials.js) so
// dial-overrides.json can ship it and the Lab can flip it; the page hands
// its value to `setClassLadder` before anything asks who may play.
export const CLASS_LADDER_ENABLED = false;

export const CLASS_LADDER = [
  { hero: 'base', feat: 'butcher' },
  { hero: 'pawa', feat: 'oficina' },
  { hero: 'ricardo', feat: 'faro' },
  { hero: 'vito', feat: 'sangue' },
  { hero: 'papazito', feat: 'leitura' },
];

let ladderOn = CLASS_LADDER_ENABLED;

export function setClassLadder(on) {
  ladderOn = Boolean(on);
}

export function classLadderOn() {
  return ladderOn;
}

// Which rung the player stands on, given the ids earned: the first whose
// feat is missing. `CLASS_LADDER.length` means the ladder is closed. Pure,
// like `shopOpenGiven`, so it can be asked without a browser.
export function ladderRungGiven(earned) {
  const index = CLASS_LADDER.findIndex((rung) => !earned.has(rung.feat));
  return index === -1 ? CLASS_LADDER.length : index;
}

// The hero the ladder forces, or null when it forces nobody — switched off,
// or closed (B4: every class free).
export function forcedHeroGiven(earned, on) {
  if (!on) return null;
  const rung = CLASS_LADDER[ladderRungGiven(earned)];
  return rung ? rung.hero : null;
}

// Why `name` cannot be played, '' when he can. Off, this is HERO_GATES'
// answer word for word; on and still climbing, everyone but the current
// rung's hero is shut — the ones below it as well, because the current
// class is OBLIGATORY, not merely available.
export function heroLockGiven(name, earned, on) {
  const forced = forcedHeroGiven(earned, on);
  if (forced === null) {
    if (on) return '';
    const gate = heroGate(name);
    return gate && !earned.has(gate) ? lockedReason(gate) : '';
  }
  if (name === forced) return '';
  const index = CLASS_LADDER.findIndex((rung) => rung.hero === name);
  const current = ladderRungGiven(earned);
  return index < current
    ? `nível ${index + 1} da escada, já fechado — agora é a vez do nível ${current + 1}`
    : `nível ${index + 1} da escada — abre quando o nível ${index} fechar o feito dele`;
}

function earnedSet() {
  return new Set(Object.keys(getAchievements()));
}

export function ladderRung() {
  return ladderRungGiven(earnedSet());
}

export function forcedHero() {
  return forcedHeroGiven(earnedSet(), ladderOn);
}

export function heroLock(name) {
  return heroLockGiven(name, earnedSet(), ladderOn);
}

// The sentence the roster prints under the card while the ladder climbs:
// which level this is and what is still missing to leave it. '' when the
// ladder is off. Closed, it says so once — the whole cast opening at once
// would otherwise look like the gates broke.
export function ladderLine() {
  if (!ladderOn) return '';
  if (forcedHero() === null) return `escada fechada · os ${CLASS_LADDER.length} heróis estão livres`;
  const index = ladderRung();
  const feat = ACHIEVEMENTS.find((a) => a.id === CLASS_LADDER[index].feat);
  const missing = feat ? `${feat.emoji} ${feat.title} — ${feat.locked}` : 'feito ainda por construir';
  return `nível ${index + 1} de ${CLASS_LADDER.length} · falta: ${missing}`;
}

// The same ladder for the shop's shelf: an item named here is not offered,
// nor bought by the unattended drain, until its achievement is earned. The
// Lenhador — the first axe bought — opens the flail (owner, 2026-10-03).
export const SHOP_GATES = {
  flail: 'axe',
};

// Whether an item is on the shelf, given the ids earned so far. Pure, so
// the chain instrument can ask it with a session's own earnings instead of
// this browser's (src/analysis/chain.js).
export function shopOpenGiven(name, earned) {
  const gate = SHOP_GATES[name];
  return !gate || earned.has(gate);
}

export function shopItemOpen(name) {
  return shopOpenGiven(name, new Set(Object.keys(getAchievements())));
}

// The lock line a shut shelf item shows, worded exactly like a shut hero's
// (src/ui/roster.js) so the two read as one rule.
export function shopLockLine(name) {
  return `🔒bloqueado - ${lockedReason(SHOP_GATES[name])}`;
}

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

// How far a run got on each ladder feat, and the bar it has to reach. One
// measure per feat, read off the run result alone so a replay reproduces
// it; `null` when the run said nothing about it. `lower` marks the one
// feat where less is better (damage).
export const LADDER_FEATS = {
  oficina: {
    measure: (run) => run.levels.filter((l) => l.bought).length,
    target: OFICINA_FLOORS,
  },
  faro: {
    measure: (run) => {
      let full = 0;
      for (const level of run.levels) {
        for (const c of level.chests) {
          if (!c.opened || c.vault) continue;
          if (!c.full) return full;
          full += 1;
        }
      }
      return full;
    },
    target: FARO_CHESTS,
  },
  sangue: {
    measure: (run) => {
      const early = run.levels.slice(0, SANGUE_FLOORS);
      if (early.length < SANGUE_FLOORS || early.some((l) => l.outcome !== 'ascended')) return null;
      return early.reduce((sum, l) => sum + l.damage, 0);
    },
    target: SANGUE_DAMAGE,
    lower: true,
  },
  leitura: {
    measure: (run) => Math.max(0, ...run.levels
      .filter((l) => l.outcome === 'ascended' && l.reads)
      .flatMap((l) => l.reads)),
    target: LEITURA_HEAL,
  },
};

function featMet(id, value) {
  const feat = LADDER_FEATS[id];
  if (value === null) return false;
  return feat.lower ? value <= feat.target : value >= feat.target;
}

// The class whose feat `id` is, or null for the original three rows.
function featHero(id) {
  const rung = CLASS_LADDER.find((r) => r.feat === id);
  return rung && LADDER_FEATS[id] ? rung.hero : null;
}

// Whether a replayed receipt proves its achievement. The run-produced pair
// is read straight off the result (`earnedBy`); the axe's receipt is the
// run whose coins paid for it, and the replayable half of that claim is
// that the balance really covered the price — the header says why the
// click itself is not, and cannot be, part of the proof. A ladder feat's
// receipt must also be its own class's run, read off the stored config.
function receiptProves(id, runResult, config) {
  if (id === 'axe') return coinsBanked(runResult) >= AXE_PRICE;
  return earnedBy(runResult, config.heroName).includes(id);
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
    if (receiptProves(a.id, run, entry.config)) out[a.id] = entry;
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
// THE RUN NUMBER IS STORED AGAIN, under a new key (`runNo`). It was dropped
// once because `session.runNumber` was a per-page-load counter, so "run 3"
// of one sitting was written over the next sitting's run 3. The counter is
// now part of the saved session (src/ui/spectator.js), so it names one run
// of one chain. Entries written in the meantime still carry the old `run`
// key; nothing reads it, so those cards stay without a number rather than
// show one that was never true. `runNo` is `null` when the page does not
// persist (`?seed=`): that count is not the player's, so none is written.
// Display only — `isReceipt` never asks for it, so no unlock depends on it.
export function earn(id, receipt, runNo = null) {
  const data = load();
  if (data[id]) return false;
  data[id] = {
    at: Date.now(),
    ...(Number.isFinite(runNo) ? { runNo } : {}),
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
//
// A ladder feat counts only for ITS class (`heroName`, the run's hero):
// otherwise Pawa's lucky low-damage run would close Vito's level before
// Vito ever played it, and the ladder would skip a rung. Without a hero
// name — the chain instrument — no ladder feat is ever reported.
export function earnedBy(runResult, heroName = null) {
  const out = [];
  if (runResult.cleared) out.push('bottom');
  for (const level of runResult.levels) {
    if (level.roster.some((m) => m.vault && m.dead)) {
      out.push('butcher');
      break;
    }
  }
  for (const id of Object.keys(LADDER_FEATS)) {
    if (heroName && featHero(id) === heroName
      && featMet(id, LADDER_FEATS[id].measure(runResult))) out.push(id);
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
export function recordProgress(runResult, heroName = null) {
  recordLadderProgress(runResult, heroName);
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

// The ladder feats' bars: the best this class has done against each one,
// kept per feat in the same PROGRESS record. Only the feat's own class
// writes it, for the same reason only it can earn it.
function recordLadderProgress(runResult, heroName) {
  const data = load();
  const progress = { ...(data[PROGRESS] || {}) };
  let changed = false;
  for (const [id, feat] of Object.entries(LADDER_FEATS)) {
    if (!heroName || featHero(id) !== heroName) continue;
    const value = feat.measure(runResult);
    if (value === null) continue;
    const best = progress[id];
    if (!Number.isFinite(best) || (feat.lower ? value < best : value > best)) {
      progress[id] = value;
      changed = true;
    }
  }
  if (!changed) return false;
  data[PROGRESS] = progress;
  save(data);
  return true;
}

// The ladder rows' pips. Damage is drawn red, as what it cost, the way the
// Butcher's pips are what he kept; the others fill toward the target. The
// label carries the number either way.
const LADDER_PIPS = {
  oficina: { glyph: '🛡️', text: (v) => `a melhor run vestiu chapa nova em ${v} de ${OFICINA_FLOORS} andares` },
  faro: { glyph: '🟨', text: (v) => `a melhor run abriu ${v} de ${FARO_CHESTS} baús cheios antes do primeiro vazio` },
  sangue: { glyph: '🟥', text: (v) => `a melhor chegada ao andar ${SANGUE_FLOORS + 1} custou ${v} de dano — o feito pede ${SANGUE_DAMAGE}` },
  leitura: { glyph: '🟩', text: (v) => `a melhor leitura curou ${v} de ${LEITURA_HEAL}` },
};

function ladderProgress(stored) {
  const out = {};
  for (const [id, feat] of Object.entries(LADDER_FEATS)) {
    const value = stored && stored[id];
    if (!Number.isFinite(value)) continue;
    const { glyph, text } = LADDER_PIPS[id];
    const total = feat.lower ? Math.max(value, feat.target * 2) : feat.target;
    out[id] = {
      fraction: feat.lower ? Math.min(1, feat.target / Math.max(value, 1)) : Math.min(1, value / feat.target),
      text: text(value),
      filled: Math.min(value, total),
      total,
      glyph,
      label: feat.lower ? `${value} dano` : `${value}/${feat.target}`,
    };
  }
  return out;
}

// `{ [id]: { fraction, text, filled, total, glyph, label } }` for every row
// that has something to show; a row absent here shows its `locked`
// sentence. `fraction` is 0..1 of the way to the threshold; `filled` of
// `total` are the pips the card draws in `glyph`, `label` the number
// beside them, `text` the whole sentence (the tooltip, or the line itself
// when the pips are switched off — `PROGRESS_PIPS` in render.js).
//
// The Butcher's pips are HIS bar, frozen where the best run left it: red
// for the hp he kept, so the player recognises the bar they watched shrink
// during the fight. The other two fill toward the threshold. The three
// therefore grow in different directions, and the label is what makes that
// harmless — nobody has to decode a direction to read "9 hp".
// `highscores` is `getHighscores()`'s result.
export function getProgress(highscores = {}) {
  const stored = load()[PROGRESS];
  const out = ladderProgress(stored);
  const pig = stored && stored.butcher;
  if (pig && Number.isFinite(pig.hpLeft) && pig.hpMax > 0) {
    out.butcher = {
      fraction: 1 - pig.hpLeft / pig.hpMax,
      text: pig.hpLeft < pig.hpMax
        ? `o porco já ficou com ${pig.hpLeft} de ${pig.hpMax} de vida`
        : 'já chegou ao porco, sem o arranhar',
      filled: pig.hpLeft, total: pig.hpMax, glyph: '🟥', label: `${pig.hpLeft} hp`,
    };
  }
  const rows = Object.values(highscores || {});
  const coins = Math.max(0, ...rows.map((r) => Number(r.maxCoins) || 0));
  if (coins > 0) {
    out.axe = {
      fraction: Math.min(1, coins / AXE_PRICE),
      text: `a melhor run pagou ${coins} de ${AXE_PRICE} moedas`,
      filled: Math.min(coins, AXE_PRICE), total: AXE_PRICE, glyph: '🪙', label: `${coins}/${AXE_PRICE}`,
    };
  }
  const depth = Math.max(0, ...rows.map((r) => Number(r.bestDepth) || 0));
  if (depth > 0) {
    out.bottom = {
      fraction: Math.min(1, depth / LEVELS),
      text: `já chegou ao andar ${depth} de ${LEVELS}`,
      filled: Math.min(depth, LEVELS), total: LEVELS, glyph: '🟩', label: `${depth}/${LEVELS}`,
    };
  }
  return out;
}
