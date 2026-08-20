// The spectator loop: compute a run, play it back, show the result, start
// the next one. Nothing to press — that is the product.
//
// Runs are computed to completion first and then replayed. The engine takes
// a few hundred milliseconds for a whole run, so there is no reason to
// couple the simulation to the frame rate, and the replay can be paused or
// sped up freely.

import { playGame, replayGame } from '../sim/game.js';
import { coinsFor, LEVELS } from '../sim/dungeon.js';
import { hashSeeds, seedFromString } from '../sim/rng.js';
import { heroByName } from '../sim/heroes.js';
import { difficultyToParams } from '../sim/difficulty.js';
import { dangerField, makeBot } from '../bot/bot.js';
import {
  buildGrid, renderFrame, renderHud, renderHistory, renderAchievements,
  applyDepth, renderDebugInfo, carriedSvg, renderBossBar,
} from './render.js';
import {
  ACHIEVEMENTS, earn, earnedBy, getAchievements, resetAchievements,
  verifyAchievements,
} from './achievements.js';
import { tileSvg } from './tiles.js';
import { award, resetScore } from './score.js';
import { resetOnDeath, getHeldItems, addHeldItem, setHeldItems } from './wallet.js';
// Only for `?dev=1&hold=` below, which names items the way the shop does.
import { ITEM_TABLE } from '../sim/balance.js';
import { SHOP_ITEMS, getShopOrder, nextPurchase } from './shop.js';
import { buildShopOrder } from './shop-order.js';
import { buildDialPanel, resolvedDefaults } from './dials.js';
import { buildRoster, clearChosenHero, getChosenHero } from './roster.js';
import {
  buildHighscorePanel, getHighscores, recordRun, resetHighscores,
} from './highscores.js';
import { loadDialOverrides } from './dial-overrides.js';
import { eventsEnabled, makeEventLayer } from './events.js';
import { playRun } from './run.js';
import { askPlayerName, hideNotice, showNotice } from './player.js';
import {
  clearSlice, getPlayer, readSave, readSlice, replaceSave, setPlayer, writeSlice,
} from './save.js';
import {
  claimName, pushSave, reconnect, releaseSave, serverRevision, stillOurs,
  syncEnabled, syncing,
} from './sync.js';
import { sleep } from './clock.js';

const MAX_TURNS = 900;       // per floor
const BASE_DELAY = 110;      // ms per turn at 1x
// How long the frame on screen lasts. Everything else about the pace is a
// RATIO of this one number, so the whole playback keeps its shape at every
// setting of the speed control.
const turnMs = () => BASE_DELAY / session.speed;
// A signal lives twice a turn: tied to the turn so it scales with speed, but
// deliberately outliving the frame that spawned it. One turn exactly was
// tried and read as a flicker — the eye needs the "−3" still on screen when
// the next frame arrives to register that a blow landed at all.
const SIGNAL_TURNS = 2;
const signalMs = () => turnMs() * SIGNAL_TURNS;
// …and a turn that fought holds half again as long as a turn that only
// walked. The hit is the moment worth reading and it is the one the eye has
// least help with: a step MOVES the hero, a blow leaves the board still.
const COMBAT_STRETCH = 1.5;
const SUMMARY_MS = 2400;
const COIN_POPUP_MS = 900;
// Long enough to read three options and click one — the shop now opens
// after EVERY run, not only a rare full clear, so it earns a real second
// look rather than the old 3.2s blink-and-it's-gone. 5x the original 6s:
// owner wants a real window to react, not a blink. Moot when nothing is
// affordable — see showShop's early-close below.
const SHOP_MS = 30000;
const HISTORY_LEN = 12;

// T2 — docs/project/persistencia-e-login.md. The one slice this file owns.
// Everything else the page remembers has a module of its own; the session
// has none, because until now it never left memory — which is exactly why a
// refresh reset the run counter and emptied the history strip.
const SESSION_SLICE = 'session';

const session = {
  // The chain every run's seed is drawn from (`hashSeeds(seed, runNumber)`),
  // and therefore half of what makes a session reproducible. Persisted with
  // the counter beside it, so a reload CONTINUES the session instead of
  // silently starting another one.
  seed: 0,
  // False under `?seed=`, which is an inspection of somebody's session and
  // not the player's own — it must not overwrite the save it was opened to
  // look at.
  persist: true,
  // Set when the name was taken over by another device (src/ui/sync.js).
  // The loop stops at the end of the run it is playing: this page is no
  // longer the one whose save counts, and every run it went on playing
  // would be a run nobody could keep.
  stopped: false,
  runNumber: 0,
  // Legacy single-floor mode only (?difficulty=).
  ascended: 0,
  died: 0,
  unfinished: 0,
  // Descent mode.
  cleared: 0,
  runsPlayed: 0,
  // Which hero the Lab's "quem joga" switch picked, for the HUD. Empty is
  // the shipped hero and prints nothing.
  heroName: '',
  // …and the face drawn on the board for them. Undefined lets render.js
  // fall back to the glyph the game shipped with.
  heroEmoji: undefined,
  // The rail's own `show(playing, queued)` (src/ui/roster.js), once built.
  roster: null,
  // The header button's own repaint (`wirePlayerButton`), once built. The
  // run loop calls it: whether anything is syncing changes while the game is
  // running, and the mark has to change with it.
  paintPlayer: null,
  // The highscore panel's own `show(data)` (src/ui/highscores.js), once
  // built — same one-function-returned-from-the-builder shape as `roster`.
  showHighscores: null,
  history: [],
  // Turns banked from floors already finished this run — see renderHud's
  // xp-rate comment in render.js. 0 in legacy single-floor mode.
  turnOffset: 0,
  // U5/U6b — docs/backlog.md. THE run's bankable total — U5 displays it
  // live as an efficiency read, U6b is this comment: naming it
  // "unbanked" rather than reusing U5's own "coins" wording, since U6c
  // reads this exact field to decide bank (clear) vs discard (death) into
  // src/ui/wallet.js's persisted balance. Nothing here writes to that
  // balance yet — U6c's job, not this one's. Wiped on anything short of a
  // floor actually being cleared; never survives a death regardless of
  // wallet.js's death rule, which only decides
  // whether PRE-EXISTING persisted state survives, not this run's own
  // earnings. Descent mode only.
  unbankedCoins: 0,
  paused: false,
  speed: 1,
  debug: false,
  // The dial lab (src/ui/dials.js), hidden until the Lab button opens it.
  // `dials` is the panel's reader once built; `shippedDials` is what plays
  // for everyone who never opens it — dial-overrides.json's values layered
  // over the code defaults (src/ui/dial-overrides.js), resolved once at
  // start(). `restart` is the ↻ button asking the run in flight to stop so
  // the next one picks up new values.
  dials: null,
  shippedDials: null,
  restart: false,
};

const el = {};

// U10 — the floating signals over the map. Built in start(), and a no-op
// object when `?events=off` asked for silence.
let events = { show: () => {} };

