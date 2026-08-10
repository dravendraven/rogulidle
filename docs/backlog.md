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
| **A run has to be completable** | M38 · M37 · M36 | phase A. **Everything else waits on this** |
| **The return — floors 11 to 20** | R1 · R2 · R3 · R4 · R5 | phase B/C. Specs in the roadmap above; no item bodies yet |
| **The potion arc** | B15 · I12 · I12b | M35 and B14 shipped; the policy and the verdict are left |
| **What the map still has to do** | M4 · M21 · X6 · M32 | each owns a map property measured as NOT met |
| **The player's choice** | U7 | phase D. The only theme the player touches |
| **Instruments** | I11 · I9 | I11 reported; I9 blocked, and the return moved its target |
| **Debt** | X1 · X2 · X3 · X5 · E1 | changes no behaviour; makes the next change cheaper |

### A run has to be completable — phase A

| # | id | what gets done | agent | status |
|---|---|---|---|---|
| 1 | M38 | The hero starts the run armed | work | REPORTED |
| 2 | M37 | A setback needs room between "no effect" and "dead" | work | owner to place |
| 3 | M36 | A detour has to be able to cost the run | work | owner to place |

**Measured, and it decides the order:** three quarters of runs are over by
floor 3. The ramp's top decides floors that 96% of runs never see, so tuning
it is work spent where nothing happens. M38 is the cheapest single value that
moves the binding constraint.

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
| 1 | I12b | Split drunk into useful and wasted | metrics | READY |
| 2 | B15 | A drink policy that reads the danger field | bot | READY · B14 left a number to beat |
| 3 | I12 | Did the potion change move anything? | metrics | baseline recorded · comparison owed |

### What the map still has to do

| id | what gets done | agent | status |
|---|---|---|---|
| M4 | Side-room risk/reward spread scales with depth | work | READY |
| M21 | Deep floors put a creature where the hero lands | work | READY · read its own warning on `finishes` |
| X6 | Collapse the tier clamps, redundancy proven first | work | after X5 · owns the tail-shape cause |
| M32 | Weapons become a tier ladder instead of a stack | work | BLOCKED on the lab |

### The player's choice

| id | what gets done | agent | status |
|---|---|---|---|
| U7 | The player chooses which hero to play | work + ui | phase D |

### Instruments

| id | what gets done | agent | status |
|---|---|---|---|
| I11 | Does the ruler read true when the starting hero changes? | metrics | **RETURNED** · knob shipped, reading never taken |
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

### M38 · the hero starts the run armed — the cheapest test of phase A

`work agent` · **REPORTED** · head of phase A · owner-approved, and it is one
value, not a mechanism

#### Why this one and not the ramp

Measured while placing this item, `descentCheck` n=200 on seeds 3000000+,
deepest floor reached:

| floor | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| runs | 16 | 59 | 54 | 24 | 14 | 14 | 8 | 7 | 3 | 1 |

**Three quarters of runs are over by floor 3.** So the ramp's top decides the
difficulty of floors that 96% of runs never see, and tuning it is work spent
where nothing happens. The binding constraint is the opening.

**The mechanism, which is a bootstrap and not a tuning miss.** Since M26 a
weapon only drops from a creature. The hero starts with none, so kills come
slowly and cost more hp — and the way to get a weapon is to win a fight, which
is the thing being done badly. Nothing in the first two floors breaks that
loop.

**Also measured and rejected before proposing this:** flipping
`WEAPONS_WIDEN_ROLL` doubles what each weapon point is worth and needs no new
machinery — but with zero weapons carried, both modes are the same roll. It
cannot help where the runs actually end. Recorded so nobody reaches for it as
the obvious cheap lever.

#### Do

**Give the hero one dagger at the start of a run.** `startingItems` already
does exactly this and needs no code: it is applied before `carry` and loses to
it ([game.js:80](../src/sim/game.js:80)), so floor 1 gets the item and floors
2–10 come through `carry` with whatever the hero actually has. **Once per run,
by construction** — that property is already true, do not add a guard for it.

