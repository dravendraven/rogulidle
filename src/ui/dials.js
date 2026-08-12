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

// A dial's floor. Zero unless a smaller-than-zero value is not merely odd
// but broken: a scarcity of 0 divides by zero on the way to the item pool,
// and a budget of 0 turns is not a traversal. Everything else simply may
// not go negative — see `read` below for why that is enforced twice.
const MIN_OF = {
  armourScarcity: 0.05,
  potionScarcity: 0.05,
  weaponScarcity: 0.5,
  turnBudget: 1,
};

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

// The shipped value of a dial: `overrides` (dial-overrides.json, loaded by
// dial-overrides.js) wins when it sets one, the code constant otherwise —
// so "shipped" always means what a fresh visitor actually gets today, not
// what the source code says in isolation.
function defaultOf(kind, key, overrides = {}) {
  const shipped = kind === 'model' ? DEFAULT_MODEL[key]
    : kind === 'hero' ? DEFAULT_HERO[key]
    : kind === 'bot' ? BOT_DEFAULTS[key]
    : RUN_DEFAULTS[key];
  const override = overrides[kind] ? overrides[kind][key] : undefined;
  return override !== undefined ? override : shipped;
}

// Every dial's effective default, resolved once — what dials.read() would
// return if nothing were touched. This is what a player who never opens the
// panel actually plays with, so the caller can use it as the run's
// configuration without building the form at all.
export function resolvedDefaults(overrides = {}) {
  const out = { model: {}, hero: {}, bot: {}, run: {} };
  for (const [, groups] of SECTIONS) {
    for (const [, list] of groups) {
      for (const [kind, key] of list) {
        out[kind][key] = defaultOf(kind, key, overrides);
      }
    }
  }
  return out;
}

// Fills `container` with the form and returns `{ read, reset }`.
//
// `onRestart` is what the ↻ button calls — the page owns what "restart"
// means, since only it knows what a run in flight is. `overrides` is
// dial-overrides.json's content, already loaded — every field starts from
// it rather than from the raw code constant. `dev` adds one more button,
// "salvar como padrão", that turns the CURRENT form into a new
// dial-overrides.json download; see that button's own handler for why a
// download is the honest stopping point on a static site.
export function buildDialPanel(container, { onRestart, overrides = {}, dev = false } = {}) {
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
        const def = defaultOf(kind, key, overrides);
        const row = document.createElement('div');
        row.className = 'dial';
        const caption = document.createElement('label');
        caption.textContent = label;
        caption.title = key;                    // the dial's real name
        const input = document.createElement('input');
        input.type = 'number';
        input.step = String(step);
        input.min = String(MIN_OF[key] ?? 0);
        input.value = String(def);
        // Yellow means "not what ships", which is the one thing a reader
        // has to be able to see at a glance in a page full of numbers.
        input.addEventListener('input', () => {
          input.classList.toggle('changed', Number(input.value) !== def);
        });
        row.append(caption, input);
        container.append(row);
        inputs.push({ kind, key, input, def, min: MIN_OF[key] ?? 0 });
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

  // Read twice-guarded, because `min` on the element only stops the
  // spinner: a typed or pasted "-1" still reads back happily. A blank or
  // nonsense field falls back to the shipped value rather than handing NaN
  // to the generator, which would fail somewhere far from here.
  //
  // A negative is not merely a strange dungeon — a negative danger falloff
  // flips the sign of a tile's price, and a router that can pay LESS by
  // walking further never finishes. The bot clamps its own prices too
  // (src/bot/bot.js); this is the half that keeps the number out of the
  // engine in the first place, so the form and the run agree on what was
  // asked for.
  const read = () => {
    const out = { model: {}, hero: {}, bot: {}, run: {} };
    for (const { kind, key, input, def, min } of inputs) {
      const value = Number(input.value);
      out[kind][key] = Number.isFinite(value) ? Math.max(min, value) : def;
    }
    return out;
  };

  // Dev mode only. Reachable through the page by `?dev=1` alone — nothing
  // in the ordinary UI links here, which is what makes this different from
  // "reiniciar" above: that one is for anyone, this one changes what every
  // FUTURE visitor gets.
  //
  // A browser cannot write into the repo GitHub Pages serves — there is no
  // server here to ask. So this does the honest thing a static site can
  // do: it downloads the real dial-overrides.json content, ready to drop
  // in. Committing and pushing that file is the step that actually makes
  // it live, and that step needs push access to the repo — which is
  // already the real security boundary, not this button.
  if (dev) {
    const save = document.createElement('button');
    save.type = 'button';
    save.textContent = '💾 salvar como padrão';
    buttons.append(save);

    const note = document.createElement('div');
    note.className = 'dial-savenote';
    container.append(note);

    save.addEventListener('click', () => {
      // Starts from what was already shipped (`overrides`), not from an
      // empty object — a value pinned in an earlier session and never
      // touched today must not be dropped just because this form never
      // re-marks it "changed" (it can't be changed from a default it IS).
      const merged = JSON.parse(JSON.stringify(overrides));
      for (const { kind, key, input, min } of inputs) {
        if (!input.classList.contains('changed')) continue;
        const value = Number(input.value);
        if (!Number.isFinite(value)) continue;
        merged[kind] = merged[kind] || {};
        merged[kind][key] = Math.max(min, value);
      }

      const blob = new Blob([JSON.stringify(merged, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dial-overrides.json';
      a.click();
      URL.revokeObjectURL(url);

      note.textContent = 'baixado dial-overrides.json — substitua o arquivo '
        + 'na raiz do repositório e publique (commit + push) para valer '
        + 'para todo mundo. Até lá, isto só mudou esta aba.';
    });
  }

  return { read, reset };
}
