// Places the player, the shrine, the chests and the monsters on a generated
// map. Spec: docs/rogule-spec.md §2 "Ordem de povoamento".
//
// Placement order matters: each step removes the tile it used from the free
// pool, so changing the order changes every map.

import {
  CHEST_COUNT, CHEST_GUARD_RADIUS, CHEST_LOOT_CHANCE, CHEST_TABLE, EARLY_CHEST_QUALITY_BOOST,
  ITEM_TABLE, MONSTER_COUNT,
  MONSTER_DIFFICULTY_SCALE, MIN_ROSTER_FOR_SIDE, MONSTER_DROP_CHANCE, MONSTER_TABLE,
  MONSTER_WEIGHTS, PLAYER_HP, PLAYER_XP, SHRINE_DISTANCE_SHARE,
  SIDE_CHEST_BIAS, SIDE_ROOM_DEPTH_BONUS, SPINE_THREAT_SHARE, VAULT_BOSS,
  VAULT_BOSS_DROP, VAULT_CHEST_ITEMS, VAULT_LEVEL, WEAPON_AXE_MIN_TIER,
} from './balance.js';
import {
  draw, drawChance, drawInt, drawLogUniform, drawPick, drawWeighted,
} from './rng.js';
import { findPath, playerPassable, posKey, walkablePositions } from './mapgen.js';
import { classifyRooms } from './spine.js';
import { layoutOf, stampVault } from './vault.js';

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
//   chests   armour and health potions — gear AND sustain come from
//            exploring
//   monsters weapons only — the only permanent power in the game
//            (weaponDamage sums the inventory) comes from killing
//
// M26 — docs/backlog.md. Weapons MOVED here from chests, they were not
// added on top: chests dropped `weapon` before that item and do not any
// more.
//
// M27 — docs/backlog.md, "the other half of M26, deliberately split out."
// `potion` MOVED the other way, from monster to chest, for the opposite
// reason M26 kept weapon paired with it: the two moves push the bot's
// incentives in OPPOSITE directions on purpose. Weapons on creatures make
// killing pay; potions off creatures make killing pay LESS, since sustain
// no longer requires combat. Splitting them into separate items is what
// keeps each effect legible — shipped together the net would have been
// unreadable, which is the item's own stated reason for the order.
//
// Removing `potion` left `weapon` as monster's ONLY kind, which raises
// `shareEach` for weapon from 1/2 to 1/1 — a real side effect of this
// swap, not a null one, and `WEAPON_SCARCITY` was re-swept in this
// configuration (not assumed unchanged) to hold M26's own cumulative
// weapon-damage result rather than silently let it drift. See
// `docs/backlog.md` M27 for that number.
//
// Scarcity keeps the same meaning either way: 1 draw in S gives something,
// the rest come up empty.
//
// `quality` 0..1 tilts WHICH item comes out, and is how a deep chest pays
// better than one at the hero's feet — or, since M26, how a STRONGER
// CREATURE pays better than a weak one when killed. Within a kind the
// weight is `value^(2q - 1)`:
//
//   q = 0    value^-1  — 1/value, the shipped rule: strong items are rare
//   q = 0.5  value^0   — flat, every item in the kind equally likely
//   q = 1    value^+1  — inverted, the axe is now the COMMON outcome
//
// One expression, no thresholds, and q = 0 reproduces the old behaviour
// exactly — which matters, because it means quality can be switched off and
// the pool is provably unchanged.
//
// `exclude` — M26. A FILTER, not a tilt: named items are removed from the
// pool before weights are computed at all, so their own kind's mass falls
// entirely to whatever remains in it rather than merely underweighting
// them. This is how "axe nao dropa de criaturas fraca" becomes a
// mechanism check instead of a rare-but-possible outcome — quality alone
// can only make the axe UNLIKELY below some tier, never absent.
//
// Returns [[item | null, weight], ...]; null means this draw holds nothing.
// `allowEmpty` — M46. Monster drops keep the empty slot: scarcity is what
// decides whether a corpse leaves a weapon at all. CHESTS no longer use it,
// because whether a chest holds something is now one flat gate
// (`CHEST_LOOT_CHANCE`) and having a second, hidden one behind it is exactly
// the arrangement that made the real fill rate unreadable.
//
// So for chests the scarcity dials stop being a RATE and become a RATIO —
// at 1.32 / 1.32 they split armour and potion evenly, and moving one only
// tilts which of the two comes out.
export function itemWeights(scarcity = {}, source = 'chest', quality = 0, exclude = [], allowEmpty = true) {
  const kinds = source === 'monster' ? ['weapon'] : ['armour', 'potion'];
  const shareEach = 1 / kinds.length;
  const exponent = 2 * quality - 1;
  const tilt = (item) => Math.pow(item.value, exponent);

  const pool = ITEM_TABLE.filter((item) => kinds.includes(item.kind) && !exclude.includes(item.name));

  const kindTotals = new Map();
  for (const item of pool) {
    kindTotals.set(item.kind, (kindTotals.get(item.kind) || 0) + tilt(item));
  }

  const entries = pool.map((item) => {
    const shareOfKind = tilt(item) / kindTotals.get(item.kind);
    const mass = shareEach / (scarcity[item.kind] ?? 1);
    return [item, mass * shareOfKind];
  });

  if (!allowEmpty) return entries;
  const claimed = entries.reduce((sum, [, w]) => sum + w, 0);
  entries.push([null, Math.max(0, 1 - claimed)]);
  return entries;
}

