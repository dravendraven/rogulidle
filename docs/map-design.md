# Map design — the spine and its detours

**Why the map is shaped the way it is.** The mechanism and the reasoning; not
the numbers, and not a snapshot of what was measured once.

**No measured values here, deliberately.** `CLAUDE.md` already says it:
numbers come from the instruments, run on demand, and a written-down
measurement goes stale and gets compared against anyway. The previous version
of this file carried a table of spine-mass readings that drifted about twenty
points below reality while nobody noticed — the dials it quoted stayed
accurate, because `docs/balance.md`'s table has an owner and a rule, and the
measurements rotted because they had neither. **Dial values live in
`balance.md`. Readings come from `run-check.html`'s tripwires.
Findings live in `docs/project/decisions.md`.**

---

## What the map has to do

Four properties, owner-defined. They **derive from
`docs/project/objectives.md`** — the map is where "the outcome stays uncertain
for as long as possible" and "a decided run ends quickly" become geometry — and
they live here rather than there because each one names a mechanism. The root
document names none.

**No status here, deliberately** — same rule as the readings above. Whether a
property is currently met is a live question owned by a backlog item, named
below where one exists.

**1. A difficulty curve of a designed shape, not a ramp.** The old statement —
"starts low and accelerates, with the last floor hardest" — was wrong because
it conflated curves that move differently, and there are three of them.
**Threat mass**, how much creature a floor holds, does rise monotonically
across the descent, and the exact closed form over the tier distribution still
guarantees no floor is cheaper than the one above it. **Death risk** does not
follow it. **Variance** follows neither.

| stretch | threat mass | death risk | variance |
|---|---|---|---|
| the opening | low | **high** — the buffer is small, so even a cheap floor can end the run | absolute low, **relative at its highest** |
| the build-up | rising slowly | **falling to the run's low** | lowest of the run in challenge, highest in reward |
| the wear-down | rising faster | **rising again** | still low |
| the turn | maximum | maximum of the descent | **lowest of the run**, absolute and relative |
| the return | the same floors, differently populated | high, rising to the exit | **highest of the run**, rising to the exit |

**The middle is two stretches, not one, and the boundary is the hero's own
capacity peak.** Before it, capacity outgrows the floor and risk falls. After
it, capacity is being ground down while threat keeps accelerating, so risk
rises for two reasons at once. `balance.md` states the arc in one line — the
hero builds up and is worn away — and that peak is where the relief ends.
**Where the peak sits is a design decision**, not an observation to accept: an
early peak makes the relief short and the ramp long, a late peak makes it long
and the ramp abrupt.

**The opening is hard on purpose, and cheap in time.** A run that fails there
fails fast. That is "a decided run ends quickly" turned into geometry: a bad
start costs seconds rather than a long walk to a foregone conclusion. Its
variance is also the cheapest in the game to produce — the spread of creatures
is small there, and what makes it decisive is the buffer it is divided by. A
hard opening needs a poor hero, not a big monster.

**The middle is where the stake is loaded, not where it is decided.** Low risk
there is not dead time, on one condition — what is accumulated in the middle
has to visibly determine the return.

**And low challenge variance in the middle is a requirement, not a defect.**
Accumulation is only legible when it is predictable; a noisy middle means
nobody can read whether the hero is on track, which is the one job that stretch
has. What carries interest there is variance of **reward**, not of challenge —
which is exactly the bargain below, and the bargain belongs to that stretch
specifically rather than to the whole run. It also reframes a defect this
project has measured more than once: challenge variance falling as floors get
larger is the wanted behaviour *in the middle*, and wrong everywhere else.

**The turn is an exam.** Maximum threat, minimum surprise, recognisable in
advance and therefore preparable. An exam with a draw in it is a draw, and the
attribution the turn exists to provide goes with it.

