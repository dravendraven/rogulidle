# Backlog

Owned by the **project & design agent**. Work and metrics agents read it to
know what they are on and what "done" means; they do not add or reorder
items. If an item looks wrong, report that rather than editing it.

## Objectives, in order

The broad goal is that a run is **worth watching**. It is not measurable and
no attempt should be made to measure it directly. Two things drive it:

    1. Curve shape approaching DCSS's     feature: map    M2..M6, I1..I3
    2. An intelligent bot                 feature: bot    B1..B6, I4

A third — the outcome reading like a horse race — is an **effect of those
two, never a target**. See "Goals" below before touching it.

Every item in the queue serves 1 or 2. If you cannot say which, say so
rather than starting.

The `feature` column is **which objective an item serves**, not which files
it touches. I1 and I2 are instruments living in `src/analysis/`, and they
are `map` because what they measure is the curve. I4 is `bot` because the
question is whether the bot can tell a good side room from a bad one, even
though the metrics agent answers it.

## The queue

`#` is priority and changes; the id is stable and is what your prompt names.

**The queue is not sorted by objective.** Objective order is only a
tiebreaker; two things outrank it.

- **Startable beats important.** A blocked item does not sit at the top just
  because its objective ranks first.
- **Dependencies.** An item that unblocks two others outranks one that
  unblocks none, whatever objective each serves.

**The work agent takes one track at a time, in batches.** Do not interleave
map and bot items — currently moot, since the bot lane is PARKED, but it is
the rule when it restarts.

The reason is asymmetric. Map measurements are insulated from the bot — the
probes are frozen, which is what they were built for — so bot changes cannot
move a curve number. Nothing insulates the other direction: win rate,
reversal rate and chests-opened all move when the map changes, and
`balance.md` is explicit that difficulty here is defined against an
opponent. Interleaving therefore invalidates every bot A/B against the
previous one, while costing a context switch on top.

The table is **always in execution order** — what happens next is row one.
It is re-sorted whenever a status changes, so a row moving up or down is
normal and does not mean the item changed.

`reading` is the state of the metrics agent's measurement for that item —
its standing job, which is not a task and so has no row of its own.

| # | id | what and why | feature | agent | status | reading |
|---|---|---|---|---|---|---|
| 1 | I5 | Does the probe under-read hp? Design says too hard, product says too easy | map | metrics | IN FLIGHT · now the highest-value item | n/a |
| 2 | M7 | CV falls because difficulty comes from COUNT — move it to strength and grouping | map | work | IN FLIGHT | — |
| 3 | M4 | The only structural variance is constant — scale side-room spread with depth | map | work | READY · fine tuning | — |
| 4 | M3 | Strongest blow is frozen at every depth — add a rare out-of-depth tail | map | work | READY · fine tuning | — |
| — | M6 | Buffer falls while difficulty rises — give the hero growing capacity | map | work | **DONE** · adopted provisionally | done |
| — | M2 | Group creatures to cut independent draws and raise damage per turn | map | work | FOLDED into M7 | — |
| — | M5 | Best item is axe +2, so no reward is ever an event | map | work | ON HOLD · no instrument | — |
| — | I3 | Settle clustering's sign test; spike and CV wait for M2 to exist | map | metrics | **DONE** | n/a |
| — | B1 | Ping-pong is the ugliest visible defect — find which layer creates it | bot | work | PARKED · reported | — |
| — | B2 | Characterise the veto loop: what alternates, and why the plan flips | bot | work | PARKED | — |
| — | B3 | Fix the ping-pong with the cheapest change the evidence supports | bot | work | PARKED | — |
| — | B4 | Bot values darkness at zero, so it never explores for reward | bot | work | PARKED | — |
| — | B5 | Clustering makes crowd tiles common, so the inert crowd penalty starts mattering | bot | work | PARKED | — |
| — | B6 | Fix side-room discrimination, once I4 shows the inversion is real | bot | work | PARKED | — |
| — | I4 | Bot may open more bad side rooms than good — is that real? | bot | metrics | PARKED | n/a |
| — | I1 | Model ruler misprices crowds — replace it with two frozen probes that play | map | metrics | **DONE** | n/a |
| — | I2 | Clustering may change lethality, not cost — retest with a normal hero | map | metrics | **DONE** | n/a |

Archived: the count→strength route. Measured, does not pay. See the end.

**The whole bot lane is PARKED by owner decision.** The focus is map design
calibrated by the probes. Nothing about the bot items changed and none were
abandoned — B1's answer stands, and the routing locus it turned up (18.4%
± 0.9 pp, before the veto is ever consulted, so a fix scoped to `tactics.js`
cannot reach it) is still an open scoping question for when the lane
restarts. Do not pick up a PARKED item without the owner saying so.

That leaves one loop, and it is deliberately serial:

    work agent      M6 → M7 → then M4 and M3 only if still needed
    ui agent        U1
    metrics agent   I3 part 1, then re-run the ruler after EACH landing

**M7 replaces the patch queue as the main route.** An audit of the map items
against the targets found that M3, M4 and M5 were all fighting a decay the
game creates for itself, and that only one of them could win.

The arithmetic: the CV of a sum of `n` independent draws is
`CV_single / √n`. Creature count grows 1.3 per floor, so there is a built-in
decay of **×0.877 per floor** that no amount of added per-creature variance
removes. Anything that raises variance *per creature* — the out-of-depth
tail, a bigger strength spread — lifts the level at every floor and leaves
the slope alone. Only variance that lives at the *floor* level escapes the
dilution.

That is also why DCSS's CV rises where ours falls: its creature count is
roughly flat, so there is no dilution to fight, and its tails push freely.
**Ours falls because difficulty was assigned to count.** M3, M4 and M5 are
patches on a self-inflicted decay.

The archived count→strength sweep already measured most of this, converted
to a rate per floor:

    count 1.30 (today)   CV 0.841 → 0.492   = 0.944 / floor
    count 1.10           CV 0.841 → 0.637   = 0.970 / floor
    count 1.00           CV 0.841 → 0.933   = 1.012 / floor   ← sign flips

So the route was not archived for failing. It was archived because **the
only setting that worked emptied the floor** — count 1.00 on a base of 2
means two creatures on every floor, a dungeon that never grows.

Grouping is exactly the gap-filler: twelve creatures in four clusters give
four effective draws with twelve bodies on the ground. M2 therefore stops
being a separate item and folds into M7, where it belongs — the three levers
are one budget and cannot be attributed apart anyway.

M4 and M3 drop to fine tuning. They may turn out unnecessary, and if they
are still needed after M7 lands, adjustment is the right role for them.
M5 goes on hold: reward has no instrument, so it has no acceptance number.

**One change, then a reading, then the next.** M6 and M3–M5 all aim at the
same two ratios by different routes, and stacked into one measurement they
cannot be told apart — the count→strength route already died exactly that
way, and at least one of these four probably does not pay either. The probes
are frozen, so a re-run is cheap and paired by construction.

The work agent does not start the next map item until the previous one has
been read. Waiting is the point.

**Every map item ships behind an off-by-default flag, and is measured on
against off.** The work agent builds it in `src/sim/`, switched off; the
metrics agent measures both states; the project agent decides whether it
gets switched on. Adoption is a separate act from building.

**The metrics agent measures the real game and nothing else.** It does not
build a variant of the map or the bot in order to study it. If answering a
question requires a change that does not exist yet, that is the work agent's
job first — say so and wait, rather than approximating it in
`src/analysis/`.

**And the instrument stays in the metrics agent's hands.** If the work agent
needs the ruler to accept a new option in order to measure its own change,
it **requests the passthrough and waits** — it does not add it. Two rules
collided here once already: the repo requires measuring a change with the
existing instrument, and the instrument could not accept the option. The
resolution is the request, not the edit. An agent reaching into the tool
that measures its own work is the coupling this whole split exists to
prevent, however careful the edit.

The cost is real: the work agent builds before anyone knows whether it pays.
Three things buy it back. Nothing can drift out of sync, because there is
only one implementation. Every measurement describes the game rather than an
approximation of it. And what was measured is what ships, if it ships.

I2 is the example that motivated this: to measure clustering it had to build
clustering, so grouping logic now exists in `src/analysis/clustering.js`
outside the engine — inside its boundary, and still a shadow that M2 has to
reconcile.

**Review happens in two passes, and the first one costs nothing.**

    work reports
      ↓
    review 1   implementation and conformance — immediate, nothing measured
      ↓
    metrics    the ruler reading, flag off against on
      ↓
    review 2   verdict against the targets → DONE, or returned

The first pass checks the things that decide whether a measurement would
even mean anything: is it behind an off-by-default flag, does it do what the
spec said rather than something adjacent, did the constant land in
`balance.md` as an INITIAL GUESS before `balance.js`, and was any divergence
from Rogule recorded in `rogule-spec.md` §13.

M6 is the example. Its spec turns on granting **current** hp alongside the
maximum — without that the hero still arrives at each floor as hurt as
before and the measured buffer barely moves, because the number is taken on
arrival rather than from the ceiling. Building only the ceiling would
measure clean and mean nothing. That is a one-minute read, and it saves 1500
descents aimed at the wrong thing.

**The re-run is a standing job, not a task.** It needs no prompt. When a map
item lands and clears the first pass, the metrics agent re-runs the observed
ruler and appends the reading to that item's `### Result` block — the four
ratios with the flag off and on, with standard errors and the commit each
ran against. Then it goes back to whatever it was doing.

Three parties, on purpose: the work agent builds the change, the metrics
agent measures it, the project agent reads it. Two of those must not be the
same session — a change measured by whoever made it is the weak-counterweight
problem this split exists to avoid, and it is the same reason I4 belongs to
the metrics agent rather than the work agent.

**M6 and I3 run in parallel and that is fine.** M6 changes the hero's
capacity; I3 measures clustering. They touch different things, and M6 should
not move the ruler at all: challenge is damage taken, which is set by how
long fights last — a function of damage dealt, not of how much hp the hero
is carrying. Buffer moves, which is the whole point; challenge and CV should
sit still. **If challenge does move after M6, that is itself a finding**
and should be reported rather than absorbed.

The one discipline required: **state which commit each measurement ran
against.** With two items in flight, a reading that straddles M6's landing
is otherwise unattributable.

**Rows with no rank need nothing from an agent.** I1 and I2 are closed. B1
is answered and parked with the rest of the bot lane.

## How to use this file

Your opening prompt names your task (`Task B1`). Read that item in full
before starting, and report against its acceptance criteria — not against
your own sense of finished.

