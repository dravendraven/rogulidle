// THE HARVEST — what played while nobody was looking, handed over on return
// (docs/project/idle-retention.md, "o momento de colheita"). The game keeps
// playing in a hidden tab (src/ui/clock.js); before this, coming back paid
// nothing visible — the runs had happened, and the only trace was a strip of
// twelve chips and a highscore table that may not have moved.
//
// "Away" is the tab being HIDDEN when a run ends: a run whose end you saw is
// a run you watched. Nothing here simulates a closed page — when the browser
// freezes or the tab is closed, nothing played, and the card says only what
// did. It is kept in the save, so a tab that was hidden and then closed still
// hands its harvest to the next visit.
//
// UI only. Read off what a finished run already carries; it changes nothing
// a run does.

import { readSlice, writeSlice } from './save.js';

const SLICE = 'away';

export function blankTally() {
  return { runs: 0, cleared: 0, deepest: 0, bestCoins: 0, pigKills: 0, pigLow: null, firsts: [] };
}

// One finished run folded into the tally. Pure, so the arithmetic is tested
// headless; `run` is playDungeon's result, `coins` what the run paid.
export function foldRun(tally, run, coins) {
  const t = { ...tally, firsts: [...tally.firsts] };
  t.runs++;
  if (run.cleared) t.cleared++;
  if (run.depth > t.deepest) t.deepest = run.depth;
  if (coins > t.bestCoins) t.bestCoins = coins;
  for (const level of run.levels) {
    for (const m of level.roster) {
      if (!m.vault) continue;
      if (m.dead) t.pigKills++;
      else if (Number.isFinite(m.hpLeft) && m.hpLeft < m.hp
        && (t.pigLow === null || m.hpLeft < t.pigLow.hpLeft)) {
        t.pigLow = { hpLeft: m.hpLeft, hpMax: m.hp };
      }
    }
  }
  return t;
}

// Achievements earned for the first time while away — the run's own and the
// shop's, which lands after the run is folded.
export function foldFirsts(tally, ids) {
  return { ...tally, firsts: [...tally.firsts, ...ids.filter((id) => !tally.firsts.includes(id))] };
}

function load() {
  const parsed = readSlice(SLICE);
  return (parsed && typeof parsed === 'object' && Number.isFinite(parsed.runs)) ? parsed : blankTally();
}

const away = () => typeof document !== 'undefined' && document.hidden;

export function noteRun(run, coins, firsts = []) {
  if (!away()) return;
  writeSlice(SLICE, foldFirsts(foldRun(load(), run, coins), firsts));
}

export function noteFirsts(ids) {
  if (!away() || !ids.length) return;
  writeSlice(SLICE, foldFirsts(load(), ids));
}

// The tally, emptied as it is read — a harvest is collected once. Null when
// nothing played unseen.
export function takeHarvest() {
  const t = load();
  if (t.runs === 0 && t.firsts.length === 0) return null;
  writeSlice(SLICE, blankTally());
  return t;
}

// The card's rows, in the summary card's [label, value] shape. `levels` is
// how many floors a descent has; `achievements` the table, for the emoji.
export function harvestRows(t, levels, achievements) {
  const rows = [['runs', t.runs + (t.cleared ? ` · ${t.cleared} 🟩` : '')]];
  if (t.runs) rows.push(['mais fundo', `andar ${t.deepest} / ${levels}`]);
  if (t.runs) rows.push(['melhor run', `${t.bestCoins} 🪙`]);
  if (t.pigKills) rows.push(['porco', `caiu ${t.pigKills}×`]);
  else if (t.pigLow) rows.push(['porco', `ficou com ${t.pigLow.hpLeft} / ${t.pigLow.hpMax} hp`]);
  if (t.firsts.length) {
    const faces = t.firsts.map((id) => (achievements.find((a) => a.id === id) || {}).emoji || id);
    rows.push(['feitos novos', faces.join(' ')]);
  }
  return rows;
}