**2. Route OPTIONS, priced differently — not a fixed pair.** Owner-defined,
2026-08-18, twice: first as "two routes always, choosing is mandatory", then
refined the same day by watching the built form. Floors should offer routes
with different price profiles — shorter and denser against longer and
sparser — with Cautela as the driver: the long road spends stamina to save
blood. **What watching corrected:** exactly-two-always made every seed look
alike, and a fixed pair reads as ORDERING when the bot clears the floor
anyway; choice also needs SKIPPING to be possible, which the greed/caution
economy governs — topology can only offer it. The requirement is options
varied per seed on maps open enough for alternatives, a theme per generator,
drawn per floor (`dcss-layouts.md`'s catalogue conclusion, and the owner
named Diablo as the reference). `decisions.md` M50 has the verdict. **The
built map is still the one-spine subset.**

**3. A tail of randomness, and the tail has a designed shape of its own.** A
creature can come from above the floor's band. What changed is that the tail is
**not monotone across the run**: it thickens through the middle, **closes at the
turn**, and reopens on the return, where it is the entire mechanism and widens
all the way to the exit.

The earlier statement asked for a tail growing smoothly to the last floor.
That was the ramp assumption again, applied to the second moment instead of the
first. `X6` owns a separate and still-live question — why the built tail does
not do even what it was asked for: an absolute spread contained by a
proportional clamp.

**4. Most of the threat on the route network — and reward concentrated off
it.** If a direct run to the portal can skip most of the floor, the mandatory
path is not mandatory: a direct run wakes well over half the floor. Under the
two-route shape this splits in two: threat MASS concentrates on the routes
against the sides (and between the two spines, the short one is the denser),
while the reward/threat RATIO is always better off-route — but non-uniformly,
so a side room is a bet, not a bonus. The floor's best outcome is only
reachable through side rooms; the optimum is accepting SOME.

**Placed is not woken, and property 4 is about woken.** `SPINE_THREAT_SHARE`
controls where threat mass is *placed* at generation. What a direct run
actually meets depends on activation radii and route geometry — a creature
standing on the mandatory path with a small activation radius can be walked
straight past. The two are different quantities and both now exist:
`topologyShape` walks the shortest hero→shrine route and compares every
creature's real distance against its own activation radius, the same rule
`monsters.js` applies in play. Placement has a dial; the woken quantity has an
instrument, and no dial of its own on purpose.

## The bargain

A floor should offer **a mandatory route choice** — short and dense against
long and sparse — plus **side rooms that can be skipped**: fewer but nastier
creatures, better chests, and a non-uniform ratio between the two, so some
bets are great and some are traps. Commit to a road, then gamble for gear you
will want three floors down — or do not.

That is the whole design. **What is BUILT today is the one-spine subset**:
one mostly-linear mandatory path holding most of the threat, side rooms
beside it. Everything below is how that subset is arranged and what went
wrong on the way; the full shape is "The owner's target shape" below.

## The return

The run reaches the last floor and comes back up. **The same map seed, a
different creature seed.** The geometry is the one already walked; the
population is not.

**The geometry carries recognition and the population carries surprise**, and
splitting them that way is the whole reason the return is worth building. The
viewer has already watched these floors and knows what stood where, so the
return reads as a place revisited rather than as more dungeon — which is what
lets it hold the highest variance in the run without becoming confusing to
watch. Surprise on known ground is legible; surprise on unknown ground is
noise.

**Why the creature seed differs at all.** Repopulating the floor with the same
roster would make the return *easier* than the descent, not harder: the hero
comes back holding everything it found, against creatures it has already
beaten. An unchanged floor is a victory lap.

**The return removes the chests.** With nothing to detour for, the map stops
offering the bargain and becomes a routing problem: get through, or fight
through. That is the intent — the descent is where reward is decided, the
return is where it is kept or lost.

**Creature drops stay.** Removing those as well would make every fight strictly
unprofitable, and a stretch where fighting never pays collapses into one
decision repeated at every floor. Keeping them means a fight can still be worth
taking, so "fight or route around it" stays a real question.

**Variance is the dial, and it accelerates toward the exit.** The return draws
its creatures from a wider band than the descent did, and the band keeps
widening as the hero climbs. Removing the loot is not what makes the return
hard — absent loot is the denominator, not the threat; it stops resupply and
adds no risk. The widening draw is the threat.

