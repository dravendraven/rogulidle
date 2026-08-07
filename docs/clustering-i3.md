# I3 — sign test on I2's death-rate gap

> **Scope note.** I3 was cut back to this one question after it was written:
> the metrics agent measures the real game and does not build variants to
> study it. Questions 2 (spike vs attrition) and 3 (CV under clustering)
> need clustering to exist in `src/sim/`, so they wait for M2 to build it,
> switched off by default, and get measured on against off. This document
> covers question 1 only.

## What this is, precisely

A re-analysis of a table I2 already published — no new floor is generated,
no new game is played, nothing in `src/sim/` runs. It is math over numbers
already on record, which is why it stays a metrics-agent task when building
a clustering variant to answer the other two questions is not.

**What it settles.** The sign of the death-rate gap `clusterExperiment`'s
`toGrouped()` produced in I2 — the instrument's definition of "grouped"
(post-processing repositioning, cluster size 3, spine/side ignored).

**What it does not settle.** Anything about clustering as `src/sim/` will
generate it once M2 builds it. Read this as a direction for M2's design,
not a verdict on M2.

## The test

Source: `docs/clustering-i2.md`'s per-floor death-rate table (60 paired
seeds/level). `src/analysis/clustering.js`'s `signTest`, run via
`run-i3.html`.

```
floor  death spread  death grouped  sign
 1        0.0%          0.0%         0
 2        0.0%          0.0%         0
 3        0.0%          1.7%         +
 4        1.7%          5.0%         +
 5        1.7%          3.3%         +
 6        1.7%          1.7%         0
 7       10.0%         13.3%         +
 8       20.0%         25.0%         +
 9       23.3%         31.7%         +
10       43.3%         50.0%         +
```

**7 positive, 3 tied, 0 reversed.** Two-sided exact sign test on the 7
decided floors: **p = 0.0156**.

## Correction to the record

The I2 review that proposed this test stated **"8 positive, 2 tied"** and
computed p ≈ 0.008 from that count. Recounting the published table by hand,
floor 6 is also tied (1.7% = 1.7%), not positive — the correct split is
**7 positive, 3 tied**, giving **p = 0.0156**, not 0.008.

The conclusion is unchanged: 0.0156 clears the conventional 0.05 threshold
and is equivalent to roughly z ≈ 2.42 on a two-tailed normal test, which
also clears this project's 2-sigma bar — a coin does not land the same way
seven times running. But the number itself was wrong in the review, and is
corrected here rather than carried forward silently. (Independence of the
per-floor runs, which the sign test requires, holds by construction: each
floor's initial state comes from `newGame(hashSeeds(firstSeed + i, level),
plan)`, a freshly generated state with its own rng streams, sharing no
mutable state with any other floor's playthrough — see `src/sim/game.js`'s
`makeStreams`, built for exactly this decorrelation. No empirical check was
run beyond this architectural argument, same as this project does not
empirically re-verify its map/spawn/combat stream independence elsewhere.)

## Direct answer

**Settled, with the scope caveat above.** The death-rate direction found in
I2 (grouped costlier than spread) is real at the instrument's definition of
clustering — p = 0.0156, not the noise the pooled z = 1.62 alone made it
look like. It does not need a bigger sample or a floor-7-10 pooling fallback
per the item's own contingency plan, because the sign test already clears
significance on the existing data.

## What surprised me

Re-deriving the review's own arithmetic and getting a different, still-
significant number. Worth flagging as a small process point: a sign-count
this small (10 rows) is easy to miscount by eye once, and cheap to recount —
the fix cost one pass over a ten-row table.

## What I could not resolve

Nothing new — everything else about this finding (cluster size fixed at 3,
spine/side ignored, instrument-not-engine clustering) was already disclosed
in I2 and carries forward unchanged.
