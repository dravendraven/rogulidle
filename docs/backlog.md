# Backlog

The task list. Everything needed to pick up a task and finish it.

> **Priority order, owner-set:** finish **the shop** first — U6e, then U6f.
> Then `docs/lab-backlog.md` (the manual dungeon simulator). Then the rest of
> this file.
>
> The **bot agent** is outside this ordering and works its own lane here
> (B11 onward) in parallel with all of it.

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

| # | id | what gets done | agent | status |
|---|---|---|---|---|
| — | U6e | The shop screen | ui | **DONE** |
| — | U6f | Watch a full loop, integration check | ui | **DONE** · DOM layer owed a click-through |
| — | B13 | Charge a pursuer where it actually collects | bot | **DONE** · shipped OFF, inert |
| — | B12 | Fighting should compete with leaving, not precede it | bot | **DONE** · shipped ON |
| — | M31 | The M7 budget check is blind to earlyTierCapShare's real cost | work | **DONE** · proxy deleted, band history corrected |
| — | X5 | Classify every dial by lifecycle, delete only the dead | work + bot | READY · at a structural boundary |
| — | X6 | Collapse the tier clamps, redundancy proven first | work | after X5 |
| — | I9 | Conditional survival table = the "hope" instrument | metrics | BLOCKED on finishes > 0 |
| — | M35 | Potions become carried items, drunk on command | work | **DONE** · drink left off ACTIONS, correctly |
| 1 | B14 | The dumbest defensible drink policy, and potions repriced | bot | READY · M35 landed |
| 2 | I12b | Split drunk into useful and wasted, now that amount is honest | metrics | READY · with or before B14 |
| 3 | I12 | Did it move anything? finishes, and died-holding-a-potion | metrics | instrument shipped · comparison after B14 |
| 4 | B15 | A drink policy that reads the danger field | bot | after I12 |
| 5 | I10 | A supported headless runner for measurements | metrics | READY |
| 6 | I11 | Does the ruler read true when the starting hero changes? | metrics | READY |
| — | M34 | Nothing measures what a direct run can skip | metrics | **DONE** |
| 7 | M21 | Deep floors put a creature where the hero lands | work | READY |
| 8 | X1 | Delete what nothing references | work | READY |
| 9 | X2 | Comments in src/ that lie: 25 stale refs + 3 false claims | work + bot | READY |
| 10 | X3 | Mark which dials tune the game and which tune only the bot | work | READY |
| 11 | D1 | The crowd-correction fit is overdue for its own redo | work | READY · M31 landed |
| 12 | M4 | Side-room risk/reward spread scales with depth | work | READY · M31 landed |
| 13 | E1 | One resumable turn loop in src/sim, instead of four copies | work | READY |
| 14 | M32 | Weapons become a tier ladder instead of a stack | work | BLOCKED on the lab |

The M11–M16 batch is done and closed — six items, one commit each, 89 tests
green. What it taught is in `docs/project/decisions.md`; the specs are in
git.

**Nothing has looked at `run-check.html` yet.** That was the checkpoint for
the batch and it is still owed, before M17 changes the same dials again.

Closed work is in `docs/project/decisions.md`. Parked and unscheduled is in
`docs/project/candidates.md`.





## M35 · potions become carried items, drunk on command

`work agent` · READY · **owner feature, head of the queue** · engine only,
no bot change in this item

Today a potion is consumed the instant the hero walks over it, and at full
hp the engine refuses to pick it up at all — it stays on the floor and the
hero can come back. That second rule exists *because* of the first: consume
on contact means a potion found while healthy is a potion wasted, so the
engine works around its own rule.

**Do.** A potion goes into the inventory like every other item. Drinking is
a new action.

**This deletes more than it adds, and that is the point.** The full-hp
special case in `step.js`'s pickup loop goes away — a potion at full hp is
just an item you are carrying. Nothing has to decide whether picking it up
is a good idea, which is exactly the branch that exists today.

### Four decisions taken here, so the item is not ambiguous

**1. Drinking costs a turn.** Every other in-place action does — attack,
open chest, take the shrine. `rest` already establishes the shape: an action
that passes a turn without moving, and `resolvePlayerAction` already has the
branch. **Free drinking would delete the feature the owner asked for**:
with no cost there is no decision, you simply drink at the perfect moment
every time. A turn spent drinking is a turn the creatures act, and §4 of
`rules.md` says what that means — standing still next to a pursuer is
exactly when a blow lands. **That is the decision this feature is for.**

**2. Carrying between floors is free and already works.** `rules.md` §1's
carry list includes `inventory`. A potion found on floor 3 travels to floor
9 with no new code. Do not write any.

**3. No cap on how many can be held, in this item.** A cap is a new dial to
compensate for a behaviour nobody has observed yet. Supply is already
bounded by `POTION_SCARCITY`. If hoarding turns out to be degenerate, that
is a finding with a number attached, and the dial can be argued for then.

**4. Drinking at full hp is allowed and wastes the potion.** Do not guard
it. The engine's job is to permit; deciding not to waste one is the bot's,
and B14 is where that lives. A guard here would be an engine rule invented
to protect the bot from itself — the exact split `CLAUDE.md` keeps.

### What this is not

**Not `rest` with a side effect.** `rest` stays — waiting for a pursuer to
come to you is a real move and B13 is about that. Two actions, both passing
a turn, doing different things.

**Assert.** A potion walked over at full hp is now in the inventory and no
longer on the map. Drinking raises hp by the heal amount, capped at hpMax,
removes it from the inventory, passes a turn, and the creatures act on that
turn. Drinking with no potion is a no-op that does not pass a turn — same
shape as walking into a wall. A potion carried down the stairs is still
there on the next floor. Determinism holds: same seed, same run.

**Stale after this, and it is your commit that fixes them:** `rules.md` §5
(the "wasted at full hp, so the engine leaves it on the floor" paragraph is
simply false afterwards) and §6 (the list of actions that resolve in place).
`rules.md` §10 and `rogule-spec.md` §13 gain a divergence — the original
consumed on pickup; this does not.

### Report

In the commit message of `57d1eff`, not here — noted only so the next reader
knows where to look, not as a complaint. All six asserts covered, six tests,
141/141, determinism replayed. `rules.md` §5, §6 and §10 updated in the same
commit; reasoning in `decisions.md`; `rogule-spec.md` §13 deliberately not
extended, since that list is frozen by its own preamble.

### Review

**Adopted.** The one substantive judgement call in it is right, and it is a
call the item did not anticipate.

**`drink` is accepted by `step` but deliberately left OFF `ACTIONS`.** That
list is the BOT's menu — `tactics.js` and `placeholder.js` enumerate it — so
adding `drink` there would have changed every bot decision from inside an
item scoped to the engine. **That is exactly the boundary `CLAUDE.md` keeps**,
and catching it required noticing that a constant named for the engine is
actually read by the bot. The item said "nothing in `src/bot/`"; the agent
found the line that would have broken that rule without touching the
directory.

**The riskiest line was the one that unified the pickup path, and it is
safe.** Potions now flow through `grantArmour` and sit in `inventory`
permanently, which puts them in front of three functions that iterate it.
Checked independently: `grantArmour` guards on `item.armour`,
`weaponDamage` and `armourValue` both guard with `|| 0`. A carried potion
adds nothing to damage or to the armour bar. Nothing leaks.

**One thing the report got backwards, and it is small but worth fixing.** The
commit says logging the real gain means "the event keeps meaning hp moved —
three diagnostic pages rely on that reading". Those three pages
(`run-b9.html`, `run-b11.html`, `run-axe2x.html`) count heal **events**, not
amounts — so they are precisely the consumers the change did *not* preserve:
post-M35 a wasted drink fires an event carrying 0. `run-axe2x.html:120`
still states in a comment that a heal only logs when it did something, which
is now false. Low stakes — all three are ad-hoc pages from closed items — and
logging the true amount was still the right choice, for the reason below.

**And it bought something nobody claimed.** Because `amount` is now honest, a
wasted drink is detectable as `amount === 0`. **That is the exact failure B14
and B15 both steer by** — drinking at the wrong moment. It was not available
before M35 and the instrument built 80 seconds earlier cannot see it. Filed
as I12b.

**Expected and not a defect: the game is temporarily worse.** The bot cannot
produce `drink`, so it now hoards potions and never drinks them. It also still
prices a potion by hp missing *right now*, so at full hp it will not detour
for one it could carry for free. Both are B14's, both were foreseen when the
arc was planned, and neither should be fixed here.

## I12b · a wasted drink is now visible — teach the instrument to see it

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

## B14 · the dumbest defensible drink policy, and potions repriced

`bot agent` · **after M35** · deliberately unambitious — this item exists to
make the engine change measurable, not to play well

Two things, both small, and the second matters more than the first.

**1. Drink when the missing hp is at least the heal.** That is the whole
policy. It wastes nothing and it is trivially explainable when watching. It
is also knowingly naive: it ignores danger entirely, so the bot will drink
standing next to a wolf. **Leave it naive.** B15 is where a real policy
goes, and it needs this one's numbers to beat.

**2. Reprice the potion, which is the part that is easy to miss.** The bot
values a potion today at what it heals *right now* — because that was the
truth: pick it up healthy and it is gone. Deferred, a potion is never
wasted, so it is worth its full heal for as long as the run lasts.
`valueByItemName` and `expectedChestValue` both read that value, and chests
are where potions come from, so **chest value rises and the bot should walk
further for one.** If this half is skipped, the engine change ships with a
bot that still undervalues exactly what changed.

