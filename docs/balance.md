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
| | `CHEST_LOOT_CHANCE` | 0.5 | how often a chest holds anything, FLAT. Now a model field — it is the gate people were reaching for when they moved the two scarcity sliders |
| | `CHEST_MIX` | 0.5 | the potion's share of a FILLED chest; 0 is all shield, 1 is all potion. Derived from `ARMOUR_SCARCITY`/`POTION_SCARCITY`, which stay as the engine's per-kind pair and are rebuilt from this by `chestScarcity()` — for chests only their ratio was ever live (M46), so the pair carried a degree of freedom that did nothing |
| | `WEAPON_SCARCITY` | 4 | 1 creature drop roll in S holds a weapon |
| | `MONSTER_DROP_CHANCE` | 0.50 | FAITHFUL — chance a corpse leaves anything |
| | `EARLY_CHEST_QUALITY_BOOST` | 0.5 | floor 1's chests pay better; fades as 1/level |
| how much the route branches | `MAP_DUG_PERCENTAGE` | 0.15 | less dug = a mandatory path actually exists; a model field, so the lab reaches it |
| | `HUB_EVERY` | 0 | every Nth floor is dug as a hub — a central room with a ring around it (`src/sim/layout-hub.js`) — and the rest by ROT's accretion. 0 is never; 4 gives floors 4 and 8; 10 gives the bottom alone. PER FLOOR, which is the thing worth copying from DCSS: it draws a layout per level rather than configuring one. `layoutFor()` in difficulty.js is the single place that decides, and where a third layout is added. See `docs/project/dcss-layouts.md` |
| | `HUB_BRANCHES` / `HUB_RINGS` | 4 / 1 | rooms in the hub's ring, and how many rings. Read only by the hub layout. The room SIZE is not a dial there — a ring is a packing problem, so the layout solves the size down from `ROOM_WIDTH`/`ROOM_HEIGHT` until the geometry closes |
| | `ROOM_BIAS` | 1 | how many times likelier the digger attaches a ROOM than a corridor. 1 is ROT's own draw. ROT fixes this pair in its constructor and never exposes it, which is why `MAP_DUG_PERCENTAGE` used to buy rooms and maze corridors together |
| | `CORRIDOR_MIN` | 1 | shortest corridor the digger may dig; the longest is this + `CORRIDOR_SPAN`. The only dial that changes how far apart rooms sit |
| | `MAP_SIZE` | 32 | the grid's side. Now a model field: room count tracks AREA, so this and `ROOM_SCALE` are the pair that decides how many destinations a floor offers. Capped at 44 in the lab because `SIGHT_WHOLE_MAP` is `MAP_SIZE × 2` and stops covering the diagonal past ~45 |
| | `ROOM_SCALE` | 1 | multiplies both `ROOM_WIDTH` and `ROOM_HEIGHT`, so one number cuts the same dug area into more pieces or fewer. Measured, halving it roughly doubles the room count — further than `MAP_DUG_PERCENTAGE` and `ROOM_BIAS` together, because those argue about area and this divides it |
| | `SPINE_THREAT_SHARE` | 0.7 | share of threat MASS placed on the mandatory route |
| | `SIDE_ROOM_DEPTH_BONUS` | 0.35 | the whole gamble: side rooms roll risk and reward independently over [0, 2×this] |
| | `SIDE_CHEST_BIAS` | 8 | how much likelier a chest lands in a side room. Measured only where a side room EXISTS (135 floors in 360): 2.5 puts 39% of the chests there, 8 puts 70%, and it saturates near 90% — the ceiling is how few side rooms the digger makes, not this dial |
| | `MIN_ROSTER_FOR_SIDE` | 4 | below this many creatures, everything goes on the spine |
| | `SHRINE_DISTANCE_SHARE` | 0.65 | how far still counts as "distant" for the exit hole; a model field, so the lab reaches it |
| | `CHEST_GUARD_RADIUS` | 8 | every chest gets a creature within this — loot is not free |
| the authored room | `VAULT_LEVEL` | 4 | which floor carries the vault, 1-based; 0 turns it off |
| | `VAULT_SIZE` | 9 | its side in tiles — above any generated room, so the shape says it was placed |
| | `VAULT_BOSS` | 🐷 hp 12 / xp 5 / activation 10 / **speed 2** | the Butcher; not a `MONSTER_TABLE` row and never drawn. hp sets who ENTERS (it is what `duelCost` reads), xp and speed set who WINS |
| | `VAULT_BOSS_DROP` | `axe` | the only guaranteed drop in the game — and `VAULT_BOSS.revealsDrop` puts it in Belief, so it is the only drop the bot can price before the kill |
| | `VAULT_CHEST_ITEMS` | 4 × shield, 4 × potion | the vault floor's ONLY chests — it places none of its own; authored rather than rolled |

