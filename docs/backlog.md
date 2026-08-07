# Backlog

The task list. Everything needed to pick up a task and finish it.

- **What we are doing and why** — `docs/project/objectives.md`
- **What was last measured** — `docs/kpi.md` (a record, not a set of goals)
- **Closed items with their results** — `docs/project/decisions.md`
- **Ideas with no slot** — `docs/project/candidates.md`

## How this works

**Watch the game. Fix what is wrong.** That is where items come from.

One item, one commit, and a test asserting the thing the item was for — "a
rat deals damage", "floor 5 is not cheaper than floor 4". Most items here
have a criterion you can check by looking or by asserting; the ruler is for
questions that are genuinely invisible.

Run the ruler when a batch lands, as a **regression check** — did something
break — not as a scoreboard. `run-ruler.html`, and put what it says in
`docs/kpi.md`.

Read your item in full before starting and report against what it asks for
rather than your own sense of finished. Say what you did, what you measured
if you measured anything, and what surprised you. If an item looks wrong,
say so instead of quietly doing something else.

If more than one session is running at once, claim your item by setting it
IN FLIGHT and committing that alone before anything else. With a single
session, skip it.

    READY       can be started
    IN FLIGHT   someone is on it
    BLOCKED     waiting on a named item
    REPORTED    done, written up
    DONE        reviewed and closed
    ARCHIVED    decided against, reason kept

| # | id | what gets done | status |
|---|---|---|---|
| 1 | I8 | One page saying whether the map is good, in five numbers | IN FLIGHT |
| 2 | M11 | Floor n+1 is never cheaper than floor n | REPORTED |
| 3 | M13 | Tier floor rises with depth — rats stop appearing deep | REPORTED |
| 4 | M12 | Raise creature count and cluster size together | READY |
| 5 | M14 | One top-tier-for-the-floor creature next to the shrine | READY |
| 6 | M15 | Chests get a creature nearby, spine included | READY |
| 7 | X1 | Delete what nothing references | READY |
| 8 | M4 | Side-room risk/reward spread scales with depth | READY |
| 9 | E1 | One resumable turn loop in src/sim, instead of four copies | READY |

**I8 first, and it runs alongside everything else** — different agent,
different files, and it is what the batch gets checked with when it lands.

Items 2–6 are one batch, in that order: one commit each, each with a test
asserting its own property, no measurement between them. X1 after the batch
rather than inside it, so a bisect stays readable.

The end-of-batch check is I8's page rather than a full ruler run.

Closed work is in `docs/project/decisions.md`. Parked and unscheduled is in
`docs/project/candidates.md`.


## I8 · one page that says whether the map is good

`metrics agent` · **IN FLIGHT** — runs in parallel with the M11–M15 batch

`run-ruler.html` reports nine quantities, four ratios, growth exponents and
standard errors. It is the right tool for settling an argument and the wrong
one for the question actually being asked, which is **"is the map any
good?"**

Build a second page — `run-check.html` — that answers that and nothing else.

**Five numbers. No more.**

| shows | means | good direction |
|---|---|---|
| cost per floor | hp a fixed reference player spends clearing it | rises, **every step** |
| creatures per floor | how full the floor is | rises |
| spread within a floor | how different two floor-7s are from each other | does not shrink with depth |
| finishes | share of runs the real bot reaches the bottom | somewhere near 1 in 4 |
| loot vs cost | what a floor's items are worth against what it costs | context only, no target |

**Say what each one means on the page**, in the words above — not "CV
challenge ×0.994/floor". Anyone opening this should not need the backlog to
read it.

**Speak in totals, not exponents.** "Floor 10 costs 15× floor 1" is
readable; "×1.351 per floor" is not. Keep the growth rate as small print if
it is wanted at all.

**Flag the monotonicity break in red.** Any floor cheaper than the one above
it gets called out by name — "floor 5 is cheaper than floor 4". That is M11's
whole subject and it is invisible in a column of growth rates.

**What is deliberately NOT on this page:** capacity, attrition, buffer,
challenge/power, the four ratios, standard errors, growth exponents. They
took three attempts to define, need enormous samples to read, and none of
them ever told anyone whether the game was worth watching. They stay in
`run-ruler.html` for when a specific argument needs settling.

**Build nothing new to measure with.** Every number above already comes out
of `observed-ruler.js` or `clustering.js`. This is a presentation, and if a
number turns out to need new measurement, leave it off and say so.

**Fast enough to actually use.** Default sample small enough to finish in
seconds. Better a rough number someone runs than a precise one they do not.

## M11 · floor n+1 is never easier than floor n