function grab() {
  for (const id of [
    'grid', 'stage', 'hp', 'stamina', 'xpEarned', 'xpRate', 'steps', 'kills', 'inventory',
    'run', 'tally', 'seed', 'summary', 'summaryTitle', 'summaryBody',
    'playPause', 'speed', 'debug', 'resetSession', 'floor', 'history',
    'coins', 'coinPopup', 'damage', 'debugInfo', 'app', 'lab', 'dials',
    'shop', 'shopBalance', 'shopItems', 'shopSkip', 'shopTimerBar', 'shopOrder',
    'achievements', 'roster', 'highscores', 'mapDials', 'simDials', 'dialButtons', 'bossBar',
    'player', 'playerGate',
  ]) {
    el[id] = document.getElementById(id);
  }
}

// THE SAVE POINT IS THE INSTANT A RUN IS COUNTED, and there is only one.
//
// A refresh BEFORE it lands on a run that has not touched a single stored
// value, so the run is simply played again, identically — `(seed,
// runNumber)` reproduces it exactly. There is no "save in the middle"
// because there is no middle that needs saving.
//
// A refresh AFTER it keeps the run. That is why this cannot wait for the
// shop, which is half a minute long: `tallyDescent` has by then already
// paid the lifetime score, written the highscore row and taken the held
// items off a corpse. A session saved after the shop would replay a run
// those had already been paid for, and pay them twice.
//
// The shop that follows writes only its own slice — a purchase is in the
// wallet the moment it is clicked — so a refresh during it costs the rest
// of the shopping and nothing else.
function saveSession() {
  if (!session.persist) return;
  writeSlice(SESSION_SLICE, {
    seed: session.seed,
    runNumber: session.runNumber,
    runsPlayed: session.runsPlayed,
    cleared: session.cleared,
    history: session.history,
  });
}

// WHICH SERVER REVISION THIS BROWSER'S SAVE CORRESPONDS TO — the sync's own
// slice, and the one number that lets a claim decide who is ahead. Zero, or
// absent, means this save has never been up.
const SYNC_SLICE = 'sync';

const syncedRev = () => Number((readSlice(SYNC_SLICE) || {}).rev) || 0;

// TAKE THE NAME, AND FIND OUT WHO IS AHEAD. Runs after the name is known and
// before a single slice is read, for the same reason the name itself does:
// what comes back may replace the whole document.
//
// Three ways out, and only one of them starts the game on this device.
async function connectSave() {
  if (!syncEnabled()) return;

  // A RELOAD RACES ITSELF. Leaving the page hands the lock back by beacon,
  // and the page that replaces it claims a moment later — if those two cross
  // in flight, a player who pressed refresh is told their own game is open
  // somewhere else. One silent retry covers the gap; the late beacon that
  // arrives afterwards is refused by the service (its token is no longer the
  // holder's), so nothing is unlocked behind our backs.
  let quiet = true;

  // Set by the button behind the refusal, spent on the next claim.
  let insist = false;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    showNotice(el.playerGate, {
      title: 'entrando…', text: 'falando com o servidor',
    });
    const got = await claimName(getPlayer(), { force: insist });
    insist = false;

    if (got.state === 'active') {
      if (quiet) {
        quiet = false;
        await sleep(800);
        continue;
      }
      // THE MESSAGE THE OWNER ASKED FOR. It names the kind of device and how
      // long ago it was heard from, because "somewhere else" is not enough to
      // act on — the lock lapses by itself, so "há 9 minutos" tells the
      // player that waiting is the answer.
      const choice = await showNotice(el.playerGate, {
        title: 'este jogo já está aberto',
        text: `em ${got.device || 'outro aparelho'}, com sinal ${sinceWhen(got.lastSeen)}.`
          + ' um aparelho por vez — feche o outro, espere alguns minutos, ou'
          + ' assuma daqui (o outro para, e o que ele ainda não tinha salvo'
          + ' se perde).',
        buttons: [
          { id: 'retry', label: 'tentar de novo' },
          // THE BUTTON FOR THE CASE THE LEASE HANDLES BADLY: a device that
          // died holding the name. Waiting out the term is the honest
          // default, and the person looking at this screen is usually the
          // one who knows the other device is shut — which is a thing only
          // they can know, so it is a button and never automatic.
          { id: 'force', label: 'assumir mesmo assim' },
          { id: 'switch', label: 'outro nome' },
        ],
      });
      if (choice === 'force') insist = true;
      if (choice === 'switch') {
        const name = await askPlayerName(el.playerGate, { current: getPlayer() });
        if (name) {
          setPlayer(name);
          location.reload();
          // Nothing after a reload is worth running.
          await new Promise(() => {});
        }
      }
      continue;
    }

    if (got.state === 'ok') {
      // WHOEVER IS AHEAD WINS, and the comparison is against what THIS
      // browser last managed to send up. A higher revision on the server
      // means another device played since; anything else means the copy here
      // is the same game or a newer one, and the next ordinary push carries
      // it up.
      if (got.save && got.rev > syncedRev()) replaceSave(got.save);
      writeSlice(SYNC_SLICE, { rev: got.rev });
    }

    // 'offline' falls through here too: the service is unreachable and the
    // game plays locally, which is what it did before any of this existed.
    hideNotice(el.playerGate);
    return;
  }
}

// "há 9 minutos", from a timestamp. Rounded down and deliberately coarse —
// the number is there to say "wait" or "that was me an hour ago", and a
// precision nobody can act on would only look like a clock.
function sinceWhen(at) {
  const minutes = Math.floor((Date.now() - (at || 0)) / 60000);
  if (!at || minutes < 0) return 'agora';
  if (minutes < 1) return 'agora mesmo';
  if (minutes === 1) return 'há 1 minuto';
  return `há ${minutes} minutos`;
}

// The end of this page's game: the name belongs somewhere else now, and this
// one has to stop rather than play runs that no save will ever hold.
//
// Reloading is the recovery, and it is a real one rather than a shrug: the
// page that comes back claims the name again and adopts whatever is stored,
// so the player lands in the game as the other device left it.
function stopForOtherDevice(text) {
  if (session.stopped) return;
  session.stopped = true;
  showNotice(el.playerGate, {
    title: 'o jogo foi aberto em outro aparelho',
    text,
    buttons: [{ id: 'reload', label: 'recarregar' }],
  }).then(() => location.reload());
}

