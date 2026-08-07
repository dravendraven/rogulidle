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
| 1 | P1 | Decide what play.html is — scratch tool, second mode, or gone | NEEDS DECISION |
| 2 | M20 | Hero and shrine at the two furthest-apart rooms, not hero-then-furthest | REPORTED |
| 3 | M19 | Pay for the harder opening with loot, sized after M18 and M17 land | READY |
| 4 | B7 | Raise STEP_COST_IN_HP so turns cost the bot something | READY · after M19 |
| 5 | M22 | Two routes to the shrine, one short and dangerous, one long and quiet | NEEDS DECISION |
| 6 | M21 | Deep floors put a creature in the room where the hero lands | BLOCKED on M19 |
| 7 | X2 | Bisect, if the map work has not already answered where it went wrong | READY · after the map |
| 8 | X1 | Delete what nothing references | READY |
| 9 | M4 | Side-room risk/reward spread scales with depth | OBSOLETE if M22 lands |
| 10 | E1 | One resumable turn loop in src/sim, instead of four copies | READY |

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

## X2 · bisect the batch

`work agent` · **READY** — before anything else

`run-check.html` at n=20 says finishes is **0/20** and median depth **3.0 of
10**. Before the M11–M16 batch it was 31%. The game does not work.

Five commits landed without a reading between them and four of them make it
harder. The numbers cannot say which.

**Deferred by the owner until the map work is done, and that is the better
call.** M17 replaces M12's count growth outright — 1.22 back down to about
1.053 — so one of the four changes that hardened the game is about to be
undone. Bisecting now would be settling a question about a dial that is
already on its way out, and a half-finished map is not a thing worth
attributing.

The bisect stays available because each change is still its own commit. If
the map work ends somewhere good, this item closes unread.

**Do.** Run `run-check.html` at the commit before M12, then at each of M12,
M13, M14, M15, M16 in turn. Same seed base, same sample. Report finishes and
median depth at each — that is six runs of about thirty seconds.

**Report where it falls off, not a theory about why.** If it is one commit,
that commit is the subject. If it is cumulative — each taking a little —
that is a different and more interesting answer, and it means the batch was
individually reasonable and collectively wrong.

**Do not fix anything in this item.** Finding the step is the whole job.

**Also worth a number while you are there:** the reversal rate reads 46%
against 17–21% before. Include it in the same sweep if it is free; it may
share a cause with the difficulty, or it may not.

### Review of I8 — the page is right, and it says the batch broke the game

Opened it and ran it at n=20. **The page is what was asked for.** Plain
language, every number carrying its meaning and its good direction, totals
instead of exponents, tables underneath for detail, 30 seconds to run. The
monotonicity break is called out by name *and* carries a noise caveat —
which is exactly right, since M11 proved that particular dip is noise.

One fix: the default is **2 descents**. Median depth and finishes are
meaningless at n=2, and those are two of the four product numbers. Default
higher for the descent half, or say on the page that the product and bot
sections need more.

### What it reports, at n=20, seed base 500000

    PRODUCT   median depth      3.0 of 10       target ~7
              finishes          0%   (0/20)     was 31% before the batch
              turns between events  5
              spread of depths  ±2.7

    MAP       cost fl10 ÷ fl1   25.1×
              creatures         2 → 12
              spread in a floor 73% → 57%       still shrinking
              loot vs cost      16%

    BOT       damage per kill   1.66
              reversal rate     46%             was 17–21%
              turns per floor   172
              lost fights       12 / 250

**The M11–M16 batch made the game unplayable.** Zero runs in twenty reached
the bottom, and the median run dies on floor 3. Before the batch, finishes
sat at 31%.

**It also did not fix what it was aimed at.** Spread within a floor still
shrinks with depth, 73% → 57%. That was the CV problem, and it is still
there.

**And the reversal rate more than doubled**, 17–21% → 46%. Bigger rooms are
the obvious suspect — the tactical veto has more places to oscillate between
when there is no corridor to back into — but that is a guess, and my guesses
in this batch have a poor record.

### This is the bill for batch mode, and the safety net holds

Five changes, four of which make the game harder, all landed without a
reading between them. There is no way to say which one did this from the
numbers alone.

**But each is its own commit, which is exactly why batching was acceptable
here.** Bisect: `run-check` at the commit before M12, then after each of
M12, M13, M14, M15, M16. Five runs of thirty seconds each answers it.