It is the same path the shop uses (U6d/U6e), which is the point: a starting
weapon is not a new kind of thing, it is the thing the shop already grants.

#### Measure — this is half the item, not a formality

**The comparison is the table above, not `finishes`.** At 0.25% the finish
rate cannot resolve a change at any sample this project will run, but the
depth distribution moves visibly at n=200. Report the same histogram, before
and after, on the same seed family.

**The one number that decides whether this worked:** the share of runs ending
by floor 3. It is 0.745 today.

**Two traps, named because both have caught this project.**

**The denominator.** A hero that survives longer plays more floors and more
turns, so every per-turn and per-floor rate moves for that reason alone. Totals
and outcomes first; if a ratio is unavoidable, say what its denominator did.

**Do not stop at "it got better".** A starting dagger also makes early
creatures cheap, which is the other failure direction: if runs now die at floor
6 instead of floor 3 because floors 1–3 became trivial, the opening stopped
being a filter and `map-design.md`'s property 1 says the opening is hard on
purpose. Report the whole histogram so that shows up instead of hiding behind
a better median.

**Also report `potionsDrunk`, `healDelivered` and `deathsHoldingPotion`.** B14
shipped hours ago and priced potions against a ten-floor horizon; a hero who
survives deeper is the first real test of that pricing.

#### What this does NOT settle

**It does not make a twenty-traversal run completable**, and it is not meant
to. It is the cheapest single value that moves the binding constraint, chosen
so the next decision is taken against a measurement rather than an argument.
M37 and M36 still own the shape of the problem.

**If it barely moves,** that is the useful outcome: it means the opening is not
a gear bootstrap and the hp buffer or floor 1–3 mass is the next candidate.
Say so plainly rather than reaching for a second dial in the same commit.

#### Report

**It did not barely move.** `descentCheck` n=200, seeds 3000000+, same seeds
both arms. The before arm reproduces this item's own histogram exactly.

| floor | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| before | 16 | 59 | 54 | 24 | 14 | 14 | 8 | 7 | 3 | 1 |
| after | 8 | 23 | 43 | 32 | 21 | 21 | 14 | 17 | 11 | 10 |

Runs ending by floor 3 **0.645 → 0.370**, paired McNemar z=6.82 — 60 runs
escaped the opening, 5 were newly trapped. Paired depth difference **+1.40
±0.16**, z=8.55; 112 deeper, 67 unchanged, 21 shallower. Cleared all ten:
**0 → 5**, on seeds where the before arm cleared nothing.

**The item's headline number does not match its own table, and the table is
the one that is right.** The item states the share ending by floor 3 as
0.745; its histogram sums to 129/200 = **0.645**, and my before arm
reproduces that histogram run for run. Measured against 0.645.

**The opening still filters — the check that mattered more than the
improvement.** Floors 1 and 2 still end 31 runs of 200 and 37% still end by
floor 3. The mass did not relocate to a new wall further down: it left the
2–3 pile and spread across the whole ladder, floors 7–10 going 19 → 52. The
distribution got wider, not shifted, so `map-design.md` property 1 survives.

**Denominator, named.** Floors played 695 → 975. `potionsDrunk` 275 → 412 and
`healDelivered` 825 → 1236 rise about 40% with it; `potionShareDrunk` barely
moves, 0.606 → 0.649. B14's policy behaves the same, there is just more game.

**B14's pricing holds on its first real test.** `drinksWasted` and
`healOverheal` are still exactly zero with heroes now reaching floor 10.
`deathsHoldingPotion` reads 1.05% → 3.72% of deaths (deaths 190 → 188, so the
denominator held) — **z=1.70, under the 2σ bar, not explained here.** I12's
tripwire, I12's number.

**One call the item did not cover.** `startingItems` now means "on top of the
kit" rather than "instead of it". Forced by the callers: `spectator.js` passes
`getHeldItems()`, which is `[]` and truthy when nothing was bought, so a `??`
default would be silently defeated in the path a person watches — and a hero
who bought a shield would otherwise lose the dagger for it, making a purchase
strictly worse than none. Two U6d tests asserted the old meaning and were
updated to the new one.

