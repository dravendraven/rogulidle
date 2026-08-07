// Places the player, the shrine, the chests and the monsters on a generated
// map. Spec: docs/rogule-spec.md §2 "Ordem de povoamento".
//
// Placement order matters: each step removes the tile it used from the free
// pool, so changing the order changes every map.

import {
  CHEST_COUNT, CHEST_DIFFICULTY_SCALE, CHEST_LOOT_RICHER_FAR, CHEST_TABLE,
  ITEM_TABLE, MONSTER_COUNT, MONSTER_DIFFICULTY_SCALE, MONSTER_DROP_CHANCE,
  MONSTER_TABLE, MONSTER_WEIGHTS, PLAYER_HP, PLAYER_XP,
} from './balance.js';
import { drawChance, drawInt, drawPick, drawWeighted } from './rng.js';
import { findPath, playerPassable, posKey, walkablePositions } from './mapgen.js';

// Items are drawn with weight 1/value, so a high value is a RARE item.
//
// One scarcity dial per kind, and what they do not claim becomes EMPTY.
//
// Rogule filled that space with chestnuts and mushrooms — junk that existed
// for the share card. Replacing it with nothing keeps the dilution, which
// was doing real work, while making it a number you set rather than a side
// effect of what is in the deck.
//
// At scarcity 1 a kind takes its full third and no chest comes up empty. At
// 3 it takes a ninth, and two thirds of the pool is nothing.
//
// The two sources hold different things, by owner decision:
//
//   chests   weapons and armour — gear comes from exploring
//   monsters health potions only — healing comes from killing
//
// Scarcity keeps the same meaning either way: 1 draw in S gives something,
// the rest come up empty.
//
// Returns [[item | null, weight], ...]; null means this draw holds nothing.
export function itemWeights(scarcity = {}, source = 'chest') {
  const kinds = source === 'monster' ? ['potion'] : ['weapon', 'armour'];
  const shareEach = 1 / kinds.length;

  // Within a kind, split by 1/value so the stronger item stays rarer.
  const kindTotals = new Map();
  for (const item of ITEM_TABLE) {
    if (!kinds.includes(item.kind)) continue;
    kindTotals.set(item.kind, (kindTotals.get(item.kind) || 0) + 1 / item.value);
  }

  const entries = ITEM_TABLE
    .filter((item) => kinds.includes(item.kind))
    .map((item) => {
      const shareOfKind = (1 / item.value) / kindTotals.get(item.kind);
      const mass = shareEach / (scarcity[item.kind] ?? 1);
      return [item, mass * shareOfKind];
    });

  const claimed = entries.reduce((sum, [, w]) => sum + w, 0);
  entries.push([null, Math.max(0, 1 - claimed)]);
  return entries;
}

function nextId(state) {
  return 'e' + (state.nextId++);
}

// How far into the dungeon a position is, as 0..1. Spec §2, map.cljs:68.
function posToDifficulty(pos, playerPos, passable, furthestLength) {
  if (furthestLength <= 0) return 0;
  const path = findPath(playerPos, pos, passable);
  return path.length / furthestLength;
}

// Builds the monster pick table around an index, summing weights where two
// offsets clamp onto the same slot. Spec quirk §9.2 — the original overwrites
// instead, which makes the intended monster rarer than its neighbour at the
// ends of the table.
function monsterWeightsAround(index) {
  const max = MONSTER_TABLE.length - 1;
  const totals = new Map();
  for (const [offset, weight] of MONSTER_WEIGHTS) {
    const slot = Math.min(max, Math.max(0, index + offset));
    totals.set(slot, (totals.get(slot) || 0) + weight);
  }
  return [...totals.entries()];
}

// Turns a table row into a live item entity, or null when the roll says the
// chest / corpse holds nothing.
function makeItem(state, template, pos) {
  return {
    id: nextId(state),
    name: template.name,
    emoji: template.emoji,
    pos,
    dmg: template.dmg || 0,
    armour: template.armour || 0,
    heal: template.heal || 0,
  };
}

