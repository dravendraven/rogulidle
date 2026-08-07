# The observed ruler — baseline

> **This is the current valid baseline.** Every challenge number recorded
> before this document — the original modelled `campaignCost`, AND the
> crowd-corrected version of it in `docs/curve-shape.md` — is measured with
> a different ruler and is **not comparable** with anything below. Read
> those documents for history, not for numbers.

## Why the ruler changed again

`campaignCost` (`src/bot/duel.js`) sums clean one-on-one duels. That is the
right question for the bot ("which fight do I take now") and the wrong one
for "what does this floor cost" — creatures gang up and land blows the same
turn, and a sum cannot see that. A multiplicative crowd correction was
tried (`CROWD_COST_BASE × n^CROWD_COST_EXPONENT`, then an additive-overhead
refit) and neither fixes the deeper problem: the next design work is
**clustering** creatures on the map without changing how many there are,
and a correction built from the count alone is blind to that by
construction.

The fix is to stop pricing the floor with a formula and instead play it.
Two probes clear a floor for real; the difference between them, not a
formula, is the reward number, and the damage either one actually took is
the challenge number.

## The instrument

`src/analysis/observed-ruler.js` — a frozen file, no import from `src/bot/`,
never to be "the bot with options off." Full argument in its header comment.

**Sonda A** clears the whole floor and picks up nothing. **Sonda B** clears
the identical floor (same seed) and keeps whatever it steps over. Both run
the exact same movement policy — kill the nearest known monster, else
explore the nearest frontier tile, else head for the shrine — so loot is
never a target for either one and the only thing that differs is whether
stepping on an item's tile keeps it (`noPickup`, `src/sim/step.js`, off by
default). Both carry a fixed 400-hp hero so death never selects which
samples survive.

```
desafio (challenge)   = damage Sonda A actually took, floor cleared in isolation
recompensa (reward)   = challenge(A) − challenge(B), same seed
                         positive = the loot picked up along the way paid for itself
buffer                 = effectiveHp / mean blow of the floor, hero on arrival
poder (power)          = effectiveHp × expected damage, hero on arrival
```

Power and buffer come from a real ten-floor descent played by **Sonda B
only**, starting at the ordinary hero (not the tank), because they are
properties of the hero on arrival and only exist for a hero who actually
got there. Using the real bot for this would measure the bot, not the map,
and the real bot's deep-floor hero is already known to be survivor-selected
(power on floor 5: 2.25× stronger for those who go on to reach floor 9+,
z = 4.89 — see `docs/curve-shape.md`). Sonda B carries the same kind of
bias, worse if anything (see "Descent survival" below), and it is reported
honestly rather than corrected away.

### What this ruler cannot answer

Challenge and reward are read off real damage, so they already reflect
however the *current* map places creatures. They do **not** reflect what
would change if the *same count* of creatures were clustered differently.
Under clustering, cost and lethality diverge: scattered or grouped, the
same roster lands roughly the same total blows over a floor — what changes
is how concentrated those blows are in time. A 400-hp probe cannot feel
that concentration; a 10-hp hero can, because two blows in the same turn
kill and two blows ten turns apart do not. An earlier measurement asked
whether grouping changed cost, found no effect, and concluded clustering
does not matter — that conclusion almost certainly measured the wrong
quantity. **The map-clustering work needs its own instrument**: something
like peak damage taken in a single turn, or the fraction of turns spent
adjacent to two or more live monsters at once. Do not reach for this ruler
to answer that question.

## Baseline, measured

150 isolated-floor samples per level (Sonda A and Sonda B paired on the same
seed), 1500 descents for power/buffer (Sonda B only), seed base 800000,
max 4000 turns per floor. `run-ruler.html`.

```
fl  creatures  challenge      reward        power      buffer    CV chal   CV rew    n    reached
 1    2.0      2.12 ±0.21   0.05 ±0.03    8.3 ±0.0   14.7 ±0.1   1.203     7.955    149    1500
 2    3.0      3.14 ±0.23   0.07 ±0.04    6.7 ±0.1   10.7 ±0.1   0.880     7.047    148    1361
 3    3.0      3.61 ±0.24   0.03 ±0.02    6.0 ±0.1    8.2 ±0.2   0.797     9.598    148     893
 4    4.0      5.44 ±0.34   0.01 ±0.04    6.2 ±0.2    7.5 ±0.2   0.757    36.607    148     465
 5    6.0      7.76 ±0.46   0.03 ±0.02    7.6 ±0.4    7.1 ±0.3   0.711     7.230    147     175
 6    7.0      9.29 ±0.53   0.12 ±0.09    8.9 ±0.9    6.4 ±0.6   0.684     9.649    146      53
 7   10.0     13.45 ±0.67   0.09 ±0.08   10.4 ±1.5    6.6 ±1.0   0.602    10.295    146      14
 8   13.0     18.44 ±0.95   0.09 ±0.16    7.6 ±2.8    5.3 ±2.3   0.615    20.648    142       6
 9   16.0     21.77 ±1.18   0.52 ±0.21    8.1 ±6.5    3.1 ±2.0   0.644     4.836    142       2
10   21.0     30.59 ±1.75   0.32 ±0.21       —           —      0.664     7.668    135       0
```

