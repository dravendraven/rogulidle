# Backlog

The task list, and nothing else. What each task is, what it has to satisfy,
and what order things go in.

**Design direction does not live here.** Why the game is the way it is:
`docs/project/objectives.md`. Why the map is shaped as it is:
`docs/map-design.md`. What the game does today: `docs/rules.md`. What was
decided and what it cost: `docs/project/decisions.md`. Ideas with no slot:
`docs/project/candidates.md`.

**Closed items are removed** the moment they are reviewed. `git log` is the
archive; the transferable lesson goes to `decisions.md`.

**Grouped by theme.** Each item names its own agent on its first line.

    READY       can be started
    IN FLIGHT   someone is on it
    BLOCKED     waiting on a named item
    NOT NOW     deliberately not scheduled
    REPORTED    done, written up
    DONE        reviewed and closed
    ARCHIVED    decided against, reason kept

## How to work an item

- **Read your item in full** and report against what it asks for, not against
  your own sense of finished. If an item looks wrong, say so instead of
  quietly doing something else.
- **One item, one commit**, and a test asserting the thing the item was for.
- **Say what you measured**, including when the measurement says the change
  did nothing. `node tools/measure.mjs` for numbers, `--selftest` before
  trusting any of them; `run-check.html` in a visible tab for the same numbers
  in a browser. Run them as a regression check, not as a scoreboard.
- **Measure in one tree.** Two arms compared across sessions or across
  uncommitted work is not a comparison — check out a worktree if the tree is
  dirty.
- **Every report ends by naming which behaviour document it made stale** —
  `rules.md`, `bot-strategy.md` or `map-design.md` — or says plainly that none
  moved. "None" still has to be written.
- **A new parameter is the last resort.** A report that adds one says in a
  line why an existing one could not carry it.
- **If more than one session is running**, claim your item by setting it
  IN FLIGHT and committing that alone before anything else.

## Order

1. **The return** — R1 and R5 together, then R2–R4.
2. Everything else by theme below.

Phase A is closed: M38, M39, B16 and M41 landed. The reasoning and what it
cost are in `decisions.md`.

## Themes

| theme | items |
|---|---|
| The return — floors 11 to 20 | R5 · R2 · R3 · R4 |
| 1 | B23 | The floor is phases, and activation is the boundary | bot | READY · owner observation |
| 2 | B24 | A step that does not approach the goal should cost more | bot | after B23 · read its answer first |
| The bot's pricing | B23 · B24 · B15 |
| What the map still has to do | M42 · C2 · C3 · M4 · M21 · X6 · M32 |
| The player | U10 · U7 |
| Instruments | I13 · I12 |
| Debt | X7 · X1 · X2 · X3 · X5 |
| Not scheduled | M37 · M36 |

### The return — floors 11 to 20

Twenty traversals, victory on returning to floor 1. `R1` landed; the map
comes back for free and the return is currently identical to the descent.
`R2`–`R4` are the differences laid on top, and each is measurable alone.

| # | id | what gets done | agent | status |
|---|---|---|---|---|
| 1 | R3 | The return has no chests | work | READY · today the return refills them |
| 2 | R2 | The return repopulates: same map seed, new creature seed | work | READY |
| 3 | R4 | Variance rises through the return | work | after R2 |
| — | R5 | The bot's campaign is twenty traversals, not ten | bot | **BLOCKED on the B22 decision** |

### The bot's pricing

| # | id | what gets done | agent | status |
|---|---|---|---|---|
| 3 | B15 | A drink policy that reads the danger field | bot | READY |

### What the map still has to do

| id | what gets done | agent | status |
|---|---|---|---|
| M42 | Give time a price — stage 1, tighten the existing budget | work | READY · **owner proposal** |
| C2 | The target curve, in numbers rather than adjectives | work | NOT NOW |
| C3 | Solve the dials for a pressure curve instead of sweeping | work | NOT NOW · after C2 |
| M4 | Side-room risk/reward spread scales with depth | work | READY |
| M21 | Deep floors put a creature where the hero lands | work | READY |
| X6 | Collapse the tier clamps, redundancy proven first | work | after X5 |
| M32 | Weapons become a tier ladder instead of a stack | work | BLOCKED on the lab |

### The player

| id | what gets done | agent | status |
|---|---|---|---|
| U10 | The run is watched, and half of what happens is invisible | ui | READY |
| U7 | The player chooses which hero to play | work + ui | READY |

### Instruments

| id | what gets done | agent | status |
|---|---|---|---|
| I13 | descentCheck still measures a descent and calls it a run | metrics | READY · **R1 made it stale** |
| I12 | Did the potion change move anything? | metrics | baseline recorded · comparison owed |

### Debt

| id | what gets done | agent | status |
|---|---|---|---|
| X7 | Chest value is right only because two errors cancel | bot | READY · small |
| X5 | Classify every dial by lifecycle, delete only the dead | work + bot | READY |
| X1 | Delete what nothing references | work | READY |
| X2 | Comments in src/ that lie: 25 stale refs + 3 false claims | work + bot | READY |
| X3 | Mark which dials tune the game and which tune only the bot | work | READY |

### Not scheduled

| id | what gets done | agent | status |
|---|---|---|---|
| M37 | Do runs contain survivable setbacks? | metrics | a question, not a change |
| M36 | A detour has to be able to cost the run | work | deferred until after R3 |

# Not scheduled

### M37 · a setback needs room between "no effect" and "dead"

`metrics agent` · **NOT SCHEDULED — it is a question, not a change** · owner
decision after M38, 2026-08-10

**Downgraded deliberately, and by its own text.** This item says the evidence
is indirect, that it is "equally consistent with the descent simply being too
hard overall", and that separating those two comes **before any dial moves**.
That first job is a reading, not a change — and the reading is available from
`descentCheck` today: do runs contain events that hurt and are survived?

**Its evidence also moved underneath it.** The case rested on `finishes` near
0.25% with runs ending inside the first three floors. M38 made that 2.5% and
37%. Whatever narrow band this item suspected, the number it was inferred from
is an order of magnitude different now.

**So: answer the question with the instrument that exists. Do not build
anything.** If the answer is "runs contain no survivable setbacks", this
becomes a real item with real evidence. Until then it is a hypothesis with a
work agent attached to it, which is how dials get added for nothing.

`objectives.md` requires that hope never reach zero and that reversals be
possible. A reversal needs a **recoverable setback**: something goes wrong, the
run is genuinely worse off, and it is still live. Today the band between an
event with no consequence and an event that ends the run is too narrow for that
to happen often.

**This is a buffer question, and buffer is the thing this project already
established is two quantities.** `decisions.md`: capacity is what the hero
accumulates — `hpMax` plus gear, monotone because nothing takes gear away —
and attrition is what gets spent. A recoverable setback is an attrition event
large enough to matter against capacity and small enough to survive. **The
complaint is about the ratio between a bad event and the buffer standing behind
it, not about difficulty in general.**

**Why nobody owned it.** Every neighbouring item touches one side and not this
one. `M4` moves reward spread. `M21` puts a creature where the hero lands.
`M32` rebuilds weapons. `B14`/`B15` decide when to drink. None of them is about
how much room exists between a hit that does not matter and a hit that ends the
run, which is why this is filed rather than folded into one of them.

**It also inherits the open question that used to hang off map property 1.**
`objectives.md` carried it: floor 10 may now be past "hardest" and into
"unreachable". The property itself is in `map-design.md`; the live question is
here and in `I9`. **Note plainly that no item owns making the descent
completable** — I9 is blocked on it and this one is weakened by it, and neither
of them is that item.

