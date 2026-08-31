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
| | `tierFloorStart` / `tierSlackStart` / `outOfDepthChanceStart` / `spreadStart` | 0 / 0 / 0 / 0 | where each rate family STARTS, so a curve re-anchored part way down the dungeon continues instead of restarting at zero. 0 is the shipped game — with one anchor there was never anything to continue from. Model fields only, no constant: they exist for `model.floors` (see `map-design.md`) and make all six growth families the same shape, a starting value and a rate |
| | `EARLY_TIER_CUT` | 1 | whole rows trimmed off floor 1's ceiling, floor 1 only |
| | `OUT_OF_DEPTH_CHANCE_PER_LEVEL` / `_CAP` | 0.02 / 0.15 | the rare top-of-table reskin; zero on floor 1, capped well under certainty |
| | `FLOOR_SPREAD_PER_LEVEL` / `_CAP` | 0.09 / 0.9 | one shared roll widening the whole floor's count with depth |
| how clustered | `CLUSTER_SIZE` | 10 | creatures sharing one placement anchor and ONE tier draw |
| how much loot | `CHESTS_PER_FLOOR` | 6 | flat on purpose — loot must not grow as fast as threat |
| | `CHEST_LOOT_CHANCE` | 0.5 | how often a chest holds anything, FLAT. Now a model field — it is the gate people were reaching for when they moved the two scarcity sliders |
| | `COIN_PILE_PER_FLOOR` / `COIN_PILE_AMOUNT` | 1 / 2 | the explorer's income (2026-08-31): a visible pile of coins per floor, SIDE ROOMS ONLY with a distance-weighted draw, credited on contact and paid with the traversal. Floors whose rooms are all spine have none — money the route would collect for free is not exploration income. Chests are untouched: the chest-coin variant traded sustain for coin and fired the opening-deaths wire (0.45 → 0.53 at n=300, with and without compensation) |
| | `CHEST_MIX` | 0.5 | the potion's share of a FILLED chest; 0 is all shield, 1 is all potion. Derived from `ARMOUR_SCARCITY`/`POTION_SCARCITY`, which stay as the engine's per-kind pair and are rebuilt from this by `chestScarcity()` — for chests only their ratio was ever live (M46), so the pair carried a degree of freedom that did nothing |
| | `WEAPON_SCARCITY` | 4 | 1 creature drop roll in S holds a weapon. Code default; **dial-overrides.json ships 16 on the `from:1` anchor (floors 1–3 only)** — the cut half of the E2 pair, whose bridge half is the axe's shop price (`src/ui/shop.js`). Shallow scarcity paces the first Butcher; the untouched deep floors are what keep the clear reachable (decisions.md, "E2 swept") |
| | `MONSTER_DROP_CHANCE` | 0.50 | FAITHFUL — chance a corpse leaves anything |
| | `EARLY_CHEST_QUALITY_BOOST` | 0.5 | floor 1's chests pay better; fades as 1/level |
| how much the route branches | `MAP_DUG_PERCENTAGE` | 0.15 | less dug = a mandatory path actually exists; a model field, so the lab reaches it |
| | `HUB_BRANCHES` / `HUB_RINGS` | 4 / 1 | rooms in the hub's ring, and how many rings. Read only by the hub layout. The room SIZE is not a dial there — a ring is a packing problem, so the layout solves the size down from `ROOM_WIDTH`/`ROOM_HEIGHT` until the geometry closes |
| | `RING_ROOMS` / `RING_SPURS` | 8 / 3 | rooms on the ring, and how many inward dead-end spur rooms (the side bets) hang off it |
| | `SHORT_ROUTE_MASS_SHARE` | 0.7 | of the threat mass placed ON the routes, the short route's share. A new parameter because none could carry it: `SPINE_THREAT_SHARE` divides route-vs-side and nothing divided route-vs-route. Read only on two-route floors |
| | `MAP_THEME` | 0 | **the ONE layout selector** — an index into `MAP_THEME_LAYOUTS` (padrão / cripta / grade / caverna / anel / central / sorteio). **0 is the shipped game** (the classic Digger). The old per-layout modulo dials (`HUB_EVERY`, `RING_EVERY`) were DELETED — three controls answering one question was the confusion; which floors get which theme is `mapTheme` per anchor (`model.floors`). The catalogue exists to TEST identities in the Lab before the final map design is chosen (M51) |
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
| | `VAULT_BOSS` | 🐷 hp 12 / xp 5 / activation 10 / **speed 2** | the Butcher; not a `MONSTER_TABLE` row and never drawn. **xp** sets who ENTERS — the bot is never told a creature's hp, it guesses one from xp (`assumedHp`, bent by Coragem) — while **hp and speed** set who WINS. So both of those make the fight harder without making the bot warier, which is the room's whole trick |
| | `VAULT_BOSS_DROP` | `axe` | the only guaranteed drop in the game — and `VAULT_BOSS.revealsDrop` puts it in Belief, so it is the only drop the bot can price before the kill |
| | `VAULT_CHEST_ITEMS` | 4 × shield, 4 × potion | the vault floor's ONLY chests — it places none of its own; authored rather than rolled |

## Time and coin

