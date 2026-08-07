// Draws a frame. No game logic lives here — it only reads.
//
// The viewport is the original's: 18x18 tiles following the player, with
// opacity falling off by distance (ui.cljs:148). On top of that we dim in
// what the bot REMEMBERS but cannot currently see, which is the whole point
// of the fog decision being real — you can watch the map fill in.

import { CLEAR_DIST, VISIBLE_DIST } from '../sim/balance.js';
import { distSq, posKey } from '../sim/mapgen.js';
import { tileSvg } from './tiles.js';

const VIEW = VISIBLE_DIST * 2;                 // 18 cells across
const VISIBLE_SQ = VISIBLE_DIST * VISIBLE_DIST;
const CLEAR_SQ = CLEAR_DIST * CLEAR_DIST;

const TILE_GLYPH = { wall: '⬛', door: '⬜', room: '', corridor: '' };

const PLAYER_GLYPH = '🧝';
const CORPSE_GLYPH = '💀';

let cells = [];

export function buildGrid(container) {
  container.innerHTML = '';
  cells = [];
  for (let i = 0; i < VIEW * VIEW; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    const glyph = document.createElement('span');
    glyph.className = 'glyph';
    const badge = document.createElement('span');
    badge.className = 'badge';
    cell.append(glyph, badge);
    container.append(cell);
    cells.push({ cell, glyph, badge });
  }
}

// Everything the bot believes is at each position, keyed by "x,y".
function believedAt(belief) {
  const index = new Map();
  const put = (entity, kind) => {
    const key = posKey(entity.pos);
    if (!index.has(key)) index.set(key, []);
    index.get(key).push({ entity, kind });
  };
  for (const monster of belief.monsters.values()) put(monster, 'monster');
  for (const chest of belief.chests.values()) put(chest, 'chest');
  for (const item of belief.items.values()) put(item, 'item');
  if (belief.shrine) put(belief.shrine, 'shrine');
  return index;
}

// The truth at each position — used only inside the visible radius.
function trueAt(state) {
  const index = new Map();
  const put = (entity, kind) => {
    const key = posKey(entity.pos);
    if (!index.has(key)) index.set(key, []);
    index.get(key).push({ entity, kind });
  };
  for (const monster of state.monsters) put(monster, monster.dead ? 'corpse' : 'monster');
  for (const chest of state.chests) put(chest, 'chest');
  for (const item of state.items) put(item, 'item');
  put(state.shrine, 'shrine');
  return index;
}

// Which of the things sharing a tile is the one worth drawing.
const PRIORITY = { monster: 4, shrine: 3, chest: 2, item: 1, corpse: 0 };

function topmost(entries) {
  let best = null;
  for (const entry of entries) {
    if (!best || PRIORITY[entry.kind] > PRIORITY[best.kind]) best = entry;
  }
  return best;
}

// `debug`, when given, is { danger, goal } and paints the bot's reasoning
// over the map: how dangerous it believes each tile to be, and what it is
// currently heading for. Phase 4 item 22 — you need this the moment the bot
// does something that looks stupid, because usually it is not.
export function renderFrame(state, belief, debug = null) {
  const player = state.player.pos;
  const truth = trueAt(state);
  const memory = believedAt(belief);
  const goalKey = debug && debug.goal && debug.goal.pos ? posKey(debug.goal.pos) : null;

  for (let row = 0; row < VIEW; row++) {
    for (let column = 0; column < VIEW; column++) {
      const x = player[0] - VISIBLE_DIST + column;
      const y = player[1] - VISIBLE_DIST + row;
      const key = x + ',' + y;
      const { cell, glyph, badge } = cells[row * VIEW + column];

      const away = distSq(player, [x, y]);
      const inSight = away <= VISIBLE_SQ;
      const remembered = belief.tiles.has(key);

      let text = '';
      let sub = '';
      let opacity = 0;
      let known = true;

      if (inSight) {
        opacity = away > CLEAR_SQ ? 0.75 : 1;
        text = TILE_GLYPH[state.map.tiles[y * state.map.w + x]] ?? '';
        const top = topmost(truth.get(key) || []);
        if (top) {
          text = top.kind === 'corpse' ? CORPSE_GLYPH : top.entity.emoji;
          if (top.kind === 'monster') sub = String(top.entity.xp);
        }
      } else if (remembered) {
        // Dimmed: this is memory, not sight. Monsters shown here may have
        // wandered off since — see docs/rogule-spec.md §12.2.
        opacity = 0.3;
        known = false;
        text = TILE_GLYPH[belief.tiles.get(key)] ?? '';
        const top = topmost(memory.get(key) || []);
        if (top) {
          text = top.entity.emoji;
          if (top.kind === 'monster') sub = String(top.entity.xp);
        }
      }

      // The player is always drawn on top of their own tile.
      if (x === player[0] && y === player[1]) {
        text = PLAYER_GLYPH;
        sub = '';
        opacity = 1;
        known = true;
      }

      glyph.innerHTML = tileSvg(text) || '';
      badge.textContent = sub;
      cell.style.opacity = opacity;
      cell.classList.toggle('remembered', !known && opacity > 0);

      if (debug) {
        // Redder means the bot expects to lose more hp per turn spent here.
        // Scaled against a bite of about 2hp, which is a mid-table monster.
        const menace = debug.danger.menace.get(key) || 0;
        const heat = Math.min(1, menace / 2);
        const crowded = (debug.danger.crowd.get(key) || 0) >= 2;
        cell.style.background = menace > 0
          ? `rgba(${crowded ? 255 : 200}, ${crowded ? 40 : 70}, 60, ${0.12 + 0.55 * heat})`
          : '';
        cell.classList.toggle('goal', key === goalKey);
      } else if (cell.style.background) {
        cell.style.background = '';
        cell.classList.remove('goal');
      }
    }
  }
}

