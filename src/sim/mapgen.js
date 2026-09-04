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
import { hubLayout } from './layout-hub.js';
import { ringLayout } from './layout-ring.js';

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

// ROT's Digger, as a layout: hands back the same `{ dug, rooms }` the hub
// layout does, so `generateMap` below can pick between them and nothing
// after the pick knows which ran.
function diggerLayout(size, options) {
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

  return { dug, rooms };
}

// ===== The thematic catalogue — M51 =====
//
// The DCSS conclusion (docs/project/dcss-layouts.md), finally applied: not
// one parameterised generator but a SHELF of shapes, each with an identity
// a viewer can name. The owner's verdict on the ring (decisions.md M50) is
// why: variety BETWEEN seeds is worth more than structure within one.
//
// These three use ROT's own generators, which draw from ROT's global RNG —
// which is why they live HERE, in the one file allowed to touch it, and
// not beside layout-hub.js and layout-ring.js, which take a stream.

// Shared: ROT's room objects (Digger and Uniform use the same class) into
// our plain rects.
function rotRooms(generator) {
  return generator.getRooms().map((r) => {
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
}

// CRIPTA — ROT's Uniform: rooms of even size spread over the whole grid,
// each connected by short corridors. Reads as built space — orderly,
// denser in rooms than the warren, with natural loops between neighbours.
function uniformLayout(size, options) {
  const uniform = new ROT.Map.Uniform(size, size, {
    roomWidth: options.roomWidth ?? ROOM_WIDTH,
    roomHeight: options.roomHeight ?? ROOM_HEIGHT,
    roomDugPercentage: options.dugPercentage ?? MAP_DUG_PERCENTAGE,
  });
  const dug = new Set();
  uniform.create((x, y, value) => {
    if (value === 0) dug.add(x + ',' + y);
  });
  return { dug, rooms: rotRooms(uniform) };
}

// GRADE — ROT's Rogue: the original Rogue's 3x3 sectors, one room each,
// connected to grid neighbours. Loops by construction, so several real
// ways across — the closest shape to a Diablo floor the shelf has.
function rogueLayout(size, options) {
  const rogue = new ROT.Map.Rogue(size, size, {
    cellWidth: options.rogueCells ?? 3,
    cellHeight: options.rogueCells ?? 3,
    // Owner, 2026-08-18: the shelter floor reads AMPLE — big rooms, wide
    // halls — in contrast with the cave above it. Rooms near the cell
    // ceiling instead of ROT's smaller default.
    roomWidth: options.roomWidth ?? [6, 8],
    roomHeight: options.roomHeight ?? [5, 7],
  });
  const dug = new Set();
  rogue.create((x, y, value) => {
    if (value === 0) dug.add(x + ',' + y);
  });
  // Corridors two tiles wide, same owner note. ROT digs 1-wide; dilating
  // every dug tile one step right and down widens halls and leaves rooms
  // exactly as they were (their tiles are already dug — re-adding is a
  // no-op). Clamped inside the border ring.
  for (const key of [...dug]) {
    const [x, y] = key.split(',').map(Number);
    if (x + 1 <= size - 2) dug.add((x + 1) + ',' + y);
    if (y + 1 <= size - 2) dug.add(x + ',' + (y + 1));
  }
  // Rogue's rooms are plain {x, y, width, height} in a 2D cell array, and
  // it reports no doors. DELIBERATELY none are synthesised either: with the
  // wide corridors above, markDoors turned every room edge the hall runs
  // along into a strip of door tiles. Rooms opening straight into wide
  // halls IS the ample identity this theme is for.
  const rooms = [];
  for (const row of rogue.rooms) {
    for (const r of row) {
      if (!r || r.width <= 0 || r.height <= 0) continue;
      const room = {
        x1: r.x, y1: r.y, x2: r.x + r.width - 1, y2: r.y + r.height - 1,
        doors: [],
      };
      room.center = roomCenter(room);
      rooms.push(room);
    }
  }
  return { dug, rooms };
}

// CAVERNA — ROT's Cellular automaton: organic open space, the "mais
// aberto" of the shelf. No rooms exist, so a handful of PSEUDO-ROOMS are
// synthesised from open pockets — everything downstream (hero placement,
// spine classification) anchors on rooms, and a 3x3 patch of open floor is
// room enough for an anchor.
function caveLayout(size) {
  const cave = new ROT.Map.Cellular(size, size);
  // 0.45, not 0.5 — owner, 2026-08-18: the cave should read NARROW, tight
  // passages rather than open caverns, in contrast with the built floors
  // below it. Less initial floor survives the automaton as thinner veins.
  cave.randomize(0.45);
  for (let i = 0; i < 4; i++) cave.create();
  // The border stays rock — spawn.js's scans and the wall ring assume it.
  for (let i = 0; i < size; i++) {
    cave.set(i, 0, 0); cave.set(i, size - 1, 0);
    cave.set(0, i, 0); cave.set(size - 1, i, 0);
  }
  // Join the disconnected pockets, then read the result.
  const dug = new Set();
  try {
    cave.connect((x, y, value) => {
      if (value === 1) dug.add(x + ',' + y);
    }, 1);
  } catch {
    // connect() throws on a map with nothing to connect — a degenerate
    // roll. Signal "no floor" and let the Digger take it.
    return null;
  }

  // Pseudo-rooms: cut the grid into sectors; in each one with enough open
  // ground, anchor a 3x3 room on the most central open tile that fits one.
  const SECTOR = 8;
  const rooms = [];
  for (let sy = 0; sy < size; sy += SECTOR) {
    for (let sx = 0; sx < size; sx += SECTOR) {
      const open = [];
      for (let y = sy; y < Math.min(sy + SECTOR, size); y++) {
        for (let x = sx; x < Math.min(sx + SECTOR, size); x++) {
          if (dug.has(x + ',' + y)) open.push([x, y]);
        }
      }
      if (open.length < 10) continue;
      const cx = sx + SECTOR / 2;
      const cy = sy + SECTOR / 2;
      const fits3 = ([x, y]) => {
        for (let ox = -1; ox <= 1; ox++) {
          for (let oy = -1; oy <= 1; oy++) {
            if (!dug.has((x + ox) + ',' + (y + oy))) return false;
          }
        }
        return true;
      };
      const byCentre = open.slice().sort((a, b) => (
        (a[0] - cx) ** 2 + (a[1] - cy) ** 2) - ((b[0] - cx) ** 2 + (b[1] - cy) ** 2));
      // No 3x3 anywhere in the sector: no anchor. This used to fall back
      // to a single open tile, and that tile was usually a one-wide vein —
      // the hole (or, on the way back up, the hero's spawn) sat in it and
      // sealed off everything behind it (owner, 2026-09-03: "o buraco as
      // vezes ficou em um corredor de 1 tile"). A 3x3 patch always has a
      // ring to walk around its centre; a lone tile promises nothing.
      const anchor = byCentre.find(fits3);
      if (!anchor) continue;
      const room = {
        x1: anchor[0] - 1, y1: anchor[1] - 1,
        x2: anchor[0] + 1, y2: anchor[1] + 1,
        doors: [],
      };
      room.center = roomCenter(room);
      rooms.push(room);
    }
  }
  // Too few anchors is a floor nothing can be placed on sensibly.
  if (rooms.length < 3) return null;
  return { dug, rooms };
}

// A cave that came out with too few anchors is vetoed and rolled again —
// DCSS's answer, which docs/map-design.md reserves for a layout that cannot
// promise its shape by construction, and the automaton cannot. Each roll
// consumes the ROT stream in order, so the same seed still gives the same
// floor. Measured over 2000 seeds: 3 first rolls fail, none fail twice.
// The cap only exists so a pathological seed cannot spin forever; past it
// the Digger digs the floor, as for any layout that returns null.
const CAVE_ATTEMPTS = 3;
function caveLayoutWithRetries(size) {
  for (let attempt = 0; attempt < CAVE_ATTEMPTS; attempt++) {
    const cave = caveLayout(size);
    if (cave) return cave;
  }
  return null;
}

// Generates the dungeon. `mapSeed` is an int derived from the run seed.
//
// TWO LAYOUTS, one classification. `options.layout` picks which shape gets
// dug; everything below the pick — walls, corridors, doors, the tile array
// — is shared, which is what keeps spine.js, vault.js and spawn.js from
// ever needing to know. Adding a third layout is adding a case here and a
// file beside layout-hub.js.
//
// ROT's Digger stays the default. See docs/project/dcss-layouts.md for why
// there is a second one at all: DCSS has no generator with parameters, it
// has a catalogue and draws one per floor, and that is the thing worth
// copying rather than any particular algorithm.
export function generateMap(mapSeed, size = MAP_SIZE, options = {}) {
  ROT.RNG.setSeed(mapSeed);

  // Handed to the hub layout so this stays the ONE file that touches ROT's
  // global RNG — the same rule the header states, kept while the layouts
  // multiply.
  // The hub returns null when the grid is too small for the arms it was
  // asked for — a floor is not optional, so that falls back to the Digger
  // rather than failing. The dial can ask for something that does not fit;
  // the game still has to start.
  // M51 — 'sorteio' resolves to a concrete shape HERE, from the map's own
  // stream after setSeed, so the same floor of the same run always draws
  // the same theme. Only sorteio consumes the draw: a fixed layout keeps
  // the stream — and therefore every shipped map — byte-identical.
  let layout = options.layout;
  if (layout === 'sorteio') {
    const shelf = ['digger', 'uniform', 'rogue', 'cave', 'ring'];
    layout = shelf[Math.floor(ROT.RNG.getUniform() * shelf.length)];
  }

  const authored = layout === 'hub'
    ? hubLayout(size, options, () => ROT.RNG.getUniform())
    : layout === 'ring'
      ? ringLayout(size, options, () => ROT.RNG.getUniform())
      : layout === 'uniform'
        ? uniformLayout(size, options)
        : layout === 'rogue'
          ? rogueLayout(size, options)
          : layout === 'cave'
            ? caveLayoutWithRetries(size)
            : null;
  const { dug, rooms } = authored ?? diggerLayout(size, options);

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

  const map = { w: size, h: size, tiles, rooms };
  // M50 — the ring layout PROMISES a second hero-to-hole route, and this
  // flag is how spine.js knows to go looking for it. Derived maps (Digger,
  // hub) never set it: a loop the Digger happens to dig is an accident,
  // not a design, and classifying it would change the shipped game.
  if (authored && authored.twoRoutes) map.twoRoutes = true;
  return map;
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
