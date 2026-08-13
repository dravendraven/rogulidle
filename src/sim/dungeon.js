// A run: ten floors, nineteen traversals — down to the bottom and back up.
// Every floor is crossed twice except the deepest, which is crossed once:
// the hero climbs OUT of the bottom, it does not re-cross it.
//
// A single traversal is a complete game — the shrine ends it. A run strings
// nineteen of them together, and the shrine becomes a staircase for all but
// the last. What the hero IS carries across; where they stood does not.
//
// On an ascent traversal the doors swap: the hero emerges where the floor's
// shrine stood (it climbs the stairs it went down), and the way out is where
// the hero originally entered. game.js does the swap after generation, so
// the floor itself is byte-identical to its descent twin.
//
// What else makes the return DIFFERENT — a new creature seed, no chests, a
// widening draw — is R2, R3 and R4 (docs/backlog.md), each measurable
// alone.

import { COIN_RATE, ITEM_TABLE, PLAYER_HP, PLAYER_XP, TURN_BUDGET } from './balance.js';
import { hashSeeds } from './rng.js';
import { floorParams } from './difficulty.js';
import { playGame } from './game.js';
import { grantArmour } from './step.js';
import { heroItem } from './heroes.js';

export const LEVELS = 10;

// Design in docs/map-design.md ("The run laid out"). A run is NINETEEN
// traversals over ten floors: down to the bottom and back up, every floor
// crossed twice except the bottom, crossed once.
//
// DERIVED, not a dial — this cannot drift away from `LEVELS`; there is
// nothing here for balance.md to hold a row for.
export const TRAVERSALS = LEVELS * 2 - 1;

// Whether the run the PAGES ask for includes the climb back out. Off today
// (owner decision): a plain ten-traversal descent, with the return behind a
// switch in the lab. `playDungeon`'s own default below is deliberately left
// at nineteen — the tests and the analysis modules read the whole arc — so
// this constant is what index.html turns into an explicit
// `traversals: LEVELS`, never a second meaning for `options.traversals`.
export const RETURN_ENABLED = false;

// Which floor a traversal crosses. THE pairing rule, written once: ascent
// traversal `k` crosses floor `2 × floors − k`, so traversal 11 is floor 9
// (the first climb out of the turn) and traversal 19 the second crossing
// of floor 1.
//
// This is also what makes the map come back for free. A floor is generated
// from `hashSeeds(seed, level)` and its `floorPlan(level)`, and neither reads
// the hero — so asking for the same floor number a second time reproduces the
// same map AND the same roster, tile for tile, with no cache and no second
// seed. R2 is what will pull the creature seed away from the map seed; R1
// only has to avoid making that harder, which keeping one seed does.
//
// DIFFICULTY IS INDEXED BY FLOOR, NOT BY TRAVERSAL — every caller that wants
// a plan asks for `floorPlan(floorOfTraversal(k))`, so traversal 12 gets
// floor 9's roster size on the way up, exactly as it had on the way down.
export function floorOfTraversal(traversal, floors = LEVELS) {
  return traversal <= floors ? traversal : (2 * floors) - traversal;
}

// Everything a floor needs falls out of its depth — see difficulty.js for
// the one curve all of it derives from.
export function floorPlan(level) {
  return { ...floorParams(level - 1), level };
}

// What a finished traversal pays. Derived from xp per turn, so it prices
// both halves of objective 2 at once — what the hero took, and how long it
// took. rules.md §9 carries the rule; `COIN_RATE` the value.
//
// Here rather than in the page because two callers now need the SAME
// number: `src/ui/spectator.js`, which shows it and spends it in the shop,
// and the loop below, for the one hero who may spend it before the run is
// over. A second copy of this line is exactly the drift E1 is about.
export function coinsFor(xpEarned, turns) {
  return turns > 0 ? Math.round((xpEarned / turns) * COIN_RATE) : 0;
}

// The engineer's trade: a hero with `stairs` converts what the floor just
// paid into goods before the next one starts. Everyone else reaches the
// shop only once, when the run is already over (rules.md §9).
//
// It mutates the carry rather than the floor because a floor transition is
// the only moment that exists between two floors — and it goes through
// `heroItem` and `grantArmour`, the same two rules a found item and a
// bought one already run, so nothing here is a third copy of "what an item
// means".
//
// Returns what was spent, so the page can take it off the balance it will
// offer at the end.
function atTheStairs(carry, hero, coins, purchases) {
  const deal = hero && hero.stairs;
  if (!deal || !coins || coins < deal.price) return 0;
  const template = ITEM_TABLE.find((i) => i.name === deal.buy);
  if (!template) return 0;

  const affordable = Math.floor(coins / deal.price);
  const bought = Math.min(affordable, deal.maxPerFloor ?? affordable);
  for (let i = 0; i < bought; i++) {
    // NEGATIVE ids: `nextId` starts at 1 and counts up per floor, so nothing
    // minted here can ever collide with something the generator placed.
    const owned = heroItem({ ...template, id: -(purchases + i + 1) }, hero.persona);
    carry.inventory.push(owned);
    grantArmour(carry, owned);
  }
  return bought * deal.price;
}

