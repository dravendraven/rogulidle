// The fog-of-war layer. Spec: docs/rogule-spec.md §12.
//
// Three representations, and keeping them apart is the whole point:
//   GameState   the truth. Only the engine and a debug view may read it.
//   Observation what the player perceives this turn.
//   Belief      accumulated memory, folded from every Observation so far.
//
// The bot reads Belief and nothing else. If it ever touches GameState the
// fog is decoration — test/tests.js guards this.
//
// Visibility is by DISTANCE, not line of sight: the original compares
// squared distance and never raycasts, so you see through walls inside the
// radius (ui.cljs:153). That is deliberate — it is what makes "pick the room
// with the weaker monster" a decision at all. Spec §12.1.

import { VISIBLE_DIST } from './balance.js';
import { distSq, posKey, tileAt } from './mapgen.js';

// `radius` is a PERSONA's reach (src/sim/heroes.js), defaulting to the
// shipped fog. It is a parameter rather than a module constant because one
// hero sees the whole floor at once — rules.md §7 carries the rule.
export function isVisible(playerPos, pos, radius = VISIBLE_DIST) {
  return distSq(playerPos, pos) <= radius * radius;
}

// M28 — docs/backlog.md. `copyEntity` used to be a blind deep clone
// (`JSON.parse(JSON.stringify(entity))`), which meant every field on a
// GameState entity crossed into Observation/Belief automatically — including
// `drop`, the item M26 already rolled for a monster or chest before the
// hero has discovered or opened it. "The bot may only read Observation/
// Belief, never GameState" (CLAUDE.md) is a statement about the CHANNEL: a
// channel that already carries an unrevealed answer has failed the rule the
// instant the data crosses it, whether or not anything downstream happens
// to read that field. B9 had to build `expectedMonsterDropValue` specifically
// to price a creature's likely drop from its TIER instead of reading
// `monster.drop` directly, precisely because the leak existed.
//
// An explicit ALLOW-LIST per kind, not a hardcoded omission of `drop`
// alone — a clone of a growing object is exactly the pattern that leaks the
// next field someone adds to `MONSTER_TABLE` or a live entity too.
// `raging` is here because the bot has to price fights with the damage it
// ACTUALLY has. Leave it out and everything still passes — the hero simply
// underestimates himself for the whole rage, silently, which is the worst shape
// a defect can take. It is the hero's own state, not an unrevealed answer,
// so nothing about the fog rule objects.
const PLAYER_FIELDS = ['pos', 'hp', 'hpMax', 'armour', 'xp', 'inventory', 'kills', 'xpEarned', 'raging'];
// `speed` (M44) is here on purpose. It is a plain property of a creature
// the hero can already see, in the same class as `xp` and `activation` —
// not an unrevealed answer — so hiding it would be using the fog to conceal
// something visible, which is the opposite of what the rule protects. The
// bot does not PRICE it (see duelCost's own note); that is a design
// decision, not an information one, and `edge` is already exposed and read
// by nothing but the instruments.
// NO `hp`, and that is the fog decision the whole courage dial now rests on:
// what a player sees over a creature's head is its xp, never its health. The
// bot has to COMMIT to a fight on an estimate (src/sim/balance.js's
// `expectedHpFor`) and finds out whether it guessed right by fighting.
// NOT EVEN IN MELEE, and that reversal is the point of `blow` below. Health
// visible up close kept the mid-duel decision alive but did it by handing
// over the answer, which is the thing the fog is for. The bot now keeps the
// decision and pays for it with a MEMORY: it started from a guess, it knows
// every blow it landed, so it can subtract — and it is wrong for exactly as
// long as its opening guess was wrong.
// NO `side`, and that one was measured out rather than argued out. The flag
// says "this creature stands in a room the mandatory route never enters" —
// which encodes WHERE THE EXIT IS, computed over the whole finished map
// before the hero has seen a tile of it. It was the one grant `rules.md` §7
// never listed.
//
// Blinding the bot to it changed nothing worth explaining. Fraction of side
// chests opened, 150 runs a band, same seeds:
//
//   greed 0.2   0.10 -> 0.19
//   greed 1.0   0.84 -> 0.86        (what ships)
//   greed 1.8   0.87 -> 0.90
//
// Opening deaths, depth and clears flat at all three. The gamble survives
// because optionality was ALREADY priced twice: a side room is off the route,
// so reaching it costs more walk and more guard, and the label was saying the
// same thing a second time. Only the miser leaked — he now enters about twice
// as many side rooms, which is the one place the label did work the price did
// not.
//
// And at the shipped dial the label was inert for creatures by construction:
// `sideBar = sideAppetite × fightBar` is `fightBar` at 1, so
// `monster.side ? sideBar : fightBar` compared a number against itself.
const MONSTER_FIELDS = ['id', 'name', 'emoji', 'pos', 'xp', 'activation', 'speed', 'dead', 'edge'];
const CHEST_FIELDS = ['id', 'name', 'emoji', 'pos', 'edge'];
// `dmgMin` belongs here beside `dmg`: it is a plain property of an item the
// hero can already see, not an unrevealed answer, and leaving it out made
// the bot value a floor axe as if it only widened the die.
const ITEM_FIELDS = ['id', 'name', 'emoji', 'pos', 'dmg', 'dmgMin', 'armour', 'heal'];
const SHRINE_FIELDS = ['id', 'emoji', 'pos'];

