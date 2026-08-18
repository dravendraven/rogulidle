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
import { findPath, tileAt } from './mapgen.js';

// Undug ground kept between the vault and everything else, so the stamp can
// never fuse the vault onto a room that is already there. Not a dial: at 0
// the vault can share a wall with an existing room and stop being a dead
// end, which is the whole design.
//
// Exported so the Lab can tell the player how big the free block actually
// has to be (`VAULT_SIZE + 2 × MARGIN`) without restating the ring size in
// a second place and letting the two drift.
export const VAULT_MARGIN = 1;
const MARGIN = VAULT_MARGIN;

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
      // The authored eight, unchanged. Anything past them is a second ring
      // for sweeping how much the room has to pay before entering it is a
      // fair bet — at `activation` 10 the whole 9x9 sits inside the
      // occupant's reach, so a further ring is no cheaper to collect.
      at(depth - 2, 2), at(depth - 2, mid), at(depth - 2, last - 2),  // in front
      at(depth, 1), at(depth, last - 1),                              // flanking
      at(depth + 2, 2), at(depth + 2, mid), at(depth + 2, last - 2),  // behind
      at(depth - 4, 2), at(depth - 4, mid), at(depth - 4, last - 2),
      at(depth - 3, 1), at(depth - 3, last - 1),
      at(depth + 1, 1), at(depth + 1, last - 1),
      at(depth - 1, 3),
    ].filter((p, i, all) => all.findIndex((q) => q[0] === p[0] && q[1] === p[1]) === i),
  };
}

