// The bot. Reads Belief only — never GameState (CLAUDE.md).
//
// P3 is built in increments so each can be measured against the last.
//
//   increment 1  explore, kill the NEAREST monster, leave when clear
//   increment 2  kill the CHEAPEST monster instead            <- here
//   increment 3  go out of the way for loot
//   increment 4  refuse to be cornered by two monsters at once

import {
  CHEST_COUNT, CROWD_PENALTY, DANGER_FALLOFF, DUEL_SAFETY_MARGIN,
  FRONTIER_REVEAL_WEIGHT, GOAL_STICKINESS, HOLD_RANGE, LOOT_CAMPAIGN_HORIZON,
  MAP_SIZE, MONSTER_COUNT, REVERSAL_PENALTY, ROUTE_ITEM_DISCOUNT, STEP_COST_IN_HP,
  TACTICAL_OVERRIDE_MARGIN, TACTICAL_RANGE, VISIBLE_DIST,
} from '../sim/balance.js';
import { MONSTERS_BASE, MONSTER_GROWTH } from '../sim/difficulty.js';
import { scoreActions } from './tactics.js';
import { effectiveHp } from '../sim/combat.js';
import { duelCost } from './duel.js';
import {
  expectedChestValue, expectedMonsterDropValue, monstersAhead, valueByItemName,
} from "./loot.js";
import { dangerField } from './threat.js';
import {
  actionToward, believedWalkable, dijkstra, exposure, frontiers, key, routeTo,
  unkey,
} from './nav.js';

// B16 (docs/backlog.md). The shrine is a one-way door: stepping on it ends
// the floor (rules.md §8), and nothing else in the game behaves like that.
//
// The router could not see it. `believedWalkable` decides passability from
// the tile KIND, and the shrine is not a kind — it is an entity on
// `belief.shrine` — so its tile was ordinary floor to every route, and the
// bot walked ACROSS it to reach loot on the far side and ended the floor by
// accident (seed 2367838680, floor 2).
//
// Modelled as a graph sink rather than a price, because it is not a cost.
// Crossing the shrine on the way to something else is not expensive, it is
// impossible — the floor is over before the route's second half happens.
// A price says "avoid unless the prize is big enough", which is wrong at
// every weight, and the item forbids a dial for exactly that reason.
//
// Only the BOT's own field gets this. Creature reach (`threat.js`'s flood)
// is untouched: the shrine stops the hero, not the wolves.
function shrineSink(belief) {
  if (!belief.shrine) return () => false;
  const tile = key(belief.shrine.pos);
  return (x, y) => (x + ',' + y) === tile;
}

// B17 (docs/backlog.md). A tile with a WANTED loose item on it costs
// slightly less to cross.
//
// Walking over a loose item collects it for free — no action, no turn
// (`step.js`'s pickup path; items do not block the way a chest does). So
// loot exactly on the path was never the gap: the gap was that among
// several routes of the same length, nothing preferred the one that grazes
// an item. `chooseGoal` cannot fix that — it compares candidates
// individually from where the hero stands and commits to one winner, and
// asks nothing about what lies along the route to it.
//
// Deliberately a tie-breaker and nothing more. The discount is bounded so
// the total along a route can never buy one extra step
// (`ROUTE_ITEM_DISCOUNT`'s own comment carries the arithmetic), because a
// discount big enough to bend a route two tiles would be selecting goals —
// which is `chooseGoal`'s job, and two things in charge of one decision is
// how a bot gets an unexplainable preference.
//
// Only items with a mechanical effect count. An item worth nothing should
// not bend a route at all, and this is the same test `ITEM_VALUE` uses to
// decide what counts as reward, rather than a second opinion about it.
//
// Chests are excluded on purpose: opening one BLOCKS and costs a turn
// (`resolveEncounters`), so a chest is never free on the way and belongs to
// `chooseGoal`'s comparison, where it already is.
function routeItemDiscount(belief, discount) {
  if (!discount) return () => 0;

  // A tile a live creature is standing on is not a tile the hero can cross:
  // walking in attacks and the hero stays put, so the item is not collected
  // on the way — it is collected after the fight, if at all. Discounting it
  // would be paying for a pass-through that cannot happen.
  const occupied = new Set();
  for (const m of belief.monsters.values()) if (!m.dead) occupied.add(key(m.pos));

  const wanted = new Set();
  for (const item of belief.items.values()) {
    if ((item.dmg || 0) + (item.armour || 0) + (item.heal || 0) <= 0) continue;
    const tile = key(item.pos);
    if (occupied.has(tile)) continue;
    wanted.add(tile);
  }
  if (!wanted.size) return () => 0;

  return (x, y) => (wanted.has(x + ',' + y) ? discount : 0);
}

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