**Claim it first.** Before any other action, set your item to IN FLIGHT in
both the queue table and its heading, and commit that on its own. Three
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

## Goals

The broad goal is that a run is **worth watching**. That is not measurable
and no attempt should be made to measure it directly. Three sub-goals are,
and everything in the queue serves one of them.

**1. The curve shape approaches DCSS's.** Only the signs of the ratios are
the target; the magnitudes are derived from attribute scales rather than
observed play. Served by the map queue, measured on the probes.

**2. The bot is intelligent.** The spectator should see decisions, not
flailing. Served by the bot queue, measured on bot-internal metrics.

**3. The outcome is worth betting on.** The descent should read like a horse
race: reaching the bottom is plausible but not assured, so the viewer builds
an expectation and it can be broken. Too certain is boring; pure coin-flip
is also boring, because nothing the viewer sees explains the result.

Sub-goal 3 decomposes into three things that can be measured:

- **Clear rate** — plausible but not assured. Currently around 30% for the
  real bot, which is inside a reasonable band; the number to argue about is
  whether it should be lower.
- **When the outcome is decided** — late is drama, early is no arc. If most
  deaths happen on floors 2–3, there is no race to watch however good the
  odds look on paper.
- **How much of the result is legible** — `balance.md` already measured
  this: 46.5% of outcome variance came from the map and 53.5% from the
  combat dice. All dice means the viewer cannot read anything; all map means
  the run was decided at generation.

**Sub-goal 3 is an integration test, and must never be optimised directly.**
1 and 2 are causes; 3 is an effect. It is measured with the real bot playing
the real map, so it is the only thing that can tell you the other two added
up — and it is the only one that cannot tell you what to do about it.

Two reasons it must not become a target:

- **It can sit at its number while the game is bad.** A dumb bot reaching
  the bottom one run in ten looks random rather than dramatic, and a flat
  curve is boring at any level of finishes. Hitting the number proves nothing on
  its own.
- **The number is trivially reachable.** Any level of finishes can be dialled
  in by moving creature count alone, learning nothing. Aiming at sub-goal 3
  directly is the fastest way to hit it for the wrong reason.

So it stays a falsifier: it can say the sum failed, never what to fix.
Nothing in the queue serves it, deliberately — and measuring it against a
bot with known defects would measure the defects.

## Targets for objective 1

Concrete numbers, so every map item has an acceptance figure rather than
"stops falling". Growth per floor, measured on the probes.

| quantity | now | must reach | aim for | kind |
|---|---|---|---|---|
| challenge | 1.343 ±0.009 | hold, ±0.03 | unchanged | **constraint** |
| buffer | 0.855 ±0.023 | ≥ 1.00 | 1.16 | goal |
| CV challenge | 0.944 ±0.012 | ≥ 1.00 | ~1.05 | goal |
| challenge/power | ≥1.307 | ≥ 1.15 | — | **bound** |
| **finishes**, real bot | ~30% | 15–40% | — | **bound** |

**`finishes`** is the fraction of runs where the bot reaches the bottom —
what used to be called the clear rate. The name is deliberate: finishes is
something you read and bet on, not something you maximise. "Clear rate"
reads like a performance figure to be pushed up, which is exactly the wrong
instinct for a bound.

**And it is measured on the real bot, not on the probes — that is the
point.** Everything else on this page describes the design against a fixed,
deliberately dumb reference player. The probe cannot exploit a game that got
easier the way a competent bot can, so it systematically under-reports how
much a change moves the actual product.

M6 proved it: the probe's buffer moved 0.846 to 0.910, a modest and
carefully-argued improvement, while finishes went from 30.7% to 56.7%. On
the probes alone that change looks safe. **`finishes` is the only number on
this page that catches a design change whose effect on the game is far
larger than its effect on the reference player** — and it costs nothing,
since the batch runner already reports it.

**Challenge is a constraint, not a goal.** It is calibrated and no map item
is licensed to move it. An item that improves a ratio by making floors
harder or easier has not improved anything — it has moved the denominator.

**Buffer: 1.16 is DCSS's figure and it transfers cleanly.** With challenge
held at 1.343 it puts `challenge/buffer` near 1.16 against DCSS's 1.11.
Anything at or above 1.00 already fixes the sign, which is the part that
matters; 1.16 is the ambition.

**CV: do NOT copy DCSS's 1.14.** The growth rates are not comparable because
the starting points are not. Rogulidle's CV of challenge begins at 1.20 on
floor one and falls to 0.64 by floor nine; DCSS starts from a much lower
base. Growing 1.14 per floor from 1.20 would end near 3.9 — a standard
deviation four times the mean, which is not a game, it is a coin toss.

The high base is itself an artefact worth understanding rather than
preserving: floor one holds two creatures, so a single draw swings the total
enormously, and the fall to 0.64 is mostly the law of large numbers as the
roster grows. **The target is therefore the sign, not the slope** — deep
floors at least as unpredictable as shallow ones, with ~1.05 as a reasonable
ambition and anything above 1.00 counting as fixed.

**Two bounds, not goals.** `challenge/power` must not fall below about 1.15
and finishes must stay inside 15–40%. Both drift the same way when the
hero gets stronger, which M6 does on purpose. They are there to catch a fix
that works by making the game easy, and if either leaves its band the answer
is a smaller change, never a difficulty re-tune.

**No target for reward.** `reward/challenge` and CV of reward have no
instrument that answers the question — the probes measure incidental
pickup, which is a property of their policy. Nothing should be built to move
a number that does not yet mean anything.

## The problem all of this serves

Measured: difficulty grows ×1.34 per floor while the hero's power grows far
slower, the **coefficient of variation falls** with depth (0.944 per floor),
and the **buffer falls** rather than holding. Deep floors converge on their
own average; the climax of a run is its most predictable moment, played by a
hero whose tolerance for error is shrinking.

In a game the player only watches, that is the central problem. A player
with decisions gets tension from risk. A spectator only has surprise.

The target is not to match DCSS's numbers — those are derived from attribute
scales, not observed play, so only the **signs** of the ratios are
comparable.

Current reading, from the observed ruler (I1) after review. Numbers from the
modelled ruler are superseded and not comparable:

                       DCSS    rogulidle
    challenge/power    0.95     ≥1.307   inverted, and DELIBERATE — see below
    CV challenge       1.14      0.944   inverted, WRONG    -> M2..M5
    buffer             1.16      falls   inverted, WRONG    -> M6
    challenge/buffer   1.11      1.560   same sign, 5× steeper — follows buffer
    reward/challenge     —         —     no instrument answers this yet

The rogulidle column is the observed ruler (I1) after review; the DCSS column
is derived from attribute scales rather than observed play, so treat it as an
estimate of shape, never as a number to hit exactly.

**Decided: match CV and buffer, leave challenge/power alone.**

`challenge/power` inverted is a **format parameter, not a defect**. DCSS runs
0.95 — the average fight gets easier with depth — because it has 27 floors
and a win condition to reach, so its drama lives in the tail and it has room
for the tail to happen. Rogulidle is a ten-floor race that has to end, at
around 30% clear.

Copying 0.95 into ten floors gives `0.95⁹ = 0.63`: floor ten lands 37%
lighter on the hero than floor one, the hero walks the bottom, and the clear
rate goes to nearly 100%. The horse race dies. Matching that index honestly
would mean lengthening the descent, which is a different project from the one
in this queue.

So two of the three inversions are targets and the third is left where it is.
Revisit only if the floor count itself is ever reconsidered.

Two cautions attached to that block, both from the I1 review:

- **Buffer falls, it is not flat.** The earlier "flat" reading came from the
  modelled ruler. Observed, the hero ends the descent absorbing a fraction
  of the blows it absorbed at the start. Survivor selection makes the
  measured value optimistic, so the real decline is steeper.
- **Reward is out of the block.** The probe collects only what it steps
  over, so its reward number describes the probe's policy rather than the
  design. Putting it back needs an instrument that detours for loot.

**Ordering consequence.** M3–M5 add a lethal tail. Against a *falling*
buffer a lethal tail is not tension, it is sudden death with no arc — the
hero's capacity to survive the spike is shrinking as the spike appears. So
M6 is decided before any variance work is adopted. Measuring M3–M5 first is
fine; adopting them is not.

**Tune the curves against the probes, never against the real bot.** The
probe measures the design against a fixed reference player; the real bot
measures design and bot quality mixed together, so every bot fix would move
the target. Win rate is the real bot's question, and it is a different one:
is this playable and watchable.

**Re-read the ratios after each map change, not once at the end.** M3, M4
and M5 aim at the same target by different routes; stacked and measured once
they cannot be told apart, and at least one of them probably does not pay —
the count→strength route already did exactly that. The probes are frozen, so
a re-run is cheap and paired by construction. "Are we close to DCSS" is a
reading of the ratios above, not a separate instrument.

---

## I1 · replace the modelled ruler with observed probes

`map` · `metrics agent` · **DONE**

Two probes differing in one thing only: A clears the floor and collects
nothing, B clears it and picks up what is on the way. Neither hunts loot, so
the difference between them is attributable to loot alone.

The probe must be its **own frozen file**, not the current bot with options
switched off. If it is the bot configured, fixing the bot changes the ruler
— the exact coupling that motivated the work. It should be deliberately dumb
and permanent: a calibration weight, not an athlete.

Produces: challenge, reward, buffer, power per floor, with the coefficient
of variation of challenge and reward, growth rate per floor, standard errors,
and the four ratios.

**Two corrections issued mid-flight, recorded so they are not lost.**

- Reward is `cost(A) − cost(B)`, not the reverse. B collects gear, gets
  stronger and clears **cheaper**, so the naive order comes out negative.
- **The probe is not an instrument for clustering**, despite the original
  brief implying it. See I2.

### Result

Delivered as specified. `src/analysis/observed-ruler.js` — the two frozen
probes, `isolatedShape` (paired A/B per generated floor) and `builtShape`
(power/buffer from a real B-only descent) — imports nothing from `src/bot/`.
`run-ruler.html` is the page. `docs/observed-ruler.md` has the full
per-floor table, growth rates, standard errors and the four ratios; it is
the current baseline and `docs/curve-shape.md` now points to it as
superseded. The one engine change the probes needed — `noPickup`, so A and
B can differ in pickup alone — is in `src/sim/game.js` and
`src/sim/step.js`, off by default, nothing else touched.

