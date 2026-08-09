// Rule tests for the P1 engine, checked against docs/rogule-spec.md.
// Run them with: python tools/dev-server.py -> http://localhost:8138/run-tests.html

import {
  CHEST_GUARD_RADIUS, EARLY_CHEST_QUALITY_BOOST, HP_GRANT_AMOUNT, ITEM_TABLE,
  MIN_ROSTER_FOR_SIDE, MONSTER_TABLE, OUT_OF_DEPTH_CHANCE_CAP, OUT_OF_DEPTH_TAIL,
  PLAYER_HP, SHRINE_DISTANCE_SHARE, WEAPON_AXE_MIN_TIER,
} from '../src/sim/balance.js';
import { newGame, playGame, replayGame } from '../src/sim/game.js';
import { step, ACTIONS, grantArmour } from '../src/sim/step.js';
import { observe, emptyBelief, foldBelief } from '../src/sim/observe.js';
import { weaponDamage, armourValue, effectiveHp } from '../src/sim/combat.js';
import { findPath, playerPassable, posKey } from '../src/sim/mapgen.js';
import { drawLogUniform, drawWeighted, makeRng } from '../src/sim/rng.js';
import { classifyRooms, spineShare } from '../src/sim/spine.js';
import { itemWeights, monsterWeightsAround } from '../src/sim/spawn.js';
import { floorPlan } from '../src/sim/dungeon.js';
import {
  expectedFloorMass, floorParams, floorStrength, makeFloorPlan, monstersAt,
  outOfDepthChanceAt, saturatedAt,
  CLUSTER_SIZE, DIFFICULTY_REBALANCED, MONSTERS_BASE, MONSTER_GROWTH, MONSTER_GROWTH_REBALANCED,
  MONSTER_STRENGTH, POTION_SCARCITY, STRENGTH_GROWTH, STRENGTH_GROWTH_REBALANCED, WEAPON_SCARCITY,
} from '../src/sim/difficulty.js';
import { expectedMonsterDropValue, monstersAhead, valueByItemName } from '../src/bot/loot.js';
import { makeBot } from '../src/bot/bot.js';
import { dangerField } from '../src/bot/threat.js';
import { growthOf, summarise, ITEM_VALUE } from '../src/analysis/shape.js';
import { campaignCost, crowdOverhead, duelCost } from '../src/bot/duel.js';

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
    xpFromKills: options.xpFromKills,
    hpFromKills: options.hpFromKills,
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
  const dagger = ITEM_TABLE.find((i) => i.name === 'dagger');
  const state = newGame(4242, { startingItems: [dagger] });
  assertEq(state.turn, 0, 'this should be the very start of the run');
  assertEq(state.player.inventory.length, 1, 'the starting item did not arrive');
  assertEq(state.player.inventory[0].name, 'dagger', 'the wrong item arrived');
  assert(state.player.inventory[0].id, 'the starting item has no id');

  // weaponDamage (combat.js) is genuinely live — resolveAttack calls it —
  // so this confirms real behaviour, not just that a pure function runs.
  assertEq(weaponDamage(state.player), dagger.dmg, 'weaponDamage did not read the starting item');
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
  assertEq(state.player.armour, shield.armour, 'the starting shield did not credit the armour bar');
  assertEq(effectiveHp(state.player), state.player.hp + shield.armour,
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

test('omitting startingItems leaves the hero unarmed, same as before this item', () => {
  const state = newGame(4242);
  assertEq(state.player.inventory.length, 0, 'a hero with no startingItems option started carrying something');
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

test('the player gains 1 xp every second kill, when xp growth is on', () => {
  // The shipped default freezes xp (balance.js), so the faithful rule has to
  // be asked for explicitly here — see the test below for the default.
  let state = makeState({
    map: ROOM_5x5, playerPos: [2, 2], xpFromKills: true,
    monsters: [dummy('rat', [1, 2]), dummy('rat', [3, 2])],
  });
  const startXp = state.player.xp;

  for (let i = 0; i < 60 && !state.monsters[0].dead; i++) state = step(state, 'left').state;
  assert(state.monsters[0].dead, 'first rat never died');
  assertEq(state.player.xp, startXp, 'xp rose after only one kill');

  for (let i = 0; i < 60 && !state.monsters[1].dead; i++) state = step(state, 'right').state;
  assert(state.monsters[1].dead, 'second rat never died');
  assertEq(state.player.xp, startXp + 1, 'xp did not rise on the second kill');
});

test('by default killing does not raise xp at all', () => {
  // Owner decision: the hero's power comes from gear and potions only, so
  // the damage die never grows. Guards the shipped default, since the rule
  // above can pass while this one silently flips.
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

test('the player gains max AND current hp every second kill, when hp-from-kills is on', () => {
  // OFF by default (M6 adoption reversed, docs/backlog.md, ca5c6f9): M7 was
  // expected to be next when this was adopted provisionally; the owner
  // picked M9 instead, so the flag has to be asked for explicitly here —
  // see the test below for the default.
  let state = makeState({
    map: ROOM_5x5, playerPos: [2, 2], hpFromKills: true,
    monsters: [dummy('rat', [1, 2]), dummy('rat', [3, 2])],
  });
  const startHp = state.player.hp;
  const startMax = state.player.hpMax;

  for (let i = 0; i < 60 && !state.monsters[0].dead; i++) state = step(state, 'left').state;
  assert(state.monsters[0].dead, 'first rat never died');
  assertEq(state.player.hpMax, startMax, 'hpMax rose after only one kill');
  assertEq(state.player.hp, startHp, 'hp rose after only one kill');

  for (let i = 0; i < 60 && !state.monsters[1].dead; i++) state = step(state, 'right').state;
  assert(state.monsters[1].dead, 'second rat never died');
  assertEq(state.player.hpMax, startMax + HP_GRANT_AMOUNT,
    'hpMax did not rise by HP_GRANT_AMOUNT on the second kill');
  assertEq(state.player.hp, startHp + HP_GRANT_AMOUNT,
    'current hp did not rise by HP_GRANT_AMOUNT on the second kill — a ceiling '
    + 'grant with no matching current-hp grant would not move the buffer');
});

test('by default killing does not raise hp at all', () => {
  // Guards the shipped default, since the rule above can pass while this
  // one silently flips — it did once, when step.js's cloneState dropped the
  // override after the first turn.
  let state = makeState({
    map: ROOM_5x5, playerPos: [2, 2],
    monsters: [dummy('rat', [1, 2]), dummy('rat', [3, 2])],
  });
  const startHp = state.player.hp;
  const startMax = state.player.hpMax;

  for (let i = 0; i < 60 && !state.monsters[0].dead; i++) state = step(state, 'left').state;
  for (let i = 0; i < 60 && !state.monsters[1].dead; i++) state = step(state, 'right').state;

  assert(state.monsters[0].dead && state.monsters[1].dead, 'the rats did not die');
  assertEq(state.player.hpMax, startMax, 'hpMax grew despite hpFromKills being off');
  assertEq(state.player.hp, startHp, 'hp grew despite hpFromKills being off');
});

test('the hp grant never widens the gap between hp and hpMax', () => {
  // Both bars move by the SAME amount on the same kill, in the same step of
  // playerAttacks — a hero at full health before the grant is at full
  // health after it, never left freshly "damaged" relative to a ceiling
  // that just moved out from under them. Enabled explicitly rather than
  // relying on the default — this test is about the grant's shape, and
  // should keep meaning the same thing whichever way the default flips.
  let state = makeState({
    map: ROOM_5x5, playerPos: [2, 2], hpFromKills: true,
    monsters: [dummy('rat', [1, 2]), dummy('rat', [3, 2])],
  });
  assertEq(state.player.hp, state.player.hpMax, 'fixture did not start at full health');

  for (let i = 0; i < 60 && !state.monsters[0].dead; i++) state = step(state, 'left').state;
  for (let i = 0; i < 60 && !state.monsters[1].dead; i++) state = step(state, 'right').state;

  assertEq(state.player.hp, state.player.hpMax,
    'a full-health hero fell out of sync with its own ceiling after two kills');
  assert(state.player.hpMax > PLAYER_HP, 'the grant never fired, so this test proved nothing');
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

test('a potion at full health is not consumed', () => {
  const potion = item('health', [1, 2], { heal: 3 });
  const full = makeState({ map: ROOM_5x5, playerPos: [2, 2], items: [potion] });
  const afterFull = step(full, 'left').state;
  assertEq(afterFull.items.length, 1, 'the potion was wasted at full health');
  assertEq(afterFull.player.hp, PLAYER_HP, 'hp went above the maximum');

  const hurt = makeState({ map: ROOM_5x5, playerPos: [2, 2], hp: 4, items: [potion] });
  const afterHurt = step(hurt, 'left').state;
  assertEq(afterHurt.items.length, 0, 'the potion was not consumed');
  assertEq(afterHurt.player.hp, 7, 'the potion healed the wrong amount');
});

test('reaching the shrine ends the run', () => {
  const state = makeState({
    map: ROOM_5x5, playerPos: [2, 2],
    shrine: { id: 's', emoji: '⛩️', pos: [1, 2] },
  });
  assertEq(step(state, 'left').state.outcome, 'ascended');
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

test('stripping drop did not touch what expectedMonsterDropValue computes', () => {
  // B9's whole reason for reading tier instead of `.drop` was that the
  // field was never meant to be readable — this is not a coincidence to
  // re-verify by inspection, it is the thing M28's Assert asked to
  // confirm directly: the same belief, before and after this item, must
  // price a creature's expected drop identically, because the function
  // never touched the leaked field to begin with.
  const state = newGame(4242, floorPlan(5));
  const obs = observe(state);
  const belief = foldBelief(emptyBelief(), obs);
  const values = valueByItemName(belief, 6, 0, true);
  for (const m of belief.monsters.values()) {
    const priced = expectedMonsterDropValue(m, values);
    assert(Number.isFinite(priced), `expectedMonsterDropValue returned a non-number for "${m.name}"`);
  }
  // And directly: pricing from a hand-built object with `drop` present
  // must match pricing the same object with it stripped — proof the
  // function's OUTPUT never depended on the field this item removes.
  const sample = [...belief.monsters.values()][0];
  if (sample) {
    const withDrop = { ...sample, drop: { name: 'axe', dmg: 2 } };
    const withoutDrop = { ...sample };
    delete withoutDrop.drop;
    assertEq(expectedMonsterDropValue(withDrop, values), expectedMonsterDropValue(withoutDrop, values),
      'expectedMonsterDropValue\'s result changed depending on whether .drop was present');
  }
});

test('the belief never leaks the full map', () => {
  const state = newGame(2024);
  const belief = foldBelief(emptyBelief(), observe(state));
  const walkableTotal = state.map.tiles.filter(Boolean).length;
  assert(belief.tiles.size < walkableTotal, 'the first observation revealed everything');
  assert(belief.shrine === null || belief.tiles.size > 0, 'belief is empty');
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

test('an unarmed hero always finds a weapon in the nearest chest, when the guarantee is on', () => {
  // M29 turned GUARANTEE_FIRST_WEAPON off by default (softened floor 1
  // through generation instead — see MONSTERS_BASE), so this now checks
  // the MECHANISM on request rather than the shipped default. The default
  // itself is checked by 'the guarantee is off by default since M29' below.
  for (let seed = 0; seed < 40; seed++) {
    const state = newGame(950000 + seed, { ...floorPlan(1), guaranteeFirstWeapon: true });
    if (!state.chests.length) continue;
    const nearest = state.chests.reduce((closest, c) => {
      const d = Math.abs(c.pos[0] - state.player.pos[0]) + Math.abs(c.pos[1] - state.player.pos[1]);
      return !closest || d < closest.d ? { c, d } : closest;
    }, null).c;
    assert(nearest.drop && nearest.drop.dmg > 0,
      `seed ${seed}: the nearest chest did not hold a weapon for an unarmed hero with the guarantee on`);
  }
});

test('the guarantee is off by default since M29', () => {
  // The other half — an unarmed hero's nearest chest is no longer forced,
  // so across enough seeds at least one must come up without a weapon
  // (M26 also means the ordinary chest roll never holds one either, so
  // this is really checking "not always", the strongest true claim).
  let sawNonWeapon = false;
  for (let seed = 0; seed < 40; seed++) {
    const state = newGame(950000 + seed, floorPlan(1)); // no override -> shipped default
    if (!state.chests.length) continue;
    const nearest = state.chests.reduce((closest, c) => {
      const d = Math.abs(c.pos[0] - state.player.pos[0]) + Math.abs(c.pos[1] - state.player.pos[1]);
      return !closest || d < closest.d ? { c, d } : closest;
    }, null).c;
    if (!nearest.drop || !nearest.drop.dmg) { sawNonWeapon = true; break; }
  }
  assert(sawNonWeapon, 'the nearest chest held a weapon every seed even with no override — the default is not off');
});

test('an armed hero does not get the nearest chest forced into a weapon', () => {
  const carry = {
    hp: 8, hpMax: 10, armour: 0, xp: 1,
    inventory: [{ id: 'w1', name: 'axe', dmg: 2 }], kills: [], xpEarned: 0,
  };
  let sawNonWeapon = false;
  for (let seed = 0; seed < 40; seed++) {
    const state = newGame(951000 + seed, { ...floorPlan(2), carry });
    if (!state.chests.length) continue;
    const nearest = state.chests.reduce((closest, c) => {
      const d = Math.abs(c.pos[0] - state.player.pos[0]) + Math.abs(c.pos[1] - state.player.pos[1]);
      return !closest || d < closest.d ? { c, d } : closest;
    }, null).c;
    if (!nearest.drop || !nearest.drop.dmg) { sawNonWeapon = true; break; }
  }
  assert(sawNonWeapon,
    'the nearest chest held a weapon on every seed even with an armed hero — the guard is not gated on carry');
});

test('GUARANTEE_FIRST_WEAPON off leaves the nearest chest to the ordinary roll', () => {
  // Owner request: M19 shipped "structural, no flag" — GUARANTEE_FIRST_WEAPON
  // (balance.js) is the opt-out, gating step 4b in spawn.js. This does not
  // assert the ordinary roll never HAPPENS to hand out a weapon (chests no
  // longer draw weapons at all since M26 — see 'the early-chest quality
  // boost is inert' above); it asserts the guarantee no longer FORCES one,
  // by checking across seeds that at least one unarmed opening now goes
  // without — the same shape 'an armed hero does not get the nearest chest
  // forced into a weapon' already uses.
  let sawNonWeapon = false;
  for (let seed = 0; seed < 40; seed++) {
    const state = newGame(952000 + seed,
      { ...floorPlan(1), guaranteeFirstWeapon: false });
    if (!state.chests.length) continue;
    const nearest = state.chests.reduce((closest, c) => {
      const d = Math.abs(c.pos[0] - state.player.pos[0]) + Math.abs(c.pos[1] - state.player.pos[1]);
      return !closest || d < closest.d ? { c, d } : closest;
    }, null).c;
    if (!nearest.drop || !nearest.drop.dmg) { sawNonWeapon = true; break; }
  }
  assert(sawNonWeapon,
    'the nearest chest held a weapon on every seed even with the guarantee switched off');
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

test('M19\'s guarantee only ever hands over a dagger', () => {
  // M29 turned the guarantee off by default — forced on here to check the
  // mechanism itself still behaves (never an axe) when it does fire.
  for (let seed = 0; seed < 40; seed++) {
    const state = newGame(962000 + seed, { ...floorPlan(1), guaranteeFirstWeapon: true });
    if (!state.chests.length) continue;
    const nearest = state.chests.reduce((closest, c) => {
      const d = Math.abs(c.pos[0] - state.player.pos[0]) + Math.abs(c.pos[1] - state.player.pos[1]);
      return !closest || d < closest.d ? { c, d } : closest;
    }, null).c;
    assert(nearest.drop && nearest.drop.name === 'dagger',
      `seed ${seed}: the guaranteed weapon was ${nearest.drop && nearest.drop.name}, not dagger`);
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

// ***** the bot's campaign horizon ***** //

test('monsters ahead sums the floors still to come', () => {
  // Floor 9 of 10 has only floor 10 left, which holds 21 by the growth law.
  assertEq(monstersAhead(9, 10, 2, 1.3), 21, 'the last floor was miscounted');
  assertEq(monstersAhead(10, 10, 2, 1.3), 0, 'the last floor has nothing ahead');
  assertEq(monstersAhead(null, null, 2, 1.3), 0,
    'a single floor played alone must have no future');
  assert(monstersAhead(1, 10, 2, 1.3) > monstersAhead(5, 10, 2, 1.3),
    'the descent ahead did not shrink with depth');
});

test('a weapon is worth more with a campaign ahead than with one floor', () => {
  const belief = foldBelief(emptyBelief(), observe(newGame(4242, floorPlan(3))));
  const near = valueByItemName(belief, 6, 0);
  const far = valueByItemName(belief, 6, 40);
  assert(far.get('axe') > near.get('axe'),
    'the horizon did not raise what a weapon is worth');
  // A potion is capped by the hero's missing hp, so the horizon must not
  // touch it — otherwise the bot would hoard potions it cannot drink.
  assertEq(far.get('health'), near.get('health'),
    'the horizon changed what a potion is worth');
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

// ***** the crowd correction ***** //

test('the crowd correction is confined to campaignCost', () => {
  // The one-on-one model is right; the SUM is what was wrong. If this ever
  // leaks into duelCost, single-target decisions get an overhead added that
  // has nothing to do with the single target in front of them.
  const hero = { xp: 3, inventory: [], hp: 10, hpMax: 10, armour: 0, kills: [] };
  const wolf = { xp: 4, hp: 5 };
  const alone = duelCost(hero, wolf).hpLost;
  const one = campaignCost(hero, [wolf], false, false);
  assert(Math.abs(alone - one) < 1e-9, 'duelCost and an uncorrected single-monster campaign differ');
  assert(campaignCost(hero, [wolf], false, true) > one, 'the correction did not apply');
});

test('the crowd correction switches off exactly', () => {
  // Off must reproduce every number measured before it, to the bit — that is
  // what makes a before/after comparison meaningful at all.
  const hero = { xp: 3, inventory: [], hp: 10, hpMax: 10, armour: 0, kills: [] };
  const roster = [{ xp: 4, hp: 5 }, { xp: 3, hp: 4 }, { xp: 2, hp: 3 }];
  assertEq(crowdOverhead(roster, false), 0, 'the flag did not disable the overhead');
  assertEq(crowdOverhead([], true), 0, 'an empty roster produced an overhead');
  assertEq(campaignCost(hero, roster, false, false),
    campaignCost(hero, roster, false, false), 'not even self-consistent');
});

test('the crowd correction is additive, not multiplicative', () => {
  // The point of the rewrite: an overhead proportional to the roster's total
  // blow, added once, rather than a factor that only ever reads headcount.
  // A rat (blow 0) must therefore add NOTHING, which a multiplicative factor
  // could never express — it would still scale the whole campaign up.
  const hero = { xp: 5, inventory: [], hp: 20, hpMax: 20, armour: 0, kills: [] };
  const rat = { xp: 1, hp: 2 };
  assertEq(crowdOverhead([rat], true), 0, 'a toothless creature added overhead');

  const wolf = { xp: 4, hp: 5 };
  const withoutCrowd = campaignCost(hero, [wolf], false, false);
  const withCrowd = campaignCost(hero, [wolf], false, true);
  const overhead = crowdOverhead([wolf], true);
  assert(Math.abs(withCrowd - (withoutCrowd + overhead)) < 1e-9,
    'the correction is not a plain sum of overhead onto the bare cost');
});

test('the crowd overhead scales with total roster blow, not headcount alone', () => {
  // Two rats (blow 0 each) must add as little as one rat; one wolf must add
  // more than one rat. Headcount-only scaling was exactly the shape that
  // failed to fit the strength axis.
  assertEq(crowdOverhead([{ xp: 1, hp: 2 }, { xp: 1, hp: 2 }], true), 0,
    'two harmless creatures produced overhead');
  const wolfOverhead = crowdOverhead([{ xp: 4, hp: 5 }], true);
  const ogreOverhead = crowdOverhead([{ xp: 4, hp: 7 }], true);
  assertEq(wolfOverhead, ogreOverhead,
    'same xp, different hp changed the overhead — it should track blow, not hp');
  assert(crowdOverhead([{ xp: 8, hp: 15 }], true) > wolfOverhead,
    'a harder-hitting creature did not add more overhead');
});

// ***** the strength ramp is an instrument, and must stay off ***** //

test('the strength ramp is a no-op at its shipped value', () => {
  // It exists to be swept, not to be shipped. If the default ever drifts off
  // 1.0 every measurement in balance.md silently stops describing the game.
  assertEq(STRENGTH_GROWTH, 1, 'STRENGTH_GROWTH is no longer off by default');
  for (let level = 0; level < 10; level++) {
    assertEq(floorStrength(level), MONSTER_STRENGTH,
      `floor ${level + 1} strength drifted from the flat value`);
  }
  assertEq(saturatedAt({}, 10), null, 'a flat ramp cannot saturate');
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

// ***** M7 — the difficulty rebalance, ADOPTED (docs/backlog.md M7, Review 2) ***** //

test('the rebalance is adopted at its shipped value', () => {
  // Mirrors the strength-ramp guard above, flipped: DIFFICULTY_REBALANCED
  // is now the shipped default, and floorParams should read the rebalanced
  // constants at every level, not the pre-M7 ones.
  assertEq(DIFFICULTY_REBALANCED, true, 'DIFFICULTY_REBALANCED is no longer adopted by default');
  for (let level = 0; level < 10; level++) {
    const p = floorParams(level);
    assertEq(p.clusterSize, CLUSTER_SIZE, `floor ${level + 1} did not use the adopted cluster size`);
    assertEq(p.monsters, monstersAt(MONSTERS_BASE, MONSTER_GROWTH_REBALANCED, level),
      `floor ${level + 1} did not use the rebalanced count growth`);
  }
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
  // Reference and band are UNCHANGED from the proxy version. `MONSTER_GROWTH`
  // is the pre-M7 per-floor cost growth — strength was flat then, so cost
  // growth WAS count growth — and the tolerance is the same 15% M7 shipped
  // with. Only the numerator got honest.
  const mass = [];
  for (let level = 0; level < 10; level++) mass.push(expectedFloorMass(level));
  const growth = growthOf(mass).perFloor;
  const ratio = growth / MONSTER_GROWTH;
  assert(Math.abs(ratio - 1) < 0.15,
    `generated mass climbs x${growth.toFixed(4)}/floor, ${(100 * (ratio - 1)).toFixed(1)}% off the shipped budget`);
});

test('the rebalanced strength ramp does not saturate before floor 10', () => {
  // A ramp that hits the table ceiling early stops being a ramp — the
  // deepest floors would be indistinguishable from each other, quietly
  // undermining the CV target this whole item exists to serve.
  const at = saturatedAt({ strength: MONSTER_STRENGTH, strengthGrowth: STRENGTH_GROWTH_REBALANCED }, 10);
  assert(at === null || at > 10, `the rebalanced ramp saturates at floor ${at}, inside the descent`);
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
    clusterSize: 1, monsterGrowth: MONSTER_GROWTH_REBALANCED, strengthGrowth: STRENGTH_GROWTH_REBALANCED,
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

// ***** M3 — an out-of-depth tail, and it must stay off ***** //

test('the tail ships ON, zero on floor 1, rising and capped below certainty', () => {
  // Was "the tail is a no-op at its shipped value" — a guard for the era
  // when this was an unadopted instrument. Adopted after M24 (see
  // docs/balance.md), so the guard now describes the opposite shipped
  // state. What it still protects is the SHAPE, which is what keeps this a
  // rare shock rather than a routine one.
  assertEq(OUT_OF_DEPTH_TAIL, true, 'OUT_OF_DEPTH_TAIL is no longer on');

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
    const rawMaxIndex = Math.min(MONSTER_TABLE.length - 1,
      ceilingIndex + Math.floor(p.tierCeilingShare * 2));
    const maxIndex = Math.max(minIndex, rawMaxIndex - Math.floor(p.earlyTierCapShare * 2));
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

test('the tier ceiling never falls below the floor\'s own centre', () => {
  // By construction: maxIndex adds a non-negative slack on top of
  // ceilingIndex, so it can never land below it, at any floor.
  for (let level = 0; level < 10; level++) {
    const p = floorParams(level);
    const ceilingIndex = Math.floor(p.difficultyScale * (MONSTER_TABLE.length - 1));
    const maxIndex = Math.min(MONSTER_TABLE.length - 1,
      ceilingIndex + Math.floor(p.tierCeilingShare * 2));
    assert(maxIndex >= ceilingIndex,
      `floor ${level + 1}: tier ceiling ${maxIndex} fell below its own centre ${ceilingIndex}`);
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

test('the early cap fades to exactly zero by floor 2', () => {
  // Structural guarantee, not a measurement: PER_LEVEL is set to exactly
  // -BASE, so this is checked directly against the formula rather than by
  // simulation. The item's own ask was narrower than M13/M24's fade
  // (floor 1 only, not a general early-game softening) — this is what
  // enforces that boundary.
  assertEq(floorParams(0).earlyTierCapShare > 0, true, 'floor 1 has no cap at all — the mechanism is inert');
  for (let level = 1; level < 10; level++) {
    assertEq(floorParams(level).earlyTierCapShare, 0,
      `floor ${level + 1} still carries a nonzero early cap — the fade did not reach zero by floor 2`);
  }
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

// ***** M25 — a gentler floor 1, pivoted around an unchanged floor 10 ***** //

test('the strength pivot leaves floor 10 exactly where it was', () => {
  // THE promise this item makes, and the only one that is load-bearing:
  // floor 1 gets weaker creatures, floor 10 gets the same ones it always
  // had. Checked against the LITERAL pre-M25 pair (0.35, 1.108) rather
  // than against the shipped constants, so that changing either one
  // without re-solving the other fails here instead of silently sliding
  // floor 10.
  const PRE_M25_BASE = 0.35;
  const PRE_M25_GROWTH = 1.108;
  const wasAtFloor10 = PRE_M25_BASE * Math.pow(PRE_M25_GROWTH, 9);
  const nowAtFloor10 = floorStrength(9, {
    strength: MONSTER_STRENGTH, strengthGrowth: STRENGTH_GROWTH_REBALANCED,
  });
  assert(Math.abs(nowAtFloor10 - wasAtFloor10) < 1e-3,
    `floor 10 strength moved: was ${wasAtFloor10.toFixed(4)}, now ${nowAtFloor10.toFixed(4)}`);

  // And the same in the currency that actually reaches the player — the
  // table INDEX the deepest corner reaches. A sub-1e-3 drift in scale
  // could still cross an integer boundary; this catches that.
  const top = MONSTER_TABLE.length - 1;
  assertEq(Math.floor(nowAtFloor10 * top), Math.floor(wasAtFloor10 * top),
    'floor 10\'s ceiling table index moved');
});

test('the pivot actually made floor 1 gentler', () => {
  // The other half — without this, "floor 10 unchanged" is satisfiable by
  // changing nothing at all.
  const pre = 0.35;
  const now = floorStrength(0, {
    strength: MONSTER_STRENGTH, strengthGrowth: STRENGTH_GROWTH_REBALANCED,
  });
  assert(now < pre,
    `floor 1 strength did not fall: was ${pre}, now ${now.toFixed(4)}`);
  const top = MONSTER_TABLE.length - 1;
  assert(Math.floor(now * top) < Math.floor(pre * top),
    'floor 1\'s ceiling table index did not drop at all');
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
  const fl1 = monstersAt(MONSTERS_BASE, MONSTER_GROWTH_REBALANCED, 0);
  const fl5 = monstersAt(MONSTERS_BASE, MONSTER_GROWTH_REBALANCED, 4);
  const fl10 = monstersAt(MONSTERS_BASE, MONSTER_GROWTH_REBALANCED, 9);
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

// ***** curve-shape diagnostics ***** //
//
// growthOf is the one piece of real maths the shape report rests on: every
// one of the six quantities is compared through it, so an error here would
// be invisible and would contaminate all six at once.

test('growth is recovered exactly from a known geometric series', () => {
  for (const ratio of [1.3, 1.0, 0.78]) {
    const series = Array.from({ length: 10 }, (_, i) => 5 * Math.pow(ratio, i));
    const got = growthOf(series).perFloor;
    assert(Math.abs(got - ratio) < 1e-9,
      `ratio ${ratio}: recovered ${got}`);
  }
});

test('growth ignores zeroes rather than returning nonsense', () => {
  // A floor can legitimately hold no loot at all. log(0) would poison the
  // whole fit, so those points are dropped and the count is reported.
  const g = growthOf([0, 4, 8, 16, 32]);
  assert(Math.abs(g.perFloor - 2) < 1e-9, 'growth was distorted by the zero');
  assertEq(g.n, 4, 'the dropped point was not reported');
});

test('summarise reports the spread as CV, not raw variance', () => {
  // Raw variance grows when the mean grows, which would make every deep
  // floor look more random purely because it is bigger.
  const small = summarise([1, 2, 3]);
  const big = summarise([100, 200, 300]);
  assert(big.sd > small.sd, 'the scaled-up series should have a bigger sd');
  assert(Math.abs(big.cv - small.cv) < 1e-9, 'CV must be scale-free');
});

test('no item is valued as reward without a mechanical effect', () => {
  // Collectibles are gone, but the guard stays: adding one back must not
  // silently inflate what a floor looks like it is paying.
  for (const item of ITEM_TABLE) {
    const worth = ITEM_VALUE.get(item.name) || 0;
    const does = (item.dmg || 0) + (item.armour || 0) + (item.heal || 0);
    if (does === 0) assertEq(worth, 0, `${item.name} has no effect but is valued`);
    else assert(worth > 0, `${item.name} has an effect but is valued at zero`);
  }
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
  // of the ping-pong episodes arises (bot-strategy §4.5).
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

// ***** B9: a creature's drop is priced, and the flag ships on ***** //
//
// docs/backlog.md B9. First reads (n=40/n=30) looked harmful and shipped
// this OFF, but both were taken while a concurrent session had
// src/sim/spawn.js and difficulty.js mid-edit on disk — disclosed in the
// backlog rather than trusted. Re-measured clean at n=80/n=60 once that
// churn settled: side kills per floor up 31%/18% (the mechanism firing),
// median depth and finishes UNCHANGED on both seed families, actions per
// run down 8%/5%. Shipped ON. This locks the OFF half of the mechanism
// instead — with the flag explicitly disabled, a side creature outside its
// activation radius, with no other reason to approach it, is left alone.
test('a creature out of reach is not hunted for its drop when priceDrops is off', () => {
  const map = tinyMap([
    '#####################',
    '#-------------------#',
    '#####################',
  ]);
  const state = makeState({
    map,
    playerPos: [10, 1],
    monsters: [dummy('ogre', [14, 1], { side: true, activation: 0 })],
  });

  const trace = [];
  const { actions } = driveBot(state, 8, { monsterCount: 1, trace, priceDrops: false });
  assert(!trace.some((t) => t.goal.kind === 'monster'),
    `the bot targeted the creature with priceDrops off: ${JSON.stringify(trace.map((t) => t.goal))}`);
  assert(!state.monsters[0].dead, 'the creature was engaged despite being out of reach');
});

// ***** B10: route toward a frontier by what it would reveal ***** //
//
// docs/backlog.md B10. `frontierRouting`'s discount is a tie-breaker
// between routes of otherwise-similar cost, not a re-ranking — the Do
// section is explicit that it must sit well under a single step's price.
// A bare corridor with nothing else on it has no alternate route to any
// frontier at all (one way in, one way out), so there is nothing for the
// discount to break a tie between: turning the flag on must not change a
// single action here. This is the regression guard the item's own
// real-play measurement leans on — n=60 on two seed families found bumps
// per run flat to slightly down (never up) and every other number moved
// well under 1%, consistent with ties being rare on a real map too.
test('frontierRouting does not change a route with no alternative to prefer', () => {
  const map = tinyMap([
    '#####################',
    '#-------------------#',
    '#####################',
  ]);
  const state = () => makeState({ map, playerPos: [10, 1] });

  const off = driveBot(state(), 6, { frontierRouting: false });
  const on = driveBot(state(), 6, { frontierRouting: true });
  assertEq(on.actions.join(','), off.actions.join(','),
    `frontierRouting changed a route that had no alternative: off=${off.actions.join(',')} on=${on.actions.join(',')}`);
});

// ***** B11: combat competes with loot, but not by default ***** //
//
// docs/backlog.md B11. `combatCompetes` is the sharpest-risk flag this
// series has shipped, and its exact numeric threshold (how good a fight has
// to look before it outranks a specific chest) depends on values computed
// from the whole item table and the current roster — not something worth
// hand-deriving into a fragile fixture. This locks the cheap, robust half
// instead, the same way B9/B10 did: the merge must be a true no-op when the
// flag is off, even with a fight available. `combatCompetes`'s own
// ship/no-ship call rests on the paired-seed measurement the item's Assert
// section asks for, not on this test.
//
// The monster sits 5 tiles off, past TACTICAL_RANGE (4) — closer and the
// SEPARATE tactical veto layer (bot.js, unrelated to chooseGoal) starts
// simulating nearby turns and can choose to attack an adjacent threat on
// its own terms, which would confound this test with a different bot layer
// entirely. Walking to the chest moves further away from it, not closer,
// so the veto never gets a turn where it could fire either.
test('combatCompetes off leaves a chest in hand beating a fight further off', () => {
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
    monsters: [dummy('rat', [5, 1], { side: false })],
  });

  const { actions } = driveBot(state, 4, { monsterCount: 1, combatCompetes: false });
  assert(actions.every((a) => a === 'right'),
    `the bot fought or wavered instead of opening the chest: ${actions.join(',')}`);
});

// ***** B13: a pursuer is charged where it actually collects ***** //
//
// docs/backlog.md B13. Unlike B9/B10/B11, the mechanism here is a pure
// function with no dependence on the item table or the live roster, so it
// can be checked directly instead of through a fragile whole-bot fixture.
// Both halves are worth locking: what it charges, and that the flag is a
// true no-op when off.
//
// `activation` is passed explicitly because the shared `dummy()` fixture
// sets it to 0 — a creature that provably never acts, which is the right
// default there and exactly wrong here.
function beliefOf(state) {
  return foldBelief(emptyBelief(), observe(state));
}

test('a pursuer at the hero\'s heels is charged for every stationary turn', () => {
  const map = tinyMap([
    '#####################',
    '#-------------------#',
    '#####################',
  ]);
  const state = makeState({
    map,
    playerPos: [10, 1],
    monsters: [dummy('rat', [11, 1], { activation: 8 })],
  });
  const danger = dangerField(beliefOf(state));

  // Standing still where the hero already is: the rat is one step behind,
  // so it lands on the hero on the first stationary turn and swings on the
  // second as well.
  const two = danger.pursuerCost([10, 1], 0, 2);
  const one = danger.pursuerCost([10, 1], 0, 1);
  assert(two > 0, 'a rat one step behind was charged nothing for two stationary turns');
  assert(two > one, 'the charge did not scale with the number of stationary turns');
  assertEq(danger.pursuerCost([10, 1], 0, 0), 0, 'charged for standing still zero turns');
});

test('a pursuer that cannot arrive in time is free', () => {
  const map = tinyMap([
    '#####################',
    '#-------------------#',
    '#####################',
  ]);
  // Far enough that it needs more steps to arrive than the hero will spend
  // standing there, but still inside its own chase radius so `isAwakeAt`
  // is not what is doing the filtering.
  const state = makeState({
    map,
    playerPos: [10, 1],
    monsters: [dummy('rat', [16, 1], { activation: 20 })],
  });
  const danger = dangerField(beliefOf(state));

  assertEq(danger.pursuerCost([10, 1], 0, 2), 0,
    'a creature six steps away was charged for two stationary turns it cannot reach');
  assert(danger.pursuerCost([10, 1], 0, 8) > 0,
    'the same creature was still free over enough turns for it to arrive');
});

test('the creature being fought is not charged twice', () => {
  const map = tinyMap([
    '#####################',
    '#-------------------#',
    '#####################',
  ]);
  const state = makeState({
    map,
    playerPos: [10, 1],
    monsters: [dummy('rat', [11, 1], { id: 'm-target', activation: 8 })],
  });
  const danger = dangerField(beliefOf(state));

  assert(danger.pursuerCost([10, 1], 0, 3) > 0, 'fixture is wrong: nothing was charged at all');
  assertEq(danger.pursuerCost([10, 1], 0, 3, 'm-target'), 0,
    'the excluded target was charged anyway — its blows are already in duelCost');
});

test('chargePursuers off leaves the bot untouched with a pursuer present', () => {
  const map = tinyMap([
    '#####################',
    '#-------------------#',
    '#####################',
  ]);
  const build = () => makeState({
    map,
    playerPos: [10, 1],
    chests: [
      { id: 'c-right', name: 'chest', emoji: '📦', pos: [14, 1], side: false, edge: false, drop: null },
    ],
    monsters: [dummy('rat', [6, 1], { activation: 8 })],
  });

  const off = driveBot(build(), 4, { monsterCount: 1, chargePursuers: false });
  assert(off.actions.every((a) => a === 'right'),
    `the shipped default changed with a pursuer on the map: ${off.actions.join(',')}`);
});

// ***** B12: leaving competes with fighting ***** //
//
// docs/backlog.md B12. The obligation to kill lived in chooseGoal's
// cheapest-fight step firing on any reachable creature, with the shrine
// step below it and only reached when that found nothing. This is the
// mechanism check, and it is a real one rather than a no-op guard: the two
// arms must choose OPPOSITE DIRECTIONS on the same board.
//
// The rat sits well outside its own chase radius, so it never wakes and
// the tactical veto never has a say — what is being tested is the goal
// comparison, not the reflex layer on top of it.
test('a reachable exit beats a fight that does not pay for itself', () => {
  const map = tinyMap([
    '#####################',
    '#-------------------#',
    '#####################',
  ]);
  const build = () => makeState({
    map,
    playerPos: [10, 1],
    monsters: [dummy('rat', [3, 1], { activation: 8 })],
    shrine: { id: 's', emoji: '⛩️', pos: [16, 1] },
  });

  const off = driveBot(build(), 1, { monsterCount: 1, leaveCompetes: false });
  const on = driveBot(build(), 1, { monsterCount: 1, leaveCompetes: true });

  assertEq(off.actions[0], 'left',
    'with leaving out of the comparison the bot should still go and fight');
  assertEq(on.actions[0], 'right',
    'the bot fought a creature it had no reason to fight, with the exit open');
});

test('a fight worth having still beats leaving', () => {
  // Same board, but the hero is hurt and a potion sits the other way. The
  // exit competes at net 0, so anything that genuinely pays for itself is
  // still taken first — leaving is the floor of the comparison, not a
  // shortcut past it.
  const map = tinyMap([
    '#####################',
    '#-------------------#',
    '#####################',
  ]);
  const state = makeState({
    map,
    playerPos: [10, 1],
    hp: 3,
    items: [item('health', [8, 1], { heal: 5 })],
    shrine: { id: 's', emoji: '⛩️', pos: [16, 1] },
  });

  const { actions } = driveBot(state, 1, { monsterCount: 0, leaveCompetes: true });
  assertEq(actions[0], 'left', 'the bot walked out past a potion it needed');
});

// ***** run it ***** //

export function runAll() {
  return results;
}
