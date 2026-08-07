# The shape of the curve — measured

> ⚠️ **PRE-CHANGE. The ruler moved after this was measured.** Every
> challenge figure here — the series, the growth rates, and the
> challenge/power and challenge/buffer ratios — used `campaignCost` WITHOUT
> the crowd correction (balance.md, "Crowd correction"). That model
> under-priced crowds by 1.4x to 1.9x, and by an amount that grew with the
> creature count. **Do not compare a new measurement against these numbers.**
> Re-run `run-shape.html` to get a current set. Reward, power and buffer are
> unaffected; only challenge and the two ratios built on it moved.

Diagnostic, not tuning. Nothing here changes a balance value. Produced by
`run-shape.html` / `src/analysis/shape.js`; re-run it rather than trusting the
numbers below, which are a snapshot.

Measured with 250 generated floors per level, 100 descents, confirmed on a
separate seed base.

## Why this is two measurements and not one

**Challenge and reward are properties of the floor as generated.** They do not
depend on who walks in, so they are measured on floors generated *directly* —
250 floor tens, never mind whether any hero got there. **Survivor bias is zero
by construction**, not by correction, and floor 10 has exactly the same sample
size as floor 1.

**Power and buffer are properties of the hero on arrival.** They only exist for
heroes who got that deep, so the bias is intrinsic and cannot be removed — the
hero on floor 10 *is* a survivor. It can be measured, and it was: see below.

## The definitions, and why each one

| | Definition | Why not the obvious alternative |
|---|---|---|
| **Challenge** | `campaignCost(fixed hero, roster)` — hp a reference hero expects to lose clearing the floor | Not threat mass `Σ hp(xp−1)`: that is a *proxy* difficulty.js introduces as tracking cost "almost exactly", while this **is** the cost, running the engine's own duel maths. It also comes out in hp, so it divides into reward and buffer; threat mass is in hp·xp and divides into nothing. The hero is **fixed**, because using the arriving hero would make a floor cheaper merely because the hero got stronger — folding power into challenge and making challenge/power circular. |
| **Power** | `effectiveHp × expectedDamage` | Offence and survivability together, as asked. A hero survives `effectiveHp / theirBlow` turns and deals `myBlow` each, so output is proportional to the product — no free parameter. Unit is hp², meaningless alone, which is fine because only its growth *rate* is read. |
| **Reward** | Σ hp value of every item the floor **contains** — chests and creature drops | Contains, **not collects**: what the bot picks up is a fact about the bot and about how long it lived. Each item type is valued **once** against a fixed 20-creature workload, so the same axe is worth the same on floor 2 and floor 9 — valuing a weapon against its own floor would make reward rise just because the floor got bigger, which is exactly the correlation reward/challenge exists to detect. |
| **Buffer** | `effectiveHp / mean blow of this floor` — blows survived | Not raw hp. An error is measured in blows taken: ten hp is a lot against bats and nothing against a dragon. Counting blows is dimensionless, comparable between floors, and falls correctly whether the hero got weaker *or* the floor got nastier. |
| **CVs** | `sd / mean` per floor | Not raw variance, which grows when the mean grows and would make every deep floor look random purely for being bigger. |

Growth is fitted **log-linearly over the whole ladder**, not taken pairwise: a
ratio between two adjacent floors is a ratio of two noisy numbers and is
noisier than either. Exponentiating the slope gives "× per floor", which is
dimensionless — the only way to compare quantities in different units.

## The series

```
fl  creatures  challenge      reward       power     buffer   CV chal   CV rew   reached
 1    2.0      1.19 ±0.06   22.60 ±1.23   8.3 ±0.0  14.1±0.5  0.807     0.860      100
 2    3.0      1.87 ±0.08   22.15 ±1.28  11.9 ±0.7  12.7±0.6  0.704     0.916       97
 3    3.0      1.89 ±0.08   22.42 ±1.34  17.2 ±1.3  14.5±1.1  0.698     0.943       84
 4    3.9      2.81 ±0.12   23.98 ±1.42  25.8 ±2.0  14.8±0.7  0.652     0.939       74
 5    5.9      4.26 ±0.14   24.84 ±1.42  31.0 ±2.7  13.4±0.8  0.531     0.903       67
 6    7.0      4.87 ±0.17   21.92 ±1.13  38.4 ±3.2  14.6±0.9  0.542     0.814       60
 7   10.0      6.99 ±0.23   24.60 ±1.35  50.1 ±3.9  16.5±0.7  0.528     0.871       53
 8   13.0      9.40 ±0.29   28.10 ±1.37  53.3 ±4.9  16.1±1.1  0.494     0.769       48
 9   16.0     11.26 ±0.37   29.32 ±1.43  55.9 ±5.2  14.8±0.8  0.524     0.769       41
10   21.7     14.72 ±0.48   29.07 ±1.25  55.1 ±4.3  14.2±0.7  0.517     0.682       38
```

