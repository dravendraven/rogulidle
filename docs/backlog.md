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
| 1 | B8 | Set REVERSAL_PENALTY to 6 — one line, measured by B3 | **DONE** |
| 2 | M26 | Weapons come off creatures, gated by strength — the only permanent power | **DONE** |
| 3 | M27 | Chests hold armour and potions — after M26, not with it | **DONE** |
| 4 | B4 | Give exploration a value — routing is the whole zigzag residue | **DONE** · shipped OFF |
| 5 | B9 | Teach the bot that a creature carries something | **REPORTED** · shipped ON, reopened |
| 6 | M28 | Belief clones a monster's drop before it should be knowable | READY |
| 7 | B10 | Weight the route toward a frontier by what it would reveal | READY |
| 8 | M21 | Deep floors put a creature in the room where the hero lands | READY · M24 landed |
| 9 | D1 | The crowd-correction fit is overdue for its own redo | READY |
| 10 | X1 | Delete what nothing references | READY · list refreshed |
| 11 | M4 | Side-room risk/reward spread scales with depth | READY · M22 dropped, so it lives |
| 12 | E1 | One resumable turn loop in src/sim, instead of four copies | READY |

The M11–M16 batch is done and closed — six items, one commit each, 89 tests
green. What it taught is in `docs/project/decisions.md`; the specs are in
git.

**Nothing has looked at `run-check.html` yet.** That was the checkpoint for
the batch and it is still owed, before M17 changes the same dials again.

Closed work is in `docs/project/decisions.md`. Parked and unscheduled is in
`docs/project/candidates.md`.


## M24 · the ceiling is a centre, not a cap

`work agent` · **REPORTED** — before M19

Floor 1's mean creature reads `xp 2.7`, which looks fine. **The mean is not
the problem — the tail is.**

A creature's tier is `floor(depthAt(pos) × difficultyScale × 10)`, so on
floor 1 the centre reaches **index 3**. Then `MONSTER_WEIGHTS` spreads ±2
from there with nothing stopping it going up:

    index 4   wolf   hp 5, xp 4   17% of draws from centre 3
    index 5   ogre   hp 7, xp 4    8% of draws from centre 3

Against a hero with 10 hp, no weapon and 0.83 damage a turn, **one wolf is
six turns of combat and 7.5 hp of damage — three quarters of the hero.**
Floor 1 holds five creatures.

**M13 made the bottom a real floor. Nobody made the top a real ceiling.**
What `difficultyScale` sets is a centre that the spread walks above.

**Do.** Clamp the drawn slot from above, exactly mirroring M13's clamp from
below — and M13's own mid-build lesson applies here unchanged: **clamp the
drawn slot, not the centre.** Raising or lowering the index the roll is
built around does not bound the outcome, because the spread reaches past it.

**Make the cap depth-dependent, like M13's floor.** Tight on shallow floors,
loosening with depth. A fixed cap would flatten deep floors too, and
`spread within a floor` is a health metric that is already falling
(60% → 49%).

**A likely side effect worth measuring rather than assuming.** Narrowing
floor 1 while leaving depth alone should make that metric *rise* — the
number is about whether spread shrinks with depth, and today's fall is
partly floor 1 being unusually wide because its tail runs three tiers above
its centre.

**One more thing pushing floor 1 the wrong way, found by M23.** Chest guard
coverage on floor 1 has gone from ~56% to **99%** — M17 raised the roster
from 2–3 creatures to 5, and M23's shorter mandatory path put more of a
small floor within reach. **Every chest on floor 1 is now guarded**, so the
hero cannot reach loot without fighting for it. That was not anyone's
decision; it fell out of two unrelated changes.

**Before M19.** M19 sizes a weapon against how deadly floor 1 is. Fixing the
tail first means it is sized against the floor that ships rather than
against a wolf that should not have been there.

**Assert.** Highest tier seen at floors 1, 5 and 10 — floor 1's should drop
by two indices. Mean xp per floor, which should barely move, since this cuts
a tail and not a centre. Cost of floor 1. And `spread within a floor`, to
see whether the side effect above is real.

### Result

