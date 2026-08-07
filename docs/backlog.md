# Backlog

The task list. Everything an agent needs to pick up a task and finish it.

- **Targets and why the work exists** — `docs/project/objectives.md`
- **Current measured values** — `docs/kpi.md`, owned by the metrics agent
- **Closed items, with their results and reviews** — `docs/project/decisions.md`
- **Ideas not scheduled, routes dropped** — `docs/project/candidates.md`

Owned by the project & design agent. Work, metrics and ui agents read it to
know what they are on and what "done" means; they do not add or reorder
items. If an item looks wrong, report that rather than editing it.

## The queue

Always in execution order — what happens next is row one. Re-sorted whenever
a status changes, so a row moving is normal and does not mean the item
changed. `#` is priority; the id is stable and is what your prompt names.

Ordering is not by objective. **Startable beats important**, and an item
that unblocks two others outranks one that unblocks none.

`reading` is the state of the metrics agent's measurement for that item —
its standing job, which is not a task and so has no row of its own.

The line says **what gets done**, not why. The why is in the item, and
repeating it in the table only made the queue slower to scan.

| # | id | what gets done | feature | agent | status | reading |
|---|---|---|---|---|---|---|
| 1 | I7 | Measure capacity with death suppressed at PLAYER_HP, not on a 400 hp probe | map | metrics | REPORTED | n/a |
| 2 | I6 | Build an instrument that reads what a floor holds, not what a probe picked up | map | metrics | READY | n/a |
| 3 | M3 | Unlock the strength ceiling with small probability, so a rare blow can be huge | map | work | REPORTED | — |
| 4 | M9 | Draw a monster's drop from its own tier instead of a table that ignores it | map | work | BLOCKED on I6 | — |
| 5 | M4 | Scale the side-room risk and reward spread with depth instead of holding it flat | map | work | READY · fine tuning | — |
| — | M7 | Move difficulty off creature count onto strength and same-type clusters | map | work | **DONE** · adopted, flag ON | done |
| — | I5 | Split buffer into capacity and attrition and measure each on its own terms | map | metrics | **DONE** | n/a |
| — | M6 | Grant max and current hp every N kills, mirroring the xp progression | map | work | **DONE** · built, flag OFF | done |
| — | M2 | Place creatures in clusters instead of independently | map | work | FOLDED into M7 | — |
| — | M5 | Add a rare high-value item to the loot table | map | work | ON HOLD · no instrument | — |
| — | I3 | Settle clustering with a sign test, a damage percentile and a CV re-read | map | metrics | **DONE** | n/a |
| — | B1 | Trace goal and action per turn to find which layer creates the ping-pong | bot | work | PARKED · reported | — |
| — | B2 | Characterise what the tactical veto alternates between, and why | bot | work | PARKED | — |
| — | B3 | Fix the ping-pong with the cheapest change the evidence supports | bot | work | PARKED | — |
| — | B4 | Give unexplored map an hp-denominated value so it competes with fighting | bot | work | PARKED | — |
| — | B5 | Retune the crowd penalty once clusters make crowded tiles common | bot | work | PARKED | — |
| — | B6 | Fix the bot's side-room discrimination once I4 shows the inversion is real | bot | work | PARKED | — |
| — | I4 | Measure the side-room inversion at a sample that settles whether it is real | bot | metrics | PARKED | n/a |
| — | I1 | Replace the modelled ruler with two frozen probes that play the floor | map | metrics | **DONE** | n/a |
| — | I2 | Retest clustering with a mortal hero, measuring lethality instead of cost | map | metrics | **DONE** | n/a |

    work agent      M3 (spike gap M7 left) → M9 (waits on I6) → M4 if needed
    metrics agent   I7 → I6, plus the ruler re-run after each landing
    ui agent        idle

**The bot lane is PARKED by owner decision** — the focus is map design
calibrated by the probes. Nothing there was abandoned; do not pick up a
PARKED item without being told to.

**One change, then a reading, then the next.** The map items aim at the same
targets by different routes, and stacked into one measurement they cannot be
told apart — the count→strength route died exactly that way, and at least
one of the current set probably does not pay either. The work agent does not
start the next map item until the previous one has been read. Waiting is the
point.

**Every map item ships behind an off-by-default flag** and is measured on
against off. The work agent builds it in `src/sim/` switched off, the
metrics agent measures both states, the project agent decides whether it
gets switched on. Adoption is a separate act from building.

**The metrics agent measures the real game and nothing else.** It does not
build a variant to study one — if a question needs a change that does not
exist yet, say so and wait. And the instrument stays in its hands: if the
work agent needs the ruler to accept a new option, it **requests the
passthrough and waits** rather than adding it.

**The ruler re-run is a standing job, not a task.** When a map item lands
and clears review 1, the metrics agent re-runs the ruler and appends the
reading to that item's `### Result` block — the targets with the flag off
and on, standard errors, and the commit each ran against. No prompt needed.

**Review happens in two passes.**

    work reports
      ↓
    review 1   implementation and conformance — immediate, nothing measured
      ↓
    metrics    the ruler reading
      ↓
    review 2   verdict against the targets → DONE, or returned

The first pass checks what decides whether a measurement would mean
anything: flag off by default, constant in `balance.md` before `balance.js`,
divergences recorded in `rogule-spec.md` §13, and whether the change does
what its spec said rather than something adjacent. It is a minute of reading
and it has already saved a 1500-descent run pointed at the wrong thing.

## How to use this file

Your opening prompt names your task (`Task B1`). Read that item in full
before starting, and report against its acceptance criteria — not against
your own sense of finished.

**Claim it first.** Before any other action, set your item to IN FLIGHT in
both the queue table and its heading, and commit that on its own. Four
sessions share this repo and cannot see each other; an unclaimed item is one
that two agents can start at the same time, and the second to notice will
have wasted the whole pass. Claiming costs one commit.

If your item is already IN FLIGHT, stop and say so — do not assume it is
stale.

