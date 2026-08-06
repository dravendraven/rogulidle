// The turn loop. Spec: docs/rogule-spec.md §6.
//
// step() is PURE: it clones the state, works on the clone, and hands it back
// with the observation that follows. No DOM, no Date.now(), no storage.
// The map is never cloned — it is immutable once generated.

import { REGEN_CAP_FRACTION, REJUVINATION_RATE } from './balance.js';
import { isWalkable, samePos } from './mapgen.js';
import { playerAttacks } from './combat.js';
import { updateMonsters } from './monsters.js';
import { observe } from './observe.js';

// The five actions the bot chooses between, every turn.
export const ACTIONS = ['up', 'down', 'left', 'right', 'rest'];

const DIRECTIONS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

function cloneState(state) {
  const copyItem = (item) => (item ? { ...item, pos: item.pos.slice() } : null);
  return {
    seed: state.seed,
    turn: state.turn,
    outcome: state.outcome,
    killedBy: state.killedBy,
    nextId: state.nextId,
    // Carried through, or a hypothetical world would turn back into a real
    // one after a single step.
    sim: state.sim,
    attackWhenAdjacent: state.attackWhenAdjacent,
    map: state.map,
    rng: { ...state.rng },
    player: {
      ...state.player,
      pos: state.player.pos.slice(),
      inventory: state.player.inventory.map((i) => ({ ...i })),
      kills: state.player.kills.slice(),
    },
    monsters: state.monsters.map((m) => ({
      ...m, pos: m.pos.slice(), drop: copyItem(m.drop),
    })),
    items: state.items.map(copyItem),
    covers: state.covers.map((c) => ({
      ...c, pos: c.pos.slice(), drop: copyItem(c.drop),
    })),
    shrine: { ...state.shrine, pos: state.shrine.pos.slice() },
    log: state.log.slice(),
  };
}

// Everything standing on the target tile gets a chance to react, BEFORE the
// walkability test. Returns true when something stops the player entering —
// which still costs the turn. Spec §6 has the full table.
function resolveEncounters(state, pos) {
  let blocked = false;

  // Snapshot everything standing here BEFORE anything reacts. The original
  // collects the tile's entities once and then folds over that fixed list
  // (engine.cljs:68), so loot dropped by this very turn's kill or uncover is
  // NOT also collected by it — that is what makes a cover cost two turns.
  const monster = state.monsters.find((m) => !m.dead && samePos(m.pos, pos));
  const coverIndex = state.covers.findIndex((c) => samePos(c.pos, pos));
  const itemsHere = state.items.filter((i) => samePos(i.pos, pos));
  const shrineHere = samePos(state.shrine.pos, pos);

  // A live monster: the player attacks it and stays put. Corpses are inert.
  if (monster) {
    playerAttacks(state, monster);
    blocked = true;
  }

  // A cover: opening it costs this turn, and whatever was inside is left on
  // the floor for a second turn to pick up.
  if (coverIndex >= 0) {
    const [cover] = state.covers.splice(coverIndex, 1);
    if (cover.drop) state.items.push(cover.drop);
    state.log.push({ type: 'uncover', cover: cover.name, found: cover.drop ? cover.drop.name : null, turn: state.turn });
    blocked = true;
  }

  // Loose items do not block — the player walks on and takes them.
  for (const item of itemsHere) {
    if (item.heal > 0) {
      // A potion at full health is NOT consumed and stays on the map.
      // FAITHFUL engine.cljs:204.
      if (state.player.hp >= state.player.hpMax) continue;
      state.player.hp = Math.min(state.player.hpMax, state.player.hp + item.heal);
      state.items.splice(state.items.indexOf(item), 1);
      state.log.push({ type: 'heal', amount: item.heal, turn: state.turn });
    } else {
      state.player.inventory.push(item);
      state.items.splice(state.items.indexOf(item), 1);
      state.log.push({ type: 'pickup', item: item.name, turn: state.turn });
    }
  }

  // The shrine ends the run. The engine lets this happen at any time; the
  // rule that everything must be dead first is the BOT's (CLAUDE.md), so
  // that P4 can measure what relaxing it would cost.
  if (shrineHere) {
    state.outcome = 'ascended';
    state.log.push({ type: 'ascend', turn: state.turn });
    blocked = true;
  }

  return blocked;
}

// Returns whether the turn passes. Walking into a wall does NOT pass it —
// nothing happens at all and the monsters do not act. Spec §6.
function resolvePlayerAction(state, action) {
  if (action === 'rest') return true;

  const dir = DIRECTIONS[action];
  if (!dir) throw new Error('unknown action: ' + action);

  const target = [state.player.pos[0] + dir[0], state.player.pos[1] + dir[1]];

  if (resolveEncounters(state, target)) return true;

  if (isWalkable(state.map, target[0], target[1])) {
    state.player.pos = target;
    return true;
  }
  return false;
}

// Passive regeneration, with our cap. Spec §13.1.
//
// The cap counts HP REGENERATED, not turns rested — the counter advances on
// every turn that passes, so capping the rest action alone would just be
// worked around by walking in circles.
function restoreHealth(state) {
  const player = state.player;

  if (player.hp >= player.hpMax) {
    player.regenCounter = 0;
    return;
  }
  const cap = Math.ceil(REGEN_CAP_FRACTION * player.hpMax);
  if (player.regenUsed >= cap) return;

  player.regenCounter++;
  if (player.regenCounter >= REJUVINATION_RATE) {
    player.regenCounter = 0;
    player.hp++;
    player.regenUsed++;
  }
}

export function step(state, action) {
  const next = cloneState(state);
  if (next.outcome) return { state: next, observation: observe(next) };

  const turnPasses = resolvePlayerAction(next, action);

  if (!next.outcome && turnPasses) {
    next.turn++;
    restoreHealth(next);
    updateMonsters(next, next.map);
  }

  return { state: next, observation: observe(next) };
}
