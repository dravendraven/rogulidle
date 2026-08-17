// Rule tests for the P1 engine, checked against docs/rogule-spec.md.
// Run them with: python tools/dev-server.py -> http://localhost:8138/run-tests.html

import {
  CHEST_GUARD_RADIUS, CHEST_TABLE, EARLY_CHEST_QUALITY_BOOST, ITEM_TABLE,
  MIN_ROSTER_FOR_SIDE, MONSTER_TABLE, OUT_OF_DEPTH_CHANCE_CAP,
  PLAYER_HP, PLAYER_XP, RAGE_MULT, RAGE_TURNS, READ_TURNS, ROOM_HEIGHT,
  ROOM_WIDTH, SHRINE_DISTANCE_SHARE,
  STARTING_ITEMS, TURN_BUDGET, VAULT_BOSS, VAULT_BOSS_DROP, VAULT_CHEST_ITEMS, VAULT_LEVEL,
  VAULT_SIZE, WEAPON_AXE_MIN_TIER,
} from '../src/sim/balance.js';
import {
  driveTurns, newGame, playGame, replayGame,
} from '../src/sim/game.js';
import { step, ACTIONS, grantArmour } from '../src/sim/step.js';
import { observe, emptyBelief, foldBelief } from '../src/sim/observe.js';
import { DEFAULT_PERSONA, HEROES, heroItem } from '../src/sim/heroes.js';
import {
  weaponDamage, weaponMinDamage, armourValue, effectiveHp, expectedDamage,
} from '../src/sim/combat.js';
import {
  findPath, generateMap, playerPassable, posKey, tileAt,
} from '../src/sim/mapgen.js';
import { drawLogUniform, drawWeighted, hashSeeds, makeRng } from '../src/sim/rng.js';
import { classifyRooms, spineShare } from '../src/sim/spine.js';
import { inVault, layoutOf, pillarsOf } from '../src/sim/vault.js';
import { itemWeights, monsterWeightsAround } from '../src/sim/spawn.js';
import {
  floorOfTraversal, floorPlan, playDungeon, LEVELS, TRAVERSALS,
} from '../src/sim/dungeon.js';
import {
  expectedFloorMass, floorParams, floorStrength, makeFloorPlan, monstersAt,
  outOfDepthChanceAt, saturatedAt, threatMass,
  CLUSTER_SIZE, MONSTERS_BASE, MONSTER_GROWTH,
  MONSTER_STRENGTH, POTION_SCARCITY, WEAPON_SCARCITY,
} from '../src/sim/difficulty.js';
import {
  assumedHp, dangerField, dropValue, duelCost, guardCost, makeBot,
} from '../src/bot/bot.js';
import {
  BIAS_SPREAD, DANGER_PERSISTENCE, DEFAULT_HERO, LOOT_VALUE, biasBands,
} from '../src/bot/config.js';
import { tileSvg } from '../src/ui/tiles.js';
import { playRun } from '../src/ui/run.js';
import {
  earnedBy, isEarned, verifyAchievements, HERO_GATE,
} from '../src/ui/achievements.js';
import { getChosenHero, setChosenHero } from '../src/ui/roster.js';
import {
  DEFAULT_ORDER, SHOP_ITEMS, getShopOrder, nextPurchase, setShopOrder,
} from '../src/ui/shop.js';
import { believedWalkable, dijkstra, key } from '../src/bot/nav.js';
import { playOne } from '../src/analysis/check.js';
import { balanceOf, playChain, seedOf, spend } from '../src/analysis/chain.js';

// ***** tiny test harness ***** //

const results = [];

function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error.message });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'assertion failed');
}

function assertEq(actual, expected, message) {
  if (actual !== expected) {
    throw new Error((message || 'not equal') + ` — got ${actual}, want ${expected}`);
  }
}

// ***** fixtures ***** //

// '.' room  '#' wall  '+' door  '-' corridor  ' ' void
function tinyMap(rows) {
  const h = rows.length;
  const w = rows[0].length;
  const legend = { '.': 'room', '#': 'wall', '+': 'door', '-': 'corridor', ' ': null };
  const tiles = new Array(w * h).fill(null);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) tiles[y * w + x] = legend[rows[y][x]];
  }
  return { w, h, tiles, rooms: [] };
}

// A hand-built state, so rules can be tested without generating a dungeon.
function makeState(options) {
  return {
    seed: 1,
    turn: 0,
    outcome: null,
    killedBy: null,
    nextId: 100,
    rng: { map: 1, spawn: 2, combat: options.combatSeed ?? 3 },
    log: [],
    map: options.map,
    player: {
      pos: options.playerPos,
      hp: options.hp ?? PLAYER_HP,
      hpMax: options.hpMax ?? PLAYER_HP,
      xp: options.xp ?? 3,
      inventory: options.inventory ?? [],
      kills: [],
      xpEarned: options.xpEarned ?? 0,
      armour: options.armour ?? 0,
    },
    monsters: options.monsters ?? [],
    items: options.items ?? [],
    chests: options.chests ?? [],
    shrine: options.shrine ?? { id: 's', emoji: '⛩️', pos: [-9, -9] },
  };
}

// activation 0 means the path length is always >= it, so this one never acts.
// A punchbag for testing the player's side of combat in isolation.
function dummy(name, pos, overrides = {}) {
  const template = MONSTER_TABLE.find((m) => m.name === name);
  return {
    id: 'm-' + name + '-' + pos.join('_'),
    name: template.name,
    emoji: template.emoji,
    pos,
    hp: template.hp,
    hpMax: template.hp,
    xp: template.xp,
    activation: 0,
    dead: false,
    drop: null,
    ...overrides,
  };
}

function item(name, pos, extra = {}) {
  return { id: 'i-' + name + '-' + pos.join('_'), name, emoji: '?', pos, dmg: 0, armour: 0, heal: 0, ...extra };
}

// A policy that is deterministic but not smart — enough to shake the engine.
//
// It carries its own RNG rather than deriving the action from the observation:
// a pure function of the state livelocks, because bumping a wall changes
// nothing, so the same inputs return the same wall-bump forever.
function makeWanderPolicy(seed) {
  const rng = makeRng(seed);
  return () => ACTIONS[Math.floor(rng() * ACTIONS.length)];
}

const ROOM_5x5 = tinyMap([
  '#####',
  '#...#',
  '#...#',
  '#...#',
  '#####',
]);

// ***** determinism ***** //

test('same seed produces an identical starting state', () => {
  const a = newGame(1234);
  const b = newGame(1234);
  assertEq(JSON.stringify(a.map), JSON.stringify(b.map), 'maps differ');
  assertEq(JSON.stringify(a.player), JSON.stringify(b.player), 'players differ');
  assertEq(JSON.stringify(a.monsters), JSON.stringify(b.monsters), 'monsters differ');
  assertEq(JSON.stringify(a.chests), JSON.stringify(b.chests), 'chests differ');
});

test('different seeds produce different maps', () => {
  const a = newGame(1);
  const b = newGame(2);
  assert(JSON.stringify(a.map) !== JSON.stringify(b.map), 'maps are identical');
});

test('a whole run is reproducible from its seed', () => {
  const a = playGame(777, makeWanderPolicy(777), { maxTurns: 400 });
  const b = playGame(777, makeWanderPolicy(777), { maxTurns: 400 });
  assertEq(a.outcome, b.outcome, 'outcome');
  assertEq(a.turns, b.turns, 'turn count');
  assertEq(a.replay.actions.join(), b.replay.actions.join(), 'action list');
  // Guards against a livelocked policy: a run that neither ended nor ran out
  // of turns has been bumping into a wall, which costs no turn at all.
  assert(a.outcome !== null || a.turns >= 400,
    `the run went nowhere — ${a.turns} turns over ${a.replay.actions.length} decisions`);
});

test('a replay reproduces the recorded run exactly', () => {
  const run = playGame(31337, makeWanderPolicy(31337), { maxTurns: 300 });
  const frames = replayGame(run.replay);
  const last = frames[frames.length - 1].state;
  assertEq(last.turn, run.state.turn, 'turn');
  assertEq(last.outcome, run.state.outcome, 'outcome');
  assertEq(last.player.hp, run.state.player.hp, 'hp');
  assertEq(JSON.stringify(last.player.pos), JSON.stringify(run.state.player.pos), 'position');
});

test('a replay of a non-default floor rebuilds the same floor', () => {
  // The replay regenerates the map from the seed, so it has to remember how
  // the floor was generated. Without that it silently played back a
  // different dungeon whenever generation was off its defaults.
  const counts = { monsters: 11, chests: 4 };
  const run = playGame(4321, makeWanderPolicy(4321), { maxTurns: 120, counts });
  const frames = replayGame(run.replay);
  const last = frames[frames.length - 1].state;

  assertEq(last.monsters.length, 11, 'monster count');
  assertEq(JSON.stringify(last.player.pos), JSON.stringify(run.state.player.pos), 'position');
  assertEq(last.player.hp, run.state.player.hp, 'hp');
});

// ***** U6d — the engine accepts a starting loadout ***** //

test('a hero started with startingItems carries it from turn 1', () => {
  // M38 gave every run a starting kit, so this now asserts the granted item
  // arrives ON TOP of it rather than being the whole inventory — the count
  // and the damage are both kit-relative for that reason.
  const axe = ITEM_TABLE.find((i) => i.name === 'axe');
  const state = newGame(4242, { startingItems: [axe] });
  const kitDamage = STARTING_ITEMS.reduce((sum, i) => sum + (i.dmg || 0), 0);

  assertEq(state.turn, 0, 'this should be the very start of the run');
  assertEq(state.player.inventory.length, STARTING_ITEMS.length + 1,
    'the granted item did not arrive alongside the starting kit');
  assert(state.player.inventory.some((i) => i.name === 'axe'), 'the wrong item arrived');
  assert(state.player.inventory.every((i) => i.id), 'a starting item has no id');

  // weaponDamage (combat.js) is genuinely live — resolveAttack calls it —
  // so this confirms real behaviour, not just that a pure function runs.
  assertEq(weaponDamage(state.player), kitDamage + axe.dmg,
    'weaponDamage did not read the kit and the granted item together');
});

test('a starting shield actually grants armour, not just inventory', () => {
  // Review found this: the first version of the block above set
  // `player.inventory` and stopped, so a starting shield was OWNED but
  // did nothing — `player.armour` is the bar `effectiveHp` reads, and
  // only `grantArmour` (step.js, the same rule the real pickup path
  // runs) ever credits it. Asserted against `player.armour` and
  // `effectiveHp` specifically, per the review — NOT `armourValue`,
  // which is what the original (passing, and wrong) version of this
  // item's coverage leaned on, and which has zero production callers.
  const shield = ITEM_TABLE.find((i) => i.name === 'shield');
  const state = newGame(4242, { startingItems: [shield] });
  const kitArmour = STARTING_ITEMS.reduce((sum, i) => sum + (i.armour || 0), 0);
  assertEq(state.player.armour, kitArmour + shield.armour,
    'the starting shield did not credit the armour bar');
  assertEq(effectiveHp(state.player), state.player.hp + kitArmour + shield.armour,
    'effectiveHp does not reflect the starting shield');
});

test('the starting-item armour grant is the same rule the real pickup path uses', () => {
  // Not just "both give the right number" — the SAME function, so a
  // future change to what an armour item means cannot update one path
  // and silently leave the other stale, which is exactly how this bug
  // happened the first time.
  const shield = ITEM_TABLE.find((i) => i.name === 'shield');
  const state = newGame(4242, { startingItems: [shield] });
  const player = { armour: 0 };
  grantArmour(player, shield);
  assertEq(state.player.armour, player.armour,
    'startingItems and grantArmour disagree on what a shield is worth');
});

test('an item GENERATED into the world is worth what the same item bought is', () => {
  // The bug this exists for: `makeItem` (spawn.js) rebuilds a table row
  // field by field, while the shop hands the ITEM_TABLE entry straight to
  // the wallet. `dmgMin` was added to the table and to combat.js but not
  // to that list, so a dropped axe raised the damage die's top and not its
  // floor — the same weapon hit differently depending on where it came
  // from, and nothing failed.
  //
  // It has to reach real GENERATED loot to mean anything: `startingItems`
  // and the shop both pass the template through untouched, so a test built
  // on either of those passes with the bug still in (it did — that version
  // was written, run green against the broken code, and thrown away).
  // Creature and chest drops are the only things `makeItem` builds.
  const combatFieldsOf = (item) => JSON.stringify({
    dmg: item.dmg || 0, dmgMin: item.dmgMin || 0,
    armour: item.armour || 0, heal: item.heal || 0,
  });
  const templateOf = (item) => ITEM_TABLE.find((t) => t.name === item.name);

  // Deep floors so the axe clears WEAPON_AXE_MIN_TIER and can appear at all.
  const generated = [];
  for (let seed = 1; seed <= 40; seed++) {
    const state = newGame(seed, { difficultyScale: 1, dropChance: 1, monsters: 12 });
    for (const monster of state.monsters) if (monster.drop) generated.push(monster.drop);
    for (const chest of state.chests) if (chest.drop) generated.push(chest.drop);
  }

  for (const item of generated) {
    const template = templateOf(item);
    if (!template) continue;
    assertEq(combatFieldsOf(item), combatFieldsOf(template),
      `a ${item.name} generated into the world is not the ${item.name} the shop sells`);
  }

  // Guard against the assertion loop silently having nothing to check —
  // and specifically against the axe, the only row with a dmgMin today.
  const axes = generated.filter((i) => i.name === 'axe');
  assert(axes.length > 0, 'no axe was generated in 40 floors — the check above proved nothing');
  assertEq(weaponMinDamage({ inventory: [axes[0]] }), 1,
    'an axe dropped by a creature does not raise the damage floor');
  assertEq(weaponDamage({ inventory: [axes[0]] }), 2,
    'a dropped axe stopped widening the top of the die');
});

test('startingItems does not multiply if the hero already carries something', () => {
  // Only meaningful together with `carry` in the unusual case both are
  // set on the same call — `carry`, being the more current truth of the
  // two, wins. Not a real descent shape (carry only exists floor 2+,
  // startingItems only matters floor 1), but nothing here assumes the
  // combination cannot happen, so it is checked directly.
  const dagger = ITEM_TABLE.find((i) => i.name === 'dagger');
  const axe = ITEM_TABLE.find((i) => i.name === 'axe');
  const carry = {
    hp: 8, hpMax: 10, armour: 0, xp: 3,
    inventory: [{ id: 'x', name: 'axe', dmg: axe.dmg }], kills: [], xpEarned: 0,
  };
  const state = newGame(4242, { startingItems: [dagger], carry });
  assertEq(state.player.inventory.length, 1, 'items from both sources ended up in the inventory');
  assertEq(state.player.inventory[0].name, 'axe', 'carry should have won over startingItems');
});

// ***** M38's starting kit, emptied by M41 ***** //
//
// Three of the four tests below are written against `STARTING_ITEMS` rather
// than against a dagger, so they follow the dial instead of pinning a value.
// With the kit EMPTY they still pass but two of them prove less than they
// did — flagged in place rather than deleted, because they come back to full
// strength the moment the kit is repopulated, and deleting live coverage
// because today's value makes it quiet is how a guard goes missing.

test('a run with no options at all starts empty-handed', () => {
  // M41, owner decision: the opening should be hard, and the starting weapon
  // was the largest single thing making it easy. M38's own comment wrote this
  // case in — "empty is a legal value here and turns the feature off" — so
  // this is the value that item designed for, not a revert of it.
  //
  // M38's FINDING is untouched and still unowned: since M26 a weapon only
  // drops from a creature, so an unarmed hero has to win a fight to get the
  // thing that wins fights. This test asserts the shipped difficulty
  // decision, not that the bootstrap stopped existing.
  const state = newGame(4242);
  assertEq(state.player.inventory.length, 0, 'a fresh run started holding something');
  assertEq(weaponDamage(state.player), 0, 'the hero started the run armed');
});

test('the shop adds to the starting kit instead of replacing it', () => {
  // The interaction that decided where the default lives. `startingItems` is
  // what a run brings ON TOP of the kit — if it replaced the kit, buying a
  // shield would cost the hero their dagger and make buying strictly worse
  // than not buying.
  //
  // WEAKENED BY M41, deliberately not rewritten. With the kit empty there is
  // nothing left for a purchase to displace, so "adds rather than replaces"
  // is no longer observable from the shipped value — only "the purchase
  // arrives, credited, on top of whatever the kit holds" is. Written against
  // `STARTING_ITEMS.length` so it tightens again by itself if the kit ever
  // refills.
  const shield = ITEM_TABLE.find((i) => i.name === 'shield');
  const bought = newGame(4242, { startingItems: [shield] });

  assertEq(bought.player.inventory.length, STARTING_ITEMS.length + 1,
    'buying an item changed how much the hero starts with, rather than adding to it');
  assertEq(bought.player.armour, shield.armour,
    'the bought shield did not credit the armour bar on top of the kit');
});

test('an empty startingItems does not disarm the hero', () => {
  // `src/ui/spectator.js` passes `getHeldItems()`, which is `[]` when nothing
  // was bought — truthy, so any default resolved with `??` would be defeated
  // in exactly the path a person watches. Asserted here because that failure
  // would be invisible to every headless measurement.
  //
  // QUIET UNDER M41: with the kit empty both sides of this read zero, so it
  // cannot currently fail. Kept because the `??`-versus-concat distinction it
  // guards is still in `game.js` and still load-bearing the day a kit exists.
  const empty = newGame(4242, { startingItems: [] });
  assertEq(empty.player.inventory.length, STARTING_ITEMS.length,
    'an empty purchase list wiped the starting kit');
});

test('the kit is granted once per run, not once per floor', () => {
  // No guard does this — `carry` overwrites the inventory outright, and
  // every floor past the first has one. Asserted through a carry that is
  // POORER than the kit, so a second grant would show up as the hero
  // arriving on floor 2 better armed than they left floor 1.
  //
  // QUIET UNDER M41 for the same reason as above: an empty kit cannot be
  // granted twice. The ordering it protects is unchanged in `game.js`.
  const carry = {
    hp: 8, hpMax: 10, armour: 0, xp: 3, inventory: [], kills: [], xpEarned: 0,
  };
  const floor2 = newGame(4242, { carry });
  assertEq(floor2.player.inventory.length, 0,
    'the starting kit was granted again on a floor that carried nothing down');
  assertEq(weaponDamage(floor2.player), 0, 'a hero who lost their weapon got it back for free');
});

// ***** the run: down and back up, victory on returning to floor 1 ***** //

test('the pairing rule sends ascent traversal k to floor 2 x floors - k', () => {
  // The one rule the whole return rests on, asserted against the design's
  // own table (docs/map-design.md, "The run laid out") rather than against
  // the implementation restated. The hero climbs OUT of the bottom — the
  // deepest floor is crossed once, every other floor twice.
  assertEq(TRAVERSALS, LEVELS * 2 - 1, 'a run is not down-and-back-up over ten floors');
  assertEq(floorOfTraversal(1), 1, 'traversal 1 is not floor 1');
  assertEq(floorOfTraversal(10), 10, 'traversal 10 is not the bottom');
  assertEq(floorOfTraversal(11), 9, 'the traversal after the bottom is not floor 9');
  assertEq(floorOfTraversal(12), 8, 'traversal 12 is not floor 8');
  assertEq(floorOfTraversal(19), 1, 'traversal 19 is not the second crossing of floor 1');

  // Every floor exactly twice except the bottom, exactly once; none missed.
  const seen = new Map();
  for (let k = 1; k <= TRAVERSALS; k++) {
    const floor = floorOfTraversal(k);
    seen.set(floor, (seen.get(floor) || 0) + 1);
  }
  assertEq(seen.size, LEVELS, 'the run does not visit every floor');
  assertEq(seen.get(LEVELS), 1, 'the bottom is not crossed exactly once');
  assert([...seen.entries()].every(([f, n]) => f === LEVELS || n === 2),
    'some floor above the bottom is not crossed exactly twice');
});

test('an ascent traversal starts at the descent shrine and exits at its start', () => {
  // The doors swap: the hero comes back up through the hole it went down.
  // A post-generation swap, so map and roster stay byte-identical.
  const floor = 3;
  const down = newGame(hashSeeds(4242, floor), floorPlan(floor));
  const up = newGame(hashSeeds(4242, floor), { ...floorPlan(floor), ascending: true });

  assertEq(up.player.pos.join(','), down.shrine.pos.join(','),
    'the ascent hero did not emerge where the descent shrine stood');
  assertEq(up.shrine.pos.join(','), down.player.pos.join(','),
    'the ascent shrine is not where the descent hero entered');
  assertEq(up.map.tiles.join(''), down.map.tiles.join(''), 'the swap changed the map');
  assertEq(JSON.stringify(up.monsters.map((m) => [m.name, m.pos])),
    JSON.stringify(down.monsters.map((m) => [m.name, m.pos])),
    'the swap changed the roster');
});

test('an ascent traversal reproduces its twin map, tile for tile', () => {
  // Free, and that is the point: a floor is generated from
  // `hashSeeds(seed, level)` and `floorPlan(level)`, neither of which reads
  // the hero — so asking for the same floor number again rebuilds the same
  // map with no cache and no second seed. R2 is what will pull the creature
  // seed away from the map seed; R1 only had to avoid making that harder.
  //
  // Asserted at GENERATION rather than through a played run: the requirement
  // is about the map the pairing rule asks for, and a run only reaches its
  // late traversals when the bot survives that far.
  const build = (traversal) => {
    const floor = floorOfTraversal(traversal);
    return newGame(hashSeeds(4242, floor), floorPlan(floor));
  };

  for (const k of [11, 12, 15, 19]) {
    const up = build(k);
    const down = build(floorOfTraversal(k));
    assertEq(up.map.tiles.join(''), down.map.tiles.join(''),
      `traversal ${k} was a different map from its twin`);
    // The roster comes back too, which is what makes R2 a change rather than
    // a fix: today the return is the same creatures, deliberately.
    assertEq(JSON.stringify(up.monsters.map((m) => [m.name, m.pos])),
      JSON.stringify(down.monsters.map((m) => [m.name, m.pos])),
      `traversal ${k} drew a different roster from its twin`);
  }
});

test('difficulty is indexed by floor, not by traversal', () => {
  // Traversal 12 gets floor 9's roster size on the way up, exactly as it had
  // on the way down. A run that indexed by traversal would make the return
  // harder than the descent by accident, which is R4's job to do on purpose.
  for (let k = LEVELS + 1; k <= TRAVERSALS; k++) {
    const floor = floorOfTraversal(k);
    assertEq(floorPlan(floor).monsters, floorPlan(floorOfTraversal(k)).monsters,
      `traversal ${k} did not read floor ${floor}'s plan`);
  }
  assertEq(floorPlan(floorOfTraversal(12)).monsters, floorPlan(9).monsters,
    'traversal 12 does not use floor 9\'s roster size');
  assert(floorPlan(floorOfTraversal(11)).monsters > floorPlan(floorOfTraversal(19)).monsters,
    'the return does not keep each floor\'s own mass — it should fall as the hero climbs');
});

// ***** M42 — time has a price, stage 1 ***** //

test('a traversal is capped by TURN_BUDGET, not by a number written in the loop', () => {
  // Stage 1 adds no mechanism: the cap always existed, hardcoded in
  // `playDungeon`. What changed is that it has a name and a row in
  // balance.md, so tightening it is a value change rather than an edit to a
  // logic file.
  const run = playDungeon(4242, () => (() => 'rest'), { levels: 1 });

  assertEq(run.levels[0].turns, TURN_BUDGET, 'the traversal did not stop at the shipped budget');
  assertEq(run.levels[0].outcome, 'timeout', 'running out of turns did not read as a timeout');
});

test('running out of turns ends the traversal without completing, and so ends the run', () => {
  // rules.md §8. This is the shape stage 2 exists to make legible — today it
  // is a threshold with no warning — and it is asserted here so that stage 2
  // has something to change rather than something to discover.
  const run = playDungeon(4242, () => (() => 'rest'), { maxTurns: 12 });

  assertEq(run.cleared, false, 'a run that ran out of turns read as a clear');
  assertEq(run.depth, 1, 'the run continued past the traversal that ran out');
  assertEq(run.levels.length, 1, 'a later traversal was played after the budget ran out');
  assertEq(run.levels[0].turns, 12, 'the traversal did not stop at the budget it was given');
  assertEq(run.killedBy, null, 'running out of turns was recorded as a death');
});

test('the budget is per traversal, not per run', () => {
  // Scope decided in the item: "a side room costs a countable number at the
  // moment you decide" is a per-traversal sentence. A run-wide budget is a
  // different feature, and this pins which one shipped — every traversal
  // gets its own full allowance.
  const run = playDungeon(4242, () => {
    const bot = makeBot();
    return (belief, observation) => bot(belief, observation);
  }, { maxTurns: 600, levels: 2 });

  const spent = run.levels.reduce((sum, l) => sum + l.turns, 0);
  assert(run.levels.length > 1, 'fixture is wrong: the run did not reach a second traversal');
  assert(run.levels.every((l) => l.turns <= 600), 'a traversal spent more than the budget');
  assert(spent > 600 || run.levels.every((l) => l.outcome !== 'timeout'),
    'the allowance looks shared across traversals rather than granted per traversal');
});

