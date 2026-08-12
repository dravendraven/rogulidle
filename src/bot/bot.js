// The bot. Reads Belief only — never GameState (CLAUDE.md).
//
// Three objectives, in strict priority order, and everything below is one of
// them being applied:
//
//   1. survive the current floor
//   2. arrive at the next floor with as many resources as possible —
//      hp, weapon, armour, potions, xp
//   3. spend as few steps as possible while still doing 1 and 2
//
// The whole policy in six sentences:
//
//   - It drinks a potion as soon as the missing hp covers the full heal.
//   - It never starts a fight expected to cost more than fightMargin of its
//     effective hp; a fight already chasing it charges only the walk, since
//     the duel happens whatever it does.
//   - Among everything worth having — loot, chests, affordable fights — it
//     always takes the CHEAPEST in hp, walk and danger included.
//   - Side rooms are the gamble: their guarded loot and optional fights are
//     skipped when the guard costs more than its appetite allows.
//   - When something worth having may still be in the dark, it explores the
//     nearest frontier; when nothing is left, it walks to the shrine.
//   - It keeps its current goal unless a new one is clearly cheaper.
//
// A hero with special characteristics is a different DEFAULT_HERO handed to
// makeBot — same code, other numbers. See src/bot/config.js.

import {
  effectiveHp, expectedDamage, weaponDamage, weaponMinDamage,
} from '../sim/combat.js';
import { MONSTER_SKIP_CHANCE } from '../sim/balance.js';
import {
  CROWD_PENALTY, DANGER_FALLOFF, DEFAULT_CHEST_COUNT, DEFAULT_MONSTER_COUNT,
  DEFAULT_HERO, GOAL_STICKINESS,
} from './config.js';
import {
  actionToward, believedWalkable, dijkstra, flood, frontiers, key, routeTo,
} from './nav.js';

// What a fight is expected to cost, before taking it. This is the number
// objective 1 gates on — NOT the xp above the monster's head. xp only says
// how hard it hits; the cost also depends on how long it takes to kill, so
// a wolf and an ogre share xp 4 while the ogre costs half again as much.
//
// They land (1 - skip) of their turns, and never the last one: the blow
// that kills them happens on the player's turn.
export function duelCost(player, monster) {
  const mine = expectedDamage(player.xp, weaponDamage(player), weaponMinDamage(player));
  // Monsters carry nothing that fights (their drop is not inventory), so
  // neither half of the weapon formula applies to their blow.
  const theirs = expectedDamage(monster.xp, 0);
  if (mine <= 0) return { hpLost: Infinity, turns: Infinity };

  const turns = monster.hp / mine;
  const hpLost = (1 - MONSTER_SKIP_CHANCE) * Math.max(0, turns - 1) * theirs;
  return { hpLost, turns };
}

// A monster is awake with respect to a tile when standing there puts the
// hero inside its chase radius. Outside it the creature is provably
// motionless (rules.md §3). `flood` counts steps between tiles; the engine's
// path length counts both ends, hence the +1.
export function isAwakeAt(monster, distance) {
  return distance + 1 < monster.activation;
}

// What each tile costs to stand on, in hp. This is what makes the bot stop
// strolling past a wolf to reach a shield: measured before it existed, the
// bot almost never CHOSE a bad fight — it was caught while doing something
// else, because routes were priced in steps alone.
export function dangerField(belief, tuning = {}) {
  const falloff = tuning.falloff ?? DANGER_FALLOFF;
  const crowdPenalty = tuning.crowdPenalty ?? CROWD_PENALTY;
  const passable = believedWalkable(belief);

  const menace = new Map();   // tile -> expected hp lost per turn there
  const crowd = new Map();    // tile -> how many creatures could strike it
  const reach = new Map();    // monster id -> its step count to each tile

  for (const monster of belief.monsters.values()) {
    if (monster.dead) continue;
    const bite = expectedDamage(monster.xp, 0);
    if (bite <= 0) continue;

    // Flooding from the monster gives its distance to every tile at once,
    // stopped at the chase radius — past it the creature never moves.
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
    reach,
    priceAt(x, y) {
      const tile = x + ',' + y;
      const bite = menace.get(tile) || 0;
      if (bite === 0) return 0;
      return (crowd.get(tile) || 0) >= 2 ? bite + crowdPenalty : bite;
    },
  };
}

