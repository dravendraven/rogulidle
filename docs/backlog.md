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
| 1 | B8 | Set REVERSAL_PENALTY to 6 — one line, measured by B3 | READY |
| 2 | M26 | Weapons come off creatures, gated by strength — the only permanent power | READY |
| 3 | M27 | Chests hold armour and potions — after M26, not with it | READY |
| 4 | B9 | Teach the bot that a creature carries something | BLOCKED on M26 |
| 5 | M21 | Deep floors put a creature in the room where the hero lands | READY · M24 landed |
| 6 | D1 | The crowd-correction fit is overdue for its own redo | READY |
| 7 | X1 | Delete what nothing references | READY · list refreshed |
| 8 | M4 | Side-room risk/reward spread scales with depth | READY · M22 dropped, so it lives |
| 9 | E1 | One resumable turn loop in src/sim, instead of four copies | READY |

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

`work agent` · READY · **one line**

B3 measured this and could not ship it — the line is in `src/sim/balance.js`
and B3 was forbidden that directory while the map session was in it. The
measurement is done and reviewed; this is the commit.

**Do.** `REVERSAL_PENALTY` 0 → 6 in `src/sim/balance.js`, and the row in
`docs/balance.md`. Nothing else. B3's Result has the full table.

**Assert.** Nothing new. Re-run `run-zigzag.html` before and after **in one
session** and confirm turns-inside-episodes roughly halves; report actions
per run beside it. If median depth drops on both seed families rather than
one, say so — that was the single reservation in the review.

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

`work agent` · READY · **owner request, reframed — read the second section
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

## M27 · chests hold armour and potions

`work agent` · READY · **after M26 has been measured, not with it**

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

## B9 · the bot does not know a creature is carrying anything

`bot agent` · BLOCKED on M26

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

## X1 · delete what nothing uses

**Add `run-zigzag.html` to the list** — B3 built it as an explicitly
temporary instrument. Keep it only if B8 has not shipped yet.

`work agent` · **READY** — list refreshed after the metrics agent's own pass

The metrics agent already deleted `run-ruler.html`, `run-lab.html` and
`run-batch.html` when `run-check.html` replaced them. What remains:

**Pages of closed items — delete.**

    run-curve.html      superseded, sole user of curve.js
    run-shape.html      built on the retired campaignCost
    run-cluster.html    served I2, closed
    run-i3.html         served I3, closed
    run-zigzag.html     served B3, temporary by its own author

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