// ONE RUN'S WORTH OF SYNCING, at the save point and nowhere else.
//
// Three states, and the third is the one T6 exists for: holding the lock and
// reaching the service, holding it and not reaching it, and having no lock
// at all — a page that opened while the network was down. That last one used
// to stay alone until somebody reloaded, which in a game meant to be left
// running is the same as never.
//
// Returns false when the page must stop.
async function syncAfterRun() {
  if (!syncEnabled()) return true;

  const sent = await pushSave(readSave());
  if (sent === 'lost') {
    stopForOtherDevice('esta aba parou aqui. o que ela já tinha gravado está guardado.');
    return false;
  }
  // WHAT WENT UP IS RECORDED HERE. Without this the stored revision stays at
  // whatever the claim returned while the server moves on, and the next load
  // reads its own uploads as somebody else being ahead — throwing away
  // exactly the runs that had not been sent yet.
  if (sent === 'ok') writeSlice(SYNC_SLICE, { rev: serverRevision() });

  // THE RUN THAT DID NOT UPLOAD STILL ASKS. Most runs are inside the upload
  // window and send nothing, and without this a device that somebody took
  // the name from would go on playing until the window opened — minutes of
  // runs that no save will ever hold. The question is a read, so it is free
  // against the budget the uploads are rationed by.
  if (sent === 'skipped' && !await stillOurs()) {
    stopForOtherDevice('outro aparelho assumiu este nome. o que esta aba jogou desde a última gravação fica por aqui.');
    return false;
  }

  if (sent === 'offline') {
    const back = await reconnect();

    // THE ORPHAN. Coming back to find the name taken, or the save moved on
    // without us, means the runs played alone were played into a copy that
    // is no longer the game. They are dropped rather than merged: choosing
    // which of two histories is the real one has no good answer, and a
    // history stitched from both would be a third one nobody played.
    if (back && back.state === 'active') {
      stopForOtherDevice('outro aparelho está com este nome agora. o que esta aba jogou sem rede fica por aqui.');
      return false;
    }
    if (back && back.state === 'ok' && back.save && back.rev > syncedRev()) {
      // The lock was taken to ask the question, and the answer is that this
      // page is the wrong copy — so it hands the name straight back, with
      // nothing attached. Holding it would lock the reload out of its own
      // game, and uploading would put the discarded history over the real
      // one.
      releaseSave();
      stopForOtherDevice('outro aparelho jogou enquanto esta aba estava sem rede. recarregue para continuar de lá.');
      return false;
    }

    // Back, and nothing happened while we were away: this copy IS the game,
    // so it goes up at once rather than waiting out the next window.
    if (back && back.state === 'ok') {
      if (await pushSave(readSave(), { force: true }) === 'ok') {
        writeSlice(SYNC_SLICE, { rev: serverRevision() });
      }
    }
  }

  // The mark in the header follows all of it, including the good news.
  if (session.paintPlayer) session.paintPlayer();
  return true;
}

// True when a session was restored. False for a fresh visitor, for a broken
// slice, and for a slice with no seed in it — all three want a new chain,
// which the caller draws.
function loadSession() {
  const saved = readSlice(SESSION_SLICE);
  if (!saved || typeof saved !== 'object') return false;
  const seed = Number(saved.seed);
  if (!Number.isFinite(seed)) return false;

  session.seed = seed >>> 0;
  session.runNumber = Number(saved.runNumber) || 0;
  session.runsPlayed = Number(saved.runsPlayed) || 0;
  session.cleared = Number(saved.cleared) || 0;
  session.history = Array.isArray(saved.history)
    ? saved.history.slice(0, HISTORY_LEN)
    : [];
  return true;
}

async function waitWhilePaused() {
  while (session.paused) await sleep(80);
}

// A wall bump costs no turn, so its frame looks identical to the one before
// it. Dropping those keeps the playback from stuttering.
// Did this frame land a blow? The engine's log already records every attack
// with the turn it happened on, so this reads the same source the signals do
// rather than inventing a second notion of "was there combat".
function fought(frame, previous) {
  const log = frame.state.log;
  // A new floor starts a new, empty log — a shorter log than the frame
  // before it means the counter has to start over, not go negative.
  const before = previous && previous.state.log.length <= log.length
    ? previous.state.log.length
    : 0;
  return log.slice(before).some((entry) => entry.type === 'attack');
}

function watchableFrames(frames) {
  const out = [frames[0]];
  for (let i = 1; i < frames.length; i++) {
    if (frames[i].state.turn !== frames[i - 1].state.turn) out.push(frames[i]);
  }
  if (out[out.length - 1] !== frames[frames.length - 1]) {
    out.push(frames[frames.length - 1]);
  }
  return out;
}

async function playFrames(frames, trace, tallyText) {
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    await waitWhilePaused();
    // The lab's ↻: abandon the run being watched, mid-floor if need be.
    // The run itself is already computed and simply thrown away — nothing
    // in the engine is interrupted, only the playback.
    if (session.restart) return;

    // The danger map is recomputed for the frame on screen rather than
    // stored for every turn of the run — one field costs a millisecond or
    // two, and keeping hundreds of them would be pure memory.
    const entry = trace[i] || null;
    const debug = session.debug
      ? { danger: dangerField(frame.belief), goal: entry ? entry.goal : null }
      : null;

    // The hero's own face on the board, every frame — the strongest "who is
    // playing" signal there is, and it costs no HUD space at all.
    renderFrame(frame.state, frame.belief, debug, session.heroEmoji);
    // M50 — after the frame for the same reason the signals are: it sits
    // over the board, not in it.
    renderBossBar(el.bossBar, frame.state);
    // After the frame, so a signal is never painted under the tile it
    // belongs to.
    events.show(frame.state);
    renderDebugInfo(el.debugInfo, session.debug ? entry : null);
    renderHud(el, frame.state, session);
    if (el.tally) el.tally.textContent = tallyText();

    await sleep(turnMs() * (fought(frame, frames[i - 1]) ? COMBAT_STRETCH : 1));
  }

  // M50 — and the bar goes when the floor's playback does.
  //
  // It was drawn from the frame on screen, so the LAST frame of a floor the
  // hero lost is one where the Butcher is alive and awake — the bar's own
  // condition — and nothing draws another frame afterwards. It sat over the
  // summary and over the shop, at z-index 3 against their `auto`, looking
  // exactly like a panel that had frozen.
  //
  // Here rather than at the start of the next floor: what is between two
  // floors is the summary and the shop, and that is precisely where it must
  // already be gone.
  if (el.bossBar) el.bossBar.hidden = true;
}

const legacyTallyText = () =>
  `${session.ascended}W · ${session.died}L · ${session.unfinished} timeout`;
// Who is playing goes here rather than in new markup: the switch is in the
// Lab, the Lab is two clicks away, and a viewer who comes back later has no
// other way to tell which hero they left running. Silent for the shipped
// hero, so the ordinary HUD is unchanged.
const descentTallyText = () =>
  `${session.heroName ? `${session.heroName} · ` : ''}${session.cleared}/${session.runsPlayed} cleared`;

function coinsText() {
  return `🪙 ${session.unbankedCoins}`;
}

