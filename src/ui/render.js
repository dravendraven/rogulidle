// Draws a frame. No game logic lives here — it only reads.
//
// The viewport is the original's: 18x18 tiles following the player, with
// opacity falling off by distance (ui.cljs:148). On top of that we dim in
// what the bot REMEMBERS but cannot currently see, which is the whole point
// of the fog decision being real — you can watch the map fill in.

import { CLEAR_DIST, VISIBLE_DIST } from '../sim/balance.js';
import { weaponDamage, weaponMinDamage } from '../sim/combat.js';
import { distSq, posKey } from '../sim/mapgen.js';
import { tileSvg } from './tiles.js';
import { depthTheme } from './depth-theme.js';

const VIEW = VISIBLE_DIST * 2;                 // 18 cells across
const VISIBLE_SQ = VISIBLE_DIST * VISIBLE_DIST;
const CLEAR_SQ = CLEAR_DIST * CLEAR_DIST;

const PLAYER_GLYPH = '🧝';
const CORPSE_GLYPH = '💀';

let cells = [];

// Which walls/doors the current floor draws — see src/ui/depth-theme.js.
// Module state like `cells` above, and for the same reason: it changes once
// per floor, not once per cell, so threading it through every call in
// renderFrame's double loop would be noise.
let theme = depthTheme(1);

// Only `room` and `corridor` are floor, and floor draws nothing — the
// .stage background shows through, which is what depth-theme's `stage`
// class repaints.
function tileGlyph(tile) {
  if (tile === 'wall') return theme.wall;
  if (tile === 'door') return theme.door;
  return '';
}

// Called once per floor, before its frames play. `stageElement` is the
// .stage box; the tier's class is what lets style.css redefine --floor.
export function applyDepth(stageElement, level) {
  theme = depthTheme(level);
  if (stageElement) stageElement.className = 'stage' + (theme.stage ? ' ' + theme.stage : '');
}

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
    // Debug only, and empty every other frame — the bot's score for the
    // tile. Its own span rather than reusing `badge`, which carries a
    // monster's xp: the whole reason to look at a score is to compare it
    // against what the target is worth, so one may not overwrite the other.
    const net = document.createElement('span');
    net.className = 'net';
    cell.append(glyph, badge, net);
    container.append(cell);
    cells.push({ cell, glyph, badge, net });
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

// The bot's own figure for a goal, or null if that branch does not carry
// one. The bot ranks goals by `price` (hp to acquire, lower is better);
// shrine and frontier goals carry no score at all — so this reads
// defensively rather than assuming a shape. Shown negated so the on-screen
// convention stays "higher is better".
function goalScore(goal) {
  if (!goal) return null;
  if (Number.isFinite(goal.price)) return -goal.price;
  return null;
}

const signed = (n) => (n > 0 ? '+' : '') + n.toFixed(1);

// `debug`, when given, is { danger, goal } and paints the bot's reasoning
// over the map: how dangerous it believes each tile to be, and what it is
// currently heading for. Phase 4 item 22 — you need this the moment the bot
// does something that looks stupid, because usually it is not.
// `glyph` is the hero's own face (src/sim/heroes.js). It is a parameter
// rather than read off the state because it is PRESENTATION: the engine has
// no opinion about what the hero looks like, and a run replays the same
// whichever emoji is on top of it. Unset is the hero the game shipped with.
export function renderFrame(state, belief, debug = null, heroGlyph = PLAYER_GLYPH) {
  const player = state.player.pos;
  const truth = trueAt(state);
  const memory = believedAt(belief);
  const goalKey = debug && debug.goal && debug.goal.pos ? posKey(debug.goal.pos) : null;
  const goalNet = debug ? goalScore(debug.goal) : null;

  for (let row = 0; row < VIEW; row++) {
    for (let column = 0; column < VIEW; column++) {
      const x = player[0] - VISIBLE_DIST + column;
      const y = player[1] - VISIBLE_DIST + row;
      const key = x + ',' + y;
      const { cell, glyph, badge, net } = cells[row * VIEW + column];

      const away = distSq(player, [x, y]);
      const inSight = away <= VISIBLE_SQ;
      const remembered = belief.tiles.has(key);

      let text = '';
      let sub = '';
      let opacity = 0;
      let known = true;

      if (inSight) {
        opacity = away > CLEAR_SQ ? 0.75 : 1;
        text = tileGlyph(state.map.tiles[y * state.map.w + x]);
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
        text = tileGlyph(belief.tiles.get(key));
        const top = topmost(memory.get(key) || []);
        if (top) {
          text = top.entity.emoji;
          if (top.kind === 'monster') sub = String(top.entity.xp);
        }
      }

      // The player is always drawn on top of their own tile.
      // NOT `glyph` — that name is the DOM node a few lines down, and
      // assigning the element here handed `tileSvg` an object, which misses
      // the map and paints an EMPTY TILE without a word in the console.
      //
      // The hero keeps his own face while reading. Swapping it for the book
      // was the first attempt and it read wrong: the figure you are
      // following vanishes for five turns, which looks like he left rather
      // than like he is busy. The read is announced over him instead, by the
      // signal layer (src/ui/events.js).
      if (x === player[0] && y === player[1]) {
        text = heroGlyph;
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
        // Only the winner is labelled, because only the winner is in the
        // trace. The bot scores every candidate the same way and throws
        // the losers away in chooseGoal — publishing that pool is a
        // src/bot/ change, filed rather than done here.
        net.textContent = (key === goalKey && goalNet !== null) ? signed(goalNet) : '';
      } else if (cell.style.background || net.textContent) {
        cell.style.background = '';
        net.textContent = '';
        cell.classList.remove('goal');
      }
    }
  }
}