**Headline numbers** (150 isolated floor-pairs/level, 1500 descents, seed
base 800000 — see observed-ruler.md for the row-by-row table):

    challenge     ×1.343 ±0.009 / floor   (×14.2 over the ladder)
    reward (abs)  ×1.310 ±0.113 / floor   (×11.3 over the ladder)
    power         ×1.029 ±0.022 / floor
    buffer        ×0.862 ±0.018 / floor
    CV challenge  ×0.944 ±0.012 / floor   (falls — same direction as the old model)
    CV reward     ×0.984 ±0.067 / floor

    challenge/power   1.307/floor    challenge/buffer   1.560/floor
    reward/challenge  0.975/floor, and small — 1-2% of challenge at every depth

**Direct answer.** The observed ruler is built and running, and it does not
overturn the two headline shape findings from the modelled ruler — CV of
challenge still falls, buffer is still ~flat — those hold up under real
play. What it settles is the question it was built for: it cannot misprice
a crowd the way `campaignCost`'s duel-sum could, because it plays the fight
instead of pricing it.

**What surprised me.** `reward/challenge` is small AND flat at every depth
(no floor stands out), not something that grows as chests get richer with
depth. A policy that never detours for loot barely benefits from what it
happens to step on — passive pickup is close to free but also close to
worthless. Matches `bot-strategy.md` §1's "a chest is worth a fraction of
an item" argument, now measured by play instead of argued from item odds.
Separately: Sonda B — zero danger-awareness by design — never finished a
ten-floor descent once in 1500 tries (survival 91% by floor 2, 12% by floor
5, ~0% by floor 9). Expected for a calibration weight rather than an
athlete, but it means **power and buffer past floor 7 are not usable
numbers** (reached ≤ 6) — reported for completeness, not as findings.

**What I could not resolve.**
- CV of reward is close to meaningless as reported. Reward hovers near zero
  at most floors, CV divides by that near-zero mean, and the per-floor
  values swing from about 5 to about 37 in the baseline table with a
  growth-rate fit barely constrained (±0.067 on 0.984). I reported it
  because the spec asked for it, but would not build anything on it without
  a different definition — CV against `|reward|` or against challenge
  instead of against reward's own mean.
- Mid-session I cached the probes' exploration pathing between turns for
  speed (monster-chasing stays uncached every turn, since monsters move —
  only the terrain-only frontier/shrine leg is reused). This adds one
  disclosed approximation: once committed to a frontier tile, the probe
  does not re-check for a closer one revealed en route; monster priority is
  unaffected, it is still evaluated fresh every turn. Checked the
  challenge/reward series at n=60 against the committed baseline and it
  sits inside noise, but this is a spot check, not a proof it never moves
  an outcome — if a future rerun looks off by a small margin, look here
  first.

**Out of scope.** Nothing beyond what is already captured in the
corrections above (clustering → I2/I3).

### Review — not promoted to DONE

The challenge half stands. `isolatedShape` carries n=150 paired samples at
every level, independent of descent survival, so `challenge ×1.343 ±0.009`
and `CV ×0.944 ±0.012` are usable and they confirm the central finding
through an instrument that cannot misprice a crowd. The frozen file with no
`src/bot/` import is as specified, the caching disclosure is specific, and
the self-criticism of CV-of-reward is correct and was raised unprompted.

Four things to settle before this closes. The first two are cheap and need
no new runs.

**1. The fit contradicts its own document.** `observed-ruler.md` says
"log-linear fit over the whole ladder" and also says power and buffer past
floor 7 "are not usable numbers". Both cannot hold. Descents reaching each
floor run 1500, 1361, 893, 465, 175, 53, 14, 6, 2, 0 — and a log-linear fit
takes its leverage from the ends, so the n=2 and n=6 points dominate the
slope. **Refit power and buffer over floors 1–6 (n ≥ 53)** and report that
number as the headline, with the full-ladder fit kept only as a footnote.

**2. The headline contradicts the table.** "Buffer is still ~flat" against a
measured 0.862 per floor, which is ×0.3 across the ladder — the hero ends
absorbing a third of the blows it started with. The same document reads
`challenge/buffer 1.560` correctly as "a mistake gets more expensive", then
calls the buffer flat two sections later. Buffer is not flat, it **falls**,
and that is a finding rather than a footnote.

**3. Survivor selection came back inside the instrument.** Sonda B was
chosen for power and buffer precisely to escape the real bot's survivor
selection (z = 4.89, cited in the doc). But Sonda B dies: the heroes
measured on floor 5 are the luckiest 175 of 1500. That is the same
selection, inside the tool built to remove it.

Direction matters and it is favourable: survivors carry more hp, so the
measured buffer at depth is **optimistic** and it still falls — the finding
survives the bias and is stronger than reported, not weaker. Power at depth
is inflated by the same mechanism, so `challenge/power 1.307` is a **floor,
not an estimate**. Say so where the number appears.

**4. Reward stopped answering the question it is in the table for.** This
one is a spec error, not an execution error — the fault is the project
agent's, and the honest fix is not to blame the measurement.

Sonda B only picks up what it steps over and never detours. So the number
measures *incidental pickup*, which is a property of the probe's policy, and
not *what the floor holds*, which is a property of the design. That makes
`reward/challenge = 0.975, 1–2% of challenge` an answer to "does walking
over loot pay" rather than to "does descending pay". The report gets close
("a policy that never detours barely benefits") without drawing the
conclusion: **the ratio is not comparable to the DCSS one and must come out
of the four-ratio block** until an instrument measures the intended
quantity.

No fix required from the metrics agent here. It is recorded so the number is
not read as something it is not, and a probe that does detour for loot is a
question for the project agent, not a defect in this one.

## B1 · which layer is the ping-pong born in

`bot` · `work agent` · **REPORTED**

The bot walks back and forth between two tiles, sometimes for a long time,
with a creature two or three tiles away. `balance.md` records roughly one
run in nine.

**Why it mattered.** It is the most visible defect in a game whose product
is watching, and it corrupts every difficulty measurement taken against the
bot. One fix had already failed, so the value was knowing *where* it lives
before spending another attempt.

**The bifurcation.** Goal alternating with the step means goal selection;
goal stable with only the step alternating means the tactical veto.

Reported answer: **the tactical veto** — the second branch. The
goal-selection hypothesis (stickiness applying only to monster targets,
chest `net` flipping sign as danger doubles per tile) was wrong.

That is what the task was built to find out, and it inverts the premise
B2 and B3 were sketched against. Both are being rewritten.

### Result

Measured in `docs/bot-strategy.md` §4.5 — full method and tables there,
not repeated here. Changes: `src/bot/bot.js` (the `trace` hook now records
`final`, the action `decide()` actually returns, and `vetoed`, whether the
tactical veto overrode `planned` — it previously recorded only the plan);
`src/sim/balance.js` (`REVERSAL_PENALTY`'s comment corrected — it claimed
the cause was still unidentified, which is no longer true; the constant
itself is untouched, still `0`). No behaviour changed. 61/61 tests pass.

