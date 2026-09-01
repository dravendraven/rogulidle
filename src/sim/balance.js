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
//
// The MINIMUM is the dial; the span above it is the shape of the draw and
// stays fixed. Written as a derivation rather than a literal pair because
// the lab's sliders are scalar, and a pair would have needed a second UI
// shape to reach a number the model already carries.
export const CORRIDOR_MIN = 1;
const CORRIDOR_SPAN = 2;
export const corridorRange = (min = CORRIDOR_MIN) => [min, min + CORRIDOR_SPAN];
export const CORRIDOR_LENGTH = corridorRange();

// GUESS — how many times likelier the digger is to attach a ROOM than a
// corridor. 1 is ROT's own draw.
//
// Why this exists at all: ROT's Digger picks room-vs-corridor from a weight
// pair fixed in its constructor and never exposed as an option, so
// MAP_DUG_PERCENTAGE below scaled BOTH together — the only way to ask for
// more side rooms was to also ask for more corridor, which is the maze
// docs/map-design.md does not want. This is the second half of "the map's
// shape": dugPercentage says how much is dug, this says into what.
export const ROOM_BIAS = 1;

// GUESS — raised from ROT's defaults for the same reason CORRIDOR_LENGTH
// shrank: bigger rooms, shorter hallways.
export const ROOM_WIDTH = [5, 9];
export const ROOM_HEIGHT = [4, 7];

// GUESS — multiplies BOTH pairs above, so one number cuts the same dug
// area into more pieces or fewer. 1 is the shipped room.
//
// Why a multiplier and not four dials: the two pairs are one decision —
// how big a room is — and their four numbers were only ever moved
// together. A scale keeps the shape of the draw (a room is still wider
// than it is tall, still varies by the same proportion) and gives the lab
// ONE thing to drag.
//
// This is the dial that actually decides HOW MANY rooms a floor has.
// MAP_DUG_PERCENTAGE says how much is dug and ROOM_BIAS what shape it
// comes back in, but neither divides the result — measured, halving the
// room roughly doubles the count, which is more than both of the others
// together can do.
export const ROOM_SCALE = 1;

// A room narrower than this is a corridor with a label on it, and ROT will
// happily make one. Not a dial: it is the floor under the scale, not a
// preference about room size.
const ROOM_MIN_SIDE = 3;

export function roomRange(pair, scale = ROOM_SCALE) {
  return pair.map((n) => Math.max(ROOM_MIN_SIDE, Math.round(n * scale)));
}

// GUESS — rooms in the hub's ring, and how many rings. Only read by the
// hub layout (MAP_THEME index 5). The room SIZE is not a dial there: a
// ring is a packing problem, so layout-hub.js solves the size down from
// ROOM_WIDTH/HEIGHT until the geometry closes.
export const HUB_BRANCHES = 4;
export const HUB_RINGS = 1;

// GUESS — the ring layout's own two numbers (MAP_THEME index 4): rooms on
// the ring, and how many inward spur rooms (the side bets) hang off it.
// Room size is solved down from ROOM_WIDTH/HEIGHT the same way the hub
// does it.
export const RING_ROOMS = 8;
export const RING_SPURS = 3;
// GUESS — of the mass placed ON the routes, the short route's share. A new
// parameter because no existing one could carry it: SPINE_THREAT_SHARE
// divides route-vs-side and nothing divided route-vs-route — the axis did
// not exist before the second route did. Only read on two-route maps.
export const SHORT_ROUTE_MASS_SHARE = 0.7;

// M51 — the map THEME: which shape family draws the floor, as an index
// into MAP_THEME_LAYOUTS. THE ONE SELECTOR: the per-layout modulo dials it
// once shared the panel with (hubEvery, ringEvery) were deleted — three
// controls answering "which generator draws this floor" was the confusion
// the owner asked removed, and per-ANCHOR mapTheme (model.floors) already
// answers "which floors get which shape" better than any modulo could.
// 0 is "padrão", the shipped Digger game. The last entry is 'sorteio': a
// theme drawn per floor from the map's own stream. The catalogue exists to
// TEST identities before the final map design is chosen (decisions.md M50
// is why variety won over structure); nothing ships at any value but 0
// without the owner watching it first.
export const MAP_THEME = 0;
export const MAP_THEME_LAYOUTS = [
  null,        // 0 padrão — o Digger clássico, o jogo enviado
  'uniform',   // 1 cripta — salas regulares, corredores curtos, ordenado
  'rogue',     // 2 grade — 3×3 salas ligadas às vizinhas, loops de verdade
  'cave',      // 3 caverna — autômato celular, aberto e orgânico
  'ring',      // 4 anel — o ciclo de duas rotas do M50
  'hub',       // 5 central — sala do meio e braços
  'sorteio',   // 6 sorteio — um tema por andar, do stream do mapa
];

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

