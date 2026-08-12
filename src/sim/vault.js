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

// And how SHORT it may be. A longer approach does not hide anything — sight
// here is by distance and passes through walls, measured, so the hero sees
// the occupant from the doorway on every seed either way. What it does is
// make entering cost more without making the creature heavier, which
// matters because a heavier creature is simply refused by the bot rather
// than fought. The frontier gate charges the danger accumulated along the
// route, so every extra tile inside the menace field widens the gap between
// a cautious hero and a greedy one. A preference, not a requirement: the
// shortest tunnel available still wins when nothing reaches this.
const MIN_TUNNEL = 4;

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

// Is `a` a better approach than `b`? Long enough beats too short, and then
// the shortest of the long-enough ones wins so the corridor lands near
// MIN_TUNNEL rather than sprawling. Among tunnels that all fall short, the
// longest is closest to what was wanted. `b` null means anything beats it.
function betterTunnel(a, b) {
  if (!b) return true;
  const aLong = a.tunnel.length >= MIN_TUNNEL;
  const bLong = b.tunnel.length >= MIN_TUNNEL;
  if (aLong !== bLong) return aLong;
  return aLong
    ? a.tunnel.length < b.tunnel.length
    : a.tunnel.length > b.tunnel.length;
}

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
            if (betterTunnel(hit, best)) best = hit;
          } else if (betterTunnel(hit, offSpine)) {
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
//
// THEY ARE LEGIBILITY, NOT TACTICS, and this is worth stating because the
// opposite was believed and then measured. The claim was that a pillar
// forces the danger flood around it and so makes a cheap pocket behind it.
// It does not: on a 4-connected grid an isolated one-tile obstacle never
// lengthens a route, because every monotone way around it is the same
// length. Compared tile by tile, the vault's price grid is identical with
// the pillars and without them — only the pillar tiles themselves differ,
// by not existing.
//
// What they do instead is the job nothing else can do here: the xp badge
// under a creature shows xp and never hp, so a 16-hp Butcher looks exactly
// like a vampire until it refuses to die. The ROOM has to be the warning
// label, and a pillared hall is what makes it one on sight.
export function pillarsOf(rect, size = VAULT_SIZE) {
  const [x, y] = rect;
  const near = 1;
  const far = size - 2;
  return [
    [x + near, y + near], [x + far, y + near],
    [x + near, y + far], [x + far, y + far],
  ];
}

// The room read from its own door: `depth` 0 is the row just inside the
// doorway and `size - 1` is the far wall, `lateral` runs across it. The
// door can be on any of the four sides, so everything placed inside has to
// be stated in these terms or "at the back" means a different corner on
// every seed.
export function orientationOf(room, door, size = VAULT_SIZE) {
  const [dx, dy] = door;
  if (dy < room.y1) return (d, l) => [room.x1 + l, room.y1 + d];        // door north
  if (dy > room.y2) return (d, l) => [room.x1 + l, room.y2 - d];        // door south
  if (dx < room.x1) return (d, l) => [room.x1 + d, room.y1 + l];        // door west
  return (d, l) => [room.x2 - d, room.y1 + l];                          // door east
}

// Where the occupant stands and where its chests sit.
//
// EVERY CHEST IS INSIDE ITS REACH, and that is the whole design rather than
// a detail. `guardCost` (src/bot/bot.js) charges the creature's entire duel
// against any chest within its activation radius, so what the radius covers
// decides what the loot costs. An earlier version put two chests by the
// door, outside the reach, meaning to offer a graded room — measured, they
// were opened in 89.7% of vaults against 39.2% for the guarded ones, and
// the room stopped being a barrier at all. Nearly every hero skimmed the
// free pair and left.
//
// So the room is one bet again, deliberately. The eight sit in three rows
// around the occupant — two tiles in front, either side of it, and two
// behind — none further than four tiles from it, comfortably inside the
// radius with room for that value to move without silently freeing a chest.
//
// The occupant still stands at the BACK rather than dead centre: a hero
// that wants any of this has to cross the room to reach it, which is what
// makes entering the decision instead of passing the door.
export function layoutOf(room, door, size = VAULT_SIZE) {
  const at = orientationOf(room, door, size);
  const last = size - 1;
  const mid = Math.trunc(last / 2);
  const depth = size - 3;
  return {
    boss: at(depth, mid),
    chests: [
      at(depth - 2, 2), at(depth - 2, mid), at(depth - 2, last - 2),  // in front
      at(depth, 1), at(depth, last - 1),                              // flanking
      at(depth + 2, 2), at(depth + 2, mid), at(depth + 2, last - 2),  // behind
    ],
  };
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
      if (betterTunnel(tunnel, chosen && chosen.tunnel)) chosen = slot;
    } else if (betterTunnel(tunnel, offSpine && offSpine.tunnel)) {
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
    // How long the approach came out. Read by the tests and worth having on
    // the state: it is the one part of the room's shape the scan cannot
    // guarantee, so a floor where it came out short is a floor where the
    // vault is cheaper to enter than intended.
    tunnel: tunnel.tunnel.length,
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
