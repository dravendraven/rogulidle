// Every tunable number in the game. Mirrors docs/balance.md — change the doc
// first, then this file. No other file in src/sim/ may hardcode these.
//
// FAITHFUL  = copied from the original Rogule source, don't touch casually.
// GUESS     = ours, and what P4 tunes.

// ***** world ***** //

export const MAP_SIZE = 32;              // FAITHFUL ui.cljs:26
export const CORRIDOR_LENGTH = [1, 5];   // FAITHFUL generator.cljs:146

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

// ***** regeneration ***** //

// REMOVED by owner decision: there is no passive regeneration at all.
//
// Rogule gave +1 hp every 100 turns, uncapped, and monsters are motionless
// outside their chase radius — so a bot that maximises winning simply camps
// somewhere cold and heals to full before every fight. We first tried a cap
// (spec §13.1); deleting it outright is simpler and leaves nothing to
// exploit. Hp is now strictly non-renewable except by drinking a potion.

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
export const MONSTER_TABLE = [
  { name: 'rat',     emoji: '🐀', activation: 3,  xp: 1,  hp: 2 },
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
// spot instead of committing to either.
export const GOAL_STICKINESS = 1.15;

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
// DEFAULT 0 — it does NOT fix it. Sweeping 0 / 1.5 / 6 moved the reversal
// rate only 0.238 -> 0.205 and cost a few points of win rate. The two-cycle
// is a symptom and the cause is still unidentified; left as a dial so the
// next attempt starts from measured ground rather than from a hunch.
export const REVERSAL_PENALTY = 0;

// GUESS — a fight is worth starting only while its EXPECTED cost stays
// under this share of current hp. Expected is an average: a duel costing
// exactly all the hp there is loses about half the time, so the bot needs
// headroom rather than a break-even test.
export const DUEL_SAFETY_MARGIN = 0.7;
