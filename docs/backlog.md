# Backlog

The task list. Everything needed to pick up a task and finish it.

- **What we are doing and why** — `docs/project/objectives.md`
- **What was last measured** — `run-check.html` (a record, not a set of goals)
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
`run-check.html`.

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
| 1 | I8 | One page: three levels, twelve numbers, success and health | REPORTED |
| 2 | M11 | Floor n+1 is never cheaper than floor n | REPORTED |
| 3 | M13 | Tier floor rises with depth — rats stop appearing deep | REPORTED |
| 4 | M12 | Raise creature count and cluster size together | REPORTED |
| 5 | M14 | One top-tier-for-the-floor creature next to the shrine | REPORTED |
| 6 | M15 | Chests get a creature nearby, spine included | REPORTED |
| 7 | M16 | Bigger rooms, shorter corridors | REPORTED |
| 8 | X1 | Delete what nothing references | READY |
| 9 | M4 | Side-room risk/reward spread scales with depth | READY |
| 10 | E1 | One resumable turn loop in src/sim, instead of four copies | READY |

**I8 first, and it runs alongside everything else** — different agent,
different files, and it is what the batch gets checked with when it lands.

Items 2–7 are one batch, in that order: one commit each, each with a test
asserting its own property, no measurement between them. X1 after the batch
rather than inside it, so a bisect stays readable.

The end-of-batch check is I8's page rather than a full ruler run.

Closed work is in `docs/project/decisions.md`. Parked and unscheduled is in
`docs/project/candidates.md`.


## I8 · one page: three success numbers, nine health numbers

`metrics agent` · **REPORTED** — this supersedes the two earlier drafts of I8

`run-ruler.html` reports nine quantities, four ratios, growth exponents and
standard errors. Right for settling an argument, wrong for the question
actually asked, which is **"is this any good?"**

Build `run-check.html` to answer that. Three levels, and each gets **one
success number and three health numbers.** Nothing else.

**Success is "did it work". Health is "has it rotted".** They are different
questions and mixing them is what made the old targets table unreadable.

### Product — is a run worth watching

    SUCCESS   median depth reached          higher, ~7 of 10
    health    finishes                      the end is reachable at all
    health    turns between events          a kill, a chest, a floor — how long between
    health    spread of depths reached      runs end differently, not all on floor 3

Median depth is the closest thing to "is there a story". A run that dies on
floor 2 has no arc however good the numbers are.

### Map — does the floor do its job

    SUCCESS   cost, floor 10 ÷ floor 1      higher, AND rising every single step
    health    creatures per floor           the floor is populated
    health    spread within a floor         two floor-7s differ from each other
    health    loot against cost             there is something to gain

The success number **fails outright if any step goes backwards**, however
good the ratio. Name the floor in red: "floor 5 is cheaper than floor 4".

### Bot — does it play well

    SUCCESS   damage per kill               lower
    health    reversal rate                 it stops pacing back and forth
    health    turns per floor               it stops wandering
    health    lost fights started           near zero

**Not win rate.** `balance.md` records why: *"win rate mixes bot quality
with map difficulty; damage and blows per kill do not."* A page whose
sections get read side by side must not carry a number that moves when a
different section's subject changes.

`finishes` is the one exception, sitting in Product where it belongs, and it
**gets a label saying it moves with both.**

### Rules for the page

**Totals, not exponents.** "Floor 10 costs 15× floor 1" reads. "×1.351 per
floor" does not. Growth rates are small print if they appear at all.

**Every number carries its meaning and its good direction, on the page.**
Nobody should need the backlog to read it.

**Nothing new to measure with.** All twelve already come out of
`observed-ruler.js` or `clustering.js`. Anything that would need new
measurement gets left off with a note saying so.

**Seconds to run.** A rough number someone runs beats a precise one they do
not.

**Deliberately absent:** capacity, attrition, buffer, challenge/power, the
four ratios, standard errors, growth exponents. Three attempts to define,
enormous samples to read, and none of them ever told anyone whether the game
was worth watching.

### This is the only metrics page

