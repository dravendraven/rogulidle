// Rule tests for the P1 engine, checked against docs/rogule-spec.md.
// Run them with: python tools/dev-server.py -> http://localhost:8138/run-tests.html

import {
  HP_GRANT_AMOUNT, ITEM_TABLE, MONSTER_TABLE, OUT_OF_DEPTH_TAIL, PLAYER_HP,
} from '../src/sim/balance.js';
import { newGame, playGame, replayGame } from '../src/sim/game.js';
import { step, ACTIONS } from '../src/sim/step.js';
import { observe, emptyBelief, foldBelief } from '../src/sim/observe.js';
import { weaponDamage, armourValue } from '../src/sim/combat.js';
import { findPath, playerPassable, posKey } from '../src/sim/mapgen.js';
import { drawLogUniform, makeRng } from '../src/sim/rng.js';
import { classifyRooms, spineShare } from '../src/sim/spine.js';
import { itemWeights, monsterWeightsAround } from '../src/sim/spawn.js';
import { floorPlan } from '../src/sim/dungeon.js';
import {
  expectedFloorMass, floorParams, floorStrength, makeFloorPlan, monstersAt,
  outOfDepthChanceAt, saturatedAt,
  CLUSTER_SIZE, DIFFICULTY_REBALANCED, MONSTER_GROWTH, MONSTER_GROWTH_REBALANCED,
  MONSTER_STRENGTH, STRENGTH_GROWTH, STRENGTH_GROWTH_REBALANCED,
} from '../src/sim/difficulty.js';
import { monstersAhead, valueByItemName } from '../src/bot/loot.js';
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

