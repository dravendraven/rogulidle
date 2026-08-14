// The spectator loop: compute a run, play it back, show the result, start
// the next one. Nothing to press — that is the product.
//
// Runs are computed to completion first and then replayed. The engine takes
// a few hundred milliseconds for a whole run, so there is no reason to
// couple the simulation to the frame rate, and the replay can be paused or
// sped up freely.

import { playGame, replayGame } from '../sim/game.js';
import { coinsFor, playDungeon, LEVELS } from '../sim/dungeon.js';
import { hashSeeds, seedFromString } from '../sim/rng.js';
import { heroByName } from '../sim/heroes.js';
import { difficultyToParams, makeFloorPlan } from '../sim/difficulty.js';
import { dangerField, makeBot } from '../bot/bot.js';
import {
  buildGrid, renderFrame, renderHud, renderHistory, renderAchievements,
  applyDepth, renderDebugInfo, carriedSvg,
} from './render.js';
import { ACHIEVEMENTS, earn, earnedBy, getAchievements } from './achievements.js';
import { tileSvg } from './tiles.js';
import { award, resetScore } from './score.js';
import { resetOnDeath, getHeldItems, addHeldItem } from './wallet.js';
import { SHOP_ITEMS, pickDefaultPurchase } from './shop.js';
import { buildDialPanel, resolvedDefaults } from './dials.js';
import { buildRoster, getChosenHero } from './roster.js';
import { loadDialOverrides } from './dial-overrides.js';
import { eventsEnabled, makeEventLayer } from './events.js';

const MAX_TURNS = 900;       // per floor
const BASE_DELAY = 110;      // ms per turn at 1x
const SUMMARY_MS = 2400;
const COIN_POPUP_MS = 900;
// Long enough to read three options and click one — the shop now opens
// after EVERY run, not only a rare full clear, so it earns a real second
// look rather than the old 3.2s blink-and-it's-gone. 5x the original 6s:
// owner wants a real window to react, not a blink. Moot when nothing is
// affordable — see showShop's early-close below.
const SHOP_MS = 30000;
const HISTORY_LEN = 12;

const session = {
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
    'grid', 'stage', 'hp', 'xpEarned', 'xpRate', 'steps', 'kills', 'inventory',
    'run', 'tally', 'seed', 'summary', 'summaryTitle', 'summaryBody',
    'playPause', 'speed', 'debug', 'resetSession', 'floor', 'history',
    'coins', 'coinPopup', 'damage', 'debugInfo', 'app', 'lab', 'dials',
    'shop', 'shopBalance', 'shopItems', 'shopSkip', 'shopTimerBar',
    'achievements', 'roster',
  ]) {
    el[id] = document.getElementById(id);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitWhilePaused() {
  while (session.paused) await sleep(80);
}

// A wall bump costs no turn, so its frame looks identical to the one before
// it. Dropping those keeps the playback from stuttering.
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
    // After the frame, so a signal is never painted under the tile it
    // belongs to.
    events.show(frame.state);
    renderDebugInfo(el.debugInfo, session.debug ? entry : null);
    renderHud(el, frame.state, session);
    if (el.tally) el.tally.textContent = tallyText();

    await sleep(BASE_DELAY / session.speed);
  }
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