// B16, kept through the rewrite: stepping on the shrine ends the floor
// (rules.md §8), so a route THROUGH it does not exist at any price. The
// shrine tile is a graph sink — enterable, never left — or the bot ends
// floors by accident reaching loot on the far side (measured at 27% of
// floors before the sink existed).
function shrineSink(belief) {
  if (!belief.shrine) return () => false;
  const tile = key(belief.shrine.pos);
  return (x, y) => (x + ',' + y) === tile;
}

function liveMonsters(belief) {
  return [...belief.monsters.values()].filter((m) => !m.dead);
}

// Hp it costs to reach a tile, danger included. Infinity when unreachable.
function priceOfReaching(field, pos) {
  const cost = field.cost.get(key(pos));
  return cost === undefined ? Infinity : cost;
}

// What visiting a tile drags the bot into: any SIDE creature whose chase
// radius covers it wakes, and its duel follows. Spine creatures charge
// nothing here — they have to be fought whatever the bot does, so their
// duel is not a cost of the visit.
function guardCost(belief, pos) {
  let total = 0;
  for (const monster of liveMonsters(belief)) {
    if (!monster.side) continue;
    const away = Math.abs(monster.pos[0] - pos[0]) + Math.abs(monster.pos[1] - pos[1]);
    if (away > monster.activation) continue;
    total += duelCost(belief.player, monster).hpLost;
  }
  return total;
}

// Does the goal chosen last turn still exist and still make sense? A goal
// survives between turns so the bot commits instead of dithering — the
// policy must not be a pure function of the belief, which can livelock.
function stillValid(goal, belief, field) {
  if (!goal) return false;

  if (goal.kind === 'monster') {
    const monster = belief.monsters.get(goal.id);
    if (!monster || monster.dead) return false;
    goal.pos = monster.pos;                       // it moves; follow it
  }
  if (goal.kind === 'item' && !belief.items.has(goal.id)) return false;
  if (goal.kind === 'chest' && !belief.chests.has(goal.id)) return false;
  if (goal.kind === 'frontier'
    && !frontiers(belief).some((pos) => key(pos) === key(goal.pos))) return false;

  const distance = field.dist.get(key(goal.pos));
  if (distance === undefined) return false;       // no longer reachable
  return distance > 0;                            // standing on it means done
}

