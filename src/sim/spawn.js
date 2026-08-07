// Places the player, the shrine, the chests and the monsters on a generated
// map. Spec: docs/rogule-spec.md §2 "Ordem de povoamento".
//
// Placement order matters: each step removes the tile it used from the free
// pool, so changing the order changes every map.

import {
  CHEST_COUNT, CHEST_DIFFICULTY_SCALE, CHEST_LOOT_RICHER_FAR, CHEST_QUALITY_BY_DEPTH,
  CHEST_TABLE, ITEM_TABLE, MONSTER_COUNT, MONSTER_DIFFICULTY_SCALE,
  MIN_ROSTER_FOR_SIDE, MONSTER_DROP_CHANCE, MONSTER_TABLE, MONSTER_WEIGHTS,
  PLAYER_HP, PLAYER_XP, SIDE_ACTIVATION_CAP, SIDE_CHEST_BIAS,
  SIDE_ROOM_DEPTH_BONUS, SPINE_THREAT_SHARE,
} from './balance.js';
import {
  draw, drawChance, drawInt, drawLogUniform, drawPick, drawWeighted,
} from './rng.js';
import { findPath, playerPassable, posKey, walkablePositions } from './mapgen.js';
import { classifyRooms } from './spine.js';

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
// `quality` 0..1 tilts WHICH item comes out, and is how a deep chest pays
// better than one at the hero's feet. Within a kind the weight is
// `value^(2q - 1)`:
//
//   q = 0    value^-1  — 1/value, the shipped rule: strong items are rare
//   q = 0.5  value^0   — flat, every item in the kind equally likely
//   q = 1    value^+1  — inverted, the axe is now the COMMON outcome
//
// One expression, no thresholds, and q = 0 reproduces the old behaviour
// exactly — which matters, because it means quality can be switched off and
// the pool is provably unchanged.
//
// Returns [[item | null, weight], ...]; null means this draw holds nothing.
export function itemWeights(scarcity = {}, source = 'chest', quality = 0) {
  const kinds = source === 'monster' ? ['potion'] : ['weapon', 'armour'];
  const shareEach = 1 / kinds.length;
  const exponent = 2 * quality - 1;
  const tilt = (item) => Math.pow(item.value, exponent);

  const kindTotals = new Map();
  for (const item of ITEM_TABLE) {
    if (!kinds.includes(item.kind)) continue;
    kindTotals.set(item.kind, (kindTotals.get(item.kind) || 0) + tilt(item));
  }

  const entries = ITEM_TABLE
    .filter((item) => kinds.includes(item.kind))
    .map((item) => {
      const shareOfKind = tilt(item) / kindTotals.get(item.kind);
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
  // ONE roll, shared by the whole floor, and that is the entire point.
  //
  // Clearing cost is a sum over creatures, so with independent draws it
  // converges: CV = CV_c / sqrt(N). Measured, CV x sqrt(N) was flat at ~1.2
  // from floor 1 to 10 — the law holding exactly — which means deep floors,
  // where the run's climax lives, are the most predictable ones. Nothing
  // independent can fix that; only a roll the whole floor shares can, since
  // then cost is N x mu(F) and no sqrt(N) survives.
  //
  // On the COUNT rather than on strength because cost is linear in count, so
  // a mean-1 multiplier cannot move the average difficulty — the one thing
  // that was calibrated and must not move.
  const monsterCount = Math.max(1, Math.round(
    (counts.monsters ?? MONSTER_COUNT)
    * drawLogUniform(state, 'spawn', counts.monsterSpread ?? 0),
  ));
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
  const monsterWeights = itemWeights(scarcity, 'monster');

  // Map design (docs/map-design.md). All three default to the shipped
  // values in balance.js and can be swept from the lab page.
  const spineShare = counts.spineThreatShare ?? SPINE_THREAT_SHARE;
  const sideBonus = counts.sideRoomDepthBonus ?? SIDE_ROOM_DEPTH_BONUS;
  const sideChestBias = counts.sideChestBias ?? SIDE_CHEST_BIAS;

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

  // 3b. Which rooms the hero cannot avoid on the way to the shrine.
  //
  // Purely a reading of the map the digger already made — nothing is dug
  // differently for it, so this cannot fail to produce a floor.
  const zones = classifyRooms(map, playerPos, shrinePos);
  state.spine = { path: zones.path, sideRooms: zones.side.length,
    spineRooms: zones.spine.length };

  // Every side room rolls its risk and its reward SEPARATELY.
  //
  // This is the whole reason side rooms are a decision at all. With one
  // shared bonus, risk and reward were perfectly correlated: every detour
  // offered the same ratio, and a gamble with a fixed favourable ratio is
  // not a gamble, it is a free lunch that is always correct to take.
  // Measured that way, forbidding the detour, requiring it, and leaving it
  // optional all produced identical dungeons.
  //
  // Two independent draws over [0, 2 × bonus] keep the AVERAGE side room
  // exactly where it was, while making individual ones range from a den of
  // ogres guarding a dagger to a lone bat sitting on an axe. Some are worth
  // it and some are not, and which is which differs per room and per floor.
  const sideRolls = new Map();
  for (const room of zones.side) {
    sideRolls.set(room, {
      risk: draw(state, 'spawn') * 2 * sideBonus,
      reward: draw(state, 'spawn') * 2 * sideBonus,
    });
  }

  // Depth drives both the monster tier and the chest quality, so it is read
  // twice with different bonuses. Spine ground gets neither.
  const depthAt = (pos, which) => {
    const depth = posToDifficulty(pos, playerPos, passable, furthestLength);
    const room = zones.roomOf(pos);
    const roll = room ? sideRolls.get(room) : null;
    return Math.min(1, depth + (roll ? roll[which] : 0));
  };

  // How good a bargain this room is: positive means the reward roll beat the
  // risk roll. Recorded on everything placed in it so a measurement can ask
  // the only question that matters — does the bot take the good gambles and
  // leave the bad ones? Zero on the spine, which is not a gamble at all.
  const edgeAt = (pos) => {
    const room = zones.roomOf(pos);
    const roll = room ? sideRolls.get(room) : null;
    return roll ? +(roll.reward - roll.risk).toFixed(3) : 0;
  };

  // 4. Chests. Rooms only — never corridors.
  //
  // Side rooms are BIASED for, not reserved: a detour nobody is paid to make
  // is not a choice, it is scenery. The bias is a weight rather than a quota
  // so a map with no side rooms at all still places every chest.
  state.chests = [];
  const chestRoomWeights = roomPaths.map((entry) => [
    entry,
    zones.side.includes(entry.room) ? sideChestBias : 1,
  ]);

  for (let i = 0; i < chestCount; i++) {
    if (!roomPaths.length) break;
    const entry = drawWeighted(state, 'spawn', chestRoomWeights);
    const roomFree = [];
    for (let x = entry.room.x1; x <= entry.room.x2; x++) {
      for (let y = entry.room.y1; y <= entry.room.y2; y++) {
        if (free.has(x + ',' + y)) roomFree.push([x, y]);
      }
    }
    if (!roomFree.length) continue;

    const pos = roomFree[drawInt(state, 'spawn', 0, roomFree.length - 1)];
    takeFree(pos);

    const depth = depthAt(pos, 'reward');
    // Sweeps 10%..100% across the map; the flag decides which end is rich.
    const emptiness = CHEST_LOOT_RICHER_FAR ? 1 - depth : depth;
    const hasLoot = drawChance(state, 'spawn', 1 - CHEST_DIFFICULTY_SCALE * emptiness);
    // Depth buys BETTER loot, not just more of it. Without this a deep chest
    // was merely likelier to hold something, and what it held was drawn from
    // the same pool as the one by the front door — so risk bought quantity
    // and never quality.
    const template = drawWeighted(state, 'spawn',
      itemWeights(scarcity, 'chest', CHEST_QUALITY_BY_DEPTH ? depth : 0));

    const chest = drawPick(state, 'spawn', CHEST_TABLE);
    state.chests.push({
      id: nextId(state),
      name: chest.name,
      emoji: chest.emoji,
      pos,
      side: zones.isSide(pos),
      edge: edgeAt(pos),
      // `template` is null when the scarcity dials sent this draw to the
      // empty slot, which is the replacement for Rogule's junk collectibles.
      drop: hasLoot && template ? makeItem(state, template, pos) : null,
    });
  }

  // 5. Monsters, split between the mandatory route and the side rooms.
  //
  // The split is by MASS, not headcount — cost tracks hp × (xp − 1), so a
  // floor can put 70% of its bodies on the spine and still hide the
  // dangerous half in a side room. Greedy: each monster goes wherever the
  // running share is furthest from target, which converges without needing
  // to know the total in advance.
  //
  // Combined with the side depth bonus this produces the shape asked for by
  // itself — side rooms fill their smaller mass budget with fewer, stronger
  // creatures, because each one weighs more.
  // Below this the split cannot be honoured and should not be attempted.
  // On a two-creature floor a single side monster is already half the mass,
  // so aiming for 30% overshoots to 37% — measured 68% and 63% on floors 1
  // and 3, under the 70% the design calls for. A lone creature behind a
  // detour is not a gamble anyway; it is one fight in a side room.
  const sideTarget = monsterCount >= MIN_ROSTER_FOR_SIDE ? 1 - spineShare : 0;
  let spineMass = 0;
  let sideMass = 0;

  const freeIn = (wantSide) => {
    const out = [];
    for (const pos of free.values()) {
      if (zones.isSide(pos) === wantSide) out.push(pos);
    }
    return out;
  };

  state.monsters = [];
  for (let i = 0; i < monsterCount; i++) {
    if (!free.size) break;

    const running = spineMass + sideMass;
    const wantSide = running > 0
      ? (sideMass / running) < sideTarget
      : sideTarget >= 0.5;

    // Fall back to the other zone rather than dropping the monster: a map
    // with no side rooms must still receive its full roster.
    let pool = freeIn(wantSide);
    if (!pool.length) pool = freeIn(!wantSide);
    if (!pool.length) break;

    const pos = pool[drawInt(state, 'spawn', 0, pool.length - 1)];
    takeFree(pos);

    const difficulty = Math.min(1, depthAt(pos, 'risk') * difficultyScale);
    const index = Math.floor(difficulty * (MONSTER_TABLE.length - 1));
    const slot = drawWeighted(state, 'spawn', monsterWeightsAround(index));
    const template = MONSTER_TABLE[slot];

    const carries = drawChance(state, 'spawn', dropChance);
    const dropTemplate = drawWeighted(state, 'spawn', monsterWeights);

    const side = zones.isSide(pos);
    const mass = template.hp * Math.max(0, template.xp - 1);
    if (side) sideMass += mass; else spineMass += mass;

    state.monsters.push({
      id: nextId(state),
      name: template.name,
      emoji: template.emoji,
      pos,
      hp: template.hp,
      hpMax: template.hp,
      xp: template.xp,
      // A guard guards: capped so the room does not reach out and grab the
      // bot from across the floor. See SIDE_ACTIVATION_CAP.
      activation: side
        ? Math.min(template.activation, counts.sideActivationCap ?? SIDE_ACTIVATION_CAP)
        : template.activation,
      dead: false,
      edge: edgeAt(pos),
      // Which side of the bargain this creature is on. Read by spineShare()
      // to check the floor came out at the ratio that was asked for, and by
      // the bot to tell a mandatory fight from an optional one.
      side,
      drop: carries && dropTemplate ? makeItem(state, dropTemplate, pos) : null,
    });
  }

  // Items lying loose on the floor. Starts empty: everything enters this list
  // later, when a chest is opened or a monster dies.
  state.items = [];
}
