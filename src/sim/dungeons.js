// THE DUNGEONS — docs/project/candidates.md, U14 ("As 8 masmorras").
//
// A dungeon is a CONFIGURATION, not a branch: the same rule CLAUDE.md states
// for heroes and for "a harder dungeon tier is a model handed to
// makeFloorPlan". Each entry here is read by `dungeonModel`, which turns the
// shipped model into that dungeon's model and nothing else; the generator,
// the engine and the bot never learn that dungeons exist.
//
// Three binary axes, no middle (docs/project/trade-offs.md, pillar 3):
//
//   creatures  🐺 pack  — many weak, in bands     🐉 beast — few strong, alone
//   chests     📦 plenty — many poor chests        💎 relic — few rich ones
//   light      ☀️ clear  — today's sight           🌑 dark  — less sight
//
// `light` is the floor's `sight` (src/sim/game.js): dark sets it, clear
// leaves the shipped fog. A persona's own sight still wins, so the scholar
// sees the whole floor in the dark — which is what makes him worth it there.
//
// THE VALUES ARE DESIGN, NOT CALIBRATION. The owner's call (2026-10-04): the
// difficulty of each dungeon is computed later, and the budget test that
// does it will move these numbers. Today they say the theme.
//
// `masmorra` is the game as shipped — the DCSS main branch, "the Dungeon" —
// and must stay EMPTY: `dungeonModel` hands its model back untouched, which
// is what keeps every reading of the shipped game comparable to before this
// file existed. Same rule as `HEROES.base`.

import { MAP_THEME_LAYOUTS } from './balance.js';
import {
  anchorAt, floorStrength, makeFloorPlan, massOfPlan, monstersAt, tierFloorShare, tierSlack,
} from './difficulty.js';

// The theme names the owner uses, onto MAP_THEME_LAYOUTS' indices — so a
// curve below reads as words, and a reordering of that table cannot silently
// repaint every dungeon.
const THEME = {
  padrao: MAP_THEME_LAYOUTS.indexOf(null),
  cripta: MAP_THEME_LAYOUTS.indexOf('uniform'),
  grade: MAP_THEME_LAYOUTS.indexOf('rogue'),
  caverna: MAP_THEME_LAYOUTS.indexOf('cave'),
  anel: MAP_THEME_LAYOUTS.indexOf('ring'),
  central: MAP_THEME_LAYOUTS.indexOf('hub'),
};

// The five stretches every dungeon's curve is written in — the same five the
// shipped dial-overrides.json uses, so a dungeon changes WHAT is on a
// stretch and never where the stretches fall. Floor 4 is the Butcher's in
// every one: his room is stamped whatever the theme (there is a test).
export const STRETCHES = [1, 4, 5, 8, 10];

// The two creature poles, per stretch where the value moves with depth.
//
// ONLY THE COUNT IS DECLARED (owner, 2026-10-04): a dungeon redistributes
// the shipped budget, for loot too. The drop chance and the strength are
// DERIVED from the count in `dungeonModel` — weapons per floor and threat
// mass per stretch stay the shipped ones. Two counts sit at the edge of
// what that allows, because the creature table has ends: on floor 1 every
// creature is already the weakest tier, so a pack of more than six cannot
// weigh as little as today's five; on floor 10 every creature is already
// the strongest, so a beast floor cannot hold fewer than today's seven —
// and on floors 8–9 not fewer than five, or the stretch cannot reach the
// shipped mass (the test sums every floor of it).
const AXES = {
  creatures: {
    pack: {
      monstersBase: { 1: 6, 4: 10, 5: 10, 8: 11, 10: 11 },
      // The LARGEST band — each one draws its size from 2 up to this
      // (spawn.js). 12 only worked while the zone quota cut every band to
      // strays anyway.
      clusterSize: 4,
      // M6 — a band arrives as a band (rules.md §3).
      packWake: true,
    },
    beast: {
      monstersBase: { 1: 3, 4: 3, 5: 3, 8: 5, 10: 7 },
      clusterSize: 1,
    },
  },
  chests: {
    plenty: { chests: 10, chestLootChance: 0.35 },
    relic: { chests: 3, chestLootChance: 0.95 },
  },
  // Clear is the shipped fog and sets nothing — the viewport is exactly the
  // shipped reach, so seeing FARTHER than today would need a bigger board.
  light: {
    clear: {},
    dark: { sight: 7 },
  },
};

const ICON = {
  pack: '🐺', beast: '🐉', plenty: '📦', relic: '💎', clear: '☀️', dark: '🌑',
};

// What each pole means, in a few words, for the tooltip beside the name.
const MEANING = {
  pack: 'muitas criaturas fracas, em bando',
  beast: 'poucas criaturas fortes, sozinhas',
  plenty: 'muito baú, pouco em cada',
  relic: 'pouco baú, quase sempre bom',
  clear: 'vê longe',
  dark: 'vê pouco',
};

