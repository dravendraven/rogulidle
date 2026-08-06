// Places the player, the shrine, the covers and the monsters on a generated
// map. Spec: docs/rogule-spec.md §2 "Ordem de povoamento".
//
// Placement order matters: each step removes the tile it used from the free
// pool, so changing the order changes every map.

import {
  COVER_COUNT, COVER_DIFFICULTY_SCALE, COVER_LOOT_RICHER_FAR, COVER_TABLE,
  ITEM_TABLE, MONSTER_COUNT, MONSTER_DIFFICULTY_SCALE, MONSTER_DROP_CHANCE,
  MONSTER_TABLE, MONSTER_WEIGHTS, PLAYER_HP, PLAYER_XP,
} from './balance.js';
import { drawChance, drawInt, drawPick, drawWeighted } from './rng.js';
import { findPath, playerPassable, posKey, walkablePositions } from './mapgen.js';

// Items are drawn with weight 1/value, so a high value is a RARE item.
//
// Two scarcity dials, both dividing an item's pick weight.
//
//   gearScarcity    everything that helps in a fight, weapons and armour
//   armourScarcity  armour only, applied on top
//
// Armour keeps its own dial because it does not merely help, it ELIMINATES:
// subtracting flat with a floor of zero means armour A makes every monster
// of xp <= A+1 completely harmless. Weapons only make fights shorter.
function itemWeights(gearScarcity = 1, armourScarcity = 1) {
  return ITEM_TABLE.map((item) => {
    const isGear = item.dmg || item.armour;
    const divisor = item.value
      * (isGear ? gearScarcity : 1)
      * (item.armour ? armourScarcity : 1);
    return [item, 1 / divisor];
  });
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
// cover / corpse holds nothing.
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

// `counts` overrides how many monsters and covers to place. Generation
// numbers are the other half of the difficulty dial, and a bot rule that
// does not pay on a sparse map may pay on a crowded one — so they have to
// be sweepable without editing balance.js.
export function populate(state, map, counts = {}) {
  const monsterCount = counts.monsters ?? MONSTER_COUNT;
  const coverCount = counts.covers ?? COVER_COUNT;
  // How far up the monster table the deepest tiles reach. The third dial of
  // difficulty, alongside how many monsters and how much loot.
  const difficultyScale = counts.difficultyScale ?? MONSTER_DIFFICULTY_SCALE;
  // Needed as its own dial: piling on monsters also piles on their drops, so
  // crowding the floor arms the player as well as threatening them. Without
  // this the win rate bottoms out around 13% however many you add.
  const dropChance = counts.dropChance ?? MONSTER_DROP_CHANCE;
  const weights = itemWeights(counts.gearScarcity ?? 1, counts.armourScarcity ?? 1);
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
    xp: PLAYER_XP,
    inventory: [],
    kills: [],
    regenCounter: 0,
    regenUsed: 0,
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

  // 4. Covers. Rooms only — never corridors.
  state.covers = [];
  for (let i = 0; i < coverCount; i++) {
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
    const emptiness = COVER_LOOT_RICHER_FAR ? 1 - depth : depth;
    const hasLoot = drawChance(state, 'spawn', 1 - COVER_DIFFICULTY_SCALE * emptiness);
    const template = drawWeighted(state, 'spawn', weights);

    const cover = drawPick(state, 'spawn', COVER_TABLE);
    state.covers.push({
      id: nextId(state),
      name: cover.name,
      emoji: cover.emoji,
      pos,
      drop: hasLoot ? makeItem(state, template, pos) : null,
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
    const dropTemplate = drawWeighted(state, 'spawn', weights);

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
      drop: carries ? makeItem(state, dropTemplate, pos) : null,
    });
  }

  // Items lying loose on the floor. Starts empty: everything enters this list
  // later, when a cover is opened or a monster dies.
  state.items = [];
}
