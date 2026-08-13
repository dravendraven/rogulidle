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
const PLAYER_FIELDS = ['pos', 'hp', 'hpMax', 'armour', 'xp', 'inventory', 'kills', 'xpEarned'];
// `speed` (M44) is here on purpose. It is a plain property of a creature
// the hero can already see, in the same class as `xp` and `activation` —
// not an unrevealed answer — so hiding it would be using the fog to conceal
// something visible, which is the opposite of what the rule protects. The
// bot does not PRICE it (see duelCost's own note); that is a design
// decision, not an information one, and `edge` is already exposed and read
// by nothing but the instruments.
const MONSTER_FIELDS = ['id', 'name', 'emoji', 'pos', 'hp', 'hpMax', 'xp', 'activation', 'speed', 'dead', 'side', 'edge'];
const CHEST_FIELDS = ['id', 'name', 'emoji', 'pos', 'side', 'edge'];
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
function monsterFields(revealLoot) {
  return revealLoot ? [...MONSTER_FIELDS, 'drop'] : MONSTER_FIELDS;
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
    // You always know your own hp, xp, inventory and step count.
    player: copyEntity(state.player, PLAYER_FIELDS),
    visible,
    tiles,
    monsters: state.monsters.filter(seen).map((m) => copyEntity(m, monsterFields(revealLoot))),
    items: state.items.filter(seen).map((i) => copyEntity(i, ITEM_FIELDS)),
    chests: state.chests.filter(seen).map((c) => copyEntity(c, chestFields(revealLoot))),
    shrine: seen(state.shrine) ? copyEntity(state.shrine, SHRINE_FIELDS) : null,
  };
}

export function emptyBelief() {
  return {
    turn: 0,
    outcome: null,
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
    next.set(entity.id, { ...entity, lastSeenTurn: turn });
  }
  return next;
}

export function foldBelief(belief, obs) {
  const b = cloneBelief(belief);

  b.turn = obs.turn;
  b.outcome = obs.outcome;
  b.player = obs.player;

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

  if (obs.shrine) b.shrine = { ...obs.shrine, lastSeenTurn: obs.turn };

  return b;
}
