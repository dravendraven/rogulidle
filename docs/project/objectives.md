# What we are doing

Rogulidle plays itself. The player watches a bot descend ten floors, run after
run. **The product is the spectacle.**

## What "worth watching" means — the horse race

The frame, in the owner's words: **a race you have a bet on.** You want your
horse to win. The race is fun because **reversals are possible** — something
can happen, your favourite can surge or fall back — so there is a rollercoaster
rather than a result. Winning is very rewarding, and it makes you want to watch
the next one.

That is a much more useful goal than "worth watching", because it names
properties a design can actually have or lack:

- **Hope must never reach zero.** This is the sharpest form of the goal and it
  subsumes "a reversal is possible". Hope can be *low* — your horse is last —
  or high, but it has to exist, because a run whose outcome is already
  determined is not a race even while it is still moving. A hero with 2 hp
  standing on floor 8 that would cost forty is watching a result, not running a
  race.
- **The outcome stays uncertain for as long as possible.** Not balanced —
  *uncertain*. A coin flip at floor 9 beats a foregone conclusion at floor 3.
- **Winning rewards doing well, and stays rare enough to matter.** A band with
  two named failures: too common and the win loses its charm, too rare and hope
  goes with it. No number is set for the band; the two failure directions are
  what to steer by.
- **It has to make you want the next one.**

### Hope is measurable, and the instrument is already specified

"Hope" is `P(finish | state now)` — the conditional chance of completing from
where the hero actually stands. That is exactly what `I9` was filed to build.
**It was filed as a tool for pricing coin; this makes it the instrument for the
primary objective**, which is a much stronger reason to want it.

It also means the current state fails this objective on its own terms rather
than merely being hard: with finishes near zero, hope is near zero for most of
most runs — the **"too rare, hope goes with it"** failure, named above by the
owner and now diagnosed.

And it explains why `I9` being blocked matters more than it looked. It is
blocked on finishes being non-zero — the same thing the objective needs.

### Cycles — a hypothesis, with a mechanism that already exists

The owner's suggestion: alternating stretches of winning, of failing, and of
trading wins and losses would make a better experience than a flat rate.

**Worth recording that nothing needs building for this, and that it is already
gated on the same thing.** Runs are independent draws — each seed is derived
from the session seed and the run number, so nothing in the engine creates a
cycle. But the shop does: coins bank on a clear, buy gear, make the next run
easier, which earns more coins. **That is a ratchet.** And the owner's own death
rule — lose the balance and the held items — is the crash that resets it. A
ratchet with a reset is a sawtooth, which is the cycle structure described.

**Two honest caveats.** The ratchet only engages once runs are winnable at all,
so today the mechanism is inert for the same reason everything else is. And if
compounding outruns the reset, cycles become a runaway instead — win once,
snowball, win always, which is the *other* named failure. The death reset is
the only brake, and nobody has checked it is strong enough.

**Still judged by watching.** None of these is measured today, and the project
has already paid once for treating a proxy as the thing.

## The bot's objectives

Stated in full in `docs/bot-strategy.md`, and not duplicated here. In short:
**cross the ten floors alive** (the requirement), then **maximise coin** (the
ideal, derived from xp per turn). The two do not compete — coin only banks on a
completed run, so risking the run for coin is a strictly bad trade.

The bot decides with **only what it can see**: layout, creatures, chests and
the portal, through the fog. Never the game state.

## What the map has to do

Four properties, owner-defined. Status is honest, not aspirational.

**1. A difficulty curve that starts low and accelerates, with floor 10 the
hardest.** Largely built: floor-to-floor monotonicity is guaranteed by an exact
closed form rather than observed, and the ramp is exponential.
**Open question, not a gap in the design:** floor 10 may now be past "hardest"
and into "unreachable" — `finishes` reads near zero, which is the payoff the
first section says the spectacle needs.

**2. Alternative routes, with no no-brainer.** Real choices weighing loot
against the creatures in the way — neither a corridor nor a maze.
**This is the largest open gap in the game, and it is measured as not met.**
`docs/map-design.md` records it: the bot opens nearly everything, good room and
bad room alike, so the detour is a free lunch rather than a gamble. The
variance between side rooms was built and works; what is missing is a *level*
of reward at which refusing is ever correct.

**3. A tail of randomness — rare floors that come out harder than expected,
and the tail thickens with depth.** Built and shipped: a creature can come from
above the floor's band, with the chance growing as the descent goes on.

**4. Most of the threat on the fast route.** If a direct run to the portal can
skip most of the floor, the mandatory path is not mandatory. The intended shape:
a direct run wakes well over half the floor, and only a modest fraction is left
standing afterwards.
**Partly unverifiable today.** The dial that exists (`SPINE_THREAT_SHARE`)
controls where threat is *placed*. This property is about what a direct run
*wakes*, which depends on activation radii and route geometry — a different
quantity, and **nothing measures it.** The one module that came close is dead
code on X1's delete list.

## How work gets found

**Watch the game. Fix what is wrong.**

That is the whole method. It is not a fallback from something better — it has
outperformed the alternative by a wide margin.

## A threshold is not a scoreboard

Worth stating because sections above give numbers and an earlier version of
this file said no number is a goal.

**Both are true, and the distinction is the lesson.** What failed was a
*scoreboard*: a quantity to push in one direction, with everything downstream
inheriting the assumption that pushing it made the game better. CV went up;
nobody could say the game improved.

A **tripwire** is the opposite shape. "If a direct run skips most of the floor,
something is wrong" does not reward being pushed — it fires or it does not, and
when it fires there is a defect to find. That is what makes "fix what is wrong"
actionable instead of a matter of taste.

So: thresholds that detect a defect, yes. Targets to maximise, no.

## What the measurement programme cost

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

## The rule that replaces the programme

**Measure only when you cannot tell by looking.**

Most of what is wrong with this game is visible in thirty seconds of watching.
Reach for an instrument when a question is genuinely invisible — "is this floor
actually harder than that one", "did that change break something three floors
down" — and not before.
