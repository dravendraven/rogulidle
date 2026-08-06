// TEMPORARY — a stand-in so P2 has something to watch. The real bot is P3.
//
// It wanders at random. It has no strategy at all: it does not seek loot,
// does not avoid danger, and will happily walk into a dragon. Expect it to
// die often and to almost never find the shrine.
//
// The one non-random thing it does is refuse to walk into a wall it knows
// about — and that is hygiene, not strategy. Bumping a wall passes no turn,
// so a policy that keeps choosing one can livelock forever
// (docs/bot-strategy.md §4.0).

import { ACTIONS } from '../sim/step.js';
import { makeRng } from '../sim/rng.js';

const DIRECTIONS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

const WALKABLE = ['room', 'door', 'corridor'];

// An action is worth trying when the bot has no memory saying it is a wall.
// Unknown tiles count as worth trying — that is how it explores.
function legalActions(belief) {
  const from = belief.player.pos;
  return ACTIONS.filter((action) => {
    const dir = DIRECTIONS[action];
    if (!dir) return true;                       // resting is always legal
    const key = (from[0] + dir[0]) + ',' + (from[1] + dir[1]);
    if (!belief.tiles.has(key)) return true;     // never seen, may as well try
    return WALKABLE.includes(belief.tiles.get(key));
  });
}

export function makePlaceholderPolicy(seed) {
  const rng = makeRng(seed);
  return (belief) => {
    const options = legalActions(belief);
    return options[Math.floor(rng() * options.length)];
  };
}
