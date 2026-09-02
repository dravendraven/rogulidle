// The bot's own tuning. Every number the bot runs on lives HERE — the engine
// never reads this file, and src/sim/balance.js no longer holds bot dials.
// Bot rules live in the bot (CLAUDE.md); so do the bot's numbers.

import {
  CHEST_LOOT_CHANCE, COIN_CHEST_AMOUNT, COIN_RATE, ITEM_TABLE, SHOP_PRICES,
} from '../sim/balance.js';
import { ARMOUR_SCARCITY, POTION_SCARCITY } from '../sim/difficulty.js';
import { itemWeights } from '../sim/spawn.js';

// Pulled out of DEFAULT_HERO because `EXPOSURE_STEPS` below is defined as a
// ratio against it (steps per creature-turn), and keeping the two side by
// side is what keeps the ratio readable.
const STEP_COST = 0.1;

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
  // 1 is the average taken at face value; the bands mirror around it, so
  // one notch up (1.32 at four bands) reads every creature as holding 32%
  // LESS than its kind usually does. Brave is not "accepts worse odds" — it is "believes
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
  // DECIDED AT 1, NOT A DIAL, and the reasoning is the owner's: every dial
  // here is already a form of risk. Courage is how much you risk to face a
  // creature, greed how much you risk for a reward, curiosity how much you
  // risk to explore. A fourth band called "risk" beside those
  // three is not a fourth question — it is the name of the axis the other
  // three already live on.
  //
  // What it governs is narrow enough to make the point on its own: two gates,
  // and one of them (a loose item's guard) is rare, so in play it decides
  // almost exactly one thing — explore past a creature, or not. Caution
  // already prices that same walk; this only vetoes it.
  //
  // The §7 SPLIT STANDS. Separating value from bar inside the code was right
  // and stays: `sideAppetite` means value and nothing else. What went is the
  // bar having a band of its own, which is the shape `fightMargin` above
  // already has — it matters, and nobody drags it.
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

  // HOW MUCH THE UNKNOWN REPELS OR BEGUILES THIS HERO. NO LONGER A DIAL OF
  // ITS OWN (fused 2026-08-31): the panel derives it from PRESSA's notch,
  // mirrored — pressa mínima é curiosidade máxima — because the 256-combo
  // grid measured the two moving together in every winner and the off-axis
  // corners winning nothing. The TRAIT stays independent here so a persona
  // (or a sweep) can still set it directly; only the panel fused them.
  //
  // It replaced Cautela on the panel and took HALF of what she did: the
  // price of a goal that opens new map (`opening` in src/bot/bot.js). The other half —
  // how wide he detours around creatures — measured as calibration, not
  // choice (deaths 1.00 flat across all six bands), and lives on as
  // `EXPOSURE_STEPS` below.
  //
  // Same idiom as `bravery`: 1 takes the dark's price at face value, and the
  // mirror `(2 − curiosity)` bends it — one notch up (1.32 at four bands)
  // prices the dark 32% CHEAPER, so the curious hero opens map he does not
  // strictly need,
  // and the incurious one does only what is in sight and descends with the
  // floor still black. It cannot make the dark ATTRACT (a negative tile
  // price breaks Dijkstra — tried and documented in bot.md); the range runs
  // from "the dark is nearly free" to "the dark is nearly double".
  //
  // The incurious extreme never strands him: curiosity moves the PRICE of a
  // frontier, never the gate (that bar compares exposure only), and even at
  // the bottom band (below `CURIOSITY_LAST_RESORT`) the fallback path still
  // explores when the hole is unknown — standing still is never survival.
  curiosity: 1,

  // What one step is worth in hp. This is the exchange rate between goal 3
  // and the other two: raising it makes near goals win harder and empties
  // the "worth the walk" pool sooner, so a hasty hero leaves earlier.
  //
  // THE PRESSA DIAL (2026-08-29), and it REVERSES B24 — deliberately, with
  // the reason written down. B24 took the slider away because 18
  // configurations at n=150 measured DEPTH flat from 0.08 to 0.9. Depth is
  // no longer the criterion: the owner's directive (docs/project/dials.md)
  // judges a dial by whether its extremes invert BEHAVIOUR, and this one's
  // do. With LOOT_VALUE on, a chest's detour radius is `worth ÷ stepCost`
  // steps — at the top band (0.195) he only turns aside for a chest ~7
  // steps away against ~15 at the centre, the frontier loses to anything
  // near, and he dives; at the bottom (0.005) walking is nearly free and
  // everything far is worth the trip.
  //
  // It is the one dial that moves STEP AGAINST HP. Exposure and the dark
  // both scale WITH it (their terms multiply stepCost), so the
  // walk/danger/dark proportions hold and routing is untouched — what
  // changes is how walking compares to duels, chest values and bars, which
  // nothing else touches.
  //
  // THE BOTTOM BAND IS ON WATCH: at exactly 0 the bot wanders one floor for
  // 1500 turns, and below B24's measured floor of ~0.08 is unswept ground.
  // 0.005 is not 0, but the shamble tripwire is the guard rail and the
  // band ships to be WATCHED, not presumed.
  stepCost: STEP_COST,
};