**The evidence in hand is indirect.** `finishes` sits near 0.25% and runs
commonly end inside the first three floors. A hero that dies to the first
serious event never had a setback, only an ending. That reading is consistent
with a band too narrow to hold one — and it is **equally consistent with the
descent simply being too hard overall**. Separating those two is the first job
of this item, before any dial moves.

**What the answer is probably not: more hp everywhere.** That widens the band
and flattens the curve in the same motion, and `decisions.md` is full of what
happens when one change moves two things a measurement cannot separate. Look
first at what is already unevenly distributed and already shaped like "absorb
a blow and carry on": potions are a carried resource since `M35`, and armour is
a spent second bar rather than damage reduction.

**Tripwire, not a target.** What would settle it is whether runs contain events
that hurt and are survived — not the death rate, not the finish rate, and
emphatically not an hp number raised until things look better.

### M36 · a detour has to be able to cost the run

`map` · `work agent` · **DEFERRED until after R3** · owner decision,
2026-08-10 · this corrects a diagnosis `map-design.md` carried and has now
retired

**Real gap, wrong moment, and the reason is R3.** The return removes chests
from traversals 11–20 — **half a run will have no detour decision in it at
all**. Tuning the side-room bargain now means tuning a bargain the return
restructures, and re-measuring it afterwards against a changed denominator.

**It is also the riskiest item on the list**, which is a second reason not to
spend it early. The bot half below records the precedent: exposure pricing cost
about eleven points of win rate by making the bot shy, and a detour nobody
takes is not a decision either. That is a real chance of losing ground at a
moment when M38 just gained an order of magnitude.

**Nothing about the diagnosis is retracted** — the correction below stands, and
the property is still measured as not met. Only the timing moved.

**The retired diagnosis.** `map-design.md` said the reason the bot opens every
side room is the **level** of the reward: a chest is worth its walk almost
always, so no amount of varying the odds produces a decision. That reads the
trade from one side only.

**The correction.** A detour is refusable only if taking it **can cost the
run**. Refusing becomes correct when the walk, the fight and the hp they spend
can end the descent — and while the worst case of a bad room is a slower floor,
no reward level makes it refusable. Nor does lowering the reward until detours
stop paying: that deletes the decision rather than creating one. **What is
missing is on the cost side.**

**Why this is not `M4`.** M4 scales the risk/reward *spread* with depth — it
widens the distribution of what a side room offers. This item is about the size
of the worst case, not its spread. Both can be true at once; they are separate
changes and must not be collapsed into one dial.

**Establish which existing dial carries it before adding anything.**
`CLAUDE.md`'s minimum-change rule applies at full force here — this item is the
exact shape that produced the nine tier clamps. In order of preference:
`SIDE_ROOM_DEPTH_BONUS` already means "how much deeper a side room is treated
as being" and already drives both halves of the trade; `STEP_COST_IN_HP`
decides whether the walk itself costs anything at all, and `backlog.md`'s own
preamble classes it as structure rather than a number. A report that adds
something new says in one line why neither could carry it.

**The bot half is a real risk with a measured precedent.** The bot prices a
detour through `LOOT_CAMPAIGN_HORIZON`, discounting future value by the chance
of living to use it. Raise what a detour costs and the bot may stop taking any
— which is the *other* failure. `decisions.md` records exposure pricing costing
about eleven points of win rate by making the bot shy, and `map-design.md`
records that forbidding, requiring and permitting the detour once produced
identical dungeons. **A detour nobody takes is not a decision either.**

**Tripwire, not a target.** Refusal has to happen sometimes and acceptance has
to happen sometimes, over the same seed family, and the two have to be told
apart by what is in the room. Every room still opened means the change did
nothing; no room opened means it overshot. Neither end is a number to push
toward.

**Sequence.** Independently of `M4` or after it, but **never in the same
commit** — two changes to the same bargain inside one measurement cannot be
told apart.

# The return — floors 11 to 20

### R5 · the bot's campaign is twenty traversals, not ten

`bot agent` · **BLOCKED on the owner's B22 decision** · moot while `B22` is ON

Filed to run alongside `R1`, on the reasoning that every horizon in the bot —
`campaignCost` through `monstersAhead`, `LOOT_CAMPAIGN_HORIZON`, `levels` —
assumes ten floors, and `R1` made a run twenty traversals.

**That reasoning does not hold in the shipped configuration.** `B22` zeroes
`monstersAhead`, so `campaignCost` prices only the current floor's roster and
there is no campaign horizon left to correct. **This item would fix a term that
is switched off.**

**What decides it is the owner watching.** `B22` shipped ON against its own
measurement, deliberately, to be observed. If it stays, the horizon is the
floor and this item is deleted rather than done. If it comes off, this item is
needed and urgent — the bot would be pricing gear against half a run.

**One distinction worth keeping**, because it was nearly lost: the proposal was
never to eliminate `campaignCost`, only to shorten its reach to the floor.
`campaignCost` answers "what does fighting this set cost", which the
floor-local objective still needs; `monstersAhead` chooses the set, and that is
the only thing `B22` deletes.


# The bot's pricing

M35 and B14 shipped. What is left is the policy that reads danger, and the measurement that says whether any of it helped.

### B23 · the floor is phases, and activation is the boundary

`bot agent` · **REPORTED** · shipped ON · **owner observation with B22 ON, 2026-08-11** · the
concept is the owner's; this item is it written down

**What was watched.** With `B22` on the bot inverted: it now prioritises loot
even with creatures nearby, avoids creatures as far as it can, and **zig-zags**
— weaving around creatures to reach distant loot.

**The concept the owner drew out of it.** A floor offers a pool of resource —
expected loot from creatures plus expected loot from chests — at its maximum
when the hero arrives, falling as it is consumed. Against that sits the chance
of surviving the floor. **The question the bot cannot currently ask is how much
it is worth risking to gather more.**

#### Activation is a state boundary, not a gradient

**This is the part worth building.** `dangerField` prices threat as a
continuous field that decays with distance. But `rules.md` §3 says a creature
is **static** until the hero is inside its activation radius — so crossing that
radius is a discrete event, not a gradual cost.

That splits a floor into **phases**. Inside a phase nothing new is awake, a
step costs 0.01 hp, and gathering is nearly free. **A phase ends when the hero
activates something that was asleep**, and that crossing is a decision.

**"The next battle" is definable as the next activation radius**, which is what
makes this local and computable.

#### Do

**Compute the free region:** the tiles reachable without entering the
activation radius of any creature that is not already awake. The bot already
reads `monster.activation` — `priceMonsters` uses it — so this is a flood with
one extra predicate, not a new model.

**Then the turn's question becomes two, in order:**

1. **Is there anything left worth taking inside the free region** — including
   finishing creatures that are already awake and chasing? Take it.
2. **Only then, which radius to cross next**, and in what state. That is the
   real decision and it is where the resource-versus-risk trade actually lives.

**The owner's own case is the acceptance test.** A rat in this room, a vampire
with loot in the next: kill the rat first, sweep what is free, and only then
decide about the vampire's room. The bot should not walk into the vampire's
radius to reach loot while a rat is still awake behind it.

#### What this is expected to fix as a side effect, and it should be checked

**The zig-zag.** Inside a free region there is no threat to weave around, so
routing is plain. If the weaving survives, it is not caused by threat avoidance
and the diagnosis was wrong — say so.