// Health first, then the armour bar. Armour is a separate pool that soaks
// damage before hp does, so it reads as pips tacked on the end rather than
// as more hearts.
function hearts(current, max, armour = 0) {
  let out = '';
  for (let i = 0; i < max; i++) out += tileSvg(i < current ? '🟩' : '⬜') || '';
  for (let i = 0; i < armour; i++) out += tileSvg('🛡️') || '';
  return out;
}

export function renderHud(elements, state, session) {
  const player = state.player;

  elements.hp.innerHTML = hearts(player.hp, player.hpMax, player.armour);
  elements.xp.textContent = player.xp + ' xp';
  elements.steps.textContent = state.turn + ' 👣';
  elements.kills.textContent = player.kills.length
    ? '⚔️ ' + player.kills.length
    : '⚔️ —';

  elements.inventory.innerHTML = player.inventory.length
    ? player.inventory.map((item) => tileSvg(item.emoji) || '').join('')
    : '—';

  const alive = state.monsters.filter((m) => !m.dead).length;
  elements.remaining.textContent = `${alive} left of ${state.monsters.length}`;

  elements.run.textContent = `run ${session.runNumber}`;
  elements.seed.textContent = 'seed ' + state.seed;
}

// Recent runs, newest first: how far each one got and how it ended.
// ⛩️ cleared the descent, 💀 died, 🕳️ ran out of turns.
export function renderHistory(element, history) {
  element.innerHTML = '';
  for (const entry of history) {
    const chip = document.createElement('span');
    chip.className = 'history-chip' + (entry.cleared ? ' cleared' : '');
    const icon = entry.cleared ? '⛩️' : entry.cause === 'timeout' ? '🕳️' : '💀';
    chip.innerHTML = `<span class="depth">${entry.depth}</span>${tileSvg(icon)}`;
    chip.title = `run ${entry.run}`;
    element.append(chip);
  }
}

// Turns the engine's log into something readable, newest last.
function describe(entry) {
  switch (entry.type) {
    case 'attack':
      if (entry.killed) {
        return entry.by === 'player'
          ? `killed the ${entry.target}`
          : `the ${entry.by} killed you`;
      }
      if (entry.damage === 0) {
        return entry.by === 'player'
          ? `missed the ${entry.target}`
          : `the ${entry.by} missed`;
      }
      return entry.by === 'player'
        ? `hit the ${entry.target} for ${entry.damage}`
        : `the ${entry.by} hit you for ${entry.damage}`;
    case 'open':
      return entry.found
        ? `opened the ${entry.chest} — found a ${entry.found}`
        : `opened the ${entry.chest} — empty`;
    case 'pickup': return `picked up the ${entry.item}`;
    case 'heal': return `drank a potion, +${entry.amount} hp`;
    case 'ascend': return 'reached the shrine';
    default: return entry.type;
  }
}

export function renderLog(element, state, limit = 9) {
  const recent = state.log.slice(-limit);
  element.innerHTML = '';
  for (const entry of recent) {
    const line = document.createElement('div');
    line.className = 'line';
    line.textContent = describe(entry);
    element.append(line);
  }
  element.scrollTop = element.scrollHeight;
}