// Below this curiosity, the frontier stops COMPETING and goes back to being
// the fallback it was before C1 §5: while anything visible is worth doing,
// he does it; nothing left, he descends if he knows the hole, and only then
// — hole unknown — does he explore. "O escuro é o último recurso", made
// literal, because the price could never make it true: the dark's penalty
// is `9.6 × (2 − curiosity) × stepCost × Δdark` and Δdark is a viewport
// FRACTION (0..~0.5), so even the bottom band adds at most ~1.8 hp — a real
// duel costs 3-8, and the frontier beat 6-12 hp fights while costing 3-5 in
// every watched floor. A structural switch is the only shape that delivers
// the band's own sentence.
//
// 0.25 sits between the bottom band (0.05) and the second (0.68) at the
// shipped spread and band count, so exactly ONE notch crosses it. It is a
// semantic threshold, not a tuning dial — move the spread or the band
// count and re-check this gap.
//
// The declared cost (owner, 2026-08-29): what is visible is now done rather
// than bypassed through the dark, and on floors where the visible things
// are 8-11 hp fights the bottom band will take them and die more.
export const CURIOSITY_LAST_RESORT = 0.25;

// HOW MANY STEPS ONE TURN OF UNPLEASANTNESS IS WORTH — the multiplier on
// both halves of what a route pays beyond walking: exposure to creatures
// (per tile, src/bot/bot.js `priceAt`) and the unknown a goal opens (once,
// `opening`, where `curiosity` above bends it). Until the curiosity split
// this WAS the hero trait `caution`, dial included.
//
// DECIDED, NO LONGER A DIAL, and the measurements are the ones the old dial
// earned. 9.6, measured, re-measured once the uncertainty term moved onto
// the goal; it used to be derived (`MEAN_BITE / stepCost`), and losing that
// is a loss worth naming. The curve RISES AND THEN FLATTENS — six bands at
// n=150 read 4.05 / 4.12 / 4.10 / 4.35 / 4.33 / 4.31 mean floors — so the
// centre sits inside the plateau, the same rule `DANGER_PERSISTENCE` set in
// B24. And THE DIAL SOLD NOTHING: deaths read 1.00 flat across all six
// bands, so it was never a trade the player makes, only a setting that was
// wrong and became less wrong. The big survival spread it once showed
// (0.98 to 0.40) was the per-tile uncertainty bug, not the dial. That is
// why it stopped being one — the question docs/project/rota-e-valor.md left
// open, answered by giving its panel slot to `curiosity`.
export const EXPOSURE_STEPS = 9.6;

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
// labels and every consumer follow.
//
// 0.95 — WIDENED FROM 0.8 (owner, 2026-08-29): the extremes are meant to be
// ABSOLUTES now, not leans. The top band prices a thing at 1.95× and the
// bottom at 0.05×, which is "believes every creature dies in one hit" and
// "no chest is worth a single step" territory; the inner pair (±32% at
// four bands) is where calibration-adjacent play lives. Deliberately in tension with
// dials.md's directive 1 (bands equivalent in effectiveness): the ends are
// now CHARACTER, not calibration, and that doc carries the owner's note.
//
// NOT 1.0, though 1.0 reads cleaner: a multiplier of exactly zero breaks
// two consumers — greed 0 makes the book's demand `missing >= hpMax × 0`,
// true at FULL health, so the scholar reads a zero-heal on turn one; and
// bravery 2.0 prices every duel at exactly 0 rather than nearly-0. 0.05 of
// worth is behaviourally "never" without the arithmetic pathologies.
export const BIAS_SPREAD = 0.95;

// FOUR multipliers (owner, 2026-08-29 — down from six: with the ends now
// absolutes, six notches left neighbours indistinguishable; dials.md's
// "Quantas faixas" section carried the arithmetic — four raises the
// contrast between neighbours ~65% at the same span), symmetric around 1
// and never equal to it, spaced evenly so one notch is always the same
// size — which is what lets "one band up" mean the same thing on every
// dial and makes two readings comparable.
//
// The two inner bands straddle the centre rather than sitting on it: at
// spread 0.95 they are 0.68 and 1.32, so the smallest possible setting is
// 32% away from the value the bot is calibrated at. Still an even count,
// so there is no middle to park on.
export function biasBands(spread = BIAS_SPREAD, count = 4) {
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
  // anything at all. (Coins are not a chest kind — the pile on the floor
  // is its own thing, priced where loose items are, src/bot/bot.js.)
  const entries = itemWeights(scarcity, 'chest', 0, [], false);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return 0;
  const average = entries.reduce(
    (sum, [item, w]) => sum + w * ((item.armour || 0) + (item.heal || 0)), 0,
  ) / total;
  return lootChance * average;
}

export const CHEST_VALUE_HP = expectedChestValueHp();

// The floor's coin chest (COIN_CHEST_AMOUNT, src/sim/balance.js), in hp
// through the shop's exchange rate — what ONE chest on the floor carries on
// top of its draw. The bot never knows which, so the chest gate spreads it
// over every chest the floor holds (`chestCount` is granted, rules.md §7):
// the honest expected value of "one of these has the coins". Computed, and
// it follows COIN_CHEST_AMOUNT and the shelf on its own.
export const COIN_CHEST_VALUE_HP = COIN_CHEST_AMOUNT * hpPerCoin();

