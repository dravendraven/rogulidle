// The dial grid: every combination of the three player dials, and how many
// runs each takes to reach an OBJECTIVE. This is the instrument for the
// question the owner asked once the objectives existed — "do the dials
// matter" — which neither `measure.mjs` (is anything broken) nor
// `dial-sweep.mjs` (does ONE dial move anything) can answer, because the
// answer is the SHAPE of the curve across combos: the median of a random
// combo should be long, the best few well below it, the best one or two
// below the next three. A flat curve means the dials are cosmetic.
//
// Design, each part earned by the grid that took two hours:
//   - SAME CHAIN SEEDS IN EVERY COMBO (paired): the map comes from the seed,
//     so what differs between cells is the dials.
//   - A chain STOPS at the last of the fast objectives (axe, pig, 25 coins).
//     Clear is recorded if it happens first but never waited for — with 500
//     runs a day it is the one objective that runs the cap out, and it is
//     measured on its own (`--clear`).
//   - TWO STAGES: a screen of all 64 with few short chains, then the fine
//     stage on the union of each objective's top 16. Noise in the screen only
//     matters near the cut; the fine stage decides the ranking.
//   - Curiosity is DERIVED from the Pressa notch, mirrored, exactly as the
//     panel does (dials.js) — a grid that set it separately would measure a
//     game nobody plays.
//
// Usage:
//   node tools/grid.mjs                      screen 8x60, fine 32x500, 12 workers
//   node tools/grid.mjs '{"fine":{"chains":16,"cap":300}}'
//   node tools/grid.mjs '{"clear":true}'      the Clear objective alone, long chains
//   node tools/grid.mjs '{"seedBase":960000}' fresh seeds (spend a new base per
//                                            question — a base reused for
//                                            selection AND measurement selects
//                                            on its own noise)
//
// Output: a table per objective (top 10, median of the top 5 against the
// median of ALL combos) and the raw results in `.claude/grid/<stamp>.json`.
// Nothing here is written into a doc: a recorded number goes stale and gets
// compared against anyway (CLAUDE.md).

import module from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(here, '..');
const url = (r) => pathToFileURL(path.join(REPO, r)).href;

const OBJECTIVES = ['axe', 'pig', 'c25', 'clear'];
const FAST = ['axe', 'pig', 'c25'];
const LABEL = { axe: '🪓 Machado', pig: '🐷 Porco', c25: '🪙 25 moedas', clear: '🏁 Clear' };
const BAND = ['min', 'mB', 'mA', 'max'];
const digits = (i) => [(i >> 4) & 3, (i >> 2) & 3, i & 3];   // [Coragem, Ganância, Pressa]
const nameOf = (bands) => bands.map((b) => BAND[b]).join('/');

const DEFAULTS = {
  seedBase: 950000,
  workers: Math.max(1, os.cpus().length),
  screen: { chains: 8, cap: 60 },
  fine: { chains: 32, cap: 500, top: 16 },
  clear: false,
};

// ---------------------------------------------------------------- worker

async function worker(argv) {
  const [combosArg, chains, cap, seedBase, waitClear, outFile] = argv;
  module.register(url('tools/rot-cdn-hook.mjs'));
  const { resolvedDefaults } = await import(url('src/ui/dials.js'));
  const { playChain } = await import(url('src/analysis/chain.js'));
  const { biasBands } = await import(url('src/bot/config.js'));

  const overrides = JSON.parse(fs.readFileSync(path.join(REPO, 'dial-overrides.json'), 'utf8'));
  const shipped = resolvedDefaults(overrides);
  const bands = biasBands();
  const combos = combosArg.split(',').map(Number);
  const waited = waitClear === '1' ? OBJECTIVES : FAST;

  const results = [];
  for (const combo of combos) {
    const [ib, ig, ip] = digits(combo);
    const hero = {
      ...shipped.hero,
      bravery: +(1 * bands[ib]).toPrecision(3),
      sideAppetite: +(1 * bands[ig]).toPrecision(3),
      stepCost: +(0.1 * bands[ip]).toPrecision(3),
      curiosity: +bands[bands.length - 1 - ip].toPrecision(3),
    };
    const dials = { ...shipped, hero };

    const chainsOut = [];
    for (let m = 0; m < Number(chains); m++) {
      const ev = { axe: null, pig: null, c25: null, clear: null };
      playChain(Number(seedBase) + m, Number(cap), {
        dials,
        stop(row, run) {
          if (ev.axe === null && row.bought.includes('axe')) ev.axe = row.run;
          if (ev.c25 === null && row.balance >= 25) ev.c25 = row.run;
          if (ev.clear === null && row.cleared) ev.clear = row.run;
          if (ev.pig === null && run.levels.some(
            (l) => (l.roster || []).some((mo) => mo.vault && mo.dead),
          )) ev.pig = row.run;
          return waited.every((k) => ev[k] !== null);
        },
      });
      chainsOut.push(ev);
    }
    results.push({ combo, bands: digits(combo), hero, chains: chainsOut });
    fs.writeFileSync(outFile, JSON.stringify(results));
  }
}

