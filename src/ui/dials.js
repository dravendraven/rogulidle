// The dial lab: every number the map generator and the bot run on, as a
// form, built once and reused wherever index.html opens the Lab button.
//
// NOTHING HERE PERSISTS and nothing here writes to balance.js. This is a
// "what if" — a value worth keeping is still a docs/balance.md + code edit
// (CLAUDE.md). `src/sim/` and `src/bot/` never import this file; the page
// reads it and hands the result to makeFloorPlan / makeBot when a run
// starts, which is the same door a sweep already used.

import {
  anchorAt, DEFAULT_MODEL, floorSpread, floorStrength, monstersAt, saturatedAt,
  tierFloorShare,
} from '../sim/difficulty.js';
import { MONSTER_TABLE } from '../sim/balance.js';
import { VAULT_MARGIN } from '../sim/vault.js';
import {
  CROWD_PENALTY, DANGER_PERSISTENCE, DEFAULT_HERO, GOAL_STICKINESS, biasBands,
} from '../bot/config.js';
import {
  corridorRange, MAP_SIZE, ROOM_HEIGHT, ROOM_WIDTH, roomRange,
  TURN_BUDGET, VAULT_LEVEL, VAULT_SIZE,
} from '../sim/balance.js';
import { LEVELS, RETURN_ENABLED } from '../sim/dungeon.js';

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

// ONE live line for ANY dial, not just the banded ones.
//
// M48 made the bot's dials describe where they ARE instead of printing both
// directions, and the reason it gave applies to the whole panel: a player
// steers by knowing what the dial is doing now, and the arrows are already
// on the slider. The rest of the panel kept the ⬆️/🔻 pair for another few
// months, so half the rows answered "what does this do" and half answered
// "what could it do", in the same column, at the same size.
//
// Three shapes, and the dial picks by what it declares:
//   says: [...]        phrases across the dial's own range — index 0 is its
//                      minimum, the last is its maximum. Six for a banded
//                      dial (one per notch); any length for a slider.
//   says: (v) => str   computed, when a NUMBER is the honest answer. Gets
//                      the whole form, same as `note`.
//   note only          a dial whose arithmetic already says it (the map's).
function effectLine(dial, index, values) {
  const { says } = dial;
  if (typeof says === 'function') return says(values);
  if (!Array.isArray(says) || !says.length) return '';
  return says[phraseOf(dial, index, says.length)];
}

// Which phrase the thumb is standing on. A banded dial's value IS the index
// already; a slider's has to be located inside its range first.
function phraseOf(dial, index, count) {
  const raw = Number(index);
  if (dial.bias) return Math.max(0, Math.min(count - 1, raw));
  if (dial.type === 'switch') return raw ? count - 1 : 0;
  const [min, max] = dial.range ?? [0, 1];
  const at = max > min ? (raw - min) / (max - min) : 0;
  return Math.max(0, Math.min(count - 1, Math.round(at * (count - 1))));
}

// The colour the sentence is written in, on the same 0..5 scale for every
// dial — so "this one is at its low end" reads the same whether the dial has
// six notches or a continuous range.
function notchOf(index) {
  return Math.max(0, Math.min(5, Number(index)));
}

function bandOf(dial, index) {
  if (dial.bias) return notchOf(index);
  if (dial.type === 'switch') return Number(index) ? 5 : 0;
  const [min, max] = dial.range ?? [0, 1];
  const at = max > min ? (Number(index) - min) / (max - min) : 0;
  return notchOf(Math.round(Math.max(0, Math.min(1, at)) * 5));
}

