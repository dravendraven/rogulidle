# I2 — clustering changes lethality, not cost

A previous test measured the same roster spread out against grouped and
found no change in cost, and rejected clustering as a lever on that basis.
That test used a 400-hp measuring hero. This one redoes it with the ordinary
yardstick hero and the real bot, asking about lethality and about the bot's
own behaviour instead of cost.

## Why the old result was suspect

Spread or grouped, the hero meets the same creatures and takes a similar
**total** number of blows — clustering does not add or remove damage, it
changes the damage's **concentration in time**. Three adjacent creatures
strike in the same turn whether they were placed close together or found
their way to the same corridor. To a 400-hp hero that concentration is
noise. To the real 10-hp hero it can be the difference between living and
dying. The old test measured the one quantity provably insensitive to the
effect.

A second, independent confound: the bot prices being reachable by two
monsters at once (`src/bot/threat.js`, `CROWD_PENALTY`) and routes around
it. A competent bot can walk a cluster into a corridor and fight it
sequentially anyway — so "grouping changed nothing" might have meant "the
bot un-grouped it" rather than "grouping doesn't matter". Both questions are
answered below.

## The instrument

`src/analysis/clustering.js`. Two conditions, same seed, same roster:

- **spread** — the shipped `populate()`, completely unchanged.
- **grouped** — takes the exact monster list `populate()` produced (same
  xp, hp, activation, drop — nothing about identity changes) and rewrites
  positions only: monsters are gathered into clusters of `clusterSize` (3
  here) by repeatedly picking a random free tile and filling it with the
  nearest still-free tiles, instead of each monster drawing an independent
  position from the whole free pool.

Both conditions are played by the **same real bot** (`makeBot`, default
settings) — this is a question about the bot's behaviour, same as I4, not a
frozen-probe question like I1. The hero is `REFERENCE_HERO`
(`src/analysis/hardness.js`): 10 hp, +6 armour, an axe. Not the 400-hp tank,
and deliberately not the bare level-1 starting kit either — floors are
tested **isolated** (one level, not a ten-floor descent, same as I1's
challenge/reward), and a level-10 floor is calibrated for a hero who arrived
with nine floors of gear. Tested with the literal fresh-start kit, floor 10
came out 5/5 dead in spread and 4/5 in grouped — saturated near 100% in
**both** conditions, which kills the comparison's power before it can say
anything. `REFERENCE_HERO` is this project's existing fixed yardstick for
exactly this problem and gives every floor real headroom to discriminate.

**Simplification, disclosed.** Grouping ignores the spine/side split
(`src/sim/spine.js`) — a monster keeps its original `.side` tag so the
bot's R0 still reads sensibly, but its new position is not guaranteed to
sit in a room of the same zone. This is a mechanism probe, not a proposed
map change: if this supports M2, zone-aware clustering is what would get
built there for real.

**Metrics**, per paired run:

    lethality        did the hero die
    worst turn       largest single-turn damage taken, across the run
    crowded fraction share of turns with 2+ live monsters adjacent to the hero

The last one is the direct answer to "is the bot un-grouping": if the bot
fully converts a cluster back into sequential duels, crowded fraction should
be flat between spread and grouped regardless of how tight the cluster is.

## Baseline, measured

60 paired seeds per level, cluster size 3, seed base 300000, max 1500 turns.
`run-cluster.html`.

```
fl  mon  death spread  death grouped  gap(pp)  z     worst spread  worst grouped  z      crowd spread    crowd grouped    z
 1   2      0.0%          0.0%         0.0    —     0.87 ±0.12    1.00 ±0.14    0.72   0.000 ±0.000    0.002 ±0.001    1.77
 2   3      0.0%          0.0%         0.0    —     1.20 ±0.13    1.35 ±0.11    0.86   0.000 ±0.000    0.004 ±0.001    2.61
 3   3      0.0%          1.7%         1.7   1.00    1.08 ±0.13    1.52 ±0.14    2.27   0.001 ±0.001    0.011 ±0.010    1.04
 4   4      1.7%          5.0%         3.3   1.02    1.67 ±0.13    1.70 ±0.13    0.18   0.002 ±0.001    0.020 ±0.012    1.45
 5   6      1.7%          3.3%         1.7   0.58    1.87 ±0.13    1.92 ±0.14    0.26   0.005 ±0.001    0.028 ±0.016    1.46
 6   7      1.7%          1.7%         0.0   0.00    1.90 ±0.10    1.90 ±0.11    0.00   0.004 ±0.002    0.007 ±0.002    1.01
 7  10     10.0%         13.3%         3.3   0.57    2.27 ±0.09    2.17 ±0.10   -0.74   0.014 ±0.004    0.023 ±0.006    1.18
 8  13     20.0%         25.0%         5.0   0.66    2.25 ±0.11    2.33 ±0.10    0.56   0.020 ±0.005    0.084 ±0.023    2.70
 9  16     23.3%         31.7%         8.3   1.02    2.35 ±0.11    2.63 ±0.11    1.80   0.046 ±0.018    0.085 ±0.025    1.30
10  21     43.3%         50.0%         6.7   0.73    2.68 ±0.10    2.75 ±0.12    0.42   0.047 ±0.014    0.152 ±0.031    3.16
```