**The owner has a step-budget feature in mind for the zig-zag.** Do not
pre-empt it; report whether the free region removed the behaviour on its own.

#### What this does NOT need

**It does not need the campaign horizon back.** This is floor-local, and it
gives a reason to fight that `B22` removed without restoring the term `B22`
deleted: radii have to be crossed to reach the shrine, so the question is the
ORDER, not whether.

**Do not add a risk-appetite dial.** "How much to risk for resource" is the
comparison at step 2, and it is already in hp. If it needs a constant, say in
one line why the existing safety margin cannot serve.

#### Assert

- The rat-and-vampire fixture, built to the owner's description. Checkable
  without a batch.
- Resource gathered per floor and hp at floor exit, against `B22` on and off.
- **Route length**, which is where the zig-zag lives.
- Share of floors whose first goal is a creature — 84.6% with `B22` off, 17.6%
  with it on. This item should land between them rather than at either end; if
  it lands at an end, something is being decided by one term alone.
- `finishes` at twenty traversals, once `I13` makes that number mean the run.

### B15 · a drink policy that reads the danger field

`bot agent` · **after I12** · only worth doing once B14's naive policy has a
number to beat

B14 drinks whenever the arithmetic says nothing is wasted. That ignores the
one thing the bot is best at knowing: `dangerField` already prices every
tile in hp, which is the same currency a potion pays out in.

**The real question is not "am I hurt" but "is the turn affordable".**
Drinking costs a turn and the creatures act on it, so the right moment is
when the hp bought exceeds the hp the turn costs — which is a comparison the
bot already knows how to make, in the currency it already uses. **Do not add
a threshold dial for this.** If it needs one, say why `dangerField` could not
carry it.

**The failure mode to steer away from, from the other direction.** A bot
that only drinks when safe will die holding potions, which is I12's
tripwire. Hoarding for a perfect moment that never comes is worse than
drinking a little early.

**Assert.** Beat B14 on `finishes` at the sample size I12 established, and
move deaths-holding-a-potion down. If it does neither, say so and leave B14
shipped — a policy that is more sophisticated and no better is a policy that
does not ship.

# What the map still has to do

The open half of `map-design.md`'s four properties. Each of these owns a property that is measured as not met.

### M42 · give time a price — stage 1, tighten the budget that already exists

`work agent` · READY · **owner proposal, 2026-08-11** · form decided by the
project agent; the reasoning is in this item

**Time is free in this game.** Dawdling costs nothing, detouring costs nothing,
walking costs nothing. Three gaps recorded in different documents are that one
sentence: `map-design.md`'s property 2 — the largest open gap in the game, and
"what is missing is on the cost side"; the return reading as passive; and
`STEP_COST_IN_HP` being a BOT pricing dial rather than a charge the game makes.

#### The budget already exists, and it is 14x to 47x too loose

A traversal takes about **107 turns**, measured. The engine's cap is **5000**;
the instruments pass **1500**. It is a safety guard that has never fired.

**So stage 1 adds nothing.** Tighten the existing cap until it is a design
constraint, and measure. That is `CLAUDE.md`'s order — change a value before
changing a meaning, change a meaning before adding anything.

#### The form, decided

**Currency: turns.** No new state — the counter and the cap both exist — and it
prices walking *and* fighting, which is the broad version the proposal asked to
build first. **Narrowing to movement later is easy; widening is not.**

**The bot needs no new channel.** Remaining budget is `cap − turn`; the turn is
public and the cap is a constant, so nothing crosses into `Belief` that was not
already there. **This is not a fog-of-war concession** — say so in the report
rather than leaving it looking like one.

**Scope: per traversal, not per run.** "A side room costs a countable number at
the moment the decision is taken" is a per-traversal statement, and with twenty
traversals a run-wide budget is a different feature.

#### Enter loose. This is the whole risk.

`finishes` reads about 3% over twenty traversals. **This adds a second way to
lose, and the project has just spent three items making runs completable.**

1. **Enter with a value that almost never bites, and prove by measurement that
   it almost never bit.** The expected result is "nothing changed". Report the
   numbers that said so.
2. **Tighten one step. Measure. Repeat.**

A budget that changes everything on the first try is not adjustable — it is an
event, and nothing after it can be attributed.

#### The test that decides whether it was worth doing

> **Does the bot start refusing side rooms?**

That is `map-design.md`'s property 2, measured as not met. Compare side-room
opening rate before and after.

**If it does not move, stamina did not do the job it exists for** — however
healthy everything else looks. Say that plainly instead of tightening until it
appears to have moved. And do not explain a difference below 2 sigma.

#### Stage 2 is NOT this item

Running out today ends the traversal without completing, which ends the run —
a threshold with no warning, and exactly the illegible death the proposal
rejects. **Making it legible is stage 2**: a visible budget that absorbs
distance before hp, the way armour absorbs damage before hp. **It is only worth
building if stage 1 shows the budget binding at all.**

#### Out of scope

New items, starting-item choice, the tier tree, the daily challenge, hero
selection. Several depend on this, which is why it comes first, and none enters
here. **If something seems to require one, stop and report.**

#### Assert

- The cap's value and how often it binds, before and after, per traversal.
- Side-room opening rate, before and after. **This is the item.**
- `finishes` at twenty traversals, depth histogram, turns per traversal.
- Which of `rules.md`, `bot-strategy.md`, `map-design.md` this made false.
  **Expect two or three** — `rules.md` §8 states the turn limit as a guard, and
  `map-design.md` records the detour as free.

### B24 · a step that does not approach the goal should cost more

`bot agent` · READY · **owner idea, 2026-08-11** · bot pricing, not a game
charge — deliberately separate from `M42`

**The idea.** Once the bot has chosen a goal, it has already decided that goal
is the best thing available. **A step that does not reduce the distance to it
is waste**, and should be priced as such.

**The owner's wording is inverted and the justification is what to follow.**
The sentence says a step TOWARD the goal should cost more; the reason given is
that steps which do not approach are the waste. **Build the version the reason
supports** — penalise the non-approaching step — and if the literal reading was
meant, that is a different item and it should be said.

#### Why this is not `M42`

`M42` makes the GAME charge for time. This changes what the BOT prefers, and
charges nothing. They are independent, they touch different files, and running
them in one measurement makes both unreadable. **Sequence them apart.**

#### Do

The routing price is already a per-tile cost function. A step whose distance to
the current goal does not fall is worth more to take. **One term in an existing
price**, the same shape `B17` used — and `B17`'s result is the warning: it
measured inert because the population it needed was not there. Check the
population before assuming this one is different.

**The reversal penalty already exists** and is close to this: it charges undoing
the previous step. State how the two differ, or use the existing one.

#### The reason this is worth trying

**The zig-zag the owner watched with `B22` on**: the bot weaving around
creatures to reach distant loot. `B23` is forbidden from pre-empting this, and
is instructed to report whether its free region removed the weaving on its own.
**Read B23's answer before starting** — if the free region already fixed it,
this item is measuring a behaviour that no longer exists.

#### Assert

- Route length and reversal rate, before and after, on the baseline family.
- Whether the zig-zag is visible in a watched run, before and after.
- **Whether the bot now takes worse routes** — refusing a lateral step can make
  it walk into things it used to walk around.

### C2 · the target curve, in numbers rather than adjectives

`work agent` · **after C1** · owner-approved plan, 2026-08-10