// ***** what a FIGHT is worth, in hp — xp priced through the economy *****
//
// The owner's ask (2026-08-29): fights were the one candidate with no value
// side, so a payable duel 15 steps away held the pool open with the hole a
// tile away, at any pressa. This is the chest's arithmetic applied to the
// other half of the floor: what does killing this buy, in the bot's own
// currency.
//
// COMPUTED, never tuned, through three rates that already exist:
//   xp -> coin   `coinsFor` (src/sim/dungeon.js): COIN_RATE × xp / turns
//   coin -> hp   the best hp-per-coin on the shop's shelf (SHOP_PRICES ×
//                ITEM_TABLE — the potion's 3 hp for 1 coin today), the same
//                `armour + heal` ruler the chest value uses
//   turns        one traversal's typical length — see below
//
// So 1 xp ≈ COIN_RATE × hpPerCoin / turns ≈ 0.5 hp today: a rat pays half a
// point, a wolf two. Change the shop, the rate or the pacing and this
// follows.
//
// THE ONE CHOSEN NUMBER is the turns denominator. The coin formula divides
// by the traversal's FINAL turn count, unknown mid-floor; 120 is what the
// sweeps read as a typical traversal (~415-467 turns over ~3.4 floors).
// Chosen, not derived, and named so a pacing change knows where to look.
//
// AND IT NEVER MAKES HIM BOLDER, which is what keeps "não persegue moeda"
// (bot.md) standing: the value only REFUSES fights that do not pay their
// walk — it is a reservation price, like greed on the book. It never
// discounts a duel, never overrides the survival bar, and never applies to
// a fight that is coming anyway (chasing / inescapable creatures are
// exempt: their duel is not a choice).
export const TYPICAL_TRAVERSAL_TURNS = 120;

// The best hp a coin buys on the shop's shelf (the potion's 3-for-1 today)
// — the one exchange rate between the coin economy and the hp economy, used
// by the fight's worth below AND the chest's coin term above it.
export function hpPerCoin(prices = SHOP_PRICES) {
  return Math.max(...ITEM_TABLE
    .filter((item) => prices[item.name] > 0)
    .map((item) => ((item.armour || 0) + (item.heal || 0)) / prices[item.name]));
}

export function expectedXpValueHp(
  rate = COIN_RATE, prices = SHOP_PRICES, turns = TYPICAL_TRAVERSAL_TURNS,
) {
  return (rate / turns) * hpPerCoin(prices);
}

export const XP_VALUE_HP = expectedXpValueHp();

// The switch, mirroring LOOT_VALUE below: ON, a non-chasing creature is
// refused when the JOURNEY to it (approach + dark opened, duel excluded)
// costs more than its xp is worth to this hero — scaled by CORAGEM, which
// is the thirst-for-xp dial (owner, 2026-08-30): it already decides which
// fights he dares, so it also decides how far one is worth walking. OFF
// restores the fight-has-no-value-side bot exactly.
//
// ON since 2026-08-31, and the story of the flag is a lesson in sample
// size. It shipped OFF on an n=24 reading (opening deaths 0.458 -> 0.542,
// "the wire fires") that was 0.6 SIGMA — noise, recorded as measurement,
// in violation of the project's own 2-sigma rule. Re-measured at n=100,
// same seeds paired: the gate at the COMPUTED 0.5 is better than off on
// every column (deaths 0.44 vs 0.52, depth 3.47 vs 3.12, coins 4.1 vs
// 3.5), and the response is dose-dependent — x swept at 0.5/1/1.5/2/3/4
// converges monotonically back to the OFF numbers as the gate loosens,
// which is the signature of a real effect. No calibration was needed: the
// coin chain's own value is the centre, and it is deliberately NOT nudged
// below 0.5 to chase a nicer score (see CHEST_VALUE_HP's rule above).
export const FIGHT_VALUE = true;

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


// ***** when the warrior injects: NO NUMBER AT ALL (B27, B30) ***** //
//
// `RAGE_AT` used to live here — the share of everything he has that the fight
// in front of him had to be expected to cost. It is gone, and what replaced it
// is a CONDITION rather than a smaller threshold: inject when raging turns a
// death into a survival (`rageWouldSave`, src/bot/bot.js).
//
// The old number could not be tuned out of its problem, because the problem
// was that it pointed at the same bar the fight gate uses to REFUSE a fight.
// It fired above one bar; the gate refuses above one bar; so the item was
// spent precisely where the bot then walked away. Measured: 30 of 84
// injections had every adjacent creature refused with the rage already on.
//
// What replaced it first (B28) was still an EXPENSE test — rage making the
// melee cheaper — and that is not what one use per descent is for. The rule
// now reads both duels against the whole of what he has: it kills me sober, it
// does not kill me enraged. `sideAppetite` is the only dial in it and it means
// how CERTAIN the death has to be, which is why no number lives here.