**Direct answer: tactical veto, not goal selection.** Two independent seed
families (n=60 dungeons each, confirmation seeds never used while building
the classifier), pooled counts, binomial SE:

    veto      1093/1776 episodes = 61.5% ± 1.2 pp
    routing    327/1776          = 18.4% ± 0.9 pp   (not in the brief's bifurcation — see below)
    goal       157/1776          =  8.8% ± 0.7 pp
    other      199/1776          = 11.2% ± 0.8 pp

Turn-weighted shares track episode-count shares within 1–2 points in both
samples, so this isn't a few long episodes skewing a count.

The goal-selection hypothesis in the brief (chest `net` recomputed from
scratch every turn, `GOAL_STICKINESS` only covering `kind === 'monster'`)
is a real, confirmed mechanism — it does produce goalId-alternating
episodes — it is just the minority cause, not the dominant one.

**What surprised me.** A third pattern the brief's binary didn't have room
for: goal stable, veto never even consulted (no monster in tactical range),
and `planned` itself alternates for up to 17 turns anyway. Larger than the
goal-selection bucket. Working hypothesis, *not* confirmed at tile level:
`believedWalkable` treats unseen tiles as walkable, so the cheapest route to
a fixed goal can flip as fog-of-war reveals map on each step, tipping a
tied-cost route back and forth. Called "routing" in §4.5.

Also: inside veto episodes, the mechanism is not "attack, retreat, attack,
retreat" as `REVERSAL_PENALTY`'s old comment assumed. The plan itself often
alternates between two *perpendicular* actions (e.g. up/right — not
opposites), and the veto turns one of them (right → down) into the literal
opposite of the last move, manufacturing the reversal out of a plan that
alone would never have counted as one.

**What I could not settle.**
- The routing hypothesis is consistent with every example inspected but
  not traced down to the tile/heap-tie level that would confirm it rather
  than merely fit it.
- The 11.2% "other" bucket is not decomposed — may be episodes where goal
  flips and veto overrides both contribute; not separated further.
- The historical reversal rate this file used to cite (0.238) does not
  match what I measured now (0.174 / 0.210 across the two families). Likely
  drift — `spine`, the crowd-cost correction, floor spread and guard
  pricing all postdate that number — but I did not confirm it is drift
  rather than a difference in method.
- I did not re-run the old `REVERSAL_PENALTY` sweep (0 / 1.5 / 6) against
  this classification to see whether it moved the veto bucket specifically;
  that breakdown did not exist when the sweep was run.

**Out of scope, for the project agent to evaluate.** B2 is being rewritten
with "tactical veto" as the whole answer. The routing locus (18.4% ± 0.9 pp,
confirmed on two independent samples) sits *before* the veto is even
consulted — a fix scoped only to `scoreActions` / `bestValue` in
`tactics.js` cannot reach it. Worth a decision on whether routing gets its
own item or stays folded into B2's scope.

### Review of the fixes — CLOSED

Both accepted, and one landed better than asked.

`power 1.022 ±0.042` and `buffer 0.855 ±0.023` over floors 1–6. The values
barely moved, but the standard error on power nearly doubled against the
full-ladder fit — which was the point, and the report says so rather than
treating the agreement as vindication of the old window: *"the thin tail did
not secretly reverse the trend this time — but that agreement is not
guaranteed in general."*

The buffer correction carries an independent check nobody asked for: the raw
floor-1-to-6 ratio, 6.4 / 14.7 = 0.44, agrees with the fitted 0.855⁵ = 0.457.
That confirms the finding outside the fit, which is stronger than refitting.

**Better than requested: the fix went into the instrument, not just the
document.** `run-ruler.html` now fits power and buffer only over floors with
`reached ≥ 50`, as a constant that adapts to run size, and a 60/60 check
confirmed it reports `-` rather than fabricating a fit from two points. The
error cannot come back on the next run, which is the only kind of fix that
holds.

Review points 3 and 4 were left untouched and declared, as instructed.

One note that changes nothing but is worth carrying: `power 1.022 ±0.042`
has an interval covering 1.0, so **power growth is statistically
indistinguishable from flat**. That strengthens the `challenge/power` story
rather than weakening it — the ≥1.307 quoted in the ratio block is
conservative.

## I2 · spread against grouped, with a normal hero

`map` · `metrics agent` · **DONE**

A previous test concluded the same roster spread out or grouped costs the
same, and on that basis the "simultaneity" hypothesis was rejected. That
result is suspect and it blocks the main map candidate, so it gets redone.

**Why it is suspect.** It used a high-hp measuring hero. Spread or grouped,
the hero meets the same creatures and takes a similar *total* number of
blows — what changes is their **concentration in time**. Three adjacent
creatures strike in the same turn. To a 400 hp hero that is irrelevant; to a
10 hp hero it is the difference between living and dying.

**Clustering does not change cost. It changes lethality.** The test measured
the one quantity insensitive to the effect.

A second confound: the bot actively avoids being reachable by two at once,
so a competent bot converts a cluster back into sequential duels using
corridors. "Grouping changed nothing" may be "the bot un-grouped them".

**Acceptance.** Same roster, spread against grouped, normal hero, reporting
both:
- lethality — deaths, and damage taken in the worst single turn
- whether the bot is un-grouping — fraction of turns with two or more
  adjacent, grouped against spread

**Either answer is useful.** If clustering does not raise lethality, M2 dies
and M3–M5 become the main plan. If the bot is successfully un-grouping, M2
does not die — its design changes, because clustering only becomes a lever
where the map prevents escape (open rooms, no corridor) or the creatures are
fast enough not to be separated. That is design information, not a dead end.

### Result

Full write-up, per-floor table and both figures below in
`docs/clustering-i2.md` — summarised here, not repeated. Built
`src/analysis/clustering.js` (roster generated by the shipped `populate()`
unchanged; only monster position is rewritten afterwards into clusters) and
`run-cluster.html`. Nothing in `src/sim/` or `src/bot/` changed — the
per-run driver reimplements `playGame`'s loop against a pre-built state
using only already-exported pure functions (`step`, `observe`,
`foldBelief`), because `playGame` only ever builds its own state from a
seed. Both conditions are played by the real bot (`makeBot`, default
settings) — an I4-style question, not an I1-style frozen probe — starting
at `REFERENCE_HERO`, not the bare level-1 kit: tested with the literal
starting kit, floor 10 saturated near 100% dead in BOTH conditions (5/5
spread, 4/5 grouped on a throwaway sample) before this fix, which destroys
the comparison's power regardless of any real effect.

**Baseline** (60 paired seeds/level, cluster size 3, seed base 300000):

    death rate, pooled     spread 10.2% (61/600)   grouped 13.2% (79/600)
                            gap 3.0 pp, z = 1.62
    crowded fraction        higher under grouping at ALL 10 floors,
    (2+ adjacent)            clears 2 sigma at 3 of them (z up to 3.16),
                             gap widens with monster count
    worst single turn       no consistent gap (z from -0.74 to 2.27)

**Direct answer.** Leaning toward "clustering raises lethality" but not
settled: the pooled death gap alone is short of 2 sigma, but its sign is
positive at 8 of 10 floors and tied (not reversed) at the other 2 — zero
floors go the other way, which is the same sign-consistency argument
`balance.md` already leans on elsewhere. **The un-grouping confound did not
happen**, or not fully: if the bot were converting clusters back into
sequential duels, crowded fraction should read flat between conditions, and
instead it is higher under grouping everywhere and significantly so at three
floors. The earlier null result is better explained by cost being the wrong
quantity (as suspected) than by bot behaviour erasing the effect.

**What surprised me.** Crowded fraction and worst-turn damage did not move
together. More turns with 2+ monsters adjacent did not translate into
bigger worst-single-turn spikes — likely because "adjacent" is not "landed a
blow" (5/6 hit chance, independent per monster), so 60 seeds/floor may be
too few to resolve a rare tail event. A mean is the wrong statistic for a
tail; a percentile would answer this better.

**What I could not resolve.** The death-rate z (1.62) is a judgement call,
not a clean pass — a 2-3x larger sample, or pooling just the high-count
floors (7-10) where absolute rates are largest, would settle it either way.
Grouping also ignores the spine/side split by design (disclosed in the doc)
so this answers "does clustering matter at all", not "does it matter once
it respects spine/side" — and cluster size (3) was chosen, not swept.

**Out of scope, for the project agent to weigh.** I3 (blocked on this item)
named two candidate metrics; this experiment's clearest signal came from a
third — fraction of turns with 2+ adjacent — which is already built and
instrumented here. I3 may be mostly done rather than a fresh build.

### Review — DONE, with the mechanism left open

Accepted. Both acceptance criteria were answered, the boundary was respected
(nothing in `src/sim/` or `src/bot/` touched — the driver reimplements the
loop from already-exported pure functions), and the real bot was used, which
is right for a question about whether the bot's own avoidance erases the
effect.

**The most valuable thing here was not in the brief.** Run with the bare
level-1 kit, floor ten saturated near 100% dead in *both* conditions, which
leaves the comparison no power to detect anything at all. Catching that and
switching to `REFERENCE_HERO` is what made the experiment capable of
answering its question. A saturated null would have read as "clustering does
nothing" — the same wrong answer the previous attempt gave, by a different
route.

**The un-grouping confound is dead, and that is a clean result.** If the bot
were converting clusters back into sequential duels, crowded fraction would
read flat between conditions. It is higher under grouping at all ten floors
and clears 2σ at three. That closes the second of the two doubts this item
was raised to settle.

**The report underclaims, and a free test would probably settle it.** The
pooled `z = 1.62` is short, but the per-floor directions are 8 positive, 2
tied, 0 reversed. Among the eight decided floors a sign test gives about
p = 0.008 — significant, and using information the pooled z throws away.
Worth running properly before treating this as unsettled, with one check
first: the sign test needs the floors to be independent samples, so confirm
the per-floor runs do not share an RNG stream in a way that correlates them.

**What is NOT established is the mechanism, and that matters for M2.** M2's
stated rationale is that three adjacent creatures strike in the same turn,
so damage per *turn* grows while damage per *blow* stays capped — DCSS's
shrinking reaction window obtained by placement. **Worst-single-turn damage
showed no consistent gap.** The self-diagnosis is right (a mean is the wrong
statistic for a tail, and "adjacent" is not "landed a blow" at 5/6 each),
but until a percentile shows the spike moving, the causal path is assumed
rather than measured.

If clustering raises deaths without raising the spike, it is raising
lethality by **attrition** — more turns spent adjacent to something — which
is a difficulty increase, not the tension shape M2 was chosen for. Same
direction, different product.

**And the CV effect is untested.** The other half of M2's case is that
grouping cuts the number of independent draws, so challenge CV stops
falling. Nothing here measures that. It is measurable, though: turn
clustering on and re-run the observed ruler.

Both gaps land on I3, which is rescoped below rather than closed.

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

## I5 · the ruler cannot see the buffer where the target lives

`map` · `metrics agent` · **IN FLIGHT**

The ruler is solid on one half and weak on exactly the half currently being
decided.

**Challenge and CV are sound.** `isolatedShape` carries n ≥ 135 paired
samples at every level, independent of descent survival. Those numbers can
be leaned on.

**Power and buffer cannot be, past floor 6.** They come from `builtShape`, a
real descent by Sonda B, and Sonda B dies: of 1500 descents, 175 reached
floor 5, 14 reached floor 7, and **zero reached floor 10**. The fit is
honestly restricted to floors 1–6, and two things follow.

The buffer target is about **deep** floors — the hero meeting floor ten's
cost with less tolerance than it had at the top. The instrument stops seeing
anything two thirds of the way down, so M6 was judged on the shallow half of
the problem it was raised to fix.

And what it does see is **survivor-selected**: the heroes measured on floor 5
are the luckiest 12%. That biases buffer *optimistic*, so the true decline is
steeper than reported. The direction of the bias is favourable to the
finding, which is why M6's verdict is not in question — but the magnitude
is not usable, and M7 will be judged on the same number.

**The question, and it may not have a cheap answer.** Can buffer be measured
at depth at all with a probe that dies there? Three shapes to weigh, and
picking among them is most of the work:

- A probe that survives deeper without becoming a different hero. More hp
  makes it immortal-ish and stops it measuring the real progression; there
  may be a version that only changes survival and not the buffer being
  measured, or there may not.
- Buffer measured per isolated floor against a defined hero state, rather
  than from a descent — trading survivor selection for an assumption about
  what hero arrives.
- Accepting floors 1–6 as the measurable window and saying so once, loudly,
  in the targets rather than in a footnote — so nobody again decides a
  deep-floor question on shallow-floor evidence.

**"It cannot be done cheaply" is an acceptable answer**, and the third option
is a real outcome rather than a failure. What is not acceptable is leaving
the limitation where it currently sits: true, documented, and quietly
ignored every time a buffer number gets quoted.

### The asymmetric window, and why it holds up M6's verdict

Answer this one first — it is narrower than the rest of the item and it
gates a decision that is otherwise ready.

**The change being measured moves the measurement window.** With M6 off, the
probe dies early: 14 of 1500 descents reach floor 7. With M6 on it carries
more hp and survives further, so the "on" arm is fitted over a longer ladder
than the "off" arm. A rate fitted over floors 1–6 in one arm and 1–8 in the
other is **not paired**, and pairing is the property the whole seed protocol
exists to protect.

**And the mechanism is depth-dependent, so the truncation is not neutral.**
The grant is per kill and kills grow with depth — roughly 25 cumulative
kills by floor 6 against 85 by floor 10, so about +12 hp against +42.
Extrapolating a floors-1–6 rate out to floor 10 is an assumption, and it is
an assumption about exactly the region the buffer target is written for.

Which way it cuts is genuinely unknown. Damage per floor grows 1.343 while
kills grow 1.3, so the grant loses ground on the mean — but the deep floors
are where both terms are largest and neither has been observed. Nobody can
say which dominates without looking.

**What is needed is narrow:** either both arms measured over a common window
so the comparison is paired again, or a statement that the comparison cannot
be paired and what should be quoted instead. Everything else in I5 can
follow.

**Out of scope.** Reward still measures incidental pickup rather than what
the floor holds — I1 review point 4, still open, and why reward has no entry
in the targets table. Not this item; noted so it is not forgotten twice.

### Result — the asymmetric window, closed

Answered the narrow question first, as asked; the rest of I5 (can buffer be
measured at depth at all) is still open. Re-ran `isolatedShape`/`builtShape`
against `hpFromKills` explicit on both arms (same discipline as M6's
reading — off does not rely on the balance.js default, on does not either),
120 isolated floor-pairs/level, **1500** descents/condition this time
(against 800 in the M6 reading, specifically to give the off arm its best
chance at reaching floor 6). Seed base 800000, max 4000 turns.

**Reach, both arms, this run:**

```
floor            1     2     3    4    5    6    7    8    9   10
reached, off  1500  1361   913  499  220   76   25    8    2    —
reached, on   1500  1361  1040  708  433  244  148   84   59   47
```

Off reaches `n ≥ 50` (the reliability line) through **floor 6** this time
(76 ≥ 50) — one floor further than the M6 reading's 800-run sample managed,
purely from the bigger sample, confirming the M6 reading's own floor-1–5
window was a sample-size artefact rather than a hard ceiling. On reaches
through floor 9. **Common window: floors 1–6.**

**Both arms refit over exactly that window — paired, as asked for:**

```
                        off (hpFromKills:false)     on (shipped rate)
challenge/power          1.292 ±0.052 / floor         1.192 ±0.044 / floor
challenge/buffer         1.572 ±0.045 / floor         1.417 ±0.044 / floor
buffer                   0.863 ±0.021 / floor         0.958 ±0.024 / floor
power                    1.050 ±0.038 / floor         1.139 ±0.036 / floor
buffer at floor 6        6.64                          11.45
power at floor 6         10.08                         15.46
descents fully cleared   0/1500                        38/1500
```

**Direct answer: the earlier (unpaired) reading overstated the improvement.**
Paired on the common window, buffer moves 0.863 → 0.958 (gap +0.095). The
M6 reading's own numbers — fit each arm over its OWN reliable window,
floors 1–5 off against 1–7 on — read 0.842 → 0.980 (gap +0.138), about 45%
larger. Both readings agree on the two things that matter for M6's verdict:
buffer **still falls** on the shipped rate (0.958 < 1.00, short of the ≥1.00
bar), and the flag **does** raise it. The paired number is the one to quote
going forward — it is not a new finding so much as the old one corrected of
an inflation the mismatched window was quietly adding.

**What surprised me.** The size of the correction. I expected the mismatched
window to bias the gap in this direction (fitting "on" further out than
"off" lets it capture more of the region where the grant has had more kills
to compound) but did not expect a 45% swing in the headline gap from a
bookkeeping fix rather than a new measurement.

**What I could not resolve.** Whether floor 6 is close enough to floor 10 —
where the buffer target is actually about — for a floors-1–6 rate to be
trusted extrapolated that far. The item's own text already flags this as
unknown or worse (the grant's cumulative-kills advantage grows with depth,
so a shallow rate could understate the deep effect); this result narrows the
comparison method but does not touch that open question, which is the rest
of I5.

### Addendum, arriving mid-flight — a sharper framing of the same question

**Not a rewrite.** The spec above stands and the work in progress against it
is not wasted. This is a reframing that arrived after the item was claimed;
fold it in or finish the current pass first, your call — but say which.

The prompting question was simply: *should the probe not survive all ten
floors?* Chasing it exposes that **"buffer" is two quantities glued
together**, and only one of them is measurable by a probe at all.

`isolatedShape` already makes the probe near-immortal — `PROBE_HERO` carries
400 hp — and that is exactly why challenge and CV are the trustworthy
numbers. Same instrument at every floor, no survivor selection, no truncated
window.

Buffer could not follow, and the reason is structural rather than an
oversight. Buffer is `hp on arrival / mean blow`, and hp on arrival is **what
the hero accumulated minus what it spent**. Measuring the spending needs a
hero that can actually spend. An immortal probe arrives at every floor
essentially full, so making it survive fixes the sampling and destroys the
quantity.

**So split it:**

    capacity     what the hero accumulates descending — ceiling, gear, grants
    attrition    how much of that a floor takes back
    buffer       = capacity − attrition, as seen on arrival

Capacity is cleanly measurable with an immortal probe across all ten floors:
it still kills, still collects, still earns the per-kill grants — it just
does not die. Attrition needs a mortal hero, and there the survivor
selection is intrinsic rather than removable, so it gets **declared rather
than disguised**.

That also explains the incoherence review 2 could not resolve — the design
reading "still too hard" while the product reads "too easy". The two halves
are being measured by one instrument that is right for one of them.

**Consequence.** `isolatedShape` is correct and does not change.
`builtShape` is the one that has to decide what it is, and it probably
becomes two passes rather than one.

**And it likely changes the target, not the game.** If capacity and attrition
are separable, "buffer ≥ 1.00" was a question put to an instrument that
cannot answer it — an absolute target taken from a DCSS figure derived for a
real player and applied to a probe reading. The honest replacement is
comparative: capacity grows, attrition is reported alongside it, and neither
carries a borrowed absolute number. That is the project agent's error to
undo, not this item's, but the item is what will show whether it needs
undoing.

### Result — decision on the addendum: closing this pass, not folding in

**Finishing the current pass first, not incorporating now.** The asymmetric-
window result above is a complete, committed, self-contained answer to a
narrow question; the capacity/attrition split is a different measurement —
a new immortal-probe pass for capacity, and attrition's definition and its
survivor-selection disclosure still need designing, not just wiring up. Both
in one sitting risks the thing this backlog already warns against
elsewhere: two changes measured together cannot be told apart if either
turns out wrong. The split gets its own pass, next.

**What that next pass needs to settle, so it starts scoped rather than
open-ended:** an immortal starting hero for capacity (`builtShape` with a
high-hp `carry` instead of the default `PLAYER_HP` start, otherwise
unchanged — still Sonda B, still real descents, still earns the grants) is
mechanical and looks cheap. Attrition is the part still underspecified —
whether it is reported as damage taken per floor directly (already
computed by `playDungeon`'s `lvl.damage`, possibly already sitting
unused), as blows-survived, or some other form, and how the intrinsic
survivor selection gets stated rather than hidden (an I1-style check
against the mid-floor-power selection z, or something built for this
specifically). Deciding that shape is most of the next pass's work, not a
detail to fill in while coding.

## M7 · move difficulty off count, onto strength and grouping

`map` · `work agent` · **IN FLIGHT** — the main route for the CV target

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

## M3 · an out-of-depth tail

`map` · `work agent` · **READY** — fine tuning, only if M7 leaves a gap

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

## I3 · settle clustering's mechanism and its effect on CV

`map` · `metrics agent` · **DONE** — Q1 answered; Q2 and Q3 rehomed into M7

I2 left clustering **leaning positive on lethality but unexplained**, and
that is not enough to design M2 against. The original scope — "build a
metric that can see clustering" — is largely already met: I2 built
`src/analysis/clustering.js` and found the working signal on its third
candidate, fraction of turns with two or more adjacent. What remains is
three questions, in this order.

**Scope change: only question 1 belongs to this item now.** The metrics
agent measures the real game and does not build variants to study them —
see "Every map item ships behind an off-by-default flag" above. Questions 2
and 3 need clustering to exist in `src/sim/`, so they wait for M2 to build
it switched off, and then get measured on against off.

Note the inversion: this item was written to decide whether M2 was worth
building, and now M2 has to exist before most of it can be answered. That
is the flag protocol working as intended, not a mistake — the cost of
never pre-screening is that the cheap question comes after the build rather
than before it. M2 is last of the five map items, so this will wait a while.

Question 1 stands because it re-analyses data already collected — but say
plainly in the result that it describes the instrument's clustering, which
is not yet the engine's, so it is a direction rather than a verdict.

**1. Settle the death-rate result properly.** Pooled `z = 1.62`, but the
per-floor directions are 8 positive, 2 tied, 0 reversed. Run the sign test —
it uses information the pooled z discards and looks likely to clear
significance on its own. **Confirm first that the per-floor runs are
independent**, since a shared RNG stream across floors would correlate them
and invalidate the test. If it still does not settle, pool floors 7–10 where
absolute rates are largest, or raise the sample; do not raise it blindly
first.

**2. Does clustering move the SPIKE, or only attrition?** This is the one
that decides what M2 is worth. Its rationale is that adjacent creatures
strike in the same turn, so damage per *turn* grows with damage per *blow*
capped — the reaction window shrinking by placement. I2 found no consistent
gap in worst-single-turn damage.

Its own diagnosis is probably right: a mean is the wrong statistic for a
tail, and "adjacent" is not "landed a blow" at 5/6 each. So report a
**percentile of per-turn damage** — p95 and p99 — not a mean, at a sample
large enough to resolve a rare event.

Both answers are useful and they lead different places. Spike moves →
M2 delivers the tension shape it was chosen for. Spike flat while deaths
still rise → clustering raises lethality by **attrition**, which is a
difficulty increase rather than a shape change, and M2 has to be re-argued
against M3–M5 rather than assumed ahead of them.

**3. Does clustering stop the CV falling?** The other half of M2's case is
that grouping cuts the number of independent draws per floor, so challenge
CV should stop collapsing. Nothing measures this yet, and it is the half
that connects M2 to objective 1. It is cheap: turn clustering on and re-run
the observed ruler, which is frozen and paired by construction.

**Note what this item is not.** It does not adopt clustering and does not
tune it. Cluster size was fixed at 3 in I2 and the spine/side split was
ignored by design; both are M2's problem, not this one's.

### Result

Full write-up in `docs/clustering-i3.md`. Scope was cut to question 1 only
partway through this item, before question 2/3 numbers were taken — no
engine variant was built to answer them, in line with the new rule. The
in-progress work on 2 and 3 (an extension to `src/analysis/clustering.js`
and `run-i3.html`) was reverted rather than left dormant; both files now
contain only what question 1 needed. Nothing in `src/sim/` or `src/bot/`
touched, and nothing new was played — this is a re-analysis of I2's
already-published table.

**Sign test:** 7 positive, 3 tied, 0 reversed across the 10 floors.
Two-sided exact sign test on the 7 decided floors: **p = 0.0156**. Clears
the conventional 0.05 bar and, at roughly z ≈ 2.42 two-tailed, this
project's 2-sigma bar too.

**Independence**, confirmed by construction rather than empirically: each
floor's state comes from `newGame(hashSeeds(firstSeed + i, level), plan)`,
a freshly generated state with its own rng streams and no shared mutable
state with any other floor's playthrough (`game.js`'s `makeStreams`, built
for exactly this). Same standard this project already applies to its
map/spawn/combat stream independence, not re-verified empirically either.

