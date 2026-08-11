# Backlog

The task list. Everything needed to pick up a task and finish it.

> **Priority order, owner-set:** phase A of the roadmap below — make a run
> completable — before anything else. The shop arc is closed; `docs/lab-backlog.md`
> (the manual dungeon simulator) still sits behind phase A.
>
> **This file is grouped by theme, not by agent.** An item names its own agent
> in its first line. Grouping by lane made the roadmap unreadable: the return
> alone spans three lanes, and reading it meant assembling it from three tables.

- **What we are doing and why** — `docs/project/objectives.md`
- **What was last measured** — `run-check.html` (a record, not a set of goals)
- **Closed items** — removed from this file once adopted. The transferable
  lesson goes to `docs/project/decisions.md`; the full report, result and
  review stay in the git history, where the commit message carries them.
- **Ideas with no slot** — `docs/project/candidates.md`

## How this works

**Every report names which behaviour document it made stale** — `rules.md`,
`bot-strategy.md` or `map-design.md` — or says plainly that none moved. See
`CLAUDE.md`. "None" is a valid answer that still has to be written.

**A new parameter is the last resort, not the first.** Change an existing
value, or what an existing parameter means, or delete what is fighting you —
before adding. A report that adds one says in a line why an existing one could
not carry it. See `CLAUDE.md`; the nine tier clamps are why the rule exists.

**Before filing anything, ask: if this changes, does a previous measurement
become invalid?** Yes → it is STRUCTURE, and it is worth deciding early and
cheaply. No, it only moves a value → it is a NUMBER, and it should be tuned
late, expecting to be redone.

The evidence for taking this seriously is expensive and already paid:
`balance.md`'s "Where the current numbers live" section exists to say the
tables were **deleted**, because they were measured before xp was frozen,
before weapons widened the roll, before armour became a spent bar, before
passive regeneration went, before the collectibles went, before growth turned
exponential and before the map grew a spine. Seven structural changes. The
instruments survived all seven; not one table survived any.

**The project has inverted these two in both directions**, which is why the
test is worth applying explicitly. `STEP_COST_IN_HP` reads as a number and is
structure — it decides whether time is a real resource, which decides whether
the coin formula means anything. The nine tier clamps read as structure and
are numbers — they have names, files and backlog items, but changing them only
re-reads the same curve and invalidates nothing.

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

## The roadmap, after the return

**Owner decision, 2026-08-10: a run is twenty traversals, not ten.** Floors
1–10 down, then 11–20 back up — the same map seeds in reverse, with different
creature seeds, different variance and different loot. **Victory is returning
to floor 1**, not reaching floor 10. The shop happens after that, as it does
today.

**Not built. `rules.md` still describes the ten-floor game and stays that way
until the engine changes** — it records what the game does, not what was
decided. `map-design.md` carries the design.

### The one thing that has to be said first

**Today `finishes` is about 0.25% for ten floors. Victory now needs twenty.**
Whatever the return's per-traversal risk is, it multiplies against a descent
almost nothing survives. **Doubling the run before the first half is
survivable takes a win rate near zero to indistinguishable from zero** — and
`objectives.md`'s primary objective is that hope must never reach zero.

That is not an argument against the return. It is the sequencing constraint:
**the return makes the "make the descent completable" problem urgent rather
than creating a new one.** M37 already records that nobody owns that problem.
Now something depends on it.

### Phases

**Phase A — make a run completable at all.** M37 (room between "no effect"
and "dead"), M36 (a detour has to be able to cost the run), and whatever
parameter work the owner takes on `finishes`. **Nothing in phase B is worth
measuring until this moves.**

**Phase B — the return, as engine.** R1–R4 below. R1 is the spine; the rest
is what makes traversals 11–20 different from 1–10 rather than a rerun.

**Phase C — the bot learns the run is twice as long.** R5. Mandatory
alongside R1, not after it: every "rest of the campaign" estimate in the bot
assumes ten floors, and B14 just priced potions against exactly that horizon.

**Phase D — the shop and the heroes.** U7 (the player chooses a hero) and the
shop repricing that a twenty-traversal clear implies. **U7 gets more valuable
under the return, not less:** a longer run makes a starting choice matter for
longer, and it is the only feature on the list that gives the player something
to do.