// Writes the room, its pillars, the door and the tunnel into `map.tiles`,
// in the same order generateMap merges kinds so that later ones win:
// room -> corridor -> door -> wall. Walls are filled last and only onto
// ground still undug, so nothing already on the map is overwritten.
function writeTiles(map, rect, size, pillars, tunnel, seal = false) {
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

  // The wall ring, by the same 3x3 rule mapgen.js uses. In `seal` mode —
  // the eviction stamp on dense maps (M51) — the ring around the BODY also
  // overwrites WALKABLE neighbours, because there the vault sits against
  // ground that was open: without sealing, its sides would open onto
  // whatever was there and the room would stop being a dead end. Only the
  // body seals: the tunnel's neighbours keep the old null-only rule, or
  // the seal would wall over the very tile the tunnel lands on and cut the
  // room off the map — measured, one seed in three did exactly that.
  const written = new Set(touched.map(([x, y]) => x + ',' + y));
  const bodyKeys = new Set();
  for (let oy = 0; oy < size; oy++) {
    for (let ox = 0; ox < size; ox++) bodyKeys.add((rect[0] + ox) + ',' + (rect[1] + oy));
  }
  for (const [x, y] of touched) {
    const aroundBody = bodyKeys.has(x + ',' + y);
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const nx = x + ox;
        const ny = y + oy;
        if (!inBounds(map, nx, ny)) continue;
        if (written.has(nx + ',' + ny)) continue;
        const kind = tileAt(map, nx, ny);
        if (kind === null || (seal && aroundBody && WALKABLE.includes(kind))) set(nx, ny, 'wall');
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

  // M51 — THE EVICTION FALLBACK, for maps with no virgin rock. The themed
  // generators (grade, caverna, anel) fill the grid, so the pure scan above
  // finds nothing and floor 4 silently lost its Butcher — the game's one
  // progression gate. When and only when the scan fails, the vault takes
  // ground by force: candidate footprints may contain walkable tiles but
  // NEVER a tile of the mandatory route (the hero and shrine stand on its
  // ends, so both are covered), the one that swallows the least wins, and
  // the stamp SEALS its ring so the room stays a dead end. What this can
  // orphan is side ground; the route itself survives untouched by
  // construction. On maps where the pure scan succeeds — every Digger
  // floor measured — this path never runs.
  let seal = false;
  let winner = chosen || offSpine;
  if (!winner) {
    let best = null;
    for (let y = 1 + MARGIN; y + size + MARGIN <= map.h - 1; y++) {
      for (let x = 1 + MARGIN; x + size + MARGIN <= map.w - 1; x++) {
        let swallowed = 0;
        let ok = true;
        for (let oy = -MARGIN; oy < size + MARGIN && ok; oy++) {
          for (let ox = -MARGIN; ox < size + MARGIN; ox++) {
            const key = (x + ox) + ',' + (y + oy);
            if (onPath.has(key)) { ok = false; break; }
            const kind = tileAt(map, x + ox, y + oy);
            if (kind && WALKABLE.includes(kind)) swallowed++;
          }
        }
        if (!ok) continue;
        if (!best || swallowed < best.swallowed) best = { rect: [x, y], swallowed };
      }
    }
    if (best) {
      const tunnel = tunnelFrom(map, best.rect, size, onPath);
      if (tunnel) {
        winner = { rect: best.rect, tunnel };
        seal = true;
      }
    }
  }

  // STAGE TWO of the eviction — measured 1 rogue seed in 60: a route long
  // enough to snake the whole grid leaves NO footprint that avoids it, and
  // stage one gives up. On a map with loops the route is not sacred — it is
  // just the shortest path, and cutting it is fine IF another way around
  // exists. So: allow footprints over the route (never over its two ENDS,
  // where the hero and the hole physically stand), stamp on a snapshot,
  // verify hero→shrine connectivity survived, and revert if it did not.
  // Deterministic — candidates in swallowed-then-grid order, no draw — and
  // bounded to a couple dozen attempts.
  if (!winner) {
    const heroKey = path[0] ? path[0][0] + ',' + path[0][1] : null;
    const endKey = path.length ? path[path.length - 1][0] + ',' + path[path.length - 1][1] : null;
    const candidates = [];
    for (let y = 1 + MARGIN; y + size + MARGIN <= map.h - 1; y++) {
      for (let x = 1 + MARGIN; x + size + MARGIN <= map.w - 1; x++) {
        let swallowed = 0;
        let ok = true;
        for (let oy = -MARGIN; oy < size + MARGIN && ok; oy++) {
          for (let ox = -MARGIN; ox < size + MARGIN; ox++) {
            const key = (x + ox) + ',' + (y + oy);
            if (key === heroKey || key === endKey) { ok = false; break; }
            const kind = tileAt(map, x + ox, y + oy);
            if (kind && WALKABLE.includes(kind)) swallowed++;
          }
        }
        if (ok) candidates.push({ rect: [x, y], swallowed });
      }
    }
    candidates.sort((a, b) => a.swallowed - b.swallowed);
    const passable = (x, y) => WALKABLE.includes(tileAt(map, x, y));
    for (const cand of candidates.slice(0, 24)) {
      const tunnel = tunnelFrom(map, cand.rect, size, onPath);
      if (!tunnel) continue;
      const saved = map.tiles.slice();
      writeTiles(map, cand.rect, size, pillarsOf(cand.rect, size), tunnel.tunnel, true);
      const survives = path.length
        ? findPath(path[0], path[path.length - 1], passable).length > 0
        : true;
      if (survives) {
        winner = { rect: cand.rect, tunnel };
        seal = true;
        // The tiles are already written; writeTiles below would write the
        // same thing again, harmlessly — but restore first so the single
        // write path stays the only one that counts.
        map.tiles = saved;
        break;
      }
      map.tiles = saved;
    }
  }
  if (!winner) return null;

  const { rect, tunnel } = winner;
  const pillars = pillarsOf(rect, size);
  writeTiles(map, rect, size, pillars, tunnel.tunnel, seal);

  // An evicted stamp may have buried generated rooms. A room whose centre
  // is no longer walkable cannot anchor anything — drop it rather than
  // hand placement a dead anchor.
  if (seal) {
    map.rooms = map.rooms.filter((room) => {
      const t2 = tileAt(map, room.center[0], room.center[1]);
      return t2 !== null && WALKABLE.includes(t2);
    });
  }

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
