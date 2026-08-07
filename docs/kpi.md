# KPI — current measured values

**Owned by the metrics agent.** Updated after every reading, never by
anyone else. If a number here disagrees with a number in prose elsewhere,
this file wins and the prose is stale.

`docs/backlog.md`'s "Targets for objective 1" holds the *targets* — design
decisions, owned by the project agent, changing rarely. This file holds
*what was measured*. Keeping them in one table is what let the targets
table go stale: two owners, two cadences, one row.

Every row carries the commit it was measured at and the sample. A value
without those is not usable.

## Objective 1 — curve shape

**Current shipped state (as of `8eb8c39`): `HP_FROM_KILLS = false`,
`DIFFICULTY_REBALANCED = true` — M7 was adopted at `25f45a1`, after the
table below was taken.** The M7 off/on columns below are the **historical
read from commit `f42f085`**, before adoption — kept for the record of what
the decision was based on, not a live reading of current shipped state.
"M7 on" in that table = what is shipped now; "M7 off" no longer exists as a
default anywhere, only as an explicit `makeFloorPlan` override. Every row
below was taken with `HP_FROM_KILLS` forced **false on both arms** of the M7
columns, so the M7 gap is isolated from M6 rather than inherited from it —
see the note at the bottom for why that matters.

| quantity | M7 off | M7 on | window | n | target |
|---|---|---|---|---|---|
| challenge (× / floor) | 1.341 ±0.010 | 1.337 ±0.029 | fl 1–10 | 150 pairs/level | hold ±0.03 |
| CV challenge (× / floor) | 0.941 ±0.013 | 0.986 ±0.006 | fl 1–10 | 150 pairs/level | ≥ 1.00 |
| capacity, hpMax (× / floor) | 1.000 ±0 | 1.000 ±0 | fl 1–10 | 150 | rises |
| capacity, power (× / floor) | 1.038 ±0.004 | 1.037 ±0.004 | fl 1–10 | 150 | rises |
| attrition, damage (× / floor) | 1.054 ±0.015 | 1.052 ±0.022 | fl 1–6 / fl 1–7 | 1500 | ≤ capacity |
| buffer (× / floor) | 0.869 ±0.021 | 0.922 ±0.019 | fl 1–6 / fl 1–7 | 1500 | ≥ 1.00 |
| challenge/power (× / floor) | 1.261 ±0.055 | 1.193 ±0.069 | fl 1–6 / fl 1–7 | 1500 | ≥ 1.15 |
| finishes, real bot | 31.3% ±3.8 (47/150) | 20.0% ±3.3 (30/150) | full descent | 150 | 15–40% |
| p95 / p99 per-turn dmg, real bot | 0 / 1 | 0 / 1 | pooled fl 1–10 | ~140k turns | spike should rise |
| reward | — | — | — | — | no instrument, see I6 |

**Capacity's `hpMax` is flat at 400 in both columns because `HP_FROM_KILLS`
is off for this reading** — there is no grant to accumulate. This is
correct, not a bug: it isolates M7 from M6 exactly as instructed, and it is
why `capacity (power)` still moves slightly (kills/xp alone) while `hpMax`
does not.

**Direct read against the acceptance criteria, M7 alone:**
- Challenge holds (1.337 vs 1.343 target) — reproduces the work agent's own
  1.337 ±0.029 exactly.
- CV reaches its target within noise (0.986, ±0.006 puts it about 1σ under
  1.00) — reproduces the work agent's own 0.986.
- `challenge/power` clears ≥1.15 in **both** arms (1.261 off, 1.193 on).
- Finishes stay inside 15–40% in both arms, but **M7 alone moves it by
  −11.3pp** (31.3% → 20.0%, z ≈ −2.25) — a real effect, not the "near the
  ~30% baseline" the review predicted once M6's reversal landed. Still
  inside the band; the size of the move was the surprise, not the verdict.
- **The mechanism is attrition, not spike.** p95/p99 of per-turn damage do
  not move (0/1 in both arms, no consistent per-level shift either) while
  finishes fall significantly. Grouping is raising lethality by exposure
  over more turns, not by a bigger single-turn hit — the branch the item's
  own spec called "a difficulty increase rather than a shape change,"
  confirmed rather than assumed.

**Conditions that change these numbers, and must be restated whenever they
do:**

- Capacity above (`capacity, hpMax`/`capacity, power` in the Objective 1
  table) is measured on `PROBE_HERO` at **400 hp**, so its growth rate is
  diluted by that base. **I7 (below) resolves this** with a second capacity
  reading at the mortal series' own base — do not compare the 400-hp
  capacity numbers above against `buffer`/`attrition` without accounting
  for that; use I7's same-base numbers for anything that needs the two
  series to actually subtract.