**Unchanged and still open, orthogonal to all of it:** X5, X6, I9, I10's
follow-ons, M21, X1, X2, X3, M4, E1, M32.

### What the return makes stale

| what | why |
|---|---|
| `finishes` as a number | it means "reached floor 10", which is no longer victory. Every item that reads it — I9 most of all — needs the new definition |
| "floor 10 is the hardest" | the turn is maximum threat; the return is maximum variance and rising death risk. Property 1 already restated in `map-design.md` |
| every horizon in the bot | `campaignCost`, `monstersAhead`, `horizon`, `levels` all assume ten |
| depth as a single axis | M4, M21 and M32 all scale something "with depth"; there are now two passes over the same depth |
| coin banking | it banks on a clear, and a clear is twice as far away |

### The new items

| id | what | agent |
|---|---|---|
| R1 | Twenty traversals, victory on returning to floor 1 | work |
| R2 | The return repopulates: same map seed, new creature seed | work |
| R3 | The return has no chests — reward is kept, not earned | work |
| R4 | Variance rises through the return, toward the exit | work |
| R5 | The bot's campaign is twenty traversals, not ten | bot |

**Written as five because they verify separately, not because the change is
small.** R1 alone is playable and measurable — twenty traversals with the
return identical to the descent — and every one of R2–R4 is a difference laid
on top of that. If R1 is built as one thing with all four folded in, nothing
can be measured against anything.

**Grouped by theme, not by lane.** Each item states its own agent. The
previous arrangement was one table per agent, which broke every theme that
spans more than one — the return needs `src/sim/`, `src/bot/` and eventually
`src/ui/`, and reading it meant assembling it from three places.

**Closed items are not here.** They are removed the moment they are reviewed;
`git log` is the archive and `docs/project/decisions.md` holds what they
taught. A backlog that keeps its own history stops being readable as a list
of what to do next, which is the only job it has.

| theme | items | where it stands |
|---|---|---|
| **A run has to be completable** | M37 · M36 | **overshot — see below.** 0.25% → 25% finishes in three items; the opening has stopped filtering |
| **The return — floors 11 to 20** | R1 · R2 · R3 · R4 · R5 | phase B/C. Specs in the roadmap above; no item bodies yet |
| **The potion arc** | B18 · B19 · B17 · B15 · I12 | M35 and B14 shipped; the policy and the verdict are left |
| **What the map still has to do** | C2 · C3 · M4 · M21 · X6 · M32 | the curve arc (C1–C3) states the shape in two lines and solves for it; the rest each own a property measured as NOT met |
| **The player's choice** | U10 · U7 | phase D. The only theme the player touches |
| **Instruments** | I9 | blocked, and the return moved its target |
| **Debt** | X1 · X2 · X3 · X5 · E1 | changes no behaviour; makes the next change cheaper |

### A run has to be completable — phase A

| # | id | what gets done | agent | status |
|---|---|---|---|---|
| 1 
| — | M37 | Do runs contain survivable setbacks? | metrics | **not a change** · answer from descentCheck |
| — | M36 | A detour has to be able to cost the run | work | **deferred until after R3** |

**Phase A is over, and it went further than intended. This is an owner
decision, not an item.**

Three changes landed in sequence, each individually justified, all pushing the
same direction:

| | share ending by floor 3 | runs clearing all ten |
|---|---|---|
| before M38 | 0.645 | ~0.25% |
| after M38 (starting dagger) | 0.370 | 2.5% |
| after M39 (chests pay out half the time) | 0.130 | 20% |
| after B16 (no more accidental exits) | **0.115** | **25%**, verified in review at n=200 |

**A hundredfold in three items.** M39's own report said it plainly and did not
reach for a dial to hide it: **the opening has stopped filtering.**
`map-design.md` says the opening is hard on purpose and that a hard opening
needs a poor hero — M38 and M39 both made the hero richer at exactly that
point, and B16 then stopped throwing floors away.

**`objectives.md` names both failure directions**, and the risk has swapped
ends: winning has to stay rare enough to matter, and "too common and the win
loses its charm" is now the live one. Nothing here says 25% is wrong. It says
the number moved a hundredfold without anyone choosing where it should land.