`map-design.md`'s target table is qualitative — high, falling, maximum, flat.
Someone has to turn shape into number, and it cannot be done before `C1`
establishes what scale the lines actually read on.

**Everything lands in `docs/balance.md` marked INITIAL GUESS.** Not a
formality: these are the first numbers this project will have written down for
a curve since the programme that failed, and the label is what keeps them from
being defended later as though they had been measured.

**One anchor is already fixed by the document and is not a guess.** The turn
approaches **1.0 without reaching it** — 1.0 means the traversal costs exactly
everything the hero has. That is the one value `map-design.md` commits to; the
rest of the column is a stated guess.

**Spread gets a target too, and it is the one that carries the shape.** The
middle's low challenge variance is a requirement rather than a defect — a noisy
middle means nobody can read whether the hero is on track, which is that
stretch's only job.

**Assert.** The table exists, every row is labelled INITIAL GUESS, and `C1`'s
measured curve can be laid over it. **Do not tune anything to fit it in this
item** — stating the target and hitting the target are separate, and collapsing
them is how a language becomes a scoreboard.

### C3 · solve the dials for a pressure curve instead of sweeping for one

`work agent` · **after C2** · owner-approved plan, 2026-08-10 · **the only
item in this arc that changes the game**

`map-design.md` claims the closed form allows the dials to be **solved** for a
target pressure curve rather than swept. That is true and it does not exist.
Sweeping for something a closed form can solve is wasted work — this item is
the payoff that makes the other two worth having.

**Scope, deliberately minimal.** Invert `expectedFloorMass` for the numerator
given a target pressure per floor, with the denominator supplied by `C1`'s
measurement. Nothing else.

**Do not attempt to solve spread.** `map-design.md` states it directly:
pressure is drawn and solved, spread is drawn and then measured. Expecting to
solve for a spread curve is the opposite error, and `X6` already owns the case
where the built tail does not do what it was asked.

**Assert.** A stated target curve produces dial values, and the closed form
re-read at those values reproduces the target. Then — and this is the part that
is not arithmetic — **watch the game**. `map-design.md`'s guardrail is the
acceptance criterion as much as the arithmetic is: when the drawn curve and the
watched run disagree, the watched run wins.

### M4 · scale the side-room bonus with depth

`map` · `work agent` · **READY, but sequence after M29, M30 AND M31** —
M31 landed: the M7 check no longer runs the blind proxy, it reads
`expectedFloorMass` directly. Corrected headroom is far larger than the
old comment said — M29 read ~4.3% of the 15% band, M30 (shipped) ~6.0%,
not the 0.65-point reading the proxy gave. Size this against that direct
reading, not the retired formula.

`SIDE_ROOM_DEPTH_BONUS` is fixed, so the only structural variance in the game
is constant across the descent.

**This item is the exact shape that produced the nine tier clamps, and the
minimum-change rule now applies to it directly.** "Make a fixed dial scale
with depth" has an obvious implementation — a base/per-level/cap trio — and
that is how the tier system got three copies of one expression. **Do not add
the trio.** The existing dial is a single number that already means "how much
deeper a side room is treated as being"; make *that* depth-aware, or give it a
signed reach, before adding anything alongside it. If a trio really is
unavoidable, the report says in one line why the existing dial could not
carry it.

**Why it matters.** It reuses machinery that already exists and was already
measured, and side rooms are the one place where risk and reward already
roll independently — `map-design.md` establishes why that independence is
what makes a detour a gamble rather than a free lunch.

**Acceptance.** CV per floor rises; the spine/side mass split stays at its
≥70% target; the average side room at floor 5 is not made harder, only the
spread widened. Measured on the probes.

### M21 · deep floors have something waiting where you land

`work agent` · **READY** · M19, M20 and M24 all landed; every block this
item carried has cleared. The header said BLOCKED on M19 long after that
was true — the queue table was right and this line was stale.

**Read the assert before starting: it was written when `finishes` read
zero.** It now reads ~0.25% (U6f, n=377). That does not unblock anything —
it makes the item's own warning sharper. This is one more thing making the
descent harder at a moment when almost nothing completes.

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

### X6 · collapse the tier clamps, once redundancy is proven rather than assumed

`work agent` · **after X5** · the one wave that touches behaviour

Three independent clamp systems decide which of eleven table rows a creature
comes from: the tier floor (M13), the tier ceiling (M24), and the early-floor
cut (M30) — nine dials in three base/per-level/cap trios.

**The confession is already in the code:** all three learned the same lesson
separately, that clamping the centre limits nothing and the clamp has to be on
the drawn slot. Three times the same finding, three new systems, no
consolidation.

#### The metrics agent found the cause of a failing objective, and it lands here

The randomness-tail objective is measured as not met: the one-sided peak does
not grow smoothly with depth, it is uneven and peaks mid-ladder. **The cause is
a mismatch this family of dials has by construction.**

**The statistic behind that reading, moved here from `objectives.md` when it
was cut back to strategy.** The metrics agent built a one-sided tail statistic,
p90 over mean, precisely because **CV could not answer this question at all**:
CV is symmetric, so it treats "came out easier than average" exactly like "came
out harder", and the objective is only about the hard side. This item's reading
is the one-sided one; do not re-derive it from CV.

`MONSTER_WEIGHTS` spreads by **absolute** offsets — a fixed ±2 indices, the same
at every depth. The clamps that contain it are **proportional** — a share of the
floor's ceiling index. So compensation is weak exactly where that index is small
(shallow floors) and only reaches full strength deep, leaving the middle of the
ladder under-protected. Verified: the offsets are literal constants, and the
shares are multiplied by the ceiling index.

**The suggested fix — raise the per-level rate — is the symptom.** It moves
where the ramp completes without addressing why an absolute spread is contained
by a proportional clamp. Per `CLAUDE.md`'s minimum-change rule that is the exact
shape to avoid: tuning a parameter to compensate for a parameter.

**The root fix is a change to what an existing dial means**, the rung above
adding: make the clamp absolute (a count of indices rather than a share), or
make the spread proportional. **This is an argument for doing X6, not for
deferring it** — consolidation is the moment to fix the mismatch rather than
carry it into fewer dials.

#### The proposal understates how cheap this is — supplied by review

**The floor and ceiling clamps are configured identically.** Base 0,
per-level 0.08, cap 0.5 — the same three values twice. Six dials carrying
three distinct numbers, and two systems that have never been set apart from
each other. That is the strongest argument for collapsing them and the
proposal did not notice it.

The early-floor cut is a different case, and M30 measured why: the applied cut
is an integer number of indices, so **every value in the open interval gives an
identical result** and only three outcomes exist at all. Three dials carrying
about one bit.

#### One thing the proposal cannot have both ways

It claims nine dials become two or three **and** byte-identical results. Those
are compatible only where the nine are provably redundant. Where they are not,
collapsing removes expressiveness and the curve moves.

**So the order is: prove redundancy first, then collapse.** For floor and
ceiling the proof is above and nearly free. For the early cut, M30's
three-outcomes finding is the proof. Anything left over after those two is a
real reduction in what is tunable and needs measuring, not asserting.

**Assert.** Byte-identical creature placement on fixed seeds — the same proof
E1 needs. `expectedFloorMass` unchanged at every level. If any of it cannot be
made byte-identical, that part is not a refactor and gets its own measurement.

**Timing.** Not during a measurement campaign — it invalidates paired
comparison. And before new structural features, not after: each one adds dials,
and adding to an untidy taxonomy is worse.