// WHAT A CREATURE OF THIS xp TYPICALLY HOLDS, averaged over the table rows
// that share it. The bot is not told a creature's hp any more (observe.js) —
// only the number over its head — so this is the bestiary knowledge a player
// builds by playing, and it is honestly WRONG for half the table: wolf and
// ogre are both xp 4 at hp 5 and 7, so whoever expects 6 is 20% out either
// way. That error is the point, not a defect in the estimate.
//
// Derived from MONSTER_TABLE rather than written down, so a table edit
// cannot leave a second copy of the bestiary behind.
const HP_BY_XP = (() => {
  const sums = new Map();
  for (const m of MONSTER_TABLE) {
    const at = sums.get(m.xp) || { total: 0, count: 0 };
    at.total += m.hp; at.count += 1;
    sums.set(m.xp, at);
  }
  return new Map([...sums].map(([xp, a]) => [xp, a.total / a.count]));
})();

export function expectedHpFor(xp) {
  const exact = HP_BY_XP.get(xp);
  if (exact !== undefined) return exact;
  // Off the table — the vault's occupant, or anything a later edit adds.
  // Nearest xp that IS on it, so an unknown creature is guessed like the
  // most similar known one rather than like nothing.
  let best = null;
  for (const [known, hp] of HP_BY_XP) {
    if (best === null || Math.abs(known - xp) < Math.abs(best[0] - xp)) best = [known, hp];
  }
  return best ? best[1] : 1;
}

// The glyph of a creature, by the name the engine writes into `killedBy`
// (src/sim/combat.js). The vault's occupant is in here as well as the table
// because it is NOT a `MONSTER_TABLE` row and never drawn — anything that
// looks a creature up by name has to know about both, and a second copy of
// that fact is how the Butcher shipped invisible once already.
//
// Returns null for an unknown name rather than a placeholder: the caller
// decides what nothing looks like, and a run that ended without a killer
// (the turn budget) has no creature to draw.
export function monsterEmoji(name) {
  if (!name) return null;
  if (name === VAULT_BOSS.name) return VAULT_BOSS.emoji;
  const row = MONSTER_TABLE.find((m) => m.name === name);
  return row ? row.emoji : null;
}

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
  // The scholar's book (src/sim/heroes.js). NO `heal` field, deliberately:
  // `drinkPotion` finds a potion by `heal > 0` and the bot values a loose
  // item by the same handful of fields, so a book carrying one would be
  // drunk on sight and priced as a potion. What it does is `read` — an
  // action of its own (rules.md §6), not a bigger potion.
  { name: 'book',   emoji: '📜',  value: 5, kind: 'book' },
  // Vito's, and no stat of its own for the same reason the book has none:
  // what it does is the `rage` action. A `dmg` here would be added to the
  // die like any weapon, and adding is exactly what this does NOT do.
  { name: 'adrenaline', emoji: '💉', value: 5, kind: 'syringe' },
];

// How many turns reading costs. The hero does nothing for all of them and
// the creatures act in every one — which is the whole price, since a blow is
// paid exactly when the hero stops increasing the distance (rules.md §4).
// Five: long enough that a pursuer crosses a room, short enough to survive
// starting one by mistake.
export const READ_TURNS = 5;

// How many turns the syringe lasts, and by how much it lifts the TOP of the
// damage die. Multiplying rather than adding: a flat bonus is enormous on a
// bare hero and irrelevant on an armed one, while a multiplier means the
// same thing at floor 1 and floor 9. It does not touch the die's floor —
// `dmgMin` stays where it is, so the swing widens rather than shifting.
//
// SHORTER AND HARDER (B32), the owner's call against the arithmetic, which
// said the window was the binding constraint and not the damage: the creature
// the hero injects against holds a median 12 hp, so at the old reading he
// needed about 4.8 turns of a 5-turn window and 39% of windows expired with
// the fight unresolved. What is measured under this reading is in the commit.
export const RAGE_TURNS = 3;
export const RAGE_MULT = 2.5;

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

