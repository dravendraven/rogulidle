// Places the player, the shrine, the chests and the monsters on a generated
// map. Spec: docs/rogule-spec.md §2 "Ordem de povoamento".
//
// Placement order matters: each step removes the tile it used from the free
// pool, so changing the order changes every map.

import {
  CHEST_COUNT, CHEST_DIFFICULTY_SCALE, CHEST_GUARD_RADIUS, CHEST_LOOT_RICHER_FAR,
  CHEST_QUALITY_BY_DEPTH, CHEST_TABLE, ITEM_TABLE, MONSTER_COUNT, MONSTER_DIFFICULTY_SCALE,
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
//
// Exported so difficulty.js can compute an EXACT expected mass from the same
// spread this file actually draws from (M11) — one source of truth for what
// "around index N" means, rather than a second copy that could drift.
export function monsterWeightsAround(index) {
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
  // What the floor's own ceiling means as a table INDEX rather than a 0..1
  // scale — a floor-level constant, not a per-cluster one, so it is
  // computed once here and reused by M13's floor and M14's guardian below,
  // rather than recomputed identically on every loop iteration.
  const ceilingIndex = Math.floor(difficultyScale * (MONSTER_TABLE.length - 1));
  // M13 — docs/backlog.md. Share of the ceiling's own index the tier is
  // never allowed to fall below. Zero by default (unset callers, direct
  // populate() calls in older tooling) so this is a pure opt-in dial.
  const tierFloorShare = counts.tierFloorShare ?? 0;
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

  // 5. Monsters, split between the mandatory route and the side rooms, and
  // — M7, docs/backlog.md — placed in CLUSTERS rather than independently.
  //
  // The zone split is by MASS, not headcount — cost tracks hp × (xp − 1), so
  // a floor can put 70% of its bodies on the spine and still hide the
  // dangerous half in a side room. Greedy: each cluster goes wherever the
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

  // Breadth-first from `anchor`, nearest tiles first, yielding only tiles
  // still free AND in the same zone as the anchor — a cluster does not
  // spill across the spine/side line even when the walk passes through it.
  // `clusterSize` 1 never advances past the anchor itself, so it costs
  // nothing extra to have this run unconditionally.
  const clusterAround = (anchor, wantSide, limit) => {
    const order = [];
    const seen = new Set([posKey(anchor)]);
    const queue = [anchor];
    let head = 0;
    while (head < queue.length && order.length < limit) {
      const pos = queue[head++];
      if (free.has(posKey(pos)) && zones.isSide(pos) === wantSide) order.push(pos);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const next = [pos[0] + dx, pos[1] + dy];
        const key = posKey(next);
        if (seen.has(key) || !passable(next[0], next[1])) continue;
        seen.add(key);
        queue.push(next);
      }
    }
    return order;
  };

  // How many creatures share one placement draw. 1 means every monster
  // still draws its own independent anchor — the loop below then places
  // exactly one tile per cluster, identically to before this item existed.
  const clusterSize = Math.max(1, counts.clusterSize ?? 1);

  // `template` is passed in rather than rolled here — see the call site.
  // One tier draw per CLUSTER, not per monster, is the actual mechanism
  // grouping exists for: three independent draws around a shared index
  // still leave three points of variance to cancel against each other; one
  // draw applied to all three leaves none. Loot (carries/dropTemplate)
  // stays per-monster — the budget this item spends is about DIFFICULTY,
  // not about how much loot a cluster happens to carry.
  const placeOne = (pos, template) => {
    takeFree(pos);

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
  };

  // Decided fresh every time it is asked — used both between clusters and,
  // as of M10, within one, so a cluster large enough to hold the whole
  // roster cannot single-handedly decide the floor's split.
  const quotaWantsSide = () => {
    const running = spineMass + sideMass;
    return running > 0 ? (sideMass / running) < sideTarget : sideTarget >= 0.5;
  };

  state.monsters = [];
  while (state.monsters.length < monsterCount) {
    if (!free.size) break;

    // Decided once per CLUSTER-START, not per monster — at clusterSize 1
    // this is the same thing, since a cluster of one member is exactly one
    // monster.
    const wantSide = quotaWantsSide();

    // Fall back to the other zone rather than dropping the cluster: a map
    // with no side rooms must still receive its full roster.
    let pool = freeIn(wantSide);
    let actualSide = wantSide;
    if (!pool.length) { pool = freeIn(!wantSide); actualSide = !wantSide; }
    if (!pool.length) break;

    const anchor = pool[drawInt(state, 'spawn', 0, pool.length - 1)];
    const remaining = monsterCount - state.monsters.length;
    const positions = clusterAround(anchor, actualSide, Math.min(clusterSize, remaining));
    // The anchor is always free and in its own zone, so this can only be
    // empty if `remaining` is 0 — guarded by the while condition above.

    // ONE tier draw for the whole cluster, from the anchor's depth — see
    // placeOne for why. At clusterSize 1 this is the same single draw the
    // original per-monster code made, at the same position, so nothing
    // changes in that case.
    const difficulty = Math.min(1, depthAt(anchor, 'risk') * difficultyScale);
    const index = Math.floor(difficulty * (MONSTER_TABLE.length - 1));
    const rawSlot = drawWeighted(state, 'spawn', monsterWeightsAround(index));
    // M13 — docs/backlog.md. Within-map position used to vary the tier
    // between 0 (a rat, every floor, forever) and the floor's own ceiling.
    // A rat is scenery — xp 1 means its damage roll is exactly `0..0` — so
    // a tile near the entrance kept rolling one on floor 10 same as floor 1.
    // `tierFloorShare` raises the FLOOR of the DRAWN slot, as a share of the
    // ceiling's own index, so it can never exceed the ceiling. Clamping the
    // final slot rather than the centre index is what actually excludes a
    // rat once the floor is high enough — the centre index alone is not
    // enough, since `monsterWeightsAround`'s own -2 spread still reaches
    // down to slot 0 from a centre as high as 2.
    const minIndex = Math.floor(tierFloorShare * ceilingIndex);
    const slot = Math.max(minIndex, rawSlot);
    const template = MONSTER_TABLE[slot];

    // M10 — docs/backlog.md. A cluster big enough to hold the whole roster
    // (small floor, large CLUSTER_SIZE) used to place every member before
    // the quota ever got a second chance to correct itself, so the first
    // zone decision decided the entire floor. Re-checking the quota after
    // EACH member fixes that without touching the shared tier or the BFS
    // order: the first member always lands (it is what `actualSide` was
    // chosen for), but the rest keep coming only while the quota still
    // wants this zone. As soon as it would rather have the next member in
    // the other zone, the remaining positions are abandoned — the next
    // loop iteration re-decides the zone fresh and starts a new cluster for
    // whatever remains. No extra draw: this is the same arithmetic
    // `quotaWantsSide` above, just re-run per member instead of once.
    let placedInThisCluster = 0;
    for (const pos of positions) {
      if (placedInThisCluster > 0 && quotaWantsSide() !== actualSide) break;
      placeOne(pos, template);
      placedInThisCluster++;
    }
  }

  // 6. M3 — docs/backlog.md, "the gap M7 left". A RARE, INDEPENDENT roll,
  // separate from the per-cluster tier draw above, that can reach the
  // table's true top regardless of local depth — the per-cluster draw
  // never does, since `difficultyScale` stays well under 1.0 through
  // floor 10 even on the M7-adopted ramp (see `saturatedAt`).
  //
  // Guarded on `outOfDepthChance > 0` so the flag-off path (chance always
  // 0) draws nothing extra: `drawChance(state, 'spawn', 0)` would still
  // consume a stream value even though it can never fire, which would
  // perturb every draw after it for no reason.
  const outOfDepthChance = counts.outOfDepthChance ?? 0;
  if (outOfDepthChance > 0 && state.monsters.length
      && drawChance(state, 'spawn', outOfDepthChance)) {
    const victim = state.monsters[drawInt(state, 'spawn', 0, state.monsters.length - 1)];
    const slot = drawWeighted(state, 'spawn', monsterWeightsAround(MONSTER_TABLE.length - 1));
    const template = MONSTER_TABLE[slot];
    // Reskins an already-placed monster in place — same roster size, same
    // position, same drop — rather than adding a body, so the median floor
    // (count, chests, mass split) is untouched and only the rare victim's
    // OWN blow gets stronger.
    victim.name = template.name;
    victim.emoji = template.emoji;
    victim.hp = template.hp;
    victim.hpMax = template.hp;
    victim.xp = template.xp;
    victim.activation = victim.side
      ? Math.min(template.activation, counts.sideActivationCap ?? SIDE_ACTIVATION_CAP)
      : template.activation;
  }

  // 7. M14 — docs/backlog.md. One creature guards the shrine, adjacent to
  // it, at or above every other creature on the floor. No flag — structural,
  // ships on. Runs AFTER the M3 reskin above so "at or above every other
  // creature" is checked against what the floor actually ended up holding,
  // not assumed from the ceiling alone (M3 can push one monster past it).
  //
  // Tracked outside the block so M15 below can leave this one alone —
  // otherwise "guard the nearest chest" could relocate the shrine's own
  // guardian away from the shrine.
  let shrineGuardian = null;
  if (state.monsters.length) {
    const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dy]) => [state.shrine.pos[0] + dx, state.shrine.pos[1] + dy])
      .filter((pos) => passable(pos[0], pos[1]));

    // Prefer a monster already standing next to the shrine — nothing to
    // relocate. Otherwise move the nearest one to a free neighbouring tile
    // rather than adding a body, so the roster size (and the budget it
    // spends) does not move.
    const alreadyAdjacent = state.monsters.filter((m) => neighbours
      .some((pos) => pos[0] === m.pos[0] && pos[1] === m.pos[1]));
    let guardian = alreadyAdjacent[0];

    // EXACTLY one — a roster large enough (M12) can otherwise place more
    // than one cluster member next to the shrine by chance. Move every
    // extra to any other free tile rather than leaving a second guard the
    // spec did not ask for.
    for (let i = 1; i < alreadyAdjacent.length; i++) {
      const extra = alreadyAdjacent[i];
      const elsewhere = [...free.values()].find((pos) => !neighbours
        .some((n) => n[0] === pos[0] && n[1] === pos[1]));
      if (!elsewhere) continue;
      free.set(posKey(extra.pos), extra.pos);
      free.delete(posKey(elsewhere));
      extra.pos = elsewhere;
      extra.side = zones.isSide(elsewhere);
      extra.edge = edgeAt(elsewhere);
    }

    if (!guardian) {
      const target = neighbours.find((pos) => free.has(posKey(pos)));
      if (target) {
        guardian = state.monsters.reduce((closest, m) => {
          const d = Math.abs(m.pos[0] - target[0]) + Math.abs(m.pos[1] - target[1]);
          return !closest || d < closest.d ? { m, d } : closest;
        }, null).m;
        free.set(posKey(guardian.pos), guardian.pos);
        free.delete(posKey(target));
        guardian.pos = target;
        guardian.side = zones.isSide(target);
        guardian.edge = edgeAt(target);
      }
      // No free neighbour at all (shrine boxed in by chests/geometry) — rare
      // enough on a real map that skipping this floor's guardian rather than
      // forcing a tile conflict is the safer failure mode.
    }

    if (guardian) {
      const maxOtherIndex = state.monsters
        .filter((m) => m !== guardian)
        .reduce((max, m) => Math.max(max, MONSTER_TABLE.findIndex((t) => t.name === m.name)), 0);
      const guardIndex = Math.min(MONSTER_TABLE.length - 1, Math.max(ceilingIndex, maxOtherIndex));
      const template = MONSTER_TABLE[guardIndex];
      guardian.name = template.name;
      guardian.emoji = template.emoji;
      guardian.hp = template.hp;
      guardian.hpMax = template.hp;
      guardian.xp = template.xp;
      guardian.activation = guardian.side
        ? Math.min(template.activation, counts.sideActivationCap ?? SIDE_ACTIVATION_CAP)
        : template.activation;
      shrineGuardian = guardian;
    }
  }

  // 8. M15 — docs/backlog.md. Every chest gets a creature within a short
  // radius, spine included. `SIDE_CHEST_BIAS` already crowds most chests
  // into side rooms, which the ordinary placement loop already guards —
  // this only has real work to do on the spine, where nothing else
  // guarantees a nearby creature. Reuses the roster (relocates the nearest
  // monster) rather than adding one — the budget is M12's, not this item's.
  const chestGuardRadius = counts.chestGuardRadius ?? CHEST_GUARD_RADIUS;
  if (state.monsters.length) {
    // Nearest-first BFS from `origin`, stopping at `limit` tiles out —
    // shared by the "is anyone already close enough" check and the
    // "find somewhere free to put one" search below, so both agree on
    // exactly what "within radius" means.
    const withinRadius = (origin, limit) => {
      const seen = new Set([posKey(origin)]);
      const out = [origin];
      let frontier = [origin];
      for (let d = 0; d < limit && frontier.length; d++) {
        const next = [];
        for (const pos of frontier) {
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const n = [pos[0] + dx, pos[1] + dy];
            const key = posKey(n);
            if (seen.has(key) || !passable(n[0], n[1])) continue;
            seen.add(key);
            out.push(n);
            next.push(n);
          }
        }
        frontier = next;
      }
      return out;
    };

    for (const chest of state.chests) {
      const nearby = withinRadius(chest.pos, chestGuardRadius);
      const nearbySet = new Set(nearby.map(posKey));
      const hasGuard = state.monsters.some((m) => nearbySet.has(posKey(m.pos)));
      if (hasGuard) continue;

      // Never cross the spine/side line to guard a chest — that line is
      // what "small floors put everything on the spine" and the M10 quota
      // are for, and this item does not get to spend that budget. A target
      // tile has to be in the CHEST's own zone, and the monster moved there
      // has to already be FROM that zone; if neither exists, the chest
      // stays unguarded rather than forcing a zone crossing. Also never the
      // shrine's own guardian (M14) — this item does not get to reassign it.
      const chestSide = zones.isSide(chest.pos);
      const target = nearby.find((pos) => free.has(posKey(pos)) && zones.isSide(pos) === chestSide);
      if (!target) continue;

      const candidates = state.monsters.filter((m) => m.side === chestSide && m !== shrineGuardian);
      if (!candidates.length) continue;
      const nearest = candidates.reduce((closest, m) => {
        const d = Math.abs(m.pos[0] - chest.pos[0]) + Math.abs(m.pos[1] - chest.pos[1]);
        return !closest || d < closest.d ? { m, d } : closest;
      }, null).m;

      free.set(posKey(nearest.pos), nearest.pos);
      free.delete(posKey(target));
      nearest.pos = target;
      nearest.edge = edgeAt(target);
      // side unchanged by construction — target and monster share a zone.
    }
  }

  // Items lying loose on the floor. Starts empty: everything enters this list
  // later, when a chest is opened or a monster dies.
  state.items = [];
}
