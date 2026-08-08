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
| 1 | M24 | Cap the tier from above too — floor 1 can roll wolves and ogres | **REPORTED** |
| 1 | M25 | Gentler floor 1, smoother climb, floor 10 unmoved — owner request | **REPORTED** |
| — | B3 | Stop the zigzag — bot agent, parallel | **REPORTED** · one line owed in balance.js |
| 2 | M21 | Deep floors put a creature in the room where the hero lands | BLOCKED on M24 |
| 3 | X1 | Delete what nothing references | READY · list refreshed |
| 4 | M4 | Side-room risk/reward spread scales with depth | READY · M22 dropped, so it lives |
| 5 | E1 | One resumable turn loop in src/sim, instead of four copies | READY |

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

## X1 · delete what nothing uses

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

