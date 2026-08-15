# What we learned

Findings that cost something to get and would cost again to relearn. The
full record — every item, result and review — is in the git history; the
commit messages carry the reasoning. This is the residue.

## What the measurement programme cost

Moved here from `objectives.md`, whole and unshortened. It is history, and it
is the most expensive lesson in the file.

Twelve items closed under an earlier programme organised around approaching
DCSS's difficulty curve. **Seven were instruments** — the ruler, the probes,
buffer turning out to be two quantities, reward measured twenty times wrong.
Three changed the game. **One stuck.**

Then the owner watched the bot play for one session and found six real defects —
creatures that dealt literally zero damage, floors cheaper than the floor above,
empty maps, an unguarded exit. **Not one had shown up in any metric.**

**The mistake was the anchor.** The targets came from attribute scales rather
than observed play, and it was never established that the quantity being chased
had anything to do with whether a run was worth watching.

**What survives:** the instruments, as a regression check — "did something
break" — not as a scoreboard. They caught real things. Numbers are produced on
demand and never written down; a recorded measurement goes stale and gets
compared against anyway.

**The rule that replaced the programme:** measure only when you cannot tell by
looking. Most of what is wrong with this game is visible in thirty seconds of
watching. Reach for an instrument when a question is genuinely invisible — "is
this floor actually harder than that one", "did that change break something
three floors down" — and not before.

**The distinction that lets both halves be true.** Sections of this file give
numbers, and the root document says no number is a goal. What failed was a
*scoreboard*: a quantity to push in one direction, with everything downstream
inheriting the assumption that pushing it made the game better. CV went up;
nobody could say the game improved. A **tripwire** is the opposite shape — "if
a direct run skips most of the floor, something is wrong" does not reward being
pushed; it fires or it does not, and when it fires there is a defect to find.
That is what makes "fix what is wrong" actionable instead of a matter of taste.

## Measurement

**A modelled ruler prices the fight it imagines, not the one that happens.**
`campaignCost` summed duels one at a time and so underpriced crowds;
`curve.js` read 0.23 on a floor that killed four heroes of seven. Both were
retired for playing the floor instead.

**The probe under-reads anything that acts on a competent player.** The same
hp grant moved probe-measured buffer by +0.095 and the real bot's finishes
by +26 points. A dumb reference player cannot exploit a game that got
easier, so probe numbers understate changes the product feels.

**Growth rates are not scale-invariant.** The same +42 hp reads ×1.011 per
floor on a 400 hp probe and ~×1.20 on a real hero's 10. Never put an
absolute target on a rate whose instrument setting can move it twentyfold.

**Buffer is two quantities.** Capacity is what the hero accumulates —
`hpMax` plus gear, monotone because nothing takes gear away. Attrition is
what gets spent. Suppressing death removes survivor *selection* but does not
separate the two: attrition is only defined for a hero that can die.

**Depth does not make the game more forgiving — it makes the surviving
sample more exclusive.** Buffer's sign flips between floors 1–6 and 1–10
purely from selection.

**Reward measured by a probe that collects only what it steps over reads
about twenty times low.** Measure what the floor *holds*, from an unplayed
state, and value it by play rather than by a price list.

**Win rate mixes bot quality with map difficulty. Damage and blows per kill
do not.** Never use it to judge either one alone.

**Any ratio is suspect when the treatment changes how many turns exist.
Report the denominator next to it, every time.** Found three times in one
session by three agents who had not seen each other's version: I7's
share-of-turns; M3's, one level further in; and B3's, where raising
`TACTICAL_OVERRIDE_MARGIN` cut the zigzag ratio to 6.9% by killing the bot
sooner — finishes 6.7% to 1.7%, actions per run 509 to 297. It is a class,
not three anecdotes.

**A share-of-turns statistic is diluted by anything that changes how many
turns exist.** Conditioning p95/p99 on combat-adjacent turns fixed one level
of this and not the next: a stronger creature has more hp, so fights run
longer and add low-damage turns to the denominator faster than high-damage
ones to the numerator. **The statistic that survives has no denominator** —
worst single turn per run. Two separate archivings were caused by getting
this wrong.

**Do not explain a difference until it clears 2σ.** A 1.3σ gap was reported
here as a finding and given a causal explanation within the hour; it later
measured 0.6σ and was nothing. The floor-2-cheaper-than-floor-1 "defect" was
the same mistake — sampling noise inside overlapping error bars, and M11
proved the floors monotone in expectation.

## Difficulty and the map

**CV of a sum falls as 1/√n in the number of independent draws.** Creature
count growing 1.3 per floor carries a built-in CV decay of ×0.877 that no
amount of per-creature variance removes. Only floor-level variance escapes
it. DCSS's CV rises because its count is flat; ours fell because difficulty
was assigned to count.

**Moving difficulty from count to strength does not fix CV on its own.**
Every playable point still falls; the only setting that flips the sign
leaves two creatures on every floor. Grouping is what fills that gap —
twelve creatures in four clusters are four draws with twelve bodies.

**Proximity alone buys nothing.** Clustering position while each monster
still draws its own tier measured 0.945 against a 0.944 baseline. The group
has to be one creature type to count as one draw.

**M3 was archived on the wrong test, and is worth revisiting after M24.**
Its acceptance was written around CV because everything was being judged by
CV at the time — but it existed to shrink the reaction window, which is
spike, not variance. And the spike measurement that failed it was p95/p99
pooled over every turn including walking; I7 later showed that was dilution,
and conditioned on combat-adjacent turns the spike is there (p95 = 1,
p99 = 3).

It also had no room to work. Above-tier creatures are currently *routine* —
the ±2 spread gives a wolf 17% of the time and an ogre 8% — so a rare
deliberate tail firing at 8% is invisible against a background already
firing at 25%. **M24 tightens the routine band, which would make M3 the only
source of an above-tier creature** rather than one of two, and rare rather
than lost in noise.

**An out-of-depth tail pushes CV the wrong way by construction.** Its chance
grows with depth, so it fires where cost is already highest, and raising the
deep mean lowers sd/mean even while raising sd. Swept to its ceiling and
archived.

**Cluster size went inert once cluster zones were checked per member.**
Swept 6/12/20 with identical results at every floor. The mass-quota check
fires on the roster's mass balance, not on how large the cap allows a
cluster to grow, and it was already binding well below 6.

**Effective cluster size is about 2, not 6.** Measured three independent
ways. The constant never described reality, and a recorded figure of
3.97–4.87 failed to reproduce — a project-agent argument had already been
built on it. Clusters of two give roughly a √2 reduction in draws, which is
all of what M7's CV gain actually came from.

**Spine share and CV pull against each other.** The per-member quota check
that keeps side rooms populated is the same thing that stops clusters
growing. There is no setting where both are maximised; the quota currently
wins.

**Monotonicity is now guaranteed, not observed.** `expectedFloorMass` is an
exact closed-form integral over the tier distribution, reusing `spawn.js`'s
own weighting rather than a second copy, and reading the shipped generation
parameters — so a test that fails on any decrease guards whatever the dials
are set to next. The 2.18/1.97 "defect" that prompted it was sampling noise.

**Clamping a roll's centre is not clamping its outcome.**
`monsterWeightsAround` spreads ±2, so a centre of 2 still reaches slot 0.
The tier floor had to clamp the drawn slot, not the index it was drawn
around.

**A green test is not always a meaningful one.** Three tests used `xp === 1`
as a proxy for "the table's bottom row". When row 0 stopped being xp 1, two
failed loudly and one went **vacuously true** — no monster could ever match,
so the assertion could never fire, and it stayed green while testing
nothing. Caught by reasoning about the change, not by the suite. Assert on
the thing you mean (the table index) rather than on a value that happens to
identify it today.

**A test that reads the shipped parameters guards changes nobody
anticipated.** M11's `expectedFloorMass` passed unchanged when the monster
table was edited under it, because it reads `MONSTER_TABLE` live rather than
from a snapshot.

**Rats used to deal exactly zero damage.** Now `expectedDamage(2,0) = 0.417`. The tier floor moved where they
appear — up to floor 4 — but not what they are. Any floor holding one holds
a creature that cannot hurt the hero at all.

**Floor depth sets the tier ceiling, never the floor.** Tier is
`depthAt(pos) × difficultyScale` where `depthAt` is position *within* the
map, so near an entrance the index falls to zero on every floor.

**Depth-based chest quality does nothing on floor 1.** Quality comes from
position within the map, and floor 1's map is small enough that most chests
already sit near the top of the scale — only 1–3.5% of maps saw an item
change identity under a boost. The lever is not weak; the floor has no
gradient for it to work with.

**Flat chests are what makes threat outpace supply.** Tying chest count to
creature count lets loot grow at the same rate as threat, and since the hero
accumulates while a floor's threat is spent once, the hero wins.

**Side rooms need risk and reward rolled independently.** A gamble with a
fixed favourable ratio is not a gamble, it is a free lunch, and forbidding,
requiring and permitting the detour all produced identical dungeons until
the two rolls were separated.

## The bot

**The ping-pong is born in the tactical veto, not in goal selection.** A
third locus — routing, ~18% — precedes both and cannot be reached by a fix
scoped to `tactics.js`.

