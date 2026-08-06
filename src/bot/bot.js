// The bot. Reads Belief only — never GameState (CLAUDE.md).
//
// P3 is built in increments so each can be measured against the last.
//
//   increment 1  explore, kill the NEAREST monster, leave when clear
//   increment 2  kill the CHEAPEST monster instead            <- here
//   increment 3  go out of the way for loot
//   increment 4  refuse to be cornered by two monsters at once

import {
  DUEL_SAFETY_MARGIN, GOAL_STICKINESS, MONSTER_COUNT, STEP_COST_IN_HP,
  TACTICAL_OVERRIDE_MARGIN, TACTICAL_RANGE,
} from '../sim/balance.js';
import { scoreActions } from './tactics.js';
import { duelCost } from './duel.js';
import { expectedCoverValue, valueByItemName } from './loot.js';
import { dangerField } from './threat.js';
import {
  actionToward, believedWalkable, dijkstra, flood, frontiers, key, routeTo,
} from './nav.js';

// Hp it costs to walk to a tile, danger included. Infinity when unreachable.
function priceOfReaching(field, pos) {
  const cost = field.cost.get(key(pos));
  return cost === undefined ? Infinity : cost;
}

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
    const approach = priceOfReaching(field, monster.pos);
    if (!Number.isFinite(approach)) continue;     // walled off for now

    const duel = duelCost(belief.player, monster);
    out.push({
      kind: 'monster',
      id: monster.id,
      pos: monster.pos,
      hpLost: duel.hpLost,
      // Not `survivable`, which is break-even. Expected damage is an
      // average, so a duel that costs exactly all the hp there is loses
      // about half the time. The bot wants headroom before committing.
      worthStarting: duel.hpLost <= belief.player.hp * DUEL_SAFETY_MARGIN,
      cost: duel.hpLost + approach,
    });
  }
  return out;
}

// Cheapest to reach, in hp — which is not the same as closest, since the
// short way round may run under a wolf's nose.
function cheapestOf(field, candidates) {
  let best = null;
  let bestPrice = Infinity;
  for (const candidate of candidates) {
    const price = priceOfReaching(field, candidate.pos);
    if (price >= bestPrice) continue;
    best = candidate;
    bestPrice = price;
  }
  return best;
}

function frontierGoals(belief) {
  return frontiers(belief).map((pos) => ({ kind: 'frontier', pos }));
}

function monsterWithin(belief, field, steps) {
  for (const monster of liveMonsters(belief)) {
    const away = field.steps.get(key(monster.pos));
    if (away !== undefined && away <= steps) return true;
  }
  return false;
}

// Loot worth collecting, priced in hp and net of the walk to reach it.
//
// This is rule 1 (docs/bot-strategy.md §1): take what is free before
// picking a fight. It is expressed as value rather than as a priority, so
// a chestnut — worth exactly zero — never earns a detour, while a shield
// two rooms away does.
function lootGoals(belief, field, danger) {
  const values = valueByItemName(belief);
  const coverValue = expectedCoverValue(values);
  const out = [];

  for (const item of belief.items.values()) {
    const approach = priceOfReaching(field, item.pos);
    if (!Number.isFinite(approach)) continue;
    const value = values.get(item.name) || 0;
    out.push({
      kind: 'item', id: item.id, pos: item.pos, distance: approach,
      gross: value,
      net: value - approach,
    });
  }

  for (const cover of belief.covers.values()) {
    const approach = priceOfReaching(field, cover.pos);
    if (!Number.isFinite(approach)) continue;
    // Two turns, not one: opening it costs a turn and does not move the
    // player, then stepping onto the tile costs another (spec §6). Those
    // two turns are spent standing where the cover is, so they are charged
    // at that tile's danger, not at the flat walking rate.
    const lingering = 2 * (STEP_COST_IN_HP + danger.priceAt(cover.pos[0], cover.pos[1]));
    out.push({
      kind: 'cover', id: cover.id, pos: cover.pos, distance: approach,
      gross: coverValue,
      net: coverValue - approach - lingering,
    });
  }
  return out;
}

// Anything that might turn a lost fight into a winnable one: gear worth
// having at ANY distance, or unexplored map that might hold some.
//
// The usual "does it pay for the walk" test is the wrong question here,
// because the alternative on the table is dying. Steps are nearly free
// (there is no clock, spec §8) and a monster that follows the bot never
// closes the gap — it moves after the player does, so retreating holds
// the distance. Delay is genuinely cheap; only dead ends are not.
function preparationGoals(belief, field, danger) {
  const useful = lootGoals(belief, field, danger).filter((g) => g.gross > 0);
  if (useful.length) {
    return useful.reduce((a, b) => {
      if (b.gross !== a.gross) return b.gross > a.gross ? b : a;
      return b.distance < a.distance ? b : a;
    });
  }
  return cheapestOf(field, frontierGoals(belief));
}