`map` · `work agent` · **REPORTED**

Measured, in the shipped game: challenge by floor runs 2.18, **1.97**, 5.28,
6.33, **5.70**, 8.10 — floors 2 and 5 cost less than the floor above them.

Nothing has ever targeted this. Every acceptance criterion so far has been
about growth *rates*, which are happily monotone on average while individual
steps go backwards.

**Do.** Make the expected cost of floor N+1 exceed floor N by construction,
not on average. The roster count is 2, 2, 3, 3, 3, 4, 5, 5, 6, 7 — flat
stretches are where it happens, since with count equal the tier roll decides
and can go either way.

**Assert.** A test that walks floors 1→10 and fails if expected cost ever
drops. Expected cost, not a sample — the point is that it cannot happen, not
that it usually does not.

### Result

**No constant changed.** The 2.18/1.97 dip is the real probe's sampling
noise (both figures are well within 1σ of each other in `docs/kpi.md`), not
a structural defect — the actual generation formula already produces a
non-decreasing expected cost, it just had no closed form and no guard
proving so.

**Built: `expectedFloorMass(level)` in `src/sim/difficulty.js`**, an EXACT
closed-form integral, not a sample. `spawn.js`'s tier index is
`floor(depth × scale × 10)` with `depth` ranging over a floor's tiles;
integrating that step function against `depth ~ Uniform(0,1)` gives each
table index below the ceiling a bucket of width `1/(scale×10)` and folds
the remainder into the ceiling index — exact arithmetic, no RNG, no
sampling. Reuses `spawn.js`'s own `monsterWeightsAround` (newly exported)
for the weighted spread around each index, so this is the same rule the
real generator draws from, not a second copy that could drift.
`expectedFloorMass = floorParams(level).monsters × expectedMonsterMass(...)`
— reads the shipped generation parameters directly, so it always describes
the game that actually runs.

**Assert, built and passing:** `expected floor mass never drops across the
descent` walks levels 0–9 and fails on any decrease. Computed values (for
the record, not asserted as exact targets): 8.57, 9.25, 14.87, 17.01, 19.00,
27.82, 39.40, 44.35, 58.91, 79.61 — strictly rising, no flat-stretch dip.
A second test cross-checks the closed form itself against a deterministic
Monte Carlo average (fixed grid, not RNG) at floors 1, 5 and 10, within 1%
— guards the integration maths independently of the monotonicity property
it's used to prove. 2 new tests, 79/79 total.

**Why it holds, not just that it does.** `monsterCount(level)` is
`round(base × growth^level)` with `growth ≥ 1`, and rounding preserves
monotonicity — non-decreasing by construction. `difficultyScale(level)` is
`min(1, base × growth^level)` with `growth ≥ 1` — also non-decreasing by
construction. `expectedMonsterMass(scale)` is non-decreasing in `scale`
because `MONSTER_TABLE`'s mass is monotonic along the table and raising
`scale` can only shift the index distribution toward higher rows. The
product of two non-negative non-decreasing sequences is non-decreasing —
this is why "by construction" was reachable without moving any constant:
the three preconditions already held, they just were not, until now,
combined into one checked claim.

No flag — this adds an analytical function and a test, no runtime game
behaviour changes. No `docs/balance.md` entry (no new tunable constant) and
no `rogule-spec.md` divergence (no player-visible rule changed).

## M13 · the tier floor rises with depth

`map` · `work agent` · **REPORTED**

A creature's tier is `min(1, depthAt(pos) × difficultyScale)`, and `depthAt`
is position **within the map**, not the floor number. Near the entrance it
is ~0, so the index falls to 0 — **a rat** — on every floor including 10.

The floor's depth sets the **ceiling** and never the floor. That is why weak
creatures keep showing up deep.

**And rats cannot hurt anything.** `xp 1` means the damage roll is `0..0`,
exactly zero. `threat.js` skips them from the danger field and `duelCost`
returns 0. They are scenery that costs turns.

**Do.** Give the tier a per-floor **minimum** that rises with depth, so the
bottom of the table drops out as the descent goes on. Within-map position
still varies tier — it just varies between a floor and a ceiling instead of
between zero and a ceiling.

**Assert.** Lowest tier seen at floors 1, 5, 10 rises. No `xp 1` creature at
all past some floor.

### Result

