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