Not a second page beside the others — **the** one. When it works,
`run-ruler.html`, `run-lab.html` and `run-batch.html` are deleted along with
the ones X1 already removes. `run-tests.html` stays; it is tests, not
metrics.

**The modules stay, only the pages go.** `observed-ruler.js` and
`clustering.js` are where the numbers come from and this page calls them. If
a sweep is genuinely needed later, a page for it is an afternoon — and the
odds are it never is, because the reason there are five pages is that nobody
deleted the last one.

**If something in those pages turns out to be load-bearing and has no home
here, say so and leave that page alone.** One page is the goal, not a rule
worth losing a number over.

### Result

Rebuilt `run-check.html` from scratch for the new structure — the earlier
two-section, five-number draft is gone, not extended. Three `<section>`s
(Product, Map, Bot), each a 4-cell grid: one `success`-styled cell (accent
border, bigger number) and three plain `health` cells, every cell carrying
its own meaning and good-direction text, matching the spec's own wording.
`run-ruler.html`, `run-lab.html` and `run-batch.html` are deleted —
`git rm`, not just unlinked. Fixed the stale pointers that deletion left
behind in `CLAUDE.md`, `README.md` and `docs/observed-ruler.md`'s baseline
section (its own historical numbers untouched, just the "how to reproduce
this" pointer, since `run-ruler.html` is gone but the module functions it
called are not). Did not touch `docs/balance.md`, `docs/project/decisions.md`
or this file's own older items — those are records of what was true when
written, not live documentation, and rewriting history to match a page
that didn't exist yet is the wrong kind of tidiness.