// No board is bigger than the shipped one (owner, 2026-11-04): the turn
// budget and the coin rate are both per traversal, so a larger board was a
// harder dungeon by exhaustion and a poorer one by coin — Floresta at 40
// lost over half its runs to the clock. A dungeon may be SMALLER.
export const DUNGEONS = {
  masmorra: {
    name: 'masmorra',
    title: 'Masmorra',
    blurb: 'A masmorra de sempre: cavernas no começo, o porco no quatro, criptas e salões até o fundo.',
  },
  minas: {
    name: 'minas', title: 'Minas', dcss: 'Orcish Mines',
    blurb: 'Hordas de orcs em túneis iluminados, equipamento por todo canto.',
    creatures: 'pack', chests: 'plenty', light: 'clear',
    themes: { 1: 'caverna', 4: 'grade', 5: 'caverna', 8: 'caverna', 10: 'central' },
    map: {
      dugPercentage: 0.30, mapSize: 32, roomScale: 0.8, roomBias: 2, corridorMin: 3,
      shrineDistanceShare: 0.7, spineThreatShare: 0.4, sideChestBias: 6, chestMix: 0.3,
    },
  },
  esgoto: {
    name: 'esgoto', title: 'Esgoto', dcss: 'Sewer',
    blurb: 'Ratos e pragas no escuro, entulho em cada canto.',
    creatures: 'pack', chests: 'plenty', light: 'dark',
    themes: { 1: 'padrao', 4: 'grade', 5: 'padrao', 8: 'cripta', 10: 'anel' },
    map: {
      dugPercentage: 0.20, mapSize: 32, roomScale: 0.6, roomBias: 1, corridorMin: 5,
      shrineDistanceShare: 0.8, spineThreatShare: 0.5, sideChestBias: 4, chestMix: 0.7,
    },
  },
  arena: {
    name: 'arena', title: 'Arena', dcss: 'Arena',
    blurb: 'Onda atrás de onda, por um prêmio só.',
    creatures: 'pack', chests: 'relic', light: 'clear',
    themes: { 1: 'central', 4: 'grade', 5: 'central', 8: 'anel', 10: 'central' },
    map: {
      dugPercentage: 0.30, mapSize: 30, roomScale: 1.4, roomBias: 6, corridorMin: 1,
      shrineDistanceShare: 0.4, spineThreatShare: 0.6, sideChestBias: 2, chestMix: 0.5,
      hubBranches: 6, hubRings: 2,
    },
  },
  ossario: {
    name: 'ossario', title: 'Ossário', dcss: 'Ossuary',
    blurb: 'Mortos aos montes no breu, guardando as últimas relíquias.',
    creatures: 'pack', chests: 'relic', light: 'dark',
    themes: { 1: 'cripta', 4: 'grade', 5: 'cripta', 8: 'cripta', 10: 'central' },
    map: {
      dugPercentage: 0.22, mapSize: 32, roomScale: 0.8, roomBias: 4, corridorMin: 2,
      shrineDistanceShare: 0.6, spineThreatShare: 0.3, sideChestBias: 10, chestMix: 0.6,
    },
  },
  floresta: {
    name: 'floresta', title: 'Floresta', dcss: 'Enchanted Forest',
    blurb: 'Feras grandes ao ar livre, coisa espalhada pelo caminho.',
    creatures: 'beast', chests: 'plenty', light: 'clear',
    themes: { 1: 'caverna', 4: 'caverna', 5: 'caverna', 8: 'anel', 10: 'caverna' },
    map: {
      dugPercentage: 0.35, mapSize: 32, roomScale: 1.5, roomBias: 5, corridorMin: 1,
      shrineDistanceShare: 0.9, spineThreatShare: 0.2, sideChestBias: 5, chestMix: 0.6,
    },
  },
  covil: {
    name: 'covil', title: 'Covil', dcss: 'Lair of Beasts',
    blurb: 'Algo grande dorme no escuro, cercado de restos.',
    creatures: 'beast', chests: 'plenty', light: 'dark',
    themes: { 1: 'caverna', 4: 'caverna', 5: 'caverna', 8: 'caverna', 10: 'central' },
    map: {
      dugPercentage: 0.30, mapSize: 30, roomScale: 1.2, roomBias: 4, corridorMin: 2,
      shrineDistanceShare: 0.5, spineThreatShare: 0.2, sideChestBias: 9, chestMix: 0.4,
    },
  },
  cofres: {
    name: 'cofres', title: 'Cofres', dcss: 'Vaults',
    blurb: 'Salas trancadas e iluminadas, guardiões fortes, o melhor saque.',
    creatures: 'beast', chests: 'relic', light: 'clear',
    themes: { 1: 'grade', 4: 'grade', 5: 'anel', 8: 'central', 10: 'anel' },
    map: {
      dugPercentage: 0.22, mapSize: 32, roomScale: 1.3, roomBias: 6, corridorMin: 3,
      shrineDistanceShare: 0.7, spineThreatShare: 0.2, sideChestBias: 10, chestMix: 0.3,
      hubBranches: 4, hubRings: 2,
    },
  },
  tumba: {
    name: 'tumba', title: 'Tumba', dcss: 'Tomb of the Ancients',
    blurb: 'Poucos e antigos no breu, sentados sobre tesouros.',
    creatures: 'beast', chests: 'relic', light: 'dark',
    themes: { 1: 'cripta', 4: 'grade', 5: 'cripta', 8: 'anel', 10: 'central' },
    map: {
      dugPercentage: 0.18, mapSize: 28, roomScale: 1.0, roomBias: 4, corridorMin: 4,
      shrineDistanceShare: 1.0, spineThreatShare: 0.2, sideChestBias: 10, chestMix: 0.5,
    },
  },
};