**Built: `TIER_FLOOR_SHARE_{BASE,PER_LEVEL,CAP}` in `balance.js`,
`tierFloorShare(level)` in `difficulty.js`, threaded through `floorParams`/
`makeFloorPlan`/`dungeon.js` like every other dial — no flag, on
unconditionally, per the batch note (structural fix, not a ratio).**
`tierFloorShare` is a SHARE of the floor's own ceiling INDEX, not an
absolute value, so `floor <= ceiling` holds by construction at every depth
however far the ceiling itself has climbed — no clamping needed to enforce
it separately (also directly tested).

**One correction mid-build, worth recording.** First cut clamped the
CENTRE index before drawing: `index = max(minIndex, floor(difficulty×10))`.
Measured (not assumed) that this still let rats through past the intended
floor — `monsterWeightsAround`'s own spec-quirk-9.2 spread reaches slot 0
from a centre as high as 2 (offset -2), so raising the centre to 1 was not
enough to exclude it. Fixed by drawing from the natural centre as before
and clamping the FINAL DRAWN SLOT instead: `slot = max(minIndex,
drawWeighted(...))`. This is what "varies between a floor and a ceiling"
in the spec actually meant — the OUTCOME's range, not the roll's centre.

**Assert, built and passing (self-simulated, n=40 seeds/floor):**

    floor        1    3    5    7    10
    lowest xp    1    1    2    3    3

Rises at every checkpoint, and floor 1 still rolls a rat (`xp 1`) — the
spec's own example, kept intact rather than over-corrected. `minIndex`
(the actual guarantee, computed from `tierFloorShare × ceilingIndex`)
reaches 1 at floor 5 and never drops back below it, so "no rat past some
floor" is checked directly against that threshold and simulated for every
floor from there to 10 — a dedicated test finds the threshold itself
(floor 5) rather than a hardcoded one. `minIndex` sequence across floors
1–10: 0,0,0,0,1,1,2,2,3,3.

**M11's closed form updated to match, not left stale.** `expectedFloorMass`
existed one item ago and claimed to describe "the game that actually
runs" — leaving it ignorant of M13's floor would have made that claim
false the moment this landed. `expectedMonsterMass` now takes `minIndex`
and clamps each slot inside the weighted blend, exactly mirroring the
spawn.js correction above (not the naive centre-clamp either). Re-ran
`expected floor mass never drops across the descent` with the corrected
model — still holds. 4 new tests (lowest tier rises, no rat past
threshold, floor never exceeds ceiling, plus the M11 Monte Carlo
cross-check updated for the new clamp). 82/82 total.

`docs/rogule-spec.md` §13.7 added, same structure as §13.5/§13.6 — Rogule's
tier index has no per-floor minimum either, so this is a genuine rule
divergence, not just a constant's shape changing.

## M12 · fill the floors back up

`map` · `work agent` · **READY**

Floor 10 holds 7 creatures on a 32×32 map. That is M7's doing — it cut count
growth from 1.3 to 1.15 to fight the CV decay — and the emptiness is the
price that was paid without anyone looking at it.

**It does not have to be paid.** CV depends on the number of independent
*draws*, not on the number of creatures, and clustering separated those two.
Raise the count **and raise cluster size with it**, holding
`creatures ÷ cluster size` roughly where it is, and the floors fill up while
the CV win survives.

Effective cluster size is currently 3.97–4.87 (measured, not the constant 6).
That ratio is the thing to hold.

**Assert.** Creatures per floor at 1, 5, 10 in the report. Draws per floor —
`creatures ÷ effective cluster size` — roughly unchanged from today.

## M14 · a guardian at the shrine

`map` · `work agent` · **READY**

Nothing guards the exit. Reaching the shrine is currently the moment the
floor stops being dangerous.

**Do.** Place one creature adjacent to the shrine, drawn at or near the top
of the tier that floor can reach — strong *relative to the floor*, not
absolutely. It replaces one of the floor's roster rather than adding to it,
so the budget does not move.

**Assert.** Every floor has exactly one, its tier is at or above every other
creature on that floor, and creature count is unchanged.

## M15 · loot rooms have a guard

`map` · `work agent` · **READY**

Rooms hold a chest and nothing else, so most of a floor is walking. Loot
that costs nothing to take is not a decision.

`SIDE_CHEST_BIAS` already puts chests in side rooms, which have guards — so
this may be smaller than it looks. What is missing is the spine, where
chests sit unguarded.

**Do.** Make a chest almost always have a creature within a short radius,
spine included. Reuse placement rather than adding creatures — the budget is
M12's, not this item's.

**Assert.** Fraction of chests with a live creature within N tiles, at
floors 1, 5, 10. It should be high and roughly flat with depth.

## X1 · delete what nothing uses

`chore` · `work agent` · **READY**

