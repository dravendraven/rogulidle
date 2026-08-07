// The spectator loop: compute a run, play it back, show the result, start
// the next one. Nothing to press — that is the product.
//
// Runs are computed to completion first and then replayed. The engine takes
// a few hundred milliseconds for a whole run, so there is no reason to
// couple the simulation to the frame rate, and the replay can be paused or
// sped up freely.

import { playGame, replayGame } from '../sim/game.js';
import { playDungeon, LEVELS } from '../sim/dungeon.js';
import { hashSeeds, seedFromString } from '../sim/rng.js';
import { difficultyToParams } from '../sim/difficulty.js';
import { makeBot } from '../bot/bot.js';
import { dangerField } from '../bot/threat.js';
import { buildGrid, renderFrame, renderHud, renderLog, renderHistory, renderScore } from './render.js';
import { tileSvg } from './tiles.js';
import { award, readScore, resetScore } from './score.js';

const MAX_TURNS = 900;       // per floor
const BASE_DELAY = 110;      // ms per turn at 1x
const SUMMARY_MS = 2400;
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
  history: [],
  // Turns banked from floors already finished this run — see renderHud's
  // xp-rate comment in render.js. 0 in legacy single-floor mode.
  turnOffset: 0,
  paused: false,
  speed: 1,
  debug: false,
};

const el = {};

function grab() {
  for (const id of [
    'grid', 'hp', 'dmg', 'xpEarned', 'xpRate', 'steps', 'kills', 'inventory',
    'remaining', 'run', 'seed', 'tally', 'log', 'summary', 'summaryTitle',
    'summaryBody', 'playPause', 'speed', 'debug', 'goal', 'floor', 'history',
    'score', 'resetScore',
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

    // The danger map is recomputed for the frame on screen rather than
    // stored for every turn of the run — one field costs a millisecond or
    // two, and keeping hundreds of them would be pure memory.
    const debug = session.debug
      ? { danger: dangerField(frame.belief), goal: trace[i] ? trace[i].goal : null }
      : null;

    renderFrame(frame.state, frame.belief, debug);
    renderHud(el, frame.state, session);
    if (el.tally) el.tally.textContent = tallyText();
    renderLog(el.log, frame.state);

    if (el.goal) {
      el.goal.textContent = session.debug && trace[i]
        ? `${trace[i].goal.kind} → ${trace[i].planned}`
        : '';
    }
    await sleep(BASE_DELAY / session.speed);
  }
}

const legacyTallyText = () =>
  `${session.ascended}W · ${session.died}L · ${session.unfinished} timeout`;
const descentTallyText = () =>
  `${session.cleared}/${session.runsPlayed} cleared`;

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
  const titles = { ascended: '⛩️ ascended', died: '💀 died' };
  const loot = player.inventory.length
    ? player.inventory.map((item) => tileSvg(item.emoji) || '').join('')
    : '—';
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
    const run = playGame(seed, makeBot({ trace, monsterCount: session.floor.monsters }),
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

function tallyDescent(run) {
  session.runsPlayed++;

  const lastFloor = run.levels[run.levels.length - 1];
  if (run.cleared) {
    session.cleared++;
    // Only a full clear pays — that gate is what keeps the rate formula
    // from being maximised by dying early after a fast start. Total turns
    // and final xpEarned both come straight from playDungeon's own
    // per-floor records, not from anything the renderer tracked.
    const totalTurns = run.levels.reduce((sum, level) => sum + level.turns, 0);
    const score = award(lastFloor.xpEarned, totalTurns);
    if (el.score) renderScore(el.score, score);
  }

  session.history.unshift({
    run: session.runNumber,
    depth: run.depth,
    cleared: run.cleared,
    cause: run.cleared ? 'cleared' : lastFloor.outcome,
  });
  if (session.history.length > HISTORY_LEN) session.history.length = HISTORY_LEN;
  if (el.history) renderHistory(el.history, session.history);
}

async function showDescentSummary(run, finalState) {
  const player = finalState.player;
  const loot = player.inventory.length
    ? player.inventory.map((item) => tileSvg(item.emoji) || '').join('')
    : '—';
  const slain = player.kills.length
    ? finalState.monsters.filter((m) => m.dead).map((m) => tileSvg(m.emoji) || '').join('')
    : '—';
  const title = run.cleared
    ? '⛩️ cleared the descent'
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
    const seed = hashSeeds(sessionSeed, session.runNumber);

    // playDungeon calls this once per floor; a bot carries plan state that
    // means nothing on the next map down, so each floor gets a fresh trace
    // array too, collected in call order.
    const traces = [];
    const run = playDungeon(seed, (floor) => {
      const trace = [];
      traces.push(trace);
      return makeBot({ trace, monsterCount: floor.monsterCount });
    }, { maxTurns: MAX_TURNS });

    let finalState = null;
    session.turnOffset = 0;
    for (let i = 0; i < run.levels.length; i++) {
      const levelResult = run.levels[i];
      if (el.floor) el.floor.textContent = `floor ${levelResult.level} / ${LEVELS}`;

      const all = replayGame(levelResult.replay);
      const kept = watchableFrames(all).map((frame) => ({
        frame, index: all.indexOf(frame),
      }));
      const frames = kept.map((k) => k.frame);
      const alignedTrace = kept.map((k) => traces[i][Math.max(0, k.index)]);

      await playFrames(frames, alignedTrace, descentTallyText);
      finalState = frames[frames.length - 1].state;
      session.turnOffset += levelResult.turns;
    }

    tallyDescent(run);
    await showDescentSummary(run, finalState);
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
  });

  el.speed.addEventListener('click', () => {
    const speeds = [0.5, 1, 2, 4, 8];
    session.speed = speeds[(speeds.indexOf(session.speed) + 1) % speeds.length];
    el.speed.textContent = session.speed + '×';
  });

  el.resetScore.addEventListener('click', () => {
    if (!confirm('Reset the lifetime score? This cannot be undone.')) return;
    renderScore(el.score, resetScore());
  });
}

export function start() {
  grab();
  buildGrid(el.grid);
  wireControls();

  // Half speed by default — easier to follow than the old 1x default.
  session.speed = 0.5;
  el.speed.textContent = '0.5×';

  // Read before the first run so a returning visitor sees their past
  // total immediately, not just after their next clear.
  renderScore(el.score, readScore());

  // ?seed=whatever makes a whole session reproducible, which is how you go
  // back and look at a run the bot played badly.
  const params = new URL(location.href).searchParams;
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
