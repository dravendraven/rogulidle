// The bot's own tuning. Every number the bot runs on lives HERE — the engine
// never reads this file, and src/sim/balance.js no longer holds bot dials.
// Bot rules live in the bot (CLAUDE.md); so do the bot's numbers.

import { CHEST_LOOT_CHANCE } from '../sim/balance.js';
import { ARMOUR_SCARCITY, POTION_SCARCITY } from '../sim/difficulty.js';
import { itemWeights } from '../sim/spawn.js';

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
  // headroom, not a break-even test.
  //
  // NO LONGER THE COURAGE DIAL. It is a decided constant now: courage moved
  // to `bravery` below, which bends the ESTIMATE instead of the bar, and two
  // dials pulling on the same decision from opposite ends was the confusion
  // M47 spent a whole item untangling.
  fightMargin: 0.7,

  // COURAGE, and what it actually does: the bot is no longer told a
  // creature's health at a distance (src/sim/observe.js), so it commits to
  // fights on the bestiary average for that xp. This bends that guess.
  //
  // 1 is the average taken at face value; the six bands mirror around it, so
  // one notch up (1.16) reads every creature as holding 16% LESS than its
  // kind usually does. Brave is not "accepts worse odds" — it is "believes
  // things die faster than they look", which is right about the wolf and
  // wrong about the ogre, both of which are xp 4.
  bravery: 1,

  // ***** the two halves of what used to be one dial (C1 §7) *****
  //
  // `sideAppetite` was doing two different jobs and this file said so out
  // loud — "stops being a share of the hero's hp and becomes a multiplier on
  // VALUE". `docs/bot.md` recorded the consequence: two effects that "somam
  // na mesma leitura e não dá para separá-las". A sweep of it moved five
  // gates at once, two of them in opposite directions, so it could not
  // answer a question about any of them.
  //
  //     the BARS are risk        →  riskAppetite
  //     the PRICES are greed     →  sideAppetite
  //
  // Not a new parameter compensating for an old one (CLAUDE.md) — a fused
  // one taken apart. Both are born at 1, so the split lands as an exact
  // no-op and each half can then be swept on its own.
  //
  // HOW MUCH UNCERTAIN COST THE HERO ACCEPTS, as a multiple of the bar he
  // already applies to a plain fight: a guarded chest or item is a candidate
  // only while its guard stays under `riskAppetite × fightMargin ×
  // effectiveHp`, and the same bar refuses a frontier with too much danger
  // on the way. 0 never gambles at all; above 1 it accepts more for what is
  // optional than for what it cannot avoid.
  //
  // It is the same family as `bravery` and a different POPULATION, which is
  // worth writing down or the two get fused next: bravery is the attitude to
  // uncertainty about a creature IN SIGHT, this one about what has not been
  // seen at all.
  riskAppetite: 1,

  // WHAT A THING IS WORTH TO THIS HERO. Under LOOT_VALUE it multiplies a
  // chest's EXPECTED VALUE, so 1.0 is "price a chest at exactly what it is
  // worth" — the only centre in this file that is derived rather than
  // chosen, because `CHEST_VALUE_HP` computes the value and this leaves it
  // alone (B25).
  //
  // It also decides how long an item is HOARDED (the book's and the
  // syringe's demand), and that direction is the opposite of the chest's on
  // purpose: valuing things highly means acquiring more AND spending less.
  // Miserliness working from both ends, which is why the two stayed
  // together while the bars left.
  //
  // The earlier 0.5 came from the vault sweeps under the OLD rule, where
  // this was a share of hp and the two numbers are not comparable.
  sideAppetite: 1,

  // What one step is worth in hp. This is the exchange rate between goal 3
  // and the other two: raising it makes near goals win harder and empties
  // the "worth the walk" pool sooner, so a hasty hero leaves earlier.
  //
  // B24 — DECIDED, no longer a dial, at 0.1 (what shipped via
  // dial-overrides.json; moved here so removing the slider changes nothing).
  // The third inert one this project has found, and the one that resisted
  // hardest: swept at eight points, then again as six bands around three
  // different centres — 18 configurations at n=150 — and **everything
  // between 0.08 and 0.9 measures the same**, 4.3 to 4.5 mean floors against
  // a standard error of 0.15.
  //
  // An earlier n=100 sweep said 0.4 and 0.8 were worth half a floor over
  // 0.1. That was noise, and it is the third reading in this project's
  // history to evaporate at three times the sample.
  //
  // The MECHANISM still matters and that is why the number stays: at 0
  // walking is free and the bot wanders one floor for 1500 turns. It needs
  // to be above about 0.08 and below the absurd. It is not a choice.
  stepCost: 0.1,
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
// B24 — 0.7, raised from 0.5, and this is the one player dial with a real
// range. Swept as six bands at n=200: 0.1 reads 3.85 mean floors, 0.26 4.08,
// 0.42 4.25, then 0.58 / 0.74 / 0.9 read 4.57 / 4.63 / 4.58 — a 0.78 floor
// span end to end at 4.7 sigma, with every other column moving with it
// (reaching floor 7 goes 5% to 17%, chests 17 to 21, kills 40 to 61).
//
// The curve RISES AND THEN FLATTENS, so there is no interior optimum: the
// bottom half costs depth and the top half is a plateau. 0.5 sat below that
// plateau, which meant the bot ran calibrated at a point worse than four of
// its own six bands. 0.7 puts the centre inside it, so the default is good
// and going DOWN is the deliberate choice — which is the shape the dial
// design asks for even though this dial cannot offer a peak.
//
// It costs vault entry: measured at n=300, 0.5 -> 0.95 takes entry from 46%
// to 31%, because a hero that fears things from further away stops walking
// into the room.
export const DANGER_PERSISTENCE = 0.7;

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