**The trap this item is most likely to fall into.** A held potion is worth
its heal *if the run lasts long enough to spend it*. That is the same
horizon discount `campaignCost` already applies to equipment — do not invent
a second one. Use what is there.

### Face value here, turn cost at the drink decision — and they are not the same question

Raised by the owner, and it is the right question to ask: M35 makes drinking
cost a turn, so should the potion's value be the heal *minus* that turn?

**No — not when valuing one to go and get.** The turn cost is not a
constant to subtract. `rules.md` §4: damage is an event, not a rent.
Drinking with nothing in pursuit costs **zero** — a turn passes, the
creatures act, none of them reaches. Drinking cornered costs a blow.
**And the bot picks the turn.** Charging a fixed cost at acquisition prices
the worst case as though it were mandatory, and the visible symptom would be
a bot that walks past chests over a cost it would almost always have
avoided.

So: **acquisition reads face value; the turn cost belongs to the drink
decision, where the state is known and `dangerField` already prices it.**
That is B15, and it is the same split the bot already runs everywhere else —
`worthStarting` vetoes a fight from the real board, it does not discount
every creature by an average fight.

**Two honest caveats, neither of which is a reason to subtract a constant.**
Face value is an upper bound: it holds only while a free moment is
reachable, and a cornered hero or a run that ends first gets less. The
run-ending half is already covered by the horizon discount above. The
cornered half is real, rare, and B15's business.

**And the asymmetry against armour is now genuine, so do not paper over
it.** Armour applies passively and costs no action; a potion needs a turn.
Same nominal points, slightly different worth. The correction is
second-order and state-dependent, and a constant fudge factor to express it
would be precisely the parameter-to-compensate-for-a-parameter move
`CLAUDE.md` forbids. **State the asymmetry in the report; price it only if a
measurement asks for it.**

**Assert.** Watch a run: the bot picks up potions at full hp, carries them,
and drinks when hurt rather than walking around at 2 hp holding two. Report
whether it ever dies holding one — do not fix it if so, that is I12's
number and B15's job. State whether chest-seeking visibly changed.

Stale after this: `bot-strategy.md` §4's pricing table and §5's gaps list.

## I12 · did it move anything — finishes, and died-holding-a-potion

`metrics agent` · **the baseline half is READY NOW and runs in parallel
with M35; the comparison half is after B14** · the measurement the owner
asked for

### Take the baseline BEFORE M35 ships. This half is time-sensitive.

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

## B15 · a drink policy that reads the danger field

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

## X3 · mark which dials change the GAME and which change only THIS bot

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

## D1 · the crowd-correction fit is overdue for the redo it asked for

`work agent` · READY · **sequence after M29, M30 AND M31** — the first two
moved the same strength/tier dials this fit is refit against; M31 may move
the M7 band itself, which is what "refit against the ramp as shipped" needs
to be stable before it means anything.

The crowd-correction fit carries its own escape clause in `docs/balance.md`:
*"if [the ramp] is ever switched on, this fit has to be redone."* **M17
switched it on.** Found by M25 while writing up something else; nobody owns
it, which is why it is now an item.

**Do.** Refit against the ramp as it actually ships today, or — if the
refit lands close enough to the current numbers to not matter — say so and
delete the escape clause, so the next person does not re-find it.

**Assert.** Whatever the fit predicts against what real play does, at the
shipped dials. If nothing moves, that is a result and gets written down.

**Also owed, smaller:** `balance.md`'s headline block still states the count
law as `2 × 1.3^(N-1)`, stale since M17. M25 flagged it rather than
rewriting someone else's record. Fix it here.



## I9 · a conditional survival table, so coin can be priced in hp

`metrics agent` · **BLOCKED on `finishes` being non-zero** — see below; the
proposal said "can be done now" and that is the one thing in it that does not
hold

Metrics agent proposal, filed with the reasoning intact. Nothing implemented.

**Reframed after the owner refined the primary objective — this is worth more
than it was filed as.** `P(finish | state now)` is not just a discount factor
for pricing coin: it **is** "hope", which `docs/project/objectives.md` now names
as the property that must never reach zero. Whatever else this table is for, it
is the only proposed instrument for the game's primary objective. That does not
unblock it — it still needs a non-zero finish rate to have signal — but it
raises what it is worth building once that lands.

### What the proposal establishes, and it holds up

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

### Three corrections before this gets built

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

### Why it is blocked, and on what

`finishes` reads **0% to 1.3%** across every recent measurement. That starves
the table from both ends at once:

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

### What it still does not resolve

The table gives a price. It does not let the bot act on one: no coin term
exists in the bot, and there is nothing to buy until the shop is real. The
sequencing the proposal itself gives is right — table, then a working economy,
then bot decisions — and `U6e`'s own notes already carry the standing warning
not to feed the coin formula into `chooseGoal` as a decision price when that
day comes.

## B13 · charge a pursuer where it actually collects

`bot agent` · **REPORTED** · shipped OFF, inert — but see what the diagnostic
says about B12

Bot agent proposal. Verified before filing: the mechanism is real and the
reasoning is right.

### The mispricing

Three shipped rules combine into something the bot does not know. Adjacency
alone is not an attack — the attack is a creature *moving onto* the hero.
Creatures act after the hero. Creatures block each other but never the hero.

**Therefore fleeing a same-speed pursuer costs nothing.** Step away and its
next step lands adjacent, not on you; it never collects. Traced in
`monsters.js`: the blow only fires when the chosen step equals the hero's
tile.

**Damage from a pursuer is an event, not rent.** It is paid exactly when the
hero stops increasing the distance. And `step.js` makes that precise —
`resolveEncounters` returning true **passes the turn without moving the
hero**, so attacking, opening a chest and taking the shrine are all
stationary. A creature glued to the hero collects a free blow for every one
of those turns.

**Nothing charges for it.** `dangerField` prices proximity per tile of
occupancy, decayed by distance — a proxy that errs in a known direction (it
over-avoids creatures the hero could walk past for free) and misses the case
that actually costs hp. `guardCost` charges creatures *sleeping* near a
chest; nothing charges the one already chasing.

### Do

Price a pursuer against **stationary actions** rather than tiles:
proportional to the turns that action spends not moving away, and only for
creatures that would not fall behind on the way — which is finally a
consumer for `danger.reach`, unused since `chokepoint` was switched off.

**"Rather than", not "as well as" — and the minimum-change rule makes this a
requirement, not a preference.** If the per-tile proximity charge stays and a
stationary charge is added beside it, a pursuer adjacent while the hero opens
a chest is **billed twice**, and the two terms then have to be tuned against
each other. This is a correction to what `dangerField` already means, not a
new term next to it. Reuse `DANGER_FALLOFF` and `CROWD_PENALTY` if a
coefficient is needed; add one only if neither can carry it, and say why.

Entirely `src/bot/` (`threat.js`, `bot.js`). No engine change.

### Two qualifications the proposal did not state

**"Fleeing is free" holds for one pursuer with an escape route.** Cornered,
or with two pursuers from different sides, some move closes distance to
something. The pricing should not assume escape is always available.

**It may measure inert, for B10's reason.** The existing proximity proxy may
already capture much of this by accident. That is a real possible outcome and
not a failure — `decisions.md` records that a safe-sized tie-breaker on this
cost field had nothing left to decide.

### Assert

Same discipline as B9/B10/B11: paired seeds, two families, before/after in one
session. This makes the bot fight **more**, so depth and `finishes` are what
to watch — **and `finishes` reads ~0%, so a guard written against it cannot
fire.** Use median depth and cumulative weapon damage by floor 10 as the real
signals, and say plainly that `finishes` could not serve. Also report blows
taken while stationary, which is the quantity this item exists to reduce.

### Why this goes before B12

B12 asks the bot to decide whether a fight is worth having. **That decision is
made with this cost model.** Fix the model first and B12 is measured against
prices that reflect the game; run B12 first and it decides using a model that
undercharges exactly the case where fighting is genuinely necessary.

### Result

**Built, measured, shipped OFF — inert. But the diagnostic is the most
useful number this series has produced, and it changes what B12 should
expect.**

**The premise is confirmed, and it is bigger than the item claimed.**
Instrumented directly from the engine — a turn is stationary when it passed
(`state.turn` advanced) and the hero did not move, so a wall bump is
correctly never counted:

    blows the hero takes while standing still ....... 90.9%

Nine blows in ten. Damage in this game is very nearly *defined* as what
lands while the hero is not walking away. `dangerField`'s proximity rent
was modelling the wrong thing, exactly as the item said.

**And that is why the fix does nothing.** The second cut is the answer:

    of those stationary blows, share with 2+ creatures in contact
      seed 800000 ..... 13.1%
      seed 910000 .....  8.6%

The other ~88% come from the single creature the hero is already trading
with — and **`duelCost` has priced those since P3**. What was genuinely
unpriced is a second creature swinging during a duel, or one swinging
during a chest's two turns: about **two to three blows a run out of
twenty-five**. Charging correctly for a small population moves a small
amount.

