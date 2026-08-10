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
`balance.md`. Readings come from `run-check.html` and `run-shape.html`.
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

**1. A difficulty curve that starts low and accelerates, with floor 10 the
hardest.** Floor-to-floor monotonicity is guaranteed by an exact closed form
over the tier distribution rather than observed, and the ramp is exponential.
The failure it guards against is a floor cheaper than the one above it.

**2. Alternative routes, with no no-brainer.** Real choices weighing loot
against the creatures in the way — neither a corridor nor a maze. This is the
bargain below, and its open half is "What is still open".

**3. A tail of randomness — rare floors that come out harder than expected,
and the tail thickens with depth.** A creature can come from above the floor's
band, with the chance growing with depth. The intended shape is a one-sided
tail whose peak grows smoothly from floor 1 to floor 10. `X6` owns why it does
not: an absolute spread contained by a proportional clamp.

**4. Most of the threat on the fast route.** If a direct run to the portal can
skip most of the floor, the mandatory path is not mandatory. The intended
shape: a direct run wakes well over half the floor, and only a modest fraction
is left standing afterwards.

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

A floor should offer **one mostly-linear mandatory path holding most of the
threat**, plus **side rooms that can be skipped** — fewer but nastier
creatures, better chests. Take the safe road, or gamble for gear you will want
three floors down.

That is the whole design. Everything below is how it is arranged and what went
wrong on the way.

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

## Two things to check whenever this area changes

**The shallowest floors and `MIN_ROSTER_FOR_SIDE`.** Changing the creature
count moves which floors attempt a split at all, which moves spine share on
exactly the floors most sensitive to it. This has bitten before.

**Spine share against its band.** It has been broken and restored more than
once — by clustering, and again by shrine placement — and it is not
self-correcting. `run-shape.html` reads it; `docs/project/decisions.md` records
why it and CV pull against each other, and that the fix is never to widen the
band or edit the test.

## What was tried here and did not work

Not repeated here. Corridor-seeking, exposure pricing, the activation cap,
threat-scaled crowd penalty, and the retracted mass-quota diagnosis are all in
`docs/project/decisions.md` with the numbers that killed them.

The one lesson worth restating because it was learned in this file: a gap was
reported as a finding at 1.3 standard errors and a causal story was built on it
within the same session. It later measured at nothing.
`descentCurve().discrimination` returns `z` alongside its rates now, so the
next such gap has to clear the bar before it earns an explanation.
