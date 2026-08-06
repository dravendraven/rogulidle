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

import { CROWD_PENALTY, DANGER_FALLOFF } from '../sim/balance.js';
import { armourValue, expectedDamage } from '../sim/combat.js';
import { believedWalkable, flood, key } from './nav.js';

// A monster is awake with respect to a tile when standing there would put
// the player inside its chase radius. Outside it, the monster is provably
// motionless (spec §7) and therefore free to walk near.
//
// `flood` measures steps between tiles; the engine's path length counts
// both ends, so it is one greater — hence the +1.
function isAwakeAt(monster, distance) {
  return distance + 1 < monster.activation;
}

export function dangerField(belief) {
  const player = belief.player;
  const armour = armourValue(player);
  const passable = believedWalkable(belief);

  const menace = new Map();     // tile -> expected hp lost per turn there
  const crowd = new Map();      // tile -> how many could reach it at once

  for (const monster of belief.monsters.values()) {
    if (monster.dead) continue;

    const bite = expectedDamage(monster.xp, 0, armour);
    if (bite <= 0) continue;    // armour already makes this one harmless

    // Flooding from the monster gives its distance to every tile at once.
    // Stop at the chase radius: past it the monster is provably motionless
    // and contributes nothing, so there is no reason to keep walking.
    const reach = flood(monster.pos, passable, monster.activation);

    for (const [tile, distance] of reach.dist) {
      if (!isAwakeAt(monster, distance)) continue;

      menace.set(tile, (menace.get(tile) || 0) + bite * DANGER_FALLOFF ** distance);
      if (distance <= 1) crowd.set(tile, (crowd.get(tile) || 0) + 1);
    }
  }

  return {
    menace,
    crowd,
    // Price of spending one turn on a tile.
    priceAt(x, y) {
      const tile = x + ',' + y;
      let price = menace.get(tile) || 0;
      if ((crowd.get(tile) || 0) >= 2) price += CROWD_PENALTY;
      return price;
    },
  };
}

export function crowdAt(danger, pos) {
  return danger.crowd.get(key(pos)) || 0;
}
