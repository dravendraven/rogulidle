// Rule tests for the P1 engine, checked against docs/rogule-spec.md.
// Run them with: python tools/dev-server.py -> http://localhost:8138/run-tests.html

import {
  MONSTER_TABLE, PLAYER_HP,
} from '../src/sim/balance.js';
import { newGame, playGame, replayGame } from '../src/sim/game.js';
import { step, ACTIONS } from '../src/sim/step.js';
import { observe, emptyBelief, foldBelief } from '../src/sim/observe.js';
import { weaponDamage, armourValue } from '../src/sim/combat.js';
import { findPath, playerPassable, posKey } from '../src/sim/mapgen.js';
import { makeRng } from '../src/sim/rng.js';

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
    covers: options.covers ?? [],
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
  assertEq(JSON.stringify(a.covers), JSON.stringify(b.covers), 'covers differ');
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
  const counts = { monsters: 11, covers: 4 };
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

test('opening a cover costs a turn and leaves the loot on the floor', () => {
  const cover = {
    id: 'c1', name: 'rock', emoji: '🪨', pos: [1, 2],
    drop: item('dagger', [1, 2], { dmg: 1 }),
  };
  const state = makeState({ map: ROOM_5x5, playerPos: [2, 2], covers: [cover] });

  const opened = step(state, 'left').state;
  assertEq(opened.turn, 1, 'the turn did not pass');
  assertEq(posKey(opened.player.pos), '2,2', 'the player moved onto the cover');
  assertEq(opened.covers.length, 0, 'the cover survived');
  assertEq(opened.items.length, 1, 'the loot was not dropped');
  assertEq(opened.player.inventory.length, 0, 'the loot was picked up too early');

  // A second turn to actually collect it — spec §6, covers cost 2 turns.
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
  assertEq(state.covers.length, 15, 'cover count');
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
  for (const c of state.covers) assert(walkable(c.pos), `${c.name} is in a wall`);
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

// ***** run it ***** //

export function runAll() {
  return results;
}