test('reaching the bottom clears nothing; completing the last traversal wins', () => {
  // Victory is the LAST traversal. Run on a two-floor dungeon so the bot
  // can actually finish inside a unit test: floors 2, traversals 3 (floor 1
  // down, floor 2 — the turn — and floor 1 up), the same pairing rule.
  const drive = (options) => playDungeon(4201, () => {
    const bot = makeBot();
    return (belief, observation) => bot(belief, observation);
  }, { maxTurns: 600, levels: 2, ...options });

  const whole = drive();
  assertEq(whole.levels.length, 3, 'a two-floor run is not three traversals');
  assert(whole.cleared, 'completing every traversal did not read as a clear');
  assertEq(whole.depth, 3, 'depth does not count traversals survived');
  assertEq(whole.levels[1].direction, 'down', 'the turn is not reached going down');
  assertEq(whole.levels[2].direction, 'up', 'the last traversal is not an ascent');
  assertEq(whole.levels[2].level, 1, 'the last traversal is not the second crossing of floor 1');
  assertEq(whole.levels[2].replay.counts.ascending, true,
    'the ascent traversal was not built with the doors swapped');
  assert(!whole.levels[0].replay.counts.ascending && !whole.levels[1].replay.counts.ascending,
    'a descent traversal was built with the doors swapped');

  // The same seed stopped at the bottom is NOT a clear of the real run — it
  // is the halfway point, and only a caller that pinned itself to a descent
  // sees it as complete.
  const halfway = drive({ traversals: 2 });
  assertEq(halfway.levels.length, 2, 'the pinned descent did not stop at the bottom');
  assert(halfway.levels.every((l) => l.direction === 'down'),
    'the pinned descent climbed');
});

test('a run is deterministic across every traversal', () => {
  const drive = () => playDungeon(777, () => {
    const bot = makeBot();
    return (belief, observation) => bot(belief, observation);
  }, { maxTurns: 400, levels: 3 });

  const a = drive();
  const b = drive();
  assertEq(a.depth, b.depth, 'the same seed reached a different traversal');
  assertEq(a.cleared, b.cleared, 'the same seed cleared differently');
  assertEq(JSON.stringify(a.levels.map((l) => [l.traversal, l.level, l.direction, l.turns, l.damage])),
    JSON.stringify(b.levels.map((l) => [l.traversal, l.level, l.direction, l.turns, l.damage])),
    'the same seed produced a different run');
});

// ***** E1 — the one turn loop ***** //

test('a hook that returns nothing leaves the run exactly as it was', () => {
  // The property the whole refactor rests on: `playGame` is now built on
  // this, and four analysis call sites are too. If merely ATTACHING a hook
  // changed anything, every number those instruments produce would have
  // shifted the day this landed.
  const policy = () => 'right';
  const bare = driveTurns(newGame(9182, { chests: 0 }), policy, { maxTurns: 40 });

  let seen = 0;
  const hooked = driveTurns(newGame(9182, { chests: 0 }), policy, {
    maxTurns: 40,
    onTurn: () => { seen++; },
  });

  assert(seen > 0, 'fixture is wrong: the hook never fired, so nothing was compared');
  assertEq(hooked.decisions, bare.decisions, 'the hook changed how many turns were played');
  assertEq(hooked.state.turn, bare.state.turn, 'the hook changed the turn count');
  assertEq(JSON.stringify(hooked.state.rng), JSON.stringify(bare.state.rng),
    'attaching a hook consumed randomness');
  assertEq(JSON.stringify({ ...hooked.state, map: null }), JSON.stringify({ ...bare.state, map: null }),
    'attaching a hook changed the run');
});

test('a hook that returns a state replaces the one just produced', () => {
  // This is the channel the observed ruler's death suppression uses, and it
  // is a general return value rather than a flag for that one caller: it
  // sets `outcome` back to null so the probe keeps walking.
  const build = () => makeState({
    map: ROOM_5x5, playerPos: [2, 2], hp: 1, xp: 1,
    monsters: [dummy('t-rex', [3, 2], { activation: 9 })],
  });
  const pace = () => { let n = 0; return () => (n++ % 2 === 0 ? 'left' : 'right'); };

  const bare = driveTurns(build(), pace(), { maxTurns: 30 });
  assertEq(bare.state.outcome, 'died', 'fixture is wrong: the hero survived, so nothing was suppressed');

  let suppressed = 0;
  const hooked = driveTurns(build(), pace(), {
    maxTurns: 30,
    onTurn: ({ state: next }) => {
      if (next.outcome !== 'died') return undefined;
      suppressed++;
      return { ...next, outcome: null, killedBy: null };
    },
  });

  assert(suppressed > 0, 'the death was never seen by the hook');
  assertEq(hooked.state.outcome, null, 'the run stopped despite the death being suppressed');
  assert(hooked.state.turn > bare.state.turn,
    'a suppressed run did not outlive the one that was allowed to die');
});

test('the hook sees the state as it was BEFORE the step', () => {
  // Callers slice the turn's own log entries off the end with it, and read
  // pre-step hp so a heal is measured against the ceiling the engine used.
  // Getting `before` wrong would corrupt those silently rather than loudly.
  const state = makeState({ map: ROOM_5x5, playerPos: [2, 2] });
  const pairs = [];
  let n = 0;
  const pace = () => (n++ % 2 === 0 ? 'left' : 'right'); // every step passes a turn

  driveTurns(state, pace, {
    maxTurns: 3,
    onTurn: ({ state: after, before, action }) => {
      pairs.push({ from: posKey(before.player.pos), to: posKey(after.player.pos), action });
    },
  });

  assertEq(pairs.length, 3, 'the hook did not fire once per turn');
  assertEq(pairs[0].from, '2,2', 'the first hook call did not see the starting position');
  assertEq(pairs[0].to, '1,2', 'the hook did not see the position after the step');
  assertEq(pairs[1].from, '1,2', "the second turn's `before` was not the first turn's result");
  assertEq(pairs[1].to, '2,2', 'the second step did not move the hero back');
  assertEq(pairs[0].action, 'left', 'the hook did not receive the action that was played');
});

test('maxDecisions stops a policy that only ever bumps walls', () => {
  // Wall bumps do not pass a turn, so `maxTurns` alone would never fire and
  // the loop would spin forever. Kept as its own guard through the refactor.
  const state = makeState({ map: ROOM_5x5, playerPos: [1, 1] });
  const driven = driveTurns(state, () => 'up', { maxTurns: 10, maxDecisions: 7 });

  assertEq(driven.state.turn, 0, 'bumping a wall passed a turn');
  assertEq(driven.decisions, 7, 'maxDecisions did not stop the loop');
});

test('step does not mutate the state it was given', () => {
  const state = newGame(55);
  const before = JSON.stringify({ ...state, map: null });
  const mapBefore = JSON.stringify(state.map);
  step(state, 'rest');
  step(state, 'up');
  assertEq(JSON.stringify({ ...state, map: null }), before, 'state changed');
  assertEq(JSON.stringify(state.map), mapBefore, 'map changed');
});

test('the simulation flag never leaks into a real game', () => {
  // `sim` makes the engine stop rolling dice — averages instead of hits,
  // monsters that never skip. It exists only for the bot's lookahead, and
  // a real run that switched it on would be silently deterministic.
  const fresh = newGame(7);
  assert(!fresh.sim, 'newGame produced a sim state');
  assert(!step(fresh, 'rest').state.sim, 'step turned the flag on');

  const run = playGame(7, makeWanderPolicy(7), { maxTurns: 150 });
  assert(!run.state.sim, 'a played run ended with the flag set');
});

test('the simulation flag makes combat deterministic', () => {
  // Same state stepped twice must give the same hp once dice are off.
  const map = tinyMap(['#####', '#...#', '#####']);
  const base = makeState({
    map, playerPos: [2, 1], monsters: [dummy('ghost', [1, 1], { activation: 99 })],
  });
  const rolled = [step(base, 'rest').state.player.hp, step({ ...base, rng: { ...base.rng, combat: 999 } }, 'rest').state.player.hp];

  const simmed = { ...base, sim: true };
  const a = step(simmed, 'rest').state.player.hp;
  const b = step({ ...simmed, rng: { ...simmed.rng, combat: 999 } }, 'rest').state.player.hp;
  assertEq(a, b, 'sim combat still depended on the dice');
  assert(a < PLAYER_HP, 'sim combat dealt no damage at all');
  assert(rolled.length === 2, 'sanity');
});

// ***** combat, spec §5 ***** //

test('xp 1 can never deal damage', () => {
  // xp 1 rolls only 0, and monsters have no weapons — so damage is always
  // 0. No MONSTER_TABLE row is xp 1 any more (M18 raised the rat to xp 2,
  // so it could actually land a blow), so this forces it via override to
  // keep testing the FORMULA rather than a specific monster.
  const map = tinyMap(['#####', '#...#', '#####']);
  let state = makeState({
    map, playerPos: [2, 1],
    monsters: [dummy('rat', [1, 1], { xp: 1, activation: 99 })],
  });
  for (let i = 0; i < 200; i++) state = step(state, 'rest').state;
  assertEq(state.player.hp, PLAYER_HP, 'a monster with xp 1 dealt damage');
});

test('armour soaks the blow whole, and is spent doing it', () => {
  // Armour is a second bar, not damage reduction (spec §13.2). The blow is
  // the same size either way; it just lands somewhere else first.
  const map = tinyMap(['#####', '#...#', '#####']);
  const build = (armour) => makeState({
    map, playerPos: [2, 1], combatSeed: 4242, armour,
    monsters: [dummy('ghost', [1, 1], { activation: 99 })],
  });

  const bare = step(build(0), 'rest').state;
  const shielded = step(build(9), 'rest').state;

  const blow = PLAYER_HP - bare.player.hp;
  assertEq(shielded.player.hp, PLAYER_HP, 'hp took damage through armour');
  assertEq(shielded.player.armour, 9 - blow, 'armour was not spent by the blow');
});

test('armour runs out and the overflow reaches hp', () => {
  const map = tinyMap(['#####', '#...#', '#####']);
  let state = makeState({
    map, playerPos: [2, 1], armour: 2,
    monsters: [dummy('t-rex', [1, 1], { activation: 99 })],
  });
  for (let i = 0; i < 40 && state.player.armour > 0; i++) {
    state = step(state, 'rest').state;
  }
  assertEq(state.player.armour, 0, 'armour never emptied');
  assert(state.player.hp < PLAYER_HP, 'hp was never touched after armour ran out');
});

test('picking up a shield refills armour and leaves max hp alone', () => {
  const state = makeState({
    map: ROOM_5x5, playerPos: [2, 2], hp: 4,
    items: [item('shield', [1, 2], { armour: 3 })],
  });
  const after = step(state, 'left').state;
  assertEq(after.player.armour, 3, 'armour');
  assertEq(after.player.hpMax, PLAYER_HP, 'max hp moved');
  assertEq(after.player.hp, 4, 'current hp changed');
});

test('there is no counter-attack', () => {
  // The dummy never takes a turn, so attacking it must cost nothing.
  let state = makeState({
    map: ROOM_5x5, playerPos: [2, 2],
    monsters: [dummy('dragon', [1, 2])],
  });
  for (let i = 0; i < 50; i++) state = step(state, 'left').state;
  assertEq(state.player.hp, PLAYER_HP, 'player was hurt while attacking');
});

test('monsters get no weapon bonus from what they carry', () => {
  const monster = dummy('rat', [1, 1], { drop: item('axe', [1, 1], { dmg: 2 }) });
  assertEq(weaponDamage(monster), 0, 'a carried item added damage');
  assertEq(armourValue(monster), 0, 'a carried item added armour');
});

test('killing never raises xp', () => {
  // Owner decision: the hero's power comes from gear and potions only, so
  // the damage die never grows. The faithful rule (+1 xp every second
  // kill) was removed outright — decisions.md has what it measured.
  let state = makeState({
    map: ROOM_5x5, playerPos: [2, 2],
    monsters: [dummy('rat', [1, 2]), dummy('rat', [3, 2])],
  });
  const startXp = state.player.xp;

  for (let i = 0; i < 60 && !state.monsters[0].dead; i++) state = step(state, 'left').state;
  for (let i = 0; i < 60 && !state.monsters[1].dead; i++) state = step(state, 'right').state;

  assert(state.monsters[0].dead && state.monsters[1].dead, 'the rats did not die');
  assertEq(state.player.xp, startXp, 'xp grew despite the default being off');
});

test('killing never raises hp or hpMax', () => {
  // The kill-funded heal (M6) was removed with its flag; decisions.md has
  // the sweep that reversed it.
  let state = makeState({
    map: ROOM_5x5, playerPos: [2, 2],
    monsters: [dummy('rat', [1, 2]), dummy('rat', [3, 2])],
  });
  const startHp = state.player.hp;
  const startMax = state.player.hpMax;

  for (let i = 0; i < 60 && !state.monsters[0].dead; i++) state = step(state, 'left').state;
  for (let i = 0; i < 60 && !state.monsters[1].dead; i++) state = step(state, 'right').state;

  assert(state.monsters[0].dead && state.monsters[1].dead, 'the rats did not die');
  assertEq(state.player.hpMax, startMax, 'hpMax grew from kills');
  assertEq(state.player.hp, startHp, 'hp grew from kills');
});

test('a dead monster drops what it carried', () => {
  let state = makeState({
    map: ROOM_5x5, playerPos: [2, 2],
    monsters: [dummy('rat', [1, 2], { drop: item('axe', [1, 2], { dmg: 2 }) })],
  });
  for (let i = 0; i < 60 && !state.monsters[0].dead; i++) state = step(state, 'left').state;
  assertEq(state.items.length, 1, 'nothing was dropped');
  assertEq(state.items[0].name, 'axe', 'wrong item dropped');
});

test('xpEarned accumulates the live xp of every kill, not a name lookup', () => {
  // U3, docs/backlog.md. Separate field from `kills` on purpose — recorded
  // at the moment of the kill against the monster's OWN xp, so a creature
  // M3 reskinned after being placed is still counted correctly even though
  // `kills` only ever stored its name.
  let state = makeState({
    map: ROOM_5x5, playerPos: [2, 2],
    monsters: [dummy('rat', [1, 2]), dummy('ghost', [3, 2])],
  });
  assertEq(state.player.xpEarned, 0, 'xpEarned did not start at 0');

  for (let i = 0; i < 60 && !state.monsters[0].dead; i++) state = step(state, 'left').state;
  assertEq(state.player.xpEarned, state.monsters[0].xp, 'first kill did not record its xp');

  for (let i = 0; i < 60 && !state.monsters[1].dead; i++) state = step(state, 'right').state;
  assertEq(state.player.xpEarned, state.monsters[0].xp + state.monsters[1].xp,
    'second kill did not add to the running total');
  assertEq(state.player.kills.length, 2, 'kills changed shape — should still be a plain count');
});

// ***** the turn loop, spec §6 ***** //

test('walking into a wall does not pass the turn', () => {
  const state = makeState({
    map: ROOM_5x5, playerPos: [1, 1],
    monsters: [dummy('wolf', [3, 3], { activation: 99 })],
  });
  const after = step(state, 'left').state;      // [0,1] is wall
  assertEq(after.turn, 0, 'the turn passed');
  assertEq(posKey(after.monsters[0].pos), posKey(state.monsters[0].pos), 'monster moved');
});

test('resting passes the turn', () => {
  const state = makeState({ map: ROOM_5x5, playerPos: [2, 2] });
  assertEq(step(state, 'rest').state.turn, 1);
});

test('attacking passes the turn but does not move the player', () => {
  const state = makeState({
    map: ROOM_5x5, playerPos: [2, 2], monsters: [dummy('ogre', [1, 2])],
  });
  const after = step(state, 'left').state;
  assertEq(after.turn, 1, 'the turn did not pass');
  assertEq(posKey(after.player.pos), '2,2', 'the player moved onto the monster');
});

test('opening a chest costs a turn and leaves the loot on the floor', () => {
  const chest = {
    id: 'c1', name: 'rock', emoji: '🪨', pos: [1, 2],
    drop: item('dagger', [1, 2], { dmg: 1 }),
  };
  const state = makeState({ map: ROOM_5x5, playerPos: [2, 2], chests: [chest] });

  const opened = step(state, 'left').state;
  assertEq(opened.turn, 1, 'the turn did not pass');
  assertEq(posKey(opened.player.pos), '2,2', 'the player moved onto the chest');
  assertEq(opened.chests.length, 0, 'the chest survived');
  assertEq(opened.items.length, 1, 'the loot was not dropped');
  assertEq(opened.player.inventory.length, 0, 'the loot was picked up too early');

  // A second turn to actually collect it — spec §6, chests cost 2 turns.
  const collected = step(opened, 'left').state;
  assertEq(posKey(collected.player.pos), '1,2', 'the player did not step on');
  assertEq(collected.player.inventory.length, 1, 'the loot was not collected');
});

test('picking up an item moves the player onto its tile', () => {
  const state = makeState({
    map: ROOM_5x5, playerPos: [2, 2], items: [item('axe', [1, 2], { dmg: 2 })],
  });
  const after = step(state, 'left').state;
  assertEq(posKey(after.player.pos), '1,2', 'the player did not move');
  assertEq(after.player.inventory.length, 1, 'the item was not taken');
  assertEq(after.items.length, 0, 'the item is still on the floor');
});

// ***** M35 — potions are carried and drunk on command ***** //

test('a potion walked over at full health is carried, not wasted', () => {
  // The rule this replaces: the engine drank it on contact and, at full hp,
  // refused to pick it up at all so it would not be thrown away. Both halves
  // are gone — a potion is an item like any other.
  const potion = item('health', [1, 2], { heal: 3 });
  const full = makeState({ map: ROOM_5x5, playerPos: [2, 2], items: [potion] });
  const after = step(full, 'left').state;

  assertEq(after.items.length, 0, 'the potion was left on the floor');
  assertEq(after.player.inventory.length, 1, 'the potion did not reach the inventory');
  assertEq(after.player.hp, PLAYER_HP, 'walking over a potion healed, which is now the drink action\'s job');
});

test('drinking heals, empties the inventory slot and passes the turn', () => {
  const potion = item('health', [2, 2], { heal: 3 });
  const state = makeState({ map: ROOM_5x5, playerPos: [2, 2], hp: 4, inventory: [potion] });
  const after = step(state, 'drink').state;

  assertEq(after.player.hp, 7, 'the potion healed the wrong amount');
  assertEq(after.player.inventory.length, 0, 'the potion was not spent');
  assertEq(after.turn, state.turn + 1, 'drinking did not pass the turn');
});

test('drinking is capped at hpMax and wastes the remainder', () => {
  // Decision 4 of the item: the engine permits, the bot decides. Drinking
  // with nothing missing is allowed and throws the potion away.
  const potion = item('health', [2, 2], { heal: 3 });
  const state = makeState({ map: ROOM_5x5, playerPos: [2, 2], inventory: [potion] });
  const after = step(state, 'drink').state;

  assertEq(after.player.hp, PLAYER_HP, 'hp went past the ceiling');
  assertEq(after.player.inventory.length, 0, 'a wasted drink kept the potion');
  const heals = after.log.filter((e) => e.type === 'heal');
  assertEq(heals.length, 1, 'the drink did not log');
  assertEq(heals[0].amount, 0, 'a wasted drink logged hp it did not restore');
});

test('the creatures act on the turn spent drinking', () => {
  // This is the whole feature. A free drink is no decision at all — the
  // cost is that standing still is exactly when a pursuer collects
  // (rules.md §4).
  //
  // Asserted against `rest`, the other action that passes a turn without
  // moving: same fixture, same seeds, so the world must land in the same
  // place. Comparing against a known turn-passer rather than against a
  // hardcoded tile keeps this honest if monster routing ever changes, and
  // it survives the skip roll, which both branches draw identically.
  const build = (inventory) => makeState({
    map: ROOM_5x5, playerPos: [2, 2], hp: 4, inventory,
    monsters: [dummy('rat', [3, 3], { activation: 9 })],
  });
  const potion = item('health', [2, 2], { heal: 3 });

  const drunk = step(build([potion]), 'drink').state;
  const rested = step(build([]), 'rest').state;

  assert(posKey(rested.monsters[0].pos) !== '3,3',
    'fixture is wrong: the creature did not move on a turn that plainly passes');
  assertEq(posKey(drunk.monsters[0].pos), posKey(rested.monsters[0].pos),
    'the creature did not get its turn while the hero drank');
});

test('drinking with no potion is a no-op that does not pass the turn', () => {
  // Same shape as walking into a wall (rules.md §6), so a policy asking for
  // a potion it does not hold cannot burn turns on it.
  const state = makeState({ map: ROOM_5x5, playerPos: [2, 2], hp: 4 });
  const after = step(state, 'drink').state;

  assertEq(after.turn, state.turn, 'an empty drink passed the turn');
  assertEq(after.player.hp, 4, 'an empty drink healed');
  assertEq(after.log.length, state.log.length, 'an empty drink logged');
});

test('a potion carried down the stairs is still there', () => {
  // rules.md §1's carry list already includes `inventory`; this asserts the
  // item did not need new code for it, rather than that it added any.
  const potion = item('health', [2, 2], { heal: 3 });
  const carried = newGame(4242, {
    carry: { hp: 5, hpMax: 10, armour: 0, xp: 3, inventory: [potion], kills: [], xpEarned: 0 },
  });

  assertEq(carried.player.inventory.filter((i) => i.heal > 0).length, 1,
    'the potion did not survive the descent');
});

test('reaching the shrine ends the run', () => {
  const state = makeState({
    map: ROOM_5x5, playerPos: [2, 2],
    shrine: { id: 's', emoji: '⛩️', pos: [1, 2] },
  });
  assertEq(step(state, 'left').state.outcome, 'ascended');
});

// ***** M40 — `blocked` governs everything downstream of it ***** //
//
// One defect with two faces: `resolveEncounters` computed "the hero does not
// enter this tile" and then ran the pickup loop and the shrine branch anyway.

test('attacking a creature standing on the shrine leaves the floor running', () => {
  // Reachable BY DESIGN, not by accident: rules.md §3 puts a guardian at the
  // shrine (M14). B16 measured three floors per seed family ending this way
  // and could not fix it from the bot side — no route enters the tile, and
  // the floor ended regardless.
  const state = makeState({
    map: ROOM_5x5, playerPos: [2, 2],
    monsters: [dummy('rat', [1, 2])],
    shrine: { id: 's', emoji: '⛩️', pos: [1, 2] },
  });
  const after = step(state, 'left').state;

  assertEq(after.outcome, null, 'swinging at the shrine guardian ended the floor');
  assertEq(posKey(after.player.pos), '2,2', 'the hero moved onto an occupied tile');
  assert(!after.log.some((e) => e.type === 'ascend'), 'an ascend was logged without the hero arriving');
  assert(after.log.some((e) => e.type === 'attack' && e.by === 'player'),
    'fixture is wrong: the hero never swung, so nothing was being tested');
});

test('attacking a creature standing on an item leaves the item on the floor', () => {
  // Creatures walk over items and never take them (rules.md §3), so a
  // creature parked on loot is ordinary play rather than a corner. The hero
  // was collecting it without ever entering the tile.
  const state = makeState({
    map: ROOM_5x5, playerPos: [2, 2],
    monsters: [dummy('rat', [1, 2])],
    items: [item('shield', [1, 2], { armour: 3 })],
  });
  const after = step(state, 'left').state;

  assertEq(after.items.length, 1, 'the item was taken through a live creature');
  assertEq(after.player.inventory.length, 0, 'the hero picked up loot it never reached');
  assertEq(after.player.armour, 0, 'the armour bar was credited for an item still on the floor');
  assertEq(posKey(after.player.pos), '2,2', 'the hero moved onto an occupied tile');
});

test('a corpse on an item still lets the hero walk in and take it', () => {
  // The guard is about LIVE blockers. `blocked` is never set for a corpse,
  // so this must keep working — otherwise the fix would have quietly made
  // every killed creature a permanent lid on whatever it died standing on.
  const dead = dummy('rat', [1, 2]);
  dead.dead = true;
  const state = makeState({
    map: ROOM_5x5, playerPos: [2, 2],
    monsters: [dead],
    items: [item('shield', [1, 2], { armour: 3 })],
  });
  const after = step(state, 'left').state;

  assertEq(after.items.length, 0, 'the item was left under a corpse');
  assertEq(after.player.armour, 3, 'the armour bar was not credited');
  assertEq(posKey(after.player.pos), '1,2', 'the hero did not walk onto the corpse');
});

