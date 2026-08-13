// The cast. A hero is a CONFIGURATION, never a branch (CLAUDE.md), and this
// file is where the configuration lives — one object per hero, so that adding
// one is an entry in a table instead of a walk through four files.
//
// A hero may differ on four surfaces and no more. Three of them already
// existed before this file did; none is new machinery:
//
//   sight    how far the hero perceives. Read by `observe()`.
//   loot     whether an unopened chest's or a live creature's `drop` crosses
//            into Belief. The `revealLoot` hook in observe.js, which was
//            built for exactly this and had no caller until now.
//   items    what an item is worth IN THIS HERO'S HANDS. Applied at the one
//            place an item enters the inventory — `heroItem` below.
//   bot      how the bot VALUES things: an override of `DEFAULT_HERO`
//            (src/bot/config.js) handed to `makeBot`. Shipped since P3.
//
// The first three ride on `state.persona`; the fourth never touches the
// engine at all, and is kept here only so that one object describes a whole
// hero. There is deliberately no fifth surface for "an action only this hero
// can take": when one arrives, `drinkPotion` is the template (an action that
// resolves in place and costs the turn), and nothing in this file has to
// change to allow it. Building the generic version first is how the project
// bloated the first time.
//
// This is a VALUES file — the same treatment `MONSTER_TABLE` and `ITEM_TABLE`
// get in balance.js, with one row in docs/balance.md pointing here.

import { MAP_SIZE } from './balance.js';

// Sight that covers any square map: the longest distance on a MAP_SIZE grid
// is its diagonal, MAP_SIZE × √2, so twice the side clears it with room to
// spare. A finite number rather than Infinity on purpose — `replay.counts`
// carries the persona and Infinity does not survive a JSON round-trip, where
// this silently keeps working.
export const SIGHT_WHOLE_MAP = MAP_SIZE * 2;

// What every hero is, before a persona says otherwise. Every field's unset
// value IS the shipped game, so a run with no persona is byte-identical to
// one from before this file existed.
export const DEFAULT_PERSONA = {
  // null means the shipped fog — `observe()` resolves it to VISIBLE_DIST.
  // The default is not written here because balance.md owns that number and
  // restating it is how the old docs rotted.
  sightRadius: null,
  // Whether `drop` crosses into Belief. rules.md §7: the rule is about the
  // CHANNEL, so this opens the channel; whether anything reads it is a
  // separate decision living in the bot.
  revealLoot: false,
  // Per-item-name overrides, e.g. `{ dagger: { dmgMin: 1 } }`. ABSOLUTE
  // values, not deltas — a delta would need to know the base, and the base
  // is a balance value that lives in one place already.
  items: null,
};

export function resolvePersona(persona) {
  return persona ? { ...DEFAULT_PERSONA, ...persona } : DEFAULT_PERSONA;
}

// What an item becomes in this hero's hands. Returns the SAME object when
// nothing applies, so the default path keeps the identity the pickup rule
// relies on and stays free.
//
// The world's daggers are all alike; it is the hands that differ. Applying
// it here rather than to `ITEM_TABLE` is what makes a shop purchase and a
// starting kit come out right without a second rule — rules.md §5 already
// sends all three down the same path.
export function heroItem(item, persona) {
  const overrides = persona && persona.items && persona.items[item.name];
  return overrides ? { ...item, ...overrides } : item;
}

// The cast itself. `base` is the shipped game and must stay empty — it is
// what every measurement compares against.
//
// Pawa is absent on purpose: both versions of his trait (buying armour at a
// floor transition, or a stealth multiplier on creature `activation`) touch
// the bot's danger field, and that is being worked on elsewhere. He is a
// table entry away once it lands.
export const HEROES = {
  base: {
    name: 'base',
    persona: {},
    hero: {},
  },
  // Sees the whole floor at once — position and type, map-wide. He still
  // does not know what a chest HOLDS: that is Ricardo's axis, and no hero
  // sits at "sees everything" on both.
  papazito: {
    name: 'papazito',
    persona: { sightRadius: SIGHT_WHOLE_MAP },
    hero: {},
  },
  // The opposite trade: ordinary reach, deeper knowledge of what is already
  // in view. He knows the true contents of what he can see instead of the
  // expectation everyone else acts on.
  ricardo: {
    name: 'ricardo',
    persona: { revealLoot: true },
    hero: {},
  },
  // A dagger that never lands for zero, and shields that hold less. Measured
  // as the one version of this trait that is not net-negative; the axe
  // variants all lost more to the armour bar than the weapon paid back.
  vito: {
    name: 'vito',
    persona: {
      items: {
        dagger: { dmgMin: 1 },
        shield: { armour: 2 },
      },
    },
    hero: {},
  },
};