**One dial does the work of two, and the reason is worth stating because it is
not obvious.** Widening the draw on a shallow floor can only widen *upward*: a
shallow band already sits at the bottom of the creature table, so there is no
room beneath it and every unit of spread added there becomes threat rather than
symmetric noise. So as the return approaches the exit — the shallowest end —
the mean rises with the variance, without anything separate pushing it. The
tension peaks where the hero is weakest in supplies and the floors are nominally
weakest in creatures, which is why the last floor before the exit can still end
a run.

**What this shape does not buy is a price on time.** Nothing costs the hero for
lingering, so "fight or route around it" is not priced the way a clock would
price it, and the return is thinner as a decision than DCSS's equivalent. With
the chests gone there is little reason to linger, so what is met is what stands
on the route — which is why this is worth trying first anyway: it is one dial
against a whole mechanism. **If the return reads as passive, a clock is the
first thing to add**, and no item owns that yet.

**What the return does to the economy.** All reward is earned on the descent,
so the return decides only whether it is kept. That is the point rather than a
side effect: the hardest stretch of the run judges what the easy stretch
accumulated, which is the attribution `docs/project/objectives.md` asks for and
the reason the middle is worth watching.

## The run laid out — the shape to build against

Ten floors, nineteen traversals. **Every floor is crossed exactly twice
except the deepest, crossed once** — the hero climbs out of the bottom, it
does not re-cross it — and the second crossing is what the first one
earned.

| traversal | floor | direction | map | threat mass | variance | chests |
|---|---|---|---|---|---|---|
| 1–2 | 1–2 | down | generated | **low** | **narrow** | yes |
| 3–8 | 3–8 | down | generated | rising, slowly then faster | widening | yes |
| 9–10 | 9–10 | down | generated | **maximum of the run** | **narrowest of the run** | yes |
| 11–18 | 9–2 | up | reused from traversal `20 − k` | **falling** — each floor keeps its own | **widening** every floor | **none** |
| 19 | 1 | up | reused from traversal 1 | **lowest of the run** | **widest of the run** | **none** |

**The pairing rule.** An ascent traversal `k` crosses floor `20 − k`, and
reuses the map that descent traversal `20 − k` generated. Traversal 11 is
floor 9 — the first climb out of the turn; the deepest floor is crossed
once. Traversal 19 is the second crossing of the first floor.

**The doors swap on the way up.** The hero emerges where the floor's shrine
stood (it climbs the stairs it went down) and exits where it originally
entered — geometry continuity, done after generation so the floor stays
byte-identical to its descent twin. The shrine guardian therefore receives
the hero on arrival, which is deliberate.

**Mass and variance move in opposite directions on the way up, and that is
deliberate.** Every floor keeps its own roster size, so the mass a traversal
holds *falls* as the hero climbs, while the band it draws from widens. The
return is not dangerous because it is crowded — it is dangerous because a thin
floor drawn at a wide band can produce a single creature the hero has nothing
left to answer with. **The median return traversal is easier than its descent
twin. The worst one is far harder.** That gap is the whole finale.

**Four things change on a second crossing, and nothing else does.** The map
is reused rather than generated. The doors swap (built). The creature seed is
redrawn from a wider band (R2). The chests are gone (R3). How a floor is dug,
how the spine is classified, how creatures are placed against it — all
unchanged. That is what makes the return cheap: it is a second pass over
existing machinery with a few inputs swapped.

**Traversal 19 is the one to design for.** Nominally the weakest floor in the
game, drawn at the widest band in the run, met by a hero whose supplies are
gone. Two curves cross there — the band widening and the hero's stock falling —
and that crossing is the intended climax. **A run that cannot be lost on
traversal 19 has the wrong shape**, whatever the rest of the table says.

**And the opening's variance is relative, not absolute.** Traversals 1–2 draw
the narrowest band in the run and are still the deadliest stretch of the
descent, because what makes a draw decisive there is the buffer it is divided
by. Widening the opening's band is the wrong lever for the opening.

