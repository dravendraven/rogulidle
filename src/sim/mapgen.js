// Seeded dungeon generation, wrapping ROT.js (the only external library),
// plus the tile helpers and pathfinding everything else builds on.
//
// Spec: docs/rogule-spec.md §2.
//
// ROT's Digger uses ROT's own global RNG, so this is the ONE place that
// touches it. Seeding it from our derived seed keeps the map deterministic;
// everything after generation uses our own streams (rng.js).

import * as ROT from 'https://cdn.jsdelivr.net/npm/rot-js@2.2.0/+esm';
import {
  MAP_SIZE, CORRIDOR_LENGTH, MAP_DUG_PERCENTAGE, ROOM_BIAS, ROOM_HEIGHT, ROOM_WIDTH,
} from './balance.js';

// Tiles the player and monsters may walk on. FAITHFUL engine.cljs:321.
const WALKABLE = ['room', 'door', 'corridor'];

export function tileAt(map, x, y) {
  if (x < 0 || y < 0 || x >= map.w || y >= map.h) return null;
  return map.tiles[y * map.w + x];
}

export function isWalkable(map, x, y) {
  return WALKABLE.includes(tileAt(map, x, y));
}

export function posKey(pos) {
  return pos[0] + ',' + pos[1];
}

export function samePos(a, b) {
  return a && b && a[0] === b[0] && a[1] === b[1];
}

// Straight-line distance squared. The original compares squared distances to
// avoid a sqrt, and visibility is defined in those terms (ui.cljs:153).
export function distSq(a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return dx * dx + dy * dy;
}

// Truncating centre, matching the original's `int` (map.cljs:41). ROT's own
// getCenter() rounds instead, which lands on a different tile for odd spans.
function roomCenter(room) {
  return [
    Math.trunc((room.x1 + room.x2) / 2),
    Math.trunc((room.y1 + room.y2) / 2),
  ];
}

// A* over 4-way movement. Returns [from, ..., to] inclusive, or [] if there
// is no route. `passable(x, y)` decides which tiles may be crossed.
//
// The argument order mirrors the original (map.cljs:58): ROT's AStar is
// constructed at `from` and computed from `to`, so the callback walks
// backwards and we reverse it.
export function findPath(from, to, passable) {
  const astar = new ROT.Path.AStar(from[0], from[1], passable, { topology: 4 });
  const path = [];
  astar.compute(to[0], to[1], (x, y) => path.push([x, y]));
  return path.reverse();
}

// Convenience: the passable test for the player (no entity blocking).
export function playerPassable(map) {
  return (x, y) => isWalkable(map, x, y);
}

// Generates the dungeon. `mapSeed` is an int derived from the run seed.
export function generateMap(mapSeed, size = MAP_SIZE, options = {}) {
  ROT.RNG.setSeed(mapSeed);

  const digger = new ROT.Map.Digger(size, size, {
    corridorLength: options.corridorLength ?? CORRIDOR_LENGTH,
    // M16 — previously unset, so ROT's own defaults applied and nobody had
    // chosen them.
    roomWidth: options.roomWidth ?? ROOM_WIDTH,
    roomHeight: options.roomHeight ?? ROOM_HEIGHT,
    // Fewer, smaller rooms than ROT's default 0.2, so the floor reads as a
    // route with rooms hanging off it instead of a warren where every way
    // through is equivalent. The spine/side design needs there to BE a
    // mandatory path.
    dugPercentage: options.dugPercentage ?? MAP_DUG_PERCENTAGE,
  });

  // The one place we reach past ROT's public surface, and the reason is that
  // there is no public surface for it: `_features` is the weight pair the
  // digger draws room-vs-corridor from, set in its constructor body and NOT
  // read from the options object. At its stock 4:4 the two are equally
  // likely, so dugPercentage buys rooms and corridors in lockstep and there
  // is no way to ask for one without the other.
  //
  // Safe to write here because the version is pinned twice over: mapgen.js
  // imports an exact CDN URL and tools/rot-cdn-hook.mjs throws if that
  // string ever drifts from the vendored copy the selftest hashes. A ROT
  // upgrade cannot slip past and silently turn this into a no-op.
  //
  // Written as bias-against-1 rather than the stock pair so the number reads
  // as what it is — a ratio. ROOM_BIAS 1 reproduces 4:4 exactly.
  digger._features = { room: options.roomBias ?? ROOM_BIAS, corridor: 1 };

  // Everything the digger carved out. value 0 = floor.
  const dug = new Set();
  digger.create((x, y, value) => {
    if (value === 0) dug.add(x + ',' + y);
  });

  const rooms = digger.getRooms().map((r) => {
    const room = {
      x1: r.getLeft(),
      y1: r.getTop(),
      x2: r.getRight(),
      y2: r.getBottom(),
      doors: [],
    };
    r.getDoors((x, y) => room.doors.push([x, y]));
    room.center = roomCenter(room);
    return room;
  });

  // Classify every position, in the same order the original merges them so
  // that later kinds win over earlier ones (generator.cljs:204):
  // room -> room wall -> corridor wall -> corridor -> door.
  const kind = new Map();

  const roomTiles = new Set();
  for (const room of rooms) {
    for (let x = room.x1; x <= room.x2; x++) {
      for (let y = room.y1; y <= room.y2; y++) {
        roomTiles.add(x + ',' + y);
        kind.set(x + ',' + y, 'room');
      }
    }
  }

  // Corridors are dug tiles that belong to no room.
  const corridorTiles = new Set();
  for (const key of dug) {
    if (!roomTiles.has(key)) corridorTiles.add(key);
  }

  // Walls are undug, non-room tiles touching a room or a corridor (the
  // original uses a full 3x3 neighbourhood, map.cljs:23).
  const touches = (x, y, set) => {
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        if (set.has((x + ox) + ',' + (y + oy))) return true;
      }
    }
    return false;
  };

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const key = x + ',' + y;
      if (dug.has(key) || roomTiles.has(key)) continue;
      if (touches(x, y, roomTiles)) kind.set(key, 'wall');
    }
  }
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      const key = x + ',' + y;
      if (dug.has(key) || roomTiles.has(key) || corridorTiles.has(key)) continue;
      if (touches(x, y, corridorTiles)) kind.set(key, 'wall');
    }
  }

  for (const key of corridorTiles) kind.set(key, 'corridor');
  for (const room of rooms) {
    for (const [x, y] of room.doors) kind.set(x + ',' + y, 'door');
  }

  const tiles = new Array(size * size).fill(null);
  for (const [key, value] of kind) {
    const [x, y] = key.split(',').map(Number);
    if (x < 0 || y < 0 || x >= size || y >= size) continue;
    tiles[y * size + x] = value;
  }

  return { w: size, h: size, tiles, rooms };
}

// Every walkable position, sorted, so that placement is reproducible.
// The original picks from a Clojure map whose key order we cannot reproduce
// in JS, so we impose one — see spec §9.4 on why determinism matters here.
export function walkablePositions(map, kinds = ['room', 'corridor']) {
  const out = [];
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      if (kinds.includes(tileAt(map, x, y))) out.push([x, y]);
    }
  }
  return out;
}