export function makeBot(options = {}) {
  const hero = { ...DEFAULT_HERO, ...(options.hero ?? {}) };
  const settings = {
    // Generation facts the bot is told (rules.md §7): how many creatures and
    // chests the floor holds, so it knows whether the dark still owes it
    // anything. They travel with the generation settings rather than being
    // read from balance, or sweeping the map would break the stop condition.
    monsterCount: options.monsterCount ?? DEFAULT_MONSTER_COUNT,
    chestCount: options.chestCount ?? DEFAULT_CHEST_COUNT,
    stickiness: options.stickiness ?? GOAL_STICKINESS,
    falloff: options.falloff ?? DANGER_FALLOFF,
    crowdPenalty: options.crowdPenalty ?? CROWD_PENALTY,
    // Debug hook: one entry per decision, so the spectator can show what
    // the bot was aiming at when a move looks odd.
    trace: options.trace,
  };

  let goal = null;

  // Chests seen this floor. `belief.chests` cannot answer this alone: an
  // opened chest is REMOVED from the belief, so counting it would make every
  // opened chest look unfound again and the dark would never lose value.
  const chestsEverSeen = new Set();

  return function decide(belief) {
    // Objective 1, cheapest form first: drink when the missing hp covers the
    // whole heal. A real action returned directly — not a goal — so next
    // turn resumes wherever the bot was headed.
    const potion = belief.player.inventory.find((i) => i.heal > 0);
    if (potion && belief.player.hpMax - belief.player.hp >= potion.heal) {
      return 'drink';
    }

    for (const id of belief.chests.keys()) chestsEverSeen.add(id);

    // Price the board, then price every route across it. One field holds
    // the cheapest hp cost of reaching each tile, danger included, so one
    // number compares "walk over there" with "have this fight".
    const passable = believedWalkable(belief);
    const danger = dangerField(belief, settings);
    // `Math.max(0, ...)` is Dijkstra's precondition, not decoration: a
    // negative tile price makes revisiting a tile cheaper every time round
    // and the search never terminates — the page hangs rather than throws.
    // Reachable from a hostile tuning value (a negative falloff flips
    // menace's sign), so the router refuses one here rather than trusting
    // every caller.
    const field = dijkstra(belief.player.pos, passable,
      (x, y) => Math.max(0, hero.stepCost + danger.priceAt(x, y)), shrineSink(belief));

    const ehp = effectiveHp(belief.player);
    const fightBar = hero.fightMargin * ehp;
    const sideBar = hero.sideAppetite * fightBar;

    // Everything worth having, each priced by what acquiring it costs.
    const pool = [];

    for (const monster of liveMonsters(belief)) {
      const walk = priceOfReaching(field, monster.pos);
      if (!Number.isFinite(walk)) continue;
      const duel = duelCost(belief.player, monster).hpLost;
      if (duel > (monster.side ? sideBar : fightBar)) continue;  // objective 1

      // A creature already chasing charges only the walk: its duel happens
      // whatever the bot does next, so fighting it now is the version where
      // the bot picked the ground.
      const steps = field.steps.get(key(monster.pos));
      const chasing = steps !== undefined && isAwakeAt(monster, steps);
      pool.push({
        kind: 'monster', id: monster.id, pos: monster.pos,
        price: walk + (chasing ? 0 : duel),
      });
    }

    for (const item of belief.items.values()) {
      // Every field that makes an item worth walking to, or a weapon whose
      // only gift is a higher damage floor reads as worthless.
      if ((item.dmg || 0) + (item.dmgMin || 0)
        + (item.armour || 0) + (item.heal || 0) <= 0) continue;
      const walk = priceOfReaching(field, item.pos);
      if (!Number.isFinite(walk)) continue;
      const guard = guardCost(belief, item.pos);
      if (guard > sideBar) continue;              // the gamble refused
      pool.push({ kind: 'item', id: item.id, pos: item.pos, price: walk + guard });
    }

    for (const chest of belief.chests.values()) {
      const walk = priceOfReaching(field, chest.pos);
      if (!Number.isFinite(walk)) continue;
      const guard = guardCost(belief, chest.pos);
      if (guard > sideBar) continue;              // the gamble refused
      pool.push({ kind: 'chest', id: chest.id, pos: chest.pos, price: walk + guard });
    }

    // Objective 2 outranks objective 3, so the pool is emptied before the
    // shrine is considered; objective 3 orders WITHIN the pool — cheapest
    // first, held with hysteresis so near-ties do not cause dithering.
    const held = stillValid(goal, belief, field) ? goal : null;
    if (pool.length) {
      const best = pool.reduce((a, b) => (b.price < a.price ? b : a));
      const current = held && pool.find((g) => g.kind === held.kind && g.id === held.id);
      goal = (current && current.price <= best.price * settings.stickiness)
        ? current : best;
    } else {
      // Nothing in sight worth having. The dark may still hold something —
      // the counts are granted — so explore first; the shrine is where the
      // floor ends when nothing is owed. Frontier goals stay sticky: dozens
      // sit at the same distance, and re-choosing every step would swap
      // targets forever without arriving at any.
      const unseenChests = settings.chestCount - chestsEverSeen.size;
      const unseenMonsters = settings.monsterCount - belief.monsters.size;
      const owed = unseenChests > 0 || unseenMonsters > 0 || !belief.shrine;

      const shrineReachable = belief.shrine
        && Number.isFinite(priceOfReaching(field, belief.shrine.pos));

      if (held && held.kind === 'frontier' && (owed || !shrineReachable)) {
        goal = held;
      } else if (owed || !shrineReachable) {
        const near = frontiers(belief).reduce((a, pos) => {
          const steps = field.steps.get(key(pos));
          if (steps === undefined) return a;
          return (!a || steps < a.steps) ? { pos, steps } : a;
        }, null);
        goal = near ? { kind: 'frontier', pos: near.pos } : null;
      } else {
        goal = null;
      }

      if (!goal && shrineReachable) {
        goal = { kind: 'shrine', pos: belief.shrine.pos };
      }
    }

    if (settings.trace) {
      settings.trace.push({
        goal: goal ? { ...goal } : null,
        goalId: goal ? `${goal.kind}:${goal.id ?? key(goal.pos)}` : null,
        turn: belief.turn,
      });
    }

    if (!goal) return 'rest';
    const route = routeTo(field, goal.pos);
    if (route.length < 2) {
      goal = null;
      return 'rest';
    }
    return actionToward(belief.player.pos, route[1]);
  };
}
