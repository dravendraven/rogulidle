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

// Inline JSON, or a path to a file holding it — Windows shells mangle
// quoted JSON on child-process command lines, so a file is the safe route.
const rawCell = process.argv[2] || '{}';
const cell = JSON.parse(
  fs.existsSync(rawCell) ? fs.readFileSync(rawCell, 'utf8') : rawCell,
);

// Env BEFORE any src/ import: the hook reads it when balance.js loads.
if (cell.coinRate) process.env.E2_COIN_RATE = String(cell.coinRate);

module.register(url('tools/rot-cdn-hook.mjs'));
module.register(url('tools/e2-coin-hook.mjs'));

const { playChain } = await import(url('src/analysis/chain.js'));
const { runWires } = await import(url('src/analysis/check.js'));
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
// Same shape as `cut`, applied to EVERY anchor — for candidates where a
// dial moves on the whole descent rather than only above the pig.
if (cell.cutAll) {
  Object.assign(overrides.model, cell.cutAll);
  for (const seg of overrides.model.floors ?? []) Object.assign(seg, cell.cutAll);
}
// Run-wide field (difficulty.js RUN_WIDE): what the vault's own chests
// hold, as ITEM_TABLE names. A probe lever, not one of the three bridges.
if (cell.vaultKit) overrides.model.vaultChestItems = cell.vaultKit;
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

// ── the two players of the shop ───────────────────────────────────────────
//
// "idle" is the unattended drain (chain.js's default). "active" is a person
// at the screen: buys the axe when the balance reaches it AND the pile does
// not already hold one, then stacks shields (the armour term E1 measured as
// dominant), and turns an odd last coin into a potion. No dagger — the
// active claim under test is that a chooser beats the fixed order, and this
// is the obvious human policy to test it with.
const price = (n) => SHOP_ITEMS.find((e) => e.item.name === n).price;
const template = (n) => ({ ...ITEM_TABLE.find((i) => i.name === n) });
const activeBuy = (balance, kept) => {
  const bought = [];
  let left = balance;
  if (!kept.some((i) => i.name === 'axe') && left >= price('axe')) {
    bought.push(template('axe'));
    left -= price('axe');
  }
  while (left >= price('shield')) {
    bought.push(template('shield'));
    left -= price('shield');
  }
  if (left >= price('health')) {
    bought.push(template('health'));
    left -= price('health');
  }
  return { bought, spent: balance - left };
};
const buy = cell.policy === 'active' ? activeBuy : undefined;

// ── the wall clock ────────────────────────────────────────────────────────
//
// What a run COSTS IN HOURS at the page's own pacing (src/ui/spectator.js):
// 110 ms a turn at 1x, default speed 0.75x, summary card 2.4 s, and the
// shop clock 30 s — which the idle player waits out on ~every run while the
// active player clicks through in a few seconds. Same speed for both:
// the speed button is as available to idle as to active, so the honest
// active edge is the shop clock plus the choices, never the speed.
const SPEED = cell.speed ?? 0.75;
const TURN_S = 0.110 / SPEED;
const SUMMARY_S = 2.4 / SPEED;
const SHOP_S = (cell.policy === 'active' ? (cell.shopSeconds ?? 6) : 30 / SPEED);

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
let openingTotal = 0;     // runs over by traversal 3 (check.js's own bar)
let axeStarts = 0;        // runs that STARTED holding an axe
let axeStartKills = 0;    // ... and killed the pig
const wallIncomes = [];   // balance of runs that died having reached floor 4+
const balances = [];      // every run's balance — the income distribution
const depths = [];
const allPlays = [];      // for the shared wires (check.js's runWires)