**Owner decision, 2026-08-10: structure and instrumentation first, results
later.**

Three parts, and they are a standing direction rather than a note on this
section:

- **No fine tuning now.** No item should propose moving a dial to chase a
  measured number, and no report should treat a measured number as a verdict
  on the game.
- **The opening SHOULD be hard** — `map-design.md` is not wrong, the game
  drifted away from it. `M41` takes the starting weapon back out on that
  basis. What is deferred is *tuning* it, not the intent.
- **What is wanted from a measurement right now is that it is possible and
  that it mirrors reality**, not what it says. An instrument that reports a
  number nobody likes has succeeded. `C1` is the model: it was built, it
  contradicted a design claim on first use, and that was the value.

**`C2` and `C3` are explicitly not now.** Pressure and spread exist so the
shipped curve can eventually be brought toward the drawn one; approaching it
is later work, and `C1` being done does not start it. What this section exists for now is the record
that the number moved a hundredfold and that the opening stopped filtering —
both of which change what other items mean, `C2` most immediately.

**The original reasoning, kept because it is still why M38 went first:** three
quarters of runs were over by floor 3, so the ramp's top decided floors that
96% of runs never saw. The binding constraint was the opening, and the cheapest
single value that moved it was the starting kit.

### The return — floors 11 to 20

| # | id | what gets done | agent | status |
|---|---|---|---|---|
| 1 | R1 | Twenty traversals, victory on returning to floor 1 | work | spec in the roadmap above |
| 1 | R5 | The bot's campaign is twenty traversals, not ten | bot | **with R1, not after** |
| 2 | R2 | The return repopulates: same map seed, new creature seed | work | after R1 |
| 3 | R3 | The return has no chests | work | after R1 |
| 4 | R4 | Variance rises through the return | work | after R1 |

### The potion arc

| # | id | what gets done | agent | status |
|---|---|---|---|---|
| 1 | B18 | The bot believes every creature is carrying a weapon | bot | READY · **bug**, drop value inflated 4x |
| 2 | B19 | Loot is priced against the campaign, never against the fight in front of it | bot | after B18 · owner decision |
| 3 | B17 | Loot on the way is free, and the router does not know it | bot | **ADOPTED as a finding** · owes one change: ship it OFF |
| 3 | B15 | A drink policy that reads the danger field | bot | READY · B14 left a number to beat |
| 3 | I12 | Did the potion change move anything? | metrics | baseline recorded · comparison owed |

### What the map still has to do

| id | what gets done | agent | status |
|---|---|---|---|
| C2 | The target curve, in numbers rather than adjectives | work | **NOT NOW** · owner: structure first |
| C3 | Solve the dials for a pressure curve instead of sweeping | work | **NOT NOW** · after C2, later work |
| M4 | Side-room risk/reward spread scales with depth | work | READY |
| M21 | Deep floors put a creature where the hero lands | work | READY · read its own warning on `finishes` |
| X6 | Collapse the tier clamps, redundancy proven first | work | after X5 · owns the tail-shape cause |
| M32 | Weapons become a tier ladder instead of a stack | work | BLOCKED on the lab |

### The player's choice

| id | what gets done | agent | status |
|---|---|---|---|
| U10 | The run is watched, and half of what happens is invisible | ui | READY · `src/ui/` only, no lane collision |
| U7 | The player chooses which hero to play | work + ui | phase D |

### Instruments

| id | what gets done | agent | status |
|---|---|---|---|
| I9 | Conditional survival table = the "hope" instrument | metrics | BLOCKED · and the return moved its target |

**`I9` is worth a line of its own.** It was blocked on `finishes` being
non-zero. The return makes that worse rather than better: `finishes` now has
to mean twenty traversals, not ten. It is the instrument for the primary
objective and it is further away than it was.

### Debt

| id | what gets done | agent | status |
|---|---|---|---|
| X5 | Classify every dial by lifecycle, delete only the dead | work + bot | READY · at a structural boundary |
| X1 | Delete what nothing references | work | READY |
| X2 | Comments in src/ that lie: 25 stale refs + 3 false claims | work + bot | READY |
| X3 | Mark which dials tune the game and which tune only the bot | work | READY |
| E1 | One resumable turn loop in src/sim, instead of four copies | work | READY · U2 in candidates.md waits on it |