### M32 · weapons become a tier ladder instead of a stack

`work agent` · **BLOCKED on the lab** (`docs/lab-backlog.md`) · owner
decision, deferred deliberately

U6e ships with flat prices and multi-buy, which makes the second weapon poor
value and shield-spam the rational purchase. That is accepted for now and is
recorded in U6e as deliberate. **This item is the real fix, and it is
deferred because it is not a shop change.**

#### Why it is a whole-game change, not a pricing tweak

The diminishing return is arithmetic, not tuning: damage per turn is
perfectly linear in weapon points (`5/6 × (xp + weapons − 1) / 2`), but hp
*saved* goes as 1/dps, because turns-to-kill is `monster hp ÷ damage per
turn`. Measured: dagger (1 point) 15.75 hp, axe (2 points) 23.6 hp — **the
second point is worth 7.85, half the first.** No flat-damage weapon avoids
this.

**One cheaper thing to measure before building a ladder.**
`WEAPONS_WIDEN_ROLL` already exists as a flag, and flipping it makes each
weapon point worth a full point of expected damage instead of half — doubling
the value of every weapon with zero new machinery. It does **not** fix the
1/dps shape, so it is not a substitute for this item; but it changes the
coefficient the shape sits on, and the minimum-change rule says measure the
existing flag before adding item rows and changing `weaponDamage`.

So the fix is structural. Weapons stop stacking and become a ladder: one
weapon slot, tiers, each tier strictly better, price rising with tier. That
touches:

- **M26's creature drops**, which already gate weapons by creature tier
  (`WEAPON_AXE_MIN_TIER`) — a 5-tier ladder is a continuation of that
  mechanism, not a new one, but it changes what every drop is worth.
- **`weaponDamage`**, which sums the inventory today and would become
  `max()`. Small change, real one — it is combat.
- **The difficulty ramp**, since how fast the hero arms up is half of
  whether a floor is survivable.

#### Why after the lab, specifically

Judging a change of this size needs the instrument that does not exist yet.
The lab is exactly that instrument — hand-tune the dials, run the same seed
against Sonda A, Sonda B and the bot, and read finish rate and median depth
against a known baseline. Doing this before the lab means tuning in the
dark, which is what M29 already cost a session to.

#### Do not break this when you get here

`valueByItemName` (`loot.js`) prices a weapon as a **marginal delta** —
`campaignCost(player) − campaignCost(player + item)`. That is already
correct and already handles diminishing returns automatically. With
`max()` it keeps working and starts correctly valuing a worse weapon at
zero. **Whatever the ladder looks like, that marginal computation must
survive it.**

#### Assert

Finish rate and median depth against the pre-change baseline, on paired
seeds, two families — via the lab. Cumulative weapon damage by floor 10.
And the shop question that started this: with a ladder, is there a real
choice between shields and the next weapon tier, or does one still
dominate?

# The player

The only theme that gives the player something to do. Worth more under the return, not less: a longer run makes a starting choice matter for longer.

### U10 · the run is watched, and half of what happens is invisible

`ui agent` · READY · **found by the owner watching, 2026-08-10** ·
`src/ui/` only — no engine change, no bot change

**The observation that produced this:** "I am watching and no potions come out
of chests." They do — measured at generation, about one chest in nine holds
one. **The feature works and cannot be seen.**

#### What is actually invisible, confirmed by reading the renderer

`src/ui/render.js` draws the map, hp, xp, steps, kills, inventory, run and
seed. **It reads nothing from `state.log`.** There is no event feed, so every
event the engine records is either inferred from a changed number or missed.

| what happens | what a watcher sees |
|---|---|
| a chest is opened and holds a potion | a chest glyph changes; the item lands on the floor for about a turn |
| the hero walks over it | a small glyph vanishes; an emoji appears in the inventory strip |
| the hero drinks | hearts go up and an emoji disappears |
| the hero dies holding potions | nothing at all |

**M35 removed the one cue that existed.** Before it, a potion walked over at
full hp was refused and **stayed on the floor** — it sat there being visible.
Now it is collected in a turn. The feature became functional and invisible in
the same commit.

#### Why this is a real item and not polish

`docs/project/objectives.md`: **the product is the spectacle**, and the method
this project runs on is *watch the game, fix what is wrong*. That method
depends on what happens being visible. The owner just spent a session unable
to tell a working feature from a broken one, which is the method failing rather
than a cosmetic complaint.

It also has a measurable cost already on record: `deathsHoldingPotion` fires,
and a hero dying with unspent potions is the most watchable failure the bot
has. Nobody can see it happen.

#### Do

**Surface what the engine already records.** The log carries `open` (with
`found`), `pickup`, `heal` with the real amount since M35, `attack` and
`ascend`. Nothing new has to be computed and nothing in `src/sim/` may change.

**Scope it to what a watcher needs to follow a run**, not to a debug console.
The three that carry the potion feature are: a chest yielded X, the hero drank
for N, and the run ended holding N potions. Beyond that, use judgement — this
item does not enumerate a design.

**This is a PLAYER feature, and that settles the design.** Asked and answered
by the owner: the player does nothing but watch, so being unable to tell what
just happened is the product failing at its only job — not a diagnostic
inconvenience that happens to also affect the player.

**So: cues on the map, not a text feed.** A scrolling log is developer UI. What
a watcher needs is the item visibly leaving the chest and a `+3` rising off the
hero when it drinks — the event where the event happened. Build that. If a feed
turns out to be needed as well, that is a second item with its own reason.

#### Assert

**Watch a full run and describe, from the screen alone, where every potion in
it came from and what happened to it.** That is the acceptance test and it is
the same test that failed today. A screenshot of a drink and of a chest
yielding a potion.

**Do not tune anything to make events more frequent.** If a run turns out to
be visually empty, that is a finding for the backlog, not a reason to touch a
dial from `src/ui/`.

### U7 · the player chooses which hero to play

`product` · `work agent` then `ui agent` · **NEW, unqueued — owner to place**
· the worked design is `docs/project/candidates.md`'s U7 and is deliberately
not duplicated here

**The premise changed, and `objectives.md` was rewritten around the new one.**
The root document now opens with "the player chooses, then watches the choice
play out", and gives a whole section — "What a choice has to be" — to what a
choice owes. **None of it is built.** There is one hero, and the only thing the
player picks is what the shop screen offers at the end of a run.

**Planned, not built, and that gap is why this item exists.** A root document
describing a product half of which does not exist is a specific kind of
liability: every item derived from it inherits an assumption nobody has tested.
This is where that assumption gets discharged.

**What it is.** A pre-run menu, several heroes, each with a different starting
item *and* a different bot behaviour. The pick persists across deaths — die and
the next run starts with the same hero already chosen, no click required. Never
blocking: a pre-set rule, not a pause waiting on the spectator.

**The three tests come from `objectives.md`, and each is a tripwire rather than
per-hero polish.**

- **Visible.** If you cannot tell which hero was picked by watching for thirty
  seconds, it was not a choice. That is a *behaviour* requirement before it is
  a stats one — a different starting item will not clear it on its own.
- **Wrong sometimes.** Every hero needs a real weakness, and one that shows on
  screen. A hero who is simply better is an unlock, not a choice.
- **Attributable.** It has to be possible to look at a win and say the hero
  contributed to it.

