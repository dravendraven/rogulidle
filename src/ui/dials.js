// The dial lab: every number the map generator and the bot run on, as a
// form. Shared by index.html (behind the Lab button) and run-lab.html, so
// there is one list of dials rather than two that drift.
//
// NOTHING HERE PERSISTS and nothing here writes to balance.js. This is a
// "what if" — a value worth keeping is still a docs/balance.md + code edit
// (CLAUDE.md). `src/sim/` and `src/bot/` never import this file; the page
// reads it and hands the result to makeFloorPlan / makeBot when a run
// starts, which is the same door a sweep already used.

import { DEFAULT_MODEL } from '../sim/difficulty.js';
import {
  CROWD_PENALTY, DANGER_FALLOFF, DEFAULT_HERO, GOAL_STICKINESS,
} from '../bot/config.js';
import { TURN_BUDGET } from '../sim/balance.js';

// Where each dial's default comes from, and where its value goes:
//   'model' -> makeFloorPlan(model)   the map generator
//   'hero'  -> makeBot({ hero })      the hero's own traits
//   'bot'   -> makeBot(options)       the bot's mechanics
//   'run'   -> the run's options
//
// The BOT comes first, because a hero is the thing you change to see a
// different run of the same dungeon; the map is the dungeon itself.
export const SECTIONS = [
  ['Bot', [
    ['o herói', [
      ['hero', 'fightMargin',  'fração do hp que uma luta pode custar', 0.05],
      ['hero', 'sideAppetite', 'apetite pela aposta lateral (0 = nunca)', 0.1],
      ['hero', 'stepCost',     'quanto vale um passo, em hp', 0.005],
    ]],
    ['como ele lê o perigo', [
      ['bot', 'falloff',      'perigo decai por tile', 0.05],
      ['bot', 'crowdPenalty', 'multa por tile cercável por 2', 0.5],
      ['bot', 'stickiness',   'teimosia de objetivo', 0.05],
    ]],
  ]],
  ['Mapa', [
    ['quantas criaturas', [
      ['model', 'monstersBase',   'criaturas no andar 1', 1],
      ['model', 'monsterGrowth',  'crescimento por andar', 0.01],
      ['model', 'spreadPerLevel', 'sorteio do andar: largura por andar', 0.01],
      ['model', 'spreadCap',      'sorteio do andar: teto', 0.05],
    ]],
    ['quão fortes', [
      ['model', 'strength',       'teto da tabela no andar 1 (0..1)', 0.01],
      ['model', 'strengthGrowth', 'crescimento do teto por andar', 0.01],
    ]],
    ['quanto varia', [
      ['model', 'tierFloorPerLevel', 'piso do tier: sobe por andar', 0.01],
      ['model', 'tierFloorCap',      'piso do tier: teto (share)', 0.05],
      ['model', 'tierSlackPerLevel', 'folga acima do teto: por andar', 0.01],
      ['model', 'tierSlackCap',      'folga acima do teto: máx (share)', 0.05],
      ['model', 'earlyTierCut',      'corte do andar 1 (linhas da tabela)', 1],
      ['model', 'outOfDepthChancePerLevel', 'cauda rara: chance por andar', 0.005],
      ['model', 'outOfDepthChanceCap',      'cauda rara: teto', 0.01],
    ]],
    ['quão agrupadas', [
      ['model', 'clusterSize', 'criaturas por grupo (1 = sem grupo)', 1],
    ]],
    ['quanto loot', [
      ['model', 'chests',         'baús por andar', 1],
      ['model', 'armourScarcity', 'escassez de escudo (1 em S)', 0.05],
      ['model', 'potionScarcity', 'escassez de poção (1 em S)', 0.05],
      ['model', 'weaponScarcity', 'escassez de arma (1 em S)', 0.5],
      ['model', 'dropChance',     'chance de corpo largar algo', 0.05],
    ]],
    ['quanto a rota ramifica', [
      ['model', 'spineThreatShare',   'massa de ameaça na espinha', 0.05],
      ['model', 'sideRoomDepthBonus', 'aposta da sala lateral', 0.05],
      ['model', 'sideChestBias',      'peso de baú na lateral', 0.5],
    ]],
    ['tempo', [
      ['run', 'turnBudget', 'turnos por travessia', 50],
    ]],
  ]],
];

const BOT_DEFAULTS = {
  falloff: DANGER_FALLOFF, crowdPenalty: CROWD_PENALTY, stickiness: GOAL_STICKINESS,
};
const RUN_DEFAULTS = { turnBudget: TURN_BUDGET };

// The shipped value of a dial — read live from the modules rather than
// written down here, so the form can never quote a number the game
// abandoned.
function defaultOf(kind, key) {
  if (kind === 'model') return DEFAULT_MODEL[key];
  if (kind === 'hero') return DEFAULT_HERO[key];
  if (kind === 'bot') return BOT_DEFAULTS[key];
  return RUN_DEFAULTS[key];
}

// Fills `container` with the form and returns `{ read, reset }`.
//
// `onRestart` is what the ↻ button calls — the page owns what "restart"
// means, since only it knows what a run in flight is.
export function buildDialPanel(container, { onRestart } = {}) {
  container.innerHTML = '';
  const inputs = [];

  for (const [section, groups] of SECTIONS) {
    const h2 = document.createElement('h2');
    h2.textContent = section;
    container.append(h2);

    for (const [group, list] of groups) {
      const h3 = document.createElement('h3');
      h3.textContent = group;
      container.append(h3);

      for (const [kind, key, label, step] of list) {
        const def = defaultOf(kind, key);
        const row = document.createElement('div');
        row.className = 'dial';
        const caption = document.createElement('label');
        caption.textContent = label;
        caption.title = key;                    // the dial's real name
        const input = document.createElement('input');
        input.type = 'number';
        input.step = String(step);
        input.value = String(def);
        // Yellow means "not what ships", which is the one thing a reader
        // has to be able to see at a glance in a page full of numbers.
        input.addEventListener('input', () => {
          input.classList.toggle('changed', Number(input.value) !== def);
        });
        row.append(caption, input);
        container.append(row);
        inputs.push({ kind, key, input, def });
      }
    }
  }

  const buttons = document.createElement('div');
  buttons.className = 'dial-buttons';
  const restart = document.createElement('button');
  restart.type = 'button';
  restart.textContent = '↻ reiniciar com estes valores';
  const defaults = document.createElement('button');
  defaults.type = 'button';
  defaults.textContent = 'padrões';
  buttons.append(restart, defaults);
  container.append(buttons);

  const reset = () => {
    for (const { input, def } of inputs) {
      input.value = String(def);
      input.classList.remove('changed');
    }
  };

  restart.addEventListener('click', () => { if (onRestart) onRestart(); });
  defaults.addEventListener('click', reset);

  // A blank or nonsense field falls back to the shipped value rather than
  // handing NaN to the generator, which would fail somewhere far from here.
  const read = () => {
    const out = { model: {}, hero: {}, bot: {}, run: {} };
    for (const { kind, key, input, def } of inputs) {
      const value = Number(input.value);
      out[kind][key] = Number.isFinite(value) ? value : def;
    }
    return out;
  };

  return { read, reset };
}