**Direct answer.** Settled, with the scope caveat the item itself asks for
stated plainly: this is the sign of the gap `toGrouped()` produces — the
instrument's clustering (post-processing, cluster size 3, spine/side
ignored) — not clustering as `src/sim/` will generate it once M2 exists. A
direction for M2's design, not a verdict on it.

**Correction to the record, not just a result.** This item's own spec said
"8 positive, 2 tied" (from the I2 review) and computed p ≈ 0.008 from that.
Recounted by hand against the published table: floor 6 is also tied
(1.7% = 1.7%), so it is **7 positive, 3 tied**, and the correct p is
**0.0156**, not 0.008. The conclusion does not change — 0.0156 still
clears — but the number that was going to be quoted going forward was
wrong, and I did not want to carry it forward silently just because the
mistake happened to be harmless this time.

**What surprised me.** Reproducing a ten-row count by hand and getting a
different answer than the number already written down. Cheap to catch —
one pass over the table — but a reminder that a small sign-count is easy to
miscount once and worth a second pass before it gets quoted elsewhere.

**What I could not resolve / out of scope.** Nothing new. Cluster size 3
and the spine/side simplification were already disclosed in I2 and are
unchanged here; question 2 and 3 wait for M2 as scoped above.

### Review — DONE, questions 2 and 3 rehomed into M7