**`REVERSAL_PENALTY` at 6 is the single biggest win available — the earlier
sweep judged it on the wrong number.** It was dismissed for moving the
pooled reversal rate only 0.238 → 0.205. Under the distribution it takes
turns-spent-inside-episodes from 21.4% to 9.2%, confirmed on a second seed
family at 25.5% → 7.5%, and drives veto-layer episodes to **zero** on both.
The win-rate cost did not reproduce.

**A pooled reversal rate is mostly a length measurement.** It is dominated
by a few very long runs, and those runs are long *because* they pace — one
run spent 67.5% of 2532 actions reversing while the median run sat at 18.5%.
Report the distribution: share of runs with an episode, share of turns
inside them, the median run's own share, and actions per run beside all of
them.

**Raising `TACTICAL_OVERRIDE_MARGIN` looks like a fix and is not.** At 3 the
median run's zigzag share falls to 6.9% while finishes collapse 6.7% → 1.7%
and actions per run 509 → 297. **The bot stops pacing by dying sooner.**

**Bumping a wall costs an action but not a turn.** `believedWalkable` treats
unseen tiles as walkable, so a committed route aims through what turns out
to be rock; the bot bumps, re-plans, and every bump is another action with
another chance to reverse. This is why route commitment made the zigzag
worse rather than better.

**Exposure pricing loses about eleven points of win rate.** Charging more
for danger in the open makes the bot so shy it takes long ways round and
spends more turns exposed than the shortcut cost.

**Unexplored map is worth zero to the bot**, so it can never form "worth 2 hp
to see what is over there" — while the map deliberately puts the best loot
far away.

## Rules of the game

**Regeneration by time can be camped; by kills it cannot.** The original
healed with waiting, so a bot could sit in a cold corner and top up forever.
A supply that is finite and fixed at generation has no such exploit.

**Armour as a spent second bar, not damage reduction.** Gear buys blows
absorbed rather than blows softened.

**A typical position's furthest room tracks the map's radius, not its
diameter.** Randomising where the hero starts caps the hero-shrine path at
the pre-M20 level however generous the shrine's threshold — no share value
can reach past it. Keeping the hero at one end of the global-maximum pair is
what makes a distant shrine reachable at all.

**Two numbers pinned near the same ceiling cannot be ordered.** M15's test
asserted chest coverage rises with depth; once floor 1 saturated at 99%
against floor 10's 97%, the assertion was measuring noise. Assert both clear
a bar instead.

**Room size is not what breaks the spine share — dug percentage is.**
Bigger rooms push the share up. Raising `dugPercentage` to ROT's own 0.20
dropped floor 7 to 0.70.

**A rule that needs a second rule to protect it is usually the wrong rule.**
The original consumed a potion on contact, which wastes one found at full hp,
so the engine grew a second rule refusing to pick it up while healthy — a
workaround for its own first rule, and the reason a potion could sit on the
floor as a deliberate resource. M35 made drinking an action and both rules
went at once: nothing has to decide whether taking a potion is a good idea,
because taking it is free and spending it is the decision. The deletion is
the feature, not a side effect of it.

**Drinking costs a turn on purpose, and the cost is not a constant.** Because
damage is an event rather than rent (`rules.md` §4), drinking with nothing in
pursuit costs zero and drinking cornered costs a blow. That is what makes it
a decision worth watching instead of a button pressed at the perfect moment
every time.

**Arithmetic beat the bisect.** A batch of five changes took finishes from
31% to zero, and a bisect was opened to find which. It was never run: the
floor-1 arithmetic found it first — the hero starts with no weapon dealing
0.83 hp a turn, floor 1 costs 6.9 hp of its 10, and 14 of 30 runs die there.
The bisect was insurance and the insurance was not needed. Keep the
one-commit-per-change discipline anyway; it is what made the insurance
available.

## Process

**Whoever built a change does not decide whether it worked.** Most of the
errors caught here were caught by a second party — including several of the
project agent's own numbers, recounted by hand.

**Two instruments checked against each other is how a silent bug gets
found.** A flag that never reached the engine was caught only because two
arms came back byte-identical and another instrument had already shown that
could not be true.

**A dial nobody ever passed is not a dial.** `generateMap`'s
`dugPercentage` override was documented and dead — no caller ever supplied
options — until someone tried to use it.

**Reviewing a report cannot find a bug the report does not know about.**
M14 was reviewed as clean and had a real one; the tests found it, because
they asserted a property rather than a number.

**A shadow implementation drifts.** Grouping logic built in `src/analysis/`
to measure grouping stopped describing the engine the moment the engine's
own version landed.

## From the shop and loot arc (M26-M30, U5-U6d, B4/B10/B11)

**A channel that already carries an unrevealed answer has failed the fog
rule, regardless of who reads it.** `observe`'s `copyEntity` deep-cloned a
monster's rolled `drop` into Belief the moment it was seen. Nothing read it
— B9 deliberately computed an expectation from tier instead — but the field
sat there for the next feature to pick up by accident. The rule is about the
channel, not the reader. Fixed by an explicit allow-list per entity kind,
because a deep clone of a growing object leaks whatever field is added next.

**A test that asserts "field X is absent" proves nothing unless it first
proves X was populated upstream.** Otherwise a green test only means the
fixture was empty. M28's tests search seeds for a monster that really
carries a drop, and fail loudly if none is found, before checking Belief
lacks the key.

**Verify against real engine output at least once, not only against numbers
the test chose itself.** U4's lifetime score read `run.levels[last].xpEarned`,
a field that never existed — every award computed `NaN`, stored as `null`,
and compounded on that forever. Its own verification only ever called
`award()` with synthetic values and never traced one real `playDungeon()`
result end to end. Found months later by an unrelated display item.

**Two copies of a rule is how they drift; test that both callers run the
SAME function.** `startingItems` wrote inventory and stopped, so a bought
shield granted zero armour — `player.armour` is what `effectiveHp` reads,
and only the pickup path credited it. The fix shares one `grantArmour`, and
the test asserts both paths produce the same value *from the same function*,
not merely that both produce the right number.

**`itemWeights` splits mass evenly across a source's kinds, so removing a
kind doubles what is left.** Pulling `potion` off the monster source left
`weapon` alone there and silently doubled weapon supply (9.59 to 19.31) for
a reason unrelated to the change being made. Any edit to which kinds a
source draws has to re-check the survivors' shares.

**Pricing a delayable reward as if it decays lets it outbid what is in
hand.** `exploreCompetes` let a slightly-better dark region beat a chest in
plain sight, because the dark loses nothing by being visited later. Chests
opened per floor fell ~23% on two seed families. A monster does not have
this problem — it is a real, decaying opportunity — which is why the same
shape worked for combat (B11) and failed for exploration.

**A tie-breaker sized small enough to be safe has nothing left to decide.**
`frontierRouting` weighted route cost by revealed fog, capped under half a
`STEP_COST_IN_HP` so it could never justify a detour. Result: inert on both
families, to three figures. Weighted shortest paths on a procedural map
essentially never tie, and the constraint that made it safe is what made it
powerless.

**A sandbox default is not the shipped default.** `DEFAULT_MODEL` carries
pre-M7 values (no clustering, flat strength growth, no out-of-depth tail),
so a sweep that overrode only the dials it cared about measured a strictly
easier game on three unrelated axes and invalidated a whole round of
candidates. Diff a swept model against real `floorParams()` field by field
BEFORE trusting any result.

**A formal test passing is not the invariant holding.** The M7 budget check
reads a ratio formula that `earlyTierCapShare` never enters, so it stayed
green while the actual end-to-end growth rate moved outside the band the
check exists to protect. Same shape as the fog leak: the letter of a rule
satisfied while its purpose is not.

**Weapon value falls as 1/dps; armour is linear by construction.** Damage
per turn is perfectly linear in weapon points, but hp *saved* goes as
1/dps because turns-to-kill is `hp ÷ damage per turn` — measured, the first
damage point is worth 15.75 hp and the second only 7.85. Armour is
`effectiveHp = hp + armour` with no cap, so N shields is exactly 3N. The bot
already encodes this correctly: weapons priced as a marginal delta against
live inventory, armour at fixed face value. Any weapon redesign must keep
that marginal computation intact.

**A branch chain with early return is not a comparison.** `chooseGoal`
returned the moment any chest scored positive, so the bot could not prefer
combat over loot at any price — B9's whole drop-pricing mechanism never ran
on a turn with loot on offer. Proved by scaling believed weapon value 2x and
5x and watching nothing move at either.

**A safety rule that reads a metric stuck at zero is decorative.** Two
consecutive bot items shipped with "stop if `finishes` falls" as their
guard, while `finishes` read 0% on every arm. See M33 — the drop was never
measured when it happened, because the item that caused it reported two
other numbers instead.

**A safety rule that reads a metric stuck at zero is decorative.** B9 and B11
both shipped with "stop if `finishes` falls" as their guard while `finishes`
read 0% on every arm, so neither guard could fire. It fell from 5-6.7% to
~0% around M29, whose own report gave mean death floor and
share-dying-by-floor-2 and never mentioned `finishes` — so the parity trade
was accepted without its largest cost on the table. **Before writing a guard,
check the metric can currently move.** A rate near zero also needs a far
larger sample than the n=60 these items used to be distinguished from zero at
all.

