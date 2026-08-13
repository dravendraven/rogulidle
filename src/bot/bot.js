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
//
// ***** IT DOES NOT PRICE `speed`, AND THAT IS DELIBERATE (M44) *****
//
// A creature with `speed` 2 lands roughly twice the blows this returns, so
// its real cost is about double what the bot pays for. Multiplying `theirs`
// by `monster.speed` here would be one word and it is the wrong word.
//
// The reason is a measured dead end. Entry and survival are the same
// number: whether the bot takes a fight is `duelCost <= bar`, and whether
// it survives one is roughly `duelCost / effectiveHp` — so anything that
// makes a fight deadlier makes the bot refuse it instead of losing it.
// Swept across every (hp, xp) pair with the same duelCost, from hp 24 / xp 4
// to hp 9 / xp 11, the win rate is flat at 45-54%: reshaping the creature
// cannot separate them. `speed` is the only property found that moves what
// a fight COSTS without moving what it is PRICED at, and the vault needs
// exactly that — a room most heroes enter and most heroes lose.
//
// So this is a blind spot the design leans on, not an oversight. `speed`
// travels in Belief (src/sim/observe.js) and could be read; nothing reads
// it. Pricing it here would restore the coupling and delete the room's
// whole point — docs/project/decisions.md carries the numbers.
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

      // A creature already chasing charges only the walk: its duel happens
      // whatever the bot does next, so fighting it now is the version where
      // the bot picked the ground.
      const steps = field.steps.get(key(monster.pos));
      const chasing = steps !== undefined && isAwakeAt(monster, steps);

      // B18 — and one that is FASTER than the hero cannot be left behind at
      // all, so there is no version where the bot walks away. The hero
      // moves one tile a turn; a `speed` 2 creature moves two, so the gap
      // never grows, the chase radius never breaks, and fleeing is a slow
      // death with no blows returned — measured against the Butcher, which
      // strikes twice when adjacent and once while closing, so running
      // halves the damage taken and zeroes the damage dealt.
      //
      // The gate below decides which fights to TAKE. When there is nothing
      // to decide it has no business running, and the comment above already
      // said so — the bug was that the gate sat in front of the clause that
      // knew better and threw the creature out first.
      //
      // This is the one place the bot reads `speed`, and it reads it to
      // answer "can I get away", never "what does this cost". `duelCost`
      // still does not price it (see its own note): the decision to ENTER a
      // room is untouched, only the decision to leave a fight already
      // joined. A creature at speed 1 can still be outrun — it hesitates
      // one turn in ten and falls behind — so nothing else in the game
      // changes behaviour here.
      const inescapable = chasing && (monster.speed ?? 1) > 1;
      if (!inescapable && duel > (monster.side ? sideBar : fightBar)) continue;
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

      // V5 — what the walk into the dark costs in HP, with the walking
      // itself taken back out. The route price mixes two things the rest of
      // this function keeps apart: `stepCost` per tile (objective 3, time)
      // and the danger field (objective 1, survival). Every other gate here
      // charges hp alone — `duelCost` and `guardCost` are both pure hp and
      // neither counts the walk — so the bar has to be shown the same
      // currency or a long safe corridor reads as a gamble.
      const dangerOnTheWay = (pos) => {
        const price = priceOfReaching(field, pos);
        if (!Number.isFinite(price)) return Infinity;
        const steps = field.steps.get(key(pos)) ?? 0;
        const slack = price - steps * hero.stepCost;
        // The route price is stepCost SUMMED once per tile and this is the
        // same quantity MULTIPLIED — in binary the two do not agree, and the
        // ~1e-16 that survives made a corridor with no danger on it read as a
        // gamble. At appetite 0 the bar is exactly 0, so that residue refused
        // every frontier, the goal went null, and the bot rested until the
        // turn budget ran out (measured: 21 of 152 floors, all timeouts).
        // Below the smallest danger the field can produce there is only noise.
        return slack < 1e-9 ? 0 : slack;
      };

      // V5 — exploration used to be the one decision nothing gated. It
      // picked the frontier with the fewest STEPS, a danger-blind ruler
      // nothing else in the bot uses, and no bar could refuse it. So a
      // hero forbidden from a fight still walked into the room holding it,
      // woke what was inside, and then fled from a duel its own appetite
      // would not let it finish. Measured: `sideAppetite` 0 cut the
      // Butcher's kills to a twentieth and barely moved its deaths.
      //
      // Now the frontier is chosen by the same priced route everything else
      // is, and refused by the same bar the side-room gamble uses. At
      // appetite 0 that leaves exactly the frontiers with no danger on the
      // way — which is what "never leaves the mandatory route" was always
      // supposed to mean.
      const frontierOk = (pos) => dangerOnTheWay(pos) <= sideBar;

      if (held && held.kind === 'frontier' && (owed || !shrineReachable)
        && frontierOk(held.pos)) {
        // Re-checked rather than held blind: the danger on the way is what
        // changes while the bot walks, since a creature waking mid-route is
        // exactly the case this exists for.
        goal = held;
      } else if (owed || !shrineReachable) {
        const near = frontiers(belief).reduce((a, pos) => {
          const price = priceOfReaching(field, pos);
          if (!Number.isFinite(price) || !frontierOk(pos)) return a;
          return (!a || price < a.price) ? { pos, price } : a;
        }, null);
        goal = near ? { kind: 'frontier', pos: near.pos } : null;
      } else {
        goal = null;
      }

      // Last resort, and the reason it exists: `rest` passes the turn and
      // changes nothing — creatures outside their chase radius do not move —
      // so a turn with no goal reproduces itself exactly and the floor times
      // out on the spot. Standing still is never survival, so a frontier the
      // appetite refused still beats it. Only reached when the bar rejected
      // every frontier AND no shrine is known: with either of those the bot
      // already had somewhere to go.
      if (!goal && !shrineReachable) {
        const anywhere = frontiers(belief).reduce((a, pos) => {
          const price = priceOfReaching(field, pos);
          if (!Number.isFinite(price)) return a;
          return (!a || price < a.price) ? { pos, price } : a;
        }, null);
        if (anywhere) goal = { kind: 'frontier', pos: anywhere.pos };
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