// ----------------------------------------------------------- orchestration

function runStage(combos, { chains, cap }, opts, tag) {
  const slices = Array.from({ length: Math.min(opts.workers, combos.length) }, () => []);
  combos.forEach((c, i) => slices[i % slices.length].push(c));
  const outDir = path.join(REPO, '.claude', 'grid');
  fs.mkdirSync(outDir, { recursive: true });

  return Promise.all(slices.map((slice, i) => new Promise((resolve, reject) => {
    const out = path.join(outDir, `${tag}-${i}.json`);
    const child = spawn(process.execPath, [
      fileURLToPath(import.meta.url), '--worker',
      slice.join(','), String(chains), String(cap), String(opts.seedBase),
      opts.clear ? '1' : '0', out,
    ], { stdio: ['ignore', 'inherit', 'inherit'] });
    child.on('exit', (code) => (code === 0
      ? resolve(JSON.parse(fs.readFileSync(out, 'utf8')))
      : reject(new Error(`worker ${i} exited ${code}`))));
  }))).then((parts) => parts.flat());
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
// Censored median: a chain that never got there counts as "past the cap".
const score = (row, obj, cap) => median(row.chains.map((c) => c[obj] ?? cap + 1));
const hits = (row, obj) => row.chains.filter((c) => c[obj] !== null).length;
const rank = (rows, obj, cap) => [...rows].sort((a, b) =>
  (hits(b, obj) - hits(a, obj)) || (score(a, obj, cap) - score(b, obj, cap)));

function report(rows, cap, objectives, who) {
  for (const obj of objectives) {
    const ranked = rank(rows, obj, cap);
    const all = median(ranked.map((r) => score(r, obj, cap)));
    const top5 = median(ranked.slice(0, 5).map((r) => score(r, obj, cap)));
    console.log(`\n${LABEL[obj]}   mediana de ${who}: ${all}   top 5: ${top5}   (cap ${cap}, ${rows[0].chains.length} chains)`);
    console.log('   #  Coragem/Ganância/Pressa   mediana   chains que chegam');
    ranked.slice(0, 10).forEach((r, i) => console.log(
      `  ${String(i + 1).padStart(2)}  ${nameOf(r.bands).padEnd(24)} ${String(score(r, obj, cap)).padStart(7)}   ${hits(r, obj)}/${r.chains.length}`,
    ));
  }
}

async function main() {
  const arg = process.argv[2] ? JSON.parse(process.argv[2]) : {};
  const opts = {
    ...DEFAULTS, ...arg,
    screen: { ...DEFAULTS.screen, ...(arg.screen || {}) },
    fine: { ...DEFAULTS.fine, ...(arg.fine || {}) },
  };
  const objectives = opts.clear ? ['clear'] : FAST;
  const all = Array.from({ length: 64 }, (_, i) => i);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  let t = Date.now();
  console.log(`triagem: 64 combos × ${opts.screen.chains} chains × cap ${opts.screen.cap}, ${opts.workers} workers, seeds ${opts.seedBase}+`);
  const screened = await runStage(all, opts.screen, opts, `${stamp}-screen`);
  console.log(`triagem em ${Math.round((Date.now() - t) / 1000)}s`);
  report(screened, opts.screen.cap, objectives, 'TODOS os 64 combos');

  const keep = new Set();
  for (const obj of objectives) {
    rank(screened, obj, opts.screen.cap).slice(0, opts.fine.top).forEach((r) => keep.add(r.combo));
  }
  const finalists = [...keep].sort((a, b) => a - b);

  t = Date.now();
  console.log(`\nfina: ${finalists.length} combos × ${opts.fine.chains} chains × cap ${opts.fine.cap}`);
  const fine = await runStage(finalists, opts.fine, opts, `${stamp}-fine`);
  console.log(`fina em ${Math.round((Date.now() - t) / 1000)}s`);
  report(fine, opts.fine.cap, objectives, 'os finalistas');

  const outFile = path.join(REPO, '.claude', 'grid', `${stamp}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ opts, screened, fine }));
  console.log(`\nbruto: ${path.relative(REPO, outFile)}`);
}

if (process.argv[2] === '--worker') await worker(process.argv.slice(3));
else await main();