Closed work is in `docs/project/decisions.md`. Parked and unscheduled is in
`docs/project/candidates.md`.

# A run has to be completable

Phase A of the roadmap. **Nothing else is worth measuring until this moves** — `finishes` reads about a quarter of a percent over ten floors and victory now needs twenty.

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

Phase B and C. `R1` is the spine and is playable on its own; `R2`–`R4` are differences laid on top of it. **`R5` goes with `R1`, not after it** — every horizon in the bot assumes ten floors. Specs are in the roadmap above; these have no item body yet.

# The potion arc

M35 and B14 shipped. What is left is the policy that reads danger, and the measurement that says whether any of it helped.

### B18 · the bot believes every creature is carrying a weapon

`bot agent` · READY · **bug, confirmed by measurement** · found by the owner
watching nets of 250 on creatures against 1 on loot

`expectedMonsterDropValue` (`src/bot/loot.js`) asks `itemWeights` what a
creature is likely to drop and passes **an empty scarcity object**. Measured
against what the generator actually rolls:

| | dagger | axe | **empty** |
|---|---|---|---|
| what the bot believes | 0.429 | 0.571 | **0.000** |
| what `spawn.js` rolls | 0.107 | 0.143 | **0.750** |

**Three quarters of monster draws come up empty and the bot's model has no
empty slot at all**, so every creature is priced as though it were certainly
carrying a weapon. The drop value is inflated by almost exactly 4× — a rat
reads 55.12 where it should read about 13.8.

**This is the same defect M39 found on the chest side**, in `ITEM_MIX`, which
also called `itemWeights({}, 'chest')`. That one was caught because M39 was
changing the chest rate anyway. **Nobody checked the monster side**, and the
scarcity dial it ignores — `WEAPON_SCARCITY` — is the one M26 introduced when
weapons moved onto creatures.

#### Do

Pass the real scarcity, the way the generator does. The dial is already
exported and `spawn.js` is already the shared implementation — this is one
argument, not a new model.

**Check what else calls `itemWeights` with an empty object while you are
there.** Two of three known callers had this bug; the third should be looked
at rather than assumed.

**Do not compensate anywhere else.** Anything downstream that was tuned
against the inflated number should be left alone and re-read afterwards, not
adjusted in the same commit — otherwise the fix and the compensation cannot be
told apart.

#### Assert

The drop estimate for a named creature, before and after, against the
generator's own weights. Then the share of floors whose FIRST goal is a
creature — measured at **86.8%** on the shipped bot over 227 floors, which is
the observation this item came from. Report it even if it barely moves: `B19`
is the other half and this item is not expected to fix the ordering on its own.

### B19 · loot is priced against the campaign and never against the fight in front of it

`bot agent` · **after B18** · owner decision, 2026-08-10 — "the bot has to
leave the floor alive, or with as much hp as possible"

Measured values for a fresh hero, in hp:

| item | value |
|---|---|
| potion | **1.5**, flat |
| shield | **3**, flat |
| dagger | 15.75 → 47.25 → 110.25 as monsters ahead grows |
| axe | 23.62 → 70.88 → **165.37** |

**Weapons are priced against the whole remaining campaign; armour and potions
are priced at face value, once.** That is why a creature's `net` reads in the
hundreds against a chest's 1. The two sides of the comparison are not in the
same units, and no preference is being expressed — an arithmetic mismatch is.

**Face value is not wrong for armour, and this item is not asking to inflate
it.** Three points of armour do absorb three points of damage. What is missing
is different and the owner named it: **taking the shield before the fight
changes the fight.** The bot prices the item against `campaignCost`, which
counts the remaining monsters without caring in what ORDER things happen — so
"shield then wolf" and "wolf then shield" cost the same in the model and do
not in the game.

#### The non-linear case, which is the one that matters

`worthStarting` is a hard gate: a duel whose expected loss exceeds the hero's
effective hp times the safety margin never enters the comparison at all. **A
shield can move a fight from the wrong side of that gate to the right side.**
When it does, its worth is not three hp — it is the difference between a floor
the bot can finish and one it cannot.

