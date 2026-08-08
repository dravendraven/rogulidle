// Every tunable number in the game. Mirrors docs/balance.md — change the doc
// first, then this file. No other file in src/sim/ may hardcode these.
//
// FAITHFUL  = copied from the original Rogule source, don't touch casually.
// GUESS     = ours, and what P4 tunes.

// ***** world ***** //

export const MAP_SIZE = 32;              // FAITHFUL ui.cljs:26

// ***** M16 — bigger rooms, shorter corridors, docs/backlog.md M16 ***** //
// DIVERGENCE, not FAITHFUL any more — was `[1, 5]` from generator.cljs:146.
// Shortened deliberately so the floor reads as rooms with corridors
// between them, not corridors with rooms attached (docs/rogule-spec.md
// §13.10). Swept 1/2/3/4/5 alongside room size and dugPercentage — see
// docs/balance.md for the numbers, since the three interact and cannot be
// picked alone.
export const CORRIDOR_LENGTH = [1, 3];

// GUESS — `mapgen.js` passed neither `roomWidth` nor `roomHeight` to ROT's
// Digger before this, so ROT's own defaults ([3,9] x [3,5]) applied and
// nobody had chosen them. Raised for the same reason CORRIDOR_LENGTH
// shrank above.
export const ROOM_WIDTH = [5, 9];
export const ROOM_HEIGHT = [4, 7];

// GUESS — how much of the grid the digger hollows out. ROT's default is
// 0.2; lowering it digs fewer and smaller rooms, which is what makes the
// floor read as a route with rooms hanging off it rather than a warren
// with many equivalent ways through. The map-design goal of "one mandatory
// path plus optional detours" needs the map to HAVE a mandatory path, and
// at 0.2 there are usually several.
export const MAP_DUG_PERCENTAGE = 0.15;
export const VISIBLE_DIST = 9;           // FAITHFUL ui.cljs:27
export const CLEAR_DIST = 7;             // FAITHFUL ui.cljs:29 (cosmetic)
export const CHEST_COUNT = 15;           // FAITHFUL generator.cljs:326
export const MONSTER_COUNT = 5;          // FAITHFUL generator.cljs:326

// ***** player ***** //

export const PLAYER_HP = 10;             // FAITHFUL generator.cljs:216
export const PLAYER_XP = 3;              // FAITHFUL generator.cljs:26
export const KILLS_PER_XP = 2;           // FAITHFUL engine.cljs:272

// Divergence, off by default. With this false the player's xp never grows
// and gear is the ONLY progression.
//
// MEASURED, and it does NOT do what you would expect over a dungeon:
//
//   one floor at dial 0.5   50% wins with xp,  43% without
//   ten-floor dungeon        8/10 cleared with, 7/10 without
//
// Freezing xp barely changes how deep the hero gets, because GEAR compounds
// just as freely — carried items went 2.2 -> 8.9 -> 14.6 across the ten
// floors, higher than with xp on, since the bot values loot more when it
// cannot level. Either resource alone is enough to trivialise the descent.
//
// What it does change is WHERE the danger sits: with xp frozen, three of
// ten dungeons ended on floor ONE (against one of ten with xp), because a
// hero who cannot level and has not yet looted is at his weakest ever.
//
// It also kills the snowball that bot-strategy §3 leans on: cheap kills
// first stop making later fights cheaper, so kill order matters only
// through drops.
// OFF by owner decision: the hero's power comes from GEAR and health
// potions, nothing else. xp stays at its starting value all run, so the
// damage die never grows and the only ladder is what the map hands over.
export const XP_FROM_KILLS = false;