**Where the design already is.** `docs/project/candidates.md`'s U7 carries the
worked version: four named heroes, what each does, which premises were checked
against the code and which came back wrong (deeper lookahead is measured worse,
not better — it hesitates rather than dodges), the two-axis visibility table
that separates Papazito from Ricardo, and the finding that neither needs a
`GameState` exception because `observe()` already legitimately bridges. **That
section stays where it is.** This item is the premise; that one is the spec.

**Two dependencies it does not get to skip.**

- **`step()` gains a second run-state axis.** Persona alongside seed keeps
  determinism — same seed and same persona replays identically — but every
  test, every `step()` call inside the bot's own search, and every frozen-probe
  instrument now has a second thing to hold fixed. State it as a decision when
  this is scoped rather than discovering it mid-build.
- **`I11`** asks whether the ruler still reads true when the starting hero
  changes. This item changes the starting hero on purpose and by menu, so I11
  is the instrument question sitting underneath it.

**What it does not resolve, and this is the honest half.** A choice between
heroes is a choice about *how* a run gets played. `objectives.md` also says the
product is a race the player has a stake in, and that the stake is small today.
This item enlarges the choice. It does not enlarge the stake.

# Instruments

Built on demand, never as a scoreboard. `docs/project/objectives.md` has the rule and `decisions.md` the history of what the alternative cost.

### I13 · descentCheck still measures a descent and calls it a run

`metrics agent` · READY · **head of the instruments queue** · found by the
owner asking whether the instruments were aligned to twenty traversals

`R1` taught `playDungeon` the traversal rule. **`descentCheck` has its own
floor loop** — `for (let level = 1; level <= levels; level++)`, `cleared`
when `level === levels` — and never learned it. `E1` collapsed the TURN loops;
floor loops are a separate thing and this is one.

**So every number `descentCheck` produces describes the descent half.**

| number | what it says now |
|---|---|
| `finishes` | "reached floor 10", which `R1` made the halfway point |
| `I9`'s survival table | outcome axis is ten floors; the key is a floor with no direction |
| potion counters, `depth`, coin | the first ten traversals only |

**Four instruments are correctly pinned and are NOT this item.** `curve.js`,
`hardness.js`, `shape.js` and `topologyShape` measure per-FLOOR properties, and
a floor is still a floor. `R1` pinned them deliberately so their numbers
reproduce. Leave them.

#### Do

**Drive twenty traversals, indexed the way `playDungeon` does it** — through
`floorOfTraversal`, not a second copy of the rule. If the loop can call
`playDungeon` instead of keeping its own, do that and say so; if it cannot, say
in one line what it needs that `playDungeon` does not give.

**`I9`'s table needs a traversal axis, not a floor axis.** Floor 4 descending
and floor 4 climbing are different states — different hero, different band,
and after `R3` different loot. Keying both to "floor 4" merges them. `R1`
already added `traversal` and `direction` to the levels rows for this reason.

**Say what happens to the buckets.** Twenty traversals at the current bucketing
is twice as many cells over the same sample, so support per cell halves. Either
the sample doubles or the buckets coarsen — decide, and state which.

#### Assert

- `finishes` means completing traversal 20, and reads near `R1`'s 3.0% ±1.2 on
  the same seed family.
- The survival table has a traversal axis, and the descent and return halves of
  the same floor are separate rows.
- Support per cell reported, with the sample size it took.
- **Every number that moves is stated as moving**, with the old and new
  reading. Anything quoted from before this item belongs to a ten-floor game.

### I12 · did it move anything — finishes, and died-holding-a-potion

`metrics agent` · **the baseline half is READY NOW and runs in parallel
with M35; the comparison half is after B14** · the measurement the owner
asked for

#### Take the baseline BEFORE M35 ships. This half is time-sensitive.

Once the engine change lands there is no "before" to measure — it can only
be reconstructed by checking out an older commit, which is possible and
which nobody does. **Run it now, against shipped `main`, while M35 is being
built.** Nothing about it depends on M35 existing.

What to record, at a sample big enough to resolve a quarter of a percent:
`finishes`, and whatever else the panel gives for free at that sample. The
same seeds get replayed after B14, so **write the seeds down** — that is the
one thing here worth persisting, against the project's usual rule that
measurements are not recorded. A rate compared across different seed
families is a weaker comparison than one compared across the same ones.

**Also record what a potion is worth today, and it is not obvious.** Under
the shipped rule a potion is refused at full hp, so some heal supply is
never collected at all. Count what share of generated potions are drunk in a
run — that is the number M35 is supposed to move most directly, and it is
the cleanest evidence the feature did anything, independent of `finishes`
moving at all.

**The headline number is `finishes`.** It reads ~0.25% (U6f, n=377), so
**this needs hundreds of runs, not dozens** — the runs that read 0% were
n=60–80 and could not resolve it. Use `tools/measure.mjs`; this is the
first item that genuinely needs I10 rather than merely liking it.

**The diagnostic worth building, and it is a tripwire not a scoreboard:**
the share of deaths that happened with an unused potion in the inventory.
It does not reward being pushed in either direction — it fires, and when it
fires there is a defect in the drink policy to find. That is the shape
`objectives.md` asks for.

**The denominator trap, named in advance because this item is a textbook
setup for it.** Potions that never go to waste make runs last longer. Any
per-turn or per-floor rate will move for that reason alone, and reading it
as "the change helped" would be the fifth instance of this exact error in
this project. Prefer totals and outcomes over ratios; where a ratio is
unavoidable, say what its denominator did.

**One confound to separate, not to explain away.** Two things changed at
once: potions became strictly more valuable (never wasted) and the bot
gained a decision it can get wrong. If `finishes` moves, this item cannot
tell you which one did it. **Measure M35+B14 against the shipped baseline
and say plainly that the two are entangled** — B15 is what separates them,
by changing only the policy against a fixed engine.

**Assert.** `finishes` before and after, with enough runs to resolve a
quarter of a percent, and a z. Deaths-holding-a-potion. And, because this
makes the game easier at a moment when almost nothing completes, say
whether anything got *worse*.

#### Review — RETURNED, one defect, everything else adopted

**The pricing half is right and the measurement of it is the good kind:**
potion 0 → 1.5 and chest 0.90 → 1.35 at full hp on floor 3, which answers
"did chest-seeking change" with a number instead of an impression. Reusing
`LOOT_CAMPAIGN_HORIZON` rather than inventing a second discount is exactly
what the item asked for, and the asymmetry against the weapon path
(unconditional, not gated on level) is disclosed rather than smoothed over.

**The defect: a second drink policy shipped by accident, and it is
danger-aware — which is B15's whole job.**

Adding `drink` to `ACTIONS` was this item's call to make, correctly. But
`tactics.js:71` enumerates `ACTIONS` for its lookahead, and its evaluator
(`tactics.js:63`) returns `effectiveHp(player) + dealt - toGo - crowd`.
Drinking raises `effectiveHp` directly, so in a depth-1 search **drink
outscores stepping whenever more than about one hp is missing.** The report
discloses that the veto "can now simulate drinking mid-duel" and calls it
"not designed on purpose" — it is more than a simulation artefact, it is a
live second policy that fires at a lower threshold than the naive one.

**Confirmed, not argued.** `descentCheck` at n=120 on the baseline seeds:
160 drinks, `healDelivered` 414. Under the stated policy every drink fires
only when missing ≥ heal, so all 160 must deliver the full 3 — 480. **The
66 hp gap is structurally impossible under the policy this item describes.**
No sigma needed; one partial drink falsifies "0 wasted, provable by
construction", and there are dozens.