for (let m = 0; m < M; m++) {
  const collect = [];
  const { runs } = playChain(firstSeed + m, L, { dials, hero, order, buy, collect });
  allPlays.push(...collect);
  let firstKill = null;
  let firstClear = null;
  let firstAxe = null;
  let firstKillH = null;
  let firstClearH = null;
  let firstAxeH = null;
  let clockS = 0;
  let kills = 0;
  for (let k = 0; k < collect.length; k++) {
    const run = collect[k];
    const row = runs[k];
    runsTotal++;
    depths.push(run.depth);
    balances.push(row.balance);
    const turns = run.levels.reduce((n, l) => n + l.turns, 0);
    clockS += turns * TURN_S + SUMMARY_S + (row.balance >= 1 ? SHOP_S : 0);
    if (!run.cleared && run.depth <= 3) openingTotal++;
    if (sawPig(run)) sawTotal++;
    const startedArmed = (row.pile.axe ?? 0) > 0;
    if (startedArmed) axeStarts++;
    if (pigDied(run)) {
      kills++;
      killsTotal++;
      if (startedArmed) axeStartKills++;
      if (firstKill === null) { firstKill = k + 1; firstKillH = clockS / 3600; }
    }
    if (run.cleared && firstClear === null) {
      firstClear = k + 1;
      firstClearH = clockS / 3600;
    }
    // The third rung: the run whose SHOP bought an axe — the "reached the
    // axe price" moment, and a candidate achievement. Bought, not merely
    // afforded, so an active policy that declines a second axe still counts
    // only real purchases.
    if (firstAxe === null && row.bought.includes('axe')) {
      firstAxe = k + 1;
      firstAxeH = clockS / 3600;
    }
    if (!run.cleared && sawPig(run)) wallIncomes.push(row.balance);
  }
  chains.push({
    seed: firstSeed + m,
    firstKill,
    firstKillH: firstKillH === null ? null : +firstKillH.toFixed(2),
    firstClear,
    firstClearH: firstClearH === null ? null : +firstClearH.toFixed(2),
    firstAxe,
    firstAxeH: firstAxeH === null ? null : +firstAxeH.toFixed(2),
    hoursTotal: +(clockS / 3600).toFixed(2),
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
const pct = (xs, p) => {
  if (!xs.length) return null;
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

const firstKills = chains.map((c) => c.firstKill).filter((k) => k !== null);
const firstKillHs = chains.map((c) => c.firstKillH).filter((h) => h !== null);
const firstClears = chains.map((c) => c.firstClear).filter((k) => k !== null);
const firstClearHs = chains.map((c) => c.firstClearH).filter((h) => h !== null);
const firstAxes = chains.map((c) => c.firstAxe).filter((k) => k !== null);
const firstAxeHs = chains.map((c) => c.firstAxeH).filter((h) => h !== null);

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
  // The wall clock, at the page's own pacing — see the constants above for
  // what idle waits through that active clicks past. Hours are cumulative
  // to the run that did it; a null median means most chains never did.
  policy: cell.policy ?? 'idle',
  firstKillHoursMedian: firstKillHs.length >= M / 2 ? median(firstKillHs) : null,
  firstClearMedian: firstClears.length >= M / 2 ? median(firstClears) : null,
  firstClearHoursMedian: firstClearHs.length >= M / 2 ? median(firstClearHs) : null,
  chainsWithClear: firstClears.length,
  firstClears: chains.map((c) => c.firstClear),
  firstAxeMedian: firstAxes.length >= M / 2 ? median(firstAxes) : null,
  firstAxeHoursMedian: firstAxeHs.length >= M / 2 ? median(firstAxeHs) : null,
  chainsWithAxe: firstAxes.length,
  firstAxes: chains.map((c) => c.firstAxe),
  hoursPerChainMedian: median(chains.map((c) => c.hoursTotal)),
  // WHERE the kills come from: the strategy loop is a kill on a run that
  // STARTED holding a bought axe; a "naked" kill is the in-run-loot path
  // the cut exists to close.
  axeStarts,
  axeStartKills,
  nakedKills: killsTotal - axeStartKills,
  // The bridge arithmetic: what a run that met the wall and lost brought
  // to the shop, against the axe's price this cell charges — and the whole
  // income distribution, since the bridge only works where the axe price
  // sits inside its reachable tail.
  wallIncomeMedian: median(wallIncomes),
  wallRuns: wallIncomes.length,
  income: {
    p50: pct(balances, 50), p75: pct(balances, 75),
    p90: pct(balances, 90), p95: pct(balances, 95),
    max: Math.max(0, ...balances),
  },
  reachedPigShare: +(sawTotal / runsTotal).toFixed(3),
  openingShare: +(openingTotal / runsTotal).toFixed(3),
  axesBought: chains.reduce((n, c) => n + c.axesBought, 0),
  depthMean: +(depths.reduce((a, b) => a + b, 0) / depths.length).toFixed(2),
  // The SHARED wires (check.js), read over every run of every chain — so a
  // candidate cell can be checked against the same bars the shipped game
  // answers to, not only against the kill-rate band.
  wires: runWires(allPlays).wires.map((w) => ({
    name: w.name, value: w.value, fires: w.fires,
  })),
})}\n`);
