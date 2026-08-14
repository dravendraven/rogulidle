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

import { playDungeon, LEVELS, TRAVERSALS } from '../sim/dungeon.js';
import { makeFloorPlan } from '../sim/difficulty.js';
import { makeBot } from '../bot/bot.js';
import { heroByName } from '../sim/heroes.js';

// One full run, the same way index.html plays it.
//
// `dials` is the SHIPPED configuration — `dial-overrides.json` layered over
// the code constants — and passing it is what makes these wires describe
// the game people actually play. Left out, everything falls back to the
// code defaults, which is a DIFFERENT GAME and has already misled this
// project once: the backlog carried "opening deaths 0.667" as a live defect
// for weeks while the shipped dials measured 0.247.
//
// It is a parameter rather than something this file loads for itself
// because the two callers reach the file differently — `run-check.html`
// fetches it, `tools/measure.mjs` reads it off disk — and a loader that
// silently returns {} in one of them would put the page and the headless
// runner on different games while both looked fine.
// `hero` is ONE entry of `HEROES` (src/sim/heroes.js) — both halves at once,
// the engine persona and the bot overrides — so a reading names a hero
// instead of assembling one out of two arguments that could disagree.
// Absent (every caller today) is the shipped hero and changes nothing.
function playOne(seed, dials, hero) {
  const plan = dials && dials.model ? makeFloorPlan(dials.model) : undefined;
  return playDungeon(seed, (floor) => makeBot({
    monsterCount: floor.monsterCount,
    chestCount: floor.chests,
    threatAhead: floor.threatAhead,
    // The hero's own traits win over the dials', which is the direction the
    // lab already works in: a dial is what everyone gets, a hero is who this
    // run is.
    hero: { ...(dials && dials.hero), ...(hero && hero.bot) },
    ...(dials && dials.bot),
  }), {
    ...(hero ? { hero } : {}),
    ...(plan ? { floorPlan: plan } : {}),
    ...(dials && dials.run ? { maxTurns: dials.run.turnBudget } : {}),
    // The return ships off, and the analysis modules already pin the plain
    // descent for the reason dungeon.js states — a full run would give each
    // floor twice and average the two crossings together.
    ...(dials && dials.run && dials.run.theReturn ? {} : { traversals: LEVELS }),
  });
}

// The tripwires, from `runs` seeded runs starting at `firstSeed`.
//
// Deterministic by construction: same arguments, same numbers, always —
// which is what lets tools/measure.mjs use one of these as its selftest
// anchor. Raise `runs` for a steadier read; the default runs in seconds.
export function tripwires(options = {}) {
  const runs = options.runs ?? 24;
  const firstSeed = options.firstSeed ?? 500000;
  // What the game actually ships on. See playOne.
  const dials = options.dials;
  // Which hero played it. Same discipline as `shipped` below: a reading of
  // one hero and a reading of another are not the same game either.
  //
  // A NAME or the entry itself, because the two callers arrive differently:
  // `tools/measure.mjs` takes JSON on a command line, where `"pawa"` is the
  // only sane thing to type. `heroByName` is the one place either becomes a
  // hero.
  const hero = typeof options.hero === 'string'
    ? heroByName(options.hero)
    : options.hero;

  let clears = 0;
  let opening = 0;       // runs over by traversal 3
  let timeouts = 0;      // runs whose last traversal ran out of turns
  let reachedTurn = 0;   // runs that survived at least half the traversals
  let sideOpened = 0;
  let sideShut = 0;

  for (let i = 0; i < runs; i++) {
    const run = playOne(firstSeed + i, dials, hero);
    if (run.cleared) clears++;
    if (!run.cleared && run.depth <= 3) opening++;
    if (run.depth >= TRAVERSALS / 2) reachedTurn++;
    const last = run.levels[run.levels.length - 1];
    if (!run.cleared && last.outcome === 'timeout') timeouts++;
    for (const level of run.levels) {
      for (const chest of level.chests) {
        if (!chest.side) continue;
        // M43 — the vault's own chests are excluded, for the same reason
        // its occupant is left out of spineShare(): this wire asks whether
        // the bot tells GOOD side rooms from BAD ones, and six chests
        // sitting behind one authored creature answer a different question
        // while outnumbering a floor's ordinary side chests. Left in, they
        // dragged the rate from 0.69 to 0.26 by being correctly refused.
        if (chest.vault) continue;
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
    // Said out loud in the result, so a reading can never be quoted without
    // it: these wires describe either the shipped game or the code
    // defaults, and the two are not the same game.
    shipped: Boolean(dials),
    // Said out loud for the same reason `shipped` is: these wires read one
    // hero, and quoting a number without saying whose it was is how a
    // reading gets compared against a different game.
    hero: hero ? hero.name : 'base',
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