// Exported for U6d — a starting-item slot needs an id from the same
// namespace everything else on the floor draws from, and duplicating the
// format ('e' + counter) elsewhere would be a second source of truth for
// something that already has one.
export function nextId(state) {
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
//
// Every combat-relevant field of ITEM_TABLE has to be listed here. A field
// added to the table and forgotten here is silently zero on anything found
// in the world, while the shop's copy — which hands the template straight
// to the wallet — keeps it: the same axe would then hit differently
// depending on where it came from. `dmgMin` shipped that way once.
function makeItem(state, template, pos) {
  return {
    id: nextId(state),
    name: template.name,
    emoji: template.emoji,
    pos,
    dmg: template.dmg || 0,
    dmgMin: template.dmgMin || 0,
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
  // `let` because the vault takes it to zero — see step 3c.
  let chestCount = counts.chests ?? CHEST_COUNT;
  // How far up the monster table the deepest tiles reach. The third dial of
  // difficulty, alongside how many monsters and how much loot.
  const difficultyScale = counts.difficultyScale ?? MONSTER_DIFFICULTY_SCALE;
  // What the floor's own ceiling means as a table INDEX rather than a 0..1
  // scale — a floor-level constant, not a per-cluster one, so it is
  // computed once here and reused by M13's floor and M14's guardian below,
  // rather than recomputed identically on every loop iteration.
  const ceilingIndex = Math.floor(difficultyScale * (MONSTER_TABLE.length - 1));
  // The tier BAND (see balance.js): the minimum tier as a share of the
  // floor's own ceiling index, and a signed number of whole table rows the
  // drawn slot may sit above (or, on floor 1, must sit below) the ceiling.
  // Both default to "no clamp" so a direct populate() call behaves like the
  // shallowest floor.
  const tierFloorShare = counts.tierFloorShare ?? 0;
  const tierSlack = counts.tierSlack ?? 0;
  const maxIndexOfBand = Math.min(MONSTER_TABLE.length - 1, ceilingIndex + tierSlack);
  // Needed as its own dial: piling on monsters also piles on their drops, so
  // crowding the floor arms the player as well as threatening them. Without
  // this the win rate bottoms out around 13% however many you add.
  const dropChance = counts.dropChance ?? MONSTER_DROP_CHANCE;
  // Floor 1 is the poorest floor under quality-by-depth (nowhere on it is
  // far from the entrance) at the exact moment it is the most dangerous.
  // Fades as 1/level, so it is strongest exactly where the opening is
  // hardest and essentially gone by the floors that were never the problem.
  const level = counts.level ?? 1;
  const earlyChestBoost = (counts.earlyChestQualityBoost ?? EARLY_CHEST_QUALITY_BOOST) / level;
  const scarcity = {
    weapon: counts.weaponScarcity,
    armour: counts.armourScarcity,
    potion: counts.potionScarcity,
  };
  // M26 — docs/backlog.md. No longer computed once: quality is driven by
  // the KILLED CREATURE's own tier, not by position, so it has to be
  // recomputed per drop from `template` inside `placeOne` below, using
  // `weaponWeightsFor`.
  const weaponAxeMinTier = counts.weaponAxeMinTier ?? WEAPON_AXE_MIN_TIER;
  // `template` is a live reference into MONSTER_TABLE (see the `slot`
  // computation below), so its own index IS its tier — no name lookup.
  const weaponWeightsFor = (template) => {
    const tier = MONSTER_TABLE.indexOf(template);
    const quality = tier / (MONSTER_TABLE.length - 1);
    const exclude = tier < weaponAxeMinTier ? ['axe'] : [];
    return itemWeights(scarcity, 'monster', quality, exclude);
  };

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

  // 1. Player, at one end of the longest walkable path between any pair of
  // room centres — docs/backlog.md M20, and the half of it that M23 keeps.
  // Never a corridor tile, and no `pickFree()` in the hero's placement.
  //
  // Kept deliberately, not just left alone: M23 only replaces step 3 below
  // (the SHRINE's placement). A hero dropped on a "random" room centre
  // measures statistically identical to the old pre-M20 `pickFree()`
  // reading (~27.9 tiles to the furthest room either way) — a corridor and
  // a central room cost the same because both are "typical" points, and
  // the furthest room from a typical point tracks the map's RADIUS, not
  // its diameter. Only a genuinely peripheral hero — one end of the
  // longest pair, same as M20 computed — pulls that ceiling up towards the
  // diameter, which is what leaves SHRINE_DISTANCE_SHARE below room to
  // land the shrine strictly between the pre-M20 and M20 levels rather
  // than reproducing pre-M20 exactly at every share.
  //
  // `map.rooms.length` is a handful (measured ~3-5 after M16), so an
  // O(rooms^2) pairwise `findPath` between centres is cheap.
  let bestPair = null;
  for (let i = 0; i < map.rooms.length; i++) {
    for (let j = i + 1; j < map.rooms.length; j++) {
      const a = map.rooms[i];
      const b = map.rooms[j];
      const path = findPath(a.center, b.center, passable);
      if (!path.length) continue;
      if (!bestPair || path.length > bestPair.length) bestPair = { a, b, length: path.length };
    }
  }

  // Fewer than two reachable rooms — a degenerate map, kept working the
  // old way rather than left to place nothing.
  const playerPos = bestPair ? bestPair.a.center : pickFree();
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
    // U3, docs/backlog.md — total xp value of every kill, independent of
    // `kills.length` (which stays a count, unchanged shape: combat.js's
    // per-module grants and the renderer both key off it).
    xpEarned: 0,
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

  // 3. Shrine — docs/backlog.md M23, replacing M20's "always `bestPair.b`,
  // the exact other end of the pair". That maximised the hero-shrine path
  // on purpose, and a room is spine whenever the mandatory path crosses
  // it — maximising the path IS maximising the spine share, the same
  // quantity measured twice, which is why M20 pushed spine share from
  // 0.82-0.89 to 0.93-0.97 against a 0.95 ceiling. Not a bug, so not fixed
  // by tuning that number — fixed by not asking for the extreme any more.
  //
  // Picks from the FAR TAIL of the hero's own distance distribution
  // instead: any room within SHRINE_DISTANCE_SHARE of the furthest one
  // reachable counts as "distant", and one of those is drawn at random —
  // still genuinely far, just not always THE single farthest point on the
  // map. `bestPair.b` is always exactly at 100% of that tail (proof: no
  // room can be further from `bestPair.a` than `bestPair.b`, or the pair
  // would not have been the global maximum), so SHRINE_DISTANCE_SHARE of
  // 1.0 reproduces M20 exactly; lower values widen the candidate pool.
  // Falls back to the furthest room if none clear the bar (small floors,
  // or a `furthestLength` of 0).
  const distanceThreshold = furthestLength
    * (counts.shrineDistanceShare ?? SHRINE_DISTANCE_SHARE);
  const distantRooms = roomPaths.filter((entry) => entry.path.length >= distanceThreshold);
  const shrineEntry = distantRooms.length
    ? distantRooms[drawInt(state, 'spawn', 0, distantRooms.length - 1)]
    : (roomPaths.length ? roomPaths[roomPaths.length - 1] : null);
  const shrinePos = shrineEntry ? shrineEntry.center : playerPos;
  takeFree(shrinePos);
  // The way OUT of the floor. Drawn as a hole rather than the original's
  // shrine gate: this dungeon is descended, not ascended out of, and a
  // torii read as somewhere to arrive at. The internal name stays `shrine`
  // — it is 130-odd references across the engine, the bot's belief and the
  // tests, and none of them are what a player sees.
  state.shrine = { id: nextId(state), emoji: '🕳️', pos: shrinePos };

  // 3b. Which rooms the hero cannot avoid on the way to the shrine.
  //
  // Purely a reading of the map the digger already made — nothing is dug
  // differently for it, so this cannot fail to produce a floor.
  let zones = classifyRooms(map, playerPos, shrinePos);
  state.spine = { path: zones.path, sideRooms: zones.side.length,
    spineRooms: zones.spine.length };

  // 3c. M43 — docs/project/candidates.md. The vault, stamped HERE and
  // nowhere else, and the position in this function is the whole design:
  //
  //   after the shrine   the hero->shrine path exists, so the vault's door
  //                      can be aimed at it — and the shrine is already
  //                      placed, so it can never land inside the vault.
  //                      Together those make the room a dead end off the
  //                      mandatory route, by construction rather than by a
  //                      dial.
  //   after `free`       the walkable pool was taken before these tiles
  //                      existed, so the ordinary roster and the ordinary
  //                      chests cannot spill into an authored room. Nothing
  //                      needs to exclude it; it was never in the pool.
  //
  // Re-classifying afterwards is not a patch and costs nothing: spine.js is
  // a read-only pass that consumes no randomness, so running it twice is
  // free and cannot desync a seed. Without it `zones.side` would predate
  // the vault and its occupants would come out marked spine.
  const vaultLevel = counts.vaultLevel ?? VAULT_LEVEL;
  state.vault = null;
  if (vaultLevel > 0 && level === vaultLevel) {
    state.vault = stampVault(map, zones.path);
    if (state.vault) {
      zones = classifyRooms(map, playerPos, shrinePos);
      state.spine = { path: zones.path, sideRooms: zones.side.length,
        spineRooms: zones.spine.length };

      // THE VAULT FLOOR PLACES NO ORDINARY CHESTS. Its whole reward is in
      // the room, behind the creature — which is what makes walking past
      // cost something. Measured before this: with the floor still paying
      // six chests elsewhere, skipping the vault was free and the room was
      // a bonus nobody needed to take.
      //
      // Zeroed HERE rather than in the floor plan, and only once the stamp
      // has actually succeeded: on the ~1 seed in 150 with nowhere to put a
      // vault, the floor keeps its own chests rather than coming out with
      // no loot at all.
      chestCount = 0;
    }
  }

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
    // The vault is authored, not rolled — its risk and its reward are both
    // decided in balance.js. Skipping it here is not a cosmetic exclusion:
    // this loop draws TWICE per side room, so letting the vault through
    // would spend two spawn draws and shift every roll after it on the
    // floor. The "consumes no randomness" test guards exactly this.
    if (room.vault) continue;
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
    // M46 — FLAT. One gate, one meaning: a chest holds something this often,
    // wherever it sits. It used to sweep 10%..100% by path length and then
    // lose another quarter to the scarcity draw below, so the real rate was
    // a product nobody could read. See balance.js for what that cost.
    const hasLoot = drawChance(state, 'spawn', counts.chestLootChance ?? CHEST_LOOT_CHANCE);
    // Depth buys BETTER loot, not just more of it. Without this a deep chest
    // was merely likelier to hold something, and what it held was drawn from
    // the same pool as the one by the front door — so risk bought quantity
    // and never quality. M19 adds `earlyChestBoost` on top — WHICH item a
    // chest holds, same as depth; whether it holds one at all is untouched.
    //
    // M26/M27 NOTE: `quality` only has anything to bite on when a kind
    // holds more than one item. Chests now draw two kinds — `armour`
    // (`shield` alone) and, since M27, `potion` (`health` alone) — but
    // every kind here still has exactly one member, so the tilt remains a
    // no-op for chests by construction. Not special-cased away: this stays
    // the same expression a chest with a real multi-item kind would use,
    // and it would start doing something the day `ITEM_TABLE` grows a
    // second armour or potion.
    const quality = Math.min(1, depth + earlyChestBoost);
    // `allowEmpty: false` — `hasLoot` above already decided whether this
    // chest holds anything, so this draw only picks WHICH kind.
    const template = drawWeighted(state, 'spawn', itemWeights(scarcity, 'chest', quality, [], false));

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
    // M26 — the weapon half of this pool (and whether `axe` is even in it)
    // depends on THIS creature's own tier, so the weights are rebuilt per
    // monster rather than shared across the whole floor.
    const dropTemplate = drawWeighted(state, 'spawn', weaponWeightsFor(template));

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
      activation: template.activation,
      // M44 — unset on every MONSTER_TABLE row, so this is 1 for everything
      // the tiers produce and the shipped bestiary is unchanged.
      speed: template.speed ?? 1,
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
    // The band clamps the DRAWN slot, never the centre — the ±2 spread
    // reaches past any clamped centre in both directions (measured mistake,
    // twice; see balance.js "the tier band"). `Math.max(minIndex, ...)` is
    // the same guard the closed form in difficulty.js uses, so the two
    // cannot disagree about what the band means.
    const minIndex = Math.floor(tierFloorShare * ceilingIndex);
    const maxIndex = Math.max(minIndex, maxIndexOfBand);
    const slot = Math.min(maxIndex, Math.max(minIndex, rawSlot));
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
    victim.activation = template.activation;
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
      // Includes the guardian's OWN current index, not just everyone
      // else's — M3's rare reskin can land on the very monster that ends
      // up chosen as guardian, and without this the max-of-OTHERS below
      // would silently downgrade it back to the ordinary ceiling.
      const maxOtherIndex = state.monsters
        .reduce((max, m) => Math.max(max, MONSTER_TABLE.findIndex((t) => t.name === m.name)), 0);
      const guardIndex = Math.min(MONSTER_TABLE.length - 1, Math.max(ceilingIndex, maxOtherIndex));
      const template = MONSTER_TABLE[guardIndex];
      guardian.name = template.name;
      guardian.emoji = template.emoji;
      guardian.hp = template.hp;
      guardian.hpMax = template.hp;
      guardian.xp = template.xp;
      guardian.activation = template.activation;
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

  // 9. M43 — the vault's occupant, placed LAST and for a reason at every
  // earlier step: M3's rare reskin picks a random victim and would turn the
  // Butcher into a t-rex, M14 can relocate the nearest creature to the
  // shrine, and M15 can drag one off to guard a chest. None of them can
  // reach a creature that does not exist yet. Nothing here draws.
  //
  // It is not a MONSTER_TABLE row and never becomes one — see balance.js.
  // `side` is READ from the zones rather than asserted, so if the room ever
  // stopped being a dead end this would say so instead of hiding it.
  if (state.vault) {
    // V7a — read from the door, not from the rectangle: the occupant stands
    // at the BACK of the room so the chests by the entrance sit outside its
    // reach, which is what turns one all-or-nothing bet into a graded room.
    const layout = layoutOf(state.vault.room, state.vault.door);
    state.vault.layout = layout;
    const pos = layout.boss.slice();
    const boss = counts.vaultBoss ?? VAULT_BOSS;
    const dropName = counts.vaultBossDrop ?? VAULT_BOSS_DROP;
    const template = ITEM_TABLE.find((item) => item.name === dropName);

    const butcher = {
      id: nextId(state),
      name: boss.name,
      emoji: boss.emoji,
      pos,
      hp: boss.hp,
      hpMax: boss.hp,
      xp: boss.xp,
      activation: boss.activation,
      // M44 — the one creature in the game that acts more than once a turn.
      speed: boss.speed ?? 1,
      dead: false,
      edge: edgeAt(pos),
      side: zones.isSide(pos),
      // The only guaranteed drop in the game — no `dropChance` roll, which
      // is what makes the reward worth the walk rather than a second
      // gamble stacked on the first.
      drop: template ? makeItem(state, template, pos) : null,
      // Read by spineShare() and threatMass(): refusable mass is not part
      // of the floor's own pressure and must not be counted into it.
      vault: true,
    };
    state.monsters.push(butcher);
    state.vault.boss = butcher;

    // Its chests, extra to the floor's own and authored the same way. The
    // chest kind is read off CHEST_TABLE rather than drawn from it: the
    // table has one row, so a `drawPick` here would spend a stream value to
    // choose between one option.
    //
    // NOT counted in the `chestCount` the bot is granted (rules.md §7), and
    // that omission is the design. Granted, the bot would keep exploring
    // until it had found them and the detour would stop being optional; left
    // out, it meets the room only because the door is on its way, and then
    // prices the guard like any other side room's.
    const chestKind = CHEST_TABLE[0];
    const wanted = counts.vaultChestItems ?? VAULT_CHEST_ITEMS;
    const slots = layout.chests;

    state.vault.chests = [];
    slots.forEach((slot, i) => {
      const name = wanted[i];
      if (!name) return;
      const item = ITEM_TABLE.find((entry) => entry.name === name);
      const chest = {
        id: nextId(state),
        name: chestKind.name,
        emoji: chestKind.emoji,
        pos: slot,
        side: zones.isSide(slot),
        edge: edgeAt(slot),
        drop: item ? makeItem(state, item, slot) : null,
        vault: true,
      };
      state.chests.push(chest);
      state.vault.chests.push(chest);
    });
  }

  // Items lying loose on the floor. Starts empty: everything enters this list
  // later, when a chest is opened or a monster dies.
  state.items = [];
}