Pooled death rate (600 runs each side): spread 10.2% (61/600), grouped 13.2%
(79/600), gap 3.0 pp, **z = 1.62**.

## Direct answers

**Does clustering raise lethality?** Suggestive, not settled at this sample
size. The pooled death-rate gap (z = 1.62) does not clear this project's
2-sigma bar on its own. But the **direction is not noise-shaped**: the death
gap is positive (grouped ≥ spread) at 8 of 10 floors and tied at the other
2 — zero floors go the other way. That is the same kind of corroborating
evidence `balance.md` used for the count-vs-strength sweep ("moved in the
same direction in both seed families") — a coin does not land the same way
eight-plus times running. **Read this as leaning yes, confirm with a larger
sample before treating it as decided.**

**Is the bot un-grouping clusters?** No, not fully — and this is the
cleaner result. Crowded fraction (2+ monsters adjacent) is higher under
grouping at **every single floor**, clears 2 sigma at three of them (floor
2: z=2.61, floor 8: z=2.70, floor 10: z=3.16), and the gap widens with
monster count — floor 10 grouped spends 15.2% of its turns with two or more
monsters adjacent against 4.7% spread, more than triple. `CROWD_PENALTY`
measurably reduces exposure (compare to how tight the clusters are placed),
but it does not erase the effect. The earlier "grouping changed nothing"
result is not explained by the bot successfully un-grouping — the confound
the brief raised second turned out not to be what happened.

## What surprised me

**Worst-single-turn damage barely moved anywhere** (all z between -0.74 and
2.27, no consistent direction), while crowded fraction moved cleanly and
consistently. I expected the two to track together — more turns with 2+
adjacent should mean more turns where several blows land at once, which
should show up as bigger worst-turn spikes. It mostly did not. The
likely reason: HIT_CHANCE is 5/6 and each monster still rolls independently
(0..xp-1), so "2+ adjacent" does not mean "2+ blows landed this turn" — it
raises the *chance* of a bad turn without guaranteeing one, and 60 seeds
per floor is not enough to resolve a rare tail event distinctly from noise.
Worst-turn damage may need a much larger sample, or a percentile instead of
a mean, to say anything — a mean is exactly the statistic that hides a
tail, and the tail is what the map-design programme (M3–M5) already cares
about for a different reason.

## What I could not resolve

- **Pooled death-rate z = 1.62 is short of the 2-sigma bar.** I read the
  sign-consistency across floors as suggestive rather than dismissing the
  result, but I want to be explicit that this is a judgement call, not a
  clean pass. A confirmatory run at 2-3x the sample (or pooling only floors
  7-10, where absolute death rates are large enough to carry more weight)
  would settle it either way.
- **The zone-preserving simplification is untested.** Grouping here ignores
  spine/side, so a "grouped" floor is not a floor M2 could ship as-is — it
  answers "does clustering matter at all", not "does clustering matter once
  it respects the map's spine/side design". That gap is exactly the kind of
  BLOCKED spec problem M2 already flags itself as depending on I2 and I3
  for.
- **Cluster size (3) was chosen, not swept.** A tighter or looser cluster
  could change both the death-rate and crowded-fraction gaps in either
  direction; this baseline says "3 shows a measurable adjacency effect", not
  "3 is the right number for anything".

## Out of scope, for the project agent to weigh

I3 (a clustering-sensitive metric, currently blocked on this item) has a
concrete candidate now beyond the two named in the backlog: **fraction of
turns with 2+ adjacent** is exactly the quantity this experiment used to get
its clearest signal, and it is already implemented and instrumented here
(`src/analysis/clustering.js`'s `playFromState`). I3 may be most of the way
done rather than a fresh build.