// ***** the coin pile (owner, 2026-08-31) *****
//
// THE PROBLEM THIS SOLVES: the game's only income was xp ÷ turns, so every
// turn of exploring diluted the pay and "descend fast" beat every other
// play — two dial grids measured it end to end. The pile is the second
// income, the one that does NOT dilute with turns — and it lives ONLY in
// side rooms, so the route never trips over it: the diver farms the rate,
// the explorer farms the floor, and Pressa chooses between incomes instead
// of having a right answer.
//
// A VISIBLE pile on the floor, not a chest kind, by the owner's design
// refined once: hiding money in a chest only makes the bot guess, and the
// act being paid is REVEALING the room — the rarity and the hiding place
// do the mystery's job. Chests are untouched: the first attempt took the
// coin out of their content draw and the opening-deaths wire fired
// (0.45 -> 0.53 at n=300, both with and without the sustain compensation —
// richer floors cost dwell time in blood), so the pile adds income without
// touching the item world at all.
export const COIN_PILE_PER_FLOOR = 1;
export const COIN_PILE_AMOUNT = 2;

// How many WALKED steps a pile must sit from every tile of the mandatory
// route (owner, 2026-08-31, watching): the first placement filtered by side
// ROOM, and on open themes (the cave has no real rooms) a "side" anchor can
// hug the walked path — the owner saw piles beside the spine. Distance is
// the rule that means the same thing on every theme: a pile lives in the
// pocket the route never brushes, or the floor has none.
export const COIN_PILE_ROUTE_GAP = 8;

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
  // M49 — it carries the axe WHERE IT CAN BE SEEN. The only creature in the
  // game that reveals its drop, and the reason is the room: a vault is a bet
  // made before entering, and `objectives.md` says a choice made blind is a
  // preference rather than a decision. The axe is the one permanent prize in
  // there and it was worth zero in the hero's arithmetic until now.
  revealsDrop: true,
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
// without completing, which ends the run (rules.md §8). Two jobs now: still
// the brake on the shamble, and since M-stamina it is the STAMINA the HUD
// shows as a draining bar — the price of a detour, which map-design.md
// named as the game's largest open gap ("refusing is never correct").
// Was 1500 (a safety guard that never fired), then 180 — which starved the
// game: over half of all chained runs died of exhaustion and clears went
// to zero. 240 is the swept value: stamina still kills (~7%) and still
// prices the detour, depth returns to the pre-arc level, and winning is
// rare but exists. The mechanism behind the sweep's cliff is in
// decisions.md ("the budget gates the endgame"). The bot does NOT read
// this — owner decision: stamina is player information, and the bot
// managing it would need a new mechanism, not this value.
export const TURN_BUDGET = 240;

// ***** coin ***** //

// What a completed traversal pays, per unit of xp-per-turn (rules.md §9).
// It lived hardcoded in `src/ui/spectator.js` until a hero needed to spend
// coin mid-run and the formula had to exist in one place both could call —
// the value moved here with it rather than being copied.
//
// 10 → 20 (owner, 2026-08-15). The payout is ROUNDED, so the rate is also
// the resolution: at 10 nearly every floor paid 1, 2 or 3 and a thin floor
// (0.04 xp/turn) paid nothing at all. Doubling it does not make the hero
// richer — the shop's prices double in the same commit (src/ui/shop.js) and
// so does the one hero who spends mid-run (src/sim/heroes.js's pawa) — it
// buys HALF-COIN STEPS, so floors that used to price the same now differ.
export const COIN_RATE = 20;

// What the shop charges, in coins. The RATIONALE for each number — the hp
// ruler, the E2 axe bridge, why the potion stays at 1 — lives with the shop
// (src/ui/shop.js), which builds its shelf from this table. The NUMBERS
// live here because they are balance values and because the bot's own
// economics read them: `XP_VALUE_HP` (src/bot/config.js) converts xp to hp
// through the best hp-per-coin on this shelf, and a bot module importing
// the UI to learn a price would be the dependency pointing backwards.
export const SHOP_PRICES = { health: 1, shield: 2, dagger: 6, axe: 12 };
