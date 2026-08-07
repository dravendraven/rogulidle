# Backlog

Owned by the **project & design agent**. Work and metrics agents read it to
know what they are on and what "done" means; they do not add or reorder
items. If an item looks wrong, report that rather than editing it.

## How to use this file

Your opening prompt names your task (`Task B1`). Read that item in full
before starting, and report against its acceptance criteria — not against
your own sense of finished.

Status legend:

    READY      spec is complete, can be started
    IN FLIGHT  someone is on it
    BLOCKED    waiting on a named task; spec is deliberately thin
    REPORTED   the work is done and the result is written down, awaiting
               review by the project agent
    DONE       reviewed and closed
    ARCHIVED   decided against, with the reason kept

**Closing out a task.** When you finish, set the status to **REPORTED** and
append a `### Result` block to your item: what you measured, the numbers with
their standard errors, what you changed, and anything that surprised you or
that you could not settle. Write it for someone who was not there.

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

## The problem all of this serves

Measured: difficulty grows 1.32 per floor and the hero's power keeps up, but
the **coefficient of variation falls** with depth (0.95 per floor) and the
**buffer does not grow at all** (1.012). Deep floors converge on their own
average; the climax of a run is its most predictable moment.

In a game the player only watches, that is the central problem. A player
with decisions gets tension from risk. A spectator only has surprise.

So: the work is to make deep floors more variable and more lethal in the
tail, without moving the average difficulty, which is calibrated.

---

# Metrics backlog — `src/analysis/`, probe files

Instruments and verdicts. Never touches `src/bot/` and never changes a
balance value. Several bot and map items are BLOCKED on this backlog, so it
is on the critical path more than its size suggests.

## I1 — the two probes and the baseline — IN FLIGHT

Replace the modelled ruler with an observed one. Two probes differing in one
thing only: A clears the floor and collects nothing, B clears it and picks
up what is on the way. Neither hunts loot, so the difference between them is
attributable to loot alone.

The probe must be its **own frozen file**, not the current bot with options
switched off. If it is the bot configured, fixing the bot changes the ruler
— the exact coupling that motivated the work. It should be deliberately dumb
and permanent: a calibration weight, not an athlete.

Produces: challenge, reward, buffer, power per floor, with the coefficient
of variation of challenge and reward, growth rate per floor, standard errors,
and the four ratios.

**Two corrections already issued mid-flight, recorded here so they are not
lost.**

- Reward is `cost(A) − cost(B)`, not the reverse. B collects gear, gets
  stronger and clears **cheaper**, so the naive order comes out negative.
- **The probe is not an instrument for clustering**, despite the original
  brief implying it. See I2 for why.

## I2 — spread against grouped, with a NORMAL hero — READY

A previous test concluded the same roster spread out or grouped costs the
same, and on that basis the "simultaneity" hypothesis was rejected. That
result is suspect and blocks the main map candidate, so it gets redone.

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

## I3 — a metric that can see clustering — BLOCKED on I2

No current ruler sees it, and cost cannot be it for the reason in I2.
Candidates are maximum damage taken in a single turn, or fraction of turns
with two or more adjacent. Shape depends on what I2 finds.

## I4 — is the side-room inversion real? — READY

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

**Note for whoever runs it.** The bot will change under B3 and B4 while this
is open. Measure against a stated bot version and say which — a result
against a moving bot is not reusable.

---

# Bot backlog — `src/bot/`

The bot is the product in a watch-only game, and every difficulty number is
measured against it. It gets fixed before the map design work, otherwise map
changes are evaluated against a bot whose failures are mistaken for the
design's.

## B1 — diagnose which layer the ping-pong is born in — IN FLIGHT

The bot walks back and forth between two tiles, sometimes for a long time,
with a creature two or three tiles away. Observed on screen; `balance.md`
records roughly one run in nine.

**Why it matters.** It is the most visible defect in a game whose whole
product is watching, and it corrupts every difficulty measurement taken
against the bot. It has been attacked once already and the fix failed, so
the value here is knowing *where* it lives before spending another attempt.

**The bifurcation to settle.**

    goal ALTERNATING with the step  -> born in goal selection
    goal STABLE, only step alternates -> born in the tactical veto

`REVERSAL_PENALTY` lives in the veto, was swept 0 / 1.5 / 6, moved the
reversal rate only 0.238 -> 0.205 and cost win rate. That is weak evidence
for the first branch, not proof.

**Supporting the goal-selection hypothesis.** `GOAL_STICKINESS` applies only
to `monster` targets (bot.js:312); frontier is sticky too; chests and items
are re-chosen from scratch every turn (bot.js:456). A chest competes on
`net = value − approach − guard`, and approach is an hp price including
danger. With `DANGER_FALLOFF = 0.5` the menace doubles or halves per tile
(threat.js:56), so one step can flip `net`'s sign. In that scenario the veto
is never consulted, because the planned step already alternates — which
would explain why penalising reversal did nothing.

**Precedent.** The same pathology was found and fixed elsewhere in this bot:
`standoff` (bot.js:491) carries "recomputing every turn makes the bot
reposition forever", with measured numbers, resolved by committing to the
tile once. The lesson was not generalised to goal selection.

**Acceptance.**
- Which layer, answered by the bifurcation above, from several episodes.
- How often each case appears, if both do.
- **No behaviour change.** This task diagnoses only.

**How to measure.** Log the pursued goal and the action taken each turn; the
`trace` hook at bot.js:531 already exists. Locate ping-pong runs via the
existing reversal rate.

**Failure is a valid result.** If it turns out to be the tactical veto, say
so plainly rather than looking for a way to rescue the hypothesis. Knowing
which of the two it is is worth more than any fix.

## B2 — characterise the loop — BLOCKED on B1

