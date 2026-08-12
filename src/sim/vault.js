// M43 — the vault: one fixed room, stamped onto a finished map.
//
// Design in docs/project/candidates.md (M43). Everything generated is a
// draw from a distribution; this is the one place on the descent where a
// LAYOUT is authored, because the defect it answers — floors 2 to 6 all
// costing the same — is one a dial cannot reach.
//
// THREE PROPERTIES, AND NONE OF THEM IS A PROBABILITY.
//
//   side       one door and a dead end, stamped after the shrine was
//              already placed, so the hero->shrine path can never enter it.
//              Skippable by construction, not by a dial.
//   seen       the door opens onto a tile of the mandatory route, so the
//              hero walks past it. A choice has to be informed
//              (docs/project/objectives.md) and this is what informs it.
//   silent     the search is a deterministic grid scan. IT CONSUMES NO
//              RANDOMNESS, which is the same property that makes spine.js
//              safe to run, and the reason classifyRooms can simply be run
//              AGAIN after a stamp rather than being patched to know about
//              this file.
//
// Nothing here is dug by ROT. Like spine.js this only reads a finished map
// — and then writes tiles into it, which is the one way it differs.

import { VAULT_SIZE } from './balance.js';
import { tileAt } from './mapgen.js';

// Undug ground kept between the vault and everything else, so the stamp can
// never fuse the vault onto a room that is already there. Not a dial: at 0
// the vault can share a wall with an existing room and stop being a dead
// end, which is the whole design.
const MARGIN = 1;

// How far the connecting tunnel may reach. Not a dial either — measured
// over 200 floors, the tunnel actually needed is 2 tiles at the median and
// 8 at the worst, so this is the observed maximum rather than a preference.
const MAX_TUNNEL = 8;

const WALKABLE = ['room', 'corridor', 'door'];

function inBounds(map, x, y) {
  return x >= 0 && y >= 0 && x < map.w && y < map.h;
}

// Tile kinds this file may dig through on its way out of the vault: undug
// ground, and the wall ring that surrounds every walkable tile on the map.
// Cutting the ring is what makes a doorway; anything else would be joining
// two rooms into one.
function diggable(map, x, y) {
  if (!inBounds(map, x, y)) return false;
  const t = tileAt(map, x, y);
  return t === null || t === 'wall';
}

// Can the vault's own body sit on [x, y]? Undug, and MARGIN clear of
// anything at all — including the map's edge, which `tileAt` reports as
// null and would otherwise read as free ground.
function bodyFree(map, x, y) {
  for (let oy = -MARGIN; oy <= MARGIN; oy++) {
    for (let ox = -MARGIN; ox <= MARGIN; ox++) {
      const nx = x + ox;
      const ny = y + oy;
      if (!inBounds(map, nx, ny)) return false;
      if (tileAt(map, nx, ny) !== null) return false;
    }
  }
  return true;
}

// Every rectangle of free ground the vault would fit in, in grid order.
// The order IS the tie-break, and it is what keeps this reproducible
// without a draw.
function freeRectangles(map, size) {
  const out = [];
  for (let y = 1; y + size <= map.h - 1; y++) {
    for (let x = 1; x + size <= map.w - 1; x++) {
      let ok = true;
      for (let oy = 0; oy < size && ok; oy++) {
        for (let ox = 0; ox < size; ox++) {
          if (!bodyFree(map, x + ox, y + oy)) { ok = false; break; }
        }
      }
      if (ok) out.push([x, y]);
    }
  }
  return out;
}

// The shortest straight tunnel out of `rect` that ends on a walkable tile.
// Every position on every side is tried, not just the midpoints — measured,
// midpoints alone find a route on 69% of floors and all four sides in full
// find one on 99.5%.
//
// A tunnel that lands ON the spine path always beats one that does not,
// however much longer it is: being walked past is the point, and length is
// only the tie-break within each class.
function tunnelFrom(map, rect, size, onPath) {
  const [x, y] = rect;
  const exits = [];
  for (let i = 0; i < size; i++) {
    exits.push({ from: [x + i, y - 1], step: [0, -1] });
    exits.push({ from: [x + i, y + size], step: [0, 1] });
    exits.push({ from: [x - 1, y + i], step: [-1, 0] });
    exits.push({ from: [x + size, y + i], step: [1, 0] });
  }

  let best = null;
  let offSpine = null;
  for (const { from, step } of exits) {
    const tunnel = [];
    let cx = from[0];
    let cy = from[1];
    for (let i = 0; i <= MAX_TUNNEL; i++) {
      if (!inBounds(map, cx, cy)) break;
      if (WALKABLE.includes(tileAt(map, cx, cy))) {
        if (tunnel.length) {
          const hit = { tunnel, join: [cx, cy] };
          if (onPath.has(cx + ',' + cy)) {
            if (!best || tunnel.length < best.tunnel.length) best = hit;
          } else if (!offSpine || tunnel.length < offSpine.tunnel.length) {
            offSpine = hit;
          }
        }
        break;
      }
      if (!diggable(map, cx, cy)) break;
      tunnel.push([cx, cy]);
      cx += step[0];
      cy += step[1];
    }
  }

  if (best) return { ...best, onSpine: true };
  // A vault that is merely harder to find beats a floor that has none.
  if (offSpine) return { ...offSpine, onSpine: false };
  return null;
}