Stale and fixed here: `rules.md` §5.

#### Review — adopted, and it is the largest single result phase A has had

**Verified independently, same seeds, same numbers.** Histogram
`8 23 43 32 21 21 14 17 11 10`, share ending by floor 3 `0.370`, cleared 5.
**`finishes` went from ~0.25% to 2.5%** — an order of magnitude from one
value, and the first time this project has had a finish rate it can measure
without heroic sample sizes.

**The check that mattered more than the win passed.** The item warned that
"it got better" could hide a trivialised opening, and it did not happen:
floors 1–2 still end 31 of 200, 37% still end by floor 3, and the mass
*spread* across the ladder (floors 7–10: 19 → 52) rather than relocating to a
new wall. `map-design.md`'s property 1 — the opening is hard on purpose —
survives.

**My arithmetic was wrong and the report caught it.** The item stated the
baseline as 0.745; its own histogram sums to 129/200 = 0.645, which is what
the before arm reproduces. Measured against the right number, and said so
instead of quietly using it.

**One change beyond the item, and it is right.** `startingItems` now means
"on top of the kit" rather than "instead of it". Forced by the callers, not
chosen: `spectator.js` passes `getHeldItems()`, which is `[]` and truthy when
nothing was bought, so a `??` default would be defeated in exactly the path a
person watches — and a hero who bought a shield would otherwise lose the
dagger for it, **making a purchase strictly worse than no purchase**. That is
a defect the item never anticipated, found by reading call sites rather than
by testing.

**B14's pricing held under a hero that now reaches floor 10.**
`drinksWasted` and `healOverheal` both still exactly zero, with floors played
up 695 → 975. That is the first real load that pricing has carried.

#### Three consequences, none of them blocking

**The shop is now selling a second dagger.** Every hero starts with one, and
M32 already measures the second weapon point at roughly half the first. The
shop's cheapest weapon just became its worst buy. Not urgent — M32 owns the
fix and is blocked on the lab — but the shop's own arithmetic moved today and
nobody has looked.

**I11's question just went live for real.** The instruments are anchored to a
hero starting bare; no hero starts bare any more. I11 reported on exactly
this and its answer now applies to every number this project takes.

**2.5% is not phase A finished.** Victory is about to need twenty traversals,
not ten. This bought an order of magnitude at the point where it was cheapest;
whether the same lever has a second pull, or whether M37 and M36 are what is
left, is the next decision — and it should be taken against a measurement
rather than an argument, the same way this one was.

### M37 · a setback needs room between "no effect" and "dead"

`work agent` · **NEW, unqueued — owner to place** · **filed because the
objectives review found it unowned; no existing item covers it**

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

`map` · `work agent` · **NEW, unqueued — owner to place** · this corrects a
diagnosis `map-design.md` carried and has now retired

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

### I12b · a wasted drink is now visible — teach the instrument to see it

`metrics agent` · READY · **small, and it exists because M35 made it
possible** · do it with or before B14

`clustering.js`'s `potionsDrunk` counts `heal` log events. That was the only
option when the instrument was written — one commit before M35 landed — and
it is still a correct count of potions *consumed*.

**But `amount` is now the hp actually gained, so a drink that healed nothing
logs 0.** Splitting drunk into useful and wasted is a filter on a field that
already exists: no new instrument, no new pass over the runs.

**Why it is worth the few lines.** B14 ships a policy that drinks whenever
nothing would be wasted, and B15 has to beat it. "Wasted drinks" is the
direct measurement of a policy drinking at the wrong moment — the same defect
`deathsHoldingPotion` catches from the opposite side, one drinking too early
and one too late. With both, a drink policy is bracketed. With neither, only
`finishes` moves and nobody can say why.

**Tripwires, not scoreboards** — both numbers fire and point at a defect;
neither is a quantity to push.

**Assert.** A run where the bot drinks at full hp reports it as wasted and
not as useful. Totals alongside shares, per I12's own denominator warning.

