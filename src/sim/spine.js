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

  const spine = [];
  const side = [];
  for (const room of map.rooms) {
    const crossed = path.some(([x, y]) => inRoom(room, x, y));
    (crossed ? spine : side).push(room);
  }

  const roomOf = (pos) => {
    for (const room of map.rooms) if (inRoom(room, pos[0], pos[1])) return room;
    return null;
  };

  // A position is SIDE ground when it sits in a room the route never enters.
  // Corridors are never side: they are either on the route or they are the
  // way to a side room, and in both cases the danger there is unavoidable
  // for anyone who commits to the detour.
  const sideSet = new Set(side);
  const isSide = (pos) => {
    const room = roomOf(pos);
    return room !== null && sideSet.has(room);
  };

  return { spine, side, path, onPath, roomOf, isSide };
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