// The colour the sentence is written in, by which way the notch leans. The
// ⬆️/🔻 pair that M48 replaced carried this for free — a red triangle for the
// low end, a blue arrow for the high one — and losing it made six sentences
// read as one flat block. `band-0` is the extreme low end, `band-5` the
// extreme high one; the two middle notches stay dim, because they are the
// ones that are not saying anything strong.
function bandClass(dial, index) {
  return `band-${bandOf(dial, index)}`;
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
// ***** the live lines the creature and loot dials say *****
//
// Every one of these answers with what the dial does at the DEEP end, or
// across the whole descent — because that is the part the slider's own
// number cannot show, and it is where these dials are actually felt. A line
// that only restated the number under the thumb would be furniture.
//
// LAST FLOOR, zero-based, so a line reads "no andar 10". Ten floors is the
// dungeon (dungeon.js's LEVELS); the return switch changes how many
// traversals cross them, not how deep it goes.
const LAST = 9;

// THE STRETCH THE ROW IS TALKING ABOUT. A sentence under a dial describes
// the segment that dial belongs to, so its far end is the floor before the
// next anchor — not floor 10 — and its step count is how many floors that
// is, not nine. Every line here said "no andar 10" and counted nine steps,
// which was true while there was only ever one anchor.
function span(values) {
  const from = values.curve ? values.curve.editFloor : 1;
  const to = values.curve ? values.curve.until : LAST + 1;
  return { from, to, steps: Math.max(0, to - from) };
}

// Which creature sits at a 0..1 position up the bestiary. What "strength
// 0.26" means is unreadable; "o teto do andar 1 é o boar" is not.
function creatureAt(share) {
  const at = Math.max(0, Math.min(1, share));
  return MONSTER_TABLE[Math.round(at * (MONSTER_TABLE.length - 1))].name;
}

const pct = (n) => `${Math.round(n * 100)}%`;

// EVERY FLOOR NAMED HERE IS THE ONE ON SCREEN, not floor 1. These sentences
// were written when a dial was a statement about the top of the dungeon;
// under an anchor at floor 5 the same words described the wrong floor, which
// is worse than saying nothing.
function countSays(values) {
  const m = values.model;
  const { from, to, steps } = span(values);
  if (!steps) return `${m.monstersBase} criaturas no andar ${from}`;
  const deep = monstersAt(m.monstersBase, m.monsterGrowth, steps);
  return `${m.monstersBase} criaturas no andar ${from}, ${deep} no andar ${to}`;
}

function spreadSays(values) {
  const { to, steps } = span(values);
  const at = floorSpread(steps, values.model);
  return at > 0
    ? `no andar ${to} a lotação varia ±${pct(at)} — cheio ou vazio`
    : 'todo andar tem exatamente a lotação da conta';
}

function ceilingSays(values) {
  const m = values.model;
  const { from, to, steps } = span(values);
  if (!steps) return `o teto do andar ${from} é o ${creatureAt(floorStrength(0, m))}`;
  return `o teto do andar ${from} é o ${creatureAt(floorStrength(0, m))}, `
    + `o do ${to} é o ${creatureAt(floorStrength(steps, m))}`;
}

function tierFloorSays(values) {
  const m = values.model;
  const { to, steps } = span(values);
  const share = tierFloorShare(steps, m);
  const bottom = floorStrength(steps, m) * share;
  return share > 0
    ? `no andar ${to} nada abaixo do ${creatureAt(bottom)} aparece`
    : `rato pode aparecer no andar ${to}`;
}

function earlyCutSays(values) {
  const m = values.model;
  const rows = m.earlyTierCut;
  const from = values.curve.editFloor;
  if (!rows) return `o andar ${from} não ganha desconto nenhum`;
  const full = creatureAt(floorStrength(0, m));
  return `sem o corte o teto do andar ${from} seria o ${full} — desce ${rows} linha`
    + `${rows > 1 ? 's' : ''}`;
}

// Two dials answer this one, which is the point: how many chests pay is
// their product, and neither slider can show it alone.
function chestSays(values) {
  const m = values.model;
  const paying = m.chests * m.chestLootChance;
  return `${m.chests} baús por andar, ~${paying.toFixed(1)} com algo dentro`;
}

function chestMixSays(values) {
  const potion = Math.max(0, Math.min(1, values.model.chestMix));
  return `${pct(1 - potion)} escudo, ${pct(potion)} poção`;
}

// Same shape as the chests: the rate a corpse arms the hero is the drop
// chance TIMES the weapon's share of that draw, and the two live on
// different sliders.
function weaponSays(values) {
  const m = values.model;
  const armed = m.dropChance * (1 / Math.max(0.5, m.weaponScarcity));
  return `~${pct(armed)} dos corpos deixam uma arma`;
}

function dropSays(values) {
  const m = values.model;
  return `${pct(m.dropChance)} dos corpos deixam algo — desses, `
    + `1 em ${m.weaponScarcity.toFixed(1)} é arma`;
}

// The two map notes. Both are ARITHMETIC on the dial's own value, never a
// recorded measurement — CLAUDE.md's rule about written-down numbers going
// stale applies to a caption as much as to a doc, and a note that quoted
// "the vault survives 88% of the time" would be wrong the first time
// anything else moved.
//
// What the digging costs, in tiles. The border ring is never dug, so the
// grid the percentage applies to is (MAP_SIZE − 2)². Naming the block the
// vault needs is the point: it is the one consequence of this dial that a
// percentage cannot show you, and it is why the wire fires.
function dugNote(values) {
  const usable = (MAP_SIZE - 2) * (MAP_SIZE - 2);
  const dug = Math.round((values.model.dugPercentage ?? 0) * usable);
  const block = VAULT_SIZE + 2 * VAULT_MARGIN;
  return `≈${dug} dos ${usable} tiles escavados — o vault precisa de um bloco `
    + `${block}×${block} de rocha intacta no que sobrar`;
}

// The pair the generator actually gets, since the slider only carries the
// minimum and the span is fixed in balance.js.
function corridorNote(values) {
  const [min, max] = corridorRange(values.model.corridorMin);
  return `corredores de ${min} a ${max} tiles`;
}

// The scale is a multiplier, which is the honest shape for "one number
// moving four", but a multiplier is not something you can picture. The
// note is: it prints the tiles the generator will actually be asked for.
function roomNote(values) {
  const [wMin, wMax] = roomRange(ROOM_WIDTH, values.model.roomScale);
  const [hMin, hMax] = roomRange(ROOM_HEIGHT, values.model.roomScale);
  return `salas de ${wMin}–${wMax} × ${hMin}–${hMax} tiles`;
}

// The grid is square, so the interesting number is not the side but the
// AREA the digging then divides — that is what the room count tracks.
// Stated against the shipped grid so a change reads as "twice the floor"
// rather than as a number with no scale attached.
function mapNote(values) {
  const side = values.model.mapSize ?? MAP_SIZE;
  const area = (side - 2) * (side - 2);
  const base = (MAP_SIZE - 2) * (MAP_SIZE - 2);
  return `${side}×${side} — ${(area / base).toFixed(2)}× o andar de hoje, `
    + 'e a travessia cresce junto';
}

// Reads a `min(cap, perLevel × andar)` pair back to the player as the floor
// it starts biting on — or says it never does. Every dial named "…máxima"
// in this file is that shape, and a cap the slope cannot reach in ten
// floors is inert, however alarming its number looks.
function capNote(perLevelKey, capKey, startKey) {
  return (values) => {
    const perLevel = values.model[perLevelKey];
    const cap = values.model[capKey];
    const start = values.model[startKey] ?? 0;
    const { from, to, steps } = span(values);
    if (!(perLevel > 0)) {
      return start >= cap ? `já no teto desde o andar ${from}` : 'inativo — a inclinação é 0';
    }
    const reach = start + perLevel * steps;
    if (reach < cap) {
      return `inativo — a inclinação só chega a ${reach.toFixed(2)} no andar ${to}`;
    }
    return `ativo do andar ${from + Math.ceil((cap - start) / perLevel)} em diante`;
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
    ]],
    ['', [
      {
        // C1 §1 — THE DIAL THAT DECIDES HOW THE HERO WALKS, and the one that
        // finally moves survival: across its bands deaths per run go 0.98 to
        // 0.40, against depth 4.14 to 2.80. Nothing else in this panel trades
        // living for going deep.
        //
        // It prices two things per turn in one unit — what can HIT him, and
        // how much more of the map a step OPENS — so one sentence covers the
        // whole dial: how much a turn near danger or near the unknown is
        // worth, counted in steps.
        //
        // IT TOOK THIS ROW FROM `persistence`, which used to be called
        // Cautela and is now a decided constant off the panel. That was the
        // owner's call and the argument is one line: exposure IS
        // `Σ persistence^distância`, so persistence is a parameter INSIDE the
        // number caution multiplies. Two dials on one quantity — the M47
        // confusion, which this project has now paid for twice.
        kind: 'hero', key: 'caution', label: 'quanto vale um turno perto do perigo ou do desconhecido',
        title: 'Cautela', icon: '🛡️', bias: true,
        says: [
          'passa colado em tudo e entra no escuro sem olhar',
          'aceita raspar numa criatura para encurtar caminho',
          'prefere o caminho limpo quando é parecido',
          'anda mais para não passar perto nem abrir o desconhecido',
          'dá voltas largas e só explora o que precisa',
          'desvia até de rato — vive mais e chega bem menos fundo',
        ],
      },
    ]],
  ]],
  // Split out of a single 'Mapa' section that had grown to hold the
  // bestiary, the loot table AND the geometry — someone opening the Lab to
  // change the floor's shape met the monster table first and had to scroll
  // past all of it. The four names below are the four questions the panel
  // actually answers.
  // THE CURVE'S ANCHORS, at the top of the dials they govern rather than
  // inside one of them. They steer which floor every model row below is
  // describing — Criaturas, Loot AND Andar, which is why they sit above all
  // three instead of in the map's panel where the idea started.
  //
  // `kind: 'curve'` marks them as panel state: read() skips them, the save
  // button skips them, and nothing downstream ever sees them.
  ['A curva', [
    ['', [
      {
        kind: 'curve', key: 'editFloor', label: 'andar que os dials abaixo descrevem',
        title: 'Andar', step: 1, range: [1, 10],
        says: (v) => (v.curve.isAnchor
          ? `os dials abaixo descrevem o andar ${v.curve.editFloor} e você pode movê-los`
          : `os dials abaixo mostram o que a curva produz no andar `
            + `${v.curve.editFloor} — cinza, porque quem manda aqui é uma âncora acima`),
      },
      {
        kind: 'curve', key: 'isAnchor', label: 'começar uma curva nova neste andar',
        title: 'Âncora aqui', type: 'switch',
        says: (v) => {
          const { editFloor, isAnchor, until } = v.curve;
          if (!isAnchor) return 'este andar segue a curva de uma âncora acima';
          const reach = editFloor === until
            ? `só o andar ${editFloor}`
            : `os andares ${editFloor} a ${until}`;
          const above = editFloor > 1 ? `; 1 a ${editFloor - 1} não mudam` : '';
          return `${reach} seguem estes dials${above}`;
        },
      },
    ]],
  ]],
  ['Criaturas', [
    ['quantas criaturas', [
      {
        kind: 'model', key: 'monstersBase',
        label: (v) => `criaturas no andar ${v.curve.editFloor}`,
        title: (v) => `Quantidade: criaturas no andar ${v.curve.editFloor}`,
        step: 1, range: [1, 20],
        says: countSays,
      },
      {
        // The old down-text advertised "<1 esvazia o fundo" against a
        // slider whose minimum is 1 — describing a value the control cannot
        // produce, which is the sort of thing that teaches people the
        // captions are decorative.
        kind: 'model', key: 'monsterGrowth', label: 'crescimento por andar',
        title: 'Quantidade: crescimento por andar', step: 0.01, range: [1, 1.3],
        says: countSays,
      },
      // PAIRS: every "…por andar" is the RITMO — how fast the effect
      // arrives — and every "…máxima" is where it STOPS. The two read
      // almost identically otherwise, and six different adjectives for two
      // axes is what made them impossible to tell apart.
      {
        kind: 'model', key: 'spreadPerLevel', label: 'sorteio do andar: largura por andar',
        title: 'Quantidade: variação por andar', step: 0.01, range: [0, 0.3],
        says: spreadSays,
      },
      {
        kind: 'model', key: 'spreadCap', label: 'sorteio do andar: teto',
        title: 'Quantidade: variação máxima', step: 0.05, range: [0, 1],
        says: spreadSays,
        note: capNote('spreadPerLevel', 'spreadCap', 'spreadStart'),
      },
    ]],
    ['quão fortes', [
      {
        kind: 'model', key: 'strength',
        label: (v) => `teto da tabela no andar ${v.curve.editFloor} (0..1)`,
        title: (v) => `Força: teto no andar ${v.curve.editFloor}`,
        step: 0.01, range: [0, 1],
        says: ceilingSays,
      },
      {
        kind: 'model', key: 'strengthGrowth', label: 'crescimento do teto por andar',
        title: 'Força: ritmo de subida do teto', step: 0.01, range: [1, 1.4],
        says: ceilingSays,
        // The one number nobody can read off the dial: past the floor where
        // the ramp hits the table's top row, every deeper floor has the SAME
        // ceiling and only the creature count still grows.
        note: (values) => {
          // `saturatedAt` counts STEPS from the model's own base, so what it
          // returns is an offset into this segment, not a floor of the
          // dungeon. It was read as a floor while there was only one anchor
          // and the two were the same number.
          const { from, to, steps } = span(values);
          const at = saturatedAt(values.model, steps + 1);
          if (!at) return `não satura: o teto ainda sobe no andar ${to}`;
          const floor = from + at - 1;
          return floor >= to
            ? `satura no andar ${floor}, o último deste trecho`
            : `satura no andar ${floor} — do ${floor} ao ${to} o teto é sempre t-rex`;
        },
      },
    ]],
    ['quanto varia', [
      {
        kind: 'model', key: 'tierFloorPerLevel', label: 'piso do tier: sobe por andar',
        title: 'Força: piso sobe por andar', step: 0.01, range: [0, 0.2],
        says: tierFloorSays,
      },
      {
        kind: 'model', key: 'tierFloorCap', label: 'piso do tier: teto (share)',
        title: 'Força: piso máximo', step: 0.05, range: [0, 1],
        says: tierFloorSays,
        note: capNote('tierFloorPerLevel', 'tierFloorCap', 'tierFloorStart'),
      },
      {
        kind: 'model', key: 'tierSlackPerLevel', label: 'folga acima do teto: por andar',
        title: 'Força: folga acima do teto', step: 0.01, range: [0, 0.5],
        // Whole table ROWS, so it is the doubled share FLOORED: anything
        // under 0.5 at floor 10 rounds to zero rows and the dial does
        // nothing at all. That was true of the shipped value for a while.
        note: (values) => {
          const { to, steps } = span(values);
          const rows = Math.floor(Math.min(values.model.tierSlackCap,
            (values.model.tierSlackStart ?? 0)
            + values.model.tierSlackPerLevel * steps) * 2);
          return rows > 0
            ? `chega a +${rows} linha${rows > 1 ? 's' : ''} no andar ${to}`
            : `inativo — não chega a +1 linha inteira até o andar ${to}`;
        },
      },
      {
        kind: 'model', key: 'tierSlackCap', label: 'folga acima do teto: máx (share)',
        title: 'Força: folga máxima', step: 0.05, range: [0, 1],
        note: capNote('tierSlackPerLevel', 'tierSlackCap', 'tierSlackStart'),
      },
      {
        kind: 'model', key: 'earlyTierCut',
        label: (v) => `corte do andar ${v.curve.editFloor} (linhas da tabela)`,
        title: (v) => `Força: desconto só do andar ${v.curve.editFloor}`,
        step: 1, range: [0, 3],
        says: earlyCutSays,
      },
      {
        kind: 'model', key: 'outOfDepthChancePerLevel', label: 'cauda rara: chance por andar',
        title: 'Raro: chance por andar', step: 0.005, range: [0, 0.05],
        note: (values) => {
          const { to, steps } = span(values);
          const deep = Math.min(values.model.outOfDepthChanceCap,
            (values.model.outOfDepthChanceStart ?? 0)
            + values.model.outOfDepthChancePerLevel * steps);
          return `${(deep * 100).toFixed(1)}% no andar ${to} — repinta 1 monstro, não adiciona`;
        },
      },
      {
        kind: 'model', key: 'outOfDepthChanceCap', label: 'cauda rara: teto',
        title: 'Raro: chance máxima', step: 0.01, range: [0, 0.3],
        note: capNote('outOfDepthChancePerLevel', 'outOfDepthChanceCap', 'outOfDepthChanceStart'),
      },
    ]],
    ['quão agrupadas', [
      {
        kind: 'model', key: 'clusterSize', label: 'criaturas por grupo (1 = sem grupo)',
        title: 'Agrupamento de criaturas', step: 1, range: [1, 20],
        says: (v) => (v.model.clusterSize <= 1
          ? 'cada criatura sorteada e posta sozinha'
          : `matilhas de até ${v.model.clusterSize}, e cada uma é UM sorteio de tier`),
      },
    ]],
  ]],
  ['Loot', [
    ['quanto loot', [
      {
        kind: 'model', key: 'chests', label: 'baús por andar',
        title: 'Baús por andar', step: 1, range: [0, 20],
        says: chestSays,
      },
      {
        kind: 'model', key: 'chestLootChance', label: 'chance de o baú ter algo',
        title: 'Baú: quantos vêm cheios', step: 0.05, range: [0, 1],
        says: chestSays,
      },
      {
        // Replaced `armourScarcity` + `potionScarcity`. Those two were sold
        // as "1 em S" and had stopped being a rate at M46 — for chests only
        // their RATIO survives, so moving both together did nothing at all
        // and moving one did the opposite of what it said. One slider is
        // the honest shape of the one live degree of freedom.
        kind: 'model', key: 'chestMix', label: 'escudo ⟷ poção',
        title: 'Baú: o que vem dentro', step: 0.05, range: [0, 1],
        says: chestMixSays,
      },
      {
        // Still a genuine rate, unlike the chest pair above: a corpse's
        // draw KEEPS its empty slot, so raising this really does make
        // weapons rarer rather than swapping them for something else.
        kind: 'model', key: 'weaponScarcity', label: 'escassez de arma (1 em S)',
        title: 'Raridade de arma', step: 0.5, range: [1, 10],
        says: weaponSays,
      },
      {
        kind: 'model', key: 'dropChance', label: 'chance de corpo largar algo',
        title: 'Chance de drop', step: 0.05, range: [0, 1],
        says: dropSays,
      },
    ]],
  ]],
  // NOT a dial of the dungeon — a dial of the WATCHING. Everything in Andar
  // below describes what a floor is; this decides which one you are shown.
  // They were in one section and the two questions read as one.
  ['Simulação', [
    ['', [
      {
        kind: 'run', key: 'startFloor', label: 'começar a descida neste andar',
        title: 'Começar no andar', step: 1, range: [1, 10],
        says: (v) => (v.run.startFloor <= 1
          ? 'a descida começa no andar 1, como no jogo'
          : `pula direto para o andar ${v.run.startFloor} — e o herói chega `
            + 'de mãos vazias, então isso mostra a FORMA do andar, não o custo'),
      },
    ]],
  ]],
  ['Andar', [
    // The map's own SHAPE — how much dungeon there is and how far the exit
    // sits. Everything in the group below decides what gets PLACED on that
    // shape; nothing there changes the rooms themselves.
    ['forma do mapa', [
      {
        // M51 — the thematic catalogue, and THE ONE layout selector: the
        // hubEvery/ringEvery modulo rows that used to sit beside it were
        // deleted (owner: "os dials do gerador estão mega confusos").
        // Testing an identity is dragging to it and restarting; per-FLOOR
        // themes are the curve's job — an anchor carries its own mapTheme
        // (model.floors), which is how the narrative arc file works. The
        // names live in MAP_THEME_LAYOUTS (balance.js) and this row must
        // match its order.
        kind: 'model', key: 'mapTheme', label: 'tema do mapa (0 = padrão)',
        title: 'Tema do mapa', step: 1, range: [0, 6],
        says: (v) => {
          const names = [
            'padrão — o gerador clássico, o jogo de sempre',
            'cripta — salas regulares e corredores curtos, ordenado',
            'grade — salas em grade 3×3 ligadas às vizinhas, com loops',
            'caverna — aberto e orgânico, sem salas de verdade',
            'anel — o ciclo de duas rotas',
            'central — sala do meio e braços',
            'sorteio — um tema por andar, do seed',
          ];
          return names[Math.round(v.model.mapTheme ?? 0)] ?? 'padrão';
        },
      },
      {
        kind: 'model', key: 'hubBranches', label: 'salas no anel (só no tema central)',
        title: 'Quantos ramos', step: 1, range: [2, 8],
        // Reads the THEME, not a `model.layout` that never existed — the
        // old check compared against a key no model carries, so this line
        // said "inativo" even on a hub floor.
        says: (v) => (Math.round(v.model.mapTheme ?? 0) === 5
          ? `${v.model.hubBranches} caminhos saindo da sala inicial`
          : 'inativo — o tema do mapa não é o central'),
      },
      {
        kind: 'model', key: 'hubRings', label: 'anéis de salas (só no tema central)',
        title: 'Quantos anéis', step: 1, range: [1, 2],
        says: (v) => {
          if (Math.round(v.model.mapTheme ?? 0) !== 5) return 'inativo — o tema do mapa não é o central';
          const total = 1 + v.model.hubBranches * v.model.hubRings;
          return v.model.hubRings > 1
            ? `${total} salas, e o anel de fora força salas menores`
            : `${total} salas — centro mais um anel`;
        },
      },
      {
        // Retitled when roomBias landed. "quantidade de salas" was true while
        // this was the only shape dial; with a second one beside it the two
        // titles collided, and this is the one that stopped being about
        // rooms — it decides how much dungeon there is, not what shape it
        // comes back in.
        // The "Mapa:" prefix these four carried is gone. It earned its place
        // when they lived inside a section that also held the bestiary; now
        // the section IS called Andar and the group heading says "forma do
        // mapa", so the prefix was the third time in a row the reader was
        // told the same thing. The creature dials keep THEIR prefixes for
        // the opposite reason — "Quantidade:" and "Força:" are two families
        // sitting in one group, and nothing else tells them apart.
        kind: 'model', key: 'dugPercentage', label: 'quanto do grid é escavado',
        title: 'Tamanho da masmorra', step: 0.01, range: [0.05, 0.35],
        note: dugNote,
      },
      {
        // THE dial for how many places a floor has. dugPercentage and
        // roomBias argue about how much area becomes floor; this one
        // divides the result, and measured it moves the count further than
        // both of them together.
        //
        // Capped at 44 rather than left open: `SIGHT_WHOLE_MAP`
        // (src/sim/heroes.js) is MAP_SIZE × 2 and covers the diagonal of a
        // 45-tile grid, so a bigger map would quietly blind the one persona
        // that is supposed to see everything.
        kind: 'model', key: 'mapSize', label: 'lado do grid em tiles',
        title: 'Tamanho do andar', step: 2, range: [24, 44],
        note: mapNote,
      },
      {
        kind: 'model', key: 'roomScale', label: 'multiplicador do tamanho da sala',
        title: 'Salas grandes ou pequenas', step: 0.1, range: [0.5, 1.5],
        note: roomNote,
      },
      {
        kind: 'model', key: 'roomBias', label: 'preferência por sala sobre corredor',
        title: 'Salas vs. corredores', step: 0.5, range: [1, 6],
        says: [
          'tanto corredor quanto sala — é aqui que o andar vira labirinto',
          'ainda sobra bastante túnel',
          'a escavação vira sala mais do que túnel',
          'quase tudo que se cava vira sala',
          'túnel só o mínimo para ligar as salas',
        ],
      },
      {
        kind: 'model', key: 'corridorMin', label: 'comprimento do corredor',
        title: 'Distância entre salas', step: 1, range: [1, 5],
        note: corridorNote,
      },
      {
        kind: 'model', key: 'shrineDistanceShare', label: 'quão longe fica o buraco de descida',
        title: 'Distância do buraco', step: 0.05, range: [0, 1],
        says: [
          'o buraco pode nascer na sala ao lado — dá para descer sem ver nada',
          'o buraco cai em qualquer sala menos as mais próximas',
          'o buraco fica na metade mais distante do andar',
          'só as salas bem distantes servem — a travessia cruza quase tudo',
          'sempre a sala mais distante que existe — o andar inteiro é rota',
        ],
      },
    ]],
    ['quanto a rota ramifica', [
      {
        kind: 'model', key: 'spineThreatShare', label: 'massa de ameaça na espinha',
        title: 'Perigo concentrado na rota principal', step: 0.05, range: [0, 1],
        says: (v) => `${pct(v.model.spineThreatShare)} da ameaça é POSTA na rota `
          + 'obrigatória — o resto espera nas laterais',
      },
      {
        kind: 'model', key: 'sideRoomDepthBonus', label: 'aposta da sala lateral',
        title: 'Risco das salas laterais', step: 0.05, range: [0, 1],
        says: [
          'entrar numa lateral é igual a andar pela rota',
          'a lateral vale um pouco mais e cobra um pouco mais',
          'a lateral vale como um andar mais fundo',
          'a lateral vale como dois andares mais fundo',
          'a lateral é outro jogo — de ninho de ogro a machado de graça',
        ],
      },
      {
        kind: 'model', key: 'sideChestBias', label: 'peso de baú na lateral',
        title: 'Atração de baús para as laterais', step: 0.5, range: [1, 10],
        says: [
          'baú cai onde calhar — a lateral não atrai nada',
          'um pouco mais de baú fora da rota',
          'a maior parte do loot está fora da rota',
          'quase todo baú exige um desvio',
          'passar reto é sair do andar de mãos vazias',
        ],
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
        says: [
          'nenhum andar tem sala autoral — todos são sorteados',
          `o andar ${VAULT_LEVEL} ganha a sala 9x9, o Butcher e os baús dele`,
        ],
      },
    ]],
  ]],
  // The run itself — neither the floor nor what stands on it.
  ['A run', [
    ['tempo', [
      {
        kind: 'run', key: 'turnBudget', label: 'turnos por travessia',
        title: 'Tempo disponível por andar', step: 50, range: [200, 3000],
        says: (v) => `${v.run.turnBudget} turnos por travessia — acabou, a run acaba`,
      },
    ]],
    ['o retorno', [
      {
        kind: 'run', key: 'theReturn', label: 'subir de volta depois do fundo',
        title: 'A volta para casa', type: 'switch',
        says: [
          '10 travessias — a run acaba no fundo',
          '19 travessias — desce até o fundo e volta, cada andar duas vezes',
        ],
      },
    ]],
  ]],
];

