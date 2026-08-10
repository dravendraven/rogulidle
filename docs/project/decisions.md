# What we learned

Findings that cost something to get and would cost again to relearn. The
full record — every item, result and review — is in the git history; the
commit messages carry the reasoning. This is the residue.

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