// ***** defensive progression (M6, docs/backlog.md) ***** //
//
// DECIDED by the owner: the hero gets growing maximum capacity. The buffer
// (effectiveHp / a floor's mean blow) FALLS across the descent under
// measurement — ×0.862 per floor on the observed ruler — while challenge
// climbs ×1.343. Every point of variance work planned after this (M2-M5)
// adds a lethal tail, and a lethal tail against a falling buffer is not
// tension, it is sudden death with no arc.
//
// Mirrors KILLS_PER_XP's shape exactly: every HP_GRANT_PER_KILLS kills,
// hpMax AND current hp both rise by HP_GRANT_AMOUNT. Same place in the code
// as the xp grant (combat.js playerAttacks), same modulo-on-kill-count
// mechanism. "Killing makes you gradually stronger" is already the game's
// progression idiom (xp); this is its defensive half.
//
// BOTH bars, not just the ceiling — this is not an afterthought. There is
// no regeneration (below), so a hero that gains ceiling without gaining
// current hp arrives at every floor exactly as hurt as before, and the
// MEASURED buffer (read from the hero on arrival, not its theoretical max)
// barely moves. That makes this partly a healing mechanic, which spec
// §13.1 deliberately removed — the difference is the reason that removal
// existed: the original healed with TIME, so a bot could camp a cold
// corner and refill forever, "machinery guarding a resource we did not
// want to exist". Healing earned by KILLS cannot be camped: the supply is
// finite, fixed at generation, and spending it costs the fight. Same
// resource (hp), no exploit, no cap needed.
//
// FAITHFUL note: PLAYER_HP is FAITHFUL and this diverges from Rogule
// knowingly, recorded in docs/rogule-spec.md §13.4. It also reopens the
// "hpMax never moves" invariant that §13.2's armour rewrite deliberately
// established — every place that assumed a constant hpMax needs rechecking
// (dungeon.js and game.js already carry hpMax down the stairs field-by-
// field rather than assuming PLAYER_HP, so they did not need a change).
//
// ON — Review 2 (docs/backlog.md M6), ADOPTED PROVISIONALLY. Review 1 had
// this off because the shipped rate misses both its own bounds: buffer
// still falls (0.910, short of >=1.00) and the real bot's finish rate hits
// 56.7%, outside the then-15-40% band. Review 2 adopted anyway, because no
// rate in the sweep clears both bounds and the smaller rates are strictly
// worse — they pay the same finish-rate cost while buying back nothing on
// buffer (0.125 hp/kill: buffer z=0.32, not even a real effect, finishes
// already at 44.7%). The choice was never "which rate", it was "progression
// or none", and progression was chosen.
//
// "Provisional" is specific: the buffer target itself (>=1.00) is now
// suspect — the same grant read +0.095 buffer on the dumb probe against
// +26 points of finishes on the real bot, which the probe cannot exploit
// the way a competent bot can. That gap is I5's open question, not settled
// here.
//
// REVERSED (docs/backlog.md M6, ca5c6f9): M7 was expected to be next when
// this was adopted provisionally; the owner picked M9 instead, so what this
// flag bought (+0.095 buffer against a target I5 may show is unreachable)
// no longer justifies what it cost (+26 points of finishes outside band).
// The mechanism itself is not retracted — only the default.
export const HP_FROM_KILLS = false;

// GUESS — same cadence as KILLS_PER_XP (2) on purpose: reuse the pacing
// that already exists rather than introduce a second rhythm to reason
// about.
export const HP_GRANT_PER_KILLS = 2;

// GUESS — measured, and the target is NOT reached; ships anyway as the best
// point found. A rate sweep (0.125 to 0.5 hp/kill, i.e. HP_GRANT_PER_KILLS
// 8 down to 2 at this AMOUNT) found no point where buffer approaches the
// ~1.16/floor target without the real bot's clear rate leaving its band —
// at this shipped rate buffer moves 0.846 -> 0.910/floor (real, z~2.1, but
// still FALLING) while clear rate nearly doubles, 30.7% -> 56.7% (n=150,
// paired). Smaller rates (tried down to 0.125) protect clear rate only
// a little and buy back no buffer distinguishable from zero effect. Full
// bracket in docs/backlog.md M6 result. Shipped here because it is the
// only tested point with a statistically real buffer effect, not because
// it satisfies the item's own acceptance criteria — it does not, and that
// shortfall needs an owner decision, not a bigger constant.
export const HP_GRANT_AMOUNT = 1;

// ***** regeneration ***** //

// REMOVED by owner decision: there is no PASSIVE (time-based) regeneration.
//
// Rogule gave +1 hp every 100 turns, uncapped, and monsters are motionless
// outside their chase radius — so a bot that maximises winning simply camps
// somewhere cold and heals to full before every fight. We first tried a cap
// (spec §13.1); deleting it outright is simpler and leaves nothing to
// exploit. Hp is renewable only by ACTING: drinking a potion, or killing
// (HP_FROM_KILLS above) — never by waiting.

// ***** combat ***** //

export const HIT_CHANCE = 5 / 6;         // FAITHFUL engine.cljs:257

// Divergence, off by default. How a weapon helps.
//
//   false (faithful)  roll is 0..xp-1 and the weapon is added afterwards,
//                     so it raises the FLOOR. Each point of weapon is worth
//                     a full point of expected damage, and an armed hero
//                     stops being able to roll low at all.
//   true              the weapon enlarges the die, 0..xp-1+weapons. The
//                     floor stays at zero, so even a well-armed hero still
//                     whiffs, and each point is worth HALF a point of
//                     expected damage.
//
// The halving is the point: gear is the resource that runs away over a
// ten-floor descent, and this is the cheapest way to blunt it without
// capping what can be carried.
// ON by owner decision: a weapon always widens the range, never raises the
// floor. The hero can still whiff however well armed, and each point of
// weapon is worth half what a flat bonus would be.
export const WEAPONS_WIDEN_ROLL = true;

// ***** monsters ***** //

