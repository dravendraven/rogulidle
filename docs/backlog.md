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
| 1 | I8 | One page: three levels, twelve numbers, success and health | REPORTED |
| 2 | M18 | The rat gets a real attack and a real chase radius | READY |
| 3 | M17 | Near-flat roster, ~5 to ~8, with strength carrying the difficulty | READY |
| 4 | M19 | Pay for the harder opening with loot, sized after M18 and M17 land | READY |
| 5 | X1 | Delete what nothing references | READY |
| 6 | M4 | Side-room risk/reward spread scales with depth | READY |
| 7 | E1 | One resumable turn loop in src/sim, instead of four copies | READY |

The M11–M16 batch is done and closed — six items, one commit each, 89 tests
green. What it taught is in `docs/project/decisions.md`; the specs are in
git.

**Nothing has looked at `run-check.html` yet.** That was the checkpoint for
the batch and it is still owed, before M17 changes the same dials again.

Closed work is in `docs/project/decisions.md`. Parked and unscheduled is in
`docs/project/candidates.md`.


## I8 · one page: three success numbers, nine health numbers

`metrics agent` · **REPORTED** — this supersedes the two earlier drafts of I8

`run-ruler.html` reports nine quantities, four ratios, growth exponents and
standard errors. Right for settling an argument, wrong for the question
actually asked, which is **"is this any good?"**

Build `run-check.html` to answer that. Three levels, and each gets **one
success number and three health numbers.** Nothing else.

**Success is "did it work". Health is "has it rotted".** They are different
questions and mixing them is what made the old targets table unreadable.

### Product — is a run worth watching

    SUCCESS   median depth reached          higher, ~7 of 10
    health    finishes                      the end is reachable at all
    health    turns between events          a kill, a chest, a floor — how long between
    health    spread of depths reached      runs end differently, not all on floor 3

Median depth is the closest thing to "is there a story". A run that dies on
floor 2 has no arc however good the numbers are.

### Map — does the floor do its job

    SUCCESS   cost, floor 10 ÷ floor 1      higher, AND rising every single step
    health    creatures per floor           the floor is populated
    health    spread within a floor         two floor-7s differ from each other
    health    loot against cost             there is something to gain

The success number **fails outright if any step goes backwards**, however
good the ratio. Name the floor in red: "floor 5 is cheaper than floor 4".

### Bot — does it play well

    SUCCESS   damage per kill               lower
    health    reversal rate                 it stops pacing back and forth
    health    turns per floor               it stops wandering
    health    lost fights started           near zero

**Not win rate.** `balance.md` records why: *"win rate mixes bot quality
with map difficulty; damage and blows per kill do not."* A page whose
sections get read side by side must not carry a number that moves when a
different section's subject changes.

`finishes` is the one exception, sitting in Product where it belongs, and it
**gets a label saying it moves with both.**

### Rules for the page

**Totals, not exponents.** "Floor 10 costs 15× floor 1" reads. "×1.351 per
floor" does not. Growth rates are small print if they appear at all.

**Every number carries its meaning and its good direction, on the page.**
Nobody should need the backlog to read it.

**Nothing new to measure with.** All twelve already come out of
`observed-ruler.js` or `clustering.js`. Anything that would need new
measurement gets left off with a note saying so.

**Seconds to run.** A rough number someone runs beats a precise one they do
not.

**Deliberately absent:** capacity, attrition, buffer, challenge/power, the
four ratios, standard errors, growth exponents. Three attempts to define,
enormous samples to read, and none of them ever told anyone whether the game
was worth watching.

### This is the only metrics page

Not a second page beside the others — **the** one. When it works,
`run-ruler.html`, `run-lab.html` and `run-batch.html` are deleted along with
the ones X1 already removes. `run-tests.html` stays; it is tests, not
metrics.

**The modules stay, only the pages go.** `observed-ruler.js` and
`clustering.js` are where the numbers come from and this page calls them. If
a sweep is genuinely needed later, a page for it is an afternoon — and the
odds are it never is, because the reason there are five pages is that nobody
deleted the last one.

**If something in those pages turns out to be load-bearing and has no home
here, say so and leave that page alone.** One page is the goal, not a rule
worth losing a number over.

### Result

