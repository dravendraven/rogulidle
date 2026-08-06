// Choosing THIS turn's move by simulating the next few.
//
// The strategic layer decides where to go; this decides how to take the
// next step, and it is the only part that actually looks ahead. Monster
// movement is deterministic (spec §7), so the lookahead is not guesswork —
// it runs the real engine forward over a hypothetical world.
//
// Because monsters chase the player's CURRENT position, "where will the
// wolf be in three turns" is not a question that can be answered on its
// own. It only has an answer relative to what the bot does, which is why
// this is a search over the bot's own move sequences rather than a
// prediction followed by a route (docs/bot-strategy.md §4.3).

import { CROWD_PENALTY, TACTICAL_DEPTH } from '../sim/balance.js';
import { ACTIONS, step } from '../sim/step.js';
import { beliefToState } from './hypothetical.js';
import { key } from './nav.js';

const DEATH = -1000;

function adjacentMonsters(state) {
  const [px, py] = state.player.pos;
  let count = 0;
  for (const monster of state.monsters) {
    if (monster.dead) continue;
    if (Math.abs(monster.pos[0] - px) + Math.abs(monster.pos[1] - py) <= 1) count++;
  }
  return count;
}

function monsterHpLeft(state) {
  let total = 0;
  for (const monster of state.monsters) if (!monster.dead) total += monster.hp;
  return total;
}

// How good a position is, in hp. Everything is already in that currency,
// so the terms can simply be added.
function makeEvaluator(costToGoal, monsterHpAtRoot) {
  return (state) => {
    if (state.outcome === 'died') return DEATH;

    const remaining = costToGoal.get(key(state.player.pos));
    // Somewhere the goal cannot be reached from — heavily discouraged, but
    // not fatal, since the belief may simply be out of date.
    const toGo = remaining === undefined ? 50 : remaining;

    // R2 as a hard-ish rule, here where it belongs: this is the moment the
    // bot commits to standing somewhere, so being reachable by two at once
    // is priced per extra attacker.
    const crowd = Math.max(0, adjacentMonsters(state) - 1);

    // Damage DEALT counts as progress, at par with damage taken.
    //
    // Without this the search can never justify a fight: hp lost is pure
    // cost, hp taken off a monster is invisible, so standing back always
    // wins and the bot circles until the turn limit. Every monster has to
    // die (R0), so hp removed from one is worth about as much as hp kept.
    const dealt = monsterHpAtRoot - monsterHpLeft(state);

    return state.player.hp + dealt - toGo - CROWD_PENALTY * crowd;
  };
}

function bestValue(state, depth, evaluate) {
  if (depth === 0 || state.outcome) return evaluate(state);

  let top = -Infinity;
  for (const action of ACTIONS) {
    const next = step(state, action).state;
    // Walking into a wall passes no turn at all, so the branch is identical
    // to its parent — expanding it only wastes the budget.
    if (next.turn === state.turn && action !== 'rest') continue;
    const value = bestValue(next, depth - 1, evaluate);
    if (value > top) top = value;
  }
  return top === -Infinity ? evaluate(state) : top;
}

// Scores every legal action by simulating forward. Returns a Map of
// action -> hp-denominated score, for the caller to compare against the
// action its plan already wanted.
//
// The caller must treat this as a VETO, not as a choice. Scored freely,
// the search walks the bot in circles: a step is worth 0.01 hp and dodging
// one blow is worth 0.83, so retreating always outscores advancing and the
// run never ends. Measured that way, turns went from 128 to 513 and the
// win rate from 3-in-6 to zero. The search knows about the next three
// turns; it does not know the run has to finish.
export function scoreActions(belief, costToGoal, depth = TACTICAL_DEPTH) {
  const root = beliefToState(belief);
  const evaluate = makeEvaluator(costToGoal, monsterHpLeft(root));
  const scores = new Map();

  for (const action of ACTIONS) {
    const next = step(root, action).state;
    if (next.turn === root.turn && action !== 'rest') continue;
    scores.set(action, bestValue(next, depth - 1, evaluate));
  }
  return scores;
}