test('a rat can never deal damage', () => {
  // xp 1 rolls only 0, and monsters have no weapons — so damage is always 0.
  const map = tinyMap(['#####', '#...#', '#####']);
  let state = makeState({
    map, playerPos: [2, 1],
    monsters: [dummy('rat', [1, 1], { activation: 99 })],
  });
  for (let i = 0; i < 200; i++) state = step(state, 'rest').state;
  assertEq(state.player.hp, PLAYER_HP, 'player took damage from a rat');
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

test('the shrine sits in the furthest room', () => {
  // Our fix for spec quirk §9.1 — the original sorts by the path vector.
  for (const seed of [11, 22, 33]) {
    const state = newGame(seed);
    const passable = playerPassable(state.map);
    const toShrine = findPath(state.player.pos, state.shrine.pos, passable).length;

    for (const room of state.map.rooms) {
      const path = findPath(state.player.pos, room.center, passable);
      if (!path.length) continue;
      assert(toShrine >= path.length, `a room is further than the shrine on seed ${seed}`);
    }
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
  // monster out of two is already half the mass.
  for (let seed = 0; seed < 6; seed++) {
    const state = newGame(3400 + seed, floorPlan(1));
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

test('depth makes the strong item the common one', () => {
  const weightOf = (entries, name) => {
    const found = entries.find(([item]) => item && item.name === name);
    return found ? found[1] : 0;
  };
  const shallow = itemWeights({}, 'chest', 0);
  const deep = itemWeights({}, 'chest', 1);

  // At the entrance the axe (value 4) is rarer than the dagger (value 3).
  assert(weightOf(shallow, 'axe') < weightOf(shallow, 'dagger'),
    'the strong weapon was not the rare one at depth 0');
  // At the shrine that inverts.
  assert(weightOf(deep, 'axe') > weightOf(deep, 'dagger'),
    'depth did not make the strong weapon the common one');
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
    assertEq(p.monsters, monstersAt(2, MONSTER_GROWTH_REBALANCED, level),
      `floor ${level + 1} did not use the rebalanced count growth`);
  }
});

test('the rebalanced constants hold the challenge budget, in the currency they were fit against', () => {
  // Not a claim that CHALLENGE (measured hp) is unchanged — that needs the
  // observed ruler and a real play-through, done separately and reported in
  // docs/backlog.md M7. This is the cheaper, always-available check: the
  // count->strength trade was derived from a MEASURED exponent (2.356, not
  // 2 — see the archived sweep in balance.md), so the two rebalanced
  // constants should roughly cancel against each other in that currency.
  // A gross mismatch here would mean the constants were mistyped, not just
  // imperfectly tuned.
  const K = 2.356;
  const ratio = MONSTER_GROWTH_REBALANCED * Math.pow(STRENGTH_GROWTH_REBALANCED, K)
    / MONSTER_GROWTH;
  assert(Math.abs(ratio - 1) < 0.15,
    `rebalanced growth*strength^${K} drifted ${(100 * (ratio - 1)).toFixed(0)}% from the shipped budget`);
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

test('the tail is a no-op at its shipped value', () => {
  // Mirrors the M7 no-op guard: a measuring instrument, not a shipped
  // change, until it is adopted.
  assertEq(OUT_OF_DEPTH_TAIL, false, 'OUT_OF_DEPTH_TAIL is no longer off by default');
  for (let level = 0; level < 10; level++) {
    assertEq(floorParams(level).outOfDepthChance, 0,
      `floor ${level + 1} carried a nonzero out-of-depth chance with the flag off`);
  }
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
  const sampledMonsterMass = (scale, minIndex, samples = 5000) => {
    let sum = 0;
    for (let i = 0; i < samples; i++) {
      const depth = (i + 0.5) / samples;
      const index = Math.floor(Math.min(1, depth * scale) * (MONSTER_TABLE.length - 1));
      const entries = monsterWeightsAround(index);
      const total = entries.reduce((s, [, w]) => s + w, 0);
      // Clamp each slot in the blend, not the centre index — matches
      // spawn.js: the centre alone cannot exclude a rat, since the -2
      // spread reaches slot 0 from a centre as high as 2.
      sum += entries.reduce(
        (s, [slot, w]) => s + w * mass(MONSTER_TABLE[Math.max(slot, minIndex)]), 0,
      ) / total;
    }
    return sum / samples;
  };

  for (const level of [0, 4, 9]) {
    const p = floorParams(level);
    const ceilingIndex = Math.floor(p.difficultyScale * (MONSTER_TABLE.length - 1));
    const minIndex = Math.floor(p.tierFloorShare * ceilingIndex);
    const sampled = p.monsters * sampledMonsterMass(p.difficultyScale, minIndex);
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
  // bot) would encounter, seed after seed.
  const lowestSeen = (level, seeds = 40) => {
    let lowest = Infinity;
    for (let seed = 0; seed < seeds; seed++) {
      const state = newGame(90000 + seed, floorPlan(level));
      for (const m of state.monsters) lowest = Math.min(lowest, m.xp);
    }
    return lowest;
  };

  const fl1 = lowestSeen(1);
  const fl5 = lowestSeen(5);
  const fl10 = lowestSeen(10);
  assertEq(fl1, 1, 'floor 1 should still be able to roll a rat (xp 1)');
  assert(fl5 > fl1, `floor 5's lowest tier (xp ${fl5}) did not rise above floor 1's (xp ${fl1})`);
  assert(fl10 > fl5, `floor 10's lowest tier (xp ${fl10}) did not rise above floor 5's (xp ${fl5})`);
});

test('no rat survives past some floor', () => {
  // "No xp 1 creature at all past some floor" — rats are scenery (xp 1
  // means a 0..0 damage roll), so once the floor rises enough to exclude
  // index 0, they should stop appearing entirely, not just get rarer.
  // Finds the shallowest floor whose minIndex guarantees this (>= 1, since
  // the final slot is clamped up to it — see spawn.js), then simulates
  // every floor from there to 10 to confirm it actually holds.
  let threshold = null;
  for (let level = 0; level < 10; level++) {
    const p = floorParams(level);
    const ceilingIndex = Math.floor(p.difficultyScale * (MONSTER_TABLE.length - 1));
    const minIndex = Math.floor(p.tierFloorShare * ceilingIndex);
    if (minIndex >= 1) { threshold = level + 1; break; }
  }
  assert(threshold !== null, 'no floor in the descent ever excludes rats');

  for (let floor = threshold; floor <= 10; floor++) {
    for (let seed = 0; seed < 30; seed++) {
      const state = newGame(92000 + floor * 1000 + seed, floorPlan(floor));
      assert(!state.monsters.some((m) => m.xp === 1),
        `a rat appeared at floor ${floor} (>= threshold ${threshold}), seed ${seed}`);
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

// ***** M12 — fill the floors back up ***** //

test('the floors fill back up without reopening the M7 budget', () => {
  // Baseline this item inherited (MONSTER_GROWTH_REBALANCED was 1.15):
  // 2,2,3,3,3,4,5,5,6,7. Every floor should hold at least that many now,
  // and floor 10 — the emptiest, most visible one — strictly more.
  const before = [2, 2, 3, 3, 3, 4, 5, 5, 6, 7];
  for (let level = 0; level < 10; level++) {
    const count = monstersAt(2, MONSTER_GROWTH_REBALANCED, level);
    assert(count >= before[level],
      `floor ${level + 1} holds ${count}, fewer than the pre-M12 ${before[level]}`);
  }
  assert(monstersAt(2, MONSTER_GROWTH_REBALANCED, 9) > before[9],
    'floor 10 did not actually fill up');

  // M12 raises count without lowering strength growth to compensate, so
  // this item is itself bounded by the M7 budget check staying green —
  // same formula, not a new one, reused here so a future raise cannot
  // silently drift the budget open by changing this test instead of that
  // one.
  const K = 2.356;
  const ratio = MONSTER_GROWTH_REBALANCED * (STRENGTH_GROWTH_REBALANCED ** K) / MONSTER_GROWTH;
  assert(Math.abs(ratio - 1) < 0.15,
    `M12's raised growth pushed the M7 budget ratio to ${ratio.toFixed(3)}, outside its own band`);
});

test('cluster size grew alongside creature count', () => {
  assert(CLUSTER_SIZE >= 10, `CLUSTER_SIZE is ${CLUSTER_SIZE}, expected the M12 raise to at least 10`);
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

// ***** run it ***** //

export function runAll() {
  return results;
}
