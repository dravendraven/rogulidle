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
// Exported for B23, which needs the same predicate to answer a different
// question: not "what does this tile cost" but "would standing here WAKE
// something". One expression, one place — the rule it encodes is
// `rules.md` §3 and restating it twice is how the two drift apart.
export function isAwakeAt(monster, distance) {
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
  const pursuers = new Map();     // monster id -> { bite, activation }, for B13

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
    pursuers.set(monster.id, { bite, activation: monster.activation });

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
      // Flat, and TRIED SCALED. Making the surcharge proportional to what
      // the crowd can actually do (`crowdPenalty * bite`) was the obvious
      // fix for the map's inverted risk/reward measurement, and it changed
      // nothing at all — byte-identical chest-opening rates and descent
      // results. Tiles reachable by two awake monsters at once are simply
      // rare enough that this term is not what steers the bot.
      if ((crowd.get(tile) || 0) >= 2) price += crowdPenalty;
      return price;
    },

    // B13 — docs/backlog.md. What a pursuer collects while the hero STANDS
    // STILL, which is the only time it collects at all.
    //
    // `menace` above is rent: hp charged per turn of proximity. The rules
    // are not rent. Adjacency is not an attack — the attack is a creature
    // moving ONTO the hero (rules.md §3) — and creatures act after the hero
    // (§6). So a same-speed pursuer chased off a tile lands adjacent, never
    // on top, and fleeing it costs nothing. What costs is stopping:
    // `resolveEncounters` returning true passes the turn WITHOUT moving the
    // hero, so attacking and opening a chest are both stationary, and
    // everything glued to the hero gets a free swing on each of those turns.
    // Nothing charged for that before this.
    //
    // A creature is charged for the stationary turns it is actually PRESENT
    // for, not all of them. It has `botSteps` turns of the walk plus the
    // stationary turns themselves to arrive, so:
    //
    //   late   = max(0, its steps to `pos` − the hero's)   turns it misses
    //   swings = turns − late                              turns it collects
    //
    // Both ends matter. A creature already at the hero's heels
    // (`late` 0) collects every stationary turn; one that arrives halfway
    // through collects the rest; one that cannot make it before the hero
    // moves on collects nothing and is correctly free. Comparing only
    // "does it get there first" — `standoffTile`'s test, inverted — would
    // have said free for the pursuer standing right behind the hero, which
    // is the exact case this item exists to charge for.
    //
    // Still gated on `isAwakeAt`, the same test the menace loop uses:
    // standing at `pos` has to be inside the creature's chase radius, or it
    // is provably motionless and never comes at all.
    //
    // `exclude` skips the creature being fought: its blows are already in
    // `duelCost`, and charging them twice would price every fight as if a
    // second copy of the target were watching.
    //
    // Deliberately NOT symmetric with fleeing: this only ever ADDS cost to
    // standing still. It does not claim fleeing is free — cornered, or
    // pinched from two sides, some step closes distance to something, and
    // that case is left to the tactical veto, which simulates it properly.
    pursuerCost(pos, botSteps, turns, exclude = null) {
      if (!(turns > 0) || !Number.isFinite(botSteps)) return 0;

      const tile = key(pos);
      let total = 0;
      for (const [id, { bite, activation }] of pursuers) {
        if (id === exclude) continue;
        const theirs = reach.get(id);
        const gap = theirs ? theirs.get(tile) : undefined;
        if (gap === undefined) continue;              // never gets there
        if (!isAwakeAt({ activation }, gap)) continue;

        const swings = turns - Math.max(0, gap - botSteps);
        if (swings > 0) total += bite * swings;
      }
      return total;
    },
  };
}

export function crowdAt(danger, pos) {
  return danger.crowd.get(key(pos)) || 0;
}
