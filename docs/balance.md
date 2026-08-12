# Balance — every tuning value, in one table

**The single source of truth for current values.** Change a dial, change its
row here in the same commit. Prose anywhere else never restates a value —
that is how the old 2,000-line version of this file rotted.

History — why a dial has the value it has, what was swept, what was
rejected — lives in `docs/project/decisions.md` and in git. Not here.

## The map, by the owner's six questions

| question | dial | value | one sentence |
|---|---|---|---|
| how many creatures | `MONSTERS_BASE` | 4 | creatures on floor 1 |
| | `MONSTER_GROWTH` | 1.0801 | count multiplies by this per floor (lands floor 10 at 8) |
| how threatening the average one | `MONSTER_STRENGTH` | 0.26 | how far up the table floor 1's deepest corner reaches (0..1) |
| | `STRENGTH_GROWTH` | 1.1452 | that ceiling multiplies by this per floor |
| how much that threat varies | `TIER_FLOOR_PER_LEVEL` / `_CAP` | 0.08 / 0.5 | the band's minimum tier rises with depth, as a share of the floor's own ceiling |
| | `TIER_SLACK_PER_LEVEL` / `_CAP` | 0.08 / 0.5 | whole table rows the drawn slot may sit above the ceiling (0 shallow, 1 from floor 8) |
| | `EARLY_TIER_CUT` | 1 | whole rows trimmed off floor 1's ceiling, floor 1 only |
| | `OUT_OF_DEPTH_CHANCE_PER_LEVEL` / `_CAP` | 0.02 / 0.15 | the rare top-of-table reskin; zero on floor 1, capped well under certainty |
| | `FLOOR_SPREAD_PER_LEVEL` / `_CAP` | 0.09 / 0.9 | one shared roll widening the whole floor's count with depth |
| how clustered | `CLUSTER_SIZE` | 10 | creatures sharing one placement anchor and ONE tier draw |
| how much loot | `CHESTS_PER_FLOOR` | 6 | flat on purpose — loot must not grow as fast as threat |
| | `ARMOUR_SCARCITY` / `POTION_SCARCITY` | 1.32 / 1.32 | 1 chest draw in S holds the kind |
| | `WEAPON_SCARCITY` | 4 | 1 creature drop roll in S holds a weapon |
| | `MONSTER_DROP_CHANCE` | 0.50 | FAITHFUL — chance a corpse leaves anything |
| | `EARLY_CHEST_QUALITY_BOOST` | 0.5 | floor 1's chests pay better; fades as 1/level |
| how much the route branches | `MAP_DUG_PERCENTAGE` | 0.15 | less dug = a mandatory path actually exists |
| | `SPINE_THREAT_SHARE` | 0.7 | share of threat MASS placed on the mandatory route |
| | `SIDE_ROOM_DEPTH_BONUS` | 0.35 | the whole gamble: side rooms roll risk and reward independently over [0, 2×this] |
| | `SIDE_CHEST_BIAS` | 3 | how much likelier a chest lands in a side room |
| | `MIN_ROSTER_FOR_SIDE` | 4 | below this many creatures, everything goes on the spine |
| | `SHRINE_DISTANCE_SHARE` | 0.65 | how far still counts as "distant" for the shrine |
| | `CHEST_GUARD_RADIUS` | 8 | every chest gets a creature within this — loot is not free |

## Time

| dial | value | one sentence |
|---|---|---|
| `TURN_BUDGET` | 1500 | turns one traversal may spend; running out ends the run — the only brake on the shamble |
| `RETURN_ENABLED` | false | whether the run the pages ask for includes the climb back out; off is a plain ten-traversal descent (rules.md §1) |

## Fixed / faithful

| dial | value | note |
|---|---|---|
| `MAP_SIZE` | 32 | FAITHFUL |
| `CORRIDOR_LENGTH` / `ROOM_WIDTH` / `ROOM_HEIGHT` | [1,3] / [5,9] / [4,7] | rooms with corridors, not corridors with rooms |
| `VISIBLE_DIST` / `CLEAR_DIST` | 9 / 7 | FAITHFUL |
| `PLAYER_HP` / `PLAYER_XP` | 10 / 3 | FAITHFUL — and neither ever grows in play |
| `HIT_CHANCE` | 5/6 | FAITHFUL |
| `MONSTER_SKIP_CHANCE` | 0.10 | FAITHFUL |
| `MONSTER_DIFFICULTY_SCALE` | 0.75 | FAITHFUL single-floor default |
| `MONSTER_COUNT` / `CHEST_COUNT` | 5 / 15 | FAITHFUL single-floor defaults; real runs use `floorParams` |
| `CHEST_DIFFICULTY_SCALE` | 0.9 | FAITHFUL — the positional half of "does a chest hold anything" |
| `WEAPON_AXE_MIN_TIER` | 4 | below wolf, the axe is absent from the pool, not just rare |
| `STARTING_ITEMS` | [] | the run starts empty-handed — the opening is hard on purpose |
| `MONSTER_TABLE` / `ITEM_TABLE` / `MONSTER_WEIGHTS` | — | in `src/sim/balance.js`, values visible there |

## The bot's numbers — `src/bot/config.js`, not this file's business

The bot's dials belong to the bot. `DEFAULT_HERO` (fightMargin 0.7,
sideAppetite 1, stepCost 0.01) is the shipped hero and the whole
hero-as-configuration mechanism; `DANGER_FALLOFF` 0.5, `CROWD_PENALTY` 6,
`GOAL_STICKINESS` 1.4 are its mechanics. See `docs/bot.md`.

## Tiers

A harder dungeon is `makeFloorPlan(model)` with overrides of the dials
above — the same curve, other constants. There is no second difficulty
system, and there must never be one.
