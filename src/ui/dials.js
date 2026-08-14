// The dial lab: every number the map generator and the bot run on, as a
// form, built once and reused wherever index.html opens the Lab button.
//
// NOTHING HERE PERSISTS and nothing here writes to balance.js. This is a
// "what if" — a value worth keeping is still a docs/balance.md + code edit
// (CLAUDE.md). `src/sim/` and `src/bot/` never import this file; the page
// reads it and hands the result to makeFloorPlan / makeBot when a run
// starts, which is the same door a sweep already used.

import { DEFAULT_MODEL, saturatedAt } from '../sim/difficulty.js';
import {
  CROWD_PENALTY, DANGER_PERSISTENCE, DEFAULT_HERO, GOAL_STICKINESS, biasBands,
} from '../bot/config.js';
import { TURN_BUDGET, VAULT_LEVEL } from '../sim/balance.js';
import { RETURN_ENABLED } from '../sim/dungeon.js';

// B20 — SIX NAMED STEPS INSTEAD OF A CONTINUOUS SLIDER, and the count is
// even on purpose: there is no middle to park on, so every setting leans
// one way. A dial with `bands` offers exactly these six values and nothing
// between them.
//
// Three things it buys. A player moving one notch sees a change instead of
// a rounding error — half of these dials measured flat across their whole
// old range. A reading is comparable, because "alto" means one number
// rather than wherever the thumb landed. And a sweep has six points to
// visit instead of a continuum to sample.
//
// The shipped value is always ONE OF the six, so opening the Lab can never
// silently move the balance by snapping the thumb to a neighbour.
const BAND_NAMES = [
  'muito baixo', 'baixo', 'médio-baixo', 'médio-alto', 'alto', 'muito alto',
];

// M48 — ONE line, about where the dial IS, not about where it could go.
//
// The panel used to print both directions at 8px, always, so a player read
// two hypotheticals and never a description of their own setting. A dial is
// steered by knowing what it is doing now; the arrows are already on the
// slider.
//
// There is no "untouched" state any more: every bias dial opens on a notch,
// rolled once per visitor (see `rolledNotches`), so the row always has a
// real setting to describe and the old "calibrado" sentence describes a
// state that can no longer happen.
function effectLine(dial, index) {
  return dial.says[notchOf(index)];
}

function notchOf(index) {
  return Math.max(0, Math.min(5, Number(index)));
}

// The colour the sentence is written in, by which way the notch leans. The
// ⬆️/🔻 pair that M48 replaced carried this for free — a red triangle for the
// low end, a blue arrow for the high one — and losing it made six sentences
// read as one flat block. `band-0` is the extreme low end, `band-5` the
// extreme high one; the two middle notches stay dim, because they are the
// ones that are not saying anything strong.
function bandClass(index) {
  return `band-${notchOf(index)}`;
}

// EVERY VISITOR GETS A DIFFERENT BOT, and they get it without choosing.
//
// The panel used to open on "calibrado" — the measured centre, which no
// notch offers — so every first session watched the same bot and the dials
// only mattered to whoever went looking. Rolling one notch per dial makes
// the personality part of what you arrive to, not a thing you have to hunt
// for, and the six sentences under the sliders explain the bot you actually
// got rather than one you might build.
//
// ROLLED ONCE, then kept. "First session" is taken literally: the draw is
// stored, so coming back tomorrow is the same bot, and only a cleared store
// gets a new one. A reroll on every reload would make the thing unwatchable
// as a habit — you could never say "mine is the greedy one".
//
// `Math.random()` is fine here and banned three directories away: this is
// `src/ui/`, it runs once before any run is built, and what it produces is
// a dial value like any the player could have dragged to. Determinism is
// about `src/sim/` — same seed AND same dials still replays exactly.
const NOTCHES_KEY = 'rogulidle-notches';

