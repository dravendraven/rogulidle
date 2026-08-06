// The bot. Reads Belief only — never GameState (CLAUDE.md).
//
// P3 is built in increments so each can be measured against the last.
//
//   increment 1  explore, kill the NEAREST monster, leave when clear
//   increment 2  kill the CHEAPEST monster instead            <- here
//   increment 3  go out of the way for loot
//   increment 4  refuse to be cornered by two monsters at once

import { GOAL_STICKINESS, MONSTER_COUNT, STEP_COST_IN_HP } from '../sim/balance.js';
import { duelCost } from './duel.js';
import { expectedCoverValue, valueByItemName } from './loot.js';
import {
  actionToward, believedWalkable, flood, frontiers, key, routeTo,
} from './nav.js';

// R0, the owner's rule: the shrine is not a legal target until everything
// is dead. docs/bot-strategy.md §0 — a hard constraint, not a weight. The
// bot is not allowed to flee to the exit.
function clearedTheFloor(belief) {
  const dead = [...belief.monsters.values()].filter((m) => m.dead).length;
  return dead >= MONSTER_COUNT;
}

function liveMonsters(belief) {
  return [...belief.monsters.values()].filter((m) => !m.dead);
}

// Every monster worth considering, priced in hp.
//
// The ordering that comes out of this is the snowball from bot-strategy §3:
// cheap kills first raise xp, which lowers the cost of everything left, so
// the expensive monster at the end is met with double the starting damage.
// Nothing here encodes that — it falls out of repricing every turn against
// current xp and gear.
function priceMonsters(belief, field) {
  const out = [];
  for (const monster of liveMonsters(belief)) {
    const distance = field.dist.get(key(monster.pos));
    if (distance === undefined) continue;         // walled off for now

    const duel = duelCost(belief.player, monster);
    out.push({
      kind: 'monster',
      id: monster.id,
      pos: monster.pos,
      hpLost: duel.hpLost,
      survivable: duel.survivable,
      cost: duel.hpLost + STEP_COST_IN_HP * distance,
    });
  }
  return out;
}

function nearestOf(field, candidates) {
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

function frontierGoals(belief) {
  return frontiers(belief).map((pos) => ({ kind: 'frontier', pos }));
}

// Loot worth collecting, priced in hp and net of the walk to reach it.
//
// This is rule 1 (docs/bot-strategy.md §1): take what is free before
// picking a fight. It is expressed as value rather than as a priority, so
// a chestnut — worth exactly zero — never earns a detour, while a shield
// two rooms away does.
function lootGoals(belief, field) {
  const values = valueByItemName(belief);
  const coverValue = expectedCoverValue(values);
  const out = [];

  for (const item of belief.items.values()) {
    const distance = field.dist.get(key(item.pos));
    if (distance === undefined) continue;
    const value = values.get(item.name) || 0;
    out.push({
      kind: 'item', id: item.id, pos: item.pos,
      net: value - STEP_COST_IN_HP * distance,
    });
  }

  for (const cover of belief.covers.values()) {
    const distance = field.dist.get(key(cover.pos));
    if (distance === undefined) continue;
    // Two turns, not one: opening it costs a turn and does not move the
    // player, then stepping onto the tile costs another (spec §6).
    out.push({
      kind: 'cover', id: cover.id, pos: cover.pos,
      net: coverValue - STEP_COST_IN_HP * (distance + 2),
    });
  }
  return out;
}

function chooseGoal(belief, field, current, options) {
  // 1. Anything free worth having? Rule 1: stock up before fighting. Loot
  //    that does not pay for its own walk scores negative and is skipped,
  //    so this does not become a compulsion to hoover up every chestnut.
  if (options.loot) {
    const worthwhile = lootGoals(belief, field).filter((g) => g.net > 0);
    if (worthwhile.length) {
      return worthwhile.reduce((a, b) => (b.net > a.net ? b : a));
    }
  }

  // 2. Something alive and known? Take the cheapest fight, not the closest.
  //    Walking into it is the attack, so combat needs no special case.
  const priced = priceMonsters(belief, field);
  if (priced.length) {
    // `pick` exists so P4 can ablate one rule at a time and measure what it
    // is actually worth, rather than trusting that it helped.
    const rank = options.pick === 'nearest'
      ? (c) => field.dist.get(key(c.pos))
      : (c) => c.cost;
    const best = priced.reduce((a, b) => (rank(b) < rank(a) ? b : a));

    // Stick with the current target unless the new one is clearly better,
    // otherwise two near-equal monsters make the bot dither on the spot.
    if (current && current.kind === 'monster') {
      const held = priced.find((c) => c.id === current.id);
      if (held && rank(held) <= rank(best) * options.stickiness) return held;
    }
    return best;
  }

  // 3. Nothing known to fight and the floor is not clear — the rest are out
  //    there in the dark. Go and look.
  if (!clearedTheFloor(belief)) {
    return nearestOf(field, frontierGoals(belief));
  }

  // 4. Floor clear: leave, if the way out has been found.
  if (belief.shrine) return { kind: 'shrine', pos: belief.shrine.pos };

  // 5. Cleared but the shrine was never seen — keep looking for it.
  return nearestOf(field, frontierGoals(belief));
}

// A goal survives between turns so the bot commits instead of dithering,
// and so the policy is not a pure function of the belief, which can
// livelock — docs/bot-strategy.md §4.0.
function stillValid(goal, belief, field) {
  if (!goal) return false;

  if (goal.kind === 'monster') {
    const monster = belief.monsters.get(goal.id);
    if (!monster || monster.dead) return false;
    goal.pos = monster.pos;                       // it moves; follow it
  }

  if (goal.kind === 'item' && !belief.items.has(goal.id)) return false;
  if (goal.kind === 'cover' && !belief.covers.has(goal.id)) return false;
  if (goal.kind === 'shrine' && !clearedTheFloor(belief)) return false;

  if (goal.kind === 'frontier') {
    const stillDark = frontiers(belief).some((pos) => key(pos) === key(goal.pos));
    if (!stillDark) return false;
  }

  const distance = field.dist.get(key(goal.pos));
  if (distance === undefined) return false;       // no longer reachable
  return distance > 0;                            // standing on it means done
}

export function makeBot(options = {}) {
  const settings = {
    pick: 'cheapest', stickiness: GOAL_STICKINESS, loot: true, ...options,
  };
  let goal = null;

  return function decide(belief) {
    const passable = believedWalkable(belief);

    // One flood per turn prices every candidate at once. Live monsters stay
    // passable so they can be targeted at all; the bot is choosing among
    // them by cost anyway, so it will meet the near one before the far one.
    const field = flood(belief.player.pos, passable);

    // Everything except exploration is re-priced every turn, because a kill
    // or a new shield reorders the whole board. Frontier goals stay sticky:
    // dozens of them sit at the same distance, so re-choosing would make the
    // bot swap targets every step and never arrive.
    const held = stillValid(goal, belief, field) ? goal : null;
    goal = (held && held.kind === 'frontier')
      ? held
      : chooseGoal(belief, field, held, settings);
    if (!goal) return 'rest';

    const route = routeTo(field, goal.pos);
    if (route.length < 2) {
      goal = null;
      return 'rest';
    }
    return actionToward(belief.player.pos, route[1]);
  };
}
