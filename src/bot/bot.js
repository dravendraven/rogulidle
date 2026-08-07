// The bot. Reads Belief only — never GameState (CLAUDE.md).
//
// P3 is built in increments so each can be measured against the last.
//
//   increment 1  explore, kill the NEAREST monster, leave when clear
//   increment 2  kill the CHEAPEST monster instead            <- here
//   increment 3  go out of the way for loot
//   increment 4  refuse to be cornered by two monsters at once

import {
  CROWD_PENALTY, DANGER_FALLOFF, DUEL_SAFETY_MARGIN, GOAL_STICKINESS,
  HOLD_RANGE, LOOT_CAMPAIGN_HORIZON, MONSTER_COUNT, REVERSAL_PENALTY,
  STEP_COST_IN_HP, TACTICAL_OVERRIDE_MARGIN, TACTICAL_RANGE,
} from '../sim/balance.js';
import { MONSTERS_BASE, MONSTER_GROWTH } from '../sim/difficulty.js';
import { scoreActions } from './tactics.js';
import { effectiveHp } from '../sim/combat.js';
import { duelCost } from './duel.js';
import { expectedChestValue, monstersAhead, valueByItemName } from "./loot.js";
import { dangerField } from './threat.js';
import {
  actionToward, believedWalkable, dijkstra, exposure, frontiers, key, routeTo,
  unkey,
} from './nav.js';

// Hp it costs to walk to a tile, danger included. Infinity when unreachable.
function priceOfReaching(field, pos) {
  const cost = field.cost.get(key(pos));
  return cost === undefined ? Infinity : cost;
}