// Non-blocking on purpose — this project's spectator model never pauses
// for anything. A timed fade like showSummaryCard's, just shorter and
// polled the same way, so pausing mid-popup doesn't quietly burn its
// on-screen time while everything else is frozen too.
async function showCoinPopup(coins, bought) {
  if (!el.coinPopup) return;

  // What the floor PAID, and then — for the hero who spends at the stairs —
  // the coin FLIPPING INTO what it bought. Showing the net alone printed
  // "+0 🪙" on a floor that both paid and bought, which reads as "this floor
  // was worth nothing"; showing both as static text said it but did not
  // show it. The flip is the whole point: the coin BECAME the shield, it was
  // not replaced by it.
  el.coinPopup.textContent = '';
  el.coinPopup.append(`+${coins} `);

  const swap = document.createElement('span');
  swap.className = 'coin-swap';
  const front = document.createElement('span');
  front.className = 'coin-face';
  front.textContent = '🪙';
  swap.append(front);
  if (bought) {
    const back = document.createElement('span');
    back.className = 'coin-face coin-back';
    back.textContent = bought.count > 1
      ? `${bought.emoji}×${bought.count}`
      : bought.emoji;
    swap.append(back);
  }
  el.coinPopup.append(swap);

  el.coinPopup.classList.add('shown');
  const until = COIN_POPUP_MS / session.speed;
  // Early enough that the shield, not the coin, is what the eye rests on for
  // most of the popup's life — and it rides `session.speed` like everything
  // else here, so fast playback does not leave the coin on screen alone.
  const flipAt = until * 0.35;
  let waited = 0;
  let flipped = false;
  while (waited < until) {
    // Pausing freezes the timer, which is the point. There is nothing to
    // skip here — the popup has no button, unlike the shop, which is where
    // the `skipped` flag lives and why it must be read outside the pause
    // loop rather than only inside it.
    await waitWhilePaused();

    await sleep(80);
    waited += 80;
    if (bought && !flipped && waited >= flipAt) {
      swap.classList.add('flipped');
      flipped = true;
    }
  }
  el.coinPopup.classList.remove('shown');
}

// `order` marks ONE button: the item the timer would take if nobody clicks
// (src/ui/shop.js). It is what makes the Lab's order attributable — the
// setting acts thirty seconds later and only once, so without this the only
// way to see what it does is to sit through a shop without touching it.
// It follows the balance down as purchases are made, which is also the
// clearest way to watch a drain happen.
function renderShopItems(balance, order) {
  el.shopItems.innerHTML = '';
  const next = nextPurchase(balance, order);
  for (const entry of SHOP_ITEMS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.item = entry.item.name;
    const affordable = entry.price <= balance;
    btn.disabled = !affordable;
    btn.classList.toggle('unaffordable', !affordable);
    btn.classList.toggle('auto-next', entry === next);
    if (entry === next) btn.title = 'a loja pega este sozinha se ninguém clicar';
    btn.innerHTML =
      `${tileSvg(entry.item.emoji) || ''}<span>${entry.item.name} · ${entry.price}🪙</span>`;
    el.shopItems.append(btn);
  }
}

// Shown after EVERY run's end, win or lose, spending exactly what THIS run
// earned (session.unbankedCoins) — owner decision: nothing is banked for
// later, so a run that ends in death still gets to spend what it made
// before dying, and whatever is not spent here is simply gone, never
// carried to the next run's balance (which always starts at zero — see the
// per-floor loop above, which no longer wipes unbankedCoins on death, and
// the top of the run loop, which resets it to 0 for the next run either
// way).
//
// Non-blocking like showCoinPopup. Multi-buy: a click buys and the panel
// stays open with what the purchase left, closing only on skip, on the
// timer, or when nothing is affordable any more. If nothing is clicked
// before the timer runs out, the player's own order spends the balance down
// (src/ui/shop.js) — nobody is guaranteed to be watching a spectator that
// never pauses for input. SHOP_MS is long enough now that a present viewer
// has a real chance to choose, and the reverse bar tells them how long that
// chance lasts.
async function showShop() {
  if (!el.shop) return;
  let balance = session.unbankedCoins;
  let purchases = 0;
  let skipped = false;
  let clicked;   // set by the listener, consumed by the loop below
  // Read fresh on every visit, so moving a row in the Lab lands on the very
  // next shop rather than waiting for a reload.
  const order = getShopOrder();

  const onItemClick = (e) => {
    const btn = e.target.closest('button[data-item]');
    if (!btn || btn.disabled) return;
    clicked = SHOP_ITEMS.find((entry) => entry.item.name === btn.dataset.item);
  };
  const onSkipClick = () => { skipped = true; };
  el.shopItems.addEventListener('click', onItemClick);
  if (el.shopSkip) el.shopSkip.addEventListener('click', onSkipClick);

  // One purchase spends its price and leaves the rest on the table, so what
  // is affordable has to be re-read after every buy — this is the whole of
  // multi-buy. The HUD's coin count follows the same number down, so the
  // spend is visible where the earnings were.
  const canAfford = () => SHOP_ITEMS.some((entry) => entry.price <= balance);
  const showBalance = () => {
    if (el.shopBalance) el.shopBalance.textContent = `balance: ${balance} 🪙`;
    renderShopItems(balance, order);
    session.unbankedCoins = balance;
    if (el.coins) el.coins.textContent = coinsText();
  };

  showBalance();
  el.shop.classList.add('shown');

  const until = SHOP_MS / session.speed;
  let waited = 0;
  // The reverse bar: full the instant the shop opens, empty exactly when
  // the timer would auto-resolve. Driven by the same poll loop that already
  // waits out the timer, so it freezes on pause for free rather than
  // needing a second clock to keep in sync with this one.
  if (el.shopTimerBar) el.shopTimerBar.style.width = '100%';

  // The panel stays open while anything is still affordable: buy a shield,
  // the shop is still there for the next one. It closes on an explicit
  // skip, when the timer expires, or the moment the balance can no longer
  // pay for the cheapest thing on the table — no point sitting on screen
  // with three disabled buttons.
  while (canAfford() && !skipped) {
    if (clicked) {
      balance -= clicked.price;
      addHeldItem(clicked.item);
      purchases++;
      clicked = undefined;
      showBalance();
      // Each purchase buys a fresh window — the timer measures how long the
      // NEXT decision has, not how long the visit has lasted.
      waited = 0;
      if (el.shopTimerBar) el.shopTimerBar.style.width = '100%';
      continue;
    }
    if (waited >= until) {
      // TIMER OUT WITH NOTHING CLICKED — which is most runs, so this is the
      // shop rather than a fallback. The balance is spent DOWN the player's
      // order until it can no longer pay for anything (src/ui/shop.js):
      // whatever is left here is discarded, and a viewer who stayed would
      // have had multi-buy, so stopping at one item only punished not
      // watching.
      //
      // Still guarded on `purchases === 0`. Someone who bought two shields
      // and stopped made a decision, and spending their change for them
      // would overrule it — the skip button is there for exactly that, and
      // so is the shop's own close when nothing is affordable.
      if (purchases === 0) {
        let auto = nextPurchase(balance, order);
        while (auto) {
          balance -= auto.price;
          addHeldItem(auto.item);
          purchases++;
          showBalance();
          // A beat between purchases so a drain is something you watch
          // rather than something that already happened. Same length a
          // damage signal gets and it rides `session.speed` the same way —
          // reusing the pacing that exists rather than inventing a second
          // notion of "long enough to read".
          await waitWhilePaused();
          await sleep(signalMs());
          auto = nextPurchase(balance, order);
        }
      }
      break;
    }
    await waitWhilePaused();
    await sleep(80);
    waited += 80;
    if (el.shopTimerBar) {
      el.shopTimerBar.style.width = `${Math.max(0, 100 * (1 - waited / until))}%`;
    }
  }

  el.shopItems.removeEventListener('click', onItemClick);
  if (el.shopSkip) el.shopSkip.removeEventListener('click', onSkipClick);

  // Whatever is left unspent is discarded, not saved: the next run's coin
  // count starts at 0 regardless (see the top of runDescentForever's loop),
  // so there is nothing to carry.
  el.shop.classList.remove('shown');
}

