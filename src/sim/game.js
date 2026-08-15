// Building and driving a whole run. Spec: docs/rogule-spec.md.

import { generateMap } from './mapgen.js';
import { ITEM_TABLE, MAP_SIZE, STARTING_ITEMS } from './balance.js';
import { hashSeeds, seedFromString } from './rng.js';
import { nextId, populate } from './spawn.js';
import { grantArmour, step } from './step.js';
import { emptyBelief, foldBelief, observe } from './observe.js';
import { heroItem, resolvePersona } from './heroes.js';

// Three independent streams, so that (say) adding one map roll never shifts
// the combat dice. Spec §9.4 — the original mixes three RNG sources and its
// combat is not reproducible from the seed at all.
function makeStreams(rootSeed) {
  return {
    map: hashSeeds(rootSeed, 1),
    spawn: hashSeeds(rootSeed, 2),
    combat: hashSeeds(rootSeed, 3),
  };
}

// `seed` may be a number or a string ("2026-08-05").
// `counts` optionally overrides how many monsters and chests get placed.
export function newGame(seed, counts = {}) {
  const rootSeed = typeof seed === 'string' ? seedFromString(seed) : seed >>> 0;

  const state = {
    seed: rootSeed,
    turn: 0,
    outcome: null,
    killedBy: null,
    nextId: 1,
    rng: makeStreams(rootSeed),
    log: [],
  };

  // Which hero is playing (src/sim/heroes.js). It rides in `counts` rather
  // than as a parameter of its own because `counts` already reaches here
  // from `playDungeon` unchanged, already carries things that are not counts
  // (`carry`, `startingItems`), and already travels inside `replay.counts` —
  // so a recorded run replays as the hero who played it, for free. Fixed at
  // generation and never written again: same seed AND same persona replays
  // identically, which is the determinism `step()` promises.
  state.persona = resolvePersona(counts.persona);

  // M16 — docs/backlog.md. Passthrough so a sweep can ask "what if" without
  // editing balance.js; unset fields fall through to generateMap's own
  // defaults, which read the shipped constants.
  state.map = generateMap(state.rng.map, counts.mapSize ?? MAP_SIZE, {
    corridorLength: counts.corridorLength,
    roomWidth: counts.roomWidth,
    roomHeight: counts.roomHeight,
    dugPercentage: counts.dugPercentage,
    roomBias: counts.roomBias,
    layout: counts.layout,
    hubBranches: counts.hubBranches,
    hubRings: counts.hubRings,
  });
  populate(state, state.map, counts);

  // The return climbs back through the hole it went down. On an ascent
  // traversal the hero emerges where this floor's shrine stood, and the way
  // out is where the hero originally entered — a swap AFTER generation, so
  // it draws nothing and the floor stays byte-identical to its descent
  // twin. One consequence is deliberate: the shrine guardian stood next to
  // the down-stairs, so on the way up it receives the hero on arrival.
  if (counts.ascending) {
    const heroAt = state.shrine.pos;
    state.shrine.pos = state.player.pos;
    state.player.pos = heroAt;
  }

  // U6d — docs/backlog.md. What the hero brings into the RUN, from the
  // shop (U6e) or a test — distinct from `carry` below, which is what
  // moves floor-to-floor WITHIN a run already in progress. Applied before
  // `carry` so a floor that has both (should not happen in practice, but
  // nothing here assumes it cannot) resolves to `carry`'s inventory, the
  // more current of the two truths.
  //
  // Own id, from the same namespace `populate()` just drew from — an item
  // that walked in with the hero is not less real than one found on the
  // floor, and needs an id something in dungeon.js/render.js could key on
  // later.
  //
  // REVIEW FOUND (docs/backlog.md U6d): owning an armour item is not the
  // same as it doing anything — `player.armour` is the bar `effectiveHp`
  // actually reads, and only `grantArmour` (step.js, the same rule the
  // real pickup path runs) ever credits it. The first version of this
  // block set inventory and stopped, so a starting shield granted zero
  // defence — caught by review, not by the item's own test, which checked
  // `armourValue`, a function with no production callers. Fixed by
  // running every starting item through the one shared rule instead of a
  // second copy of it.
  // M38 — the kit comes FIRST and `startingItems` adds to it, rather than
  // replacing it. Two reasons, both found by looking at the callers:
  // `src/ui/spectator.js` passes `getHeldItems()`, which is `[]` when nothing
  // was bought — truthy, so a default resolved with `??` would be silently
  // defeated in exactly the path a person watches. And a hero who bought a
  // shield would otherwise lose the dagger for it, which makes buying strictly
  // worse than not buying. `startingItems` therefore means "what this run
  // brings ON TOP of the kit"; STARTING_ITEMS empty restores the old meaning.
  // The hero's own kit joins the game's and the shop's, by NAME resolved
  // against ITEM_TABLE here — heroes.js is a values file and has no business
  // holding a second copy of what a book is. Three sources, one list, and
  // they add up: `STARTING_ITEMS` is what everyone gets, `persona.kit` what
  // this hero gets, `counts.startingItems` what this run bought.
  const heroKit = (state.persona.kit ?? [])
    .map((name) => ITEM_TABLE.find((i) => i.name === name))
    .filter(Boolean);
  const startingKit = [...STARTING_ITEMS, ...heroKit, ...(counts.startingItems ?? [])];
  if (startingKit.length) {
    state.player.inventory = startingKit.map((item) => {
      // Through `heroItem` for the same reason the review made this line go
      // through `grantArmour`: a hero whose hands change what an item is
      // worth must have them changed by ONE rule, or a bought shield and a
      // found shield quietly stop being the same object.
      const owned = heroItem({ ...item, id: nextId(state) }, state.persona);
      grantArmour(state.player, owned);
      return owned;
    });
  }

  // Carrying a player in from the floor above. The position always comes
  // from this floor's generation — only what the hero IS travels, not
  // where they stood.
  if (counts.carry) {
    const carried = counts.carry;
    state.player = {
      ...state.player,
      hp: carried.hp,
      hpMax: carried.hpMax,
      // Whatever is left of the armour bar goes down the stairs too. It is
      // a buffer, so what was already spent stays spent.
      armour: carried.armour ?? 0,
      xp: carried.xp,
      inventory: carried.inventory.map((i) => ({ ...i })),
      kills: carried.kills.slice(),
      xpEarned: carried.xpEarned,
    };
  }
  return state;
}