// The four pillars, inset one tile from the rectangle's corners. Derived
// from the size rather than listed, so the layout survives the size being
// changed and there is no second place stating what the room looks like.
export function pillarsOf(rect, size = VAULT_SIZE) {
  const [x, y] = rect;
  const near = 1;
  const far = size - 2;
  return [
    [x + near, y + near], [x + far, y + near],
    [x + near, y + far], [x + far, y + far],
  ];
}

// Writes the room, its pillars, the door and the tunnel into `map.tiles`,
// in the same order generateMap merges kinds so that later ones win:
// room -> corridor -> door -> wall. Walls are filled last and only onto
// ground still undug, so nothing already on the map is overwritten.
function writeTiles(map, rect, size, pillars, tunnel) {
  const set = (x, y, kind) => { map.tiles[y * map.w + x] = kind; };
  const touched = [];

  for (let oy = 0; oy < size; oy++) {
    for (let ox = 0; ox < size; ox++) {
      const x = rect[0] + ox;
      const y = rect[1] + oy;
      set(x, y, 'room');
      touched.push([x, y]);
    }
  }

  for (let i = tunnel.length - 1; i >= 1; i--) {
    set(tunnel[i][0], tunnel[i][1], 'corridor');
    touched.push(tunnel[i]);
  }
  set(tunnel[0][0], tunnel[0][1], 'door');
  touched.push(tunnel[0]);

  // Pillars come after the room fill that would otherwise have buried them.
  // They are ordinary wall, so isWalkable already refuses them and no other
  // file needs to learn what a pillar is.
  for (const [x, y] of pillars) set(x, y, 'wall');

  // The wall ring, by the same 3x3 rule mapgen.js uses.
  for (const [x, y] of touched) {
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const nx = x + ox;
        const ny = y + oy;
        if (!inBounds(map, nx, ny)) continue;
        if (tileAt(map, nx, ny) === null) set(nx, ny, 'wall');
      }
    }
  }
}

// Stamps the vault onto `map`. `path` is the hero->shrine route, which is
// what the door is aimed at. Returns a description of what was stamped, or
// null when this floor had nowhere to put one — measured at 1 seed in 200,
// and skipping is the same failure rule the shrine guardian already uses.
//
// MUTATES `map`: tiles are written and one room is appended to `map.rooms`.
// The caller must re-run classifyRooms afterwards, which is free.
export function stampVault(map, path, size = VAULT_SIZE) {
  const onPath = new Set(path.map(([x, y]) => x + ',' + y));

  let chosen = null;
  let offSpine = null;
  for (const rect of freeRectangles(map, size)) {
    const tunnel = tunnelFrom(map, rect, size, onPath);
    if (!tunnel) continue;
    const slot = { rect, tunnel };
    if (tunnel.onSpine) {
      if (!chosen || tunnel.tunnel.length < chosen.tunnel.tunnel.length) chosen = slot;
    } else if (!offSpine || tunnel.tunnel.length < offSpine.tunnel.tunnel.length) {
      offSpine = slot;
    }
  }

  const winner = chosen || offSpine;
  if (!winner) return null;

  const { rect, tunnel } = winner;
  const pillars = pillarsOf(rect, size);
  writeTiles(map, rect, size, pillars, tunnel.tunnel);

  const room = {
    x1: rect[0],
    y1: rect[1],
    x2: rect[0] + size - 1,
    y2: rect[1] + size - 1,
    doors: [tunnel.tunnel[0].slice()],
    center: [rect[0] + Math.trunc((size - 1) / 2), rect[1] + Math.trunc((size - 1) / 2)],
    // Read by spawn.js to keep the ordinary roster out, and by anything
    // that has to tell an authored room from a generated one.
    vault: true,
  };
  map.rooms.push(room);

  return {
    room,
    pillars,
    door: room.doors[0],
    join: tunnel.join,
    onSpine: tunnel.onSpine,
  };
}

// Is [x, y] inside the vault's rectangle? The pillars count — a tile that
// is walled off is still the vault's ground, and everything that reserves
// the room wants the whole rectangle rather than only its floor.
export function inVault(vault, x, y) {
  if (!vault) return false;
  const r = vault.room;
  return x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2;
}