// R0, and it is now a MAP rule rather than a bot rule.
//
// It used to read "the shrine is illegal until everything is dead", which
// was the owner's original design: the fun was in having to clear the
// floor, and the score was steps. The map redesign moves that job to
// generation — 70% of a floor's threat mass sits on the mandatory route
// (src/sim/spine.js), so reaching the shrine already means fighting most of
// it. Forcing the rest by fiat would delete the choice the side rooms exist
// to offer.
//
//   'spine'  shipped. The exit opens once nothing MANDATORY is known alive.
//            Side rooms become an economic decision: worth the fight for
//            what the chest might hold, or not.
//   'all'    the old R0, kept so the cost of the change stays measurable.
//   'none'   no constraint; the bot may bolt for the stairs at any time.
function clearedTheFloor(belief, total, mode = 'spine') {
  if (mode === 'none') return true;

  const monsters = [...belief.monsters.values()];
  if (mode === 'all') return monsters.filter((m) => m.dead).length >= total;

  // Unknown monsters are not counted: the bot cannot know whether one it has
  // never seen is on the route. It does not need to — anything mandatory is
  // by construction standing between it and the shrine, so walking there
  // finds them.
  return !monsters.some((m) => !m.dead && !m.side);
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
function priceMonsters(belief, field, safetyMargin, mode = 'spine') {
  const out = [];
  for (const monster of liveMonsters(belief)) {
    const approach = priceOfReaching(field, monster.pos);
    if (!Number.isFinite(approach)) continue;     // walled off for now

    // A creature in a side room is not a job, it is an option — so it is
    // not hunted for its own sake. It becomes a target the moment it is
    // close enough to be coming anyway, because then refusing the fight
    // only means taking it while walking away.
    //
    // Side rooms still get visited: their CHESTS are goals, and the route
    // to a chest is danger-priced, so the bot pays for the guard when it
    // decides whether the loot is worth it. That is the whole risk/reward
    // decision, and it happens in lootGoals rather than here.
    if (mode === 'spine' && monster.side) {
      const steps = field.steps.get(key(monster.pos));
      if (steps === undefined || steps > monster.activation) continue;
    }

    const duel = duelCost(belief.player, monster);
    out.push({
      kind: 'monster',
      id: monster.id,
      pos: monster.pos,
      hpLost: duel.hpLost,
      // Not `survivable`, which is break-even. Expected damage is an
      // average, so a duel that costs exactly all the hp there is loses
      // about half the time. The bot wants headroom before committing.
      worthStarting: duel.hpLost <= effectiveHp(belief.player) * safetyMargin,
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

// Where to receive the attack.
//
// bot-strategy §2: a corridor is not a trap, it is the tool that forces the
// duel to be one against one, and the bot should SEEK one when hunted. In a
// room every tile has three or four ways in, so refusing to advance is not
// enough — it has to walk to the chokepoint on purpose.
//
// A tile only qualifies if the bot gets there first, with a tile to spare;
// arriving level with the pursuer means being caught in the doorway rather
// than standing in it.
function standoffTile(belief, field, danger, hunters, radius) {
  const here = belief.player.pos;
  const hereWays = exposure(belief, here);

  let best = null;
  let bestWays = hereWays;
  let bestSteps = Infinity;

  for (const [tile, mine] of field.steps) {
    if (mine > radius) continue;

    const pos = unkey(tile);
    const ways = exposure(belief, pos);
    if (ways >= bestWays) continue;          // no better than where it stands

    // Must beat every pursuer to it, with a turn in hand.
    let reachableFirst = true;
    for (const hunter of hunters) {
      const theirs = danger.reach.get(hunter.id);
      const gap = theirs ? theirs.get(tile) : undefined;
      if (gap !== undefined && mine + 1 >= gap) { reachableFirst = false; break; }
    }
    if (!reachableFirst) continue;

    if (ways < bestWays || (ways === bestWays && mine < bestSteps)) {
      best = pos;
      bestWays = ways;
      bestSteps = mine;
    }
  }
  return best;
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
// What visiting a tile will DRAG the bot into.
//
// Walking to a chest does not merely cost the walk: anything whose
// activation radius covers that tile wakes and gives chase, and then has to
// be fought. Danger pricing does not cover this — it charges for blows taken
// while crossing a tile, not for the whole duel that follows.
//
// Only creatures in SIDE rooms are charged, and that is the point. A spine
// monster has to be fought whatever the bot does, so its duel is not a cost
// OF the detour. A side monster is avoidable, so waking it is a real price
// that the visit, and only the visit, incurs.
//
// Without this the bot was picking side rooms by aggro rather than by
// economics, and picking them BACKWARDS: measured over 344 side chests it
// opened 59% of the unfavourable rooms against 47% of the favourable ones,
// because dangerous rooms hold stronger creatures, stronger creatures have
// longer activation radii, and so the worst rooms reached out and pulled the
// bot in while the safe ones never woke at all.
function guardCost(belief, pos, enabled) {
  if (!enabled) return 0;

  let total = 0;
  for (const monster of liveMonsters(belief)) {
    if (!monster.side) continue;
    const away = Math.abs(monster.pos[0] - pos[0]) + Math.abs(monster.pos[1] - pos[1]);
    if (away > monster.activation) continue;
    total += duelCost(belief.player, monster).hpLost;
  }
  return total;
}

function lootGoals(belief, field, danger, total, stepCost, future = 0, guards = true,
  crowd = true) {
  const values = valueByItemName(belief, total, future, crowd);
  const chestValue = expectedChestValue(values);
  const out = [];

  for (const item of belief.items.values()) {
    const approach = priceOfReaching(field, item.pos);
    if (!Number.isFinite(approach)) continue;
    const value = values.get(item.name) || 0;
    const guard = guardCost(belief, item.pos, guards);
    out.push({
      kind: "item", id: item.id, pos: item.pos, distance: approach,
      gross: value,
      net: value - approach - guard,
    });
  }

  for (const chest of belief.chests.values()) {
    const approach = priceOfReaching(field, chest.pos);
    if (!Number.isFinite(approach)) continue;
    // Two turns, not one: opening it costs a turn and does not move the
    // player, then stepping onto the tile costs another (spec §6). Those
    // two turns are spent standing where the chest is, so they are charged
    // at that tile's danger, not at the flat walking rate.
    const lingering = 2 * (stepCost + danger.priceAt(chest.pos[0], chest.pos[1]));
    const guard = guardCost(belief, chest.pos, guards);
    out.push({
      kind: "chest", id: chest.id, pos: chest.pos, distance: approach,
      gross: chestValue,
      net: chestValue - approach - lingering - guard,
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
function preparationGoals(belief, field, danger, total, stepCost, future = 0, guards = true,
  crowd = true) {
  const useful = lootGoals(belief, field, danger, total, stepCost, future, guards, crowd)
    .filter((g) => g.gross > 0);
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
    const worthwhile = lootGoals(
      belief, field, danger, options.monsterCount, options.stepCost,
      options.monstersAhead, options.guardPricing, options.crowdCost,
    ).filter((g) => g.net > 0);
    if (worthwhile.length) {
      return worthwhile.reduce((a, b) => (b.net > a.net ? b : a));
    }
  }

  // 2. Something alive and known? Take the cheapest fight, not the closest.
  //    Walking into it is the attack, so combat needs no special case.
  const priced = priceMonsters(belief, field, options.safetyMargin, options.requireClear);
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
      const prepare = preparationGoals(
        belief, field, danger, options.monsterCount, options.stepCost,
        options.monstersAhead, options.guardPricing, options.crowdCost,
      );
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
  if (!clearedTheFloor(belief, options.monsterCount, options.requireClear)) {
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
function stillValid(goal, belief, field, total, mode) {
  if (!goal) return false;

  if (goal.kind === 'monster') {
    const monster = belief.monsters.get(goal.id);
    if (!monster || monster.dead) return false;
    goal.pos = monster.pos;                       // it moves; follow it
  }

  if (goal.kind === 'item' && !belief.items.has(goal.id)) return false;
  if (goal.kind === 'chest' && !belief.chests.has(goal.id)) return false;
  if (goal.kind === 'shrine' && !clearedTheFloor(belief, total, mode)) return false;

  if (goal.kind === 'frontier') {
    const stillDark = frontiers(belief).some((pos) => key(pos) === key(goal.pos));
    if (!stillDark) return false;
  }

  const distance = field.dist.get(key(goal.pos));
  if (distance === undefined) return false;       // no longer reachable
  return distance > 0;                            // standing on it means done
}

const samePosition = (a, b) => a[0] === b[0] && a[1] === b[1];

const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export function makeBot(options = {}) {
  const settings = {
    // How many monsters the floor holds. The bot is told (bot-strategy
    // §4.1) so it knows when R0 is satisfied; it has to travel with the
    // generation setting rather than be read from balance.js, or sweeping
    // the map density would silently break the stop condition.
    monsterCount: MONSTER_COUNT,

    // Every tunable the bot reads, defaulting to the shipped value. They
    // live here rather than being imported at the point of use so that P4
    // can sweep them without editing balance.js — and so a sweep cannot
    // silently miss one.
    stepCost: STEP_COST_IN_HP,
    falloff: DANGER_FALLOFF,
    crowdPenalty: CROWD_PENALTY,
    safetyMargin: DUEL_SAFETY_MARGIN,

    // What must die before the shrine is legal. 'spine' | 'all' | 'none' —
    // see clearedTheFloor. The old hard R0 is 'all'.
    requireClear: "spine",

    // Charge a detour for the guards it will wake. See guardCost.
    guardPricing: true,

    // Whether campaignCost carries the crowd correction. A flag so the
    // correction can be A/B'd against the model it replaces — the bot was
    // tuned against the OLD one, so some constants may be compensating for
    // the bias and would need re-reading rather than re-tuning.
    crowdCost: true,

    // Where in the dungeon this floor sits. Only used to price gear against
    // the floors still ahead; leave them out and the bot values loot for
    // this floor alone, which is how every measurement before this was
    // taken. A single floor played on its own genuinely has no future.
    level: null,
    levels: null,
    horizon: LOOT_CAMPAIGN_HORIZON,

    pick: 'cheapest',
    stickiness: GOAL_STICKINESS,
    loot: true,
    refuseLostFights: true,
    threat: true,
    // Both OFF. Corridor-seeking is the one rule from bot-strategy §2 that
    // measurement refused to support, across four variants. See §2.1 there
    // before switching either on.
    chokepoint: false,
    exposurePricing: false,
    // ON, at depth 1 — one turn of lookahead that vetoes a step landing the
    // bot between two monsters. Deeper is worse, not better: see
    // docs/bot-strategy.md §4.4.
    tactical: true,
    overrideMargin: TACTICAL_OVERRIDE_MARGIN,
    reversalPenalty: REVERSAL_PENALTY,
    ...options,
  };

  // Creatures still ahead after this floor, discounted by how much of the
  // remaining descent the hero can expect to actually play. Computed once:
  // it cannot change during a floor.
  settings.monstersAhead = settings.horizon * monstersAhead(
    settings.level, settings.levels, MONSTERS_BASE, MONSTER_GROWTH,
  );

  let goal = null;
  let standoff = null;
  let lastAction = null;

  return function decide(belief) {
    // Forget the chosen ground as soon as nothing is hunting: it is only
    // meaningful while someone is coming.
    if (!liveMonsters(belief).length) standoff = null;
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
      ? dangerField(belief, {
        falloff: settings.falloff,
        crowdPenalty: settings.crowdPenalty,
        useExposure: settings.exposurePricing,
      })
      : { menace: new Map(), crowd: new Map(), reach: new Map(), priceAt: () => 0 };

    const field = dijkstra(belief.player.pos, passable,
      (x, y) => settings.stepCost + danger.priceAt(x, y));

    // Everything except exploration is re-priced every turn, because a kill
    // or a new shield reorders the whole board. Frontier goals stay sticky:
    // dozens of them sit at the same distance, so re-choosing would make the
    // bot swap targets every step and never arrive.
    const held = stillValid(goal, belief, field, settings.monsterCount,
      settings.requireClear) ? goal : null;
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

    // Let it come to you. bot-strategy §2: a corridor is not a trap, it is
    // the tool that forces the duel to be one against one — so when
    // something is hunting the bot, walking out into the open to meet it
    // gives away the only positional advantage the game offers.
    //
    // It costs no tempo either. Monsters act after the player, so whoever
    // closes the final tile, the player still lands the first blow.
    //
    // Only while the hunter is still two or more tiles off: once it is
    // adjacent, resting would just be standing there being hit.
    if (settings.chokepoint && goal.kind === 'monster') {
      const hunters = liveMonsters(belief).filter((m) => {
        const away = field.steps.get(key(m.pos));
        return away !== undefined && away <= HOLD_RANGE && away + 1 < m.activation;
      });

      // Only when genuinely outnumbered. A corridor buys exactly one thing:
      // it stops a second attacker reaching the bot. Against a lone pursuer
      // it buys nothing, while the walk over there is paid in blows taken
      // on the way — and measurement said two-or-more is only about a
      // quarter of deaths, so charging every approach for it loses money.
      if (hunters.length >= 2) {
        // Pick a spot ONCE and commit to it. Recomputing every turn makes
        // the bot reposition forever: the pursuer moves, a marginally
        // better tile appears, and it never gets round to fighting.
        // Measured that way — turns 138 -> 281, six runs out of sixty
        // ran out of turns entirely, win rate 55% -> 45%.
        if (standoff && !field.steps.has(key(standoff))) standoff = null;
        if (standoff && samePosition(standoff, belief.player.pos)) standoff = null;
        if (!standoff) {
          standoff = standoffTile(belief, field, danger, hunters, HOLD_RANGE);
        }

        if (standoff) {
          const toStand = routeTo(field, standoff);
          if (toStand.length >= 2) {
            return actionToward(belief.player.pos, toStand[1]);
          }
        }

        // Already on the best ground: hold it and let them come. Only while
        // they are still two or more tiles off — once adjacent, resting is
        // just standing there being hit.
        const nearest = Math.min(...hunters.map((m) => field.steps.get(key(m.pos))));
        if (nearest >= 2
          && exposure(belief, belief.player.pos) <= exposure(belief, route[1])) {
          return 'rest';
        }
      }
    }

    // Two timescales (docs/bot-strategy.md §4.3). Out in the open the route
    // already is the answer and simulating would be wasted work; with
    // something close by, the next few turns decide who lands the first
    // blow and whether the bot reaches the corridor before being cut off.
    //
    // The search VETOES rather than chooses: it only gets to overrule the
    // plan when some other step is clearly safer. Left to pick freely it
    // walks in circles, because it can see three turns of danger but not
    // that the run has to end.
    // Debug hook: lets the spectator draw what the bot was thinking. Off
    // unless somebody asks — see run-tests / index.html debug mode.
    if (settings.trace) {
      settings.trace.push({ goal: { ...goal }, planned, turn: belief.turn });
    }

    if (settings.tactical && monsterWithin(belief, field, TACTICAL_RANGE)) {
      // Steps only, NOT danger-priced. The simulation already shows the
      // damage by dropping hp at the leaf; pricing danger into the
      // remaining distance as well would count it twice — and worse, it
      // made the tiles around a target monster expensive, so closing in on
      // the thing the bot had decided to kill scored as moving away.
      const costToGoal = dijkstra(goal.pos, passable,
        () => settings.stepCost).cost;

      const scores = scoreActions(belief, costToGoal, settings.depth);
      const plannedScore = scores.get(planned);

      if (plannedScore !== undefined) {
        let bestAction = planned;
        let bestScore = plannedScore + settings.overrideMargin;
        for (const [action, score] of scores) {
          // Undoing the last step has to be clearly worth it. The veto has
          // no memory of its own, so without this it two-cycles: the plan
          // says attack, the veto steps aside, the plan says go back, the
          // veto agrees, forever.
          const penalty = action === OPPOSITE[lastAction] ? settings.reversalPenalty : 0;
          if (score - penalty > bestScore) {
            bestScore = score - penalty;
            bestAction = action;
          }
        }
        lastAction = bestAction;
        return bestAction;
      }
    }

    lastAction = planned;
    return planned;
  };
}