**The failure mode this shape has.** If the late return traversals read as
empty stretches punctuated by an instant death, the mass has fallen further
than the widening band can carry on its own and needs a floor under it. That is
the first thing to look for when this is built, and nothing owns it yet.

**This table says which quantity moves and in which direction. It states no
values** — what each band actually is lives in `docs/balance.md`, like
everything else.

## Drawing the curve — two lines, and the third falls out

The table above is the shape. This is the language it is written in, so a
different shape can be stated without inventing new vocabulary each time.

### The two lines

| line | what it is | reads |
|---|---|---|
| **pressure** | what a traversal costs ÷ what the hero has when it arrives | `1.0` = the traversal costs exactly everything the hero has |
| **spread** | the traversal's upper tail ÷ its own mean | `0` = every run of that traversal costs the same |

Both are ratios, so both are comparable across traversals, tiers and heroes
without rescaling anything.

**Pressure is not a new quantity** — it is what the project already calls net
challenge. **Spread must be one-sided.** A symmetric statistic answers the
wrong question: it treats "cheaper than average" as identical to "harder than
average", and the whole design of the tail is about one of those two.

### Why two, and never three

**Death risk is an output, not a line.** It is what pressure and spread produce
together. Draw all three and you have drawn an inconsistent triple, because the
third was already determined by the first two.

> **Draw two. Derive the third.**

### Why normalising is what makes two enough

The opening is the proof. Its threat is the lowest in the run and its risk is
the highest — which looks like a contradiction until the ratio is taken. **The
numerator is not large; the denominator is tiny.**

Dividing by capacity folds the hero's whole state into the line. Without that,
a third axis would be needed just to carry the buffer — and it is exactly that
missing axis that made the old "starts low and accelerates" statement wrong.

### The curve this project wants, in those two lines

| traversal | pressure | spread |
|---|---|---|
| the opening | **high** — capacity is at its minimum | low |
| the build-up | **falling to the run's minimum** | low |
| the wear-down | **rising** — capacity has peaked and threat has not | low |
| the turn | **the maximum, approaching 1.0 without reaching it** | **the minimum of the run** |
| the return | **roughly flat** — mass and capacity fall together | **the maximum, rising to the exit** |

Three things this shape says that a single difficulty curve cannot:

- **The opening and the turn are both hard, for opposite reasons.** One has no
  denominator; the other has a large numerator.
- **The valley is a trough in pressure, and the trough's floor is where the
  relief lives.**
- **The return is carried entirely by the second line.** Pressure barely moves
  there. If the return ever reads as a victory lap, the fault is in spread, and
  raising the mass would be treating the wrong line.

### How each line is used, and they are not used the same way

| | pressure | spread |
|---|---|---|
| exact closed form | **yes** — the expected-mass form over the tier distribution | no |
| can the dials be **solved** for a target? | **yes** | no |
| can it be measured after the fact? | yes | yes |

**So pressure is drawn and solved; spread is drawn and then measured.** Sweeping
for a pressure curve that a closed form can solve is wasted work. Expecting to
solve for a spread curve is the opposite error — `X6` already owns the case
where the built tail does not do what it was asked.

### What feeds each line

```
pressure = (count × per-creature strength × grouping) ÷ (hp + armour + weapon + consumables)
spread   = tier band width + the out-of-depth tail + side-room variance + the return's widening
```

Both are nested sets, and every term in them is an existing dial or an existing
probe. **Adopting this language requires no new instrument and no new
parameter** — it renames what is already measured so that a shape can be stated
before it is built.

### The guardrail

Two lines to draw a curve against is **exactly the shape of the programme that
already failed here** — organised around approaching an external difficulty
curve, twelve items closed, one survived. `docs/project/decisions.md` has what
it cost.

> **This is a language for saying what shape is wanted. It is not a target to
> push.**

Draw the two lines to state the intent, solve the dials for pressure, then
**watch the game**. When the drawn curve and the watched run disagree, the
watched run wins. The failure mode to recognise is the moment someone argues a
line should be higher because the line should be higher.