// xp is both the damage stat and the number drawn above the head.
//
// M18 — docs/backlog.md. `rat` was `activation 3, xp 1, hp 2`: xp 1 means
// the damage roll is `0..0`, exactly zero, so it could never land a blow —
// not a weak creature, a non-creature. Both raised, FAITHFUL divergence,
// docs/rogule-spec.md §13.11 — xp to 2 so it can hit, activation to 8 so
// it chases. hp stays 2. Kept strictly below `bat` (xp 2, activation 10,
// hp 3) on two of three so the two rows do not become interchangeable.
export const MONSTER_TABLE = [
  { name: 'rat',     emoji: '🐀', activation: 8,  xp: 2,  hp: 2 },
  { name: 'bat',     emoji: '🦇', activation: 10, xp: 2,  hp: 3 },
  { name: 'ghost',   emoji: '👻', activation: 10, xp: 3,  hp: 3 },
  { name: 'boar',    emoji: '🐗', activation: 15, xp: 3,  hp: 4 },
  { name: 'wolf',    emoji: '🐺', activation: 20, xp: 4,  hp: 5 },
  { name: 'ogre',    emoji: '👹', activation: 10, xp: 4,  hp: 7 },
  { name: 'zombie',  emoji: '🧟', activation: 5,  xp: 5,  hp: 9 },
  { name: 'vampire', emoji: '🧛', activation: 15, xp: 6,  hp: 8 },
  { name: 'genie',   emoji: '🧞', activation: 20, xp: 6,  hp: 10 },
  { name: 'dragon',  emoji: '🐉', activation: 10, xp: 8,  hp: 15 },
  { name: 't-rex',   emoji: '🦖', activation: 15, xp: 10, hp: 12 },
];

export const MONSTER_SKIP_CHANCE = 0.10;       // FAITHFUL engine.cljs:353

// Divergence, off by default. In Rogule a monster attacks by MOVING into
// the player, so standing beside one is only dangerous when it chooses to
// step in — and a monster with no route (blocked, or a pathfinding quirk)
// stands there harmlessly while adjacent.
//
// With this on, adjacency alone means being hit.
//
// MEASURED: it changes almost nothing. Over 50 floors the two rules gave
// byte-identical results. An adjacent monster is two path steps from the
// player, which is under every activation in the table (the smallest is 3),
// so under the faithful rule it already walks into the player every turn.
// Adjacency ALREADY means being attacked. Kept as a switch because the
// equivalence is worth being able to re-check, not because it does anything.
export const MONSTERS_ATTACK_WHEN_ADJACENT = false;
export const MONSTER_DROP_CHANCE = 0.50;       // FAITHFUL generator.cljs:275
export const MONSTER_DIFFICULTY_SCALE = 0.75;  // FAITHFUL generator.cljs:262

// Offset from the difficulty index -> pick weight. FAITHFUL generator.cljs:267,
// except that we SUM weights when two offsets clamp onto the same index.
// The original overwrites instead, which makes the intended monster rarer
// than its neighbour at the ends of the table (spec quirk 9.2).
export const MONSTER_WEIGHTS = [
  [0, 6], [1, 2], [-1, 2], [2, 1], [-2, 1],
];

// ***** M3 — an out-of-depth tail, docs/backlog.md M3 ("the gap M7 left") ***** //
// The per-floor ceiling (`difficultyScale` in spawn.js) never reaches the
// table's true top within the descent — `saturatedAt` on the M7-adopted
// ramp stays under 1.0 through floor 10 — so the strongest possible blow is
// frozen well below `t-rex`, and M7 raised lethality by ATTRITION (more
// creatures acting together) rather than by a bigger single hit. This is a
// RARE, INDEPENDENT roll — separate from the per-cluster tier draw — that
// can reach the table's true top regardless of local depth.
//
// ON. Archived once as a measured negative, un-archived and adopted after
// M24 — and the archiving was a MEASUREMENT error, not a design one:
//
//   - It was judged by CV. CV was what everything was judged by at the
//     time, but this item exists to shrink the REACTION WINDOW, which is
//     spike, not variance. Worse, an out-of-depth tail pushes CV the wrong
//     way BY CONSTRUCTION — its chance grows with depth, so it fires where
//     cost is already highest, raising the deep mean and lowering sd/mean
//     even as it raises sd. It could never have passed that test.
//   - The spike reading that failed it was p95/p99 pooled over EVERY turn
//     including walking. I7 showed that was dilution.
//   - It had no room to work: the ±2 spread made above-tier creatures
//     ROUTINE (wolf 17%, ogre 8% of draws), so a deliberate 8% tail was
//     invisible against a 25% background. M24 clamped that spread and made
//     this the only source of an above-tier creature on floors 2-9.
//
// Re-measured on PEAK, denominator-free (worst single turn per run), 240
// paired descents per arm: share of runs taking a >=7 blow went 0.4% ->
// 7.5% (z=4.05), >=8 went 0/240 -> 4.2% (z=3.23). Against a 10 hp hero
// that is 70-80% of the bar in one turn. The effect is confined to the far
// tail — the >=4 threshold does NOT move (z=1.21) — which is exactly what
// "a rare shock, not a routine one" is supposed to look like.
export const OUT_OF_DEPTH_TAIL = true;