test('opening a chest still costs two turns, and the guard did not change that', () => {
  // The two-turn cost does NOT come from `blocked` — `itemsHere` is
  // snapshotted before the chest spills, so the drop was never in the pickup
  // loop's list. Asserted directly because M40's guard sits next to that
  // mechanism and a fix that started leaning on the wrong one would look
  // identical here until the snapshot was later "tidied away".
  const state = makeState({
    map: ROOM_5x5, playerPos: [2, 2],
    chests: [{
      id: 'c', name: 'chest', emoji: '📦', pos: [1, 2], side: false, edge: false,
      drop: item('shield', [1, 2], { armour: 3 }),
    }],
  });

  const opened = step(state, 'left').state;
  assertEq(opened.chests.length, 0, 'the chest did not open');
  assertEq(opened.items.length, 1, 'the drop was collected on the same turn as the opening');
  assertEq(opened.player.inventory.length, 0, 'the hero took the drop without a second turn');
  assertEq(posKey(opened.player.pos), '2,2', 'opening a chest moved the hero');

  const taken = step(opened, 'left').state;
  assertEq(taken.items.length, 0, 'the second turn did not collect the drop');
  assertEq(taken.player.armour, 3, 'the armour bar was not credited on the second turn');
});

// ***** healing, spec §13.1 ***** //

test('waiting never heals — there is no passive regeneration', () => {
  // Rogule healed +1 every 100 turns, which let a bot camp somewhere the
  // monsters cannot reach and refill before every fight. Removed outright.
  let state = makeState({ map: ROOM_5x5, playerPos: [2, 2], hp: 1 });
  for (let i = 0; i < 600; i++) state = step(state, 'rest').state;
  assertEq(state.player.hp, 1, 'resting restored hp');

  // Pacing back and forth must not do it either.
  let pacing = makeState({ map: ROOM_5x5, playerPos: [2, 2], hp: 1 });
  for (let i = 0; i < 600; i++) {
    pacing = step(pacing, i % 2 === 0 ? 'left' : 'right').state;
  }
  assertEq(pacing.player.hp, 1, 'walking in circles restored hp');
});

// ***** monster behaviour, spec §7 ***** //

test('a monster outside its activation radius never moves', () => {
  // The corridor is 12 long; a rat activates at 3, so it must sit still.
  const map = tinyMap(['##############', '#------------#', '##############']);
  let state = makeState({
    map, playerPos: [12, 1], monsters: [dummy('rat', [1, 1], { activation: 3 })],
  });
  for (let i = 0; i < 100; i++) state = step(state, 'rest').state;
  assertEq(posKey(state.monsters[0].pos), '1,1', 'the monster moved anyway');
});

test('a monster inside its activation radius closes in', () => {
  const map = tinyMap(['##############', '#------------#', '##############']);
  let state = makeState({
    map, playerPos: [12, 1], monsters: [dummy('wolf', [1, 1], { activation: 20 })],
  });
  for (let i = 0; i < 30; i++) state = step(state, 'rest').state;
  assert(state.monsters[0].pos[0] > 1, 'the monster never approached');
});

test('monsters never share a tile', () => {
  for (const seed of [3, 14, 15, 92, 65]) {
    const run = playGame(seed, makeWanderPolicy(seed), { maxTurns: 250 });
    const live = run.state.monsters.filter((m) => !m.dead);
    const taken = new Set(live.map((m) => posKey(m.pos)));
    assertEq(taken.size, live.length, `two monsters stacked on seed ${seed}`);
  }
});

// ***** generation, spec §2 ***** //

test('the shrine sits in a distant room', () => {
  // Our fix for spec quirk §9.1 — the original sorts by the path vector.
  // docs/backlog.md M23 — the shrine no longer has to be THE furthest room,
  // only within SHRINE_DISTANCE_SHARE of it.
  for (const seed of [11, 22, 33]) {
    const state = newGame(seed);
    const passable = playerPassable(state.map);
    const toShrine = findPath(state.player.pos, state.shrine.pos, passable).length;

    let furthest = 0;
    for (const room of state.map.rooms) {
      const path = findPath(state.player.pos, room.center, passable);
      if (path.length > furthest) furthest = path.length;
    }
    const threshold = furthest * SHRINE_DISTANCE_SHARE;
    assert(toShrine >= threshold,
      `shrine path ${toShrine} on seed ${seed} fell short of the distant tail (>= ${threshold.toFixed(1)})`);
  }
});

test('a generated level has the counts the balance file asks for', () => {
  const state = newGame(4242);
  assertEq(state.monsters.length, 5, 'monster count');
  assertEq(state.chests.length, 15, 'chest count');
  assert(state.player.pos, 'no player');
  assert(state.shrine.pos, 'no shrine');
});

test('nothing is generated on an unwalkable tile', () => {
  const state = newGame(987);
  const walkable = (pos) => ['room', 'corridor', 'door']
    .includes(state.map.tiles[pos[1] * state.map.w + pos[0]]);
  assert(walkable(state.player.pos), 'the player is in a wall');
  assert(walkable(state.shrine.pos), 'the shrine is in a wall');
  for (const m of state.monsters) assert(walkable(m.pos), `${m.name} is in a wall`);
  for (const c of state.chests) assert(walkable(c.pos), `${c.name} is in a wall`);
});

// ***** fog of war, spec §12 ***** //

test('observation hides what is beyond the visible radius', () => {
  const map = tinyMap(Array(3).fill('#'.repeat(30)).map((row, y) => (y === 1 ? '#' + '-'.repeat(28) + '#' : row)));
  const state = makeState({
    map, playerPos: [2, 1],
    monsters: [dummy('rat', [6, 1]), dummy('wolf', [20, 1])],
  });
  const obs = observe(state);
  const names = obs.monsters.map((m) => m.name);
  assert(names.includes('rat'), 'a monster 4 tiles away was hidden');
  assert(!names.includes('wolf'), 'a monster 18 tiles away was visible');
});

test('belief remembers terrain after it leaves sight', () => {
  const map = tinyMap(Array(3).fill('#'.repeat(30)).map((row, y) => (y === 1 ? '#' + '-'.repeat(28) + '#' : row)));
  let state = makeState({ map, playerPos: [2, 1] });
  let belief = foldBelief(emptyBelief(), observe(state));
  assert(belief.tiles.has('2,1'), 'the starting tile was not remembered');

  for (let i = 0; i < 20; i++) state = step(state, 'right').state;
  belief = foldBelief(belief, observe(state));

  assert(belief.tiles.has('2,1'), 'terrain was forgotten');
  assert(!observe(state).visible.has('2,1'), 'the tile is somehow still visible');
});

test('belief keeps a monster it can no longer see, and drops one that left', () => {
  const map = tinyMap(Array(3).fill('#'.repeat(30)).map((row, y) => (y === 1 ? '#' + '-'.repeat(28) + '#' : row)));
  const state = makeState({
    map, playerPos: [2, 1], monsters: [dummy('rat', [6, 1], { activation: 0 })],
  });

  let belief = foldBelief(emptyBelief(), observe(state));
  assertEq(belief.monsters.size, 1, 'the rat was not remembered');

  // Walk far enough that the rat falls out of sight — memory must hold.
  let walked = state;
  for (let i = 0; i < 20; i++) walked = step(walked, 'right').state;
  belief = foldBelief(belief, observe(walked));
  assertEq(belief.monsters.size, 1, 'the rat was forgotten while out of sight');
  assertEq(posKey([...belief.monsters.values()][0].pos), '6,1', 'the remembered position moved');

  // Now look again at an empty tile where it used to be: the memory must go.
  const vanished = makeState({ map, playerPos: [2, 1], monsters: [] });
  const after = foldBelief(belief, observe(vanished));
  assertEq(after.monsters.size, 0, 'a monster known to be gone was still remembered');
});

// ***** M28 — Belief clones a monster's drop before it should be knowable ***** //

test('a Belief monster has no drop key at the default', () => {
  // The leak itself, closed. Real generation (M26 rolls a drop on every
  // creature that carries), so a state where SOME monster actually has a
  // truthy `.drop` is needed to prove the key is gone from Belief, not
  // merely null there — a stripped-but-still-null value would pass a
  // weaker check by accident.
  let sawADrop = false;
  for (let seed = 0; seed < 30 && !sawADrop; seed++) {
    const state = newGame(965000 + seed, floorPlan(5));
    if (state.monsters.some((m) => m.drop)) sawADrop = true;
  }
  assert(sawADrop, 'no seed in this sample rolled a monster with a drop — cannot prove the leak is closed');

  for (let seed = 0; seed < 30; seed++) {
    const state = newGame(965000 + seed, floorPlan(5));
    const obs = observe(state);
    for (const m of obs.monsters) {
      assert(!('drop' in m), `seed ${seed}: Observation monster "${m.name}" still carries a drop key`);
    }
    const belief = foldBelief(emptyBelief(), obs);
    for (const m of belief.monsters.values()) {
      assert(!('drop' in m), `seed ${seed}: Belief monster "${m.name}" still carries a drop key`);
    }
  }
});

test('a Belief chest has no drop key at the default either', () => {
  let sawADrop = false;
  for (let seed = 0; seed < 30 && !sawADrop; seed++) {
    const state = newGame(966000 + seed, floorPlan(5));
    if (state.chests.some((c) => c.drop)) sawADrop = true;
  }
  assert(sawADrop, 'no seed in this sample rolled a chest with a drop — cannot prove the leak is closed');

  for (let seed = 0; seed < 30; seed++) {
    const state = newGame(966000 + seed, floorPlan(5));
    const belief = foldBelief(emptyBelief(), observe(state));
    for (const c of belief.chests.values()) {
      assert(!('drop' in c), `seed ${seed}: Belief chest "${c.name}" still carries a drop key`);
    }
  }
});

test('revealLoot brings the drop back, for whoever eventually builds U4', () => {
  // The other half of the allow-list design: the flag itself has to work,
  // not just exist, so U4 (parked, docs/project/candidates.md) has
  // something to build against later instead of discovering the parameter
  // is inert.
  let checked = false;
  for (let seed = 0; seed < 60 && !checked; seed++) {
    const state = newGame(965000 + seed, floorPlan(5));
    const obs = observe(state, { revealLoot: true });
    // Only monsters visible at generation (turn 0) are in `obs` at all —
    // search among THOSE for one that carries, rather than picking any
    // carrier on the floor and risking one outside the starting radius.
    const seenCarrier = obs.monsters.find((m) => m.drop);
    if (!seenCarrier) continue;
    checked = true;
    const truth = state.monsters.find((m) => m.id === seenCarrier.id);
    assertEq(seenCarrier.drop.name, truth.drop.name,
      'revealLoot: true did not carry the real drop through');
  }
  assert(checked, 'no seed in this sample put a drop-carrying monster within sight at generation');
});

test('the belief never leaks the full map', () => {
  const state = newGame(2024);
  const belief = foldBelief(emptyBelief(), observe(state));
  const walkableTotal = state.map.tiles.filter(Boolean).length;
  assert(belief.tiles.size < walkableTotal, 'the first observation revealed everything');
  assert(belief.shrine === null || belief.tiles.size > 0, 'belief is empty');
});

// ***** personas: heroes as configuration ***** //
//
// src/sim/heroes.js. What is checked here is the SEAM, not the balance: that
// a persona reaches every place that has to read it, that the default one is
// the game that shipped before it existed, and that the persona itself never
// crosses the fog boundary it is allowed to move.

test('the default persona is the game that shipped without one', () => {
  // The load-bearing property of the whole mechanism. If this ever fails,
  // every measurement taken before personas existed is off its baseline.
  const plain = newGame(4242, floorPlan(4));
  const withDefault = newGame(4242, { ...floorPlan(4), persona: {} });
  assertEq(JSON.stringify(observe(withDefault, withDefault.persona).monsters),
    JSON.stringify(observe(plain, plain.persona).monsters),
    'an explicit empty persona saw something the shipped fog does not');
  assertEq(heroItem(ITEM_TABLE[0], DEFAULT_PERSONA), ITEM_TABLE[0],
    'the default persona did not hand the item back untouched');
});

test('papazito sees the whole floor, and the base hero does not', () => {
  const state = newGame(7311, floorPlan(5));
  const seesAll = observe(state, HEROES.papazito.persona);
  const seesNear = observe(state, HEROES.base.persona);
  assertEq(seesAll.monsters.length, state.monsters.length,
    'the whole-map radius still left a creature in the dark');
  assertEq(seesAll.chests.length, state.chests.length,
    'the whole-map radius still left a chest in the dark');
  assert(seesNear.monsters.length < state.monsters.length,
    'the shipped fog revealed the entire roster, so this seed proves nothing');
});

test('papazito still does not know what a chest holds', () => {
  // The two axes are independent — candidates.md U7. A bigger viewport is
  // not permission to read the loot roll.
  const state = newGame(7311, floorPlan(5));
  const obs = observe(state, HEROES.papazito.persona);
  assert(obs.chests.every((c) => !('drop' in c)), 'the wide radius carried a chest drop through');
  assert(obs.monsters.every((m) => !('drop' in m)), 'the wide radius carried a monster drop through');
});

test('ricardo reads the drop through his persona, not just through the flag', () => {
  // `revealLoot` already had a test as a PARAMETER. This one checks the
  // wiring: that the persona on the state is what reaches observe().
  let checked = false;
  for (let seed = 0; seed < 60 && !checked; seed++) {
    const state = newGame(965000 + seed, { ...floorPlan(5), persona: HEROES.ricardo.persona });
    const carrier = observe(state, state.persona).monsters.find((m) => m.drop);
    if (!carrier) continue;
    checked = true;
    const truth = state.monsters.find((m) => m.id === carrier.id);
    assertEq(carrier.drop.name, truth.drop.name, 'the persona did not carry the real drop through');
  }
  assert(checked, 'no seed in this sample put a drop-carrying monster within sight at generation');
});

test('the persona survives the stairs of a single step', () => {
  // cloneState is an allow-list: a field left out of it vanishes one step
  // into the run, and the fog would quietly close again mid-floor.
  const state = newGame(515, { ...floorPlan(3), persona: HEROES.papazito.persona });
  const after = step(state, 'rest').state;
  assertEq(after.persona.sightRadius, state.persona.sightRadius, 'the persona did not survive step()');
  assertEq(step(after, 'rest').observation.monsters.length, state.monsters.length,
    'the wide radius was gone by the second turn');
});

test('the persona never crosses into Observation or Belief', () => {
  // CLAUDE.md's rule is about the CHANNEL. `persona` is new state, and new
  // state is exactly what the allow-list in observe.js exists to stop.
  const state = newGame(808, { ...floorPlan(2), persona: HEROES.ricardo.persona });
  const obs = observe(state, state.persona);
  const belief = foldBelief(emptyBelief(), obs);
  assert(!('persona' in obs), 'the observation carried the persona');
  assert(!('persona' in belief), 'the belief carried the persona');
  assert(!('persona' in obs.player), 'the observed player carried the persona');
});

test("an item is worth what the hero's hands make it", () => {
  const dagger = ITEM_TABLE.find((i) => i.name === 'dagger');
  const shield = ITEM_TABLE.find((i) => i.name === 'shield');
  // A PERSONA WRITTEN HERE, not whichever hero happens to use the mechanism
  // this week. Pinned to a real one, this test failed the day Vito's trait
  // was retuned — and what it is for is the machinery, which did not change.
  const vito = { items: { dagger: { dmgMin: 1 }, shield: { armour: 2 } } };

  assertEq(heroItem(dagger, vito).dmgMin, 1, 'the dagger did not gain its floor');
  assertEq(heroItem(dagger, vito).dmg, dagger.dmg, 'the override touched a field it was not given');
  assertEq(dagger.dmgMin ?? 0, 0, 'heroItem mutated the shared ITEM_TABLE row');

  // The kit path, which is also the shop path (rules.md §5): the armour bar
  // has to be credited with what the HERO'S shield is worth, not the world's.
  const state = newGame(99, { ...floorPlan(1), persona: vito, startingItems: [shield] });
  assertEq(state.player.armour, 2, 'the starting shield credited the world value, not the hero value');
  const plain = newGame(99, { ...floorPlan(1), startingItems: [shield] });
  assertEq(plain.player.armour, shield.armour, 'the ordinary hero stopped getting the ordinary shield');
});

test('a picked-up item goes through the same rule as a bought one', () => {
  const map = tinyMap([
    '#####',
    '#---#',
    '#####',
  ]);
  const state = makeState({ map, playerPos: [1, 1], monsters: [], shrine: { id: 's', emoji: '⛩️', pos: [3, 1] } });
  state.items = [{ ...ITEM_TABLE.find((i) => i.name === 'shield'), id: 77, pos: [2, 1] }];
  // Written here rather than borrowed from a hero, same reason as above.
  state.persona = { items: { shield: { armour: 2 } } };
  const after = step(state, 'right').state;
  assertEq(after.player.armour, 2, 'the pickup path credited the world value, not the hero value');
  assertEq(after.player.inventory[0].armour, 2, 'the bag holds the world item, not the hero one');
  assertEq(after.items.length, 0, 'the item was not taken off the floor');
});

test('ricardo walks past the empty chests, and the ordinary hero does not', () => {
  // The observable signature of the persona, checked as behaviour rather
  // than as a flag: half of all chests hold nothing, and he is the only one
  // who can tell before spending the two turns.
  const opens = (persona) => {
    let empty = 0;
    let found = 0;
    for (let seed = 0; seed < 8; seed++) {
      const plan = floorPlan(3);
      const run = playGame(3300 + seed,
        makeBot({ monsterCount: plan.monsters, chestCount: plan.chests }),
        { maxTurns: TURN_BUDGET, counts: { ...plan, persona } });
      for (const e of run.state.log) {
        if (e.type !== 'open') continue;
        if (e.found) found++; else empty++;
      }
    }
    return { empty, found };
  };

  const base = opens(HEROES.base.persona);
  const ricardo = opens(HEROES.ricardo.persona);
  assert(base.empty > 0, 'the ordinary hero opened no empty chest, so this sample proves nothing');

  // Not zero, and it should not be: a chest BLOCKS its tile (rules.md §6),
  // so one sitting on the route is opened by the engine whatever the bot
  // believes. What the filter removes is every empty chest he would have
  // WALKED TO — and the residue is the price of the road, not a defect.
  assert(ricardo.empty < base.empty / 2, 'the filter barely moved the wasted opens');

  // The half that makes it a good trade rather than mere caution: he gives
  // up nothing.
  //
  // NOT equality, and the weakening is deliberate. The two heroes play
  // DIFFERENT runs — Ricardo sees drops, so his belief and therefore his
  // route diverge from turn one — and exact equality held only while nothing
  // else in the pricing separated them. C1 §1 made the danger field blind to
  // a creature's strength, the routes moved, and Ricardo now finds MORE.
  // What the test is actually about is that the filter never costs him loot,
  // and that is what this says.
  //
  // The cost of the weaker form, stated so nobody discovers it later: a
  // filter that wrongly refused one full chest would pass here if the
  // changed route happened to find two others. Catching that needs a test on
  // the filter itself, not on run totals.
  assert(ricardo.found >= base.found, 'ricardo refused a chest that was carrying something');
});

test('pawa arrives on the next floor wearing what the last one paid for', () => {
  const shield = ITEM_TABLE.find((i) => i.name === 'shield');
  const play = (seed, hero) => playDungeon(seed,
    (floor) => makeBot({ monsterCount: floor.monsterCount, chestCount: floor.chests }),
    { traversals: LEVELS, hero });

  // SEARCHED, not pinned. A pinned seed whose floor 1 happens to pay for a
  // shield is a fixture that any balance change can quietly invalidate —
  // and one did: the seed this test was written against stopped paying, and
  // the failure said "pawa bought nothing" rather than "the sample is no
  // longer a sample". Scanning says which of the two actually happened.
  let pawa = null;
  let base = null;
  for (let seed = 6100; seed < 6200 && !pawa; seed++) {
    const run = play(seed, HEROES.pawa);
    if (run.levels.length < 2 || !run.levels[0].spent) continue;
    pawa = run;
    base = play(seed, HEROES.base);
  }
  assert(pawa, 'no seed in this sample had a floor 1 that paid for a shield');

  // Floor 1 is identical for both — nothing has been bought yet — so any
  // difference on arrival at floor 2 is the purchase and nothing else.
  assertEq(base.levels[0].spent, 0, 'the ordinary hero spent coin in the middle of a run');

  assertEq(pawa.levels[1].arrivedWith.armour,
    base.levels[1].arrivedWith.armour + shield.armour,
    'the bought shield never reached the armour bar');
  assert(pawa.levels[1].arrivedWith.inventory.some((i) => i.id < 0),
    'the bought shield is not in the bag');

  // The page has no other way to show that anything happened: the coin is
  // earned and spent on the same floor, so the balance moves by zero.
  assertEq(pawa.levels[0].bought.count, 1, 'the row does not say what was bought');
  assertEq(pawa.levels[0].bought.emoji, shield.emoji, 'the row does not say WHAT it was');
  assertEq(base.levels[0].bought, null, 'the ordinary hero bought something mid-run');
});

// ***** the book, and the five turns it costs ***** //

test('papazito starts with the book and nobody else does', () => {
  const plan = floorPlan(1);
  const hasBook = (persona) => newGame(31, { ...plan, persona })
    .player.inventory.some((i) => i.kind === 'book');
  assert(hasBook(HEROES.papazito.persona), 'the scholar arrived empty-handed');
  assert(!hasBook(HEROES.base.persona), 'the ordinary hero was handed a book');
  assert(!hasBook(HEROES.ricardo.persona), 'a second hero was handed a book');
});

test('reading costs exactly five turns and then fills the bar', () => {
  const map = tinyMap([
    '#####',
    '#---#',
    '#####',
  ]);
  let state = makeState({ map, playerPos: [1, 1], monsters: [], shrine: { id: 's', emoji: '⛩️', pos: [3, 1] } });
  state.player.hp = 2;
  state.player.inventory = [{ ...ITEM_TABLE.find((i) => i.name === 'book'), id: 9 }];
  const before = state.turn;

  // Four turns in, still reading and still hurt: the heal is not a discount
  // paid up front, it is what the fifth turn buys.
  for (let i = 0; i < 4; i++) {
    state = step(state, i === 0 ? 'read' : 'rest').state;
    assert(state.player.reading > 0, `the read ended early, on turn ${i + 1}`);
    assertEq(state.player.hp, 2, 'the hero healed before finishing');
  }

  state = step(state, 'rest').state;
  assertEq(state.turn - before, READ_TURNS, 'reading did not cost exactly five turns');
  assertEq(state.player.hp, state.player.hpMax, 'the book did not fill the bar');
  assert(!state.player.reading, 'the hero is still reading after the last turn');
  assert(!state.player.inventory.some((i) => i.kind === 'book'), 'the book survived being read');
});

test('a read in progress ignores what the bot asks for', () => {
  // The commitment is the whole price. A reader who could walk away the
  // moment something woke would be paying nothing.
  const map = tinyMap([
    '#####',
    '#---#',
    '#####',
  ]);
  let state = makeState({ map, playerPos: [1, 1], monsters: [], shrine: { id: 's', emoji: '⛩️', pos: [3, 1] } });
  state.player.inventory = [{ ...ITEM_TABLE.find((i) => i.name === 'book'), id: 9 }];

  state = step(state, 'read').state;
  const held = state.player.pos.slice();
  state = step(state, 'right').state;
  assertEq(String(state.player.pos), String(held), 'the hero walked out of his own read');
});

test('creatures act during every turn of a read', () => {
  // The five turns are free with nothing awake and expensive with something
  // on the hero's heel — that difference IS the decision (rules.md §4).
  const map = tinyMap([
    '##########',
    '#--------#',
    '##########',
  ]);
  let state = makeState({
    map,
    playerPos: [1, 1],
    monsters: [dummy('rat', [8, 1], { activation: 20 })],
    shrine: { id: 's', emoji: '⛩️', pos: [9, 1] },
  });
  state.player.inventory = [{ ...ITEM_TABLE.find((i) => i.name === 'book'), id: 9 }];
  const start = state.monsters[0].pos[0];

  for (let i = 0; i < READ_TURNS; i++) state = step(state, i === 0 ? 'read' : 'rest').state;
  assert(state.monsters[0].pos[0] < start, 'the creature stood still while the hero read');
});

test('reading without a book passes no turn at all', () => {
  // Same shape as drinking with no potion (rules.md §6).
  const map = tinyMap([
    '#####',
    '#---#',
    '#####',
  ]);
  const state = makeState({ map, playerPos: [1, 1], monsters: [], shrine: { id: 's', emoji: '⛩️', pos: [3, 1] } });
  const after = step(state, 'read').state;
  assertEq(after.turn, state.turn, 'an impossible read cost a turn');
  assert(!after.player.reading, 'the hero began a read with no book');
});

test('the read survives the step it is halfway through', () => {
  // cloneState spreads the player wholesale today, so `reading` crosses for
  // free — unlike `persona`, which sits at the top of the state and had to be
  // listed by hand. This is here so a future move to an allow-list cannot
  // drop it in silence.
  const map = tinyMap([
    '#####',
    '#---#',
    '#####',
  ]);
  let state = makeState({ map, playerPos: [1, 1], monsters: [], shrine: { id: 's', emoji: '⛩️', pos: [3, 1] } });
  state.player.inventory = [{ ...ITEM_TABLE.find((i) => i.name === 'book'), id: 9 }];
  state = step(state, 'read').state;
  assertEq(step(state, 'rest').state.player.reading, state.player.reading - 1,
    'the reading counter did not survive a step');
});

// ***** courage is a guess about health, not a wider margin ***** //

