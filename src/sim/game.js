// Building and driving a whole run. Spec: docs/rogule-spec.md.

import { generateMap } from './mapgen.js';
import { hashSeeds, seedFromString } from './rng.js';
import { populate } from './spawn.js';
import { step } from './step.js';
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
export function newGame(seed) {
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

  state.map = generateMap(state.rng.map);
  populate(state, state.map);
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

  let state = newGame(seed);
  let observation = observe(state);
  let belief = foldBelief(emptyBelief(), observation);

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
    outcome: state.outcome,
    turns: state.turn,
    // The engine is deterministic, so a seed plus the action list is a
    // complete replay. That is all P2 needs to play a run back.
    replay: { seed: state.seed, actions },
  };
}

// Replays a recorded run, returning every state along the way, each with the
// belief the bot held at that moment. P2 renders from this — showing the
// belief is what lets a viewer see what the bot knows and what it is only
// remembering. Nothing here needs the policy again.
export function replayGame(replay) {
  let state = newGame(replay.seed);
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