function rolledNotches(keys) {
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(NOTCHES_KEY) || 'null');
  } catch {
    // Private browsing, quota, corrupt JSON — fall through to a fresh roll
    // that simply does not persist, the same way score.js degrades.
    stored = null;
  }

  const out = {};
  let complete = true;
  for (const key of keys) {
    const v = stored && Number(stored[key]);
    if (Number.isInteger(v) && v >= 0 && v < BAND_NAMES.length) out[key] = v;
    else { out[key] = Math.floor(Math.random() * BAND_NAMES.length); complete = false; }
  }

  // Written back when anything was missing, so a dial added later joins the
  // stored personality instead of rerolling the whole thing every load.
  if (!complete) {
    try {
      localStorage.setItem(NOTCHES_KEY, JSON.stringify(out));
    } catch { /* as above */ }
  }
  return out;
}

function bandIndexOf(bands, value) {
  let best = 0;
  for (let i = 1; i < bands.length; i++) {
    if (Math.abs(bands[i] - value) < Math.abs(bands[best] - value)) best = i;
  }
  return best;
}

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
// `range`. `type: 'switch'` is the third shape: a checkbox for a dial that
// is on or off rather than more or less, and it reads back a BOOLEAN.
//
// `note(values)` is the escape hatch for a dial whose consequence is not
// readable off its own number: it gets the WHOLE form back and returns one
// line, recomputed on every edit. Two things need it — where the strength
// ramp saturates (a fact about `strength` AND `strengthGrowth` together),
// and whether a `Cap` dial is reachable at all within ten floors, which is
// how three of them turned out to be doing nothing.
//
// Titles are prefixed by AXIS on purpose. "Quantidade:" dials move how many
// creatures a floor holds; "Força:" dials move how strong they may be. The
// two families read almost identically otherwise — both are a per-floor
// slope with a cap — and that is exactly what made them impossible to tell
// apart before.
//
// Reads a `min(cap, perLevel × andar)` pair back to the player as the floor
// it starts biting on — or says it never does. Every dial named "…máxima"
// in this file is that shape, and a cap the slope cannot reach in ten
// floors is inert, however alarming its number looks.
function capNote(perLevelKey, capKey, levels = 10) {
  return (values) => {
    const perLevel = values.model[perLevelKey];
    const cap = values.model[capKey];
    if (!(perLevel > 0)) return 'inativo — a inclinação é 0';
    const reach = perLevel * (levels - 1);
    if (reach < cap) {
      return `inativo — a inclinação só chega a ${reach.toFixed(2)} no andar ${levels}`;
    }
    return `ativo do andar ${Math.ceil(cap / perLevel) + 1} em diante`;
  };
}