Status legend:

    READY           spec is complete, can be started
    IN FLIGHT       claimed — someone is on it right now. Set this BEFORE
                    doing anything else, and commit it on its own
    BLOCKED         waiting on a named task; spec is deliberately thin
    REPORTED        work done and result written down, awaiting review by
                    the project agent
    DONE            reviewed and closed
    NEEDS DECISION  waiting on the owner, not on other work
    PARKED          set aside by the owner to keep focus elsewhere. Not
                    blocked, not abandoned, not stale — do not pick one up
                    without being told to
    ARCHIVED        decided against, with the reason kept

**Closing out a task.** When you finish, set the status to **REPORTED** in
both the queue table and your item, and append a `### Result` block to the
item: what you measured, the numbers with their standard errors, what you
changed, and anything that surprised you or that you could not settle.
Write it for someone who was not there.

Do **not** set DONE yourself. The project agent promotes REPORTED to DONE
after review, and the review has caught something real in most reports so
far — a sign flip, a missing axis, a headline that did not match its own
table. Self-certification would have closed those as finished.

Record the result even when the answer is no. A task that died and why is
worth more than a task quietly dropped.

**Do not flesh out a BLOCKED item before its blocker reports.** Its shape
depends on a result that does not exist yet, and a spec written now would be
confidently wrong — this project has already paid for that twice.

**Who measures what.** The work agent measures the effect of its own change
with instruments that already exist; that is the repo's change discipline
and it is not optional. The metrics agent builds *new* instruments and
answers *design* questions — including questions about the bot's quality,
because a bot judged by whoever wrote it is a weak counterweight.

Note that `feature` and `agent` are independent, and that `feature` names
the objective served rather than the directory touched — see the objectives
list at the top. I4 is a bot question answered by the metrics agent; M3 is a
map change made by the work agent.

## I7 · separate immortality from starting hp

`map` · `metrics agent` · **REPORTED**

The probe survives **because** it carries 400 hp, which welds two
independent things together and costs two different measurements.

**Capacity's rate is diluted by the base.** A growth rate is not
scale-invariant: M6's grant of about +42 hp across a descent reads
`×1.011` per floor on 400 and roughly `×1.20` on a real hero's 10. The
measured `hpMax ×1.008` is the first of those almost exactly, so what
capacity currently reports is mostly an artefact of the instrument's own
size.

**And it makes the selection effect unmeasurable.** I5 attributed the gap
between capacity's power (×1.048) and the mortal series' (×1.243) to
survivor selection. It cannot be attributed there — the two differ in
mortality *and* in base, so the gap is selection plus dilution in unknown
proportion.

**The fix separates them.** Suppress death as a flag and start the probe at
`PLAYER_HP`. Capacity then carries neither selection nor base artefact, and
subtracting it from the mortal series at the **same base** isolates
selection cleanly — turning attrition's bias from *declared* into
*quantified*, which is as far as it can go, since a hero that cannot die
cannot measure attrition at all.

**Acceptance.** Capacity re-reported at `PLAYER_HP` with death suppressed,
all ten floors, full sample. The selection effect stated as a number with
its own standard error rather than as a direction. `docs/kpi.md` updated,
including the note that says capacity and attrition may not be compared
until they share a base.

**Watch.** Suppressing death is not the same as ignoring damage — the probe
must still take blows and still spend hp, or attrition disappears from the
capacity arm and the two series stop being subtractable. It should reach hp
0 and keep going, not stop losing hp.

### Result

Measured at commit `8eb8c39`. Full numbers and the reliable-window table are
in `docs/kpi.md` under "I7 — capacity at the mortal series' own base"; this
is the summary.

**Built it as a new driver, not a flag on the old one.** `driveDescent`
calls `playGame` once per floor, which runs a floor to completion
internally and cannot be interrupted mid-death. Suppression needs a per-turn
hook, so this is a second function, `driveDescentSuppressed`, that drives
`step()` directly — same pattern `clustering.js`'s `playFromState` already
used for I2 — and clears `state.outcome`/`killedBy` back to null the instant
it reads `'died'`, before the next `step()` call, which is the only place
the engine checks it. `applyDamage` clamps hp at 0 without touching the
logged blow size, so attrition kept accumulating correctly straight through
— checked directly: `diedBeforeOrOn` rose from 14/150 at floor 1 to 142/150
by floor 10, and hp really does sit at 0 and keep taking hits rather than
stopping. `capacityShape` gained two options, default-off
(`suppressDeath`, `startHero`) — omitting both reproduces every number
already committed exactly, so nothing upstream broke.

**Same base confirmed the right way:** passing `startHero: null` gives
`carry = null` on floor 1, which is the exact code path `builtShape` already
uses for the mortal series (no synthetic hero object, just the engine's own
default start) — not a hand-built "PLAYER_HP hero" that might drift from
what the mortal series actually starts with.

**The selection effect, as a number:** gap = mortal power − capacity power,
same base, same flags. Not distinguishable from zero at floor 2
(z = −0.41). Clears this project's 2σ bar at floor 3 (z = 2.12) and is
unambiguous at floor 4 (z = 3.30) — the last floor with ≥50 survivors on
both sides; floor 5 is bigger still (+4.95) but the mortal arm only has 33
survivors there, below `MIN_RELIABLE_N`, so it's a footnote. As a rate over
the reliable window: capacity shrinks at ×0.842/floor, survivors hold flat
at ×0.988/floor, ratio ×1.17/floor.

**What surprised me:** that ratio lands almost exactly on I5's original
×1.19/floor — the number that was declared unattributable because it mixed
selection with base dilution. Turns out dilution was a minor contaminant of
that estimate, not the dominant one; removing it barely moved the number.
I expected the fix to matter more than it did.

**What I could not resolve:** capacity and attrition still cannot be
compared to each other, same base or not — attrition is only defined for a
hero that can actually die, and a suppressed-death hero has none to give.
`docs/kpi.md` says this explicitly now. That was never this item's
acceptance criteria (it asks for the selection effect, not an
attrition/capacity subtraction), so it isn't a gap in what was delivered,
just a boundary worth stating plainly rather than letting someone assume
I7 closed it.