test("a creature's health never crosses, at any range", () => {
  const map = tinyMap([
    '#########',
    '#-------#',
    '#########',
  ]);
  const state = makeState({
    map,
    playerPos: [1, 1],
    monsters: [dummy('ogre', [2, 1], { activation: 20 }), dummy('wolf', [7, 1], { activation: 20 })],
    shrine: { id: 's', emoji: '⛩️', pos: [8, 1] },
  });
  const seen = observe(state).monsters;
  const near = seen.find((m) => m.name === 'ogre');
  const far = seen.find((m) => m.name === 'wolf');
  assert(!('hp' in near), 'the creature he is standing next to handed over its health');
  assert(!('hp' in far), 'a creature across the room handed over its health');
  assert('xp' in far, 'the number over the head has to stay visible');
});

test('wolf and ogre are the same creature, and stay that way', () => {
  // The whole point of the estimate: they share xp 4 at hp 5 and hp 7, so
  // the bestiary average is wrong about both, by 20% each way — and no
  // amount of standing next to one settles it.
  const wolf = { name: 'wolf', xp: 4, activation: 20, pos: [9, 9] };
  const ogre = { name: 'ogre', xp: 4, activation: 20, pos: [9, 9] };
  assertEq(assumedHp(wolf), assumedHp(ogre), 'two xp-4 creatures were guessed differently');
  assert(assumedHp(wolf) > 5 && assumedHp(wolf) < 7, 'the guess is not between the two truths');
  assertEq(assumedHp({ ...wolf, hp: 5 }), assumedHp(wolf), 'a real hp on the entity was read');
});

// ***** a guard charges by distance, not by presence ***** //

// A long corridor and one chest, so the only thing that moves between the two
// halves of each test is where the creature stands.
function guardBoard(monsterPos, extra = {}) {
  const wide = 24;
  const map = tinyMap([
    '#'.repeat(wide),
    `#${'-'.repeat(wide - 2)}#`,
    '#'.repeat(wide),
  ]);
  const state = makeState({
    map,
    playerPos: [1, 1],
    monsters: [dummy('wolf', monsterPos, { activation: 22, ...extra })],
    chests: [{ id: 90, name: 'chest', emoji: '🎁', pos: [3, 1], edge: false }],
    shrine: { id: 's', emoji: '⛩️', pos: [22, 1] },
  });
  // Whole-map sight, so the creature's distance is the only thing under test
  // and not whether the hero can see it at all.
  const belief = foldBelief(emptyBelief(), observe(state, { sightRadius: 64 }));
  const danger = dangerField(belief);
  return { belief, opts: { reach: danger.reach, persistence: DANGER_PERSISTENCE } };
}

test('a guard eight tiles from the chest charges less than one beside it', () => {
  // The defect this fixes, seen on seed 2956634425: inside its radius a guard
  // charged the WHOLE duel however far away it stood, so one wide-radius
  // creature priced half a floor at full cost and the bot walked past a chest
  // at its elbow.
  const beside = guardBoard([4, 1]);
  const far = guardBoard([12, 1]);

  const a = guardCost(beside.belief, [3, 1], beside.opts);
  const b = guardCost(far.belief, [3, 1], far.opts);

  assert(a > 0, 'a creature next to the chest charges nothing');
  assert(b < a, 'distance did not make the guard cheaper');
  // Nine steps of decay is a big discount, and it should be: nine turns is
  // long enough to open the chest and be gone.
  assert(b < a * 0.2, 'the discount is too shallow to change a decision');
});

test('a guard that cannot be outrun charges in full, however far', () => {
  // The Butcher's rule (B18): the hero moves one tile a turn and it moves
  // two, so "grab it and leave" is not a plan. Without this the vault's far
  // chests would cost about a twentieth of its duel and the room would stop
  // being a barrier.
  const beside = guardBoard([4, 1], { speed: 2 });
  const far = guardBoard([12, 1], { speed: 2 });

  const a = guardCost(beside.belief, [3, 1], beside.opts);
  const b = guardCost(far.belief, [3, 1], far.opts);
  assert(Math.abs(a - b) < 1e-9, 'a creature that outruns the hero got a distance discount');
});

test('out of reach is not a guard at all', () => {
  const away = guardBoard([12, 1], { activation: 4 });
  assertEq(guardCost(away.belief, [3, 1], away.opts), 0,
    'a creature that cannot reach the chest still charged for it');
});

// ***** the bot remembers the blows it landed ***** //

test('the blow the hero swung reaches the Observation, and only that turn', () => {
  const map = tinyMap([
    '#####',
    '#---#',
    '#####',
  ]);
  const state = makeState({
    map,
    playerPos: [1, 1],
    monsters: [dummy('rat', [2, 1], { activation: 20, hp: 40 })],
    shrine: { id: 's', emoji: '⛩️', pos: [3, 1] },
  });
  assertEq(observe(state).blow, null, 'a blow was reported before one was thrown');

  const hit = step(state, 'right');
  const target = state.monsters[0].id;
  assertEq(hit.observation.blow.id, target, 'the blow named the wrong creature');
  // The last log entry is the creature hitting BACK — the monsters move
  // after the player's action — so this has to ask for the hero's own.
  const swung = hit.state.log.filter((e) => e.type === 'attack' && e.by === 'player').at(-1);
  assertEq(hit.observation.blow.damage, swung.damage,
    'the reported blow and the logged blow disagree');

  // One turn only: `cloneState` does not carry it, so resting clears it with
  // nothing having to do the clearing.
  assertEq(step(hit.state, 'rest').observation.blow, null, 'the blow outlived its turn');
});

test('the guess decays by what the bot has already landed', () => {
  const wolf = { id: 3, name: 'wolf', xp: 4, activation: 20, pos: [9, 9] };
  const fresh = assumedHp(wolf);
  assertEq(assumedHp({ ...wolf, hurt: 2 }), fresh - 2, 'a landed blow did not come off the guess');

  // Still standing after the guess ran out is proof the guess was low, so
  // the bot guesses again instead of pricing the rest of the fight at
  // nothing — which is what a floored estimate did.
  assertEq(assumedHp({ ...wolf, hurt: 999 }), fresh, 'an exhausted guess was not made again');
  assert(duelCost({ xp: PLAYER_XP, hp: 10, armour: 0, inventory: [] }, { ...wolf, hurt: 999 }).hpLost > 0,
    'a falsified guess priced the rest of the fight at zero');

  const hero = { xp: PLAYER_XP, hp: 10, armour: 0, inventory: [] };
  assert(duelCost(hero, { ...wolf, hurt: 3 }).hpLost < duelCost(hero, wolf).hpLost,
    'a half-dead creature was not a cheaper fight');
});

test('the tally survives seeing the creature again', () => {
  // `refresh` rebuilds a remembered monster from each new sighting, so the
  // memory the bot BUILT has to be carried across it by hand.
  const map = tinyMap([
    '#####',
    '#---#',
    '#####',
  ]);
  let state = makeState({
    map,
    playerPos: [1, 1],
    monsters: [dummy('rat', [2, 1], { activation: 20, hp: 40 })],
    shrine: { id: 's', emoji: '⛩️', pos: [3, 1] },
  });
  const target = state.monsters[0].id;

  let belief = foldBelief(emptyBelief(), observe(state));
  let dealt = 0;
  for (let i = 0; i < 6; i++) {
    const out = step(state, 'right');
    state = out.state;
    if (out.observation.blow) dealt += out.observation.blow.damage;
    belief = foldBelief(belief, out.observation);
  }
  assertEq(belief.monsters.get(target).hurt || 0, dealt,
    'the tally does not match the blows that landed');
});

test('bravery discounts the guess, mirrored around the centre', () => {
  // Owner's formulation: one notch UP means reading the creature as holding
  // that much LESS than its kind usually does.
  const wolf = { name: 'wolf', xp: 4, activation: 20, pos: [9, 9] };
  const plain = assumedHp(wolf, 1);
  const bands = biasBands();
  const brave = assumedHp(wolf, bands[3]);      // 1.16
  const timid = assumedHp(wolf, bands[2]);      // 0.84

  assert(brave < plain, 'a braver hero did not read the creature as weaker');
  assert(timid > plain, 'a timid hero did not read it as tougher');
  // 1.16 -> 0.84 of the estimate, and 0.84 -> 1.16 of it: the same distance
  // either way, which is what makes one notch mean one thing on this dial.
  assert(Math.abs((plain - brave) - (timid - plain)) < 1e-9, 'the two directions are not symmetric');

  // And it reaches the decision: a braver hero prices the same duel cheaper.
  const hero = { xp: PLAYER_XP, hp: 10, armour: 0, inventory: [] };
  assert(duelCost(hero, wolf, bands[3]).hpLost < duelCost(hero, wolf, bands[2]).hpLost,
    'bravery does not reach duelCost');
});

// ***** the syringe, and the five turns it doubles ***** //

test('vito starts armed, when the run starts empty-handed', () => {
  const plan = floorPlan(1);
  const held = (persona) => newGame(77, { ...plan, persona })
    .player.inventory.map((i) => i.name).sort();
  assertEq(String(held(HEROES.vito.persona)), 'adrenaline,dagger', 'the warrior arrived empty-handed');
  assertEq(String(held(HEROES.base.persona)), '', 'the ordinary hero was armed');
});

test('the rage doubles the top of the die and leaves its floor alone', () => {
  // The whole point of a multiplier over a bonus: it grows with the gear.
  const bare = expectedDamage(PLAYER_XP, 0, 0);
  const bareRaging = expectedDamage(PLAYER_XP, 0, 0, RAGE_MULT);
  assert(bareRaging > bare * 1.9, 'a bare hero barely gained from raging');

  // With an axe the floor must survive: dmgMin is the bottom, not the top.
  const axe = ITEM_TABLE.find((i) => i.name === 'axe');
  const armed = expectedDamage(PLAYER_XP, axe.dmg, axe.dmgMin);
  const armedRaging = expectedDamage(PLAYER_XP, axe.dmg, axe.dmgMin, RAGE_MULT);
  assert(armedRaging > armed, 'raging did nothing for an armed hero');
});

test('raging is priced by the bot, not only rolled by the engine', () => {
  // The silent failure this guards: leave `raging` off the Belief allow-list
  // and every test still passes while the bot underrates itself for five
  // turns. `duelCost` is what decides which fights it takes.
  const wolf = MONSTER_TABLE.find((m) => m.name === 'wolf');
  const calm = { xp: PLAYER_XP, hp: 10, armour: 0, inventory: [] };
  const raging = { ...calm, raging: RAGE_TURNS };
  assert(duelCost(raging, wolf).hpLost < duelCost(calm, wolf).hpLost,
    'the bot prices a raging duel the same as a calm one');

  const state = makeState({ map: tinyMap(['###', '#-#', '###']), playerPos: [1, 1], monsters: [] });
  state.player.raging = RAGE_TURNS;
  assert('raging' in observe(state).player, 'raging never reaches the bot');
});

test('the syringe lasts five ATTACKING turns, and the injection is not one', () => {
  const map = tinyMap([
    '#####',
    '#---#',
    '#####',
  ]);
  let state = makeState({ map, playerPos: [1, 1], monsters: [], shrine: { id: 's', emoji: '⛩️', pos: [3, 1] } });
  state.player.inventory = [{ ...ITEM_TABLE.find((i) => i.name === 'adrenaline'), id: 9 }];

  state = step(state, 'rage').state;
  assertEq(state.player.raging, RAGE_TURNS, 'the turn it was used ate one of its own turns');
  assert(!state.player.inventory.some((i) => i.kind === 'syringe'), 'the syringe survived being used');

  for (let i = 0; i < RAGE_TURNS; i++) {
    assert(state.player.raging > 0, `the rage ended early, on turn ${i + 1}`);
    state = step(state, 'rest').state;
  }
  assert(!state.player.raging, 'the rage outlasted its five turns');
});

test('raging without a syringe passes no turn at all', () => {
  const state = makeState({ map: tinyMap(['###', '#-#', '###']), playerPos: [1, 1], monsters: [] });
  const after = step(state, 'rage').state;
  assertEq(after.turn, state.turn, 'an impossible rage cost a turn');
  assert(!after.player.raging, 'the hero raged with nothing to inject');
});

// A RULE, not a metric — which is why it is here and not among the
// tripwires. "The syringe is never spent outside a fight" is either true of
// every injection or the trigger is broken; there is no share of it to
// watch, and a wire measuring it would read zero injections on the base
// hero, who owns no syringe. The trigger asks whether rage turns an ADJACENT
// duel from a death into a survival, so an injection with nobody in reach is
// impossible by construction — this is what makes that stay true.
test('vito never injects with no creature beside him', () => {
  const vito = HEROES.vito;
  let injections = 0;
  for (let seed = 0; seed < 12; seed++) {
    const run = playDungeon(770000 + seed, (f) => makeBot({
      monsterCount: f.monsterCount, chestCount: f.chests,
      threatAhead: f.threatAhead, floorsAhead: f.floorsAhead, hero: vito.bot,
    }), { hero: vito });
    for (const level of run.levels) {
      const frames = replayGame(level.replay);
      for (let i = 1; i < frames.length; i++) {
        const before = frames[i - 1].state;
        if (before.player.raging || !frames[i].state.player.raging) continue;
        injections++;
        const [px, py] = before.player.pos;
        assert(before.monsters.some((m) => !m.dead
          && Math.abs(m.pos[0] - px) + Math.abs(m.pos[1] - py) === 1),
        `injected on floor ${level.level} with nothing adjacent`);
      }
    }
  }
  // Otherwise the loop above proves nothing and passes anyway.
  assert(injections > 0, 'no syringe was used in the whole sample');
});

// ***** map design: the spine and its detours ***** //
//
// docs/map-design.md. Every "70% of the threat mass is on the mandatory
// route" figure rests on classifyRooms being right, and until these existed
// it had never been checked against a map whose answer was known in advance.

// Two rooms side by side through a door, with a third hanging below the
// first by a corridor. Walking A -> C never enters B, so B is the detour,
// and that is true whatever the generator would have done.
//
//   0123456789
// 0 ##########
// 1 #...#...##     A = x1-3, C = x5-7, both rows 1-3
// 2 #...+...##     the door at 4,2 is the only way across
// 3 #...#...##
// 4 #-########     corridor at 1,4 drops out of the bottom of A
// 5 #..#######
// 6 #..#######     B = x1-2, rows 5-6: reachable, never on the route
// 7 ##########
function spineFixture() {
  const map = tinyMap([
    '##########',
    '#...#...##',
    '#...+...##',
    '#...#...##',
    '#-########',
    '#..#######',
    '#..#######',
    '##########',
  ]);
  // tinyMap leaves rooms empty; classifyRooms needs the rectangles.
  map.rooms = [
    { x1: 1, y1: 1, x2: 3, y2: 3, center: [2, 2], doors: [] },   // A, the start
    { x1: 5, y1: 1, x2: 7, y2: 3, center: [6, 2], doors: [] },   // C, the shrine
    { x1: 1, y1: 5, x2: 2, y2: 6, center: [1, 5], doors: [] },   // B, the detour
  ];
  return map;
}

test('a room the route never enters is classified as side', () => {
  const map = spineFixture();
  const zones = classifyRooms(map, [2, 2], [6, 2]);

  assertEq(zones.side.length, 1, 'expected exactly one side room');
  assertEq(zones.spine.length, 2, 'expected the start and shrine rooms on the spine');
  assert(zones.side[0].center[0] === 1 && zones.side[0].center[1] === 5,
    'the detour room was not the one classified as side');
});

test('the rooms the hero starts and ends in are always spine', () => {
  const map = spineFixture();
  const zones = classifyRooms(map, [2, 2], [6, 2]);
  // The path begins inside A and ends inside C, so neither can be optional.
  assert(!zones.isSide([2, 2]), 'the room the hero starts in was called optional');
  assert(!zones.isSide([6, 2]), "the shrine room was called optional");
  assert(zones.isSide([1, 6]), "the detour room was not called optional");
});

test('corridors are never side ground', () => {
  const map = spineFixture();
  const zones = classifyRooms(map, [2, 2], [6, 2]);
  // 1,4 is the corridor leading down to the detour. It belongs to no room,
  // so it is not optional ground — committing to the detour means crossing
  // it, and anything standing there is unavoidable once you do.
  assertEq(zones.roomOf([1, 4]), null, 'a corridor tile was assigned to a room');
  assert(!zones.isSide([1, 4]), 'a corridor was treated as side ground');
});

test('spine share counts mass, not bodies', () => {
  // Four rats on the route, one dragon in a side room. The rats are 80% of
  // the CREATURES and 0% of the threat — hp × (xp − 1) is zero for xp 1.
  const state = {
    monsters: [
      { hpMax: 2, xp: 1, side: false }, { hpMax: 2, xp: 1, side: false },
      { hpMax: 2, xp: 1, side: false }, { hpMax: 2, xp: 1, side: false },
      { hpMax: 15, xp: 8, side: true },
    ],
  };
  assertEq(spineShare(state), 0, 'headcount leaked into the mass share');
});

test('a floor puts most of its threat mass on the mandatory route', () => {
  // The requirement from docs/map-design.md, checked on real generated maps
  // rather than by inspection. Floor 5 and up, where the roster is large
  // enough for the split to be attempted at all (MIN_ROSTER_FOR_SIDE).
  let total = 0;
  let floors = 0;
  for (let seed = 0; seed < 12; seed++) {
    const state = newGame(3300 + seed, floorPlan(7));
    total += spineShare(state);
    floors++;
  }
  const mean = total / floors;
  assert(mean >= 0.6, `mean spine share ${mean.toFixed(2)} is far below the 0.7 target`);
  assert(mean <= 0.95, `mean spine share ${mean.toFixed(2)} means side rooms are empty`);
});

// ***** M43 — the vault ***** //

// Real generated floors, not a fixture: every property this section checks
// is about what the stamp does to a map the digger actually produced.
const vaultSeeds = [7100, 7101, 7102, 7103, 7104, 7105, 7106, 7107];

function vaultFloors() {
  return vaultSeeds
    .map((seed) => newGame(seed, floorPlan(VAULT_LEVEL)))
    .filter((state) => state.vault);
}

test('the vault lands on its own floor and nowhere else', () => {
  const floors = vaultFloors();
  assert(floors.length >= vaultSeeds.length - 1,
    `only ${floors.length}/${vaultSeeds.length} floors got a vault — `
    + 'measured at 199 in 200, so this is a regression, not the known gap');

  for (const seed of vaultSeeds) {
    for (const level of [VAULT_LEVEL - 1, VAULT_LEVEL + 1]) {
      assertEq(newGame(seed, floorPlan(level)).vault, null,
        `floor ${level} grew a vault it should not have`);
    }
  }
});

test('the vault is switched off by its own dial', () => {
  for (const seed of vaultSeeds) {
    const state = newGame(seed, { ...floorPlan(VAULT_LEVEL), vaultLevel: 0 });
    assertEq(state.vault, null, 'vaultLevel 0 still stamped a vault');
  }
});

test('the vault is larger than any room the digger can make', () => {
  // The size IS the tell — a player has to be able to see on sight that
  // this room was placed rather than rolled.
  assert(VAULT_SIZE > ROOM_HEIGHT[1] || VAULT_SIZE > ROOM_WIDTH[1],
    'the vault is within generated-room dimensions and reads as ordinary');

  for (const state of vaultFloors()) {
    const room = state.vault.room;
    assertEq(room.x2 - room.x1 + 1, VAULT_SIZE, 'vault width');
    assertEq(room.y2 - room.y1 + 1, VAULT_SIZE, 'vault height');
  }
});

test('the vault is always side — the mandatory route never enters it', () => {
  // The property the whole design rests on, and it is structural: one door,
  // a dead end, and the shrine placed before the vault existed. If this
  // ever fires, the room stopped being refusable and the choice is gone.
  for (const state of vaultFloors()) {
    const zones = classifyRooms(state.map, state.player.pos, state.shrine.pos);
    assert(zones.side.includes(state.vault.room),
      'the vault came out on the spine');
    for (const [x, y] of zones.path) {
      assert(!inVault(state.vault, x, y),
        `the hero->shrine route crosses the vault at ${x},${y}`);
    }
    assertEq(state.vault.room.doors.length, 1, 'a vault with two ways in');
  }
});

test('the vault is reachable, and its door opens onto the route', () => {
  const floors = vaultFloors();
  let onSpine = 0;

  for (const state of floors) {
    const passable = playerPassable(state.map);
    const route = findPath(state.player.pos, state.vault.room.center, passable);
    assert(route.length > 0, 'the vault is walled off from the hero');
    if (state.vault.onSpine) onSpine++;
  }

  // Measured at 86% over 200 floors. A door off the route still makes a
  // vault worth having, so this is a floor under the property rather than
  // the property itself.
  assert(onSpine >= Math.ceil(floors.length * 0.6),
    `only ${onSpine}/${floors.length} vault doors opened onto the mandatory route`);
});

test('the pillars stand, and they stand inside the room', () => {
  for (const state of vaultFloors()) {
    const pillars = pillarsOf([state.vault.room.x1, state.vault.room.y1], VAULT_SIZE);
    assertEq(pillars.length, 4, 'expected four pillars');
    for (const [x, y] of pillars) {
      assert(inVault(state.vault, x, y), 'a pillar landed outside the vault');
      assert(!playerPassable(state.map)(x, y),
        `the pillar at ${x},${y} is walkable, so it is not a pillar`);
    }
    // And the room is still a room around them.
    assert(playerPassable(state.map)(...state.vault.room.center),
      'the vault centre is not walkable');
  }
});

test('stamping the vault consumes no randomness', () => {
  // The property that lets classifyRooms simply be run twice, and the one
  // that keeps every recorded replay valid. A single draw taken here would
  // shift every later roll on the floor.
  for (const seed of vaultSeeds) {
    const withVault = newGame(seed, floorPlan(VAULT_LEVEL));
    const without = newGame(seed, { ...floorPlan(VAULT_LEVEL), vaultLevel: 0 });

    assertEq(withVault.rng.map, without.rng.map, 'the map stream moved');
    assertEq(withVault.rng.combat, without.rng.combat, 'the combat stream moved');
    assertEq(withVault.shrine.pos.join(','), without.shrine.pos.join(','),
      'the shrine moved');
    assertEq(withVault.player.pos.join(','), without.player.pos.join(','),
      'the hero moved');

    // The spawn stream DOES move now, and legitimately: a vault floor
    // places no ordinary chests, so the ~30 draws that loop would have
    // spent are not spent. What still has to hold is that the vault's own
    // contents cost nothing — filling it with eight authored chests draws
    // exactly as much as leaving it empty, which isolates that claim from
    // the suppression above.
    const empty = newGame(seed, { ...floorPlan(VAULT_LEVEL), vaultChestItems: [] });
    assertEq(withVault.rng.spawn, empty.rng.spawn,
      'filling the vault moved the spawn stream, so its contents are drawn');
    assertEq(
      withVault.monsters.map((m) => `${m.name}@${m.pos}`).join('|'),
      empty.monsters.map((m) => `${m.name}@${m.pos}`).join('|'),
      'filling the vault changed the roster',
    );
    // Deliberately NOT compared against `without`: a vault floor skips its
    // own chest loop, so the roster placed after it legitimately differs.
    // The `empty` comparison above is what still pins the vault itself to
    // costing no randomness.
  }
});

test('the ordinary roster and chests stay out of the vault', () => {
  // Nothing excludes the vault explicitly — it is stamped after the free
  // pool was taken, so its tiles were never candidates. This is the test
  // that would catch that ordering being changed.
  for (const state of vaultFloors()) {
    for (const monster of state.monsters) {
      if (monster.vault) continue;                 // its own occupant belongs
      assert(!inVault(state.vault, ...monster.pos),
        `${monster.name} spawned inside the vault`);
    }
    for (const chest of state.chests) {
      if (chest.vault) continue;                   // its own chests belong
      assert(!inVault(state.vault, ...chest.pos), 'a floor chest landed in the vault');
    }
    assert(!inVault(state.vault, ...state.player.pos), 'the hero started in the vault');
    assert(!inVault(state.vault, ...state.shrine.pos), 'the exit is inside the vault');
  }
});

test('the Butcher stands in the vault, and only there', () => {
  for (const state of vaultFloors()) {
    const bosses = state.monsters.filter((m) => m.vault);
    assertEq(bosses.length, 1, 'expected exactly one vault creature');

    const boss = bosses[0];
    assertEq(boss.name, VAULT_BOSS.name, 'wrong occupant');
    assertEq(boss.hp, VAULT_BOSS.hp, 'wrong hp');
    assertEq(boss.xp, VAULT_BOSS.xp, 'wrong xp');
    assert(inVault(state.vault, ...boss.pos), 'the Butcher is not in its room');
    assertEq(boss.pos.join(','), layoutOf(state.vault.room, state.vault.door).boss.join(','),
      'the Butcher should stand at the back of the room, read from its door');
    assert(boss.side, 'the Butcher came out marked as mandatory');
  }

  // And nowhere else in the run: no other floor may grow one.
  for (const level of [1, 2, 3, 5, 8, 10]) {
    if (level === VAULT_LEVEL) continue;
    for (const seed of vaultSeeds) {
      const state = newGame(seed, floorPlan(level));
      assert(!state.monsters.some((m) => m.vault),
        `floor ${level} has a vault creature`);
      assert(!state.monsters.some((m) => m.name === VAULT_BOSS.name),
        `floor ${level} rolled a Butcher out of the ordinary table`);
    }
  }
});