function tally(run) {
  if (run.outcome === 'ascended') session.ascended++;
  else if (run.outcome === 'died') session.died++;
  else session.unfinished++;
}

async function showSummaryCard(title, rows) {
  el.summaryTitle.textContent = title;
  el.summaryBody.innerHTML = '';
  for (const [label, value] of rows) {
    const row = document.createElement('div');
    row.className = 'summary-row';
    row.innerHTML = `<span>${label}</span><b>${value}</b>`;
    el.summaryBody.append(row);
  }

  el.summary.classList.add('shown');
  const until = SUMMARY_MS / session.speed;
  let waited = 0;
  while (waited < until) {
    await waitWhilePaused();
    await sleep(80);
    waited += 80;
  }
  el.summary.classList.remove('shown');
}

async function showSummary(run) {
  const player = run.state.player;
  const titles = { ascended: '🟩 took the hole down', died: '💀 died' };
  const loot = carriedSvg(player.inventory);
  const slain = player.kills.length
    ? run.state.monsters.filter((m) => m.dead).map((m) => tileSvg(m.emoji) || '').join('')
    : '—';

  await showSummaryCard(titles[run.outcome] || '🕳️ ran out of turns', [
    ['steps', run.turns + ' 👣'],
    ['killed', slain],
    ['carried', loot],
    ['killed by', run.state.killedBy ? 'the ' + run.state.killedBy : '—'],
  ]);
}

// Legacy single-floor mode, reachable only via ?difficulty= — see the note
// in start(). The dial is no longer shown; the value is fixed for the
// whole session.
async function runForever(sessionSeed) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    session.runNumber++;
    const seed = hashSeeds(sessionSeed, session.runNumber);

    // The bot records what it was aiming at, one entry per decision, so
    // debug mode can show the reasoning behind a move that looks odd.
    const trace = [];
    const run = playGame(seed, makeBot({
      trace, monsterCount: session.floor.monsters, chestCount: session.floor.chests,
    }),
      { maxTurns: MAX_TURNS, counts: session.floor });

    // Frames and trace are both one-per-decision, but watchableFrames drops
    // the wall bumps — so carry the matching trace entries with them.
    const all = replayGame(run.replay);
    const kept = watchableFrames(all).map((frame) => ({
      frame, index: all.indexOf(frame),
    }));
    const frames = kept.map((k) => k.frame);
    const alignedTrace = kept.map((k) => trace[Math.max(0, k.index)]);

    await playFrames(frames, alignedTrace, legacyTallyText);
    tally(run);
    await showSummary(run);
  }
}

function tallyDescent(run, finalState, heroName, receipt) {
  session.runsPlayed++;

  // Total turns come from playDungeon's own per-floor records; final
  // xpEarned comes from the replayed end-of-run state, not from run.levels —
  // see the note on xpEarnedThisFloor below for why. Needed regardless of
  // outcome now: the highscore board's step count only cares about a clear,
  // but its depth and coin columns update on every run.
  const totalTurns = run.levels.reduce((sum, level) => sum + level.turns, 0);

  const lastFloor = run.levels[run.levels.length - 1];
  if (run.cleared) {
    session.cleared++;
    // U4's lifetime score keeps a background record even though nothing
    // displays it any more; award() is cheap to leave running in case the
    // display ever comes back.
    award(finalState.player.xpEarned, totalTurns);
  } else {
    // The starting item THIS run had equipped is lost with it — owner
    // decision. session.unbankedCoins is untouched here (unlike the old
    // bank-only-on-clear design): it still holds whatever earlier floors
    // in this same run earned, and showShop spends it next regardless of
    // how the run ended. Timeout gets the same treatment as death, same as
    // U5 already treats them as one "not a completion" case rather than
    // two.
    resetOnDeath();
  }

  // U11 — what this run earned, read off playDungeon's own result. `earn`
  // reports only the FIRST time, so the celebration fires once and a
  // hundredth Butcher is silent.
  //
  // `receipt` is `{ seed, config }` — the run that just did it, stored so a
  // later load can re-run it and check that it really did. An achievement
  // now unlocks something (the rail), and a boolean in localStorage unlocks
  // it for anyone who opens the console; see achievements.js for what the
  // receipt does and does not claim to be.
  //
  // RESOLVED BEFORE THE HISTORY CHIP IS BUILT, and that is the whole reason
  // it moved above it: the chip is what now shows the achievement, so the
  // strip and the achievement row are written from one answer instead of two
  // that could disagree about which run it was.
  const firsts = [];
  for (const id of earnedBy(run)) {
    if (earn(id, receipt)) firsts.push(id);
  }
  if (el.achievements) {
    renderAchievements(el.achievements, ACHIEVEMENTS, getAchievements(), firsts[0] || null);
  }

  session.history.unshift({
    run: session.runNumber,
    depth: run.depth,
    cleared: run.cleared,
    cause: run.cleared ? 'cleared' : lastFloor.outcome,
    // WHO did it, by name, straight off the engine's own record
    // (src/sim/combat.js writes it). Null on a clear and on a run that ran
    // out of turns — nothing killed those.
    killedBy: run.killedBy || null,
    // …and WHAT IT WON, which is the one thing about a run the strip could
    // never say. A run can kill the Butcher on floor 4 and be killed by a
    // boar on that same floor: the chip showed the boar, the achievement row
    // showed a run number from a counter that resets every page load, and
    // together they read as a bug that was not there. The green chip is the
    // two facts finally sitting on the same object.
    earned: firsts,
  });
  if (session.history.length > HISTORY_LEN) session.history.length = HISTORY_LEN;
  if (el.history) renderHistory(el.history, session.history, ACHIEVEMENTS);

  // U-highscores — src/ui/highscores.js. `session.unbankedCoins` is read
  // here rather than passed in because it already IS this run's total: the
  // next run's reset happens at the top of runDescentForever's loop, one
  // iteration after this call.
  recordRun(heroName, {
    depth: run.depth, cleared: run.cleared, coins: session.unbankedCoins, turns: totalTurns,
  });
  if (session.showHighscores) session.showHighscores(getHighscores());
}

async function showDescentSummary(run, finalState) {
  const player = finalState.player;
  const loot = carriedSvg(player.inventory);
  const slain = player.kills.length
    ? finalState.monsters.filter((m) => m.dead).map((m) => tileSvg(m.emoji) || '').join('')
    : '—';
  const title = run.cleared
    ? '🟩 cleared the descent'
    : (run.killedBy ? '💀 died' : '🕳️ ran out of turns');

  await showSummaryCard(title, [
    ['reached', `floor ${run.depth} / ${LEVELS}`],
    ['killed', slain],
    ['carried', loot],
    ['killed by', run.killedBy ? 'the ' + run.killedBy : '—'],
  ]);
}