**Scope note — M7 was adopted mid-task.** Commit `25f45a1` landed
`DIFFICULTY_REBALANCED = true` while I7 was in flight, so every number above
is against the *current* shipped default, not the pre-adoption state I7 was
originally spec'd against. This doesn't change what I7 measures (capacity
vs. mortal, same base, either way) but it does mean "M7 off" no longer
describes anything shipped — noted in `kpi.md` so the Objective 1 table's
`f42f085` columns aren't mistaken for live state.

**Optional, from M7 review 2 (cheap, so done; not I7's own acceptance):**
p95/p99 of per-turn damage conditioned on a live monster being adjacent that
turn, added to `botFinishesAndSpike` in `clustering.js` since `playFromState`
already tracks `adjacent` per turn — no replay needed. Pooled unconditioned
stays flat (p95 = 0, p99 = 1) exactly as M7's review reported; conditioned on
`adjacent ≥ 1` it moves to p95 = 1, p99 = 3 on about 15% of all turns played.
The flat pooled number was walking-turn dilution, not a flat hit
distribution. Whether that settles M3 is the reviewer's call, not mine — I
did not re-run the old-vs-new comparison M7's review was asking about, since
M7 adoption already made "old" not the shipped state, and re-deriving it is
outside what was cheap here.

## I6 · give reward an instrument

`map` · `metrics agent` · **READY**

Reward is the only quantity with no way to read it, and two items are stuck
behind that: M9 and M5 both move reward and neither can be judged.

**Why the probes cannot answer it.** Sonda B picks up only what it steps
over and never detours, so its reward figure describes *its own policy*
rather than what the floor holds. That is why `reward/challenge` reads flat
and around 1% of challenge at every depth, and why reward has no row in the
targets table. Recorded first as I1 review point 4 and never closed.

**What is needed is a definition, and the definition is most of the work.**
Two shapes, and choosing between them matters more than implementing either:

- **What the floor contains** — sum the value of every chest and every drop
  the floor holds, whether or not anyone takes it. A property of generation,
  independent of any player, comparable across floors by construction.
- **What is obtainable** — a third probe that detours for loot, so reward is
  what a player willing to pay for it can actually get. Closer to the real
  question, but reintroduces policy into the measurement.

The first is cleaner and probably right for design work; the second answers
"does descending pay", which is the ratio that was in the targets block.
They may both be needed, as separate numbers with separate names, in which
case say so rather than blending them.

**Acceptance.** A reward figure that moves when the floor's contents move
and does not move when only a policy changes. Report it per floor with its
CV, alongside the existing challenge series so the ratio can be rebuilt.

**Watch.** M9 makes drop value depend on the creature carrying it. Any
definition that reads reward from the item table alone, without looking at
who holds it, will be blind to exactly that change — which is the first
thing this instrument will be asked to measure.

## M7 · move difficulty off count, onto strength and grouping

`map` · `work agent` · **REPORTED** — the main route for the CV target

**The problem is the dial, not the map.** Difficulty grows by adding
creatures: `monsters(N) = 2 × 1.3^(N-1)`, from 2 on floor one to 21 on floor
ten. The CV of a sum of `n` independent draws is `CV_single / √n`, so a
count growing at 1.3 carries a built-in CV decay of **×0.877 per floor**.

That decay is why the CV target cannot be reached by adding variance. Any
per-creature source — a stronger tail, a wider strength spread — raises
`CV_single`, which lifts every floor by the same factor and leaves the slope
untouched. The dilution is not something the map does; it is arithmetic on
the number of draws.

**DCSS does not have this problem because it never created it.** Its
creature count is roughly flat and difficulty comes from hit dice, so there
is no dilution to fight and its tails — out-of-depth, bands — push the CV up
freely. Ours falls for the opposite reason.

**Group by identity, not just by proximity.** DCSS bands are compositional —
an orc priest brings orcs, a pack is all hounds — and that buys two things
spatial clustering alone does not. A same-type group is closer to a single
draw than a mixed one, so it cuts deeper into the `√n` dilution this item
exists to fight. And it reads on screen: "a pack of wolves" is a thing,
while a bat, an ogre and a rat standing together is noise, which is half the
value in a game whose product is watching. Cost is one draw instead of k.

**Three levers, one budget.** Total challenge growth must stay at 1.343 per
floor; what changes is where it comes from.

- **Count grows slowly** instead of at 1.3, cutting the dilution.
- **Strength scales** to replace the difficulty count stops providing.
- **Grouping** cuts the remaining independent draws without emptying the
  floor — twelve creatures in four clusters are four draws with twelve
  bodies.

They are one item because they are one budget and cannot be attributed
apart: move one and the other two must move to hold challenge fixed.

**What is already measured, and what it means.** The archived count→strength
sweep, converted to a rate per floor:

    count 1.30 (today)   CV 0.841 → 0.492   = 0.944 / floor
    count 1.10           CV 0.841 → 0.637   = 0.970 / floor
    count 1.00           CV 0.841 → 0.933   = 1.012 / floor

The route was archived for the right reason and the wrong conclusion: the
only point that flipped the sign was count 1.00, which on a base of 2 means
two creatures on every floor — a dungeon that never grows. It was archived
for emptying the floor, not for failing to move the CV.

Grouping is what buys the last stretch without that cost. **This is the
whole reason the item exists.**

Also carried over from that sweep, and load-bearing here: the real cost
exponent in strength is **2.356, not 2**, because strength indexes an
11-row table whose mass runs 0 to 108. With the corrected exponent, the
count 1.10 point saturates the table only at floor 11 — outside the descent.
Get this wrong and the budget silently stops being constant.

**Acceptance.**
- CV of challenge reaches ≥ 1.00 per floor; 1.05 is the ambition.
- Challenge holds at 1.343 ±0.03. This item moves where difficulty comes
  from, never how much there is. **If challenge moves, the budget was not
  held and the result is not interpretable** — that is what invalidated the
  original sweep.
- Floors stay populated. Report creatures per floor at 1, 5 and 10; the
  degenerate corner is the failure mode this item exists to avoid.
- `challenge/power` ≥ 1.15 and finishes inside 15–40%.

**How to measure.** On the probes, flag off against flag on, with M6 already
landed and its reading taken first. Paired seeds, confirmed on seeds not
used for tuning.

**Also settle the mechanism here — it is I3's unanswered question 2.**
Grouping's rationale is that adjacent creatures strike in the same turn, so
damage per *turn* rises while damage per *blow* stays capped. I2 found no
consistent gap in worst-single-turn damage, and its own diagnosis is
probably right: a mean is the wrong statistic for a tail, and "adjacent" is
not "landed a blow" at 5/6 each.

So report **p95 and p99 of per-turn damage taken**, not a mean, flag off
against on. Spike moves → grouping delivers the shrinking reaction window it
was chosen for. Spike flat while lethality still rises → it is working by
attrition, which is a difficulty increase rather than a shape change, and
grouping's share of the budget has to be re-argued rather than assumed.

**Two things to watch.**

The 11-row `MONSTER_TABLE` is FAITHFUL and its ceiling is the hard limit on
how much of the budget strength can carry. Report the floor at which the
chosen point saturates it.

The bot avoids being reachable by two at once, so it may convert clusters
back into sequential duels. I2 measured this and found it does *not* happen
at cluster size 3 — crowded fraction was higher under grouping at all ten
floors — but that was with the instrument's placement, not the engine's,
and the finding does not automatically survive a different cluster size.

**Reconcile the shadow implementation.** `src/analysis/clustering.js` was
built by I2 to measure grouping and now holds placement logic outside the
engine. When this lands, either the analysis file calls the engine's
placement or the difference is written down deliberately. Silent drift means
every clustering measurement stops describing the game.

### Result

**Built, flag off, exactly as instructed — no metrics-agent reading
requested.** M6 was adopted (`HP_FROM_KILLS=true`) when this task started,
so every number below was measured on that baseline. **Note for whoever
reads this next:** M6's adoption was reversed while M7 was in flight
(`ca5c6f9`, docs only — `src/sim/balance.js` still reads `true` on disk as
of this report, so the reversal has not yet been executed in code). Not
mine to act on: M7's own claim predates that decision and its commit
message says the reversal is "cleaner" for M7 being mid-flight, so this
report proceeds on the baseline it was given rather than re-measuring.
Flagging the code/docs mismatch since it is not obviously anyone's task yet.
`DIFFICULTY_REBALANCED=false` in `src/sim/difficulty.js`; 72/72 tests pass
with the flag off, and a dedicated test confirms `floorParams`/`floorPlan`
are byte-identical to before M7 in that state.

**Mechanism, all three levers behind the one flag.**
- `MONSTER_GROWTH_REBALANCED = 1.15` (count), replacing 1.3.
- `STRENGTH_GROWTH_REBALANCED = 1.07` (strength), sized against the
  corrected exponent 2.356 from the archived sweep, not 2.
- `CLUSTER_SIZE = 6` (grouping) — `src/sim/spawn.js` now decides a zone and
  an anchor once per cluster, draws **one** shared tier for the whole
  cluster from the anchor's depth, then places every member nearest-tile
  first via a new zone-filtered BFS (`clusterAround`), same RNG stream and
  same side/spine rules as before. `CLUSTER_SIZE=1` reproduces the old
  per-monster independent loop exactly (verified, RNG-exact). Because the
  tier is drawn once per cluster rather than once per monster, a cluster is
  always one creature type — this satisfies "group by identity, not just
  proximity" from the design note above, not only spatial packing.

**Acceptance, checked against what this instruction allowed measuring:**
- **Challenge holds the budget — PASS.** 1.337 ±0.029 against the required
  1.343 ±0.03. This is the criterion that invalidates everything else if it
  fails; it did not fail.
- **CV of challenge — SHORT.** Rose 0.944 → 0.986 per floor (target ≥1.00,
  ambition 1.05). Not reached, and not still climbing: swept `CLUSTER_SIZE`
  3 → 6 → 9 and got 0.954 → 0.986 → 0.993, sharply diminishing. Floors at
  or below nominal `CLUSTER_SIZE` are already "one cluster" under the
  slowed count law, and past that point a bigger cluster has nothing left
  to absorb — this looks like a structural ceiling on how far grouping
  alone can move CV once count growth is this slow, not a value that was
  under-swept. Landing on 6 as the best point on that curve.
- **Floors stay populated.** Self-measured (real bot, paired seeds,
  flag-on, `CLUSTER_SIZE=6`, n=80 at floor 1, n=64 at floor 5, n=48 at
  floor 10 — sample shrinks with reached depth): floor 1 mean 2.0, floor 5
  mean 3.0, floor 10 mean 7.0. No degenerate corner.
- **`challenge/power` and finish-rate band — not measured formally.** Out
  of scope for this report per the "build and stop" instruction. A
  work-agent self spot-check (n=80, real bot, flag on, **not** a
  metrics-agent reading) came back at 56.3% ±5.5, well above the 15–40%
  acceptance band on the same probe M6 used — roughly 3σ over the upper
  edge. Flagging this as a strong prior for whoever runs the formal
  reading, not as a finding in its own right: single spot-check, one
  sample, and it says nothing about *why* (could be the slower count law,
  the clustering, or bot behaviour against clusters — unseparated).
- **p95/p99 of per-turn damage, "settle the mechanism" — not measured.**
  Same reason: out of scope for a build-and-stop report.

**Mid-build correction, disclosed.** First implementation clustered
*position only* — every monster in a cluster still drew its own tier
independently. Measured CV growth at 0.945, indistinguishable from
baseline's 0.944: proximity alone bought nothing. This is what the design
note's "group by identity, not just by proximity" was warning about, and I
had built the "just by proximity" version anyway. Fixed by moving the tier
draw to once per cluster (above); CV growth rose to 0.954 at the same
`CLUSTER_SIZE=3`, and further with the size sweep. Not told this would
happen — found it by measuring, which is why the mid-build number is
recorded rather than only the final one.

**Reconcile the shadow implementation — flagging, not fixing.**
`src/analysis/clustering.js` (I2's) repositions monsters post-hoc, spatial
only, and explicitly disclaims zone-awareness. The engine's placement above
is zone-aware and draws one shared tier per cluster. These are genuinely
different mechanisms now, not just different code paths to the same
result — a clustering measurement taken through `clustering.js` will not
describe what the flag-on engine actually does. Not my file to change
(`src/analysis/` is metrics agent territory); leaving the decision — make
`clustering.js` call the engine's placement, or document the divergence
deliberately — to whoever owns that file next.

**Not requesting a reading.** I5 is mid-measurement on the current game;
flipping this flag would move the ground under it. This report is the
build-and-test checkpoint only.

### Review 1 — conformance. Passes, and one number needs rereading

Conformance only; the verdict waits on the ruler reading. One miss, one
correction, and one outstanding action that belongs to nobody yet.

**The flag-off guarantee is the strongest this repo has produced.**
`CLUSTER_SIZE = 1` reproduces the old per-monster loop RNG-exact, with a
dedicated test that `floorParams`/`floorPlan` come out byte-identical. That
is better than "off by default" — it is off by *identity*, so the flag
cannot silently perturb a baseline the way M6's `cloneState` bug nearly did.

**Challenge holds: 1.337 ±0.029 against 1.343 ±0.03.** This is the criterion
that invalidates everything else, and the arithmetic behind it checks out —
`1.15 × 1.07^2.356 = 1.349`, and using 2 instead of 2.356 would have
overshot exactly as it did in the archived sweep.

**MISS: the divergence is not in `rogule-spec.md` §13.** Rogule places
creatures independently; the engine now anchors a cluster and draws one
shared tier for all of it. That is a rule change, and §13 is where rule
changes are recorded — it has §13.1 through §13.4 and no mention of
clustering. Add it before the reading.

### The mid-build correction is the most valuable thing in this report

The first implementation clustered **position only**, each monster still
drawing its own tier. Measured CV growth 0.945 against a 0.944 baseline —
nothing. Rather than ship it or quietly rewrite, the failed version is in
the report with its number.

That empirically confirms the design note this item carried: **proximity
alone buys nothing; the group has to be one creature type.** It was an
argument when I wrote it and it is a measurement now, and the difference
matters for M8 and anything else that reasons about draws.

### finishes 56.3% is inherited from M6, not caused by M7

The report flags its baseline honestly — M6 was adopted when M7 started, so
everything was measured with `HP_FROM_KILLS=true` — but stops short of the
consequence, and it inverts the reading.

    M6 alone, on          56.7%
    M6 on + M7 on         56.3%

**M7 moved finishes by −0.4 points.** The 3σ overshoot of the band is M6's,
and M6 is being reverted. Treat 56.3% as evidence about M6, not about M7,
and expect M7's own finishes to sit near the ~30% baseline once the reversal
is executed. The formal reading should be taken with `HP_FROM_KILLS=false`
for exactly this reason.

### CV 0.986 is not "short", it is indistinguishable from the target

Reported as missing `≥1.00`. With CV's standard error running ±0.012–0.014
on this instrument, 0.986 sits about **one** standard error below 1.00 —
which is not a miss, it is a number that cannot be told apart from its
target. The move it *did* make, 0.944 → 0.986, is around 3σ and is real.

That does not make it a pass. It makes the honest statement "reaches the
target within noise, ambition of 1.05 not approached", and the difference
matters because the next decision is whether M4 and M3 are still needed.

**And the ceiling argument is right, with a specific cause worth naming.**
Slowing count to 1.15 leaves floor 10 holding **7 creatures** (measured: 7.0
mean), so `CLUSTER_SIZE = 6` is already almost the entire floor. There is
nothing left to group. **The two levers compete for the same material** —
cutting count is what makes grouping run out of things to do — and that is
why 3 → 6 → 9 gives 0.954 → 0.986 → 0.993 and stops. Not under-swept.

### Two things outstanding, neither the work agent's

**`HP_FROM_KILLS` is still `true` in `src/sim/balance.js`.** The reversal was
decided and documented (`ca5c6f9`) but never executed in code, and the work
agent was right to flag it rather than act on it mid-flight. It is a
one-line change and it gates the M7 reading, since that reading has to be
taken against the shipped baseline.

**`src/analysis/clustering.js` is now genuinely divergent, not merely
duplicated.** I2's version repositions monsters post-hoc, spatial only, and
disclaims zone-awareness; the engine anchors by zone and shares one tier per
cluster. They are different mechanisms, so any clustering measurement taken
through the analysis file no longer describes the flag-on game. That is the
metrics agent's file and its call.

### Two Review 1 actions taken; the reading can proceed

`HP_FROM_KILLS = false` in `src/sim/balance.js` — one line, mechanism not
retracted, comment updated to point at `ca5c6f9`. This flipped the shipped
default under a test that asserted the old default's behaviour with no
explicit override (`the player gains max AND current hp every second kill,
by default`) — same recurring failure mode as the first M6 flip, fixed the
same way: split into an explicit-on test and a by-default-off test, mirror
of the existing `xpFromKills` pair. 72/72 pass.

`docs/rogule-spec.md` §13.5 added — clustering as a deliberate rule
divergence (Rogule places independently; the engine now anchors a cluster
and shares one tier), same structure as §13.1–13.4.

Stopping here, as instructed. The M7 reading is the metrics agent's from
here.

### Ruler reading (metrics agent) — M7 isolated from M6

Ran against commit `f42f085` (both Review 1 fixes landed). Full numbers in
`docs/kpi.md`'s "Objective 1" table — summarised here.

**`HP_FROM_KILLS = false` on both arms, by design.** The work agent's own
report measured with it on (M6 was adopted when M7 started), and its
Review-1 correction already showed finishes moved 56.7% → 56.3% — M7's own
contribution was −0.4, the rest was M6. That correction is honoured here by
construction rather than repeated: both M7-off and M7-on use the flag's off
state explicitly, so nothing measured below can be M6's.

**Ruler (probes, `src/analysis/observed-ruler.js`, 150/150/1500 samples):**
challenge holds (1.337 ±0.029 vs 1.343 ±0.03, reproduces the work agent's
own number exactly), CV reaches its target within noise (0.986 ±0.006,
also reproduces exactly), `challenge/power` clears ≥1.15 in both arms
(1.261 off, 1.193 on).

**Real bot (`src/analysis/clustering.js`'s new `botFinishesAndSpike` — the
probes cannot answer this, Sonda B did not finish a single descent in
either arm, 0/1500 and 3/1500):**

    finishes         off 31.3% ±3.8 (47/150)   on 20.0% ±3.3 (30/150)
                     gap -11.3pp, z ~ -2.25
    p95/p99 per-turn  off 0 / 1                 on 0 / 1   (no consistent shift, pooled or per-floor)

**Direct answer: inside the band, but the review's "near baseline" prediction
undersold it, and the mechanism is answered.** Finishes stay inside 15–40%
in both arms — no repeat of M6's breach. But M7 alone moves finishes by
−11.3 points, a real effect (z ≈ −2.25), not the "should sit near ~30%"
the review expected once isolated from M6. And **the mechanism the item
asked to settle is attrition, not spike**: per-turn damage percentiles do
not move at all (0/1 pooled, no per-floor pattern either) while finishes
fall significantly. Grouping is raising lethality through more turns of
exposure, not through a bigger single-turn hit — exactly the branch the
item's own spec flagged as a possible outcome ("a difficulty increase
rather than a shape change... grouping's share of the budget has to be
re-argued rather than assumed"), now measured rather than left open.

**What surprised me.** That "inside the band" and "near baseline" turned
out to be different claims. The first is true; the second isn't, by about
2 standard errors. Both mattered to report, because a future item reading
only the pass/fail on the band would miss that grouping has a real, signed
effect on survival that the challenge/CV/challenge-power story says
nothing about.

**What I could not resolve.** Per-turn damage is a coarse instrument at
this sample — most turns deal 0 or 1 damage regardless of arm, so p95/p99
saturate early and a real spike difference smaller than "1 more point of
damage lands sometimes" would not show up at n≈140k turns pooled. Attrition
is the more sensitive read here, but a percentile built for a wider dynamic
range (or a much larger sample) is the only way to fully rule out a small
spike effect rather than just fail to find a large one.

**Boundary note, since this shipped a new function.** `botFinishesAndSpike`
reimplements the descent loop locally (same reasoning as
`observed-ruler.js`'s `driveDescent`, and clustering.js's own
`playFromState` from I2) rather than adding a hook to `playDungeon` — no
`src/sim/` change. `clustering.js`'s old `toGrouped`/`clusterExperiment`
(I2/I3) are left untouched and marked deprecated in the file's own header;
this reading used only the real engine flag (`M7_ON` from
`observed-ruler.js`) and the real bot, never the old shadow mechanism.

### Review 2 — verdict. ADOPTED, flag ON

    challenge         1.341 → 1.337    hold ±0.03      PASS
    CV challenge      0.941 → 0.986    ≥ 1.00          within 1σ, ~3σ move
    challenge/power   1.261 → 1.193    ≥ 1.15          PASS both arms
    finishes          31.3% → 20.0%    15–40%          PASS, but see below
    floors populated  fl10 holds 7                     PASS

**Adopted.** CV is objective 1's goal, it moved about 3σ, and it lands
inside one standard error of its target. Nothing else broke a bound. That is
what this item existed to do, and the count→strength route it revived —
archived for emptying the floor — now delivers with grouping filling the gap
exactly as argued.

Two things to record, and the second changes the queue.

### The budget held on the instrument and not in the game

Challenge is unchanged at 1.337 and finishes fell **11.3 points**
(z ≈ −2.25). Both are true, and the item's stated intent was "moves where
difficulty comes from, never how much there is."

Challenge is damage taken by a 400 hp probe clearing a floor. The probe does
not die. Clustering makes the real bot get caught without making the floor
cost more to grind through, so the amount of difficulty **did** change while
the criterion said it had not.

This is the same asymmetry M6 showed in the opposite direction: the probe
under-reads anything that acts on a competent player rather than on a
yardstick. **The criterion was satisfied to the letter and missed the
intent**, and that is a fault in how the criterion was written — mine — not
in the work.

Not a reason to reject: finishes stayed in band, and 20% is arguably a
better race than 31% against sub-goal 3. Recorded so "challenge held"
stops being read as "difficulty unchanged".

### The spike question is NOT settled — the statistic was diluted

Reported as decided: p95/p99 of per-turn damage are 0 and 1 in both arms, so
the mechanism is attrition rather than spike.

**Those numbers cannot answer it.** They are pooled over ~140k turns across
full descents — roughly 930 turns per run, and the overwhelming majority are
walking. p95 = 0 says 95% of turns are not combat turns, which was never in
question. The entire tail of interest lives above p99, and the percentile
stops exactly where it starts being informative.

The right statistic conditions on turns where the hero was adjacent to
something alive, or reports per-encounter rather than per-turn. Grouping may
well be working by attrition — I2 pointed that way too — but this reading
does not establish it.

**Consequence for the queue.** M3 was demoted to "fine tuning, only if M7
leaves a gap". It left one — the shrinking reaction window, which is the
DCSS shape the whole programme is aimed at, and which grouping was chosen to
deliver. Whether M3 is still needed now turns on the conditioned spike
number, not on the pooled one. It stays READY rather than being dropped.

## M9 · tie the drop to the creature that carries it

`map` · `work agent` · **BLOCKED on I6** — the owner's preferred direction

`spawn.js:359` draws a monster's drop from a table that never looks at the
monster: `drawWeighted(state, 'spawn', monsterWeights)` ignores `template`.
**Killing a t-rex and killing a rat pay the same expected loot.**

In DCSS a monster's loot *is* its equipment — the orc warrior is dangerous
because it carries an axe, and the axe is what you get. Risk and reward are
the same object, so "is this fight worth it" is answerable by looking at the
monster. Here the payment does not know what you killed.

**And the share this affects grows with depth.** Chests are flat at 6 while
drops scale with creature count:

    floor 1     78% chest,  22% drop
    floor 10    26% chest,  74% drop

Every deliberate reward decision in the map design applies to **chests
only** — so the designed channel shrinks to a quarter of the loot exactly
where the design was meant to matter most, and the growing majority is
undifferentiated. This is also the likeliest reason the probe reads
`reward/challenge` as flat and about 1% of challenge: what it steps over
deep down is mostly generic drop.

Cheap to change — centre the drop's weight on the creature's own table index,
the same way the creature itself is chosen. But it moves reward, and reward
is the one quantity with **no instrument at all**; M5 is ON HOLD for exactly
that reason. Building here means moving a number nobody can read.

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

## M3 · an out-of-depth tail

`map` · `work agent` · **REPORTED** — the gap M7 left

`MONSTER_STRENGTH = 0.35` is fixed, so the strongest possible blow is the
same on floor 1 and floor 10. There is no right tail at all.

**Why it matters.** It is the cheapest way to restore rising variance, and
it does not touch the count dial whose linear tunability `balance.md`
defends with good reason. The median floor is unchanged; only the rare floor
moves.

**Acceptance.** Median difficulty per floor unchanged inside noise; CV per
floor stops falling; the frozen maximum blow starts to grow with depth.

**Measured on the probes, not the real bot** — the CV verdict is a property
of the design. Confirm playability against the real bot afterwards, but do
not tune to it.

**Constraint.** `PLAYER_HP` is 10, FAITHFUL, with no regeneration, and
damage is `0..xp−1`. Near the top of the table one blow can take almost
everything. The reaction window must shrink, not vanish — report the
distribution of damage per blow, not its mean. The tail is what kills.

### Result

**Baseline: M7 adopted in code, not just docs.** `DIFFICULTY_REBALANCED`
was `true` in `docs/balance.md`/backlog (Review 2, `7cc3ff4`) but still
`false` in `src/sim/difficulty.js` — the same docs-precedes-code gap as the
earlier `HP_FROM_KILLS` case. Executed the flip (`25f45a1`) so this item's
baseline actually includes M7, per instruction. Two tests asserting the old
off-by-default behaviour were updated the same way as before (one now
asserts the adopted constants, one compares two independent constructions
of "no clustering" instead of against a default that no longer means
`clusterSize 1`).

**DISCLOSED, NOT FIXED, out of scope for this item:** executing that flip
surfaced a real regression — `a floor puts most of its threat mass on the
mandatory route` (floor 7, 12 seeds) now reads mean spine share 0.97,
above the 0.95 "side rooms are not empty" ceiling. Confirmed by reverting
the flag that clustering causes it: with `CLUSTER_SIZE=6` and small
rebalanced rosters, one shared zone-per-cluster draw can decide most of a
floor's placement in a single roll, concentrating threat instead of
splitting it per the map design's target. Left failing on purpose — not a
design decision the work agent makes unilaterally, and unrelated to M3's
own mechanism. 76/77 tests pass for that reason; the one failure is this,
not M3.

**Built, flag off.** `OUT_OF_DEPTH_TAIL = false` in `src/sim/balance.js`.
After a floor finishes populating, a chance — zero on floor 1, growing
(capped) with depth via `outOfDepthChanceAt` in `src/sim/difficulty.js`,
mirroring `floorSpread`'s shape — decides whether ONE already-placed
monster gets reskinned into a tier drawn near the table's true top (same
position, zone, drop; only its own stats change). Reskinning rather than
adding keeps the roster size untouched. With the flag off the chance is
always 0 and `spawn.js` skips the roll entirely, rather than drawing a
`drawChance(..., 0)` that can never fire but would still consume an RNG
value — verified RNG-identical to before this item existed (`zero chance
draws nothing extra`). 5 new tests, 76/77 total (see above).

**Self-tested (work agent, NOT a metrics-agent reading), n=200 paired
seeds per floor, flag off vs on:**

    floor   count off/on      mass off/on       chance
      1     2.00 / 2.00       10.0 / 10.0       0.000
      5     3.01 / 3.01       23.8 / 29.6       0.080
     10     7.04 / 7.04      118.7 / 132.5      0.150

    max single blow (xp-1), off vs on:
      1   p50 2/2   p90 2/2   p99 3/3   max 3/3
      5   p50 2/2   p90 3/3   p99 4/9   max  4/9
     10   p50 3/3   p90 4/9   p99 5/9   max  5/9

**Median holds exactly** (count identical to 2 decimals at every floor
checked, p50 damage identical) — the acceptance criterion's first clause.
**The tail moves**, and moves toward the table's actual top (`t-rex`,
xp 10) rather than a partial climb.

