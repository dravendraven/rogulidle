// The bot's own tuning. Every number the bot runs on lives HERE — the engine
// never reads this file, and src/sim/balance.js no longer holds bot dials.
// Bot rules live in the bot (CLAUDE.md); so do the bot's numbers.

// The shipped hero. A hero with special characteristics is a DIFFERENT
// CONFIGURATION of this object handed to makeBot, never different bot code —
// that is the whole choice-layer mechanism, and the roster that will use it
// is deliberately not built yet.
//
// One trait per objective, in the bot's own priority order:
//   1. survive the floor      -> fightMargin
//   2. arrive rich            -> sideAppetite
//   3. spend few steps        -> stepCost
export const DEFAULT_HERO = {
  // A fight may cost at most this share of effective hp (hp + armour),
  // expected. Expected cost is an average — a duel priced at exactly
  // everything the hero has loses about half the time — so the margin is
  // headroom, not a break-even test. Lower is more cowardly.
  fightMargin: 0.7,

  // Side rooms are the map's gamble, and this is the appetite for it: a
  // side-room fight or guarded chest is only a candidate while its cost
  // stays under `sideAppetite × fightMargin × effectiveHp`. 0 never leaves
  // the mandatory route, 1 gambles at the same bar as any other fight, and
  // above 1 it risks MORE on the optional than on the mandatory — which is
  // the only way to say "take this even though it does not pay".
  //
  // 0.5 rather than 1, and the number came from the vault (M43/M44). Swept
  // over 200 runs: 0 enters the room in 3% of floors, 0.5 in 44%, 1.0 in
  // 70%, 2.0 in 85%. At 0.5 the hero wins 22% of the fights it takes, which
  // is the band the room was built for — high enough that entering is not
  // suicide, low enough that it is a bet.
  sideAppetite: 0.5,

  // What one step is worth in hp. This is the exchange rate between goal 3
  // and the other two: raising it makes near goals win harder and empties
  // the "worth the walk" pool sooner, so a hasty hero leaves earlier.
  stepCost: 0.01,
};

// How much of a creature's menace SURVIVES each tile of distance when
// pricing a tile: at 0.5 a wolf two tiles away charges a quarter of its
// bite, at 0.95 it still charges nine tenths.
//
// B20 — renamed from `DANGER_FALLOFF`, and the old name was not a cosmetic
// problem. "Falloff" reads as a rate of DECAY, so higher sounds like faster
// fading and therefore a more short-sighted hero; the exponent does the
// opposite, and the Lab shipped arrows promising the inverse of what moving
// the dial did. The name is the bug's root cause, so it went with the fix.
//
// Measured at n=300 against 0.5: raising it to 0.95 is worth +0.38 floors of
// mean depth (2.3 sigma, real but small) and costs 15 points of vault entry
// (46% -> 31%), because a hero that fears things from further away stops
// walking into the room. NOT adopted: that is a balance decision about the
// Butcher, not a free win. See decisions.md.
export const DANGER_PERSISTENCE = 0.5;

// Extra hp charged for standing where two or more creatures could strike at
// once. A price rather than a ban: a ban can strand a goal and needs
// fallback machinery, a price this size is simply avoided when there is any
// alternative.
//
// B19 — DECIDED, no longer a dial. Swept at 0 / 15 / 20 over 100 shared
// seeds: **15 and 20 produce byte-identical runs in every column**, so the
// price saturates and no tile decision changes above it, and 0 sits inside
// the noise of 15. The reason is that it prices something that barely
// exists — over 400 generated floors only 19.8% hold even ONE tile two
// awake creatures can reach, an average of 0.57 such tiles against 133
// threatened ones.
//
// 15 is kept rather than 6 or 0 because it is what shipped, so removing the
// slider changes no behaviour at all; and the mechanism stays because it is
// not fighting anything — it is correct on the one floor in five where the
// situation is real. `decisions.md` carries the third independent
// confirmation that tuning it does nothing.
export const CROWD_PENALTY = 15;