// GUESS — zero on floor 1 by design: nothing is "out of depth" yet at the
// very top of the dungeon. Grows with depth and stays capped well under
// certainty, because this is a TAIL — the median floor must never feel it,
// only the rare one. `PLAYER_HP` is 10 with no regeneration and damage is
// `0..xp-1`, so a `t-rex` (xp 10) can take nearly a full health bar in one
// blow — the cap keeps that a rare shock, not a routine one.
//
// STILL GUESSES, and deliberately left as shipped. `PER_LEVEL` has never
// been swept; the plan was to sweep it if the peak did not move at these
// values, and the peak moved decisively (see OUT_OF_DEPTH_TAIL above), so
// there was nothing to buy. `CAP` was swept once and found not to move CV
// — that sweep says nothing here, since CV is not this item's test and
// never should have been.
//
// If a later item does sweep `PER_LEVEL`, note the shape it runs into:
// `CAP` binds from floor 8 at the shipped 0.02 (chance is
// `min(0.15, 0.02 x floorIndex)`), so raising `PER_LEVEL` alone only moves
// the SHALLOW floors and leaves 8-10 untouched. The two have to move
// together to change the deep end.
export const OUT_OF_DEPTH_CHANCE_BASE = 0;
export const OUT_OF_DEPTH_CHANCE_PER_LEVEL = 0.02;
export const OUT_OF_DEPTH_CHANCE_CAP = 0.15;

// ***** M13 — the tier floor rises with depth, docs/backlog.md M13 ***** //
// `difficultyScale` (above) is a CEILING — position within the map still
// puts the tier anywhere from 0 up to it, so a tile near the entrance rolls
// a rat on floor 10 exactly as often as on floor 1. A rat is scenery, not a
// threat: xp 1 means its damage roll is `0..0`, and `threat.js`/`duelCost`
// already treat it as zero. Structural, not tunable by feel: no flag, on by
// construction, verified by a dedicated test (docs/backlog.md batch note).
//
// GUESS — zero on floor 1 (the entrance stays a rat's territory), rising
// toward at most HALF the floor's own ceiling index, so there is always
// room left between floor and ceiling for position to still matter.
export const TIER_FLOOR_SHARE_BASE = 0;
export const TIER_FLOOR_SHARE_PER_LEVEL = 0.08;
export const TIER_FLOOR_SHARE_CAP = 0.5;

// ***** M24 — the ceiling is a centre, not a cap, docs/backlog.md M24 ***** //
// `difficultyScale` sets a CENTRE index — `MONSTER_WEIGHTS`'s own ±2 spread
// (spec quirk 9.2) then walks freely above it, so floor 1's centre index 3
// still rolls wolf (index 4, 17% of draws) and ogre (index 5, 8%) — three
// quarters of an unarmed 10 hp hero in one creature. M13 already fixed this
// from below; nobody fixed it from above. Structural, no flag, mirrors M13
// exactly, including its mid-build lesson: clamp the DRAWN SLOT, not the
// centre — clamping the centre alone does nothing, because the spread still
// reaches past it.
//
// GUESS — a SHARE of the spread's own maximum reach (±2, from
// MONSTER_WEIGHTS) allowed above the ceiling index. Zero on floor 1 (no
// slack at all — the ceiling is a hard cap there), rising toward at most
// HALF that reach, so even at floor 10 the top tier is trimmed back by one
// index rather than fully released. Same growth rate as M13's floor, for
// the same reason: symmetric treatment of a symmetric problem.
export const TIER_CEILING_SHARE_BASE = 0;
export const TIER_CEILING_SHARE_PER_LEVEL = 0.08;
export const TIER_CEILING_SHARE_CAP = 0.5;

// ***** M15 — loot rooms have a guard, docs/backlog.md M15 ***** //
// GUESS — "a short radius", per the item's own wording, swept 4/6/8/10/12
// against measured guard coverage. 4 left floor 1 at 39% and floor 3 at
// 46% — nowhere near "high". 8 is the point deep floors (7, 10) reach ~99%
// without going so wide "short" stops meaning anything; shallow floors
// still fall short at 8 (floor 1 ~56%, floor 3 ~64%) for a DIFFERENT
// reason radius cannot fix — only 2-3 creatures against 6 flat chests,
// and this item's own budget is "reuse placement, do not add" (M12's is
// the count to spend). `SIDE_CHEST_BIAS` already puts most chests in side
// rooms, which the ordinary placement loop already guards; this constant
// is what closes the gap on the SPINE, where nothing else guarantees a
// creature is nearby.
export const CHEST_GUARD_RADIUS = 8;

// ***** items ***** //

