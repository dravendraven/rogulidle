// Every tunable number in the GAME. Mirrors docs/balance.md — change the doc
// row and this file in the same commit. No other file in src/sim/ may
// hardcode these. The BOT's numbers live in src/bot/config.js, not here.
//
// FAITHFUL  = copied from the original Rogule source, don't touch casually.
// GUESS     = ours, and what tuning moves.
//
// Rules that used to be flags here — xp from kills, hp from kills, passive
// regeneration, attack-on-adjacency, the guaranteed first weapon, flat
// weapon bonuses, chest orientation — are DECIDED, not configurable. What
// each alternative measured is in docs/project/decisions.md; the code no
// longer carries the losing branch.

// ***** world ***** //

export const MAP_SIZE = 32;              // FAITHFUL ui.cljs:26

// DIVERGENCE — shortened so the floor reads as rooms with corridors between
// them, not corridors with rooms attached (was [1, 5]).
export const CORRIDOR_LENGTH = [1, 3];

// GUESS — raised from ROT's defaults for the same reason CORRIDOR_LENGTH
// shrank: bigger rooms, shorter hallways.
export const ROOM_WIDTH = [5, 9];
export const ROOM_HEIGHT = [4, 7];

// GUESS — how much of the grid the digger hollows out. Lower means fewer,
// more separate rooms — the map design needs a MANDATORY path to exist, and
// at ROT's default 0.2 there are usually several equivalent ways through.
// This is the branching dial's foundation: how much route there is at all.
export const MAP_DUG_PERCENTAGE = 0.15;

export const VISIBLE_DIST = 9;           // FAITHFUL ui.cljs:27
export const CLEAR_DIST = 7;             // FAITHFUL ui.cljs:29 (cosmetic)

// FAITHFUL single-floor defaults (generator.cljs:326) — what populate()
// uses when no floor plan is given. Real runs get counts from floorParams.
export const CHEST_COUNT = 15;
export const MONSTER_COUNT = 5;

// ***** player ***** //

export const PLAYER_HP = 10;             // FAITHFUL generator.cljs:216
export const PLAYER_XP = 3;              // FAITHFUL generator.cljs:26

// What every run begins holding. Empty = the hero starts with nothing, and
// the opening is hard on purpose (owner decision, M41). To arm the hero,
// name items from ITEM_TABLE:  ITEM_TABLE.filter((i) => i.name === 'dagger')
export const STARTING_ITEMS = [];

// ***** combat ***** //

export const HIT_CHANCE = 5 / 6;         // FAITHFUL engine.cljs:257

// ***** monsters ***** //

// xp is both the damage stat and the number drawn above the head. The index
// is the TIER — rising strength. rat raised from the original's xp 1
// (damage roll 0..0, a non-creature) — divergence §13.11.
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
export const MONSTER_DROP_CHANCE = 0.50;       // FAITHFUL generator.cljs:275
export const MONSTER_DIFFICULTY_SCALE = 0.75;  // FAITHFUL generator.cljs:262

// Offset from the difficulty index -> pick weight. FAITHFUL generator.cljs:267,
// except that we SUM weights when two offsets clamp onto the same index
// (spec quirk 9.2). The ±2 reach of this table is what "slack" below is
// measured in.
export const MONSTER_WEIGHTS = [
  [0, 6], [1, 2], [-1, 2], [2, 1], [-2, 1],
];

// ***** the tier band — how much the average threat varies ***** //
//
// Each floor draws creatures from a BAND of the monster table. The centre
// comes from positional depth × the floor's strength ceiling; the band is
// then clamped:
//
//   floor  — the minimum tier rises with depth as a share of the floor's own
//            ceiling index, so a deep floor stops rolling scenery (a rat on
//            floor 10). Zero on floor 1; never exceeds the ceiling.
//   slack  — whole table rows the DRAWN slot may sit above the ceiling,
//            rising with depth: 0 on shallow floors, 1 from floor 8. Clamp
//            the drawn slot, never the centre — the ±2 spread reaches past
//            any clamped centre (measured mistake, twice).
//
// GUESS, both families.
export const TIER_FLOOR_PER_LEVEL = 0.08;
export const TIER_FLOOR_CAP = 0.5;
export const TIER_SLACK_PER_LEVEL = 0.08;
export const TIER_SLACK_CAP = 0.5;