**`finishes` is about one run in four hundred, not zero.** Every reading that
reported 0% was taken at n=60-80, which cannot resolve a rate that low — the
metric was never dead, only under-sampled. Found by U6f searching for a real
clear and hitting one at run 377. **Costing it correctly matters:** anything
gated on a non-zero finish rate needs hundreds of runs, not dozens, and any
guard written against `finishes` at small n is decorative for arithmetic
reasons rather than because the game is broken.

**The denominator trap, fourth instance — and the first one caught by the agent
that made it, before reporting.** B12's per-floor arming ratio cleared 2σ at
z=-2.31 and read exactly like its own pre-registered stop signal. It was an
artefact: the ratio's denominator is depth and the treatment moved depth
(z=+2.04), while the numerator alone sat at z=-1.44, under the bar. **The tell
was in the stop signal's own wording** — "weapon damage falling *while depth
holds*" — and depth did not hold.

**A second discriminator worth reusing.** At n=240 the ratio read z=-1.61 and
depth z=+1.03; both grew with n. A real effect and a moving denominator both
scale with n, so growth separates nothing — but **the numerator failing to
clear at either sample while the ratio clears at the larger one is what the
artefact looks like from the inside.**

**Paired per-run differences are what made it visible.** Comparing arm means
throws away the pairing and most of the power with it; a per-run difference over
the same seed cancels the seed's own variance. An arm-mean table cannot show
this class of artefact at all.

## The return, and what phase A cost — owner decisions, 2026-08-10

Moved out of `docs/backlog.md`, which is a task list and had accumulated
design direction. The items live there; the reasoning lives here.

### A run is twenty traversals, not ten

Floors 1–10 down, then 11–20 back up — the same map seeds in reverse, with
different creature seeds, different variance and different loot. **Victory is
returning to floor 1**, not reaching floor 10. The shop happens after that.

`map-design.md` carries the design. `rules.md` keeps describing the ten-floor
game until the engine changes, because it records what the game does.

**What it makes stale, and this is why it is worth writing down:**

| what | why |
|---|---|
| `finishes` as a number | it means "reached floor 10", which is no longer victory |
| "floor 10 is the hardest" | the turn is maximum threat; the return is maximum variance and rising death risk |
| every horizon in the bot | `campaignCost`, `monstersAhead`, `horizon`, `levels` all assume ten |
| depth as a single axis | there are now two passes over the same depth |
| coin banking | it banks on a clear, and a clear is twice as far away |

### Phase A overshot, and nobody chose where it landed

Three changes in sequence, each individually justified, all pushing the same
direction:

| | share ending by floor 3 | runs clearing all ten |
|---|---|---|
| before M38 | 0.645 | ~0.25% |
| after M38 — starting dagger | 0.370 | 2.5% |
| after M39 — chests pay out half the time | 0.130 | 20% |
| after B16 — no more accidental exits | 0.115 | 25% |

**A hundredfold in three items.** M39's own report said it rather than
reaching for a dial to hide it: **the opening stopped filtering.**
`objectives.md` names both failure directions, and the live one swapped ends —
"too rare and hope goes with it" became "too common and the win loses its
charm".

Nothing here says 25% was wrong. It says the number moved a hundredfold
without anyone choosing where it should land, which is the failure worth
recording.

### The standing direction that came out of it

- **No fine tuning now.** No item proposes moving a dial to chase a measured
  number, and no report treats a measured number as a verdict on the game.
- **The opening SHOULD be hard.** `map-design.md` is not wrong; the game
  drifted from it. M41 took the starting weapon back out on that basis. What
  is deferred is *tuning* it, not the intent.
- **What is wanted from a measurement right now is that it is possible and
  that it mirrors reality**, not what it says. An instrument reporting a
  number nobody likes has succeeded — C1 is the model: built, it contradicted
  a design claim on first use, and that was the value.

## The bot was right to go for creatures first — B19 through B22

Four items, one question, and the answer is that the behaviour being complained
about was correct.

**The complaint.** The bot walks past a chest to reach a creature. Watched
repeatedly across floors and seeds; creature `net` reads in the hundreds
against a chest's 1.

**What was tried, and what each attempt established:**

- **B19** — price loot by the duel it is about to change. **Impossible by
  construction**: `duelCost`'s `hpLost` is built from the hero's damage output
  and the creature's bite, so armour moves it by exactly 0.00 at every tier.
  The gate case it was filed for already worked, through
  `refuseLostFights` → `preparationGoals`.
- **B20** — make "collect that, then fight this" a single candidate. Built and
  measured: fires on ~40% of decisions, buys nothing, and adds 6.3% route
  length. It shops without buying.
- **B21** — veto plans whose low-water mark dips below the margin. Binds on
  15.0% of candidates and changes almost nothing, because the top-ranked
  candidate usually survives. **Its by-product is the durable fact:** a step
  costs 0.01 hp and menace decays fast, so **neither distance nor a distant
  threat can move the low-water mark** — only something dangerous standing
  close to the route.
- **B22** — rank by dominance on (low-water mark, exit state), with the
  campaign horizon deleted.

**B22 produced the requested behaviour and it is worse.** Floors opening on a
creature fell 84.6% → 17.6% (z −24.7) — the change worked exactly as designed —
and the bot got worse on every axis that matters:

| | on vs off |
|---|---|
| depth | −0.79 (z −3.46) |
| fights started | −6.87 (z −5.89) |
| items held at exit | −3.74 (z −5.56) |
| lost-fight rate | 1.30% → 2.53% |

**The mechanism, and it is the game's own design.** Weapons are the only
permanent power in the game and only creatures carry them. Delete the campaign
horizon and the reason to fight goes with it: the bot fights less, arms up
less, loses more of the fights it does take, and **ends up holding fewer items
than the loot-first policy was supposed to gather** — because loot comes from
fighting.

**So the two-orders-of-magnitude gap between a weapon and a shield is not a
modelling error.** It is what the loot design (M26/M27: weapons from creatures,
chests hold armour and potions) makes true.

### Shipped ON anyway, by owner decision, 2026-08-11

**The flag is on, and it was measured worse.** The owner turned it on
deliberately, to watch: some defects are not visible in an aggregate, and this
project's record is that watching found six real defects no metric had caught.

**Two things this does not mean.** It is not a reversal of the measurement
above — depth, fights, items at exit and lost-fight rate all moved against it,
four axes clearing 2 sigma. And **an ON flag is not a validated flag**: this
paragraph exists so nobody two weeks from now reads the shipped state as
approval, which is how `CHEST_LOOT_CHANCE` survived at 0.60 against a generator
producing 0.226.

**Every number taken from here describes the B22 bot.** R1's twenty-traversal
measurements and I12's owed comparison both cross this boundary. Any figure
compared across it is comparing two different bots.

**What this cost and what it bought.** Four bot items, three of them shipping
nothing. What it bought is that "prefer loot before combat" is now a measured
dead end rather than a recurring suggestion, and the low-water machinery exists
behind a flag with the number that killed it.

## The simplification — 2026-08-11

The project was reduced to the smallest thing that still satisfies
`objectives.md` (`docs/project/simplification-brief.md` is the mandate,
`simplification-plan.md` the plan). Everything below was deleted from the
CODE; the numbers that justified each deletion live on here, so nothing has
to be re-measured to stay dead.

### What cannot be simplified without losing an objective

The short list, each item naming the objective that would notice:

1. **Determinism, `step()` purity, the Observation/Belief channel.**
   Attribution — "say why a run went the way it did" — needs replay, and
   fog that leaks is decoration.
2. **The spine/side split with risk and reward rolled independently.**
   The route objective: several routes can win, the good one is hard to
   find. One shared roll made every detour the same free lunch (measured:
   forbid/require/permit produced identical dungeons).
3. **Exponential count growth + strength ramp anchored at floor 10.**
   "Most attempts must not end in the opening" — the additive law put all
   attrition in floors 1–3 (24/24 met floor 2, 2 met floor 10).
4. **The out-of-depth tail and the floor's shared roll.** "The outcome
   stays uncertain": independent draws converge as 1/√N, making the climax
   the most predictable stretch. The return is these dials widened.
5. **`TURN_BUDGET`.** The only brake on the shamble.
6. **In the bot: danger-priced routing and the duel-survivability veto.**
   Objective 1 is survival; without these it dies by routing accident, and
   an unattributable death is a lottery, not a race.
7. **Shrine guardian and chest guards.** "Loot is not free" is what makes a
   win attributable to fights chosen.
8. **`run-tests.html`, the M11 monotonicity closed form, the fog guard.**
   Correctness is not measurement; these protect all of the above.

### The bot rewrite

Seven modules (1,707 lines in bot.js alone) became three: a bot whose whole
policy is the three ordered objectives, `nav.js`, and `config.js`. A hero
with special characteristics is a `DEFAULT_HERO` override — configuration,
never code. Deleted with their measurements kept:

- **B22 dominance ordering** — measured WORSE on four axes past 2σ (depth
  z −3.46, fights z −5.89, items at exit z −5.56, lost-fight rate 1.30 →
  2.53%); was ON to be watched, and the watching is over.
- **B23 activation phases** — recovered most of B22's cost (depth +0.62
  z 3.44); with B22 gone there is nothing left to recover.
