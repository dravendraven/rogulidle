// Interactive mode: a human plays the same ten-floor descent the bot does,
// through the same `step()`/`newGame()` the engine already exposes — no
// sim/bot changes needed, this is just a second driver for the same rules.
//
// Not the project's stated product (Rogulidle "plays itself" — see
// CLAUDE.md), added on direct request from the owner. Kept as its own page
// so index.html's job as the spectator stays exactly what U1 defined it as.

import { newGame } from '../sim/game.js';
import { step, ACTIONS } from '../sim/step.js';
import { observe, foldBelief, emptyBelief } from '../sim/observe.js';
import { floorPlan, LEVELS } from '../sim/dungeon.js';
import { hashSeeds, seedFromString } from '../sim/rng.js';
import { buildGrid, renderFrame, renderLog } from './render.js';
import { tileSvg } from './tiles.js';

const KEYS = {
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  ' ': 'rest', '.': 'rest',
};

const el = {};
const session = {
  seed: 0, attempt: 0, level: 1, carry: null, active: false,
  // Turns banked from floors already finished this attempt — see
  // render.js's renderHud xp-rate comment for why state.turn alone isn't
  // enough once a run has carried past floor 1.
  turnOffset: 0,
};
let state, observation, belief;

function grab() {
  for (const id of [
    'grid', 'hp', 'dmg', 'xpEarned', 'xpRate', 'steps', 'kills', 'inventory',
    'remaining', 'seed', 'log', 'summary', 'summaryTitle', 'summaryBody',
    'floor', 'attempt', 'restart',
  ]) {
    el[id] = document.getElementById(id);
  }
}

function hearts(current, max, armour = 0) {
  let out = '';
  for (let i = 0; i < max; i++) out += tileSvg(i < current ? '🟩' : '⬜') || '';
  for (let i = 0; i < armour; i++) out += tileSvg('🛡️') || '';
  return out;
}

function renderHud() {
  const player = state.player;
  el.hp.innerHTML = hearts(player.hp, player.hpMax, player.armour);
  el.dmg.textContent = player.xp + ' dmg';
  const totalTurns = session.turnOffset + state.turn;
  el.xpEarned.textContent = player.xpEarned + ' xp';
  el.xpRate.textContent =
    (totalTurns > 0 ? (player.xpEarned / totalTurns).toFixed(2) : '0.00') + ' xp/turn';
  el.steps.textContent = state.turn + ' 👣';
  el.kills.textContent = player.kills.length ? '⚔️ ' + player.kills.length : '⚔️ —';
  el.floor.textContent = `floor ${session.level} / ${LEVELS}`;
  el.attempt.textContent = `attempt ${session.attempt}`;
  el.inventory.innerHTML = player.inventory.length
    ? player.inventory.map((item) => tileSvg(item.emoji) || '').join('')
    : '—';
  const alive = state.monsters.filter((m) => !m.dead).length;
  el.remaining.textContent = `${alive} left of ${state.monsters.length}`;
  el.seed.textContent = 'seed ' + state.seed;
}

function render() {
  renderFrame(state, belief);
  renderHud();
  renderLog(el.log, state);
}

function countsFor(level, carry) {
  const plan = floorPlan(level);
  return {
    monsters: plan.monsters,
    chests: plan.chests,
    difficultyScale: plan.difficultyScale,
    dropChance: plan.dropChance,
    weaponScarcity: plan.weaponScarcity,
    armourScarcity: plan.armourScarcity,
    potionScarcity: plan.potionScarcity,
    monsterSpread: plan.monsterSpread,
    sideActivationCap: plan.sideActivationCap,
    sideRoomDepthBonus: plan.sideRoomDepthBonus,
    spineThreatShare: plan.spineThreatShare,
    sideChestBias: plan.sideChestBias,
    carry,
  };
}

function enterFloor(level, carry) {
  session.level = level;
  state = newGame(hashSeeds(session.seed, level), countsFor(level, carry));
  observation = observe(state);
  belief = foldBelief(emptyBelief(), observation);
  render();
}

async function showEnd(title, rows) {
  el.summaryTitle.textContent = title;
  el.summaryBody.innerHTML = '';
  for (const [label, value] of rows) {
    const row = document.createElement('div');
    row.className = 'summary-row';
    row.innerHTML = `<span>${label}</span><b>${value}</b>`;
    el.summaryBody.append(row);
  }
  el.summary.classList.add('shown');
}

function endRun(title) {
  session.active = false;
  const player = state.player;
  const loot = player.inventory.length
    ? player.inventory.map((item) => tileSvg(item.emoji) || '').join('')
    : '—';
  const slain = player.kills.length
    ? state.monsters.filter((m) => m.dead).map((m) => tileSvg(m.emoji) || '').join('')
    : '—';
  showEnd(title, [
    ['reached', `floor ${session.level} / ${LEVELS}`],
    ['killed', slain],
    ['carried', loot],
    ['killed by', state.killedBy ? 'the ' + state.killedBy : '—'],
  ]);
}

function newRun() {
  session.attempt++;
  session.seed = Date.now() >>> 0;
  session.carry = null;
  session.turnOffset = 0;
  session.active = true;
  el.summary.classList.remove('shown');
  enterFloor(1, null);
}

function carryFrom(player) {
  return {
    hp: player.hp, hpMax: player.hpMax, armour: player.armour, xp: player.xp,
    inventory: player.inventory.map((i) => ({ ...i })), kills: player.kills.slice(),
    xpEarned: player.xpEarned,
  };
}

function act(action) {
  if (!session.active) { newRun(); return; }
  if (!ACTIONS.includes(action)) return;

  const result = step(state, action);
  state = result.state;
  observation = result.observation;
  belief = foldBelief(belief, observation);
  render();

  if (state.outcome === 'died') {
    endRun('💀 you died');
  } else if (state.outcome === 'ascended') {
    if (session.level >= LEVELS) {
      endRun('⛩️ you cleared the descent');
    } else {
      session.turnOffset += state.turn;
      enterFloor(session.level + 1, carryFrom(state.player));
    }
  }
}

function wireControls() {
  window.addEventListener('keydown', (e) => {
    if (!session.active) { newRun(); return; }
    const action = KEYS[e.key];
    if (!action) return;
    e.preventDefault();
    act(action);
  });

  document.querySelector('.dpad').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (btn) act(btn.dataset.act);
  });

  el.restart.addEventListener('click', newRun);
}

export function start() {
  grab();
  buildGrid(el.grid);
  wireControls();

  const params = new URL(location.href).searchParams;
  const requested = params.get('seed');
  session.attempt = 1;
  session.seed = requested ? seedFromString(requested) : (Date.now() >>> 0);
  session.active = true;
  enterFloor(1, null);
}
