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
  effectiveHp, expectedDamage, rageMultiplier, weaponDamage, weaponMinDamage,
} from '../sim/combat.js';
import { expectedHpFor, MONSTER_SKIP_CHANCE, READ_TURNS } from '../sim/balance.js';
import {
  CHEST_VALUE_HP, CROWD_PENALTY, DANGER_PERSISTENCE, DEFAULT_CHEST_COUNT,
  DEFAULT_MONSTER_COUNT, DEFAULT_HERO, GOAL_STICKINESS, LOOT_VALUE, RAGE_AT,
  READ_AT,
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
// HOW MUCH HEALTH THE BOT BELIEVES IS IN FRONT OF IT.
//
// It is NEVER told a creature's hp (src/sim/observe.js), at any range, so
// this estimate is all there is from the first decision to the last blow.
// `expectedHpFor` is the bestiary average for that xp; `bravery` bends it.
//
// AND THEN IT SUBTRACTS WHAT IT HAS ALREADY DONE. `hurt` is the bot's own
// tally of the blows it landed on this creature, folded into Belief from the
// blow the hero perceives each turn. So a duel opens on a guess and that
// guess DECAYS as the fight goes: the cost of finishing something half dead
// is priced as half, which is what lets the fight gate flip mid-brawl in
// either direction — cheap enough to finish, or dear enough to walk away
// from — without the answer ever crossing the fog.
//
// AND A GUESS THAT RUNS OUT IS RE-GUESSED, NOT FLOORED. A creature still
// standing when the tally says it should be dead has FALSIFIED the estimate,
// and the only thing the bot may conclude is that it is fighting something
// tougher than the average of its kind — so it guesses again, from the top,
// with the same bestiary it had before.
//
// What that replaces was worse than a rounding choice. Flooring the estimate
// at 1 hp put `turns` under one, and `duelCost` subtracts a turn for the
// hero's free first blow — so the rest of a fight the hero was LOSING was
// priced at exactly zero, and the bot was at its most confident precisely
// where it had been proven wrong.
//
// Honest about what it bought: over 120 runs this moved no behaviour at all
// — same depth, same deaths, same 71 duels broken off, 226 refusals against
// 220. The window is narrow (the next blow usually kills) and the reason to
// keep it is that the alternative cannot be defended, not that it measured.
//
// The retreat itself already worked and the first probe that said otherwise
// was broken: it compared distances at the END of a turn, and a same-speed
// chaser steps back in on that same turn, so every successful retreat read as
// a hero who had not moved. Measured properly the bot breaks off 3.2% of its
// duels. What actually caps that number is the ROUTER, not this — see
// `shrineSink` below.
//
// BRAVERY IS A DISCOUNT ON THE ESTIMATE, mirrored around the centre: a dial
// one notch up (1.16) makes the hero read the creature as holding 16% LESS
// than its kind usually does, because that is what being brave IS — not a
// wider margin for error, but a belief that the thing dies faster than it
// looks. Sometimes true (a wolf where he expected the average of wolf and
// ogre) and sometimes fatal (the ogre). The dial cannot make him right; it
// chooses which way he is wrong.
export function assumedHp(monster, bravery = 1) {
  const opening = expectedHpFor(monster.xp) * (2 - bravery);
  const left = opening - (monster.hurt || 0);
  return left > 0 ? left : opening;
}

export function duelCost(player, monster, bravery = 1) {
  // `rageMultiplier` and not a flag read here: the estimate and the roll are
  // one rule (src/sim/combat.js), and a second copy of the test is how the
  // bot would spend five turns underrating its own damage.
  const mine = expectedDamage(player.xp, weaponDamage(player), weaponMinDamage(player),
    rageMultiplier(player));
  // Monsters carry nothing that fights (their drop is not inventory), so
  // neither half of the weapon formula applies to their blow.
  const theirs = expectedDamage(monster.xp, 0);
  if (mine <= 0) return { hpLost: Infinity, turns: Infinity };

  const turns = assumedHp(monster, bravery) / mine;
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
//
// A LIVE CREATURE IS ARGUABLY THE SAME SHAPE AND IS DELIBERATELY LEFT OUT.
// Walking into one attacks it and the hero STAYS PUT (rules.md §6), so the
// router is modelling a move the engine does not allow: `believedWalkable`
// reads terrain only, every route crosses a creature for one `stepCost` as
// if it were floor, and the danger field charges the per-turn bite instead
// of the duel that entering actually starts.
//
// Adding creatures here was tried and measured. Retreat turns rose 44% (225
// to 324 over 120 runs) with depth and deaths flat — and it broke the thing
// V5 exists to protect: a frontier behind a creature in a corridor becomes
// UNREACHABLE rather than expensive, so the bot stops exploring past a guard
// instead of paying for it. The honest fix prices the duel onto the tile
// rather than deleting the tile, which is a change to the route model and
// wants its own measurement. docs/backlog.md carries it.
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
export function dropValue(belief, drop, bravery = 1) {
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
      duelCost(belief.player, monster, bravery).hpLost
        - duelCost(armed, monster, bravery).hpLost);
  }
  return flat + saved;
}

