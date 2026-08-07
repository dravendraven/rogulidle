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

| quantity | value | ±SE | window | n | commit | target |
|---|---|---|---|---|---|---|
| challenge | 1.343 | 0.009 | fl 1–10 | 150 pairs/level | `b13df5f` | hold ±0.03 |
| CV challenge | 0.941 | 0.014 | fl 1–10 | 150 pairs/level | `b13df5f` | ≥ 1.00 |
| capacity (hpMax) | 1.008 | 0.001 | fl 1–10 | 150 | `b17128b` | rises |
| capacity (power) | 1.048 | 0.003 | fl 1–10 | 150 | `b17128b` | rises |
| attrition (damage) | 1.172 | 0.009 | fl 1–10 | 1500 | `b17128b` | ≤ capacity |
| challenge/power | 1.386 | 0.063 | fl 1–5 | 800 | `b13df5f` | ≥ 1.15 |
| finishes | 30.7% | 3.8 | full descent | 150 | `b13df5f` | 15–40% |
| reward | — | — | — | — | — | no instrument, see I6 |

**Conditions that change these numbers, and must be restated whenever they
do:**

- `HP_FROM_KILLS` is **off**. The capacity and attrition rows above were
  taken with it **on** (`b17128b`), which is also why every floor cleared
  n ≥ 50 there. With it off the reliable window shrinks to roughly fl 1–6.
  These rows need re-taking against the shipped default.
- Capacity is measured on `PROBE_HERO` at **400 hp**, so its growth rate is
  diluted by that base — the same grant reads about ×1.20 per floor on a
  real hero's 10. See I7. Do not compare capacity against attrition until
  they share a base.
- `buffer` is deliberately absent. Its sign flips between fl 1–6 and
  fl 1–10, and I5 showed the flip is survivor selection. Quote it only with
  its window, from the item that measured it.

## Objective 2 — bot

Parked. Left here so the shape of the file does not have to change when the
lane restarts.

| quantity | value | ±SE | commit |
|---|---|---|---|
| reversal rate | 0.174 / 0.210 | — | `f9825aa` |
