# Lab backlog — the manual dungeon simulator

**Second priority, behind the shop.** Owner-set: finish `docs/backlog.md`'s
U6 arc (U6d's fix, U6e, U6f) first, then come here, then the rest of
`docs/backlog.md`. The **bot agent** is outside this ordering and works its
own lane (B11 onward) in parallel — nothing here is blocked on it and it is
blocked on nothing here.

Same rules as `docs/backlog.md`: one item, one commit, one test asserting
its own property. Only the project agent adds or reorders items. Report
against what the item asks for, and name which behaviour document the change
made stale (or that none moved) — see `CLAUDE.md`.

## What is being built

`run-lab.html` — a page to hand-tune every generation dial and then either

1. **generate in isolation** — all ten floors built from the model, no hero,
   pick any floor from a selector and look at it; or
2. **run for real** — Sonda A, Sonda B, or the bot playing the generated
   dungeon, *following along floor by floor exactly the way `index.html`
   does today*, not selected manually.

Plus a small dashboard: finish rate, median depth, coins per floor, coins
per run.

**It must keep working as features land.** A new dial should appear on the
page without anyone editing the page; when the shop (U6) ships, the full
simulation should include it without the lab needing a special case.

## Why most of this is plumbing, not new machinery

Already built and reused rather than rewritten:

| piece | where | gives us |
|---|---|---|
| `DEFAULT_MODEL` | `difficulty.js` | ~35 dials already fields, not constants |
| `makeFloorPlan(model)` | `difficulty.js` | model → the `floorPlan(level)` a dungeon wants |
| `playDungeon(seed, policy, {floorPlan})` | `dungeon.js` | already accepts a custom plan |
| `generateMap(seed, size, {…})` | `mapgen.js` | layout already overridable |
| `replayGame(replay)` + `run.levels[]` | `game.js` / `dungeon.js` | frame-by-frame playback, floor by floor |
| `buildGrid` / `renderFrame` | `ui/render.js` | draws a state; no live loop needed |
| `descentCheck` | `clustering.js` | already returns finishRate, medianDepth, coins |
| `makeSondaPolicy` / `makeBot` | `observed-ruler.js` / `bot.js` | the three players |
| `expectedFloorMass` / `threatMass` | `difficulty.js` | exact mass, no sampling |

**Floors are independent of the hero.** `newGame` generates map, monsters
and chests from the seed, and only *then* does `carry` overwrite hero fields
— never the map. So floor 7 is the same floor 7 whether the hero reached it
or died on floor 2, and all ten can be generated up front with no
simulation at all. That is what makes the isolated mode's selector cheap.

## Sequencing

    L1  L2  L3  L5      (no dependencies — all four can run in parallel)
     |           |
     +---> L4    |      L4 needs nothing, but is only useful once L1 exists
     |     |     |
     +-----+-----+---> L6  (ui agent, independent of the work-agent four)
     |     |     |     |
     v     v     v     v
          L7  (needs L1)
           |
     +-----+-----+
     |           |
     v           v
    L8          L9      (L8 needs L5+L7; L9 needs L4+L6+L7)
                 |
                 v
                L10     (needs L9 and U6d)

| # | id | what gets done | agent | blocked by |
|---|---|---|---|---|
| 1 | L1 | `shippedModel()` — a model that reproduces `floorParams` exactly | work | — |
| 2 | L2 | Thread the four map-layout dials through to `playDungeon` | work | — |
| 3 | L3 | `expectedFloorMass(level, model)` — model-aware variant | work | — |
| 4 | L5 | Fogless observation, so a whole map can be rendered | work | — |
| 5 | L4 | `descentCheck` accepts a custom model | metrics | — (pairs with L1) |
| 6 | L6 | Extract the playback loop out of `spectator.js` | ui | — |
| 7 | L7 | Page shell: auto-generated controls, preset save/load | metrics | L1 |
| 8 | L8 | Isolated mode: ten floors, floor selector, map view | metrics | L5, L7 |
| 9 | L9 | Real mode: follow-along playback + dashboard | metrics | L4, L6, L7 |
| 10 | L10 | Starting loadout in, coins out — without touching the real wallet | metrics | L9, U6d |

---

## L1 · `shippedModel()`, so the lab does not open on a game nobody plays

`work agent` · READY · **do this first — it fixes a live risk, page or no page**

`DEFAULT_MODEL` does **not** reproduce the shipped game. It carries pre-M7
values: `clusterSize: 1` against the shipped 10, `strengthGrowth:
STRENGTH_GROWTH` (1.0) against the shipped `STRENGTH_GROWTH_REBALANCED`,
`monsterGrowth: MONSTER_GROWTH` against `MONSTER_GROWTH_REBALANCED`, and
`outOfDepthChanceBase/PerLevel: 0` with the shipped flag on.

**This already cost real time once.** M29's Result records a whole round of
promising sweep candidates invalidated because a sweep that only overrode
`monstersBase`/`monsterGrowth` silently measured a strictly easier game on
three unrelated axes. M29 built a `shippedModel()` helper and verified it
field-by-field against `floorParams()` — **and it was never committed**, so
the next person gets to rediscover the same trap. A lab page whose controls
default to `DEFAULT_MODEL` would open showing a game nobody plays.

**Do.** Commit `shippedModel()` in `difficulty.js`: a model object which,
passed to `makeFloorPlan`, produces per-floor plans identical to
`floorParams(level)` for every level. Keep `DEFAULT_MODEL` as it is —
it is the documented "everything off" baseline and several instruments
depend on that meaning; this is a second, differently-named export.

**Assert.** A test comparing `makeFloorPlan(shippedModel())(level)` against
`floorParams(level - 1)` **field by field, for every level 1..10** — not a
spot check on two fields, since the whole failure mode is a field nobody
thought to look at. The test must fail loudly if a new field is added to
one and not the other.

## L2 · map layout dials never reach a full descent

`work agent` · READY

`generateMap` accepts `corridorLength`/`roomWidth`/`roomHeight`/
`dugPercentage`, and `game.js` reads all four off `counts` — but
`dungeon.js` never copies them from the plan into `counts`, and
`makeFloorPlan` never emits them. So layout is tunable for a single floor
via `playGame` and **not tunable at all for a descent**, which is what the
lab runs.

**Do.** Add the four to `DEFAULT_MODEL` (and `shippedModel()`, per L1), emit
them from `makeFloorPlan`, and forward them in `dungeon.js`'s `counts`
object alongside the map-design dials already riding along there.

**Assert.** A descent run with a deliberately extreme layout override (very
large rooms, or a much higher dug percentage) produces visibly different
maps on **every** floor, not just floor 1 — the bug being fixed is
specifically that floors 2+ silently ignored it. Existing tests green with
the fields omitted.

## L3 · `expectedFloorMass` reads the shipped dials, not a model

`work agent` · READY

`expectedFloorMass(level)` calls `floorParams(level)` internally, so it can
only ever describe the shipped game. The lab's isolated mode needs the exact
mass **of the model currently in the controls** — that is the whole point of
an exact, sampling-free number.

**Do.** `expectedFloorMass(level, model)` — model optional, defaulting to
today's behaviour so every existing caller is untouched. Same shape
`floorSpread`/`tierFloorShare`/`earlyTierCapShare` already use (`model = {}`
with per-field fallback).

**Assert.** `expectedFloorMass(n)` and `expectedFloorMass(n, shippedModel())`
agree exactly for every level — which is also a second, independent check on
L1. A deliberately softened model reads lower.

**Known gap, do not fix here:** M30 recorded that this closed form does not
model M14's shrine guardian, so it slightly undercounts every floor. That is
a separate, more invasive change; note it on the page rather than silently
presenting the number as complete.

## L5 · a way to see the whole map

`work agent` · READY

`renderFrame(state, belief)` draws what the hero has *seen*. The lab needs
the whole floor visible — fog of war is the game's rule, not the lab's.

**Do.** An explicit way to build a fogless observation. Probably a
visibility-radius option on `observe()`, defaulting to today's
`VISIBLE_DIST` so nothing changes for real play.

**Build it as a parameter, not a lab special case** — `docs/project/
candidates.md`'s U7 needs exactly this for Papazito (map-wide position and
type visibility, loot still hidden), and M28 already established the
pattern with `revealLoot`. One lever, two callers, rather than the lab
growing its own copy that U7 later has to reconcile.

