// The hub layout: one central room, a ring of rooms around it, corridors
// out to each. The hero starts in the middle and picks a direction.
//
// Read from DCSS's `layout_geoelf_octagon`, whose whole header comment is
// "A large central room, with 2 rings of other rooms around it" —
// docs/project/dcss-layouts.md has the study this came out of.
//
// WHY A SECOND GENERATOR AT ALL. ROT's Digger accretes: it glues a feature
// onto the wall of a feature it already dug, at random, until the quota is
// full. It has no notion of a centre, of a branch, or of how many ways lead
// out of anywhere — so a floor with a shape is not a setting of it, and no
// dial reaches one. The owner tuned it for a session and disliked every
// result, which is the evidence that the numbers were never the problem.
//
// Here the positions are COMPUTED, not searched. That is the whole
// difference, and it is what buys a floor you can recognise.
//
// WHAT IT GIVES THE REST OF THE PROJECT FOR FREE: the spine stops being
// discovered and starts being drawn. `spine.js` runs A* from the hero to
// the shrine and calls whatever it crosses mandatory — on a Digger floor
// that is a reading of an accident. Here the hero starts at the centre and
// the exit sits on the rim, so the route is one arm and every other arm is
// refusable by construction, which is the bargain docs/map-design.md
// describes.
//
// Returns the same `{ dug, rooms }` mapgen.js's Digger path returns, so
// everything downstream — the tile classification, spine.js, vault.js,
// spawn.js — cannot tell which generator ran.

// Undug ground kept between two rooms, so a corridor is what joins them
// rather than a shared wall. Not a dial: at 0 rooms fuse and the ring stops
// being a ring.
export const GAP = 2;

// Truncating centre, matching mapgen.js's `roomCenter` — ROT's own
// getCenter() rounds instead and lands on a different tile for odd spans.
export function centreOf(room) {
  return [
    Math.trunc((room.x1 + room.x2) / 2),
    Math.trunc((room.y1 + room.y2) / 2),
  ];
}

export function overlaps(a, b, gap = GAP) {
  return !(a.x2 + gap < b.x1 || b.x2 + gap < a.x1
    || a.y2 + gap < b.y1 || b.y2 + gap < a.y1);
}

// A room of `w` × `h` centred on (cx, cy), pushed inside the map's border.
// The border row and column are never dug — the wall ring needs somewhere
// to live, and spawn.js's scans assume it.
export function roomAt(cx, cy, w, h, size) {
  const x1 = Math.max(1, Math.min(size - 2 - (w - 1), Math.round(cx - (w - 1) / 2)));
  const y1 = Math.max(1, Math.min(size - 2 - (h - 1), Math.round(cy - (h - 1) / 2)));
  return { x1, y1, x2: x1 + w - 1, y2: y1 + h - 1, doors: [] };
}

// An L-shaped corridor between two points: along x, then along y, or the
// other way round. Both legs are dug whole — a corridor that crosses a room
// simply merges with it, which is why connectivity does not depend on the
// order rooms were placed.
export function digL(from, to, horizontalFirst, dug) {
  const [ax, ay] = from;
  const [bx, by] = to;
  const step = (a, b) => (a < b ? 1 : -1);
  if (horizontalFirst) {
    for (let x = ax; x !== bx + step(ax, bx); x += step(ax, bx)) dug.add(x + ',' + ay);
    for (let y = ay; y !== by + step(ay, by); y += step(ay, by)) dug.add(bx + ',' + y);
  } else {
    for (let y = ay; y !== by + step(ay, by); y += step(ay, by)) dug.add(ax + ',' + y);
    for (let x = ax; x !== bx + step(ax, bx); x += step(ax, bx)) dug.add(x + ',' + by);
  }
}

// Every tile of the corridor that sits immediately outside a room it
// touches becomes that room's door. Read from the finished dig rather than
// recorded while digging, so a corridor that clips a room it was not aimed
// at still gets a doorway instead of a hole in the wall.
export function markDoors(rooms, dug) {
  const inRoom = (r, x, y) => x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2;
  for (const key of dug) {
    const [x, y] = key.split(',').map(Number);
    for (const room of rooms) {
      if (inRoom(room, x, y)) continue;
      const touching = x >= room.x1 - 1 && x <= room.x2 + 1
        && y >= room.y1 - 1 && y <= room.y2 + 1;
      // Corners are not doorways — a diagonal is not a step (4-way
      // movement), so a corner tile would be a door nobody can use.
      const orthogonal = (x >= room.x1 && x <= room.x2)
        || (y >= room.y1 && y <= room.y2);
      if (touching && orthogonal) room.doors.push([x, y]);
    }
  }
}

