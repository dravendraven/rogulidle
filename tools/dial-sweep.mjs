// The three player dials, one at a time, against the baseline bot.
//
// `tools/measure.mjs` answers "is anything broken" — a tripwire fires or it
// does not. This answers a different question that kept being asked by hand
// and re-derived wrong each time: "does moving THIS dial change anything,
// and in which direction". It is not a metrics surface and nothing here is
// a quantity to push; it exists so that a dial claim can be checked against
// a run instead of against a memory. `test/baseline.md` is the contract it
// measures against.
//
// Two disciplines are built in rather than left to the caller, because
// leaving them to the caller is how three readings in this project's history
// were later found to be noise:
//
//   1. THE SAME SEEDS IN EVERY CELL. The map comes from the run seed and
//      never from the bot, so holding seeds fixed removes the largest
//      variance source and what is left is the dial.
//   2. THE PAIRED DELTA, not the difference of two means. Two columns each
//      carrying a standard error of 0.13 cannot resolve a 0.1-floor
//      difference; the same runs differenced seed by seed resolve it at a
//      third of that. The `sigma` column is the paired statistic and the
//      2-sigma rule in CLAUDE.md applies to IT, not to the two means beside
//      it.
//
// Usage:
//   node tools/dial-sweep.mjs                    all three, 250 runs a cell
//   node tools/dial-sweep.mjs 400 coragem        one dial, 400 runs a cell
//
// A cell is a full descent per run, so cost is runs x 7 cells x ~15 floors.
// 250 is a few minutes a dial; below ~150 nothing under half a floor is
// readable and the run is wasted.

import module from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(here, '..');
const url = (r) => pathToFileURL(path.join(REPO, r)).href;

// The vendored ROT.js, same hook measure.mjs uses. Run `node
// tools/measure.mjs --selftest` first if there is any doubt it is faithful.
module.register(url('tools/rot-cdn-hook.mjs'));

const { playDungeon, LEVELS } = await import(url('src/sim/dungeon.js'));
const { makeFloorPlan, DEFAULT_MODEL } = await import(url('src/sim/difficulty.js'));
const { makeBot } = await import(url('src/bot/bot.js'));
const { hashSeeds } = await import(url('src/sim/rng.js'));
const { DEFAULT_HERO, biasBands } = await import(url('src/bot/config.js'));

// `dial-overrides.json` layered over the code defaults IS the shipped game
// (CLAUDE.md), so a sweep that read the code alone would be measuring a
// version nobody plays.
const overrides = JSON.parse(fs.readFileSync(path.join(REPO, 'dial-overrides.json'), 'utf8'));
const plan = makeFloorPlan({ ...DEFAULT_MODEL, ...(overrides.model || {}) });
const HERO = { ...DEFAULT_HERO, ...(overrides.hero || {}) };
const BOT = { ...(overrides.bot || {}) };

const RUNS = Number(process.argv[2] || 250);
const ONLY = (process.argv[3] || '').toLowerCase();

// Empty hands. The shop item is a bonus paid AFTER a defeat, so a hero who
// starts holding one is not the hero a first run gets — the owner corrected
// this once already and it moved every number.
function playOne(seed, hero, bot) {
  const run = playDungeon(hashSeeds(20260814, seed), (floor) => makeBot({
    monsterCount: floor.monsterCount, chestCount: floor.chests, hero, ...bot,
  }), { maxTurns: 1500, floorPlan: plan, traversals: LEVELS, startingItems: [] });

  let chests = 0; let turns = 0; let kills = 0;
  for (const level of run.levels) {
    chests += level.chests.filter((c) => c.opened).length;
    turns += level.turns;
    kills += level.roster.filter((m) => m.dead).length;
  }
  // The signature answers "did this run come out differently at all",
  // which separates a dial that changes BEHAVIOUR from one that changes
  // OUTCOMES. Cautela changes 99% of runs and moves depth by 0.04.
  return { depth: run.depth, chests, turns, kills, sig: `${run.depth}/${turns}/${kills}/${chests}` };
}

