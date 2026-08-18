// The ring layout: rooms on a circle joined in a CYCLE, so there are two
// ways around — M50, the generator half of the two-spine map design
// (docs/map-design.md, "The owner's target shape").
//
// The hub layout (layout-hub.js) is a TREE: one route to anywhere, which is
// what makes an arm refusable. This one is the opposite bet: a cycle, so the
// hero's room and the hole's room split the ring into TWO ARCS, and reaching
// the hole means committing to one. The hero sits a THIRD of the way around
// from the hole — not opposite — so one arc is genuinely shorter, by
// construction rather than by luck.
//
// SPUR rooms hang INWARD off the ring, dead ends — the side bets, parallel
// to both routes, exactly where docs/map-design.md puts them.
//
// The hero and shrine rooms are AUTHORED here (`role` on the room), because
// spawn.js's usual longest-pair placement would put them diametrically
// opposite and delete the asymmetry this layout exists for. spawn.js honours
// the roles when present.
//
// Returns `{ dug, rooms, twoRoutes: true }` — the same shape the other
// layouts return, plus the one flag spine.js needs to go looking for the
// second route. Positions are computed, not searched, same as the hub.

import { GAP, centreOf, digL, markDoors, overlaps, roomAt } from './layout-hub.js';

export function ringLayout(size, options = {}, rng = Math.random) {
  const roomW = options.roomWidth ?? [5, 9];
  const roomH = options.roomHeight ?? [4, 7];
  const count = Math.max(6, Math.min(12, Math.round(options.ringRooms ?? 8)));
  const spurs = Math.max(0, Math.min(6, Math.round(options.ringSpurs ?? 3)));

  const pick = ([lo, hi]) => lo + Math.floor(rng() * (hi - lo + 1));
  const centre = Math.trunc(size / 2);
  const half = (w, h) => Math.sqrt((w / 2) ** 2 + (h / 2) ** 2);

  // Same solving discipline as the hub: the requested room size is a
  // CEILING, shrunk until the ring closes on this grid. Two constraints:
  // the ring must fit inside the border, and neighbouring rooms must not
  // touch along the arc.
  const fits = (w, h) => {
    const r = half(w, h);
    const outer = size / 2 - 1 - r;
    if (outer <= r + GAP) return null;
    const spread = 2 * outer * Math.sin(Math.PI / count);
    if (spread < 2 * r + GAP) return null;
    return { outer };
  };

  const ROOM_MIN = 3;
  let w = pick(roomW);
  let h = pick(roomH);
  let span = fits(w, h);
  while (!span && (w > ROOM_MIN || h > ROOM_MIN)) {
    if (w > ROOM_MIN) w--;
    if (h > ROOM_MIN) h--;
    span = fits(w, h);
  }
  // The grid cannot hold this many rooms in a cycle. Say so; mapgen.js
  // falls back to the Digger, same contract as the hub.
  if (!span) return null;

  const spin = rng() * Math.PI * 2;
  const angleOf = (i) => spin + (i * Math.PI * 2) / count;

  // The ring itself. A dropped room would BREAK THE CYCLE — the whole point
  // of the layout — so unlike the hub's arms, an overlap here aborts the
  // layout instead of degrading it.
  const rooms = [];
  for (let i = 0; i < count; i++) {
    const cx = centre + Math.round(Math.cos(angleOf(i)) * span.outer);
    const cy = centre + Math.round(Math.sin(angleOf(i)) * span.outer);
    const room = roomAt(cx, cy, w, h, size);
    if (rooms.some((other) => overlaps(room, other))) return null;
    room.arc = 'ring';
    rooms.push(room);
  }

  // Hero at room 0, hole a third of the way around — clamped so both arcs
  // keep at least one room between the ends. count 8 puts the hole at 3:
  // two rooms one way, four the other.
  const holeAt = Math.max(2, Math.min(count - 2, Math.round(count / 3)));
  rooms[0].role = 'hero';
  rooms[holeAt].role = 'shrine';

  // Spurs, hung inward off ring rooms that are not an end. Overlap drops
  // the spur — a bet that did not fit is a floor with fewer bets, not a
  // broken floor.
  const spurW = Math.max(ROOM_MIN, w - 2);
  const spurH = Math.max(ROOM_MIN, h - 2);
  const innerR = span.outer - (half(w, h) + half(spurW, spurH) + GAP);
  const eligible = rooms
    .map((room, i) => ({ room, i }))
    .filter(({ i }) => i !== 0 && i !== holeAt);
  const spurRooms = [];
  for (let s = 0; s < spurs && eligible.length && innerR > half(spurW, spurH); s++) {
    const at = Math.floor(rng() * eligible.length);
    const [{ room, i }] = eligible.splice(at, 1);
    const cx = centre + Math.round(Math.cos(angleOf(i)) * innerR);
    const cy = centre + Math.round(Math.sin(angleOf(i)) * innerR);
    const spur = roomAt(cx, cy, spurW, spurH, size);
    if (rooms.concat(spurRooms).some((other) => overlaps(spur, other))) continue;
    spur.arc = 'spur';
    spur.parent = room;
    spurRooms.push(spur);
  }

  // Corridors: the cycle first, then each spur to its parent.
  const dug = new Set();
  for (let i = 0; i < count; i++) {
    digL(centreOf(rooms[i]), centreOf(rooms[(i + 1) % count]), rng() < 0.5, dug);
  }
  for (const spur of spurRooms) {
    digL(centreOf(spur.parent), centreOf(spur), rng() < 0.5, dug);
    delete spur.parent;
  }

  const all = rooms.concat(spurRooms);
  for (const room of all) {
    for (let x = room.x1; x <= room.x2; x++) {
      for (let y = room.y1; y <= room.y2; y++) dug.add(x + ',' + y);
    }
    room.center = centreOf(room);
  }

  markDoors(all, dug);
  return { dug, rooms: all, twoRoutes: true };
}