// Pick weight is 1/value, so a HIGH value means a RARE item.
// dmg / armour / heal are absent when the item has no effect.
//
// `armour` is a SECOND BAR that soaks damage before hp does (spec §13.2).
// Max hp never moves; what a shield buys is a buffer, and the buffer is
// spent. Two things follow, and both matter:
//
//   - it is consumable, so shields are a flow rather than a stock. Fifteen
//     of them across ten floors do not make a hero permanently tougher.
//   - max hp stays constant at PLAYER_HP, so every piece of code that
//     assumes that keeps being right.
//
// Rogule's original subtracted armour from each blow with a floor of zero,
// which made every point erase a whole tier of the monster table and then
// saturate — the reason a ten-floor descent never got harder.
// DIVERGENCE: Rogule's chestnut, mushroom and gem-stone are gone.
//
// They do nothing mechanically — they exist in the original as the score on
// the share card, which this game does not have. They were 53% of all loot,
// so their only real effect here was DILUTION: half the chests you opened
// gave nothing useful. Scarcity is now set deliberately by the dials rather
// than as a side effect of junk in the pool.
//
// `kind` groups the three that matter. The pool is balanced so each kind is
// equally likely overall, and within a kind the stronger item is rarer.
export const ITEM_TABLE = [
  { name: 'health', emoji: '🥃',  value: 2, heal: 3, kind: 'potion' },  // FAITHFUL engine.cljs:209
  { name: 'shield', emoji: '🛡️', value: 3, armour: 3, kind: 'armour' },
  { name: 'dagger', emoji: '🗡️', value: 3, dmg: 1, kind: 'weapon' },
  { name: 'axe',    emoji: '🪓',  value: 4, dmg: 2, kind: 'weapon' },
];

// ***** M26 — weapons come off creatures, docs/backlog.md M26 ***** //
// GUESS — the minimum MONSTER_TABLE index (0 = rat, 10 = t-rex) a killed
// creature has to reach before `axe` is even a candidate in its drop pool.
// A FILTER, not a tilt: below this index `itemWeights` removes `axe`
// entirely, so the owner's "axe nao dropa de criaturas fraca" is a
// mechanism check (the axe is provably absent) rather than a rare event
// that happens not to have shown up. `dagger` is unaffected and can still
// drop from anything down to a rat.
//
// Set at `wolf` (index 4): floor 1-3's own tier ceiling under M25 never
// reaches it (2, then 3), so those floors cannot hand out an axe by
// construction, independent of the roll. Floor 5's ceiling (4) just
// clears it. Needs a sweep if the measured cumulative-damage curve does
// not land where M26's supply arithmetic predicts.
export const WEAPON_AXE_MIN_TIER = 4;

// M19 — docs/backlog.md. Converts the chest nearest the spawn to a
// guaranteed `dagger` whenever the hero is carrying no weapon at all
// (spawn.js populate(), step 4b). Built "structural, no flag" — owner
// request afterwards to be able to turn it off and see what an unweighted
// opening actually costs. `true` reproduces the shipped M19 floor exactly;
// `false` removes the guarantee and leaves that chest's contents to the
// ordinary roll, same as every other chest.
export const GUARANTEE_FIRST_WEAPON = true;

// DIVERGENCE: Rogule dresses these as scenery — potted plant, rock, wood
// block — because there they are cover you kick over. Ours are the reward
// container of the map design, so they look like what they are. One row,
// but still a table: the pick still burns one RNG draw, so the streams
// stay aligned with runs recorded before the rename.
export const CHEST_TABLE = [
  { name: 'chest', emoji: '📦' },
];

export const POTION_HEAL = 3;               // FAITHFUL engine.cljs:209
export const CHEST_DIFFICULTY_SCALE = 0.9;  // FAITHFUL generator.cljs:238

// GUESS — our fix for spec quirk 9.3.
//   true  (ours)     chests FURTHER from the player are MORE likely to hold loot
//   false (original) chests further from the player are LESS likely
// Either way the probability sweeps the same range, just in opposite
// directions: from 10% at one end to 100% at the other.
export const CHEST_LOOT_RICHER_FAR = true;

// GUESS — depth buys BETTER loot, not merely more of it.
//
// With this off, a deep chest is likelier to hold something but what it
// holds is drawn from the same pool as one by the front door: risk bought
// quantity and never quality. On, the within-kind weight becomes
// `value^(2·depth − 1)`, so the axe is rare at the entrance, even money
// half way, and the common outcome at the shrine. See spawn.js itemWeights.
export const CHEST_QUALITY_BY_DEPTH = true;

