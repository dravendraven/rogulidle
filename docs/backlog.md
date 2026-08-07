# Backlog

Owned by the **project & design agent**. Work and metrics agents read it to
know what they are on and what "done" means; they do not add or reorder
items. If an item looks wrong, report that rather than editing it.

## The queue

Ordered by what unblocks what and what can be started today. `#` is
priority and changes; the id is stable and is what your prompt names.

| # | id | what and why | feature | agent | status |
|---|---|---|---|---|---|
| 1 | I1 | Model ruler misprices crowds — replace it with two frozen probes that play | map | metrics | REPORTED |
| 2 | B1 | Ping-pong is the ugliest visible defect — find which layer creates it | bot | work | REPORTED |
| 3 | I2 | Clustering may change lethality, not cost — retest with a normal hero | map | metrics | READY |
| 4 | B4 | Bot values darkness at zero, so it never explores for reward | bot | work | READY |
| 5 | M3 | Strongest blow is frozen at every depth — add a rare out-of-depth tail | map | work | READY |
| 6 | M4 | The only structural variance is constant — scale side-room spread with depth | map | work | READY |
| 7 | M5 | Best item is axe +2, so no reward is ever an event | map | work | READY |
| 8 | I4 | Bot may open more bad side rooms than good — is that real? | bot | metrics | READY |
| 9 | B2 | Characterise the veto loop: what alternates, and why the plan flips | bot | work | BLOCKED |
| 10 | B3 | Fix the ping-pong with the cheapest change the evidence supports | bot | work | BLOCKED |
| 11 | I3 | No ruler sees clustering — build one measuring lethality, not cost | map | metrics | BLOCKED |
| 12 | M2 | Group creatures to cut independent draws and raise damage per turn | map | work | BLOCKED |
| 13 | B5 | Clustering makes crowd tiles common, so the inert crowd penalty starts mattering | bot | work | BLOCKED |
| 14 | B6 | Fix side-room discrimination, once I4 shows the inversion is real | bot | work | BLOCKED |
| 15 | M6 | Power grows sevenfold, error tolerance not at all — no defensive progression | map | — | NEEDS DECISION |

Archived: the count→strength route. Measured, does not pay. See the end.

## How to use this file

Your opening prompt names your task (`Task B1`). Read that item in full
before starting, and report against its acceptance criteria — not against
your own sense of finished.

Status legend:

    READY           spec is complete, can be started
    IN FLIGHT       someone is on it
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

## The problem all of this serves

Measured: difficulty grows 1.32 per floor and the hero's power keeps up, but
the **coefficient of variation falls** with depth (0.95 per floor) and the
**buffer does not grow at all** (1.012). Deep floors converge on their own
average; the climax of a run is its most predictable moment.

In a game the player only watches, that is the central problem. A player
with decisions gets tension from risk. A spectator only has surprise.

The target is not to match DCSS's numbers — those are derived from attribute
scales, not observed play, so only the **signs** of the four ratios are
comparable. Two of the four are wrong:

    challenge/power    1.065   fine
    reward/challenge   0.781   deliberate, this is a ten-floor race
    CV                 0.950   WRONG, falls where it should rise   -> M2..M5
    buffer             1.012   WRONG, flat where DCSS grows 1.16   -> M6

**Tune the curves against the probes, never against the real bot.** The
probe measures the design against a fixed reference player; the real bot
measures design and bot quality mixed together, so every bot fix would move
the target. Win rate is the real bot's question, and it is a different one:
is this playable and watchable.

---

## 1 — I1 · replace the modelled ruler with observed probes

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

## 2 — B1 · which layer is the ping-pong born in

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

## 3 — I2 · spread against grouped, with a normal hero

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

## 4 — B4 · give exploration a value

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

## 5 — M3 · an out-of-depth tail

`map` · `work agent` · **READY**

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

## 6 — M4 · scale the side-room bonus with depth

`map` · `work agent` · **READY**

`SIDE_ROOM_DEPTH_BONUS = 0.35` is fixed, so the only structural variance in
the game is constant across the descent.

**Why it matters.** It reuses machinery that already exists and was already
measured, and side rooms are the one place where risk and reward already
roll independently — `map-design.md` establishes why that independence is
what makes a detour a gamble rather than a free lunch.

**Acceptance.** CV per floor rises; the spine/side mass split stays at its
≥70% target; the average side room at floor 5 is not made harder, only the
spread widened. Measured on the probes.

## 7 — M5 · a reward tail

`map` · `work agent` · **READY**

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

## 8 — I4 · is the side-room inversion real

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

## 9 — B2 · characterise the veto loop

`bot` · `work agent` · **BLOCKED on B1 review**

B1 answered "tactical veto", which is the branch whose spec was thin. Being
rewritten against that answer.

Spec deliberately not written yet.

## 10 — B3 · fix the ping-pong

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

## 11 — I3 · a metric that can see clustering

`map` · `metrics agent` · **BLOCKED on I2**

No current ruler sees it, and cost cannot be it for the reason in I2.
Candidates are maximum damage taken in a single turn, or fraction of turns
with two or more adjacent. Shape depends on what I2 finds.

## 12 — M2 · clustering

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

## 13 — B5 · crowd blindness in the bot

`bot` · `work agent` · **BLOCKED on M2**

`threat.js` records that tiles reachable by two awake monsters at once are
"rare enough that this term is not what steers the bot", and scaling
`CROWD_PENALTY` by threat changed literally nothing. That is true of the map
as it exists today.

Clustering makes those tiles common, at which point the term goes from inert
to dominant. Do not touch this before M2 exists — today there is nothing to
tune against.

## 14 — B6 · fix side-room discrimination

`bot` · `work agent` · **BLOCKED on I4**

The bot appears to open more unfavourable side rooms than favourable ones.
Whether that effect is real is I4, and it belongs to the metrics agent — a
bot judged by whoever writes it is a weak counterweight.

Four fixes have already been implemented against this and none moved the
ratio, which is itself a reason to establish the effect exists before
attempting a fifth.

## 15 — M6 · defensive progression

`map` · unassigned · **NEEDS DECISION**

Measured: power grows ×7 across the descent, buffer ×1.1. The hero ends the
run absorbing the same fourteen blows it absorbed at the start, against
floors costing twelve times more. Progression is **entirely offensive**, and
the value table says why:

    dagger 18.90   axe 31.50   shield 3.00   potion 3.00

**Why it matters, and why it is not optional.** The whole variance programme
(M2–M5) adds a lethal tail. With a flat buffer, a lethal tail does not
become tension — it becomes sudden death with no arc. The hero has no
growing capacity to survive the spike it is about to meet.

This is the second of the two wrong ratios and nothing addresses it.

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
