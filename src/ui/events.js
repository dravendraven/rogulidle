// U10 — the half of a run that the map does not show.
//
// A blow that misses, a blow the armour ate, a potion drunk, an item picked
// up, a chest that held nothing: all of it already happens and none of it
// was visible, so a viewer could watch a run end and not be able to say why.
// `docs/project/objectives.md` asks for the opposite — the outcome has to be
// attributable from watching — and these floating signals are that, and
// nothing more.
//
// TURN IT OFF WITH `?events=off`, no code change needed. `ENABLED_BY_DEFAULT`
// below is the code-level switch for whoever wants the page to open quiet.
//
// Reads the engine's own log rather than diffing states: every one of these
// events is already recorded there, with the turn it happened on, so this
// invents nothing and cannot disagree with what the engine did.
//
// ONE EXCEPTION, and it is deliberate: reading the book is a STATE that
// lasts five turns, not an event that happens once, and the log only records
// the moment it finishes. A viewer needs to see the four turns before that
// too, or the hero simply stands still for most of a room with no reason
// given. So the layer also reads `player.reading` off the state it is handed
// — a fact the engine already keeps, not one invented here.

import { ITEM_TABLE, VISIBLE_DIST } from '../sim/balance.js';
import { tileSvg } from './tiles.js';

export const ENABLED_BY_DEFAULT = true;

// The player is always the centre cell of the viewport (see render.js).
const CENTRE = VISIBLE_DIST;
const VIEW = VISIBLE_DIST * 2;

// At speed the signals would pile into an unreadable stack, so the layer
// keeps only the most recent few alive.
const MAX_ALIVE = 14;

const EMOJI_OF = new Map(ITEM_TABLE.map((item) => [item.name, item.emoji]));

const glyph = (emoji) => tileSvg(emoji) || '';

// `?events=off` — anything but "off" leaves them on, so a typo shows the
// signals rather than silently hiding them.
export function eventsEnabled(search = location.search) {
  const asked = new URLSearchParams(search).get('events');
  if (asked === null) return ENABLED_BY_DEFAULT;
  return asked !== 'off';
}

// Where the hero stands is the centre; everything else is placed relative
// to it, in the same frame of reference render.js draws with.
function cellOf(pos, playerPos) {
  return {
    col: CENTRE + (pos[0] - playerPos[0]),
    row: CENTRE + (pos[1] - playerPos[1]),
  };
}

// The creature a player attack landed on. The log carries its NAME, not its
// tile — but an attack is a move into an adjacent tile and the hero does not
// move to make it, so the target is adjacent in the very state being drawn.
function targetCell(state, name) {
  const [px, py] = state.player.pos;
  const hit = state.monsters.find((m) => m.name === name
    && Math.abs(m.pos[0] - px) + Math.abs(m.pos[1] - py) === 1);
  return hit ? cellOf(hit.pos, state.player.pos) : { col: CENTRE, row: CENTRE };
}

