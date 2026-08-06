// The spectator loop: compute a run, play it back, show the result, start
// the next one. Nothing to press — that is the product.
//
// Runs are computed to completion first and then replayed. The engine takes
// a few hundred milliseconds for a whole run, so there is no reason to
// couple the simulation to the frame rate, and the replay can be paused or
// sped up freely.

import { playGame, replayGame } from '../sim/game.js';
import { hashSeeds, seedFromString } from '../sim/rng.js';
import { makePlaceholderPolicy } from '../bot/placeholder.js';
import { buildGrid, renderFrame, renderHud, renderLog } from './render.js';

const MAX_TURNS = 900;
const BASE_DELAY = 110;      // ms per turn at 1x
const SUMMARY_MS = 2400;

const session = {
  runNumber: 0,
  ascended: 0,
  died: 0,
  unfinished: 0,
  paused: false,
  speed: 1,
};

const el = {};

function grab() {
  for (const id of [
    'grid', 'hp', 'xp', 'steps', 'kills', 'inventory', 'remaining',
    'run', 'seed', 'tally', 'log', 'summary', 'summaryTitle', 'summaryBody',
    'playPause', 'speed',
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

async function playFrames(frames) {
  for (const frame of frames) {
    await waitWhilePaused();
    renderFrame(frame.state, frame.belief);
    renderHud(el, frame.state, session);
    renderLog(el.log, frame.state);
    await sleep(BASE_DELAY / session.speed);
  }
}

function tally(run) {
  if (run.outcome === 'ascended') session.ascended++;
  else if (run.outcome === 'died') session.died++;
  else session.unfinished++;
}

async function showSummary(run) {
  const player = run.state.player;

  const titles = {
    ascended: '⛩️ ascended',
    died: '💀 died',
  };
  el.summaryTitle.textContent = titles[run.outcome] || '🕳️ ran out of turns';

  const loot = player.inventory.length
    ? player.inventory.map((item) => item.emoji).join('')
    : '—';
  const slain = player.kills.length
    ? run.state.monsters.filter((m) => m.dead).map((m) => m.emoji).join('')
    : '—';

  el.summaryBody.innerHTML = '';
  const rows = [
    ['steps', run.turns + ' 👣'],
    ['killed', slain],
    ['carried', loot],
    ['killed by', run.state.killedBy ? 'the ' + run.state.killedBy : '—'],
  ];
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

async function runForever(sessionSeed) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    session.runNumber++;

    const seed = hashSeeds(sessionSeed, session.runNumber);
    const run = playGame(seed, makePlaceholderPolicy(seed), { maxTurns: MAX_TURNS });
    const frames = watchableFrames(replayGame(run.replay));

    await playFrames(frames);
    tally(run);
    await showSummary(run);
  }
}

function wireControls() {
  el.playPause.addEventListener('click', () => {
    session.paused = !session.paused;
    el.playPause.textContent = session.paused ? '▶ play' : '⏸ pause';
  });

  el.speed.addEventListener('click', () => {
    const speeds = [1, 2, 4, 8];
    session.speed = speeds[(speeds.indexOf(session.speed) + 1) % speeds.length];
    el.speed.textContent = session.speed + '×';
  });
}

export function start() {
  grab();
  buildGrid(el.grid);
  wireControls();

  // ?seed=whatever makes a whole session reproducible, which is how you go
  // back and look at a run the bot played badly.
  const requested = new URL(location.href).searchParams.get('seed');
  const sessionSeed = requested
    ? seedFromString(requested)
    : (Date.now() >>> 0);

  runForever(sessionSeed);
}
