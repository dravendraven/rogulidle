// THE CHAIN — the second metrics module, and this comment is why it is a
// second one instead of more wires inside check.js.
//
// `check.js` measures runs that are independent draws with EMPTY HANDS.
// That is the game with the shop switched OFF, and `test/baseline.md` pins
// it as the baseline deliberately. But only the FIRST run of a session is
// ever really naked: every run after it starts holding whatever the shop
// bought with the coins the run before it earned — win or lose, since the
// shop opens after a death too (docs/rules.md §9).
//
// So this file plays a SESSION: `length` runs in a row with the shop
// between them, and the unit of sampling is the CHAIN, not the run. Dying
// does not end a chain — dying is the reset inside it, which is what the
// real game does. What comes out is how far a session gets when the shop is
// part of it, and how big the pile of bought items grows before a death
// takes it away.
//
// NOTHING HERE IS COMPARABLE TO A NUMBER FROM check.js. Same engine, same
// bot, different game — one plays with the shop and one without.
// `test/baseline.md` says which question belongs to which instrument.

import { playOne, runWires } from './check.js';
import { hashSeeds } from '../sim/rng.js';
import { DEFAULT_ORDER, nextPurchase } from '../ui/shop.js';
import { heroByName } from '../sim/heroes.js';

// What the shop gets to spend when a run ends.
//
// Coins are paid PER COMPLETED TRAVERSAL (docs/rules.md §9), and the engine
// writes `.coins` onto EVERY row including the fatal one — the write happens
// before the death branch (src/sim/dungeon.js). Summing the array raw
// therefore pays for the traversal the hero died in, which the rule says is
// not paid. The engine's own `outcome` is the filter: 'ascended' finished,
// 'died' and 'timeout' did not.
//
// `spent` comes off the top because a hero who shops at the stairs already
// took his share out of that floor's pay — the same `earned - spent` the
// page banks (src/ui/spectator.js), and 0 for every hero but the engineer.
export function balanceOf(run) {
  let balance = 0;
  for (const level of run.levels) {
    if (level.outcome !== 'ascended') continue;
    balance += (level.coins ?? 0) - (level.spent ?? 0);
  }
  return balance;
}

// The unattended shop, drained. `nextPurchase` IS the rule and is already
// pure (src/ui/shop.js); this is only the loop the page wraps around it,
// with the clock and the animation taken out. Reusing it rather than
// rewriting the drain is what stops this instrument from measuring a shop
// nobody plays.
//
// Items are COPIED, not handed over by reference. The page keeps the wallet
// as JSON, so a real run always gets fresh objects; sharing one ITEM_TABLE
// row across every run of a chain would be an invention of this file, and
// the kind that stays invisible until something downstream writes to an
// item.
export function spend(balance, order = DEFAULT_ORDER) {
  const bought = [];
  let left = balance;
  let entry = nextPurchase(left, order);
  while (entry) {
    left -= entry.price;
    bought.push({ ...entry.item });
    entry = nextPurchase(left, order);
  }
  return { bought, spent: balance - left, left };
}

// Run 1 of a chain uses the chain's own seed; every run after it is derived.
//
// THAT FIRST EQUALITY IS THE POINT. `check.js` plays `firstSeed + i`, so run
// 1 of chain `i` is the SAME run the naked instrument measures at index `i`,
// and the two can be paired seed by seed at the one place they overlap.
// `test/baseline.md` is blunt about why that matters: the paired delta is
// the answer, the two means beside it are not.
//
// The page derives every run including the first (`hashSeeds(sessionSeed,
// runNumber)`, src/ui/spectator.js). Nothing depends on WHICH arbitrary
// integer a seed is, so trading the page's convention for the pairing costs
// nothing and buys the comparison this file exists for.
export function seedOf(chainSeed, run) {
  return run <= 1 ? chainSeed : hashSeeds(chainSeed, run);
}

// How many of each item, by name — small enough to print, and the shape the
// wires want. `carried` alone cannot tell four shields from four axes.
function pileOf(items) {
  const counts = {};
  for (const item of items) counts[item.name] = (counts[item.name] ?? 0) + 1;
  return counts;
}

