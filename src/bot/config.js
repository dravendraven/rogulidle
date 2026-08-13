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