- **B25 turn pricing** — inert at the shipped budget (z +0.88); only real
  at budget 150. If M42 ever tightens, re-read that entry first.
- **B21 low-water veto** — cut 15% of candidates and changed no outcome
  past 1.2σ.
- **B20 sequence goals** — fired on 40% of decisions, redundant in almost
  all; the one signed movement was the failure direction (route +6.3%).
- **B17 route item discount** — could matter on 0.5% of turns; measured
  inert at 1.4σ over 300 paired runs.
- **B13 pursuer pricing** — 91% of blows land while stationary, but only
  9–13% come from a second creature; moving 2–3 blows a run moved nothing.
- **B10 frontier routing / B4 explore-competes** — unmeasured / actively
  harmful (median depth 3 → 2, chests 4.48 → 3.85).
- **Chokepoint standoff** — win rate 55% → 45%; **exposure pricing** —
  −11 points; the tactical veto + reversal penalty — 61–64% of ping-pong
  episodes were the VETO layer, which no longer exists to ping.

Cost of the rewrite, measured at 40 seeds against HEAD: clears 0/40 on
both arms; median depth 6 → 5, runs ending by traversal 3 22.5% → 35% —
both under this project's own 2σ bar at that n; turns per run −29%. The
tripwires are what watches this now.

### The dial collapse

104 exported dials became ~56, byte-identical generation (the measure.mjs
fingerprints and the tripwire anchor pass unchanged across the collapse):

- **Three tier-clamp families (9 dials) → one floor family + one SIGNED
  slack + an integer `EARLY_TIER_CUT` (5).** `tierCeilingShare` and
  `earlyTierCapShare` were literally the same expression; M30's own sweep
  showed the share dial's whole (0,1) range produced the identical cut.
- **Shadow pairs deleted** — `MONSTER_GROWTH(_REBALANCED)`,
  `STRENGTH_GROWTH(_REBALANCED)`, `DIFFICULTY_REBALANCED`, `DROP_CHANCE` ≡
  `MONSTER_DROP_CHANCE`. One name per concept; the pre-M7 values are these
  entries, not exports.
- **Dead rule flags deleted**, decision recorded here:
  - `XP_FROM_KILLS` OFF: freezing xp barely moved depth (gear compounds
    regardless); the ladder is gear and potions. The faithful +1/2-kills
    rule is gone from combat.js.
  - `HP_FROM_KILLS` OFF: the sweep found no rate that fixed the buffer
    (0.846 → 0.910/floor, still falling) without doubling clears
    (30.7% → 56.7%); adoption reversed by owner.
  - `WEAPONS_WIDEN_ROLL` ON → now the unconditional rule: a weapon widens
    the die, half a point of expected damage per point.
  - `MONSTERS_ATTACK_WHEN_ADJACENT` — byte-identical over 50 floors (an
    adjacent monster already attacks every turn under the faithful rule).
  - `GUARANTEE_FIRST_WEAPON` OFF (M29): generation softening beat the item
    injection — mean death floor 3.25 vs 2.425, 3/40 clears vs 0.
  - `CHEST_LOOT_RICHER_FAR` / `CHEST_QUALITY_BY_DEPTH` ON → the rule.
  - `SIDE_ACTIVATION_CAP` — capping made the inversion WORSE (68%/54% vs
    53%/45% unfavourable/favourable rooms opened).
  - `PERSIST_BALANCE_ACROSS_DEATH` — never measured; the owner's rule
    (death wipes) is now the only rule.
  - `noPickup` and the rule-variant plumbing (state fields, dungeon
    options) went with the probes that used them.

### The instruments

Nine analysis modules and six one-off pages became `src/analysis/check.js`:
six tripwires from real runs, each printing its own firing condition. The
modelled instruments (curve.js pricing clean duels read 0.23 on a floor
that killed four heroes of seven) and the probe-based ruler (understates
anything a competent player exploits) are retired for good — this section
and "Measurement" above are their obituary. `campaignCost` and the marginal
item pricing died with their callers.

At deletion time three wires FIRE, honestly: opening deaths 0.667 (the
known Phase-A regression after M41 emptied the kit), wins too rare and
nothing gets deep (victory needs the full down-and-back-up and the return — R2–R4 —
is not built). They are defects to fix, not numbers to push.

## The vault and the Butcher — V1 through V4, 2026-08-12

Design and the pre-build numbers are in `candidates.md` M43. This is what
the built thing measured. **It is a report, not a verdict** — the owner
watches and judges.

### The diagnosis the build started from was a correction

The report was "the opening is boring because it is always easy". Measured
over 150 descents on the SHIPPED dials, floors 2 through 6 kill 13%, 10%,
16%, 14% and 13% of whoever arrives — **the same number five times.** The
defect is flatness, not easiness, and a dial cannot fix it because every
dial moves all five floors together.

**And the backlog's own note was stale in a way that inverted the reading.**
"Opening deaths 0.667" is the CODE DEFAULTS. On the dials that ship, runs
over by traversal 3 measure 0.247 — that wire does not fire, and there was
no opening-lethality problem to solve.

### What the vault did, against the same seeds with it switched off

| | vault on | off |
|---|---|---|
| cleared | 3.3% | 3.3% |
| mean depth | 5.3 | 5.9 |
| died on floor 4 | **33.6%** | 15.9% |
| died on floor 5 | 16.0% | 13.7% |
| died on floor 6 | **22.2%** | 13.4% |
| reached floor 7 | 32.7% | 47.3% |

**It is a barrier, and the barrier works.** Floor 4 doubles its death rate
and the flat stretch is gone.

**It is a real choice, which was the part most likely to fail.** 43% of
runs engage it and 57% walk past. Not a no-brainer in either direction —
the failure both `map-design.md` and every previous side-room attempt hit.

**It costs the descent about half a floor of reach**, and floors 5 and 6
get DEADLIER rather than easier. The obvious reading — the survivors should
be better armed — is wrong, and the likely cause is selection: the bot
engages when the fight is affordable, which means it engages when the hero
is STRONG, so **the vault preferentially kills the runs that would have
gone deep** and leaves a weaker population behind it. Not established; it
is the explanation that fits, and the alternative (the axe and the buffer
simply do not pay for the hp) fits too.

### The dial works, and it buys the wrong half

`sideAppetite` at 0 against 0.7:

| | appetite 0.7 | appetite 0 |
|---|---|---|
| engaged the vault | 43% | **17%** |
| Butcher killed | 18.8% | **1.2%** |
| vault chests opened | 23% | 7% |
| **killed BY the Butcher** | 13.4% | **11.9%** |

**A cautious hero gives up the reward and keeps almost all of the risk.**
It wins the fight 1 time in 84 and still dies to the creature 1 time in 8.

**The cause is that engagement is mostly not a decision.** The refusal
machinery — `duelCost` against `sideBar`, `guardCost` on the chests — only
gates things the bot has CHOSEN as goals. Exploration is not gated: when the
pool is empty the bot walks to the nearest frontier, and the route is
priced by the danger field but never refused. So it wanders into the room,
the Butcher wakes at `activation` 12, and a hero whose appetite forbids the
fight flees and dies with its back turned.

**That is the open item this leaves**, and it is a bot change rather than a
map one — the same shape as `M36`'s finding that a cost nothing reads
cannot change a decision. Lowering `activation` would treat the symptom;
what is missing is that walking toward the dark has no price on it.

### Three things that were nearly built wrong

**The pillars were justified with a mechanism that does not exist.** The
claim was that a pillar forces the danger flood around it and leaves a
cheap pocket behind. Measured tile by tile, the price grids with and
without them are identical — on a 4-connected grid an isolated one-tile
obstacle never lengthens a route, because every monotone way around is the
same length. They are kept for legibility, which is a real job here: the
badge under a creature shows xp and never hp, so a 16-hp Butcher reads as a
vampire until it refuses to die, and the room has to be the warning label.

**Refusable mass is not the floor's mass.** The Butcher weighs 80 against a
whole ordinary floor-4 roster's ~60, so counting it into `threatMass()` and
`spineShare()` read as the floor hiding everything in a side room, and
would have broken the monotonic-mass guarantee. Both now skip it. Same
correction in `check.js`: six correctly-refused vault chests dragged "the
gamble is dead" from 0.69 to 0.26.

**Two draws hid in a loop nobody was looking at.** The side-room
risk/reward loop draws twice per side room, so an authored room passing
through it spent two spawn draws and shifted every roll after it on the
floor. Caught by the test that asserts the stamp consumes no randomness —
which is the whole reason that test was written before the feature worked.

## V5, V7a, V7b — the vault stopped being a barrier, 2026-08-12

Owner-proposed, all four ideas built. Measured empty-handed (the owner's
stated baseline), 200 runs a session, shipped dials, same seeds throughout.

### The three states

| | before | +V5 | +V7a/V7b |
|---|---|---|---|
| died on floor 4 | 19.0% | 17.6% | **9.5%** |
| engaged the vault | 40.7% | 37.0% | **89.7%** |
| killed the Butcher | 32.4% | 31.5% | 35.6% |
| **killed BY the Butcher** | 7.6% | 5.5% | **0.7%** |
| reached floor 7 | 42.0% | 42.5% | 50.5% |
| mean depth | 5.7 | 5.7 | 6.0 |