// A GUARD IS ANY CREATURE WHOSE CHASE RADIUS COVERS THE LOOT — "standing
// there would wake this thing". Not proximity in the abstract: a creature
// with a wide radius guards from far, a short-radius one guards only what it
// is touching.
//
// It used to also require `monster.side`, and dropping that is not a
// loosening — it is the filter losing its input (`side` no longer crosses the
// fog, src/sim/observe.js). It is also more honest: a creature on the
// mandatory route that happens to cover a chest still has to be dealt with
// before the chest can be had, and the old test priced that guard at zero.
//
// ***** IT CHARGES BY DISTANCE, NOT BY PRESENCE *****
//
// Watched, not derived: on seed 2956634425 the bot walked past a chest at its
// elbow with nothing near it and went for something much further away. Inside
// its radius, a guard used to charge the WHOLE duel — the same standing on the
// chest or twelve tiles from it — so one wide-radius creature priced half a
// floor at full cost.
//
// That is wrong about the game, not just about the arithmetic. A guard eight
// turns away CAN BE BEATEN TO IT: the hero opens the chest in two turns and
// leaves. The duel is only owed in full if the creature actually arrives, and
// `persistence` is already the project's decided answer to "how much does a
// threat fade per tile between us".
//
// The steps are REAL PATH STEPS and they cost nothing to get: `dangerField`
// already floods from every creature and hands back a `reach` map that, until
// now, nothing read. That fixes the other half of the same defect for free —
// the old test measured a straight line, so a guard behind a wall charged as
// if it were beside you.
export function guardCost(belief, pos, { amortise = false, bravery = 1, reach, persistence } = {}) {
  // Steps from a creature to a tile, or undefined when the flood never got
  // there — out of its radius, or no path at all.
  const stepsTo = (monster, target) => {
    const spread = reach.get(monster.id);
    return spread && spread.get(key(target));
  };
  let total = 0;

  for (const monster of liveMonsters(belief)) {
    const steps = stepsTo(monster, pos);
    // The same awake test the danger field runs, on the same numbers — two
    // copies of "does this creature reach here" is how they drift apart.
    if (steps === undefined || !isAwakeAt(monster, steps)) continue;

    let share = 1;
    if (amortise) {
      // Everything still worth collecting that this same creature covers.
      // Chests and loose items both count: the duel is paid once and buys
      // access to all of them.
      let guarded = 0;
      for (const chest of belief.chests.values()) {
        const d = stepsTo(monster, chest.pos);
        if (d !== undefined && isAwakeAt(monster, d)) guarded++;
      }
      for (const item of belief.items.values()) {
        const d = stepsTo(monster, item.pos);
        if (d !== undefined && isAwakeAt(monster, d)) guarded++;
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
    const prize = amortise ? dropValue(belief, monster.drop, bravery) : 0;
    const net = Math.max(0, duelCost(belief.player, monster, bravery).hpLost - prize);

    // THE DISCOUNT IS FOR BEING BEATEN TO THE LOOT, so a creature that cannot
    // be outrun does not give it. B18's rule, in the one other place it
    // belongs: the hero moves one tile a turn, a `speed` 2 creature moves
    // two, so the gap never grows and "grab it and leave" is not a plan —
    // it arrives, and the whole duel is owed however far away it started.
    //
    // This is what keeps the vault a room and not a shop. The Butcher has
    // reach 10 over a 9-wide room, so under a flat decay its far chests
    // would cost about a twentieth of its duel and the authored barrier
    // would evaporate — against a measured finding (chests outside its reach
    // were opened 89.7% of the time against 39.2% for the guarded ones).
    // It is also the only creature in the game this reaches: everything on
    // MONSTER_TABLE leaves `speed` unset.
    //
    // `steps` 0 is a creature standing on the loot: full duel either way.
    const outrunnable = (monster.speed ?? 1) <= 1;
    total += net * (outrunnable ? persistence ** steps : 1) / share;
  }
  return total;
}

// HOW MANY THINGS ONE TRIP TO `pos` ALSO COLLECTS — everything covered by the
// same guards that cover `pos`, counted once. 1 when nothing guards it.
//
// C1 §11. B22 already noticed half of this: a guard's duel is paid ONCE and
// buys access to everything it covers, so `guardCost` divides it. But the
// WALK was never divided, and multiplying the chest gate by n shows the
// error exactly —
//
//     what it tested:   n × walk + duel  >  n × value × greed
//     what is true:         walk + duel  >  n × value × greed
//
// The trip is charged n times for going once. A room with six chests across
// the floor was judged as if the hero walked there six separate times.
//
// The cluster is defined BY THE GUARD and that is a deliberate limit, not an
// oversight: it is the one grouping already computed, it costs nothing, and
// it is exactly the case B22 was about. An UNGUARDED cluster stays invisible —
// which is the cheap case the bot should love — and fixing that needs a
// radius, which is a parameter nobody has a value for yet. Measure first.
function tripSize(belief, pos, reach) {
  const covers = (monster, target) => {
    const spread = reach.get(monster.id);
    const d = spread && spread.get(key(target));
    return d !== undefined && isAwakeAt(monster, d);
  };

  const guards = liveMonsters(belief).filter((m) => covers(m, pos));
  if (!guards.length) return 1;

  // A union, not a sum: two guards covering the same chest do not make the
  // trip collect it twice.
  const together = new Set();
  for (const monster of guards) {
    for (const chest of belief.chests.values()) {
      if (covers(monster, chest.pos)) together.add('c' + chest.id);
    }
    for (const item of belief.items.values()) {
      if (covers(monster, item.pos)) together.add('i' + item.id);
    }
  }
  return Math.max(1, together.size);
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
// WHAT IS WITHIN ARM'S REACH RIGHT NOW, in hp — the sum of the duels the
// hero could be trading blows in on his very next turn.
//
// ADJACENT, not merely awake, and the difference was the syringe's whole
// defect. `raging` counts down on every turn that PASSES (src/sim/step.js),
// walking included, so a turn spent closing distance is a turn of the item
// burnt. The old test summed every creature inside its chase radius, which
// let the hero inject at creatures across the room: measured over 150 runs,
// 40% of injections had nobody adjacent, a quarter had the nearest creature
// six or more tiles away, and 42% of syringes produced NOT ONE raging blow.
// Only 31% of raging turns landed a blow at all.
//
// So this is not a threshold that was too low, it was the wrong quantity —
// "a fight is coming" instead of "a fight is here". There is no board state
// where raging at empty air is right, which is what makes the fix a
// definition and not a tuning.
function meleeCost(belief, bravery = 1) {
  const [px, py] = belief.player.pos;
  let total = 0;
  for (const m of belief.monsters.values()) {
    if (m.dead) continue;
    if (Math.abs(m.pos[0] - px) + Math.abs(m.pos[1] - py) !== 1) continue;
    total += duelCost(belief.player, m, bravery).hpLost;
  }
  return total;
}

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
    // Granted the same way the counts are (rules.md §7): a fact about the
    // SHAPE of the descent, not about what is behind the fog on this floor.
    // 1 means "assume the whole run is still ahead", which is what a caller
    // that does not know the curve should get.
    threatAhead: options.threatAhead ?? 1,
    floorsAhead: options.floorsAhead ?? 1,
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
    // WHAT THE BOOK IS WORTH SPENDING ON, in one product of three terms:
    //
    //     missing  >=  hpMax * READ_AT * greed * threatAhead
    //
    // `READ_AT` is the demand when the WHOLE run is still ahead — near
    // death, by design — and each term bends it for one reason:
    //
    //   threatAhead  the share of the descent's threat still in front
    //                (src/sim/difficulty.js). Save it while the dungeon
    //                still owes you everything; spend it once it does not.
    //                A quantity out of the difficulty curve rather than a
    //                floor number somebody chose, so retuning the curve
    //                retunes this for free.
    //   greed        how dearly this hero holds a thing, the same meaning it
    //                carries everywhere else in the bot.
    //
    // NO CAP, and removing it is what makes the top of the dial mean
    // something. The product passes 1 on shallow floors at high greed, and a
    // demand above one bar is simply unmeetable — so the miser CANNOT read
    // early, which is the behaviour rather than a bug in it. The ladder that
    // falls out: the demand drops under a full bar around floor 4 at greed
    // 1.16, floor 8 at 1.48, floor 9 at 1.8. Capping it flattened those three
    // into one setting that read at a point from death on floor three.
    //
    // The cost is real and deliberate: a band that only becomes possible on
    // floor 9 fires in the few runs that reach floor 9. Hoarding that hard
    // is supposed to cost the item.
    const missing = belief.player.hpMax - belief.player.hp;
    const demand = READ_AT * hero.sideAppetite * (settings.threatAhead ?? 1);
    if (missing >= belief.player.hpMax * demand
      && belief.player.inventory.some((i) => i.kind === 'book')
      && safeToStandStill(belief)) {
      return 'read';
    }

    // THE SYRINGE, and the same sentence as the book with the context term
    // swapped: what is in my face right now, instead of what the descent
    // still owes.
    //
    //     cost of what is within reach  >=  effective hp * RAGE_AT * greed
    //
    // Priced in HP, using `duelCost` — the bot's own currency for a fight,
    // already net of the hero's weapon. Raw threat mass would have been the
    // obvious quantity and the wrong one: its units are hp × damage, so a
    // fixed floor terrifying on floor 1 is routine on floor 9, where the mass
    // is twenty times larger. A share of what the hero HAS is scale-free.
    //
    // ADJACENT ONLY (`meleeCost`, and its note carries the measurement). The
    // rage clock runs on turns, not on blows, so injecting at anything the
    // hero still has to walk to spends the item on the walk. There is no
    // board where raging at empty air is right — this is the one gate in the
    // bot that is a definition rather than a threshold.
    //
    // Uncapped for the reason the book is: at high greed the demand passes
    // everything the hero has, and unmeetable is what "saves it for a real
    // fight" means.
    // `floorsAhead`, NOT `threatAhead`, and the difference was measured
    // rather than argued: threat is back-loaded, so its share is still ~0.95
    // on floors 1 to 5 — precisely where this hero's injection floor was
    // stuck. Swapping in the flat share of floors left is what lets greed
    // mean "later in the run" instead of only "a bigger brawl", since a big
    // brawl happens shallow often enough on its own.
    if (belief.player.inventory.some((i) => i.kind === 'syringe')
      && !belief.player.raging
      && meleeCost(belief, hero.bravery) >= effectiveHp(belief.player)
        * RAGE_AT * hero.sideAppetite * (settings.floorsAhead ?? 1)) {
      return 'rage';
    }

    for (const id of belief.chests.keys()) chestsEverSeen.add(id);

    // Price the board, then price every route across it. One field holds
    // the cheapest hp cost of reaching each tile, danger included, so one
    // number compares "walk over there" with "have this fight".
    const passable = believedWalkable(belief);
    const danger = dangerField(belief, settings);

    // B26 — A LIVE CREATURE IS NOT FLOOR. Walking into one attacks it and the
    // hero STAYS PUT (rules.md §6), so a route that crossed a creature for one
    // `stepCost` was pricing a move the engine does not allow. That single
    // lie was behind three separate behaviours: the bot refused a fight and
    // then routed back through it, it walked away from the creature it had
    // just injected against (89 wasted rage turns over 150 runs), and it
    // never finished a brawl it had started.
    //
    // The tile costs the DUEL, and it costs ONLY the duel — not the duel plus
    // the menace the danger field puts there. Both are the same blows: the
    // duel already counts every exchange the fight takes. Charging the step
    // as well would price a turn the hero never spends walking.
    //
    // PRICED, NOT BLOCKED, and the difference was measured. Making the tile a
    // graph sink also works — retreat turns rose 44% with depth and deaths
    // flat — but it breaks V5: a frontier behind a corridor guard becomes
    // UNREACHABLE instead of expensive, so the bot stops exploring past a
    // guard rather than paying to. An unkillable creature (`hpLost` infinite)
    // still blocks, which is not a special case — it is the price being true.
    const duelAt = new Map();
    for (const monster of liveMonsters(belief)) {
      duelAt.set(key(monster.pos), duelCost(belief.player, monster, hero.bravery).hpLost);
    }

    // `Math.max(0, ...)` is Dijkstra's precondition, not decoration: a
    // negative tile price makes revisiting a tile cheaper every time round
    // and the search never terminates — the page hangs rather than throws.
    // Reachable from a hostile tuning value (a negative persistence flips
    // menace's sign), so the router refuses one here rather than trusting
    // every caller.
    const field = dijkstra(belief.player.pos, passable, (x, y) => {
      const duel = duelAt.get(x + ',' + y);
      if (duel !== undefined) return duel;
      return Math.max(0, hero.stepCost + danger.priceAt(x, y));
    }, shrineSink(belief));

    // What every guard question is answered against: the same flood the
    // danger field already ran, and the same decay it prices tiles with.
    const guardOpts = {
      amortise: settings.amortiseGuard,
      bravery: hero.bravery,
      reach: danger.reach,
      persistence: settings.persistence ?? DANGER_PERSISTENCE,
    };

    const ehp = effectiveHp(belief.player);
    const fightBar = hero.fightMargin * ehp;
    // C1 §7 — the BAR is risk, not greed. This is the one line the split
    // moved: `riskAppetite` and `sideAppetite` are both born at 1, so the
    // change is an exact no-op until one of them is turned. Everything below
    // that compares a COST against this bar is asking "how much uncertainty
    // do I accept"; everything that multiplies a VALUE keeps asking greed.
    const sideBar = hero.riskAppetite * fightBar;

    // Everything worth having, each priced by what acquiring it costs.
    const pool = [];

    for (const monster of liveMonsters(belief)) {
      const walk = priceOfReaching(field, monster.pos);
      if (!Number.isFinite(walk)) continue;
      const duel = duelCost(belief.player, monster, hero.bravery).hpLost;

      // B26 — the route price now ENDS with this creature's own duel, because
      // its tile is the fight. Take that back out here, or the pool adds the
      // duel a second time on its own terms (net of the prize, waived when it
      // is already chasing) and every creature is priced at twice its cost.
      const approach = walk - duel;

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
      // ONE BAR FOR EVERY CREATURE. It used to be `monster.side ? sideBar :
      // fightBar` — a different threshold for a creature standing off the
      // mandatory route. That distinction is gone because `side` no longer
      // crosses the fog (src/sim/observe.js), and it was costing nothing: at
      // the shipped `sideAppetite` of 1, `sideBar` IS `fightBar`, so the
      // ternary compared a number against itself.
      //
      // The optional half of the map still reaches this decision, through
      // the price rather than through a label: a side room is off the route,
      // so walking there costs more and its guard costs more. Measured, the
      // gamble survives the change at every band of greed.
      const inescapable = chasing && (monster.speed ?? 1) > 1;
      if (!inescapable && duel > fightBar) continue;

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
      const prize = settings.lootValue ? dropValue(belief, monster.drop, hero.bravery) : 0;
      pool.push({
        kind: 'monster', id: monster.id, pos: monster.pos,
        price: approach + Math.max(0, (chasing ? 0 : duel) - prize),
      });
    }

    for (const item of belief.items.values()) {
      // Every field that makes an item worth walking to, or a weapon whose
      // only gift is a higher damage floor reads as worthless.
      if ((item.dmg || 0) + (item.dmgMin || 0)
        + (item.armour || 0) + (item.heal || 0) <= 0) continue;
      const walk = priceOfReaching(field, item.pos);
      if (!Number.isFinite(walk)) continue;
      const guard = guardCost(belief, item.pos, guardOpts);
      if (guard > sideBar) continue;              // the gamble refused
      // C1 §11, same as the chest below: one journey buys everything the
      // same guards cover, so the walk is divided by what the trip collects.
      const trip = settings.amortiseGuard ? tripSize(belief, item.pos, danger.reach) : 1;
      pool.push({ kind: 'item', id: item.id, pos: item.pos, price: walk / trip + guard });
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
      const guard = guardCost(belief, chest.pos, guardOpts);

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
      //
      // C1 §11 — and the walk is shared by the trip, not paid per chest.
      // Under the same flag as the guard's amortisation because it is the
      // same idea finished: B22 divided the duel and left the walk whole, so
      // a treasure room across the floor was priced as six separate journeys.
      const trip = settings.amortiseGuard ? tripSize(belief, chest.pos, danger.reach) : 1;
      const visit = walk / trip + guard;

      if (settings.lootValue) {
        if (visit > settings.chestValueHp * hero.sideAppetite) continue;
      } else if (guard > sideBar) {
        continue;
      }

      pool.push({ kind: 'chest', id: chest.id, pos: chest.pos, price: visit });
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