// One log entry becomes zero or more signals. `kind` only picks the colour.
function signalsFor(entry, state) {
  const here = { col: CENTRE, row: CENTRE };

  if (entry.type === 'attack' && entry.by === 'player') {
    const at = targetCell(state, entry.target);
    if (!entry.damage) return [{ html: '✗', kind: 'miss', ...at }];
    const out = [{ html: `−${entry.damage}`, kind: 'deal', ...at }];
    if (entry.killed) out.push({ html: glyph('💀'), kind: 'deal', ...at });
    return out;
  }

  if (entry.type === 'attack' && entry.target === 'player') {
    if (!entry.damage) return [{ html: '✗', kind: 'miss', ...here }];
    // `toHp` is how much got PAST the armour bar, so the difference is what
    // the shield ate — the event this whole item exists for, since a hero
    // losing armour looks identical to one losing nothing.
    const toHp = entry.toHp ?? entry.damage;
    const soaked = entry.damage - toHp;
    const out = [];
    if (soaked > 0) out.push({ html: `${glyph('🛡️')}−${soaked}`, kind: 'armour', ...here });
    if (toHp > 0) out.push({ html: `−${toHp}`, kind: 'hurt', ...here });
    return out;
  }

  if (entry.type === 'heal') {
    // `amount` is what the hero actually gained, so a potion drunk at full
    // health logs 0 — and that waste is exactly what a viewer should see.
    return entry.amount > 0
      ? [{ html: `+${entry.amount}`, kind: 'heal', ...here }]
      : [{ html: `${glyph('🥃')}✗`, kind: 'miss', ...here }];
  }

  if (entry.type === 'read') {
    // Fires on the LAST of the five turns, which is when the bar jumps —
    // the four before it are told by the hero holding the book on the
    // board (src/ui/render.js), not by a signal repeated five times.
    return [{ html: `${glyph('📜')}+${entry.healed}`, kind: 'heal', ...here }];
  }

  if (entry.type === 'pickup') {
    return [{ html: glyph(EMOJI_OF.get(entry.item) || '❓'), kind: 'gain', ...here }];
  }

  if (entry.type === 'open') {
    return entry.found
      ? [{ html: `${glyph('📦')}${glyph(EMOJI_OF.get(entry.found) || '❓')}`, kind: 'gain', ...here }]
      : [{ html: `${glyph('📦')}✗`, kind: 'miss', ...here }];
  }

  return [];                                  // 'ascend' — the floor change says it
}

// Owns a transparent layer over the grid and spends the engine's log into
// it, one frame at a time. `show(state)` is the whole interface: hand it
// the state being drawn and it renders whatever happened since the last one.
export function makeEventLayer(stage, grid, { enabled = true } = {}) {
  if (!enabled || !stage || !grid) return { show: () => {} };

  const layer = document.createElement('div');
  layer.className = 'event-layer';
  stage.append(layer);

  let shown = 0;                              // log entries already spent

  return {
    show(state) {
      const log = state.log;
      // A new floor is a new state with an empty log — the counter follows
      // it down rather than needing the caller to announce the floor.
      if (log.length < shown) shown = 0;

      // The read in progress, once per turn of it, over the hero's own tile.
      // Counted DOWN so the signal answers "how much longer" rather than
      // only "something is happening" — five identical puffs would say the
      // first and not the second.
      const reading = state.player.reading || 0;
      const fresh = log.length > shown ? log.slice(shown) : [];
      shown = log.length;
      if (!fresh.length && !reading) return;

      const size = grid.clientWidth / VIEW;
      let stacked = 0;

      if (reading) {
        const float = document.createElement('div');
        float.className = 'event-float reading';
        float.innerHTML = `${glyph('📜')}<span>${reading}</span>`;
        float.style.left = `${grid.offsetLeft + (CENTRE + 0.5) * size}px`;
        float.style.top = `${grid.offsetTop + (CENTRE - 0.35) * size}px`;
        float.addEventListener('animationend', () => float.remove());
        layer.append(float);
        stacked++;
      }

      for (const entry of fresh) {
        for (const signal of signalsFor(entry, state)) {
          if (signal.col < 0 || signal.col >= VIEW) continue;
          if (signal.row < 0 || signal.row >= VIEW) continue;

          const float = document.createElement('div');
          float.className = 'event-float ' + signal.kind;
          float.innerHTML = signal.html;
          float.style.left = `${grid.offsetLeft + (signal.col + 0.5) * size}px`;
          // Several signals in one turn are common — a blow that kills and
          // the pickup that follows — so they stack upward instead of
          // landing on top of each other.
          float.style.top = `${grid.offsetTop + (signal.row - 0.35) * size - stacked * 14}px`;
          stacked++;
          float.addEventListener('animationend', () => float.remove());
          layer.append(float);
        }
      }

      while (layer.children.length > MAX_ALIVE) layer.firstElementChild.remove();
    },
  };
}
