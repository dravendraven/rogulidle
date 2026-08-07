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
| 1 | M24 | Cap the tier from above too — floor 1 can roll wolves and ogres | READY |
| 2 | M19 | Pay for the harder opening with loot, sized after M18 and M17 land | READY |
| 3 | M21 | Deep floors put a creature in the room where the hero lands | BLOCKED on M19 |
| 4 | X1 | Delete what nothing references | READY |
| 5 | M4 | Side-room risk/reward spread scales with depth | READY · M22 dropped, so it lives |
| 6 | E1 | One resumable turn loop in src/sim, instead of four copies | READY |

The M11–M16 batch is done and closed — six items, one commit each, 89 tests
green. What it taught is in `docs/project/decisions.md`; the specs are in
git.

**Nothing has looked at `run-check.html` yet.** That was the checkpoint for
the batch and it is still owed, before M17 changes the same dials again.

Closed work is in `docs/project/decisions.md`. Parked and unscheduled is in
`docs/project/candidates.md`.


## M24 · the ceiling is a centre, not a cap

`work agent` · **READY** — before M19

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

## M19 · pay for the harder opening with loot

`work agent` · **READY** — after M18 and M17, sized to what they actually did

M18 makes the bottom tier bite and M17 puts about five creatures on floor 1
instead of two. The hero meets that with 10 hp and one axe. If the opening
becomes a wall, the compensation is loot, not a difficulty rollback —
floor 1 being genuinely dangerous is the point.

**Size it to the measured problem, not to this item's guess.** Nothing here
should move until M18 and M17 have landed and `run-check.html` says how much
the opening actually changed. If it turns out fine, this item closes
unbuilt, and that is a good outcome rather than a wasted one.

**The measurement says which lever, and it is not the cheap one.** M17's
review does the floor-1 arithmetic: the hero starts with no weapon, deals
0.83 hp a turn, and needs about fifteen turns to clear five creatures that
deal 0.42 each per adjacent turn. Fought singly it survives; fought in pairs
— and clusters measure 1.77–2.10 — it dies. Four runs in five now end by
floor 2.

**Richer chests further in do not help a hero that dies on the way to
them.** A weapon does: an axe takes output from 0.83 to about 2.5 a turn and
cuts fifteen turns of combat to five. Start with the guaranteed-weapon
lever, not the cheap one.

**The levers, cheapest first.**

- **Early chests hold better loot.** `CHEST_QUALITY_BY_DEPTH` makes depth
  buy quality, so floor 1 is currently the poorest floor as well as about to
  become a dangerous one. Offsetting it near the top is one constant and no
  new mechanism.
- **More chests on shallow floors.** Costs more: `balance.md` keeps chests
  flat *deliberately*, so that threat outpaces supply, and tying them to
  anything undoes an argument that was measured. Only if quality is not
  enough.
- **A guaranteed weapon or potion near the spawn.** Surgical and reliable,
  but it is a new mechanism and a new rule, so it earns a `§13` entry.

**What not to do.** Do not lower the floor-1 roster or soften the tier. That
undoes M17 and M18 in the same breath as shipping them, and the question
those items exist to answer is whether a dangerous opening is good — which
cannot be answered by making it safe again.

**Watch.** Richer early chests feed the hero for the whole descent, not just
floor 1 — gear carries down the stairs. A change sized to fix floor 1 can
easily make floors 5–10 too easy, and `finishes` is where that shows up.

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

**Blocked on M19, not just ordered after it.** `run-check` at n=30 says
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

`chore` · `work agent` · **READY**

Roughly 1200 lines of code and 400 of docs exist because nobody removed
them. Each was built for a question that has since been answered or
abandoned, and every one of them is a thing a future session has to read and
decide is irrelevant.

**Zero references anywhere — delete outright.**

    src/analysis/features.js     170
    src/analysis/winnable.js     109
    src/analysis/power.js         61
    src/bot/placeholder.js        43

Verified with a grep across `src/`, `*.html` and `test/`. Re-verify before
deleting rather than trusting this list.

**Superseded and already declared so — delete with their pages.**

    src/analysis/curve.js  +  run-curve.html
    src/analysis/shape.js  +  run-shape.html

`curve.js` prices clean 1v1 duels and read 0.23 on a floor that killed four
heroes of seven; `CLAUDE.md` already says it is "kept only until curve.js
goes". `shape.js` is built on `campaignCost`, which was retired for the same
reason and replaced by `observed-ruler.js`.

**One-off pages whose items are closed.**

    run-cluster.html    served I2
    run-i3.html         served I3

**And the rest of the pages, once I8's `run-check.html` works** —
`run-ruler.html`, `run-lab.html`, `run-batch.html`. One metrics page is the
target. Their modules stay; only the pages go. Coordinate with I8 rather
than deleting ahead of it.

The analysis modules they drive stay — `clustering.js` is still the source
of the finishes and per-turn damage numbers.

**Docs — already done.** `kpi.md`, `curve-shape.md`, `clustering-i2.md` and
`clustering-i3.md` are deleted; `decisions.md` is now a findings list rather
than a transcript.

**Do not touch.** `hardness.js` (run-lab uses it), `batch.js`,
`clustering.js`, `observed-ruler.js`.

**After the M11–M15 batch, not during.** That batch is editing `spawn.js`
and `difficulty.js`; this touches `src/analysis/` and pages. They would not
conflict, but a deletion commit landing between two behaviour commits makes
a bisect harder to read if the batch turns out to have broken something.

**Assert.** `run-tests.html` still green, `index.html` still plays a
descent, `run-ruler.html` and `run-lab.html` still produce numbers. Nothing
else — this item removes, it does not change behaviour.

**If something turns out to be referenced after all, leave it and say so.**
The list is a grep, not a proof.

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

