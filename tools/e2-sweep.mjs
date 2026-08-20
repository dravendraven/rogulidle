// The E2 sweep: one CELL of the economy experiment, printed as JSON.
//
// E2 is a PAIR (docs/backlog.md): cut shallow loot AND bridge the income to
// the axe. This tool plays chained sessions (src/analysis/chain.js — the
// real instrument, the real shop drain) under one candidate configuration
// and reports the FIRST-KILL DISTRIBUTION against the vault boss, which is
// the metric the backlog names. It is an experiment tool like
// dial-sweep.mjs, not a metrics surface: nothing here ships, and the cells
// it measures are candidates for the owner to watch, never conclusions.
//
// Usage — one JSON argument, every key optional:
//
//   node tools/e2-sweep.mjs '{"name":"cut+axe10",
//     "chains":12, "length":60, "firstSeed":500000,
//     "cut":{"chestLootChance":0.25,"weaponScarcity":8},
//     "axePrice":10, "coinRate":30,
//     "rung":{"name":"adrenaline","price":10},
//     "hero":{"sideAppetite":0.2,"bravery":1.8}}'
//
//   cut      — applied to the model ROOT and to every `floors` anchor with
//              from < 4, i.e. floors 1–3 only (the from:4 anchor and below
//              keep the shipped values). Anchors stay written whole.
//   axePrice — mutates the axe's SHOP price for this process only.
//   coinRate — handled by tools/e2-coin-hook.mjs, per process, at load.
//   rung     — adds one ITEM_TABLE item to the shelf at a price.
//   hero     — bot-trait overrides (the band re-measure: greed-min etc.).
//
// The shop drain is the REAL one (chain.js's spend → shop.js's
// nextPurchase); prices are mutated on the live SHOP_ITEMS objects rather
// than reimplemented, so this cannot drift from the rule the page runs.
// The spend ORDER is recomputed from the mutated prices the same way
// DEFAULT_ORDER derives from the shipped ones, and passed explicitly.

import module from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(here, '..');
const url = (r) => pathToFileURL(path.join(REPO, r)).href;

const cell = JSON.parse(process.argv[2] || '{}');

// Env BEFORE any src/ import: the hook reads it when balance.js loads.
if (cell.coinRate) process.env.E2_COIN_RATE = String(cell.coinRate);

module.register(url('tools/rot-cdn-hook.mjs'));
module.register(url('tools/e2-coin-hook.mjs'));

const { playChain } = await import(url('src/analysis/chain.js'));
const { SHOP_ITEMS } = await import(url('src/ui/shop.js'));
const { resolvedDefaults } = await import(url('src/ui/dials.js'));
const { ITEM_TABLE, COIN_RATE } = await import(url('src/sim/balance.js'));

// ── the world: shipped dials, with the cut on floors 1–3 ──────────────────
const overrides = JSON.parse(
  fs.readFileSync(path.join(REPO, 'dial-overrides.json'), 'utf8'),
);
if (cell.cut) {
  Object.assign(overrides.model, cell.cut);
  for (const seg of overrides.model.floors ?? []) {
    if ((seg.from ?? 1) < 4) Object.assign(seg, cell.cut);
  }
}
const dials = resolvedDefaults(overrides);

// ── the shop: price mutations on the live objects ─────────────────────────
if (cell.axePrice) {
  SHOP_ITEMS.find((e) => e.item.name === 'axe').price = cell.axePrice;
}
if (cell.rung) {
  const item = ITEM_TABLE.find((i) => i.name === cell.rung.name);
  if (!item) throw new Error(`no ITEM_TABLE item named ${cell.rung.name}`);
  SHOP_ITEMS.push({ item, price: cell.rung.price });
}
const order = SHOP_ITEMS.slice()
  .sort((a, b) => b.price - a.price)
  .map((e) => e.item.name);

const hero = cell.hero
  ? { name: cell.heroName ?? 'custom', bot: cell.hero }
  : undefined;

// ── play the chains ───────────────────────────────────────────────────────
const M = cell.chains ?? 12;
const L = cell.length ?? 60;
const firstSeed = cell.firstSeed ?? 500000;

const pigDied = (run) => run.levels.some(
  (l) => (l.roster ?? []).some((m) => m.vault && m.dead),
);
// Was the Butcher's floor even reached on the way down?
const sawPig = (run) => run.levels.some((l) => l.level >= 4);

const chains = [];
let runsTotal = 0;
let killsTotal = 0;
let sawTotal = 0;
const wallIncomes = [];   // balance of runs that died having reached floor 4+
const depths = [];

for (let m = 0; m < M; m++) {
  const collect = [];
  const { runs } = playChain(firstSeed + m, L, { dials, hero, order, collect });
  let firstKill = null;
  let kills = 0;
  for (let k = 0; k < collect.length; k++) {
    const run = collect[k];
    const row = runs[k];
    runsTotal++;
    depths.push(run.depth);
    if (sawPig(run)) sawTotal++;
    if (pigDied(run)) {
      kills++;
      killsTotal++;
      if (firstKill === null) firstKill = k + 1;
    }
    if (!run.cleared && sawPig(run)) wallIncomes.push(row.balance);
  }
  chains.push({
    seed: firstSeed + m,
    firstKill,
    kills,
    axesBought: runs.reduce(
      (n, r) => n + r.bought.filter((b) => b === 'axe').length, 0,
    ),
  });
}

const median = (xs) => {
  if (!xs.length) return null;
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

const firstKills = chains.map((c) => c.firstKill).filter((k) => k !== null);

process.stdout.write(`${JSON.stringify({
  name: cell.name ?? 'unnamed',
  cell: { ...cell, coinRateApplied: COIN_RATE },
  chains: M,
  length: L,
  runs: runsTotal,
  hero: hero ? hero.name : 'base',
  // THE METRIC: kills per run over chains, and where the first one lands.
  killRate: +(killsTotal / runsTotal).toFixed(4),
  kills: killsTotal,
  chainsWithKill: firstKills.length,
  firstKillMedian: median(firstKills),
  firstKills: chains.map((c) => c.firstKill),
  // The bridge arithmetic: what a run that met the wall and lost brought
  // to the shop, against the axe's price this cell charges.
  wallIncomeMedian: median(wallIncomes),
  wallRuns: wallIncomes.length,
  reachedPigShare: +(sawTotal / runsTotal).toFixed(3),
  axesBought: chains.reduce((n, c) => n + c.axesBought, 0),
  depthMean: +(depths.reduce((a, b) => a + b, 0) / depths.length).toFixed(2),
})}\n`);