test('the Butcher always carries the axe', () => {
  // The only guaranteed drop in the game — no dropChance roll in front of
  // it. If this ever becomes a gamble, the reward stops paying for the risk.
  for (const state of vaultFloors()) {
    const boss = state.monsters.find((m) => m.vault);
    assert(boss.drop, 'the Butcher carries nothing');
    assertEq(boss.drop.name, 'axe', 'the Butcher carries the wrong item');
    assertEq(boss.drop.dmgMin, ITEM_TABLE.find((i) => i.name === 'axe').dmgMin,
      'the dropped axe lost the damage floor that makes it the real upgrade');
  }
});

test('the Butcher is not in the tier table and cannot be drawn', () => {
  // It must never become a MONSTER_TABLE row: the table is a ladder that
  // depth indexes into, so a row here would appear on deep floors by
  // accident, be reskinned by the out-of-depth roll, and be scaled.
  assert(!MONSTER_TABLE.some((t) => t.name === VAULT_BOSS.name),
    'the Butcher leaked into the tier table');
});

test('the vault holds every chest the floor has, at authored positions', () => {
  for (const state of vaultFloors()) {
    const vaultChests = state.chests.filter((c) => c.vault);
    assertEq(vaultChests.length, VAULT_CHEST_ITEMS.length, 'wrong chest count');

    const slots = layoutOf(state.vault.room, state.vault.door).chests;
    for (const chest of vaultChests) {
      assert(inVault(state.vault, ...chest.pos), 'a vault chest fell outside');
      assert(slots.some((s) => s[0] === chest.pos[0] && s[1] === chest.pos[1]),
        `a vault chest at ${chest.pos} is not on an authored slot`);
      assert(chest.side, 'a vault chest came out marked as mandatory');
      assert(chest.drop, 'an authored chest came out empty');
    }

    // The point of concentrating the reward: walking past the vault means
    // leaving this floor with nothing. If the floor ever pays chests of its
    // own again, skipping becomes free and the room is a bonus nobody needs.
    assertEq(state.chests.filter((c) => !c.vault).length, 0,
      'the vault floor placed ordinary chests, so skipping the room is free');

    const tiles = new Set(state.chests.map((c) => c.pos.join(',')));
    assertEq(tiles.size, state.chests.length, 'two chests on one tile');
    assert(!vaultChests.some((c) => c.pos.join(',') === state.vault.boss.pos.join(',')),
      'a chest is standing on the Butcher');
  }
});

test('every vault chest is inside the Butcher\'s reach', () => {
  // `guardCost` (src/bot/bot.js) charges a guard's duel against any chest
  // within its activation radius, so what that radius covers is what the
  // loot costs. That charge now FADES with distance for an ordinary
  // creature — you can grab the loot and leave before it arrives — but the
  // Butcher is `speed` 2 and cannot be outrun, so inside its reach every
  // chest still costs the whole duel. An earlier layout left two chests
  // outside it to
  // grade the room; measured, those two were opened in 89.7% of vaults
  // against 39.2% for the guarded ones and the room stopped being a
  // barrier. One chest slipping out of reach brings that straight back.
  for (const state of vaultFloors()) {
    const boss = state.monsters.find((m) => m.vault);
    for (const chest of state.chests.filter((c) => c.vault)) {
      const away = Math.abs(chest.pos[0] - boss.pos[0]) + Math.abs(chest.pos[1] - boss.pos[1]);
      assert(away <= boss.activation,
        `a chest sits ${away} tiles from the Butcher, outside its reach of ${boss.activation}`);
    }
  }
});

test('the vault is laid out from its own door, not its rectangle', () => {
  // The door lands on any of the four sides, so "at the back" has to be
  // read from the doorway or it means a different corner every seed.
  for (const state of vaultFloors()) {
    const boss = state.monsters.find((m) => m.vault);
    const chests = state.chests.filter((c) => c.vault);
    const door = state.vault.door;
    const away = (pos) => Math.abs(pos[0] - door[0]) + Math.abs(pos[1] - door[1]);

    assert(away(boss.pos) > away(state.vault.room.center),
      'the Butcher is no further from the door than the centre is');

    for (const [x, y] of pillarsOf([state.vault.room.x1, state.vault.room.y1], VAULT_SIZE)) {
      assert(!chests.some((c) => c.pos[0] === x && c.pos[1] === y), 'a chest is inside a pillar');
      assert(boss.pos[0] !== x || boss.pos[1] !== y, 'the Butcher is inside a pillar');
    }
  }
});

test('the approach to the vault is a corridor, not a doorstep', () => {
  // D — a longer approach hides nothing (sight passes through walls) but it
  // makes ENTERING cost more without making the creature heavier, which
  // matters because a heavier creature is refused rather than fought.
  const lengths = vaultFloors().map((s) => s.vault.tunnel);
  const long = lengths.filter((n) => n >= 4).length;
  assert(long >= Math.ceil(lengths.length * 0.6),
    `only ${long}/${lengths.length} vaults got a corridor of 4 tiles or more`);
});

test('the Butcher cannot be woken from outside its room', () => {
  // At activation 12 it woke while the hero was still five tiles OUTSIDE
  // the door, so entering was never a decision. The engine's rule is
  // `path.length >= activation` (src/sim/monsters.js), and path length
  // counts both ends.
  for (const state of vaultFloors()) {
    const boss = state.monsters.find((m) => m.vault);
    const passable = playerPassable(state.map);
    const path = findPath(boss.pos, state.vault.door, passable);
    assert(path.length >= boss.activation,
      `standing in the doorway already wakes it (path ${path.length} vs activation ${boss.activation})`);
  }
});

test('what the vault pays is authored, not drawn', () => {
  // Same payout every seed. The bet is meant to be legible before it is
  // taken; if this ever starts varying, the choice stopped being informed.
  const payouts = new Set();
  for (const state of vaultFloors()) {
    payouts.add(state.chests.filter((c) => c.vault)
      .map((c) => c.drop.name).join(','));
  }
  assertEq(payouts.size, 1, `the vault paid differently across seeds: ${[...payouts]}`);
  assertEq([...payouts][0], VAULT_CHEST_ITEMS.join(','), 'wrong payout');
});

test('the vault creature is excluded from what the floor demands', () => {
  // Its mass (hp x (xp-1)) outweighs a whole ordinary floor-4 roster, so
  // counting it would read as the floor hiding everything in a side room,
  // and would break the monotonic-mass guarantee. Refusable mass belongs to
  // no zone's share.
  for (const state of vaultFloors()) {
    const withBoss = threatMass(state);
    const boss = state.monsters.find((m) => m.vault);
    const stripped = { ...state, monsters: state.monsters.filter((m) => !m.vault) };

    assertEq(withBoss, threatMass(stripped), 'the Butcher counted into threat mass');
    assertEq(spineShare(state), spineShare(stripped), 'the Butcher counted into spine share');
    assert(boss.hpMax * (boss.xp - 1) > withBoss,
      'the premise of this test is stale: the Butcher no longer outweighs its floor');
  }
});

test('small floors put everything on the spine', () => {
  // Below MIN_ROSTER_FOR_SIDE the split is too coarse to honour: one side
  // monster out of two is already half the mass. M17 raised floor 1's own
  // count to 5, at or above MIN_ROSTER_FOR_SIDE (4), so no real floor is
  // small enough for this any more — forced via an explicit override to
  // keep testing the gate itself, not a floor that happens to be tiny.
  for (let seed = 0; seed < 6; seed++) {
    const state = newGame(3400 + seed, { ...floorPlan(1), monsters: 2 });
    assertEq(spineShare(state), 1, 'a two-creature floor hid threat in a side room');
  }
});

// ***** M49 — the Butcher advertises its axe ***** //

test('the vault boss shows its drop; nothing else does', () => {
  let checked = 0;
  for (const state of vaultFloors()) {
    // Stand at the door: the room is meant to be judged from outside it.
    state.player = { ...state.player, pos: state.vault.door.slice() };
    const belief = foldBelief(emptyBelief(), observe(state));
    for (const m of belief.monsters.values()) {
      if (m.revealsDrop) {
        assert(m.drop && m.drop.name === VAULT_BOSS_DROP,
          `the boss revealed "${m.drop && m.drop.name}" instead of the ${VAULT_BOSS_DROP}`);
        checked++;
      } else {
        assert(!('drop' in m),
          `ordinary creature "${m.name}" leaked its drop — M28 reopened`);
      }
    }
  }
  assert(checked > 0, 'no vault put its boss within sight of its own door');
});

test('the visible axe is worth hp, and only against what is in sight', () => {
  // The price has to be a real number the bot could act on — a value that
  // rounds to zero is the same as not having built this.
  let priced = 0;
  for (const state of vaultFloors()) {
    state.player = {
      ...state.player, pos: state.vault.door.slice(), hp: 8, armour: 5,
      inventory: [{ dmg: 3, dmgMin: 0 }],
    };
    const belief = foldBelief(emptyBelief(), observe(state));
    const boss = [...belief.monsters.values()].find((m) => m.revealsDrop);
    if (!boss) continue;
    const worth = dropValue(belief, boss.drop);
    assert(worth > 0, 'the guaranteed axe priced at zero');
    assert(worth < duelCost(belief.player, boss).hpLost * 3,
      `the axe priced at ${worth.toFixed(1)} hp — implausibly above the fight it costs`);
    priced++;

    // An empty belief has nothing to kill, so a weapon saves nothing: the
    // value is measured against creatures IN SIGHT, never invented.
    const alone = { ...belief, monsters: new Map() };
    assertEq(dropValue(alone, boss.drop), 0,
      'a weapon was priced with no creature to use it on');
  }
  assert(priced > 0, 'no vault boss was visible from its own door');
});

// ***** chest quality by depth ***** //

test('quality 0 reproduces the shipped 1/value pool exactly', () => {
  // The switch-off guarantee: if this drifts, every measurement taken with
  // quality on is being compared against a baseline that no longer exists.
  const plain = itemWeights({}, 'chest');
  const q0 = itemWeights({}, 'chest', 0);
  assertEq(q0.length, plain.length, 'the pool changed size');
  for (let i = 0; i < plain.length; i++) {
    assertEq(q0[i][0], plain[i][0], 'the pool order changed');
    assert(Math.abs(q0[i][1] - plain[i][1]) < 1e-12, 'quality 0 changed a weight');
  }
});

test('quality makes the strong item the common one', () => {
  // Was 'depth makes the strong item the common one', read off the CHEST
  // source. M26 (docs/backlog.md) moved `weapon` — the only kind with more
  // than one member — off chests and onto monsters, so the tilt this test
  // exists to check has nothing left to bite on in 'chest'. Retargeted to
  // 'monster', where dagger/axe now live; the mechanism under test
  // (itemWeights' quality argument) is unchanged, only its source.
  const weightOf = (entries, name) => {
    const found = entries.find(([item]) => item && item.name === name);
    return found ? found[1] : 0;
  };
  const low = itemWeights({}, 'monster', 0);
  const high = itemWeights({}, 'monster', 1);

  // At quality 0 the axe (value 4) is rarer than the dagger (value 3).
  assert(weightOf(low, 'axe') < weightOf(low, 'dagger'),
    'the strong weapon was not the rare one at quality 0');
  // At quality 1 that inverts.
  assert(weightOf(high, 'axe') > weightOf(high, 'dagger'),
    'quality did not make the strong weapon the common one');
});

// ***** M19 — pay for the harder opening with loot ***** //

test('the early-chest quality boost is inert now that chests never hold a weapon', () => {
  // Was 'the early-chest quality boost makes floor 1 richer, and fades by
  // floor 10', read via axe share among CHEST drops. M26 (docs/backlog.md)
  // moved `weapon` off the chest source entirely — a chest's only
  // remaining kind (`armour`) has a single member (`shield`), so there is
  // nothing left for ANY quality tilt, boosted or not, to act on. This is
  // a real, disclosed side effect of M26, not an oversight: documents the
  // new invariant that the ORDINARY chest draw never hands out a weapon.
  //
  // An ARMED hero, deliberately, so M19's own guaranteed-dagger override
  // (4b — a real, intentional exception, not a bug) does not fire and
  // confound the read; that mechanism is checked on its own terms in
  // 'M19's guarantee only ever hands over a dagger' below.
  const carry = {
    hp: 8, hpMax: 10, armour: 0, xp: 1,
    inventory: [{ id: 'w1', name: 'axe', dmg: 2 }], kills: [], xpEarned: 0,
  };
  for (let seed = 0; seed < 20; seed++) {
    const state = newGame(940000 + seed,
      { ...floorPlan(1), earlyChestQualityBoost: EARLY_CHEST_QUALITY_BOOST, carry });
    assert(!state.chests.some((c) => c.drop && c.drop.dmg),
      `seed ${seed}: a chest held a weapon after M26 moved weapons to the monster source`);
  }
});

test('quality never changes how often a chest is empty', () => {
  // Quality tilts WHICH item comes out; scarcity alone decides whether one
  // comes out at all. If these ever couple, the scarcity dials stop meaning
  // what balance.md says they mean.
  const emptyAt = (q) => {
    const found = itemWeights({ weapon: 3, armour: 3 }, 'chest', q).find(([i]) => i === null);
    return found ? found[1] : 0;
  };
  assert(Math.abs(emptyAt(0) - emptyAt(1)) < 1e-12,
    'chest quality changed the empty share');
});

// ***** M26 — weapons come off creatures ***** //

test('itemWeights exclude is a filter, not a tilt', () => {
  // The property the whole item leans on: an excluded item is gone from
  // the pool, and its kind's mass falls entirely to whatever is left in
  // it — not merely underweighted, which quality alone could already do.
  const withAxe = itemWeights({}, 'monster', 1);
  const noAxe = itemWeights({}, 'monster', 1, ['axe']);

  const weightOf = (entries, name) => {
    const found = entries.find(([item]) => item && item.name === name);
    return found ? found[1] : 0;
  };
  assert(weightOf(noAxe, 'axe') === 0, 'axe survived its own exclusion');
  assertEq(noAxe.find(([i]) => i && i.name === 'dagger')[1],
    weightOf(withAxe, 'axe') + weightOf(withAxe, 'dagger'),
    'dagger did not absorb the excluded axe\'s entire share of the weapon kind');

  // Excluding an item in one kind should not touch other kinds. Monster's
  // own pool is weapon-only since M27 (nothing else to check this against
  // there any more), so this half reads against chest, which draws
  // armour AND potion since the same item — excluding shield must leave
  // potion's own weight untouched.
  const withShield = itemWeights({}, 'chest', 0);
  const noShield = itemWeights({}, 'chest', 0, ['shield']);
  const potionWeight = (entries) => entries.find(([i]) => i && i.name === 'health')[1];
  assertEq(potionWeight(withShield), potionWeight(noShield),
    'excluding armour changed potion\'s own weight');
});

test('a creature below WEAPON_AXE_MIN_TIER can never drop an axe', () => {
  const indexOf = (m) => MONSTER_TABLE.findIndex((t) => t.name === m.name);
  for (const level of [1, 3]) {
    const plan = floorPlan(level);
    const ceiling = Math.floor(plan.difficultyScale * (MONSTER_TABLE.length - 1));
    // A mechanism check, not a rate — only meaningful while the floor's own
    // ceiling genuinely cannot reach the threshold, which floors 1 and 3
    // satisfy under the shipped M25 curve. If that ever stops holding this
    // assert would be vacuous, so pin it down rather than assume it.
    assert(ceiling < WEAPON_AXE_MIN_TIER,
      `floor ${level}'s ceiling (${ceiling}) already reaches WEAPON_AXE_MIN_TIER — this test no longer isolates the filter`);
    for (let seed = 0; seed < 60; seed++) {
      const state = newGame(960000 + level * 1000 + seed, plan);
      for (const m of state.monsters) {
        if (m.drop && m.drop.name === 'axe') {
          assert(indexOf(m) >= WEAPON_AXE_MIN_TIER,
            `floor ${level} seed ${seed}: a tier-${indexOf(m)} ${m.name} dropped an axe, below WEAPON_AXE_MIN_TIER (${WEAPON_AXE_MIN_TIER})`);
        }
      }
    }
  }
});

test('a creature at or above WEAPON_AXE_MIN_TIER can drop an axe', () => {
  // The other half — "never below" is satisfiable by "never at all". Forced
  // to certainty (quality 1, no scarcity) rather than waiting on the
  // shipped rates, so this stays a fast, deterministic mechanism check.
  const template = MONSTER_TABLE[WEAPON_AXE_MIN_TIER];
  let sawAxe = false;
  for (let seed = 0; seed < 30; seed++) {
    const weights = itemWeights({}, 'monster', 1, []);
    const state = { rng: { spawn: seed + 1 } };
    const drop = drawWeighted(state, 'spawn', weights);
    if (drop && drop.name === 'axe') { sawAxe = true; break; }
  }
  assert(sawAxe,
    `axe never appeared for a tier-${WEAPON_AXE_MIN_TIER} (${template.name}) draw across 30 tries at quality 1`);
});

test('weapons no longer come from the ordinary chest draw', () => {
  // Chest kind is armour and (since M27) potion — never weapon. An armed
  // hero so M19's guaranteed-dagger override (a deliberate exception)
  // cannot confound the read.
  const carry = {
    hp: 8, hpMax: 10, armour: 0, xp: 1,
    inventory: [{ id: 'w1', name: 'axe', dmg: 2 }], kills: [], xpEarned: 0,
  };
  for (let level of [1, 5, 10]) {
    for (let seed = 0; seed < 20; seed++) {
      const state = newGame(961000 + level * 1000 + seed, { ...floorPlan(level), carry });
      assert(!state.chests.some((c) => c.drop && c.drop.dmg),
        `floor ${level} seed ${seed}: a chest held a weapon`);
    }
  }
});

// ***** M27 — chests hold armour and potions ***** //

test('potions no longer come from the ordinary monster draw', () => {
  // The mirror image of M27's chest-side check: monster kind is weapon
  // only, never potion, once potion moved the other way.
  for (const level of [1, 5, 10]) {
    for (let seed = 0; seed < 20; seed++) {
      const state = newGame(963000 + level * 1000 + seed, floorPlan(level));
      assert(!state.monsters.some((m) => m.drop && m.drop.heal),
        `floor ${level} seed ${seed}: a creature dropped a potion`);
    }
  }
});

test('a chest can hold a potion now', () => {
  // The other half — "never from monsters" is satisfiable by "nowhere at
  // all". A mechanism check across enough seeds and floors to be sure
  // it's structural, not luck.
  let sawPotion = false;
  outer:
  for (const level of [1, 5, 10]) {
    for (let seed = 0; seed < 40; seed++) {
      const state = newGame(964000 + level * 1000 + seed, floorPlan(level));
      if (state.chests.some((c) => c.drop && c.drop.heal)) { sawPotion = true; break outer; }
    }
  }
  assert(sawPotion, 'no chest ever held a potion across 120 floors sampled');
});

test('weapon supply was re-swept, not left to drift, when potion left the monster kind', () => {
  // The interaction M27's own comment in difficulty.js explains: removing
  // potion left weapon as monster's only kind, which doubles its
  // itemWeights shareEach (1/1 vs 1/2) independent of anything this item
  // is about. WEAPON_SCARCITY was raised 2 -> 4 to cancel it out — checked
  // here directly against the unweighted mass itemWeights would assign,
  // so a future change to the kind list is caught even before a full
  // simulation would show it.
  const weights = itemWeights({ weapon: WEAPON_SCARCITY }, 'monster', 0);
  const weaponMass = weights.reduce((s, [item, w]) => s + (item && item.kind === 'weapon' ? w : 0), 0);
  const expected = 1 / WEAPON_SCARCITY;
  assert(Math.abs(weaponMass - expected) < 1e-9,
    `weapon's total mass is ${weaponMass}, expected 1/WEAPON_SCARCITY (${expected}) now that weapon is monster's only kind`);
});

test('potion has its own scarcity dial, independent of armour', () => {
  // Split out per the item's own suggestion — checked directly so a future
  // edit that re-merges them back into shared SCARCITY breaks this rather
  // than silently changing chest economics no test was watching.
  const shipped = itemWeights({ armour: 3, potion: POTION_SCARCITY }, 'chest', 0);
  const potionMass = shipped.reduce((s, [item, w]) => s + (item && item.kind === 'potion' ? w : 0), 0);
  const expected = 0.5 / POTION_SCARCITY; // shareEach 1/2 (armour, potion) / scarcity
  assert(Math.abs(potionMass - expected) < 1e-9,
    `potion's total mass is ${potionMass}, expected shareEach/POTION_SCARCITY (${expected})`);
});

// ***** floor spread ***** //
//
// The whole mechanism rests on E[M] = 1: if the multiplier drifts, average
// difficulty drifts with it, and average difficulty is the one thing the
// spread work was forbidden from moving.

test('the floor multiplier has mean exactly 1', () => {
  for (const sigma of [0.2, 0.5, 0.81, 1.4]) {
    let sum = 0;
    const runs = 20000;
    const state = { rng: { spawn: 12345 } };
    for (let i = 0; i < runs; i++) sum += drawLogUniform(state, 'spawn', sigma);
    const mean = sum / runs;
    // sd of M is at most ~0.8 here, so the standard error over 20k draws is
    // under 0.006. A 2% window is generous and still catches any real bias.
    assert(Math.abs(mean - 1) < 0.02,
      `sigma ${sigma}: mean ${mean.toFixed(4)} is not 1`);
  }
});

test('zero spread returns exactly 1 and draws nothing', () => {
  // Must be a true no-op, or every measurement taken before spread existed
  // stops being comparable with one taken after it at sigma 0.
  const state = { rng: { spawn: 999 } };
  assertEq(drawLogUniform(state, 'spawn', 0), 1, 'sigma 0 changed the multiplier');
  assertEq(state.rng.spawn, 999, 'sigma 0 consumed a draw');
});

test('the multiplier stays positive at wide spread', () => {
  const state = { rng: { spawn: 4242 } };
  for (let i = 0; i < 500; i++) {
    const m = drawLogUniform(state, 'spawn', 2.5);
    assert(m > 0, 'the multiplier went non-positive');
  }
});

test('spread makes floor size vary, and deeper floors vary more', () => {
  const spreadOf = (level) => {
    const plan = floorPlan(level);
    const counts = new Set();
    for (let s = 0; s < 40; s++) counts.add(newGame(8800 + s, plan).monsters.length);
    return counts.size;
  };
  // Floor 1 has sigma 0 by design, so it is always its nominal size.
  assertEq(spreadOf(1), 1, 'floor 1 should be a fixed size');
  assert(spreadOf(10) > 4, 'floor 10 did not vary in size');
});

test('spread does not break determinism', () => {
  // An extra draw is still a seeded draw. If this ever fails the whole
  // replay system goes with it.
  const a = newGame(31415, floorPlan(9));
  const b = newGame(31415, floorPlan(9));
  assertEq(a.monsters.length, b.monsters.length, 'same seed gave different sizes');
  assertEq(JSON.stringify(a.monsters), JSON.stringify(b.monsters), 'rosters differ');
});

test('saturation is reported at the floor the table actually runs out', () => {
  // 0.35 x g^(N-1) >= 1 is where `min(1, depth * strength)` stops meaning
  // anything and the ramp dies. A sweep that does not know this is measuring
  // a dead scheme on its deepest floors.
  const fast = { strengthGrowth: 1.5 };
  const at = saturatedAt(fast, 10);
  assert(at !== null, 'a steep ramp should saturate inside ten floors');
  assert(floorStrength(at - 1, fast) >= 1, 'reported floor is not saturated');
  assert(floorStrength(at - 2, fast) < 1, 'saturation was reported a floor late');
});

test('the rebalanced constants hold the challenge budget, read from the generator itself', () => {
  // Not a claim that CHALLENGE (measured hp) is unchanged — that needs the
  // observed ruler and a real play-through, done separately and reported in
  // docs/backlog.md M7. This is the cheaper, always-available check: has the
  // per-floor climb drifted from what the pre-M7 baseline shipped?
  //
  // This used to be a PROXY —
  // `MONSTER_GROWTH_REBALANCED * STRENGTH_GROWTH_REBALANCED^2.356` — and a
  // formula that names two dials is blind to every dial it does not name.
  // M30 added a floor-1 tier clamp, the real climb moved, and this test did
  // not budge by a digit. docs/backlog.md M31; the fix is to stop
  // approximating and read the quantity itself.
  //
  // `expectedFloorMass` is the exact closed form the rest of this suite
  // already trusts, and it reads `floorParams` — so it sees EVERY dial,
  // including the ones nobody has written yet. Nothing to keep up to date,
  // and the fitted 2.356 exponent is no longer needed at all.
  //
  // Fitted over all ten floors rather than taken as
  // `expectedFloorMass(9) / expectedFloorMass(0)`: an endpoint ratio is
  // blind to anything that only lifts the MIDDLE of the ladder, and M13's
  // tier floor and M24's ceiling are exactly that. Measured while building
  // this — raising `TIER_FLOOR_SHARE_PER_LEVEL` from 0.08 to 0.30 changes
  // nine of the ten floor masses and leaves the endpoint reading identical
  // to four decimals, while the fit moves. Same quantity on a clean
  // geometric ladder; strictly more of the ladder read.
  //
  // The reference is the calibrated pre-M7 cost climb — ~1.3 per floor,
  // when strength was flat and cost growth WAS count growth — and the
  // tolerance is the same 15% M7 shipped with.
  const mass = [];
  for (let level = 0; level < 10; level++) mass.push(expectedFloorMass(level));
  // Log-linear fit over all ten floors (the old shape.js growthOf, inlined
  // when that module went): exp of the least-squares slope of log(mass).
  const logs = mass.map(Math.log);
  const n = logs.length;
  const meanX = (n - 1) / 2;
  const meanY = logs.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (logs[i] - meanY);
    den += (i - meanX) ** 2;
  }
  const growth = Math.exp(num / den);
  const COST_GROWTH_BUDGET = 1.3;
  const ratio = growth / COST_GROWTH_BUDGET;
  assert(Math.abs(ratio - 1) < 0.15,
    `generated mass climbs x${growth.toFixed(4)}/floor, ${(100 * (ratio - 1)).toFixed(1)}% off the shipped budget`);
});