Roughly 1200 lines of code and 400 of docs exist because nobody removed
them. Each was built for a question that has since been answered or
abandoned, and every one of them is a thing a future session has to read and
decide is irrelevant.

**Zero references anywhere — delete outright.**

    src/analysis/features.js     170
    src/analysis/winnable.js     109
    src/analysis/power.js         61
    src/bot/placeholder.js        43

Verified with a grep across `src/`, `*.html` and `test/`. Re-verify before
deleting rather than trusting this list.

**Superseded and already declared so — delete with their pages.**

    src/analysis/curve.js  +  run-curve.html
    src/analysis/shape.js  +  run-shape.html

`curve.js` prices clean 1v1 duels and read 0.23 on a floor that killed four
heroes of seven; `CLAUDE.md` already says it is "kept only until curve.js
goes". `shape.js` is built on `campaignCost`, which was retired for the same
reason and replaced by `observed-ruler.js`.

**One-off pages whose items are closed.**

    run-cluster.html    served I2
    run-i3.html         served I3

The analysis modules they drive stay — `clustering.js` is still the source
of the finishes and per-turn damage numbers.

**Docs.**

    docs/curve-shape.md              superseded twice, says so at the top
    docs/clustering-i2.md            fold into project/decisions.md
    docs/clustering-i3.md            fold into project/decisions.md

Fold rather than delete: those two hold the actual write-ups for I2 and I3,
and `decisions.md` is where closed work lives.

**Do not touch.** `hardness.js` (run-lab uses it), `batch.js`,
`clustering.js`, `observed-ruler.js`.

**After the M11–M15 batch, not during.** That batch is editing `spawn.js`
and `difficulty.js`; this touches `src/analysis/` and pages. They would not
conflict, but a deletion commit landing between two behaviour commits makes
a bisect harder to read if the batch turns out to have broken something.

**Assert.** `run-tests.html` still green, `index.html` still plays a
descent, `run-ruler.html` and `run-lab.html` still produce numbers. Nothing
else — this item removes, it does not change behaviour.

**If something turns out to be referenced after all, leave it and say so.**
The list is a grep, not a proof.

## M4 · scale the side-room bonus with depth

`map` · `work agent` · **READY** — fine tuning, only if M7 leaves a gap

`SIDE_ROOM_DEPTH_BONUS = 0.35` is fixed, so the only structural variance in
the game is constant across the descent.

**Why it matters.** It reuses machinery that already exists and was already
measured, and side rooms are the one place where risk and reward already
roll independently — `map-design.md` establishes why that independence is
what makes a detour a gamble rather than a free lunch.

**Acceptance.** CV per floor rises; the spine/side mass split stays at its
≥70% target; the average side room at floor 5 is not made harder, only the
spread widened. Measured on the probes.

## E1 · expose a resumable turn loop from src/sim

`engine` · `work agent` · **READY**

The descent loop has been reimplemented **four times** outside `src/sim/`:
`playFromState` in `clustering.js`, and `driveFloor`, `driveDescent` and
`driveDescentSuppressed` in `observed-ruler.js`. Every one was written for
the same reason and every one said so honestly — `playGame` runs a floor to
completion with no per-turn hook, and `playDungeon` takes a seed rather than
a starting hero. Anyone who needs to drive turns writes their own.

**This is not a tidiness item.** A copy of the loop has to stay in step with
the engine or whatever it measures stops describing the game, and that has
already happened: `clustering.js` diverged from `spawn.js` after M7 landed,
and it was found by the work agent tripping over it rather than by anything
noticing.

**What to build.** A resumable driver in `src/sim/` that accepts a starting
state and yields control per turn — the thing all four copies approximate.
Then the copies call it.

**Acceptance.**
- One loop, exported, with the four call sites using it.
- **Byte-identical results at every existing call site.** These functions
  produce every published number in `kpi.md`; if any of them moves, the
  refactor changed behaviour and the numbers behind it are no longer
  comparable. This is the whole risk of the item.
- No new RNG consumption anywhere, verified rather than argued.

**Watch.** `driveDescentSuppressed` clears `outcome`/`killedBy` back to null
between turns, which is why it needs a per-turn hook at all. Whatever the
shared driver looks like, that has to remain expressible without a special
case bolted on for one caller.

**Why it is worth doing now.** It unblocks U2 — live clear odds would be the
fifth copy, and the worst of them, since it would run during the watched run
rather than offline. With this in place the ui agent can build U2 alone:
import the loop, import `makeBot`, derive the rollout seed through
`hashSeeds`, and touch nothing outside `src/ui/`.

Serves neither objective directly. It is debt, and it is the kind that has
already cost something once.