// Health first, then the armour bar. Armour is a separate pool that soaks
// damage before hp does, so it reads as pips tacked on the end rather than
// as more hearts.
// What "carrying" shows: the items the hero still HAS. Armour is not one of
// them — a shield is spent the moment it is picked up, into the pips beside
// the hearts, so listing it here showed a thing the hero is not holding.
// Shared with the summary cards so both read the same list.
export function carriedSvg(inventory) {
  const kept = inventory.filter((item) => !item.armour);
  return kept.length ? kept.map((item) => tileSvg(item.emoji) || '').join('') : '—';
}

// `filled` is a parameter rather than a second copy of this loop: the boss
// bar wants the same pips in another colour, and the one thing that must not
// drift between the two is what an empty pip looks like. Red for the enemy
// so the two bars are never read as the same pool — green is the hero's, and
// they can be on screen at once.
function hearts(current, max, armour = 0, filled = '🟩') {
  let out = '';
  for (let i = 0; i < max; i++) out += tileSvg(i < current ? filled : '⬜') || '';
  for (let i = 0; i < armour; i++) out += tileSvg('🛡️') || '';
  return out;
}

export function renderHud(elements, state, session) {
  const player = state.player;

  elements.hp.innerHTML = hearts(player.hp, player.hpMax, player.armour);

  // xpEarned carries across floors; state.turn resets to 0 at each one. The
  // rate is only meaningful over the whole run, so session.turnOffset (the
  // turn count banked from floors already finished) makes up the gap — 0
  // for the legacy single-floor mode, where there is nothing to add.
  const totalTurns = (session.turnOffset || 0) + state.turn;
  elements.xpEarned.textContent = player.xpEarned + ' xp';
  elements.xpRate.textContent =
    (totalTurns > 0 ? (player.xpEarned / totalTurns).toFixed(2) : '0.00') + ' xp/turn';

  elements.steps.textContent = state.turn + ' 👣';
  elements.kills.textContent = player.kills.length
    ? '⚔️ ' + player.kills.length
    : '⚔️ —';

  // The damage DIE, not the average: what one blow can roll between. Reads
  // straight off the same two functions combat.js rolls with, so it cannot
  // drift from what actually happens — a weapon that widens the die shows
  // up here the turn it is picked up.
  if (elements.damage) {
    const max = Math.max(0, player.xp + weaponDamage(player) - 1);
    const min = Math.min(weaponMinDamage(player), max);
    elements.damage.textContent = `🗡️ ${min} - ${max}`;
  }

  elements.inventory.innerHTML = carriedSvg(player.inventory);

  elements.run.textContent = `run ${session.runNumber}`;
  elements.seed.textContent = 'seed ' + state.seed;
}

// The decision behind the frame on screen, in one line, for debug mode.
// Reads a trace entry from src/bot/bot.js: which goal won and what it
// scored, the step the route planner picked for it, and whether the
// tactical search overruled that step.
export function renderDebugInfo(element, entry) {
  if (!element) return;
  if (!entry) { element.textContent = ''; return; }

  const score = goalScore(entry.goal);
  const target = entry.goal ? entry.goal.kind : '—';
  const parts = [`goal ${target}${score === null ? '' : ' ' + signed(score)}`];

  element.textContent = parts.join(' · ');
}

