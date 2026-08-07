# Backlog

Owned by the **project & design agent**. Work and metrics agents read it to
know what they are on and what "done" means; they do not add or reorder
items. If an item looks wrong, report that rather than editing it.

## The queue

Ordered by what unblocks what and what can be started today. `#` is
priority and changes; the id is stable and is what your prompt names.

| # | id | what and why | feature | agent | status |
|---|---|---|---|---|---|
| 1 | M6 | Buffer FALLS while difficulty rises — variance work is unsafe until this is settled | map | — | NEEDS DECISION |
| 2 | I1 | Model ruler misprices crowds — replace it with two frozen probes that play | map | metrics | REPORTED |
| 3 | I2 | Clustering may change lethality, not cost — retest with a normal hero | map | metrics | READY |
| 4 | B4 | Bot values darkness at zero, so it never explores for reward | bot | work | READY |
| 5 | B1 | Ping-pong is the ugliest visible defect — find which layer creates it | bot | work | REPORTED |
| 6 | I4 | Bot may open more bad side rooms than good — is that real? | bot | metrics | READY |
| 7 | M3 | Strongest blow is frozen at every depth — add a rare out-of-depth tail | map | work | MEASURE ONLY |
| 8 | M4 | The only structural variance is constant — scale side-room spread with depth | map | work | MEASURE ONLY |
| 9 | M5 | Best item is axe +2, so no reward is ever an event | map | work | MEASURE ONLY |
| 10 | B2 | Characterise the veto loop: what alternates, and why the plan flips | bot | work | BLOCKED |
| 11 | B3 | Fix the ping-pong with the cheapest change the evidence supports | bot | work | BLOCKED |
| 12 | I3 | No ruler sees clustering — build one measuring lethality, not cost | map | metrics | BLOCKED |
| 13 | M2 | Group creatures to cut independent draws and raise damage per turn | map | work | BLOCKED |
| 14 | B5 | Clustering makes crowd tiles common, so the inert crowd penalty starts mattering | bot | work | BLOCKED |
| 15 | B6 | Fix side-room discrimination, once I4 shows the inversion is real | bot | work | BLOCKED |

Archived: the count→strength route. Measured, does not pay. See the end.

**What changed and why.** The observed ruler (I1) found the buffer *falling*
rather than flat, which turns the variance programme from an improvement
into a way of building sudden death. M6 moves from last to first and is a
decision, not a task. M3–M5 stay startable but drop to MEASURE ONLY: run
them, report what they move, do not switch them on.

I1 is REPORTED with a review attached and two cheap fixes outstanding (refit
over floors 1–6, correct the buffer reading); it needs no new runs. B1 is
REPORTED and answered "tactical veto", which inverted the premise B2 and B3
were sketched against — both are being rewritten.

## How to use this file

Your opening prompt names your task (`Task B1`). Read that item in full
before starting, and report against its acceptance criteria — not against
your own sense of finished.

Status legend:

    READY           spec is complete, can be started
    IN FLIGHT       someone is on it
    MEASURE ONLY    build it and report what it moves, but leave it OFF by
                    default — adoption waits on something else
    BLOCKED         waiting on a named task; spec is deliberately thin
    REPORTED        work done and result written down, awaiting review by
                    the project agent
    DONE            reviewed and closed
    NEEDS DECISION  waiting on the owner, not on other work
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

Note that `feature` and `agent` are independent. I4 is a bot question
answered by the metrics agent; M3 is a map change made by the work agent.

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

**Sub-goal 3 is the integration test.** Sub-goals 1 and 2 are measured in
isolation, on frozen probes and on bot internals — deliberately, so that
neither contaminates the other. Sub-goal 3 is the only one measured with the
real bot playing the real map, and it is the only one that can tell you the
other two added up to something.

Nothing in the queue currently serves sub-goal 3 directly. That is a gap,
and it is deliberate for now: measuring it against a bot with known defects
would measure the defects.

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

    challenge/power    ≥1.307   a FLOOR — survivor selection inflates power
    challenge/buffer    1.560   a mistake gets much more expensive with depth
    CV challenge        0.944   WRONG, falls where it should rise   -> M2..M5
    buffer              falls   WRONG, DCSS grows 1.16              -> M6
    reward/challenge      —     no instrument answers this yet

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

`map` · `metrics agent` · **REPORTED**

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

## I2 · spread against grouped, with a normal hero

`map` · `metrics agent` · **READY**

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

`map` · `work agent` · **MEASURE ONLY — do not switch on; adoption waits on M6**

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

`map` · `work agent` · **MEASURE ONLY — do not switch on; adoption waits on M6**

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

`map` · `work agent` · **MEASURE ONLY — do not switch on; adoption waits on M6**

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

## I3 · a metric that can see clustering

`map` · `metrics agent` · **BLOCKED on I2**

No current ruler sees it, and cost cannot be it for the reason in I2.
Candidates are maximum damage taken in a single turn, or fraction of turns
with two or more adjacent. Shape depends on what I2 finds.

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

`map` · unassigned · **NEEDS DECISION**

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

That is why M3–M5 are MEASURE ONLY. Run them, learn what they move, leave
them off.

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