**Worth flagging for the calibration reading, not fixed here:** floor 10's
p90 shows the spike (4 → 9), not just p99. At `OUT_OF_DEPTH_CHANCE_CAP =
0.15`, roughly 1 in 7 floor-10 visits gets the reskin — arguably too
frequent to read as "rare" by the time it reaches the 90th percentile
rather than staying below p95. Floor 5 (chance 0.08) looks more like the
intended shape — only p99 and the max move. All three chance constants are
marked `INITIAL GUESS`; whether the cap needs to come down is exactly the
kind of thing the probes should decide, not a work-agent guess.

**Not measured, per the explicit "flag off, then stop" instruction:** CV
per floor and the challenge/power interaction (need the probes), and real
finish rate. Also not attempted: distinguishing whether this addresses I2's
unsettled attrition-vs-spike question from M7 Review 2 — that needs the
same conditioned-on-combat-turns statistic Review 2 asked for, on the
probes, flag off against on.

Not requesting a reading — the metrics agent's is what decides this.

---

# Not active

Specs for items that are parked, held or folded. Kept here so the queue
table above resolves to something, but nothing here is startable.


## B4 · give exploration a value

`bot` · `work agent` · **READY**

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

## M5 · a reward tail

`map` · `work agent` · **ON HOLD** — no instrument, therefore no acceptance number