**Why the report's own numbers missed it.** `drinksWasted` counts
`delivered === 0`. A tactics-driven drink at 2 hp missing delivers 2 of 3 and
counts as *useful*. The metrics agent flagged in code that post-M35 partial
overheal is unmeasurable — that note and this defect are the same blind spot,
found from two directions an hour apart, and neither agent could see the
other half.

**Why this matters beyond tidiness.** M35 exists to stop potions being
overhealed away. The tactical layer now reintroduces exactly that waste,
invisibly, in the same commit that repriced potions upward. And **B15 is
pre-empted**: it cannot measure "what does danger-awareness buy" against a
baseline that already has some.

**Do.** Keep `drink` in `ACTIONS`. Exclude it from the tactical search
instead — the lookahead enumerates the action list because that was a
convenient proxy for "moves the bot can make", and drinking is now a
decision the top-level policy owns. Say in one line why exclusion is the
right shape rather than scoring the drink branch honestly, or make the
opposite case with a measurement.

**Then re-measure** `healDelivered` against `3 × potionsDrunk`. They should
be equal under the naive policy, and that equality is the cheapest possible
check that no second policy is firing.

#### Fixed — excluded, not scored, and the equality now holds exactly

**Excluded.** `tactics.js` filters `drink` out of `ACTIONS` into a local
`SEARCHABLE_ACTIONS`, used at both places the search enumerates moves
(`bestValue`'s recursion and `scoreActions`'s own top-level loop) — the
recursion mattered too: leaving `drink` reachable only at depth > 0 would
still let a hypothetical future drink inflate what the search thinks THIS
turn's retreat or advance is worth, the same leak one level removed.

