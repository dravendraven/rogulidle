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

export const COVER_DIFFICULTY_SCALE = 0.9;  // FAITHFUL generator.cljs:238

// GUESS — our fix for spec quirk 9.3.
//   true  (ours)     covers FURTHER from the player are MORE likely to hold loot
//   false (original) covers further from the player are LESS likely
// Either way the probability sweeps the same range, just in opposite
// directions: from 10% at one end to 100% at the other.
export const COVER_LOOT_RICHER_FAR = true;

// ***** bot (unused until P3) ***** //

export const BOT_KNOWS_MONSTER_COUNT = true;  // bot-strategy 4.1