// Behaviour comes first, because a hero is the thing you change to see a
// different run of the same dungeon; the map is the dungeon itself.
//
// The groups inside it are unnamed on purpose: three rows do not need to be
// sorted into two piles, and the sub-headings were labelling one row each.
export const SECTIONS = [
  ['Comportamento', [
    ['', [
      {
        // M47 — every dial on this panel is now the SAME shape: a ±80% bias
        // around a centre the player cannot select. `centre` is the value
        // the bot is calibrated at; the six bands are that value times
        // `biasBands()`. One notch means the same thing on every row, which
        // is what made these comparable at all.
        kind: 'hero', key: 'bravery', label: 'quanto ele subestima a vida de uma criatura',
        title: 'Coragem', icon: '💪', bias: true,
        // One sentence per notch, describing a behaviour that is VISIBLE on
        // screen — `objectives.md` says a choice you cannot recognise by
        // watching for thirty seconds was not a choice. Six written phrases
        // rather than an adverb glued to two: the glue produced things like
        // "muito só teme o que está colado".
        // Six sentences about the SAME misjudgement in both directions: he
        // cannot see health, only the number over the head, so every one of
        // these is a guess he is making about how long the thing takes to
        // kill — and the extremes are wrong far more often than they are
        // right.
        says: [
          'acha tudo mais duro do que é — foge de rato',
          'superestima o inimigo; recusa luta que ganharia',
          'desconfia um pouco do que vê',
          'aposta que o bicho cai um pouco mais rápido',
          'encara como se todo mundo fosse frágil',
          'acha que tudo morre em dois golpes — e às vezes morre ele',
        ],
      },
      {
        // The only centre that is COMPUTED rather than chosen: greed
        // multiplies `CHEST_VALUE_HP`, which is the chest's expected value
        // in hp and follows the loot chance and the item table on its own.
        // So this dial's centre 1.0 means "price a chest at exactly what it
        // is worth", and the bands are honest over- and under-valuing.
        kind: 'hero', key: 'sideAppetite', label: 'quanto o herói super ou subestima um baú',
        title: 'Ganância', icon: '🤑', bias: true,
        says: [
          'nenhum baú vale o desvio — segue reto para a saída',
          'só abre baú que está no caminho',
          'desvia por loot de vez em quando',
          'desvia por loot com frequência',
          'anda e briga por baú — paga caro por loot',
          'vai atrás de qualquer baú, custe o que custar',
        ],
      },
    ]],
    ['', [
      {
        // `menace = mordida × persistence^distância`, so a HIGHER value
        // makes menace persist further — more cautious. The old name
        // (`DANGER_FALLOFF`) said the opposite and the arrows followed it.
        kind: 'bot', key: 'persistence', label: 'quanto do perigo sobrevive a cada tile de distância',
        title: 'Cautela', icon: '👀', bias: true,
        says: [
          'só enxerga perigo colado nele — passa raspando em tudo',
          'desvia pouco; passa perto demais',
          'mantém alguma distância das criaturas',
          'dá volta em quem parece perigoso',
          'evita o entorno inteiro de cada criatura',
          'trata o andar todo como ameaça — anda muito para não chegar perto',
        ],
      },
    ]],
  ]],
  ['Mapa', [
    ['quantas criaturas', [
      {
        kind: 'model', key: 'monstersBase', label: 'criaturas no andar 1',
        title: 'Quantidade: criaturas no andar 1', step: 1,
        up: 'abertura mais brutal', down: 'abertura mais mansa',
      },
      {
        kind: 'model', key: 'monsterGrowth', label: 'crescimento por andar',
        title: 'Quantidade: crescimento por andar', step: 0.01, range: [1, 1.3],
        up: 'descida mais íngreme', down: 'descida mais plana (<1 esvazia o fundo)',
      },
      {
        kind: 'model', key: 'spreadPerLevel', label: 'sorteio do andar: largura por andar',
        title: 'Quantidade: variação por andar', step: 0.01, range: [0, 0.3],
        up: 'lotação mais imprevisível — cheio ou vazio',
        down: 'lotação mais regular — sempre a média',
      },
      {
        kind: 'model', key: 'spreadCap', label: 'sorteio do andar: teto',
        title: 'Quantidade: variação máxima', step: 0.05, range: [0, 1],
        up: 'fundo mais caótico', down: 'fundo mais previsível',
        note: capNote('spreadPerLevel', 'spreadCap'),
      },
    ]],
    ['quão fortes', [
      {
        kind: 'model', key: 'strength', label: 'teto da tabela no andar 1 (0..1)',
        title: 'Força: teto no andar 1', step: 0.01, range: [0, 1],
        up: 'início mais cruel', down: 'início mais inofensivo',
      },
      {
        kind: 'model', key: 'strengthGrowth', label: 'crescimento do teto por andar',
        title: 'Força: ritmo de subida do teto', step: 0.01, range: [1, 1.4],
        up: 'escalada mais violenta — satura antes', down: 'escalada mais morna',
        // The one number nobody can read off the dial: past the floor where
        // the ramp hits the table's top row, every deeper floor has the SAME
        // ceiling and only the creature count still grows.
        note: (values) => {
          // Ten FLOORS, always — the return switch changes how many
          // traversals cross them, not how deep the dungeon goes.
          const at = saturatedAt(values.model, 10);
          return at
            ? `satura no andar ${at} — do ${at} ao 10 o teto é sempre t-rex`
            : 'não satura: o teto ainda sobe no andar 10';
        },
      },
    ]],
    ['quanto varia', [
      {
        kind: 'model', key: 'tierFloorPerLevel', label: 'piso do tier: sobe por andar',
        title: 'Força: piso sobe por andar', step: 0.01, range: [0, 0.2],
        up: 'andares mais uniformes — fundo sem ratos', down: 'andares mais desiguais',
      },
      {
        kind: 'model', key: 'tierFloorCap', label: 'piso do tier: teto (share)',
        title: 'Força: piso máximo', step: 0.05, range: [0, 1],
        up: 'fundo mais homogêneo', down: 'fundo mais bagunçado',
        note: capNote('tierFloorPerLevel', 'tierFloorCap'),
      },
      {
        kind: 'model', key: 'tierSlackPerLevel', label: 'folga acima do teto: por andar',
        title: 'Força: folga acima do teto', step: 0.01, range: [0, 0.5],
        up: 'mais traiçoeiro — surpresas acima do esperado',
        down: 'mais honesto — nunca passa do teto',
        // Whole table ROWS, so it is the doubled share FLOORED: anything
        // under 0.5 at floor 10 rounds to zero rows and the dial does
        // nothing at all. That was true of the shipped value for a while.
        note: (values) => {
          const rows = Math.floor(Math.min(
            values.model.tierSlackCap, values.model.tierSlackPerLevel * 9,
          ) * 2);
          return rows > 0
            ? `chega a +${rows} linha${rows > 1 ? 's' : ''} no andar 10`
            : 'inativo — não chega a +1 linha inteira em 10 andares';
        },
      },
      {
        kind: 'model', key: 'tierSlackCap', label: 'folga acima do teto: máx (share)',
        title: 'Força: folga máxima', step: 0.05, range: [0, 1],
        up: 'fundo mais perigoso', down: 'fundo mais controlado',
        note: capNote('tierSlackPerLevel', 'tierSlackCap'),
      },
      {
        kind: 'model', key: 'earlyTierCut', label: 'corte do andar 1 (linhas da tabela)',
        title: 'Força: desconto só do andar 1', step: 1, range: [0, 3],
        up: 'tutorial mais generoso', down: 'tutorial mais seco (0 = sem desconto)',
      },
      {
        kind: 'model', key: 'outOfDepthChancePerLevel', label: 'cauda rara: chance por andar',
        title: 'Raro: chance por andar', step: 0.005, range: [0, 0.05],
        up: 'mais assustador — repinta um monstro no topo da tabela',
        down: 'mais justo (0 = nunca acontece)',
        note: (values) => {
          const at10 = Math.min(
            values.model.outOfDepthChanceCap, values.model.outOfDepthChancePerLevel * 9,
          );
          return `${(at10 * 100).toFixed(1)}% no andar 10 — repinta 1 monstro, não adiciona`;
        },
      },
      {
        kind: 'model', key: 'outOfDepthChanceCap', label: 'cauda rara: teto',
        title: 'Raro: chance máxima', step: 0.01, range: [0, 0.3],
        up: 'fundo mais imprevisível', down: 'fundo mais confiável',
        note: capNote('outOfDepthChancePerLevel', 'outOfDepthChanceCap'),
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
    // The map's own SHAPE — how much dungeon there is and how far the exit
    // sits. Everything in the group below decides what gets PLACED on that
    // shape; nothing there changes the rooms themselves.
    ['forma do mapa', [
      {
        // Retitled when roomBias landed. "quantidade de salas" was true while
        // this was the only shape dial; with a second one beside it the two
        // titles collided, and this is the one that stopped being about
        // rooms — it decides how much dungeon there is, not what shape it
        // comes back in.
        kind: 'model', key: 'dugPercentage', label: 'quanto do grid é escavado',
        title: 'Mapa: tamanho da masmorra', step: 0.01, range: [0.05, 0.35],
        up: 'mais andar para percorrer — e o vault deixa de caber',
        down: 'andar menor e mais linear',
      },
      {
        kind: 'model', key: 'roomBias', label: 'preferência por sala sobre corredor',
        title: 'Mapa: salas vs. corredores', step: 0.5, range: [1, 6],
        up: 'a mesma escavação vira sala — laterais sem labirinto',
        down: '1 = o sorteio cru do ROT, muito corredor',
      },
      {
        kind: 'model', key: 'corridorMin', label: 'comprimento do corredor',
        title: 'Mapa: distância entre salas', step: 1, range: [1, 5],
        up: 'salas mais afastadas, mais rocha entre elas',
        down: 'salas coladas, quase encostando',
      },
      {
        kind: 'model', key: 'shrineDistanceShare', label: 'quão longe fica o buraco de descida',
        title: 'Mapa: distância do buraco', step: 0.05, range: [0, 1],
        up: 'travessia mais longa — o buraco no ponto mais distante',
        down: 'travessia mais curta — o buraco pode cair perto',
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
    ['o retorno', [
      {
        kind: 'run', key: 'theReturn', label: 'subir de volta depois do fundo',
        title: 'A volta para casa', type: 'switch',
        up: 'ligado — 19 travessias, cada andar duas vezes',
        down: 'desligado — 10 travessias, só a descida',
      },
    ]],
    ['a sala do Butcher', [
      {
        // A switch over the ENGINE's own dial rather than a second flag
        // beside it: `vaultLevel` names the floor, and 0 means no vault
        // anywhere. Off restores the game exactly as it was before the
        // vault existed — the stamp is the only thing on that branch that
        // touches what the game does, so skipping it skips all of it.
        kind: 'model', key: 'vaultLevel', label: 'sala fixa com o Butcher no andar 4',
        title: 'O Butcher', type: 'switch', onValue: VAULT_LEVEL, offValue: 0,
        up: `ligado — andar ${VAULT_LEVEL} ganha a sala 9x9, o troll e 6 baús`,
        down: 'desligado — o jogo volta ao que era antes da sala existir',
      },
    ]],
  ]],
];

const BOT_DEFAULTS = {
  persistence: DANGER_PERSISTENCE, crowdPenalty: CROWD_PENALTY, stickiness: GOAL_STICKINESS,
};
const RUN_DEFAULTS = { turnBudget: TURN_BUDGET, theReturn: RETURN_ENABLED, who: '' };


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
  // `who` has NO DIAL — the rail picks the hero now (src/ui/roster.js) — but
  // dial-overrides.json must still be able to ship a default hero to every
  // visitor. This loop only fills keys some dial claims, so the one key with
  // no control of its own is seeded here or the overrides file silently
  // stops being able to set it.
  out.run.who = defaultOf('run', 'who', overrides);
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

// Fills `container` with the form and returns `{ read }`.
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
  // Dials with a `note`. Every one is recomputed on every edit, because a
  // note reads the WHOLE form — the saturation line moves when `strength`
  // changes, not only when `strengthGrowth` does.
  const notes = [];


  // Which sections a player may touch. The map belongs to whoever ships
  // `dial-overrides.json`: a value moved there changes the game for every
  // visitor, and the panel is the only place it can be moved from, so
  // leaving the map dials on the open page means the shipped balance is
  // whatever the last person to touch a slider decided. The bot is the
  // opposite — it IS the choice the product is about, and moving it costs
  // nobody but the person moving it.
  //
  // Not a hiding trick: the map values still APPLY, they are simply not
  // editable. `read()` below starts from the resolved defaults, so an
  // override reaches the run whether or not its slider was drawn.
  const sections = dev ? SECTIONS : SECTIONS.filter(([name]) => name === 'Comportamento');

  // One notch per bias dial, drawn once per visitor and kept — see
  // `rolledNotches`. Collected across ALL sections, not just the drawn ones,
  // so opening dev mode later does not reroll the personality.
  const notches = rolledNotches(
    SECTIONS.flatMap(([, gs]) => gs.flatMap(([, list]) => list))
      .filter((d) => d.bias)
      .map((d) => d.key),
  );

  for (const [section, groups] of sections) {
    const sectionEl = document.createElement('div');
    sectionEl.className = 'dial-section';
    sectionEl.dataset.section = section;
    container.append(sectionEl);

    const h2 = document.createElement('h2');
    h2.textContent = section;
    sectionEl.append(h2);

    for (const [group, list] of groups) {
      // A section whose whole content is one row has nothing to subdivide,
      // so it names its group '' and gets no heading — an empty <h3> would
      // still take its margin and open a gap under the title.
      if (group) {
        const h3 = document.createElement('h3');
        h3.textContent = group;
        sectionEl.append(h3);
      }

      for (const dial of list) {
        const {
          kind, key, label, title, icon, step, range, up, down, type, note,
          onValue, offValue, bias,
        } = dial;
        const isSwitch = type === 'switch';
        // A switch normally carries a boolean. `onValue`/`offValue` let one
        // stand in front of a dial whose off position is a NUMBER — the
        // vault's floor, where 0 means "nowhere" — so the engine keeps a
        // single dial instead of growing a flag beside it.
        const onOff = onValue !== undefined
          ? { on: onValue, off: offValue }
          : { on: true, off: false };
        const def = defaultOf(kind, key, overrides);
        // M47 — a `bias` dial offers the SHIPPED value times each of the six
        // bands, and nothing between. The centre is `def` itself, and it is
        // deliberately not on the list — the two inner notches straddle it,
        // so any setting the player picks is a lean.
        //
        // The centre comes from `defaultOf`, not from a code constant, so a
        // value pinned in dial-overrides.json is what the bands are built
        // around. Reading the constant instead put Pressa's bands an order
        // of magnitude below what actually ships.
        const bands = bias
          ? biasBands().map((b) => +(def * b).toPrecision(3))
          : undefined;
        const min = range ? range[0] : (MIN_OF[key] ?? 0);
        const max = range ? range[1] : undefined;

        const row = document.createElement('div');
        row.className = 'dial';

        const head = document.createElement('div');
        head.className = 'dial-head';
        if (icon) {
          const ic = document.createElement('span');
          ic.className = 'dial-icon';
          ic.textContent = icon;
          head.append(ic);
        }
        const caption = document.createElement('label');
        caption.className = 'dial-title';
        caption.textContent = title || label;
        // The long wording and the dial's real name both moved to the
        // tooltip. A row is three lines now — name, slider, what it is doing
        // — and a fourth line of prose above the control was the panel
        // reading as a document instead of a set of controls.
        caption.title = `${label}\n${key}`;
        head.append(caption);

        row.append(head);

        let input;
        let valueOut;
        if (isSwitch) {
          const track = document.createElement('div');
          track.className = 'dial-switch';
          input = document.createElement('input');
          input.type = 'checkbox';
          input.checked = Boolean(def);
          valueOut = document.createElement('span');
          valueOut.className = 'dial-value';
          valueOut.textContent = input.checked ? 'ligado' : 'desligado';
          track.append(input, valueOut);
          row.append(track);
        } else if (bands) {
          // A slider over INDICES, not over the value: six stops, nothing
          // between them, and the readout says which stop rather than what
          // number — the number is shown after it so a reading can still be
          // written down.
          const track = document.createElement('div');
          track.className = 'dial-slider';
          input = document.createElement('input');
          input.type = 'range';
          input.step = '1';
          input.min = '0';
          input.max = String(bands.length - 1);
          // Opens on the ROLLED notch: this visitor's own bot, decided
          // before they arrived rather than by them dragging anything.
          input.value = String(notches[key] ?? 2);
          // NO READOUT beside the slider. "médio-baixo · -16%" was two
          // pieces of jargon standing where the eye wants the control, and
          // both are already answered elsewhere: which notch, by where the
          // thumb is; what it does, by the sentence below. The raw number a
          // measurement would quote lives in the slider's own tooltip.
          input.title = String(def);
          track.append(input);
          row.append(track);
        } else if (range) {
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
        if (bands) {
          // One live sentence about the current notch, coloured by which way
          // that notch leans.
          effect.textContent = effectLine(dial, input.value);
          effect.classList.add(bandClass(input.value));
        } else {
          const upSpan = document.createElement('span');
          upSpan.textContent = `⬆️ ${up}`;
          const downSpan = document.createElement('span');
          downSpan.textContent = `🔻 ${down}`;
          effect.append(upSpan, downSpan);
        }
        row.append(effect);

        if (note) {
          const noteEl = document.createElement('div');
          noteEl.className = 'dial-note';
          row.append(noteEl);
          notes.push({ el: noteEl, note });
        }

        input.addEventListener('input', () => {
          // Yellow means "not what ships", which is the one thing a reader
          // has to be able to see at a glance in a page full of numbers.
          // A bias dial counts as changed the moment it is TOUCHED, because
          // there is no notch that means "leave it alone".
          if (bands) input.dataset.touched = '1';
          const isChanged = isSwitch
            ? input.checked !== Boolean(def)
            : bands
              ? true
              : Number(input.value) !== def;
          input.classList.toggle('changed', isChanged);
          if (bands) {
            // The live sentence IS the readout now, so this has to run
            // whether or not a value box exists — it used to sit inside the
            // `valueOut` guard, and a banded dial no longer has one.
            input.title = `${BAND_NAMES[Number(input.value)]} · ${bands[Number(input.value)]}`;
            effect.textContent = effectLine(dial, input.value);
            effect.className = `dial-effect ${bandClass(input.value)}`;
          }
          if (valueOut) {
            valueOut.textContent = isSwitch
              ? (input.checked ? 'ligado' : 'desligado')
              : Number(input.value).toFixed(precisionOf(step));
            valueOut.classList.toggle('changed', isChanged);
          }
          // Runs at event time, long after `refreshNotes` below is bound.
          refreshNotes();
        });

        sectionEl.append(row);
        inputs.push({
          kind, key, input, def, min, valueOut, step, isSwitch, onOff, bands,
        });
      }
    }
  }

  const buttons = document.createElement('div');
  buttons.className = 'dial-buttons';
  const restart = document.createElement('button');
  restart.type = 'button';
  restart.textContent = '↻ reiniciar com estes valores';
  buttons.append(restart);
  container.append(buttons);

  // NO "padrões" BUTTON. It restored the calibrated centre, and there is no
  // centre to go back to any more — every dial opens on this visitor's own
  // rolled notch, so "default" would have meant a state the panel can no
  // longer be in. Undo is the slider itself.
  restart.addEventListener('click', () => { if (onRestart) onRestart(); });

  // Read twice-guarded, because `min` on the element only stops the
  // spinner: a typed or pasted "-1" still reads back happily. A blank or
  // nonsense field falls back to the shipped value rather than handing NaN
  // to the generator, which would fail somewhere far from here.
  //
  // A negative is not merely a strange dungeon — a negative danger persistence
  // flips the sign of a tile's price, and a router that can pay LESS by
  // walking further never finishes. The bot clamps its own prices too
  // (src/bot/bot.js); this is the half that keeps the number out of the
  // engine in the first place, so the form and the run agree on what was
  // asked for.
  const read = () => {
    // Starts from what SHIPS, not from an empty object: sections the page
    // did not draw (the map, outside dev mode) have no inputs to read, and
    // an empty `model` would send makeFloorPlan to the code defaults and
    // silently discard every override in dial-overrides.json.
    const out = resolvedDefaults(overrides);
    for (const {
      kind, key, input, def, min, isSwitch, onOff, bands,
    } of inputs) {
      if (isSwitch) {
        out[kind][key] = input.checked ? onOff.on : onOff.off;
        continue;
      }
      if (bands) {
        // Always the band under the thumb. There is no "untouched" reading
        // left: the slider opens on a real notch, so what is on screen and
        // what the run gets are the same thing at every moment.
        out[kind][key] = bands[Math.max(0, Math.min(bands.length - 1, Number(input.value)))];
        continue;
      }
      const value = Number(input.value);
      out[kind][key] = Number.isFinite(value) ? Math.max(min, value) : def;
    }
    return out;
  };

  // Every note reads the whole form, so they all refresh together. A note
  // that throws must not take the panel down with it — it is commentary,
  // not the value.
  const refreshNotes = () => {
    if (!notes.length) return;
    const values = read();
    for (const { el: noteEl, note } of notes) {
      try {
        noteEl.textContent = note(values);
      } catch {
        noteEl.textContent = '';
      }
    }
  };
  refreshNotes();

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
        kind, key, input, min, isSwitch, onOff, bands,
      } of inputs) {
        if (!input.classList.contains('changed')) continue;
        if (isSwitch) {
          merged[kind] = merged[kind] || {};
          merged[kind][key] = input.checked ? onOff.on : onOff.off;
          continue;
        }
        if (bands) {
          // The FILE keeps values, never indices — a band list that changes
          // later must not silently re-point an override at another number.
          merged[kind] = merged[kind] || {};
          merged[kind][key] = bands[Math.max(0, Math.min(bands.length - 1, Number(input.value)))];
          continue;
        }

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

  return { read };
}
