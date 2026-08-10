// The turn loop. Spec: docs/rogule-spec.md §6.
//
// step() is PURE: it clones the state, works on the clone, and hands it back
// with the observation that follows. No DOM, no Date.now(), no storage.
// The map is never cloned — it is immutable once generated.

import { isWalkable, samePos } from './mapgen.js';
import { playerAttacks } from './combat.js';
import { updateMonsters } from './monsters.js';
import { observe } from './observe.js';

// The actions the BOT chooses between, every turn — its menu, not the full
// set the engine accepts. `tactics.js` and `placeholder.js` enumerate this
// list, so anything added here changes bot behaviour immediately.
//
// M35 added `drink`, which `step` accepts but which was deliberately kept
// OFF this list: that item was engine-only, and putting it on the menu
// would have silently rewritten every bot decision under the banner of an
// engine change. B14 is the item that teaches the bot to drink, and adding
// it here is that item's call, made now.
//
// `tactics.js` enumerates this same list for its lookahead search, so the
// tactical veto can now simulate drinking mid-duel too — `hypothetical.js`
// already carries `inventory` into the simulated state, so that branch of
// the search behaves exactly like the real engine. Not designed on
// purpose by B14, which only adds the naive top-level policy below;
// disclosed as a second, emergent place `drink` can now fire from.
export const ACTIONS = ['up', 'down', 'left', 'right', 'rest', 'drink'];

const DIRECTIONS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

// U6d's review — docs/backlog.md. A shield refills the armour bar (spec
// §13.2); max hp never moves. Owning the item is not enough — `player.
// armour` is what `effectiveHp` (combat.js) actually adds up, and only
// this rule ever credits it. Exported so `game.js`'s `startingItems`
// (U6d) shares the same rule the real pickup path below uses, rather than
// keeping a second copy of "what an armour item means" that can drift
// from this one — the gap the review found was exactly that: a starting
// shield wrote inventory and stopped, never reaching this line at all.
export function grantArmour(player, item) {
  if (item.armour) player.armour += item.armour;
}

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
    xpFromKills: state.xpFromKills,
    hpFromKills: state.hpFromKills,
    weaponsWidenRoll: state.weaponsWidenRoll,
    noPickup: state.noPickup,
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
    chests: state.chests.map((c) => ({
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
  // (engine.cljs:68), so loot dropped by this very turn's kill or chest opening is
  // NOT also collected by it — that is what makes a chest cost two turns.
  const monster = state.monsters.find((m) => !m.dead && samePos(m.pos, pos));
  const chestIndex = state.chests.findIndex((c) => samePos(c.pos, pos));
  const itemsHere = state.items.filter((i) => samePos(i.pos, pos));
  const shrineHere = samePos(state.shrine.pos, pos);

  // A live monster: the player attacks it and stays put. Corpses are inert.
  if (monster) {
    playerAttacks(state, monster);
    blocked = true;
  }

  // A chest: opening it costs this turn, and whatever was inside is left on
  // the floor for a second turn to pick up.
  if (chestIndex >= 0) {
    const [chest] = state.chests.splice(chestIndex, 1);
    if (chest.drop) state.items.push(chest.drop);
    state.log.push({ type: 'open', chest: chest.name, found: chest.drop ? chest.drop.name : null, turn: state.turn });
    blocked = true;
  }

  // Loose items do not block — the player walks on and takes them. Skipped
  // entirely under `noPickup`: the item is left exactly where it lies, as if
  // the player had not stepped there at all.
  //
  // M35 — every item takes the same path, potions included. There used to be
  // a branch here that drank a potion on contact and, at full hp, refused to
  // pick it up at all. The second rule only existed to work around the first:
  // consume-on-contact makes a potion found healthy a potion wasted. Drinking
  // is its own action now (see `drinkPotion`), so there is nothing left for a
  // special case to protect against. Diverges from the original, which
  // consumed on pickup (engine.cljs:204) — rules.md §5 and §10 carry the
  // rule, decisions.md the reasoning. NOT filed under rogule-spec.md §13:
  // that list is frozen and takes no new entries.
  for (const item of (state.noPickup ? [] : itemsHere)) {
    state.player.inventory.push(item);
    state.items.splice(state.items.indexOf(item), 1);
    grantArmour(state.player, item);
    state.log.push({ type: 'pickup', item: item.name, turn: state.turn });
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

// M35 — drink the first potion carried. Returns whether the turn passes.
//
// Costs a turn, like every other in-place action, and that IS the feature:
// a turn spent drinking is a turn the creatures act, and rules.md §4 says a
// blow lands exactly when the hero stops increasing the distance. Free
// drinking would leave no decision to make.
//
// NOT guarded at full hp. The engine permits and the bot decides — drinking
// with nothing missing simply wastes the potion. `amount` is what the hero
// actually gained, not the potion's face value, so a wasted drink logs 0 and
// stays readable as "a heal event means hp moved".
//
// Nothing to drink is a no-op that does NOT pass the turn — the same shape
// as walking into a wall (rules.md §6), so a policy that asks for one it
// does not have cannot burn turns on it.
function drinkPotion(state) {
  const index = state.player.inventory.findIndex((i) => i.heal > 0);
  if (index < 0) return false;

  const [potion] = state.player.inventory.splice(index, 1);
  const before = state.player.hp;
  state.player.hp = Math.min(state.player.hpMax, before + potion.heal);
  state.log.push({ type: 'heal', amount: state.player.hp - before, turn: state.turn });
  return true;
}

// Returns whether the turn passes. Walking into a wall does NOT pass it —
// nothing happens at all and the monsters do not act. Spec §6.
function resolvePlayerAction(state, action) {
  if (action === 'rest') return true;
  if (action === 'drink') return drinkPotion(state);

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

// There is no passive regeneration. Waiting heals nothing, so hp only ever
// comes back from a potion. See balance.js for why it was removed rather
// than capped.

export function step(state, action) {
  const next = cloneState(state);
  if (next.outcome) return { state: next, observation: observe(next) };

  const turnPasses = resolvePlayerAction(next, action);

  if (!next.outcome && turnPasses) {
    next.turn++;
    updateMonsters(next, next.map);
  }

  return { state: next, observation: observe(next) };
}