// ONE session: `length` runs, the shop between them.
//
// The order of the two rules at a run's end is the page's order, and it is
// not interchangeable (src/ui/spectator.js): the death rule fires FIRST
// (`tallyDescent` calls `resetOnDeath`), the shop opens after. So a run that
// died still spends what it earned, and the item that buys survives into the
// next run — losing the pile and buying a new one are the same instant, not
// a contradiction.
export function playChain(chainSeed, length, options = {}) {
  const order = options.order ?? DEFAULT_ORDER;
  const dials = options.dials;
  // A NAME or the entry itself, the same two callers `check.js` serves for
  // the same reason: JSON on a command line can only carry the name.
  const hero = typeof options.hero === 'string'
    ? heroByName(options.hero)
    : options.hero;
  // Kept so `chains` can hand them to the shared wires without replaying
  // anything. `playChain` on its own throws them away, which is why the
  // rows above carry the handful of fields a reader actually wants.
  const plays = options.collect ?? null;

  let pile = [];
  let streak = 0;
  const runs = [];

  for (let k = 1; k <= length; k++) {
    const seed = seedOf(chainSeed, k);
    const run = playOne(seed, dials, hero, pile);
    if (plays) plays.push(run);
    const balance = balanceOf(run);
    const kept = run.cleared ? pile : [];
    const { bought, spent } = spend(balance, order);

    runs.push({
      run: k,
      seed,
      cleared: run.cleared,
      depth: run.depth,
      // What this run STARTED holding, before the shop below topped it up.
      // Recorded on the run it armed rather than on the shop that bought it:
      // the wires ask "how did a run holding n items do", and that is the n.
      carried: pile.length,
      pile: pileOf(pile),
      // Clears BEFORE this run. Zero on run 1 and zero after every death —
      // and a run at streak 0 is NOT a naked run, which is the distinction
      // that decides what the wires may read. Only run 1 of a chain is
      // naked, plus any run whose predecessor died before finishing a single
      // traversal and so paid nothing.
      streak,
      balance,
      spent,
      bought: bought.map((item) => item.name),
    });

    pile = [...kept, ...bought];
    streak = run.cleared ? streak + 1 : 0;
  }

  return { chainSeed, length, runs };
}

// The lengths of every unbroken run of clears in a chain, longest first. An
// empty list means the chain never cleared once, which is the shipped game.
function streaksOf(runs) {
  const lengths = [];
  let current = 0;
  for (const row of runs) {
    if (row.cleared) current++;
    else if (current) { lengths.push(current); current = 0; }
  }
  if (current) lengths.push(current);
  return lengths.sort((a, b) => b - a);
}

// THE WIRES, from `chains` sessions of `length` runs each.
//
// Six of them are `check.js`'s own, read off the same bars — this is the
// naked game's properties applied to the game with the shop in it, and the
// DIFFERENCE between the two readings is the comparison this instrument was
// built for. Two more are the chain's own and could not exist on independent
// runs.
export function chains(options = {}) {
  const count = options.chains ?? 8;
  const length = options.length ?? 12;
  const firstSeed = options.firstSeed ?? 500000;
  const dials = options.dials;
  const hero = typeof options.hero === 'string' ? heroByName(options.hero) : options.hero;

  const plays = [];
  const sessions = [];
  let openedPaired = 0;

  for (let m = 0; m < count; m++) {
    const chainSeed = firstSeed + m;
    const { runs } = playChain(chainSeed, length, { ...options, hero, collect: plays });
    // THE PAIRING, checked rather than trusted. `check.js` plays
    // `firstSeed + m`, so run 1 of chain m has to open on that seed with
    // nothing in hand. It costs no runs to verify — it is a property of what
    // the loop did, not a second measurement — and every future comparison
    // between the two instruments rests on it.
    const first = runs[0];
    if (first && first.seed === chainSeed && first.carried === 0) openedPaired++;
    sessions.push({ chainSeed, streaks: streaksOf(runs), pileMax: Math.max(...runs.map((r) => r.carried)) });
  }

  const { clears, wires } = runWires(plays);
  const streakMax = Math.max(0, ...sessions.map((s) => s.streaks[0] ?? 0));
  const pileMax = Math.max(0, ...sessions.map((s) => s.pileMax));
  // Never below three, so a short chain cannot fire on what is ordinary
  // noise: at length 4, "half the session" is two clears in a row, and two
  // is not a snowball.
  const runawayAt = Math.max(3, Math.ceil(length / 2));

  const wire = (name, value, fires, condition) => ({
    name, value: +value.toFixed(3), fires, condition,
  });

  return {
    chains: count,
    length,
    firstSeed,
    runs: plays.length,
    // Same discipline as check.js states for itself: a reading quoted without
    // these is a reading of a game nobody named.
    shipped: Boolean(dials),
    hero: hero ? hero.name : 'base',
    clears,
    tripwires: [
      ...wires,

      // "What persists compounds: bought with wins and spent to produce more
      // wins, the same currency in both directions, accumulating until it
      // trivialises." (objectives.md) — the failure that only a SESSION can
      // show. `docs/project/candidates.md` names it and says the death reset
      // is the only brake and nobody has checked it is strong enough. This
      // is the check.
      wire('the chain never breaks', streakMax,
        streakMax >= runawayAt,
        `fires when one unbroken run of clears takes half a session (>= ${runawayAt} of ${length})`),

      // The pairing above. Not a measurement — a check that the loop did what
      // `seedOf` promises, so it fires on a code change and never on a dial.
      wire('the chain does not open paired', openedPaired / count,
        openedPaired !== count,
        'fires when any chain does not open on check.js own seed, empty-handed'),
    ],
    // NOT A WIRE, and the reasoning is worth keeping because it looks like
    // one. The pile growing IS the rule (rules.md §9) — a wire on its size
    // would fire on the game working. What makes a big pile a defect is what
    // it does to the OUTCOME, and that already has a wire: `wins too common`.
    // This is here to be looked at beside these, not steered.
    pileMax,
    streaks: sessions.map((s) => s.streaks),
  };
}