**n=60, paired seeds, two families, one session:**

    chargePursuers            seed 800000        seed 910000
                            off      on        off      on
    finishes                 0%      0%         0%      0%
    median depth              3       3          3       3
    mean depth             3.62    3.55       2.93    3.00
    actions per run         358     353        255     257
    stationary blows/run  25.35   25.10      23.70   23.88
    kills per run         13.18   13.07      10.20   10.52

**Every moving number disagrees in direction between the two families**, at
about one percent. Mean depth down on one, up on the other; stationary
blows down on one, up on the other. That is noise, and calling it anything
else would be the mistake `decisions.md` already records twice.

**`finishes` could not serve as the guard, exactly as the item predicted** —
0% on all four arms. Median depth was the real signal and it is identical
everywhere. Median weapon damage at the deepest floor was also identical
(1 on all four arms), so the descent is not arming the hero differently
either.

**Checked before calling it inert: the flag does change decisions.** Per-run
depth arrays differ off vs on (a run reaching 4 becomes 3, another 5 becomes
7). This is inert for lack of anything left to fix, not for lack of firing —
the distinction B10 could not make about its own tie-breaker.

**One shortcut, disclosed.** The charge lands on the *ranking* (`cost` in
`priceMonsters`, `net` in `lootGoals`), not on `worthStarting`. So the
survivability gate can still call a duel safe while this term says a second
creature will be swinging throughout it. That split copies B9's own
precedent — worthwhile is not the same question as survivable — and closing
it is a different item, not a tweak to this one.