| dial | value | one sentence |
|---|---|---|
| `TURN_BUDGET` | 240 | turns one traversal may spend; running out ends the run. Shown on the HUD as the stamina bar — a real constraint, not a safety guard, and swept over chains: this is the value where exhaustion stops being the dominant death without going inert. Because it is PER TRAVERSAL, the dearest floor of the arc gates the clear rate — see decisions.md before moving it. The bot does not read it |
| `COIN_RATE` | 20 | what a completed traversal pays per unit of xp-per-turn; the payout is rounded, so this is also its RESOLUTION — at 10 almost every floor paid 1, 2 or 3. Doubled 2026-08-15 together with the shop's prices and pawa's stairs price (2, `HEROES`), so purchasing power was unchanged and only the step size halved. The shop's own prices live in `src/ui/shop.js`, which states the ruler they come from — they are not dials and are not restated here |
| `DEFAULT_ORDER` | — | the order the shop spends an unattended balance in (rules.md §9), and the one dial-shaped thing here with NO value of its own: it is the price row above sorted downwards, computed in `src/ui/shop.js`. Written that way on purpose — a hand-kept list would be a second copy of the prices, free to drift the day one moves. The player may reorder it in the Lab; nothing ships an override |
| `startFloor` | 1 | LAB ONLY, and it has no constant — a run option the panel sets, so the floor you want to look at is on screen without watching the ones above it. The hero arrives EMPTY-HANDED, so it shows a floor's shape and lies about its cost: measured, ~39 turns on floor 4 against ~77 on floor 1, and it clears floor 4 7% of the time against 97% on floor 1 |
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
| `RAGE_TURNS` / `RAGE_MULT` | 3 / 2.5 | attacking turns the syringe lasts, and what it multiplies the damage die's TOP by. A multiplier, not a bonus: it means the same to a bare hero and an armed one. Shorter and harder since B32 |
| `ITEM_TABLE.axe.dmgMin` | 1 | the axe raises the damage die's FLOOR, not just its top — worth twice a point of `dmg` (rules.md §4) |

## The bot's numbers — `src/bot/config.js`, not this file's business

**The three player dials are ±95% biases around a calibrated centre** (M47;
Pressa joined in 2026-08-29 reversing B24, and absorbed Curiosidade on
2026-08-31 — the panel derives `curiosity` from Pressa's notch mirrored,
after the 256-combo grid showed the two moving together in every winner;
widened from ±80% in 2026-08-29 — the owner wants the ends to be ABSOLUTES,
so the top band prices at 1.95× and the bottom at 0.05× while the inner
bands barely move) —
Coragem, Ganância and Pressa. `riskAppetite` was briefly a fourth and is
now a decided constant at 1: every one of the three is already a form of
risk — courage against a creature, greed for a reward, curiosity for the
unknown — so a band named "risk" beside them names the axis rather than
asking a new question.
The Lab offers four named bands (six until 2026-08-29 — with the ends
stretched to absolutes the upper neighbours read identical, so the count
dropped and neighbour contrast rose ~65%) and none of them is the centre — and NOTHING
runs at the centre any more: every visitor opens on a band rolled per dial,
kept from their first session on. What the slider shows is what the run gets,
always. (This paragraph said the opposite until the roll shipped, and it is
the same claim the row below corrects.)

`CHEST_VALUE_HP` is the one centre that is COMPUTED rather than chosen:
`CHEST_LOOT_CHANCE × the average hp a chest item is worth`, weighted the way
the generator weights the kinds. It is 1.5 today and it follows its inputs —
never tune it by hand.

The bot's dials belong to the bot. `DEFAULT_HERO` (bravery 1, sideAppetite 1,
riskAppetite 1, curiosity 1, fightMargin 0.7, stepCost 0.1) is the whole
hero-as-configuration mechanism and the CENTRE the panel's four bands are
built around. `bravery` 1 means "take the bestiary average at face value" — the bot
is never told a creature's health (rules.md §7) and `expectedHpFor` is what it
guesses with.

`sideAppetite` and `riskAppetite` are the two halves of one overloaded dial
(C1 §7 in `docs/project/rota-e-valor.md`): greed multiplies what a thing is
WORTH, risk multiplies the BAR a guard or a dark route may cost. Both at 1,
the split is an exact no-op.

`curiosity` replaced `caution` as the third player dial and took HALF of
her: how cheaply the unknown reads. It bends only the `opening` term (what
a goal that reveals new map costs), with the bravery mirror `(2 −
curiosity)` — alta abre mapa que não precisa, baixa só faz o que está à
vista e desce com o andar no escuro. It moves the PRICE, never the frontier
gate — and below `CURIOSITY_LAST_RESORT` (the bottom band only) the frontier
stops competing in the pool altogether: the dark becomes literally the last
resort, because the price alone tops out around 1.8 hp and could never lose
to a real fight. The fallback path still explores when the hole is unknown,
so the incurious hero is never stranded.

The other half — how wide the hero detours around creatures — is
`EXPOSURE_STEPS`, a decided constant at 9.6: how many steps one
creature-turn of exposure is worth. The old fused dial measured depth
rising-then-flat across its bands with **deaths 1.00 flat** — calibration,
not a player's trade — and the survival spread it once showed was a
per-tile uncertainty bug, not the dial (`config.js` documents both).

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

**The warrior's syringe has no number of its own**, and that is the point.
`RAGE_AT` used to be one, pointed at the same bar the fight gate refuses on, so
the item was spent where the bot then walked away. It was deleted rather than
retuned. What triggers the injection is a CONDITION and a POSITION, neither of
which is a constant: one step from the melee and never inside it, when the duel
the hero is about to enter is one the fight gate refuses sober and would accept
enraged. `fightMargin` supplies both readings, as it does for every other fight.

Greed is the reserve price on that flip: the sober duel must cost at least
`fightMargin × effectiveHp × sideAppetite`. No new constant, and the low half of
the dial is inert because the flip already floors it.

Nothing prices the injection's own turn any more, and that is a deletion rather
than an omission — one step out, no creature is beside him when he spends it, so
there is no free blow to charge. `docs/bot.md` carries what that bought.

## Tiers

A harder dungeon is `makeFloorPlan(model)` with overrides of the dials
above — the same curve, other constants. There is no second difficulty
system, and there must never be one.
