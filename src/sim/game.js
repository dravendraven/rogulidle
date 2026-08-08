// Building and driving a whole run. Spec: docs/rogule-spec.md.

import { generateMap } from './mapgen.js';
import { MAP_SIZE } from './balance.js';
import { hashSeeds, seedFromString } from './rng.js';
import { nextId, populate } from './spawn.js';
import { grantArmour, step } from './step.js';
import { emptyBelief, foldBelief, observe } from './observe.js';

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
    // Rule variant rather than a generation count, but it rides along in the
    // same options bag so it travels into replays too.
    attackWhenAdjacent: counts.attackWhenAdjacent,
    xpFromKills: counts.xpFromKills,
    hpFromKills: counts.hpFromKills,
    weaponsWidenRoll: counts.weaponsWidenRoll,
    // Instrumentation only, not a rule variant: suppresses item/potion/shield
    // pickup so a probe can clear a floor without ever getting stronger from
    // it. Chest-opening is unaffected — a shut chest still blocks the tile
    // and still has to be opened to pass, only the drop is left on the floor
    // unclaimed. Off by default, so ordinary play is untouched.
    noPickup: counts.noPickup,
  };

  // M16 — docs/backlog.md. Passthrough so a sweep can ask "what if" without
  // editing balance.js; unset fields fall through to generateMap's own
  // defaults, which read the shipped constants.
  state.map = generateMap(state.rng.map, MAP_SIZE, {
    corridorLength: counts.corridorLength,
    roomWidth: counts.roomWidth,
    roomHeight: counts.roomHeight,
    dugPercentage: counts.dugPercentage,
  });
  populate(state, state.map, counts);

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
  if (counts.startingItems) {
    state.player.inventory = counts.startingItems.map((item) => {
      const owned = { ...item, id: nextId(state) };
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

// Drives a run to its end.
//
// `policy(belief, observation)` returns one of ACTIONS. It is handed the
// BELIEF, never the state — the fog is the point (CLAUDE.md).
//
// maxTurns guards a run that will not finish; maxDecisions separately guards
// a policy that only ever bumps into walls, since those do not pass a turn
// and so would never move maxTurns at all.
export function playGame(seed, policy, options = {}) {
  const maxTurns = options.maxTurns ?? 5000;
  const maxDecisions = options.maxDecisions ?? maxTurns * 4;

  let state = newGame(seed, options.counts);
  let observation = observe(state);
  let belief = foldBelief(emptyBelief(), observation);

  // What the floor held before anything was touched. Analysis needs it to
  // ask which chests were opened and which were walked past, and the only
  // other way to get it is to regenerate the whole floor — so a handful of
  // fields is recorded here instead. Deliberately NOT the whole state: this
  // travels with every run and a deep copy would dominate a batch.
  const start = {
    chests: state.chests.map((c) => ({ id: c.id, side: c.side, edge: c.edge })),
    monsters: state.monsters.map((m) => ({
      id: m.id, side: m.side, edge: m.edge, xp: m.xp, hp: m.hpMax,
    })),
  };

  const actions = [];
  let decisions = 0;

  while (!state.outcome && state.turn < maxTurns && decisions < maxDecisions) {
    const action = policy(belief, observation);
    const result = step(state, action);

    state = result.state;
    observation = result.observation;
    belief = foldBelief(belief, observation);

    actions.push(action);
    decisions++;
  }

  return {
    state,
    belief,
    start,
    outcome: state.outcome,
    turns: state.turn,
    // The engine is deterministic, so a seed plus the action list replays a
    // run exactly — as long as the floor is generated the same way, which
    // is why the counts travel with it. Leaving them out silently replayed
    // a DIFFERENT map whenever generation was not on its defaults.
    replay: { seed: state.seed, actions, counts: options.counts },
  };
}

// Replays a recorded run, returning every state along the way, each with the
// belief the bot held at that moment. P2 renders from this — showing the
// belief is what lets a viewer see what the bot knows and what it is only
// remembering. Nothing here needs the policy again.
export function replayGame(replay) {
  let state = newGame(replay.seed, replay.counts);
  let observation = observe(state);
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
