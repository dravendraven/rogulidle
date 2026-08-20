// One-off reader for the E2 sweep: replay ONE chain of a candidate cell and
// print each run's floor-by-floor rows, so "why does a pig-kill run still
// not get deep" can be answered from data instead of guessed. Same loading
// pattern as e2-sweep.mjs; throwaway instrument, not a metrics surface.

import module from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(here, '..');
const url = (r) => pathToFileURL(path.join(REPO, r)).href;

module.register(url('tools/rot-cdn-hook.mjs'));

const rawCell = process.argv[2] || '{}';
const cell = JSON.parse(
  fs.existsSync(rawCell) ? fs.readFileSync(rawCell, 'utf8') : rawCell,
);
const chainSeed = Number(process.argv[3] ?? 500007);
const upTo = Number(process.argv[4] ?? 10);

const { playChain } = await import(url('src/analysis/chain.js'));
const { SHOP_ITEMS } = await import(url('src/ui/shop.js'));
const { resolvedDefaults } = await import(url('src/ui/dials.js'));

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
if (cell.axePrice) {
  SHOP_ITEMS.find((e) => e.item.name === 'axe').price = cell.axePrice;
}
const order = SHOP_ITEMS.slice()
  .sort((a, b) => b.price - a.price)
  .map((e) => e.item.name);

const collect = [];
const { runs } = playChain(chainSeed, upTo, { dials, order, collect });

for (let k = 0; k < collect.length; k++) {
  const run = collect[k];
  const row = runs[k];
  const pig = run.levels.some((l) => (l.roster ?? []).some((m) => m.vault && m.dead));
  console.log(`run ${k + 1} seed ${row.seed} pile=${JSON.stringify(row.pile)} `
    + `depth=${run.depth} cleared=${run.cleared} pigKill=${pig} `
    + `balance=${row.balance} bought=${row.bought.join(',')}`);
  for (const l of run.levels) {
    console.log(`  L${l.level} ${l.outcome} turns=${l.turns} hp=${l.hp} `
      + `armour=${l.armour} kills=${l.kills} gear=${l.gear} coins=${l.coins}`);
  }
}