The targets table has no entry for reward, and that is not an oversight: the
probes collect only what they step over, so their reward figure describes
their own policy rather than the design. Building to move a number that does
not yet mean anything is how a change gets adopted on a reading that cannot
support it.

Unblocking this needs an instrument first — a probe that detours for loot,
or reward measured as what the floor *contains* rather than what got picked
up. That is not scheduled; the CV and buffer targets come first.

The best item is `axe +2`. There is nothing rare enough to be an event, so
reward variance is bounded from above by the table itself.

**Why it matters.** Reward variance is the spectator's half of the lottery.
The measured CV of reward falls with depth just as challenge's does, and no
amount of work on the challenge side fixes that.

**Acceptance.** Mean reward per floor unchanged inside noise; CV of reward
stops falling. Pick weight is `1 / value`, so a high `value` means rare.
Measured on the probes.

**Watch.** `CHEST_LOOT_CHANCE = 0.60` is what the bot assumes when pricing a
chest, measured over 150 maps. Adding to the item table moves what a chest
is worth and that constant will need re-measuring.

## I4 · is the side-room inversion real

`bot` · `metrics agent` · **READY**

Over ~344 side chests on floors 5–8 the bot opened 46% of favourable rooms
against 53% of unfavourable ones. Not indifference — inversion. Four fixes
were implemented and none moved the ratio.