## The curve comes in pieces

**One curve anchored at floor 1 was the only shape this game could have.**
Every per-floor number — how many creatures, how strong, how wide the band
— was a formula counting floors down from the first, so the whole descent
was one gesture and the only way to change its middle was to change its
start.

`model.floors` is a list of ANCHORS: `[{ from: 1, …dials }, { from: 4,
…dials }]`. A floor is drawn by the last anchor at or above it, counting
steps from that anchor's own floor. **A model with no `floors` is one
anchor at floor 1**, which is the shipped game and every
`dial-overrides.json` written before this existed — that is why it is an
optional field and not a new argument.

**What it is FOR is not mainly the curves.** Of the model's thirty-odd
fields only six are growth; the rest are flat per-floor values —
`dugPercentage`, `mapSize`, `mapTheme`, `clusterSize`, `chestMix`. For
those, an anchor at floor 4 simply means "from here the value is different",
and that is the immediately useful half: floors 1–3 small and tight, 4–7
open, 8–10 hubs.

**Two rules about what a second anchor inherits**, both chosen rather than
fallen into:

- **The run-wide four are never per-segment** — `levels`, `vaultLevel`,
  `vaultChestItems`, `vaultBoss`. A segment cannot hold a different answer
  and mean anything by it: `vaultLevel` already names a floor.
- **`earlyTierCut` resets to 0.** It is the tutorial discount, and it
  belongs to the start of the GAME, not the start of every stretch.

**What it looks like in `dial-overrides.json`.** The first anchor is also the
model's root — that is what a file without `floors` has always been — and it
is repeated inside the list, so nothing has to know which entry is special:

```json
{ "model": {
    "monstersBase": 5, "dugPercentage": 0.25,
    "floors": [
      { "from": 1, "monstersBase": 5, "dugPercentage": 0.25 },
      { "from": 6, "monstersBase": 12, "dugPercentage": 0.32, "mapTheme": 5 }
    ] } }
```

**Every anchor is written whole, never as a diff.** An anchor is only
meaningful complete: a file carrying half of one would inherit the rest from
code defaults, which move. That is also why the Lab's "salvar como padrão"
emits the entire curve rather than the rows you touched.

**Re-anchoring is continuous, except for the creature count.** Give a new
anchor the values the old curve produced at that floor and the floors below
it come out identical — verified for strength, tier floor, tier slack, the
rare tail and the spread. The COUNT drifts by up to one creature, because it
is a whole number: the anchor stores the rounded 5, and five times the
growth is not what four times the growth five floors down was. Worth knowing
before reading a difference as a defect.

**The section below is still true of the Digger, and it stopped being the
whole story.** `mapTheme` says which generator digs a floor — per ANCHOR,
so the shape is a property of the FLOOR rather than of the run. That is
deliberate and it is the DCSS shape: there, a level draws a layout from a
shelf, and a branch is recognisable because its floors are not all the same
algorithm. `layoutFor()` in `difficulty.js` is the one place that decides,
so a new layout is a case there and a file beside `layout-hub.js`. (The
modulo dials that once did this — `HUB_EVERY`, `RING_EVERY` — were deleted
when the theme became the one selector; an anchor expresses any mapping a
modulo could.)

The reason a second one exists is a finding, not a preference. ROT's Digger
**accretes**: it glues a feature onto the wall of a feature it already dug,
at random, until the quota is full. It holds no notion of a centre, of a
branch, or of how many ways lead out of anywhere — so a floor with a
deliberate shape is not a setting of it. The owner spent a session tuning it
and disliked every result, which is the evidence that the numbers were never
what was wrong.

`hub` computes instead: a central room, a ring of rooms around it, a corridor
to each. `docs/project/dcss-layouts.md` is where it came from — DCSS's
`layout_geoelf_octagon`, whose header comment is "A large central room, with
2 rings of other rooms around it".