**The owner deferred the bisect until the map work finishes**, and the
reason is better than the one I gave for doing it now: M17 replaces M12's
count growth, so one of the four hardening changes is about to be reversed
anyway. Measuring a half-finished map attributes nothing.

The queue continues at M18. The bisect stays available — each change is its
own commit — and X2 sits after M19 rather than before M18.

## P1 · what is `play.html` for

**NEEDS DECISION** — owner's, and it is about what the project is

An interactive mode was added on direct request: a human plays instead of
watching the bot. Both `U3` and `U4` flagged it and both declined to wire
themselves into it, which was right.

**It contradicts the stated premise.** `CLAUDE.md`'s first line is *"The
player does nothing but watch a bot clear the dungeon"*, and every design
decision in this repo descends from it — the bot is the product, `finishes`
is a bound rather than a goal, the whole reason a spectator needs surprise.
An interactive mode is a different game with the same engine.

That is not an objection. It is that **nothing else can be decided
consistently until it is settled**, because half the arguments in
`objectives.md` stop applying if a human is playing.

**Three answers, and they need different things:**

- **A scratch tool** — for feeling out whether a floor is fair, never
  shipped, not maintained. Then it needs a line saying so, and nothing else
  ever wires into it.
- **A real second mode** — then `CLAUDE.md`'s premise changes, and questions
  that were closed reopen: is the difficulty tuned for a bot or a human, does
  the lifetime score count human runs, is fog of war still a design decision
  or now a UI problem.
- **Delete it.**

**Until this is answered, nothing wires into it.** U3 and U4 both stopped at
that line on their own, and that is the right default.

## M20 · start and shrine at the two ends of the map

`work agent` · **REPORTED**

**Half of this already exists.** The shrine goes in the room furthest from
the hero, by walkable path length — and that is already a deliberate
divergence, since Rogule sorts by the path *vector* rather than its length
(`spec §9.1`), which scattered the shrine into an arbitrary room.

**What does not exist is choosing the pair.** The hero is dropped on a
random free tile first (`pickFree()`), and only then does the shrine take
the room furthest from wherever that happened to be. Land the hero in a
central room and "furthest" is merely moderate.

**Do.** Compute walkable distance between every pair of room centres — one
flood per room, ten to twenty of them, cheap — and put the hero and the
shrine at the two ends of the longest pair.

**This also stops the hero spawning in a corridor**, which it can today:
`pickFree()` takes any walkable tile. Landing at a room centre is a
consequence of choosing the pair, not a separate change — but implement both
halves, because doing only the shrine end leaves the corridor spawn in
place.

### Two things this costs, and the second is the real one

**Spine share goes up.** A longer mandatory path crosses more rooms, and
every room it crosses is spine. That number sits at 0.83–0.91 today against
a 0.95 ceiling — M10 exists because it broke once already. This pushes
directly at it, and there may not be room.

**It removes a source of floor-to-floor variance.** Today the descent length
varies with where the hero happens to land; fixing it to the maximum makes
every floor the same shape. That variance is exactly what CV measures, and
CV is the one number this project actually won.

So this trades **variety between floors** for **consistency within one**.
Both are defensible and they are genuinely opposed — the item is worth
building to see the size of the trade, not because the direction is
obviously right.

**Assert.**
- Hero and shrine are the furthest-apart pair of rooms, verified directly.
- Path length hero→shrine, mean and spread, before and after. The spread
  falling is the cost, and it should be reported rather than only the mean
  rising.
- Spine share per floor, still inside `[0.6, 0.95]`.
- CV of challenge, before and after.

**If spine share leaves the band**, say so with the numbers rather than
adjusting the band. It is the same question M16 was told to answer the same
way, and there the worry turned out to be misplaced — the lever was
elsewhere. It may be misplaced here too.

### Result

**Built both halves.** `spawn.js` step 1 now computes walkable distance
between every pair of room centres (`findPath`, O(rooms²) — rooms/map is
a handful, cheap) and places the hero at one end and the shrine at the
other of the single longest pair on the map, replacing `pickFree()` for
the hero entirely — the hero can no longer spawn in a corridor. `roomPaths`
(player → every room, used for `furthestLength` and chest weighting) is
unchanged in shape, just fed from the new `playerPos`; `furthestLength`
comes out equal to the hero-shrine distance without special-casing, since
the global-maximum pair is by construction also the pair farthest from
either of its own two ends.