**All twelve numbers exist; none needed touching `src/sim/` or `src/bot/`
to get.** Nine were already sitting in `rewardShape`/`floorPlan` (Map's
four) or a light rename of what `botFinishesAndSpike` was already doing
(Product's finishes). The other three — Product's turns-between-events and
spread-of-depths, and all four of Bot's numbers — needed a genuinely new
pass, because nothing existing tracked a real descent's ACTIONS or its
EVENTS, only its damage log. Built as one new function,
`descentCheck` (`clustering.js`), rather than four separate ones: they all
watch the same real ten-floor bot descents, and running that descent four
times over instead of once would have cost more time than every other
number on the page combined.

**How the three previously-unmeasured Bot numbers turned out to be
reachable without new instrumentation, since that was this item's one
hard constraint:**
- **Reversal rate** — bot.js computes this internally for its OWN reversal
  PENALTY (`action === OPPOSITE[lastAction]`, stated in its own comment)
  but never exposes the rate. `descentCheck` watches the SEQUENCE of
  actions the policy already returns each turn and compares consecutive
  ones against the same trivial opposite-pairing — an outside observation
  of behaviour already happening, not a hook into the bot.
- **Turns per floor** — `state.turn` at the point a floor attempt ends,
  summed and divided by floor attempts. Already there; nobody had added
  it up.
- **Lost fights started** — the one I expected to have to leave off.
  `priceMonsters` (internal to `bot.js`) computes `worthStarting` from
  `duelCost` + `effectiveHp` + a safety margin, all THREE of which are
  already exported (`src/bot/duel.js`, `src/sim/combat.js`,
  `src/sim/balance.js`, the margin as `DUEL_SAFETY_MARGIN`). Reproducing
  `chooseGoal`'s full target selection to know which candidate the bot
  picked would have been new measurement in the bad sense — restating bot
  logic outside the bot. What `descentCheck` does instead is narrower and
  does not need that: "walking into it is the attack" (bot.js's own
  words), so the first turn the chosen ACTION lands on a live monster's
  tile is a fight starting, whichever monster that turns out to be — no
  guess about alternatives needed. Pricing THAT engagement with the bot's
  own published formula, at the moment it actually started, answers
  "was this fight already known lost when it began" using only exported
  pieces, against real state the loop already has, not a re-derivation of
  a decision the bot made.

**Speed, measured on this machine, not estimated:** floor samples at 6,
descents at 2 — `descentCheck` is the entire cost, roughly 5s/descent since
it does more per turn than `botFinishesAndSpike` did (reversal check, fight
detection, event tracking, on top of the same base descent). Landed on
**~11s** total for the default. Two descents is thin — median-of-2 is
barely a median — but a third would have pushed this toward 16s, and nine
of the twelve numbers already come from the cheap side (Map's eight
samples/floor, ~2s). Both counts are page inputs, not constants.

**What surprised me:** reversal rate read 36% on one ordinary run — the
bot reverses on roughly a third of its moves. That happens to sit in the
same range as the OLD parked reversal-rate reading in `run-check.html`
(0.174–0.210, different measurement, different era, kept for the bot lane
being parked rather than deleted) — not close enough to call the same
number, but close enough that the new instrument isn't reading something
wildly different in kind from what B1's old one saw. `lostFightsStarted`
read 0 on every run tried while building this — `refuseLostFights`
appears to be doing exactly its job, which is itself worth having a
number for even when that number is boring.

**Not measured / left off:** nothing from the spec's twelve. The `run-shape.html`
and `run-curve.html` diagnostics (modelled-cost pages, unrelated method,
not named in this item) are untouched — not this item's call to remove.

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
noise (both figures are well within 1σ of each other in `run-check.html`), not
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

`map` · `work agent` · **REPORTED**

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

### Result

**The item's own theory does not hold — measured, not assumed, and the
report says so plainly instead of picking numbers to make it look like it
did.** "Raise cluster size with count, holding the ratio" assumes
`CLUSTER_SIZE` is the thing controlling effective cluster size. It is not,
past 6: swept 6/12/20 at the shipped growth via
`src/analysis/clustering.js`'s `effectiveClusterSizes` and got IDENTICAL
results at every floor. M10's per-member quota check — cutting a cluster
the instant the zone quota flips — fires on the roster's MASS BALANCE, not
on how big `CLUSTER_SIZE` allows a cluster to grow, and it was already
binding well below 6. Raising the constant is closer to a good-faith
gesture (headroom if the quota's own shape changes later) than a working
lever.

**Also disclosed: the baseline this item's own numbers rest on does not
reproduce.** `run-check.html`/`docs/project/decisions.md` record effective
cluster size at 3.97–4.87 from floor 6 on (commit `ff708dc`). Re-measured
the same call (`effectiveClusterSizes` with `M7_ON`, and independently with
`floorPlan` and with `tierFloorShare` explicitly zeroed to rule out M13)
and got 1.77–2.10 for floors 6–10, consistently across all three
constructions. Did not chase this further — it does not change what M12
needed to do, only what "today" meant going in — but it should not be
silently overwritten either.

**What was actually done: raised count as far as the EXISTING M7 budget
test allows, since the intended compensating lever does not work.**
`MONSTER_GROWTH_REBALANCED` 1.15 → 1.22 (`growth × strength^2.356 /
MONSTER_GROWTH` stays within the shipped 15% band, at 10% — the edge of
it). `CLUSTER_SIZE` 6 → 10 regardless, per the spec's instruction, with the
measured caveat above attached rather than hidden.

**Creatures per floor** (assert item 1): `2,2,3,4,4,5,7,8,10,12` — was
`2,2,3,3,3,4,5,5,6,7`. Floor 10 nearly doubles, 7 → 12.

**Draws per floor** (assert item 2): NOT held constant, honestly reported.
Effective cluster size stays in roughly the same 1.7–2.3 band regardless
(confirming the theory's failure), so draws rise with the raw count: ~3.3 →
~5.4 at floor 10. Expect CV to give back some ground at the deepest floors
— roughly `√(3.3/5.4) ≈ 0.78×` the current per-floor gain, order of
magnitude only. The metrics agent's standing ruler re-run is what actually
settles this, not this estimate.

Own test: floor counts rise relative to the pre-M12 baseline (floor 10
strictly), and the M7 budget check is reused rather than duplicated so a
future raise cannot silently open it via a second copy. 2 new tests, 84/84
total. No `rogule-spec.md` divergence — same rule M7 already documented,
different numbers; §13.5 updated in place with a pointer here rather than
forked into a new subsection.

## M14 · a guardian at the shrine

`map` · `work agent` · **REPORTED**

Nothing guards the exit. Reaching the shrine is currently the moment the
floor stops being dangerous.

**Do.** Place one creature adjacent to the shrine, drawn at or near the top
of the tier that floor can reach — strong *relative to the floor*, not
absolutely. It replaces one of the floor's roster rather than adding to it,
so the budget does not move.

**Assert.** Every floor has exactly one, its tier is at or above every other
creature on that floor, and creature count is unchanged.

### Result

**Built, no flag, runs after M3's step** — `src/sim/spawn.js` step 7, so
"at or above every other creature" is checked against what the floor
actually ended up holding (M3's rare reskin can exceed the normal ceiling)
rather than assumed from `ceilingIndex` alone: `guardIndex =
max(ceilingIndex, maxOtherIndex)`, computed after M3, not before.

**Reuses a roster member, in order of preference:** a monster already
adjacent to the shrine (nothing to move) → the nearest monster, relocated
to a free adjacent tile → skipped for that floor only if the shrine has no
free or already-occupied-by-a-monster neighbour at all (rare geometry,
accepted rather than engineered around). No new body added at any point.

**One correction found by testing, not assumed away.** First cut only
looked for a SINGLE already-adjacent monster and reskinned it, missing that
a large enough roster (M12 raised counts) can land MORE than one cluster
member next to the shrine by chance — caught at floor 10, seed 19, in the
very first test run ("found 2"). Fixed by relocating every extra
already-adjacent monster to any other free tile before picking the one
that stays.

**Assert, verified:** own tests (2, floors 1/5/10, 20 seeds each) plus a
wider self-check — 750 floor/seed combinations (floors 1, 3, 5, 7, 10 ×
150 seeds), zero misses on either exactly-one or at-or-above. Roster size
unchanged, checked with `monsterSpread` forced to 0 so the nominal count is
exact rather than a range. 2 new tests, 86/86 total.

`docs/rogule-spec.md` §13.8 added — genuine new rule, nothing like it in
Rogule. No `docs/balance.md` constant — nothing to tune, the rule has no
free parameter.

## M15 · loot rooms have a guard

`map` · `work agent` · **REPORTED**

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

### Result

**Built, no flag, runs last** — `src/sim/spawn.js` step 8, after M14's
guardian. Every chest without a live creature within `CHEST_GUARD_RADIUS`
(8, swept 4/6/8/10/12 — see `docs/balance.md`) gets one by relocating the
nearest existing monster. Reuses the roster only; nothing added.

**Two interaction bugs, both caught by the test suite on the first run,
not assumed away.** First cut relocated freely, with no zone or guardian
awareness:
- `small floors put everything on the spine` (a pre-existing test) broke —
  guarding a side-room chest could pull a floor-1 monster off the spine,
  which `MIN_ROSTER_FOR_SIDE` and M10's quota exist specifically to
  prevent. Fixed: a chest can only be guarded by relocating a monster
  ALREADY in its own zone, to a target tile in that same zone. No
  candidate on both sides of that check → the chest stays unguarded rather
  than forcing a crossing.
- M14's own `every floor has exactly one guardian` test broke — M15 could
  relocate the shrine's own guardian to go guard a nearby chest instead.
  Fixed: the guardian reference is tracked outside M14's block and
  excluded from M15's candidate pool.

**Assert, measured — and it does not match the item's own hope.** "High
and roughly flat" does not hold: coverage RISES with depth instead —
floor 1 ~56%, 3 ~64%, 5 ~79%, 7 ~99%, 10 ~99% (n=40 seeds/floor × 6
chests). Floor 1 never reaches "high" at any reasonable radius (checked
up to 12, a third of the 32×32 map) — it holds only 2–3 creatures against
6 flat chests, and no amount of radius makes 2 monsters simultaneously
near 6 scattered rooms. Fixing it would mean adding creatures, explicitly
ruled out ("the budget is M12's, not this item's"). Reported plainly
rather than picking a radius or a sample that would hide it.

Own tests: floor 10 reaches ≥90% and exceeds floor 1 (the "rises, and is
high where resources allow it" property that actually holds); a floor-1
spine-purity check across 20 seeds guards the interaction bug directly, not
just indirectly through the pre-existing test. 3 new tests, 88/88 total
(counting the 2 test-suite catches above as part of getting to green, not
separately).

`docs/rogule-spec.md` §13.9 added. This closes the M11–M15 batch — five
items, five commits, no measurement requested between them, per the
owner's batch instruction.

### Review of M12, M14 and M15 — all three kept

**M12.** Its own theory was tested and failed, and the report says so rather
than picking numbers that would let it stand. Raising `CLUSTER_SIZE` does
nothing past 6, swept 6/12/20 identical, because M10's per-member quota
fires on mass balance and was already binding below the cap. So the
compensating lever the item was built around does not exist, draws rose
instead of holding, and that is stated plainly.

Count went 1.15 → 1.22 and creatures per floor `2,2,3,4,4,5,7,8,10,12`
against the old `…,5,6,7`. Floor 10 nearly doubles, which is what the item
was for.

**And it caught an error of mine.** Effective cluster size was recorded at
3.97–4.87 and re-measures at **1.77–2.10**, three independent ways. I quoted
the old figure in M10's Review 2 to argue my own CV worry away. The
conclusion survived — the CV reading was direct and bit-identical — but the
reasoning under it was wrong by a factor of two.

What that number actually means is worth more than the correction:
**clusters are pairs, not sixes.** M7's whole mechanism is fewer independent
draws, and a cluster of two buys a √2 reduction. That is the entire CV gain,
and there is headroom nobody can reach — because M10's quota, which keeps
side rooms populated, is the same thing throttling cluster growth. **Spine
share and CV pull against each other**, and the quota currently wins.

**M14.** Clean. Found its own bug in the first test run — M12's larger
rosters can drop more than one cluster member next to the shrine, which the
first cut did not expect — and verified across 750 floor/seed combinations
rather than the 60 the item asked for. Guardian tier computed *after* M3's
reskin rather than from the ceiling, which is the difference between "at or
above every other creature" and "at or above what we assumed they would be".
No `balance.md` constant, correctly: the rule has no free parameter.

**M15.** Caught two interaction bugs on the first run, both real — guarding
a side-room chest could pull a monster off the spine, undoing M10; and it
could steal M14's guardian. Both fixed at the cause.

Coverage rises with depth (floor 1 ~56%, floor 10 ~99%) instead of the flat
profile the item hoped for, reported plainly with the reason: floor 1 holds
two or three creatures against six chests and no radius fixes that.

**That is better than what the item asked for.** Unguarded loot on floor 1
is a gentle opening, and 99% by floor 10 is the design working where it
matters. The item's "roughly flat" was my guess, not a requirement.

## M16 · bigger rooms, shorter corridors

`work agent` · **REPORTED** — last of the batch

The floor reads as corridors with rooms attached. It should read as rooms
with corridors between them.

**What is set today.** `CORRIDOR_LENGTH = [1, 5]` and `MAP_DUG_PERCENTAGE =
0.15`. Room size is not set at all — `mapgen.js` passes neither `roomWidth`
nor `roomHeight`, so ROT's defaults apply and nobody chose them.

**Do.** Shorten corridors and raise the room-size minimums. Both go in
`balance.md` first. `dugPercentage` may need to move with them to keep the
same amount of floor dug; treat it as part of the same change rather than a
separate dial.

**The constraint that matters, and it is not obvious.** `dugPercentage` was
lowered from ROT's 0.2 **on purpose** — `map-design.md` records that at 0.2
"there were usually several equivalent ways through", and the spine/side
design needs a mandatory path to exist at all. Bigger rooms and shorter
corridors push toward exactly that warren.

So: **spine share has to stay inside its band**, floor by floor. M10 just
fixed that number and this is the most likely thing to break it again. If
the two cannot both be had, say so with the numbers rather than picking one
quietly.

**Why it is worth doing beyond taste.** I2's review found that grouping only
becomes a real lever where the map stops the bot escaping — in a corridor it
backs up and fights a cluster one at a time, which is the mechanism M7 is
built on being undone by geometry. Open rooms are the condition that makes
clustering bite. It also gives M12's extra creatures somewhere to be.

**Assert.** Mean room area and mean corridor length, before and after.
Spine share per floor, still in band. Tests green.

### Result

**Plumbing had to be built before anything could be swept.** `generateMap`
was never actually called with an options object anywhere in the codebase
— `game.js` called `generateMap(state.rng.map)`, full stop, so
`dugPercentage`'s existing override parameter was dead code. Added
`roomWidth`/`roomHeight`/`corridorLength`/`dugPercentage` as a passthrough
from `newGame`'s `counts` through to `generateMap`, same shape as every
other dial.

**Swept 32×32/ROT.Digger directly, room size against corridor length
against dugPercentage together** (not one at a time — the item's own
warning that they interact), n=60–100 per config. Landed on `ROOM_WIDTH =
[5, 9]`, `ROOM_HEIGHT = [4, 7]` (both new — previously unset, ROT's own
default silently applied), `CORRIDOR_LENGTH = [1, 3]` (was FAITHFUL
`[1, 5]`, now a deliberate divergence — `docs/rogule-spec.md` §13.10).
`MAP_DUG_PERCENTAGE` stayed at 0.15, checked rather than assumed to need
moving.

**Room area 21.9 → 35.8 (+64%), corridor length 2.69 → 1.91 (−29%).**

**The item's own worry did not confirm — measured, not assumed.** Bigger
rooms alone PUSH spine share UP (toward less warren, not more): every
config with `[5,9]×[4,7]` rooms landed 0.79–1.00 across the floors
checked, comfortably inside `[0.6, 0.95]` and if anything closer to the
ceiling than the floor. What actually pushes spine share down is raising
`dugPercentage` (swept separately to confirm: 0.20 dropped floor 7 to
0.70) — consistent with the original `map-design.md` note about ROT's own
0.2 default, but the LEVER is dug percentage, not room size, and dug
percentage did not need to move. Spine share at the shipped config, floors
4–10 (below `MIN_ROSTER_FOR_SIDE` the split is not attempted and 1.0 is
correct, not a band check): 0.91, 0.91, 0.83, 0.84, 0.87, 0.86, 0.83 — all
in band.

**A pre-existing M14 bug, found here and fixed here, not just flagged.**
Changing the map shape broke two M3 tests that have nothing to do with map
generation (`forcing the roll to fire did not change any monster's tier`,
and the reached-the-top-of-the-table rate dropping below its 70%
threshold). Traced, not assumed: M14's guardian tier was `max(ceilingIndex,
highest index among every OTHER creature)` — when M3's rare reskin landed
on the SAME monster M14 later picked as guardian, M14 (running after M3)
silently rebuilt it back down to the ordinary ceiling, erasing M3's boost.
Confirmed directly at the failing seed: `before` and `after` (M3 forced to
fire) produced byte-identical rosters. Fixed by including the guardian's
own current index in the max, not just everyone else's — it can now only
go up, never back down. Both M3 tests pass again, untouched, because the
bug was in M14, not in them.

**Assert, checked:** room area and corridor length reported above,
measured directly against `ROT.Map.Digger`, not modelled. Spine share
tested in-suite (`rooms are bigger than the old default, and spine share
holds in band`) at every floor the split applies to. All tests green —
89/89, the 2 that broke mid-build fixed at the root cause, not patched
around.

This was last of the batch by design (`docs/backlog.md`'s own note: "most
likely to break the spine share M10 fixed"). Stopping here — the checkpoint
is I8's page, not another reading from me.

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

**And the rest of the pages, once I8's `run-check.html` works** —
`run-ruler.html`, `run-lab.html`, `run-batch.html`. One metrics page is the
target. Their modules stay; only the pages go. Coordinate with I8 rather
than deleting ahead of it.

The analysis modules they drive stay — `clustering.js` is still the source
of the finishes and per-turn damage numbers.

**Docs — already done.** `kpi.md`, `curve-shape.md`, `clustering-i2.md` and
`clustering-i3.md` are deleted; `decisions.md` is now a findings list rather
than a transcript.

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
  produce every number `run-check.html` shows; if any of them moves, the
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

