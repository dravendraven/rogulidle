// A1 — docs/project/plano-2026-11.md. THE BOSS ARENA: hero × one unit, many
// times over, through the real engine.
//
// The question it answers is the one the Fera × Matilha design hangs on:
// which single strong creature costs the same hp as which band of three weak
// ones. The paper arithmetic (`6·h·d = H·D` for a band that wakes together,
// `3·h·d` for one that comes one at a time) is a starting point; this is the
// measurement that decides.
//
// Real `step()`, real dice, real skip chance, real blocking — nothing about
// the fight is re-implemented here. What is NOT the game is the room: an open
// arena, no fog that matters, no chests, no route. And the hero is not the
// bot: he waits for the unit to come and then hits ONE creature until it
// falls (focus fire), which is the best a single-target hero can do and the
// thing the bot does when it is cornered. So the hp lost is the cost of the
// FIGHT, not of the bot's decisions around it.
//
// The hero's hp is set out of reach so every duel runs to the end and the
// whole distribution of hp lost is seen; "death" columns read that
// distribution against a real bar (`PLAYER_HP`, plus a shield) afterwards —
// with no armour, hp never changes a blow, so the two are the same fight.

import { ITEM_TABLE, MONSTER_TABLE, PLAYER_HP, PLAYER_XP } from '../sim/balance.js';
import { hashSeeds } from '../sim/rng.js';
import { resolvePersona } from '../sim/heroes.js';
import { step } from '../sim/step.js';
import { duelCost } from '../bot/bot.js';

const ARENA = 11;
const OUT_OF_REACH = 1e6;
// Generous: the slowest pairing (bare hands against a t-rex) ends well
// inside this, and a duel that does not is reported, not hidden.
const TURN_CAP = 400;

function arenaMap() {
  const tiles = [];
  for (let y = 0; y < ARENA; y++) {
    for (let x = 0; x < ARENA; x++) {
      const edge = x === 0 || y === 0 || x === ARENA - 1 || y === ARENA - 1;
      tiles.push(edge ? null : 'room');
    }
  }
  return { w: ARENA, h: ARENA, tiles, rooms: [] };
}

// Where the members of a unit stand when the fight starts: two tiles from
// the hero, on different sides, so the band arrives as a band — the case the
// A3 rule ("one wakes, all wake") produces.
const CENTRE = Math.floor(ARENA / 2);
// Six, for M8's bands of up to six; the first three are the original spots,
// so every unit of three or fewer replays exactly as before.
const SPOTS = [
  [CENTRE - 2, CENTRE], [CENTRE + 2, CENTRE], [CENTRE, CENTRE - 2],
  [CENTRE, CENTRE + 2], [CENTRE - 1, CENTRE - 1], [CENTRE + 1, CENTRE + 1],
];

function arenaState(seed, rows, weapon) {
  const persona = resolvePersona();
  const item = weapon ? ITEM_TABLE.find((i) => i.name === weapon) : null;
  return {
    seed,
    turn: 0,
    outcome: null,
    killedBy: null,
    nextId: 10,
    sim: false,
    rng: { map: hashSeeds(seed, 1), spawn: hashSeeds(seed, 2), combat: hashSeeds(seed, 3) },
    log: [],
    persona,
    map: arenaMap(),
    player: {
      pos: [CENTRE, CENTRE],
      hp: OUT_OF_REACH,
      hpMax: OUT_OF_REACH,
      armour: 0,
      xp: PLAYER_XP,
      inventory: item ? [{ ...item, id: 1 }] : [],
      kills: [],
      xpEarned: 0,
    },
    monsters: rows.map((row, i) => ({
      ...row, id: 2 + i, pos: SPOTS[i].slice(), drop: null, dead: false,
    })),
    items: [],
    chests: [],
    shrine: { pos: [1, 1] },
  };
}

const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

// Focus fire: keep hitting the creature already being hit; otherwise the
// first one adjacent; otherwise stand still and let the unit come — moving
// toward a chaser only trades a free step for nothing (rules.md §4).
function heroAction(state, focus) {
  const [px, py] = state.player.pos;
  const adjacent = state.monsters.filter((m) => !m.dead
    && Math.abs(m.pos[0] - px) + Math.abs(m.pos[1] - py) === 1);
  if (!adjacent.length) return { action: 'rest', focus };
  const target = adjacent.find((m) => m.id === focus) ?? adjacent[0];
  const dir = Object.keys(DIRS).find((d) =>
    px + DIRS[d][0] === target.pos[0] && py + DIRS[d][1] === target.pos[1]);
  return { action: dir, focus: target.id };
}