function chooseGoal(belief, field, danger, current, options) {
  // 1. Anything free worth having? Rule 1: stock up before fighting. Loot
  //    that does not pay for its own walk scores negative and is skipped,
  //    so this does not become a compulsion to hoover up every chestnut —
  //    and now the walk is priced in danger too, so a shield guarded by a
  //    wolf is correctly no longer free.
  if (options.loot) {
    const worthwhile = lootGoals(belief, field, danger).filter((g) => g.net > 0);
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

    // Do not walk into a fight already computed as lost while there is
    // still something to try. R0 forbids fleeing to the shrine; it does not
    // forbid DELAYING. Measured before this existed: 11% of engagements
    // were started knowing the sum did not add up, and 63% of deaths came
    // from exactly that.
    if (options.refuseLostFights && !best.worthStarting) {
      const prepare = preparationGoals(belief, field, danger);
      if (prepare) return prepare;
      // Nothing left to prepare with. Take it — the bot is not allowed to
      // give up, and dying trying is an accepted outcome (§0).
    }

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
    return cheapestOf(field, frontierGoals(belief));
  }

  // 4. Floor clear: leave, if the way out has been found.
  if (belief.shrine) return { kind: 'shrine', pos: belief.shrine.pos };

  // 5. Cleared but the shrine was never seen — keep looking for it.
  return cheapestOf(field, frontierGoals(belief));
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
    pick: 'cheapest',
    stickiness: GOAL_STICKINESS,
    loot: true,
    refuseLostFights: true,
    threat: true,
    // OFF by default. Built, works, and does not pay: it fights visibly
    // better (kills 2.83 -> 3.33) but wins no more often, at about ten
    // times the cost per run. See docs/bot-strategy.md §4.4.
    tactical: false,
    overrideMargin: TACTICAL_OVERRIDE_MARGIN,
    ...options,
  };
  let goal = null;

  return function decide(belief) {
    const passable = believedWalkable(belief);

    // Price the board, then price every route across it. The field holds
    // the cheapest hp cost of reaching each tile, danger included, so one
    // number compares "walk over there" against "have this fight".
    //
    // Live monsters stay passable so they can be targeted at all; the bot
    // chooses among them by cost anyway.
    // `settings`, not `options` — reading the raw argument here meant a
    // plain makeBot() silently ran with danger pricing switched off, and
    // only the measurements that passed the flag explicitly ever saw it.
    const danger = settings.threat
      ? dangerField(belief)
      : { menace: new Map(), crowd: new Map(), priceAt: () => 0 };

    const field = dijkstra(belief.player.pos, passable,
      (x, y) => STEP_COST_IN_HP + danger.priceAt(x, y));

    // Everything except exploration is re-priced every turn, because a kill
    // or a new shield reorders the whole board. Frontier goals stay sticky:
    // dozens of them sit at the same distance, so re-choosing would make the
    // bot swap targets every step and never arrive.
    const held = stillValid(goal, belief, field) ? goal : null;
    goal = (held && held.kind === 'frontier')
      ? held
      : chooseGoal(belief, field, danger, held, settings);
    if (!goal) return 'rest';

    const route = routeTo(field, goal.pos);
    if (route.length < 2) {
      goal = null;
      return 'rest';
    }

    const planned = actionToward(belief.player.pos, route[1]);

    // Two timescales (docs/bot-strategy.md §4.3). Out in the open the route
    // already is the answer and simulating would be wasted work; with
    // something close by, the next few turns decide who lands the first
    // blow and whether the bot reaches the corridor before being cut off.
    //
    // The search VETOES rather than chooses: it only gets to overrule the
    // plan when some other step is clearly safer. Left to pick freely it
    // walks in circles, because it can see three turns of danger but not
    // that the run has to end.
    if (settings.tactical && monsterWithin(belief, field, TACTICAL_RANGE)) {
      // Steps only, NOT danger-priced. The simulation already shows the
      // damage by dropping hp at the leaf; pricing danger into the
      // remaining distance as well would count it twice — and worse, it
      // made the tiles around a target monster expensive, so closing in on
      // the thing the bot had decided to kill scored as moving away.
      const costToGoal = dijkstra(goal.pos, passable,
        () => STEP_COST_IN_HP).cost;

      const scores = scoreActions(belief, costToGoal, settings.depth);
      const plannedScore = scores.get(planned);

      if (plannedScore !== undefined) {
        let bestAction = planned;
        let bestScore = plannedScore + settings.overrideMargin;
        for (const [action, score] of scores) {
          if (score > bestScore) { bestScore = score; bestAction = action; }
        }
        return bestAction;
      }
    }

    return planned;
  };
}