const BOT_DEFAULTS = {
  persistence: DANGER_PERSISTENCE, crowdPenalty: CROWD_PENALTY, stickiness: GOAL_STICKINESS,
};
const CURVE_DEFAULTS = { editFloor: 1, isAnchor: true };
const RUN_DEFAULTS = {
  turnBudget: TURN_BUDGET, theReturn: RETURN_ENABLED, who: '', startFloor: 1,
};


// The shipped value of a dial: `overrides` (dial-overrides.json, loaded by
// dial-overrides.js) wins when it sets one, the code constant otherwise —
// so "shipped" always means what a fresh visitor actually gets today, not
// what the source code says in isolation.
function defaultOf(kind, key, overrides = {}) {
  if (kind === 'curve') return CURVE_DEFAULTS[key];
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
        // Panel state, not a value the run has any use for.
        if (kind === 'curve') continue;
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
export function buildDialPanel(container, {
  onRestart, overrides = {}, dev = false, mounts = null, buttonsMount = null,
} = {}) {
  container.innerHTML = '';
  const inputs = [];
  // Dials with a `note`. Every one is recomputed on every edit, because a
  // note reads the WHOLE form — the saturation line moves when `strength`
  // changes, not only when `strengthGrowth` does.
  const notes = [];
  // …and the same for the sentences, for the same reason: a `says` function
  // may read another dial's value, so they cannot repaint one at a time.
  const effects = [];


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

  // WHERE EACH SECTION GOES. `mounts` lets the page put a section somewhere
  // other than the drawer — today that is the map, which the page hangs in
  // the right-hand column under the stats. Anything unnamed lands in
  // `container`, so a page that passes no mounts gets exactly the old panel.
  //
  // The reason it is the PAGE's decision and not this file's: dials.js owns
  // what a dial is, index.html owns where things sit. Hardcoding a column
  // here would put layout in the module that every other page also builds
  // its panel from.
  const mountFor = (name) => (mounts && mounts[name]) || container;
  const used = new Set();

  for (const [section, groups] of sections) {
    const mount = mountFor(section);
    if (!used.has(mount)) { mount.innerHTML = ''; used.add(mount); }

    const sectionEl = document.createElement('div');
    sectionEl.className = 'dial-section';
    sectionEl.dataset.section = section;
    mount.append(sectionEl);

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
          kind, key, label, title, icon, step, range, type, note,
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
        // A TITLE CAN MOVE. Three of them name a floor — "criaturas no andar
        // 1" — and once the curve came in pieces that was a lie on every
        // anchor but the first: the row was describing floor 5 under a
        // heading that said 1. `titleOf` gets the whole form, same as
        // `says`, and is repainted with it.
        caption.textContent = typeof title === 'function' ? title({
          curve: { editFloor: 1, isAnchor: true, until: LEVELS },
        }) : (title || label);
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
          // NOT `Boolean(def)`. A switch whose off position is a STRING —
          // the layout, whose two values are 'digger' and 'hub' — is truthy
          // in both positions, so coercing opened it checked while the
          // value under it said otherwise. Compare against the on value the
          // dial actually declared; only a switch with no onValue at all
          // falls back to the boolean it really carries.
          input.checked = onValue !== undefined ? def === onOff.on : Boolean(def);
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

        // ONE live line, for every dial. A row that has `says` describes
        // itself in words; a row that only has `note` lets the arithmetic do
        // it, which is why the map's dials do not also carry a phrase.
        let effect = null;
        if (dial.says) {
          effect = document.createElement('div');
          effect.className = `dial-effect ${bandClass(dial, isSwitch ? input.checked : input.value)}`;
          row.append(effect);
        }

        let noteEl = null;
        if (note) {
          noteEl = document.createElement('div');
          noteEl.className = 'dial-note';
          row.append(noteEl);
          notes.push({ el: noteEl, note });
        }

        // Bound before the first paint so a `says` FUNCTION can read the
        // whole form — which does not exist until every input is built. The
        // array form does not need it, but running both through one path is
        // what keeps the two shapes interchangeable.
        const paintEffect = (values) => {
          if (!effect) return;
          const at = isSwitch ? input.checked : input.value;
          effect.textContent = effectLine(dial, at, values);
          effect.className = `dial-effect ${bandClass(dial, at)}`;
        };
        effects.push(paintEffect);

        input.addEventListener('input', () => {
          // Yellow means "not what ships", which is the one thing a reader
          // has to be able to see at a glance in a page full of numbers.
          // A bias dial counts as changed the moment it is TOUCHED, because
          // there is no notch that means "leave it alone".
          if (bands) input.dataset.touched = '1';
          const isChanged = isSwitch
            ? (input.checked ? onOff.on : onOff.off) !== def
            : bands
              ? true
              : Number(input.value) !== def;
          input.classList.toggle('changed', isChanged);
          if (bands) {
            input.title = `${BAND_NAMES[Number(input.value)]} · ${bands[Number(input.value)]}`;
          }
          if (valueOut) {
            valueOut.textContent = isSwitch
              ? (input.checked ? 'ligado' : 'desligado')
              : Number(input.value).toFixed(precisionOf(step));
            valueOut.classList.toggle('changed', isChanged);
          }
          // Runs at event time, long after `refreshLive` below is bound.
          refreshLive();
        });

        sectionEl.append(row);
        inputs.push({
          kind, key, input, def, min, valueOut, step, isSwitch, onOff, bands,
          titleEl: (typeof title === 'function' || typeof label === 'function')
            ? caption : null,
          titleOf: typeof title === 'function' ? title : null,
          labelOf: typeof label === 'function' ? label : null,
          key2: key,
        });
      }
    }
  }

  // ***** the curve's anchors *****
  //
  // A model dial no longer holds one number for the whole descent — it holds
  // one per ANCHOR, and the panel shows one anchor at a time. Floor 1 is
  // always an anchor and cannot stop being one: a curve has to start
  // somewhere.
  //
  // A floor that is NOT an anchor still shows every dial, greyed, holding
  // what the active curve produces there. That is the answer to "what is
  // floor 5 actually like", which this panel could not give before — the
  // numbers were all statements about floor 1.
  // FIELDS THAT BELONG TO THE RUN, not to an anchor — difficulty.js's own
  // list, kept in step by name. `anchorAt` strips them from a segment, so a
  // row for one of them painted from the segment showed UNDEFINED: the
  // Butcher's switch read "off" on every floor but the first, while the run
  // it described had him. They always read and write the first anchor, and
  // never grey out — a run-wide answer does not change with the floor you
  // happen to be looking at.
  const RUN_WIDE_KEYS = new Set(['levels', 'vaultLevel', 'vaultChestItems', 'vaultBoss']);
  const modelRows = inputs.filter((i) => i.kind === 'model' && !RUN_WIDE_KEYS.has(i.key));
  const runWideRows = inputs.filter((i) => i.kind === 'model' && RUN_WIDE_KEYS.has(i.key));
  const floorRow = inputs.find((i) => i.kind === 'curve' && i.key === 'editFloor');
  const anchorRow = inputs.find((i) => i.kind === 'curve' && i.key === 'isAnchor');

  // What a row is currently worth, in the shape the model wants. Same three
  // cases read() has, kept beside it rather than shared because read() walks
  // every kind and this one is asked about a single row.
  const valueOfRow = (row) => {
    if (row.isSwitch) return row.input.checked ? row.onOff.on : row.onOff.off;
    if (row.bands) {
      return row.bands[Math.max(0, Math.min(row.bands.length - 1, Number(row.input.value)))];
    }
    const n = Number(row.input.value);
    return Number.isFinite(n) ? Math.max(row.min, n) : row.def;
  };

  const anchors = new Map();
  const curveModel = () => {
    const floors = [...anchors.keys()].sort((a, b) => a - b)
      .map((from) => ({ from, ...anchors.get(from) }));
    // The first anchor is ALSO the model's root, because that is what a
    // model without `floors` has always meant and what every
    // dial-overrides.json written before this carried.
    return { ...anchors.get(1), floors };
  };

  if (floorRow && anchorRow) {
    // Seeded from what ships. `floors` in dial-overrides.json is honoured if
    // it is there; a file without one is a single anchor at floor 1, which
    // is every file that exists today.
    const shipped = resolvedDefaults(overrides).model;
    const shippedFloors = (overrides.model && overrides.model.floors) || [];
    anchors.set(1, { ...shipped });
    for (const seg of shippedFloors) {
      const from = Math.max(1, Math.round(seg.from ?? 1));
      anchors.set(from, { ...(from === 1 ? shipped : anchorAt({ ...shipped, floors: shippedFloors }, from)), ...seg });
      delete anchors.get(from).from;
    }

    const paintRow = (row, value, editable) => {
      if (row.isSwitch) row.input.checked = value === row.onOff.on;
      else if (row.bands) row.input.value = String(bandIndexOf(row.bands, Number(value)));
      else row.input.value = String(value);
      row.input.disabled = !editable;
      if (row.valueOut) {
        row.valueOut.textContent = row.isSwitch
          ? (row.input.checked ? 'ligado' : 'desligado')
          : Number(row.input.value).toFixed(precisionOf(row.step));
      }
      // Greyed the same way disabled inputs are, so a whole column of
      // read-only numbers reads as "this is what it IS" rather than as a
      // form that stopped responding.
      row.input.closest('.dial').classList.toggle('readonly', !editable);
    };

    const applyFloor = (floor) => {
      const isAnchor = anchors.has(floor);
      const values = isAnchor ? anchors.get(floor) : anchorAt(curveModel(), floor);
      for (const row of modelRows) paintRow(row, values[row.key], isAnchor);
      // Always the run's answer, always editable.
      const root = anchors.get(1) || {};
      for (const row of runWideRows) paintRow(row, root[row.key], true);
      anchorRow.input.checked = isAnchor;
      // Floor 1 anchors by definition, so its switch is on and unusable.
      anchorRow.input.disabled = floor <= 1;
      anchorRow.input.closest('.dial').classList.toggle('readonly', floor <= 1);
    };

    floorRow.input.addEventListener('input', () => {
      applyFloor(Number(floorRow.input.value));
      refreshLive();
    });

    anchorRow.input.addEventListener('input', () => {
      const floor = Number(floorRow.input.value);
      if (floor <= 1) { anchorRow.input.checked = true; return; }
      // Ticking SEEDS the anchor with what the curve already produces here,
      // so the act of anchoring changes as little as it can — every number
      // that moves after this is one you moved.
      if (anchorRow.input.checked) anchors.set(floor, anchorAt(curveModel(), floor));
      else anchors.delete(floor);
      applyFloor(floor);
      refreshLive();
    });

    // A model dial writes into the anchor on screen. Registered AFTER the
    // row's own listener, which is why it repaints: that one already ran
    // refreshLive() against the anchor as it was a moment ago.
    for (const row of modelRows) {
      row.input.addEventListener('input', () => {
        const floor = Number(floorRow.input.value);
        if (!anchors.has(floor)) return;
        anchors.get(floor)[row.key] = valueOfRow(row);
        refreshLive();
      });
    }
    // A run-wide row writes to the FIRST anchor whatever floor is on screen,
    // because that is the one makeFloorPlan reads it off.
    for (const row of runWideRows) {
      row.input.addEventListener('input', () => {
        anchors.get(1)[row.key] = valueOfRow(row);
        refreshLive();
      });
    }

    applyFloor(1);
  } else {
    // No curve controls drawn — outside dev mode the map section does not
    // exist. The anchors still come from what SHIPS, the `floors` list
    // included: dial-overrides.json is "for EVERY visitor" (CLAUDE.md), and
    // this branch used to seed one bare anchor — which silently dropped the
    // file's curve for everyone outside dev mode. Found the first time a
    // floors list actually shipped: the visitor's floor 1 was not the cave
    // the file asked for. Same seeding as the dev branch above.
    const shipped = resolvedDefaults(overrides).model;
    const shippedFloors = (overrides.model && overrides.model.floors) || [];
    anchors.set(1, { ...shipped });
    for (const seg of shippedFloors) {
      const from = Math.max(1, Math.round(seg.from ?? 1));
      anchors.set(from, { ...(from === 1 ? shipped : anchorAt({ ...shipped, floors: shippedFloors }, from)), ...seg });
      delete anchors.get(from).from;
    }
  }

  // OUTSIDE the drawer when the page offers somewhere. `.dials` scrolls at
  // 70vh, so buttons appended into it sat below thirty rows of sliders and
  // you had to scroll the whole form to reach "reiniciar" — the one control
  // you press after every edit.
  const buttonBar = buttonsMount || container;
  if (buttonsMount) buttonsMount.innerHTML = '';
  const buttons = document.createElement('div');
  buttons.className = 'dial-buttons';
  const restart = document.createElement('button');
  restart.type = 'button';
  restart.textContent = '↻ reiniciar com estes valores';
  buttons.append(restart);
  buttonBar.append(buttons);

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
      // Panel state — which floor is on screen, and whether it anchors.
      // Never a value the run receives.
      if (kind === 'curve') continue;
      // A model dial belongs to the ANCHOR being edited, not to one flat
      // model. `anchors` below owns them; this loop only reads the rest.
      if (kind === 'model') continue;
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
    // The model, in pieces. The first anchor is the model's root — that is
    // what makeFloorPlan treats as "the segment from floor 1" and what a
    // dial-overrides.json without `floors` has always been — and every
    // anchor, including that one, is repeated in the list.
    out.model = curveModel();
    return out;
  };

  // Every live line — the sentences AND the computed notes — reads the whole
  // form, so they all refresh together on any edit. One read() for the lot,
  // rather than one per row.
  //
  // A line that throws must not take the panel down with it: it is
  // commentary, not the value.
  // What the live lines are told. Deliberately NOT what read() gives the
  // run: on a floor that is not an anchor the dials show the curve's output
  // there, and a sentence under them has to describe that, not floor 1.
  const formValues = () => {
    const out = read();
    const floor = floorRow ? Number(floorRow.input.value) : 1;
    // Where this anchor's reach ENDS: the floor before the next anchor, or
    // the bottom. Printed so "nothing I do here touches the floors above"
    // is on screen rather than something to be trusted.
    const next = [...anchors.keys()].sort((a, b) => a - b).find((f) => f > floor);
    out.curve = {
      editFloor: floor,
      isAnchor: anchors.has(floor),
      until: next ? next - 1 : LEVELS,
    };
    out.model = anchors.has(floor)
      ? { ...anchors.get(floor) }
      : anchorAt(curveModel(), floor);
    return out;
  };

  const refreshLive = () => {
    const values = formValues();
    for (const row of inputs) {
      if (!row.titleEl) continue;
      try {
        if (row.titleOf) row.titleEl.textContent = row.titleOf(values);
        if (row.labelOf) row.titleEl.title = `${row.labelOf(values)}
${row.key2}`;
      } catch { /* commentary, not the value */ }
    }
    if (!notes.length && !effects.length) return;
    for (const paint of effects) {
      try {
        paint(values);
      } catch { /* commentary, not the value */ }
    }
    for (const { el: noteEl, note } of notes) {
      try {
        noteEl.textContent = note(values);
      } catch {
        noteEl.textContent = '';
      }
    }
  };
  refreshLive();

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
    buttonBar.append(note);

    save.addEventListener('click', () => {
      // Starts from what was already shipped (`overrides`), not from an
      // empty object — a value pinned in an earlier session and never
      // touched today must not be dropped just because this form never
      // re-marks it "changed" (it can't be changed from a default it IS).
      const merged = JSON.parse(JSON.stringify(overrides));
      for (const {
        kind, key, input, min, isSwitch, onOff, bands,
      } of inputs) {
        // Panel state, never a shipped value.
        if (kind === 'curve') continue;
        // A model dial belongs to an ANCHOR, and only one anchor is on
        // screen — writing the visible row into a flat `model` would ship
        // whichever floor happened to be selected as if it were floor 1.
        // The whole curve goes below instead.
        if (kind === 'model') continue;
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

      // THE CURVE, whole. Every anchor's full set of values rather than a
      // diff: an anchor is only meaningful complete, and a file that carried
      // half of one would inherit the rest from code defaults that may have
      // moved since. The first anchor doubles as the model's root, which is
      // what a file without `floors` has always been.
      const floors = curveModel().floors;
      merged.model = { ...(anchors.get(1) || {}) };
      if (floors.length > 1) merged.model.floors = floors;
      else delete merged.model.floors;

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