**What it changes for this document.** On a hub floor the hero starts at the
centre and the exit sits on the rim, so **the spine is drawn rather than
discovered**: the route is one arm and every other arm is refusable by
construction. `spine.js` still reads it the same way — it runs A* and
classifies what the path crosses — but on a Digger floor that reading is of
an accident, and here it is of a decision. The bargain this file describes
finally has geometry built to hold it.

**What it costs, and it is not small.** Connectivity was free with the
Digger and is not free here: a computed layout can strand a room, so
`test/tests.js` asserts every room is reachable across five configurations.
DCSS's own answer is heavier — it validates after building and **vetoes the
whole level** when it fails, discarding and rebuilding. We assert instead of
veto because the arms are joined to the centre by construction; if a third
layout ever cannot promise that, the veto is what it needs.

**Two rings ask for a big grid.** A ring is a packing problem — arms must
clear the hub, each other, and the map's edge — so the layout solves the
room size DOWN from `ROOM_WIDTH`/`ROOM_HEIGHT` until the geometry closes,
and returns nothing when it cannot. Measured: two rings on a 44-grid come
out at 11 rooms; on 32 the same request produces small ones or falls back to
the Digger.

## Nothing new is dug

The digger already produces maps with a route from hero to shrine and rooms
hanging off it. We simply never read that structure. `src/sim/spine.js` is a
**classification pass over a finished map**: a room is *spine* when the
hero→shrine path crosses its rectangle, *side* otherwise.

Because it only reads, **it cannot fail to produce a floor and it consumes no
randomness** — a property worth protecting, since it means the classification
can never desync a seed.

The one generation change the bargain needed was digging less than ROT's
default, so that a mandatory path exists at all. Dig too much and there are
several equivalent ways through, and "mandatory" stops meaning anything.

### Two knobs, because one was doing two jobs

That paragraph was true and incomplete, and the gap cost this design a
choice it never had to give up.

ROT's Digger picks room-or-corridor from a weight pair fixed in its
constructor and never exposed as an option — stock, the two are equally
likely. So `MAP_DUG_PERCENTAGE` was buying **rooms and corridors in
lockstep**: the only way to ask for more side rooms was to also ask for
more corridor, and more corridor is exactly the maze this file says the map
must not become. Digging less bought linearity by giving up the detours;
digging more bought detours by giving up the linearity. There was no
setting that was both, because one number was answering two questions.

`ROOM_BIAS` splits them. **`MAP_DUG_PERCENTAGE` says how much is dug;
`ROOM_BIAS` says into what.** Bias the draw towards rooms and the same
excavation comes back as rooms hanging off a shorter route instead of
sprawl — measured, holding the digging fixed and biasing three-to-one takes
corridor tiles down by half while side rooms go **up** by a third.

Two things about it are worth keeping in mind before touching it:

- **It pulls against spine share, and that is arithmetic, not a defect.**
  More side rooms means more places for threat mass to sit off the
  mandatory route. Property 4 and "some side rooms" are in genuine tension;
  this knob does not resolve it, it just lets the trade be made on purpose.
- **`MAP_DUG_PERCENTAGE` still owns the vault.** The authored room needs a
  9×9 of untouched rock, and a single corridor tile crossing an empty
  region kills the window. Digging is what eats that space — the bias
  barely moves it. `run-check.html`'s **"the vault went missing"** wire is
  what says so out loud; it exists because the claim in `src/sim/vault.js`
  that the scan fails on 1 seed in 200 was measured on the CODE DEFAULTS
  and the shipped digging had moved a long way from it without anyone
  noticing.

`CORRIDOR_MIN` is the third and smallest: the only knob that changes how far
apart rooms sit. Neither of the other two does — they change how much
corridor there is, not how long each one runs.

## One dial does the whole risk/reward trade

A side room is treated as if it sat deeper than it is
(`SIDE_ROOM_DEPTH_BONUS`).

That single dial is the entire risk/reward design, and it works because
**depth already drives both halves**: it picks the creature tier *and* sets
chest quality. Push it up and detours get more dangerous and better paid,
together. Set it to zero and side rooms become ordinary.

