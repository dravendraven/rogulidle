// ONE place that turns a seed and a configuration into a finished run.
//
// Two callers ask the same question and must not be able to disagree about
// it. The spectator loop builds runs to WATCH; `achievements.js` rebuilds a
// stored receipt to check that what it claims really happened. If each
// assembled its own `playDungeon` call, the day one of them gained an option
// would be the day every stored achievement quietly stopped verifying — and
// that failure would look exactly like forgery and land on the player.
//
// It lives in `src/ui/` and not `src/sim/` because a `dials` object is a UI
// object: the Lab's form and `dial-overrides.json` both produce one, and the
// engine has never heard of either. Nothing here touches storage or the DOM,
// so it is safe to call from a verification pass before the page is built.

import { playDungeon, LEVELS } from '../sim/dungeon.js';
import { makeFloorPlan } from '../sim/difficulty.js';
import { makeBot } from '../bot/bot.js';
import { heroByName } from '../sim/heroes.js';

// `config` is the whole of what a run needs besides its seed — the three
// things that, with it, decide every tile and every blow:
//
//   dials          the Lab's values, i.e. `{ model, hero, bot, run }`
//                  (dial-overrides.json layered over the code constants)
//   heroName       one key of HEROES; '' and 'base' are the ordinary hero
//   startingItems  what the shop bought last run (src/ui/wallet.js)
//
// It is deliberately a plain, JSON-round-trippable object: it is also what a
// receipt stores, and what U12's board would submit.
//
// `onFloorTrace` is the spectator's one extra need — a bot trace per floor,
// for the debug overlay, collected in call order. A verification run has
// nothing to show a trace to, so it passes nothing and the array is simply
// discarded. The bot still RECEIVES one either way: an argument that is
// present in one caller and absent in the other is exactly the kind of
// difference this file exists to prevent.
export function playRun(seed, config, onFloorTrace = null) {
  const dials = config.dials || {};
  const hero = heroByName(config.heroName);
  return playDungeon(seed, (floor) => {
    const trace = [];
    if (onFloorTrace) onFloorTrace(trace);
    return makeBot({
      trace,
      monsterCount: floor.monsterCount,
      chestCount: floor.chests,
      // The share of the descent's threat still ahead — what the scholar's
      // book is weighed against (src/sim/difficulty.js).
      threatAhead: floor.threatAhead,
      floorsAhead: floor.floorsAhead,
      hero: dials.hero,
      ...dials.bot,
    });
  }, {
    maxTurns: dials.run && dials.run.turnBudget,
    // The lab's "começar no andar" — a testing affordance, 1 in the game.
    // dungeon.js clamps it and explains what it costs.
    startFloor: dials.run && dials.run.startFloor,
    startingItems: config.startingItems || [],
    floorPlan: makeFloorPlan(dials.model),
    // Who is playing (src/ui/roster.js). Unset resolves to the shipped hero,
    // so a visitor who never picks gets exactly the run they got before
    // heroes existed.
    hero,
    // The return switch (src/ui/dials.js). Off is a plain descent, which is
    // `traversals: LEVELS` — the same pin the analysis modules already use.
    // On leaves the option unset so dungeon.js's own default (the full
    // nineteen, down and back up) applies, rather than this file carrying a
    // second copy of that arithmetic.
    ...(dials.run && dials.run.theReturn ? {} : { traversals: LEVELS }),
  });
}