`n` is isolated-floor pairs where BOTH probes fully cleared (49 discarded
across the whole ladder out of 3000 attempted pairs — 1.6%, all from the
max-turn cap, not death). `reached` is how many of the 1500 descents got
that deep at all; see "Descent survival" below before reading floors 7–10.

### Growth per floor

Challenge, reward and their CVs are fit log-linearly over the whole ladder —
`isolatedShape` carries n ≥ 135 at every level, so every point pulls its
weight evenly. Power and buffer are different: they come from descent
survival, which collapses fast (see "Descent survival" below — n ≥ 53
through floor 6, then 14, 6, 2, 0). A log-linear fit takes its leverage from
the endpoints, so fitting it over all 9 reached floors lets the n=2 and n=6
points swing the slope. **Power and buffer are therefore fit over floors
1–6 only, and that is the headline number** — the full-ladder fit is kept
below it as a footnote, not as a second estimate to average against.

```
quantity              × per floor      over its window
challenge             1.343 ±0.009     ×14.2  (floors 1–10)
reward (abs)          1.310 ±0.113     ×11.3  (floors 1–10)
power   (floors 1–6)  1.022 ±0.042     × 1.11 (floors 1–6)
buffer  (floors 1–6)  0.855 ±0.023     × 0.46 (floors 1–6)
CV challenge          0.944 ±0.012     × 0.6  (floors 1–10)
CV reward             0.984 ±0.067     × 0.9  (floors 1–10)
```

**Buffer falls. It is not flat.** Over its reliable window the hero ends
floor 6 absorbing under half the blows it could absorb on floor 1 — and the
raw floor-1-to-6 ratio (6.4 / 14.7 = 0.44) agrees with the fitted rate. This
is a finding, not a rounding note: read `docs/backlog.md`'s "The problem all
of this serves" for why it reorders the map-design queue.

Footnote — fit over all 9 reached floors (1–9, floor 10 has zero survivors):
`power 1.029 ±0.022` (×1.3 over the 9), `buffer 0.862 ±0.018` (×0.3 over the
9). Close to the floors-1–6 numbers here, which is worth knowing — the thin
tail did not secretly reverse the trend this time — but that agreement is
not guaranteed in general, and the 1–6 fit is what should be quoted first.

Reward's growth is fitted on `|reward|` — a log-linear fit needs positive
values — with the sign (always positive here) reported separately above.

### The four ratios

```
                    fl1    fl5    fl9    × per floor
challenge / power   0.25   1.02   2.68   1.307
reward / challenge  0.02   0.00   0.02   0.975
challenge / buffer  0.14   1.09   7.03   1.560
CV challenge        1.20   0.71   0.64   0.944
```

- **challenge / power → 1.307.** Same qualitative shape as the old modelled
  ruler: the average fight gets harder faster than the calibration hero's
  own output grows.
- **reward / challenge → 0.975 (flat, and small — 1–2%).** Under a policy
  that never seeks loot on purpose, incidental pickup barely dents the
  bill. This lines up with `bot-strategy.md` §1's own accounting (a chest
  is worth "a fraction of an item" in expectation) — passive collection is
  close to free but also close to worthless; the bot's deliberate detours
  are doing the real work, and this ruler cannot see those because Sonda B
  never detours either.
- **challenge / buffer → 1.560.** A mistake gets more expensive over the
  descent — and not only because challenge rises: buffer itself **falls**
  (×0.855/floor over its reliable floors 1–6 window, see above), so this
  ratio is being pushed from both sides at once.
- **CV challenge → 0.944 (falls).** Same direction as the modelled ruler:
  deep floors are more predictable, not less.

### Descent survival (Sonda B)

```
floor        1      2      3      4      5      6      7      8      9     10
reached   1500   1361    893    465    175     53     14      6      2      0
survival   100%   91%    60%    31%    12%    3.5%   0.9%   0.4%   0.1%     0%
```

Zero of 1500 descents reached floor 10. This is expected and correct for
what Sonda B is — a deliberately dumb, danger-blind clearer, not an
athlete — but it means **power and buffer are only fit over floors 1–6**
(n ≥ 53). Floors 7–10 (n = 14, 6, 2, 0) are printed in the series table for
completeness, not used in the headline growth rate. Raising the descent
count further would not fix this cheaply: going from 1500 to tens of
thousands of runs would still leave floor 10 in single digits, because the
survival curve itself is the finding, not a sampling shortfall.

## What changed in this session, for the record

The instrument's `recompensa` was first written as `challenge(B) −
challenge(A)`, which is backwards: B is better equipped, so it clears for
*less*, and the difference comes out negative under that ordering. Fixed to
`challenge(A) − challenge(B)` before any number above was taken, so
positive reward reads as "loot paid for itself," matching intuition.
