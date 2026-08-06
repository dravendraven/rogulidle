// How strong the hero is, as one number.
//
// Measured in hp: what it would cost this hero to clear a FIXED reference
// band of monsters. Same currency as the difficulty dial, so the two can be
// compared and subtracted. Lower cost means a stronger hero; zero means
// nothing in the band can touch them.
//
// The reference is deliberately fixed. A yardstick that changed with the
// floor would measure nothing.

import { MONSTER_TABLE, XP_FROM_KILLS } from '../sim/balance.js';
import { campaignCost } from '../bot/duel.js';

// A spread across the table, skipping the extremes: the rat is free for
// anyone and the t-rex is hopeless early, so neither separates heroes.
const REFERENCE_BAND = ['ghost', 'wolf', 'ogre', 'vampire', 'dragon']
  .map((name) => MONSTER_TABLE.find((m) => m.name === name))
  .map((m) => ({ xp: m.xp, hp: m.hp }));

// `growsXp` must match the rule actually in force. Getting it wrong makes
// every cost here optimistic, because the model then credits the hero with
// levelling up mid-fight when they cannot.
export function heroPower(player, growsXp = XP_FROM_KILLS) {
  return campaignCost({
    xp: player.xp,
    hp: player.hp,
    hpMax: player.hpMax,
    inventory: player.inventory,
    kills: player.kills,
  }, REFERENCE_BAND, growsXp);
}

// Cost for a hero who has just started: 43.88hp, i.e. a fresh hero cannot
// clear the reference band at all — they have 10hp.
export const FRESH_HERO_COST = (() => heroPower({
  xp: 3, hp: 10, hpMax: 10, inventory: [], kills: [],
}))();

// Deliberately NOT offering a tidy 0..1 power fraction.
//
// Tried it as `1 - cost / FRESH_HERO_COST` and it is useless: a floor-one
// hero already scores 0.93 and floor five scores 1.00, because the fresh
// cost of 43.88 is so lopsided that any gear at all looks like most of the
// journey. The scale would say the hero stops improving after floor one,
// which is the opposite of what happens.
//
// The raw hp cost carries the information — 5.97, 1.68, 0.40, 0.00 — and
// it is already in the same units as the difficulty dial, which is what
// makes the two comparable. Read that.

// MEASURED across a ten-floor descent, cost to clear the reference band:
//
//   floor    1     3     5     7    10
//   cost   5.97  1.68  0.40  0.00  0.00
//   dial   0.20  0.36  0.51  0.67  0.90
//
// The dial rises four and a half times while the hero's cost falls to
// literally nothing. From floor seven the hero is untouchable by anything
// in the band, so no dial value at or below 1.0 can make the net challenge
// climb. This is the number that says an accumulation cap is required, not
// optional — see src/sim/dungeon.js.
