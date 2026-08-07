# Objectives and targets

Why the work exists and what it is judged against. The task list is
`docs/backlog.md`; current measured values are `docs/kpi.md`.

Read this once. Agents do not need it to deliver a task — the acceptance
criteria on each item carry what matters — but it is where those criteria
came from, and the reasoning is what stops them being re-litigated.

## Objectives, in order

The broad goal is that a run is **worth watching**. It is not measurable and
no attempt should be made to measure it directly. Two things drive it:

    1. Curve shape approaching DCSS's     feature: map    M2..M6, I1..I3
    2. An intelligent bot                 feature: bot    B1..B6, I4

A third — the outcome reading like a horse race — is an **effect of those
two, never a target**. See "Goals" below before touching it.

Every item in the queue serves 1 or 2. If you cannot say which, say so
rather than starting.

The `feature` column is **which objective an item serves**, not which files
it touches. I1 and I2 are instruments living in `src/analysis/`, and they
are `map` because what they measure is the curve. I4 is `bot` because the
question is whether the bot can tell a good side room from a bad one, even
though the metrics agent answers it.

## Goals

The broad goal is that a run is **worth watching**. That is not measurable
and no attempt should be made to measure it directly. Three sub-goals are,
and everything in the queue serves one of them.

**1. The curve shape approaches DCSS's.** Only the signs of the ratios are
the target; the magnitudes are derived from attribute scales rather than
observed play. Served by the map queue, measured on the probes.

**2. The bot is intelligent.** The spectator should see decisions, not
flailing. Served by the bot queue, measured on bot-internal metrics.

**3. The outcome is worth betting on.** The descent should read like a horse
race: reaching the bottom is plausible but not assured, so the viewer builds
an expectation and it can be broken. Too certain is boring; pure coin-flip
is also boring, because nothing the viewer sees explains the result.

Sub-goal 3 decomposes into three things that can be measured:

- **Clear rate** — plausible but not assured. Currently around 30% for the
  real bot, which is inside a reasonable band; the number to argue about is
  whether it should be lower.
- **When the outcome is decided** — late is drama, early is no arc. If most
  deaths happen on floors 2–3, there is no race to watch however good the
  odds look on paper.
- **How much of the result is legible** — `balance.md` already measured
  this: 46.5% of outcome variance came from the map and 53.5% from the
  combat dice. All dice means the viewer cannot read anything; all map means
  the run was decided at generation.

**Sub-goal 3 is an integration test, and must never be optimised directly.**
1 and 2 are causes; 3 is an effect. It is measured with the real bot playing
the real map, so it is the only thing that can tell you the other two added
up — and it is the only one that cannot tell you what to do about it.

Two reasons it must not become a target:

- **It can sit at its number while the game is bad.** A dumb bot reaching
  the bottom one run in ten looks random rather than dramatic, and a flat
  curve is boring at any level of finishes. Hitting the number proves nothing on
  its own.
- **The number is trivially reachable.** Any level of finishes can be dialled
  in by moving creature count alone, learning nothing. Aiming at sub-goal 3
  directly is the fastest way to hit it for the wrong reason.

So it stays a falsifier: it can say the sum failed, never what to fix.
Nothing in the queue serves it, deliberately — and measuring it against a
bot with known defects would measure the defects.

## Targets for objective 1

Growth per floor, measured on the probes, so every map item is judged
against something rather than against "stops falling".

| quantity | target | kind |
|---|---|---|
| challenge | hold, ±0.03 | **constraint** |
| CV challenge | ≥ 1.00, aim ~1.05 | goal |
| capacity | **rises** | goal, comparative |
| attrition | does not outrun capacity | goal, comparative |
| challenge/power | ≥ 1.15 | **bound** |
| **finishes**, real bot | 15–40% | **bound** |
| reward | none yet, no instrument | see I6 |

**Current measured values live in `docs/kpi.md`, not here.** That file is
the metrics agent's and is updated after every reading; this table is the
project agent's and changes rarely. They used to be one table, which is
exactly why it went stale — two owners, two cadences, one row. If a number
in prose anywhere disagrees with `kpi.md`, `kpi.md` wins.

### Why capacity and attrition are comparative, not absolute

They used to be one number, `buffer`, carrying `≥ 1.00`. That target is
withdrawn. Two reasons, both from I5.

**It was borrowed.** 1.00 and 1.16 came from a DCSS figure derived for a
real player and applied to a probe reading. Nothing checked that the two
were commensurable, and they are not.

**And the rate is not scale-invariant, so no absolute can survive.** The
same M6 grant of about +42 hp across a descent reads `×1.011` per floor on
the probe's 400 hp base and roughly `×1.20` on a real hero's 10. A quantity
that moves twenty-fold with an instrument setting cannot carry a bar.

**Buffer was also two things glued together:**

    capacity     what the hero accumulates descending — ceiling, gear, grants
    attrition    how much of that a floor takes back
    buffer       = capacity − attrition, as seen on arrival

Capacity is measurable with no survivor selection. Attrition needs a hero
that can die, so its bias is intrinsic and gets **declared rather than
disguised**. Quote `buffer` only with the window it was fitted over — its
sign flips between floors 1–6 and 1–10, and I5 showed that flip is
selection, not the game becoming forgiving.

**Instrument note, load-bearing.** Capacity must be measured with death
suppressed as a flag and the probe starting at `PLAYER_HP`. The current
probe survives *because* it carries 400 hp, which conflates immortality with
base and dilutes every rate it reports. Immortality and starting hp are
independent; the instrument should treat them that way.