// ***** M19 — pay for the harder opening with loot ***** //
// GUESS — added on top of `depth` before it reaches `itemWeights`'s
// `quality` argument, then clamped to 1. M17 raised floor 1 to ~5
// creatures and M18 made the bottom tier bite; under CHEST_QUALITY_BY_DEPTH
// alone, floor 1 is the poorest floor (quality only comes from position,
// and nowhere on floor 1 is far from the entrance) at the exact moment it
// became the most dangerous one. Fades as `EARLY_CHEST_QUALITY_BOOST /
// level` — strongest on floor 1, roughly a tenth of that by floor 10 —
// rather than a flat bonus, so it does not richen the floors that were
// never the problem. The cheapest of M19's three levers: one constant, no
// new mechanism, reusing the quality dial M12 already built.
export const EARLY_CHEST_QUALITY_BOOST = 0.5;

// ***** the cost model under-prices crowds ***** //
//
// GUESS — SUPERSEDED SHAPE, corrected once, keep reading.
//
// The first fix here was `campaignCost *= 1.32 * n^0.106` — multiplicative,
// no strength term. It was wrong on the strength axis by construction: a
// factor that only reads `n` cannot fall as strength rises, and re-measured
// with a tank hero (400 hp, so nothing is selected by dying) it does fall,
// robustly, across two independent measurements:
//
//     count 2 -> 28, strength fixed at 0.35 : raw ratio ~1.73, roughly FLAT
//     strength 0.5 -> 0.8, count fixed at 8  : raw ratio 1.48 -> 1.22, FALLS
//
// That is exactly the shape the original diagnosis called for and the first
// fix did not implement: real damage is modelled cost PLUS a roughly fixed
// overhead, not modelled cost TIMES a count-only factor. An overhead that
// does not grow with strength shrinks as a fraction of a bare cost that
// DOES grow with strength (bare cost is superlinear in strength — see the
// exponent note under Strength ramp), which produces exactly the falling
// ratio measured.
//
//     campaignCost += CROWD_COST_OVERHEAD * Σ expectedDamage(monster.xp, 0)
//
// Applied to campaignCost ONLY, never to duelCost. The one-on-one model is
// right; the sum is what is wrong.
//
// HONEST LIMIT: this is a large improvement, not a perfect fit. A weighted
// regression against the fitted constant still shows residual structure
// (z ≈ 2.2 vs count, z ≈ -2.8 vs strength on the fitting data) — smaller by
// roughly an order of magnitude than the multiplicative form's error, but
// not zero. One constant is what the CPU budget (this runs inside the bot's
// decision loop) and the measurement noise both support; chasing the last
// bit of structure would need either a second term or far more seeds than
// fit in one sitting.
export const CROWD_COST_OVERHEAD = 0.75;

// ***** floor spread: making deep floors lotteries ***** //
//
// GUESS — how wide the whole floor's shared roll is, by depth:
//
//     sigma(N) = min(CAP, BASE + PER_LEVEL × (N − 1))
//
// Difficulty grows by creature count, and a sum of N independent draws
// converges on its mean — CV = CV_c / √N. Measured over 150 seeds a floor,
// CV × √N came out flat at ~1.2 from floor 1 to floor 10, which is the law
// holding exactly. So the deeper the floor, the more PREDICTABLE it is, and
// the climax of a run lands where the variance is lowest. The player decides
// nothing here, so surprise is the only tension there is.
//
// Nothing independent can fix that: widening the per-creature spread, or
// giving each creature a chance of being huge, both leave the √N underneath.
// One roll shared by the WHOLE floor does, because then cost is N·μ(F) and
// the CV is the spread of F with no N in it at all.
//
// On the count rather than on strength, because cost is linear in count and
// convex in tier — so a mean-1 multiplier on the count cannot move the
// centre, which is the constraint that matters most here.
export const FLOOR_SPREAD_BASE = 0;
export const FLOOR_SPREAD_PER_LEVEL = 0.09;
export const FLOOR_SPREAD_CAP = 0.9;

// ***** map design: the spine and its detours ***** //
//
// docs/map-design.md. The floor should offer a choice: a short mandatory
// route holding most of the threat, and side rooms that can be skipped,
// holding fewer but nastier creatures and better chests.

// GUESS — share of a floor's THREAT MASS placed on the mandatory route.
// Mass rather than headcount, because cost tracks hp × (xp − 1): a floor
// can put 70% of its bodies on the spine and still hide the dangerous half
// in a side room.
export const SPINE_THREAT_SHARE = 0.7;