// GUESS — whole table rows trimmed off floor 1's ceiling (level 0 only), so
// floor 1 costs clearly less than floor 2. An INTEGER on purpose: the old
// share dial produced identical cuts across its whole (0,1) range, so only
// 0 / 1 / 2 ever existed to choose between.
export const EARLY_TIER_CUT = 1;

// ***** the out-of-depth tail ***** //
//
// GUESS — a rare, independent roll that reskins one creature from the top of
// the table, regardless of local depth. Zero on floor 1, growing with depth,
// capped well under certainty: the median floor must never feel it. This is
// what keeps the outcome uncertain — and the return (floors 11-20) is this
// dial widened, not a new system.
export const OUT_OF_DEPTH_CHANCE_PER_LEVEL = 0.02;
export const OUT_OF_DEPTH_CHANCE_CAP = 0.15;

// ***** the floor's shared roll — how much the whole floor varies ***** //
//
// GUESS — one log-uniform multiplier on the creature COUNT, shared by the
// whole floor, widening with depth. Independent per-creature draws converge
// (CV falls as 1/sqrt N), which made the climax the most predictable floor;
// only a roll the whole floor shares escapes that law.
export const FLOOR_SPREAD_PER_LEVEL = 0.09;
export const FLOOR_SPREAD_CAP = 0.9;

// ***** items ***** //

// Pick weight is 1/value, so a HIGH value means a RARE item. `kind` groups
// them: chests hold armour and potions (exploring pays gear and sustain),
// creatures drop weapons (the only permanent power comes from killing).
// The original's junk collectibles are gone; scarcity is set by the dials
// in difficulty.js instead of by chestnuts.
export const ITEM_TABLE = [
  { name: 'health', emoji: '🥃',  value: 2, heal: 3, kind: 'potion' },  // FAITHFUL engine.cljs:209
  { name: 'shield', emoji: '🛡️', value: 3, armour: 3, kind: 'armour' },
  { name: 'dagger', emoji: '🗡️', value: 3, dmg: 1, kind: 'weapon' },
  // `dmgMin` raises the bottom of the damage die instead of its top: an axe
  // in hand never lands for zero. Worth twice a point of `dmg` in expected
  // damage (combat.js), which is what makes the axe read as the real weapon
  // upgrade rather than "a dagger and a half".
  { name: 'axe',    emoji: '🪓',  value: 4, dmg: 2, dmgMin: 1, kind: 'weapon' },
];

// GUESS — the minimum MONSTER_TABLE index a killed creature must reach
// before `axe` is even in its drop pool. A FILTER, not a tilt: below this
// the axe is provably absent, so weak floors cannot hand one out.
export const WEAPON_AXE_MIN_TIER = 4;

// One row, but still a table: the pick burns one RNG draw, so the streams
// stay aligned with runs recorded before the rename.
export const CHEST_TABLE = [
  { name: 'chest', emoji: '📦' },
];