// The real product: floors 1 to 10 in one continuous descent, using the same
// entry point the batch runner and the ruler measure with, so what is
// watched is what is measured.
async function runDescentForever() {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (session.stopped) return;
    session.runNumber++;
    session.unbankedCoins = 0;
    if (el.coins) el.coins.textContent = coinsText();
    // Read from the session rather than taken as an argument: the reset
    // button draws a new chain, and a parameter captured once could not
    // hear about it.
    const seed = hashSeeds(session.seed, session.runNumber);

    // playDungeon calls this once per floor; a bot carries plan state that
    // means nothing on the next map down, so each floor gets a fresh trace
    // array too, collected in call order.
    //
    // U6e — docs/backlog.md. startingItems: whatever the shop bought (or
    // the no-input default picked) last run is this run's loadout.
    // dungeon.js forwards it to every floor's playGame unconditionally;
    // carry() wins over it from floor 2 on, so it only ever actually arms
    // floor 1 — exactly "the run about to start", per the item's framing.
    // The lab's values, read at the moment the run is BUILT — so editing a
    // dial mid-playback lands on the next run, or on this one via ↻. A
    // player who never opens the Lab panel still gets `shippedDials`
    // (dial-overrides.json layered on the code defaults), so a value dev
    // mode pinned reaches every visitor, not only the ones who look.
    const dials = session.dials ? session.dials.read() : session.shippedDials;
    // Resolved once, so the run and the HUD can never disagree about who is
    // playing it.
    // WHO PLAYS, resolved once so the run, the board and the rail can never
    // disagree. Two sources, and the order is the same default-then-override
    // the whole project already runs on: the Lab's dial (which is what
    // dial-overrides.json can ship to EVERY visitor) is the factory setting,
    // and the rail is this visitor overriding it on their own machine.
    //
    // `null` from the rail means never picked — distinct from '' which is a
    // visitor choosing the ordinary hero on purpose, and that difference is
    // the whole reason the override can be a downgrade as well as an upgrade.
    const chosen = getChosenHero();
    const hero = heroByName(chosen === null ? dials.run.who : chosen);
    session.heroName = hero === heroByName('') ? '' : hero.name;
    session.heroEmoji = hero.emoji;
    // Playing AND queued agree again the moment a run is built with the
    // pick: this is what clears the "entra na proxima run" line.
    if (session.roster) session.roster(hero.name, hero.name);
    // EVERYTHING BESIDES THE SEED that decides this run, as one plain
    // object. It is what `playRun` takes, and it is also what an achievement
    // earned here stores as its receipt — so the run that gets replayed to
    // verify an unlock is assembled by the same code that built this one and
    // cannot drift from it (src/ui/run.js says why that matters).
    const config = {
      dials,
      heroName: hero.name,
      startingItems: getHeldItems(),
    };
    const traces = [];
    const run = playRun(seed, config, (trace) => traces.push(trace));

    let finalState = null;
    session.turnOffset = 0;
    let xpEarnedBeforeFloor = 0;
    for (let i = 0; i < run.levels.length; i++) {
      const levelResult = run.levels[i];
      if (el.floor) el.floor.textContent = `floor ${levelResult.level} / ${LEVELS}`;
      applyDepth(el.stage, levelResult.level);

      const all = replayGame(levelResult.replay);
      const kept = watchableFrames(all).map((frame) => ({
        frame, index: all.indexOf(frame),
      }));
      const frames = kept.map((k) => k.frame);
      const alignedTrace = kept.map((k) => traces[i][Math.max(0, k.index)]);

      await playFrames(frames, alignedTrace, descentTallyText);
      if (session.restart) break;
      finalState = frames[frames.length - 1].state;
      session.turnOffset += levelResult.turns;

      // U5 — docs/backlog.md. coins = round(xpEarned-this-floor /
      // turns-this-floor * 10), on floor COMPLETION only: dying or timing
      // out mid-floor is not a completion and adds nothing — but, since the
      // shop economy changed, it no longer wipes what EARLIER floors in
      // this same run already earned. That total simply stops growing and
      // carries into the shop as-is, spendable whether the run won or lost.
      //
      // run.levels[i] (src/sim/dungeon.js) does not carry xpEarned — only
      // carryFrom() does, and only for the NEXT floor's starting state.
      // Found this the hard way: U4 shipped reading it off run.levels too,
      // which was silently NaN-ing the lifetime score on every real clear
      // (never caught because U4's own verification only ever called
      // award() directly with synthetic numbers, never traced a real
      // playDungeon() result through tallyDescent — see U4's backlog
      // addendum). finalState IS the live engine state from this floor's
      // own replay, already computed above, and it does have xpEarned.
      const xpEarnedThisFloor = finalState.player.xpEarned - xpEarnedBeforeFloor;
      xpEarnedBeforeFloor = finalState.player.xpEarned;
      // The formula moved to `src/sim/dungeon.js` when a hero needed to
      // spend coin mid-run: two callers, one line. `spent` is what that hero
      // already took out of this floor's pay, and is 0 for everyone else.
      //
      // The BALANCE takes the net — the coin is genuinely gone. The POPUP
      // shows the gross and the goods, because those are two different
      // questions ("what did the shop get" vs "what happened here") and
      // answering both with the net answered neither.
      const earned = coinsFor(xpEarnedThisFloor, levelResult.turns);
      const spent = levelResult.spent ?? 0;

      if (levelResult.outcome === 'ascended') {
        session.unbankedCoins += earned - spent;
        if (el.coins) el.coins.textContent = coinsText();
        await showCoinPopup(earned, levelResult.bought);
      }
      // A floor that ends in death or timeout was not completed and pays
      // nothing — but, unlike before, does not erase what earlier floors in
      // this run already banked into session.unbankedCoins either.
    }

    // An abandoned run is not a run: it does not count, does not bank, and
    // does not reach the shop. The wallet is untouched, so ↻ costs the
    // player nothing.
    if (session.restart) {
      session.restart = false;
      continue;
    }

    // `hero.name` — the real name (`HEROES.base.name` is `'base'`, not the
    // `''` `session.heroName` prints for it) so the highscore board's key
    // matches `roster.js`'s own ORDER and chip keys.
    tallyDescent(run, finalState, hero.name, { seed, config });
    // The run is counted, and this is the whole save point — see saveSession.
    saveSession();
    // …and the only place the save goes up, or the connection is tried
    // again. Rationed inside `sync.js`, so most runs cost nothing but the
    // localStorage write above.
    if (!await syncAfterRun()) return;
    await showDescentSummary(run, finalState);
    // No seed any more: the no-input purchase used to be a weighted draw and
    // is now the player's declared order (src/ui/shop.js), so the shop is
    // deterministic without one. `?seed=` still reproduces a whole session
    // for anyone who never reordered — the default order is the same for
    // everybody — and diverges for anyone who did, exactly as the Lab's
    // dials already do.
    await showShop();
  }
}