That is the sharpest form of "leave the floor alive", and nothing in the
current pricing can express it.

#### Do — and the function you need already exists

`duelCost(player, monster)` is already there, and `valueByItemName` already
computes a marginal delta by re-pricing with the item added. **The immediate
value of an item is the same shape one level down:**
`duelCost(player, m) − duelCost(player + item, m)`. No new model, no new dial —
the second call is the whole change.

**The trap, and it will be easy to fall into: double counting.**
`campaignCost` already includes the creature standing in front of the hero.
Adding a duel saving on top counts that fight twice. **The report must say in
one line how it avoided this** — excluding the immediate creature from the
campaign term, or crediting only the ordering difference, are both defensible;
silently summing them is not.

**Do not add a weight to balance the two sides.** If weapons still dominate
after `B18` and after this, that is a finding to report, not a coefficient to
introduce. `CLAUDE.md`'s rule applies at full force: this item already adds one
term, and a second one to tune the first is exactly what it forbids.

#### Assert

**The gate case explicitly:** construct a duel the bot refuses, show that a
reachable shield makes it accept, and show it takes the shield first. That is
the behaviour the item exists for and it is checkable without a batch.

Then the share of floors whose first goal is a creature (86.8% today), items
collected per floor, and the depth histogram on the baseline seed family. **And
say whether the bot now detours for loot it should ignore** — the failure
direction is a bot that shops before every fight.

### B17 · loot on the way is free, and the router does not know it

`bot agent` · **REPORTED** · shipped on, measured inert — the population it
acts on is 0.5% of decisions

**Observed:** the bot walked to a distant creature past loot it could have
collected on the way.

**The correction that changes the fix.** Loot exactly on the path is
**already free** — `step.js` picks up a loose item when the hero walks over
it, no action and no turn. So this is not "the bot ignores free loot"; it is
that the bot will not deviate two tiles for something beside the path.

**Where it comes from.** `chooseGoal` (`bot-strategy.md` §3.2) compares
candidates individually by `net` from where the hero stands now, and commits
to the winner. Nothing in it asks what lies along the route to that winner.
That is by construction, not by oversight — it is a one-goal chooser.

**Not the same as the ping-pong note.** `bot-strategy.md` §5's routing gap is
about reversals, going back and forth. This is about sequencing several
targets, and the two have different causes.

#### Do — and the minimum-change rule points somewhere specific

**Do not build a multi-target planner.** The cheap version is already
available: the Dijkstra that prices the board is a cost function, and a tile
holding a wanted item is worth slightly less to cross than an empty one.
Bending the route toward loot costs a term in an existing price, not a new
layer — and because pickup is free on arrival, a route that passes over an
item has collected it with no further decision.

**The trap.** Make the discount large and it stops being a route preference
and becomes goal selection by the back door, which is `chooseGoal`'s job and
would put two things in charge of one decision. It has to be small enough to
break ties between routes of equal length and no more.

**Sequence after `B16`.** They touch the same routing price, and two changes
to it inside one measurement cannot be told apart. `B16` is a bug and goes
first.

#### Assert

Items collected per floor, and the depth histogram, on the baseline seed
family. **Also report route length** — if the bot walks materially further to
sweep up loot, the discount is too large and is choosing goals.

### Result

**Built as the item scoped it — one term in the existing Dijkstra price, no
new layer. Measured INERT, and the diagnostic says why in one number that
is more useful than the fix.**

#### What shipped

`routeItemDiscount` builds a set of tiles holding a WANTED loose item and
subtracts `ROUTE_ITEM_DISCOUNT` from their crossing price in the main
routing field. Wanted means "has a mechanical effect" — the same test
`ITEM_VALUE` already uses, not a second opinion about what counts as
reward. Chests are excluded: opening one blocks and costs a turn, so a
chest is never free on the way and belongs to `chooseGoal`, where it is.

**Tiles with a live creature on them are excluded too.** Walking in attacks
and the hero stays put, so the item is not collected on the way — the
discount would be paying for a pass-through that cannot happen. True both
before and after M40, since the hero never enters the tile either way.