// M46 — how often a chest holds anything, FLAT. One number, one gate, and
// it means exactly what it says: half of all chests hold something.
//
// It replaces two things at once. The positional roll
// (`1 - CHEST_DIFFICULTY_SCALE × (1 - depth)`, FAITHFUL generator.cljs:238,
// inverted here against spec quirk 9.3) made a chest by the entrance 10%
// full and one in the far corner 100% full; and the scarcity gate inside
// `itemWeights` emptied another quarter on top. The product was about 42%
// and nobody could read either half off the other.
//
// TWO REASONS, and the second is the one that decided it.
//
// The curve gets easier to steer: reward per floor is already flat
// (`CHESTS_PER_FLOOR`), difficulty already scales by floor, and now the two
// do not interfere. Fine tuning is the chest COUNT, not a probability
// hidden behind a path length.
//
// And the bot's belief becomes TRUE. `CHEST_VALUE_HP` (src/bot/config.js)
// is one number for every chest, and under the positional roll it was wrong
// about all of them — the one by the door was worth 0.3 hp, the one in the
// corner 3. A flat rate makes the single number exact, which is what the
// greed dial biases around.
//
// WHAT IT COSTS, stated rather than discovered later: `depth` was the only
// live reward channel a chest had, so `SIDE_ROOM_DEPTH_BONUS`'s reward roll
// now reaches nothing but `quality`, which is already inert for chests
// (one item per kind). The side room's reward half moves to
// `SIDE_CHEST_BIAS` — MORE chests rather than better ones — by owner
// decision.
export const CHEST_LOOT_CHANCE = 0.5;

// GUESS — floor 1 is the poorest floor under quality-by-depth (nowhere on it
// is far from the entrance) at the exact moment it is the most dangerous.
// Added to chest quality as BOOST / level, so it fades by the floors that
// were never the problem.
export const EARLY_CHEST_QUALITY_BOOST = 0.5;

// ***** map design: the spine and its detours ***** //
//
// docs/map-design.md. A short mandatory route holding most of the threat,
// plus side rooms that can be skipped — fewer but nastier creatures, better
// chests. These dials are the branching axis.

// GUESS — share of a floor's THREAT MASS placed on the mandatory route.
// Mass rather than headcount, because cost tracks hp × (xp − 1).
export const SPINE_THREAT_SHARE = 0.7;

// GUESS — how close to the hero's furthest reachable room still counts as
// "distant" for the shrine. 1.0 pins it to the single farthest room, which
// maximises spine share directly; lower widens the candidate pool.
export const SHRINE_DISTANCE_SHARE = 0.65;

// GUESS — a side room is treated as if it sat this much deeper than it is.
// ONE dial drives both halves of the gamble: depth picks the monster tier
// AND the chest quality, and each side room rolls the two INDEPENDENTLY —
// with one shared roll every detour offered the same ratio and there was no
// decision in any of them (measured).
export const SIDE_ROOM_DEPTH_BONUS = 0.35;

// GUESS — floors with fewer creatures than this put everything on the
// spine: on a two-creature floor one side monster is already half the mass,
// and a single creature behind a detour is not a gamble.
export const MIN_ROSTER_FOR_SIDE = 4;

// GUESS — how much likelier a chest is to land in a side room. A weight,
// not a quota: a map with no side rooms must still place every chest.
export const SIDE_CHEST_BIAS = 3;

// GUESS — every chest gets a creature within this radius, spine included.
// Loot is not free.
export const CHEST_GUARD_RADIUS = 8;

// ***** M43 — the vault ***** //
//
// docs/project/candidates.md. One AUTHORED room on one floor, against a
// stretch of floors that measured at the same risk as each other — which is
// the defect a dial cannot reach, since every dial moves all of them.

// GUESS — which floor carries it, 1-based. 0 turns the vault off entirely.
// Floor 4 rather than 3 for a reason with a number behind it: the typical
// hero wins the duel 41% of the time there against 24% a floor earlier, and
// WEAPON_AXE_MIN_TIER below is exactly floor 4's own ceiling, so the
// guaranteed axe is early rather than off-schedule.
export const VAULT_LEVEL = 4;

// GUESS — the vault's side in tiles. Above ROOM_HEIGHT's ceiling on
// purpose: no generated room can be 9 tall, so the shape alone says the
// room was placed rather than rolled. Measured, 9 fits on 99.5% of floors
// and 11 on 90% — the size is what buys the coverage.
export const VAULT_SIZE = 9;