### Challenge is a constraint, not a goal

It is calibrated and no map item is licensed to move it. An item that
improves a ratio by making floors harder or easier has improved nothing — it
moved the denominator.

### CV: do not copy DCSS's 1.14

The rates are not comparable because the bases are not. Rogulidle's CV of
challenge begins at 1.20 on floor one and falls to 0.64 by floor nine; DCSS
starts much lower. Growing 1.14 per floor from 1.20 ends near 3.9 — a
standard deviation four times the mean, which is not a game, it is a coin
toss.

The high base is an artefact worth understanding rather than preserving:
floor one holds two creatures, so one draw swings the total. The fall to
0.64 is mostly the law of large numbers as the roster grows. **The target is
the sign, not the slope** — deep floors at least as unpredictable as shallow
ones.

### Two bounds, not goals

`challenge/power` must not fall below about 1.15, and finishes must stay
inside 15–40%. Both drift the same way when the hero gets stronger. They
exist to catch a fix that works by making the game easy, and if either
leaves its band the answer is a smaller change, never a difficulty re-tune.

**`finishes`** is the fraction of runs where the bot reaches the bottom.
The name is deliberate: it is something you read and bet on, not something
you maximise.

**And it is measured on the real bot — that is the point.** Everything else
here describes the design against a fixed, deliberately dumb reference
player. The probe cannot exploit a game that got easier the way a competent
bot can, so it under-reports how much a change moves the actual product. M6
proved it: the probe's buffer moved 0.846 to 0.910, a modest and
carefully-argued improvement, while finishes went 30.7% to 56.7%. On the
probes alone that change looks safe.

### No target for reward, yet

`reward/challenge` and CV of reward have no instrument that answers the
question — the probes collect only what they step over, which is a property
of their policy. **I6** exists to fix that. Until it lands, nothing should
be built to move a number that does not yet mean anything, which is why M5
and M9 are both held.

## The problem all of this serves

Measured: difficulty grows ×1.34 per floor while the hero's power grows far
slower, the **coefficient of variation falls** with depth (0.944 per floor),
and the **buffer falls** rather than holding. Deep floors converge on their
own average; the climax of a run is its most predictable moment, played by a
hero whose tolerance for error is shrinking.

In a game the player only watches, that is the central problem. A player
with decisions gets tension from risk. A spectator only has surprise.

The target is not to match DCSS's numbers — those are derived from attribute
scales, not observed play, so only the **signs** of the ratios are
comparable.

Current reading, from the observed ruler (I1) after review. Numbers from the
modelled ruler are superseded and not comparable:

                       DCSS    rogulidle
    challenge/power    0.95     ≥1.307   inverted, and DELIBERATE — see below
    CV challenge       1.14      0.944   inverted, WRONG    -> M2..M5
    buffer             1.16      falls   inverted, WRONG    -> M6
    challenge/buffer   1.11      1.560   same sign, 5× steeper — follows buffer
    reward/challenge     —         —     no instrument answers this yet

The rogulidle column is the observed ruler (I1) after review; the DCSS column
is derived from attribute scales rather than observed play, so treat it as an
estimate of shape, never as a number to hit exactly.

**Decided: match CV and buffer, leave challenge/power alone.**

`challenge/power` inverted is a **format parameter, not a defect**. DCSS runs
0.95 — the average fight gets easier with depth — because it has 27 floors
and a win condition to reach, so its drama lives in the tail and it has room
for the tail to happen. Rogulidle is a ten-floor race that has to end, at
around 30% clear.

Copying 0.95 into ten floors gives `0.95⁹ = 0.63`: floor ten lands 37%
lighter on the hero than floor one, the hero walks the bottom, and the clear
rate goes to nearly 100%. The horse race dies. Matching that index honestly
would mean lengthening the descent, which is a different project from the one
in this queue.

So two of the three inversions are targets and the third is left where it is.
Revisit only if the floor count itself is ever reconsidered.

Two cautions attached to that block, both from the I1 review:

- **Buffer falls, it is not flat.** The earlier "flat" reading came from the
  modelled ruler. Observed, the hero ends the descent absorbing a fraction
  of the blows it absorbed at the start. Survivor selection makes the
  measured value optimistic, so the real decline is steeper.
- **Reward is out of the block.** The probe collects only what it steps
  over, so its reward number describes the probe's policy rather than the
  design. Putting it back needs an instrument that detours for loot.

**Ordering consequence.** M3–M5 add a lethal tail. Against a *falling*
buffer a lethal tail is not tension, it is sudden death with no arc — the
hero's capacity to survive the spike is shrinking as the spike appears. So
M6 is decided before any variance work is adopted. Measuring M3–M5 first is
fine; adopting them is not.

**Tune the curves against the probes, never against the real bot.** The
probe measures the design against a fixed reference player; the real bot
measures design and bot quality mixed together, so every bot fix would move
the target. Win rate is the real bot's question, and it is a different one:
is this playable and watchable.

**Re-read the ratios after each map change, not once at the end.** M3, M4
and M5 aim at the same target by different routes; stacked and measured once
they cannot be told apart, and at least one of them probably does not pay —
the count→strength route already did exactly that. The probes are frozen, so
a re-run is cheap and paired by construction. "Are we close to DCSS" is a
reading of the ratios above, not a separate instrument.

---
