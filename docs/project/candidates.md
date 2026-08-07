# Candidates and archived routes

Ideas with a reason attached but no slot, and routes that were measured
and dropped. Nothing here is scheduled. The task list is
`docs/backlog.md`.

## Candidates — recorded, not scheduled

Ideas with a reason attached, waiting for a slot. Nothing here has an
acceptance number yet; several would not survive contact with one. They sit
here rather than in the queue because **I5 is unresolved** — it may show the
ruler cannot answer the questions these would be judged by, and scheduling
work against a suspect instrument is the mistake the buffer target already
made once.

Ids keep the feature prefix they would have anywhere else. Whether an item
is scheduled is what the section and the status say, not what it is called —
the same way M5 sits ON HOLD and M2 FOLDED without losing their M.

**Reward placement is not here**, though it came up in the same brainstorm.
Rogulidle already couples reward to risk — `SIDE_CHEST_BIAS` puts chests in
guarded side rooms, `CHEST_LOOT_RICHER_FAR` puts the good ones far,
`CHEST_QUALITY_BY_DEPTH` makes depth buy quality — and `map-design.md`
already derived the point DCSS gets from hand authorship, that risk and
reward must roll independently per room or the gamble is a free lunch. The
design exists; what is missing is evidence it works, and that is **I4**,
parked. No new item, just a measurement nobody has taken.

### U2 · live clear odds on screen

`product` · `metrics agent` then `ui agent` — instrument first, display after

A number on screen — "X% chance of reaching the bottom" — recomputed at each
floor transition from the hero's real state.

**Serves neither objective directly.** It is spectator legibility, not a
balance target. **Display, never a KPI** — nothing should ever be tuned to
move it.

**Mechanism: Monte Carlo rollout, not a fitted formula.** Predicting the
outcome from static map features was already measured and fails —
correlations top out near 0.3 and a fitted model reaches 64% against a 59%
base rate. So instead, at each floor transition run N headless simulations
from the current state (hp, floor, gear, creatures left) and take the
fraction reaching floor 10.

Use the **real bot**, not the probes. The probes exist to calibrate design
against a fixed reference player; the question here is about this bot
specifically.

**Success is calibration, not accuracy.** Across many runs where the display
read ~70%, about 70% should clear. Systematic divergence means the rollout
is biased — wrong player, or N too small.

### Three notes from review, added to the proposal

**Performance is the real risk, ahead of the RNG one.** `N × remaining
floors` headless descents at every transition is, on floor 1 with N = 50,
around 500 floor-plays — the same order as a balance sweep, which this repo
already documents as needing a visible tab and real time. Single-threaded in
a browser that stalls the run being watched. Solvable with a worker, which
is plain JS and inside the rules, but it belongs in the spec rather than
being discovered during implementation.

**The map is fixed, which changes what the number means.** `playDungeon`
generates each floor from the seed, so a rollout of floors 9–10 produces the
*same* floors — only the combat dice vary. That is the right question ("given
this dungeon and this hero, what are the odds") but it has two consequences.
The number is **conditional on the map**, and since `balance.md` measured
roughly half of outcome variance as dice and half as map, the rollout
captures one half deliberately. It also means **N can be small** — with only
the dice varying, 20 may be plenty, which is most of the performance problem
answered.

**Showing the level may kill the drama the item exists to create.** Racing
shows odds and it works, but a screen reading 8% stops you caring and 95%
stops you watching, and sub-goal 3 wants the outcome uncertain and readable
for as long as possible. What probably works is the **movement**: "40% → 12%
on that floor" is drama; a static 12% is deflating. That is a design
decision to take before building, not after.

**Blocked on E1, and that changes who builds it.** As proposed this needs a
fifth reimplementation of the descent loop — and the worst of the five,
since it runs during the watched run rather than offline, where drifting
from the engine would make the odds quietly stop describing the game.
`clustering.js` already did exactly that after M7.

With E1 done — one resumable loop exported from `src/sim/` — the ui agent
can build U2 **alone**: import the loop, import `makeBot`, derive the
rollout seed through `hashSeeds`, and touch nothing outside `src/ui/`. No
metrics-agent half, no new instrument. The rule is that ui does not *edit*
`src/sim/`, not that it cannot import from it.

### M8 · layout variety, the way DCSS picks a builder per level

Nothing in the backlog touches map *structure*, and the arithmetic likes it
more than most of what is scheduled.

**Layout is floor-level variance.** A cave floor and a corridor floor cost
very different amounts with the same roster — open ground lets several
creatures engage at once, a corridor forces them into a queue. That is one
draw per floor, and floor-level draws do not dilute with `n`. It is the same
class as M4 and precisely the class M3 is not.

It also amplifies M7. In an open cave the bot **cannot** un-group a cluster
by backing into a corridor — which is the caveat I2's review raised, that
grouping only becomes a lever where the map prevents the escape.

Not expensive: ROT.js already ships Digger, Uniform, Cellular and Rogue. The
risk is whether `spine.js`'s spine/side classification survives layouts it
was never written against.

And it is the only candidate here that changes what is **seen**. Ten floors
out of the same digger are visually monotonous.

## Archived

### The count→strength route — UNARCHIVED, see M7

Reopened. The reasoning below is still correct and the numbers still hold;
what was wrong was the conclusion drawn from them.

Every playable point had the CV still falling, so the route was written off.
But converted to a rate per floor, count 1.10 reaches 0.970 against today's
0.944, and count 1.00 reaches 1.012 — the sign does flip. It flips only at
the degenerate corner, where a base of 2 and no growth means two creatures
on every floor.

So the route failed for **emptying the floor**, not for failing to move the
CV. Grouping fills exactly that gap: twelve creatures in four clusters are
four draws with twelve bodies. That combination was never swept, and it is
what M7 is.

Kept below as originally written.

### The count→strength route — measured, does not pay

Shifting the difficulty budget from creature count to individual strength,
holding the product constant. Measured across five points.

**Why it was dropped.** Every playable point still has the CV falling
(0.841 down to 0.49–0.64). Only the degenerate extreme reverses it, and that
extreme means two creatures on every floor — a dungeon that never grows.

**Worth keeping from it.** The real cost exponent in strength is 2.356, not
2, because strength indexes an 11-row table whose mass runs 0 to 108. And
the sweep is what exposed the ruler being wrong: modelled cost held constant
(×10.5 against ×9.8) while win rate moved 12–13 points across two
independent seed families.

---