**What this means for B12, which is the real output.** B12 has to decide
whether a fight is worth having. It will make that decision with a cost
model that, per the numbers above, is **already essentially correct for the
1v1 case that is 88% of all damage taken** — `duelCost` was carrying more
weight than anyone credited it with. The ordering rationale ("fix the model
first") turned out to be right for a reason nobody stated: the model did not
need fixing, and now that is measured rather than assumed. B12 can proceed
on the existing prices.

**Files touched:** `src/bot/threat.js` (`pursuerCost`, and `dangerField` now
keeps each creature's bite and activation for it), `src/bot/bot.js` (the
`chargePursuers` flag, threaded into `lootGoals` and `priceMonsters`; the
chest's two stationary turns given the name `CHEST_TURNS` since two places
now depend on agreeing about it), `test/tests.js` (four tests). `src/sim/`
untouched. 134 tests green.

### Which behaviour document this made stale

**None.** The flag ships OFF, so no shipped behaviour moved. Checked rather
than assumed: `bot-strategy.md` §3.1 describes `dangerField` as "o preço de
ameaça por tile" without claiming *when* that threat is collected, so the
rent-versus-event finding does not contradict anything written there.
`rules.md` §3 and §6 already state the three rules the finding rests on
(adjacency is not an attack, creatures act after the hero, stationary
resolutions) — this item read them, it did not change them.

**One suggestion rather than an edit, since `docs/` is not mine.** The 91%
figure is not a bot fact, it is a *game* fact — nine of every ten blows the
hero takes land while it is standing still. Nothing in `rules.md` says that,
and it is the kind of thing that would save the next person a measurement.
Worth a line in §4 if you agree.

### Why this needed a new flag

Per the last-resort rule. `chargePursuers` gates a cost term no existing
parameter can express: `threat` switches the entire danger field on or off,
`guardPricing` charges creatures *asleep near the destination* — the
opposite population from one already chasing — and `crowdPenalty` is a flat
surcharge on a tile, not a per-turn charge over a goal's duration. Reusing
any of the three would have changed what it already means for every other
caller.

**Whether it should survive now that it measured inert is your call, and
X5 is where it belongs.** Precedent says keep a rejected idea with its
numbers attached (`chokepoint`, `exposurePricing`, B4's pair, B10's). The
counter-argument is that this is the fifth such flag and the file is
accumulating them. I have left it in rather than pre-empt X5's own criteria.

`CHEST_TURNS` is not a new parameter — it names the literal `2` that was
already inline in `lootGoals`, because a second site now has to agree with
it. It is a rule of the engine (open, then step on), not a tunable.

### Two notes for the project agent

**A mistake this caught in itself, worth keeping.** The first version of
`pursuerCost` guarded on "does it reach the tile before the hero does" —
`standoffTile`'s test, inverted. Writing the test for it showed that returns
*zero* for a creature standing directly behind the hero, which is the exact
case the item exists to charge for: it arrives one step late and then swings
for every remaining stationary turn. The guard became "how many of the
stationary turns is it present for". A whole-bot fixture would not have
caught this — the unit test did, because for once the mechanism was a pure
function worth testing directly.

**The browser tooling dropped mid-session, and the measurement ran headless
instead.** Node 22 runs the project's modules unchanged with
`--experimental-default-type=module`, which avoids adding a `package.json`
and so does not break the no-npm/no-build rule; the only obstacle is
`mapgen.js`'s CDN import of ROT.js, redirected to a local copy by a resolver
hook living entirely in scratchpad. Same modules, deterministic engine, same
seeds — the numbers are what an HTML page would have shown. **No page was
shipped for this item**, deliberately: writing an instrument I could not
open and verify would have been worse than not writing one. If a supported
headless runner is wanted, that is a decision for you and the metrics role,
not something to smuggle in under a bot item — but it works today and it is
much faster than clicking through a page.

### Review — ADOPTED as a finding, flag stays off, and it settled a question I
### had only assumed

**The diagnostic is worth more than the item, and the second cut is what makes
it a finding rather than a number.** 90.9% of blows land while the hero is
standing still — so the proximity rent really was modelling the wrong thing.
But of those, only ~9-13% involve a second creature in contact. The other ~88%
come from the creature already being traded with, **which `duelCost` has priced
since P3.** The genuinely unpriced population is two or three blows a run out of
twenty-five. Correct pricing of a small population moves a small amount, which
is exactly what happened.

**Correctly called noise.** Every moving number disagrees in direction between
the two families at about one percent. Calling that a result is the mistake
`decisions.md` records twice, and the report did not make it.

**Inert for lack of anything left to fix, not for lack of firing** — verified by
showing per-run depths change off versus on. That is precisely the distinction
B10 could not make about its own tie-breaker, and making it here is what turns
"no effect" into "no headroom".

### It corrected my sequencing rationale, which is the more useful outcome

I put B13 before B12 arguing the cost model had to be fixed before anything
decided against it. **The measurement says the model did not need fixing** — for
the 1v1 case that is 88% of all damage, `duelCost` was already carrying it.

So my stated reason was wrong and the ordering was still right, for a reason I
did not give: it converted an assumption about the model into a measurement.
B12 can now proceed on the existing prices *knowing* they are sound, rather
than on my guess that they were not. Worth recording plainly — a right call for
a wrong reason is not the same as a right call.

### On the three judgement calls, all three correct

**The new flag is justified and the justification is the right shape.** It
names why `threat`, `guardPricing` and `crowdPenalty` each could not carry the
term — different populations, different granularity — rather than asserting
necessity. That is exactly what the minimum-change rule asks for.

**`CHEST_TURNS` is not a new parameter** and the reasoning holds: it names a
literal two that was already inline, now that a second site must agree with it.
A rule of the engine, not a tunable.

**Leaving the survivability split open was right.** The charge lands on ranking,
not on `worthStarting`, so the gate can still call a duel safe while this term
says a second creature swings throughout. That copies B9's own precedent and
closing it is a different item.

### The suggested `rules.md` line — declined as offered, added in a better form

The offer was to record the 91% figure in `rules.md` §4 as a game fact. **It is
not a game fact.** It measures how often *this bot* stops moving, and a bot that
fled more would take fewer stationary blows. Putting it in `rules.md` would
install exactly the kind of bot-dependent measurement that rotted
`map-design.md`.

**But the consequence underneath it is a game fact, it was missing, and it is
now in §4:** damage is an event rather than a rent, so fleeing a same-speed
pursuer costs nothing and the blow is paid when the hero stops increasing the
distance. That is derivable from §3 and §6 and nobody had derived it — **which
is why this same agent modelled it wrong once.** Stating it should stop the next
person paying for it again.

### The headless runner is a real problem and gets its own item

Filed as `I10`. Not smuggled in under a bot item, which was the right instinct.


## B12 · fighting should compete with leaving, not precede it

`bot agent` · **REPORTED** · shipped ON — stop signal did not fire; the
metric that looked like it was a denominator artefact

The owner's ask was "no obligation to kill — only the run-completion goal and
what derives from it." Removing `requireClear` did not deliver that, and the
bot agent found why: **the obligation is not in `requireClear`.**

### Where it actually lives

`chooseGoal`'s cheapest-fight step fires whenever any known creature is
priced, with **no test of whether the fight is worth having and no comparison
against simply leaving.** The shrine step sits below it and is only reached
when that step finds nothing. Verified: any reachable live creature pre-empts
the exit.

`requireClear` is now nearly vestigial — its one live effect is filtering
which side-room creatures are eligible, which is opportunity, not obligation.
**Any item planning against `requireClear` as the exit gate is planning
against a rule that no longer exists.**

### Do

Make the fight compete with leaving in one comparison rather than preceding
it — the same shape B11 used to make combat compete with loot.

**And under the minimum-change rule, probably without a new flag.** B11
already built the machinery: a fight gets a `net` in the same currency and
joins branch 1's comparison. What this item wants is **the shrine getting a
`net` and joining the same list** — one mechanism, one more candidate in it,
rather than a second flag that has to be measured in combination with the
first. Try that before adding `leaveCompetes` alongside `combatCompetes`; if a
separate flag turns out to be necessary to measure the two apart, say why in
one line.

The existing survivability filter stays untouched as a hard pre-filter either
way.

### What this overturns, and the specific risk

**It removes the premise `bot-strategy.md` §3 was built on** — the
cheap-kills-first snowball, where killing the cheap creature first lowers the
cost of everything after. That premise is already weaker than when it was
written: `XP_FROM_KILLS` ships false, so a kill grants no xp and the snowball
has less to roll.

**But the risk is concrete and it is not the snowball.** Since M26, weapons
come from creatures. Skipping fights means skipping drops, and
`docs/rules.md` establishes weapons as the only thing that makes the hero
permanently stronger. **A bot that leaves early leaves unarmed, and pays for
it two floors down** — where the damage will not look like this change's
fault.

So the failure mode is delayed and displaced. Watch cumulative weapon damage
by floor 10, not just depth on the floor where the behaviour changed.

### Assert

Paired seeds, two families, before/after in one session. **Median depth and
cumulative weapon damage by floor 10 first and loudest.** `finishes` reads
~0% and cannot serve as the stop signal — say so rather than reporting it as
a pass. Also report kills per floor and floors left with creatures alive, so
the mechanism is visible and not just its outcome.

**Stop signal:** cumulative weapon damage falling while depth holds is the
shape to stop on — that is the bot trading its future for a cheaper present,
and it will read as harmless on the floor it happens.

### Result

**Built as the item preferred — no second mechanism, one more candidate in
B11's existing comparison. Shipped ON. The stop signal did not fire, and
the reason it looked like it had is the most useful part of this report.**

#### What leaving is worth

The whole item reduces to one number: the shrine's `net`. It is **0**, and
it enters the pool *after* the `net > 0` filter rather than through it.

That filter has always meant "this goal pays for itself" — and the thing it
pays for itself *instead of* is walking out. Naming leaving as the zero
makes an implicit comparison explicit, which is why no constant was needed
and no dial was invented.

**Not `−approach`, deliberately.** Every floor ends on that tile, so the
walk to it is a fixed cost of the floor, not a marginal cost of *choosing*
to leave. Charging it would bill one option for something the bot pays
whatever it does first, and would make the bot linger longest on exactly the
floors whose exit is furthest away — backwards.

When nothing beats zero, the best remaining candidate *is* the door, and
branch 1 returns it. The unconditional cheapest-fight step below is
therefore reached only when the shrine is not reachable at all — which is
correct: with no exit available, fighting or exploring is all there is.

#### Measured paired, because the seeds allow it

Comparing two arm means throws the pairing away and most of the power with
it. These are per-run differences over the same seed, so the seed's own
variance cancels: **520 paired runs, two families, one session.**

    metric                  off       on       diff        z
    depth                 3.471    3.508    +0.0365    +2.04
    weapon dmg at end     1.500    1.481    -0.0192    -1.44
    weapon dmg / floor    0.365    0.358    -0.0067    -2.31
    kills                12.552   12.504    -0.0481    -0.72
    kills / floor         3.381    3.342    -0.0388    -5.01
    actions             326.683  324.119    -2.5635    -0.40
    floors left dirty     0.262    0.338    +0.0769    +5.60
    live left behind      0.344    0.462    +0.1173    +5.05

**The mechanism is not in doubt.** Floors taken with creatures still
breathing z=+5.6, creatures left alive z=+5.0, kills per floor z=-5.0. The
bot is doing exactly what the item asked: walking out of fights it has no
reason to have.

**And depth did not pay for it — it rose**, z=+2.04. `finishes` was 0% on
both arms and could not serve as the stop signal, exactly as the item
predicted; depth carried it instead.

#### The stop signal, and why it did not fire

`weapon dmg / floor` is down at z=-2.31, which clears the bar. Taken alone
that reads as the stop signal — arming falling — and I nearly reported it
that way.

**It is a denominator artefact, of the class `decisions.md` already records
three agents falling into independently.** The ratio's denominator is depth,
and *the treatment moved depth* (z=+2.04). The numerator on its own —
absolute weapon damage carried — is z=-1.44, under the bar. So most of what
makes the ratio significant is the bot getting deeper, not the bot arming
worse.

The stop signal's own wording is the tell: *"weapon damage falling **while
depth holds**"*. Depth did not hold. The shape it was written to catch —
harmless-looking now, paid for two floors down — is precisely a depth loss,
and depth went the other way.

**A second reason to distrust the ratio, from this same session.** At an
earlier n=240 read, `weapon dmg / floor` sat at z=-1.61 and depth at
z=+1.03. Both grew together as n rose. A real arming effect and a moving
denominator both scale with n, so growth alone separates nothing — but the
numerator failing to clear at either sample, while the ratio clears at the
larger one, is what a denominator artefact looks like from the inside.

**Reported rather than buried:** absolute arming IS slightly down, and
consistently signed. If it is real it is about 1.3% of a quantity already
near its floor, against +1.1% depth. I am not claiming it is nothing; I am
claiming it does not clear 2σ and the ratio that does cannot carry the
argument.

#### Which behaviour document this made stale

**`docs/bot-strategy.md` §3.2, and it says so itself.** That section
currently ends with *"a obrigação de lutar não saiu — ela só não mora onde
se procuraria... e é `B12` que trata disso."* B12 has now treated it. Three
claims there are now wrong:

- the cheapest-fight step is no longer reached whenever a creature is known
  — only when the shrine is unreachable;
- the shrine is no longer a step *below* the comparison, it is a candidate
  *in* it, at net 0;
- the closing paragraph naming this as unfinished should go.

`docs/rules.md` §8 is **not** stale — it already says the bot leaves as soon
as the shrine is reachable and defers how much it chooses to fight to
`bot-strategy.md`. It was right before this item and is still right.

#### Why this needed a flag anyway

The item asked for no new flag and it was right about the mechanism — none
was added. `leaveCompetes` exists for measurement only: the Assert requires
a paired before/after **in one session**, which requires the old path intact
to measure against. It gates nothing but which of two comparisons runs.

Whether it should survive now that it has shipped ON is X5's question, not
mine — but unlike the four flags before it, this one has no rejected idea to
preserve, so deleting it later costs nothing but the ability to re-measure.

#### What this does to the snowball premise

The item said this overturns `bot-strategy.md` §3's cheap-kills-first
snowball. **In practice it barely touched it, and B13 explains why.** Total
kills moved z=-0.72 — the bot is not fighting meaningfully less overall,
it is fighting less *per floor* and reaching more floors. The snowball was
already dead by `XP_FROM_KILLS: false`; what this removes is the last
structural obligation, not a live economic engine.

**Files touched:** `src/bot/bot.js` (the shrine as a net-0 candidate, the
`leaveCompetes` flag), `test/tests.js` (two tests: the mechanism, where the
arms must choose opposite directions on the same board, and a check that a
goal which does pay for itself still beats leaving). `src/sim/` untouched.
136 tests green.

#### One note for the project agent

`bot-strategy.md` §3.2 needs the three corrections above; `docs/` is yours.
The measurement again ran headless through node rather than an HTML page —
same reason and same disclosure as B13, and the paired harness is what made
the denominator artefact visible at all, since arm-mean tables cannot show a
per-run difference.

### Review — ADOPTED. The mechanism is the minimum-change rule done properly,
### and the report caught its own artefact

**No new constant, no dial, one more candidate in a comparison that already
existed** — exactly what the item asked for and rarer than it sounds. Verified
in the code: the shrine is pushed with `net: 0` *after* the `net > 0` filter,
so it never competes on the filter's terms, only on the ranking's.

**The reasoning for zero rather than `−approach` is the best line in the
report.** Every floor ends on that tile, so the walk is a fixed cost of the
floor and not a marginal cost of *choosing* to leave; charging it would make
the bot linger longest on the floors whose exit is furthest, which is
backwards. That is a real argument, not a convenience.

**The mechanism is not in doubt and the outcome is not ambiguous.** Floors left
with creatures breathing z=+5.6, creatures left alive z=+5.0, kills per floor
z=-5.0 — and depth *rose*, z=+2.04, rather than paying for it.

### It caught its own stop signal firing falsely, which is new

The per-floor arming ratio cleared the bar at z=-2.31 and read exactly like the
stop signal I wrote. **It is a denominator artefact** — the denominator is
depth, and the treatment moved depth. The numerator alone is z=-1.44, under the
bar.

**And the tell was in my own wording:** the signal said "weapon damage falling
*while depth holds*". Depth did not hold. The shape that criterion was written
to catch is a depth loss, and depth went the other way.

This is the **fourth** instance of that trap in this project and the **first
caught by the agent that made it, before reporting**. The previous three were
found by other people afterwards. Recorded in `decisions.md`, along with the
discriminator that separated it (a real effect and a moving denominator both
grow with n, so growth proves nothing — but a numerator failing at both samples
while the ratio clears at the larger one is the artefact seen from inside).

**Paired per-run differences are what made it visible at all**, and that is a
method worth reusing: arm-mean tables cannot show this class of artefact.

**The disclosure is correctly calibrated.** Absolute arming is slightly down and
consistently signed, ~1.3% of a quantity near its floor. They neither buried it
nor claimed it — it does not clear 2σ, and the ratio that does cannot carry the
argument.

### Two smaller things, both right

**`leaveCompetes` is a measurement flag, not a mechanism flag**, and the
distinction is stated: it gates which of two comparisons runs so the Assert's
paired before/after is possible. Correctly left for X5 to judge, with the note
that unlike the previous four it preserves no rejected idea, so deleting it
later costs only re-measurement.

**The snowball claim was overstated in my item and they corrected it.** Total
kills moved z=-0.72 — the bot fights less *per floor* and reaches more floors,
rather than fighting less. The snowball was already dead from `XP_FROM_KILLS`
shipping false; this removed the last structural obligation, not a live engine.

**`bot-strategy.md` §3.2 is fixed** — I wrote that paragraph today and this item
made three of its claims false, which the report identified precisely. `rules.md`
§8 correctly identified as still true.


## X5 · classify every dial by lifecycle, then delete only what is truly dead

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

### Correction 1: ARCHIVED keeps the flag. Only DEAD gets deleted.

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

### Correction 2: `MONSTER_COUNT` and `CHEST_COUNT` are not DEAD

The proposal classifies them DEAD on the grounds that a real run always
overrides them. Checked: they are also **live defaults** in `bot.js`'s settings
(`monsterCount`, `chestCount`) and default parameters in `loot.js`
(`monstersStillToFight`, `valueByItemName`). Deleting them breaks a bare
`makeBot()` and any `valueByItemName` call without a total — paths the tests
use. They are LIVE-as-fallback, which is a real class the taxonomy should
admit rather than a mistake to delete.

### The inconsistency that justifies the item — verified

The project **refused one extra term** in the crowd correction for lack of
samples, in writing, in two places: `balance.js` records that the structure
"would need either a second term or far more seeds", and `balance.md` that it
"would need meaningfully more seeds to fit without overfitting". **And it
accepted nine dials in the tier system.** At the sample sizes and the 2σ
discipline in use, nine clamps cannot be told apart honestly. Most were set by
argument, not measurement.

### Wave 1 — classify

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

### Wave 2 — delete DEAD

`MONSTER_GROWTH` / `STRENGTH_GROWTH` / `DIFFICULTY_REBALANCED` are a migration
that never finished: if the rebalanced pair is what runs, the old one is
history, not an option. `chestCount` in the bot is read only by flags that are
off. **Not** `MONSTER_COUNT`/`CHEST_COUNT` — see correction 2.

**Assert.** Paired seeds, no number moves. Tests green with the call sites
fixed.

### Do NOT cut

`SCARCITY` / `POTION_SCARCITY` / `WEAPON_SCARCITY` look redundant and are not —
M27 split them deliberately so they could move without colliding, and M27's own
Result records what happened when they shared one value. Genuinely independent
pools.

## X6 · collapse the tier clamps, once redundancy is proven rather than assumed

`work agent` · **after X5** · the one wave that touches behaviour

Three independent clamp systems decide which of eleven table rows a creature
comes from: the tier floor (M13), the tier ceiling (M24), and the early-floor
cut (M30) — nine dials in three base/per-level/cap trios.

**The confession is already in the code:** all three learned the same lesson
separately, that clamping the centre limits nothing and the clamp has to be on
the drawn slot. Three times the same finding, three new systems, no
consolidation.

### The metrics agent found the cause of a failing objective, and it lands here

The randomness-tail objective is measured as not met: the one-sided peak does
not grow smoothly with depth, it is uneven and peaks mid-ladder. **The cause is
a mismatch this family of dials has by construction.**

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

### The proposal understates how cheap this is — supplied by review

**The floor and ceiling clamps are configured identically.** Base 0,
per-level 0.08, cap 0.5 — the same three values twice. Six dials carrying
three distinct numbers, and two systems that have never been set apart from
each other. That is the strongest argument for collapsing them and the
proposal did not notice it.

The early-floor cut is a different case, and M30 measured why: the applied cut
is an integer number of indices, so **every value in the open interval gives an
identical result** and only three outcomes exist at all. Three dials carrying
about one bit.

### One thing the proposal cannot have both ways

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

## M31 · the M7 budget check has a blind spot

`work agent` · **REPORTED** · found by M30's own review, not requested by
the owner — small, and worth doing before another item drifts through the
same gap

M30 found this directly: the M7 ratio-formula check (`MONSTER_GROWTH_REBALANCED
× STRENGTH_GROWTH_REBALANCED^2.356 / MONSTER_GROWTH`) does not include
`earlyTierCapShare`, so it reads 14.35%/15%, unchanged from M29 — while the
actual end-to-end growth rate, read from the same `expectedFloorMass` closed
form the ratio check is supposed to approximate, moved to 1.3955, outside
the 1.34 ±0.03 band that check exists to protect. **The test passed while
the thing it is a proxy for did not.**

**Do.** Either fold `earlyTierCapShare` (and any future floor-local clamp
in the same family) into the ratio-formula check so it stops being blind to
this class of dial, or replace the check's formula with a direct read of
`expectedFloorMass(9)/expectedFloorMass(0)` — the number M30 already showed
is the more complete one — so the check tracks the quantity that actually
matters instead of a proxy formula that can drift out of step with it.

**The minimum-change rule picks the second.** Folding the dial into the ratio
formula means that formula must be taught about every future clamp — it grows
a dependency on each new dial, which is complexity added to compensate for
complexity. Reading `expectedFloorMass` directly *deletes* the proxy: one
quantity, no list to maintain, and it cannot go blind to a dial nobody
remembered to add. Prefer it unless measuring shows it cannot work.

**Do not silently re-widen the band to make M30's 1.3955 pass.** That would
launder the exact finding this item exists to act on. If the band itself
needs revisiting, that is a separate, explicit decision — same discipline
M29's review insisted on for its own budget question.

**Assert.** Re-run the (fixed) check against M29 and M30's shipped state —
confirm it now correctly flags M30 as outside band, or, if the owner
decides the band should widen to accommodate M30, that the widening is a
recorded decision and not a side effect of the fix. Confirm the check still
passes clean on everything shipped before M30 that was never near this
edge.

### Report

Took the minimum-change option, as the item's own reasoning called for:
the ratio formula is gone, `test/tests.js`'s budget test now reads
`expectedFloorMass` (fitted over all ten floors with `growthOf`, not the
`expectedFloorMass(9)/expectedFloorMass(0)` endpoint reading the item
proposed — see below for why). Same `MONSTER_GROWTH` reference, same 15%
band, only the numerator changed. Full suite 134/134. Commit `beb85f4`.

**Deviated from the item's proposed assertion on one point, and it changes
what the item found.** `expectedFloorMass(9)/expectedFloorMass(0)` is
blind to any dial that only lifts the MIDDLE of the ladder — measured:
raising `TIER_FLOOR_SHARE_PER_LEVEL` 0.08 → 0.30 moves nine of ten floor
masses and leaves that endpoint ratio identical to four decimals. Fitting
across all ten floors reads the same quantity on a clean ladder and does
not have that blind spot, so that is what shipped.

**The check does not flag M30, and cannot without a new owner decision.**
Read directly, M30 sits at +6.0% of its 15% band — comfortably inside.
The 1.34 ±0.03 band this item's "outside the band" claim rests on turns
out not to be this check's band at all: traced to M25's report, it bounds
the **observed ruler's** CHALLENGE growth from real play (Sonda A read
1.317 ±0.016), not the closed form. Applied to the closed form anyway, it
also fails M24 — from below (1.2856 against a 1.31 floor) — so "nothing
before M30 was ever near this edge" does not hold once the band is
applied here. Whether the closed form should carry a tight band at all is
left to you; the 15% this check has always enforced is what shipped.

