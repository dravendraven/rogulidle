// The turn loop. Spec: docs/rogule-spec.md §6.
//
// step() is PURE: it clones the state, works on the clone, and hands it back
// with the observation that follows. No DOM, no Date.now(), no storage.
// The map is never cloned — it is immutable once generated.

import { RAGE_TURNS, READ_TURNS } from './balance.js';
import { isWalkable, samePos } from './mapgen.js';
import { playerAttacks } from './combat.js';
import { updateMonsters } from './monsters.js';
import { observe } from './observe.js';
import { heroItem } from './heroes.js';

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
// `read` is NOT here, and that is the same call M35/B14 made about `drink`:
// the engine accepts it, the bot's menu does not offer it. `tactics.js`
// enumerates this list for a ONE-turn lookahead, and reading is a FIVE-turn
// commitment — a search that cannot see past turn one would price it as
// "stand still once, heal nothing" and fire it at absurd moments. It reaches
// the engine from a top-level reactive rule instead, the way drinking does.
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
    map: state.map,
    // The hero's persona (src/sim/heroes.js). Shared by reference, like
    // `map` above and for the same reason: it is read-only configuration
    // fixed at newGame, so copying it every step would buy nothing. It has
    // to be listed here explicitly — this function is an allow-list, and a
    // field left out silently vanishes one step into the run.
    persona: state.persona,
    // M50 — the route-tile sets. Shared by reference like `map`, and for
    // the same reason: written once at spawn, never after.
    routes: state.routes,
    rng: { ...state.rng },
    player: {
      ...state.player,
      pos: state.player.pos.slice(),
      inventory: state.player.inventory.map((i) => ({ ...i })),
      kills: state.player.kills.slice(),
      // …but the VISIT COUNTER is per-state: shared, a step would write
      // its increment backwards into the state it was given.
      ...(state.player.routeVisits
        ? { routeVisits: { ...state.player.routeVisits } } : {}),
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
    // COINS ARE CREDITED ON OPEN, never dropped on the floor (2026-08-31):
    // money has no pickup decision to make — no persona values it
    // differently, no bot should have to price walking back for it — so a
    // floor item would only add a turn of busywork and a special case to
    // every reader of `items`. The credit pays with the traversal
    // (src/sim/dungeon.js), same rule as the xp rate.
    if (chest.drop && chest.drop.kind === 'coin') {
      // `?? 0` because hand-built states (tests) predate the field.
      state.player.coinsFound = (state.player.coinsFound ?? 0) + chest.drop.coin;
    } else if (chest.drop) {
      state.items.push(chest.drop);
    }
    state.log.push({ type: 'open', chest: chest.name, found: chest.drop ? chest.drop.name : null, turn: state.turn });
    blocked = true;
  }

  // M40 — docs/backlog.md. EVERYTHING BELOW ONLY HAPPENS IF THE HERO ENTERS
  // THE TILE, and `blocked` is already the name for "it does not". The two
  // branches inside used to run regardless, which is one defect with two
  // faces rather than two bugs:
  //
  //   - a creature standing ON the shrine: the hero attacks it, stays put,
  //     and the floor ended anyway. B16 measured three of these per seed
  //     family and could not fix them from the bot side, because a route
  //     that never enters the tile still ended the floor. `rules.md` §3 puts
  //     a guardian at the shrine BY DESIGN (M14), so this is reachable by
  //     construction, not a corner.
  //   - a creature standing on a loose item: the hero attacked, stayed put,
  //     and collected the item anyway. Creatures walk over items and never
  //     take them (`rules.md` §3), so a creature parked on loot is ordinary
  //     play.
  //
  // A CHEST also sets `blocked`, and the two-turn cost of opening one does
  // NOT depend on this guard: `itemsHere` is snapshotted above, before the
  // chest spills, so the drop was never in this loop's list. The guard makes
  // that stricter rather than replacing it — a loose item that was already
  // lying on a chest's tile is now left alone too, which is the same rule
  // ("the hero did not enter") applied consistently.
  if (!blocked) {
    // Loose items do not block — the player walks on and takes them.
    //
    // M35 — every item takes the same path, potions included. There used to
    // be a branch here that drank a potion on contact and, at full hp,
    // refused to pick it up at all. The second rule only existed to work
    // around the first: consume-on-contact makes a potion found healthy a
    // potion wasted. Drinking is its own action now (see `drinkPotion`), so
    // there is nothing left for a special case to protect against. Diverges
    // from the original, which consumed on pickup (engine.cljs:204) —
    // rules.md §5 and §10 carry the rule, decisions.md the reasoning. NOT
    // filed under rogule-spec.md §13: that list is frozen and takes no new
    // entries.
    for (const item of itemsHere) {
      // What the hero picks up may not be what was lying there: a persona
      // can be worth more or less of an item than the world is (heroes.js).
      // `heroItem` returns the same object when nothing applies, so the
      // ordinary hero still puts the very item from the floor in the bag —
      // and the splice below keys off the ORIGINAL either way.
      const owned = heroItem(item, state.persona);
      state.player.inventory.push(owned);
      state.items.splice(state.items.indexOf(item), 1);
      grantArmour(state.player, owned);
      state.log.push({ type: 'pickup', item: owned.name, turn: state.turn });
    }

    // The shrine ends the run. The engine lets this happen at any time; the
    // rule that everything must be dead first is the BOT's (CLAUDE.md), so
    // that P4 can measure what relaxing it would cost. It blocks in turn:
    // the floor is over, so the hero never takes the step.
    if (shrineHere) {
      state.outcome = 'ascended';
      state.log.push({ type: 'ascend', turn: state.turn });
      blocked = true;
    }
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
// Reading the book: FIVE turns standing still, then back to full hp, and the
// book is gone. rules.md §5 and §6.
//
// The five turns are the entire price, and it is a price that changes with
// the situation rather than a fixed one: a blow is paid exactly when the
// hero stops increasing the distance (§4), so standing still costs NOTHING
// with nothing awake nearby and costs five free hits with something on his
// heel. Deciding which is the hero's problem, not the engine's.
//
// THE COMMITMENT LIVES HERE, not in the bot. Once started, `step` discards
// whatever action arrives until the count runs out — a reader who could
// change his mind the moment a creature woke would be paying no price at
// all, and the price is the whole design.
function readOneTurn(state) {
  const player = state.player;
  player.reading -= 1;
  if (player.reading > 0) return true;

  delete player.reading;
  const index = player.inventory.findIndex((i) => i.kind === 'book');
  if (index >= 0) player.inventory.splice(index, 1);

  const before = player.hp;
  player.hp = player.hpMax;
  state.log.push({ type: 'read', healed: player.hp - before, turn: state.turn });
  return true;
}

// The syringe: `RAGE_TURNS` of a damage die stretched at the top
// (src/sim/combat.js). Nothing like reading — it does NOT take the hero's
// turns away. He fights exactly as he would have, harder, which is why this
// is a counter and not a commitment.
function startRage(state) {
  const index = state.player.inventory.findIndex((i) => i.kind === 'syringe');
  if (index < 0) return false;
  state.player.inventory.splice(index, 1);
  state.player.raging = RAGE_TURNS;
  state.log.push({ type: 'rage', turns: RAGE_TURNS, turn: state.turn });
  return true;
}

function startReading(state) {
  // Same shape as drinking without a potion: asking for the impossible
  // passes no turn at all (§6), so a bot that reads twice loses nothing but
  // the decision.
  if (!state.player.inventory.some((i) => i.kind === 'book')) return false;
  state.player.reading = READ_TURNS;
  return readOneTurn(state);
}

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
  if (action === 'read') return startReading(state);
  if (action === 'rage') return startRage(state);

  const dir = DIRECTIONS[action];
  if (!dir) throw new Error('unknown action: ' + action);

  const target = [state.player.pos[0] + dir[0], state.player.pos[1] + dir[1]];

  if (resolveEncounters(state, target)) return true;

  if (isWalkable(state.map, target[0], target[1])) {
    state.player.pos = target;
    // M50 — the walked-route trace, on maps that carry one. Which route the
    // hero ACTUALLY walked is the measurement the whole two-spine design
    // hangs on, and counting at the move is the only place it is cheap.
    if (state.routes && state.player.routeVisits) {
      const key = target[0] + ',' + target[1];
      if (state.routes.short[key]) state.player.routeVisits.short++;
      else if (state.routes.long[key]) state.player.routeVisits.long++;
    }
    return true;
  }
  return false;
}

// There is no passive regeneration. Waiting heals nothing, so hp only ever
// comes back from a potion. See balance.js for why it was removed rather
// than capped.

export function step(state, action) {
  const next = cloneState(state);
  if (next.outcome) return { state: next, observation: observe(next, next.persona) };

  // A read in progress OWNS the turn: the action that arrived is discarded,
  // the count drops, and the creatures act anyway. See `readOneTurn` for why
  // the commitment is the engine's and not the bot's.
  //
  // The rage clock is read BEFORE the action so the turn that starts it does
  // not spend one of its own turns: the syringe costs the turn it is used
  // on, and the ones that follow are the ones that hit harder.
  const wasRaging = next.player.raging > 0;
  const turnPasses = next.player.reading > 0
    ? readOneTurn(next)
    : resolvePlayerAction(next, action);

  if (!next.outcome && turnPasses) {
    next.turn++;
    if (wasRaging && --next.player.raging <= 0) delete next.player.raging;
    updateMonsters(next, next.map);
  }

  return { state: next, observation: observe(next, next.persona) };
}