// ***** M23 — a distant shrine, not the furthest possible one ***** //
// How close to the hero's own furthest reachable room still counts as
// "distant" for the shrine. M20 put the shrine at the single longest
// room-pair on the map — maximising the path — but a room is spine
// whenever the mandatory path crosses it, so maximising the path maximises
// spine share directly: the same quantity measured twice. That pushed
// spine share to 0.93-0.97 against the 0.95 ceiling `SPINE_THREAT_SHARE`
// above is calibrated against. This is the tail, not the extreme: any room
// within this share of the furthest one reachable is a candidate, and one
// is drawn at random — still genuinely far, just not always THE one
// farthest point on the map. `bestPair.b` (M20's own choice) is always
// exactly at 100% of the tail, so 1.0 reproduces M20 exactly.
//
// Swept 0.6 / 0.65 / 0.7 / 0.75 / 0.8 / 0.9 on floor 5, hero-shrine path
// length, n=3000/value: 0.6 landed at 29.4, statistically flat against the
// pre-M20 baseline of 28.6 (a difference too small to trust — the exact
// failure mode the item warned against, the constant doing nothing). 0.7
// reached 30.5, clearly below M20's 31.5, but pushed floor 6 spine share
// to 0.95+ against the two spine-share tests M20 left failing, which this
// item has to bring back to green WITHOUT editing them. 0.65 clears both:
// spine share back in [0.6, 0.95] at every floor the split applies to, and
// path length lands at 29.9 — ~4.7 sigma above the pre-M20 baseline and
// ~5.8 sigma below M20's, genuinely between the two rather than pinned to
// either end.
export const SHRINE_DISTANCE_SHARE = 0.65;

// GUESS — a side room is treated as if it sat this much deeper than it is.
//
// ONE constant drives both halves of the bargain, which is why it is the
// whole of the risk/reward design rather than a tweak to it: depth is what
// picks the monster tier AND what sets chest quality, so raising it makes a
// detour more dangerous and better paid by the same number. Raise it for a
// sharper gamble, drop it to zero to make side rooms ordinary.
export const SIDE_ROOM_DEPTH_BONUS = 0.35;

// GUESS — a creature in a side room only wakes within this many tiles,
// however far its table entry would normally reach. 99 means no cap.
//
// OFF, and this is a measured negative. The hypothesis was good: activation
// runs to 20 in the table and the strongest creatures have the longest
// reach, so the nastiest side rooms should have been the ones grabbing the
// bot from across the floor while safe rooms never woke. Capping it to 4
// made the inversion WORSE, not better — the bot opened 68% of unfavourable
// rooms against 54% of favourable, against 53%/45% uncapped.
//
// Kept as a dial because "a guard guards" is still a defensible rule and the
// negative result is worth being able to re-check. See docs/map-design.md
// for what the cause actually turned out to be.
export const SIDE_ACTIVATION_CAP = 99;

// GUESS — floors with fewer creatures than this put everything on the
// spine. The mass split is too coarse to honour below it: on a
// two-creature floor one side monster is already half the mass, which
// measured 68% and 63% spine on floors 1 and 3 against a 70% target. A
// single creature behind a detour is not a gamble either.
export const MIN_ROSTER_FOR_SIDE = 4;

// GUESS — how much likelier a chest is to land in a side room than in a
// spine room. A weight, not a quota: a detour nobody is paid to make is not
// a choice, it is scenery — but a map with no side rooms must still place
// every chest.
export const SIDE_CHEST_BIAS = 3;

// ***** bot ***** //

export const BOT_KNOWS_MONSTER_COUNT = true;  // bot-strategy 4.1

// GUESS — how much hp one step of walking is worth, which is the practical
// form of the lambda dial in bot-strategy 0. At 0.01 the bot will walk 100
// extra steps to save 1 hp. Raise it for a hasty bot, lower it for a
// patient one.
export const STEP_COST_IN_HP = 0.01;

// GUESS — a new target must beat the current one by this factor before the
// bot switches. Without it, two near-equal targets make it dither on the
// spot instead of committing to either. Raised from 1.15 (only needed 15%
// better to switch, not much stickiness) — see docs/balance.md for the
// caveat this comes with: `bot.js`'s check only applies to `monster`
// targets, chest/item goals have no hysteresis at all.
export const GOAL_STICKINESS = 1.4;

// GUESS — stand-in stats for a monster the bot has not met yet. It knows
// how many are still unaccounted for (BOT_KNOWS_MONSTER_COUNT) but not what
// they are, and gear has to be priced against them too. These are the
// median of MONSTER_TABLE, which happens to be the ogre.
export const UNKNOWN_MONSTER_ESTIMATE = { xp: 4, hp: 7 };

// GUESS — measured at 0.60 over 150 generated maps. What the bot assumes
// when deciding whether opening a chest is worth the two turns.
export const CHEST_LOOT_CHANCE = 0.60;

// GUESS — what share of the REMAINING descent the bot prices gear against.
//
// A sword taken on floor 3 is swung on floors 4 to 10, so valuing it against
// floor 3 alone leaves the bot blind to the long game the map design is
// built around. But counting all seven floors ahead at face value is just as
// wrong in the other direction: it assumes the hero survives to swing it,
// and only about 45% of dungeons are cleared.
//
// 0.5 is that clear rate rounded, used as a plain discount rather than a
// modelled survival curve — a single honest constant beats a fake model.
// At 0 the bot is myopic, which is the behaviour every measurement before
// this was taken with.
export const LOOT_CAMPAIGN_HORIZON = 0.5;

