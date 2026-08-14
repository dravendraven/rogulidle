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
import { MONSTER_SKIP_CHANCE, READ_TURNS } from '../sim/balance.js';
import {
  CHEST_VALUE_HP, CROWD_PENALTY, DANGER_PERSISTENCE, DEFAULT_CHEST_COUNT,
  DEFAULT_MONSTER_COUNT, DEFAULT_HERO, GOAL_STICKINESS, LOOT_VALUE, READ_AT,
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
  const persistence = tuning.persistence ?? DANGER_PERSISTENCE;
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
      menace.set(tile, (menace.get(tile) || 0) + bite * persistence ** distance);
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
//
// B22 — `amortise` splits each guard's duel across everything it is
// guarding, and without it the bot cannot read a treasure room at all.
//
// The vault is the case that exposed it. Eight chests sit inside the
// Butcher's reach, so every one of them was priced with the WHOLE duel —
// about 7.2 hp against a floor-4 hero — and the bot compared that against
// one chest, eight separate times, and refused eight times. The room's real
// arithmetic is `8 × value − 1 × duel`; the arithmetic it did was
// `1 × value − 1 × duel`. That is why raising the reward would not have
// helped: at 8 chests the room already pays about 8 hp for a 7.2 hp fight,
// and the bot was simply never summing it.
//
// The share is OPTIMISTIC on purpose. It assumes the hero collects
// everything that guard covers, and a hero that grabs one and leaves has
// paid the whole duel for one. That is a belief, not a fact — which is
// exactly the kind of thing the greed bias exists to be wrong about in
// either direction.
// M49 — what a drop the hero can SEE is worth, in hp.
//
// Flat items convert directly: the armour bar and the hp bar are both damage
// survived (`effectiveHp`). A WEAPON does not — its worth is that fights end
// sooner — so it is priced by asking the question the bot already knows how
// to ask: what would this have saved against the creatures currently in
// sight? That is `duelCost` twice, once armed and once not, and it needs no
// new constant and no exchange rate anybody had to invent.
//
// It UNDERCOUNTS on purpose, and the direction matters: only creatures
// already seen, only this floor. A weapon keeps paying for the rest of the
// run, and that is the horizon this project built once and deleted. Better a
// floor that is provably true than a run that is a guess.
export function dropValue(belief, drop) {
  if (!drop) return 0;
  const flat = (drop.armour || 0) + (drop.heal || 0);
  if (!(drop.dmg || drop.dmgMin)) return flat;

  const armed = {
    ...belief.player,
    inventory: [...(belief.player.inventory || []), drop],
  };
  let saved = 0;
  for (const monster of liveMonsters(belief)) {
    saved += Math.max(0,
      duelCost(belief.player, monster).hpLost - duelCost(armed, monster).hpLost);
  }
  return flat + saved;
}

function guardCost(belief, pos, amortise = false) {
  const near = (a, b, reach) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) <= reach;
  let total = 0;
  for (const monster of liveMonsters(belief)) {
    if (!monster.side) continue;
    if (!near(monster.pos, pos, monster.activation)) continue;

    let share = 1;
    if (amortise) {
      // Everything still worth collecting that this same creature covers.
      // Chests and loose items both count: the duel is paid once and buys
      // access to all of them.
      let guarded = 0;
      for (const chest of belief.chests.values()) {
        if (near(monster.pos, chest.pos, monster.activation)) guarded++;
      }
      for (const item of belief.items.values()) {
        if (near(monster.pos, item.pos, monster.activation)) guarded++;
      }
      share = Math.max(1, guarded);
    }

    // M49 — a guard that shows what it carries is cheaper than one that
    // does not, because killing it pays. The vault's occupant is the only
    // creature this reaches: `drop` is absent from Belief for every other
    // one, so `dropValue` returns 0 and the arithmetic is unchanged.
    //
    // Under the same flag as the amortisation because it is the same idea —
    // pricing a visit by what it is worth, not only by what it costs — and
    // an A/B that leaves half the value model on measures nothing.
    const prize = amortise ? dropValue(belief, monster.drop) : 0;
    const net = Math.max(0, duelCost(belief.player, monster).hpLost - prize);
    total += net / share;
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

// Whether the hero can stand still for a whole read without being reached.
// EXACT, not a guess, and that is what makes reading a decision rather than
// a gamble: a creature is asleep while the hero is farther than its
// activation radius (rules.md §3), and a hero who does not move wakes nobody
// new — so the only creatures that can arrive are the ones already awake.
//
// IT ONLY WORKS FOR A HERO WHO SEES THE FLOOR. `belief.monsters` holds what
// has been seen, and the mean activation radius a run meets is wider than
// the ordinary hero's sight — so for anyone else this would answer "safe"
// about creatures it simply cannot see. Only the scholar carries the book,
// and he is the one who sees the whole floor; the two halves are one design.
//
// Manhattan rather than a real path, and it errs the safe way: a path is
// never shorter than the straight-line count, so anything called "close
// enough to arrive" is at worst early, never late.
function safeToStandStill(belief) {
  const [px, py] = belief.player.pos;
  for (const m of belief.monsters.values()) {
    if (m.dead) continue;
    const d = Math.abs(m.pos[0] - px) + Math.abs(m.pos[1] - py);
    // `isAwakeAt` rather than a second copy of "awake" written here — the
    // danger field already answers that question and the two must not drift.
    if (!isAwakeAt(m, d)) continue;
    if (d <= READ_TURNS + 1) return false;
  }
  return true;
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
    // B21 — the reward half of the chest decision, and the switch that
    // turns it on. Both travel as options so a sweep can A/B them without
    // editing config.js.
    lootValue: options.lootValue ?? LOOT_VALUE,
    chestValueHp: options.chestValueHp ?? CHEST_VALUE_HP,
    // Half of the same model, separable ONLY so a sweep can tell which half
    // moved a number — it defaults to `lootValue` and nothing ships it on
    // its own. Without the split, the value gate and the amortisation would
    // land together and neither could be credited.
    amortiseGuard: options.amortiseGuard ?? options.lootValue ?? LOOT_VALUE,
    stickiness: options.stickiness ?? GOAL_STICKINESS,
    persistence: options.persistence ?? DANGER_PERSISTENCE,
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

    // Objective 1, the scholar's version. Same shape as the potion above —
    // a threshold on numbers already in hand, no lookahead — but the second
    // half is what the potion never needed: five turns standing still are
    // free or fatal depending on what is awake, so the rule asks.
    //
    // NO DEPTH GATE, and it is a live question rather than a decision: with
    // nothing to look ahead with, this fires the first time the bar drops
    // low on a quiet tile, which will usually be shallow — and the runs die
    // deep. Whether the book should be held for the floors that kill is for
    // a measurement to answer, not for a number invented here.
    if (belief.player.hp <= belief.player.hpMax * READ_AT
      && belief.player.inventory.some((i) => i.kind === 'book')
      && safeToStandStill(belief)) {
      return 'read';
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
    // Reachable from a hostile tuning value (a negative persistence flips
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

      // M49 — a creature that shows what it carries is priced NET of it.
      // The Butcher is the only one, and the axe is the whole reason the
      // room exists: before this, killing it was pure cost in the
      // arithmetic and the guaranteed prize was worth exactly zero.
      //
      // The discount lands on the PRICE and never on the gate above. That
      // gate is objective 1 — can the hero survive this fight — and a prize
      // does not make a duel cheaper in hp. Discounting it there would be
      // the bot walking into a fight it cannot win because the loot is
      // good, which is the failure the margin exists to prevent.
      const prize = settings.lootValue ? dropValue(belief, monster.drop) : 0;
      pool.push({
        kind: 'monster', id: monster.id, pos: monster.pos,
        price: walk + Math.max(0, (chasing ? 0 : duel) - prize),
      });
    }

    for (const item of belief.items.values()) {
      // Every field that makes an item worth walking to, or a weapon whose
      // only gift is a higher damage floor reads as worthless.
      if ((item.dmg || 0) + (item.dmgMin || 0)
        + (item.armour || 0) + (item.heal || 0) <= 0) continue;
      const walk = priceOfReaching(field, item.pos);
      if (!Number.isFinite(walk)) continue;
      const guard = guardCost(belief, item.pos, settings.amortiseGuard);
      if (guard > sideBar) continue;              // the gamble refused
      pool.push({ kind: 'item', id: item.id, pos: item.pos, price: walk + guard });
    }

    for (const chest of belief.chests.values()) {
      // A hero who can see what a chest holds does not walk to the empty
      // ones. This is a FILTER, not a valuation: it needs no dial, and it
      // works in both of B21's modes below.
      //
      // B25 shipped `lootValue` ON, which makes the filter worth MORE than
      // when it was written, not less: the reward term below prices every
      // unopened chest at what an unopened chest is BELIEVED to hold, so
      // without this an empty one is walked to at full imagined value.
      //
      // The test is on the field's PRESENCE, not its truth. `drop` only
      // reaches Belief for a persona that reveals it (rules.md §7), so for
      // every other hero it is absent and must fall through here — reading
      // a missing field as "empty" would make the ordinary bot refuse every
      // chest on the floor.
      if ('drop' in chest && !chest.drop) continue;

      const walk = priceOfReaching(field, chest.pos);
      if (!Number.isFinite(walk)) continue;
      const guard = guardCost(belief, chest.pos, settings.amortiseGuard);

      // B21 — the gamble, refused two different ways.
      //
      // OFF (shipped): the old one-sided test. A chest is refused when its
      // GUARD alone costs more than the appetite bar allows — a question
      // about affording it, never about whether it is worth anything.
      //
      // ON: a two-sided comparison. What the visit costs — the walk AND the
      // guard, because both are paid — against what the chest is believed
      // to be worth, scaled by greed. `sideAppetite` stops being a share of
      // the hero's hp and becomes a multiplier on VALUE, which is the only
      // way the dial gets a quantity of its own instead of pulling on the
      // same threshold courage already pulls on.
      if (settings.lootValue) {
        if (walk + guard > settings.chestValueHp * hero.sideAppetite) continue;
      } else if (guard > sideBar) {
        continue;
      }

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
