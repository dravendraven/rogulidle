// The dungeon gets visibly hotter as it gets deeper: stone, then earth,
// then magma. Cosmetic only — nothing here is read by the sim or the bot,
// and turning it off changes no behaviour, only what the walls look like.
//
// Why the map and not a badge: the floor number is already on screen and
// nobody reads it mid-run. Repainting the walls is the one signal that
// cannot be missed, because it is most of the pixels.
//
// DEPTH_THEME — set to false and every floor draws the way it always did
// (⬛ walls, ⬜ doors, cream floor). The one switch; there is no per-tier
// toggle on purpose, since half-applied the progression reads as a bug.

export const DEPTH_THEME = true;

// `stage` is a class put on .stage, where style.css redefines --floor for
// the tier. Empty string = the :root default, i.e. leave it alone.
const BASE = { wall: '⬛', door: '⬜', stage: '' };

// Highest floor first — depthTheme takes the first tier the level reaches.
const TIERS = [
  { from: 9, wall: '🟥', door: '🟨', stage: 'deep-max' },   // 9-10, the ápice
  { from: 5, wall: '🟫', door: '🟧', stage: 'deep-mid' },   // 5-8
];

export function depthTheme(level) {
  if (!DEPTH_THEME) return BASE;
  return TIERS.find((tier) => level >= tier.from) || BASE;
}