// GUESS — how fast a monster's menace fades with distance. The hp it is
// expected to deal is multiplied by this per tile away, so at 0.5 a wolf
// two tiles off is charged a quarter of its bite. Lower makes the bot
// bolder about squeezing past; higher makes it give monsters a wide berth.
export const DANGER_FALLOFF = 0.5;

// GUESS — how much an open tile multiplies the danger already on it. A tile
// with four ways in is charged (1 + 3 * this) times its menace; a dead end
// is charged plain. This is what makes the bot SEEK corridors when hunted
// rather than merely tolerate them (bot-strategy §2).
export const EXPOSURE_WEIGHT = 0.5;

// GUESS — how close a hunter must be before the bot stops walking out to
// meet it and lets it come. Waiting costs no tempo: monsters move after the
// player, so whoever closes the last tile, the player still strikes first.
export const HOLD_RANGE = 5;

// GUESS — extra hp charged for standing where two or more awake monsters
// could reach the bot at once. This is rule R2 (bot-strategy §2) as a
// strong price rather than a ban: a ban can leave a goal unreachable and
// needs fallback machinery, while a price this size is avoided whenever
// there is any alternative. The hard version belongs at action-selection
// time, with the tactical search.
export const CROWD_PENALTY = 6;

// GUESS — how many turns ahead the tactical search simulates, and how close
// a monster has to be before it bothers. Away from monsters the route is
// already the answer and searching is wasted work; nearby it decides who
// lands the first blow and whether the bot reaches the corridor in time.
// Depth ONE, not three. At depth 1 this is what the original plan asked
// for: simulate the monsters' reply to the step about to be taken, and
// refuse the step that leaves the bot between two of them. Deeper searches
// start optimising for not being hit at all, which they achieve by never
// closing — see bot-strategy §4.4 for the measurements.
//
// Range is tight: it only earns its keep in contact. Further out the
// danger-priced route already gives the same answer for far less.
export const TACTICAL_DEPTH = 1;
export const TACTICAL_RANGE = 4;

// GUESS — how much better, in hp, an alternative must look before the bot
// abandons the step its plan wanted. The tactical search only holds a veto
// (see src/bot/tactics.js); given a free choice it dithers forever, because
// backing away always beats walking into a fight it is required to have.
export const TACTICAL_OVERRIDE_MARGIN = 0.5;

// GUESS — hp charged for undoing the step just taken.
//
// Without it the veto has no memory and two-cycles forever: the plan says
// "attack", the veto refuses and steps aside, next turn the plan says
// "go back", the veto agrees, and the bot ping-pongs between two tiles
// until the turn limit. Seen in about one run in nine.
//
// LOCATED, bot-strategy §4.5: an extended trace (goal identity + which
// layer actually chose the returned action) over two independent seed
// families puts 61-64% of reversal episodes and turns on the TACTICAL
// VETO overriding a STABLE goal, not on goal selection flipping (~7-11%).
// A third, unnamed locus — the ROUTE to a stable goal alternating on its
// own, veto never even consulted — accounts for another 14-21%, likely
// fog-of-war revealing map on each step and flipping a tied-cost route.
//
// WAS 0, "measured, does not fix what it targets". That verdict was wrong,
// and the reason is worth keeping: the old sweep read 0.238 -> 0.205 on the
// POOLED reversal RATE, which B3 showed is mostly a measurement of how long
// a run is, not how much it dithers. A run that ends early scores well by
// dithering less in absolute terms. Judged on the DISTRIBUTION instead —
// turns spent inside reversal episodes — it is the single biggest win
// available, and it was never failing.
//
// RAISED to 6 on B3's reading (docs/backlog.md B3), n=60, on top of B3's
// goal-layer fix, two independent seed families:
//
//                        seeds 800000      seeds 910000
//                        0        6        0        6
//   turns in episodes    21.4%    9.2%     25.5%    7.5%
//   pooled rate          23.6%   16.0%     27.2%   14.8%
//   median run's share    9.0%    5.6%      5.5%    2.8%
//   veto-layer episodes    135       0       150       0
//   actions per run        509     589       428     376
//
// The two families move run LENGTH in opposite directions (one 16% longer,
// one 12% shorter) and agree on the distribution anyway, which is what
// makes it a dithering result rather than a length artefact. Veto-layer
// episodes go to exactly zero on both — a mechanism check, not a rate.
//
// WATCH: median depth went 4 -> 3 on the confirmation family, against
// 4 -> 4 on the primary. Finishes were unchanged on both (6.7%/6.7% and
// 0%/0%), so the cost the old sweep reported did not reproduce — but that
// one wobble is the thing to hold against this if depth slips later.
export const REVERSAL_PENALTY = 6;

// GUESS — a fight is worth starting only while its EXPECTED cost stays
// under this share of current hp. Expected is an average: a duel costing
// exactly all the hp there is loses about half the time, so the bot needs
// headroom rather than a break-even test.
export const DUEL_SAFETY_MARGIN = 0.7;