// A new goal must be cheaper than the current one by this factor before the
// bot switches. Without it two near-equal goals make it dither on the spot
// instead of committing to either.
//
// B20 — DECIDED, no longer a dial, and the second inert one this sweep
// found. At n=100 it looked mildly monotonic (mean depth 4.1 -> 4.4 across
// 1.0 -> 3.0) and that was noise: re-measured at n=300 against the same
// seeds, 3.0 moves mean depth by +0.01 (0.1 sigma) and "reached floor 7+" by
// -0.3pp (0.1 sigma). Nothing.
//
// Kept at 1.4, the value that shipped, so removing the slider changes no
// behaviour. The mechanism stays because dithering is real — it is the
// FLOOR of the range that would hurt, not the ceiling that would help.
export const GOAL_STICKINESS = 1.4;

// The floor's creature count is granted to the bot (rules.md §7) so it can
// know whether the dark still hides anything worth finding. It travels in
// makeBot's options with the generation settings; this is only the default
// for a bot built with none.
export const DEFAULT_MONSTER_COUNT = 5;
export const DEFAULT_CHEST_COUNT = 15;

// ***** B21 — the bias vocabulary ***** //
//
// Every player-facing dial is becoming the same shape: a percentage bias on
// a quantity the bot already prices correctly, centred on a value the
// player CANNOT select. Six bands, no middle, so a setting always leans and
// every option carries a real weakness — which is what `objectives.md`
// demands of a choice and what this project kept failing at one dial at a
// time. Four separate no-brainers were found and patched before the shape
// itself was suspected.
//
// ONE NUMBER GENERATES THE WHOLE SCALE. Widening or narrowing the dials for
// a tuning pass is editing `BIAS_SPREAD` and nothing else — the bands, the
// labels and every consumer follow. 0.8 means the weakest setting prices a
// thing at a fifth of its worth and the strongest at nearly double.
export const BIAS_SPREAD = 0.8;

// Six multipliers, symmetric around 1 and never equal to it, spaced evenly
// across the whole range so that one notch is always the same size — which
// is what lets "one band up" mean the same thing on every dial and makes
// two readings comparable.
//
// The two inner bands straddle the centre rather than sitting on it: at
// spread 0.8 they are 0.84 and 1.16, so the smallest possible setting is
// still 16% away from the value the bot is calibrated at.
export function biasBands(spread = BIAS_SPREAD, count = 6) {
  const lo = 1 - spread;
  const step = (2 * spread) / (count - 1);
  return Array.from({ length: count }, (_, i) => +(lo + i * step).toFixed(3));
}

// ***** B21 — what an unopened chest is worth, in hp ***** //
//
// The bot has never had a reward term. A chest's price is `walk + guard`,
// pure cost, and the pool takes the CHEAPEST of everything — so it could
// only ever ask "can I afford this", never "is it worth it". That is why
// greed and courage both ended up pulling on the same threshold from the
// same side, and why greed had nothing of its own to bias.
//
// A BOT-SIDE BELIEF, not engine knowledge, and the distinction is the whole
// reason this is one constant here rather than a reading of the generator.
// The hero may not know what a chest holds (`drop` never crosses into
// Belief — src/sim/observe.js), and it is not told the scarcity dials
// either. It believes an unopened chest is worth this much and acts on the
// belief; being wrong is allowed and is exactly what a bias dial is for.
//
// 1 hp, and it is CALIBRATED rather than derived. The naive estimate is
// about 2 — a chest holds a shield (+3 armour) or a potion (+3 healing),
// both worth roughly 3 hp, and about two thirds of them hold anything once
// the positional roll and the scarcity gate are applied.
//
// Measured, that is too generous. The gate only ever uses the PRODUCT
// `value × greed`, so a sweep over the six bias bands at value 2 located
// the best threshold at about 0.93 hp — greed 0.467 read 4.76 mean floors
// against 4.05 at the greedy end and 4.38 at the timid one. Setting the
// value to 1 puts that optimum at bias 1.0, which is what makes the six
// bands straddle it instead of sitting entirely on one side.
//
// So this constant is the CENTRE the dial biases around, and the player
// cannot select it: the nearest bands are 0.733 and 1.267. Every setting
// leans, which is the whole design.
export const CHEST_VALUE_HP = 1;

// B21 — A/B SWITCH, off by default. On, a chest is refused when what it
// costs exceeds what it is worth times the hero's greed; off, the old rule
// applies exactly — refused when the GUARD alone exceeds
// `sideAppetite × fightMargin × ehp`. Nothing else differs, so the two can
// be compared over the same seeds and either can be shipped.
export const LOOT_VALUE = false;