// Builds the layout. `rng()` returns 0..1 and is the caller's stream —
// mapgen.js stays the one file that touches ROT's global RNG.
//
// `branches` is how many rooms the ring holds; `rings` is 1 or 2. Both are
// clamped rather than trusted: they arrive from a dial.
export function hubLayout(size, options = {}, rng = Math.random) {
  const roomW = options.roomWidth ?? [5, 9];
  const roomH = options.roomHeight ?? [4, 7];
  const branches = Math.max(2, Math.min(8, Math.round(options.hubBranches ?? 4)));
  const rings = Math.max(1, Math.min(2, Math.round(options.hubRings ?? 1)));

  const pick = ([lo, hi]) => lo + Math.floor(rng() * (hi - lo + 1));
  const centre = Math.trunc(size / 2);

  // THE ROOM SIZE IS SOLVED, NOT TAKEN. A ring of rooms around a hub is a
  // packing problem with three constraints at once, and the shipped room
  // range does not satisfy it on a 32-grid: measured, half the arms were
  // being dropped for overlap and the floor came out as a short chain.
  //
  // So the requested size is a CEILING. Shrink until the geometry closes:
  //
  //   the ring must clear the hub      R >= hubHalf + GAP + roomHalf
  //   the ring must stay on the map    R <= size/2 - 1 - roomHalf
  //   arms must not touch each other   2·R·sin(pi/branches) >= 2·roomHalf + GAP
  //
  // `half` is the half-DIAGONAL, because a ring room meets its neighbour
  // corner-first at most angles — using half the width understates it and
  // is what let the overlap check do the rejecting instead.
  const half = (w, h) => Math.sqrt((w / 2) ** 2 + (h / 2) ** 2);
  const fits = (w, h, hubW, hubH) => {
    const r = half(w, h);
    const inner = half(hubW, hubH) + GAP + r;
    const outer = size / 2 - 1 - r;
    if (inner > outer) return null;
    // The TIGHTEST ring decides, and with two rings that is the inner one:
    // the same room at a smaller radius has less arc to sit on.
    const tightest = rings > 1 ? inner : outer;
    const spread = 2 * tightest * Math.sin(Math.PI / branches);
    if (spread < 2 * r + GAP) return null;
    // AND the rings must clear each ONE ANOTHER, radially. Measured before
    // this line existed: on a 44-grid the two radii came out 0.5 tiles
    // apart, so the outer ring landed on top of the inner one and every
    // one of its rooms was dropped — a "two ring" floor that silently had
    // one. Two rings genuinely need either small rooms or a big grid, and
    // the shrink loop below is what finds out which.
    if (rings > 1 && outer - inner < 2 * r + GAP) return null;
    return { inner, outer };
  };

  // Shrink both the ring rooms and the hub together, a tile at a time, and
  // stop at the first size that closes. ROOM_MIN is the floor: below it a
  // room is a corridor with a label on it.
  const ROOM_MIN = 3;
  let w = pick(roomW);
  let h = pick(roomH);
  let hubW = Math.min(size - 4, w + 2);
  let hubH = Math.min(size - 4, h + 2);
  let span = fits(w, h, hubW, hubH);
  while (!span && (w > ROOM_MIN || h > ROOM_MIN)) {
    if (w > ROOM_MIN) w--;
    if (h > ROOM_MIN) h--;
    hubW = Math.max(ROOM_MIN, hubW - 1);
    hubH = Math.max(ROOM_MIN, hubH - 1);
    span = fits(w, h, hubW, hubH);
  }
  // Nothing closed even at the minimum — the grid is too small for this
  // many arms. Say so by returning nothing rather than by quietly drawing
  // a worse floor; mapgen.js falls back to the Digger.
  if (!span) return null;

  const dug = new Set();
  const rooms = [];

  // The hub. Deliberately the biggest room on the floor: it is where every
  // run starts and the one place the player sees several ways out at once,
  // so it has to read as a room rather than as the first cell of a warren.
  const hub = roomAt(centre, centre, hubW, hubH, size);
  rooms.push(hub);

  const radiusOf = (ring) => (rings === 1
    ? span.outer
    : span.inner + ((span.outer - span.inner) * (ring - 1)) / (rings - 1));

  // A quarter turn of slack on where the first arm points, so every floor
  // does not open with a corridor heading due east.
  const spin = rng() * Math.PI * 2;

  const placed = [];
  for (let ring = 1; ring <= rings; ring++) {
    const radius = radiusOf(ring);
    // The outer ring is offset half a step, so its rooms sit in the gaps
    // between the inner ring's rather than directly behind them.
    const offset = ring === 1 ? 0 : Math.PI / branches;
    const arms = [];
    for (let i = 0; i < branches; i++) {
      const angle = spin + offset + (i * Math.PI * 2) / branches;
      const cx = centre + Math.round(Math.cos(angle) * radius);
      const cy = centre + Math.round(Math.sin(angle) * radius);
      const room = roomAt(cx, cy, w, h, size);
      // A room that landed on one already there is DROPPED, not nudged.
      // Nudging turns a ring into a scatter, and a floor with three arms
      // instead of four is still a floor with a shape.
      if (rooms.some((other) => overlaps(room, other))) continue;
      rooms.push(room);
      arms.push(room);
    }
    placed.push(arms);
  }

  // Corridors. Every ring-1 room is joined to the hub and every ring-2 room
  // to its nearest ring-1 room, so the graph is a TREE rooted at the centre
  // — one route to anywhere, which is what makes an arm refusable rather
  // than merely long. Loops would be a second dial, and there is no
  // evidence yet that this floor wants them.
  const hubCentre = centreOf(hub);
  for (const room of placed[0] ?? []) {
    digL(hubCentre, centreOf(room), rng() < 0.5, dug);
  }
  for (const room of placed[1] ?? []) {
    const target = (placed[0] ?? []).reduce((best, other) => {
      if (!best) return other;
      const d = (a) => {
        const [ax, ay] = centreOf(a);
        const [bx, by] = centreOf(room);
        return (ax - bx) ** 2 + (ay - by) ** 2;
      };
      return d(other) < d(best) ? other : best;
    }, null);
    digL(centreOf(target ?? hub), centreOf(room), rng() < 0.5, dug);
  }

  // The rooms themselves are dug last, so a corridor leg that ran through
  // one does not leave a stray corridor tile inside it.
  for (const room of rooms) {
    for (let x = room.x1; x <= room.x2; x++) {
      for (let y = room.y1; y <= room.y2; y++) dug.add(x + ',' + y);
    }
    room.center = centreOf(room);
  }

  markDoors(rooms, dug);
  return { dug, rooms };
}