function renderShopItems(balance) {
  el.shopItems.innerHTML = '';
  for (const entry of SHOP_ITEMS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.item = entry.item.name;
    const affordable = entry.price <= balance;
    btn.disabled = !affordable;
    btn.classList.toggle('unaffordable', !affordable);
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
// before the timer runs out, pickDefaultPurchase applies — nobody is
// guaranteed to be watching a spectator that never pauses for input.
// SHOP_MS is long enough now that a present viewer has a real chance to
// choose, and the reverse bar tells them how long that chance lasts.
async function showShop(defaultSeed) {
  if (!el.shop) return;
  let balance = session.unbankedCoins;
  let purchases = 0;
  let skipped = false;
  let clicked;   // set by the listener, consumed by the loop below

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
    renderShopItems(balance);
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
      // Timer out with nothing clicked. The no-input default applies once
      // and then leaves — nobody is guaranteed to be watching a spectator
      // that never pauses for input, and draining the whole balance item by
      // item is not what "nobody chose" should mean.
      const auto = purchases === 0 ? pickDefaultPurchase(balance, defaultSeed) : null;
      if (auto) {
        balance -= auto.price;
        addHeldItem(auto.item);
        purchases++;
        showBalance();
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

function tallyDescent(run, finalState) {
  session.runsPlayed++;

  const lastFloor = run.levels[run.levels.length - 1];
  if (run.cleared) {
    session.cleared++;
    // Total turns come from playDungeon's own per-floor records; final
    // xpEarned comes from the replayed end-of-run state, not from
    // run.levels — see the note on xpEarnedThisFloor below for why.
    const totalTurns = run.levels.reduce((sum, level) => sum + level.turns, 0);
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

  session.history.unshift({
    run: session.runNumber,
    depth: run.depth,
    cleared: run.cleared,
    cause: run.cleared ? 'cleared' : lastFloor.outcome,
  });
  if (session.history.length > HISTORY_LEN) session.history.length = HISTORY_LEN;
  if (el.history) renderHistory(el.history, session.history);

  // U11 — what this run earned, read off playDungeon's own result. `earn`
  // reports only the FIRST time, so the celebration fires once and a
  // hundredth Butcher is silent.
  let justEarned = null;
  for (const id of earnedBy(run)) {
    if (earn(id, session.runNumber)) justEarned = id;
  }
  if (el.achievements) {
    renderAchievements(el.achievements, ACHIEVEMENTS, getAchievements(), justEarned);
  }
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
async function runDescentForever(sessionSeed) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    session.runNumber++;
    session.unbankedCoins = 0;
    if (el.coins) el.coins.textContent = coinsText();
    const seed = hashSeeds(sessionSeed, session.runNumber);

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
    const traces = [];
    const run = playDungeon(seed, (floor) => {
      const trace = [];
      traces.push(trace);
      return makeBot({
        trace,
        monsterCount: floor.monsterCount,
        chestCount: floor.chests,
        hero: dials.hero,
        ...dials.bot,
      });
    }, {
      maxTurns: dials.run.turnBudget,
      startingItems: getHeldItems(),
      floorPlan: makeFloorPlan(dials.model),
      // Who is playing (src/ui/dials.js, "quem joga"). Unset resolves to the
      // shipped hero, so a visitor who never opens the Lab gets exactly the
      // run they got before heroes existed.
      hero: hero,
      // The return switch (src/ui/dials.js). Off is a plain descent, which
      // is `traversals: LEVELS` — the same pin the analysis modules already
      // use. On leaves the option unset so dungeon.js's own default (the
      // full nineteen, down and back up) applies, rather than this page
      // carrying a second copy of that arithmetic.
      ...(dials.run.theReturn ? {} : { traversals: LEVELS }),
    });

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

    tallyDescent(run, finalState);
    await showDescentSummary(run, finalState);
    // The default-purchase draw needs its own seed, same derivation as the
    // run's own (hashSeeds(sessionSeed, runNumber)) — see shop.js's own
    // comment for why this can't be Math.random().
    await showShop(hashSeeds(sessionSeed, session.runNumber));
  }
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
    const speeds = [0.5, 1, 2, 4, 8];
    session.speed = speeds[(speeds.indexOf(session.speed) + 1) % speeds.length];
    el.speed.textContent = session.speed + '×';
  });

  // General reset, not tied to any one display: wipes both localStorage
  // stores this page keeps (score.js's lifetime record, wallet.js's coin
  // balance and held items). The next run picks up an empty wallet the
  // same way a fresh visitor would.
  el.resetSession.addEventListener('click', () => {
    if (!confirm('Reset your coin balance, held items, and lifetime total? This cannot be undone.')) return;
    resetScore();
    resetOnDeath();
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
      });
    }
  };

  el.lab.addEventListener('click', () => {
    open();
    const opening = el.dials.hidden;
    el.dials.hidden = !opening;
    el.app.classList.toggle('lab-open', opening);
    el.lab.textContent = opening ? '🧪 lab on' : '🧪 lab';
  });

  // ?dev=1 — no button anywhere invites this; knowing the URL param is the
  // whole gate. It only unlocks the "salvar como padrão" button inside the
  // panel dials.js already builds, so this is one extra flag through code
  // that already existed, not a second UI.
  open();
  el.dials.hidden = false;
  el.app.classList.add('lab-open');
  el.lab.textContent = '🧪 lab on';
}

export async function start() {
  grab();
  buildGrid(el.grid);
  // Drawn before the first run so the board reads as "two things to do"
  // rather than appearing out of nowhere the moment one is done.
  if (el.achievements) {
    renderAchievements(el.achievements, ACHIEVEMENTS, getAchievements());
  }
  events = makeEventLayer(el.stage, el.grid, { enabled: eventsEnabled() });
  wireControls();

  // Half speed by default — easier to follow than the old 1x default.
  session.speed = 0.5;
  el.speed.textContent = '0.5×';

  const params = new URL(location.href).searchParams;

  // dial-overrides.json, resolved against the code defaults once — this is
  // what EVERY visitor plays with, whether or not they ever open the Lab.
  // See src/ui/dial-overrides.js for why a fetch failure resolves to {}
  // rather than breaking the page.
  const overrides = await loadDialOverrides();
  session.shippedDials = resolvedDefaults(overrides);
  wireLab(overrides, params.get('dev') === '1');

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
      onRestart: () => { session.restart = true; },
    });
    const chosen = getChosenHero();
    const first = heroByName(chosen === null ? session.shippedDials.run.who : chosen);
    session.roster(first.name, first.name);
  }

  // ?seed=whatever makes a whole session reproducible, which is how you go
  // back and look at a run the bot played badly.
  const requested = params.get('seed');
  const sessionSeed = requested
    ? seedFromString(requested)
    : (Date.now() >>> 0);

  // ?difficulty=0..1 is a lab affordance kept for old links: it plays the
  // OLD single synthetic floor instead of the ten-floor descent, at a fixed
  // difficulty for the whole session. Not shown in the UI — a dial has no
  // meaning against a descent. See docs/backlog.md, U1.
  const requestedDial = params.get('difficulty');
  if (requestedDial !== null) {
    session.dial = Number(requestedDial);
    session.floor = difficultyToParams(session.dial);
    runForever(sessionSeed);
  } else {
    runDescentForever(sessionSeed);
  }
}
