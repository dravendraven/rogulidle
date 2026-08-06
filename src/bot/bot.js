// The bot. Reads Belief only — never GameState (CLAUDE.md).
//
// P3 is being built in increments so each one can be measured against the
// last. This is increment 1: explore to find things, kill what it finds,
// and only then head for the shrine.
//
// Increment 1 deliberately does NOT yet do:
//   - order duels by cost (it just takes the nearest monster)   -> increment 2
//   - go out of its way for loot                                -> increment 3
//   - avoid being cornered by two monstersit                    -> increment 4

import { MONSTER_COUNT } from '../sim/balance.js';
import {
  actionToward, believedWalkable, flood, frontiers, key, routeTo,
} from './nav.js';

// R0, the owner's rule: the shrine is not a legal target until everything
// is dead. See docs/bot-strategy.md §0 — it is a hard constraint, not a
// weight, and the bot is not allowed to flee to the exit.
function clearedTheFloor(belief) {
  const known = [...belief.monsters.values()];
  const dead = known.filter((m) => m.dead).length;
  return dead >= MONSTER_COUNT;
}

function liveMonsters(belief) {
  return [...belief.monsters.values()].filter((m) => !m.dead);
}

// Picks the closest of a set of positions, by real walking distance.
function nearest(field, candidates) {
  let best = null;
  let bestDist = Infinity;
  for (const candidate of candidates) {
    const d = field.dist.get(key(candidate.pos));
    if (d === undefined || d >= bestDist) continue;
    best = candidate;
    bestDist = d;
  }
  return best;
}

function chooseGoal(belief, field) {
  // 1. Something alive and known? Deal with it. Walking into it is the
  //    attack, so no special case is needed for combat.
  const monster = nearest(field, liveMonsters(belief).map(
    (m) => ({ kind: 'monster', id: m.id, pos: m.pos }),
  ));
  if (monster) return monster;

  // 2. Nothing known to fight, but the floor is not clear — the rest are
  //    somewhere in the dark. Go look.
  if (!clearedTheFloor(belief)) {
    const frontier = nearest(field, frontiers(belief).map(
      (pos) => ({ kind: 'frontier', pos }),
    ));
    if (frontier) return frontier;
  }

  // 3. Floor clear. Leave, if the way out has been found.
  if (clearedTheFloor(belief) && belief.shrine) {
    return { kind: 'shrine', pos: belief.shrine.pos };
  }

  // 4. Cleared but the shrine was never seen — keep exploring for it.
  const frontier = nearest(field, frontiers(belief).map(
    (pos) => ({ kind: 'frontier', pos }),
  ));
  return frontier || null;
}

// A goal survives between turns so the bot commits to it instead of
// dithering between two equally close options. It also keeps the policy
// from being a pure function of the belief, which can livelock — see
// docs/bot-strategy.md §4.0.
function stillValid(goal, belief, field) {
  if (!goal) return false;

  if (goal.kind === 'monster') {
    const monster = belief.monsters.get(goal.id);
    if (!monster || monster.dead) return false;
    goal.pos = monster.pos;                 // it moves; follow it
  }

  if (goal.kind === 'shrine' && !clearedTheFloor(belief)) return false;

  if (goal.kind === 'frontier') {
    // Once the tile has been looked at it is no longer a frontier.
    const stillDark = frontiers(belief).some((pos) => key(pos) === key(goal.pos));
    if (!stillDark) return false;
  }

  const distance = field.dist.get(key(goal.pos));
  if (distance === undefined) return false;   // no longer reachable
  return distance > 0;                        // standing on it means done
}

export function makeBot() {
  let goal = null;

  return function decide(belief) {
    const passable = believedWalkable(belief);

    // One flood per turn gives the distance to every candidate at once.
    // Live monsters are left passable so they can be targeted; in this
    // increment the bot always goes for the nearest one anyway, so it never
    // plans a route straight through one to reach something further.
    const field = flood(belief.player.pos, passable);

    if (!stillValid(goal, belief, field)) goal = chooseGoal(belief, field);
    if (!goal) return 'rest';

    const route = routeTo(field, goal.pos);
    if (route.length < 2) {
      goal = null;
      return 'rest';
    }
    return actionToward(belief.player.pos, route[1]);
  };
}