## Time and coin

| dial | value | one sentence |
|---|---|---|
| `TURN_BUDGET` | 1500 | turns one traversal may spend; running out ends the run — the only brake on the shamble |
| `COIN_RATE` | 10 | what a completed traversal pays per unit of xp-per-turn; was hardcoded in the page until a hero had to spend coin mid-run |
| `RETURN_ENABLED` | false | whether the run the pages ask for includes the climb back out; off is a plain ten-traversal descent (rules.md §1) |

## Fixed / faithful

| dial | value | note |
|---|---|---|
| `ROOM_WIDTH` / `ROOM_HEIGHT` | [5,9] / [4,7] | rooms with corridors, not corridors with rooms. The pair is the SHAPE of a room; `ROOM_SCALE` above is what the lab moves, and it multiplies both |
| `ROOM_MIN_SIDE` | 3 | the floor under `ROOM_SCALE` — narrower than this and a room is a corridor with a label on it |
| `CORRIDOR_SPAN` | 2 | the WIDTH of the corridor-length draw. `CORRIDOR_LENGTH` is derived: `[CORRIDOR_MIN, CORRIDOR_MIN + CORRIDOR_SPAN]`. The minimum is the dial above; this is the shape of the draw and stays put |
| `VISIBLE_DIST` / `CLEAR_DIST` | 9 / 7 | FAITHFUL — `VISIBLE_DIST` is now the DEFAULT reach, which a persona may override (`HEROES` below) |
| `PLAYER_HP` / `PLAYER_XP` | 10 / 3 | FAITHFUL — and neither ever grows in play |
| `HIT_CHANCE` | 5/6 | FAITHFUL |
| `MONSTER_SKIP_CHANCE` | 0.10 | FAITHFUL |
| `MONSTER_DIFFICULTY_SCALE` | 0.75 | FAITHFUL single-floor default |
| `MONSTER_COUNT` / `CHEST_COUNT` | 5 / 15 | FAITHFUL single-floor defaults; real runs use `floorParams` |
| `ARMOUR_SCARCITY` / `POTION_SCARCITY` | 1.32 / 1.32 | the engine's per-kind pair, kept because `itemWeights` is right to take one — the WEAPON side is still a true rate. The chest side is driven by `CHEST_MIX` above; these two are only its default |
| `WEAPON_AXE_MIN_TIER` | 4 | below wolf, the axe is absent from the pool, not just rare |
| `STARTING_ITEMS` | [] | the run starts empty-handed — the opening is hard on purpose |
| `MONSTER_TABLE` / `ITEM_TABLE` / `MONSTER_WEIGHTS` | — | in `src/sim/balance.js`, values visible there |
| `HEROES` / `DEFAULT_PERSONA` | — | in `src/sim/heroes.js`, values visible there — the cast, one object per hero. `base` is empty and must stay empty: it IS the shipped game, and every reading compares against it |
| `ITEM_TABLE.book` | 📜 | the scholar's, and the only item with no stat at all — what it does is the `read` action (rules.md §5) |
| `READ_TURNS` | 5 | turns a read costs, standing still, with the creatures acting in every one |
| `ITEM_TABLE.adrenaline` | 💉 | the warrior's, and stat-less for the same reason the book is — what it does is the `rage` action |
| `RAGE_TURNS` / `RAGE_MULT` | 5 / 2 | attacking turns the syringe lasts, and what it multiplies the damage die's TOP by. A multiplier, not a bonus: it means the same to a bare hero and an armed one |
| `ITEM_TABLE.axe.dmgMin` | 1 | the axe raises the damage die's FLOOR, not just its top — worth twice a point of `dmg` (rules.md §4) |