**What the fix actually found, which the item did not anticipate:** the
old proxy formula was not merely blind to `earlyTierCapShare` — it
overstated the drift in every state it was ever read, because it only
sees two of the nine dials that now shape a floor:

| state | proxy read | real climb/floor | real drift |
|---|---|---|---|
| M24 | +3.2% | 1.2856 | −1.1% |
| M25–M28 | +9.4% | 1.3146 | +1.1% |
| M29 | +14.35% | 1.3557 | +4.3% |
| M30 (shipped) | +14.35% (frozen) | 1.3779 | +6.0% |

M29's report said 0.65 points of the 15% band were left; the generator
says M29 left about 11, and **today's shipped state leaves about 9** —
the number D1 and M4 actually spend against. (The commit message and an
earlier draft of this paragraph attached the 9 to M29; the two rows are
one item apart, and 9 is the one that is still true.) **D1 and M4, both
sequenced behind this item
specifically to know how much budget is left, should read this table
instead of the old comment.**

None of `rules.md`, `bot-strategy.md`, `map-design.md` went stale — this
changes an instrument, not game behaviour.

### Review

**Adopted.** The item asked for a choice between two options and argued for
the second; the agent took it and then improved on it, which is the outcome
worth having.

**The deviation is right, and the reason generalises.** The item proposed
`expectedFloorMass(9)/expectedFloorMass(0)`, and the agent found that is a
two-sample reading of a ten-sample curve: anything that lifts only the middle
leaves both endpoints untouched. The measurement offered — `TIER_FLOOR_SHARE_PER_LEVEL`
0.08 → 0.30 moves nine masses and leaves the endpoint ratio identical to four
decimals — is exactly the right shape of evidence, because it demonstrates the
blind spot rather than arguing it. **This is the same failure the item was
filed about**, one level down: I proposed replacing a formula blind to seven
dials with a reading blind to eight floors. The fit is the only version with
no blind spot to name.