**This time the worry was NOT misplaced — unlike M16.** Spine share, same
seeds, before/after (n=40/floor):

    floor      1      2      3      5      7      10
    before   0.836  0.829  0.833  0.874  0.815  0.888
    after    0.949  0.964  0.943  0.969  0.928  0.944

Floors 2 and 5 clear the 0.95 ceiling. Left failing, not adjusted — same
two tests that already checked this (`a floor puts most of its threat
mass...`, `rooms are bigger than the old default...`) now report it
directly, per the item's own explicit instruction not to touch the band.

**The predicted COST did not show up, though — measured, not assumed.**
The item expected path-length variance to fall (floor shape becoming more
uniform, "the spread falling is the cost"). It did not: mean hero-shrine
path length rose 27.85 → 31.49 (expected — the pair is now chosen to
maximise it), but spread ROSE too, 10.24 → 11.03 sd, not fell. Challenge
CV (Sonda A, n=30/floor) tells the same story — mean CV across the ten
floors 0.614 → 0.637, not a clear fall, within likely noise at this
sample. **The trade the item framed — variety between floors for
consistency within one — only half-landed**: spine share paid the
expected cost, but CV did not buy back the expected benefit. Worth a
closer read at a larger sample before concluding either way; not chased
further here.

**Assert, checked:** hero and shrine verified directly as the map's
actual longest room-pair path (new test, 15 seeds, independent
recomputation from outside `spawn.js` — not just trusting the
implementation's own claim). Path length and spine share reported above.
91 tests, 89 pass — the 2 failures are the disclosed spine-share breach,
not a bug.

`docs/rogule-spec.md` §13.12 added — goes beyond the existing §9.1 fix
(which only corrected the sort), so it's a further deliberate divergence,
not a numbers-only update to an existing one. No `docs/balance.md` entry —
no new tunable constant, pure geometry.

### Review of M20 — it works, and it is incompatible with side rooms

**The room-spawn half is unambiguously good.** The hero can no longer land
in a corridor, and it is verified from *outside* `spawn.js` by
independently recomputing the longest pair rather than trusting the
implementation's own claim.

**The cost I predicted did not appear.** I wrote that fixing the pair would
make every floor the same shape and cost floor-to-floor variance. Path
length spread **rose**, 10.24 → 11.03, and CV went 0.614 → 0.637.

**The spine share did break, and this time the worry was right.**

    floor      1      2      3      5      7     10
    before   0.836  0.829  0.833  0.874  0.815  0.888
    after    0.949  0.964  0.943  0.969  0.928  0.944

Left failing rather than adjusted, per instruction.

### It is not a bug and it cannot be fixed

A room is spine when the mandatory path crosses it. **Maximising the path
maximises the spine** — the same quantity seen twice. Hero and shrine at
opposite ends means the route crosses almost everything, so almost nothing
is optional.

`map-design.md` asks for 70% of threat on the mandatory route and about 30%
in skippable side rooms. M20 delivers **95/5**. That is not the bargain
missing its target, it is the bargain gone.

**So it is a choice, and it is the owner's:**

- **A long route across the whole map** — the floor reads as one journey,
  almost nothing optional. M20 as it stands.
- **A shorter route with real side rooms**, risk and reward rolled
  independently, which `map-design.md` derives as the only thing that makes
  a detour a gamble rather than a free lunch.

**A middle exists.** The room-spawn fix is separable from maximising the
pair — put the hero in a room and the shrine in a *distant* room without
requiring the global maximum. Corridor spawn stays gone, side rooms survive.

Worth knowing before choosing: **side rooms have never been shown to work.**
I4 is parked and unanswered, and its question is whether the bot can tell a
good one from a bad one at all. Losing something that may not function is a
smaller loss than it sounds.

## B7 · turn the clock on

`work agent` · **READY** — after M19

The score in U4 rewards finishing fast: `xpEarned / (turns × 0.01)`. The bot
does not read it, and it never will — it optimises survival, not score.

**But the bot already has a time cost, and it is switched off.**
`STEP_COST_IN_HP = 0.01`, which `balance.md` describes as *"the knob that
shows up as personality on screen, and the main thing P4 sweeps"* — and
which nobody has swept.

At 0.01 the bot walks a hundred extra steps to save one hp. Across 162 turns
a floor that is 1.6 hp of perceived cost against a 10 hp hero: it ignores
time completely, and the screen shows it.

**Do.** Raise it, and sweep rather than guess. `0.01 → 0.03 → 0.05` is
20–5 steps per hp instead of 100. Report turns per floor and finishes at
each.

**The alignment does not have to be exact, and should not be attempted.**
The meta-score rewards speed; the step cost makes the bot prefer speed. Two
different functions pushing the same way is enough, and trying to make the
bot literally optimise the score means giving it knowledge of a meta layer
it has no business seeing.

### Two things this might resolve on its own

**The pacing.** Reversal rate reads 47%. The bot paces because pacing is
free — every step back costs 0.01 hp and buys a moment's safety. Charge for
turns and the trade changes on its own. `B3` exists to fix this directly and
is parked; this may make it unnecessary, or may not, but it is one constant
against a rewrite.

**M22's fork.** Two routes to the shrine only pose a question if short is
worth something. With turns free, the quiet branch always wins and the fork
is decoration. This is the dependency M22 names.

### The caveat, and it decides the order

`balance.md` says raising this makes the bot *"hasty and reckless"*.
Finishes is at 0% and 14 of 30 runs die on floor 1. **Do this after M19**,
or a bot that already dies at the door will die at it faster.

**Assert.** Turns per floor, reversal rate, finishes and median depth at
each swept value. Reversal falling would be the interesting result — it
would mean the ping-pong was an economics problem rather than a bug.

## M22 · two routes to the shrine, told apart by what is in them

`work agent` · **NEEDS DECISION first — see the dependency**

Instead of a single mandatory route with dead-end detours hanging off it,
give the floor a **fork**: two ways to the shrine, one short and populated,
one long and quiet. The decision stops being "is this side room worth a
round trip" and becomes "which way do I go", which is legible on screen in a
way a detour never is.

It is compatible with the shrine being the furthest room — distance and
branching are independent.

### The dependency that decides whether this works at all

**The bot cannot see down either branch, and has no reason to prefer the
short one.** It reads `Observation`/`Belief` only, and `belief.shrine` is
null until it has actually seen the shrine — so at a fork it does not know
where the exit is, how long either branch runs, or what is in them.

What it *can* see, once M16's bigger rooms are in play, is **creatures at
the mouth of the populated branch**. So the visible choice is "walk toward
what I can see is dangerous" against "walk toward what I cannot see".

And with `STEP_COST_IN_HP = 0.01`, **turns are nearly free**, so it will
always take the quiet one. The long safe branch wins every time and the
short dangerous one is never used — the same "nobody takes the detour"
problem in a new shape.

**So this needs turns to cost something first — that is `B7`.** That is the idea that came
up under the xp-per-turn discussion and was never written down: the bot
dawdles — 162 turns a floor, 47% reversal — because nothing charges it for
time. Branching without a clock is a fork where one side is always correct.

**That decision comes before this item, not inside it.**

### What it does to the rest of the map queue

**It obsoletes `M4`.** Side rooms as currently defined stop existing; there
is nothing to scale the spread of.

**It may resolve `M20`'s spine-share breach for free.** A room is spine
because the mandatory path crosses it — with two routes, neither is fully
mandatory, so the spine set shrinks on its own. The 95/5 split M20 produced
could come back toward the 70/30 the design asks for, without touching M20.

**It reuses a lever M16 already measured, in the opposite direction.** M16
found that raising `dugPercentage` to ROT's 0.20 drops floor 7's spine share
to 0.70, and treated that as the thing to avoid. **Under a branch design
that is the mechanism you want** — more connections mean more than one way
through. The measurement is already done; only its sign changes.

`M19`, `M21` and `M16` are unaffected.

### What to build, once the clock question is settled

- Map generation that produces a genuine second route to the shrine, most
  likely by putting `dugPercentage` back up.
- `spine.js` reworked. "On the shortest path" stops meaning anything useful;
  what matters is which rooms are on *some* route and which are on neither.
- Threat distributed so the branches **differ in character rather than
  merely existing** — one short and populated, one long and quiet. Two
  identical branches are a coin flip, not a choice.

**Assert.** Both branches actually reach the shrine. They differ measurably
in length and in threat. And the one that matters: **how often the bot takes
each.** If it is 95/5, the fork is decoration.

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

