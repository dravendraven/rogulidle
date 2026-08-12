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
// `title` is the user-facing name; `label` (the old caption) still shows as
// a smaller sub-line so the precise, original wording never disappears.
// `up`/`down` describe the effect of moving the dial each way — one short
// adjective-led phrase, no explanation. `range: [min, max]` is what turns a
// dial into a slider below; a dial with no natural bound (a raw count like
// "creatures on floor 1") keeps the old plain number field and has no
// `range`.
//
// The BOT comes first, because a hero is the thing you change to see a
// different run of the same dungeon; the map is the dungeon itself.
export const SECTIONS = [
  ['Bot', [
    ['o herói', [
      {
        kind: 'hero', key: 'fightMargin', label: 'fração do hp que uma luta pode custar',
        title: 'Coragem em combate', step: 0.05, range: [0, 1],
        up: 'mais valente — aceita duelos caros', down: 'mais covarde — foge de quase tudo',
      },
      {
        kind: 'hero', key: 'sideAppetite', label: 'apetite pela aposta lateral (0 = nunca)',
        title: 'Ganância por desvios', step: 0.1, range: [0, 1],
        up: 'mais ganancioso — persegue mais desvios', down: 'mais disciplinado — 0 nunca sai da rota',
      },
      {
        kind: 'hero', key: 'stepCost', label: 'quanto vale um passo, em hp',
        title: 'Pressa', step: 0.005, range: [0, 0.1],
        up: 'mais apressado — sai cedo do andar', down: 'mais explorador — varre o andar inteiro',
      },
    ]],
    ['como ele lê o perigo', [
      {
        kind: 'bot', key: 'falloff', label: 'perigo decai por tile',
        title: 'Alcance da percepção de perigo', step: 0.05, range: [0, 1],
        up: 'mais míope — só teme o que está colado', down: 'mais paranoico — o andar inteiro assusta',
      },
      {
        kind: 'bot', key: 'crowdPenalty', label: 'multa por tile cercável por 2',
        title: 'Cautela contra cerco', step: 0.5, range: [0, 20],
        up: 'mais cauteloso — nunca entra em cerco', down: 'mais afoito — ignora o cerco',
      },
      {
        kind: 'bot', key: 'stickiness', label: 'teimosia de objetivo',
        title: 'Firmeza de decisão', step: 0.05, range: [1, 3],
        up: 'mais teimoso — não troca de alvo à toa', down: 'mais indeciso — troca a qualquer sombra',
      },
    ]],
  ]],
  ['Mapa', [
    ['quantas criaturas', [
      {
        kind: 'model', key: 'monstersBase', label: 'criaturas no andar 1',
        title: 'Criaturas iniciais', step: 1,
        up: 'abertura mais brutal', down: 'abertura mais mansa',
      },
      {
        kind: 'model', key: 'monsterGrowth', label: 'crescimento por andar',
        title: 'Ritmo de crescimento de criaturas', step: 0.01, range: [1, 1.3],
        up: 'descida mais íngreme', down: 'descida mais plana (<1 esvazia o fundo)',
      },
      {
        kind: 'model', key: 'spreadPerLevel', label: 'sorteio do andar: largura por andar',
        title: 'Instabilidade do andar (crescimento)', step: 0.01, range: [0, 0.3],
        up: 'andares mais imprevisíveis', down: 'andares mais regulares',
      },
      {
        kind: 'model', key: 'spreadCap', label: 'sorteio do andar: teto',
        title: 'Instabilidade máxima do andar', step: 0.05, range: [0, 1],
        up: 'fundo mais caótico', down: 'fundo mais previsível',
      },
    ]],
    ['quão fortes', [
      {
        kind: 'model', key: 'strength', label: 'teto da tabela no andar 1 (0..1)',
        title: 'Dificuldade inicial', step: 0.01, range: [0, 1],
        up: 'início mais cruel', down: 'início mais inofensivo',
      },
      {
        kind: 'model', key: 'strengthGrowth', label: 'crescimento do teto por andar',
        title: 'Ritmo de escalada de dificuldade', step: 0.01, range: [1, 1.4],
        up: 'escalada mais violenta (satura antes)', down: 'escalada mais morna',
      },
    ]],
    ['quanto varia', [
      {
        kind: 'model', key: 'tierFloorPerLevel', label: 'piso do tier: sobe por andar',
        title: 'Uniformidade do andar (crescimento)', step: 0.01, range: [0, 0.2],
        up: 'andares mais uniformes (fundo sem ratos)', down: 'andares mais desiguais',
      },
      {
        kind: 'model', key: 'tierFloorCap', label: 'piso do tier: teto (share)',
        title: 'Uniformidade máxima do andar', step: 0.05, range: [0, 1],
        up: 'fundo mais homogêneo', down: 'fundo mais bagunçado',
      },
      {
        kind: 'model', key: 'tierSlackPerLevel', label: 'folga acima do teto: por andar',
        title: 'Risco de monstro fora da curva (crescimento)', step: 0.01, range: [0, 0.5],
        up: 'mais traiçoeiro — surpresas acima do esperado', down: 'mais honesto — sem surpresas',
      },
      {
        kind: 'model', key: 'tierSlackCap', label: 'folga acima do teto: máx (share)',
        title: 'Risco máximo de monstro fora da curva', step: 0.05, range: [0, 1],
        up: 'fundo mais perigoso', down: 'fundo mais controlado',
      },
      {
        kind: 'model', key: 'earlyTierCut', label: 'corte do andar 1 (linhas da tabela)',
        title: 'Suavidade do andar 1', step: 1, range: [0, 3],
        up: 'tutorial mais generoso', down: 'tutorial mais seco (0 = sem desconto)',
      },
      {
        kind: 'model', key: 'outOfDepthChancePerLevel', label: 'cauda rara: chance por andar',
        title: 'Chance de monstro raro (crescimento)', step: 0.005, range: [0, 0.05],
        up: 'mais assustador — monstro raro mais cedo', down: 'mais justo (0 = nunca acontece)',
      },
      {
        kind: 'model', key: 'outOfDepthChanceCap', label: 'cauda rara: teto',
        title: 'Chance máxima de monstro raro', step: 0.01, range: [0, 0.3],
        up: 'fundo mais imprevisível', down: 'fundo mais confiável',
      },
    ]],
    ['quão agrupadas', [
      {
        kind: 'model', key: 'clusterSize', label: 'criaturas por grupo (1 = sem grupo)',
        title: 'Agrupamento de criaturas', step: 1, range: [1, 20],
        up: 'mais concentrado — matilhas, andares que variam muito', down: 'mais espalhado e mediano',
      },
    ]],
    ['quanto loot', [
      {
        kind: 'model', key: 'chests', label: 'baús por andar',
        title: 'Baús por andar', step: 1,
        up: 'herói mais rico', down: 'herói mais pobre',
      },
      {
        kind: 'model', key: 'armourScarcity', label: 'escassez de escudo (1 em S)',
        title: 'Raridade de armadura', step: 0.05, range: [1, 5],
        up: 'mais escasso', down: 'mais abundante',
      },
      {
        kind: 'model', key: 'potionScarcity', label: 'escassez de poção (1 em S)',
        title: 'Raridade de poção', step: 0.05, range: [1, 5],
        up: 'mais escasso', down: 'mais abundante',
      },
      {
        kind: 'model', key: 'weaponScarcity', label: 'escassez de arma (1 em S)',
        title: 'Raridade de arma', step: 0.5, range: [1, 10],
        up: 'herói mais fraco', down: 'herói mais armado',
      },
      {
        kind: 'model', key: 'dropChance', label: 'chance de corpo largar algo',
        title: 'Chance de drop', step: 0.05, range: [0, 1],
        up: 'matar compensa mais', down: 'matar vira puro custo',
      },
    ]],
    ['quanto a rota ramifica', [
      {
        kind: 'model', key: 'spineThreatShare', label: 'massa de ameaça na espinha',
        title: 'Perigo concentrado na rota principal', step: 0.05, range: [0, 1],
        up: 'mapa mais direto — nada a evitar', down: 'mapa mais tático — laterais mortais',
      },
      {
        kind: 'model', key: 'sideRoomDepthBonus', label: 'aposta da sala lateral',
        title: 'Risco das salas laterais', step: 0.05, range: [0, 1],
        up: 'aposta mais alta — monstro pior, baú melhor', down: 'aposta mais morna',
      },
      {
        kind: 'model', key: 'sideChestBias', label: 'peso de baú na lateral',
        title: 'Atração de baús para as laterais', step: 0.5, range: [1, 10],
        up: 'desvio mais tentador', down: 'loot mais no caminho (1 = sem viés)',
      },
    ]],
    ['tempo', [
      {
        kind: 'run', key: 'turnBudget', label: 'turnos por travessia',
        title: 'Tempo disponível por andar', step: 50,
        up: 'mais tolerante ao vagar', down: 'mais implacável — a run morre no relógio',
      },
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
      for (const { kind, key } of list) {
        out[kind][key] = defaultOf(kind, key, overrides);
      }
    }
  }
  return out;
}

// Decimal places a dial's own step implies, so a slider's live readout
// never shows more precision than the value actually carries (a step of
// 0.005 wants 3 places, a step of 1 wants 0).
function precisionOf(step) {
  const s = String(step);
  const i = s.indexOf('.');
  return i === -1 ? 0 : s.length - i - 1;
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

      for (const dial of list) {
        const {
          kind, key, label, title, step, range, up, down,
        } = dial;
        const def = defaultOf(kind, key, overrides);
        const min = range ? range[0] : (MIN_OF[key] ?? 0);
        const max = range ? range[1] : undefined;

        const row = document.createElement('div');
        row.className = 'dial';

        const head = document.createElement('div');
        head.className = 'dial-head';
        const caption = document.createElement('label');
        caption.className = 'dial-title';
        caption.textContent = title || label;
        caption.title = key;                    // the dial's real name
        head.append(caption);

        const sub = document.createElement('div');
        sub.className = 'dial-sublabel';
        sub.textContent = label;
        head.append(sub);

        row.append(head);

        let input;
        let valueOut;
        if (range) {
          const track = document.createElement('div');
          track.className = 'dial-slider';
          input = document.createElement('input');
          input.type = 'range';
          input.step = String(step);
          input.min = String(min);
          input.max = String(max);
          input.value = String(def);
          valueOut = document.createElement('span');
          valueOut.className = 'dial-value';
          valueOut.textContent = Number(def).toFixed(precisionOf(step));
          track.append(input, valueOut);
          row.append(track);
        } else {
          input = document.createElement('input');
          input.type = 'number';
          input.step = String(step);
          input.min = String(min);
          input.value = String(def);
          row.append(input);
        }

        const effect = document.createElement('div');
        effect.className = 'dial-effect';
        const upLine = document.createElement('div');
        upLine.textContent = `⬆️ ${up}`;
        const downLine = document.createElement('div');
        downLine.textContent = `⬇️ ${down}`;
        effect.append(upLine, downLine);
        row.append(effect);

        input.addEventListener('input', () => {
          // Yellow means "not what ships", which is the one thing a reader
          // has to be able to see at a glance in a page full of numbers.
          const isChanged = Number(input.value) !== def;
          input.classList.toggle('changed', isChanged);
          if (valueOut) {
            valueOut.textContent = Number(input.value).toFixed(precisionOf(step));
            valueOut.classList.toggle('changed', isChanged);
          }
        });

        container.append(row);
        inputs.push({
          kind, key, input, def, min, valueOut, step,
        });
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
    for (const {
      input, def, valueOut, step,
    } of inputs) {
      input.value = String(def);
      input.classList.remove('changed');
      if (valueOut) {
        valueOut.textContent = Number(def).toFixed(precisionOf(step));
        valueOut.classList.remove('changed');
      }
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
    for (const {
      kind, key, input, def, min,
    } of inputs) {
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
      for (const {
        kind, key, input, min,
      } of inputs) {
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