Supporting dials, all in `balance.md`: `SPINE_THREAT_SHARE` (how much of the
threat belongs on the mandatory route), `MIN_ROSTER_FOR_SIDE` (below this the
whole roster goes on the spine), `SIDE_CHEST_BIAS` (how much likelier a chest
lands in a side room), `CHEST_QUALITY_BY_DEPTH`.

**Mass, not headcount.** Cost tracks hp against damage output, so a floor can
put most of its *bodies* on the spine and still hide the dangerous half in a
side room. Placement is greedy against a running mass share, which converges
without needing the roster total in advance. Combined with the depth bonus this
produces the intended shape by itself: side rooms fill a smaller mass budget
with fewer, heavier creatures.

**`MIN_ROSTER_FOR_SIDE` exists because the split is too coarse on small
floors.** With two creatures, putting one in a side room is already half the
mass. So the shallowest floors deliberately do not attempt the split at all —
which means **the roster size and this threshold interact**, and changing the
creature count silently changes which floors have side rooms.

## Risk and reward have to roll separately

This is the part worth understanding before touching anything here.

The first version gave every side room the same depth bonus, which meant
**risk and reward were perfectly correlated**. Every detour offered the same
ratio — and a gamble with a fixed favourable ratio is not a gamble, it is a
free lunch, always correct to take. That is why forbidding, requiring and
permitting the detour all produced identical dungeons: there was no decision
in any of them.

Each side room now draws **two independent numbers**, one feeding the creature
tier and one feeding chest quality. The average side room sits where it always
did; individual ones range from a den of ogres guarding a dagger to a lone bat
sitting on an axe. `edge = reward − risk` is recorded on everything placed in
the room, so a measurement can ask the only question that matters.

**The bot needed a longer ruler for this to mean anything.** It priced gear
against the current floor alone, so it was structurally incapable of valuing
"useful three floors from now" — the exact thing this design is about.
`LOOT_CAMPAIGN_HORIZON` now counts the creatures still ahead, discounted by
the chance of living to meet them, because counting all of them at face value
assumes the hero survives to swing the sword.

**Variance alone made things worse; the horizon is what made it a decision.**
The bot walked into the bad rooms without noticing until it could price the
future. That pairing is the finding, not either half on its own.

## What is still open: there is no choice, in either direction

The honest half, and it has survived being re-measured.

**The bot opens nearly everything** — good room, bad room, spine room alike.
An earlier reading suggested it opened *more* bad rooms than good ones, which
would have been an inversion worth explaining. It was not real: those runs
dropped a fresh unarmed hero onto deep floors in isolation, where it dies
early, so "chests opened" was mostly measuring how far it got before dying.
Measured over real descents, the two rates are the same within noise.

**So the gamble is still a free lunch.** The variance made individual rooms
differ without making any of them worth refusing. That much has held up.

**The diagnosis that followed it was wrong, and the correction is the useful
part.** This file used to say the thing to attack was the **level** of the
reward — that a chest is worth its walk almost always, so no amount of varying
the odds produces a decision. That reads the trade from one side only.

**A detour is refusable only if taking it can cost the run.** Refusing is
correct when the walk, the fight and the hp they spend can end the descent, and
no reward level makes an offer refusable while the downside is bounded by
nothing worse than a slower floor. Lowering the reward until detours stop
paying does not create a decision either; it deletes one. **What is missing is
on the cost side, not the reward side** — and that is a different item from the
spread.

`M4` is the scheduled attempt at the spread. `M36` owns the cost side.

### A cost side now exists, and it did not close the gap

`M42` stage 1 gave time a price: a per-traversal turn budget, named and
tightenable. **Measured across a six-fold tightening, the side-room opening
rate does not move at all** — flat within noise at every step, against a spine
rate that is also flat. Runs get shorter and more of them end without
completing; **not one detour is refused.**

**The reason is structural, and it is the useful part.** A cost the deciding
agent never reads cannot change a decision. The budget is derivable — remaining
is the cap minus the turn, both already public — but nothing in the bot prices
it, so tightening does not produce refusals. It truncates the runs that were
already wandering and turns them into losses.