**The bound is the design.** At 1/25th of `STEP_COST_IN_HP` a route would
have to cross 25 wanted items to pay for one tile of detour, against a
floor that generates `CHEST_COUNT` at most. That is what keeps it a
tie-breaker rather than goal selection by the back door. `Math.max(0, …)`
guards the price floor because Dijkstra needs non-negative weights and a
negative one corrupts the field silently rather than throwing.

#### Measured — paired, in-tree ablation, 300 runs

Both arms are the same source in the same process, differing only in the
`routeItemDiscount` setting. That is deliberate: M41 landed and M40 was
sitting uncommitted in the tree during this work, and an in-tree paired
ablation is immune to both — each arm sees the identical tree.

    metric                off        on       diff       z    runs changed
    items picked up     17.990    17.983   -0.0067   -0.43        3 / 300
    pickups per floor    2.615     2.614   -0.0006   -0.86        3
    depth                5.923     5.923    0.0000    0.00        2
    ROUTE: actions     654.220   653.413   -0.8067   -1.41       16
    ROUTE: turns       649.223   648.420   -0.8033   -1.41       16
    kills               26.730    26.723   -0.0067   -0.25        3

    depth histogram   floor    1   2   3   4   5   6   7   8   9  10
                      off     20  29  27  25  30  35  25  43  21  45
                      on      20  29  27  25  31  34  24  44  21  45

**Nothing clears 2σ, and the trap did not fire.** Route length moved
*down*, not up (z = −1.41) — the opposite of the direction the item said to
watch for. Three runs in three hundred changed what they picked up.

#### Why it is inert, and it is NOT B10's reason

B10's inert tie-breaker was explained by "routes of exactly equal cost are
rare". I expected the opposite here — on a floor with nothing awake every
tile costs exactly `STEP_COST_IN_HP`, so equal-length routes tie exactly
and ties should be everywhere. That prediction was wrong about the
conclusion but right about the mechanism, and the real reason is simpler:

    decisions sampled                                  42,872
    mean wanted loose items on the floor                 0.066
    turns with ANY wanted loose item                      6.5%
      ...of those, the bot's goal ALREADY IS that item     93%
    turns where the discount could possibly matter         0.5%

**There is almost nothing to bend toward.** A loose item exists only
between the moment a chest spills or a creature dies and the moment the bot
walks over it — and `chooseGoal` already makes it the goal in 93% of those
turns. The routing discount is left with half a percent of turns, and only
the tie-broken subset of those.

**This also re-frames the observation the item came from.** "Walked past
loot to a distant creature" is real, but the population it belongs to is
0.5% of decisions. A multi-target planner — which the item correctly told
me not to build — would be a new layer chasing that.

#### One test, and the one that could not be written

The trap half is locked: the router must not bend down a side passage
toward an item unless `chooseGoal` chose it.

**A fixture for the positive half was attempted and abandoned**, and the
failure is itself the finding: any item close enough to lie on a
tie-breaking route is also valuable enough that `chooseGoal` makes it the
GOAL, so the ablated arm collects it too and the fixture isolates nothing.
Recorded in the test file rather than deleted quietly.

#### Shipped ON, with a caveat for X5

On, because it cannot cost anything — bounded below one step by
construction, and route length measured flat-to-down. Turning a correct
tie-break off would mean deliberately routing past free loot when the
alternative is genuinely free.

**But it adds a dial that does nothing measurable**, which is exactly what
`CLAUDE.md`'s minimum-change rule is suspicious of. No existing dial could
carry it — `FRONTIER_REVEAL_WEIGHT` prices unseen tiles revealed, a
different quantity — so it had to be new or not exist. **Flagging it as an
X5 candidate:** if the project would rather have one fewer dial than a
free-but-idle one, this is a clean delete, and the number that justifies
either choice is now on record.

**Files touched:** `src/bot/bot.js` (`routeItemDiscount`, wired into the
main field), `src/sim/balance.js` + `docs/balance.md` (the new dial, same
commit per the house rule), `test/tests.js` (one test). 154 green.

**Made stale:** none of the three. `bot-strategy.md` §3.1 already describes
the board price as a Dijkstra cost function that the router reads, which is
still exactly what it is; the discount is a term inside a price the section
already covers, not a new stage or a changed objective. `rules.md` did not
move — no engine change. `map-design.md` did not move.