Floor 4 without any vault kills 6.8% and mean depth is 6.2, so the last
column is a room that has almost stopped costing anything.

### V5 did what it was built for and nothing else

Gating exploration by the danger on the route is nearly free at the shipped
appetite — every column above moves by less than its own noise — and it is
decisive at the extreme it was built for: at `sideAppetite` 0, deaths to the
Butcher fell from 12 runs in 150 to 3.

**Its cost shows only at that extreme, and it is large.** A hero that
refuses every priced frontier stops exploring, leaves the floor early and
arrives poorer: reaching floor 4 falls from 72% to 38% at appetite 0. **The
open question is whether a route's SUMMED danger is the right statistic to
compare against a one-off duel bar** — twenty tiles of harmless menace add
up to a number that looks like a fight and is not one.

### V7a+V7b deleted the risk, and the free chests are why

Entering is a decision now — that was the goal and it was met. But the room
went from doubling floor 4's lethality (19.0% against a 6.8% floor) to
barely moving it (9.5%), and deaths to the Butcher are one run in 146.

**The mechanism is not the radius on its own — it is the two unguarded
chests.** They are opened in **89.7%** of vaults against 39.2% for the four
behind the Butcher. Nearly every hero now walks in, takes the free pair and
leaves; a third go on to kill it, and of those who take the fight almost
none lose it.

**So the vault is now mostly upside**, which is the failure `map-design.md`
names in its own words: a gamble with a fixed favourable ratio is not a
gamble. It also gives back `M36` — the reason the room was worth building
was that a detour could end the run, and at radius 5 the Butcher is easy to
walk away from.

**Raising its hp is not the fix.** The bot engages when it can afford the
duel, so a heavier Butcher is refused more often rather than fought harder —
already visible above, where the kill rate barely moved across three very
different states. What decides whether the room costs anything is which
chests sit inside the reach, not what the creature weighs.

### What that leaves for the owner to decide

Whether the vault is a **barrier** or a **reward room**. It cannot be both
at these values, and the lever is the free pair rather than the boss:

- barrier — put all six chests inside the reach, and the room is one bet again
- reward room — keep it as built, and accept that floor 4 is no longer a wall
- something between — a radius that covers the doorway but not the corridor
  outside it

Nothing here is a defect to fix without that decision being made first.

## The vault takes over its floor — A through D, 2026-08-12

Owner design: floor 4 as a barrier, all of the floor's reward inside the
room, and a dial that decides whether the hero tries it. Four changes, no
new parameters: the vault floor places no ordinary chests and the vault
holds eight; every chest sits inside the creature's reach; `sideAppetite`
runs to 2; the approach is a corridor of at least four tiles.

Measured empty-handed, 200 runs a session, shipped dials.

| | before (graded room) | A–D at appetite 0.7 | A–D at appetite 1.5 |
|---|---|---|---|
| engaged the vault | 89.7% | **12.3%** | **56.8%** |
| killed the Butcher | 35.6% | 12.3% | 48.0% |
| killed BY it | 0.7% | 0.0% | 6.8% |
| died on floor 4 | 9.5% | 14.2% | 20.7% |
| **died on floor 5** | 10.4% | **29.1%** | 28.6% |
| reached floor 7 | 50.5% | 35.5% | 37.5% |

Floor 5 without any vault kills 8.0%.

### Concentrating the reward is what made skipping cost something

**Floor 5's death rate roughly triples** — 8.0% with no vault, 10.4% while
the floor still paid six chests of its own, 29% once it does not. That is
the design working: the hero that walks past arrives with nothing and dies
one floor later. Before this, skipping was free.

### The dial is now the decision, and that is the shape the product wants

At the shipped appetite the bot enters 12.3% of vaults and wins every one
of them. At 1.5 it enters 56.8% and dies in 6.8%. **Same room, same
creature — the player's pre-run setting is what moves it**, which is what
`objectives.md` asks a choice to be: made in advance and then watched.

Range [0, 2] is what made that expressible. Below 1 the bar is
`sideAppetite × fightMargin × ehp` with both factors under one, so nothing
costlier than a comfortably affordable duel could ever be accepted — and
the Butcher is not comfortably affordable on purpose.

### What is still not there, and it is not a map problem

**Nobody loses this fight by accident any more, and few lose it at all.**
Even at appetite 1.5 the hero kills the Butcher in 48% of vaults and dies
in 6.8%. The owner's target — a naked first run losing 80-90% of the time —
is not reachable by tuning the creature: `duelCost` at hp 20 / xp 6 is 16.1
hp against an `ehp` of about 12.9, so the bot refuses rather than loses. A
Butcher the naked hero reliably dies to is a Butcher the bot never fights.

**And the ratchet the design rests on does not exist.** "Each run
accumulates coins so the odds improve" is not what the code does:
`wallet.js` keeps no balance, `resetOnDeath` wipes the drawer, and the shop
spends that run's coins on ONE item afterwards. The starting kit measures
how well the LAST run went, not how many have been played — measured, a
session sits at roughly 42% empty / 42% shield / 10% dagger / 6% axe and
does not climb.

Restoring it reopens an owner decision (`PERSIST_BALANCE_ACROSS_DEATH`,
removed and never measured). The smallest version is not wiping the drawer
on death; `objectives.md` warns against the uncapped form, so a bounded one
is the one to reach for.

### Two things that were checked rather than assumed

**A corridor cannot hide the Butcher.** Sight here is by distance and passes
through walls (`observe.js`, a deliberate divergence). Measured on 117
vaults: the hero sees the occupant from the doorway on **every** seed, and
from one tile outside it on every seed. The ambush the corridor was meant to
create is not buildable without raycasting, which the project chose against
— and would fight `objectives.md`'s "a choice has to be informed". What the
corridor does buy is a longer priced approach, which sharpens the dial
rather than hiding anything.

**One chest outside the reach is enough to undo the room.** The earlier
graded layout left two, and they were opened in 89.7% of vaults against
39.2% for the guarded ones. The test now asserts every chest sits inside
the radius, because that margin is what the whole barrier rests on.

## M44 — `speed`, and why the bot is not allowed to price it, 2026-08-12

The vault's last problem was that nobody lost the fight. The room was
entered by the strong and refused by the weak, and the strong won ~100% of
what they took. The owner wanted the opposite: most heroes in, most heroes
dead, ~20% winning.

### The dead end that forced a new property

**Whether the bot ENTERS a fight and whether it SURVIVES one are the same
number.** Entry is `duelCost <= sideAppetite × fightMargin × ehp`. Survival
is close to `duelCost / ehp`. So every knob that makes a fight deadlier
makes the bot refuse it rather than lose it — measured three times across
very different Butchers, where the kill rate barely moved (32.4% / 31.5% /
35.6%).

**And reshaping the creature cannot separate them.** Swept every (hp, xp)
pair whose `duelCost` lands within 1 hp of the shipped Butcher's — the bot
treats all of them as the identical decision — at 6000 duels each:

| hp | xp | biggest blow | hero wins | turns |
|---|---|---|---|---|
| 24 | 4 | 3 | 54% | 11.5 |
| 16 | 6 | 5 | 47% | 7.7 |
| 12 | 8 | 7 | 47% | 5.8 |
| 9 | 11 | 10 | 46% | 4.3 |

**Flat.** A bigger bite does not kill more at equal expected cost; it only
shortens the fight. Variance compresses both tails toward 50% — the poor
hero's odds rise from 4% to 12% and the rich hero's fall from 90% to 72%.

### `speed` is the only lever found that separates them

A creature that acts twice a turn lands about twice the blows, and
`duelCost` models one blow per hero blow. So the fight costs double what it
is priced at: entry barely moves, survival halves.

Measured, empty-handed, 200 runs, at `activation` 10 / hp 12 / xp 5 /
speed 2:

| `sideAppetite` | enters | wins the fights it takes |
|---|---|---|
| 0 | 3.4% | — |
| **0.5** | **43.5%** | **22%** |
| 1.0 | 69.8% | 19% |
| 2.0 | 84.6% | 19% |

**hp governs entry, xp and speed govern survival**, and the two can now be
set independently: hp is what `duelCost` reads, speed is what it does not.
Going from xp 4 to xp 5 at the same hp dropped the win rate 40% → 22% while
entry only fell 52% → 43%.

### The uncomfortable part, stated rather than buried

**This is a blind spot the design leans on.** `speed` is exposed in Belief —
it is a visible property in the same class as `xp`, and hiding it would be
using the fog on something the hero can plainly see — and `duelCost`
deliberately does not read it. One word would "fix" that and would restore
the coupling above, which is why the function now carries twenty lines
explaining why the word is wrong. A test pins it.

### What the room now is

At the shipped dials: 73.5% of runs reach floor 4, 43.5% of those enter,
9.5% kill the Butcher, 34% die to it. **Floor 4 kills 45.6% against 8.7%
with no vault** — it is the wall the design asked for.

**And winning pays: 8.9 floors against 6.6 for those who avoid it**, with
71% of winners reaching floor 9 against 12%. Selection explains part of that
— the bot enters when it can afford to — but the honest comparison, against
`sideAppetite` 0 where nobody enters at all (mean 7.0, 20% reaching 9), still
leaves a real gap.

**Nobody opens a chest without killing it**: the "touched but did not kill"
group is empty at every appetite. All eight chests sit inside the reach, so
the room is genuinely one bet.

