// Navigation over the BELIEF, not the map. The bot never sees the real
// dungeon (CLAUDE.md), so everything here works from remembered tiles.
//
// Unknown tiles count as walkable. That is deliberate and documented in
// docs/bot-strategy.md §4.3: it is what lets a route aim into the dark,
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

export function believedWalkable(belief) {
  return (x, y) => {
    if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) return false;
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
export function flood(origin, passable, blocked = new Set()) {
  const dist = new Map();
  const from = new Map();
  const queue = [origin];
  dist.set(key(origin), 0);

  for (let head = 0; head < queue.length; head++) {
    const pos = queue[head];
    const d = dist.get(key(pos));
    for (const [dx, dy] of STEPS) {
      const next = [pos[0] + dx, pos[1] + dy];
      const nextKey = key(next);
      if (dist.has(nextKey)) continue;
      if (!passable(next[0], next[1])) continue;
      if (blocked.has(nextKey)) continue;
      dist.set(nextKey, d + 1);
      from.set(nextKey, pos);
      queue.push(next);
    }
  }
  return { dist, from };
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
  for (const [tileKey, kind] of belief.tiles) {
    if (!WALKABLE.includes(kind)) continue;
    const [x, y] = unkey(tileKey);
    for (const [dx, dy] of STEPS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= MAP_SIZE || ny >= MAP_SIZE) continue;
      if (!belief.tiles.has(nx + ',' + ny)) {
        out.push([x, y]);
        break;
      }
    }
  }
  return out;
}