function cell(hero, bot) {
  const rows = [];
  for (let n = 1; n <= RUNS; n++) rows.push(playOne(n, hero, bot));
  const depths = rows.map((r) => r.depth);
  const mean = depths.reduce((a, b) => a + b, 0) / RUNS;
  return {
    rows,
    mean,
    deep7: depths.filter((x) => x >= 7).length / RUNS,
    chests: rows.reduce((a, r) => a + r.chests, 0) / RUNS,
    kills: rows.reduce((a, r) => a + r.kills, 0) / RUNS,
    turns: rows.reduce((a, r) => a + r.turns, 0) / RUNS,
  };
}

// Mean of the per-seed difference and its standard error — the paired test.
function pairedDelta(cellA, ref) {
  const diff = cellA.rows.map((r, i) => r.depth - ref.rows[i].depth);
  const mean = diff.reduce((a, b) => a + b, 0) / diff.length;
  const sd = Math.sqrt(diff.reduce((a, x) => a + (x - mean) ** 2, 0) / (diff.length - 1));
  const se = sd / Math.sqrt(diff.length);
  return { mean, se, sigma: se ? Math.abs(mean) / se : 0 };
}

const pc = (n) => `${(100 * n).toFixed(0)}%`;
const BANDS = ['muito baixo', 'baixo', 'médio-baixo', 'médio-alto', 'alto', 'muito alto'];

// THE THREE THE PANEL ACTUALLY OFFERS, and getting this list wrong is the
// most expensive mistake this file can make: a sweep of a parameter the
// player cannot reach reads like a finding about a choice and is not one.
// It happened — this file swept `fightMargin` and `persistence` for a while
// after BOTH were taken off the panel, and `test/baseline.md` carried the
// same stale names, so a whole session concluded about dials nobody has.
// Check `src/ui/dials.js` for its `kind: 'hero'` rows before trusting this.
//
//   Coragem     -> `bravery`      bends the ESTIMATE of a creature's health
//   Ganancia    -> `sideAppetite` what a chest is worth
//   Curiosidade -> `curiosity`    how cheap the unknown reads (bravery mirror)
//
// `fightMargin`, `persistence` and `caution`'s exposure half
// (`EXPOSURE_STEPS`) are DECIDED CONSTANTS now, on purpose: two dials
// pulling on one quantity is the confusion M47 untangled, and this project
// has paid for it twice.
const DIALS = [
  ['Coragem  (bravery)', HERO.bravery, (v) => [{ ...HERO, bravery: v }, BOT]],
  ['Ganância (sideAppetite)', HERO.sideAppetite, (v) => [{ ...HERO, sideAppetite: v }, BOT]],
  ['Curiosidade (curiosity)', HERO.curiosity, (v) => [{ ...HERO, curiosity: v }, BOT]],
];

console.log(`${RUNS} runs por célula, herói base, mesmas seeds, mãos vazias`);
console.log(`centro: coragem ${HERO.bravery}  ganância ${HERO.sideAppetite}  curiosidade ${HERO.curiosity}\n`);

const ref = cell(HERO, BOT);
console.log(`CENTRO   prof ${ref.mean.toFixed(2)}   7+ ${pc(ref.deep7)}   `
  + `baús ${ref.chests.toFixed(1)}   mortes ${ref.kills.toFixed(1)}   turnos ${ref.turns.toFixed(0)}\n`);

for (const [title, centre, build] of DIALS) {
  if (ONLY && !title.toLowerCase().startsWith(ONLY)) continue;
  console.log(title);
  console.log('  faixa          valor   prof    7+  baús mortes turnos | runs≠centro | delta pareado');
  for (const [i, band] of biasBands().entries()) {
    const value = +(centre * band).toFixed(3);
    const c = cell(...build(value));
    const d = pairedDelta(c, ref);
    const changed = c.rows.filter((r, k) => r.sig !== ref.rows[k].sig).length / RUNS;
    console.log(`  ${BANDS[i].padEnd(13)} ${String(value).padStart(6)}  ${c.mean.toFixed(2)}  `
      + `${pc(c.deep7).padStart(4)} ${c.chests.toFixed(1).padStart(5)} ${c.kills.toFixed(1).padStart(5)} `
      + `${c.turns.toFixed(0).padStart(6)} | ${pc(changed).padStart(9)} | `
      + `${(d.mean >= 0 ? '+' : '') + d.mean.toFixed(3)} ± ${d.se.toFixed(3)}  ${d.sigma.toFixed(1)}σ`);
  }
  console.log('');
}