**The band question is correctly refused rather than answered.** M30 and my
own item both cited a 1.34 ±0.03 band as though it belonged to this check;
traced, it is M25's observed-ruler band for CHALLENGE from real play. Applying
it to the closed form fails M24 from below as well — which is the tell that it
was never this check's band. The item's own instruction was "do not silently
re-widen the band"; leaving the 15% untouched and handing the band question
back is compliance with that, not avoidance of it.

**Correcting the number my item made worse.** The report says M29 left "closer
to 9"; the table says M29 is +4.3%, so M29 left ~11 and 9 is *today's* state.
Fixed above. This matters because it is the one number D1 and M4 were told to
read.

**One consequence not in the report, now recorded in `balance.md`.** If the
proxy overstated drift in every state, then every past decision that stopped
at "the band won't allow more" stopped at a limit that was not there. M12's
count raise is the live case — it picked 1.22 because that "sits at the edge",
and it did not. Not a request to revisit it; a note so nobody reads that
paragraph as a measured constraint.

**The cost is disclosed and is the right trade.** A mistyped
`STRENGTH_GROWTH_REBALANCED` now reads quieter (proxy +54% vs real +13.8%),
because the table's eleven rows absorb it. A check that reads the real
quantity insensitively beats one that reads a proxy sharply — the mistype it
would have caught is a class the suite covers elsewhere; the dial drift it was
blind to was not covered anywhere.

**D1 and M4 unblocked**, with the corrected headroom.

## M32 · weapons become a tier ladder instead of a stack

`work agent` · **BLOCKED on the lab** (`docs/lab-backlog.md`) · owner
decision, deferred deliberately

U6e ships with flat prices and multi-buy, which makes the second weapon poor
value and shield-spam the rational purchase. That is accepted for now and is
recorded in U6e as deliberate. **This item is the real fix, and it is
deferred because it is not a shop change.**

### Why it is a whole-game change, not a pricing tweak

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

### Why after the lab, specifically

Judging a change of this size needs the instrument that does not exist yet.
The lab is exactly that instrument — hand-tune the dials, run the same seed
against Sonda A, Sonda B and the bot, and read finish rate and median depth
against a known baseline. Doing this before the lab means tuning in the
dark, which is what M29 already cost a session to.

### Do not break this when you get here

`valueByItemName` (`loot.js`) prices a weapon as a **marginal delta** —
`campaignCost(player) − campaignCost(player + item)`. That is already
correct and already handles diminishing returns automatically. With
`max()` it keeps working and starts correctly valuing a worse weapon at
zero. **Whatever the ladder looks like, that marginal computation must
survive it.**

### Assert

Finish rate and median depth against the pre-change baseline, on paired
seeds, two families — via the lab. Cumulative weapon damage by floor 10.
And the shop question that started this: with a ladder, is there a real
choice between shields and the next weapon tier, or does one still
dominate?


## I11 · does the ruler still read true when the starting hero changes?

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

## M34 · nothing measures how much of a floor a direct run can skip

`metrics agent` · **DONE** — built as `topologyShape`, ahead of being read

Built before this item was picked up, in the same pass that added the tail
statistic. `topologyShape` (`observed-ruler.js`) takes the shortest
hero→shrine route and, per creature, compares BFS distance to that route
against its own activation radius — **the same rule `monsters.js` applies in
play**, not an approximation of it. That is exactly the quantity this item said
nothing measured. It is a Map KPI on the panel with a stated band.

**Two things it got right that the item asked for.** It is geometry over freshly
generated state, so it costs nothing and cannot be confounded by how the bot
happens to play. And it added no dial — the item said not to, and the fix if the
reading comes out wrong lives in activation radii or shrine placement, both of
which already have one.

Kept below as filed, for the reasoning.

`docs/project/objectives.md` states four map properties. The fourth — most of
the threat on the fast route — is the only one with **no way to check it.**

**The dial that exists measures the wrong thing.** `SPINE_THREAT_SHARE`
controls where threat mass is *placed* at generation. The objective is about
what a direct run to the portal actually *wakes*, which depends on activation
radii and route geometry. Placing 70% on the spine does not mean a direct run
meets 70% of it — a creature sitting on the mandatory path with a small
activation radius can be walked straight past.