// GUESS — what stands in it. Deliberately NOT a MONSTER_TABLE row: the
// table is a tier ladder that depth indexes into, and this creature is
// never drawn, never scaled and never reskinned. Putting it in the table
// would make it appear on deep floors by accident.
//
// hp 16 against xp 6 is the shape, and it was measured rather than guessed
// (docs/project/candidates.md M43, 4000 duels a row under the real combat
// rules). The typical floor-4 hero wins 41% of the time, a poor one 6% and
// a rich one 80% — a spread wide enough that the outcome says something
// about how the run went.
//
// MEAT, NOT BITE, and that is the design rather than a tuning accident. A
// t-rex (hp 12, xp 10) produces almost the same win rate and reads as a
// coin flip: bite 10 can take 9 of a full hero's 10 hp in one blow and
// settles the duel in three turns. At xp 6 the largest possible blow is 5,
// so it can never one-shot a hero at full health, and the fight runs about
// ten turns with the bar moving both ways. Watchability is the reason.
// V7b — `activation` 5, down from 12. At 12 the creature woke while the
// hero was still five tiles OUTSIDE the door, so entering was never a
// decision: it was a thing that had already happened. At 5 it wakes at
// three steps, which from two rows off the far wall means the hero has to
// come in and cross most of the room.
//
// It also changes what the room costs, not only when it starts: the bot's
// `guardCost` charges the whole duel against every chest within this many
// tiles, so the radius is what decides which chests are bought with the
// fight. At 5, the two by the door (9 tiles away) are free and the four at
// the back (3 to 4) are not.
//
// The price is real and was accepted knowingly: a smaller radius also
// makes the Butcher easier to escape, which weakens "a detour has to be
// able to cost the run" — the M36 half of why this room exists.
export const VAULT_BOSS = {
  name: 'butcher', emoji: '🐷', activation: 10, xp: 5, hp: 12, speed: 2,
};

// GUESS — what it always leaves behind, by name from ITEM_TABLE. The only
// guaranteed drop in the game. WEAPON_AXE_MIN_TIER is 4, which is exactly
// VAULT_LEVEL's own ceiling, so this pulls the axe forward by about two
// floors without putting it anywhere it could not already appear.
export const VAULT_BOSS_DROP = 'axe';

// GUESS — what the vault's chests hold, by ITEM_TABLE name, one per slot in
// the order vault.js lists them.
//
// EIGHT, AND THEY ARE THE FLOOR'S ONLY LOOT. The vault floor places no
// ordinary chests at all: its whole reward is in this room, behind this
// creature. That is what makes walking past the vault cost something —
// before it, skipping was free because the floor still paid six chests
// somewhere else, and the measured result was a room nobody needed.
//
// AUTHORED, NOT ROLLED, and the tension in that is real enough to write
// down. `map-design.md` asks the middle of the run to carry variance of
// REWARD, and a fixed payout carries none — so this pushes against a stated
// property. It is fixed anyway because a choice has to be INFORMED
// (objectives.md) and a constant payout is the most informed a bet can be,
// while the variance that actually matters is whether the hero collects any
// of it at all.
//
// Four shields and four potions is about +12 armour and +12 healing against
// a hero who reaches floor 4 holding roughly 4 armour — deliberately large,
// because it is now the entire floor's pay AND the price of a fight, not a
// bonus on top of one.
export const VAULT_CHEST_ITEMS = [
  'shield', 'health', 'shield',
  'health', 'health',
  'shield', 'health', 'shield',
];

// ***** time ***** //

// How many turns one TRAVERSAL may spend. Running out ends the traversal
// without completing, which ends the run (rules.md §8). The only brake on
// the shamble. Entered loose (at the measured p99 of wandering runs);
// tightening it is a value change with its own measurement.
export const TURN_BUDGET = 1500;
