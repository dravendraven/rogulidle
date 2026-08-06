// The fog-of-war layer. Spec: docs/rogule-spec.md §12.
//
// Three representations, and keeping them apart is the whole point:
//   GameState   the truth. Only the engine and a debug view may read it.
//   Observation what the player perceives this turn.
//   Belief      accumulated memory, folded from every Observation so far.
//
// The bot reads Belief and nothing else. If it ever touches GameState the
// fog is decoration — test/tests.js guards this.
//
// Visibility is by DISTANCE, not line of sight: the original compares
// squared distance and never raycasts, so you see through walls inside the
// radius (ui.cljs:153). That is deliberate — it is what makes "pick the room
// with the weaker monster" a decision at all. Spec §12.1.

import { VISIBLE_DIST } from './balance.js';
import { distSq, posKey, tileAt } from './mapgen.js';

const VISIBLE_DIST_SQ = VISIBLE_DIST * VISIBLE_DIST;

export function isVisible(playerPos, pos) {
  return distSq(playerPos, pos) <= VISIBLE_DIST_SQ;
}

function copyEntity(entity) {
  return JSON.parse(JSON.stringify(entity));
}

export function observe(state) {
  const map = state.map;
  const from = state.player.pos;

  const visible = new Set();
  const tiles = new Map();

  // Walk the bounding box of the radius, keeping only what is close enough.
  for (let y = from[1] - VISIBLE_DIST; y <= from[1] + VISIBLE_DIST; y++) {
    for (let x = from[0] - VISIBLE_DIST; x <= from[0] + VISIBLE_DIST; x++) {
      if (x < 0 || y < 0 || x >= map.w || y >= map.h) continue;
      if (!isVisible(from, [x, y])) continue;
      const key = x + ',' + y;
      visible.add(key);
      tiles.set(key, tileAt(map, x, y));
    }
  }

  const seen = (entity) => visible.has(posKey(entity.pos));

  return {
    turn: state.turn,
    outcome: state.outcome,
    // You always know your own hp, xp, inventory and step count.
    player: copyEntity(state.player),
    visible,
    tiles,
    monsters: state.monsters.filter(seen).map(copyEntity),
    items: state.items.filter(seen).map(copyEntity),
    covers: state.covers.filter(seen).map(copyEntity),
    shrine: seen(state.shrine) ? copyEntity(state.shrine) : null,
  };
}

export function emptyBelief() {
  return {
    turn: 0,
    outcome: null,
    player: null,
    seen: new Set(),
    tiles: new Map(),
    monsters: new Map(),
    items: new Map(),
    covers: new Map(),
    shrine: null,
  };
}

function cloneBelief(belief) {
  return {
    turn: belief.turn,
    outcome: belief.outcome,
    player: belief.player,
    seen: new Set(belief.seen),
    tiles: new Map(belief.tiles),
    monsters: new Map(belief.monsters),
    items: new Map(belief.items),
    covers: new Map(belief.covers),
    shrine: belief.shrine,
  };
}

// Inside the visible radius the observation is authoritative: anything
// remembered there that is no longer reported has gone. Outside it, memory
// stands untouched.
function refresh(remembered, observed, visible, turn) {
  const next = new Map(remembered);

  for (const [id, entity] of remembered) {
    if (visible.has(posKey(entity.pos))) next.delete(id);
  }
  for (const entity of observed) {
    next.set(entity.id, { ...entity, lastSeenTurn: turn });
  }
  return next;
}

export function foldBelief(belief, obs) {
  const b = cloneBelief(belief);

  b.turn = obs.turn;
  b.outcome = obs.outcome;
  b.player = obs.player;

  // Terrain never changes, so once seen it is known for good.
  for (const [key, kind] of obs.tiles) {
    b.tiles.set(key, kind);
    b.seen.add(key);
  }

  // Covers, loose items and corpses are static too, but they can be consumed,
  // so they still need the visible-region refresh.
  b.covers = refresh(b.covers, obs.covers, obs.visible, obs.turn);
  b.items = refresh(b.items, obs.items, obs.visible, obs.turn);

  // Monsters are the only entity whose remembered position goes stale. They
  // are static outside their activation radius though, so a memory taken
  // from far away stays exact for as long as the bot keeps its distance —
  // see bot-strategy §1.
  b.monsters = refresh(b.monsters, obs.monsters, obs.visible, obs.turn);

  if (obs.shrine) b.shrine = { ...obs.shrine, lastSeenTurn: obs.turn };

  return b;
}