**Assert.** Default `observe(state)` byte-identical to today. Fogless
observation reveals every walkable tile of a generated floor. If it shares
`revealLoot`'s plumbing, confirm the two are independent — fogless must not
imply loot-revealed, or the lab silently hands the bot M28's leak back.

## L4 · `descentCheck` cannot be pointed at a custom model

`metrics agent` · READY · **pairs with L1, blocked by nothing**

`descentCheck` is where the dashboard's three headline numbers already come
from — finish rate, median depth, coins. It is also the one analysis
function with no `floorPlanFn` escape hatch; `mortalCoinShape`,
`coinShape` and `builtShape` all have one already.

**Do.** Accept `floorPlanFn` and `dungeonOptions`, threaded to
`playDungeon` — copy the shape `mortalCoinShape` already uses rather than
inventing a second convention.

**Assert.** Omitting both reproduces today's numbers exactly, same seeds.
Passing `makeFloorPlan(shippedModel())` also reproduces them — a real check
that the two paths agree, not just that the new argument is accepted.

## L6 · the playback loop is welded to `spectator.js`

`ui agent` · READY

Real mode has to follow the descent floor by floor exactly as `index.html`
does. That machinery all exists — `run.levels[i].replay` → `replayGame` →
frames → advance to the next floor — but it lives inside `spectator.js`
tangled with the HUD, the pause button, the coins chip and the summary card.