**Why exclusion and not scoring it honestly.** `makeEvaluator` is a flat
sum of hp terms built for movement trade-offs — retreat, advance, fight —
and every term in it is a rate or a one-time delta the search can compare
apples-to-apples. Drinking is neither: it converts a HELD ASSET (a potion,
priced by B14's own horizon-discounted face value in `loot.js`) into
immediate `effectiveHp`, and pricing that correctly means weighing the
immediate gain against what the potion is worth NOT spent yet — an
opportunity-cost comparison this evaluator has no term for and was never
built to make. Adding one would mean importing `loot.js`'s potion pricing
into `tactics.js` and reconciling it against `toGo`/`dealt` in the same
currency, which is not a search fix, it is B15's whole job under a
different name. Exclusion is the smaller change and does not pre-empt the
item that owns this decision.

**Re-measured, `descentCheck`, two independent seed families, n=120 each:**

    seed base    potionsDrunk   healDelivered   3 x potionsDrunk
    3000000           154            462              462
    4100000           161            483              483

**Exact equality on both, not merely close.** No second policy is firing.
`drinksWasted` and `deathsHoldingPotion` both read 0 on both families at
this sample — consistent with the earlier n=200 report (which read 2 deaths
holding a potion; a different, larger sample, not a contradiction).

**One more thing the numbers say, unprompted.** Drinks fell from the
review's pre-fix 160 to 154 on the same seed family, while `healDelivered`
rose from 414 to 462. Fewer drinks, more hp delivered — the tactical
layer's extra, premature drinks are gone, and what remains is only the
naive policy's own full-value drinks. That is the shape a correct fix
should have, not just the equality.

**Files touched:** `src/bot/tactics.js` (`SEARCHABLE_ACTIONS`, both loops).
Nothing in the pricing half changed — the review said not to touch it, and
141 tests still pass unmodified.

# Debt

None of it changes the game. All of it makes the next change cheaper or stops a document lying.

### X7 · chest value is right only because two errors cancel

`bot agent` · READY · small · **found by B18 declining to fix it**

`loot.js`'s `ITEM_MIX` calls `itemWeights({}, 'chest')` with an empty scarcity
object, so the bot's chest model has no empty slot. `CHEST_LOOT_CHANCE` then
stands in for the whole payout rate rather than for the positional gate whose
shape it resembles, and the two mistakes cancel.

**Not wrong today, and B18 was right not to touch it.** It is fragile: either
half can be "fixed" in isolation and silently halve or double what the bot
thinks a chest is worth, and the arrangement is held together by a comment.

**Do.** Make the model say what it means - real scarcity in `ITEM_MIX` and
`CHEST_LOOT_CHANCE` cut back to the gate it is named for - or, if that is more
churn than it is worth, leave it and make the coupling impossible to break by
accident with a test that fails if either half moves alone.

**Assert.** The bot's chest value before and after is unchanged, or the change
is stated with the number. A correctness-of-model item, not a tuning item.


### X1 · delete what nothing uses

**`run-zigzag.html` and `run-b9.html` are both clear to delete now** —
B3's condition (keep only if B8 has not shipped) and B9's (not meant to
outlive the item) have both resolved: B8 and B9 are DONE.

**Before deleting `run-zigzag.html`, decide where its wall-bump counter
goes.** B10 added a general-purpose "did this step pass a turn" counter to
that page — useful for any future routing change, not specific to B10 —
while the rest of the page's reason to exist (B3/B8) is closed. Losing the
counter by reflex when the page goes is the trap; port it into
`run-check.html` or wherever the next routing item's instrument lives, or
say explicitly it is not worth keeping and let it go.

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
    run-b11.html        served B11, temporary by its own author
    run-axe2x.html      ad-hoc chat sim (axe/dagger value multiplier),
                        never a backlog item, safe to drop with the rest

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

### X2 · 25 code comments point at bot-strategy sections that no longer exist

`work agent` + `bot agent` · READY · **small, mechanical, and my fault —
filed by the project agent that caused it**

`docs/bot-strategy.md` was rewritten from "formalisation of the 3 rules" into
a description of what the bot actually does. The old section numbers went with
it, and **25 comments across `src/` still cite them** — `§1`, `§2`, `§2.1`,
`§3`, `§4.0`, `§4.3`, `§4.4`, `§4.5`, plus "rule 1" by name.

Spread: `src/bot/` (bot.js, duel.js, nav.js, tactics.js, threat.js,
placeholder.js), `src/sim/` (balance.js, combat.js, monsters.js, observe.js),
`src/analysis/` (observed-ruler.js, winnable.js).

**Do not repoint them at new section numbers.** They would break again on the
next rewrite, which is exactly how this happened. Two better targets
depending on what the comment is actually citing:

- **Reasoning about something that failed or was measured** → point at
  `docs/project/decisions.md`, which is where that now lives permanently and
  is organised by finding rather than by section.
- **Reasoning about what the bot currently does** → point at
  `docs/bot-strategy.md` with no section number, or name the function
  (`worthStarting`, `campaignCost`) instead. A named function survives
  reorganisation; a section number does not.

Some may turn out to cite something worth stating inline in two lines rather
than by reference at all — that is a better outcome than a pointer.

**Split by role:** `src/bot/` is the bot agent's; `src/sim/` and
`src/analysis/` are the work agent's. Either can go first, no ordering.
`placeholder.js` is on X1's delete list, so its reference may resolve by
deletion.

#### Three comments that are false, not just misaddressed — added by review

Same file family, same agent, same pass. The bot agent flagged the first;
the other two turned up checking it.

**`FRONTIER_REVEAL_WEIGHT`'s comment restates two OTHER dials' values.** It
quotes `VISIBLE_DIST`'s value to justify a tile count, then states the
product is "half of one `STEP_COST_IN_HP`" — true only while that dial holds
its current value. Move either and the comment is silently false. This is
exactly what `CLAUDE.md`'s never-restate-a-value rule exists to stop, and the
worse version of it, because the values borrowed are not even this dial's.
State the bound as a relationship, or point at `balance.md`.

**`GOAL_STICKINESS`'s comment is already false.** It says the hysteresis
check "only applies to `monster` targets, chest/item goals have no hysteresis
at all". **B11 unified them** — the shipped check is keyed by `current.kind`
and includes item and chest.

**`docs/balance.md` around the `GOAL_STICKINESS` section repeats it**, and
goes further: it proposes "the real fix there would be extending the
hysteresis check to loot goals — not attempted here". B11 did exactly that.
A stale claim plus a stale to-do for work already done.

**Assert.** No `bot-strategy` reference in `src/` cites a section number. No
comment in `balance.js` restates another dial's value. The two hysteresis
claims match what `bot.js` actually does. Tests green — this is comments and
docs only, and a diff touching anything else has gone wrong.

### X3 · mark which dials change the GAME and which change only THIS bot

`work agent` · READY · **small, comments and one doc column — no behaviour**

Sixteen constants in `src/sim/balance.js` are purely bot behaviour: step cost,
goal stickiness, reversal penalty, duel safety margin, crowd penalty, danger
falloff, exposure weight, hold range, the tactical dials, the frontier reveal
weight, the unknown-monster estimate, the loot horizon, the bot's chest-loot
belief, and whether the bot is told the monster count.

**They are in the work agent's directory and they are not the work agent's
concern.** B8 was a bot finding the work agent had to commit for that reason.

**This item does NOT move them.** Moving them would split the one thing
currently working: `docs/balance.md`'s top table is the project's defence
against value drift — spot-checked accurate, including dials changed the same
day — and it holds because every tunable lives in one of two known files. A
third source risks that to buy tidiness.

**The distinction worth making visible instead.** A game dial changes the
game: every player meets it, bot and both probes alike. A bot dial changes one
player's judgement while the game is identical — `makeSondaPolicy` does not
read `DUEL_SAFETY_MARGIN` at all. **A bot dial is not part of the game's
definition**, and nothing in the file or the table says so today.

**Do.** Group the sixteen under a header in `balance.js` saying plainly that
they tune the bot and not the game, and mark them in `docs/balance.md`'s top
table (a column, or a separate table — reader's clarity decides). Then a
crossing is legible in advance rather than discovered: "this is a bot dial
living in a work file, expect the bot agent to need a hand."

**Assert.** No value changes and no import moves — a diff touching anything
but comments and the doc has gone wrong. Tests green.

**If moving them ever becomes right** — frequent collisions on `balance.js`
would be the signal — the refactor has a clean proof available that most do
not: byte-identical bot traces on fixed seeds, the same proof E1 needs.

### X5 · classify every dial by lifecycle, then delete only what is truly dead

`work agent` + `bot agent` · READY · **two waves, two commits, zero behaviour
change in either**

Brainstorm proposal, adopted with two corrections. The reframe it brings is
the valuable part and the project does not have it: the question is not *"does
this dial do something today"* but **"what would have to change for it to
matter again"**. Five classes, different destinies:

| class | definition | destiny |
|---|---|---|
| **LIVE** | drives the game that runs | keep, measure |
| **INSTRUMENT** | exists for ablation, never was a feature | **always keep** |
| **DORMANT** | built and correct, inert because a precondition is unmet | keep, **with the trigger written next to it** |
| **ARCHIVED** | measured negative | keep the flag, **write the reopen condition** |
| **DEAD** | superseded, no path back | delete, fix call sites |

**Orthogonal to X3, not a replacement.** X3 separates game-dial from bot-dial
(who is affected); this separates by life stage (whether it still drives
anything). A dial carries both marks.

#### Correction 1: ARCHIVED keeps the flag. Only DEAD gets deleted.

The proposal wants archived flags deleted, arguing a live flag costs
combinatorial interaction in every future measurement. **That cost is
overstated** — a flag defaulting to false enters no measurement unless
someone sets it, and nothing here sweeps flag combinations.

**And this session supplies the counter-example.** B9's first reading looked
harmful and it shipped OFF. Under the proposal it would have been ARCHIVED and
deleted. The reading was then found to have been taken against a
mid-edit `src/sim/`, re-run clean, and **flipped ON** — where it ships today.
Deleting on a first negative would have meant rebuilding it to discover that.

`CLAUDE.md`'s existing practice — keep the flag with the number that killed it
in the comment — is right and stays. What the proposal correctly identifies as
missing is not the deletion, it is **the reopen condition**, which exists
nowhere today. Add that; keep the code.

#### Correction 2: `MONSTER_COUNT` and `CHEST_COUNT` are not DEAD

The proposal classifies them DEAD on the grounds that a real run always
overrides them. Checked: they are also **live defaults** in `bot.js`'s settings
(`monsterCount`, `chestCount`) and default parameters in `loot.js`
(`monstersStillToFight`, `valueByItemName`). Deleting them breaks a bare
`makeBot()` and any `valueByItemName` call without a total — paths the tests
use. They are LIVE-as-fallback, which is a real class the taxonomy should
admit rather than a mistake to delete.

#### The inconsistency that justifies the item — verified

The project **refused one extra term** in the crowd correction for lack of
samples, in writing, in two places: `balance.js` records that the structure
"would need either a second term or far more seeds", and `balance.md` that it
"would need meaningfully more seeds to fit without overfitting". **And it
accepted nine dials in the tier system.** At the sample sizes and the 2σ
discipline in use, nine clamps cannot be told apart honestly. Most were set by
argument, not measurement.

#### Wave 1 — classify

Marking only. Same shape as X3: a comment saying which class, and a column in
`docs/balance.md`'s table. **For DORMANT and ARCHIVED the trigger or reopen
condition must be written, and that is the actual product of this wave** —
today it is oral knowledge, and a dormant dial without a written trigger is
indistinguishable from junk to whoever arrives next.

Starting classification from the proposal, worth keeping: `pick: 'nearest'`,
`requireClear: 'all'/'none'`, `threat`, `loot`, `crowdCost` are INSTRUMENT and
should stop being counted as configuration. `CHEST_QUALITY_BY_DEPTH` and
`EARLY_CHEST_QUALITY_BOOST` wake when `ITEM_TABLE` gains a second armour or
potion. `XP_FROM_KILLS`/`KILLS_PER_XP` wake if xp stops being frozen.
`exploreValue` is the sharpest DORMANT case — it measured zero **because the
frontier goal is never re-evaluated, so the question is never asked**, not
because the answer was bad.

**Assert.** No value changes anywhere. Every DORMANT and ARCHIVED entry has a
written trigger.

#### Wave 2 — delete DEAD

`MONSTER_GROWTH` / `STRENGTH_GROWTH` / `DIFFICULTY_REBALANCED` are a migration
that never finished: if the rebalanced pair is what runs, the old one is
history, not an option. `chestCount` in the bot is read only by flags that are
off. **Not** `MONSTER_COUNT`/`CHEST_COUNT` — see correction 2.

**Assert.** Paired seeds, no number moves. Tests green with the call sites
fixed.

#### Do NOT cut

`SCARCITY` / `POTION_SCARCITY` / `WEAPON_SCARCITY` look redundant and are not —
M27 split them deliberately so they could move without colliding, and M27's own
Result records what happened when they shared one value. Genuinely independent
pools.