## The bot's numbers — `src/bot/config.js`, not this file's business

**The three player dials are ±80% biases around a calibrated centre** (M47) —
Coragem, Ganância and Cautela. `riskAppetite` was briefly a fourth and is now
a decided constant at 1: every one of the three is already a form of risk —
courage against a creature, greed for a reward, caution for the road and the
unknown — so a band named "risk" beside them names the axis rather than
asking a new question.
The Lab offers six named bands and none of them is the centre — and NOTHING
runs at the centre any more: every visitor opens on a band rolled per dial,
kept from their first session on. What the slider shows is what the run gets,
always. (This paragraph said the opposite until the roll shipped, and it is
the same claim the row below corrects.)

`CHEST_VALUE_HP` is the one centre that is COMPUTED rather than chosen:
`CHEST_LOOT_CHANCE × the average hp a chest item is worth`, weighted the way
the generator weights the kinds. It is 1.5 today and it follows its inputs —
never tune it by hand.

The bot's dials belong to the bot. `DEFAULT_HERO` (bravery 1, sideAppetite 1,
riskAppetite 1, caution MEAN_BITE, fightMargin 0.7, stepCost 0.1) is the whole
hero-as-configuration mechanism and the CENTRE the panel's six bands are built
around. `bravery` 1 means "take the bestiary average at face value" — the bot
is never told a creature's health (rules.md §7) and `expectedHpFor` is what it
guesses with.

`sideAppetite` and `riskAppetite` are the two halves of one overloaded dial
(C1 §7 in `docs/project/rota-e-valor.md`): greed multiplies what a thing is
WORTH, risk multiplies the BAR a guard or a dark route may cost. Both at 1,
the split is an exact no-op.

`caution` is how many steps one turn of unpleasantness is worth —
dimensionless, so the dial IS the ratio between hurry and danger. It prices
two things per turn in the same unit: what can HIT the hero, and how much more
of the map a tile opens than where he stands. **8.3, and MEASURED rather than
derived** — it was `MEAN_BITE / stepCost` until the uncertainty term went in
and put that centre past the top of the curve. It is the first dial here to
move survival: deaths per run go 0.98 to 0.40 across its bands, against depth
4.14 to 2.80. It is a hero trait and NOT one of the four bands — see
`src/ui/dials.js` for why.

**It is no longer what a visitor plays.** Each one gets a band ROLLED per
dial on their first session (`src/ui/dials.js`), kept from then on — so
these three numbers are what everything was measured at, not what the
median session runs.

**THREE things are DECIDED rather than dials, all three measured inert:**
`CROWD_PENALTY` 15 (B19), `GOAL_STICKINESS` 1.4 (B20) and `stepCost` 0.1
(B24 — 18 configurations at n=150 and everything from 0.08 to 0.9 reads the
same). `READ_AT` 0.8 — the demand when the WHOLE descent is still ahead, scaled
down by greed and by the threat still in front (`threatAhead`,
src/sim/difficulty.js). UNCAPPED on purpose: the product passes one whole bar
on shallow floors at high greed, and a demand nothing can meet is what stops
the miser reading early. That is the mechanism, not a defect in it — the
floor the book first becomes possible on climbs 1, 1, 1, 4, 8, 9 across the
six bands. A first guess, swept at 0.9 and 0.8.

`RAGE_AT` 1.0 — the same shape for the warrior's syringe, against the cost of
what is already awake on him, scaled by the share of FLOORS still ahead
(`floorsAhead`) rather than of threat: threat is back-loaded, so its share is
flat over the first half of the descent, which is exactly where the injection
floor needed separating. Swept at 0.5 and 1.0. See
`docs/bot.md`.

## Tiers

A harder dungeon is `makeFloorPlan(model)` with overrides of the dials
above — the same curve, other constants. There is no second difficulty
system, and there must never be one.