test('the strength ramp does not saturate before floor 10', () => {
  // A ramp that hits the table ceiling early stops being a ramp — the
  // deepest floors would be indistinguishable from each other.
  const at = saturatedAt({}, 10);
  assert(at === null || at > 10, `the shipped ramp saturates at floor ${at}, inside the descent`);
});

test('clustering with size 1 reproduces independent placement exactly', () => {
  // The default clusters now that M7 is adopted (CLUSTER_SIZE=6), so this
  // no longer compares against "the default" — it compares two independent
  // constructions of "no clustering" at the shipped growth/strength:
  // floorPlan's shipped path with clusterSize overridden to 1, against
  // makeFloorPlan's general path fed the same adopted constants. Must be
  // byte-identical, monster for monster, position for position.
  const viaShipped = { ...floorPlan(5), clusterSize: 1 };
  const viaGeneral = makeFloorPlan({
    clusterSize: 1,
  })(5);
  const a = newGame(51015, viaShipped);
  const b = newGame(51015, viaGeneral);
  assertEq(JSON.stringify(a.monsters), JSON.stringify(b.monsters),
    'clusterSize 1 diverged between floorPlan and makeFloorPlan');
});

test('clustering pulls monsters together without changing how many spawn', () => {
  // The one property the item is FOR: same roster size, tighter packing.
  // Measured as mean nearest-neighbour distance among same-zone monsters,
  // which falls when clustered and is unaffected by which zone anything is
  // in (unlike a raw pair-count, which a spine/side-heavy split could skew).
  const meanNearestNeighbour = (monsters) => {
    if (monsters.length < 2) return Infinity;
    const dists = monsters.map((a) => Math.min(...monsters
      .filter((b) => b !== a)
      .map((b) => Math.abs(a.pos[0] - b.pos[0]) + Math.abs(a.pos[1] - b.pos[1]))));
    return dists.reduce((s, d) => s + d, 0) / dists.length;
  };

  let spreadTotal = 0;
  let clusteredTotal = 0;
  let floors = 0;
  for (let seed = 0; seed < 12; seed++) {
    const plan = { ...floorPlan(8), monsterSpread: 0 }; // fl 8: 13 monsters, room to cluster
    const spread = newGame(60000 + seed, { ...plan, clusterSize: 1 });
    const clustered = newGame(60000 + seed, { ...plan, clusterSize: 4 });
    if (spread.monsters.length < 4 || clustered.monsters.length < 4) continue;
    assertEq(spread.monsters.length, clustered.monsters.length,
      'clustering changed how many monsters spawned');
    spreadTotal += meanNearestNeighbour(spread.monsters);
    clusteredTotal += meanNearestNeighbour(clustered.monsters);
    floors++;
  }
  assert(floors >= 8, 'too few usable floors to trust the comparison');
  assert(clusteredTotal / floors < spreadTotal / floors,
    `clustering did not tighten packing: spread ${(spreadTotal / floors).toFixed(2)} `
    + `vs clustered ${(clusteredTotal / floors).toFixed(2)} mean nearest-neighbour distance`);
});

test('a clustered monster always keeps the zone it was placed in', () => {
  // The flood that grows a cluster is zone-filtered at every step — this
  // guards against a regression where a cluster spills from a side room
  // onto the spine (or back), which would corrupt R0 (only spine monsters
  // are mandatory) and the spine-mass acceptance target together.
  for (let seed = 0; seed < 8; seed++) {
    const state = newGame(61000 + seed, { ...floorPlan(8), clusterSize: 5 });
    const zones = classifyRooms(state.map, state.player.pos, state.shrine.pos);
    for (const m of state.monsters) {
      assertEq(m.side, zones.isSide(m.pos),
        `monster ${m.id} on floor seed ${seed} has side=${m.side} but sits in a `
        + `${zones.isSide(m.pos) ? 'side' : 'spine'} tile`);
    }
  }
});

test('the shipped cluster size actually clusters', () => {
  // Guards CLUSTER_SIZE from drifting back to 1 by accident, which would
  // silently turn the rebalance's third lever into a no-op while the other
  // two kept moving — exactly the kind of partial, uninterpretable state
  // the budget rule exists to prevent.
  assert(CLUSTER_SIZE > 1, `CLUSTER_SIZE is ${CLUSTER_SIZE} — grouping would do nothing`);
});

test('a cluster too big for the map degrades instead of hanging or crashing', () => {
  // clusterSize larger than the whole floor's free-tile budget must still
  // terminate and place SOME monsters, not spin or throw.
  const state = newGame(62000, { ...floorPlan(3), clusterSize: 999 });
  assert(state.monsters.length > 0, 'no monsters placed at all with an oversized cluster');
});

// ***** the out-of-depth tail ***** //

test('the tail is zero on floor 1, rising and capped below certainty', () => {
  // What this protects is the SHAPE, which is what keeps the tail a rare
  // shock rather than a routine one.
  assertEq(floorParams(0).outOfDepthChance, 0,
    'floor 1 must never roll an out-of-depth creature — nothing is out of depth at the top');

  let previous = -1;
  for (let level = 0; level < 10; level++) {
    const chance = floorParams(level).outOfDepthChance;
    assert(chance >= previous, `floor ${level + 1} chance ${chance} fell below floor ${level}'s`);
    assert(chance <= OUT_OF_DEPTH_CHANCE_CAP,
      `floor ${level + 1} chance ${chance} exceeded the cap ${OUT_OF_DEPTH_CHANCE_CAP}`);
    assert(chance < 0.5,
      `floor ${level + 1} chance ${chance} is no longer a TAIL — the median floor would feel it`);
    previous = chance;
  }
});

test('the tail is the only route to an above-tier creature on mid floors', () => {
  // The interaction that un-archived this item: M24 clamps the ordinary
  // drawn slot, so with the tail off nothing on floors 2-7 can exceed the
  // floor's own ceiling index. That is what makes a deliberate 8% tail
  // visible instead of lost against a 25% background of routine wolves and
  // ogres. Floor 10 is excluded — M24 allows one index of slack that deep,
  // so it has its own above-tier source and this property is not expected
  // to hold there.
  const indexOf = (m) => MONSTER_TABLE.findIndex((t) => t.name === m.name);
  for (const level of [2, 4, 6]) {
    const plan = floorPlan(level);
    const ceiling = Math.floor(plan.difficultyScale * (MONSTER_TABLE.length - 1));
    for (let seed = 0; seed < 40; seed++) {
      const off = newGame(96500 + level * 1000 + seed, { ...plan, outOfDepthChance: 0 });
      assert(!off.monsters.some((m) => indexOf(m) > ceiling),
        `floor ${level} seed ${seed}: an above-tier creature appeared with the tail OFF`);
    }
  }
});

test('the tail actually fires, and reaches above the floor it fires on', () => {
  // The other half — "only route" is satisfiable by there being no route.
  // Forced to certainty rather than waiting on the shipped rate, so this
  // stays a fast deterministic check of the MECHANISM; the shipped RATE is
  // shape-checked above and its effect measured in docs/balance.md.
  const indexOf = (m) => MONSTER_TABLE.findIndex((t) => t.name === m.name);
  const plan = floorPlan(5);
  const ceiling = Math.floor(plan.difficultyScale * (MONSTER_TABLE.length - 1));
  let sawAbove = 0;
  for (let seed = 0; seed < 40; seed++) {
    const on = newGame(96600 + seed, { ...plan, outOfDepthChance: 1 });
    if (on.monsters.some((m) => indexOf(m) > ceiling)) sawAbove++;
    assertEq(on.monsters.length, newGame(96600 + seed, { ...plan, outOfDepthChance: 0 }).monsters.length,
      `seed ${seed}: the tail changed the roster SIZE — it must reskin, not add`);
  }
  assert(sawAbove >= 35,
    `the tail fired on only ${sawAbove}/40 floors at chance 1 — it should reskin every time`);
});

test('zero chance draws nothing extra', () => {
  // The strongest form of "off means off": omitting outOfDepthChance and
  // passing it explicitly as 0 must be RNG-identical, monster for monster —
  // proof that a chance of 0 skips the roll rather than making a draw that
  // always fails. If this ever regresses, every floor after this one in a
  // dungeon shifts, because the whole rest of that floor's RNG stream moves.
  const withOmitted = newGame(63000, floorPlan(6));
  const withZero = newGame(63000, { ...floorPlan(6), outOfDepthChance: 0 });
  assertEq(JSON.stringify(withOmitted.monsters), JSON.stringify(withZero.monsters),
    'an explicit outOfDepthChance of 0 changed generation');
});

test('the chance grows with depth and stays capped', () => {
  assertEq(outOfDepthChanceAt(0), 0, 'floor 1 is not zero — nothing should be out of depth yet');
  const nine = outOfDepthChanceAt(9);
  assert(nine > outOfDepthChanceAt(0), 'chance did not grow from floor 1 to floor 10');
  assert(nine <= 0.15 + 1e-9, `chance ${nine} exceeded its cap`);
  assertEq(outOfDepthChanceAt(50), outOfDepthChanceAt(9),
    'chance kept climbing past its cap on a very deep floor');
});

test('a fired roll swaps one monster without changing the roster size', () => {
  // outOfDepthChance: 1 forces the roll to fire every time — the
  // deterministic case, for a test that does not depend on luck.
  const before = newGame(64000, floorPlan(5));
  const after = newGame(64000, { ...floorPlan(5), outOfDepthChance: 1 });
  assertEq(after.monsters.length, before.monsters.length,
    'a fired roll changed how many monsters spawned');
  const beforeXp = before.monsters.map((m) => m.xp).sort();
  const afterXp = after.monsters.map((m) => m.xp).sort();
  assert(JSON.stringify(beforeXp) !== JSON.stringify(afterXp),
    'forcing the roll to fire did not change any monster\'s tier');
});

test('a fired roll reaches near the top of the table', () => {
  // monsterWeightsAround(top) puts most of its weight on the top slot and
  // its two neighbours below — so on floor 5, where the normal per-cluster
  // draw cannot reach that high on its own (difficultyScale is nowhere near
  // 1 that shallow), a forced roll should still land there almost every
  // time. Checking the floor's own max xp rather than diffing against an
  // unforced roll sidesteps having to identify which monster was the one
  // that got swapped.
  const threshold = MONSTER_TABLE[MONSTER_TABLE.length - 3].xp;
  let reached = 0;
  const seeds = 20;
  for (let seed = 0; seed < seeds; seed++) {
    const after = newGame(65000 + seed, { ...floorPlan(5), outOfDepthChance: 1 });
    const maxXp = Math.max(...after.monsters.map((m) => m.xp));
    if (maxXp >= threshold) reached++;
  }
  assert(reached >= seeds * 0.7,
    `only ${reached}/${seeds} forced rolls reached near the table's top`);
});

// ***** M11 — floor n+1 is never easier than floor n ***** //

test('expected floor mass never drops across the descent', () => {
  // BY CONSTRUCTION, not on average: expectedFloorMass is an exact closed
  // form (count x expected tier mass, integrated over depth), so this is
  // never subject to the sampling noise a real played probe carries.
  let prev = -Infinity;
  for (let level = 0; level < 10; level++) {
    const mass = expectedFloorMass(level);
    assert(mass >= prev - 1e-9,
      `floor ${level + 1} expected mass ${mass.toFixed(2)} is below `
      + `floor ${level} at ${prev.toFixed(2)}`);
    prev = mass;
  }
});

test('the closed form agrees with a Monte Carlo cross-check', () => {
  // Guards the exact integration itself, independent of the monotonicity
  // property above: reimplements "one creature's expected mass at this
  // scale" as a plain average over many depths (a fixed grid, not RNG — this
  // stays deterministic) and checks it lands close to expectedFloorMass's
  // closed form. A bug in the bucket-width maths would show up here even if
  // it happened to leave monotonicity intact.
  const mass = (t) => t.hp * Math.max(0, t.xp - 1);
  const sampledMonsterMass = (scale, minIndex, maxIndex, samples = 5000) => {
    let sum = 0;
    for (let i = 0; i < samples; i++) {
      const depth = (i + 0.5) / samples;
      const index = Math.floor(Math.min(1, depth * scale) * (MONSTER_TABLE.length - 1));
      const entries = monsterWeightsAround(index);
      const total = entries.reduce((s, [, w]) => s + w, 0);
      // Clamp each slot in the blend, not the centre index — matches
      // spawn.js: the centre alone cannot exclude a rat (M13), admit a
      // wolf/ogre (M24), or leave floor 1 too close to floor 2 (M30),
      // since the ±2 spread reaches past the centre either way.
      sum += entries.reduce(
        (s, [slot, w]) => s + w * mass(MONSTER_TABLE[Math.min(maxIndex, Math.max(slot, minIndex))]), 0,
      ) / total;
    }
    return sum / samples;
  };

  for (const level of [0, 4, 9]) {
    const p = floorParams(level);
    const ceilingIndex = Math.floor(p.difficultyScale * (MONSTER_TABLE.length - 1));
    const minIndex = Math.floor(p.tierFloorShare * ceilingIndex);
    const maxIndex = Math.max(minIndex,
      Math.min(MONSTER_TABLE.length - 1, ceilingIndex + p.tierSlack));
    const sampled = p.monsters * sampledMonsterMass(p.difficultyScale, minIndex, maxIndex);
    const closedForm = expectedFloorMass(level);
    const gap = Math.abs(sampled - closedForm) / closedForm;
    assert(gap < 0.01,
      `floor ${level + 1}: closed form ${closedForm.toFixed(3)} vs sampled `
      + `${sampled.toFixed(3)}, ${(100 * gap).toFixed(2)}% apart`);
  }
});

// ***** M13 — the tier floor rises with depth ***** //

test('the lowest tier seen rises across floors 1, 5 and 10', () => {
  // Simulated, not the closed form — this is exactly what a player (or the
  // bot) would encounter, seed after seed. Table INDEX, not xp — M18 gave
  // the table's weakest row (still index 0, still named rat) xp 2, so xp
  // is no longer a proxy for "the bottom tier" the way it used to be.
  const indexOf = (m) => MONSTER_TABLE.findIndex((t) => t.name === m.name);
  const lowestSeen = (level, seeds = 40) => {
    let lowest = Infinity;
    for (let seed = 0; seed < seeds; seed++) {
      const state = newGame(90000 + seed, floorPlan(level));
      for (const m of state.monsters) lowest = Math.min(lowest, indexOf(m));
    }
    return lowest;
  };

  const fl1 = lowestSeen(1);
  const fl5 = lowestSeen(5);
  const fl10 = lowestSeen(10);
  assertEq(fl1, 0, 'floor 1 should still be able to roll the table\'s bottom row (index 0)');
  assert(fl5 > fl1, `floor 5's lowest tier (index ${fl5}) did not rise above floor 1's (index ${fl1})`);
  assert(fl10 > fl5, `floor 10's lowest tier (index ${fl10}) did not rise above floor 5's (index ${fl5})`);
});

test('the bottom tier does not survive past some floor', () => {
  // "No index-0 creature at all past some floor" — checked by table INDEX,
  // not xp (M18: the bottom row's xp is 2 now, not a unique marker any
  // more). Finds the shallowest floor whose minIndex guarantees this (>= 1,
  // since the final slot is clamped up to it — see spawn.js), then
  // simulates every floor from there to 10 to confirm it actually holds.
  const indexOf = (m) => MONSTER_TABLE.findIndex((t) => t.name === m.name);
  let threshold = null;
  for (let level = 0; level < 10; level++) {
    const p = floorParams(level);
    const ceilingIndex = Math.floor(p.difficultyScale * (MONSTER_TABLE.length - 1));
    const minIndex = Math.floor(p.tierFloorShare * ceilingIndex);
    if (minIndex >= 1) { threshold = level + 1; break; }
  }
  assert(threshold !== null, 'no floor in the descent ever excludes the bottom tier');

  for (let floor = threshold; floor <= 10; floor++) {
    for (let seed = 0; seed < 30; seed++) {
      const state = newGame(92000 + floor * 1000 + seed, floorPlan(floor));
      assert(!state.monsters.some((m) => indexOf(m) === 0),
        `the bottom tier appeared at floor ${floor} (>= threshold ${threshold}), seed ${seed}`);
    }
  }
});

test('the tier floor never exceeds the tier ceiling', () => {
  // By construction, checked directly: minIndex is a SHARE of the
  // ceiling's own index, so it can never climb past it, at any floor.
  for (let level = 0; level < 10; level++) {
    const p = floorParams(level);
    const ceilingIndex = Math.floor(p.difficultyScale * (MONSTER_TABLE.length - 1));
    const minIndex = Math.floor(p.tierFloorShare * ceilingIndex);
    assert(minIndex <= ceilingIndex,
      `floor ${level + 1}: tier floor ${minIndex} exceeds its own ceiling ${ceilingIndex}`);
  }
});

// ***** M24 — the ceiling is a centre, not a cap ***** //

test('the highest tier seen at floor 1 drops by two indices', () => {
  // Simulated, not the closed form — the same "what a player would actually
  // encounter" check as M13's mirror-image test above. Before this item,
  // MONSTER_WEIGHTS's own ±2 spread let floor 1 (centre index 3) reach
  // index 5 (ogre) — wolf and ogre are the two indices this item exists to
  // exclude, and excluding both is exactly a drop of two.
  const indexOf = (m) => MONSTER_TABLE.findIndex((t) => t.name === m.name);
  const highestSeen = (level, seeds = 60) => {
    let highest = -1;
    for (let seed = 0; seed < seeds; seed++) {
      const state = newGame(93000 + level * 1000 + seed, floorPlan(level));
      for (const m of state.monsters) highest = Math.max(highest, indexOf(m));
    }
    return highest;
  };

  const p1 = floorParams(0);
  const ceilingIndex1 = Math.floor(p1.difficultyScale * (MONSTER_TABLE.length - 1));
  const fl1 = highestSeen(1);
  assertEq(fl1, ceilingIndex1,
    `floor 1's highest tier seen (index ${fl1}) should sit exactly at its ceiling (index ${ceilingIndex1}), zero slack`);
  assert(ceilingIndex1 + 2 - fl1 === 2,
    `floor 1 did not drop by two indices from the old unclamped reach (ceiling + 2)`);
});

test('slack only pulls the ceiling below the centre on floor 1', () => {
  // The band's one signed number: negative exactly at the shallow end
  // (the early cut), never after it.
  for (let level = 0; level < 10; level++) {
    const p = floorParams(level);
    if (level === 0) assert(p.tierSlack < 0, 'floor 1 lost its early cut');
    else assert(p.tierSlack >= 0, `floor ${level + 1} carries a negative slack`);
  }
});

// ***** M30 — floor 1 must cost less than floor 2, exactly ***** //

test('expectedFloorMass says floor 1 costs meaningfully less than floor 2', () => {
  // The exact check the item asked for, first — no seeds, no z-score.
  // Target margin: floor 1 at most 3/4 of floor 2's mass. Measured lands
  // near 70% (see docs/backlog.md M30) — asserting inside the target
  // rather than the exact figure, so a future retune of unrelated dials
  // (count, strength) does not break this on drift alone.
  const m1 = expectedFloorMass(0);
  const m2 = expectedFloorMass(1);
  assert(m1 < m2, `floor 1 mass (${m1.toFixed(2)}) is not below floor 2's (${m2.toFixed(2)})`);
  assert(m1 <= 0.75 * m2,
    `floor 1 mass (${m1.toFixed(2)}) is more than 75% of floor 2's (${m2.toFixed(2)}) — too close`);
});

test('the early cut applies to floor 1 alone', () => {
  // Structural: EARLY_TIER_CUT only ever subtracts at level 0, so this is
  // the fade M30 asked for — floor 1 specifically, never a general
  // early-game softening.
  assert(floorParams(0).tierSlack <= -1, 'floor 1 carries no cut at all — the mechanism is inert');
  assertEq(floorParams(1).tierSlack, 0, 'floor 2 still carries a cut');
});

test('floor 1\'s ordinary creatures respect the new cap — the shrine guardian is the one named exception', () => {
  // M14's guardian is deliberately boosted to at or above the floor's own
  // ceilingIndex (spawn.js step 7), independent of the ordinary per-
  // cluster clamp this item tightens — found while writing this item's own
  // "highest tier seen" check, which stayed at the OLD ceiling (2) even
  // after the cap shipped, because the guardian was what it was seeing.
  // Excluding the guardian (identified the same way spawn.js does — the
  // one adjacent to the shrine) is what actually exercises the new cap.
  const indexOf = (m) => MONSTER_TABLE.findIndex((t) => t.name === m.name);
  const p1 = floorParams(0);
  const ceilingIndex1 = Math.floor(p1.difficultyScale * (MONSTER_TABLE.length - 1));
  const cappedMax = ceilingIndex1 - 1; // the cut this item ships: exactly one index
  let highestOrdinary = -1;
  let sawAGuardianAboveTheCap = false;
  for (let seed = 0; seed < 60; seed++) {
    const state = newGame(93000 + 1000 + seed, floorPlan(1));
    const shrine = state.shrine.pos;
    for (const m of state.monsters) {
      const isGuardian = Math.abs(m.pos[0] - shrine[0]) + Math.abs(m.pos[1] - shrine[1]) === 1;
      if (isGuardian) {
        if (indexOf(m) > cappedMax) sawAGuardianAboveTheCap = true;
      } else {
        highestOrdinary = Math.max(highestOrdinary, indexOf(m));
      }
    }
  }
  assertEq(highestOrdinary, cappedMax,
    `floor 1's highest ordinary (non-guardian) tier seen is ${highestOrdinary}, expected exactly the capped ${cappedMax}`);
  assert(sawAGuardianAboveTheCap,
    'no shrine guardian on floor 1 ever exceeded the ordinary cap — the documented exception did not reproduce');
});

test('no floor in the descent is weaker than the one above it', () => {
  // The shape complaint this item exists to fix: the old ramp had floor 4
  // land BELOW floor 3. Read off the modelled ceiling index rather than a
  // sampled roster, so this is exact and cannot fail on noise.
  let previous = -1;
  for (let level = 0; level < 10; level++) {
    const scale = floorParams(level).difficultyScale;
    const ceilingIndex = Math.floor(scale * (MONSTER_TABLE.length - 1));
    assert(ceilingIndex >= previous,
      `floor ${level + 1} reaches index ${ceilingIndex}, below floor ${level}'s ${previous}`);
    previous = ceilingIndex;
  }
});

// ***** M17 — a near-flat roster, with strength carrying the difficulty ***** //
//
// M12's own "always at least as full as the pre-M12 baseline" test lived
// here and is gone, not patched: M17 REPLACES M12's setting rather than
// building on it, and its whole point is trading count for strength, so
// floors 8-10 now hold FEWER creatures than M12 shipped, not more — the
// old test's claim is false by design, not by a bug. The M7 budget-ratio
// check it duplicated already re-validates automatically against whatever
// is live — see "the rebalanced constants hold the challenge budget".

test('creature count lands near the M29 target: ~4, ~5, ~8', () => {
  // Was "~5, ~6, ~8" (M17). M29 lowered MONSTERS_BASE 5 -> 4 to soften
  // floor 1 with GUARANTEE_FIRST_WEAPON off, re-solving the growth rate to
  // keep floor 10 pinned at the same 8 M17 already targeted — only the
  // floors near the top move.
  const fl1 = monstersAt(MONSTERS_BASE, MONSTER_GROWTH, 0);
  const fl5 = monstersAt(MONSTERS_BASE, MONSTER_GROWTH, 4);
  const fl10 = monstersAt(MONSTERS_BASE, MONSTER_GROWTH, 9);
  assertEq(fl1, 4, `floor 1 holds ${fl1}, not the targeted 4`);
  assert(fl5 >= 4 && fl5 <= 6, `floor 5 holds ${fl5}, not near the targeted 5`);
  assertEq(fl10, 8, `floor 10 holds ${fl10}, not the pinned 8`);
});

test('cluster size grew alongside creature count', () => {
  assert(CLUSTER_SIZE >= 10, `CLUSTER_SIZE is ${CLUSTER_SIZE}, expected the M12 raise to at least 10`);
});