**The honest state.** At n = 196 / 148 the standard error on the difference
is about 5.4 points, and the measured gaps sit between 1.3 and 2.6 standard
errors across variants that **share seeds** and so are not independent
replays. The direction was consistent, which is suggestive. `map-design.md`
already retracts one wrong diagnosis of it.

**This task is a measurement and nothing else.** Enough seeds to put the
difference several standard errors clear of zero, or to show it was noise.
No fix, no diagnosis of cause. Report and stop.

**Why it matters.** The side-room risk/reward roll is the only source of
*structural* variance in the game today, and a player-facing exploration
dial would sit on top of this discrimination. If the bot cannot tell good
rooms from bad, a dial on top only scales the error. Nothing should be built
on this until it is known to be real.

**Note for whoever runs it.** The bot will change under B4 while this is
open. Measure against a stated bot version and say which — a result against
a moving bot is not reusable.

## B2 · characterise the veto loop

`bot` · `work agent` · **BLOCKED on B1 review**

B1 answered "tactical veto", which is the branch whose spec was thin. Being
rewritten against that answer.

Spec deliberately not written yet.

## B3 · fix the ping-pong

`bot` · `work agent` · **BLOCKED on B2**

The cheapest fix the evidence supports. `REVERSAL_PENALTY` already lives in
this layer and already failed a sweep (0 / 1.5 / 6 moved the reversal rate
only 0.238 → 0.205 and cost win rate), so the fix is not "more of that".