#### Review — adopted as a finding. **Ship it OFF, not ON.**

**The measurement is the best this project has produced and the method is why.**
Paired in-tree ablation — both arms the same source in one process — so M40
sitting uncommitted and M41 landing mid-work could not skew it. That is the
contamination that bit M39 two days ago, avoided without being told.

    items picked up   17.990 -> 17.983   z -0.43
    depth              5.923 -> 5.923    z  0.00
    route: actions   654.220 -> 653.413  z -1.41
    kills             26.730 -> 26.723   z -0.25

Nothing near 2 sigma, and route length moved DOWN — the opposite of the failure
direction the item said to watch.

**The diagnostic is worth more than the change.** Over 42,872 decisions a
wanted loose item is on the floor in 6.5% of them, mean 0.066 at a time, and in
**93% of those the bot's goal already IS that item**. The discount can matter
in **0.5% of turns**. That number is what says "do not build the multi-target
planner", and it was the item's real question.

**It also right-sizes the observation that spawned it.** "Walked past loot to a
distant creature" is real and lives in 0.5% of decisions. **The thing the owner
was actually watching is not this** — it is `B18` and `B19`, where a creature's
`net` reads 250 against loot's 1. This item was scoped to loose items on the
route, and chests are correctly excluded because opening one blocks and costs a
turn, so it is never free on the way.

#### The one thing I am overruling

**It shipped ON, and it should be OFF.** The reason given — "it cannot cost
anything" — is not the project's test. `CLAUDE.md` says a new parameter is the
last resort and that measured-and-rejected flags are **left in the code with
the number that killed them in the comment**. That convention exists precisely
for this case, and it does not say ON.

A dial that provably does nothing, left enabled, is a term every future
measurement carries and nobody can attribute. Off, with `z −0.43` in the
comment, it is a recorded answer instead — and it flips back in one character
if a future change makes loose items abundant enough to matter.

**Not an X5 question.** X5 classifies dials whose status is unknown; this one's
status was established by the measurement in this very item. Decide it here.

**Do:** default it off, keep the code and the comment, and record the finding
in `decisions.md` — the 0.5% ceiling is the transferable part, not the dial.

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

# What the map still has to do

The open half of `map-design.md`'s four properties. Each of these owns a property that is measured as not met.

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

# The player's choice

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

### I9 · a conditional survival table, so coin can be priced in hp

`metrics agent` · **BLOCKED on `finishes` being non-zero** — see below; the
proposal said "can be done now" and that is the one thing in it that does not
hold

Metrics agent proposal, filed with the reasoning intact. Nothing implemented.

**Reframed after the owner refined the primary objective — this is worth more
than it was filed as.** `P(finish | state now)` is not just a discount factor
for pricing coin: it **is** "hope", which `docs/project/objectives.md` names as
the property that must never reach zero. Whatever else this table is for, it is
the only proposed instrument for the game's primary objective. That does not
unblock it — it still needs a non-zero finish rate to have signal — but it
raises what it is worth building once that lands.

**This item now carries the instrumentation half of that objective, moved out
of `objectives.md` when that file was cut back to strategy.** The root document
states the property and names no instrument; the instrument is this. Two things
came with it:

- **The conditional is the whole point.** "Hope" is the chance of completing
  from where the hero *actually stands*, not the run's overall rate — which is
  the same distinction the pricing argument below already makes for coin, and
  it is the reason both live in one item.
- **The diagnosis the objective produced.** With finishes near zero, hope is
  near zero for most of most runs. That is the **"too rare, hope goes with
  it"** failure the owner named, and it means the current state fails the
  primary objective *on its own terms* rather than merely being hard. It is
  also why this item being blocked matters more than it looked: the thing it
  is blocked on is the thing the objective needs.

**One caveat on the objective's own terms, since the property is broader than
this instrument.** Hope does not have to be hope of *winning* — the objective
says hope of something not yet decided, and a run carrying several open
questions degrades where a run carrying one goes to zero at once.
`P(finish | state now)` measures only the finish question. A run reading zero
on this table is not automatically a run with no hope in it; it is a run whose
*finish* is decided. That gap is real and this item does not close it.

#### What the proposal establishes, and it holds up