Accepted. Direction settled: grouping raises lethality, and that is enough
to justify grouping being one of M7's three levers.

**The count correction is the most valuable thing in this report, and the
error was mine.** The I2 review asserted "8 positive, 2 tied" and computed
p ≈ 0.008 from it. Recounted against the published table, floor 6 is also
tied at 1.7% = 1.7%, so it is 7 positive, 3 tied, and the correct two-sided
exact figure is **p = 0.0156**. Arithmetic checked: 2 × (1/2)⁷ = 0.0156.

The conclusion survives, which is exactly why it would have been easy to
carry the wrong number forward. Catching a project agent's number by
recounting it by hand, and reporting it when the answer does not change, is
the behaviour that keeps this backlog worth reading.

**Two caveats on the p-value, neither changing the direction.**

The three ties are almost certainly resolution artefacts rather than true
zeros: at 60 seeds per condition, death rates move in steps of 1/60 = 1.67%,
so any gap smaller than one step is invisible. Dropping ties is the standard
treatment and it makes the test **conservative** here, not generous.

And the sign test was chosen *after* seeing that the directions looked
consistent, which makes 0.0156 optimistic as a strict inferential claim.
That is not a flaw in the analysis — it is why the honest reading is the one
the report already gives: a direction, not a verdict. Quote it as such.

**Independence by construction is the right standard here.** Each floor
comes from its own `newGame(hashSeeds(...))` with separate rng streams and no
shared mutable state, which is the same argument the project already relies
on for map, spawn and combat stream separation. Re-deriving it empirically
would have cost more than it settled.

**Scope discipline was handled well.** The cut to question 1 landed
mid-item, and the in-progress work on 2 and 3 was reverted rather than left
dormant. Dormant half-built instruments are how a shadow implementation
appears, which is the thing the new rule exists to prevent.

**Questions 2 and 3 do not wait for a revived M2.** M2 folded into M7, so
they belong to M7's reading: the CV question is already in its acceptance,
and the per-turn damage percentile has been added to it so the spike-versus-
attrition mechanism gets settled when grouping actually lands in the engine.

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

## M6 · defensive progression

`map` · `work agent` · **DONE** — adopted provisionally, see Review 2 at the end

Progression is **entirely offensive**, and the value table says why:

    dagger 18.90   axe 31.50   shield 3.00   potion 3.00

Gear buys killing faster. Almost nothing buys dying slower.

**The observed ruler made this worse, not better.** The modelled ruler read
the buffer as flat (×1.012). Played rather than modelled, it **falls** —
`challenge/buffer` compounds at 1.560 per floor, so the hero meets floor
ten's cost with less tolerance for error than it had on floor one. And
survivor selection biases that measurement *optimistic*: the heroes reaching
depth at all are the lucky ones carrying extra hp, so the real decline is
steeper than measured.

**Why it is first in the queue rather than last.** The whole variance
programme (M2–M5) adds a lethal tail. Against a falling buffer a lethal tail
does not become tension — it becomes **sudden death with no arc**. The hero
has a shrinking capacity to survive the spike at the exact moment the spike
appears. Building variance first means building the failure mode and then
discovering it.

That is why M6 runs before M3–M5 rather than after them.

### The decision

**Taken: the hero gets growing maximum capacity, accepting the divergence
from Rogule.** Alongside it, `challenge/power` is deliberately left where it
is — see the ratio block near the top for why copying DCSS's 0.95 into a
ten-floor race collapses finishes.

**Capacity, not refill — this is the whole point.** Potions and shields
refill the bar; neither raises its ceiling. `PLAYER_HP` is fixed at 10, so
the ceiling never moves and the buffer keeps falling however generous loot
gets. Only a growing maximum inverts the sign. Every option that does not
touch the ceiling was considered and rejected on exactly this ground.

**Shape: mirror the xp progression that already exists.** Rogule grants
1 xp per 2 kills, and xp *is* the damage stat — so "killing makes you
gradually stronger" is already the game's progression idiom. Add the
defensive half of it: a new constant granting max hp per N kills. One
number, the same shape, the same pacing. Not a new system bolted on.

**It must grant current hp as well as maximum, and that is not an
afterthought.** There is no regeneration, so a hero that gains ceiling
without gaining hp arrives at each floor just as hurt as before, and the
*measured* buffer barely moves — the number is taken from the hero on
arrival, not from its theoretical maximum.

That makes this partly a healing mechanic, which the project deliberately
removed (spec §13.1). The difference is the one that motivated removing it:
the original healed with **time**, so a bot could camp in a cold corner and
top up forever, and capping it was "machinery guarding a resource we did not
want to exist". Healing earned by **kills** cannot be camped — the supply is
finite, fixed at generation, and spending it costs the fight. Same resource,
no exploit, no cap needed.

**Acceptance.**
- Buffer stops falling. Target is DCSS-like growth, around 1.16 per floor;
  with challenge at 1.343 that puts `challenge/buffer` near 1.16, against
  DCSS's 1.11 and today's 1.560.
- Mean challenge per floor unchanged inside noise. This item adds capacity;
  it does not re-tune difficulty.
- Clear rate does not blow up — see the interaction below.

**How to measure.** Buffer and the ratios on the **probes**, over floors 1–6
where n is usable. Clear rate on the **real bot**, as a bound rather than a
target. Paired seeds, confirmed on seeds not used for tuning.

**Interaction to bound, not to ignore.** Power is `effectiveHp × expected
damage`, so raising hp raises power too, and `challenge/power` will fall
toward DCSS's 0.95 as a side effect. That direction is fine in itself — but
it is exactly the movement that was just decided against, because it lifts
the finishes. Report `challenge/power` and the real bot’s finishes
alongside the buffer numbers. If finishes leaves its band, the fix is
a smaller hp grant, not a difficulty change: difficulty is calibrated and
this item is not licensed to move it.

**Fidelity note.** `PLAYER_HP` is FAITHFUL and this diverges from Rogule
knowingly. Record it in `docs/rogule-spec.md` §13 with the other deliberate
divergences, with the reason: without it the buffer falls, and a falling
buffer turns the variance programme into sudden death.

**Why it needs a decision rather than a spec.** The levers are `PLAYER_HP`
(FAITHFUL, 10), regeneration (deliberately removed, spec §13.1), and item
values (partly FAITHFUL). Moving any of them costs fidelity to Rogule, and
`CLAUDE.md` is explicit that values marked FAITHFUL should not change
without a reason. That is the owner's call, not a measurement.

### Result

**Shipped:** `HP_FROM_KILLS = true`, `HP_GRANT_PER_KILLS = 2`,
`HP_GRANT_AMOUNT = 1` (`docs/balance.md` "Defensive progression (M6)").
Mechanism in `src/sim/combat.js` `playerAttacks`, same modulo-on-kill-count
shape as the xp grant right above it, both `hpMax` and current `hp` rise
together. Threaded through exactly like `xpFromKills` already was:
`src/sim/game.js`, `src/sim/dungeon.js`, and — this is the bug the tests
caught — `src/sim/step.js`'s `cloneState`, which dropped `hpFromKills` on
every turn after the first and silently fell back to the default. Four new
tests in `test/tests.js`; 64/64 pass. `docs/rogule-spec.md` §13.4 records
the divergence.

**Instrument note, disclosed as required.** `src/analysis/observed-ruler.js`
(the metrics agent's frozen I1 probe) had no options plumbing at all — I
added `gameOptions` to `isolatedShape` and `dungeonOptions` to `builtShape`,
both empty-by-default passthroughs merged last, so every number in
`docs/observed-ruler.md` reproduces unchanged when omitted (confirmed: the
`hpFromKills:false` reading below reproduces the committed buffer figure,
0.846 ±0.026 against the committed 0.855 ±0.023, within noise). This is a
plumbing extension, not a redefinition — what buffer/power/challenge *mean*
did not change. Flagging it here per the "never changes what a metric means
without saying so explicitly" rule, since I is not my file.

**Direct answer: the acceptance criteria are not jointly satisfiable by this
lever, and I did not pick a side silently.** Swept the grant rate
(hp per kill, via `HP_GRANT_PER_KILLS` at fixed `AMOUNT=1`) from 0 to the
spec-mandated cadence:

```
rate (hp/kill)   buffer ×/floor, fl 1-6      real-bot finishes (paired, n=150 unless noted)
0     (off)      0.846 ±0.026                 46/150 = 30.7% ±3.8
0.125 (per=8)    0.857 ±0.022   z=0.32 n.s.    67/150 = 44.7% ±4.1   z=2.5 vs off
0.25  (per=4)    0.895 ±0.022   z=1.44 n.s.    n=80, different sample, 48.0%
0.5   (per=2)    0.910 ±0.015   z=2.13 REAL    85/150 = 56.7% ±4.0   z=4.7 vs off   <- SHIPPED
```

(z's for buffer are against the off baseline, pooled SE; CLAUDE.md's own
2σ bar is what "n.s." / "REAL" apply.)

**Buffer:** only the shipped rate clears 2σ, and it still *falls* — 0.910,
not the ~1.16 target, not even flat. **Clear rate:** every tested rate
moves it, including one (0.125) that moves NOTHING detectable in buffer.
That last point is the headline finding — it means the real bot's clear
rate is a more sensitive detector of marginal hp than the buffer probe is,
so "shrink the grant until finishes stop moving" and "shrink the grant
until buffer still shows an effect" pull in the same direction but never
meet: by the time a rate is small enough to leave finishes alone, it has
already stopped doing anything measurable to buffer either.

`challenge/power` did **not** turn out to be the binding constraint the
brief's interaction note expected: it moved from ≈1.354 to ≈1.258 at the
shipped rate (challenge 1.343 fixed, power fl1-6 off 0.992→on 1.068) —
nowhere near DCSS's 0.95. The real bot's finishes moved far more than
that ratio's shift would predict; the dumb probe under-reacts relative to
the smart bot.

**Shipped at the only point with a real buffer effect, not because it meets
the item's own bar — it does not.** Clear rate nearly doubles (30.7% →
56.7%), which by "does not blow up" is a breach on its own terms. Reported
plainly rather than picking a smaller rate to make the finishes number
look better while quietly delivering a buffer change indistinguishable from
zero, or picking a larger one to hit the buffer target while hiding how far
finishes would move.

