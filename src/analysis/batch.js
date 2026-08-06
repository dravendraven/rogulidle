// Running many games and reporting what happened. Phase 4 item 20.
//
// Runs in chunks and yields to the browser between them. That is not a
// nicety: a straight loop over a few hundred games locks the tab for
// minutes with no progress and no way out, which is exactly how several
// ad-hoc measurements got lost during P3.
//
// Metrics are deliberately not just the win rate. Win rate mixes bot
// quality with map difficulty, so a change to generation moves it without
// the bot changing at all. Damage and blows taken per kill measure play
// on its own terms.

import { newGame, playGame } from '../sim/game.js';
import { makeBot } from '../bot/bot.js';
import { analyseSeed } from './winnable.js';

export function measureRun(seed, botOptions = {}, options = {}) {
  const counts = options.counts;
  const maxTurns = options.maxTurns ?? 1500;

  const verdict = analyseSeed(newGame(seed, counts));
  const started = performance.now();
  const run = playGame(seed, makeBot(botOptions), { maxTurns, counts });

  const blows = run.state.log
    .filter((e) => e.type === 'attack' && e.target === 'player');

  return {
    seed,
    outcome: run.outcome || 'timeout',
    winnable: verdict.verdict,
    optimalCost: verdict.cost,
    turns: run.turns,
    kills: run.state.player.kills.length,
    hp: run.state.player.hp,
    gear: run.state.player.inventory.filter((i) => i.dmg || i.armour).length,
    damageTaken: blows.reduce((sum, e) => sum + e.damage, 0),
    blowsTaken: blows.length,
    killedBy: run.state.killedBy || null,
    ms: performance.now() - started,
  };
}

export function summarise(rows) {
  const n = rows.length;
  if (!n) return null;

  const wins = rows.filter((r) => r.outcome === 'ascended');
  const timeouts = rows.filter((r) => r.outcome === 'timeout');
  const winnable = rows.filter((r) => r.winnable === 'comfortable');
  const winnableWins = winnable.filter((r) => r.outcome === 'ascended');

  const total = (key) => rows.reduce((sum, r) => sum + r[key], 0);
  const kills = total('kills');

  const p = wins.length / n;
  const se = Math.sqrt((p * (1 - p)) / n);

  const killedBy = {};
  for (const row of rows) {
    if (row.killedBy) killedBy[row.killedBy] = (killedBy[row.killedBy] || 0) + 1;
  }

  return {
    runs: n,
    wins: wins.length,
    winPct: +(100 * p).toFixed(1),
    ci95: [+(100 * (p - 1.96 * se)).toFixed(1), +(100 * (p + 1.96 * se)).toFixed(1)],
    timeouts: timeouts.length,
    onWinnablePct: winnable.length
      ? +((100 * winnableWins.length) / winnable.length).toFixed(1)
      : null,
    avgKills: +(kills / n).toFixed(2),
    avgTurns: +(total('turns') / n).toFixed(0),
    avgGear: +(total('gear') / n).toFixed(2),
    avgHpOnWin: wins.length
      ? +(wins.reduce((s, r) => s + r.hp, 0) / wins.length).toFixed(1)
      : null,
    damagePerKill: kills ? +(total('damageTaken') / kills).toFixed(2) : null,
    blowsPerKill: kills ? +(total('blowsTaken') / kills).toFixed(2) : null,
    msPerRun: +(total('ms') / n).toFixed(0),
    killedBy,
  };
}

// Plays `count` games and reports as it goes. `onProgress(done, total)` is
// called between chunks; returning true from `shouldStop()` ends it early
// and the summary covers whatever finished.
export async function runBatch(options) {
  const {
    count = 100, firstSeed = 300, botOptions = {}, counts, maxTurns,
    chunk = 10, onProgress, shouldStop,
  } = options;

  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push(measureRun(firstSeed + i, botOptions, { counts, maxTurns }));

    if ((i + 1) % chunk === 0 || i === count - 1) {
      if (onProgress) onProgress(rows.length, count);
      // Hand the thread back so the page can paint and the stop button works.
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (shouldStop && shouldStop()) break;
    }
  }
  return { rows, summary: summarise(rows) };
}

// Sweeps one bot setting across several values, everything else held. Same
// seeds for every value, so the comparison is paired rather than noisy.
export async function sweep(name, values, options) {
  const results = [];
  for (const value of values) {
    if (options.shouldStop && options.shouldStop()) break;
    const botOptions = { ...options.botOptions, [name]: value };
    const { summary } = await runBatch({ ...options, botOptions });
    results.push({ value, summary });
    if (options.onValueDone) options.onValueDone(name, value, summary);
  }
  return results;
}