## B18 — the gate that sat in front of the clause that knew better

Found by the owner watching a fight, not by any instrument.

**The bug.** A `speed` 2 creature moves two tiles for the hero's one, so the
gap never grows, its chase radius never breaks and fleeing cannot work. The
bot fled anyway: mid-fight the hero's `ehp` falls faster than the creature's
remaining hp does, `duelCost` crosses the bar, the affordability gate drops
the creature from the pool, and the bot picks any other goal and walks. It
takes a blow a turn and returns none until it dies.

**The code already knew.** Six lines below the gate: *"a creature already
chasing charges only the walk: its duel happens whatever the bot does
next."* The gate ran first and threw the creature out before the clause
that understood the situation was ever consulted. **The gate decides which
fights to TAKE; when there is nothing to decide it has no business
running.**

**The fix is narrow on purpose.** A chase already joined skips the gate only
when the creature is faster than the hero. Speed 1 is still outrun — it
hesitates one turn in ten and falls behind — so nothing else in the game
changes.

**And it keeps the two readings of `speed` apart.** The bot now reads it to
answer *can I get away*, never *what does this cost*. `duelCost` still does
not price it, so the decision to ENTER the room is untouched; only the
decision to leave a fight already joined changed.

### What it moved, measured against the same dials with the fix reverted

| `sideAppetite` | | without | with |
|---|---|---|---|
| 0.5 | entered | 31.7% | 31.7% |
| | Butcher killed | 2.9% | **5.0%** |
| | killed by it | 28.8% | 26.6% |
| 1.0 | entered | 50.0% | 50.0% |
| | Butcher killed | 8.8% | 8.8% |
| | killed by it | 41.2% | 41.2% |

**Entry does not move at either appetite, which is the property the fix was
built to preserve** — the gate is untouched until a chase has already
started.

**At 1.0 nothing moves at all**, and that is the honest result: a hero that
enters at that appetite was strong enough to finish the fight without the
duel ever crossing the bar, so there was no flight to prevent. The bug only
bites the marginal hero, which is exactly who appetite 0.5 sends in — and
there the kill rate rises from 2.9% to 5.0% on 139 vaults, about 3 runs in
200. Suggestive, not established: at those counts the standard error is
around 1.5 points and the two overlap.

**So this is a correctness fix that is nearly invisible in aggregate.** It
was still worth doing — a hero bleeding to death without swinging is the
kind of thing the owner sees in thirty seconds and no tripwire will ever
report — but nobody should expect it to move the balance, and the earlier
guess in this file that it would raise the win rate enough to need a retune
was wrong.

## B19/B20 — what the bot's dials actually do, and what came off the panel

Owner's read going in: two dials govern almost everything, the rest look
confusing or inert. Swept all six one at a time, 100 runs a point, **the same
seeds at every point** — the map comes from the run seed and never from the
bot, so holding the seeds fixed removes the biggest variance source and what
is left is the dial.

| dial | low → high | mean depth | reached 7+ | vault entry | Butcher killed |
|---|---|---|---|---|---|
| fightMargin | 0.2 → 1.0 | 4.3 → 4.0 | 15% → 10% | 41% → 63% | 3% → 12% |
| sideAppetite | 0 → 2.0 | 4.5 → 4.0 | 19% → 10% | 11% → 73% | 0% → 13% |
| stepCost | 0 → 0.1 | **1.0** → 4.2 | 0% → 13% | — → 52% | — → 12% |
| falloff | 0.1 → 0.95 | 3.7 → **4.6** | 5% → **21%** | 36% → 32% | 2% → 12% |
| crowdPenalty | 0 → 20 | 4.3 → 4.2 | 15% → 13% | 53% → 52% | 9% → 12% |
| stickiness | 1.0 → 3.0 | 4.1 → 4.4 | 13% → 16% | 45% → 46% | 6% → 13% |

### `CROWD_PENALTY` is inert, and this is the third confirmation

**15 and 20 produce byte-identical runs in every column** — the price
saturates and no tile decision changes above it — and 0 sits inside the
noise of 15. The reason is that it prices something that barely exists: over
400 generated floors, only **19.8% hold even one tile two awake creatures
can reach**, an average of 0.57 such tiles against 133 threatened ones.

This file already recorded that scaling it by threat "changed literally
nothing", and `candidates.md`'s B5 hoped clustering would make those tiles
common. Measured at the shipped `CLUSTER_SIZE` 6, they are still rare. Off
the panel, fixed at 15 — the value that shipped, so removing the slider
changes no behaviour. The mechanism stays: it is not fighting anything, it
is simply correct on the one floor in five where the situation is real.

### Two dials were lying about themselves