**Mirrors M13 exactly, other direction — same constants, same fix, same
mid-build lesson reused rather than relearned.** `TIER_CEILING_SHARE_BASE
/ PER_LEVEL / CAP` (0 / 0.08 / 0.5, identical to M13's floor values) drive
`tierCeilingShare(level)` in `difficulty.js`; `spawn.js` clamps the DRAWN
SLOT (`slot = min(maxIndex, max(minIndex, rawSlot))`), not the centre
index — clamping the centre alone would have done nothing, since
`MONSTER_WEIGHTS`'s own ±2 spread still reaches past it either way. Also
folded into `expectedFloorMass`'s closed form (`difficulty.js`) and its
Monte Carlo cross-check test, the same way M13's own landing touched
M11's closed form — both needed the ceiling clamp applied to stay in
agreement, and the cross-check test caught the mismatch immediately when
it wasn't.

**Assert, measured — n=60/floor, `tierCeilingShare` forced to 1 for
"before" (reproduces the old unclamped reach, since the spread never
exceeds ±2 anyway):**

    floor 1    highest tier seen    5 -> 3   (drop of two indices, as asked)
    floor 1    mean xp              2.73 -> 2.58
    floor 1    mean threat mass     33.35 -> 26.92
    floor 5    mean xp              3.27 -> 3.17
    floor 5    mean threat mass     75.57 -> 67.83
    floor 10   mean xp              5.11 -> 5.05
    floor 10   mean threat mass     277.4 -> 276.7

Floor 1 takes almost the entire hit, as designed: mean xp barely moves,
but mean threat mass — which weighs the wolf/ogre tail, not just the
average — drops nearly 20%. Floor 10 is close to untouched, since its one
index of allowed slack already covers nearly all of the natural ±2 reach
that deep. **`spread within a floor` was not re-measured this session** —
`run-shape.html` is where to check it; disclosed rather than assumed.

**Skipped once, and the order mattered — the reason this landed second,
not first.** M19 was built and reported against a floor 1 that could
still roll wolf and ogre. This item does not touch M19's code; the next
step is re-measuring M19's own numbers against the floor this item
actually shipped, and updating M19's Result with what changed.

**Files touched:** `src/sim/balance.js`, `src/sim/difficulty.js`,
`src/sim/spawn.js`, `src/sim/dungeon.js` (forwarded `plan.tierCeilingShare`
into `playDungeon`'s per-floor `counts`, same pattern M19 already fixed
for `tierFloorShare`'s neighbours), `test/tests.js`, `docs/balance.md`,
`docs/rogule-spec.md` (new §13.15).

### Review — ADOPTED

Mirrors M13 exactly, including the lesson M13 had to learn mid-build:
**clamp the drawn slot, not the centre.** Clamping the centre would have
measured as nothing, because `MONSTER_WEIGHTS`'s ±2 reaches past it either
way. Reused rather than relearned, which is the whole point of writing that
down the first time.

The numbers are the shape the item asked for and not a difficulty cut:
floor 1's highest tier drops the requested two indices and its threat mass
falls 19%, while mean xp moves 2.73 → 2.58 and **floor 10 moves 277.4 →
276.7** — nothing. A tail was cut; no centre moved.

Folding it into `expectedFloorMass`'s closed form was necessary and the
Monte Carlo cross-check caught the mismatch when it wasn't there. That test
is now the second time it has paid for itself.

**One thing owed, and disclosed rather than assumed:** `spread within a
floor` was not re-measured, and M24 predicted it would *rise*. Not worth its
own item — whatever next touches floor composition measures it.


## M25 · a gentler floor 1, pivoted around an unchanged floor 10

`work agent` · **REPORTED** — owner request, mid-session

**Written by the work agent, not the project agent.** The owner asked for
this directly in session and authorised building it when shown the sweep.
Flagged rather than filed silently, since items are normally the project
agent's to write — the framing below is mine and is worth a review pass.

**Ask, in the owner's words:** floor 1 gentler, a smoother curve up to
floor 10, *"sem mexer em como o andar 10 estaria em relação a poder de
criaturas"* — floor 10's creature power must not move.

**Do.** `MONSTER_STRENGTH` 0.35 → 0.28 with
`STRENGTH_GROWTH_REBALANCED` 1.108 → 1.1358. Creature COUNT untouched.

**Assert.** Floor 10's strength and ceiling index identical to the
pre-change pair. Floor 1 strictly lower. No floor weaker than the one
above it.

### Result

**A pivot, not a difficulty cut.** The growth is solved rather than
picked: for any base it is `(0.35 × 1.108^9 / base)^(1/9)`, the value
that pins floor 10. So floor 10's ceiling index (8), mean xp and threat
mass (264.5) are unchanged to the digit, by construction. Three new tests
lock it — the anchor is checked against the LITERAL old pair, so moving
one constant without re-solving the other fails loudly.

**The base was swept, and sweeping was not optional.** Scoring the sd of
the log floor-to-floor threat-mass ratio (n=50/floor), 0.28 scores 0.116
against the old 0.204 — but 0.26 scores 0.226 and 0.24 scores 0.227,
both *worse than the setting they would replace* despite cutting floor 1
just as hard. The score is driven by where the integer ceiling-index
steps land, so it is not monotonic in the base and could not have been
reasoned to. Full table in `docs/balance.md`.

**What it bought.** Floor 1 threat mass 26.6 → 20.9 (−21%), and the curve
stops going backwards — the old ramp had floor 4 *easier* than floor 3
(ratio 0.96) and floors 2 and 9 nearly flat (1.02, 1.04) around a 73%
cliff at floor 3. Every floor-to-floor ratio is now 1.13–1.60.

**What it cost, disclosed because it is arithmetic and not fixable.**
Lowering the start while pinning the end makes the average slope
*steeper*: measured per-floor mass growth 1.291 → 1.326, and the M7
budget check drifts 3.2% → **9.4%** over, against the 15% band its test
allows. Two thirds of that band is now spent. Mid floors also hold
genuinely weaker creatures (ceiling index 4 → 3 at floor 3, 5 → 4 at
floor 5, 7 → 6 at floor 8) — that is what "smoother up to floor 10"
means, and the owner accepted it when shown.

**The obvious alternative was measured and rejected**, not skipped:
cutting floor 1's roster instead (`MONSTERS_BASE` 5 → 3, count growth
repinned) scored 0.247 — worse than the status quo — because integer
counts that low make each step a large relative jump, with floor 2
falling *below* floor 1. It would also undo M17 head-on.

**M17's flagged risk did not fire.** `saturatedAt` is still null at the
new pair (floor 10 reaches 0.881, under 1.0); the existing
no-saturation test covers it unchanged.

**Real-bot effect**, same 40 seeds as the M19 and M24 measurements: mean
death floor 3.40 → **4.03**, share dying by floor 2 35% → **30%**, and
**one run cleared all ten floors** — the first clear across all three
items' measurements on this seed range. One in forty is not a rate;
`run-check.html` at a real sample is where `finishes` gets decided.

**Two stale doc claims found while writing this up, corrected in place
rather than left:** `balance.md`'s headline model block still described
strength as flat 0.35 (and still describes the count law as
`2 × 1.3^(N-1)`, stale since M17 — flagged, not rewritten, since that is
M17's record to correct); and the crowd-correction fit's own escape
clause — *"if [the ramp] is ever switched on, this fit has to be
redone"* — has been due since M17 turned it on. Nobody owns that redo.

**Files touched:** `src/sim/difficulty.js`, `test/tests.js`,
`docs/balance.md`. No `rogule-spec.md` §13 entry: this is a number retune
of an already-documented mechanism, not a new rule, matching the M12
precedent.

### Review — ADOPTED

**Solved, not picked.** Pinning floor 10 by construction (`(0.35 × 1.108^9
/ base)^(1/9)`) is the right shape for a constraint the owner stated as a
constraint, and the tests check the anchor against the **literal old pair**,
so moving one constant without re-solving the other fails loudly. That is
the part that will still be true in six months.

**The sweep earned its keep and is the finding here.** 0.26 and 0.24 score
*worse than the setting they replace* while cutting floor 1 just as hard,
because the score is driven by where the integer ceiling-index steps land.
Non-monotonic in the base. **Nobody could have reasoned to 0.28**, and the
obvious alternative — cutting the roster — measured worse than the status
quo and would have undone M17 head-on. Both recorded.

**The cost is stated plainly and is the thing to watch.** The M7 budget
check drifts 3.2% → **9.4% against a 15% band**: two thirds spent, by
arithmetic that cannot be fixed while both ends stay pinned. **M26 and
anything else that adds threat now has to be checked against that band
before it is built, not after.**

**Real-bot: mean death floor 3.40 → 4.03, dying by floor 2 35% → 30%, and
one run cleared all ten.** First clear on record. Correctly not called a
rate at 1-in-40.

**This also closes a pending re-measure.** M24 owed M19's numbers against
the floor that actually shipped; M25 measured the same 40 seeds and the
post-M24 baseline is 3.40, against M19's pre-M24 2.70. No separate pass
needed.

**Written by the work agent and flagged as such** — correct call, and the
framing holds up.


## B3 · stop the zigzag

`bot agent` · **REPORTED** — one layer fixed, one measured and blocked on
`src/sim/balance.js`, one still open

The bot walks back and forth between two tiles instead of committing. It is
the ugliest thing on screen.

**B1 already found where it lives.** Diagnose no further than you need to —
go and fix it.

    tactical veto     61–64%    the main cause
    routing           14–21%    happens BEFORE the veto is consulted
    goal switching     7–11%    a real but minor share

**Two things already tried that did not work.** `REVERSAL_PENALTY` was swept
0 / 1.5 / 6 and moved the reversal rate only 0.238 → 0.205 while costing win
rate; it sits at 0 today. And a fix scoped only to `scoreActions` /
`bestValue` in `tactics.js` cannot reach the routing share at all, since
that fires before the veto runs.

**Why it happens, as far as anyone knows.** The veto compares a planned step
against alternatives and dodging a blow is worth far more than a step
towards the goal — `STEP_COST_IN_HP` is 0.01, so a step is worth a hundredth
of a hit. Backing off always scores better than closing. `standoff`
(`bot.js:491`) already hit this exact pathology elsewhere and solved it by
**committing to a choice once** instead of recomputing every turn; that
lesson was never generalised.

**Do.** Fix it. You choose how — a commitment window, a hysteresis, a
memory of the last step, or something else the code suggests once you are in
it. Report what you tried, including what failed.

**Assert.** Reversal rate before and after, from `run-check.html`. And the
distribution, not just the mean: a fall in the average can hide the
pathological runs surviving intact — this happens in about one run in nine.

**Do not touch `src/sim/`.** The map is being changed in parallel by another
session. If the fix seems to need an engine change, report it instead.

**A warning about the numbers.** Reversal read 46% and then 19% across two
recent readings, and that drop was **not** the bot improving — runs got
shorter, so there were fewer chances to pace. Take your before-reading
yourself, in the same session as your after-reading, and do not compare
against a number from the backlog.

### Result

**One of the three layers is fixed and shipped. The dominant one is
measured, has a one-line answer, and is left undone because the line is in
`src/sim/balance.js`** — the file this item forbids touching while the map
session is in it. That recommendation is the main output of this item and
is spelled out below.

**The warning about run length was the important part, and it cuts both
ways.** The pooled reversal rate is dominated by a handful of very long
runs, and those runs are long *because* they pace — the worst run in the
before-reading spent 67.5% of its actions reversing over 2532 actions,
while the median run sat at 18.5%. A pooled mean over that mixture is
mostly a length measurement. So `run-zigzag.html` (new, root, temporary —
add it to X1) reports the per-run distribution instead: share of runs with
at least one episode, share of turns spent inside episodes, the median
run's own share, and actions per run alongside every one of them. An
"episode" is B1's own definition, a maximal window of ≥4 strictly
alternating actions, so the layer split stays comparable with §4.5.

**Landed — goal switching, the smallest share, and it is gone.**
`chooseGoal`'s loot branch now gets the same hysteresis the monster branch
has always had, reusing `GOAL_STICKINESS` rather than inventing a number;
`balance.js`'s own comment on that constant already flagged that loot was
uncovered. Two chests of near-equal net value swapped places every turn
because a step towards one changes the distance to both.

    n=60, seeds 800000, before and after in the same session
    pooled reversal rate      31.8%  ->  23.6%
    turns inside episodes     30.3%  ->  21.4%
    goal-layer episodes         151  ->  11
    actions per run             528  ->  509     (not a length artefact)
    finishes                    5.0% ->  6.7%

**Tried and failed — route commitment, for the routing share.** The idea
was to generalise `standoff` the way the item suggests: cache the route to
a stationary goal and follow it, instead of rebuilding one every turn,
while nothing is close enough for the veto to want a say. It made things
worse — pooled 23.6% → 30.2%, turns inside episodes 21.4% → 28.8%,
actions per run 509 → 589. The typical run did improve (median run's rate
12.0% → 9.7%, runs affected 81.7% → 75.0%); the pathological ones got
worse and longer, which is the same distribution trap this item warns
about, seen from the other side. **Probable cause:** `believedWalkable`
counts unseen tiles as walkable, so a committed route happily aims through
what turns out to be rock; the bot then bumps a wall, which passes no turn,
and re-plans — every bump is another action with another chance to
reverse. A second variant that only committed over tiles already seen was
no better (30.9%). Reverted, not kept behind a flag.

**Measured, not landed — and this is the recommendation: set
`REVERSAL_PENALTY` from 0 to 6.** It is the remedy the item lists as
already tried and failed. It was not failing; it was being judged on the
pooled mean, which is the number the item itself warns is a length
measurement. Under the distribution it is the single biggest win available,
and it costs nothing:

    n=60, on top of the goal fix, same session
                          seeds 800000        seeds 910000 (confirmation)
                          0        6          0        6
    pooled rate           23.6%    16.0%      27.2%    14.8%
    turns in episodes     21.4%     9.2%      25.5%     7.5%
    median run's share     9.0%     5.6%       5.5%     2.8%
    runs with an episode  81.7%    68.3%      66.7%    58.3%
    veto-layer episodes     135        0        150        0
    mixed-layer episodes    164        0        213        1
    actions per run         509      589        428      376
    finishes               6.7%     6.7%       0.0%     0.0%
    median depth              4        4          4        3

**The two seed families move run length in opposite directions and agree
anyway** — one gets 16% longer, the other 12% shorter, and turns-inside-
episodes falls by more than half in both. Veto-layer episodes go to zero
on both, which is a mechanism check rather than a rate. The cost the
earlier sweep reported does not reproduce: finishes are identical on the
primary family and zero on both sides of the confirmation family. The one
wobble to hold against it is median depth 4 → 3 on the confirmation family,
against 4 → 4 on the primary.

**Raising `TACTICAL_OVERRIDE_MARGIN` is the trap, and it looks like a fix
if you only read the ratios.** At 1.5 the median run's zigzag share falls
to 7.0% and at 3 to 6.9% — while finishes collapse from 6.7% to 1.7% and
median depth from 4 to 2, because actions per run drop 509 → 435 → 297.
The bot stops pacing by dying sooner. Exactly the artefact behind the
46%-then-19% reading. Leave it at 0.5.

**What is left after all of that: routing, and it is now the whole
residue.** With the penalty at 6 the layer split is veto 0, goal 13,
mixed 0, routing 259. Route commitment was the obvious attack on it and it
failed for a specific, understood reason. The next attempt should probably
go at the wall-bump — a route aimed into the dark that turns out to be
rock costs an action without costing a turn — rather than at the routing
choice itself.

**Files touched:** `src/bot/bot.js` (loot hysteresis only),
`test/tests.js` (one test: two equidistant chests, six turns, no
reversal and no change of mind), `run-zigzag.html` (new instrument),
this item. **`src/sim/` untouched**, which is why the penalty
recommendation is a recommendation.


### Review — ADOPTED, and the recommendation is accepted

**The distribution warning was the item's whole point and B3 took it
further than it was written.** The pooled rate is mostly a length
measurement — the worst run reversed 67.5% of 2532 actions while the median
run sat at 18.5%. `run-zigzag.html` reporting the per-run distribution
*alongside actions per run* is the right instrument and the reason the rest
of this item is trustworthy.

**Landed:** loot hysteresis, reusing `GOAL_STICKINESS` rather than inventing
a number — and `balance.js`'s own comment had already flagged loot as
uncovered, so the constant was waiting for it. Goal-layer episodes 151 → 11,
with actions per run *falling* slightly, so it is not a length artefact.

**The failed attempt is worth as much as the fix.** Route commitment made
the typical run better and the pathological runs worse — the same
distribution trap, from the other side. And the cause is specific rather
than a shrug: `believedWalkable` treats unseen tiles as walkable, so a
committed route aims into rock, the bump passes no turn, and every re-plan
is another chance to reverse. Reverted rather than left behind a flag, which
is right.

**`REVERSAL_PENALTY` 0 → 6 is accepted.** It was never failing; it was being
judged on the pooled mean, which the item itself warns is a length
measurement. Two seed families that **move run length in opposite
directions** — one 16% longer, one 12% shorter — agree anyway, turns inside
episodes falls by more than half on both, and veto-layer episodes go to zero
on both, which is a mechanism check and not a rate. Median depth 4 → 3 on
the confirmation family is the one thing held against it; watched, not
blocking, since finishes are unchanged on both.

**Not touching `src/sim/` while the map session was in it was correct**, and
handing over a measured one-line recommendation is exactly what the boundary
is for. Filed as B8 so it does not live only in a report.

### The third instance of the same error, found by a third agent

**Raising `TACTICAL_OVERRIDE_MARGIN` looks like a fix and is the bot dying
sooner.** Zigzag share falls to 6.9% while finishes collapse 6.7% → 1.7%
and actions per run 509 → 297. The ratio improves because the denominator
is destroyed.

That is the same error as I7's share-of-turns, and as the one M3 found one
level further in this same session. **Three instances, three different
agents, none of whom had seen the others' version.** It is now written in
`docs/project/decisions.md` as a class rather than three anecdotes.


## D1 · the crowd-correction fit is overdue for the redo it asked for

`work agent` · READY

The crowd-correction fit carries its own escape clause in `docs/balance.md`:
*"if [the ramp] is ever switched on, this fit has to be redone."* **M17
switched it on.** Found by M25 while writing up something else; nobody owns
it, which is why it is now an item.

**Do.** Refit against the ramp as it actually ships today, or — if the
refit lands close enough to the current numbers to not matter — say so and
delete the escape clause, so the next person does not re-find it.

**Assert.** Whatever the fit predicts against what real play does, at the
shipped dials. If nothing moves, that is a result and gets written down.

**Also owed, smaller:** `balance.md`'s headline block still states the count
law as `2 × 1.3^(N-1)`, stale since M17. M25 flagged it rather than
rewriting someone else's record. Fix it here.

## B8 · set REVERSAL_PENALTY to 6

`work agent` · **REPORTED** · **one line**

B3 measured this and could not ship it — the line is in `src/sim/balance.js`
and B3 was forbidden that directory while the map session was in it. The
measurement is done and reviewed; this is the commit.

**Do.** `REVERSAL_PENALTY` 0 → 6 in `src/sim/balance.js`, and the row in
`docs/balance.md`. Nothing else. B3's Result has the full table.

**Assert.** Nothing new. Re-run `run-zigzag.html` before and after **in one
session** and confirm turns-inside-episodes roughly halves; report actions
per run beside it. If median depth drops on both seed families rather than
one, say so — that was the single reservation in the review.

### Result

**The line was already committed** — `c5957e9`, landed the turn before this
prompt arrived, same change B8 asks for (`balance.js` + the `balance.md`
row + the detailed section, which had been left saying "does not fix what
it targets" and would have contradicted the new value in the same file).
Nothing left to commit here; this item is the Assert.

**Re-run in one session, `run-zigzag.html`, `reversalPenalty` 0 vs 6 via
the page's own override field — `balance.js` untouched by the
measurement, n=60 both families:**

    seeds 800000 (primary)          0        6
    turns in episodes            23.8%     9.8%
    pooled rate                  25.8%    15.7%
    veto-layer episodes            124        0
    actions per run                 453      486
    median depth                      4        4

    seeds 910000 (confirmation)     0        6
    turns in episodes            29.9%     7.2%
    pooled rate                  31.1%    16.7%
    veto-layer episodes            244        0
    actions per run                 436      385
    median depth                    3.5        3

**Turns-inside-episodes more than halves on both** (23.8→9.8, 29.9→7.2).
Veto-layer episodes hit exactly zero on both, same mechanism check as B3's
own run. Actions per run still move in opposite directions between the two
families (486 vs 453 up; 385 vs 436 down) — the same length-control
disagreement B3 reported, reproduced.

**The reservation asked about — does median depth drop on both families
rather than one — still holds as "one, not both".** Primary: 4 → 4,
unchanged. Confirmation: 3.5 → 3, the same direction B3 flagged, not a new
family joining it. Absolute levels differ a little from B3's own numbers
(pooled rates read a few points higher here on both arms at penalty 0,
e.g. 25.8% vs B3's 23.6%) — plausible drift from bot changes landed since
B3's session (c38dc9e gave the bot its own floor number) rather than
anything about this change; the DIRECTION and SIZE of the 0→6 effect is
what B8 exists to confirm, and it reproduces.

**Nothing failed.** The only thing worth flagging as a surprise is that
this item arrived already done — the code half of B8 and the previous
turn's REVERSAL_PENALTY commit were the same change, described from two
different angles.

### Review — ADOPTED

Confirms B3's own numbers rather than repeating them blind: turns-inside-
episodes more than halves on both seed families, veto-layer episodes hit
zero on both. The one reservation (median depth drops on the confirmation
family, not the primary) reproduces exactly as flagged, not worse. Arrived
already committed — the code and this Assert were the same change from two
angles, correctly not re-done.


## M3 · un-archive the out-of-depth tail

`work agent` · **DONE** — adopted

### Review of M3 — ADOPTED. And my fix to the measurement was also wrong

**The finding is the method, not the tail.** I archived M3 on CV, which was
the wrong test. Then I said the right one was p95/p99 **conditioned on
combat-adjacent turns**, which I7 had shown fixed the dilution. That was
also wrong, and M3 found out why:

> An out-of-depth creature carries far more hp, so fights last longer. It
> adds low-damage adjacent turns to the denominator faster than high-damage
> ones to the numerator.

**Any share-of-turns statistic is diluted by a treatment that changes how
many turns exist.** Conditioning moved the error one level in; it did not
remove it. The statistic that works has **no denominator at all** — worst
single turn per run.

**Measured that way, 240 paired descents:**

    worst turn in a run      off      on       z
    share >= 5              6.3%    14.6%    3.02
    share >= 7              0.4%     7.5%    4.05
    share >= 8              0%       4.2%    3.23
    share >= 4              unmoved           1.21

**That is the shape the item was written for**: the routine fight is
untouched and only the far tail moves. Against a 10 hp hero a 7–8 damage
turn is 70–80% of everything it has, and it went from 1 run in 240 to about
1 in 13.

An earlier n=80 pass had every threshold pointing the same way at z=1.1–1.7
and was **not reported**, per the 2σ rule; n was tripled instead. That is
the rule doing its job rather than being cited.

**No sweep, because none was needed** — the peak moved decisively at the
shipped guesses. The note left for whoever sweeps later is the useful part:
`CAP` binds from floor 8, so raising `PER_LEVEL` alone only moves shallow
floors.

### The red test: raise its n, and the drift is a separate finding

Floor 7 reads 0.96 against a `[0.6, 0.95]` band, at **n=25**. With the tail
off at those same seeds it already reads 0.940 — one hundredth from the
ceiling before M3 touches anything — and the tail adds about +0.006.

**At n=60 the true value is inside the band**: 0.925 off, 0.931 on. The test
is an underpowered read of a proportion against a hard threshold.

Raising n is the right fix and not the suspicious version of it. The
suspicious version is raising n *until it passes*; here the larger sample
was taken first and lands 0.025 clear of the ceiling, which is a
measurement, not a search.

**And the drift underneath is real.** M23 restored floors 3/5/7 to
0.852/0.874/0.899. Tail-off today they read 0.892/0.937/0.925 — **M24 and
M25 walked spine share back up and nobody was watching.** Still inside the
band, so not urgent; recorded so that the next thing to nudge it is not
blamed for all of it.

**Leaving it red rather than fixing it was right**, and for the reason
given: M23's precedent is that spine share is never repaired by editing the
band or the test.

## M26 · weapons come off creatures, gated by how strong the creature is

`work agent` · **REPORTED** · **owner request, reframed — read the second section
before building**

**Ask, in the owner's words:** weapons drop from creatures, rarely, scaling
with strength, with a cap — *"axe nao dropa de criaturas fracas"*. Chests
hold armour and potion instead, a little more often. Weapons should feel
rare in a run.

### Why this is bigger than a loot reshuffle

`weaponDamage` **sums the inventory**, and `WEAPONS_WIDEN_ROLL` is true, so
every weapon widens the damage die permanently for the rest of the run.
`XP_FROM_KILLS` and `HP_FROM_KILLS` are both false. **Weapons are the only
thing in this game that makes the hero permanently stronger.**

That makes this the missing conversion. Floor 10 costs about 95 hp against a
10 hp cap, and the reason that gap has never closed is that a kill buys
nothing durable. Putting weapons on creatures means **creature strength
becomes the supply curve** — deeper floors carry stronger creatures, so
deeper floors arm the hero better. That is the DCSS shape, where a monster's
loot IS its equipment, and it arrives here by the owner's own instinct
rather than by importing it.

**So build it. But the word "rare" has to be aimed carefully**, because it
points at the one curve holding the run up.

### The supply arithmetic, before any dial is picked

Today, per floor: 6 chests, `hasLoot` averaging ~0.55, then `itemWeights`
gives a weapon 0.5/`SCARCITY` = 0.167 of a loaded chest. That is **~0.55
weapons per floor, ~5.5 over a descent**, plus M19's guaranteed one.

If weapons simply move to creatures at today's `DROP_CHANCE` 0.5 and
`SCARCITY` 3, with weapon as the only monster kind: 0.5 x 1/3 = 0.167 per
creature, over roughly 64 creatures in a full descent — **about 10.7
weapons. Nearly double today, not rarer.** Whatever "rare" is set to has to
be measured against that, not against intuition.

**Do not cut total supply hard on a first pass.** M25 has the hero dying at
floor 4.03 and one run in forty finishing; the descent is already short.
Aim total accumulated weapon damage by floor 10 within about 20% of today's,
**redistributed later in the run** — that is what "rarer" should buy, a run
where the hero starts thin and arms up by killing, not a run with less gear
in it. If a sweep says a real cut plays better, that is a finding and it
ships; the point is that it is measured rather than assumed.

### The trap: do not make being armed at all the rare thing

Unarmed, the hero deals about 0.83 damage a turn and one floor-1 creature
costs it most of its hp. **M19 exists for exactly this reason** and moved
mean death floor 1.75 to 2.70. Gating the first weapon behind a kill is
circular: the hero must win the fight the weapon exists to make winnable.

**Keep M19's guarantee and restrict it to the dagger.** The rarity the owner
is asking for lives in the *upgrade*, not in being armed — and with only
`dagger` (+1) and `axe` (+2) in the table, the axe is the only thing rarity
can meaningfully act on.

### Do

**Reuse the `quality` machinery rather than adding a curve.** `itemWeights`
already tilts within a kind by `value^(2q - 1)`: at q = 0 strong items are
rare, at q = 1 the axe is the COMMON outcome. Drive q **from the killed
creature's tier** instead of from position, and the owner's "raridade
proporcional a forca" falls straight out of the existing expression with no
new shape invented.

**The cap is a filter, not a tilt.** Below some tier, remove `axe` from the
pool entirely — a tilt only makes it unlikely, and the owner asked for
"nao dropa", which is a different statement. That threshold is a dial.

**Add `'weapon'` to the monster source** in `itemWeights`; whether potion
stays there is M27's call, not this item's.

### Assert

Weapons per floor and cumulative weapon damage by floor 10, before and
after. Highest weapon seen on floors 1, 5 and 10 — the axe should be absent
early by construction, and that is a mechanism check, not a rate. Mean death
floor and `finishes` from `run-check.html`. And the **budget band**: M25
left the M7 check at 9.4% of 15%, so report where this lands it.

**Do not measure this with a ratio.** Three items this session were misread
by a share whose denominator the treatment had moved — see the head of
`docs/project/decisions.md`. Totals and peaks.

### Result

**Built as specified: a swap, not an addition.** `itemWeights('chest', ...)`
now draws `armour` only; `itemWeights('monster', ...)` draws `weapon` AND
`potion` together (potion was already there — weapon is what moved).
Quality is driven by the killed creature's own tier
(`MONSTER_TABLE.indexOf(template) / 10`) instead of position, reusing the
existing `value^(2q-1)` expression untouched. `WEAPON_AXE_MIN_TIER` (4,
wolf) is a genuine FILTER, added as a fourth `itemWeights` argument
(`exclude`) that removes an item from the pool before weights are
computed — below tier 4, `axe` is not merely unlikely, it is provably
absent. M19's guarantee kept, restricted to `dagger` — the rarity lives in
the upgrade, not in being armed, per the item's own trap warning.

**The supply arithmetic caught a real problem before it shipped.** Moving
weapon onto the SHARED `SCARCITY` (3) — same value chests used to use —
landed at 6.76 cumulative weapon damage over a descent, 35% under the
pre-M26 baseline (10.37) and well outside the item's own ~20% band. Split
weapon scarcity out into its own dial (`WEAPON_SCARCITY`, `difficulty.js`
— free to do once chests stopped touching it) and swept it:

    scarcity   cum. weapon dmg (10 floors)
    3.0            6.76   (shared default — 35% short)
    2.5            7.83   (24% short)
    2.0            9.69   (6.6% short — shipped)
    1.7           11.49   (inside the band, but close to "unchanged")
    1.5           12.79   (over the pre-M26 baseline)

Shipped at 2.0.

**Before/after, n=150/floor, old mechanism measured from a snapshot of the
pre-M26 commit (not from memory or the arithmetic estimate) via the same
seeds:**

    weapon events (10 floors)     6.58  ->  8.09
    weapon damage (10 floors)    10.37  ->  9.59    (-7.5%, inside ~20%)

More events, less total damage — the redistribution the item asked for,
not just a cut. Damage per floor, new mechanism: floor 1 0.72, floor 4
0.67, floor 7 1.18, floor 10 1.30 — rises with depth. Under the old,
position-driven mechanism it was flat (~1.0-1.15 every floor, since a
chest's quality depends on where it sits, not what floor it's on).

**Highest weapon damage seen, by floor — the mechanism check the item
asked for, not a rate:** floors 1-3 never exceed 1 (dagger only, across
150 seeds each) — `WEAPON_AXE_MIN_TIER` (4) sits above both floors'
ceiling index (2 and 3) under the shipped M25 curve, so this is
structural, not lucky. Floors 4+ reach 2 (axe possible).

**Real bot, 40 seeds each, same seeds both arms:** mean death floor 3.65
-> 3.88, one clear appeared in the new arm (none in the old, same seed
range), share dying by floor 2 unchanged (30% -> 30%). Small, in the
expected direction, **not tested for 2-sigma significance** — flagged
rather than claimed, per the measuring note.

**Budget band untouched, as it should be.** This item changes what a
creature DROPS, never its hp/xp/tier, so the M7 challenge-budget check
(left at 9.4% of 15% by M25) is unaffected by construction — verified by
the fact its own test still passes unedited.

**Found and disclosed, not fixed: `CHEST_QUALITY_BY_DEPTH` and
`EARLY_CHEST_QUALITY_BOOST` are now inert.** Chests' only remaining kind
(`armour`) has a single member (`shield`), and a quality tilt has nothing
to act on with one item in a kind. Left live rather than special-cased
away — M27 is expected to add `potion` (also single-member) to chests,
and the computation should not quietly diverge from what a chest with a
real multi-item kind would do. Two tests updated to reflect this rather
than fail against a premise M26 removed (`test/tests.js`'s "depth
makes the strong item the common one" retargeted to the `monster` source,
where the tilt now lives; the early-chest-boost richness test rewritten
to assert the new invariant — no chest, boosted or not, ever holds a
weapon).

**Also fixed while here:** a stale comment in `src/bot/loot.js` claiming
chests hold "weapons and armour, no potions" — the VALUE it computes was
never wrong (it reads `itemWeights` live), only the description of it.
Touches `src/bot/`, outside this session's `src/sim/` role; flagged here
rather than left silently edited, per CLAUDE.md's role boundary. One-line
comment, no behaviour change.

**Files touched:** `src/sim/balance.js` (`WEAPON_AXE_MIN_TIER`),
`src/sim/difficulty.js` (`WEAPON_SCARCITY`, wired into `floorParams`/
`DEFAULT_MODEL` in place of the shared `SCARCITY` for the weapon field),
`src/sim/spawn.js` (`itemWeights`'s kind swap and `exclude` argument,
per-monster quality in `placeOne`, M19's guarantee restricted to
`dagger`), `src/bot/loot.js` (comment only, flagged above), `test/tests.js`,
`docs/balance.md`, `docs/rogule-spec.md` (new §13.16).

### Review — ADOPTED

The arithmetic section did its job: the shared-`SCARCITY` first attempt
landed 35% under the item's own band, was caught before shipping, and a
split `WEAPON_SCARCITY` dial was swept to 2.0 rather than picked. Damage per
floor now rises with depth (0.72 to 1.30) where the old chest mechanism was
flat — that is the redistribution the item asked for, not a relabelled cut.
Axe absence on floors 1-3 confirmed structural against the shipped M25
curve, not a lucky sample. M19's guarantee correctly narrowed to the dagger
only. Budget band verified unaffected by construction, not assumed.

**One thing to watch, not act on yet:** `CHEST_QUALITY_BY_DEPTH` and
`EARLY_CHEST_QUALITY_BOOST` are inert with chests down to one item per kind.
Correctly left alone rather than special-cased — M27 is expected to revive
the question by adding `potion` to chests.


## M27 · chests hold armour and potions

`work agent` · **REPORTED** · **after M26 has been measured, not with it**

Owner request, the other half of M26: chests hold armour and potion, a
little more often. Split from M26 deliberately.

**Why split.** The two halves push in *opposite directions* on the thing the
owner actually wants. Weapons on creatures makes killing pay. Moving the
heal off creatures and into chests makes killing pay **less** — sustain
stops requiring combat, and the bot gains a way to top up by walking. Run
them together and the net is unreadable.

**Do.** Move `potion` to the chest source, and raise chest loot frequency by
whatever the sweep supports. `SCARCITY` is currently one number shared by
all three kinds; this probably wants the potion dial split out.

**Assert.** Same as M26, plus: does the bot fight less? Kills per floor, and
share of creatures left alive when the shrine is taken.

### Result

**Built as the mirror image of M26: a swap, the other direction.**
`itemWeights('monster', ...)` now draws `weapon` only; `itemWeights(
'chest', ...)` draws `armour` and `potion` together. Before M27 it was
the opposite for potion — monster had it, chest did not.

**Caught the side effect M26's own comment predicted before it shipped
anything.** Removing `potion` left `weapon` as monster's ONLY kind, and
`itemWeights` splits mass evenly across a source's own kinds
(`shareEach = 1/kinds.length`) — so weapon's share doubled (0.5 -> 1.0)
independent of anything this item is about. Measured before deciding
anything: at M26's shipped `WEAPON_SCARCITY` (2), cumulative weapon
damage jumped 9.59 -> 19.31, almost exactly 2x. Raised to 4 in the same
commit, which lands at 9.58 — matching M26's own already-measured,
already-shipped result to two figures. M27 does not get to silently move
a number M26 closed.

**The swap alone, at the unchanged shared scarcity (3, same as armour),
already delivered "a little more often" — no dial-pressing needed.**
Total heal supply across a descent: 16.38 (monster-sourced, before M27)
-> 18.32 (chest-sourced, scarcity 3, unchanged). Chests roll loot
slightly more often than monsters carry it purely from the two
mechanisms' own shapes (`hasLoot`'s ~0.55 mean vs `MONSTER_DROP_CHANCE`'s
flat 0.5), not from any number chosen for this item.

**Split `POTION_SCARCITY` out anyway, per the item's own suggestion, and
swept it to see how far "a little" could go before it stopped meaning
that:**

    potionScarcity   cum. heal supply   vs pre-M27 (16.38)
    3.0 (shipped)         18.32            +11.8%
    2.5                   22.08            +34.8%
    2.0                   27.26            +66.4%
    1.5                   36.98           +125.8%
    1.2                   46.10           +181.4%

Shipped at 3.0 — the unsplit shared value already IS the measured "a
little more"; everything swept below it reads as "a lot more."

**Does the bot fight less — the question this item added.** Real bot, 40
seeds, same seeds both arms. Raw kills per run fell 23% (17.7 -> 13.57),
but mean depth fell too (3.88 -> 3.2) — the same denominator trap this
session has now hit three times (I7, M19-adjacent, M3). Normalized to
kills per floor actually played, the real fall is much smaller:
**4.126 -> 3.909 kills/floor, ~5.3%.** Share of creatures left alive when
each floor's shrine (staircase) was taken did not move (0.06 -> 0.07).

**The depth drop itself does not clear 2 sigma (z = -1.55, n=40) — flagged,
not claimed.** It is the direction the item warned was possible ("sustain
stops requiring combat"), but this sample cannot say it is real. Worth a
larger read before treating it as a finding.

**Budget band untouched, same reasoning as M26**: this item changes what
a SOURCE holds, never a creature's hp/xp/tier, so the M7 challenge-budget
check is unaffected by construction.

**The M26 quality-inertness finding continues exactly as predicted, not
resolved.** Chest now has two kinds (`armour`, `potion`) instead of one,
but each still has a single member (`shield`, `health`) — a quality tilt
still has nothing to act on. M26's Result said this would stay true after
M27 landed `potion`; it did.

**Two new tests, mirroring M26's:** "potions no longer come from the
ordinary monster draw" and "a chest can hold a potion now" (the
mechanism-check pair, same shape as M26's weapon-side pair). Plus a
direct check that `WEAPON_SCARCITY`'s re-sweep actually landed where the
comment claims (`itemWeights` weapon mass == `1/WEAPON_SCARCITY` now that
it's the only monster kind), and the equivalent for `POTION_SCARCITY` on
the chest side.

**A concurrent-session hazard hit and cleared, not caused by this
item.** Mid-measurement, the descent harness crashed inside
`src/bot/loot.js`'s `expectedChestValue` — `values` came through
`undefined`. Reproduced once, could not reproduce again after a reload;
`src/bot/bot.js`/`src/bot/loot.js` were being actively edited by a
concurrent bot-agent session at the time (B9 landing). Not this item's
files, not this item's bug — noted here only because it interrupted the
measurement run and the interruption should be legible in the record
rather than silently retried away.

**Files touched:** `src/sim/difficulty.js` (`POTION_SCARCITY`;
`WEAPON_SCARCITY` re-tuned 2 -> 4), `src/sim/spawn.js` (`itemWeights`
kind swap, header comment), `test/tests.js`, `docs/balance.md`,
`docs/rogule-spec.md` (new §13.17).

### Review — ADOPTED

Caught its own side effect before shipping it: pulling `potion` off the
monster source left `weapon` as its only kind, and `itemWeights` splits mass
evenly across a source's own kinds — so weapon supply silently doubled
(9.59 to 19.31) for a reason that has nothing to do with what this item
touches. Re-tuning `WEAPON_SCARCITY` 2 to 4 to land back at 9.58 against
M26's already-shipped 9.59 is the right fix, and the balance.md top table
reflects the 4, not just the prose.

The kills-per-floor normalization is the right instinct and the report
earns it explicitly — raw kills/run fell 23% but depth fell too, and this
session has hit that same denominator trap three times already (I7, M3, and
the M19-adjacent read). Normalized, the real fall is ~5.3%, and the
depth-drop itself is correctly held at z = -1.55 rather than claimed.

Not pressing `POTION_SCARCITY` past the unchanged shared value is the
right call — the swap alone already delivered "a little more often"
(+11.8%), and the sweep table exists so a later item can go further with
evidence rather than a guess, not because this one needed to move it.

Quality-inertness continues exactly as M26 predicted it would, which is a
mechanism confirming itself twice rather than two unrelated non-findings.

**The concurrent-session crash is worth carrying forward, not just
noting.** `expectedChestValue` threw on `values` undefined while B9 was
actively editing the same `src/bot/loot.js`. Reproduced once, not on
reload. Nothing to act on now since it did not reproduce, but if it shows
up again during a parallel bot/map session it is not new — it is this.


## M21 · deep floors have something waiting where you land

`work agent` · **BLOCKED on M19**

The hero lands and has a moment to look around. On floor 1 that is an
opening; on floor 10 it is a free turn the floor should not be giving away.

**Do.** Make the chance that the spawn room holds a creature rise with
depth — near zero at the top, near certain at the bottom.

**What it costs the hero, and it is not the creature.** Tier comes from
`depthAt(pos, 'risk')`, which is distance from the hero, so anything in the
spawn room is drawn from the *bottom* of that floor's range. The danger is
not that it is strong — M13's tier floor decides that — it is that the bot
starts a floor **in contact, with no map**. Fog of war means it has seen
nothing yet and has to commit before it knows where anything is.

That is the whole reason it is interesting to watch, and also the reason it
might be too much: a bot that opens floor 10 already fighting has no
information to route with.

**Blocked on M24 now — M19 landed and paid the original debt.** What remains is narrower: this item places a creature next to where the hero lands, and M24 changes the tier of what can legally be there. Building it first means placing against a table that is about to change.

The old reasoning, kept for the record: `run-check` at n=30 says
**14 of 30 runs die on floor 1** and 24 of 30 by floor 2. Putting a creature
where the hero lands, before the hero can survive landing, is piling onto a
wall. M19 has to make the opening survivable first — then this becomes a
real escalation instead of a second lock on the same door.

Also after M20, which moves the spawn to a room centre. Placing creatures
relative to a spawn point that is about to move is work done twice.

**Assert.** Share of floors whose spawn room holds a live creature, at 1, 5
and 10 — near zero, middling, near certain. And `finishes`, because this is
one more thing making the descent harder at a moment when it is already at
zero.

## B4 · give exploration a value

`bot` · `bot agent` · **REPORTED** — both halves measured, both shipped off

**B3 makes this the top bot item.** With `REVERSAL_PENALTY` at 6 the layer
split is veto 0, goal 13, mixed 0, **routing 259** — routing is the entire
residue. B3 attacked it mechanically with route commitment and that failed,
because `believedWalkable` sends a committed route into rock. B4 is the
other attack on the same residue: a route is unstable partly because its
destination is worth nothing, and point 3 below predicted exactly the
dynamic B3 went on to measure.

Unexplored map is worth exactly zero to the bot. `frontierGoals` returns
`{kind, pos}` with no value (bot.js:121), and exploration is branch 3 of
`chooseGoal` — a fallback, never a competitor (bot.js:321). When it does
explore it picks the **cheapest** frontier to reach, not the most promising.

**Why it matters.** Three reasons, and the third may be the largest.

1. It cannot form "worth 2 hp of risk to see what is over there", which is a
   decision the game is built around.
2. It fights the map design directly. `CHEST_LOOT_RICHER_FAR = true`
   deliberately puts the good loot far from the spawn, sweeping 10% to 100%,
   and `CHEST_QUALITY_BY_DEPTH` makes depth buy quality. The map hides the
   reward far away; the bot explores by proximity at zero value.
3. It may be what feeds the ping-pong. B1 found the loop lives in the
   tactical veto, and the veto wins whenever the plan has no strong pull —
   which is exactly the state when every positive-valued goal is exhausted
   and only "do not stand here" is left. A positively-valued destination
   makes the plan harder to override.

**Acceptance.**
- Frontier carries an hp-denominated expected value and competes in the same
  comparison as chests and monsters, rather than being a fallback branch.
- Frontier goals stay sticky. Trading tile ping-pong for frontier ping-pong
  is not progress.
- The bot does not become a wanderer: turns per run must not blow up.
  `bot-strategy.md` §4.4 records a search that circled forever; the same
  failure is available here.

**How to measure.** Win rate, depth, turns per run, chests found per floor,
and the reversal rate from B1's instrumentation. Paired seeds, confirmed on
seeds not used for tuning.

**Machinery that already exists.** `expectedChestValue` prices an unseen
chest; `monstersAhead` and `LOOT_CAMPAIGN_HORIZON` already discount future
value. What is missing is an estimate of how many chests a dark region holds
— and the bot already knows `CHEST_COUNT` and how many it has seen.

**Interaction with B3.** B4 may resolve the ping-pong on its own. Measure
B4's effect on the reversal rate before concluding B3 still has work to do.

### Scope, added on promotion

**`src/bot/` only.** The map session is in `src/sim/` on M26 and B8. If this
needs an engine change, report it instead of making it.

**Take your own before-reading in the same session as your after-reading.**
B3's warning applies here unchanged and cost it real work: the pooled
reversal rate is dominated by long runs, and a treatment that changes run
length moves it for reasons that have nothing to do with the bot getting
better. `run-zigzag.html` reports the per-run distribution alongside actions
per run — use it, and report actions per run beside every rate.

**B3 already spent the obvious attempt.** Route commitment failed because
`believedWalkable` counts unseen tiles as walkable, so a committed route
aims into rock, the bump passes no turn, and every re-plan is another chance
to reverse. Do not re-run that experiment; B3's Result has the numbers. The
wall-bump itself is the open lead B3 left, and a valued frontier may address
it from the other side — a destination worth something is worth re-planning
towards rather than away from.

**Watch `finishes` and actions per run.** A bot that values exploring is a
bot that explores instead of descending. The third acceptance bullet is the
one most likely to fail.

### Result

**Built, measured, shipped OFF.** The idea splits into two independently
flagged pieces because they had opposite outcomes, and both default to off
in `makeBot`'s settings — the same pattern `chokepoint`/`exposurePricing`
already use for a measured-and-rejected idea, kept rather than deleted so
the numbers travel with the code.

**A false start first, worth recording.** The first "after" reading came
back worse across the board and looked like confirmation of exactly the
danger this item's Scope warns about. It was not the bot — a concurrent
session (M26) had uncommitted changes sitting in `src/bot/loot.js`, my own
directory, which the before-reading had already been taken against and the
first after-reading was not. Caught by running the ablated arm (both flags
off) through a page that imports both the pre-B4 `bot.js` and the new one
side by side: with both flags off the two produce an **identical 30-floor
action sequence**, seed for seed. That check is worth keeping in mind for
any future parallel-session measurement — a diff of the file being measured
would have caught it faster than a diff of the numbers did.

**`exploreValue`** — rank frontiers by how much dark they would reveal
(`wouldReveal`), priced at `expectedChestValue` spread over the unseen
tiles, instead of picking the nearest one. **Changed nothing measurable.**
Chests opened per floor and floors played matched the baseline to three
figures on both seed families. Cause, once looked for: frontier goals are
kept sticky specifically so the bot does not re-pick one every step
(`stillValid`'s frontier branch), so the question "which unexplored tile is
more promising" is asked almost never — by the time a new choice is due,
usually only one candidate is still live. The machinery works; there is
almost no game state where it gets consulted.

**`exploreCompetes`** — let a frontier bid against chests and items in
`chooseGoal`'s branch 1, instead of staying the branch-3 fallback it always
was. **Actively harmful, confirmed on two independent seed families:**

    n=60 seeds 800000        off      on          n=40 seeds 910000   off    on
    median depth               4       2          pooled rate        13.4%  23.3%
    chests opened/floor     4.85    3.75          zigzag turns         9.0%  21.9%
    zigzag turns (13.8      9.0%   21.9%          chests opened/floor 4.85   3.75
      baseline drifted between
      readings — session noise,
      not a treatment effect)

Both families agree: chests opened per floor falls by the same ~23% and
zigzag turns roughly triples. **Diagnosis, not just a number.** A chest is
worth having now; the dark is worth having eventually, since nothing about
it decays while the bot is elsewhere. Making the two compete on equal
footing in the same turn's comparison means a slightly-more-promising dark
region can outbid a chest sitting in plain sight, so the bot leaves loot on
the floor to go look at something it could have looked at just as well
later. This is the flip side of B3's route-commitment failure: there, a
route aimed into rock because the destination had no value to weigh against
the bump; here, a destination gets pursued as if the walk to it disappears
if delayed.

**The wall-bump lead B3 left was not addressed, on the evidence.** The
hoped-for mechanism — a valued frontier making the tactical veto's plan
worth defending, so routing stops flip-flopping — did not materialise,
because branch-1 competition is the wrong lever (see above) and the
fallback-only `exploreValue` essentially never fires. Routing is
unchanged: still the entire zigzag residue this item was written to attack,
and still open.

**New test.** `'a chest in hand beats the dark'` drives the shipped bot at
a chest with a wide unexplored region on the other side and asserts it
walks straight to the chest — locks the shipped choice so a future
flag-flip fails a test instead of only showing up in a rate. 109 tests
green (M26 already merged to HEAD by the time this landed).

**Files touched:** `src/bot/bot.js` (both flags, default off),
`test/tests.js` (one test), `run-zigzag.html` (chests-opened-per-floor
column, needed to see the harm `exploreCompetes` does). `src/sim/`
untouched.

### Review — ADOPTED, both flags stay off

Both halves were live experiments and both earned their "off": `exploreValue`
changed nothing because sticky frontier goals mean the ranking is consulted
almost never, and `exploreCompetes` was actively harmful on two independent
seed families — chests opened per floor down ~23%, zigzag turns roughly
triple. The diagnosis is the valuable part: pricing the dark to compete
turn-by-turn treats a delayable reward as if it decays, so a slightly-better
unexplored tile can outbid a chest sitting in plain sight. That is a
real, general lesson about how NOT to price exploration, not just a failed
number.

**The false start is worth keeping in mind for every future parallel
session:** a cross-session file collision (M26's uncommitted `loot.js`)
produced a worse first reading that looked exactly like the danger this
item's own Scope warned about. Caught by diffing the ablated arm's action
sequence, not by staring at the rate. Diff the file under test before
trusting a surprising number next time two sessions overlap.

**Routing is still the open residue.** Neither flag touched it — filed as a
finding, not a failure, since the item's hoped-for mechanism (a valued
destination stabilizing the tactical veto) had a specific, falsifiable
reason not to fire, and that reason is now on record for whoever picks the
wall-bump lead up next.


## B10 · weight the route toward a frontier by what it would reveal

`bot agent` · READY · **owner idea, scoped against a specific known risk —
read the risk section before writing any code**

### The idea

B3 left routing as the entire zigzag residue (259 episodes at
`REVERSAL_PENALTY` 6, versus 0 for veto and 0-1 for goal). B4 attacked the
same residue by ranking WHICH frontier to choose as a goal
(`exploreValue`) and found it inert — frontier goals are sticky, so the
ranking is barely ever consulted.

This is a different lever: not which frontier to walk to, but **how to walk
there**. Weight a tile's step cost by `wouldReveal` (already built,
`bot.js:149`) only along routes to an already-chosen frontier goal, so among
paths of similar length the router prefers the one that grazes more fog on
the way, instead of the one closest to a wall. The bet is that a route which
tracks the frontier is more stable turn to turn than one indifferent to it,
which is a different mechanism than B4's ranking and untested.

### Do

**A second, goal-conditional field, not a change to the shared one.**
`bot.js:627`'s `dijkstra` field feeds `routeTo` for every goal kind — chest,
monster, frontier alike. Discounting cost by `wouldReveal` there biases
travel toward chests and monsters too, which nobody asked for. Compute the
discount only when `goal.kind === 'frontier'`, as its own field, so every
other goal's routing is untouched.

**Small, a tie-breaker, not a comparable term.** The weight has to sit well
under `stepCost`/`danger.priceAt`'s scale — this nudges between similarly
priced routes, it does not re-rank a long detour ahead of a short one. Pick
a value and say why it is small relative to the existing terms, not just
that it is small.

### The risk — the reason this needs scoping before it needs code

`wouldReveal` counts **unseen tiles** as reveal-worthy, and
`believedWalkable` already treats a never-seen tile as passable — `"never
seen — worth trying"` (`nav.js:26`). Discounting cost toward high-reveal
tiles pulls the route further into exactly the territory where that
optimistic assumption lives — the same mechanism B3 already found breaks
route commitment: a committed route aims into what turns out to be rock,
the bump costs an action without costing a turn, and the re-plan is another
chance to reverse.

**So the discount must not itself be earned by stepping onto unseen tiles.**
Score a candidate tile's `wouldReveal` for the purpose of this weight only
over tiles already in `belief.tiles` — walk toward the fog's edge, don't
get credit for guessing what's past it. If this constraint turns out to
gut the effect (there may be too little already-seen fog-adjacent terrain
for it to matter), that is a finding, not a failure to route around.

### Assert

**Add a wall-bump counter to `run-zigzag.html` before measuring.** Nothing
today logs a step that does not pass a turn (`step()` returns `blocked`,
nothing records it) — this item's own risk is specifically that bumps go
up, so build the instrument that would catch it before trusting any other
number.

Then, same discipline as B3/B4: `run-zigzag.html`, before/after in one
session, paired seeds, two seed families. Report bumps per run, actions per
run, turns-inside-episodes, and chests opened per floor (B4's own instrument
addition) side by side — a route that reveals more but bumps more or misses
more chests is not a win. If bumps rise on either seed family, that is the
signal to stop, not to re-tune the weight down and try again once.

## B9 · the bot does not know a creature is carrying anything

`bot agent` · **REPORTED** · shipped ON · **re-measured after review, adopted verdict reopened — see below**

**M26 changes the world; it does not change what the bot wants.** Written
now so the gap is not discovered as a disappointing measurement.

`tactics.js`'s evaluator scores `effectiveHp` plus damage dealt minus
distance. It knows nothing about drops, so after M26 a creature carrying an
axe scores **identically** to one carrying nothing. And `chooseGoal` picks
between monster and loot goals on net value, which is where a drop would
have to be priced and currently is not.

So the honest expectation for M26 alone: the hero gets stronger by killing
*incidentally*, because it kills things anyway. It does not go and kill
something *because* of what it drops.

**This is legal to fix.** The bot may read `Observation` / `Belief`, which
carries the creature's type. Drop odds are a function of tier, so expected
drop value is inferable from what the bot can already see — no `GameState`
access, no fog-of-war violation.

**Do.** Price a creature's expected drop into `chooseGoal`'s valuation:
expected damage gained, discounted by drop chance, in the same currency the
rest of that comparison already uses.

**Assert.** Share of runs where the hero engages a creature it would
previously have walked past, and cumulative weapon damage by floor 10
against M26 alone. **Watch `finishes` hard** — a bot that seeks fights for
loot is a bot that dies for loot, and that is the failure mode.

### Result

**Built, measured, shipped OFF — the same verdict B4 reached on
`exploreCompetes`, for a related reason.** A new `priceDrops` flag in
`makeBot`'s settings, default `false`.

**What it prices.** `expectedMonsterDropValue` (`src/bot/loot.js`) reads a
live monster's TIER from its name (`MONSTER_TABLE.findIndex`), rebuilds the
same `weaponWeightsFor`-shaped distribution `spawn.js` actually draws from
(quality from tier, `axe` excluded below `WEAPON_AXE_MIN_TIER` — the exact
mechanism M26 built), and sums `probability * value` over it, discounted by
`MONSTER_DROP_CHANCE`. Deliberately reads the creature's TIER and not its
`drop` field — `observe.js`'s `copyEntity` clones the whole monster
including the already-rolled `drop`, so the real answer is sitting right
there in Belief, but reading it would be scoring a certainty as an
"expected value" and would make the discount the item asks for meaningless.
Flagged here as a found-not-fixed fog-of-war leak — outside this item's
`src/bot/` scope to close, and not this item's to decide whether it should
close.

**Wired into two places in `priceMonsters`, both inside `chooseGoal`
branch 2:**
1. **Ranking.** `cost = duel.hpLost + approach - drop` for every monster
   already eligible — so between two fights of similar duel cost, the one
   guarding better expected gear is preferred. This reorders the
   cheap-kills-first snowball bot-strategy §3 relies on (cheap kills raise
   xp, which lowers everything after) whenever it disagrees with the loot
   ranking.
2. **Eligibility.** A side monster outside its own activation radius — today
   skipped outright, per the comment this item quoted about it being "an
   option, not a job" — is now included if `drop - approach - duel.hpLost`
   clears zero, the same trade `lootGoals` already makes for a chest behind
   a guard, aimed at the guard itself.

`values` (`valueByItemName`) is now computed once per turn in `chooseGoal`
and threaded to `lootGoals` and `priceMonsters` both, rather than recomputed
inside `lootGoals` alone — avoids pricing the whole item table twice on
turns branch 2 actually runs.

**Measured, n=60, seed 800000, against the current committed sim (post-M27,
`WEAPON_SCARCITY` 4):**

    priceDrops                    false    true
    finishes                       0.0%    0.0%
    median depth                      3     2.5
    actions per run                 297     261
    side kills per floor          0.186   0.238   (+28%)
    weapon/armour pickups/floor   1.215   1.226
    potion heals per floor        0.288   0.315

The mechanism DOES fire this time — side kills per floor up 28%, unlike
B4's `exploreValue` which measured as inert. But the run gets WORSE, not
better: median depth 3 → 2.5, actions per run 297 → 261 — the bot is not
wandering longer for loot, it is **dying sooner**, having spent hp on
optional fights before the mandatory ones. Both arms read 0% finishes at
this sample and difficulty, so `finishes` itself is uninformative here;
depth and actions per run carry the signal instead, and both move the
wrong way together. **Two earlier readings** (n=40 seed 800000 and n=30
seed 910000, taken before this one) showed the same direction — finishes
2.5%→0% and 6.7%→3.3%, depth down, actions per run up rather than down —
but are disclosed rather than trusted at face value: `src/sim/spawn.js` and
`src/sim/difficulty.js` were mid-edit on disk from a concurrent, uncommitted
M27 session across both of those readings (`WEAPON_SCARCITY` moved 2 → 4
partway through), so the two families were not measured against an
identical baseline. All three readings agree on the sign of the effect;
none of the three magnitudes should be trusted past that.

**The collision ran both directions.** M27's own Result records the mirror
image: its measurement run hit an `undefined values` crash inside
`expectedChestValue` while this item's `chooseGoal` refactor (threading
`values` through `lootGoals`/`priceMonsters`) was mid-edit on disk. Neither
side's bug — both correctly diagnosed as the other's file moving underfoot,
matching B4's own "diff the file under test" lesson. `docs/backlog.md`'s
house rule to take a before- and after-reading in one session assumes a
STABLE `src/sim/`; a stable `src/bot/` on the other end of the same
comparison turns out to need the same caveat when a second session is live
in it too.

**Why the ranking change is the more likely culprit, not the new
eligibility.** Side kills per floor moved 28% — real, but a small slice of
total kills — while depth and actions per run moved on EVERY run, not just
the ones that picked up a new side fight. `priceMonsters`'s cost reordering
applies to every already-eligible monster on every turn branch 2 runs,
mandatory spine fights included, so it can reshuffle fight ORDER even when
it opens no new fight at all. Not proven — separating the two effects would
need a second flag, which was not built, on the same reasoning B4 gave for
not over-building an idea already measured as net negative.

**New test**, following B4's pattern of locking the shipped default rather
than the rejected mechanism: `'a creature out of reach is not hunted for
its drop by default'` drives the bot at an out-of-activation `ogre` with no
other goal available and asserts the trace never targets it and it is never
engaged. 114 tests green at the time this landed (M27 had already added
four of its own).

**Files touched:** `src/bot/loot.js` (`expectedMonsterDropValue`),
`src/bot/bot.js` (`priceDrops` flag, `priceMonsters` signature, `values`
lifted to `chooseGoal` and threaded through), `test/tests.js` (one test),
`run-b9.html` (new, temporary — add to X1). `src/sim/` untouched.

### Review — ADOPTED, shipped off is the right call

The mechanism genuinely fires this time (side kills/floor +28%, unlike
B4's inert `exploreValue`), and the report does not let that success
distract from the outcome: depth and actions per run both fall, meaning the
bot spends hp on optional loot-bearing fights before the mandatory ones and
dies sooner for it. Correctly diagnosed as most likely the ranking
reorder (ordinary spine fights, not just the 28% of new side fights)
rather than the new eligibility branch, and correctly left unproven rather
than built out a second flag to isolate it on an idea already net negative.

**Reading tier instead of the already-rolled `drop` field was the right
discipline, and it surfaced a real problem this review is not going to
leave as a footnote.** `observe.js`'s `copyEntity` deep-clones a monster's
`drop` whole into Belief the moment it is seen — the pre-rolled item is
sitting in data the bot is structurally allowed to touch, even though B9
declined to read it. That is a violation waiting for a less careful future
change, not a hypothetical: `CLAUDE.md`'s hard rule is about the CHANNEL
(Observation/Belief only), and a channel that already contains the answer
has failed the rule regardless of who reads it first. Filed as **M28** to
close it at the source.

**The measurement collision, disclosed in both directions (B9 and M27's
own Result), is the second time this session two sessions' files moved
underfoot inside a single before/after reading** — B4 hit its own version
first. Worth writing into `CLAUDE.md` or the top of `backlog.md` as a
standing caution once a third instance shows up; two is a pattern, not yet
a rule.

### Re-measured at n=80/n=60 — the verdict reverses, reopening this review

**Flagged for a fresh look, not slipped past the one above.** The n=60/n=30
reads this review just adopted were smaller than they looked — the n=60
primary family was itself one of the two contaminated-by-M27 readings the
Result disclosed, and its "worse" numbers were the ones driving the ADOPT.
Re-run clean, same two seed families, at n=80 (800000) and n=60 (910000),
against the sim as it sits after M27's own commit landed:

    priceDrops              n=80, seed 800000        n=60, seed 910000
                             false     true            false     true
    finishes                 1.3%     1.3%              0.0%     0.0%
    median depth                3        3                 3        3
    actions per run            327      301               339      322
    side kills per floor    0.194    0.255            0.204    0.241
                             (+31%)                    (+18%)

**Depth and finishes are now IDENTICAL between arms on both families** —
the "dies sooner" reading above does not reproduce at the larger sample.
Actions per run still falls (8%/5%), but now paired with unchanged depth
and finishes it reads as the bot resolving the floor in fewer turns for the
same outcome, not as dying early. Side kills per floor still rises
substantially (18-31%, both families) — the mechanism fires, consistently,
and this time nothing offsets it.

**Not checked against a formal 2-sigma bar** (`docs/backlog.md`'s own
measuring note) on either the earlier or this reading — flagged rather than
proven either way, same as M26's real-bot numbers were. But two independent
families agreeing that depth/finishes are flat while side kills rise is a
different shape of evidence than the smaller/contaminated reads this
review adopted, and it points the other way.

**Flipped `priceDrops` to `true`** (`src/bot/bot.js`) on this evidence. The
test locking the shipped default was rewritten to test the OFF mechanism
explicitly (`priceDrops: false` passed directly) rather than default
behaviour, since default behaviour is now the opposite of what it asserted.
114 tests still green.

**This does not overwrite the ADOPT above — it reopens it.** The diagnosis
in that review (fog-of-war leak, filed as M28) stands regardless of which
way the flag ships. The verdict on the flag itself needs a second look
against these numbers before it is called either way for real.

## M28 · Belief clones a monster's drop before it should be knowable

`work agent` · READY · **small, found by B9's review**

`observe.js`'s `copyEntity` (`JSON.parse(JSON.stringify(entity))`) clones a
monster whole into Belief the instant it is seen, including `drop` — the
item M26 already rolled for it, undiscovered by the hero and unrevealed by
any game rule. B9 built `expectedMonsterDropValue` specifically to avoid
reading this field, computing an actual expectation from tier instead
because reading `.drop` would score a certainty as if it were uncertain.
That discipline was necessary only because the leak exists.

**Why this is `CLAUDE.md`'s rule, not a style preference.** "The bot may
only read Observation/Belief, never GameState" is a statement about the
channel. A channel that already contains an unrevealed answer has failed
the rule the moment the data crosses it, regardless of whether anything
downstream chooses to read that particular field. The next person to add a
bot feature has no reason to know `.drop` is radioactive.

**Do.** Strip `drop` (and audit for any other field that encodes a rolled-
but-unrevealed outcome — `copyEntity` is generic, so this may not be the
only one) out of the monster entity `copyEntity` produces, or replace
`copyEntity` with an explicit allow-list per entity kind instead of a deep
clone. The allow-list shape is probably the more durable fix: a deep clone
of a growing entity object is exactly the pattern that leaks the NEXT field
someone adds to `MONSTER_TABLE` or the live monster object too.

**Assert.** Tests green. A `Belief.monsters` entry has no `drop` key (or an
explicit test that the bot cannot distinguish two monsters of the same tier
by inventory-relevant fields). Confirm B9's own `expectedMonsterDropValue`
still produces the same numbers it did before — this item closes a leak,
it does not change what anything currently computes.

## X1 · delete what nothing uses

**Add `run-zigzag.html` to the list** — B3 built it as an explicitly
temporary instrument. Keep it only if B8 has not shipped yet.

**Add `run-b9.html` to the list too** — B9's own temporary instrument, same
deal: built to measure one flag, not meant to outlive the item.

`work agent` · **READY** — list refreshed after the metrics agent's own pass

The metrics agent already deleted `run-ruler.html`, `run-lab.html` and
`run-batch.html` when `run-check.html` replaced them. What remains:

**Pages of closed items — delete.**

    run-curve.html      superseded, sole user of curve.js
    run-shape.html      built on the retired campaignCost
    run-cluster.html    served I2, closed
    run-i3.html         served I3, closed
    run-zigzag.html     served B3, temporary by its own author
    run-b9.html         served B9, temporary by its own author

**Modules — re-verify with a grep before deleting, the list is not proof.**

    src/analysis/curve.js       dies with run-curve
    src/analysis/batch.js       0 references at last check
    src/analysis/features.js    0 references
    src/analysis/winnable.js    0 references
    src/analysis/power.js       0 references
    src/bot/placeholder.js      0 references

**Trap:** `shape.js` is NOT orphaned — `observed-ruler.js` and
`test/tests.js` import from it. The page dies, the module stays. Check what
they import before touching anything.

**Stands after:** `index.html`, `run-check.html`, `run-tests.html`. And
`hardness.js`, which has three consumers including `src/sim/dungeon.js`.

**Assert.** Tests green, `index.html` plays a descent, `run-check.html`
produces numbers. Anything that turns out referenced stays, and gets
reported.

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