// One fight to the end. Returns hp lost and turns spent.
export function arenaDuel(seed, rows, weapon = null) {
  let state = arenaState(seed, rows, weapon);
  let focus = null;
  while (state.turn < TURN_CAP && state.monsters.some((m) => !m.dead)) {
    const choice = heroAction(state, focus);
    focus = choice.focus;
    state = step(state, choice.action).state;
  }
  return {
    hpLost: OUT_OF_REACH - state.player.hp,
    turns: state.turn,
    finished: state.monsters.every((m) => m.dead),
  };
}

function row(name) {
  const found = MONSTER_TABLE.find((m) => m.name === name);
  if (!found) throw new Error('unknown creature: ' + name);
  return found;
}

// A unit, written the way the table prints it: 'dragon' is a beast,
// '3 wolf' a band that arrives together, '3 wolf apart' the same band fought
// one at a time (three separate duels, summed).
function parseUnit(label) {
  const [count, name, apart] = /^\d/.test(label) ? label.split(' ') : ['1', label];
  return { label, rows: Array.from({ length: Number(count) }, () => row(name)), apart: apart === 'apart' };
}

function summarise(samples, bars) {
  const n = samples.length;
  const mean = samples.reduce((s, x) => s + x.hpLost, 0) / n;
  const variance = samples.reduce((s, x) => s + (x.hpLost - mean) ** 2, 0) / Math.max(1, n - 1);
  const sorted = samples.map((x) => x.hpLost).sort((a, b) => a - b);
  const out = {
    hpLost: +mean.toFixed(2),
    se: +Math.sqrt(variance / n).toFixed(2),
    p90: sorted[Math.floor(n * 0.9)],
    turns: +(samples.reduce((s, x) => s + x.turns, 0) / n).toFixed(1),
    unfinished: samples.filter((x) => !x.finished).length,
  };
  for (const bar of bars) {
    out[`death@${bar}`] = +(samples.filter((x) => x.hpLost >= bar).length / n).toFixed(3);
  }
  return out;
}

// What the bot believes the unit costs: each member priced alone by
// `duelCost`, summed. The bot never sees that a band fights together
// (docs/bot.md), so this is the same number for '3 wolf' and '3 wolf apart'.
function botPrice(unit, weapon) {
  const item = weapon ? ITEM_TABLE.find((i) => i.name === weapon) : null;
  const player = { xp: PLAYER_XP, inventory: item ? [item] : [] };
  return +unit.rows.reduce((s, m) => s + duelCost(player, m).hpLost, 0).toFixed(2);
}

export const DEFAULT_UNITS = [
  'vampire', 'genie', 'dragon', 't-rex',
  '3 ghost', '3 boar', '3 wolf', '3 ogre', '3 zombie',
  '3 ghost apart', '3 wolf apart', '3 ogre apart',
];

// The table. Every unit faces every weapon over the SAME seeds, so two cells
// in a column differ by the unit and not by the dice they happened to get.
export function bossTable(options = {}) {
  const duels = options.duels ?? 1000;
  const firstSeed = options.firstSeed ?? 700000;
  const units = (options.units ?? DEFAULT_UNITS).map(parseUnit);
  const weapons = options.weapons ?? [null, 'dagger', 'axe'];
  // The bare bar, and the bar with one shield on it.
  const bars = options.bars ?? [PLAYER_HP, PLAYER_HP + ITEM_TABLE.find((i) => i.name === 'shield').armour];

  const table = [];
  for (const unit of units) {
    for (const weapon of weapons) {
      const samples = [];
      for (let i = 0; i < duels; i++) {
        const seed = firstSeed + i;
        if (unit.apart) {
          const parts = unit.rows.map((r, k) => arenaDuel(hashSeeds(seed, 100 + k), [r], weapon));
          samples.push({
            hpLost: parts.reduce((s, p) => s + p.hpLost, 0),
            turns: parts.reduce((s, p) => s + p.turns, 0),
            finished: parts.every((p) => p.finished),
          });
        } else {
          samples.push(arenaDuel(seed, unit.rows, weapon));
        }
      }
      table.push({
        unit: unit.label, weapon: weapon ?? 'bare',
        ...summarise(samples, bars),
        botPrice: botPrice(unit, weapon),
      });
    }
  }
  return { duels, firstSeed, table };
}