// The header button: who this save belongs to, and the way to change it.
//
// A SWITCH RELOADS THE PAGE. The run in flight belongs to the player who is
// leaving — it would tally into the arriving player's history, spend their
// coins and count on their board — and there is no way to stop the spectator
// loop mid-run, because nothing in this product was ever meant to stop. A
// reload is the whole of it: one line instead of a teardown path that would
// exist for one button.
function wirePlayerButton() {
  if (!el.player) return;
  // The ⚠ is the whole of the offline signal: the game is playing and being
  // saved, just not anywhere but here. A banner would be shouting about a
  // state the player can do nothing about.
  const paint = () => {
    const alone = syncEnabled() && !syncing();
    el.player.textContent = `👤 ${getPlayer() || ''}${alone ? ' ⚠' : ''}`;
    el.player.title = alone
      ? 'sem sincronizar — o jogo está sendo salvo só neste aparelho'
      : 'trocar de jogador';
  };
  paint();
  session.paintPlayer = paint;

  el.player.addEventListener('click', async () => {
    const current = getPlayer();
    const name = await askPlayerName(el.playerGate, { current });
    // Backed out, or typed the name they already had: nothing happened, and
    // reloading over it would look like the button broke something.
    if (!name || name === current) return;
    setPlayer(name);
    location.reload();
  });
}

function wireControls() {
  el.playPause.addEventListener('click', () => {
    session.paused = !session.paused;
    el.playPause.textContent = session.paused ? '▶ play' : '⏸ pause';
  });

  el.debug.addEventListener('click', () => {
    session.debug = !session.debug;
    el.debug.textContent = session.debug ? '🔎 debug on' : '🔎 debug';
    // Paused, no frame is coming to clear it — do it here.
    if (!session.debug) renderDebugInfo(el.debugInfo, null);
  });

  el.speed.addEventListener('click', () => {
    // The default has to BE in this list: the cycle is indexOf-based, so a
    // speed missing from it makes the first click jump to speeds[0] and the
    // viewer can never get back to where the page opened.
    const speeds = [0.75, 1, 2, 4, 8];
    session.speed = speeds[(speeds.indexOf(session.speed) + 1) % speeds.length];
    el.speed.textContent = session.speed + '×';
  });

  // General reset: everything this page has EARNED goes, so what is left is
  // a fresh visitor. That is score.js's lifetime record, wallet.js's coins
  // and held items, the achievements, and the hero pick they unlocked.
  //
  // THE ACHIEVEMENTS ARE IN IT BECAUSE THEY NOW UNLOCK SOMETHING. A reset
  // that left the cast open would leave the player holding a key to a door
  // the reset just claimed to have shut, and "reset" would mean two
  // different things on the same button.
  //
  // The hero pick goes with them and not instead of them: it is downstream:
  // a stored `pawa` outlives a reset harmlessly (the shut gate reads it as
  // the plain hero) right up to the moment the Butcher falls again, when it
  // would silently re-select itself.
  //
  // The highscores go too — owner's call, and the consistent one: the board
  // is the record of what those coins and those achievements were worth, so
  // wiping the earnings and keeping the table would leave rows nothing on
  // the page can account for any more.
  //
  // NOT the Lab's notches, which are the one store the button leaves alone.
  // They are not earned, they are DEALT: the bot's personality is rolled once
  // on a first visit and kept so that "mine is the greedy one" stays true
  // (src/ui/dials.js). Clearing them would hand back a different bot, which
  // is not what starting over means.
  el.resetSession.addEventListener('click', () => {
    if (!confirm('Reset your coin balance, held items, lifetime total, achievements, hero, highscores and run history? This cannot be undone.')) return;
    resetScore();
    resetOnDeath();
    resetAchievements();
    clearChosenHero();
    resetHighscores();

    // THE SESSION GOES WITH THEM, now that it survives a reload. A button
    // that promised a fresh visitor and left «run 87» and twelve chips on
    // screen would be describing something else. A new chain is drawn too:
    // keeping the old seed would replay the very runs just erased.
    //
    // And the run in flight is ABANDONED rather than counted into the fresh
    // session — the restart path already says an abandoned run is not a run
    // (it does not count, does not bank, does not reach the shop), which is
    // exactly what a reset wants from the run it interrupts.
    clearSlice(SESSION_SLICE);
    session.history = [];
    session.runNumber = 0;
    session.runsPlayed = 0;
    session.cleared = 0;
    session.seed = Date.now() >>> 0;
    session.restart = true;

    // Both displays are redrawn here rather than left to the next run: the
    // gate re-shuts the instant the receipts go (`resetAchievements` clears
    // the verified cache), and a rail still showing an open cast would be
    // lying until the run on screen happened to end.
    renderAchievements(el.achievements, ACHIEVEMENTS, getAchievements());
    // The strip goes with them. A green chip is the record of an achievement,
    // and a reset that wipes the achievement and leaves its trophy standing
    // would leave the page showing a thing the player no longer has.
    for (const entry of session.history) entry.earned = [];
    if (el.history) renderHistory(el.history, session.history, ACHIEVEMENTS);
    if (session.showHighscores) session.showHighscores(getHighscores());
    // The run being watched keeps its hero — it is deterministic from seed
    // AND hero, so swapping mid-run would make it something no seed
    // reproduces. Only what comes NEXT goes back to the plain hero.
    if (session.roster) session.roster(session.heroName, 'base');
  });
}

// Wires the Lab button and opens the panel.
//
// OPEN BY DEFAULT, and outside dev mode it holds the bot's dials alone —
// the map's belong to whoever ships dial-overrides.json (see dials.js).
// That inverts what the Lab used to be: a thing you had to find, holding
// everything. It is now the first thing on screen, holding the half that
// is the player's to move.
//
// `overrides` is dial-overrides.json's content, loaded once before this
// runs.
function wireLab(overrides, devMode) {
  const open = () => {
    if (!session.dials) {
      session.dials = buildDialPanel(el.dials, {
        onRestart: () => { session.restart = true; },
        overrides,
        dev: devMode,
        // The map goes to the right column, under the numbers. The left
        // drawer is the BOT — who is playing this run — and the map is the
        // dungeon every run happens in; sharing one column made the two
        // read as a single long form. Only reachable in dev mode, so
        // outside it this mount stays empty and hidden.
        mounts: { Andar: el.mapDials, 'Simulação': el.simDials },
        buttonsMount: el.dialButtons,
      });
      // Under the behaviour dials and outside their scrolling drawer — see
      // src/ui/shop-order.js for why an order is not a dial. Built with
      // them so it opens and closes with the Lab.
      buildShopOrder(el.shopOrder);
    }
  };

  // The lab is now TWO blocks in two columns — the bot's drawer on the left
  // and the map's panel on the right — so the button has to move both or it
  // half-closes. The map's also stays shut when it holds nothing, which is
  // every visitor outside ?dev=1: an empty framed box in the right column
  // would read as something that failed to load.
  const show = (on) => {
    el.dials.hidden = !on;
    if (el.shopOrder) el.shopOrder.hidden = !on;
    el.dialButtons.hidden = !on;
    el.mapDials.hidden = !on || !el.mapDials.children.length;
    el.simDials.hidden = !on || !el.simDials.children.length;
    el.app.classList.toggle('lab-open', on);
    el.lab.textContent = on ? '🧪 lab on' : '🧪 lab';
  };

  el.lab.addEventListener('click', () => {
    open();
    show(el.dials.hidden);
  });

  // ?dev=1 — no button anywhere invites this; knowing the URL param is the
  // whole gate. It only unlocks the "salvar como padrão" button inside the
  // panel dials.js already builds, so this is one extra flag through code
  // that already existed, not a second UI.
  open();
  show(true);
}