**`DANGER_FALLOFF`'s arrows were backwards.** `menace = bite ×
falloff^distance`, so a higher value makes menace persist FURTHER — more
cautious. The panel said up was "mais míope — só teme o que está colado",
which is what a LOW value does. The constant is misnamed too (it is a
persistence factor, not a rate of falloff), which is likely where the
inversion came from. Moving it did the opposite of what the label promised,
which is most of why it read as incomprehensible.

**`stepCost` is not haste.** Swept at eight points: 0 breaks the bot outright
(it wanders one floor for 1500 turns because walking is free), and **0.01
through 0.2 — the whole old slider — is flat within noise**. It only starts
to bite at 0.4, outside the range the panel offered, and saturates by 0.8.
Turns barely move across the entire sweep (321–397).

The mechanism explains it: the tile price is `stepCost + danger`, so a large
step makes the danger term negligible by comparison and the route converges
on plain distance. **High "haste" is really contempt for danger** — which is
why chests and kills RISE at the top end (18.8 → 22.6 and 47.8 → 65.8).

**Both ends beating the middle is worth flagging and not yet explaining.**
`falloff` high (more danger weight) reads 4.6 and `stepCost` high (less
relative danger weight) reads 4.7, against 4.2 shipped. That would make the
shipped pair a local minimum — the worst of both worlds. At n = 100 those
gaps sit right at 2 sigma, which is exactly where this project's own rule
says to stop and not build a story. Recorded as a question, not a finding.

### Six named bands instead of a continuous slider

The count is even on purpose: no middle to park on, so every setting leans.
It buys three things — one notch produces a visible change where half these
dials measured flat across their old range, a reading is comparable because
"alto" is one number rather than wherever the thumb landed, and a sweep has
six points instead of a continuum.

The shipped value is always one OF the six, so opening the Lab can never
silently move the balance by snapping to a neighbour. The overrides file
keeps values, never indices — a band list edited later must not re-point an
existing override at a different number.

Renamed to qualities of the hero rather than descriptions of machinery:
Coragem, Ganância, Pressa, Cautela, Teimosia.

## B20 addendum — the buff was half real, and the half that was is not free

D1 re-measured at n=300 what a 100-run sweep had suggested, same seeds, with
a standard error on every number. Both proposals died or changed shape.

| against the base | mean depth | reached 7+ |
|---|---|---|
| cautela 0.95 | +0.38 (**2.3σ**) | +4.0pp (1.3σ) |
| teimosia 3.0 | +0.01 (0.1σ) | −0.3pp (0.1σ) |
| both together | +0.24 (1.5σ) | +1.3pp (0.5σ) |

**`GOAL_STICKINESS` is inert, and the n=100 reading that said otherwise was
noise.** 4.1 → 4.4 across the range looked mildly monotonic; at three times
the sample it is 0.1 sigma. It came off the panel at 1.4 rather than being
promoted to 3.0 — the opposite of the plan it entered with.

**`DANGER_PERSISTENCE` 0.95 clears on mean depth and only just.** It also
does something the sweep at n=100 hid: **vault entry falls from 46.2% to
30.7%**. A hero that fears creatures from further away stops walking into
the room, so adopting it would quietly undo a third of the entry rate M44
was tuned to hit.

**So it was not adopted.** It is not a free constant upgrade, it is a trade
between half a floor of median reach and the Butcher's whole economy — an
owner decision, and one that would need the vault's `hp` re-solved behind
it. Left as a dial at 0.5.

**And both together is worse than cautela alone** (+0.24 against +0.38),
which is enough to say the two interact and neither should be reasoned about
in isolation again.

**The lesson is the sample size, not the dials.** Every number in the
original six-dial sweep came from 100 runs, and two of the three
"monotonic, higher is better" readings did not survive tripling it. This
file already carried that rule — do not explain a difference until it clears
2 sigma — and the sweep that found the real defects still shipped three
guesses alongside them.

## B21 — the optimum is a coward, and greed finally has a quantity of its own

Two measurements, both decisive, and they point opposite ways.

### The optimal bot walks past the vault

Coordinate descent over the four player dials, 120 runs a point, same seeds,
two passes, maximising mean depth:

| | shipped | optimum |
|---|---|---|
| coragem | 0.7 | **0.45** |
| ganância | 1.0 | **0.7** |
| pressa | 0.1 | **0.2** |
| cautela | 0.5 | **0.95** |
| mean depth | 4.31 ± 0.17 | **5.38 ± 0.19** |
| vault entry | 49.4% | **5.5%** |
| Butcher killed | 9.4% | 2.2% |

**+1.07 floors, 4.2 sigma — and the room stops being entered.** Every dial
moves toward caution and the optimum enters the vault in one floor in
twenty.

**So the vault is a negative-expectation bet at these numbers**, and the
earlier reading that winners finish 8.9 floors against 6.6 for avoiders was
selection, exactly as flagged: the bot enters when it can afford to, so
winners were already strong. Entering costs about a floor on average.

That is not automatically wrong — a bet you should decline is still a bet,
and `objectives.md` wants options with real weaknesses. It does mean the
room cannot be sold as "take it and you go deeper", and that **maximising
mean depth is the wrong objective to tune the game against**, because its
answer is always "be a coward". The tail — p90, or the share reaching floor
7 — is what `objectives.md` actually judges a sitting on.

### Greed with a value behind it stops being a slope and becomes a peak

The bot has never had a reward term: a chest's price was `walk + guard`,
pure cost, so it could ask "can I afford this" and never "is it worth it".
`sideAppetite` therefore pulled on the same threshold `fightMargin` already
pulled on, which is why the two read as one dial with a multiplier.

Behind `LOOT_VALUE` (off by default), a chest is now refused when
`walk + guard > CHEST_VALUE_HP × greed`. Swept over the six bias bands, 200
runs, same seeds:

| greed | mean depth | p90 | reached 7+ | vault entry |
|---|---|---|---|---|
| old rule | 4.33 ± 0.14 | 8 | 15.0% | 50.0% |
| 0.2 | 4.38 | 7 | 17.0% | 23.8% |
| **0.467** | **4.76 ± 0.15** | 8 | **22.0%** | 25.7% |
| 0.733 | 4.67 | 8 | 18.0% | 35.7% |
| 1.267 | 4.22 | 7 | 11.5% | 52.6% |
| 1.8 | 4.05 | 6 | 9.0% | 65.2% |

**The dial has an interior optimum.** Both ends are worse than the middle —
which is precisely what the bias-around-a-centre design was for, and the
opposite of every dial measured before it, which sloped one way and made
one end a no-brainer. And ±80% is enough spread: mean depth spans 4.05 to
4.76 and "reached 7+" spans 9% to 22%, so the answer to whether a
percentage bias flips enough decisions is yes.

**`CHEST_VALUE_HP` is therefore calibrated, not derived.** The naive
estimate is about 2 hp. The gate only uses the product `value × greed`, so
the sweep locates the best threshold at about 0.93 hp; setting the value to
1 puts that optimum at bias 1.0, which is what makes the six bands straddle
the centre instead of sitting on one side of it.

**Shipped OFF.** At its best band it beats the old rule by 0.43 floors,
which is 2.1 sigma — real but marginal, and turning it on is a balance
change the owner has not watched yet. The flag is one word.

## B22 — the bot could not add up a room, and fixing it made things worse

The vault put eight chests inside one creature's reach, and `guardCost`
charged the WHOLE duel against each of them. The bot compared one chest
against a 7.2 hp fight, eight separate times, and refused eight times. The
room's arithmetic is `8 × value − 1 × duel`; the arithmetic it did was
`1 × value − 1 × duel`.

**That is why raising the reward would not have helped.** At eight chests
the room already paid about 8 hp for a 7.2 hp fight — the bot was simply
never summing it. Amortising the guard across everything it guards is one
division and needs no new information: chests and loose items already sit in
Belief.

### It works, and the result is not what was wanted

200 runs a config, same seeds, empty-handed:

| config | mean depth | p90 | 7+ | vault entry | Butcher killed |
|---|---|---|---|---|---|
| shipped rule | 4.33 ± 0.14 | 8 | 15.0% | 50.0% | 8.8% |
| **amortisation alone** | 3.92 ± 0.12 | **5** | **7.0%** | **79.3%** | 9.3% |
| value + amortisation, greed 0.84 | **4.64 ± 0.14** | 8 | **19.0%** | 38.2% | **10.4%** |
| value alone, greed 0.52 | 4.59 ± 0.15 | 8 | 19.0% | 31.1% | 8.1% |

**Amortisation alone is the single biggest move on entry ever measured here
— 50% to 79% — and it costs a floor and a half of tail.** p90 falls from 8
to 5 and the share reaching floor 7 halves.

**So the room is genuinely a bad bet, and the bot's old refusal was
accidentally right.** It refused because it could not add; now that it can,
it accepts and does worse. The two earlier findings agree: coordinate
descent already put the optimal bot at 5.5% vault entry, and entering costs
about one floor on average.

**And the lever finally reverses.** "Raising the reward will not help" was
true only under the broken pricing. With the guard amortised, chest count
and chest value are read as a sum for the first time, so **the reward level
is now a real lever** — it was inert before because the comparison never
included more than one chest.

### What the pair is for

Value alone pulls entry DOWN (50% → 31%) and amortisation pulls it UP
(50% → 79%); together at greed 0.84 they land at 38% with the best depth and
the highest kill rate in the table. They are not two attempts at the same
thing — one prices the room's worth, the other stops double-charging its
guard — and neither is much use without the other.

Both stay behind `LOOT_VALUE`, off. Turning them on is a balance change that
wants the vault's own numbers re-solved behind it, not a cleanup.

## B23 — more reward does nothing, and the prediction that it would was wrong

With the guard amortised, `decisions.md` predicted that chest count would
finally become a real lever, because the bot could now read a room as a sum.
Measured at the greed dial's CENTRE (1.0) with value and amortisation both
on, 200 runs a config, same seeds:

| | mean depth | p90 | reached 7+ | vault entry | Butcher killed |
|---|---|---|---|---|---|
| **no vault at all** | **5.36 ± 0.16** | 8 | **34.5%** | — | — |
| vault, 8 chests | 4.61 ± 0.14 | 8 | 18.0% | 40.0% | 10.3% |
| vault, 12 chests | 4.51 ± 0.13 | 7 | 14.5% | 41.4% | 7.6% |
| vault, 16 chests | 4.57 ± 0.14 | 8 | 16.0% | 42.1% | 9.7% |

**Doubling the payout changes nothing.** Depth is flat from 8 to 16 chests
(4.61 → 4.57) and so is entry (40% → 42%). The prediction was wrong and the
reason is worth more than the prediction was.

**Entry does not move because the gate is already satisfied.** Amortised
across eight chests the Butcher costs about 0.9 hp each, already under the
value threshold, so chests nine to sixteen change no decision. The room is
not reward-limited.

**Depth does not move because of WHAT it pays.** Chests hold shields and
potions — both consumable — against a risk that is permanent. `rules.md`
says it outright: weapons are the only thing that makes the hero
permanently stronger. So the vault pays in the one currency that does not
compound, and paying twice as much of it buys twice as much of nothing.

**And the room costs three quarters of a floor no matter what.** 5.36
against 4.61 is 3.5 sigma, and the share reaching floor 7 halves, 34.5% to
18.0%. That is the third independent measurement saying the same thing —
the coordinate descent put the optimal bot at 5.5% entry, amortisation alone
cost a floor and a half of tail, and now the payout sweep says the loss is
not a pricing artefact.

### What this means for the dial redesign, which is the point of all of it

Greed's centre is supposed to be a FAIR bet, so that both directions are
worse and the six bands straddle a real optimum. At these numbers the vault
is never fair — a correctly-priced bot that enters it loses three quarters
of a floor — so every band sits on the same side and the dial has no
interior optimum in the vault's presence.

**The untried lever is the currency, not the amount.** The axe is the only
permanent gain in the room and there is exactly one of it. A vault that paid
weapons rather than consumables would be paying in the thing the game's own
economy says compounds — and that is the one thing this sweep did not test.

## M46 — the chest fill rate is flat, and what that moved

Owner decision: a chest holds something half the time, wherever it sits, and
the side room's reward half moves to chest COUNT.

**It replaced two gates with one.** The positional roll made a chest by the
entrance 10% full and one in the far corner 100% full; the scarcity draw
inside `itemWeights` then emptied another quarter behind it. The product was
about 42% and neither half was readable off the other. Now `hasLoot` is the
only gate, chests call `itemWeights` with `allowEmpty: false`, and the
scarcity dials become a RATIO for chests — which of the two kinds, not
whether there is one.

**The reason that decided it was the bot, not the curve.** `CHEST_VALUE_HP`
is one number for every chest, and under the positional roll it was wrong
about all of them — the chest by the door was worth about 0.3 hp and the one
in the corner 3. A flat rate makes the single belief exact, and that belief
is what the greed dial biases around. A dial cannot be calibrated on an
average of unequal things.

**Measured after: 43.7% of ordinary chests hold something** (2160 chests
over 360 floors), 43.2% on the spine against 46.5% in side rooms — equal
within noise, which is the point.

### The side room's reward is now count, and count alone

`SIDE_ROOM_DEPTH_BONUS`'s reward roll fed `hasLoot` through `depth`, and
that was the only live reward channel a chest had (`quality` is inert while
each kind holds one item). It now reaches nothing. **The reward half is
`SIDE_CHEST_BIAS`.**

That still varies per room, which is what `map-design.md` requires: chest
placement is a weighted draw per chest, so one side room gets three and
another gets none. Reward varies by count, risk varies by the depth roll,
and the two remain independent.

**But the magnitude is small and worth watching: side rooms hold 14.6% of a
floor's chests.** Refusing every detour costs about a seventh of the floor's
loot. If the detour should pay more, `SIDE_CHEST_BIAS` is now the whole
lever — there is no second one.

### One divergence recorded

`CHEST_DIFFICULTY_SCALE` 0.9 was FAITHFUL (generator.cljs:238), already
inverted here against spec quirk 9.3. It is gone. Deliberate, and the
second time this file has chosen legibility over fidelity on the loot side.

## B24 — the panel closes at three dials, and only one of them is a choice

Four sweeps, and the owner's first instinct was right before any of them:
two dials govern almost everything.

### `stepCost` is the third inert one, and it resisted hardest

Swept at eight points, then again as six bands around three different
centres — 18 configurations at n=150. **Everything between 0.08 and 0.9
reads the same**: 4.3 to 4.5 mean floors against a standard error of 0.15.
Raising the centre does not open the range, it moves a flat window somewhere
else flat.

An earlier n=100 sweep had it worth half a floor between 0.1 and 0.8. That
was noise — **the third reading in this project to evaporate at three times
the sample**, after `GOAL_STICKINESS` and "more reward will help". The
pattern is now specific enough to state as a rule: at n=100 a difference
under about 0.5 floors is not a difference.

Decided at 0.1, the value that shipped, moved from `dial-overrides.json` into
`DEFAULT_HERO` so removing the slider changes nothing. The mechanism stays:
at 0 walking is free and the bot wanders one floor for 1500 turns.

### `DANGER_PERSISTENCE` is the one dial with a real range, and it is not a peak

Six bands at n=200: 0.1 reads 3.85 mean floors, 0.26 4.08, 0.42 4.25, then
0.58 / 0.74 / 0.9 read 4.57 / 4.63 / 4.58. **A 0.78 floor span at 4.7
sigma**, with every column moving together — reaching floor 7 goes 5% to
17%, chests 17 to 21, kills 40 to 61.

**It rises and then flattens.** No interior optimum: the bottom half costs
depth, the top half is a plateau. 0.5 sat BELOW that plateau, so the bot ran
calibrated at a point worse than four of its own six bands. Raised to 0.7.

Measured over the shipped configuration, 200 runs:

| | mean depth | reached 7+ | clears | chests | vault entry | Butcher killed |
|---|---|---|---|---|---|---|
| 0.5 | 4.35 ± 0.14 | 13.0% | 0.5% | 19.9 | 47.9% | 8.6% |
| **0.7** | **4.71 ± 0.14** | **18.0%** | 1.5% | 21.5 | **36.7%** | 10.0% |

+0.36 floors at 1.8 sigma, and it costs 11 points of vault entry — a hero
that fears things from further away stops walking into the room. Both were
known before adopting it.

### What the panel is now

Coragem, Ganância, Cautela — all three the same shape, a ±80% bias in six
bands around a centre the player cannot select, with an untouched dial
running AT the centre.

**Only Ganância has an interior optimum**, because its centre is the one
that is COMPUTED (a chest's expected value) rather than chosen. Cautela's
deliberate choice is to go DOWN. Coragem moves which fights are taken far
more than it moves depth.

That asymmetry is worth stating plainly rather than papering over: the
bias-around-a-centre design gives every dial a comparable shape, but it
cannot manufacture a trade where the underlying quantity does not have one.

## B25 — the loot-value model ships, and not for the reason it was built

Turned on. A chest is refused when `walk + guard > CHEST_VALUE_HP × greed`,
with the guard's duel split across everything it guards, instead of
`guard > sideAppetite × fightMargin × ehp` with the whole duel charged
against every chest separately.

### At the centre it is a wash, and that is the honest headline

200 runs, same seeds, shipped configuration:

| rule | mean depth | p90 | 7+ | clears | chests | turns | vault entry |
|---|---|---|---|---|---|---|---|
| old | 4.71 ± 0.14 | 8 | 18.0% | 1.5% | 21.5 | 375 | 36.7% |
| new | 4.62 ± 0.14 | 8 | 15.5% | 1.5% | 20.8 | 360 | 38.8% |

0.45 sigma apart. **Nothing improved.** If the case for shipping this were
the numbers, there would be no case.

### The case is that it makes the dial a choice and the panel true

Re-measured under the SHIPPED configuration — the earlier band sweep ran at
`DANGER_PERSISTENCE` 0.5 and was no longer describing this game:

| greed | mean depth | 7+ | chests | vault entry | Butcher killed |
|---|---|---|---|---|---|
| 0.2 | 3.85 ± 0.12 | 10.0% | **8.4** | 7.8% | 1.0% |
| **0.52** | **5.01 ± 0.15** | **24.0%** | 21.0 | 17.9% | 3.8% |
| 0.84 | 4.92 ± 0.15 | 22.5% | 22.1 | 31.4% | 10.3% |
| 1.16 | 4.53 ± 0.14 | 14.5% | 20.5 | 44.9% | 11.5% |
| 1.48 | 4.33 ± 0.13 | 13.0% | 20.0 | 55.0% | 10.7% |
| 1.8 | 4.24 ± 0.12 | 9.5% | 19.6 | 54.4% | 8.8% |

**An interior peak, and a sharp one:** 1.17 floors between the best band and
the worst, 6 sigma, with vault entry spanning 7.8% to 55% and chests 8.4 to
22. Under the old rule this dial moved which fights were affordable and
little else.

**And the panel stops lying.** Ganância's label — "how much the hero over or
under-values a chest" — is only true under this rule. Shipping the label
without the rule was the inconsistency this closed.

### Two things it does not fix, stated rather than left to be found

**`sideAppetite` now means two things at once.** A multiplier on value for
chests, still a share of hp for side-room creatures and loose items —
neither has a value the bot can price, since a weapon's worth is damage and
converting that to hp is a modelling decision nobody has made. The dial's
label is true for the case it was built for and incomplete for two others.

**The centre is still not the peak.** 0.52 and 0.84 both beat 1.0 by about
2 sigma. `CHEST_VALUE_HP` is computed, not tuned — owner decision, and the
right one — so the centre sits where the arithmetic puts it and the two
bands below it are better. Either the expected-value calculation is missing
a term the hero actually experiences, or walking is under-priced in the same
comparison. Open, and not to be closed by nudging the constant.

## U13 — the game was not running while you were away, and one line of the loop was why

An idle game that stops when you look away is not idle. It did stop: every
delay in `src/ui/spectator.js` came from one `sleep()` built on `setTimeout`,
and a browser clamps `setTimeout` in a hidden tab.

### Measured with both sources in the same page at the same time

`tools/timer-probe.html` runs the same 110ms interval two ways in one page and
counts only the ticks that land while the tab is hidden:

| hidden for | source | ticks per second (asked: 9.09) | worst gap |
|---|---|---|---|
| 2 min | `setTimeout` | 1.11 | 1.0s |
| 2 min | `setInterval` inside a Worker | 9.09 | 0.1s |
| **24 min** | `setTimeout` | **0.22** | **60.0s** |
| **24 min** | `setInterval` inside a Worker | **9.09** | 0.2s |

**Both of Chrome's tiers were seen, and the second one is the real one.** The
first five minutes hidden cost one call per second; after that the page drops
to one call per **minute** — the 60.0s worst gap is that, measured, not quoted
from documentation. 319 ticks in 24 minutes is about 300 from the first tier
and 19 from the second: the game would have been playing a turn a minute.

The worker held 9.09/s for the whole 24 minutes, 13105 ticks, worst gap two
tenths of a second. **And the page was never frozen** — the probe watches for
the Page Lifecycle `freeze` event and saw none in 24 minutes hidden, which is
what makes the decision below safe rather than merely cheap.

**The clamp is on timers, not on the page.** A worker's `postMessage` is a
message task, so a worker can keep time and the page merely answers it. That
is the whole of `src/ui/clock.js`.

### Why the clock, and not the loops

Frames, the shop's thirty seconds, the summary card, the coin popup and the
pause loop are all paced by that one `sleep()`, and all of them were slowed by
the same factor — the shop's bar was taking six minutes to cross. Replacing
the primitive fixed every one of them without touching a single loop, and
without a new dial anywhere.

### Catch-up was considered and NOT built

A worker does not survive the browser *freezing* the page (Chrome's
Memory/Energy Saver, a phone backgrounding the browser). The complete answer
to that is for the game to notice the wall-clock time it lost and fast-forward
through it, which is what other idle games do.

It was left out because the freeze did not happen: 24 minutes hidden, no
`freeze` event, the worker never missed a beat. And it is not cheap. A run is
258ms of simulation plus 62ms of replay and buys about 40 seconds of playback
— 0.8% of a core, so running at full speed while hidden is nearly free, but
*catching up* an hour away means about 30 seconds of blocking work the moment
you come back, and a cap on that is a new parameter existing only to protect
another parameter.

**What would reopen it:** the probe reporting a `freeze`, which is the case
this machine did not produce. A phone, or a laptop on battery with Chrome's
Energy Saver on, is where to look — not a desktop that has already answered.

### What is not fixed

`run-check.html` still paces itself with its own `setTimeout` (line 85), so
`CLAUDE.md`'s "keep the tab visible while it runs" is still true for the
tripwires. Same one-line fix available; not taken here because it would make
that instruction stale in a doc this change had no other reason to touch.