**Nothing measures the woken quantity.** The only module that came close
(`features.js`'s `sumActivation`/`aggroPerTile`) is static map geometry, not a
played route, and it is dead code on X1's delete list.

**Do.** Walk the hero→portal path without fighting and count what activates.
The probes already exist for exactly this kind of question — Sonda A collects
nothing, which is close to the "direct run" this needs. Report the share of the
floor's creatures woken, and the share left standing after arrival.

**This is a tripwire, not a target** — see `objectives.md`. It fires or it does
not; it is not a number to push. If a direct run can skip most of a floor, the
mandatory path is not mandatory and there is a defect to find.

**Do not add a dial for this.** It is a measurement, not a knob — and per
`CLAUDE.md`'s minimum-change rule, if the reading comes out wrong the fix is
likely in activation radii or shrine placement, both of which already have
dials.

## I10 · a supported headless runner for measurements

`metrics agent` · READY · **the browser tooling has now dropped mid-measurement
twice in a row**

**Three consecutive items now** — U6e, B13 and U6f — have had to work around
losing the browser mid-session.
U6e ended up unable to verify its own overlay end to end; B13 measured headless
instead and got numbers, but through a resolver hook living in a scratchpad
directory that nothing supports and nobody else can reuse.

**Three in a row is an infrastructure problem, not bad luck.** U6f went
furthest: a `module.register()` hook redirected `mapgen.js`'s CDN import to a
local ROT.js copy, which let the **real unmodified engine** run headless — and
it verified the substitution was faithful, not merely non-crashing, by
reproducing a number already observed in-browser. That check is the part worth
keeping: it is what separates a runner from a second implementation.

**What B13 established already works.** Node 22 runs the project's modules
unchanged with `--experimental-default-type=module`, so no `package.json` is
needed and the no-npm/no-build rule is intact. The single obstacle is
`mapgen.js` importing ROT.js from a CDN, which a resolver hook can point at a
local copy.

**Do.** Make that a supported entry point rather than a scratchpad trick, so any
agent can run a measurement without a browser and get numbers identical to the
page's. Whatever form it takes, it has to be obvious how to run and obvious that
it runs the same modules.

**The risk to design against, and it is the whole risk.** A second way to run
the game is a second thing that can drift from the first — which is precisely
what `E1` exists to fix for the descent loop and what `clustering.js` already
did after M7. **This must not become a reimplementation.** It loads the shipped
modules or it is not worth having.

**Assert.** A measurement that exists on a page produces the same numbers
headless, same seeds — checked, not assumed. And the mechanism is documented
where an agent will find it, not in a commit message.

**Not a licence to stop verifying visually.** U6f exists because a page has to
be watched by someone; headless numbers are for sweeps and regressions, not for
"does the overlay appear".

## M21 · deep floors have something waiting where you land

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



## X2 · 25 code comments point at bot-strategy sections that no longer exist

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

### Three comments that are false, not just misaddressed — added by review

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

## X1 · delete what nothing uses

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

## M4 · scale the side-room bonus with depth

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






## U6e · the shop screen

`ui agent` · **REPORTED** — fix applied below, awaiting re-review — U6d's shield gap is fixed, see its Fix section · fifth of six

Three purchase options at run end, priced per the table already fixed
(shield 1, dagger 5, axe 8 — `docs/project/candidates.md`'s old U6 has the
derivation, now folded into this arc). Buying sets U6a's held-item slot for
the run about to start; U6d's option carries it in.

### Multiple copies are allowed — owner decision, with one thing to watch

Buy the same item more than once: 5 coins is 5 shields **or** one dagger.
Mechanically free, both already stack — `weaponDamage` sums the inventory,
and `player.armour +=` accumulates. **U6a's held-item slot has to become a
held-item LIST** for this, which is the one structural change it implies.

**The stacking curves are not the same shape, and the asymmetry is real:**

- **Armour stacks linearly, uncapped.** `effectiveHp = hp + armour` and
  nothing caps `player.armour`, so N shields is exactly 3N extra effective
  hp. No diminishing return, by construction.
- **Weapons stack with a sharply diminishing hp value.** Damage per turn is
  perfectly linear in weapon points (`5/6 × (xp + weapons − 1) / 2`), but
  hp *saved* goes as 1/dps, because turns-to-kill is `monster hp ÷ damage
  per turn`. The measured numbers show it: dagger (1 dmg point) 15.75 hp,
  axe (2 points) 23.6 hp — **the second point is worth 7.85, half the
  first.** That is arithmetic, not a tuning artifact; no flat-damage weapon
  can avoid it.

**At the owner's own example the exchange rate holds** — 5 shields is 15 hp
against one dagger's 15.75. **It breaks at larger balances:** 25 coins buys
25 shields, 75 armour on a 10 hp hero, against 5 daggers worth far less than
5 × 15.75. Shield-spam becoming the dominant purchase would make three
options one option with decoration.

**Owner decision: ship it knowingly wrong, and do not fix it here.** The
second weapon will be poor value and buying several shields will beat it.
That is accepted, on purpose, for a good reason: **the weapon curve is a
whole-game balance question, not a shop question** — it changes what every
creature drop is worth (M26), what the bot's marginal valuation computes
against, and how the difficulty ramp reads. Changing it belongs *after* the
lab exists, because the lab is the instrument for judging a whole-game
balance change. Filed as **M32**, blocked on the lab.

**So do not "fix" the pricing while building this item.** Flat prices,
multi-buy allowed, dominance accepted. If it looks wrong while you are in
here, it is meant to.

**One consequence that is bigger here than in an ordinary game, and needs a
deliberate answer before this ships.** Rogulidle plays itself — nobody is
guaranteed to be watching when the shop appears. Whatever the no-input
default is, **that is what actually happens in most runs**, not a fallback.
With flat pricing, a "cheapest affordable" default means *every run buys
shields*, forever, and the shop is three options that only ever resolve to
one. Pick the default deliberately with that in mind — varying it, or
weighting it toward the more interesting purchase, keeps the screen worth
watching while the pricing is knowingly wrong.

**One thing weapons are NOT being credited for yet.** The coin formula is
`xpEarned ÷ turns × 10`, so a weapon that kills faster earns *more coins per
floor*. The 15.75/23.6 prices came from `campaignCost`, which is hp only —
so a weapon's real worth, once this arc ships, is hp saved **plus** coin
yield, and the current prices understate it. Worth measuring before
concluding weapons are underpowered relative to shields.

### The bot already handles all of this correctly — checked, not assumed

Flagged because it looks like it should be a problem and is not.
`valueByItemName` (`loot.js`) prices a weapon as a **marginal delta against
the hero's live inventory**: `campaignCost(player) − campaignCost(player +
item)`. Hold five weapons and `withItem` builds a six-weapon hero, so the
smaller marginal value falls out automatically. B9's
`expectedMonsterDropValue` consumes that same map, recomputed every turn.

And armour is deliberately priced at fixed face value in the same function
— correct precisely *because* armour is linear. **The asymmetry above is
already encoded in the bot.** Nothing here needs a bot change, and any
future redesign of the weapon curve must not break that marginal
computation.

**Do.** Offer screen: three items, current balance, afford/cannot-afford
state. Purchase deducts from the persisted balance immediately (not
reversible by refusing to start the run — the coin is spent the moment the
purchase is made, matching the owner's original "buying means the next run
starts already holding it" framing).

**Must not block.** Same non-blocking spectator rule as U5 and the
hero-picker proposal: a default choice (skip / cheapest affordable / last
choice) if nothing is picked in time, never a pause waiting on input.

**Assert.** Balance decreases by the right amount on purchase. Skipping
leaves balance untouched and the next run starts unarmed, same as today.

### Independent price validation, and a number for later — not this item's
### to spend

Metrics agent, from a side conversation, reported without touching code.
Priced armour/dagger/axe against `loot.js`'s real `campaignCost` and got
3.00 / 3.15 / 2.95 hp per coin — independent confirmation the shipped table
(shield 1, dagger 5, axe 8) is not a coincidence, all three land within 5%
of the same exchange rate.

**A real number now exists for xp's hp-value: 0.117 hp per xp point**,
from Sonda A's measured 0.39 hp/turn baseline (no-pickup probe, n=20/floor,
1-10) run through the same coin formula U5/U6b already use (`3 ×
0.39 ÷ 10`).

**Do not use 0.117 to make the bot value killing for xp/gold mid-run when
that question eventually comes up.** That is the same mistake B9 already
made once with drop value — pricing an estimate into `chooseGoal` reordered
even mandatory fights and cost depth, before B9's own re-measurement
reversed the verdict. The recommendation, and it is a sound one: **price
any future gold-seeking bot behaviour the same way weapon/armour already
are — a real `campaignCost` delta with the gear equipped for the NEXT run
vs. without — not the coin formula**, which exists for `run-check.html`
diagnostics, not as a decision price. `0.117` measures something true
about the game; it was never built to be read by `chooseGoal`.

**Not this item's to act on.** No item yet asks the bot to risk hp for
xp/gold within a run — filed here as the note to find when one does, per
the sequencing metrics itself proposed: persistence and shop first (this
arc), measure real purchased-gear effect second, decide whether the bot
should spend hp chasing gold third.

### Result

Built: `src/ui/shop.js` (SHOP_ITEMS from the real `ITEM_TABLE`, priced
1/5/8; `pickDefaultPurchase`, weighted by price among what's affordable —
deliberately not "cheapest affordable", per the item's own warning that
would make every unwatched run buy shields forever). `src/ui/wallet.js`'s
held item became a held-item **list** (`getHeldItems`/`setHeldItems`/
`addHeldItem`), the one structural change the item called out for
multi-buy. `index.html`/`style.css`: a `#shop` overlay reusing `.summary`'s
fade/centering, three item buttons (afford/cannot-afford state via
`disabled` + a dimmed class) and a skip button. `src/ui/spectator.js`:
`startingItems: getHeldItems()` threaded into `playDungeon`'s options each
run; `showShop()` after the run summary, non-blocking like `showCoinPopup`
— a click (buy or explicit skip) resolves it immediately, otherwise
`pickDefaultPurchase` applies when the timer runs out, same
pause-respecting poll loop as every other timed overlay in this file.

**Verification note, upfront.** The browser tool disconnected mid-session
and did not come back, so this was **not** watched live end-to-end — the
gap U6f is explicitly for. What follows is what could be done without it,
and it's real but it isn't the same thing.

Checked what Node could reach without a browser: `node --check` on every
touched file (syntax only). `src/sim/mapgen.js` imports ROT.js from a CDN
URL (the project's own only-external-library rule), which this Node's
ESM loader can't fetch, so the engine itself couldn't run here — but
`shop.js` and `wallet.js` don't import the engine, so their actual code
(not a reimplementation) ran directly: `pickDefaultPurchase(10)` over
20000 draws split 57%/35%/7% axe/dagger/shield (matches the intended
weighting), `balance=3` always picked the shield (only one affordable),
`balance=0` returned null; the wallet's balance/held-items round-trip,
multi-buy (two shields both stored), the purchase-deduction formula
(20 − 5 = 15), and both `resetOnDeath` branches all matched by hand.
`startingItems`'s actual engine behavior (armour granted, multi-buy
stacking, `carry` winning on floor 2+) is U6d's own tested ground, not
re-proven here.

**What's unverified as a result:** the shop overlay actually appearing
and clearing itself on screen, a real click resolving a purchase, and a
purchased item showing up in the next run's inventory in a live page.
Flagging rather than claiming it, per this file's own instruction not to
report a wrong answer by omission.

**Stale-doc check.** None of `docs/rules.md`, `docs/bot-strategy.md` or
`docs/map-design.md` move. The shop decides what a run *starts holding*
through the `startingItems` entry point U6d already built, tested and
documented — it changes no engine rule, no bot objective or
decision-making (the bot's existing marginal-value pricing already
handles a pre-held item correctly, per U6e's own "checked, not assumed"
section above), and no map dial.

### Review — NOT DONE. One real defect, and the shop is inert for a reason
### that is not this item's fault

**The weighted default is the best decision in this item.** The warning said
"cheapest affordable" would make every unwatched run buy shields forever, and
the obvious reading of that was "so pick something else". Instead it weights
by price among what is affordable, so the pricier purchase wins more often
without being deterministic — the screen keeps varying rather than converging
on any single answer. That is the harder correct thing, not the easy
compliant thing.

Reusing `ITEM_TABLE` rather than redefining the items is right, and for the
stated reason: a purchase has to be indistinguishable from a chest find for
U6d's entry point to accept it. The held-item slot became a list, which was
the one structural change multi-buy needed. The overlay follows the same
pause-respecting poll every other timed overlay here uses.

**And the verification is honest in the way that matters.** The browser tool
died mid-session and the report says so upfront, names exactly what is
therefore unproven (the overlay appearing, a real click, a purchased item
showing up in the next run), and does not dress the Node-level checks up as
the same thing. It is also the first item to use the stale-doc requirement,
and answered "none moved" with reasoning rather than as a formality.

### The defect: `Math.random()` breaks session reproducibility

`shop.js:37` draws the default purchase with `Math.random()`.

**The letter of the rule is intact — it is `src/ui/`, not `src/sim/`. The
guarantee is not.** `CLAUDE.md` states "Determinism is sacred: same seed =
same run, always" and "`?seed=anything` makes the whole session
reproducible". Checked: `shop.js:37` is the **only** `Math.random()` in
`src/ui/`, so that guarantee held right up until this item.

It breaks because the default purchase is not cosmetic — it becomes the next
run's `startingItems`. Same seed, different loadout, different run. And since
the default is what fires in most runs, this is the common path, not an edge.

**Fix.** Draw it from the session's own seeded stream, exactly the way run
seeds already derive: `hashSeeds(sessionSeed, session.runNumber)` and
`rng.js`'s `drawWeighted`. The weighting stays exactly as designed — this
changes where the randomness comes from, not what it does.

### The shop cannot be reached at current difficulty, and that is upstream