// `revealLoot` adds `drop` to the monster/chest allow-lists. Off (the
// default) for every caller today — there is no persona system yet — but
// built as a parameter rather than left out entirely: docs/project/
// candidates.md's parked U4 (a persona that CAN see drops) needs exactly
// this hook, and hardcoding the omission here would mean U4 has to come
// back into this function to partially undo it later. A parameter with one
// caller passing its default is not new machinery running.
// M49 — a creature may also reveal its own drop, whatever the persona
// setting is. That is a property of the CREATURE, not of the observer: the
// vault's occupant carries the axe where it can be seen, and the room is
// meant to be a decision made in advance (docs/project/objectives.md — "a
// choice made blind is a preference"). A hero that cannot see the one
// permanent prize in the room is not choosing, it is guessing.
//
// Narrow on purpose: nothing on MONSTER_TABLE sets it, so every ordinary
// corpse keeps its secret and M28's leak stays closed. `revealsDrop` also
// travels, so the renderer and the tests can tell which creatures advertise.
function monsterFields(revealLoot, monster) {
  const base = monster && monster.revealsDrop
    ? [...MONSTER_FIELDS, 'revealsDrop', 'drop']
    : MONSTER_FIELDS;
  return revealLoot ? [...base, 'drop'] : base;
}
function chestFields(revealLoot) {
  return revealLoot ? [...CHEST_FIELDS, 'drop'] : CHEST_FIELDS;
}

// Deep-clones only the allow-listed fields — still a JSON round-trip
// underneath (so nested data like `inventory` is copied too, not aliased),
// just applied to a picked-down object instead of the entity whole.
function copyEntity(entity, fields) {
  const picked = {};
  for (const f of fields) {
    if (f in entity) picked[f] = entity[f];
  }
  return JSON.parse(JSON.stringify(picked));
}

// `options` is the hero's PERSONA (src/sim/heroes.js) wherever step.js calls
// this, so the two fields it reads carry the same names the persona uses. An
// absent option is the shipped game in both cases.
export function observe(state, options = {}) {
  const revealLoot = options.revealLoot ?? false;
  const radius = options.sightRadius ?? VISIBLE_DIST;
  const map = state.map;
  const from = state.player.pos;

  const visible = new Set();
  const tiles = new Map();

  // Walk the bounding box of the radius, keeping only what is close enough.
  // The box is CLAMPED to the map, which changes nothing at the shipped
  // radius — the loop already threw out-of-bounds tiles away — and is what
  // keeps a whole-map radius costing the map rather than the square around
  // it, most of which is off the grid.
  const y0 = Math.max(0, from[1] - radius);
  const y1 = Math.min(map.h - 1, from[1] + radius);
  const x0 = Math.max(0, from[0] - radius);
  const x1 = Math.min(map.w - 1, from[0] + radius);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!isVisible(from, [x, y], radius)) continue;
      const key = x + ',' + y;
      visible.add(key);
      tiles.set(key, tileAt(map, x, y));
    }
  }

  const seen = (entity) => visible.has(posKey(entity.pos));

  return {
    turn: state.turn,
    outcome: state.outcome,
    // How big the grid is. NOT fog — the edge of the world is not a secret
    // the hero has to walk into to learn, and the viewport shows it. It is
    // here because the router treats an unknown tile as walkable on
    // purpose (that is how it aims into the dark), so without a bound it
    // would happily plan a route off the map. It used to read MAP_SIZE
    // straight out of balance.js, which quietly made the grid unchangeable.
    w: map.w,
    h: map.h,
    // You always know your own hp, xp, inventory and step count.
    player: copyEntity(state.player, PLAYER_FIELDS),
    // …and the blow you just swung, if you swung one (src/sim/combat.js).
    // Set only on the turn the hero attacked and never carried by
    // `cloneState`, so this is null on every other turn without anything
    // having to clear it.
    blow: state.blow ?? null,
    visible,
    tiles,
    monsters: state.monsters.filter(seen).map((m) => copyEntity(m,
      monsterFields(revealLoot, m))),
    items: state.items.filter(seen).map((i) => copyEntity(i, ITEM_FIELDS)),
    chests: state.chests.filter(seen).map((c) => copyEntity(c, chestFields(revealLoot))),
    shrine: seen(state.shrine) ? copyEntity(state.shrine, SHRINE_FIELDS) : null,
  };
}