**Copying it into the lab would repeat the exact mistake E1 exists to fix.**
`docs/backlog.md`'s E1 records four separate reimplementations of the
descent loop, one of which (`clustering.js`) silently drifted out of step
with the engine after M7 and was found by someone tripping over it. A fifth
copy, in a page whose whole job is to describe generation accurately, is
the worst place to put one.

**Do.** Extract the reusable part — walk a descent's floors, replay each
one's frames, hand each frame to a caller-supplied render/step callback,
respect pause — so `spectator.js` and the lab both call it. `spectator.js`
keeps everything specific to the watched experience (HUD, chip, summary).

**Assert.** `index.html` plays a full descent exactly as before — this is a
refactor with no behaviour change, and that is the whole risk. Same seed,
same frames, same on-screen result.

## L7 · the page, its controls, and presets

`metrics agent` · READY after L1 · **blocked by L1**

**Do.** `run-lab.html`. Controls generated **by iterating over the model
object**, not hand-written field by field — that is what makes a future dial
appear on the page for free, which is an explicit requirement. Default the
controls to `shippedModel()` (L1), never `DEFAULT_MODEL`.

Group them the way someone tuning thinks: map/layout, monsters, loot, and
the cross-cutting ones (`spineThreatShare`, `sideChestBias`,
`sideRoomDepthBonus`, `chestGuardRadius`) that tie map to monsters to loot.

Save/load a model as JSON, so a promising tune survives a page reload and
can be pasted into an item.

**Assert.** Every field of `shippedModel()` appears as a control. **A field
added to the model appears without editing the page** — check by adding a
throwaway field temporarily, not by reasoning that the loop covers it.

## L8 · isolated mode, with the floor selector

`metrics agent` · **blocked by L5 and L7**

Ten floors generated from the model, no hero, no simulation. A selector
(`1 | 2 | 3 | …`) picks the floor; the map draws below it.

**Cheap because floors are hero-independent** — see the note at the top of
this file. Generate all ten up front from the seed and the model; switching
floors is a re-render, not a re-run.

**Do.** Per floor, alongside the map: creature count, mean xp, exact mass
from `expectedFloorMass(level, model)` (L3), the floor-1-vs-floor-2 ratio
M30 cares about, and the spread within the floor. Reuse `buildGrid` /
`renderFrame` with L5's fogless observation.

**Assert.** Same seed and model give the same ten floors every time.
Changing one dial visibly changes the affected floors and leaves the others
alone. The mass shown matches `expectedFloorMass` called directly.

## L9 · real mode: follow the run, floor by floor

`metrics agent` · **blocked by L4, L6 and L7**

Sonda A, Sonda B, or the bot plays the generated dungeon and the page
**follows along the way the real game does** — floor advances by itself as
the hero descends. No manual selector here; that is what distinguishes this
mode from L8.

**Do.** Player picker (Sonda A / Sonda B / bot), run, and play it back
through L6's extracted loop. Dashboard from L4's `descentCheck` against the
tuned model: finish rate, median depth, coins per floor, coins per run.

**Floors the hero never reached must read as unreached, not as empty.** The
map for floor 7 always exists even when the hero died on floor 3 — showing
it blank, or showing it as though it were played, are both lies. Grey the
tab, say "not reached".

**Assert.** The same seed and model played twice give the same run. The
dashboard's numbers match `descentCheck` called directly with the same
model. A run that dies early shows the right floors as unreached.

## L10 · the shop, without corrupting the real wallet

`metrics agent` · **blocked by L9 and `docs/backlog.md`'s U6d**

The lab must include the shop once U6 ships — that is an explicit
requirement — but there is a trap: `wallet.js` is backed by `localStorage`,
and a lab that reads and writes it would **destroy the real balance** the
moment someone runs sixty simulated descents.

**Do.** Starting loadout as an **input** to the simulation (which is exactly
what U6d builds for the engine) and coins as an **output** of it. The lab
never touches `wallet.js`. This also makes the interesting question
answerable — "what does starting with an axe do to the finish rate" — which
reading the live wallet would not.

**Assert.** Running the lab leaves the real balance and held item exactly as
they were, checked before and after a multi-run batch. A simulated starting
loadout visibly changes the dashboard.