// Recent runs, newest first: how far each one got and how it ended.
// 🟩 cleared the descent, 💀 died, 🕳️ ran out of turns.
//
// Cleared is NOT the hole any more: the hole is what a floor's exit looks
// like now, and the timeout chip already owned that glyph — two identical
// icons in one strip say nothing. Green is the same "made it" the hp bar
// already uses.
// U11 — the achievements strip under the history. Two rows, redrawn whole
// on every change; `justEarned` is the id that flipped this run, which is
// the only thing that gets the celebration class.
export function renderAchievements(element, list, earned, justEarned = null) {
  element.innerHTML = '';
  for (const a of list) {
    const got = Boolean(earned[a.id]);
    const row = document.createElement('div');
    row.className = 'ach' + (got ? ' earned' : '') + (a.id === justEarned ? ' just' : '');

    const icon = document.createElement('span');
    icon.className = 'ach-icon';
    icon.innerHTML = tileSvg(a.emoji) || '';

    const text = document.createElement('span');
    text.className = 'ach-text';
    const title = document.createElement('span');
    title.className = 'ach-title';
    title.textContent = a.title;
    const sub = document.createElement('span');
    sub.className = 'ach-sub';
    sub.textContent = got ? a.earned : a.locked;
    text.append(title, sub);

    const stamp = document.createElement('span');
    stamp.className = 'ach-stamp';
    stamp.textContent = got ? `run ${earned[a.id].run}` : '';

    row.append(icon, text, stamp);
    element.append(row);
  }
}

export function renderHistory(element, history) {
  element.innerHTML = '';
  for (const entry of history) {
    const chip = document.createElement('span');
    chip.className = 'history-chip' + (entry.cleared ? ' cleared' : '');
    const icon = entry.cleared ? '🟩' : entry.cause === 'timeout' ? '🕳️' : '💀';
    chip.innerHTML = `<span class="depth">${entry.depth}</span>${tileSvg(icon)}`;
    chip.title = `run ${entry.run}`;
    element.append(chip);
  }
}

// ***** M50 — the boss bar *****
//
// The vault's occupant is the only fight in the game worth announcing, and
// the only creature the player has a reason to track blow by blow: it is
// twice as fast, it is the one guaranteed drop, and it is what an
// achievement is gated on.
//
// IT DRAWS THE TRUTH, and that is a VIEW decision the bot does not share.
// The hero is never told any creature's hp (src/sim/observe.js) — `duelCost`
// runs on `assumedHp`, a guess from the bestiary average that decays as it
// lands blows. So the bar can read full while the hero flees, or nearly
// empty while he commits. That gap is real and it is on screen on purpose;
// what must never happen is the reverse, a bot that reads this.
//
// The channel rule is safe by construction: this takes `state`, it lives in
// src/ui/, and test/tests.js already fails any read of GameState from
// src/bot/. Nothing here is passed to anything the bot can see.
//
// Shown while the creature is ALIVE AND AWAKE — `activation` covers the
// whole vault, so it appears on entering the room and goes when the fight
// is over either way. `hidden` rather than opacity: an empty bar with no
// fight behind it is the one state that would read as broken.
export function renderBossBar(element, state) {
  if (!element) return;

  const boss = state.monsters.find((m) => m.vault && !m.dead);
  const player = state.player.pos;
  const awake = boss && distSq(player, boss.pos) < boss.activation * boss.activation;
  if (!awake) {
    element.hidden = true;
    return;
  }

  const name = element.querySelector('.boss-bar-name');
  const hp = element.querySelector('.boss-bar-hp');
  // The name is written once per appearance, not per turn — it never changes
  // and the bar redraws every frame. No numbers beside it: the pips ARE the
  // count, and a figure that says the same thing twice is the one the eye
  // stops reading.
  if (name.textContent !== boss.name) name.textContent = boss.name;

  // Rebuilt only when the count moves. The pips are inline SVG, so redrawing
  // twelve of them every frame at 8x would be the most expensive thing on
  // the page for no visible difference.
  const shown = `${boss.hp}/${boss.hpMax}`;
  if (hp.dataset.shown !== shown) {
    hp.innerHTML = hearts(boss.hp, boss.hpMax, 0, '🟥');
    hp.dataset.shown = shown;
  }
  element.hidden = false;
}