// ***** B21/M47 — what an unopened chest is worth, in hp *****
//
// The bot has never had a reward term. A chest's price was `walk + guard`,
// pure cost, and the pool took the CHEAPEST of everything — so it could ask
// "can I afford this" and never "is it worth it". That is why greed and
// courage both pulled on the same threshold from the same side, and why
// greed had nothing of its own to bias.
//
// M47 — COMPUTED, never tuned. This is the expected value of an unopened
// chest and nothing else: the chance it holds anything, times the average
// hp a chest item is worth, weighted the same way the generator weights
// which kind comes out. Change `CHEST_LOOT_CHANCE`, change what a shield or
// a potion gives, change the scarcity ratio — this follows on its own.
//
// It is NOT a balance dial and must not be nudged to make a measurement come
// out nicer. The number is the bot's honest belief; the greed dial is what
// biases away from it, and a hand-tuned centre would make the bias mean
// nothing. (A sweep did suggest a lower threshold reads better on mean
// depth; at n=150 the middle four bands were within noise of each other, so
// there was nothing solid to move to anyway.)
//
// A BOT-SIDE BELIEF even so: the hero is never told what a chest holds
// (`drop` does not cross into Belief, src/sim/observe.js). It computes what
// the average chest is worth and acts on that, which is what a player would
// do after watching a few runs.
//
// `armour + heal` is the hp value of a chest item — the armour bar and the
// hp bar are both damage the hero can take before dying (`effectiveHp`), so
// a point of either is a point of survival. Weapons are not a chest kind.
export function expectedChestValueHp(
  lootChance = CHEST_LOOT_CHANCE,
  scarcity = { armour: ARMOUR_SCARCITY, potion: POTION_SCARCITY },
) {
  // Reuses the generator's own weighting rather than restating it — one
  // source of truth for "which kind comes out of a chest". `allowEmpty:
  // false` because `lootChance` above already decides whether it holds
  // anything at all.
  const entries = itemWeights(scarcity, 'chest', 0, [], false);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return 0;
  const average = entries.reduce(
    (sum, [item, w]) => sum + w * ((item.armour || 0) + (item.heal || 0)), 0,
  ) / total;
  return lootChance * average;
}

export const CHEST_VALUE_HP = expectedChestValueHp();