// E1 — docs/backlog.md. THE turn loop, and the only one. Takes a state that
// already exists and hands control back every turn.
//
// It exists because `playGame` below could not serve the analysis modules:
// it takes a SEED rather than a starting state, and it runs to completion
// with no per-turn hook. So anyone needing either wrote the loop again, and a
// copy of the loop has to stay in step with the engine or whatever it
// measures stops describing the game — which has already happened once.
//
// `policy(belief, observation)` returns one of ACTIONS. It is handed the
// BELIEF, never the state — the fog is the point (CLAUDE.md).
//
// maxTurns guards a run that will not finish; maxDecisions separately guards
// a policy that only ever bumps into walls, since those do not pass a turn
// and so would never move maxTurns at all.
//
// `onTurn({ state, before, action, observation })` runs after every step.
// Return nothing to observe; return a STATE to replace the one just produced,
// and the observation is re-derived from the replacement before the belief
// folds it. That single return channel is what lets a caller edit the run in
// flight — the observed ruler's death suppression sets `outcome` back to null
// so a probe keeps walking — WITHOUT this loop knowing that any such caller
// exists. `before` is the pre-step state, which is what a caller needs to
// slice the turn's own log entries off the end.
//
// The observation is re-derived ONLY on replacement, never otherwise: an
// untouched turn keeps `step`'s own observation object, so a caller that
// hooks nothing is byte-identical to one that cannot hook at all.
export function driveTurns(state, policy, options = {}) {
  const maxTurns = options.maxTurns ?? 5000;
  const maxDecisions = options.maxDecisions ?? maxTurns * 4;
  const onTurn = options.onTurn;

  let observation = observe(state, state.persona);
  let belief = foldBelief(emptyBelief(), observation);
  let decisions = 0;

  while (!state.outcome && state.turn < maxTurns && decisions < maxDecisions) {
    const before = state;
    const action = policy(belief, observation);
    const result = step(state, action);

    state = result.state;
    observation = result.observation;

    if (onTurn) {
      const replacement = onTurn({
        state, before, action, observation,
      });
      if (replacement && replacement !== state) {
        state = replacement;
        observation = observe(state, state.persona);
      }
    }

    belief = foldBelief(belief, observation);
    decisions++;
  }

  return { state, belief, observation, decisions };
}

// Drives a run to its end, from a seed.
//
// Generation plus `driveTurns`, and nothing else — the loop it used to carry
// itself is the one above (E1). What stays here is what only a whole run
// has: the pre-touch snapshot and the replay.
export function playGame(seed, policy, options = {}) {
  const state = newGame(seed, options.counts);

  // What the floor held before anything was touched. Analysis needs it to
  // ask which chests were opened and which were walked past, and the only
  // other way to get it is to regenerate the whole floor — so a handful of
  // fields is recorded here instead. Deliberately NOT the whole state: this
  // travels with every run and a deep copy would dominate a batch.
  const start = {
    // `vault` travels because the instruments have to be able to leave the
    // authored room out of questions about the ORDINARY bargain — without
    // it, six chests behind one boss drag the side-chest rate from 0.69 to
    // 0.26 and the wire reads as a defect that is not there.
    chests: state.chests.map((c) => ({
      id: c.id, side: c.side, edge: c.edge, vault: !!c.vault,
    })),
    monsters: state.monsters.map((m) => ({
      id: m.id, side: m.side, edge: m.edge, xp: m.xp, hp: m.hpMax,
    })),
  };

  const actions = [];
  const driven = driveTurns(state, policy, {
    maxTurns: options.maxTurns,
    maxDecisions: options.maxDecisions,
    onTurn: ({ action }) => { actions.push(action); },
  });

  return {
    state: driven.state,
    belief: driven.belief,
    start,
    outcome: driven.state.outcome,
    turns: driven.state.turn,
    // The engine is deterministic, so a seed plus the action list replays a
    // run exactly — as long as the floor is generated the same way, which
    // is why the counts travel with it. Leaving them out silently replayed
    // a DIFFERENT map whenever generation was not on its defaults.
    replay: { seed: driven.state.seed, actions, counts: options.counts },
  };
}

// Replays a recorded run, returning every state along the way, each with the
// belief the bot held at that moment. P2 renders from this — showing the
// belief is what lets a viewer see what the bot knows and what it is only
// remembering. Nothing here needs the policy again.
export function replayGame(replay) {
  let state = newGame(replay.seed, replay.counts);
  let observation = observe(state, state.persona);
  let belief = foldBelief(emptyBelief(), observation);

  const frames = [{ state, belief, action: null }];

  for (const action of replay.actions) {
    const result = step(state, action);
    state = result.state;
    observation = result.observation;
    belief = foldBelief(belief, observation);
    frames.push({ state, belief, action });
  }
  return frames;
}
