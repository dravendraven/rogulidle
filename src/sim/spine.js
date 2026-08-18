// The spine of a floor: which rooms you cannot avoid on the way out.
//
// The map design asks for a choice — a short mandatory path holding most of
// the threat, plus side rooms that can be skipped, holding fewer but nastier
// creatures and better chests. That is risk against reward: take the safe
// road, or detour for gear you will want three floors down.
//
// NOTHING IS DUG DIFFERENTLY FOR THIS. The Digger already produces maps with
// a route from the hero to the shrine and rooms hanging off it; we simply
// never looked. This file is a classification pass over a finished map, so
// it cannot fail to produce a map, and it changes no RNG stream.
//
// A room is SPINE when the hero-to-shrine path crosses its rectangle, and
// SIDE otherwise. The hero's own room and the shrine's room are always
// spine — the path starts and ends inside them.

import { findPath, playerPassable } from './mapgen.js';

// Is [x, y] inside the room's rectangle?
function inRoom(room, x, y) {
  return x >= room.x1 && x <= room.x2 && y >= room.y1 && y <= room.y2;
}

// Classifies the rooms of `map` against a hero at `playerPos` and a shrine
// at `shrinePos`.
//
// Returns { spine, side, path, roomOf(pos), isSide(pos) }, where `spine` and
// `side` are arrays of rooms and `path` is the route itself.
//
// `roomOf` answers with null for corridor tiles, and corridors count as
// spine ground when the path runs along them — a corridor the route uses is
// as mandatory as a room it crosses.
export function classifyRooms(map, playerPos, shrinePos) {
  const passable = playerPassable(map);
  const path = findPath(playerPos, shrinePos, passable);

  // Every tile the mandatory route touches, rooms and corridors alike.
  const onPath = new Set(path.map(([x, y]) => x + ',' + y));

  const roomOf = (pos) => {
    for (const room of map.rooms) if (inRoom(room, pos[0], pos[1])) return room;
    return null;
  };

  // M50 — the SECOND route, derived only when the layout promised one
  // (`map.twoRoutes`, set by the ring layout and nobody else). Block every
  // tile of the first route that sits outside the two end rooms, and run
  // A* again: what it finds is the other way around the ring. Derivation
  // rather than annotation keeps this a reading of the finished map, same
  // discipline as the rest of this file — and gating it on the promise
  // keeps a loop the Digger happens to dig from reclassifying the shipped
  // game by accident.
  const heroRoom = roomOf(playerPos);
  const shrineRoom = roomOf(shrinePos);
  let longPath = [];
  if (map.twoRoutes && path.length) {
    const blocked = new Set();
    for (const [x, y] of path) {
      const inEnd = (heroRoom && inRoom(heroRoom, x, y))
        || (shrineRoom && inRoom(shrineRoom, x, y));
      if (!inEnd) blocked.add(x + ',' + y);
    }
    const detourPassable = (x, y) => passable(x, y) && !blocked.has(x + ',' + y);
    longPath = findPath(playerPos, shrinePos, detourPassable);
  }
  const onLong = new Set(longPath.map(([x, y]) => x + ',' + y));
  const twoRoutes = longPath.length > 0;

  const spine = [];
  const side = [];
  const shortSet = new Set();
  const longSet = new Set();
  for (const room of map.rooms) {
    const crossedShort = path.some(([x, y]) => inRoom(room, x, y));
    const crossedLong = !crossedShort
      && longPath.some(([x, y]) => inRoom(room, x, y));
    if (crossedShort) shortSet.add(room);
    if (crossedLong) longSet.add(room);
    (crossedShort || crossedLong ? spine : side).push(room);
  }

  // A position is SIDE ground when it sits in a room NO route enters.
  // Corridors are never side: they are either on a route or they are the
  // way to a side room, and in both cases the danger there is unavoidable
  // for anyone who commits to the detour.
  const sideSet = new Set(side);
  const isSide = (pos) => {
    const room = roomOf(pos);
    return room !== null && sideSet.has(room);
  };

  // Which ROUTE a position belongs to: 'short', 'long', or null for side
  // ground and off-route corridors. End rooms are crossed by both routes
  // and read as 'short' — they are where the choice is made, not part of
  // either bet.
  const routeOf = (pos) => {
    const room = roomOf(pos);
    if (room) {
      if (shortSet.has(room)) return 'short';
      if (longSet.has(room)) return 'long';
      return null;
    }
    const key = pos[0] + ',' + pos[1];
    if (onPath.has(key)) return 'short';
    if (onLong.has(key)) return 'long';
    return null;
  };

  // The ZONE placement thinks in. Three values, and on a map with no
  // second route it degrades to exactly the old two: side stays side, and
  // everything that is not side is 'short' — the mandatory ground.
  const zoneAt = (pos) => (isSide(pos) ? 'side' : (routeOf(pos) ?? 'short'));

  return {
    spine, side, path, onPath, roomOf, isSide,
    longPath, onLong, routeOf, zoneAt, twoRoutes,
  };
}

// Share of a floor's threat mass that sits on the spine — the number the
// owner's "at least 70%" requirement is about.
//
// Mass, not headcount: a floor can put 70% of its CREATURES on the spine and
// still hide the dangerous half in a side room, because cost tracks
// hp × (xp − 1) rather than bodies (see difficulty.js).
export function spineShare(state) {
  let spineMass = 0;
  let total = 0;
  for (const monster of state.monsters) {
    // M43 — the vault's occupant is not part of the bargain this number
    // measures. Its mass is larger than a whole ordinary floor's, so
    // counting it would read as "the floor hid everything in a side room"
    // when what actually happened is that one authored room was added.
    // Refusable mass belongs to no zone's share.
    if (monster.vault) continue;
    const mass = monster.hpMax * Math.max(0, monster.xp - 1);
    total += mass;
    if (!monster.side) spineMass += mass;
  }
  return total > 0 ? spineMass / total : 1;
}