**Coin's price in hp is settled and was not guessed.** The shipped table
(shield 1, dagger 5, axe 8) lands within 5% of the same exchange rate against
what `loot.js` really charges via `campaignCost` with and without the item —
three items agreeing on one rate is a validation, not a coincidence.

**Coin only has value if the run banks it, so it must be discounted by the
chance of finishing — and by the CONDITIONAL chance from where the hero
actually is, not the overall run rate.** This is the strongest part of the
proposal and it avoids a trap this project has already been burned by:
`decisions.md` records that depth does not make the game more forgiving, it
makes the surviving sample more exclusive, and that buffer's sign flips
between floors 1-6 and 1-10 purely from selection. A hero on floor 8 is not an
average hero. Using the global rate would misprice every deep decision, in the
direction that matters most.

**The marginal-turn derivative is correct.** With coins per floor as
`10 × xp / turns`, the derivative with respect to turns is `−10 × xp / turns²`,
so the cost of a turn is that times hp-per-coin times the conditional success
chance. The algebra checks.

#### Three corrections before this gets built

**1. It prices a WASTED turn, not a turn.** The derivative holds xp constant
while turns rise, which describes walking, dithering, and pacing. A combat turn
raises xp *and* turns — the full change is `(t·dxp − xp·dt) / t²`, and a fight
that pays enough xp is net positive. Applied blindly to every turn this would
tell the bot that fighting is expensive, which is the opposite of what it
means. State the scope in the code or the next reader will misuse it.

**2. Weapon belongs in the first cut of the axes, not deferred.** The proposal
suggests floor × effective hp first, weapon as a later binary. But
`docs/rules.md` establishes that **weapons are the only thing in this game that
makes the hero permanently stronger** — and the M29 measurement puts one
dagger at roughly half a floor of survival (mean death floor 3.5 against 2.95
with the guarantee off). Two heroes on floor 5 with identical effective hp, one
holding an axe and one unarmed, do not have the same prospects, and blurring
them is blurring the axis that carries the most signal. Sample size is not the
obstacle it looks like: the table is precomputed offline, so more cells is a
compute cost, not a data-availability one.

**3. A precomputed table is a measurement snapshot, and this project just
deleted two of those for rotting.** `map-design.md` carried spine-mass readings
that drifted about twenty points from reality; `rogule-spec.md` still asserts a
monster table the game abandoned. Both rotted for the same reason: no owner and
no rule. **A survival table baked into the bot's pricing has exactly that
shape** — dials move (they are moving this week) and it silently misprices
without anything failing. It needs one of: regeneration as a step in the
balance workflow, or a test that re-measures a few cells and fails when the
stored table drifts past a tolerance. Pick one deliberately rather than
discovering the need later.

#### Why it is blocked, and on what

`finishes` reads **0% to 1.3%** across every recent measurement — and U6f later
established it is about **0.25%**, one run in four hundred, with every 0%
reading an artefact of n=60-80 rather than a dead metric. Near zero either way,
and that starves the table from both ends at once:

- **Shallow cells have plenty of samples and no signal** — almost nobody
  finishes from floor 1, so `P(success | floor 1, any hp)` is indistinguishable
  from zero, and a rate near zero needs a far larger sample than anything run
  so far to separate from zero at all.
- **Deep cells have signal and almost no samples** — `P(finish | reached floor
  8)` is genuinely interesting, but few runs get there to measure it.

**And the deep cells are the ones that matter**, because they are where coin
plausibly banks. The table would be mostly noise exactly where it needs to be
sharp.

**The unblocker is already in hand:** the owner is working on `finishes`
directly with this same agent. Build the table against that, not against
today's numbers — and record the finish rate it was measured at, because the
table is only valid for the difficulty it was measured under.

#### What it still does not resolve

The table gives a price. It does not let the bot act on one: no coin term
exists in the bot, and there is nothing to buy until the shop is real. The
sequencing the proposal itself gives is right — table, then a working economy,
then bot decisions — and `U6e`'s own notes already carry the standing warning
not to feed the coin formula into `chooseGoal` as a decision price when that
day comes.

# Debt

None of it changes the game. All of it makes the next change cheaper or stops a document lying.

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

### E1 · expose a resumable turn loop from src/sim

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
