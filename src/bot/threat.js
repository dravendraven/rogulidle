// What each tile costs to stand on, in hp.
//
// This is what makes the bot stop strolling past a wolf to reach a shield.
// Measured before it existed: the bot almost never CHOSE a bad fight — it
// was caught while doing something else, because every route was priced in
// steps alone and danger was invisible to it.
//
// Two things are priced here:
//   - menace, the damage a monster is expected to deal, faded by distance
//   - crowding, rule R2: being reachable by two at once (bot-strategy §2)

import { CROWD_PENALTY, DANGER_FALLOFF, EXPOSURE_WEIGHT } from '../sim/balance.js';
import { expectedDamage } from '../sim/combat.js';
import { believedWalkable, exposure, flood, key } from './nav.js';

// A monster is awake with respect to a tile when standing there would put
// the player inside its chase radius. Outside it, the monster is provably
// motionless (spec §7) and therefore free to walk near.
//
// `flood` measures steps between tiles; the engine's path length counts
// both ends, so it is one greater — hence the +1.
function isAwakeAt(monster, distance) {
  return distance + 1 < monster.activation;
}

// `tuning` lets P4 sweep the numbers without editing balance.js. Anything
// left out falls back to the shipped value.
export function dangerField(belief, tuning = {}) {
  const falloff = tuning.falloff ?? DANGER_FALLOFF;
  const crowdPenalty = tuning.crowdPenalty ?? CROWD_PENALTY;
  const useExposure = tuning.useExposure ?? false;
  const passable = believedWalkable(belief);

  const menace = new Map();       // tile -> expected hp lost per turn there
  const crowd = new Map();        // tile -> how many could reach it at once
  const exposedTiles = new Map(); // tile -> ways in, worked out on demand
  const reach = new Map();        // monster id -> its step count to each tile

  for (const monster of belief.monsters.values()) {
    if (monster.dead) continue;

    // A bite no longer depends on what the hero is wearing. Only an xp 1
    // monster deals nothing, because its die has a single face: zero.
    const bite = expectedDamage(monster.xp, 0);
    if (bite <= 0) continue;

    // Flooding from the monster gives its distance to every tile at once.
    // Stop at the chase radius: past it the monster is provably motionless
    // and contributes nothing, so there is no reason to keep walking.
    const spread = flood(monster.pos, passable, monster.activation);
    reach.set(monster.id, spread.dist);

    for (const [tile, distance] of spread.dist) {
      if (!isAwakeAt(monster, distance)) continue;

      menace.set(tile, (menace.get(tile) || 0) + bite * falloff ** distance);
      if (distance <= 1) crowd.set(tile, (crowd.get(tile) || 0) + 1);
    }
  }

  return {
    menace,
    crowd,
    // Per-monster step counts, so the bot can work out whether it would
    // reach a chokepoint before its pursuer does.
    reach,
    // Price of spending one turn on a tile.
    priceAt(x, y) {
      const tile = x + ',' + y;
      const bite = menace.get(tile) || 0;
      // Nothing awake here: a cold tile is free whatever its shape, so the
      // bot has no reason to hug walls when there is nothing to hide from.
      if (bite === 0) return 0;

      // Optional: charge more for danger in the open, on the theory that
      // four ways in means four monsters can reach you.
      //
      // Measured and it LOSES — about eleven points of win rate. It makes
      // the bot so shy of open ground that it takes long way rounds and
      // ends up spending more turns exposed than the shortcut would have
      // cost. Kept behind the flag so the finding is reproducible.
      let price = bite;
      if (useExposure) {
        const ways = exposedTiles.has(tile)
          ? exposedTiles.get(tile)
          : exposedTiles.set(tile, exposure(belief, [x, y])).get(tile);
        price = bite * (1 + EXPOSURE_WEIGHT * (ways - 1));
      }
      if ((crowd.get(tile) || 0) >= 2) price += crowdPenalty;
      return price;
    },
  };
}

export function crowdAt(danger, pos) {
  return danger.crowd.get(key(pos)) || 0;
}