export const DEFAULT_DUNGEON = 'masmorra';

// The Lab's selector stores a NUMBER (every dial is a number), and a run's
// config — receipts included — carries it. So this order is APPEND-ONLY:
// reordering it would replay every stored run in a different dungeon.
export const DUNGEON_ORDER = [
  'masmorra', 'minas', 'esgoto', 'arena', 'ossario', 'floresta', 'covil', 'cofres', 'tumba',
];

// A dungeon from either spelling — the name a command line types, or the
// index the Lab stores. Anything else is the shipped dungeon.
export function dungeonName(value) {
  if (typeof value === 'number') return DUNGEON_ORDER[Math.round(value)] || DEFAULT_DUNGEON;
  return DUNGEONS[value] ? value : DEFAULT_DUNGEON;
}

// Unknown or missing names are the shipped dungeon, the same forgiving rule
// `heroByName` uses: a stale name in a stored config plays the game rather
// than breaking it.
export function dungeonByName(name) {
  return DUNGEONS[dungeonName(name)];
}

// The three glyphs a dungeon is read by, in axis order. Empty for the
// shipped dungeon, which sits on no axis.
export function dungeonIcons(name) {
  const d = dungeonByName(name);
  return [d.creatures, d.chests, d.light].filter(Boolean).map((pole) => ICON[pole]);
}

// `[glyph, meaning]` per axis, for the HUD's tooltip.
export function dungeonLegend(name) {
  const d = dungeonByName(name);
  return [d.creatures, d.chests, d.light].filter(Boolean).map((pole) => [ICON[pole], MEANING[pole]]);
}

// The shipped model, turned into this dungeon's. One anchor per stretch,
// each written WHOLE (docs/map-design.md): `anchorAt` continues whatever
// curve `model` already carries to that floor, and the dungeon's values go
// on top. So the dungeon inherits everything it does not name — the economy
// (E2's pair) and the tier curve stay exactly the shipped ones.
export function dungeonModel(model = {}, name = DEFAULT_DUNGEON) {
  const d = dungeonByName(name);
  if (!d.themes) return model;

  const creatures = AXES.creatures[d.creatures];
  const chests = AXES.chests[d.chests];
  const light = AXES.light[d.light];
  const today = makeFloorPlan(model);
  const floors = STRETCHES.map((from) => {
    const base = anchorAt(model, from);
    const count = creatures.monstersBase[from];
    const shipped = today(from);
    return {
      ...base,
      ...d.map,
      ...chests,
      ...light,
      monstersBase: count,
      clusterSize: creatures.clusterSize,
      packWake: creatures.packWake ?? false,
      // Weapons come only from dead creatures, so the drop chance carries
      // the ratio the count changed: creatures × chance stays the shipped
      // product. `weaponScarcity` is untouched — it is E2's pair.
      dropChance: Math.min(1,
        shipped.dropChance * shipped.monsters / monstersAt(count, base.monsterGrowth, 0)),
      strength: strengthFor({ ...base, monstersBase: count }, from, today),
      mapTheme: THEME[d.themes[from]],
      from,
    };
  });
  return { ...model, floors };
}

// The strength that makes this anchor's STRETCH weigh what the shipped
// stretch weighs (`massOfPlan`, the generator's own measure) — summed over
// every floor up to the next anchor, not matched on the anchor alone. On the
// anchor alone a pack floor 1 sat at the weakest tier and stayed there for
// its whole stretch while the shipped floors 2–3 climbed, so the pack
// dungeons were lighter where the run is decided. A plain search over the
// share in thousandths — the mass climbs in steps as the tier ceiling
// crosses table rows, so there is no closed form, and the closest step is
// the answer. Lowest on a tie, so the result never drifts between runs.
function strengthFor(anchor, from, today) {
  const next = STRETCHES.find((f) => f > from) ?? 11;
  const steps = [];
  for (let f = from; f < next; f++) steps.push(f - from);
  const target = steps.reduce((sum, step) => sum + massOfPlan(today(from + step)), 0);
  const massAt = (strength) => steps.reduce((sum, step) => sum + massOfPlan({
    monsters: monstersAt(anchor.monstersBase, anchor.monsterGrowth, step),
    difficultyScale: floorStrength(step, { ...anchor, strength }),
    tierFloorShare: tierFloorShare(step, anchor),
    tierSlack: tierSlack(step, anchor),
  }), 0);
  let best = 0;
  let bestGap = Infinity;
  for (let i = 0; i <= 1000; i++) {
    const gap = Math.abs(massAt(i / 1000) - target);
    if (gap < bestGap) { best = i / 1000; bestGap = gap; }
  }
  return best;
}