// ***** M14 — a guardian at the shrine ***** //

test('every floor has exactly one guardian at the shrine, at or above every other creature', () => {
  const indexOf = (m) => MONSTER_TABLE.findIndex((t) => t.name === m.name);
  for (const level of [1, 5, 10]) {
    for (let seed = 0; seed < 20; seed++) {
      const state = newGame(94000 + level * 1000 + seed, floorPlan(level));
      const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        .map(([dx, dy]) => [state.shrine.pos[0] + dx, state.shrine.pos[1] + dy]);
      const guardians = state.monsters.filter((m) => neighbours
        .some((pos) => pos[0] === m.pos[0] && pos[1] === m.pos[1]));
      assertEq(guardians.length, 1,
        `floor ${level} seed ${seed}: expected exactly one guardian, found ${guardians.length}`);
      const guardIndex = indexOf(guardians[0]);
      for (const m of state.monsters) {
        assert(indexOf(m) <= guardIndex,
          `floor ${level} seed ${seed}: ${m.name} outranks the guardian (${guardians[0].name})`);
      }
    }
  }
});

test('the guardian replaces a roster member rather than adding one', () => {
  // monsterSpread forced to 0 so the nominal count is exact, not a range —
  // isolates the guardian mechanism from the unrelated count-roll variance.
  for (const level of [1, 5, 10]) {
    const plan = { ...floorPlan(level), monsterSpread: 0 };
    for (let seed = 0; seed < 10; seed++) {
      const state = newGame(95000 + level * 1000 + seed, plan);
      assertEq(state.monsters.length, plan.monsters,
        `floor ${level} seed ${seed}: roster size changed (got ${state.monsters.length}, `
        + `expected ${plan.monsters})`);
    }
  }
});

// ***** M15 — loot rooms have a guard ***** //

test('chest guard coverage is high at floor 10, and floor 1 no longer falls short', () => {
  // "High and roughly flat" was the item's hope; when M15 landed, floor 1
  // fell well short (~56% at this radius) with only 2-3 creatures against 6
  // flat chests, and this item only reuses the roster rather than adding to
  // it (M12's budget, not this one's). M17 later raised floor 1 to ~5
  // creatures, and docs/backlog.md M23 shrank the mandatory path — both put
  // more of a small floor's ground within reach of the roster the guard
  // mechanism has to work with. Measured now: floor 1 saturates alongside
  // floor 10 rather than trailing it, so both get the same "high" bar
  // rather than a fragile floor10-beats-floor1 comparison between two
  // numbers pinned near the same ceiling.
  const guardedFraction = (level, seeds = 40) => {
    let guarded = 0;
    let total = 0;
    for (let seed = 0; seed < seeds; seed++) {
      const state = newGame(97000 + level * 1000 + seed, floorPlan(level));
      for (const chest of state.chests) {
        total++;
        if (state.monsters.some((m) => Math.abs(m.pos[0] - chest.pos[0])
          + Math.abs(m.pos[1] - chest.pos[1]) <= CHEST_GUARD_RADIUS)) guarded++;
      }
    }
    return guarded / total;
  };

  const fl1 = guardedFraction(1);
  const fl10 = guardedFraction(10);
  assert(fl10 >= 0.9, `floor 10 guard coverage ${(100 * fl10).toFixed(0)}% is not "high"`);
  assert(fl1 >= 0.9, `floor 1 guard coverage ${(100 * fl1).toFixed(0)}% is not "high" any more`);
});

test('a chest guard never empties a small floor\'s spine into the side', () => {
  // The most exposed pre-existing invariant this item could have broken:
  // relocating a monster to guard a chest must never cross the spine/side
  // line, since below MIN_ROSTER_FOR_SIDE every creature is spine by
  // construction and must stay that way. M17 raised floor 1's own count to
  // 5, at or above MIN_ROSTER_FOR_SIDE, so this is forced via an explicit
  // override rather than relying on a floor that happens to be tiny.
  for (let seed = 0; seed < 20; seed++) {
    const state = newGame(99000 + seed, { ...floorPlan(1), monsters: 2 });
    assertEq(spineShare(state), 1,
      `seed ${seed}: a chest guard moved a floor-1 creature into a side room`);
  }
});

// ***** the hub layout (src/sim/layout-hub.js) ***** //

// THE ONE GUARANTEE ROT GAVE FOR FREE. The Digger only ever attaches a
// feature to a wall of something already dug, so its floors are connected
// by construction — measured, zero islanded rooms in 3000. A layout that
// COMPUTES positions has no such property, and a room nobody can reach is
// a floor where loot, and possibly the exit, sits behind nothing.
//
// docs/project/dcss-layouts.md: DCSS validates connectivity after building
// and vetoes the level when it fails. This is the cheap version — assert it
// never fails in the first place.
test('every room the hub layout places is reachable from every other', () => {
  const walkable = (map, x, y) => ['room', 'door', 'corridor'].includes(tileAt(map, x, y));
  for (const [branches, rings, size] of [
    [2, 1, 32], [4, 1, 32], [6, 1, 32], [4, 2, 44], [6, 2, 44],
  ]) {
    for (let seed = 1; seed <= 40; seed++) {
      const map = generateMap(seed * 7919, size, {
        layout: 'hub', hubBranches: branches, hubRings: rings,
      });
      // Flood from the first walkable tile there is.
      let start = null;
      for (let y = 0; y < map.h && !start; y++) {
        for (let x = 0; x < map.w; x++) {
          if (walkable(map, x, y)) { start = [x, y]; break; }
        }
      }
      assert(start, `seed ${seed} at ${size}/${branches}/${rings} dug nothing at all`);
      const seen = new Set([start.join(',')]);
      const queue = [start];
      while (queue.length) {
        const [x, y] = queue.pop();
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
          const key = (x + dx) + ',' + (y + dy);
          if (seen.has(key) || !walkable(map, x + dx, y + dy)) continue;
          seen.add(key);
          queue.push([x + dx, y + dy]);
        }
      }
      for (const room of map.rooms) {
        let reached = false;
        for (let x = room.x1; x <= room.x2 && !reached; x++) {
          for (let y = room.y1; y <= room.y2; y++) {
            if (seen.has(x + ',' + y)) { reached = true; break; }
          }
        }
        assert(reached, `${size}/${branches}/${rings} seed ${seed}: a room is walled off`);
      }
    }
  }
});

// The point of the layout is that the shape is CHOSEN. If the arms silently
// go missing the floor is a chain again, which is the thing the Digger was
// already doing and the reason this file exists.
test('the hub places the arms it was asked for', () => {
  for (const [branches, rings, size] of [[3, 1, 32], [5, 1, 32], [5, 2, 44]]) {
    let total = 0;
    for (let seed = 1; seed <= 40; seed++) {
      total += generateMap(seed * 7919, size, {
        layout: 'hub', hubBranches: branches, hubRings: rings,
      }).rooms.length;
    }
    const want = 1 + branches * rings;
    const got = total / 40;
    assert(got >= want - 0.5,
      `${size}/${branches}/${rings}: wanted ~${want} rooms, averaged ${got.toFixed(1)}`);
  }
});

// ***** M16 — bigger rooms, shorter corridors ***** //

test('rooms are bigger than the old default, and spine share holds in band', () => {
  // Room area straight from the shipped map — the same generateMap() the
  // real game calls, not a fresh ROT.Digger instance. The old default (no
  // roomWidth/roomHeight passed at all) measured ~22 tiles/room; this only
  // has to clear that by a wide margin, not hit an exact number.
  const roomArea = (r) => (r.x2 - r.x1 + 1) * (r.y2 - r.y1 + 1);
  let areaSum = 0;
  let areaN = 0;
  for (let seed = 0; seed < 30; seed++) {
    const state = newGame(910000 + seed, floorPlan(5));
    for (const r of state.map.rooms) { areaSum += roomArea(r); areaN++; }
  }
  const meanArea = areaSum / areaN;
  assert(meanArea >= 30, `mean room area ${meanArea.toFixed(1)} did not clear the old ~22-tile default`);

  // Below MIN_ROSTER_FOR_SIDE the split is not attempted at all — spine
  // share pinned at 1 there is correct, not a band violation (see "small
  // floors put everything on the spine"). Only check the band where the
  // split is actually asked for.
  for (let level = 1; level <= 10; level++) {
    if (floorPlan(level).monsters < MIN_ROSTER_FOR_SIDE) continue;
    let total = 0;
    const n = 25;
    for (let seed = 0; seed < n; seed++) {
      total += spineShare(newGame(920000 + level * 1000 + seed, floorPlan(level)));
    }
    const mean = total / n;
    assert(mean >= 0.6 && mean <= 0.95,
      `floor ${level} spine share ${mean.toFixed(2)} fell outside the [0.6, 0.95] band`);
  }
});

// ***** M23 — a distant shrine, not the furthest possible one ***** //

test('the hero always lands on a room centre, never a corridor', () => {
  // The half of M20 that M23 explicitly keeps.
  for (let seed = 0; seed < 15; seed++) {
    const state = newGame(960000 + seed, floorPlan(5));
    const onARoomCentre = state.map.rooms.some((room) => posKey(room.center) === posKey(state.player.pos));
    assert(onARoomCentre, `seed ${seed}: hero did not land on a room centre`);
  }
});

test('the shrine is not always the single furthest room any more', () => {
  // M20 put the shrine at the map's global-maximum room pair every time —
  // maximising the path IS maximising the spine share, the same quantity
  // twice. M23 draws it from the distant tail instead, so across enough
  // seeds it should land short of the true maximum at least sometimes.
  let sawShortOfMax = false;
  for (let seed = 0; seed < 30; seed++) {
    const state = newGame(960000 + seed, floorPlan(5));
    const passable = playerPassable(state.map);
    let maxLen = 0;
    for (const room of state.map.rooms) {
      const path = findPath(state.player.pos, room.center, passable);
      if (path.length > maxLen) maxLen = path.length;
    }
    const actual = findPath(state.player.pos, state.shrine.pos, passable).length;
    assert(actual <= maxLen, `seed ${seed}: shrine path ${actual} exceeds the map's actual furthest room ${maxLen}`);
    if (actual < maxLen) sawShortOfMax = true;
  }
  assert(sawShortOfMax, 'the shrine landed on the single furthest room every time across 30 seeds');
});

// ***** B3: the bot commits instead of pacing ***** //
//
// docs/backlog.md B3. The bot walked back and forth between two tiles. Each
// of these puts it in a situation the real runs produce, and asserts the one
// thing the item was for: the action sequence does not alternate.

// Reversals in a sequence of actions — the same definition REVERSAL_PENALTY
// and run-check's `reversalRate` both use.
function reversalsIn(actions) {
  const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
  let n = 0;
  for (let i = 1; i < actions.length; i++) {
    if (actions[i] === opposite[actions[i - 1]]) n++;
  }
  return n;
}

// Drives the real bot against a hand-built state and returns what it did.
function driveBot(state, turns, botOptions = {}) {
  let observation = observe(state);
  let belief = foldBelief(emptyBelief(), observation);
  const bot = makeBot({ monsterCount: 0, ...botOptions });
  const actions = [];

  for (let i = 0; i < turns && !state.outcome; i++) {
    const action = bot(belief, observation);
    actions.push(action);
    const result = step(state, action);
    state = result.state;
    observation = result.observation;
    belief = foldBelief(belief, observation);
  }
  return { actions, state };
}

test('two equidistant chests do not make the bot pace between them', () => {
  // A straight corridor with a chest six tiles out on either side. Both are
  // inside VISIBLE_DIST, both are worth the same, and the walk to each costs
  // the same — so the ranking is a coin flip that flips back the moment the
  // bot takes a step, which is exactly how the ~7-11% goal-switching share
  // of the ping-pong episodes arose in the old bot (decisions.md).
  const map = tinyMap([
    '#####################',
    '#-------------------#',
    '#####################',
  ]);
  const state = makeState({
    map,
    playerPos: [10, 1],
    chests: [
      { id: 'c-left', name: 'chest', emoji: '📦', pos: [4, 1], side: false, edge: false, drop: null },
      { id: 'c-right', name: 'chest', emoji: '📦', pos: [16, 1], side: false, edge: false, drop: null },
    ],
  });

  // Six turns is exactly the walk to whichever chest it picks. Running
  // longer would count the honest turnaround towards the SECOND chest, once
  // the first is dealt with, as a reversal.
  const { actions } = driveBot(state, 6);
  assertEq(reversalsIn(actions), 0,
    `the bot paced instead of committing: ${actions.join(',')}`);
  assertEq(new Set(actions).size, 1,
    `the bot changed its mind on the way: ${actions.join(',')}`);
});

// ***** B4: the dark is a fallback, not a bidder ***** //
//
// docs/backlog.md B4 measured `exploreCompetes` as actively harmful —
// median depth 3 -> 2, chests per floor 4.48 -> 3.85 — and shipped both of
// its flags OFF. This asserts the SHIPPED behaviour rather than the
// rejected one: a chest the bot can already see beats unexplored map, so a
// reward that is available now is taken before one that is merely possible.
// If someone switches the flags on, this is the test that should stop them
// doing it silently.
test('a chest in hand beats the dark', () => {
  // Hero in a corridor, a chest four tiles right, and the entire left half
  // of the map never seen — so the frontier behind it is as wide and as
  // tempting as this fixture can make it.
  const map = tinyMap([
    '#####################',
    '#-------------------#',
    '#####################',
  ]);
  const state = makeState({
    map,
    playerPos: [10, 1],
    chests: [
      { id: 'c-right', name: 'chest', emoji: '📦', pos: [14, 1], side: false, edge: false, drop: null },
    ],
  });

  const { actions } = driveBot(state, 4);
  assert(actions.every((a) => a === 'right'),
    `the bot went exploring instead of opening the chest: ${actions.join(',')}`);
});

// ***** B16: the shrine is a one-way door, not floor ***** //
//
// docs/backlog.md B16. `believedWalkable` decides passability from the tile
// KIND, and the shrine is an entity rather than a kind — so its tile was
// ordinary floor to every route, and the bot walked ACROSS it to reach loot
// on the far side, ending the floor by accident. Measured at 27.4% of all
// completed floors before this, on two seed families.
//
// Modelled as a graph sink: enterable, never expanded from. Both halves are
// worth locking, because the failure directions are opposite — a sink that
// does not stop routes leaves the bug, and one that also blocks arrival
// would leave the bot unable to take the exit at all.

test('a sink ends routes and never carries them', () => {
  // Straight corridor, sink in the middle. Everything up to and including
  // the sink is reachable; nothing past it is.
  const map = tinyMap([
    '#####################',
    '#-------------------#',
    '#####################',
  ]);
  const belief = foldBelief(emptyBelief(), observe(makeState({ map, playerPos: [5, 1] })));
  const passable = believedWalkable(belief);
  const isSink = (x, y) => x === 10 && y === 1;

  const field = dijkstra([5, 1], passable, () => 1, isSink);

  assert(field.cost.has(key([9, 1])), 'the tile before the sink went unreachable');
  assert(field.cost.has(key([10, 1])), 'the sink itself must stay reachable — it is the goal');
  assert(!field.cost.has(key([11, 1])), 'a route continued straight through the sink');
  assert(!field.cost.has(key([15, 1])), 'the whole far side should be cut off');
});

test('a bot standing on a sink can still leave it', () => {
  // The origin is seeded before the sink test runs, so a hero that already
  // occupies one is not frozen there. Guards a plausible off-by-one in the
  // check's placement rather than a behaviour anyone asked for.
  const map = tinyMap([
    '#####################',
    '#-------------------#',
    '#####################',
  ]);
  const belief = foldBelief(emptyBelief(), observe(makeState({ map, playerPos: [10, 1] })));
  const field = dijkstra([10, 1], believedWalkable(belief), () => 1,
    (x, y) => x === 10 && y === 1);

  assert(field.cost.has(key([11, 1])), 'a hero starting on the sink could not move off it');
});

test('the bot will not route through the shrine to reach loot beyond it', () => {
  // The bug's own shape: the only chest sits on the far side of the shrine
  // in a one-wide corridor. Reaching it means ending the floor, so the
  // router must not believe it can be reached at all.
  const map = tinyMap([
    '#####################',
    '#-------------------#',
    '#####################',
  ]);
  const state = makeState({
    map,
    playerPos: [6, 1],
    shrine: { id: 's', emoji: '⛩️', pos: [10, 1] },
    chests: [
      { id: 'c-far', name: 'chest', emoji: '📦', pos: [15, 1], side: false, edge: false, drop: null },
    ],
  });

  const trace = [];
  const { state: after } = driveBot(state, 6, { monsterCount: 0, trace });

  assert(!trace.some((t) => t.goal.kind === 'chest'),
    'the bot targeted a chest it can only reach by ending the floor');
  assert(after.chests.length === 1, 'the bot got to the chest, which means it crossed the shrine');
});

test('the shrine is still reachable as a goal', () => {
  // The failure direction the item names: a fix that makes the bot refuse to
  // path anywhere near the exit. With nothing else to do, it must still walk
  // to the shrine and take it.
  const map = tinyMap([
    '#####################',
    '#-------------------#',
    '#####################',
  ]);
  const state = makeState({
    map,
    playerPos: [6, 1],
    shrine: { id: 's', emoji: '⛩️', pos: [10, 1] },
  });

  const { state: after } = driveBot(state, 8, { monsterCount: 0 });
  assertEq(after.outcome, 'ascended', 'the bot would not take an exit with nothing else to do');
});


// ***** the bot's three objectives ***** //
//
// The bot follows three ordered goals — survive the floor, arrive rich,
// spend few steps — and a hero with special characteristics is a different
// CONFIGURATION handed to makeBot, never different code. These tests pin
// both halves: the rules, and the mechanism.

test('a fight over the margin is never started', () => {
  // A dragon parked short of the route. Its expected duel cost dwarfs the
  // hero's whole bar, so objective 1 forbids it — the bot takes the exit
  // and leaves the fight alone.
  const map = tinyMap([
    '#####################',
    '#-------------------#',
    '#####################',
  ]);
  const state = makeState({
    map,
    playerPos: [6, 1],
    monsters: [dummy('dragon', [14, 1])],
    shrine: { id: 's', emoji: '⛩️', pos: [2, 1] },
  });

  const { state: after } = driveBot(state, 10, { monsterCount: 1, chestCount: 0 });
  assertEq(after.outcome, 'ascended', 'the bot did not leave when only a lost fight remained');
  assert(after.monsters.every((m) => !m.dead), 'the bot started a fight it could not afford');
});

test('a coward hero refuses the fight the default hero takes', () => {
  // Same board, same seed, other hero. The default margin affords a boar;
  // a fightMargin of 0.2 does not. That the outcome differs is the whole
  // hero-as-configuration mechanism working.
  const map = tinyMap([
    '#####################',
    '#-------------------#',
    '#####################',
  ]);
  const build = () => makeState({
    map,
    playerPos: [6, 1],
    monsters: [dummy('boar', [10, 1])],
    shrine: { id: 's', emoji: '⛩️', pos: [2, 1] },
  });

  const brave = driveBot(build(), 30, { monsterCount: 1, chestCount: 0 });
  assert(brave.state.monsters.some((m) => m.dead), 'the default hero left an affordable fight');

  const coward = driveBot(build(), 30,
    { monsterCount: 1, chestCount: 0, hero: { fightMargin: 0.2 } });
  assert(coward.state.monsters.every((m) => !m.dead), 'the coward started the fight anyway');
  assertEq(coward.state.outcome, 'ascended', 'the coward did not leave instead');
});

test('a hero with no appetite skips the gamble the default hero takes', () => {
  // A guarded side chest. The default appetite pays the guard and opens it;
  // sideAppetite 0 refuses the gamble and walks out — which is what makes a
  // refused side room an attributable decision rather than an accident.
  const map = tinyMap([
    '#####################',
    '#-------------------#',
    '#####################',
  ]);
  const build = () => makeState({
    map,
    playerPos: [4, 1],
    monsters: [dummy('boar', [11, 1], { side: true, activation: 6 })],
    chests: [
      { id: 'c-side', name: 'chest', emoji: '📦', pos: [12, 1], side: true, edge: 0, drop: null },
    ],
    shrine: { id: 's', emoji: '⛩️', pos: [2, 1] },
  });

  const greedy = driveBot(build(), 60, { monsterCount: 1, chestCount: 1 });
  assertEq(greedy.state.chests.length, 0, 'the default hero left the gamble on the table');

  const ascetic = driveBot(build(), 60,
    { monsterCount: 1, chestCount: 1, hero: { sideAppetite: 0 } });
  assertEq(ascetic.state.chests.length, 1, 'the no-appetite hero opened the guarded chest');
  assertEq(ascetic.state.outcome, 'ascended', 'the no-appetite hero did not leave instead');
});

test('the bot drinks exactly when the missing hp covers the heal', () => {
  const map = tinyMap([
    '#########',
    '#-------#',
    '#########',
  ]);
  const potion = { id: 'i-p', name: 'health', emoji: '?', pos: [0, 0], dmg: 0, armour: 0, heal: 3 };

  const hurt = makeState({ map, playerPos: [4, 1], hp: 7, inventory: [potion] });
  const bot = makeBot({ monsterCount: 0, chestCount: 0 });
  assertEq(bot(foldBelief(emptyBelief(), observe(hurt))), 'drink',
    'missing 3 hp with a 3-heal potion held did not drink');

  const fine = makeState({ map, playerPos: [4, 1], hp: 8, inventory: [{ ...potion }] });
  const bot2 = makeBot({ monsterCount: 0, chestCount: 0 });
  assert(bot2(foldBelief(emptyBelief(), observe(fine))) !== 'drink',
    'drinking at a 2 hp gap wastes a third of the potion');
});

test('a hostile tuning value cannot hang the router', () => {
  // A friend typed a negative into the lab's danger persistence and the page
  // froze. The mechanism: menace is `bite * persistence ** distance`, so a
  // negative persistence makes half the tiles cost LESS than nothing, and
  // Dijkstra with a negative edge never settles — it re-reaches the same
  // tile cheaper forever. The form refuses negatives now
  // (src/ui/dials.js), and the router clamps its own prices, which is the
  // half that holds for any caller. This test is the second half: the bot
  // must still answer, and quickly.
  const map = tinyMap([
    '#####################',
    '#-------------------#',
    '#####################',
  ]);
  const state = makeState({
    map,
    playerPos: [10, 1],
    monsters: [dummy('wolf', [13, 1], { activation: 14 })],
    shrine: { id: 's', emoji: '⛩️', pos: [2, 1] },
  });

  const bot = makeBot({
    monsterCount: 1, chestCount: 0, persistence: -1, crowdPenalty: -50,
  });
  const action = bot(foldBelief(emptyBelief(), observe(state)));
  assert(ACTIONS.includes(action),
    `the bot answered "${action}" under a negative persistence`);
});

test('every glyph the game can draw has a sprite', () => {
  // The Butcher shipped INVISIBLE for four commits. `src/ui/tiles.js` bakes
  // in one Twemoji SVG per glyph, `tileSvg` returns null for anything
  // missing, and render.js then writes an empty cell — so a creature given
  // a new emoji in balance.js and nowhere else simply does not appear, with
  // nothing failing anywhere. Caught by the owner watching, not by any
  // test, which is exactly the gap this closes.
  const glyphs = [
    ...MONSTER_TABLE.map((m) => m.emoji),
    ...ITEM_TABLE.map((i) => i.emoji),
    ...CHEST_TABLE.map((c) => c.emoji),
    VAULT_BOSS.emoji,
    '🕳️',                                    // the way out (spawn.js)
  ];
  for (const glyph of glyphs) {
    assert(tileSvg(glyph),
      `no sprite for ${glyph} — it would render as an empty cell`);
  }
});

test('B25 — the loot-value gate is on, and the flag still reverses it', () => {
  // Shipped ON (B25). The flag stays because the two rules are a real A/B
  // and `decisions.md` carries both columns — false must still restore the
  // old behaviour exactly, which the second test below is what pins.
  assertEq(LOOT_VALUE, true, 'the loot-value gate was switched off without a measurement');

  // The greed dial's centre only means "price a chest at what it is worth"
  // if the shipped appetite IS the centre. Two sources disagreeing here is
  // how it drifted once already.
  assertEq(DEFAULT_HERO.sideAppetite, 1,
    'the shipped appetite is not the dial centre, so the panel describes the wrong game');

  // Six bands, symmetric around 1 and never equal to it: no middle to park
  // on, so every setting leans. One constant generates the whole scale.
  const bands = biasBands();
  assertEq(bands.length, 6, 'expected six bands');
  assert(!bands.includes(1), 'a band sits exactly on the centre, so it can be parked on');
  assertEq(bands[0], +(1 - BIAS_SPREAD).toFixed(3), 'the weakest band is not 1 - spread');
  assertEq(bands[5], +(1 + BIAS_SPREAD).toFixed(3), 'the strongest band is not 1 + spread');
  const gaps = bands.slice(1).map((b, i) => +(b - bands[i]).toFixed(3));
  assertEq(new Set(gaps).size, 1, 'the notches are not evenly spaced');
});

