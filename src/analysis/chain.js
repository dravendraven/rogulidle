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

import { playOne, runWires, wire } from './check.js';
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
  // The BUYER is swappable, because the shop has two real players: the
  // unattended drain (rules.md §9 — the idle game, and the default here)
  // and a person at the screen choosing per run with the pile in front of
  // them. `buy(balance, keptPile)` returns `{ bought, spent }`; the
  // policies live with whoever is measuring (tools/e2-sweep.mjs), so this
  // file never grows a second copy of the default one.
  const buy = options.buy ?? ((balance) => spend(balance, order));
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
    const { bought, spent } = buy(balance, kept);

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
  const perChain = [];
  const sessions = [];
  let openedPaired = 0;

  for (let m = 0; m < count; m++) {
    const chainSeed = firstSeed + m;
    const mine = [];
    const { runs } = playChain(chainSeed, length, { ...options, hero, collect: mine });
    plays.push(...mine);
    perChain.push(mine);
    // THE PAIRING, checked rather than trusted. `check.js` plays
    // `firstSeed + m`, so run 1 of chain m has to open on that seed with
    // nothing in hand. It costs no runs to verify — it is a property of what
    // the loop did, not a second measurement — and every future comparison
    // between the two instruments rests on it.
    const first = runs[0];
    if (first && first.seed === chainSeed && first.carried === 0) openedPaired++;
    sessions.push({
      chainSeed,
      streaks: streaksOf(runs),
      pileMax: Math.max(0, ...runs.map((r) => r.carried)),
    });
  }

  const { clears, wires } = runWires(plays);

  // THE ERROR BAR, and it has to be computed HERE rather than by whoever reads
  // the number. Runs inside a chain are correlated — run k depends on how k-1
  // ended — so `sqrt(p(1-p)/runs)` treats M x L runs as M x L independent
  // samples and understates the error, by a factor that grows with how much
  // the shop actually does. The honest error is between CHAINS: read the same
  // wire once per chain and take the spread of those k readings.
  //
  // Printed on the shared wires only, since those are the ones ever compared
  // against a naked reading. CLAUDE.md's "do not explain a difference until it
  // clears 2 sigma" is unusable without it — and the first draft of this
  // module's own comparison quoted 4.9 sigma off the wrong denominator.
  const byChain = perChain.map((mine) => runWires(mine).wires);
  const stderr = (xs) => {
    if (xs.length < 2) return 0;
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const variance = xs.reduce((a, x) => a + (x - mean) ** 2, 0) / (xs.length - 1);
    return Math.sqrt(variance / xs.length);
  };
  const shared = wires.map((w, i) => ({
    ...w,
    se: +stderr(byChain.map((ws) => ws[i].value)).toFixed(3),
  }));

  const streakMax = Math.max(0, ...sessions.map((s) => s.streaks[0] ?? 0));
  const pileMax = Math.max(0, ...sessions.map((s) => s.pileMax));

  // THE BAR IS DERIVED FROM THE SAMPLE, not written — the longest streak that
  // the observed win rate could still explain by luck alone.
  //
  // If runs were independent draws at rate p, a streak of k somewhere in n
  // runs has expectation about n·p^k. So the bar is the smallest k where that
  // drops under 1%: below it, luck is a live explanation; at or above it, the
  // wins are making the next win easier, which is the compounding
  // `objectives.md` names. Never below 3, so a tiny sample cannot fire on two
  // in a row.
  //
  // THE FIRST VERSION OF THIS BAR WAS `length / 2` AND IT WAS WRONG. A chain
  // of 40 turned up a streak of 15 and the wire stayed quiet, because the bar
  // had grown with the chain. Fifteen wins in a row is a snowball whether the
  // session is 40 runs or 4000 — a bar that rises with the evidence gets less
  // sensitive the more you measure, which is backwards for a tripwire.
  const rate = plays.length ? clears / plays.length : 0;
  const runawayAt = (() => {
    if (rate <= 0 || rate >= 1) return 3;
    for (let k = 3; k <= 60; k++) if (plays.length * rate ** k < 0.01) return k;
    return 60;
  })();

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
      ...shared,

      // "What persists compounds: bought with wins and spent to produce more
      // wins, the same currency in both directions, accumulating until it
      // trivialises." (objectives.md) — the failure that only a SESSION can
      // show. `docs/project/candidates.md` names it and says the death reset
      // is the only brake and nobody has checked it is strong enough. This
      // is the check.
      wire('the chain never breaks', streakMax,
        streakMax >= runawayAt,
        `fires at a streak of ${runawayAt}+ clears, which luck at ${(rate * 100).toFixed(1)}% `
        + 'per run would not produce in this many runs'),

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