**So the open gap is now narrower and better located.** It is no longer "there
is no cost side". It is: **a cost exists and nothing weighs it.** Making the
detour refusable needs the decision to carry the price, which is a bot change,
not a map one — and tightening the budget further before that only buys deaths.

## The owner's target shape — two spines and the bet belt (2026-08-18)

> **The first concrete form of this — the ring — was built the same day,
> watched, and refused**: too predictable between seeds, and a fixed pair of
> routes reads as ordering when the bot clears the floor anyway.
> `decisions.md` M50 has the verdict and the three learnings. The PHILOSOPHY
> below stands (route options priced differently, bets off-route, stamina as
> the long road's currency); the prescription "always a ring, always exactly
> two" does not. The machinery built for it — second-route derivation, zone
> classification, the walked-route trace, the route-mass split — is
> generator-agnostic and stays.

The owner's answer to the open gap above, recorded before any code. It is a
TOPOLOGY change, not a pricing one — the choice moves from "price this room"
to "commit to a route".

**1. Two routes to the hole, and choosing is mandatory.** Nearly every floor
offers a SHORT, DENSE route and a LONG, SPARSE one. Reaching the hole means
picking one; there is no third way. **Cautela is the driver**: high caution
reads as the long road (fewer creatures per tile, more stamina spent), low
caution as the short one (cheaper in turns, dearer in blood). The bot needs
no new verb for this — `dangerField` already prices tiles by menace and
caution already multiplies that price, so given the topology, route choice
should FALL OUT of the machinery that exists. Whether it actually does is
the first thing to measure.

**2. The side bets stay, parallel to both routes.** The existing bargain,
governed by Coragem and Ganância, unchanged in principle.

**3. Reward concentrates in the bets; threat mass does not.** The
reward/threat RATIO is always better off-route than on it — but the reward
is deliberately NON-UNIFORM across side rooms: a great room and a trap room
both exist, which is what makes it a bet ("risk and reward have to roll
separately" is this, already built). The floor's best outcome is only
reachable through side rooms; the optimum is accepting SOME and refusing
others — never all, never none.

**Properties 2 and 4 and "The bargain" above already state this shape as
the design** — this section is the record of where it came from and why.
One enabling condition bears repeating: **the map must grow.** On today's
small floors distance is trivial, so neither the stamina budget nor a route
choice has room to matter. Map size is the enabling condition, not a
detail.

**Why this answers the open gap where tightening the budget did not.** The
measured dead end above stands: a cost the deciding agent never reads
cannot change a per-room decision, and the owner has ruled the bot does not
read stamina. This shape routes the cost through a choice the bot ALREADY
makes — route selection through priced tiles — so the budget differentiates
OUTCOMES (the long road spends what the short road keeps) without the bot
ever holding the number. Stamina becomes the currency of caution, hp the
currency of haste.

**The engine piece closest to this already exists**: `layout-hub.js` draws
ring layouts, and a ring is two ways around by construction. M8 (layout
variety) is the adjacent item.

## Two things to check whenever this area changes

**The shallowest floors and `MIN_ROSTER_FOR_SIDE`.** Changing the creature
count moves which floors attempt a split at all, which moves spine share on
exactly the floors most sensitive to it. This has bitten before.

**Spine share against its band.** It has been broken and restored more than
once — by clustering, and again by shrine placement — and it is not
self-correcting. `test/tests.js`'s spine tests guard it;
`docs/project/decisions.md` records why it and CV pull against each other,
and that the fix is never to widen the band or edit the test.

## What was tried here and did not work

Not repeated here. Corridor-seeking, exposure pricing, the activation cap,
threat-scaled crowd penalty, and the retracted mass-quota diagnosis are all in
`docs/project/decisions.md` with the numbers that killed them.

The one lesson worth restating because it was learned in this file: a gap was
reported as a finding at 1.3 standard errors and a causal story was built on it
within the same session. It later measured at nothing. Do not explain a
difference until it clears 2 sigma.