// B21/B25 — ON. A chest is refused when what the visit costs — the walk AND
// the guard — exceeds what the chest is worth times the hero's greed, and
// the guard's duel is split across everything it guards.
//
// Off, the old rule applied: refused when the GUARD alone exceeded
// `sideAppetite × fightMargin × ehp`, with the whole duel charged against
// every chest separately. That is what made the vault unreadable — eight
// chests behind one creature were priced as eight separate 7-hp fights.
//
// KEPT AS A FLAG rather than deleted, because the two rules are a real A/B
// and `decisions.md` carries both columns. Setting it false restores the old
// behaviour exactly.
//
// ***** WHAT IT DOES NOT COVER, and this is a live inconsistency *****
//
// `sideAppetite` now means two different things at once. For CHESTS it is a
// multiplier on value — 1.0 prices a chest at exactly what it is worth, and
// that is what the Lab's Ganância describes. For side-room CREATURES and
// loose ITEMS it is still a share of the hero's hp (`sideAppetite ×
// fightMargin × ehp`), because neither has a value the bot can price: a
// weapon's worth is damage, not hp, and converting one to the other is a
// modelling decision nobody has made.
//
// So the dial's label is true for the case it was built for and incomplete
// for two others. Stated here rather than discovered later.
export const LOOT_VALUE = true;

// ***** when the scholar reads (src/sim/heroes.js) ***** //

// How much of the bar has to be MISSING before the book is worth five turns
// standing still — a share of hpMax, so it means the same thing whatever the
// bar is, and it is SCALED BY GREED at the call site (src/bot/bot.js).
//
// This is the demand when the WHOLE descent is still ahead; greed and the
// threat still in front both scale it down from there.
//
// 0.8 rather than 0.9, and the difference is the top half of the dial: at
// 0.9 anything from greed 1.0 up hit READ_CAP on shallow floors, so three of
// the six bands read at the same hp on the same floor and the setting stopped
// meaning anything. Swept at both.
//
// Higher wastes the heal — the book fills to full, so reading at a scratch
// throws most of it away. Lower risks never firing: the bot only reads when
// nothing awake can reach it, and a hero already down to his last point is
// usually down there BECAUSE something is on him.
export const READ_AT = 0.8;


// ***** when the warrior injects (src/sim/heroes.js) ***** //

// What share of everything he has the fight in front of him must be expected
// to cost, before the syringe is worth spending. Greed multiplies it, exactly
// as it does the book's demand — a miser saves it for a bigger fight — and it
// is deliberately uncapped: above greed 1 the demand passes what the hero
// owns, and unmeetable IS "hold it for something real".
//
// 1.0, swept at 0.5 and 1.0: it lifts the median injection from floor 4.3 to
// 5.4 and puts 62% of them on floor 5 or deeper, at the cost of the top band
// using the syringe in 48% of runs instead of 86%.
//
// IT CANNOT BE PUSHED MUCH FURTHER, and the wall is not this number. The bot
// refuses fights costing more than `fightMargin` of what it has, so a melee
// cost above roughly one bar only ever happens when it is AMBUSHED — and
// ambushes are no deeper than anything else. Past that point the demand
// stops discriminating by depth and only gets rarer.
//
// AND THE NUMBER IS NOT WHAT IS WASTING THE ITEM. The sensor moved from
// every awake creature to the adjacent ones (`meleeCost`), which killed the
// 40% of injections thrown at empty air, and B26 made the router honest —
// utilisation went 31% -> 41% -> 47% of raging turns landing a blow.
//
// WHAT IS LEFT IS A CONTRADICTION BETWEEN THIS CONSTANT AND `fightMargin`,
// and it is not a tuning problem. At 1.0 the syringe fires when the melee in
// front of the hero costs MORE than one bar — which is the same test the
// fight gate uses to REFUSE that melee. Raging halves the duel, but half of
// "well above 0.7" is still above 0.7: measured over 150 runs, in 30 of 84
// injections the gate refuses every adjacent creature even with the rage
// already running, and 35 injections land no blow at all. He spends the item
// and then walks away from the fight that justified spending it.
//
// The fix is a condition rather than a threshold, and it would DELETE this
// constant: inject when the rage turns a refused fight into an accepted one
// (`duel > bar` and `ragingDuel <= bar`). That is a no-brainer in the same
// sense the adjacency rule is. It costs the greed ladder this number buys,
// so it is the owner's call and not a cleanup.
export const RAGE_AT = 1.0;