test('B21 — with the gate on, a chest is refused on VALUE, not on the bar', () => {
  // An unguarded chest six tiles away. The old rule only ever looked at the
  // GUARD, so it walks any distance for a chest nothing is watching; the new
  // one weighs what the visit costs against what the chest is worth.
  //
  // The exit is a stub BELOW, so refusing reads as 'down' and taking reads
  // as 'right' — otherwise both answers move the same way and the test
  // proves nothing.
  const map = tinyMap([
    '#########',
    '#-------#',
    '#.#######',
    '#.#######',
    '#########',
  ]);
  const chest = { id: 'c1', name: 'chest', emoji: '📦', pos: [7, 1], side: false };

  const run = (lootValue) => {
    const state = makeState({
      map, playerPos: [1, 1], chests: [chest],
      shrine: { id: 's', emoji: '🕳️', pos: [1, 3] },
    });
    const { actions } = driveBot(state, 1, {
      monsterCount: 0, chestCount: 1, lootValue,
      // Six tiles at 0.1 an hp is 0.6, against a chest this hero believes is
      // worth 0.2 — so the visit costs three times what it buys.
      chestValueHp: 0.2,
      hero: { ...DEFAULT_HERO, stepCost: 0.1, sideAppetite: 1 },
    });
    return actions[0];
  };

  assertEq(run(false), 'right', 'the old rule should still walk to an unguarded chest');
  assertEq(run(true), 'down', 'the value gate did not refuse a chest that costs more than it is worth');
});

test('B18 — a hero does not flee something it cannot outrun', () => {
  // The bug: the affordability gate sat in front of the clause that knew a
  // chase is not a decision, so a duel gone too expensive mid-fight made
  // the bot drop the creature as a goal and walk away. Against a speed-2
  // chaser that is a slow death with no blows returned — it moves two
  // tiles for the hero's one, so the gap never grows.
  const map = tinyMap([
    '#############',
    '#-----------#',
    '#############',
  ]);

  // Hurt enough that the duel is far past any bar it could clear.
  const run = (speed) => {
    const state = makeState({
      map,
      playerPos: [6, 1],
      hp: 2,
      monsters: [dummy('dragon', [7, 1], { activation: 20, speed })],
      shrine: { id: 's', emoji: '🕳️', pos: [1, 1] },
    });
    const { actions } = driveBot(state, 1, { monsterCount: 1, chestCount: 0 });
    return actions[0];
  };

  assertEq(run(2), 'right', 'the hero fled a creature that moves twice its speed');
  assertEq(run(1), 'left', 'a speed-1 chaser can be outrun, so fleeing is still right');
});

test('B18 — an unreachable fight is still refused before it starts', () => {
  // The narrow half: only a chase already joined skips the gate. A fast
  // creature the hero has not woken is priced like anything else, so the
  // decision to walk into the vault is untouched by this.
  const map = tinyMap([
    '#############',
    '#-----------#',
    '#############',
  ]);
  const state = makeState({
    map,
    playerPos: [6, 1],
    hp: 2,
    // In plain sight (5 tiles) but activation 2, so it is asleep and
    // nothing is chasing anything. The exit lies the other way.
    monsters: [dummy('dragon', [11, 1], { activation: 2, speed: 2 })],
    shrine: { id: 's', emoji: '🕳️', pos: [2, 1] },
  });
  const { actions } = driveBot(state, 1, { monsterCount: 1, chestCount: 0 });
  assertEq(actions[0], 'left',
    'a sleeping fast creature pulled the hero in — the entry gate is gone');
});

test('M44 — a creature with speed acts that many times a turn', () => {
  const map = tinyMap([
    '###########',
    '#---------#',
    '###########',
  ]);
  // `sim` suppresses the skip die, so this measures the loop and not luck.
  const run = (speed) => {
    const state = makeState({
      map,
      playerPos: [1, 1],
      monsters: [dummy('ogre', [8, 1], { activation: 20, speed })],
      shrine: { id: 's', emoji: '🕳️', pos: [9, 1] },
    });
    state.sim = true;
    const after = step(state, 'rest').state;
    return 8 - after.monsters[0].pos[0];
  };

  assertEq(run(1), 1, 'an ordinary creature moved more than one tile');
  assertEq(run(2), 2, 'a speed-2 creature did not take two actions');
  assertEq(run(undefined), 1, 'an unset speed must behave exactly as before');
});

test('M44 — nothing on the tier table is fast', () => {
  // The shipped bestiary is untouched: speed exists for the vault's
  // occupant alone. A row that quietly grows one would change every floor.
  for (const template of MONSTER_TABLE) {
    assert(!template.speed || template.speed === 1,
      `${template.name} has speed ${template.speed}`);
  }
  for (const state of vaultFloors()) {
    for (const monster of state.monsters) {
      if (monster.vault) continue;
      assertEq(monster.speed, 1, `${monster.name} came out fast`);
    }
    assertEq(state.monsters.find((m) => m.vault).speed, VAULT_BOSS.speed ?? 1,
      'the Butcher lost its speed on the way to the floor');
  }
});

test('the bot can see speed but does not price it', () => {
  // The blind spot the vault leans on, pinned so that "fixing" duelCost is
  // a deliberate act rather than a tidy-up. See duelCost's own note.
  const slow = dummy('ogre', [2, 1], { speed: 1 });
  const fast = dummy('ogre', [2, 1], { speed: 2 });
  const hero = { hp: 10, armour: 0, xp: 3, inventory: [] };
  assertEq(duelCost(hero, slow).hpLost, duelCost(hero, fast).hpLost,
    'duelCost started pricing speed — the room stops being a gamble');

  // But it IS observable: hiding it would be using the fog on something
  // the hero can plainly see.
  const state = makeState({
    map: tinyMap(['#####', '#---#', '#####']),
    playerPos: [1, 1],
    monsters: [dummy('ogre', [3, 1], { speed: 2 })],
    shrine: { id: 's', emoji: '🕳️', pos: [3, 1] },
  });
  const belief = foldBelief(emptyBelief(), observe(state));
  assertEq([...belief.monsters.values()][0].speed, 2, 'speed does not reach Belief');
});

test('V5 — a cautious hero does not explore into danger', () => {
  // The gap the vault exposed: exploration was the one decision nothing
  // gated. It picked the frontier with the fewest STEPS and no bar could
  // refuse it, so a hero forbidden from a fight still walked into the room
  // holding one, woke it, and then fled from a duel it would not finish.
  //
  // A corridor with exactly one dark end, and a sleeping creature BESIDE the
  // way to it. The left end is already in sight, so exploring right is the
  // only exploration on offer — and the shrine is the only alternative.
  //
  // BESIDE, not in the corridor, and that is B26's doing. The guard used to
  // stand ON the only route: once a creature's tile costs its duel, walking
  // past it is not a gamble the appetite can weigh, it is a fight the hero
  // cannot survive, and every hero refuses correctly for a reason that has
  // nothing to do with the gate under test. In its own alcove it does what
  // it was always meant to do — make the route expensive without making it
  // impossible.
  const wide = 31;
  // The bottom row is walled so the shrine's own tile is not itself a
  // frontier — an unknown tile below it would make the exit the cheapest
  // "dark" on the map and there would be no decision to test.
  const map = tinyMap([
    '#'.repeat(wide),
    `#${'-'.repeat(wide - 2)}#`,
    `${'#'.repeat(6)}.${'#'.repeat(6)}.${'#'.repeat(wide - 14)}`,
    `${'#'.repeat(6)}.${'#'.repeat(wide - 7)}`,
    '#'.repeat(wide),
  ]);

  // `riskAppetite`, not `sideAppetite`, and the swap IS C1 §7 working: this
  // test asks a question about how much uncertain cost the hero accepts, and
  // it used to ask it through the dial that prices what a chest is WORTH.
  // The two were one number, so it happened to answer; now the right one
  // answers and the other cannot.
  const run = (riskAppetite) => {
    const state = makeState({
      map,
      playerPos: [6, 1],
      // Asleep at this range (activation 6 against 7 tiles away), so it
      // never moves and the frontier stays where it is for the whole test.
      //
      // A DRAGON rather than an ogre, and the swap is the point of another
      // rule: hp is hidden at a distance now, so the bot prices a guard from
      // the bestiary average for its xp. Ogre and wolf share xp 4, so an
      // ogre reads as hp 6 instead of 7 and the duel slid under the bar —
      // this test would then have been measuring that misjudgement instead
      // of the frontier gate it is about. The zombie is the only xp 5 on the
      // table, so guess and truth agree and the decision under test is the
      // only thing moving.
      monsters: [dummy('zombie', [13, 2], { activation: 6 })],
      shrine: { id: 's', emoji: '🕳️', pos: [6, 3] },
    });
    // Something is still owed, so the pool is empty and the only decision
    // left is whether to walk into the dark.
    const { actions } = driveBot(state, 4, {
      monsterCount: 3, chestCount: 3, hero: { ...DEFAULT_HERO, riskAppetite },
    });
    return actions;
  };

  const brave = run(1);
  const cautious = run(0);
  assert(brave.includes('right'),
    'a greedy hero should still explore toward the guarded dark');
  assert(!cautious.includes('right'),
    'appetite 0 walked into the guarded dark anyway — the frontier is ungated');
  assert(cautious.includes('down'),
    'appetite 0 refused the dark but did not fall through to the shrine');
});

test('an awake pursuer is fought rather than fled forever', () => {
  // A bat inside its own chase radius is coming whatever the bot does, so
  // its duel is not a cost of choosing it — the bot turns and takes the
  // fight instead of dragging the chase across the floor.
  const map = tinyMap([
    '#####################',
    '#-------------------#',
    '#####################',
  ]);
  const state = makeState({
    map,
    playerPos: [6, 1],
    monsters: [dummy('bat', [10, 1], { activation: 12 })],
    shrine: { id: 's', emoji: '⛩️', pos: [2, 1] },
  });

  const { state: after } = driveBot(state, 20, { monsterCount: 1, chestCount: 0 });
  assert(after.monsters.some((m) => m.dead), 'the pursuer was never dealt with');
});

// ***** U11 — the unlock, and the receipt that has to back it ***** //
//
// These are the only tests here that touch localStorage, and run-tests.html
// is the SAME ORIGIN as index.html — so every one of them saves the real
// store and puts it back in a `finally`. A test suite that ate a player's
// unlocks would be worse than no test suite.

const ACH_KEY = 'rogulidle-achievements';
const HERO_KEY = 'rogulidle-hero';
const SHOP_ORDER_KEY = 'rogulidle-shop-order';

function withStores(fn) {
  const saved = [ACH_KEY, HERO_KEY, SHOP_ORDER_KEY]
    .map((k) => [k, localStorage.getItem(k)]);
  try {
    fn();
  } finally {
    for (const [k, v] of saved) {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    }
    // Leave the module agreeing with the store it was handed back.
    verifyAchievements();
  }
}

// A real run that really earned something, FOUND rather than written down.
//
// A pinned seed would be a recorded measurement, and this project already
// knows what happens to those: it goes stale the first time balance moves and
// then fails for a reason that has nothing to do with what it tests. Searched,
// the test stays true across any balance change — and if it ever has to search
// far, that is itself worth seeing.
//
// Config `{}` is deliberate: the code defaults, which is what every other test
// in this file runs on (`test/baseline.md` — this file pins rules, not
// balance). Memoised because each run costs a couple of hundred milliseconds.
let earnedRun = null;
function aRunThatEarned() {
  if (earnedRun) return earnedRun;
  for (let i = 1; i <= 60; i++) {
    const seed = hashSeeds(20260814, i);
    const got = earnedBy(playRun(seed, {}));
    if (got.length) {
      earnedRun = { seed, config: {}, id: got[0] };
      return earnedRun;
    }
  }
  throw new Error('no seed in 60 earned anything — the receipt cannot be tested');
}

test('a hand-written achievement flag unlocks nothing', () => {
  withStores(() => {
    localStorage.setItem(ACH_KEY, JSON.stringify({ [HERO_GATE]: { run: 1, at: 0 } }));
    verifyAchievements();
    assert(!isEarned(HERO_GATE),
      'a flag typed into the console counted as earned — the gate is a boolean again');
  });
});

test('a receipt whose run really did it is accepted', () => {
  withStores(() => {
    const hit = aRunThatEarned();
    localStorage.setItem(ACH_KEY, JSON.stringify({
      [hit.id]: { run: 1, at: 0, seed: hit.seed, config: hit.config },
    }));
    verifyAchievements();
    assert(isEarned(hit.id), `a genuine receipt for ${hit.id} was refused`);
  });
});

test('a receipt pointing at a different run is refused', () => {
  withStores(() => {
    const hit = aRunThatEarned();
    localStorage.setItem(ACH_KEY, JSON.stringify({
      [hit.id]: { run: 1, at: 0, seed: hit.seed + 1, config: hit.config },
    }));
    verifyAchievements();
    assert(!isEarned(hit.id), 'the seed was changed and the claim still stood');
  });
});

test('a refused receipt is ignored, never deleted', () => {
  // The one thing verification must not do. A receipt stops reproducing when
  // the engine changes as well as when it is forged, and nothing here can tell
  // those apart — so a change that broke them must be revertible with every
  // unlock intact.
  withStores(() => {
    const written = JSON.stringify({ [HERO_GATE]: { run: 1, at: 0, seed: 7, config: {} } });
    localStorage.setItem(ACH_KEY, written);
    verifyAchievements();
    assertEq(localStorage.getItem(ACH_KEY), written,
      'verification rewrote the store');
  });
});

test('with the gate shut, a hero picked earlier reads as the base hero', () => {
  withStores(() => {
    localStorage.removeItem(ACH_KEY);
    verifyAchievements();
    setChosenHero('vito');
    assertEq(getChosenHero(), '', 'the gate let an unearned hero through');
    assertEq(localStorage.getItem(HERO_KEY), 'vito',
      'the gate erased the pick instead of merely refusing it');
  });
});

// ***** the shop's no-input purchase (rules.md §9) ***** //
//
// The RULE, not the screen: `nextPurchase` is a pure function of a balance
// and an order, so everything below asks it what an order buys without a
// timer, a click or a store. The drain itself is four lines of loop in
// spectator.js and is spelled out again here — a test that walked it
// through the UI would be testing the pacing.

// What the timer does, in the one place a test can reach it: spend the
// balance down the order until it reaches nothing.
function drain(balance, order) {
  const bought = [];
  let left = balance;
  // A cap, not a condition — the loop's real end is `nextPurchase` returning
  // null. Derived from the balance rather than picked, because the honest
  // ceiling IS "every coin went on the cheapest thing": a flat guard of 500
  // fired on a balance of 1000 and read as a hang in the rule when it was
  // only a hang in this helper.
  const most = Math.floor(balance / cheapest()) + 1;
  for (let guard = 0; guard < most; guard++) {
    const entry = nextPurchase(left, order);
    if (!entry) return { bought, left };
    left -= entry.price;
    bought.push(entry.item.name);
  }
  throw new Error('the drain did not terminate');
}

const cheapest = () => Math.min(...SHOP_ITEMS.map((e) => e.price));

test('the default shop order is the price ladder read backwards', () => {
  // DERIVED, never written down: a hand-kept list here would be a second
  // copy of the prices in shop.js, free to drift the next time one moves.
  const prices = DEFAULT_ORDER.map(
    (name) => SHOP_ITEMS.find((e) => e.item.name === name).price,
  );
  for (let i = 1; i < prices.length; i++) {
    assert(prices[i] <= prices[i - 1],
      `the default order is not descending by price: ${DEFAULT_ORDER.join(' > ')}`);
  }
  assertEq(DEFAULT_ORDER.length, SHOP_ITEMS.length,
    'the default order does not cover the whole shelf');
});

test('a drained balance never overspends and always terminates', () => {
  // Every balance from nothing to well past the dearest item, so the two
  // ends are covered as well as the middle: 0 buys nothing, and a balance
  // that clears the axe several times over still stops.
  const dearest = Math.max(...SHOP_ITEMS.map((e) => e.price));
  for (let balance = 0; balance <= dearest * 3; balance++) {
    const { bought, left } = drain(balance, DEFAULT_ORDER);
    const spent = bought.reduce(
      (sum, name) => sum + SHOP_ITEMS.find((e) => e.item.name === name).price, 0,
    );
    assertEq(spent, balance - left, `the basket at ${balance} does not add up`);
    assert(left >= 0, `the shop overspent at ${balance}`);
    assert(left < cheapest(),
      `the shop stopped at ${balance} holding ${left}, which still buys something`);
  }
});

test('the order decides what a balance buys, not the price alone', () => {
  // The whole feature in one assertion: the same coins, two orders, two
  // different loadouts. If this ever passes trivially the order has stopped
  // being a choice (objectives.md — an option that changes nothing is not
  // one).
  const axe = SHOP_ITEMS.find((e) => e.item.name === 'axe');
  const shield = SHOP_ITEMS.find((e) => e.item.name === 'shield');
  const balance = axe.price;

  const dear = drain(balance, ['axe', 'dagger', 'shield', 'health']);
  const cheap = drain(balance, ['shield', 'health', 'dagger', 'axe']);

  assert(dear.bought.includes('axe'), 'axe-first did not buy the axe it could afford');
  assert(!cheap.bought.includes('axe'), 'shield-first bought the axe anyway');
  assert(cheap.bought.filter((n) => n === 'shield').length
    >= Math.floor(balance / shield.price) - 1,
  'shield-first did not stack shields');
});

test('an order missing an item still reaches it, last', () => {
  // What lets a fifth item join the shelf later without vanishing from every
  // order stored before it existed.
  //
  // Asserted through the FALLTHROUGH rather than through a drain: an order
  // naming only the axe still has to reach the dagger when the balance is
  // one coin short of an axe. (A drain proves nothing here — declare the
  // cheapest item first and every coin goes on it, which is the rule working,
  // not the appended items being unreachable.)
  const axe = SHOP_ITEMS.find((e) => e.item.name === 'axe');
  const dagger = SHOP_ITEMS.find((e) => e.item.name === 'dagger');

  assertEq(nextPurchase(axe.price, ['axe']).item.name, 'axe',
    'the declared item did not lead');
  assertEq(nextPurchase(axe.price - 1, ['axe']).item.name, 'dagger',
    'a partial order could not fall through to an item it never named');

  // And the whole shelf really is behind it, in the default order.
  const { bought } = drain(axe.price + dagger.price, ['axe']);
  assertEq(bought.join(','), 'axe,dagger', 'the fallthrough did not follow the price ladder');
});

test('a stored order survives a reload, and junk in it does not', () => {
  withStores(() => {
    setShopOrder(['shield', 'health', 'axe', 'dagger']);
    assertEq(getShopOrder().join(','), 'shield,health,axe,dagger',
      'the stored order did not come back');

    // A name the shelf does not carry, and a duplicate — both dropped,
    // and everything real still present exactly once.
    setShopOrder(['sword', 'shield', 'shield', 'axe']);
    const back = getShopOrder();
    assert(!back.includes('sword'), 'an unknown item survived the store');
    assertEq(new Set(back).size, back.length, 'the stored order holds a duplicate');
    assertEq(back.length, SHOP_ITEMS.length, 'the stored order lost an item');
    assertEq(back[0], 'shield', 'sanitising reordered what was actually asked for');

    localStorage.setItem(SHOP_ORDER_KEY, 'not json at all');
    assertEq(getShopOrder().join(','), DEFAULT_ORDER.join(','),
      'a corrupt store did not fall back to the default order');
  });
});

// ***** the chain — a session with the shop in it (src/analysis/chain.js) *****
//
// The second metrics module. Only the FIRST run of a session is ever naked;
// every run after it starts holding what the shop bought with the coins the
// run before it earned (rules.md §9). These check the three rules that turn
// a pile of runs into a session, and nothing here reads a tripwire — a wire
// is a threshold, and a threshold is not a rule.

// An EASY dungeon, because two of the rules below only exist on a clear and
// the shipped game clears roughly never. Not a tuning claim: a floor plan
// with one weak creature per floor is a fixture, the same way a hand-built
// state is elsewhere in this file.
const EMPTY_DUNGEON = {
  model: {
    monstersBase: 1, monsterGrowth: 1, strength: 0.01, strengthGrowth: 1,
    vaultLevel: 0, outOfDepthChanceCap: 0, tierFloorCap: 0, tierSlackCap: 0,
  },
};

test('a traversal that killed the hero pays nothing', () => {
  // The rule, on rows built by hand so it cannot depend on which seed dies
  // where: two completed traversals pay, and `spent` comes off the top.
  const balance = balanceOf({
    levels: [
      { outcome: 'ascended', coins: 5, spent: 0 },
      { outcome: 'ascended', coins: 3, spent: 1 },
      { outcome: 'died', coins: 9, spent: 0 },
    ],
  });
  assertEq(balance, 7, 'the fatal traversal was paid for, or `spent` was not deducted');

  // And a timeout is the same case as a death — rules.md §9 treats "not
  // completed" as one thing, not two.
  assertEq(balanceOf({ levels: [{ outcome: 'timeout', coins: 9, spent: 0 }] }), 0,
    'running out of turns paid like a completed traversal');
});

test('the engine really does write coins onto the traversal that killed the hero', () => {
  // WITHOUT THIS THE TEST ABOVE IS DECORATION. `dungeon.js` writes `.coins`
  // on every row before it checks how the traversal ended, so summing the
  // array raw pays for the death — the bug this filter exists for. If the
  // engine ever starts zeroing that row, this fails and `balanceOf` can lose
  // its filter instead of keeping a guard against something that stopped
  // happening.
  const run = playOne(500000);
  assert(!run.cleared, 'the fixture seed stopped dying — pick another');
  const last = run.levels[run.levels.length - 1];
  assert(last.outcome !== 'ascended', 'the last traversal completed after all');
  assert(last.coins > 0, 'the fatal traversal no longer carries coins of its own');
});

test('spend agrees with the drain the shop tests walk by hand', () => {
  // `drain` above is a deliberate second copy of the rule, written so the
  // shop's own tests do not lean on any one implementation of it. That makes
  // it the free oracle for this one: two independent loops over the same
  // pure `nextPurchase` have to buy the same things in the same order.
  for (const balance of [0, 1, 2, 9, 16, 17, 33, 100]) {
    const mine = spend(balance, DEFAULT_ORDER);
    const theirs = drain(balance, DEFAULT_ORDER);
    assertEq(mine.bought.map((i) => i.name).join(','), theirs.bought.join(','),
      `the two drains disagree at a balance of ${balance}`);
    assertEq(mine.left, theirs.left, `the change disagrees at a balance of ${balance}`);
  }
});

test('an item the shop bought is a copy, not the table row itself', () => {
  // The page stores the wallet as JSON, so a real run always gets fresh
  // objects. A chain handing the same ITEM_TABLE row to twenty runs would be
  // this module's own invention, and invisible until something wrote to one.
  const { bought } = spend(2, DEFAULT_ORDER);
  assert(bought.length > 0, 'the cheapest item stopped being affordable at 2');
  for (const item of bought) {
    assert(!ITEM_TABLE.includes(item), 'the shop handed out the table row itself');
    const row = ITEM_TABLE.find((r) => r.name === item.name);
    assertEq(JSON.stringify(item), JSON.stringify(row),
      'the copy is not the item the table describes');
  }
});

test('run 1 of a chain is the run the naked instrument measures', () => {
  // The whole basis for ever comparing the two instruments: check.js plays
  // `firstSeed + i`, so chain `i` has to OPEN on that exact seed. Break this
  // and the paired half of every future comparison silently stops pairing.
  assertEq(seedOf(500000, 1), 500000, 'run 1 did not use the chain seed itself');
  assertEq(seedOf(500000, 2), hashSeeds(500000, 2), 'run 2 is not derived from the chain seed');
  assert(seedOf(500000, 2) !== seedOf(500001, 2), 'two chains share a second run');
});

test('a death empties the pile, and the purchase made after it survives', () => {
  // The order of the two rules at a run's end, which is not interchangeable
  // (spectator.js): the death rule fires first, the shop opens after. So a
  // run that died still spends what it earned, and what it buys arms the
  // next run — while everything the dead run was carrying is gone.
  const { runs } = playChain(500000, 4);
  assert(runs.every((r) => !r.cleared), 'the fixture chain started clearing — see EMPTY_DUNGEON');

  for (let i = 1; i < runs.length; i++) {
    assertEq(runs[i].carried, runs[i - 1].bought.length,
      `run ${i + 1} carried something the previous death should have taken`);
    assertEq(runs[i].streak, 0, 'a death left a streak standing');
  }

  // And it is a real purchase being carried, not an empty list every time —
  // otherwise the equality above holds for the wrong reason.
  assert(runs.some((r) => r.carried > 0), 'no run in the chain was armed at all');
});

test('a clear keeps the pile, and the next purchase adds to it', () => {
  const { runs } = playChain(7, 3, { dials: EMPTY_DUNGEON });
  assert(runs.every((r) => r.cleared), 'the empty dungeon stopped being clearable');

  for (let i = 1; i < runs.length; i++) {
    assertEq(runs[i].carried, runs[i - 1].carried + runs[i - 1].bought.length,
      `run ${i + 1} did not keep what run ${i} cleared with`);
    assertEq(runs[i].streak, i, 'the streak did not count consecutive clears');
  }
});

export function runAll() {
  return results;
}