**What surprised me.** The asymmetry above — that a grant too small to
register on the buffer probe still moves the real bot’s finishes by 14
points, significantly. I expected the two measurements to at least be
comparably sensitive since they are both reading the same mechanism; they
are not, by a wide margin.

**What I could not settle.**
- Whether the asymmetry is because Sonda B (dumb, danger-blind) simply
  dies from bad decisions regardless of hp margin while the real bot
  operates near a survival threshold where small margins compound over
  ten floors — plausible, not verified. Would need a middle instrument
  between the two to isolate.
- Whether a **second lever** (e.g. `PLAYER_HP` itself, or item values —
  both explicitly out of this item's licence per "Why it needs a decision
  rather than a spec") could reach the buffer target without the finishes
  cost this one carries. Not tested — those levers cost fidelity and are
  the owner's call, not mine to spend against a measurement.
- The "n.s." rate=0.25 point used n=80 on a different seed range than the
  n=150 points (930000-family vs 940000-family) — not a like-for-like
  comparison with the other three rows. Directionally consistent with the
  bracket, not re-run at n=150 for time.

**Out of scope, for the project agent to evaluate.** The buffer target and
the finishes band are in genuine tension at every tested point, not just
at the extremes — this is a NEEDS-DECISION-shaped problem sitting inside an
item marked DECIDED. Three ways out, none of them mine to pick: accept a
higher finishes band, accept buffer only partially fixed (what is
shipped), or spend a FAITHFUL lever (`PLAYER_HP`, item values) that this
item was explicitly not licensed to touch.

### Review 1 — conformance. One blocker, otherwise sound

Conformance only; the verdict waits on the ruler reading.

**The mechanism is right, including the part that decides whether measuring
it means anything.** `playerAttacks` raises `hpMax` and `hp` together, so the
grant reaches the hero on arrival rather than sitting in a ceiling nothing
refills. Built as the mirror of the xp grant directly above it, which is the
shape the spec asked for.

**The `cloneState` bug is the most valuable catch in this item.** `hpFromKills`
was being dropped on every turn after the first, silently falling back to the
default. That is precisely the failure the first review pass exists for: the
measurement would have run clean, produced a coherent-looking number, and
described a game where the flag switched itself off after one turn. Caught by
tests rather than by luck.

**BLOCKER: it shipped switched ON, and it should not have.** `HP_FROM_KILLS =
true` in `balance.js`, against a protocol that says every map item ships
behind an off-by-default flag and that adoption is a separate act. That
alone would be procedural. What makes it a blocker is the item's own
numbers: the shipped rate leaves the buffer at 0.910 — still falling, short
of the ≥1.00 it had to reach — and puts the real bot’s finishes at 56.7%,
**outside the 15–40% bound**. A configuration that misses its goal and
breaks a bound is live in the default game.

Set `HP_FROM_KILLS = false` and leave the rest in place. Nothing else about
the implementation needs to change, and the measurement can still run both
arms through the toggle.

**Boundary: `src/analysis/observed-ruler.js` belongs to the metrics agent.**
The change itself is careful — an empty-by-default passthrough, merged
before `carry` and `noPickup` so a rule variant cannot override the probe
hero or the pickup toggle, and verified to reproduce the committed numbers
when omitted. It was declared rather than slipped in.

But the rule is that work outside your role gets **reported, not done**, and
this is the exact coupling the split exists to prevent: the agent whose
change is being measured reached into the instrument that measures it.

The honest part is that two rules collided — the repo requires measuring a
change with existing instruments, and the instrument could not accept the
option. That is a defect in my rules, not in the judgement. Resolved going
forward: **the work agent requests a passthrough and waits; the metrics
agent adds it.** The passthrough that exists is kept, since re-doing it by
another hand would buy nothing.

**The escalation is correct and well argued.** Reporting that the two
acceptance criteria are unsatisfiable together by this lever — rather than
quietly picking the rate that made one of them look good — is the right
call, and the sweep that establishes it is the evidence for the decision I
now owe. Same for correcting its own transcription error mid-item and
recomputing the z-scores.

**Not settled here:** whether to accept a higher finishes band, accept a
partially-fixed buffer, or spend a FAITHFUL lever. That is mine, and it
needs the ruler reading first.

### Ruler reading (metrics agent) — flag off against on

Ran against commit `b13df5f` (work agent's M6 shipment — the only commit
that exists for this mechanism; nothing has changed it since). Independent
of the work agent's own sweep above: same instrument
(`src/analysis/observed-ruler.js`'s `isolatedShape`/`builtShape`), a
different session, using the `gameOptions`/`dungeonOptions` passthrough the
work agent added and review 1 already cleared. 120 isolated floor-pairs per
level, 800 descents per condition, seed base 800000, max 4000 turns.

**Both arms passed explicitly, confirmed before reporting anything.**
`hpFromKills: false` for off, `hpFromKills: true` for on — the shipped
rate (`HP_GRANT_PER_KILLS = 2`, `HP_GRANT_AMOUNT = 1`), not a swept value.
Verified the toggle actually reached the engine rather than trusting the
default: challenge, `reward/challenge` and CV of challenge come out
**identical to the digit** between off and on (same `isolatedShape` series
either way, as the item's own brief predicted — hp does not change how long
a fight against the 400-hp tank probe lasts), while buffer visibly moves
(0.842 off → 0.980 on) — a toggle with no effect at all would have left
buffer flat too, so this is a real state change, not a no-op flag.

```
                        off (hpFromKills:false)    on (shipped, +1hp/2 kills)
challenge/power         1.386 ±0.063 / floor        1.171 ±0.038 / floor
challenge/buffer        1.654 ±0.058 / floor        1.391 ±0.040 / floor
reward/challenge        0.928 ±0.078 / floor        0.928 ±0.078 / floor   (identical — expected)
CV challenge             0.941 ±0.014 / floor        0.941 ±0.014 / floor   (identical — expected)

buffer (underlying)      0.842 ±0.031 / floor        0.980 ±0.023 / floor
power (underlying)       1.004 ±0.046 / floor        1.163 ±0.031 / floor
reliable floors (n≥50)   1–5                         1–7
descents fully cleared   0/800                       19/800
```

Ratios are fit directly on the per-floor ratio series (challenge/power and
challenge/buffer computed per floor, then log-linear fit), not derived by
dividing two separately-fit rates, and restricted to floors where power and
buffer clear `n ≥ 50` (the I1-review convention) — 1–5 off, 1–7 on; the flag
itself is why more descents survive far enough to be reliable on.

**Confirms the work agent's own reading, direction and magnitude.** Buffer
rises with the flag on (0.842 → 0.980) but **still falls** — below 1.00,
short of the ≥1.00 acceptance bar and further from the 1.16 ambition.
`challenge/power` and `challenge/buffer` both improve (fall) on, consistent
with power rising alongside buffer. This independently reproduces "shipped,
buffer target not met."

**Numeric gap against the shipping report, not reconciled.** The work
agent's own sweep read buffer-on as 0.910 ±0.015 over floors 1–6; this
reading gets 0.980 ±0.023 over floors 1–7 at the same nominal rate. Off
matches closely (mine 0.842 ±0.031 vs theirs 0.846 ±0.026, well inside
noise) — the gap shows up only on. Most likely explanation: the reliable
window differs (1–7 here against 1–6 there) because a different session's
seed draw put floor 7 just over the `n ≥ 50` line this time, and floor 7 is
new territory the off-arm never reaches at all (0/800 cleared) — but this is
a guess, not confirmed, and it is exactly the kind of small window-dependent
drift the I1 review already flagged once. Re-running both at a matched
floor window (1–6 only) would settle whether it is sampling noise or a real
discrepancy; not done here for time.

**What I could not resolve.** Whether the buffer-on gap (0.980 vs 0.910) is
noise from the differing floor window or something else worth chasing before
review 2 reads it. Flagging rather than picking one number to quote.

**Superseded by I5.** The window mismatch above (off fit 1–5, on fit 1–7)
is exactly what I5's "asymmetric window" answers. Paired over the common
window (1–6, 1500 descents/arm): buffer **0.863 → 0.958** (gap +0.095), not
the 0.842 → 0.980 (gap +0.138) read here. Conclusion for review 2 is
unchanged — buffer still falls on — but quote I5's paired number, not this
one; this section is kept for the record of how the mismatch was found.

### Blocker fixed (work agent)

`HP_FROM_KILLS` set to `false` in `src/sim/balance.js` — off by default, as
review 1 required. Nothing else in the implementation changed: same
constants (`HP_GRANT_PER_KILLS = 2`, `HP_GRANT_AMOUNT = 1`), same mechanism,
same toggle, so both arms stay measurable exactly as before. `docs/balance.md`
"Defensive progression (M6)" updated to match — status, table, and the
sentence that used to say "shipped" now says the constants are set but the
flag is off, pending the owner's read of the tension in the Result above.

Two of the three tests written against the old (on-by-default) behaviour
asserted growth with no explicit flag — those would have silently started
failing, or worse, silently started asserting the wrong default. Rewritten
to mirror the existing xp-growth pair exactly: one test enables the flag
explicitly and checks the grant fires, one leaves it at its default and
checks nothing grows. 64/64 pass.

`src/analysis/observed-ruler.js` not touched — the passthrough from before
stands, per review 1's ruling. No new option was needed for this fix.

Did not start M7. Status left at REPORTED — the verdict on whether any rate
can be adopted is the owner's, not mine to close out.

### Review 2 — verdict and decision. ADOPTED, provisionally

Against the targets, using I5's paired numbers over the common window
(floors 1–6, 1500 descents per arm):

    challenge, CV      unmoved to the digit    constraint HELD
    challenge/power    1.386 → 1.171           bound ≥1.15, passes narrowly
    buffer             0.863 → 0.958           goal ≥1.00, MISSED by 0.042
    finishes           30.7% → 56.7%           bound 15–40%, BLOWN by 17 pts

**Decision: adopt at the shipped rate — 1 hp per 2 kills, flag ON.** Four
things behind that.

**1. No rate satisfies both criteria, so "pick a safer rate" is not
available.** The sweep is decisive: at 0.125 hp/kill the buffer does not
move at all (z = 0.32) and finishes is *already* at 44.7%, outside the band.
Every tested rate breaks the bound. The choice is not where to sit on a
trade-off curve; it is whether to have defensive progression at all, and
that was decided.

**2. The small rates are strictly worse, and this inverts the usual
instinct.** Finishes moves even where buffer does not. A cautious grant
therefore pays the full price in finishes and buys nothing on the goal.
**If you are going to pay, pay for something** — ship the rate that at least
moves the number it exists to move, or ship none at all.

**3. The band is knowingly violated, and deliberately not widened.** Moving
a bound to fit the result it just failed is the exact failure this file
guards against, and the band would be moved on no evidence at all — it was
invented before any measurement existed. M7 is next and changes where
difficulty comes from, which moves finishes, plausibly downward. **Judge the
bound after M7, on evidence.** If finishes is still above 40% then, the band
gets revisited as a decision rather than as a convenience.

**4. The buffer target is now suspect, and that is my error to own.** I set
≥1.00 from a probe measurement without knowing the probe under-reads this
lever. The same grant produced **+0.095 of buffer on the probe and +26
points of finishes on the real bot**. The dumb probe cannot exploit extra hp
the way a competent bot can, so a grant large enough to push probe-buffer to
1.00 would put finishes somewhere absurd.

That leaves an incoherence worth stating plainly: the design reads "still
too hard" (buffer falling) while the product reads "too easy" (finishes 57%)
**at the same time**. Both cannot be true. One of the two instruments is
mis-describing the game, and until that is settled, buffer ≥1.00 is not a
target anyone should chase.

**This is I5's open question and it is now the highest-value thing on the
metrics lane** — higher than it was when I wrote it, because a decision has
just been taken on a number it may invalidate.

**Adoption is provisional in a specific sense**: the flag goes on so M7 is
measured against a baseline that includes it, which is what the serial
protocol requires. It does not mean the rate is settled. If I5 finds the
buffer target unreachable on this instrument, the target changes, not the
game — and this rate gets re-read against whatever replaces it.

---

## Archived

### The count→strength route — UNARCHIVED, see M7

Reopened. The reasoning below is still correct and the numbers still hold;
what was wrong was the conclusion drawn from them.

Every playable point had the CV still falling, so the route was written off.
But converted to a rate per floor, count 1.10 reaches 0.970 against today's
0.944, and count 1.00 reaches 1.012 — the sign does flip. It flips only at
the degenerate corner, where a base of 2 and no growth means two creatures
on every floor.

So the route failed for **emptying the floor**, not for failing to move the
CV. Grouping fills exactly that gap: twelve creatures in four clusters are
four draws with twelve bodies. That combination was never swept, and it is
what M7 is.

Kept below as originally written.

### The count→strength route — measured, does not pay

Shifting the difficulty budget from creature count to individual strength,
holding the product constant. Measured across five points.

**Why it was dropped.** Every playable point still has the CV falling
(0.841 down to 0.49–0.64). Only the degenerate extreme reverses it, and that
extreme means two creatures on every floor — a dungeon that never grows.

**Worth keeping from it.** The real cost exponent in strength is 2.356, not
2, because strength indexes an 11-row table whose mass runs 0 to 108. And
the sweep is what exposed the ruler being wrong: modelled cost held constant
(×10.5 against ×9.8) while win rate moved 12–13 points across two
independent seed families.

---

# UI work

Not part of the ranked queue, and deliberately so.

Every item in that queue serves objective 1 or 2 and is judged by a number:
an acceptance figure, a ruler reading, a two-pass review. UI serves the broad
goal directly and is judged by **looking at it**. Running it through the same
machinery would mean inventing acceptance numbers for things whose whole
point is that you can see whether they work.

The claim protocol buys nothing here either. It exists to stop two sessions
starting the same item, and the ui agent writes to `src/ui/`, `index.html`
and `style.css` — which nobody else touches.

So UI items live here: what and why, then the result, with no rank, no
targets and no reading. Kept in this file rather than a separate one so
there is still only one place to look.

## U1 · the spectator watches a different game than the one being designed

`product` · `ui agent` · **REPORTED**

`index.html` does not play a descent. It plays **one synthetic floor**,
picked by the difficulty dial — `difficultyToParams(dial)` in
`src/ui/spectator.js` builds a standalone floor at some depth, and the run
ends when that floor ends.

**Everything in this backlog is about a ten-floor descent.** Buffer falling
across the ladder, CV collapsing with depth, finishes, the whole curve. None
of it is visible on the only screen anyone actually watches. The owner
cannot see the product, and neither can anyone judging whether a change made
the game better to watch — which is the broad goal all of this serves.

The banner text is evidence of how long this has been true: "leaves only
once all five are dead", "winning a little under 3 runs in 5". That is
single-floor language describing a bot and a rule set that have both moved
on.

**What it should do.**

- Run the real descent, floors 1 to 10, using `playDungeon` in
  `src/sim/dungeon.js` — the same entry point the batch runner and the ruler
  already use, so what is watched is what is measured.
- Drop the difficulty dial from the main view. It selects a synthetic floor
  and has no meaning in a descent. Keep `?difficulty=` working if it is
  cheap, as a lab affordance; do not keep the slider.
- Show, per run, **which floor the hero reached**, and keep the last several
  visible. That log is the readable form of `finishes` — the bound named in
  the targets table — and seeing the distribution of depths is worth more
  than seeing one number.
- Show current floor during the run.
- Rewrite the banner to describe what is actually being watched.

**Acceptance.** A run visibly descends, the reached floor is recorded per
run and the recent history is on screen, and nothing in `src/sim/` or
`src/bot/` changed to make it work — if the descent cannot be driven from
the existing entry point, report that rather than reaching into the engine.

**Why it is worth doing now rather than later.** It costs little, it does not
touch the map or bot lanes, and it is the only way the owner can form an
opinion about whether the curve work is producing a better spectacle. Sub-
goal 3 says a run should read like a horse race; nobody can check that on a
screen showing one floor.

### Result

`index.html` now runs `playDungeon` (`src/sim/dungeon.js`) by default —
floors 1 to 10 in one continuous session, replaying each floor's recorded
run in turn with `replayGame`. Nothing in `src/sim/` or `src/bot/` changed;
`playDungeon` already returned everything needed (a `replay` per floor, plus
`cleared`/`depth`/`killedBy` for the whole descent), so this was a pure
`src/ui/` change. Changed: `src/ui/spectator.js` (new `runDescentForever`
alongside the old `runForever`), `src/ui/render.js` (added `renderHistory`;
the tally line is now caller-supplied text instead of hardcoded to the
single-floor W/L/timeout vocabulary), `index.html` (dial markup removed, a
`#floor` chip and a `#history` strip added, banner rewritten), `style.css`
(dial rules removed, `.history`/`.history-chip` added).

**Difficulty dial.** Removed from the page entirely — no slider markup. `?
difficulty=` still works exactly as before: it runs the untouched legacy
`runForever` loop (one synthetic floor via `difficultyToParams`), just
without the now-deleted dial UI reflecting its value. Cheap, as asked —
same code path, just no longer wired to a control.

**Per-run history and current floor.** A `#floor` chip shows `floor N / 10`
during play, updated once per floor. A `#history` strip keeps the last 12
runs, newest first, each a chip of `<depth reached><icon>` (⛩️ cleared, 💀
died, 🕳️ timed out) — the readable form of `finishes` the item asked for.
Tally line reads `cleared/played` for the descent; the old `W · L · timeout`
line is preserved verbatim for legacy mode.

**Banner.** Rewritten to describe the mechanism (hp-priced routing, gear
gathering, monster avoidance, floor-to-floor carry) without quoting a win
rate or a kill-everything rule that will go stale the next time the bot or
the rules change — that staleness is exactly what this item was raised
against, so I deliberately left numbers out rather than putting in a
number that will rot the same way.

**Verified in-browser** (temporary server on a spare port, not the shared
8141 — another session had that one): a full descent carries hp/xp/kills/
inventory across floors, the floor chip advances 1→10, a death mid-descent
and a full clear both produced correct summary cards and history chips
(`5💀`, `10⛩️` observed in one session), and `?difficulty=` still drives the
old single-floor loop with no console errors. `run-tests.html` still reports
all 64 engine tests passing (untouched).

**What I could not verify.** Full 10-floor descents take a while to watch
even at 8× — I confirmed floor advancement and one clear plus one death by
letting several runs play out, not by exhaustively checking every floor
transition frame-by-frame.

**Out of scope, reported rather than done.** None — the engine already
exposed everything the screen needed; no reaching into `src/sim/` or
`src/bot/` was required.

### Review — DONE

Accepted, and checked the way a UI item should be: by opening it. The screen
now reads `floor 1 / 10`, carries a "recent runs — how far the descent got"
strip, tallies `cleared/played`, and floor one holds two creatures, which is
`monsters(1) = 2`. The dial is gone.

**The boundary held with nothing to spare.** `playDungeon` already returned a
replay per floor plus `cleared`/`depth`/`killedBy`, so this was a pure
`src/ui/` change with nothing reported out of scope. That is the outcome the
role split is for.

**The banner decision was better than the brief.** The item asked for it to
be rewritten; the agent noticed that putting a fresh win rate in would
reproduce exactly the failure the item was raised against, and left numbers
out on purpose. The old banner went stale because it quoted "3 runs in 5" —
a number that rots every time the bot or the rules move. Describing the
mechanism instead is the fix; quoting a fresher number would have been the
same bug with a later expiry date.

**Kept honestly:** the legacy single-floor loop is still reachable through
`?difficulty=`, unwired from any control, which is what "cheap, if cheap"
asked for. And the verification is stated for what it was — several runs
watched through, including one clear and one death, rather than every floor
transition checked.