export async function start() {
  grab();
  buildGrid(el.grid);

  // THE NAME COMES FIRST, before a single slice is read.
  //
  // Everything below this line — the achievements, the notches, the wallet,
  // the session — is read out of ONE document, and which document that is
  // depends on who is playing (src/ui/save.js). Asking afterwards would mean
  // reading somebody else's save and then throwing it away.
  //
  // Only ever asked once per browser: `getPlayer()` answers on every visit
  // after the first, and the gate never shows again.
  if (!getPlayer()) setPlayer(await askPlayerName(el.playerGate));

  // …and then the name is taken on the service, which may hand back a save
  // played on another device. Before any slice is read, for the same reason.
  await connectSave();

  // A CLOSING TAB HANDS THE LOCK BACK, with its last save. Without this the
  // other device waits out the whole lease to play a game nobody is playing,
  // and the runs since the last upload would be the ones lost.
  window.addEventListener('pagehide', () => releaseSave(readSave()));

  wirePlayerButton();

  // BEFORE anything reads an achievement — the rows below, and the rail's
  // gate further down. Each stored receipt is re-run and only counts if it
  // reproduces (src/ui/achievements.js). One full run apiece, two at most,
  // and nothing at all for a visitor who has earned nothing yet; the grid is
  // already on screen while it happens.
  verifyAchievements();
  // Drawn before the first run so the board reads as "two things to do"
  // rather than appearing out of nowhere the moment one is done.
  if (el.achievements) {
    renderAchievements(el.achievements, ACHIEVEMENTS, getAchievements());
  }
  events = makeEventLayer(el.stage, el.grid, { enabled: eventsEnabled(), signalMs });
  wireControls();

  // Three-quarter speed by default — easier to follow than the old 1x
  // default, and a touch livelier than the 0.5x it replaced.
  session.speed = 0.75;
  el.speed.textContent = '0.75×';

  const params = new URL(location.href).searchParams;

  // dial-overrides.json, resolved against the code defaults once — this is
  // what EVERY visitor plays with, whether or not they ever open the Lab.
  // See src/ui/dial-overrides.js for why a fetch failure resolves to {}
  // rather than breaking the page.
  const overrides = await loadDialOverrides();
  session.shippedDials = resolvedDefaults(overrides);
  const devMode = params.get('dev') === '1';
  wireLab(overrides, devMode);

  // ?dev=1&hold=axe,shield,shield — HAND THE HERO A PILE AND WATCH IT PLAY.
  //
  // Why this exists: `src/analysis/chain.js` measures sessions with the shop
  // in them, and it found piles of a dozen-odd items after a run of clears.
  // The project's method is "watch the game" (CLAUDE.md), and there was no
  // way to watch that — reaching a big pile by playing takes a streak of
  // wins the game hands out roughly never, so the one state a snowball would
  // actually show up in was the one state nobody could look at.
  //
  // It writes the ORDINARY wallet rather than adding a second channel, so
  // what plays is a real loadout down the real path (`getHeldItems` below)
  // and not a debug mode with its own rules. That also means it PERSISTS:
  // it survives into the next run exactly like a purchase, and a death
  // clears it exactly like a death. Load the page once without `hold` and
  // the wallet is whatever the last run left, as always.
  //
  // Behind `?dev=1` for the same reason the save button is: nothing in the
  // UI invites this, and the worst anyone who finds it can do is arm their
  // own spectator.
  const hold = devMode ? params.get('hold') : null;
  if (hold !== null) {
    // Unknown names are dropped rather than guessed at — a typo arming
    // nothing is easier to notice than a typo arming something else.
    const items = hold.split(',')
      .map((name) => ITEM_TABLE.find((row) => row.name === name.trim()))
      .filter(Boolean)
      .map((row) => ({ ...row }));
    setHeldItems(items);
  }

  // The rail. Built after the overrides resolve, so the face it lights on
  // load is the hero the first run will actually use rather than a guess it
  // has to correct a moment later.
  if (el.roster) {
    session.roster = buildRoster(el.roster, {
      // A pick QUEUES: the run on screen keeps the hero it started with,
      // because a run is reproducible from its seed AND its hero and
      // swapping mid-run would make the thing being watched something no
      // seed reproduces. roster.js has already persisted it by now.
      onPick: (value) => session.roster(session.heroName, heroByName(value).name),
      // Browsing a locked hero repaints the card with the SAME two names —
      // who plays and who plays next are both unchanged, which is the point.
      // The roster keeps the preview itself; this only asks it to redraw.
      onPreview: () => session.roster(session.heroName, getChosenHero() === null
        ? session.shippedDials.run.who : getChosenHero()),
      onRestart: () => { session.restart = true; },
    });
    const chosen = getChosenHero();
    const first = heroByName(chosen === null ? session.shippedDials.run.who : chosen);
    session.roster(first.name, first.name);
  }

  // The highscore panel, below it — built the same way: once, up front, so
  // the first run's row is already on screen instead of appearing blank
  // until something finishes.
  if (el.highscores) {
    session.showHighscores = buildHighscorePanel(el.highscores);
    session.showHighscores(getHighscores());
  }

  // ?seed=whatever makes a whole session reproducible, which is how you go
  // back and look at a run the bot played badly. It starts that chain from
  // the top and, being somebody else's session rather than this player's,
  // never writes over the save (see `session.persist`).
  //
  // Without it: the saved session is resumed — same chain, next run number,
  // the history strip already on screen — and only a visitor who has none
  // draws a new chain from the clock.
  const requested = params.get('seed');
  if (requested) {
    session.seed = seedFromString(requested);
    session.persist = false;
  } else if (!loadSession()) {
    session.seed = Date.now() >>> 0;
  }
  // Drawn before the first run for the same reason the achievements are:
  // the strip is the record of a session that is being CONTINUED, and a box
  // that filled in only after the next run ended would read as an empty one.
  //
  // With the achievement list, like every other call: a restored chip keeps
  // the trophy it won, and a strip that lost its green on a reload would be
  // the same lie the trophy was added to end.
  if (el.history) renderHistory(el.history, session.history, ACHIEVEMENTS);

  // ?difficulty=0..1 is a lab affordance kept for old links: it plays the
  // OLD single synthetic floor instead of the ten-floor descent, at a fixed
  // difficulty for the whole session. Not shown in the UI — a dial has no
  // meaning against a descent. See docs/backlog.md, U1.
  const requestedDial = params.get('difficulty');
  if (requestedDial !== null) {
    session.dial = Number(requestedDial);
    session.floor = difficultyToParams(session.dial);
    runForever(session.seed);
  } else {
    runDescentForever();
  }
}