**Known side effect to watch when the spec is written.** If it ends up
adding hysteresis to loot goals, it pushes against I4's question: more
commitment to a target means less chance of abandoning a bad room after
starting to walk to it.

**Measurement will include** reversal rate before and after, win rate, depth,
turns per run, and above all the **distribution**: a fall in the mean can
hide the pathological case surviving intact.

## M2 · clustering

`map` · `work agent` · **FOLDED into M7** — kept for its reasoning, not as work

Grouping is now one of M7's three levers rather than its own item. It cannot
be attributed apart from the other two: the three share one difficulty
budget, so moving grouping forces count and strength to move with it. The
argument below is why grouping is in that budget at all, and it still
stands — only the packaging changed.

The third axis, never tested: same roster, different spatial distribution.

**Why it is the main candidate.** Variance of a sum falls as `1/√n` in the
number of independent draws. Eighteen creatures spread out are eighteen
draws that cancel; the same eighteen in four groups are four draws. It cuts
the sample count **without emptying the floor** — which is why the
count→strength route only worked at the degenerate point where floors held
two creatures.

**And it buys the damage spike for free.** The individual blow stays capped
by the table, but three adjacent creatures strike in the same turn. Damage
per *turn* grows with damage per *blow* frozen — DCSS's shrinking reaction
window obtained by placement, without touching `MONSTER_TABLE` (FAITHFUL,
11 rows, whose ceiling nearly bit the strength sweep).

