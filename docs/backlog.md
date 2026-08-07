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

| # | id | what and why | feature | agent | status |
|---|---|---|---|---|---|
| 1 | M6 | Buffer falls while difficulty rises — give the hero growing capacity | map | work | IN FLIGHT |
| 2 | M3 | Strongest blow is frozen at every depth — add a rare out-of-depth tail | map | work | READY |
| 3 | M4 | The only structural variance is constant — scale side-room spread with depth | map | work | READY |
| 4 | M5 | Best item is axe +2, so no reward is ever an event | map | work | READY |
| 5 | M2 | Group creatures to cut independent draws and raise damage per turn | map | work | READY · last of the four |
| — | I3 | Settle clustering's sign test; spike and CV wait for M2 to exist | map | metrics | REPORTED |
| — | B1 | Ping-pong is the ugliest visible defect — find which layer creates it | bot | work | PARKED · reported |
| — | B2 | Characterise the veto loop: what alternates, and why the plan flips | bot | work | PARKED |
| — | B3 | Fix the ping-pong with the cheapest change the evidence supports | bot | work | PARKED |
| — | B4 | Bot values darkness at zero, so it never explores for reward | bot | work | PARKED |
| — | B5 | Clustering makes crowd tiles common, so the inert crowd penalty starts mattering | bot | work | PARKED |
| — | B6 | Fix side-room discrimination, once I4 shows the inversion is real | bot | work | PARKED |
| — | I4 | Bot may open more bad side rooms than good — is that real? | bot | metrics | PARKED |
| — | I1 | Model ruler misprices crowds — replace it with two frozen probes that play | map | metrics | **DONE** |
| — | I2 | Clustering may change lethality, not cost — retest with a normal hero | map | metrics | **DONE** |

Archived: the count→strength route. Measured, does not pay. See the end.

**The whole bot lane is PARKED by owner decision.** The focus is map design
calibrated by the probes. Nothing about the bot items changed and none were
abandoned — B1's answer stands, and the routing locus it turned up (18.4%
± 0.9 pp, before the veto is ever consulted, so a fix scoped to `tactics.js`
cannot reach it) is still an open scoping question for when the lane
restarts. Do not pick up a PARKED item without the owner saying so.

That leaves one loop, and it is deliberately serial:

    work agent      M6 → M3 → M4 → M5 → M2
    metrics agent   I3 part 1, then re-run the ruler after EACH of the five

**M2 goes last, not first, and the dependency between it and I3 has
inverted.** It used to be that I3 decided whether M2 was worth building.
Under the flag protocol nothing can be pre-screened, so I3's spike and CV
questions now need M2 to exist — M2 gates I3, not the other way round.

With pre-screening gone, the ordering criterion becomes cost to build. M2 is
the most expensive of the five (placement logic in `spawn.js`, plus
reconciling the shadow implementation in `src/analysis/`) and rests on the
weakest evidence — `z = 1.62`, with the mechanism unestablished. M3 is the
cheapest and its mechanism is not in doubt.

There is also a real chance M3–M5 fix the CV on their own. If they do, M2
may not need to exist at all, and building it first would have been paying
the largest bill to find that out.

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

The cost is real: the work agent builds before anyone knows whether it pays.
Three things buy it back. Nothing can drift out of sync, because there is
only one implementation. Every measurement describes the game rather than an
approximation of it. And what was measured is what ships, if it ships.

I2 is the example that motivated this: to measure clustering it had to build
clustering, so grouping logic now exists in `src/analysis/clustering.js`
outside the engine — inside its boundary, and still a shadow that M2 has to
reconcile.

**The re-run is a standing job, not a task.** It needs no prompt. When a map
item lands, the metrics agent re-runs the observed ruler and appends the
reading to that item's `### Result` block — the four ratios with the flag off
and on, with standard errors and the commit each ran against. Then it goes
back to whatever it was doing.

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
  curve is boring at any clear rate. Hitting the number proves nothing on
  its own.
- **The number is trivially reachable.** Any clear rate can be dialled in by
  moving creature count alone, learning nothing. Aiming at sub-goal 3
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
| clear rate, real bot | ~30% | 15–40% | — | **bound** |

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
and clear rate must stay inside 15–40%. Both drift the same way when the
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

## M3 · an out-of-depth tail

`map` · `work agent` · **READY** — runs after M6 lands, and is re-measured on its own

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

`map` · `work agent` · **READY** — runs after M6 lands, and is re-measured on its own

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

`map` · `work agent` · **READY** — runs after M6 lands, and is re-measured on its own

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

`map` · `metrics agent` · **REPORTED** — rescoped after I2, then cut back to Q1 only

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

## M2 · clustering

`map` · `work agent` · **BLOCKED on I2, I3, and the bot queue**

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

`map` · `work agent` · **IN FLIGHT** — decided, see "The decision" below

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
ten-floor race collapses the clear rate.

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
the clear rate. Report `challenge/power` and the real bot's clear rate
alongside the buffer numbers. If the clear rate leaves its band, the fix is
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

---

## Archived

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
