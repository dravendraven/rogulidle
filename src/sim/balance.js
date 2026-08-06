// Every tunable number in the game. Mirrors docs/balance.md — change the doc
// first, then this file. No other file in src/sim/ may hardcode these.
//
// FAITHFUL  = copied from the original Rogule source, don't touch casually.
// GUESS     = ours, and what P4 tunes.

// ***** world ***** //

export const MAP_SIZE = 32;              // FAITHFUL ui.cljs:26
export const CORRIDOR_LENGTH = [1, 5];   // FAITHFUL generator.cljs:146
export const VISIBLE_DIST = 9;           // FAITHFUL ui.cljs:27
export const CLEAR_DIST = 7;             // FAITHFUL ui.cljs:29 (cosmetic)
export const COVER_COUNT = 15;           // FAITHFUL generator.cljs:326
export const MONSTER_COUNT = 5;          // FAITHFUL generator.cljs:326

// ***** player ***** //

export const PLAYER_HP = 10;             // FAITHFUL generator.cljs:216
export const PLAYER_XP = 3;              // FAITHFUL generator.cljs:26
export const KILLS_PER_XP = 2;           // FAITHFUL engine.cljs:272

// ***** regeneration ***** //

export const REJUVINATION_RATE = 100;    // FAITHFUL engine.cljs:27
export const REGEN_CAP_FRACTION = 0.20;  // GUESS — our divergence, spec 13.1

// ***** combat ***** //

export const HIT_CHANCE = 5 / 6;         // FAITHFUL engine.cljs:257

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
export const ITEM_TABLE = [
  { name: 'chestnut',  emoji: '🌰',  value: 1 },
  { name: 'mushroom',  emoji: '🍄',  value: 2 },
  { name: 'health',    emoji: '🥃',  value: 2, heal: 3 },   // FAITHFUL engine.cljs:209
  { name: 'shield',    emoji: '🛡️', value: 3, armour: 1 },
  { name: 'dagger',    emoji: '🗡️', value: 3, dmg: 1 },
  { name: 'axe',       emoji: '🪓',  value: 4, dmg: 2 },
  { name: 'gem-stone', emoji: '💎',  value: 8 },
];

export const COVER_TABLE = [
  { name: 'potted plant', emoji: '🪴' },
  { name: 'rock',         emoji: '🪨' },
  { name: 'wood block',   emoji: '🪵' },
];

export const POTION_HEAL = 3;               // FAITHFUL engine.cljs:209
export const COVER_DIFFICULTY_SCALE = 0.9;  // FAITHFUL generator.cljs:238

// GUESS — our fix for spec quirk 9.3.
//   true  (ours)     covers FURTHER from the player are MORE likely to hold loot
//   false (original) covers further from the player are LESS likely
// Either way the probability sweeps the same range, just in opposite
// directions: from 10% at one end to 100% at the other.
export const COVER_LOOT_RICHER_FAR = true;

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
// when deciding whether opening a cover is worth the two turns.
export const COVER_LOOT_CHANCE = 0.60;

// GUESS — how fast a monster's menace fades with distance. The hp it is
// expected to deal is multiplied by this per tile away, so at 0.5 a wolf
// two tiles off is charged a quarter of its bite. Lower makes the bot
// bolder about squeezing past; higher makes it give monsters a wide berth.
export const DANGER_FALLOFF = 0.5;

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
// Range is deliberately tight: the search costs about 5ms a turn and only
// earns it in contact. Beyond a few tiles the danger-priced route already
// gives the same answer for a fraction of the price.
export const TACTICAL_DEPTH = 3;
export const TACTICAL_RANGE = 4;

// GUESS — how much better, in hp, an alternative must look before the bot
// abandons the step its plan wanted. The tactical search only holds a veto
// (see src/bot/tactics.js); given a free choice it dithers forever, because
// backing away always beats walking into a fight it is required to have.
export const TACTICAL_OVERRIDE_MARGIN = 0.5;

// GUESS — a fight is worth starting only while its EXPECTED cost stays
// under this share of current hp. Expected is an average: a duel costing
// exactly all the hp there is loses about half the time, so the bot needs
// headroom rather than a break-even test.
export const DUEL_SAFETY_MARGIN = 0.7;
