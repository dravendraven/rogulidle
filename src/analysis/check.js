// "Is this any good?" in a handful of tripwires — the ONLY metrics module.
//
// A tripwire fires or it does not, and when it fires there is a defect to
// find (docs/project/objectives.md, "A threshold is not a scoreboard").
// Nothing here is a quantity to push: every number states its own firing
// condition, and the page that shows these prints the condition next to the
// value so a reader never has to guess which direction is bad.
//
// Everything is measured from REAL runs of the real bot — no probes, no
// modelled costs. The modelled instruments were retired for pricing the
// fight they imagined instead of the one that happened (decisions.md).

import { playDungeon, TRAVERSALS } from '../sim/dungeon.js';
import { makeBot } from '../bot/bot.js';

// One full run, the same way index.html plays it.
function playOne(seed) {
  return playDungeon(seed, (floor) => makeBot({
    monsterCount: floor.monsterCount, chestCount: floor.chests,
  }));
}

// The tripwires, from `runs` seeded runs starting at `firstSeed`.
//
// Deterministic by construction: same arguments, same numbers, always —
// which is what lets tools/measure.mjs use one of these as its selftest
// anchor. Raise `runs` for a steadier read; the default runs in seconds.
export function tripwires(options = {}) {
  const runs = options.runs ?? 24;
  const firstSeed = options.firstSeed ?? 500000;

  let clears = 0;
  let opening = 0;       // runs over by traversal 3
  let timeouts = 0;      // runs whose last traversal ran out of turns
  let reachedTurn = 0;   // runs that survived at least half the traversals
  let sideOpened = 0;
  let sideShut = 0;

  for (let i = 0; i < runs; i++) {
    const run = playOne(firstSeed + i);
    if (run.cleared) clears++;
    if (!run.cleared && run.depth <= 3) opening++;
    if (run.depth >= TRAVERSALS / 2) reachedTurn++;
    const last = run.levels[run.levels.length - 1];
    if (!run.cleared && last.outcome === 'timeout') timeouts++;
    for (const level of run.levels) {
      for (const chest of level.chests) {
        if (!chest.side) continue;
        if (chest.opened) sideOpened++; else sideShut++;
      }
    }
  }

  const sideSeen = sideOpened + sideShut;
  const wire = (name, value, fires, condition) => ({
    name, value: +value.toFixed(3), fires, condition,
  });

  return {
    runs,
    firstSeed,
    clears,
    tripwires: [
      // "Most attempts must not end in the opening. When they do, the
      // sitting is a slot machine at the entrance." (objectives.md)
      wire('opening deaths', opening / runs, opening / runs > 0.5,
        'fires when more than half of runs are over by traversal 3'),

      // "Winning rewards doing well, and stays rare enough to matter" — a
      // band with two named failure directions, no target inside it.
      wire('wins too common', clears / runs, clears / runs > 0.25,
        'fires when more than a quarter of runs are cleared'),
      wire('wins too rare', clears / runs, clears === 0,
        'fires when not one run in the sample is cleared'),

      // "A decided run must end quickly. The named failure is the shamble."
      // A traversal that dies on its clock was wandering, not racing.
      wire('the shamble', timeouts / runs, timeouts / runs > 0.15,
        'fires when over 15% of runs end by running out of turns'),

      // "A sitting is judged on the distribution of how far attempts get" —
      // ten losses that all end shallow are a bad sitting at any win rate.
      wire('nothing gets deep', reachedTurn / runs, reachedTurn === 0,
        'fires when no run in the sample reaches the turn (halfway)'),

      // The route objective: several routes can win and the good one is
      // hard to find. If every side room is raided the gamble is a free
      // lunch; if none ever is, the choice layer is dead. Either end kills
      // the decision.
      wire('the gamble is dead',
        sideSeen ? sideOpened / sideSeen : 0,
        sideSeen > 0 && (sideOpened === 0 || sideShut === 0),
        'fires when side chests are always opened, or never'),
    ],
  };
}