- `buffer`'s sign is window-dependent (I5) — quoted here only over each
  arm's own reliable window, not extrapolated past it.
- `finishes` and the per-turn percentiles are the **real bot**
  (`src/analysis/clustering.js`'s `botFinishesAndSpike`), not the probes —
  Sonda B does not survive full descents at all (measured 0/1500 and
  3/1500 in this same reading), so it cannot answer either question.

### I7 — capacity at the mortal series' own base

Measured at commit `8eb8c39` — **after M7 was adopted** (`DIFFICULTY_REBALANCED
= true` landed at `25f45a1`, mid-queue for this item). Everything below runs
against the current shipped default (M7 on), not the pre-adoption state; "M7
off" no longer describes anything shipped, so it is not reproduced here.
`HP_FROM_KILLS` is off (shipped default, unchanged). 150 runs each, full
ladder, `src/analysis/observed-ruler.js`.

Two series, same base (`PLAYER_HP`, no synthetic hero — `carry = null` on
floor 1, identical to what `builtShape` already does):
- **capacity** — death suppressed (`capacityShape({ suppressDeath: true,
  startHero: null })`), so every one of the 150 runs reaches all 10 floors.
  `hpMax` stays flat at `10` throughout, same reason it was flat at 400 in
  the old reading — no `HP_FROM_KILLS` grant to accumulate.
- **mortal** — `builtShape`, unchanged, dies for real. Reached-count
  collapses with depth exactly as before: 150 → 130 → 102 → 60 → 33 → 17 → 8
  → 4 → 2 → 0. No run reached floor 10 at all this sample.

| floor | capacity power | mortal power | gap (mortal − capacity) | z | reliable (n≥50 both) |
|---|---|---|---|---|---|
| 1 | 8.33 ±~0 | 8.33 ±~0 | 0 (identical start) | — | yes |
| 2 | 7.44 ±0.39 | 7.22 ±0.36 | −0.22 ±0.53 | −0.41 | yes |
| 3 | 6.40 ±0.48 | 7.92 ±0.53 | +1.52 ±0.72 | **2.12** | yes |
| 4 | 4.93 ±0.52 | 7.76 ±0.68 | +2.83 ±0.86 | **3.30** | yes |
| 5 | 4.31 ±0.53 | 9.26 ±1.24 | +4.95 ±1.35 | 3.68 | no — mortal n=33 |

**The selection effect, stated as a number:** not distinguishable from zero
at floor 2 (z = −0.41), then clears this project's own 2σ bar at floor 3
(z = 2.12) and is unambiguous by floor 4 (z = 3.30) — the last floor with
≥50 survivors on both sides. Floor 5's gap is larger still (+4.95) but its
mortal arm has only 33 survivors, below the `MIN_RELIABLE_N` this project
already uses elsewhere; shown as a footnote, not part of the headline.

Framed as a rate instead of a per-floor gap: over the same reliable window
(floors 1–4), capacity's power *shrinks* at ×0.842/floor (an unselected
population grinding down with no hp regen) while the mortal survivors' power
is flat at ×0.988/floor (survivorship replacing what attrition removes,
floor over floor). The ratio of the two rates — ×1.17/floor — is the pure
selection effect with the base confound removed. **This lands almost exactly
on I5's original ×1.19/floor estimate**, which mixed selection with base
dilution; the surprise here is that the dilution I7 set out to remove turns
out to have been a small contaminant of that number, not the dominant one.

**What this does not resolve:** capacity and attrition (the `damage` column
in `builtShape`) still cannot be compared to each other, even at a shared
base — attrition needs a hero that can actually die to mean anything, and a
suppressed-death hero has none. That subtraction was never what I7 promised;
it promised capacity vs. the mortal series' own power, which is now
delivered above.

**Optional, from M7 review 2 (not I7's own acceptance, done because it was
cheap):** per-turn damage p95/p99 conditioned on `adjacent ≥ 1` (a live
monster next to the player that turn), shipped default, 150 runs, same
seeds as the M7 reading (`firstSeed = 970000`). Pooled unconditioned stays
flat (p95 = 0, p99 = 1, n = 137,554 turns) — conditioning on combat presence
moves it to **p95 = 1, p99 = 3** on **n = 20,464** turns. Combat-adjacent
turns are about 15% of all turns played, and within just that slice the
spike is real, not flat. This does not answer whether M3 is still needed —
that call belongs to whoever reviews M3 — but it confirms the pooled 0/1
reported for M7 was walking-turn dilution, not evidence the hit distribution
itself is flat.

## Objective 2 — bot

Parked. Left here so the shape of the file does not have to change when the
lane restarts.

| quantity | value | ±SE | commit |
|---|---|---|---|
| reversal rate | 0.174 / 0.210 | — | `f9825aa` |