// `counts` overrides how many monsters and chests to place. Generation
// numbers are the other half of the difficulty dial, and a bot rule that
// does not pay on a sparse map may pay on a crowded one — so they have to
// be sweepable without editing balance.js.
export function populate(state, map, counts = {}) {
  const monsterCount = counts.monsters ?? MONSTER_COUNT;
  const chestCount = counts.chests ?? CHEST_COUNT;
  // How far up the monster table the deepest tiles reach. The third dial of
  // difficulty, alongside how many monsters and how much loot.
  const difficultyScale = counts.difficultyScale ?? MONSTER_DIFFICULTY_SCALE;
  // Needed as its own dial: piling on monsters also piles on their drops, so
  // crowding the floor arms the player as well as threatening them. Without
  // this the win rate bottoms out around 13% however many you add.
  const dropChance = counts.dropChance ?? MONSTER_DROP_CHANCE;
  const scarcity = {
    weapon: counts.weaponScarcity,
    armour: counts.armourScarcity,
    potion: counts.potionScarcity,
  };
  const chestWeights = itemWeights(scarcity, 'chest');
  const monsterWeights = itemWeights(scarcity, 'monster');
  const passable = playerPassable(map);
  const free = new Map();
  for (const pos of walkablePositions(map)) free.set(posKey(pos), pos);

  const takeFree = (pos) => free.delete(posKey(pos));
  const pickFree = () => {
    const positions = [...free.values()];
    return positions[drawInt(state, 'spawn', 0, positions.length - 1)];
  };

  // 1. Player.
  const playerPos = pickFree();
  takeFree(playerPos);
  state.player = {
    pos: playerPos,
    hp: PLAYER_HP,
    hpMax: PLAYER_HP,
    // The second bar. Soaks damage before hp does, and is spent doing it —
    // only a shield refills it (spec §13.2).
    armour: 0,
    xp: PLAYER_XP,
    inventory: [],
    kills: [],
  };

  // 2. Path to the centre of every room, shortest first.
  //
  // Spec quirk §9.1: the original sorts by the path VECTOR rather than its
  // length, which scatters the shrine into an arbitrary room and skews the
  // difficulty curve for everything placed afterwards. We sort by length.
  const roomPaths = map.rooms
    .map((room) => ({
      room,
      center: room.center,
      path: findPath(playerPos, room.center, passable),
    }))
    .filter((entry) => entry.path.length > 0)
    .sort((a, b) => a.path.length - b.path.length);

  const furthestLength = roomPaths.length
    ? roomPaths[roomPaths.length - 1].path.length
    : 0;

  // 3. Shrine, in the furthest room.
  const shrinePos = roomPaths.length
    ? roomPaths[roomPaths.length - 1].center
    : playerPos;
  takeFree(shrinePos);
  state.shrine = { id: nextId(state), emoji: '⛩️', pos: shrinePos };

  // 4. Chests. Rooms only — never corridors.
  state.chests = [];
  for (let i = 0; i < chestCount; i++) {
    if (!roomPaths.length) break;
    const entry = drawPick(state, 'spawn', roomPaths);
    const roomFree = [];
    for (let x = entry.room.x1; x <= entry.room.x2; x++) {
      for (let y = entry.room.y1; y <= entry.room.y2; y++) {
        if (free.has(x + ',' + y)) roomFree.push([x, y]);
      }
    }
    if (!roomFree.length) continue;

    const pos = roomFree[drawInt(state, 'spawn', 0, roomFree.length - 1)];
    takeFree(pos);

    const depth = posToDifficulty(pos, playerPos, passable, furthestLength);
    // Sweeps 10%..100% across the map; the flag decides which end is rich.
    const emptiness = CHEST_LOOT_RICHER_FAR ? 1 - depth : depth;
    const hasLoot = drawChance(state, 'spawn', 1 - CHEST_DIFFICULTY_SCALE * emptiness);
    const template = drawWeighted(state, 'spawn', chestWeights);

    const chest = drawPick(state, 'spawn', CHEST_TABLE);
    state.chests.push({
      id: nextId(state),
      name: chest.name,
      emoji: chest.emoji,
      pos,
      // `template` is null when the scarcity dials sent this draw to the
      // empty slot, which is the replacement for Rogule's junk collectibles.
      drop: hasLoot && template ? makeItem(state, template, pos) : null,
    });
  }

  // 5. Monsters. Anywhere still free, harder the deeper they sit.
  state.monsters = [];
  for (let i = 0; i < monsterCount; i++) {
    if (!free.size) break;
    const pos = pickFree();
    takeFree(pos);

    const depth = posToDifficulty(pos, playerPos, passable, furthestLength);
    const difficulty = Math.min(1, depth * difficultyScale);
    const index = Math.floor(difficulty * (MONSTER_TABLE.length - 1));
    const slot = drawWeighted(state, 'spawn', monsterWeightsAround(index));
    const template = MONSTER_TABLE[slot];

    const carries = drawChance(state, 'spawn', dropChance);
    const dropTemplate = drawWeighted(state, 'spawn', monsterWeights);

    state.monsters.push({
      id: nextId(state),
      name: template.name,
      emoji: template.emoji,
      pos,
      hp: template.hp,
      hpMax: template.hp,
      xp: template.xp,
      activation: template.activation,
      dead: false,
      drop: carries && dropTemplate ? makeItem(state, dropTemplate, pos) : null,
    });
  }

  // Items lying loose on the floor. Starts empty: everything enters this list
  // later, when a chest is opened or a monster dies.
  state.items = [];
}