# What the map still has to do

The open half of `map-design.md`'s four properties. Each of these owns a property that is measured as not met.

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

### I11 · does the ruler still read true when the starting hero changes?

`metrics agent` · READY · **already live — the shop changes the starting hero**

The instruments are implicitly anchored to a hero that starts at
`PLAYER_HP`'s value with nothing in hand. `docs/project/decisions.md` records
why that matters: **growth rates are not scale-invariant** — the same hp grant
reads ×1.011 per floor on a 400 hp probe and around ×1.20 on a real hero's ten.
Move the starting point and a rate measured against the old one may not
describe anything.

**This is not hypothetical and it is not waiting on a future feature.** U6d
shipped `startingItems` and U6e spends coin on it: **a hero can already begin a
run holding gear**, and once the shop has money the anchor moves every run. Any
reading taken across that boundary is comparing two different heroes.

**Where this came from.** `I5` asked a version of this and was deleted in a
documentation cut. Its original framing — the ruler cannot see the buffer where
the target lives — is genuinely obsolete, since buffer targets are gone. The
question underneath is not, and this refiles only that half rather than
restoring the item.

**Do.** Take a reading that already exists, re-take it with a hero starting
armed, and say whether the shape holds or only the level moves. If the shape
holds, the instruments generalise and that is worth knowing in one line. If it
does not, every instrument needs its anchor stated alongside its number.

**Assert.** The same quantity at two different starting heroes, same seeds.
Report whether the *shape* survives, not whether the numbers match — they will
not, and that is not the question.

**Blocks two unscheduled features** (`U8`/`U9` in `candidates.md`) which need a
ruler that survives a changed starting hero, but it is worth doing on the
shop's account alone.

#### Review — the capability shipped, the answer did not. RETURNED.

**What landed is good and I would not undo it.** `startingItems` now reaches
`descentCheck` and both of `observed-ruler`'s descent drivers, forwarded the
way `playDungeon` already forwards it, so `carry` still wins from floor 2 and
it only ever arms floor 1 — which is what the shop actually does. Undefined by
default, so every earlier reading reproduces. Without it the anchor question
could only be asked by hand-building a carry hero, which would have meant a
second copy of `grantArmour`.

**But that is the knob, not the reading.** This item's Do says: take a reading
that already exists, re-take it with a hero starting armed, and **say whether
the shape holds or only the level moves**. Its Assert says: the same quantity
at two starting heroes, same seeds, reporting whether the *shape* survives.
Neither was done. The report describes plumbing and stops.

**The find along the way was real and is separately adopted.** The Map cost
table's denominator came from a hero with death suppressed and no regen, so hp
pinned at 0 — the page printed `Infinity` on four of ten floors. Sourcing it
from the mortal series is right, costs one fewer descent, and refusing a
`?? PLAYER_HP` fallback was the right call for exactly the reason given. That
is a good bug, found while building the knob. **It is not this item's
question.**

#### And the question stopped being hypothetical while this sat REPORTED

M38 shipped `STARTING_ITEMS`: **every hero now starts armed.** The item was
written as "the shop *can* move the anchor once it has money". The anchor has
now moved unconditionally, for every run, with no purchase involved.

**One consequence nobody has stated, found by reading the drivers.**
`driveDescent` sets `carry = startHero ? carryFromPlayer(startHero) : null`.
With `startHero: null` there is no carry on floor 1, so `newGame` applies
`STARTING_ITEMS` — **and the probe silently starts holding a dagger, then
carries it down.** With `startHero: PROBE_HERO` the carry overwrites the
inventory outright and the probe never sees it.

So the two probe modes now disagree about the hero by default, and neither
asked to. `capacityShape({ startHero: null })` is exactly the path the cost-table
fix above just moved onto.

**Do, and it is smaller than the original item.** Take one existing reading at
both anchors on the same seeds and answer the shape question in a line or two.
Then state, in the code, which anchor each probe mode is using — the defect is
not that they differ, it is that they differ by accident.

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