// Shrine is reachable if it has been seen and is physically accessible.
function canReachShrine(belief, field) {
  if (!belief.shrine) return false;
  const distance = field.dist.get(key(belief.shrine.pos));
  return Number.isFinite(distance) && distance > 0;
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
function priceMonsters(belief, field, safetyMargin, mode = 'spine', dropValues = null,
  danger = null) {
  const out = [];
  for (const monster of liveMonsters(belief)) {
    const approach = priceOfReaching(field, monster.pos);
    if (!Number.isFinite(approach)) continue;     // walled off for now

    const duel = duelCost(belief.player, monster);
    // B9: what this creature is expected to be carrying, in the same hp
    // currency as its own cost — see expectedMonsterDropValue for why this
    // is an ESTIMATE from tier rather than a read of the real `drop`.
    // Zero whenever `dropValues` is off, so the flag costs nothing to keep.
    const drop = dropValues ? expectedMonsterDropValue(monster, dropValues) : 0;

    // A creature in a side room is not a job, it is an option — so it is
    // not hunted for its own sake. It becomes a target the moment it is
    // close enough to be coming anyway, because then refusing the fight
    // only means taking it while walking away.
    //
    // Side rooms still get visited: their CHESTS are goals, and the route
    // to a chest is danger-priced, so the bot pays for the guard when it
    // decides whether the loot is worth it. That is the whole risk/reward
    // decision, and it happens in lootGoals rather than here — except now
    // the creature ITSELF can be that same decision. B9: a side monster
    // out of reach is still worth a special trip if what it is expected to
    // carry pays for both the walk and the fight, exactly the trade
    // lootGoals already makes for a guarded chest, aimed at the guard
    // instead of what it is guarding.
    if (mode === 'spine' && monster.side) {
      const steps = field.steps.get(key(monster.pos));
      const activated = steps !== undefined && steps <= monster.activation;
      if (!activated && drop - approach - duel.hpLost <= 0) continue;
    }

    // B13: a fight is stationary too — `resolveEncounters` passes the turn
    // without moving the hero — so every OTHER creature that keeps up with
    // the walk over there swings freely for the whole duel. `duel.turns` is
    // how long that lasts, and the target itself is excluded because its
    // own blows are already inside `duel.hpLost`.
    //
    // Ranking only, deliberately: `worthStarting` above stays untouched,
    // matching B9's own split between what makes a fight WORTHWHILE and
    // what makes it SURVIVABLE. That leaves a known gap — the gate can call
    // a duel safe while this term says the hero will eat a second creature's
    // blows throughout it — and closing it is a separate question from the
    // one this item was filed to answer.
    const chased = (danger && Number.isFinite(duel.turns))
      ? danger.pursuerCost(monster.pos, field.steps.get(key(monster.pos)),
        duel.turns, monster.id)
      : 0;

    out.push({
      kind: 'monster',
      id: monster.id,
      pos: monster.pos,
      hpLost: duel.hpLost,
      // Not `survivable`, which is break-even. Expected damage is an
      // average, so a duel that costs exactly all the hp there is loses
      // about half the time. The bot wants headroom before committing.
      // Unaffected by the drop: loot makes a fight more WORTHWHILE, not
      // more SURVIVABLE, and this gate is about survival.
      worthStarting: duel.hpLost <= effectiveHp(belief.player) * safetyMargin,
      cost: duel.hpLost + approach - drop + chased,
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

// How much dark standing on a tile would light up: unseen tiles inside the
// sight radius. Visibility is by plain distance with no raycasting (spec
// §12.1), so this is exactly what the hero would reveal by going there —
// not an approximation of it.
function wouldReveal(belief, pos) {
  let dark = 0;
  for (let dy = -VISIBLE_DIST; dy <= VISIBLE_DIST; dy++) {
    for (let dx = -VISIBLE_DIST; dx <= VISIBLE_DIST; dx++) {
      if (dx * dx + dy * dy > VISIBLE_DIST * VISIBLE_DIST) continue;
      const x = pos[0] + dx;
      const y = pos[1] + dy;
      if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) continue;
      if (!belief.tiles.has(x + ',' + y)) dark++;
    }
  }
  return dark;
}

// B10 (docs/backlog.md). A SECOND field, used only for routing toward an
// already-chosen FRONTIER goal — every other goal kind keeps using the
// plain field above untouched. Among routes of similar length, this makes
// the router prefer the one that grazes more already-seen fog on the way,
// instead of being indifferent between them.
//
// The discount only ever applies to a candidate tile already in
// `belief.tiles`. Scoring an UNSEEN candidate tile by `wouldReveal` would
// earn it credit for standing somewhere never confirmed walkable —
// `believedWalkable` already treats unseen ground as passable ("never seen
// — worth trying", nav.js), and rewarding that further is exactly the
// optimism B3 found breaks route commitment: a route aimed at unseen
// ground turns out to be rock, the bump costs an action without costing a
// turn, and the re-plan is another chance to reverse. Walk toward the
// fog's edge; do not get credit for guessing what is past it.
function frontierField(belief, danger, settings) {
  const passable = believedWalkable(belief);
  return dijkstra(belief.player.pos, passable, (x, y) => {
    const base = settings.stepCost + danger.priceAt(x, y);
    if (!belief.tiles.has(x + ',' + y)) return base;
    return Math.max(0, base - settings.frontierRevealWeight * wouldReveal(belief, [x, y]));
  }, shrineSink(belief));
}

// What the dark is worth, in hp, and therefore what a frontier is worth.
//
// B4 (docs/backlog.md). Unexplored map used to be worth exactly zero: a
// frontier was `{kind, pos}` with no value, exploration was a FALLBACK
// branch of chooseGoal rather than a competitor, and when the bot did
// explore it took the CHEAPEST frontier rather than the most promising.
// That fights the map design head on — `CHEST_LOOT_RICHER_FAR` and
// `CHEST_QUALITY_BY_DEPTH` deliberately put the good loot far from the
// spawn, and the bot was searching by proximity at zero value.
//
// The model, and it needs no new constant:
//
//   unseen chests   = the count the bot is told, minus the ones it has met
//   value of one    = expectedChestValue, the same figure chest goals use
//   spread evenly   = over every unseen TILE, since the bot has no reason
//                     to believe one dark tile is likelier than another
//   a frontier      = that rate times the dark it would personally reveal
//
// So a frontier facing a wide unlit region outscores one facing a one-tile
// gap, and every frontier's value decays to zero as the map comes up or as
// the chests are found — at which point `net` is just minus the walk and
// this degrades exactly into the old cheapest-first behaviour.
function frontierGoals(belief, field, chestValue, unseenChests) {
  const unseenTiles = MAP_SIZE * MAP_SIZE - belief.tiles.size;
  const perTile = unseenTiles > 0 ? (unseenChests * chestValue) / unseenTiles : 0;

  const out = [];
  for (const pos of frontiers(belief)) {
    const approach = priceOfReaching(field, pos);
    if (!Number.isFinite(approach)) continue;
    const gross = perTile > 0 ? wouldReveal(belief, pos) * perTile : 0;
    out.push({
      kind: 'frontier', pos, gross, distance: approach, net: gross - approach,
    });
  }
  return out;
}

// The frontier worth most after paying for the walk. Falls back to the
// nearest one when there is nothing left to find, because then every gross
// is zero and `net` is just minus the approach.
function bestFrontier(belief, field, options) {
  const goals = frontierGoals(
    belief, field,
    options.exploreValue ? options.chestValue : 0,
    options.unseenChests,
  );
  if (!goals.length) return null;
  return goals.reduce((a, b) => (b.net > a.net ? b : a));
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

// Turns a chest costs standing still: one to open it (it blocks, so the
// hero does not move), one to step onto the tile and take what fell. A rule
// of the engine, not a dial — see the `lingering` comment below.
const CHEST_TURNS = 2;

function lootGoals(belief, field, danger, values, stepCost, guards = true,
  chargePursuers = false) {
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
    const lingering = CHEST_TURNS * (stepCost + danger.priceAt(chest.pos[0], chest.pos[1]));
    const guard = guardCost(belief, chest.pos, guards);
    // B13: and what follows the hero HERE. `lingering` above charges the
    // chest tile's own menace, which is a snapshot of where creatures stand
    // now — a pursuer five tiles back contributes almost nothing to it, then
    // arrives and swings twice for free. That is the gap this closes. The
    // two terms overlap only when the pursuer is already on top of the
    // chest, where being charged twice for a genuinely bad idea is not the
    // failure worth engineering around.
    const chased = chargePursuers
      ? danger.pursuerCost(chest.pos, field.steps.get(key(chest.pos)), CHEST_TURNS)
      : 0;
    out.push({
      kind: "chest", id: chest.id, pos: chest.pos, distance: approach,
      gross: chestValue,
      net: chestValue - approach - lingering - guard - chased,
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
function preparationGoals(belief, field, danger, options, values) {
  const useful = lootGoals(
    belief, field, danger, values, options.stepCost, options.guardPricing,
    options.chargePursuers,
  ).filter((g) => g.gross > 0);
  if (useful.length) {
    return useful.reduce((a, b) => {
      if (b.gross !== a.gross) return b.gross > a.gross ? b : a;
      return b.distance < a.distance ? b : a;
    });
  }
  // B4: the most promising dark, not the nearest. Facing a lost fight is
  // exactly when "what might be over there" is worth the most, and picking
  // by proximity here was the bot searching where it had already been.
  return bestFrontier(belief, field, options);
}

// B20 (docs/backlog.md). "Collect that, then fight this" as a candidate.
//
// `chooseGoal` compares one thing at a time, from where the hero stands, and
// commits to the winner. So a route that picks up a shield on the way to a
// wolf is unrepresentable — not outranked, absent. The bot is not choosing
// the creature over the loot; it is choosing between two options one of
// which was never offered.
//
// The arithmetic, and it needs no coefficient because it cancels to
// something obvious. Writing `A(x)` for the hp cost of reaching x:
//
//   direct    = drop − hpLost − A(M)
//   sequence  = drop − hpLost − A(L) − A(L→M) + lootValue − lootExtras
//   difference = lootValue − lootExtras − [A(L) + A(L→M) − A(M)]
//                                          \_______ the detour _______/
//
// **The sequence wins exactly when the loot is worth more than the detour
// costs.** That is the honest comparison the item asked for, and it is also
// why no "small detour" bound was added: a large detour loses on its own
// arithmetic, so a threshold would only be a second way of saying the same
// thing — and `CLAUDE.md` calls that the parameter to avoid.
//
// Bounded to ONE intervening pickup and ONE fight, structurally rather than
// by a dial: the chain is never extended, and only the fight the bot would
// actually take is considered. That costs exactly one extra Dijkstra per
// turn, rooted at that creature, which is what makes A(L→M) available for
// every loot candidate at once instead of one flood per pair.
//
// The winner is emitted as the ORDINARY loot goal it already is, carrying
// the sequence's score. Nothing new has to execute it — the bot walks to
// the loot, and next turn re-decides from there, where the creature is
// simply the nearest thing worth doing.
function sequenceGoals(belief, loot, priced, field, fieldFrom, options) {
  if (!options.sequenceGoals || !fieldFrom || !loot.length) return [];

  const fightable = (priced || []).filter((m) => m.worthStarting);
  if (!fightable.length) return [];

  // The fight the bot would take: `priceMonsters` already ranks by cost and
  // branch 1 already takes the cheapest, so this is the same creature the
  // comparison would have chosen — not a new opinion about which to fight.
  const target = fightable.reduce((a, b) => (b.cost < a.cost ? b : a));
  const direct = priceOfReaching(field, target.pos);
  if (!Number.isFinite(direct)) return [];

  const fromTarget = fieldFrom(target.pos);
  const out = [];

  for (const l of loot) {
    const toLoot = priceOfReaching(field, l.pos);
    const lootToTarget = priceOfReaching(fromTarget, l.pos);
    if (!Number.isFinite(toLoot) || !Number.isFinite(lootToTarget)) continue;

    // `l.net` is already lootValue − A(L) − extras, so adding A(L) back
    // recovers the value net of its own costs without re-deriving it and
    // risking a second, drifting copy of what a chest costs to open.
    const worth = l.net + toLoot;
    const detour = toLoot + lootToTarget - direct;
    const net = -target.cost + worth - detour;

    if (net > -target.cost) {
      out.push({ kind: l.kind, id: l.id, pos: l.pos, net, sequencedWith: target.id });
    }
  }
  return out;
}

function chooseGoal(belief, field, danger, current, options, fieldFrom) {
  // Priced once per turn and threaded through every branch that needs it —
  // loot goals, the dark's value (B4) and now a creature's own drop (B9)
  // all quote the same figures, so "go and open that" and "go and kill
  // that for what it might carry" are comparable in one currency.
  const values = valueByItemName(
    belief, options.monsterCount, options.monstersAhead, options.crowdCost,
    options.horizon,
  );

  // Experimental, default 1 (no-op) each: scales what the bot believes a
  // weapon is worth in hp, without touching its real in-game dmg. For
  // simulating "what if the bot valued this weapon at Nx its real hp value"
  // without editing ITEM_TABLE, which would also change combat itself.
  if (options.axeValueMultiplier && options.axeValueMultiplier !== 1) {
    values.set('axe', (values.get('axe') || 0) * options.axeValueMultiplier);
  }
  if (options.daggerValueMultiplier && options.daggerValueMultiplier !== 1) {
    values.set('dagger', (values.get('dagger') || 0) * options.daggerValueMultiplier);
  }

  // B11: priced here, before branch 1, only when the flag that needs it
  // early is on — branch 2 below reuses this instead of pricing twice, but
  // when the flag is off the cost of pricing every visible monster is only
  // ever paid once, in branch 2, exactly as before this item.
  const pricedEarly = options.combatCompetes
    ? priceMonsters(belief, field, options.safetyMargin, options.requireClear,
      options.priceDrops ? values : null, options.chargePursuers ? danger : null)
    : null;

  // 1. Anything free worth having? Rule 1: stock up before fighting. Loot
  //    that does not pay for its own walk scores negative and is skipped,
  //    so this does not become a compulsion to hoover up every chestnut —
  //    and now the walk is priced in danger too, so a shield guarded by a
  //    wolf is correctly no longer free.
  if (options.loot) {
    const loot = lootGoals(belief, field, danger, values, options.stepCost,
      options.guardPricing, options.chargePursuers);

    // B4: the dark competes here, in the same net-value comparison, instead
    // of being the fallback it used to be at branch 3. `expectedChestValue`
    // is already the figure chest goals are scored with, so "go and look"
    // and "go and open that" are quoted in one currency and the bot can
    // finally prefer a promising dark room to a chestnut it can see.
    const explore = options.exploreCompetes
      ? frontierGoals(belief, field, options.chestValue, options.unseenChests)
      : [];

    // B11 (docs/backlog.md): a fight competes here too, instead of only
    // ever being considered once every loot option is exhausted (the old
    // branch 2, below). `net` mirrors `priceMonsters`' own `cost`
    // (hpLost + approach - drop) negated, so higher-is-better matches
    // loot's convention exactly — the same hp currency, the same sign.
    //
    // `worthStarting` is a HARD gate here, not a term in the comparison:
    // this item ranks a SAFE fight against loot, it does not relax when a
    // fight is safe to start (that stays `refuseLostFights`'s job, in
    // branch 2, untouched). A fight that is not survivable never reaches
    // this list no matter how good its expected drop looks.
    //
    // No separate "xp value gained" term, despite the item asking for one:
    // `XP_FROM_KILLS` ships `false` (balance.js) — killing grants no xp at
    // all under the shipped rules, so the term is exactly zero and adding
    // the machinery to compute it (a marginal `campaignCost` delta per
    // candidate, each itself O(n^2)) would be dead code paid for on every
    // turn. If `XP_FROM_KILLS` is ever switched on, this is the term to add
    // back, and `campaignCost`'s own xp-snowball accounting is what to
    // reuse rather than a second copy of it.
    const combat = options.combatCompetes
      ? pricedEarly.filter((m) => m.worthStarting).map((m) => (
        { kind: 'monster', id: m.id, pos: m.pos, net: -m.cost }
      ))
      : [];

    // B12 (docs/backlog.md): leaving competes here too, and it is what the
    // `net > 0` filter has been comparing against all along without anyone
    // saying so. A goal "pays for itself" — that is what the filter means —
    // and the thing it pays for itself INSTEAD OF is walking out.
    //
    // Its net is 0, not `-approach`, and that is the whole design decision.
    // The walk to the shrine is not a marginal cost of choosing to leave:
    // every floor ends on that tile, so the bot pays that walk whatever it
    // does first. Charging it here would bill a fixed cost of the floor to
    // one option competing for it, and would make the bot stay longer on
    // exactly the floors where the exit is furthest — the opposite of the
    // reasoning.
    //
    // So it enters the pool AFTER the filter, unfiltered: leaving is always
    // available and always worth exactly zero. Anything that beats zero is
    // worth doing first; when nothing does, the best remaining option IS
    // the door, and the bot takes it instead of falling through to the
    // unconditional fight below.
    // B20: and "that loot, then this fight" as one option, scored against
    // the fight alone. Entered unfiltered by `net > 0` for the same reason
    // the shrine is: its net carries the FIGHT's cost, which is normally
    // negative, so requiring it to be positive would delete exactly the
    // case the item is about — a worthwhile detour on the way to a fight
    // the bot has already decided is worth having.
    const sequence = sequenceGoals(belief, loot, pricedEarly, field, fieldFrom, options);

    const worthwhile = [...loot, ...explore, ...combat].filter((g) => g.net > 0);
    worthwhile.push(...sequence);
    if (options.leaveCompetes && canReachShrine(belief, field)) {
      worthwhile.push({ kind: 'shrine', pos: belief.shrine.pos, net: 0 });
    }
    if (worthwhile.length) {
      const best = worthwhile.reduce((a, b) => (b.net > a.net ? b : a));

      // Same hysteresis the monster branch below has had all along, and for
      // the same reason — loot never got it, which balance.js's own
      // GOAL_STICKINESS comment already flagged as a caveat. Two chests of
      // near-equal net value swap places in the ranking every single turn,
      // because stepping towards one changes the distance to BOTH, so the
      // bot walks at whichever it is currently furthest from and arrives at
      // neither. Measured as ~7-11% of ping-pong episodes (bot-strategy
      // §4.5): goalId alternating between exactly two chests, veto never
      // consulted.
      //
      // Higher is better here, where the monster branch ranks by cost and
      // lower is better, so the comparison is the same test the other way up.
      // B11: one shared check keyed by `current.kind`, `monster` included —
      // a fight chosen here is exactly as sticky as a chest chosen here.
      if (current && ['item', 'chest', 'monster'].includes(current.kind)) {
        const held = worthwhile.find((g) => g.kind === current.kind && g.id === current.id);
        if (held && held.net * options.stickiness >= best.net) return held;
      }
      return best;
    }
  }

  // 2. Something alive and known? Take the cheapest fight, not the closest.
  //    Walking into it is the attack, so combat needs no special case.
  const priced = pricedEarly ?? priceMonsters(belief, field, options.safetyMargin,
    options.requireClear, options.priceDrops ? values : null,
    options.chargePursuers ? danger : null);
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
      const prepare = preparationGoals(belief, field, danger, options, values);
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

  // 3. Leave if the shrine is reachable — no requirement to clear first.
  if (canReachShrine(belief, field)) {
    return { kind: 'shrine', pos: belief.shrine.pos };
  }

  // 4. Nothing known to fight and the floor is not clear — the rest are out
  //    there in the dark. Go and look. Still a fallback, but it now looks
  //    in the most promising direction rather than the nearest one, and
  //    branch 1 above may have taken this decision already.
  if (!clearedTheFloor(belief, options.monsterCount, options.requireClear)) {
    return bestFrontier(belief, field, options);
  }

  // 5. Cleared but the shrine was never seen — keep looking for it.
  return bestFrontier(belief, field, options);
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
  if (goal.kind === 'shrine' && !canReachShrine(belief, field)) return false;

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

    // How many chests the floor holds, told to the bot on the same terms
    // and for the same reason as monsterCount above: B4 prices the dark by
    // how many chests are still unaccounted for, so sweeping chest density
    // without this would silently value the dark against the wrong total.
    chestCount: CHEST_COUNT,

    // B4, split in two so the two halves of the idea could be measured
    // apart. **Both OFF: measurement refused both**, the same way it
    // refused `chokepoint` and `exposurePricing` below. Kept rather than
    // deleted, on the house rule that a rejected idea is worth more with
    // its numbers attached — see B4's Result in docs/backlog.md before
    // switching either on.
    //
    // `exploreValue`  rank frontiers by what they would REVEAL rather than
    //                 by how near they are. Changed nothing measurable:
    //                 chests per floor and floors played were identical to
    //                 three figures, because the top-level frontier
    //                 stickiness means the bot rarely re-picks a frontier
    //                 at all, so WHICH one it would prefer almost never
    //                 gets asked.
    // `exploreCompetes`  let a frontier bid against chests and items in
    //                 chooseGoal's branch 1 instead of staying the fallback
    //                 at branch 3. Actively harmful — median depth 3 -> 2,
    //                 chests per floor 4.48 -> 3.85, zigzag turns
    //                 13.8% -> 21.1%. A non-expiring reward should not be
    //                 biddable: the dark does not go anywhere, so anything
    //                 the bot can have NOW is worth having first.
    exploreValue: false,
    exploreCompetes: false,

    // B9. Prices a creature's expected drop (weapon or potion, gated by its
    // tier — see expectedMonsterDropValue in loot.js) into both the cheapest-
    // fight ranking and the eligibility of a side monster the bot would
    // otherwise never approach.
    //
    // ON. First reads (n=40/n=30) looked harmful and shipped this OFF, but
    // both were taken while a concurrent session had src/sim/spawn.js and
    // difficulty.js mid-edit — disclosed, not trusted. Re-run clean at
    // n=80/n=60 on the same two seed families once that churn settled: side
    // kills per floor up 31%/18% (the mechanism firing, as intended),
    // median depth UNCHANGED (3 vs 3 on both), finishes UNCHANGED (1.3%
    // vs 1.3%, 0% vs 0%), actions per run down 8%/5% (fewer turns for the
    // same result). No sign of the "dies for loot" failure mode the item
    // warned to watch for. Not checked against a formal 2-sigma bar
    // (docs/backlog.md's own measuring note) — flagged, not claimed, same
    // as M26's real-bot read.
    priceDrops: true,

    // B10 (docs/backlog.md). OFF: unmeasured. Routes toward an already-
    // chosen frontier goal along the tile that grazes more already-seen
    // fog, instead of being indifferent between equally-priced paths. See
    // `frontierField` above for the risk this was scoped against (must not
    // reward stepping onto UNSEEN ground, or it repeats B3's route-
    // commitment failure) and docs/backlog.md's Result for the measured
    // wall-bump count before this ships either way.
    frontierRouting: false,
    frontierRevealWeight: FRONTIER_REVEAL_WEIGHT,

    // B20 (docs/backlog.md). Lets "collect that, then fight this" enter the
    // comparison as one candidate, scored against the fight alone. See
    // `sequenceGoals` for the arithmetic.
    //
    // OFF: measured. It fires on ~40% of decisions but is mostly REDUNDANT —
    // the candidate it emits is the same loot goal the plain candidate
    // already produced, so winning changes the score and not the choice.
    // Where it does flip a choice from creature to loot, 240 paired runs
    // moved pickups z=0.12 and depth z=0.34 (nothing), while route length
    // rose 6.3% (z=1.18) — under the bar, but the only signed movement and
    // the failure direction the item named. Set true to re-enable.
    sequenceGoals: false,

    // B17 (docs/backlog.md). ON at the shipped value, 0 to ablate. Bends the
    // route toward a wanted loose item it can collect for free on the way,
    // by strictly less than one step is worth — see `routeItemDiscount`.
    routeItemDiscount: ROUTE_ITEM_DISCOUNT,

    // B11 (docs/backlog.md). ON. A worth-starting fight competes with loot
    // in branch 1's comparison instead of only ever being reachable once
    // every loot option is gone (branch 2). Measured n=60 on two seed
    // families: median depth never fell (2->3 primary, 3->3 confirmation —
    // `finishes` stayed 0% throughout at this sample/difficulty, so it
    // could not serve as the stop signal either way). Primary family fought
    // and looted substantially more and got deeper for it; confirmation
    // family reached the same depth in 39% fewer actions per run instead.
    // Different shapes, same direction — no sign of B9's "dies for loot"
    // failure mode in either family. Not checked against a formal 2-sigma
    // bar; see docs/backlog.md's Result before re-tuning anything here.
    combatCompetes: true,

    // B13 (docs/backlog.md). Charges what a pursuer collects while the hero
    // stands still — the only time it collects at all — against the goals
    // that actually stand still: opening a chest, and having a fight. See
    // `pursuerCost` in threat.js for why proximity rent was the wrong model.
    //
    // OFF: measured inert, and the diagnostic says why in one number.
    // **91% of every blow the hero takes lands while it is standing still**,
    // so the item's premise is not just right, it is nearly the whole story
    // of how the hero dies. But only ~9-13% of those land with a SECOND
    // creature in contact — the rest come from the one creature the hero is
    // already trading with, whose blows `duelCost` has always priced. The
    // unpriced population is about two or three blows a run out of twenty-
    // five, and moving it does not move the run: median depth identical on
    // both seed families, and mean depth, stationary blows and kills all
    // disagree in DIRECTION between the two families at about a percent.
    //
    // The flag does change decisions — per-run depths differ off vs on — so
    // this is inert for lack of anything to fix, not for lack of firing.
    chargePursuers: false,

    // B12 (docs/backlog.md). ON. Puts LEAVING into branch 1's comparison at
    // net 0, so a fight has to be worth having rather than merely
    // available. Without it, branch 2 below fires on any reachable creature
    // and pre-empts the exit unconditionally — which is where the
    // obligation to kill actually lived, not in `requireClear`.
    //
    // A flag rather than a straight replacement, against the item's own
    // preference, for one reason: its Assert needs a paired before/after in
    // one session, and that needs the old path intact to measure against.
    //
    // Measured paired, 520 runs over two seed families. The mechanism is
    // not in doubt: floors left with creatures still alive z=+5.6, kills
    // per floor z=-5.0. Depth did not pay for it — it rose, z=+2.0. The
    // item's stop signal (arming falling while depth holds) did not fire:
    // absolute weapon damage carried is z=-1.4, under the bar, and depth
    // did not hold. Read the Result before trusting the per-floor arming
    // ratio, which DOES clear the bar and is a denominator artefact of the
    // class decisions.md records three separate agents falling into.
    leaveCompetes: true,

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

  // Chests the bot has laid eyes on this floor. `belief.chests` cannot
  // answer this on its own: an opened chest is REMOVED from the belief, so
  // counting it would make every chest the bot opens look unfound again and
  // the dark would never lose value. One bot is built per floor, so this
  // set has exactly the lifetime it should.
  const chestsEverSeen = new Set();

  return function decide(belief) {
    // B14 (docs/backlog.md). The dumbest defensible drink policy: drink
    // whenever the missing hp is at least what the potion heals. Checked
    // first, ahead of every goal and the tactical veto, and it is a real
    // action returned directly — not a goal, so it never touches `goal`
    // and next turn resumes wherever the bot was headed.
    //
    // Deliberately ignores danger. It will drink standing next to a wolf,
    // and that is the point: this item exists to make M35's engine change
    // measurable with the plainest policy that does not waste a potion, so
    // B15 has honest numbers to beat rather than a strawman. `rules.md` §6
    // is why "ignores danger" is not free — a turn spent drinking is a turn
    // a pursuer closes, but choosing WHEN to accept that cost is exactly
    // what this policy does not yet do.
    const potion = belief.player.inventory.find((i) => i.heal > 0);
    if (potion && belief.player.hpMax - belief.player.hp >= potion.heal) {
      return 'drink';
    }

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

    // B17: bend the route toward loot it can pick up on the way, but only
    // far enough to settle a tie. `Math.max(0, ...)` is not defensive
    // decoration — dijkstra needs non-negative weights, and a negative one
    // would corrupt the field silently rather than throw.
    const itemBonus = routeItemDiscount(belief, settings.routeItemDiscount);
    // B20 needs the same price from a SECOND origin (a creature's tile), to
    // ask what reaching it from a piece of loot costs. Built once as a
    // closure so the two fields cannot drift apart — a second copy of this
    // expression is exactly how the router and the pricer stop agreeing.
    const priceTile = (x, y) => Math.max(0,
      settings.stepCost + danger.priceAt(x, y) - itemBonus(x, y));
    const fieldFrom = (origin) => dijkstra(origin, passable, priceTile, shrineSink(belief));
    const field = fieldFrom(belief.player.pos);

    // B4: what the dark is worth this turn. Both figures move as the floor
    // is played — a chest found is a chest the dark no longer holds, and
    // gear picked up changes what the next chest is worth — so they are
    // recomputed rather than fixed at construction like `monstersAhead`.
    // Skipped entirely when both flags are off, so the rejected idea costs
    // nothing to keep: `valueByItemName` prices every item type against the
    // whole remaining roster and is not free to call once per turn.
    if (settings.exploreValue || settings.exploreCompetes) {
      for (const id of belief.chests.keys()) chestsEverSeen.add(id);
      settings.unseenChests = Math.max(0, settings.chestCount - chestsEverSeen.size);
      settings.chestValue = expectedChestValue(valueByItemName(
        belief, settings.monsterCount, settings.monstersAhead, settings.crowdCost,
        settings.horizon,
      ));
    }

    // Everything except exploration is re-priced every turn, because a kill
    // or a new shield reorders the whole board. Frontier goals stay sticky:
    // dozens of them sit at the same distance, so re-choosing would make the
    // bot swap targets every step and never arrive.
    const held = stillValid(goal, belief, field, settings.monsterCount,
      settings.requireClear) ? goal : null;
    goal = (held && held.kind === 'frontier')
      ? held
      : chooseGoal(belief, field, danger, held, settings, fieldFrom);
    if (!goal) return 'rest';

    // B10: a frontier goal routes on its own field, weighted toward
    // already-seen fog — every other goal kind routes on the plain field
    // above, untouched. `field` still drives goal SELECTION either way
    // (chooseGoal, bestFrontier): this only changes HOW the chosen
    // frontier is walked to, never WHICH one is chosen.
    const routingField = (settings.frontierRouting && goal.kind === 'frontier')
      ? frontierField(belief, danger, settings)
      : field;

    const route = routeTo(routingField, goal.pos);
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
    //
    // The entry is pushed here but finished below, at whichever return
    // actually fires: `planned` is decided already, but the tactical veto
    // (right below) can still overrule it, and which layer wins is exactly
    // what a ping-pong investigation needs to see. `final`/`vetoed` stay
    // undefined if the trace is read before this decide() call returns —
    // callers that only care about the plan (the spectator) can keep
    // ignoring them.
    let traceEntry = null;
    if (settings.trace) {
      traceEntry = {
        goal: { ...goal },
        // Stable across turns for the SAME target, so a reader can ask
        // "is this the goal I had last turn" without comparing objects.
        // Monsters/items/chests keep their id; a frontier or the shrine
        // have none, so the tile stands in for one.
        goalId: `${goal.kind}:${goal.id ?? key(goal.pos)}`,
        planned,
        turn: belief.turn,
      };
      settings.trace.push(traceEntry);
    }

    if (settings.tactical && monsterWithin(belief, field, TACTICAL_RANGE)) {
      // Steps only, NOT danger-priced. The simulation already shows the
      // damage by dropping hp at the leaf; pricing danger into the
      // remaining distance as well would count it twice — and worse, it
      // made the tiles around a target monster expensive, so closing in on
      // the thing the bot had decided to kill scored as moving away.
      // B16: deliberately NOT sunk, and this is the one place that would be
      // wrong. This floods OUTWARD FROM the goal to measure "how far is
      // every tile from it" — with the shrine as goal, sinking it would
      // expand nothing and every tile would read as unreachable, breaking
      // the veto exactly on the approach to the exit. A path that ENDS at
      // the shrine never crosses it, so the symmetric distance is the
      // correct one here; only the bot's own outward field needs the sink.
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
        if (traceEntry) { traceEntry.final = bestAction; traceEntry.vetoed = bestAction !== planned; }
        return bestAction;
      }
    }

    lastAction = planned;
    if (traceEntry) { traceEntry.final = planned; traceEntry.vetoed = false; }
    return planned;
  };
}
