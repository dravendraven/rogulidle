// Draws a frame. No game logic lives here — it only reads.
//
// The viewport is the original's: 18x18 tiles following the player, with
// opacity falling off by distance (ui.cljs:148). On top of that we dim in
// what the bot REMEMBERS but cannot currently see, which is the whole point
// of the fog decision being real — you can watch the map fill in.

import { CLEAR_DIST, TURN_BUDGET, monsterEmoji, VISIBLE_DIST } from '../sim/balance.js';
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
function hearts(current, max, armour = 0, filled = '🟩', empty = '⬜') {
  let out = '';
  for (let i = 0; i < max; i++) out += tileSvg(i < current ? filled : empty) || '';
  for (let i = 0; i < armour; i++) out += tileSvg('🛡️') || '';
  return out;
}

export function renderHud(elements, state, session) {
  const player = state.player;

  elements.hp.innerHTML = hearts(player.hp, player.hpMax, player.armour);

  // Stamina — the turn budget, drawn as a draining bar. Ten pips, each a
  // tenth of TURN_BUDGET, so the bar reads the same on any budget. It
  // DRAINS rather than fills because what it shows is what is LEFT of the
  // traversal, and a full-at-the-end bar would read as the opposite. The
  // bot never reads this number (owner decision, src/sim/balance.js) —
  // this bar is the player's information, not the bot's.
  if (elements.stamina) {
    const left = Math.max(0, TURN_BUDGET - state.turn);
    const pips = Math.ceil((left / TURN_BUDGET) * 10);
    elements.stamina.innerHTML = hearts(pips, 10, 0, '⚡');
  }

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

// WHEN, not "run N". The run number this used to print came from a counter
// that restarts at every page load while the achievement store does not, so
// after one reload it pointed at somebody else's run — see the note on
// `earn` in src/ui/achievements.js. The instant is the one field in a
// receipt that still means the same thing tomorrow.
//
// The visitor's own locale, no format of ours: this is a date and every
// browser already knows how the person reading it writes one.
function stampDate(at) {
  if (!Number.isFinite(at)) return '';
  return new Date(at).toLocaleDateString();
}

// U11 — the achievements strip under the history. Two rows, redrawn whole
// on every change; `justEarned` is the id that flipped this run, which is
// the only thing that gets the celebration class.
//
// `progress` is `getProgress()`'s answer (src/ui/achievements.js): for a
// row still locked that some run came close to, the locked sentence gives
// way to the record (docs/project/feitos-progresso.md). Never as a third
// line — the owner took the date line out of this card for its height
// (2026-09-04), and a bar that put it back would be the same mistake.
//
// TWO WAYS TO DRAW IT, one switch. With `PROGRESS_PIPS` on (owner's
// design, 2026-09-04) the sentence's line holds the game's own pips — the
// boss bar's language, a number beside them, the sentence as the tooltip.
// Off, the card fills from the left behind the text and the sentence is
// printed — the first version, kept so the pips can be reverted by
// flipping this rather than by digging the old code out of git.
export const PROGRESS_PIPS = true;

export function renderAchievements(element, list, earned, justEarned = null, progress = {}) {
  element.innerHTML = '';
  for (const a of list) {
    const got = Boolean(earned[a.id]);
    const near = !got && progress[a.id] ? progress[a.id] : null;
    const pips = Boolean(near && PROGRESS_PIPS);
    const row = document.createElement('div');
    row.className = 'ach' + (got ? ' earned' : '') + (a.id === justEarned ? ' just' : '')
      + (near && !pips ? ' progress' : '');
    if (near && !pips) row.style.setProperty('--fill', `${Math.round(near.fraction * 100)}%`);
    if (pips) row.title = near.text;

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
    if (pips) {
      sub.classList.add('pips');
      const bar = document.createElement('span');
      bar.className = 'ach-pips';
      bar.innerHTML = hearts(near.filled, near.total, 0, near.glyph, '⬛');
      const num = document.createElement('span');
      num.className = 'ach-num';
      num.textContent = near.label;
      sub.append(bar, num);
    } else {
      sub.textContent = got ? a.earned : (near ? near.text : a.locked);
    }
    text.append(title, sub);
    // The date is a tooltip, not a line: as a third line it was a fifth of
    // the card's height in a row that sits above the board (owner,
    // 2026-09-04).
    if (got) row.title = stampDate(earned[a.id].at);

    row.append(icon, text);
    element.append(row);
  }
}

// Recent runs, newest first: how far each one got and how it ended.
// 🟩 cleared the descent, 💀 died, 🕳️ ran out of turns.
//
// Cleared is NOT the hole any more: the hole is what a floor's exit looks
// like now, and the timeout chip already owned that glyph — two identical
// icons in one strip say nothing. Green is the same "made it" the hp bar
// already uses.
//
// `list` is ACHIEVEMENTS, the same array `renderAchievements` takes — a chip
// needs the TITLE of what its run earned for the tooltip, and the ids are all
// the session keeps (src/ui/spectator.js).
export function renderHistory(element, history, list = []) {
  element.innerHTML = '';
  for (const entry of history) {
    // U11 — which achievements this run was the FIRST to earn. Empty for
    // every ordinary run, and empty for the hundredth Butcher too: `earn`
    // reports only the first time, and a strip where half the chips are green
    // marks nothing.
    //
    // Ids rather than a boolean, so the tooltip can NAME the thing. That
    // matters more here than it looks: the chip already shows what killed the
    // run, and "died to the boar" and "killed the pig" are both true of the
    // same run — the pig dies on floor 4 and the floor kills you anyway. The
    // strip could never say the second one, which is exactly how a correct
    // achievement came to look like a lie.
    const won = (entry.earned || [])
      .map((id) => list.find((a) => a.id === id))
      .filter(Boolean);

    const chip = document.createElement('span');
    chip.className = 'history-chip' + (entry.cleared ? ' cleared' : '')
      + (won.length ? ' achieved' : '');
    const icon = entry.cleared ? '🟩' : entry.cause === 'timeout' ? '🕳️' : '💀';

    // WHAT KILLED IT, beside the skull. A row of identical skulls says only
    // "it died", which the depth number already said; the creature is the
    // part a viewer can learn from — five wolves in a row is a difficulty
    // reading, and the pig showing up at all means the vault was entered.
    //
    // Only on a death: a clear has no killer and a run out of turns was not
    // killed by anything. `monsterEmoji` returns null for both, and for any
    // name whose glyph is missing, so the chip falls back to the skull alone
    // rather than to an empty box (src/ui/tiles.js draws nothing it does not
    // know).
    const killer = entry.cleared ? null : monsterEmoji(entry.killedBy);
    const killerSvg = killer ? tileSvg(killer) : null;

    // ONE trophy however many were earned at once. The chip is eleven pixels
    // tall and already carries two glyphs; a second cup would say nothing the
    // first did not, and the tooltip lists them all anyway.
    const trophy = won.length ? (tileSvg('🏆') || '') : '';

    chip.innerHTML = `<span class="depth">${entry.depth}</span>${tileSvg(icon)}`
      + (killerSvg || '') + trophy;
    const parts = [`run ${entry.run}`];
    if (entry.killedBy) parts.push(entry.killedBy);
    for (const a of won) parts.push(`🏆 ${a.title}`);
    chip.title = parts.join(' — ');
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