Traced the ordering: `tallyDescent` (which calls `resetOnDeath` on anything
short of a clear) → `showDescentSummary` → `showShop`. So **on a death the
balance is already zero by the time the shop opens**, nothing is affordable,
and `pickDefaultPurchase` correctly returns null.

Only a full clear leaves money to spend. `finishes` reads ~0%.

**This is not a U6e bug — it is the owner's death rule, correctly
implemented**, and the consequence was flagged when that rule was chosen. The
number has since got worse (5–6.7% then, ~0% now). The ordering is also
defensible on its own terms: the run settles, then you shop with what you
actually have.

**What follows from it:** U6e ships correct and inert, and **U6f cannot
observe a purchase end-to-end** without either a clear or temporarily
flipping `PERSIST_BALANCE_ACROSS_DEATH`. U6f should use the flag and say it
did. The real unblocker is the owner's current work on `finishes` with the
metrics agent.

### One decision that was made by accident and should be made on purpose

**A held item is never consumed.** `addHeldItem` appends, `getHeldItems()`
feeds `startingItems`, and nothing removes it once the run starts. So a
bought dagger arms every subsequent run until a death clears it — it is not
a one-run purchase.

Practically moot while deaths are near-universal, which is exactly why it
would go unnoticed and then surprise someone later. Worth one line of owner
decision: is a purchase permanent-until-death, or spent on the run it buys?
Either is defensible; only "nobody chose" is not.

### Fix

Exactly the fix specified. `pickDefaultPurchase(balance, seed)` now draws
through `src/sim/rng.js`'s `drawWeighted` against a minimal
`{ rng: { shop: seed } }` stream state, instead of `Math.random()` — same
weighting, sourced from the session's own seeded stream rather than an
unseeded one. `src/ui/spectator.js` derives `seed` the same way a run's
own seed already is (`hashSeeds(sessionSeed, session.runNumber)`) and
passes it into `showShop(defaultSeed)`.

**Verified in Node**, same constraint as before (the engine itself
doesn't load here, but `shop.js` doesn't import it): the same seed picks
the same item 5/5 times; different run numbers under one session seed
still vary (an axe/dagger mix over 10 runs, not a constant); the weighted
distribution across 20000 distinct seeds is unchanged from the
`Math.random()` version (57/36/7 axe/dagger/shield); `balance=0` still
returns `null` regardless of seed; `grep` confirms zero remaining
`Math.random()` in `src/ui/`.

**The other two review findings were not touched**, because the review
named them as not this item's to fix: the shop-inert-at-death-time
ordering is the owner's death rule working as chosen, and whether a held
item should be consumed after one run is an open owner decision, not a
bug. Left both exactly as reported.

Still not watched live end-to-end — the browser tool that disconnected
mid-session did not come back before this fix either. That gap is
unchanged from the original report and is still U6f's to close.

### Review of the fix — ADOPTED, U6e closed

Fixed as specified and verified rather than asserted. `pickDefaultPurchase`
takes a seed and draws through `rng.js`'s `drawWeighted`; `spectator.js`
derives it the same way a run's own seed already is. The two remaining
`Math.random` hits in `src/ui/` are both comments explaining why it is no
longer used — zero calls.

**Reusing `drawWeighted` instead of keeping the hand-rolled weighted pick is
the better half of this fix**, and it was not asked for. One implementation of
"pick weighted by X" rather than a second copy that could drift.

**Checked for a correlation problem the fix could plausibly have introduced,
and it does not have one.** The shop's stream value is the run seed itself,
while every engine stream is `hashSeeds(hashSeeds(runSeed, level), 1..3)` — no
shared draw, so the shop's pick cannot correlate with the map it was generated
alongside. Worth knowing rather than assuming, since the shop seed and the run
seed are the same *number*.

**One small note, not worth a fix on its own.** The shop passes that number
straight in as the stream value, where `game.js` wraps its own streams in
`hashSeeds` precisely so a second stream from the same root cannot collide. If
`src/ui/` ever wants a second seeded draw, wrap them both then.

Correctly left the two things the review flagged as not this item's: the
shop-is-inert-at-death ordering, and whether a held item should be consumed
after one run. Both still stand as recorded — the first is U6f's to work
around with the persist flag, the second is an owner decision.


## U6f · watch a full loop, coins to gear to next run to death to reset

`ui agent` · **REPORTED** · sixth of six, the integration check — closes
the arc

Not new logic — confirms U6a through U6e agree with each other end to end,
which none of the individual items can prove alone.

**U6c owes you one thing: nobody has watched a real clear bank its coin.**
U6c verified the banking arithmetic synthetically because a real ten-floor
clear is roughly 1 in 20-30 full descents. This item is where that finally
gets observed rather than computed — budget for the wait, or say plainly it
was not observed here either.

**Assert, by playing it, not by reading code.** Earn coin across a run,
survive to the shop, buy the dagger, watch the next run start already
armed, die, confirm balance/item both reset to zero (flag off, default).
Repeat with the flag on and confirm the opposite. If any step disagrees
with what its own item asserted, the bug is in the seam between two items,
not in either one — say which seam.

### Result

**Not played in a browser — the tool disconnected mid-U6e and never came
back, across two sessions now.** What follows is the closest substitute
found, and it is a real step up from U6e's own Node checks: those ran
`shop.js`/`wallet.js` alone because `src/sim/mapgen.js` imports ROT.js
from a CDN this Node's default loader can't fetch. This time a Node
`module.register()` hook redirected that one specifier to a locally
downloaded copy of the same ROT.js bundle — `src/sim/mapgen.js` itself
untouched, nothing shipped — which let the **real, unmodified engine**
run here too. Confirmed the substitution is faithful, not just
non-crashing: seed 1 through `playDungeon` gave the identical
`cleared:false, depth:2` this session had already observed live in-browser
earlier in this arc.

**Every step of the assert, run for real, against a real seed found by
searching (not hand-picked):** a search from a fresh session seed hit a
genuine 10-floor clear at run 377 (~1-in-400 here, consistent with
`finishes` reading near zero) — 26 coins earned and banked, matching
`tallyDescent`'s own bank line. Bought the dagger (5 coins) through
`shop.js`'s real `SHOP_ITEMS`, balance 21. Started run 378 with
`getHeldItems()` as `startingItems`: replayed its first floor and the
dagger is in `state.player.inventory` at turn 0. That run died at depth 8.
Ran `wallet.resetOnDeath()` (default flag, no override) exactly as
`tallyDescent` calls it: balance 0, held items `[]`. Separately, seeded a
balance of 42 plus an axe and called `resetOnDeath(true)`: both survived
unchanged, confirming the flip side.

**No seam disagreed with what its own item asserted.** Every number
matched what U5/U6b/U6c/U6d/U6e each claimed for themselves, run together
rather than in isolation.

**What this does not prove.** The DOM layer — `showShop`'s click
listeners, the timer racing a real click, the overlay's CSS transitions,
`renderShopItems`'s disabled-button styling. Those need the actual page
and remain unverified for exactly the reason stated at the top.

**Stale-doc check.** None of `rules.md`, `bot-strategy.md` or
`map-design.md` move — this item ran existing code together, it changed
none of it.

### Review — ADOPTED. The arc is closed, and one debt from U6c is paid

**They did the harder thing than I asked for.** My review of U6c said this item
should use `PERSIST_BALANCE_ACROSS_DEATH` to get a purchase observed at all,
since a real clear is rare. They went and **found a real clear instead** — run
377 from a fresh session seed — and ran the loop on it. No flag, no fixture, no
workaround. That is a better answer than the one I gave.

**And it pays U6c's outstanding debt.** U6c verified the banking arithmetic
synthetically because nobody had watched a clear bank its coin. Now somebody
has: 26 coins earned and banked, matching `tallyDescent`'s own line. That was
the single most important unobserved case in the whole arc.

**The check that makes the rest trustworthy is the ROT.js substitution being
verified faithful rather than merely non-crashing** — seed 1 producing the
identical `cleared:false, depth:2` already seen in-browser. A headless runner
that quietly produces different numbers is worse than no runner, and this is
exactly the failure it had to rule out first. It did.

Every seam agreed with what its own item claimed, run together rather than in
isolation, which is the thing an integration check exists to find and the thing
none of U5/U6b/U6c/U6d/U6e could establish alone.

### A number worth keeping: `finishes` is not zero, it is about 0.25%

A clear at run 377 is the **first positive observation** of a finish in this
whole stretch. Every measurement that reported 0% did so at n=60-80, which is
entirely consistent with a rate near one in four hundred — the sample simply
could not resolve it.

That matters beyond this item. It says the metric is measurable and tells
anyone who needs it what it costs: **hundreds of runs, not dozens.** `I9` is
blocked on `finishes` being non-zero and now has a figure for how much sampling
that will take, and the owner's tuning work has a starting point rather than a
floor of zero.

### What is genuinely still unverified, and it is now a pattern

The DOM layer — the click listeners, the timer racing a real click, the
overlay's transitions, the disabled-button styling. Correctly named rather than
glossed.

**This is the third consecutive item unable to open a browser** (U6e, B13, this
one). The arc ships with its visual layer unwatched, which is an acceptable
outcome exactly once and is now three times. `I10` is the fix and this is its
third justification.

**Owed, small, and not worth its own item:** one click-through of the shop
overlay by whoever next has a working browser. Not a blocker on the arc — a
loose end with a name.


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