Only exists if B1 says goal selection. Then: what does it alternate
*between* (chest against monster? two chests? chest against frontier?), and
is the mechanism `net` changing sign?

Spec deliberately thin — the shape depends on B1.

## B3 — fix it — BLOCKED on B2

The cheapest fix the evidence supports. `standoff` is the precedent and it
resolved with **commitment, not penalty** — but do not copy it without
confirming the mechanism is the same.

**Known side effect to watch when the spec is written.** If the fix is
hysteresis on loot goals, it pushes against an already-measured problem: the
bot opens more unfavourable side rooms than favourable ones (53% against
46%). More commitment to a target means less chance of abandoning a bad room
after starting to walk to it. That effect sits at 1.3–2.6 standard errors
and may not be real, so do not treat it as fact — but do not let it worsen
unwatched.

**Measurement will include** reversal rate before and after, win rate, depth,
turns per run, and above all the **distribution**: a fall in the mean can
hide the pathological case surviving intact.

## B4 — give exploration a value — READY

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
3. It is the likely cause of the freeze-ups. Under pressure with nothing
   known scoring positive, the retreat has a direction but no destination.
   A positive-valued place to go is what turns fleeing into going somewhere.

**Acceptance.**
- Frontier carries an hp-denominated expected value and competes in the same
  comparison as chests and monsters, rather than being a fallback branch.
- Frontier goals stay sticky. Trading tile ping-pong for frontier ping-pong
  is not progress.
- The bot does not become a wanderer: turns per run must not blow up.
  `bot-strategy.md` §4.4 records a search that circled forever; the same
  failure is available here.

**How to measure.** Win rate, depth, turns per run, chests found per floor,
and the freeze-up rate from B1's instrumentation. Paired seeds, confirmed on
seeds not used for tuning.

**Machinery that already exists.** `expectedChestValue` prices an unseen
chest; `monstersAhead` and `LOOT_CAMPAIGN_HORIZON` already discount future
value. What is missing is an estimate of how many chests a dark region holds
— and the bot already knows `CHEST_COUNT` and how many it has seen.

**Interaction with B3.** B4 may resolve the freeze-ups on its own. Measure
B4's effect on the reversal rate before concluding B3 finished the job.

## B5 — crowd blindness in the bot — BLOCKED on M2

`threat.js` records that tiles reachable by two awake monsters at once are
"rare enough that this term is not what steers the bot", and scaling
`CROWD_PENALTY` by threat changed literally nothing. That is true of the
map as it exists today.

Clustering makes those tiles common, at which point the term goes from inert
to dominant. Do not touch this before M2 exists — today there is nothing to
tune against.

## B6 — fix side-room discrimination — BLOCKED on I4

The bot appears to open more unfavourable side rooms than favourable ones.
Whether that effect is real is **I4**, a measurement, and it belongs to the
metrics agent — a bot judged by whoever writes it is a weak counterweight.

Four fixes have already been implemented against this and none moved the
ratio, which is itself a reason to establish the effect exists before
attempting a fifth.

---

# Map backlog — `src/sim/spawn.js`, `spine.js`, `difficulty.js`

Blocked as a group on the bot backlog: map design is evaluated against a
bot, and a bot that ping-pongs and cannot value exploration will fail
clustered floors for reasons that have nothing to do with clustering.

M3, M4 and M5 are the exception — they attack variance by a different route
and need only a reasonable bot, not a perfect one.

The two questions that decide whether clustering is a lever at all — does
grouping raise lethality, and can it be measured — are **I2** and **I3** on
the metrics backlog. They are instruments and verdicts, not design changes.

## M2 — clustering — BLOCKED on I2, I3, and the bot backlog

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

## M3 — an out-of-depth tail — READY

`MONSTER_STRENGTH = 0.35` is fixed, so the strongest possible blow is the
same on floor 1 and floor 10. There is no right tail at all.

**Why it matters.** It is the cheapest way to restore rising variance, and
it does not touch the count dial whose linear tunability `balance.md`
defends with good reason. The median floor is unchanged; only the rare floor
moves.

**Acceptance.** Median difficulty per floor unchanged inside noise; CV per
floor stops falling; the frozen maximum blow starts to grow with depth.

**Constraint.** `PLAYER_HP` is 10, FAITHFUL, with no regeneration, and
damage is `0..xp−1`. Near the top of the table one blow can take almost
everything. The reaction window must shrink, not vanish — report the
distribution of damage per blow, not its mean. The tail is what kills.

## M4 — scale the side-room bonus with depth — READY

`SIDE_ROOM_DEPTH_BONUS = 0.35` is fixed, so the only structural variance in
the game is constant across the descent.

**Why it matters.** It reuses machinery that already exists and was already
measured, and side rooms are the one place where risk and reward already
roll independently — `map-design.md` establishes why that independence is
what makes a detour a gamble rather than a free lunch.

**Acceptance.** CV per floor rises; the spine/side mass split stays at its
≥70% target; the average side room at floor 5 is not made harder, only the
spread widened.

## M5 — a reward tail — READY

The best item is `axe +2`. There is nothing rare enough to be an event, so
reward variance is bounded from above by the table itself.

**Why it matters.** Reward variance is the spectator's half of the lottery.
The measured CV of reward falls with depth just as challenge's does, and no
amount of work on the challenge side fixes that.

**Acceptance.** Mean reward per floor unchanged inside noise; CV of reward
stops falling. Pick weight is `1 / value`, so a high `value` means rare.

**Watch.** `CHEST_LOOT_CHANCE = 0.60` is what the bot assumes when pricing a
chest, measured over 150 maps. Adding to the item table moves what a chest
is worth and that constant will need re-measuring.

---

# Archived

## The count→strength route — ARCHIVED, measured

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