Rebuilt `run-check.html` from scratch for the new structure — the earlier
two-section, five-number draft is gone, not extended. Three `<section>`s
(Product, Map, Bot), each a 4-cell grid: one `success`-styled cell (accent
border, bigger number) and three plain `health` cells, every cell carrying
its own meaning and good-direction text, matching the spec's own wording.
`run-ruler.html`, `run-lab.html` and `run-batch.html` are deleted —
`git rm`, not just unlinked. Fixed the stale pointers that deletion left
behind in `CLAUDE.md`, `README.md` and `docs/observed-ruler.md`'s baseline
section (its own historical numbers untouched, just the "how to reproduce
this" pointer, since `run-ruler.html` is gone but the module functions it
called are not). Did not touch `docs/balance.md`, `docs/project/decisions.md`
or this file's own older items — those are records of what was true when
written, not live documentation, and rewriting history to match a page
that didn't exist yet is the wrong kind of tidiness.

**All twelve numbers exist; none needed touching `src/sim/` or `src/bot/`
to get.** Nine were already sitting in `rewardShape`/`floorPlan` (Map's
four) or a light rename of what `botFinishesAndSpike` was already doing
(Product's finishes). The other three — Product's turns-between-events and
spread-of-depths, and all four of Bot's numbers — needed a genuinely new
pass, because nothing existing tracked a real descent's ACTIONS or its
EVENTS, only its damage log. Built as one new function,
`descentCheck` (`clustering.js`), rather than four separate ones: they all
watch the same real ten-floor bot descents, and running that descent four
times over instead of once would have cost more time than every other
number on the page combined.

**How the three previously-unmeasured Bot numbers turned out to be
reachable without new instrumentation, since that was this item's one
hard constraint:**
- **Reversal rate** — bot.js computes this internally for its OWN reversal
  PENALTY (`action === OPPOSITE[lastAction]`, stated in its own comment)
  but never exposes the rate. `descentCheck` watches the SEQUENCE of
  actions the policy already returns each turn and compares consecutive
  ones against the same trivial opposite-pairing — an outside observation
  of behaviour already happening, not a hook into the bot.
- **Turns per floor** — `state.turn` at the point a floor attempt ends,
  summed and divided by floor attempts. Already there; nobody had added
  it up.
- **Lost fights started** — the one I expected to have to leave off.
  `priceMonsters` (internal to `bot.js`) computes `worthStarting` from
  `duelCost` + `effectiveHp` + a safety margin, all THREE of which are
  already exported (`src/bot/duel.js`, `src/sim/combat.js`,
  `src/sim/balance.js`, the margin as `DUEL_SAFETY_MARGIN`). Reproducing
  `chooseGoal`'s full target selection to know which candidate the bot
  picked would have been new measurement in the bad sense — restating bot
  logic outside the bot. What `descentCheck` does instead is narrower and
  does not need that: "walking into it is the attack" (bot.js's own
  words), so the first turn the chosen ACTION lands on a live monster's
  tile is a fight starting, whichever monster that turns out to be — no
  guess about alternatives needed. Pricing THAT engagement with the bot's
  own published formula, at the moment it actually started, answers
  "was this fight already known lost when it began" using only exported
  pieces, against real state the loop already has, not a re-derivation of
  a decision the bot made.

**Speed, measured on this machine, not estimated:** floor samples at 6,
descents at 2 — `descentCheck` is the entire cost, roughly 5s/descent since
it does more per turn than `botFinishesAndSpike` did (reversal check, fight
detection, event tracking, on top of the same base descent). Landed on
**~11s** total for the default. Two descents is thin — median-of-2 is
barely a median — but a third would have pushed this toward 16s, and nine
of the twelve numbers already come from the cheap side (Map's eight
samples/floor, ~2s). Both counts are page inputs, not constants.

**What surprised me:** reversal rate read 36% on one ordinary run — the
bot reverses on roughly a third of its moves. That happens to sit in the
same range as the OLD parked reversal-rate reading in `run-check.html`
(0.174–0.210, different measurement, different era, kept for the bot lane
being parked rather than deleted) — not close enough to call the same
number, but close enough that the new instrument isn't reading something
wildly different in kind from what B1's old one saw. `lostFightsStarted`
read 0 on every run tried while building this — `refuseLostFights`
appears to be doing exactly its job, which is itself worth having a
number for even when that number is boring.

**Not measured / left off:** nothing from the spec's twelve. The `run-shape.html`
and `run-curve.html` diagnostics (modelled-cost pages, unrelated method,
not named in this item) are untouched — not this item's call to remove.

## M18 · the rat becomes a creature

`work agent` · **READY** — before M17

`MONSTER_TABLE` row 0 is `activation 3, xp 1, hp 2`. Damage is a roll over
`0 .. xp-1`, so a rat's die has one face and it reads **zero**. `threat.js`
skips it from the danger field entirely and `duelCost` returns 0. And an
activation of 3 means it barely wakes.

It is scenery that costs turns. Make it the weakest real creature instead of
a non-creature.

**Do.** Raise `xp` to 2 so it can land a blow, and the activation to
something that chases — around 8. Keep `hp` at 2. Both values are FAITHFUL
and this is a deliberate divergence: `rogule-spec.md` §13.

**Keep it below the bat.** At `xp 2, activation 10, hp 3` the bat is the
next row up; a rat at `xp 2, activation 8, hp 2` is still strictly weaker on
two of three. If the two end up interchangeable, the table has ten rows
instead of eleven and the change cost more than it bought.

**What it moves, and why the order matters.** A rat's mass is `hp × (xp−1)`,
which is `2 × 0 = 0` today and becomes `2 × 1 = 2`. **The bottom tier stops
being free**, so shallow floors get more expensive and the challenge growth
rate falls, since its mean rises at the bottom. M11's `expectedFloorMass`
test reads the shipped parameters and will catch any monotonicity break by
itself.

It also puts rats into the bot's danger field for the first time, which
changes routing on shallow floors.

**Do this before M17.** M17 raises floor 1 from two creatures to about five.
If those five start biting in the same change, nobody will be able to say
which made the opening hard. One at a time, and floor 1 is the floor most
likely to become a wall.

**Assert.** A rat's expected damage is above zero. It wakes and closes from
a distance a floor-1 hero will actually meet. Challenge per floor still
rises at every step — the existing test covers this.

## M17 · a near-flat roster, with strength carrying the difficulty

`work agent` · **READY**

Today the descent goes `2, 2, 3, 4, 4, 5, 7, 8, 10, 12` — floor 1 is nearly
empty and floor 10 is a crowd. Try the opposite: **about 5 creatures on
floor 1 and about 8 on floor 10**, with the difficulty coming from what they
are rather than how many.

**This is the third attempt at this axis** and the two before it are why it
might work now. It was archived once because count→strength alone never
fixed the CV — the only setting that did left two creatures on every floor.
It came back as M7 with clustering filling that gap. What has landed since
then changes the ground again: clusters exist, the tier floor rises with
depth so deep floors no longer draw rats, and rooms are 64% bigger with
somewhere to put things.

**The arithmetic, so the budget is not broken by accident.** Total challenge
growth holds at ~1.34 per floor, and the two levers trade as
`count × strength^2.356`:

    count   5 → 8 over ten floors   = ×1.053 per floor
    so strength must carry          1.34 / 1.053 = ×1.273
    which is a strength growth of   1.273^(1/2.356) = ×1.108 per floor

`MONSTERS_BASE` goes 2 → 5 and `MONSTER_GROWTH_REBALANCED` 1.22 → ~1.053.
That **replaces** M12's setting rather than adding to it.

**Why it might be better than what is there.** The CV decay from count is
`1/√growth` — today `1/√1.22 = 0.905`, at 1.053 it is `0.974`. Almost all of
the dilution M7 was built to fight simply stops existing. And floor 1 stops
being empty, which is half of what M12 was for and the half it could not
reach from a base of 2.

It also makes M15 work: five creatures against six chests can plausibly
guard them; two cannot, which is exactly why floor-1 coverage sat at 56%.

**The risk, and it is the one to measure.** Strength has to carry ×1.108 per
floor across an 11-row table, ending near 0.885 of it. The top floors would
all draw from the same narrow band — every deep creature a dragon or a
t-rex — and **variety within a floor could fall even as variety between
floors improves**. Those pull opposite ways and only one of them is what
the CV number sees.

Report the tier spread within a floor at 1, 5 and 10, not just the mean.

**Second risk: floor 1 gets 2.5× more crowded.** Against a 10 hp hero with
one axe. Whether that is a real opening or a wall is not something the
arithmetic answers.

**Assert.**
- Creatures per floor at 1, 5, 10 — roughly 5, 6, 8.
- Challenge growth still ~1.34 ±0.03. If it moves, the budget was not held
  and nothing else in the report is interpretable.
- Tier spread within a floor, at 1, 5, 10.
- Where the strength curve saturates the table, by floor.

**Do not adopt it because the arithmetic works.** This one is a genuine
question — the last two attempts at it both looked right on paper and both
were wrong in a way nobody predicted. Build it, look at `run-check.html`,
and watch a few runs before deciding.

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