## Growth per floor

```
quantity        × per floor      over 10 floors
challenge       1.322 ±0.013     ×12.3
power           1.242 ±0.029     × 7.0     <- upper bound, see selection
reward          1.033 ±0.007     × 1.3
buffer          1.012 ±0.008     × 1.1
CV challenge    0.950 ±0.008     × 0.6
CV reward       0.972 ±0.007     × 0.8
```

Confirmed on a separate seed base: challenge 1.322 vs 1.309, reward 1.033 vs
1.040, CV challenge 0.950 vs 0.961, CV reward 0.972 vs 0.974. All four inside
their error bands.

## The four ratios

```
                    fl1    fl5    fl10   × per floor
challenge / power   0.14   0.14   0.27   1.065
reward / challenge 18.99   5.83   1.97   0.781
challenge / buffer  0.08   0.32   1.03   1.306
CV challenge        0.81   0.53   0.52   0.950
```

- **challenge / power → 1.065.** The average fight gets *slightly* harder;
  power very nearly keeps up with the floors.
- **reward / challenge → 0.781.** Descending pays about ten times less at the
  bottom than at the top, though it still pays.
- **challenge / buffer → 1.306.** A mistake gets thirteen times more expensive
  over the descent. This is the sharpest number in the whole report.
- **CV challenge → 0.950.** The game gets *less* random the deeper it goes.

## Survivor bias, measured

Every hero standing on floor 5, split by how deep they eventually got:

```
power on floor 5    39.5  for the 41 who reached floor 9+
                    17.6  for the 26 who did not
                    ratio 2.25x, z = 4.89
```

Far past 2 sigma. Heroes who reach the bottom were **already 2.25× stronger at
floor 5** — so the power column is not purely "heroes get stronger", it is
partly "weak heroes were removed". **The 1.242 power growth is an upper bound**
and the true progression rate is lower, which makes challenge/power worse than
it looks, not better.

Challenge and reward carry none of this.

## What the shape actually is

**The dungeon is a treadmill with a fraying safety net.**

Challenge compounds at 1.32×; power at *at most* 1.24× and really less. Those
are close, so the average fight stays roughly as winnable as it was — the
difficulty ramp is doing its job.

**But buffer is flat: 1.012× per floor, ×1.1 over the whole descent.** The hero
ends the run absorbing the same fourteen blows they absorbed at the start,
against floors costing twelve times as much. All the progression is
*offensive*. Look at the item values:

```
dagger 18.90    axe 31.50    shield 3.00    potion 3.00
```

A weapon is worth six to ten times a defensive item, so gear makes the hero
kill faster without making them harder to kill. The hero out-damages the
dungeon and never out-lives it.

**Reward is flat in absolute terms** (1.033×) because chests are fixed at 6 per
floor. That is deliberate — balance.md argues flat chests are what makes threat
outpace supply — but it means floor 10 hands over the same six chests as floor
1 for twelve times the danger.

### Where it differs from what you would expect

1. **A deep floor should be the most volatile thing in the game. It is the
   least.** Both CVs *fall*: challenge 0.81 → 0.52, reward 0.86 → 0.68. The
   climax of a run is its most predictable moment. (The floor-spread work
   already stopped challenge CV falling further — before it, floor 10 read
   0.306.)

2. **Reward is more random than challenge at every depth** (CV 0.68–0.94
   against 0.49–0.81), which is not obviously wrong but is worth knowing: what
   a floor *pays* is the least predictable thing about it.

3. **Buffer does not grow at all**, which is the finding that matters. Every
   other quantity moves; this one does not. A game where challenge grows 12×
   and error-tolerance grows 1.1× converts small mistakes into deaths at an
   accelerating rate, and that acceleration — not the difficulty ramp — is what
   ends most runs.

Nothing here was changed. These are the numbers as they stand.