**Machinery exists.** `spine.js` classifies rooms, `spawn.js` distributes
against a running mass share, and `activation` radii already create de facto
groups — waking one wakes its neighbours.

Unlike M3–M5 this one is **not** probe-measurable: the effect is on
lethality, and the probes cannot die.

**A shadow implementation already exists, and reconciling it is part of this
item.** I2 built `src/analysis/clustering.js`, which generates the roster
with the shipped `populate()` and then rewrites monster positions into
clusters. That was correct for an instrument — it changed nothing in
`src/sim/` — but it means the grouping logic now lives outside the engine.

When M2 lands, the two must not drift apart in silence, because the moment
they do, every clustering measurement stops describing the game. Either the
analysis file calls the engine's placement, or the difference between them
is written down deliberately. Decide which, and say so.

Note also what the instrument's version ignores by design: the spine/side
split, and cluster size fixed at 3. Those are M2's to settle, not carried
over as defaults.

## B5 · crowd blindness in the bot

`bot` · `work agent` · **BLOCKED on M2**

`threat.js` records that tiles reachable by two awake monsters at once are
"rare enough that this term is not what steers the bot", and scaling
`CROWD_PENALTY` by threat changed literally nothing. That is true of the map
as it exists today.

Clustering makes those tiles common, at which point the term goes from inert
to dominant. Do not touch this before M2 exists — today there is nothing to
tune against.

## B6 · fix side-room discrimination

`bot` · `work agent` · **BLOCKED on I4**

The bot appears to open more unfavourable side rooms than favourable ones.
Whether that effect is real is I4, and it belongs to the metrics agent — a
bot judged by whoever writes it is a weak counterweight.

Four fixes have already been implemented against this and none moved the
ratio, which is itself a reason to establish the effect exists before
attempting a fifth.
