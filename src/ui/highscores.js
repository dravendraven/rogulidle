// A skeleton highscore panel — one row per hero, the best that hero has
// ever done across every run this browser has played. Three metrics only,
// the three `docs/project/objectives.md` already treats as the point of a
// sitting: how far it got, how much a run paid, and how fast a clear was.
//
// localStorage only, same reasoning as score.js / achievements.js /
// wallet.js: `step()` takes no storage access, so this stays out of
// `src/sim/` in both directions. Nothing here is read by the engine and
// nothing here changes what a run does — it only remembers what happened.

import { HEROES } from '../sim/heroes.js';
import { ORDER } from './roster.js';
import { tileSvg } from './tiles.js';

const KEY = 'rogulidle-highscores';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch {
    // Private browsing, quota, or corrupt JSON — the board just shows
    // everyone at zero rather than breaking the page.
    return {};
  }
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Same cases as load().
  }
}

export function getHighscores() {
  return load();
}

export function resetHighscores() {
  save({});
  return {};
}

// One finished run against `heroName`'s row (the FULL name — `HEROES.base
// .name`, not the `''` the HUD prints for it). Every field keeps only the
// best a hero has ever done; a worse run never overwrites a better one.
//
// `depth`/`cleared` rank together rather than depth alone: every clear
// reaches the same floor, so "did it clear" is the tiebreaker a plain `>`
// on depth would never see, and a clear always outranks a death regardless
// of how deep the death was — reaching the bottom on foot is not worse
// than getting killed one floor short of it on a different run.
export function recordRun(heroName, { depth, cleared, coins, turns }) {
  const data = load();
  const row = data[heroName] || {
    bestDepth: 0, bestDepthCleared: false, maxCoins: 0, minStepsToClear: null,
  };

  const deeper = !row.bestDepthCleared && depth > row.bestDepth;
  const firstClear = cleared && !row.bestDepthCleared;
  if (firstClear || deeper) {
    row.bestDepth = depth;
    row.bestDepthCleared = cleared;
  }

  if (coins > row.maxCoins) row.maxCoins = coins;

  if (cleared && (row.minStepsToClear === null || turns < row.minStepsToClear)) {
    row.minStepsToClear = turns;
  }

  data[heroName] = row;
  save(data);
  return row;
}

// Builds the panel once — heading, the tab row (the hero picker's own
// visual language at a smaller size, since this is a lighter echo of that
// same choice, not a second way to make it), then the table. Returns
// `show(data, highlighted)`, called after every run with `getHighscores()`'s
// result and the hero whose row deserves the eye right now.
export function buildHighscorePanel(container) {
  container.innerHTML = '';

  // `.field` reuses "carrying"'s own label styling (index.html) rather than
  // a new rule — same uppercase caption, same size, for the same reason:
  // this panel is a sibling of that one, not a different kind of thing.
  const field = document.createElement('div');
  field.className = 'field';
  const label = document.createElement('label');
  label.textContent = 'recordes';
  field.append(label);
  container.append(field);

  // Tabs, not a picker — clicking one highlights that hero's row in the
  // table below; it does not queue a hero to play, which is roster.js's job
  // alone. Smaller than the roster's own chips on purpose: this is a way to
  // find a row in a table that will grow, not the primary control on the
  // page.
  const tabs = document.createElement('div');
  tabs.className = 'highscore-tabs';
  const tabButtons = new Map();

  for (const key of ORDER) {
    const hero = HEROES[key];
    if (!hero) continue;
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'highscore-tab';
    tab.title = hero.name === 'base' ? 'o de sempre' : `${hero.name}, ${hero.title}`;
    tab.innerHTML = tileSvg(hero.emoji) || '';
    tab.addEventListener('click', () => {
      const now = tab.classList.contains('selected');
      for (const b of tabButtons.values()) b.classList.remove('selected');
      tab.classList.toggle('selected', !now);
      for (const row of rows.values()) {
        row.classList.toggle('selected', !now && row === rows.get(key));
      }
    });
    tabs.append(tab);
    tabButtons.set(key, tab);
  }
  container.append(tabs);

  const table = document.createElement('table');
  table.className = 'highscore-table';
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th></th>
      <th title="andar mais fundo já alcançado — 🏆 quando foi uma descida inteira">🏔️</th>
      <th title="mais moedas já geradas em uma única run">🪙</th>
      <th title="menos passos já usados numa descida completa">👣</th>
    </tr>`;
  table.append(thead);

  const tbody = document.createElement('tbody');
  const rows = new Map();
  const cells = new Map();

  for (const key of ORDER) {
    const hero = HEROES[key];
    if (!hero) continue;
    const tr = document.createElement('tr');

    const face = document.createElement('td');
    face.className = 'highscore-face';
    face.innerHTML = tileSvg(hero.emoji) || '';
    face.title = hero.name === 'base' ? 'o de sempre' : `${hero.name}, ${hero.title}`;

    const depth = document.createElement('td');
    const coins = document.createElement('td');
    const steps = document.createElement('td');

    tr.append(face, depth, coins, steps);
    tbody.append(tr);
    rows.set(key, tr);
    cells.set(key, { depth, coins, steps });
  }
  table.append(tbody);
  container.append(table);

  return function show(data) {
    for (const key of ORDER) {
      const cell = cells.get(key);
      if (!cell) continue;
      const row = data[key];
      cell.depth.textContent = !row || row.bestDepth === 0
        ? '—'
        : (row.bestDepthCleared ? '🏆' : String(row.bestDepth));
      cell.coins.textContent = row && row.maxCoins > 0 ? String(row.maxCoins) : '—';
      cell.steps.textContent = row && row.minStepsToClear !== null
        ? String(row.minStepsToClear)
        : '—';
    }
  };
}