export function emptyBelief() {
  return {
    turn: 0,
    outcome: null,
    // Filled by the first observation. Null until then, and every reader
    // falls back to MAP_SIZE, so a belief that has seen nothing behaves
    // exactly as it did before this field existed.
    w: null,
    h: null,
    player: null,
    seen: new Set(),
    tiles: new Map(),
    monsters: new Map(),
    items: new Map(),
    chests: new Map(),
    shrine: null,
  };
}

function cloneBelief(belief) {
  return {
    turn: belief.turn,
    outcome: belief.outcome,
    w: belief.w,
    h: belief.h,
    player: belief.player,
    seen: new Set(belief.seen),
    tiles: new Map(belief.tiles),
    monsters: new Map(belief.monsters),
    items: new Map(belief.items),
    chests: new Map(belief.chests),
    shrine: belief.shrine,
  };
}

// Inside the visible radius the observation is authoritative: anything
// remembered there that is no longer reported has gone. Outside it, memory
// stands untouched.
function refresh(remembered, observed, visible, turn) {
  const next = new Map(remembered);

  for (const [id, entity] of remembered) {
    if (visible.has(posKey(entity.pos))) next.delete(id);
  }
  for (const entity of observed) {
    // What the bot WORKED OUT about a thing survives seeing it again. Only
    // `hurt` qualifies today — it is the bot's own tally of blows landed, not
    // something the observation reports, so a fresh sighting would otherwise
    // wipe the fight's whole history every turn. Nothing but a monster ever
    // carries it, so chests and items are untouched.
    const before = remembered.get(entity.id);
    const kept = before && before.hurt ? { hurt: before.hurt } : null;
    next.set(entity.id, { ...entity, ...kept, lastSeenTurn: turn });
  }
  return next;
}

export function foldBelief(belief, obs) {
  const b = cloneBelief(belief);

  b.turn = obs.turn;
  b.outcome = obs.outcome;
  b.player = obs.player;
  b.w = obs.w ?? b.w;
  b.h = obs.h ?? b.h;

  // Terrain never changes, so once seen it is known for good.
  for (const [key, kind] of obs.tiles) {
    b.tiles.set(key, kind);
    b.seen.add(key);
  }

  // Chests, loose items and corpses are static too, but they can be consumed,
  // so they still need the visible-region refresh.
  b.chests = refresh(b.chests, obs.chests, obs.visible, obs.turn);
  b.items = refresh(b.items, obs.items, obs.visible, obs.turn);

  // Monsters are the only entity whose remembered position goes stale. They
  // are static outside their activation radius though, so a memory taken
  // from far away stays exact for as long as the bot keeps its distance —
  // see docs/bot.md.
  b.monsters = refresh(b.monsters, obs.monsters, obs.visible, obs.turn);

  // THE ONE THING THE BOT LEARNS BY ACTING RATHER THAN BY LOOKING. Health
  // never crosses, so a duel opens on a guess; every blow the hero lands is
  // then subtracted from it (src/bot/bot.js's `assumedHp`), and a fight
  // already joined gets cheaper as it is won. This is the memory that makes
  // breaking off a brawl possible without showing the bot the answer.
  //
  // AFTER the refresh above, never before: the refresh rebuilds the entry
  // from this turn's sighting, so a blow folded first would be overwritten by
  // it. Silently, and only in the case where the creature is visible — which
  // is every case that matters.
  if (obs.blow) {
    const m = b.monsters.get(obs.blow.id);
    if (m) b.monsters.set(obs.blow.id, { ...m, hurt: (m.hurt || 0) + obs.blow.damage });
  }

  if (obs.shrine) b.shrine = { ...obs.shrine, lastSeenTurn: obs.turn };

  return b;
}
