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

**`REVERSAL_PENALTY` does not fix it.** Swept 0 / 1.5 / 6, moved the
reversal rate 0.238 → 0.205, cost win rate.

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
