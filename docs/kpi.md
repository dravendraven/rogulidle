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

**Current shipped state: `HP_FROM_KILLS = false`, `DIFFICULTY_REBALANCED =
false` (M7 built, not adopted).** Every row below was taken at commit
`f42f085` with `HP_FROM_KILLS` forced **false on both arms** of the M7
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

- Capacity is measured on `PROBE_HERO` at **400 hp**, so its growth rate is
  diluted by that base — see I7, next in the queue, unresolved.
- `buffer`'s sign is window-dependent (I5) — quoted here only over each
  arm's own reliable window, not extrapolated past it.
- `finishes` and the per-turn percentiles are the **real bot**
  (`src/analysis/clustering.js`'s `botFinishesAndSpike`), not the probes —
  Sonda B does not survive full descents at all (measured 0/1500 and
  3/1500 in this same reading), so it cannot answer either question.

## Objective 2 — bot

Parked. Left here so the shape of the file does not have to change when the
lane restarts.

| quantity | value | ±SE | commit |
|---|---|---|---|
| reversal rate | 0.174 / 0.210 | — | `f9825aa` |