// What survives the stairs.
function carryFrom(player) {
  return {
    hp: player.hp,
    hpMax: player.hpMax,
    armour: player.armour,
    xp: player.xp,
    inventory: player.inventory,
    kills: player.kills,
    // U3, docs/backlog.md — survives the stairs the same way xp and
    // inventory already do.
    xpEarned: player.xpEarned,
  };
}

// Plays a whole run. `makePolicy(floor)` is called once per TRAVERSAL and
// must return a fresh policy — a bot carries plan state that means nothing
// on the next map, and floor 9 met on the way up is a new problem even
// though the tiles are familiar.
//
// A run is nineteen traversals, not ten floors. Ends when the hero dies,
// when a traversal runs out of turns, or when the LAST TRAVERSAL is cleared.
// Reaching the bottom is the halfway point.
//
// `options.traversals` is what a caller pins to keep measuring a plain
// descent: the analysis modules that read per-floor rows off `levels` below
// would otherwise get each floor twice and quietly average the two crossings
// together. They pass `traversals: LEVELS` and say so at the call site.
export function playDungeon(seed, makePolicy, options = {}) {
  // M42 — the per-traversal turn budget, named rather than hardcoded here.
  // A caller may still override it, which is what the sweeps and the older
  // instruments do; the default is what the game ships.
  const maxTurns = options.maxTurns ?? TURN_BUDGET;
  // All overridable so a tuning page can ask "what if" without editing
  // the shipped model. Defaults ARE the shipped model.
  const floors = options.levels ?? LEVELS;
  const depth = options.traversals ?? floors * 2 - 1;
  const planFor = options.floorPlan ?? floorPlan;
  // ONE entry of `HEROES` (src/sim/heroes.js) — the whole hero, not half of
  // one. Its `persona` travels down to every floor in the counts; its
  // `stairs` is read here, between them. Absent is the shipped hero.
  const hero = options.hero;
  const levels = [];
  let carry = null;
  // Coin is paid per traversal on xp EARNED THERE, so the running total has
  // to be differenced rather than read (rules.md §9).
  let earnedBefore = 0;
  let purchases = 0;

  for (let traversal = 1; traversal <= depth; traversal++) {
    const level = floorOfTraversal(traversal, floors);
    const plan = planFor(level);
    const counts = {
      // M19 — docs/backlog.md. spawn.js reads this to fade the early-chest
      // quality boost by floor; every other field here was already read
      // off `plan`, but `plan.level` itself was never forwarded, which
      // would have made the boost a no-op outside direct populate() calls.
      level: plan.level,
      // The doors swap on the way up — see newGame. Travels in the counts
      // so a recorded replay rebuilds the ascent floor exactly.
      ascending: traversal > floors,
      monsters: plan.monsters,
      chests: plan.chests,
      difficultyScale: plan.difficultyScale,
      clusterSize: plan.clusterSize,
      tierFloorShare: plan.tierFloorShare,
      tierSlack: plan.tierSlack,
      outOfDepthChance: plan.outOfDepthChance,
      chestGuardRadius: plan.chestGuardRadius,
      dropChance: plan.dropChance,
      // A fixed rate overrides the per-floor one, for sweeping.
      weaponScarcity: options.scarcity ?? plan.weaponScarcity,
      // options.armourScarcity is the narrow dial, options.scarcity the
      // blunt one. This key used to appear TWICE in this object, and the
      // second copy — a bare `options.armourScarcity`, undefined in every
      // normal run — silently won.
      armourScarcity: options.armourScarcity ?? options.scarcity ?? plan.armourScarcity,
      potionScarcity: options.scarcity ?? plan.potionScarcity,
      // Map-design dials ride along untouched; undefined means "use the
      // shipped value", which populate() resolves against balance.js.
      monsterSpread: plan.monsterSpread,
      sideRoomDepthBonus: plan.sideRoomDepthBonus,
      spineThreatShare: plan.spineThreatShare,
      sideChestBias: plan.sideChestBias,
      // The map's shape. game.js forwards dugPercentage on to mapgen.js;
      // spawn.js reads shrineDistanceShare off these counts directly.
      dugPercentage: plan.dugPercentage,
      shrineDistanceShare: plan.shrineDistanceShare,
      // M43 — 0 turns the authored room off for the whole descent, which is
      // what a control run needs. Undefined would silently fall back to the
      // shipped floor, so this has to travel explicitly.
      vaultLevel: plan.vaultLevel,
      // Sweepable so the vault's payout can be measured without editing
      // balance.js; undefined means the shipped list.
      vaultChestItems: plan.vaultChestItems,
      // A fixed value overrides the per-floor one, for sweeping — same
      // pattern as weaponScarcity above.
      earlyChestQualityBoost: options.earlyChestQualityBoost ?? plan.earlyChestQualityBoost,
      carry,
      // U6d — docs/backlog.md. What the hero starts the WHOLE RUN holding
      // (the shop, U6e). Forwarded to every floor rather than gated to
      // floor 1 only: game.js applies `carry` after `startingItems`, so
      // any floor past the first — which always has a `carry` by then —
      // overwrites it with the more current inventory regardless. Nothing
      // here needs to know which floor is "first".
      startingItems: options.startingItems,
      // Which hero plays the whole descent (src/sim/heroes.js). Forwarded to
      // every floor for the same reason `startingItems` is: a floor builds
      // its own state and has no way back to the run that asked for it.
      persona: hero && hero.persona,
    };

    const run = playGame(
      hashSeeds(seed, level),
      makePolicy({ ...plan, monsterCount: plan.monsters }),
      { maxTurns, counts },
    );

    // What the hero brought DOWN THE STAIRS, and what this floor actually
    // held. Both are needed to read net challenge: the floor's cost is only
    // meaningful against the hero who walked into it.
    const arrivedWith = carry
      ? { hp: carry.hp, hpMax: carry.hpMax, armour: carry.armour, xp: carry.xp,
        inventory: carry.inventory.map((i) => ({ ...i })), kills: carry.kills.slice() }
      : { hp: PLAYER_HP, hpMax: PLAYER_HP, armour: 0, xp: PLAYER_XP,
        inventory: [], kills: [] };

    // hpMax and xp survive a monster's death, so the roster can be read back
    // from the finished state without regenerating the floor.
    const roster = run.state.monsters.map((m) => ({
      xp: m.xp, hp: m.hpMax, side: m.side, edge: m.edge, dead: m.dead,
      // M43 — which row is the vault's occupant, so a reading can ask
      // whether the Butcher was fought without regenerating the floor.
      vault: !!m.vault,
    }));

    // Which chests were opened and which were walked past. An opened chest
    // is removed from the list, so what remains is what the hero declined.
    const stillShut = new Set(run.state.chests.map((c) => c.id));
    const chests = run.start.chests.map((c) => ({ ...c, opened: !stillShut.has(c.id) }));

    // What the floor actually took out of the hero. Read from the log
    // rather than from hp before/after, because potions and shields picked
    // up mid-floor would otherwise hide the cost.
    const blowsTaken = run.state.log
      .filter((e) => e.type === 'attack' && e.target === 'player')
      .map((e) => e.damage);
    const damage = blowsTaken.reduce((sum, d) => sum + d, 0);

    const player = run.state.player;
    levels.push({
      level,
      // R1 — which crossing this was, and which way the hero was going. The
      // floor number alone no longer identifies a row: floor 9 appears twice
      // in a completed run, and anything keyed on `level` would fold the two
      // together. `direction` is derived from the same rule as `level`, not
      // tracked separately, so the two cannot disagree.
      traversal,
      direction: traversal <= floors ? 'down' : 'up',
      dial: plan.dial,
      monsters: plan.monsters,
      outcome: run.outcome || 'timeout',
      turns: run.turns,
      kills: player.kills.length,
      damage,
      // Every blow that landed, not just the total. The tail is what kills:
      // damage is 0..xp-1, so a single roll at the top of the table can take
      // most of a 10 hp hero, and a mean hides that completely.
      blowsTaken,
      hp: player.hp,
      armour: player.armour,
      xp: player.xp,
      gear: player.inventory.filter((i) => i.dmg || i.armour).length,
      arrivedWith,
      roster,
      chests,
      replay: run.replay,
    });

    // What this traversal paid, and what the hero spent of it before the
    // next one. Recorded on the row so the page can take the spend off the
    // balance it offers at the end of the run — the coin is the same coin.
    const coins = coinsFor(player.xpEarned - earnedBefore, run.turns);
    earnedBefore = player.xpEarned;
    levels[levels.length - 1].coins = coins;
    levels[levels.length - 1].spent = 0;

    if (run.outcome !== 'ascended') {
      // `depth` counts TRAVERSALS survived, not floors — how far the run got,
      // which is what it always meant. On a pinned descent the two are the
      // same number, so every instrument reading this is unchanged; on a full
      // run "died on traversal 14" says something "died on floor 7" cannot,
      // namely which crossing of floor 7 it was.
      return { seed, cleared: false, depth: traversal, levels,
        killedBy: run.state.killedBy || null };
    }
    carry = carryFrom(player);
    // Not after the LAST traversal: there is no next floor to carry it to,
    // and buying there would quietly eat coin the end-of-run shop should
    // have been offered instead.
    const spent = traversal < depth ? atTheStairs(carry, hero, coins, purchases) : 0;
    if (spent) {
      purchases += spent / (hero.stairs.price || 1);
      levels[levels.length - 1].spent = spent;
    }
  }

  // R1 — VICTORY IS COMPLETING THE LAST TRAVERSAL. Reaching the bottom is
  // the halfway point and clears nothing on its own; the loop above simply
  // keeps going, which is why there is no "turn" branch anywhere here.
  return { seed, cleared: true, depth, levels, killedBy: null };
}
