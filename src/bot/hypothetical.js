// Turns a Belief into a GameState the engine can actually run.
//
// This is what makes the bot's predictor BE the engine (docs/bot-strategy
// §4.3). Monster movement in Rogule is deterministic, so predicting is just
// simulating — and simulating with the real step() means there is no second
// implementation of the rules to drift out of agreement with the first.
//
// The state is marked `sim`, which tells the engine to stop rolling dice:
// monsters never skip a turn and blows land for their average.

import { MAP_SIZE } from '../sim/balance.js';

// Unknown tiles are WALLS here, which is the opposite of what nav.js does.
//
// Not a contradiction — the two answer different questions. Strategic
// routing treats the dark as open so a route can aim into it and the bot
// will explore. Tactical simulation only ever looks a few turns ahead,
// entirely inside the sight radius, where nothing is unknown anyway. Making
// the dark solid there keeps monsters from pathfinding through unexplored
// rock, and keeps the flood small enough to run hundreds of times a turn.
function mapFromBelief(belief) {
  const tiles = new Array(MAP_SIZE * MAP_SIZE).fill(null);
  for (const [tileKey, kind] of belief.tiles) {
    const comma = tileKey.indexOf(',');
    const x = +tileKey.slice(0, comma);
    const y = +tileKey.slice(comma + 1);
    tiles[y * MAP_SIZE + x] = kind;
  }
  return { w: MAP_SIZE, h: MAP_SIZE, tiles, rooms: [] };
}

const copyItem = (item) => ({ ...item, pos: item.pos.slice() });

export function beliefToState(belief) {
  const player = belief.player;

  return {
    sim: true,
    // The bot has to imagine the same rules it is playing under.
    attackWhenAdjacent: belief.attackWhenAdjacent,
    seed: 0,
    turn: belief.turn,
    outcome: null,
    killedBy: null,
    nextId: 1,
    // Nothing draws from these while `sim` is set, but the shape has to be
    // there for the engine not to trip over it.
    rng: { map: 1, spawn: 1, combat: 1 },
    log: [],

    map: mapFromBelief(belief),

    player: {
      ...player,
      pos: player.pos.slice(),
      inventory: player.inventory.map((i) => ({ ...i })),
      kills: player.kills.slice(),
    },

    monsters: [...belief.monsters.values()].map((m) => ({
      ...m, pos: m.pos.slice(), drop: null,
    })),
    items: [...belief.items.values()].map(copyItem),
    covers: [...belief.covers.values()].map(copyItem),

    // Somewhere off the map when the shrine has not been found, so that
    // nothing can accidentally step onto it and end the imagined run.
    shrine: belief.shrine
      ? copyItem(belief.shrine)
      : { id: 'unknown-shrine', emoji: '⛩️', pos: [-9, -9] },
  };
}
