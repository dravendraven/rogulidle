// Navigation over the BELIEF, not the map. The bot never sees the real
// dungeon (CLAUDE.md), so everything here works from remembered tiles.
//
// Unknown tiles count as walkable. That is deliberate and documented in
// docs/bot.md: it is what lets a route aim into the dark,
// which is how the bot explores. The risk of the dark is charged once, in
// the target score — not twice, by also pretending it is solid.

import { MAP_SIZE } from '../sim/balance.js';

const WALKABLE = ['room', 'door', 'corridor'];
const STEPS = [[0, -1], [0, 1], [-1, 0], [1, 0]];

export function key(pos) {
  return pos[0] + ',' + pos[1];
}

export function unkey(k) {
  const [x, y] = k.split(',');
  return [+x, +y];
}

// The grid's own bounds, off the belief. `MAP_SIZE` is the fallback for a
// belief that has not folded an observation yet — and it used to be the
// ONLY answer, which is what made the grid unchangeable: a bigger map and
// the router simply refused to leave the first 32 columns.
function boundsOf(belief) {
  return [belief.w ?? MAP_SIZE, belief.h ?? MAP_SIZE];
}

export function believedWalkable(belief) {
  const [w, h] = boundsOf(belief);
  return (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    const kind = belief.tiles.get(x + ',' + y);
    if (kind === undefined) return true;          // never seen — worth trying
    return WALKABLE.includes(kind);
  };
}

// Breadth-first flood from `origin`. Returns the step count to every
// reachable tile plus the parent links needed to rebuild a route.
//
// The whole believed map is about 200 walkable tiles, so this is cheap
// enough to run a couple of times per turn and beats calling A* per
// candidate target.
export function flood(origin, passable, maxDist = Infinity) {
  const dist = new Map();
  const from = new Map();
  const queue = [origin];
  dist.set(key(origin), 0);

  for (let head = 0; head < queue.length; head++) {
    const pos = queue[head];
    const d = dist.get(key(pos));
    if (d >= maxDist) continue;               // nothing further out matters
    for (const [dx, dy] of STEPS) {
      const next = [pos[0] + dx, pos[1] + dy];
      const nextKey = key(next);
      if (dist.has(nextKey)) continue;
      if (!passable(next[0], next[1])) continue;
      dist.set(nextKey, d + 1);
      from.set(nextKey, pos);
      queue.push(next);
    }
  }
  return { dist, from };
}

// Weighted flood: same shape as `flood`, but every tile carries a price and
// the field holds the CHEAPEST total, not the fewest steps.
//
// Prices are in hp, so a route that strolls past a wolf costs more than the
// long way round, and one number compares walking against fighting. Steps
// are still tracked separately, because some things (opening a chest) cost
// turns rather than danger.
//
// `priceOf(x, y)` returns the hp charged for standing on that tile, or
// Infinity for somewhere the bot refuses to go.
//
// `isSink(x, y)` marks a tile that can be ENTERED but never left: it gets a
// cost and a route, and no route may continue through it. B16
// (docs/backlog.md) — the shrine is exactly this and nothing else in the
// game is. Stepping on it ends the floor, so "the path continues past the
// shrine" is not an expensive route, it is a route that does not exist, and
// a price cannot say that at any weight. Leaving it out entirely (via
// `passable`) would be wrong the other way: the shrine is the goal on most
// floors and has to stay reachable.
export function dijkstra(origin, passable, priceOf, isSink = () => false) {
  const cost = new Map();
  const steps = new Map();
  const from = new Map();

  const originKey = key(origin);
  cost.set(originKey, 0);
  steps.set(originKey, 0);

  // A binary heap, not a linear scan of the open set. Unknown tiles count
  // as walkable, so the flood chests the whole 32x32 map rather than the
  // ~200 tiles actually seen — a scan makes this O(V^2) and the batch
  // runner grinds to a halt.
  const heap = [{ pos: origin, cost: 0 }];
  const push = (entry) => {
    heap.push(entry);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent].cost <= heap[i].cost) break;
      [heap[parent], heap[i]] = [heap[i], heap[parent]];
      i = parent;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let small = i;
        if (left < heap.length && heap[left].cost < heap[small].cost) small = left;
        if (right < heap.length && heap[right].cost < heap[small].cost) small = right;
        if (small === i) break;
        [heap[small], heap[i]] = [heap[i], heap[small]];
        i = small;
      }
    }
    return top;
  };

  while (heap.length) {
    const { pos, cost: here } = pop();
    const posKey = key(pos);
    if (here > cost.get(posKey)) continue;          // a stale heap entry

    // A sink keeps the cost it was reached at and expands no further, so it
    // ends routes and never carries them. Checked after the origin has been
    // seeded, so a bot already standing on one can still leave.
    if (posKey !== originKey && isSink(pos[0], pos[1])) continue;

    for (const [dx, dy] of STEPS) {
      const next = [pos[0] + dx, pos[1] + dy];
      if (!passable(next[0], next[1])) continue;

      const price = priceOf(next[0], next[1]);
      if (!Number.isFinite(price)) continue;

      const nextKey = key(next);
      const candidate = here + price;
      if (cost.has(nextKey) && cost.get(nextKey) <= candidate) continue;

      cost.set(nextKey, candidate);
      steps.set(nextKey, steps.get(posKey) + 1);
      from.set(nextKey, pos);
      push({ pos: next, cost: candidate });
    }
  }
  // `dist` is kept as an alias for steps so routeTo works on either field.
  return { cost, steps, dist: steps, from };
}

// Rebuilds [origin, ..., goal]. Empty when the goal was never reached.
export function routeTo(field, goal) {
  const goalKey = key(goal);
  if (!field.dist.has(goalKey)) return [];

  const route = [goal];
  let cursor = goalKey;
  while (field.from.has(cursor)) {
    const previous = field.from.get(cursor);
    route.push(previous);
    cursor = key(previous);
  }
  return route.reverse();
}

// Turns the first step of a route into one of the engine's actions.
export function actionToward(from, next) {
  const dx = next[0] - from[0];
  const dy = next[1] - from[1];
  if (dx === 1) return 'right';
  if (dx === -1) return 'left';
  if (dy === 1) return 'down';
  if (dy === -1) return 'up';
  return 'rest';
}

// A frontier is a known walkable tile touching a tile never seen. Reaching
// one is how the map grows — without this the bot cannot find the monsters
// it is required to kill, nor the shrine.
export function frontiers(belief) {
  const out = [];
  const [w, h] = boundsOf(belief);
  for (const [tileKey, kind] of belief.tiles) {
    if (!WALKABLE.includes(kind)) continue;
    const [x, y] = unkey(tileKey);
    for (const [dx, dy] of STEPS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (!belief.tiles.has(nx + ',' + ny)) {
        out.push([x, y]);
        break;
      }
    }
  }
  return out;
}
