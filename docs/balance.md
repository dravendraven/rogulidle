# Balance

**Every tunable number, and the only place their current values are
written.** Generated against the code — if a value here disagrees with
`src/sim/`, the code is right and this table is stale; fix the table.

**Prose below this table does not restate values.** It explains why a dial
exists, what was measured, and what was tried and rejected. Numbers inside
that prose are the numbers *as they were when the argument was made*, and
several are already historical — they are the record of a decision, not a
statement about today. Only this table is current.

| dial | value | file |
|---|---|---|
| `BOT_KNOWS_MONSTER_COUNT` | `true` | balance.js |
| `CHESTS_PER_FLOOR` | `6` | difficulty.js |
| `CHEST_COUNT` | `15` | balance.js |
| `CHEST_DIFFICULTY_SCALE` | `0.9` | balance.js |
| `CHEST_GUARD_RADIUS` | `8` | balance.js |
| `CHEST_LOOT_CHANCE` | `0.60` | balance.js |
| `CHEST_LOOT_RICHER_FAR` | `true` | balance.js |
| `CHEST_QUALITY_BY_DEPTH` | `true` | balance.js |
| `CHEST_TABLE` | `(table — see the file)` | balance.js |
| `CLEAR_DIST` | `7` | balance.js |
| `CLUSTER_SIZE` | `10` | difficulty.js |
| `CORRIDOR_LENGTH` | `[1, 3]` | balance.js |
| `CROWD_COST_OVERHEAD` | `0.75` | balance.js |
| `CROWD_PENALTY` | `6` | balance.js |
| `DANGER_FALLOFF` | `0.5` | balance.js |
| `DEFAULT_MODEL` | `(table — see the file)` | difficulty.js |
| `DIAL_MAX_LEVEL` | `9` | difficulty.js |
| `DIFFICULTY_REBALANCED` | `true` | difficulty.js |
| `DROP_CHANCE` | `0.5` | difficulty.js |
| `DUEL_SAFETY_MARGIN` | `0.7` | balance.js |
| `EARLY_CHEST_QUALITY_BOOST` | `0.5` | balance.js |
| `EXPOSURE_WEIGHT` | `0.5` | balance.js |
| `FLOOR_SPREAD_BASE` | `0` | balance.js |
| `FLOOR_SPREAD_CAP` | `0.9` | balance.js |
| `FLOOR_SPREAD_PER_LEVEL` | `0.09` | balance.js |
| `FRONTIER_REVEAL_WEIGHT` | `0.00002` | balance.js |
| `GOAL_STICKINESS` | `1.4` | balance.js |
| `GUARANTEE_FIRST_WEAPON` | `false` | balance.js |
| `HIT_CHANCE` | `5 / 6` | balance.js |
| `HOLD_RANGE` | `5` | balance.js |
| `HP_FROM_KILLS` | `false` | balance.js |
| `HP_GRANT_AMOUNT` | `1` | balance.js |
| `HP_GRANT_PER_KILLS` | `2` | balance.js |
| `ITEM_TABLE` | `(table — see the file)` | balance.js |
| `KILLS_PER_XP` | `2` | balance.js |
| `LOOT_CAMPAIGN_HORIZON` | `0.5` | balance.js |
| `MAP_DUG_PERCENTAGE` | `0.15` | balance.js |
| `MAP_SIZE` | `32` | balance.js |
| `MIN_ROSTER_FOR_SIDE` | `4` | balance.js |
| `MONSTERS_ATTACK_WHEN_ADJACENT` | `false` | balance.js |
| `MONSTERS_BASE` | `4` | difficulty.js |
| `MONSTER_COUNT` | `5` | balance.js |
| `MONSTER_DIFFICULTY_SCALE` | `0.75` | balance.js |
| `MONSTER_DROP_CHANCE` | `0.50` | balance.js |
| `MONSTER_GROWTH` | `1.3` | difficulty.js |
| `MONSTER_GROWTH_REBALANCED` | `1.0801` | difficulty.js |
| `MONSTER_SKIP_CHANCE` | `0.10` | balance.js |
| `MONSTER_STRENGTH` | `0.26` | difficulty.js |
| `MONSTER_TABLE` | `(table — see the file)` | balance.js |
| `MONSTER_WEIGHTS` | `(table — see the file)` | balance.js |
| `OUT_OF_DEPTH_CHANCE_BASE` | `0` | balance.js |
| `OUT_OF_DEPTH_CHANCE_CAP` | `0.15` | balance.js |
| `OUT_OF_DEPTH_CHANCE_PER_LEVEL` | `0.02` | balance.js |
| `OUT_OF_DEPTH_TAIL` | `true` | balance.js |
| `PLAYER_HP` | `10` | balance.js |
| `PLAYER_XP` | `3` | balance.js |
| `POTION_HEAL` | `3` | balance.js |
| `POTION_SCARCITY` | `3` | difficulty.js |
| `REVERSAL_PENALTY` | `6` | balance.js |
| `ROOM_HEIGHT` | `[4, 7]` | balance.js |
| `ROOM_WIDTH` | `[5, 9]` | balance.js |
| `SCARCITY` | `3` | difficulty.js |
| `SHRINE_DISTANCE_SHARE` | `0.65` | balance.js |
| `SIDE_ACTIVATION_CAP` | `99` | balance.js |
| `SIDE_CHEST_BIAS` | `3` | balance.js |
| `SIDE_ROOM_DEPTH_BONUS` | `0.35` | balance.js |
| `SPINE_THREAT_SHARE` | `0.7` | balance.js |
| `STEP_COST_IN_HP` | `0.01` | balance.js |
| `STRENGTH_GROWTH` | `1.0` | difficulty.js |
| `STRENGTH_GROWTH_REBALANCED` | `1.1452` | difficulty.js |
| `TACTICAL_DEPTH` | `1` | balance.js |
| `TACTICAL_OVERRIDE_MARGIN` | `0.5` | balance.js |
| `TACTICAL_RANGE` | `4` | balance.js |
| `TIER_CEILING_SHARE_BASE` | `0` | balance.js |
| `TIER_CEILING_SHARE_CAP` | `0.5` | balance.js |
| `TIER_CEILING_SHARE_PER_LEVEL` | `0.08` | balance.js |
| `TIER_FLOOR_SHARE_BASE` | `0` | balance.js |
| `TIER_FLOOR_SHARE_CAP` | `0.5` | balance.js |
| `TIER_FLOOR_SHARE_PER_LEVEL` | `0.08` | balance.js |
| `UNKNOWN_MONSTER_ESTIMATE` | `{ xp: 4, hp: 7 }` | balance.js |
| `VISIBLE_DIST` | `9` | balance.js |
| `WEAPONS_WIDEN_ROLL` | `true` | balance.js |
| `WEAPON_AXE_MIN_TIER` | `4` | balance.js |
| `WEAPON_SCARCITY` | `4` | difficulty.js |
| `XP_FROM_KILLS` | `false` | balance.js |

Values marked FAITHFUL in the prose below are copied from the original
Rogule source and should not change without a reason; deliberate divergences
are recorded in `docs/rogule-spec.md` §13.

---

## The whole difficulty model, in three constants

There is no calibration table any more. A floor is described by how many
creatures it holds, and everything else is a constant:

```
monsters(N) = 2 × 1.3^(N-1)    2, 3, 3, 4, 6, 7, 10, 13, 16, 21
chests      = 6                flat, every floor
strength    = MONSTER_STRENGTH × STRENGTH_GROWTH_REBALANCED^(N-1)   how far up the monster table floor N reaches
```

**This block describes the flag-OFF baseline and is partly historical.**
`DIFFICULTY_REBALANCED` ships `true`, so the count law that actually runs
reads `MONSTERS_BASE`/`MONSTER_GROWTH_REBALANCED` (see the top table),
not the `2 × 1.3^(N-1)` above — that line was already stale before M25
and is left as the original argument's record rather than silently
rewritten. The strength line's SHAPE is corrected (M25: no longer flat),
but its base and growth are named as constants rather than restated as
numbers here — both have moved twice since (M25, then M29) and the top
table is the one place they are written. See "Difficulty rebalance (M7)"
below for the constants that actually run.

Growth **compounds** rather than adding. Both laws land near 20 creatures on
floor ten; what differs is where the growth sits. `2 + 2N` front-loads — floor
2 has twice floor one, floor 10 has 11% more than floor nine — and that is
backwards, because the hero is weakest at the top with nothing looted yet.

The growth rate is the number that decides whether the ladder is playable.
Net challenge eventually multiplies by it every floor, so the span from half
the hero's capacity to all of it is `ln2 / ln(growth)` floors:

```
growth  1.15   1.25   1.30   1.50   2.00
floors   5.0    3.1    2.6    1.7    1.0
```

Past about 1.4 the ladder stops being a ramp and becomes a wall: trivial,
trivial, trivial, dead. 1.3 is the largest value leaving a couple of floors of
real fight, and `10^(1/9) = 1.29` is what keeps floor ten near where it was.

MEASURED, 24 dungeons, against the additive model it replaced:

```
                    additive      exponential
cleared               1/16            8/24
average depth          5.1             7.1
reached floor 10         2               9
net, floor 1          0.26            0.27
net, deepest solid    0.71 (fl 7)     0.71 (fl 10)
capacity 1 -> 10      10.0 -> 10.3    10.0 -> 11.8
```

It bought what it was meant to buy: the descent is now played to the bottom
instead of ending in its first three floors. The cost is that **capacity now
rises**, so the hero is once more outgrowing the dungeon — six chests on a
three-creature floor is generous, and the gentle opening lets gear bank
cheaply. Chests are the obvious next lever, not the growth rate.

**Why count and not strength.** Clearing cost tracks `Σ hp × (xp − 1)`, so
individual strength scales cost quadratically — a strong monster hits harder
AND lasts longer, and those multiply — while count scales it linearly.
Linear is what a dial should be. Summing xp predicts nothing: six rats and
one genie both total 6, and one costs zero while the other costs 20.6.

**Why chests are flat.** Tying them to the creature count was tried and
fails: loot then grows at the same rate as threat, and since the hero
accumulates while each floor's threat is spent once, the hero wins. Measured
with `chests = monsters × 2`, floor ten handed over 64 items and capacity
reached 118 against a starting 10. Flat chests are what makes threat outpace
supply.

**Why strength is low.** At Rogule's 0.75 a floor with only two creatures
can still roll an ogre, and floor one killed 7 of 12 heroes. Strength still
varies WITHIN a map by distance from the entrance; what is fixed is the
ceiling.

Measured with these, 12 dungeons: 4 cleared, depths 2, 2, 2, 4, 5, 7, 7, 8,
10, 10, 10, 10. Capacity rises to 20.7 by floor 6 then grinds down to 10.8 by
floor 10 — the hero builds up and is worn away, which is the arc worth
having.

## Crowd correction — the cost model under-prices numbers

> ⚠️ **The ruler changed here, TWICE.** Every challenge/cost figure recorded
> ABOVE this section, and in `docs/observed-ruler.md`, was measured with the
> uncorrected model — **pre-change**. The section below was then itself
> revised once, from a multiplicative factor to the additive form that
> ships now; anything measured against the multiplicative form (`1.32 ×
> n^0.106`) is **also stale**, including a bot A/B taken with it. Only
> numbers measured against `CROWD_COST_OVERHEAD` below are current.

| Name | Value | Status |
|---|---|---|
| `CROWD_COST_OVERHEAD` | 0.75 | **INITIAL GUESS** |

```
campaignCost(roster) += CROWD_COST_OVERHEAD × Σ expectedDamage(monster.xp, 0)
```

Applied to `campaignCost` only, **never to `duelCost`**. The one-on-one model
is right; what is wrong is the sum.

### The error, measured

A hero with 400 hp — so nothing is selected by dying — dropped into floors
with no chests and no drops, `requireClear: all`, so the hero never changes
and clears everything, which is exactly what the model predicts.
`ratio = real damage taken / modelled cost`:

```
count varied, strength 0.35        strength varied, count 8
mon   ratio        crowding        strength  ratio        crowding
  2   2.10 +-0.31   0.17             0.35    1.77 +-0.11    0.62
  4   1.65 +-0.19   0.27             0.50    1.43 +-0.07    0.65
  6   1.43 +-0.13   0.35             0.65    1.47 +-0.07    0.59
  9   1.77 +-0.12   0.77             0.80    1.31 +-0.07    0.60
 13   1.57 +-0.09   1.10             0.95    1.30 +-0.19    0.66  (n=5)
 17   1.87 +-0.10   1.55
 21   1.85 +-0.10   1.94
 28   1.90 +-0.09   2.47
```

**The error rises with count and falls with strength.** A pure calibration
error would be flat in both. This is the model being wrong about crowds
specifically, which is what justified changing it rather than scaling it.

It also reproduces the failed count×strength sweep quantitatively: 21
creatures are under-priced 1.85×, five creatures about 1.5×, so a count-heavy
floor really costs ~1.23× more than the model says relative to a force-heavy
one of equal modelled cost. Measured then: count-heavy cleared 30%,
force-heavy 43%.

### Why the strength axis falls

If the overhead were "other monsters hit you while you duel", it would be
proportional to their blow and the ratio would be **flat** in strength. It
falls, because duels against stronger creatures last longer and dilute a
roughly fixed overhead. So the shape is `real ≈ modelled + overhead`, with
overhead growing with the crowd and barely with strength.

### Revision — the shape now matches the derivation

The first cut of this section implemented `campaignCost *= 1.32 × n^0.106`:
multiplicative, no strength term. That was inconsistent with its own
derivation two paragraphs up, which called for an ADDITIVE overhead — and it
showed: re-measured with a tank hero (400 hp, nothing selected by dying), the
count axis was close to flat on its own (raw ratio ≈1.6–1.8 across 2–28
creatures, no strong trend), but the strength axis fell hard and
reproducibly, 1.48 → 1.30 → 1.22 across strength 0.5 → 0.8. A pure
count-only factor cannot express that by construction.

**Corrected to:**

```
campaignCost += CROWD_COST_OVERHEAD × Σ expectedDamage(monster.xp, 0)
```

One constant, `CROWD_COST_OVERHEAD = 0.75`, applied once to the roster's
total blow — not per creature inside the loop, and never to `duelCost`.

**A hypothesis this ruled out.** The natural next question was whether the
real variable is SIMULTANEITY (how many creatures can attack at once) rather
than headcount — motivated by the upcoming clustering work, which holds count
fixed and packs creatures together. Tested directly: same roster, lowest vs
highest third by a map-crowding measure (mean neighbours within 3 tiles), at
three count/strength combinations. Real cost differed by only −12%, −1%, +10%
across the three cases, with the one 2σ result pointing the WRONG way (packed
cheaper, not more expensive). **Simultaneity is not the variable; headcount
already is.** This also settles the signature question raised when this
section was first written — `campaignCost` keeps taking a roster, not
positions, because the correction has no use for them.

**Final validation, unseen seeds, n=60/cell:**

```
mon | strn | ratio
  2 | 0.35 | 1.12 ±0.15
  9 | 0.35 | 1.03 ±0.07
 21 | 0.35 | 1.03 ±0.05
  8 | 0.50 | 1.04 ±0.06
  8 | 0.80 | 1.07 ±0.07
```

Flat on both axes, all within ~1 SE of 1.00 — the criterion the first cut
failed.

**Honest limit.** A weighted regression against the fitting data still shows
residual structure (z ≈ 2.2 vs count, z ≈ −2.8 vs strength) — an order of
magnitude smaller than the multiplicative form's error, not zero. One
constant is what the CPU budget (this runs inside the bot's decision loop
every turn) and the measurement noise both support in one sitting; a second
term would need meaningfully more seeds to fit without overfitting three
strength points.

**Bot effect, paired seeds, n=40: identical — 15/40 cleared, depth 7.15, both
arms.** Expected and confirmed rather than assumed: the correction only
reaches `campaignCost` through `valueByItemName` (gear pricing), never
through `priceMonsters` (target selection, which is `duelCost` — always
one-on-one, untouched). Gear-taking was already saturated before this change
(87% of chests opened regardless of the room's odds, both `docs/map-design.md`
findings), so there was no decision left for either model shape to move.

**Fitted at strength 0.35**, which is what the game shipped WHEN THIS WAS
FITTED. It no longer is: M17 turned the ramp on via
`STRENGTH_GROWTH_REBALANCED` and M25 moved the base to 0.28. By this
section's own terms — *"if it is ever switched on, this fit has to be
redone, because the strength axis moves the overhead the other way"* —
the fit is now owed a redo. Disclosed here rather than quietly restated;
no item has claimed it.

## Strength ramp — the second way difficulty could grow

| Name | Value | Status |
|---|---|---|
| `STRENGTH_GROWTH` | 1.0 | **INITIAL GUESS** — 1.0 means OFF |

Lives in `src/sim/difficulty.js` beside `MONSTER_STRENGTH`, following the
convention already set there for the difficulty-model constants.

`strength(N) = MONSTER_STRENGTH × STRENGTH_GROWTH^(N−1)`, so at 1.0 every
floor keeps the flat base and nothing changes.

**This constant is the flag-OFF path and is not what runs.** With
`DIFFICULTY_REBALANCED` on, `floorParams` reads
`STRENGTH_GROWTH_REBALANCED` and `MONSTER_STRENGTH` instead (see the top
table for their current values — moved once by M25, again by M29). The
ramp is ON in the shipped game.

Difficulty grows one way today: creature count. That was argued deliberately —
count scales cost linearly and strength scales it superlinearly, and linear is
what a dial should be. The dial exists so the *split* between the two can be
swept while holding total growth at the calibrated 1.30 per floor.

**Off by default.** It is a measuring instrument, not a shipped change.

### The exponent is 2.36, not 2

The obvious constraint for holding total growth constant is
`count × strength² = 1.30`, on the reasoning that a stronger creature both
hits harder and lasts longer. **Measured, the exponent is 2.356** (R² = 0.9982
over strength 0.35 → 1.0, count held fixed). Strength scales the *index* into
an eleven-row table whose mass runs 0 to 108, and index ×3.3 is mass ×13.5 —
superquadratic.

Using 2 would have overshot every force-heavy point: at the extreme it gives a
strength growth of 1.1402, whose real total growth is `1.1402^2.356 = 1.362`,
not 1.30. That compounds to ×1.6 over the descent and would have invalidated
the whole sweep while looking fine.

```
count   strength growth (k = 2.356)   saturates
1.30    1.0000                        never
1.20    1.0346                        floor 32
1.15    1.0534                        floor 22
1.10    1.0735                        floor 16
1.00    1.1178                        floor 11
```

**The table ceiling does not bite.** Even the extreme point saturates only at
floor 11 — outside a ten-floor descent. Floor 10 there reaches strength 0.95,
which is index 9 (dragon) with the ±2 spread reaching the t-rex. One floor
deeper and the ramp would be dead.

### MEASURED — five points, 150 generated floors and 50 descents each

```
count  CV floor 1 -> 10   creatures faced fl10   max blow fl10   blows >= 5hp
1.30   0.841 -> 0.492            18.0                 3            0.0%
1.20   0.841 -> 0.557             9.5                 3            0.0%
1.15   0.841 -> 0.589             6.1                 4            0.0%
1.10   0.841 -> 0.637             4.3                 5            1.4%
1.00   0.841 -> 0.933             1.8                 9            8.2%
```

**Only the pure-strength endpoint actually stops the CV falling** (0.93 at
floor 10, flat-to-rising across the ladder). Every intermediate point falls
less steeply but still falls. Peak damage and the shrinking error margin
behave as predicted: blows worth half the hero's life appear only from 1.10
onward, and reach 8% of all blows at the extreme.

**No blow ever killed from full health** at any point in the sweep — 0.0% of
blows reached 10. The margin shrinks; it does not vanish.

### Two things the sweep exposed, and one invalidates part of it

**1. The pure-strength endpoint is degenerate, and not because of the table.**
`MONSTERS_BASE` is 2, so a count growth of 1.00 means *every* floor holds two
creatures — floor 1 and floor 10 alike. That is not "short floors at the
bottom", it is a dungeon that never grows. Making pure-strength meaningful
would need the base count raised first, which is a different change.

**2. Equal modelled cost is NOT equal felt difficulty.** Confirmed on fresh
seeds, 60 descents each:

```
                    count 1.30      count 1.10 + strength
cleared             18/60 = 30%     26/60 = 43%     (+-6 each)
cost growth x9      x10.5           x9.8            (target x10.6)
```

Win rate moved by 12–13 points in the *same direction* in both seed families.
Part is the 7% cost shortfall, but most is structural: `campaignCost` prices
clean sequential duels, so it systematically **under-prices crowds**. Twenty
weak creatures are harder in practice than the model says, because the model
never sees the bot get flanked. This is the same modelling failure already on
record — the modelled net challenge once read 0.23 on a floor that killed four
heroes of seven.

**So the sweep held the model constant, not the game.** Any force-heavy point
adopted would need its total growth raised to compensate, and by an amount
that has to be measured rather than derived. That is the tunability cost: the
two dials are only commensurable through a model that is wrong in a direction
that matters.

## Floor spread — making deep floors lotteries

| Name | Value | Status |
|---|---|---|
| `FLOOR_SPREAD_BASE` | 0 | **INITIAL GUESS** |
| `FLOOR_SPREAD_PER_LEVEL` | 0.09 | **INITIAL GUESS** |
| `FLOOR_SPREAD_CAP` | 0.9 | **INITIAL GUESS** |

`sigma(N) = min(CAP, BASE + PER_LEVEL × (N − 1))`, fed to a log-uniform
multiplier on the creature **count** (`drawLogUniform`, mean exactly 1).

**The problem it fixes.** Difficulty grows by creature count, and a sum of N
independent bounded draws converges on its mean: `CV = CV_c / √N`. Measured
over 150 seeds a floor, against a fixed reference hero:

```
floor      1     4     7    10
creatures  2     4    10    21
mean cost  1.26  2.71  6.89 14.46
CV         0.870 0.607 0.370 0.306
CV × √N    1.23  1.21  1.17  1.40      <- flat: the law, exactly
```

So the deeper the floor, the more **predictable** it is, and the climax of a
run lands where the variance is lowest. That is bad here in a way it would not
be elsewhere: the player does not decide anything, so surprise is the only
tension on offer.

**Why the obvious fixes do not work.** While the draws stay independent the
`1/√N` decay is untouchable — anything iid moves the 1.2 and nothing else.
Widening the per-creature tier spread: still `1/√N`. Giving each creature a
small chance of being huge: `sd = √N·√(p(1−p))·(C−μ)`, still `1/√N`. Scaling
difficulty to the hero: rejected outright in curve.js, it nullifies
progression.

**Breaking independence is the whole trick.** One roll shared by every
creature on the floor makes cost `N·μ(F)`, so `CV = CV[μ(F)]` with no `√N`
underneath. Applied to the count it is also mean-exact, because cost is
linear in N — applying it to `strength` instead would work but cost is
*convex* in tier, so the centre would drift and need recalibrating.

**The dial is not sacrificed.** Count still sets the mean; spread is a second,
orthogonal dial.

**Known ceiling.** Matching floor 1's CV (0.870) at floor 10 needs an added CV
of 0.81, which is `sigma ≈ 1.6`, which is 3 to 70 creatures — more than the
map has walkable tiles. Count spread can stop the decay and turn it around; it
cannot flatten the whole ladder. Going further needs a fixed-count rare event
(one champion per floor), where a single t-rex costs ~21 hp against floor
ten's whole 14.5.

### MEASURED, 150 paired seeds a floor

```
floor        1     4     5     7     8     9    10
sigma      0.00  0.27  0.36  0.54  0.63  0.72  0.81
CV before  0.870 0.607 0.477 0.370 0.356 0.334 0.306
CV after   0.870 0.609 0.514 0.495 0.507 0.546 0.548
p90 cost   2.8   5.3   7.2   11.9  15.9  20.1  25.4   (was 19.8 at floor 10)
```

The decay is broken. CV bottoms out at floor 7 and **rises** from there, and
floor ten is up 79%. It is not a rise all the way from floor 1 — that was
shown impossible above, and floors 1 to 3 hold 2 or 3 creatures, so one ogre
against one rat *is* the whole floor.

Confirmed on unseen seeds (5150000+): floor 10 CV 0.292 → 0.536, +0.244
against +0.241 on the tuning seeds.

**Win rate is flat, which is the point.** 40 paired dungeons on unseen seeds:
cleared 16/40 → 17/40, mean depth 7.4 → 7.6. The centre was not supposed to
move and it did not.

**A measurement artifact worth knowing.** The multiplier is the *first* draw
of the `spawn` stream, and that stream is seeded `hashSeeds(seed, 2)` — the
same for every floor of a given seed. So a per-floor probe that reuses one
seed list gives all ten floors the *same* multiplier, and a seed family that
happens to draw high shifts every floor together. The confirmation family did
exactly that: `E[u] = 0.5599`, 2.5 standard errors high, which alone explains
a +9% count and +13% mean cost on that family. Over 40 000 draws `E[M] =
1.0014`. Real dungeons are unaffected — floors are seeded `hashSeeds(seed,
level)` and each draws its own — which is why the descent came out flat.

## Map design — the spine and its detours

`docs/map-design.md`. The floor offers a choice: a short mandatory route
holding most of the threat, and side rooms that can be skipped, holding
fewer but nastier creatures and better chests.

| Name | Value | Status |
|---|---|---|
| `SPINE_THREAT_SHARE` | 0.7 | **INITIAL GUESS** |
| `SIDE_ROOM_DEPTH_BONUS` | 0.35 | **INITIAL GUESS** |
| `SIDE_ACTIVATION_CAP` | 99 | **MEASURED NEGATIVE, kept off** — see below |
| `SIDE_CHEST_BIAS` | 3 | **INITIAL GUESS** |
| `MIN_ROSTER_FOR_SIDE` | 4 | **INITIAL GUESS** |
| `SHRINE_DISTANCE_SHARE` | 0.65 | **SWEPT** — see below |

`SPINE_THREAT_SHARE` is the share of a floor's THREAT MASS — not headcount
— placed on the mandatory route. Mass, because cost tracks `hp × (xp − 1)`:
a floor can put 70% of its bodies on the spine and still hide the
dangerous half in a side room. See M10 for the mechanism that holds this
in practice (a mass quota, re-checked per cluster member) and M16 for what
does and does not threaten it (bigger rooms alone do not; a higher
`MAP_DUG_PERCENTAGE` would).

`SIDE_ROOM_DEPTH_BONUS` is a single constant driving BOTH halves of the
side-room bargain — depth is what picks the monster tier and what sets
chest quality, so raising it makes a detour more dangerous and better paid
by the same number. This is the whole of the risk/reward design, not a
tweak to it: two independent draws (risk, reward) over `[0, 2 × bonus]`
keep the average side room where it was while making individual ones range
from a den of ogres guarding a dagger to a lone bat sitting on an axe.

`SIDE_ACTIVATION_CAP` caps how far a side-room creature's `activation` can
reach, however far its table entry would normally go — 99 means no cap,
i.e. off. **A measured negative, not an unused guess**: the hypothesis was
that the nastiest side rooms (longest `activation`) should be the ones
grabbing the bot from across the floor while safe rooms stay quiet.
Capping it to 4 made the good/bad-room inversion WORSE (68% of unfavourable
rooms opened against 54% of favourable, vs 53%/45% uncapped). Kept as a
dial because "a guard guards" is still defensible and the negative result
is worth being able to re-check — see `docs/map-design.md` for what the
cause turned out to be.

`SIDE_CHEST_BIAS` is how much likelier a chest is to land in a side room
than a spine room — a weight, not a quota, since a detour nobody is paid to
make is not a choice, and a map with no side rooms must still place every
chest.

`MIN_ROSTER_FOR_SIDE` is the floor below which every creature stays on the
spine — the mass split is too coarse to honour below it (a two-creature
floor's single side monster is already half the mass), and a lone creature
behind a detour is not a gamble anyway. Measured 68%/63% spine on floors 1
and 3 against the 70% target before this gate existed.

`SHRINE_DISTANCE_SHARE` — docs/backlog.md M23. The hero still lands at one
end of the map's longest room-pair (M20's mechanism, kept — it is what
keeps the hero out of corridors), but the shrine no longer has to be the
exact other end. Any room within this share of the hero's own furthest
reachable room is a candidate, and one is drawn at random; 1.0 would
reproduce M20 exactly. M20 forced the shrine to the literal extreme, which
maximises the mandatory path on purpose — and a room is spine whenever
that path crosses it, so maximising the path IS maximising spine share,
the same quantity twice. That pushed spine share to 0.93–0.97 against the
0.95 ceiling above. Swept 0.6/0.65/0.7/0.75/0.8/0.9 on floor 5, hero-shrine
path length, n=3000/value: 0.6 measured statistically flat against the
pre-M20 baseline (29.4 vs 28.6) — too loose to be doing anything. 0.7
reached 30.5 but pushed floor 6 spine share back over 0.95. 0.65 clears
both: spine share back in `[0.6, 0.95]` everywhere the split applies, and
path length at 29.9 — clearly between the pre-M20 baseline (28.6) and
M20's (31.5), not pinned to either end.

## Where the current numbers live

**Not here.** The dungeon curve, the win rates and the difficulty-dial table
that used to sit in this space were measured before xp was frozen, before
weapons widened the roll, before armour became a spent second bar, before
passive regeneration was removed, before the collectibles went, before growth
turned exponential and before the map grew a spine. Every one of them was
wrong by the time anybody read it, and one of them — a slider label promising
"~45% wins" — was quoted back at us for weeks.

They are gone rather than updated, because a table of measurements in a
markdown file rots on a schedule nobody controls. Run the numbers instead:

```
python tools/dev-server.py     ->  http://localhost:8141/run-lab.html
```

`run-lab.html` renders the formulas out of this file's mirror
(`src/sim/balance.js`) at load, exposes every dial, and measures the descent
on demand. What it prints is true today by construction.

The one shipped figure worth writing down is the shape, not the level: net
challenge should **rise** with depth and capacity should **not**. The page
says so in a verdict line rather than leaving it to be eyeballed.

## Two findings that outlived their tables

Both were measured against an older bot and older generation, and both are
about the *structure* of the problem rather than any particular number — so
they are still worth knowing before turning any dial.

**Roughly half of a run's outcome is dice, not design.** Playing the same map
with nine different combat streams: 46.5% of the outcome variance came from
the map, 53.5% from the rolls. Six maps out of 21 always gave the same result;
seven were near coin flips. So a dial sets a long-run rate and never a verdict
on one run — and any comparison of two settings needs enough seeds to see past
that, which is also why `descentCurve` reports a z.

**No formula over map features predicts much.** Correlations with winning
topped out near 0.3, and a fitted model reached 64% accuracy against a 59%
base rate. That is the dice ceiling above, not a modelling failure.
Controlling generation works; predicting from it does not — which is why the
modelled net challenge was eventually replaced by a measured one.

Mirrored in `src/sim/balance.js`. Change here first, then there. Nothing in
`src/sim/*.js` may hardcode a number that belongs on this page.

Values marked **FAITHFUL** are copied from the original Rogule source and
should not be touched without a reason — changing them makes the copy stop
being a copy. Values marked **INITIAL GUESS** are ours and are what P4 tunes.

---

## World

| Name | Value | Status |
|---|---|---|
| `MAP_SIZE` | 32 × 32 | FAITHFUL (`ui.cljs:26`) |
| `CORRIDOR_LENGTH` | `[1, 3]` | was FAITHFUL `[1, 5]` (`generator.cljs:146`); **DIVERGENCE since M16** |
| `ROOM_WIDTH` | `[5, 9]` | **NEW since M16** — was unset, ROT's own default applied |
| `ROOM_HEIGHT` | `[4, 7]` | **NEW since M16** — was unset, ROT's own default applied |
| `MAP_DUG_PERCENTAGE` | 0.15 | **INITIAL GUESS** — lower than ROT's own 0.2 default |
| `VISIBLE_DIST` | 9 | FAITHFUL (`ui.cljs:27`) |
| `CLEAR_DIST` | 7 | FAITHFUL (`ui.cljs:29`) — cosmetic only |
| `CHEST_COUNT` | 15 | FAITHFUL (`generator.cljs:326`) |
| `MONSTER_COUNT` | 5 | FAITHFUL (`generator.cljs:326`) |

`MONSTER_COUNT` and `CHEST_COUNT` are the first dials to reach for in P4.
Five monsters on a 32×32 map is very sparse — see spec §10.2.

`MAP_DUG_PERCENTAGE` is how much of the grid ROT's digger hollows out.
Lower than ROT's own 0.2 default on purpose: at 0.2 there were usually
several equivalent ways through, and the spine/side design needs the map
to HAVE a mandatory path. M16 swept it against room size and corridor
length together and found it did not need to move from 0.15.

## Player

| Name | Value | Status |
|---|---|---|
| `PLAYER_HP` | 10 | FAITHFUL (`generator.cljs:216`) |
| `PLAYER_XP` | 3 | FAITHFUL (`generator.cljs:26`) |
| `KILLS_PER_XP` | 2 | FAITHFUL (`engine.cljs:272`) — 1 xp every 2 kills |
| `XP_FROM_KILLS` | `false` | **OFF by owner decision** — see below |
| `WEAPONS_WIDEN_ROLL` | `true` | **ON by owner decision** — see below |

`XP_FROM_KILLS` off means xp never grows — gear is the only progression.
Measured, and it does not do what intuition suggests: over a ten-floor
descent, freezing xp barely changes how deep the hero gets (gear compounds
just as freely on its own), but it DOES move where the danger sits — three
of ten dungeons ended on floor one with xp frozen, against one of ten with
it on, because a hero who cannot level and has not yet looted is at their
weakest ever.

`WEAPONS_WIDEN_ROLL` on means a weapon enlarges the damage die
(`0..xp-1+weapons`) rather than raising its floor (`weapon` added after a
`0..xp-1` roll). The hero can still whiff however well armed, and each
point of weapon is worth half what a flat bonus would be — the cheapest
way found to blunt gear as the resource that runs away over a ten-floor
descent, without capping what can be carried.

## Difficulty rebalance (M7) — ADOPTED, flag ON

| Name | Value | Status |
|---|---|---|
| `DIFFICULTY_REBALANCED` | `true` | **ADOPTED** — Review 2. See `docs/backlog.md` M7 |
| `MONSTERS_BASE` | 4 | was 2; raised to 5 by M17, **LOWERED by M29**, see below |
| `MONSTER_GROWTH_REBALANCED` | 1.0801 | ADOPTED at 1.15, raised to 1.22 by M12, REPLACED by M17, **RE-SOLVED by M29** — see below |
| `STRENGTH_GROWTH_REBALANCED` | 1.1452 | ADOPTED at 1.07, REPLACED by M17 at 1.108, PIVOTED by M25, **RAISED again by M29** — see below |
| `CLUSTER_SIZE` | 10 | SETTLED at 6; raised to 10 by M12 (measured to matter little past 6 once M10 landed); untouched by M17 |

Live in `src/sim/difficulty.js` beside `MONSTER_GROWTH` and
`STRENGTH_GROWTH`, following the same convention already set there.

One flag, three levers, moved together because they are one budget and
cannot be attributed apart (`docs/backlog.md` M7). With the flag on,
`floorParams`/`floorPlan` read `MONSTER_GROWTH_REBALANCED`,
`STRENGTH_GROWTH_REBALANCED` and `CLUSTER_SIZE` in place of `MONSTER_GROWTH`
(1.3), flat strength, and independent per-monster draws.

**Count grows slower** than `MONSTER_GROWTH` (1.3), cutting the CV-diluting
effect of many independent draws (`CV = CV_single / √n`). **Strength now
ramps** (1.0 → 1.07) to replace the difficulty count no longer supplies —
using the corrected exponent from the archived count→strength sweep, not 2,
because strength indexes an 11-row table whose mass runs 0 to 108, not a
linear scale. **Grouping is new**: `src/sim/spawn.js`'s monster placement
(step 5) now places creatures in clusters of up to `CLUSTER_SIZE`,
nearest-tile-first from a shared anchor, instead of drawing every position
independently — same zone rules (side/spine) as today, same RNG stream, and
`CLUSTER_SIZE = 1` reproduces the current per-monster independent draw
exactly (verified: with the flag off, the cluster loop degenerates to one
draw per monster with no extra RNG consumption).

See `docs/backlog.md` M7 for the full build and measurement history.
Adopted numbers (Review 2): CV of challenge 0.941 → 0.986 per floor (~3σ
move, within 1σ of the ≥1.00 target); challenge/power and finishes both
held their bands. Challenge read unchanged on the probe (1.341 → 1.337)
while real-bot finishes fell 11.3 points — the probe under-reads
clustering's effect on a competent player, so "challenge held" describes
the instrument, not a claim that difficulty is unchanged.

### M12 raised MONSTER_GROWTH_REBALANCED and CLUSTER_SIZE

Floor 10 held only 7 creatures on a 32×32 map at the adopted 1.15 — the
price M7 paid to fight CV decay, spent without anyone checking what it did
to how full a floor felt. CV depends on independent DRAWS, not creature
count, and clustering already separated the two — so `docs/backlog.md` M12
raised count and asked cluster size to rise with it, to keep draws per
floor roughly where they were.

**Measured, not assumed: `CLUSTER_SIZE` past 6 is nearly inert.** Swept
6/12/20 at the shipped growth and got IDENTICAL effective cluster sizes at
every floor (`src/analysis/clustering.js`'s `effectiveClusterSizes`). M10's
per-member quota check — cutting a cluster the moment the zone quota flips
— fires on the roster's MASS BALANCE, not on how large `CLUSTER_SIZE`
allows a cluster to grow, and it was already the binding limit well below
6. Raising the constant to 10 is closer to good faith than to a working
lever: it does not undo the effect M12 hoped it would.

**Chosen instead: raise count as far as the existing M7 budget test
allows.** `MONSTER_GROWTH_REBALANCED × STRENGTH_GROWTH_REBALANCED^2.356 /
MONSTER_GROWTH` has to stay within 15% of 1 (the same check M7 shipped
with) — 1.22 sits at 10% over, the edge of that band. Floor counts:
`2,2,3,4,4,5,7,8,10,12` (was `2,2,3,3,3,4,5,5,6,7`) — floor 10 nearly
doubles. Effective cluster size stays in roughly the same 1.7–2.3 range it
was already in, so draws per floor rose from ~3.3 to ~5.4 at floor 10 —
**not held constant**, honestly reported rather than claimed otherwise, and
CV should be expected to give back some ground at the deepest floors
(`√(3.3/5.4) ≈ 0.78`× the current gain, roughly). The metrics agent's
standing ruler re-run is what settles how much.

### M17 replaced M12's setting — near-flat count, strength carries the rest

Third attempt at this axis (archived once for a CV that count→strength
alone never fixed; came back as M7 with clustering; this is what landed
since M7 changing the ground again — clusters exist, the tier floor rises
with depth, rooms are 64% bigger). **REPLACES M12's `MONSTER_GROWTH_
REBALANCED`, not additive with it** — `MONSTERS_BASE` 2 → 5,
`MONSTER_GROWTH_REBALANCED` 1.22 → 1.0536 (chosen exactly: `(8/5)^(1/9)`,
the growth that lands floor 10 at 8 given a floor-1 base of 5).
`STRENGTH_GROWTH_REBALANCED` 1.07 → 1.108, sized to carry what count no
longer does: `1.34 / 1.0536 = 1.273`, and `1.273^(1/2.356) = 1.108`.
Creature count: `5,5,6,6,6,6,7,7,8,8`.

### M25 — a gentler floor 1, pivoted around an unchanged floor 10

Owner request: soften floor 1 and even out the climb, **without moving
where floor 10 sits in creature power**. `MONSTER_STRENGTH` 0.35 → 0.28,
`STRENGTH_GROWTH_REBALANCED` 1.108 → 1.1358. Creature COUNT is untouched
— `MONSTERS_BASE` and `MONSTER_GROWTH_REBALANCED` keep M17's settings and
the roster is still `5,5,6,6,6,6,7,7,8,8`.

**The growth is solved, not chosen.** For any base, it is whatever pins
floor 10: `(0.35 × 1.108^9 / base)^(1/9)`. So `0.28 × 1.1358^9 ==
0.35 × 1.108^9` exactly, and floor 10's ceiling index (8), mean xp and
threat mass (264.5) are unchanged to the digit. A test asserts this
against the literal pre-M25 pair, so changing one constant without
re-solving the other fails loudly instead of quietly sliding floor 10.

**The base was SWEPT** — n=50 floors per level, scoring the standard
deviation of the log floor-to-floor threat-mass ratio ("how even are the
steps", lower is smoother):

| base | growth | floor 1 mass | floor 10 mass | smoothness |
|---|---|---|---|---|
| 0.35 | 1.108 | 26.6 | 264.5 | 0.204 (was) |
| 0.32 | 1.1191 | 26.0 | 264.5 | 0.213 |
| 0.30 | 1.1271 | 25.4 | 264.5 | 0.140 |
| **0.28** | **1.1358** | **20.9** | **264.5** | **0.116** |
| 0.26 | 1.1452 | 20.8 | 264.5 | 0.226 |
| 0.24 | 1.1554 | 20.2 | 264.5 | 0.227 |
| 0.22 | 1.1667 | 20.2 | 264.5 | 0.198 |

**Not monotonic, which is why this was swept rather than reasoned.** The
score is driven by where the INTEGER ceiling-index steps land; 0.28 is
where they space out evenly. 0.26 and 0.24 cut floor 1 just as hard and
score *worse than the setting they replaced*.

Threat mass per floor, measured (n=50/floor):

    was    26.6  27.2  47.0  44.9  60.9  72.3  111.7  161.1  167.2  264.5
    ratio        1.02  1.73  0.96  1.36  1.19   1.54   1.44   1.04   1.58

    now    20.9  25.0  31.1  41.7  48.6  69.6  107.2  145.5  164.8  264.5
    ratio        1.20  1.24  1.34  1.17  1.43   1.54   1.36   1.13   1.60

The old ramp went BACKWARDS at floor 4 (0.96 — floor 4 easier than floor
3) and sat nearly flat at floors 2 and 9 around a 73% cliff at floor 3.
Every ratio is now between 1.13 and 1.60.

**The cost, and it is arithmetic, not a tuning miss: the average slope
got STEEPER.** Lowering the start while pinning the end cannot do
anything else. Measured per-floor mass growth 1.291 → 1.326, and the M7
budget check (`MONSTER_GROWTH_REBALANCED × STRENGTH_GROWTH_REBALANCED^2.356
/ MONSTER_GROWTH`) drifts from 3.2% to **9.4%** over — still inside the
15% band its test allows, but two thirds of the way to the edge. If a
later item wants to spend that band, this is where it went.

**Mid floors hold genuinely weaker creatures**, which is what "smoother
up to floor 10" means and was accepted explicitly: ceiling index drops
4 → 3 at floor 3, 5 → 4 at floor 5, 7 → 6 at floor 8. Only floor 10 was
anchored.

**The obvious alternative was measured and rejected.** Cutting floor 1's
roster instead (`MONSTERS_BASE` 5 → 3, count growth repinned to 8 at
floor 10) with this ramp left alone scored **0.247 — worse than the
setting it would replace** — because integer counts that low make every
step a large relative jump (floor 2 fell *below* floor 1, then floor 3
jumped 91%). It would also undo M17 head-on.

**The risk M17 flagged did not fire.** That comment warned a faster ramp
could saturate the 11-row table inside the descent; `saturatedAt` returns
null at the new pair (floor 10 reaches 0.881, still under 1.0), and the
existing no-saturation test covers it.

Real-bot effect, same 40 seeds used for M19 and M24 (`playDungeon`):
mean death floor 3.40 → **4.03**, share dying by floor 2 35% → **30%**,
and **one run cleared all ten floors** — the first clear in this seed
range across the M19, M24 and M25 measurements. One clear in forty is not
a rate; `run-check.html`'s `finishes` at a real sample is.

**Measured, all three things the item asked for:**

- **Challenge growth: 1.317 ±0.016/floor** (Sonda A, n=80/floor, larger
  sample than the item's own quick check) — inside the `1.34 ±0.03` band,
  close to its lower edge (z = −1.48 against the 1.34 centre, under the
  2σ bar for "confirmed different"). Not a clean pass, not a break either;
  the number is what it is rather than rounded to look better.
- **Saturation: never, within the 10-floor descent.** `saturatedAt` with
  the new ramp returns `null` — `0.35 × 1.108^9 ≈ 0.881` of the table,
  matching the item's own back-of-envelope estimate almost exactly. The
  strength ramp gets close to the ceiling without hitting it.
- **Tier spread within a floor did NOT collapse — measured, not assumed
  away.** This was the item's own stated risk (strength carrying ×1.108
  across an 11-row table narrowing deep floors to the same few rows). Real
  generated floors, n=60 seeds, table-index mean/sd/distinct-count:

  ```
  floor    mean index   sd    distinct tiers seen
    1        2.05      1.54   6  (0-5)
    5        3.40      1.87   7  (1-7)
   10        6.11      2.06   7  (4-10)
  ```

  Spread (sd) is comparable to floor 1's, if anything slightly WIDER at
  floor 10, and the number of distinct tiers actually appearing stayed
  close to constant (6 → 7 → 7) rather than narrowing. The risk did not
  materialise at this setting.

**Not adopted because the arithmetic worked — built and measured, per the
item's own explicit instruction not to adopt on paper alone.** See
`docs/backlog.md` M17 for what this did to `run-check.html`'s numbers
(median depth, finishes) and whether the descent is actually playable.

### M29 — GUARANTEE_FIRST_WEAPON off, floor 1 softened through generation

Owner request: retire M19's item-injection guarantee (the nearest chest
forced into a dagger for an unarmed hero) and compensate through
GENERATION instead — count and strength, not a special-cased spawn rule.
`GUARANTEE_FIRST_WEAPON` `true` → `false`, in the same commit as the
generation change, so the swap could be measured together rather than
argued about.

**The bar was already measured, and it moved once the sample grew.**
n=40 (seed 800000) read guarantee-ON at mean death floor 2.425 / 60%
dying by floor 2; the same n=40 for a naive guarantee-OFF-with-no-
compensation read 2.15 / 75%. Both numbers had already drifted from an
earlier commit's own reading of this same flag (3.525 / 32.5% on, 2.95 /
52.5% off) — M3, `REVERSAL_PENALTY`, and a bot-side rule change (shrine no
longer requires a clear floor) all landed in between, so re-measured
fresh rather than trusted. **At n=80 the guarantee-ON baseline moved
again**, to mean 3.025 / 43.8% (sd 1.597) — the n=40 read was simply not
a stable sample for this metric. The n=80 read is what this item was
actually measured against.

**Checked the M7 budget headroom before sweeping anything, as asked.**
After M25 the challenge-budget check sat at 9.4% of its 15% band. Every
value tried below `MONSTER_STRENGTH` 0.28 costs MORE of that band, not
less, by construction — the pivot formula makes the growth term rise
monotonically as the base falls, even though M25's own smoothness score
was not monotonic in the same range.

**Two methodology bugs caught before trusting any candidate, both from
the same root cause — `makeFloorPlan`'s `DEFAULT_MODEL` silently filling
in the PRE-M7 defaults for anything not explicitly overridden.** An
early sweep passed only `monstersBase`/`monsterGrowth` and measured
promising results; direct field-by-field comparison against the real
`floorParams()` output caught that the swept model was running
`clusterSize: 1` (no clustering, against the shipped 10) and
`strengthGrowth`/`outOfDepthChance` at their FLAT, M3-off defaults —
a strictly easier game than the one actually shipping, on three axes at
once, invalidating every number from that pass. Fixed by building a
`shippedModel()` helper that starts from every live constant and
verifying it reproduces `floorParams()` byte-for-byte before trusting any
override built on top of it. Recorded here because it is a trap this
project's own instruments make easy to fall into and worth a name:
**a "sweep" that quietly defaults fields you did not think to override
is not measuring the game that ships.**

**Both single levers, pinned at floor 10 and pushed to the edge of the
remaining budget, landed in the same place and neither cleared the
target alone:**

| lever | value | drift | mean depth | share ≤ floor 2 |
|---|---|---|---|---|
| count only | `MONSTERS_BASE` 4 | 12.15% | 2.275 | 67.5% |
| count only | `MONSTERS_BASE` 3.5 | 13.83% | 2.45 | 67.5% |
| strength only | `MONSTER_STRENGTH` 0.24 | 13.91% | 2.475 | 67.5% |

Floors 1 and 2 land on the SAME creature count for base 4 and base 3.5
(`4, 4` either way — only floor 3 and deeper move), which is why the
extra budget spent between them bought nothing on the floor-2 metric.
Share-dying-by-floor-2 sat at 67.5% across all three single-lever
attempts regardless of which lever or how hard — a floor this budget
could not push past with one dial.

**Shipped a combination instead: `MONSTERS_BASE` 5 → 4 (`MONSTER_
GROWTH_REBALANCED` re-solved to 1.0801, pinning floor 10's count at 8)
together with `MONSTER_STRENGTH` 0.28 → 0.26 (`STRENGTH_GROWTH_
REBALANCED` re-solved to 1.1452, pinning floor 10's strength).** Lands
the M7 budget check at **14.35%** of its 15% band — 0.65 points of
headroom left, checked and disclosed, not the last of it but very close.
This re-opens `MONSTER_STRENGTH` 0.26, a value M25's OWN sweep had
already tried and scored worse on curve smoothness (0.226 vs 0.28's
0.116) — not an oversight: M25 was optimising step-evenness across all
ten floors, M29 is optimising floor-1 survival with the guarantee off,
and the two targets disagree here. Recorded in both constants' own
comments.

**Result, n=80, same seeds as the re-measured guarantee-ON baseline:**

    guarantee ON  (n=80)   mean depth 3.025  sd 1.597   share≤floor2 43.8%
    OFF + softened (n=80)  mean depth 2.763  sd 1.485   share≤floor2 55.0%

    z (mean depth)   -1.08
    z (share≤floor2)  1.43

**Neither clears the 2σ bar — this is the honest result, not a clear
win.** The point estimates lean toward the guarantee-ON baseline still
being somewhat better on both numbers, but the sample cannot say so with
confidence, and the combination is the best of everything tried within
the budget headroom available. Per the item's own fallback: *"if there is
not enough room left, that is the finding"* — pure generation-softening,
within what M25 left of the M7 budget, cannot be PROVEN to fully replace
what the item-injection guarantee bought, and there is very little budget
left (0.65 points) for anything to push this further without either
raising the 15% band or revisiting floor 10's pin.

**What not to read into this:** the mechanism itself (`GUARANTEE_FIRST_
WEAPON`) still exists and still works — `counts.guaranteeFirstWeapon ??
GUARANTEE_FIRST_WEAPON` — so a future item can switch it back on, or a
probe can isolate either lever again, without rebuilding anything.

## An out-of-depth tail (M3) — ON, adopted after M24

| Name | Value | Status |
|---|---|---|
| `OUT_OF_DEPTH_TAIL` | `true` | **ON** — archived once on the wrong test, re-measured on peak and adopted. See below |
| `OUT_OF_DEPTH_CHANCE_BASE` | 0 | **INITIAL GUESS** — zero on floor 1 by design |
| `OUT_OF_DEPTH_CHANCE_PER_LEVEL` | 0.02 | **INITIAL GUESS** — never swept, and did not need to be |
| `OUT_OF_DEPTH_CHANCE_CAP` | 0.15 | **INITIAL GUESS** — swept once against CV, which was the wrong test |

Live in `src/sim/balance.js` beside `MONSTER_TABLE` and `MONSTER_WEIGHTS`;
the growth function (`outOfDepthChanceAt`) lives in `src/sim/difficulty.js`
next to `floorSpread`, same `base + perLevel × level`, capped shape.

Even with M7 adopted, the per-cluster tier draw never reaches the table's
true top within a ten-floor descent — `saturatedAt` on the adopted ramp
stays under 1.0 through floor 10 — so the strongest possible single blow is
frozen well below `t-rex`. M7 raised lethality by ATTRITION (more
creatures acting together); this is the lever for a bigger single hit,
which is the gap M7's own Review 2 flagged as unsettled (the pooled
p95/p99 damage reading could not tell attrition from spike apart).

With the flag on: after a floor finishes populating, a chance that is zero
on floor 1 and grows (capped) with depth decides whether ONE already-placed
monster gets reskinned into a tier drawn near the table's true top —
same position, zone and drop, only its own stats change. Reskinning an
existing monster rather than adding one keeps the roster size, and
therefore the median floor, untouched; only the rare floor that rolls the
spike moves. With the flag off (chance always 0), `spawn.js` skips the
draw entirely rather than rolling a chance that can never fire — verified
RNG-identical to before this item existed.

`PLAYER_HP` is 10 with no regeneration and damage is `0..xp−1`, so a
`t-rex` (xp 10) can take close to a full health bar in one blow. That is
the point, and it is why the mean was never the right reading.

### Archived once, on the wrong test — three separate mistakes

**It was judged by CV.** Everything was judged by CV at the time, but this
item exists to shrink the REACTION WINDOW, which is spike, not variance.
And an out-of-depth tail pushes CV the wrong way *by construction*: its
chance grows with depth, so it fires where cost is already highest,
raising the deep mean and lowering sd/mean even while raising sd. It could
never have passed the test it was given.

**The spike reading that failed it was diluted.** p95/p99 pooled over
every turn including walking; I7 later showed that was dilution.

**It had no room to work.** The ±2 spread made above-tier creatures
routine — wolf 17% of draws, ogre 8% — so a deliberate 8% tail was
invisible against a 25% background. **M24 is what changed that**, clamping
the drawn slot from above and leaving this as the only source of an
above-tier creature on floors 2-9.

### Re-measured on peak, and the peak has to be denominator-free

Above-tier creatures after M24, tail off vs on (n=300 floors per cell,
"above tier" = table index above the floor's own ceiling index):

| floor | ceiling | tail off | tail on |
|---|---|---|---|
| 1 | 2 | 0% | 0% (chance is 0 there by design) |
| 3 | 3 | 0% | 1.7% of floors |
| 5 | 4 | 0% | 7.7% of floors |
| 7 | 6 | 0% | 12.7% of floors |
| 10 | 8 | 40% of floors | 46.3% of floors |

Floors 1-7 read a clean **0% with the tail off** — M24 closed the routine
route completely. Floor 10's 40% baseline is M24's own +1 index of slack
at that depth, not this item.

**Conditioning on combat-adjacent turns — I7's fix — is STILL not enough
here, and this is the trap worth recording.** Measured that way the tail
looks like it does nothing, or slightly less than nothing:

    adjacent-turn damage      off        on
    p95                       1          1
    p99                       2          2
    share >= 3                0.99%      0.67%
    adjacent turns (80 runs)  12,586     17,257

The tail makes fights LONGER (an out-of-depth creature has far more hp),
so it adds low-damage adjacent turns to the denominator faster than it
adds high-damage ones to the numerator. **Any share-of-turns statistic is
diluted by a treatment that changes how many turns there are.** The fix is
a peak with no denominator at all: the worst single turn per run, and per
floor.

Measured that way, 240 paired descents per arm, same seeds both arms:

| worst single turn in a run | tail off | tail on | z |
|---|---|---|---|
| p95 | 5 | 7 | — |
| p99 | 5 | 9 | — |
| max seen | 7 | 10 | — |
| share of runs >= 5 | 6.3% | 14.6% | 3.02 |
| share of runs >= 6 | 0.8% | 9.6% | 4.40 |
| share of runs >= 7 | 0.4% | 7.5% | 4.05 |
| share of runs >= 8 | 0% (0/240) | 4.2% | 3.23 |

Per-floor peak agrees: `>= 6` goes 0.2% → 2.2% (z=4.30), `>= 7` goes 0.1%
→ 1.7% (z=3.97).

**The effect is confined to the far tail, which is the acceptance
criterion rather than a caveat.** The `>= 4` threshold does NOT move
(z=1.21) — routine fights are untouched. What moves is `>= 6` and above:
against a 10 hp hero, a single turn taking 7-8 is 70-80% of the bar, and
that went from essentially never (1 run in 240) to about 1 run in 13.

**`PER_LEVEL` was left unswept on purpose.** The plan was to sweep it if
the peak did not move at the shipped guesses; it moved decisively, so
there was nothing to buy. Note for whoever does sweep it: `CAP` binds from
floor 8 at the shipped 0.02, so raising `PER_LEVEL` alone only moves
shallow floors — the two have to move together to reach the deep end.

## Tier floor (M13) — structural, on unconditionally

| Name | Value | Status |
|---|---|---|
| `TIER_FLOOR_SHARE_BASE` | 0 | **INITIAL GUESS** — zero on floor 1 by design |
| `TIER_FLOOR_SHARE_PER_LEVEL` | 0.08 | **INITIAL GUESS** |
| `TIER_FLOOR_SHARE_CAP` | 0.5 | **INITIAL GUESS** — floor never exceeds half the ceiling's own index |

No flag: `docs/backlog.md` batch note calls this a structural fix with an
obvious criterion, not an attempt on a ratio, so it ships on directly and
is guarded by a dedicated test rather than a reading.

A creature's tier index used to range from 0 (a rat, on any floor) up to
the floor's own ceiling — position within the map decided where in that
range, but the floor of the range itself never moved. `tierFloorShare` is
a SHARE of the ceiling's own index (`floor(tierFloorShare × ceilingIndex)`),
not an absolute value, so the tier floor can never exceed the ceiling at
any depth, however far the ceiling itself has climbed.

The final DRAWN SLOT is clamped, not the roll's centre index — the centre
alone is not enough, because `monsterWeightsAround`'s own spread (spec
quirk 9.2) reaches slot 0 from a centre as high as 2. Measured, not
assumed: the first cut clamped only the centre and rats still appeared past
where they were meant to stop.

Measured (self-tested): the tier floor first excludes rats (`minIndex`
reaches 1) at floor 5, and lowest tier seen rises 1 → 1 → 2 → 3 → 3 across
floors 1, 3, 5, 7, 10.

## Tier ceiling (M24) — structural, on unconditionally

| Name | Value | Status |
|---|---|---|
| `TIER_CEILING_SHARE_BASE` | 0 | **INITIAL GUESS** — zero on floor 1, no slack at all |
| `TIER_CEILING_SHARE_PER_LEVEL` | 0.08 | **INITIAL GUESS** — same rate as `TIER_FLOOR_SHARE_PER_LEVEL` |
| `TIER_CEILING_SHARE_CAP` | 0.5 | **INITIAL GUESS** — never more than half the spread's own ±2 reach |

Mirrors M13 exactly, the other direction. `difficultyScale`'s ceiling
index is a CENTRE, not a cap — `MONSTER_WEIGHTS`'s own ±2 spread (spec
quirk 9.2) reaches past it freely, so floor 1 (centre index 3) could roll
wolf (index 4, 17% of draws) or ogre (index 5, 8%) — against an unarmed
10 hp hero, one wolf is three quarters of their health in a single
creature, on a floor holding five. `docs/backlog.md` M24 found this while
sizing M19's compensation and named it "the ceiling is a centre, not a
cap": nobody had done for the top what M13 did for the bottom.

Same lesson M13 learned mid-build, mirrored: the DRAWN SLOT is clamped,
not the centre — clamping the centre alone does nothing, since the spread
still reaches past it. `tierCeilingShare` is a SHARE of the spread's own
maximum reach (±2), so `maxIndex = ceilingIndex + floor(tierCeilingShare
× 2)` can never itself introduce a slot the spread could not already
reach, and by construction never falls below `ceilingIndex`.

Measured (n=60/floor, `tierCeilingShare` forced to 1 for "before" — the
old, effectively unclamped behaviour, since the spread never reaches past
±2 anyway):

    floor 1    highest tier seen    5 -> 3   (a drop of two indices, as asked for)
    floor 1    mean xp              2.73 -> 2.58
    floor 1    mean threat mass     33.35 -> 26.92
    floor 5    mean xp              3.27 -> 3.17
    floor 5    mean threat mass     75.57 -> 67.83
    floor 10   mean xp              5.11 -> 5.05
    floor 10   mean threat mass     277.4 -> 276.7

Floor 1 absorbs almost all of the change — mean xp barely moves, as
predicted, but mean threat mass (which weighs the wolf/ogre tail, not
just the average) drops nearly 20%. Floor 10 is almost untouched: its one
index of allowed slack already covers nearly all of the natural ±2 reach
at that depth. `spread within a floor` (the `run-shape.html` diagnostic)
was not independently re-measured this session.

## A guardian at the shrine (M14) — structural, on unconditionally

No new constant — nothing to tune, so nothing lives in `balance.js` for
this one. Exactly one creature ends up adjacent to the shrine on every
floor, at or above every other creature the floor ended up holding
(computed AFTER M3's rare reskin, not assumed from the ceiling alone, since
M3 can push a different monster past it). Replaces an existing roster
member — reuses whichever is already closest, or relocates any surplus
already-adjacent monster away — so the budget M7/M12 spend does not move.
Verified 750 floor/seed combinations, zero misses. See `docs/backlog.md`
M14 and `docs/rogule-spec.md` §13.8.

## Loot rooms have a guard (M15) — structural, on unconditionally

| Name | Value | Status |
|---|---|---|
| `CHEST_GUARD_RADIUS` | 8 | **SETTLED** — swept 4/6/8/10/12, see reasoning below |

Every chest without a live creature within `CHEST_GUARD_RADIUS` tiles gets
one, by relocating the nearest existing monster — reuses the roster,
M12's budget, not this item's. Never crosses the spine/side line (the
target tile and the monster moved both have to already be in the chest's
own zone), and never touches M14's shrine guardian.

**Swept, not guessed.** 4 left floor 1 at 39% coverage and floor 3 at 46%
— nowhere near "high". Raising the radius keeps helping past 8 (floor 1
reaches 74% at 12), but 12 is a third of the 32×32 map — not "short" by
any reading of the word. Landed on 8: floors 7 and 10 reach ~99% there,
and pushing wider buys shallow floors little at real cost to what "short"
means.

**Floor 1 does not reach "high" at any reasonable radius, and the reason
is not radius.** Floor 1 holds only 2–3 creatures against 6 flat chests
(`CHESTS_PER_FLOOR`, unrelated to monster count) — even an unlimited
radius cannot make 2 monsters simultaneously near 6 chests scattered
across separate rooms. Measured coverage by floor at the shipped radius:
1→56%, 3→64%, 5→79%, 7→99%, 10→99% — rising with depth as the roster
grows, not flat as the item's own wording hoped. Disclosed rather than
chased further: fixing it would mean adding creatures, which is
explicitly M12's budget, not this item's to spend.

## Bigger rooms, shorter corridors (M16) — structural, on unconditionally

See the World table above for the three values. No flag — plumbing
(`roomWidth`/`roomHeight`/`corridorLength`/`dugPercentage`) added to
`generateMap`/`newGame` so this could be swept at all; previously
`generateMap` was never called with an options object anywhere, so
`dugPercentage`'s own override was dead code.

**Swept together, not picked alone** — 32×32 map, ROT.js Digger, n=100:

| config | room area | corridor length |
|---|---|---|
| old (unset room size, `[1,5]` corridors) | 21.9 | 2.69 |
| **shipped** (`[5,9]×[4,7]` rooms, `[1,3]` corridors) | 35.8 | 1.91 |

Spine share checked at every floor where the split is attempted
(`MIN_ROSTER_FOR_SIDE` and up): stayed in `[0.6, 0.95]` at the shipped
config — floors 4–10 ran 0.83–0.91. Bigger rooms alone, measured, PUSH
spine share UP (less warren, not more) — the risk the item worried about
did not materialise from room size; raising `dugPercentage` is what
would have caused it, and it stayed at 0.15, unmoved.

**A pre-existing M14 bug, found by this item's map change and fixed here,
not just noted.** `M14`'s guardian tier was computed as `max(ceilingIndex,
highest index among every OTHER creature)`, which silently downgraded the
guardian back to the ordinary ceiling whenever M3's rare reskin happened to
land on the same monster M14 later chose as guardian — M14 ran after M3
and never checked the guardian's own pre-existing tier. Caught because the
new map shape changed which seeds hit that overlap, breaking two M3 tests
that were unrelated to M16's own map-generation change. Fixed: the
guardian's own current index now counts too, so it is never rebuilt lower
than it already was.

## Pay for the harder opening with loot (M19) — gated by a flag since

| Name | Value | Status |
|---|---|---|
| `EARLY_CHEST_QUALITY_BOOST` | 0.5 | **INITIAL GUESS**, kept as a minor addition — see below |
| `GUARANTEE_FIRST_WEAPON` | `false` | **OFF by M29** — floor 1 softened through generation instead, see the M25 section's M29 subsection |

M17 raised floor 1 to ~5 creatures and M18 made the bottom tier bite; the
hero meets that with 10 hp and no weapon, dealing 0.83 hp/turn instead of
~2.5 with one. The item's own arithmetic named which of its two levers
would actually matter: *"richer chests further in do not help a hero that
dies on the way to them — a weapon does. Start with the guaranteed-weapon
lever, not the cheap one."*

**The cheap lever, built anyway, measured too weak alone.**
`EARLY_CHEST_QUALITY_BOOST` adds to `depth` before it reaches
`itemWeights`'s `quality` argument (clamped to 1), fading as
`EARLY_CHEST_QUALITY_BOOST / level` so it is strongest on floor 1 and
roughly a tenth of that by floor 10. Measured: on floor 1's small maps,
position-based `depth` already saturates most chests close to "quality 1"
even before any boost, so only ~1-3.5% of floor-1 maps see any item
actually change identity (dagger → axe) — nowhere near enough to move
the death-floor distribution on its own. Kept anyway: real, harmless,
free (reuses the existing quality mechanism, no new constant needed
beyond the one dial).

**The lever that actually matters: a guaranteed weapon near the spawn.**
Fires whenever the hero is carrying no weapon at all (checked against
`counts.carry`, so an already-armed descent past floor 1 is untouched) and
converts the chest nearest the hero into a guaranteed, never-empty weapon —
reuses the existing chest budget rather than adding one, same pattern as
M14's guardian and M15's chest guard. Which weapon (dagger vs axe) still
goes through the same quality dial as every other chest, including the
boost above; restricted to `dagger` only since M26 (see that section).

**Gated by `GUARANTEE_FIRST_WEAPON` — shipped `true`, now `false` since
M29.** Shipped "structural, no flag" in M19 itself — the owner asked
afterwards to be able to switch it off and measure what an unweighted
opening actually costs, rather than only being able to argue about it.
`false` leaves the nearest chest to the ordinary roll, same as every
other chest; since M26 that roll never holds a weapon at all (chests
draw `armour`/`potion` only — see the M26/M27 sections), so with the
flag off an unarmed hero's opening chest is exactly as likely to arm
them as any other chest is: not at all, until a kill hands one over. M29
turned it off for good, compensating through generation instead — see
the M25 section's own M29 subsection for the full result, including why
it does not decisively beat what the guarantee bought.

**Measured when this shipped, n=40, same seeds before/after, real bot via
`playDungeon` — SUPERSEDED, kept for the record rather than deleted.**
This was the reading at the time M19 shipped the guarantee. Both this
gap and the guarantee-ON baseline it is measured against have since
drifted (M3, `REVERSAL_PENALTY`, a bot-side shrine rule change, and
finally M29 turning the flag off) — see M29's own subsection for the
current numbers instead of extrapolating from this one:

    mean death floor         1.75  ->  2.70
    share dying by floor 2   80%   ->  65%

Runs reaching floor 6-10 appeared for the first time in this sample
(none did before). No run cleared floor 10 in either sample at this size
— too small to see clears, not evidence either way. `run-check.html`'s
`finishes` is the number to watch going forward for the item's own
worry: richer early gear carries down the whole descent, and a fix sized
for floor 1 could make floors 5-10 too easy.

## Defensive progression (M6)

| Name | Value | Status |
|---|---|---|
| `HP_FROM_KILLS` | `false` | **BUILT, NOT ADOPTED** — briefly on, then reverted by the owner. See `docs/backlog.md` M6 |
| `HP_GRANT_PER_KILLS` | 2 | **INITIAL GUESS**, mirrors `KILLS_PER_XP` |
| `HP_GRANT_AMOUNT` | 1 | **INITIAL GUESS**, calibrated against the buffer target below |

The mechanism shipped, was reviewed, and its own numbers failed the item's
original bounds at the shipped rate: buffer still falling (0.910, short of
the ≥1.00 bar) and real-bot finish rate at 56.7%, outside the then-15–40%
band. **Adopted anyway on review 2**, because no rate in the sweep below
clears both bounds and the smaller rates are strictly worse — they pay the
same finish-rate cost while buying back nothing on buffer. The choice was
never which rate; it was progression or none, and progression was chosen.

"Provisional" is specific: the ≥1.00 buffer target is itself now suspect —
the same grant read +0.095 buffer on the (dumb, danger-blind) probe against
+26 points of finish rate on the real bot, which the probe cannot exploit
the way a competent bot can. That gap is open on I5, not settled here. The
flag is on so downstream map work is measured against the baseline the game
actually ships — not a claim that 0.910 is the final word.

Every `HP_GRANT_PER_KILLS` kills, both `hpMax` **and** current `hp` rise by
`HP_GRANT_AMOUNT` — same cadence as `KILLS_PER_XP`'s xp grant, same place in
`playerAttacks` (`combat.js`), same modulo-on-kill-count shape. Deliberately
not a new system: one constant, reusing machinery already there.

**Why both bars, not just the ceiling.** There is no regeneration (below).
A hero who gains ceiling without gaining current hp arrives at every floor
exactly as hurt as before — the *measured* buffer (taken from the hero on
arrival, not its theoretical max) would barely move. This is why M6 is
partly a healing mechanic, even though healing was deliberately removed in
§13.1 — see the fidelity note there for why that removal does not apply
here: this supply is finite and earned by killing, not free and earned by
waiting, so it cannot be camped.

**Why kills, not floors or turns.** Turns can be camped (§13.1's whole
argument). Floors would grant the same hp whether the floor cost two kills
or twenty, decoupling the grant from the thing that is actually eroding the
buffer. Kills are the resource already being spent to survive, so the grant
scales with the danger actually faced.

**Measured — the target is not reached, and the shortfall is disclosed
rather than hidden.** Full bracket and method in `docs/backlog.md` M6
result; headline:

```
rate (hp/kill)   buffer ×/floor (fl 1-6)   real-bot clear rate (n=150, paired)
0     (off)      0.846 ±0.026              30.7% ±3.8
0.125 (per=8)    0.857 ±0.022  (n.s.)      44.7% ±4.1
0.25  (per=4)    0.895 ±0.022  (n.s.)      48.0% (n=80, different sample)
0.5   (per=2)    0.910 ±0.015  (z≈2.1)     56.7% ±4.0   <- SHIPPED, flag ON
```

Only the `per=2` rate clears 2σ on buffer, and it still **falls**
(0.910 < 1), nowhere near the ~1.16 target — while clear rate nearly
doubles. Smaller rates protect clear rate only a little and buy back
essentially no buffer (0.125 and 0.25 are not distinguishable from off).
There is no point in the tested range where both acceptance criteria hold;
shrinking the grant trades one shortfall for a bigger one on the other axis
rather than resolving the tension. Adopted anyway (see the table above) —
reviewed and confirmed, not silently picked, and provisional on I5.

## Regeneration

| Name | Value | Status |
|---|---|---|
**There is none, from time.** Rogule healed +1 hp every 100 turns, uncapped;
we removed it outright (spec §13.1). Waiting heals nothing. Two sources of
hp exist: a potion (falls off monsters only), and the kill-triggered grant
above — both are earned by acting, neither by waiting.

We tried a cap first (20% of max hp per run). It worked, but it was
machinery guarding a resource we did not want to exist.
The original has no cap, which lets a bot camp in a cold zone and heal
forever. With `PLAYER_HP` 10 the cap is 2 HP per run, and spending it all
costs 200 turns.

These two numbers are coupled: together they decide whether the cap is even
reachable in a typical run. Tune them as a pair, never alone.

## Combat

| Name | Value | Status |
|---|---|---|
| `HIT_CHANCE` | 5/6 | FAITHFUL (`engine.cljs:257`) |
| damage roll | uniform `0 .. attacker.xp - 1` | FAITHFUL (`engine.cljs:258`) |
| damage formula | `(roll + weapons) * hit` | **DIVERGES** — see spec §13.2 |

The defender no longer enters the damage formula: armour became extra max
hp rather than damage reduction, so gear buys blows absorbed instead of
blows softened. Rogule's original was `max(0, (roll + weapons - armour) * hit)`.

## Monsters

FAITHFUL — `generator.cljs:76`, except row 0 (M18, below). `xp` is both the
damage stat and the number drawn above the monster's head.

| # | Name | Emoji | `activation` | `xp` | `hp` |
|---|---|---|---|---|---|
| 0 | rat | 🐀 | 8 | 2 | 2 |
| 1 | bat | 🦇 | 10 | 2 | 3 |
| 2 | ghost | 👻 | 10 | 3 | 3 |
| 3 | boar | 🐗 | 15 | 3 | 4 |
| 4 | wolf | 🐺 | 20 | 4 | 5 |
| 5 | ogre | 👹 | 10 | 4 | 7 |
| 6 | zombie | 🧟 | 5 | 5 | 9 |
| 7 | vampire | 🧛 | 15 | 6 | 8 |
| 8 | genie | 🧞 | 20 | 6 | 10 |
| 9 | dragon | 🐉 | 10 | 8 | 15 |
| 10 | t-rex | 🦖 | 15 | 10 | 12 |

| Name | Value | Status |
|---|---|---|
| `MONSTER_SKIP_CHANCE` | 0.10 | FAITHFUL (`engine.cljs:353`) |
| `MONSTER_DROP_CHANCE` | 0.50 | FAITHFUL (`generator.cljs:275`) |
| `MONSTER_DIFFICULTY_SCALE` | 0.75 | FAITHFUL (`generator.cljs:262`) |
| `MONSTER_WEIGHTS` | offset 0→6, ±1→2, ±2→1 | FAITHFUL (`generator.cljs:267`) |
| `MONSTERS_ATTACK_WHEN_ADJACENT` | `false` | **OFF** — measured to change almost nothing |

Weights are summed on collision at the table edges, which is our fix for
spec quirk §9.2 — the original overwrites and makes the target monster
*less* likely than its neighbour.

**Row 0 (M18) — DIVERGENCE from FAITHFUL `activation 3, xp 1, hp 2`.** At
xp 1 the damage roll (`0..xp-1`) is exactly `0..0` — not a weak creature,
one that could never land a blow, skipped by `threat.js`'s danger field
and priced at 0 by `duelCost`. Raised to xp 2 (can hit, expected damage
0.42) and activation 8 (chases; was 3, barely woke). hp held at 2. Kept
strictly below `bat` (xp 2, activation 10, hp 3) on two of three so the
two rows stay distinct rather than becoming interchangeable. Mass
(`hp × (xp−1)`) goes from 0 to 2 — the bottom tier stops being free, which
raises shallow-floor cost and is exactly what `docs/backlog.md` M11's
`expectedFloorMass` test exists to catch if it ever broke monotonicity;
it did not (9.81 → 164.91 across floors 1–10, checked). See
`docs/rogule-spec.md` §13.11.

`MONSTERS_ATTACK_WHEN_ADJACENT` off is FAITHFUL: a monster attacks by
moving into the player, so standing beside one is only dangerous when it
actually steps in. Measured over 50 floors: on gives byte-identical results
to off, since an adjacent monster is two path steps away, under every
`activation` in the table (the smallest is 3) — adjacency already means
being attacked either way. Kept as a switch so the equivalence stays
re-checkable, not because flipping it does anything.

## Items

**The table below was stale** — it listed Rogule's ORIGINAL item pool
(chestnut, mushroom, gem-stone), none of which exist in `ITEM_TABLE` any
more (`src/sim/balance.js` — DIVERGENCE: they were scenery for the
original's share card, which this game does not have, and were replaced
with nothing rather than kept as junk). Corrected to the actual table,
documented here for the first time.

Pick weight is `1 / value` at quality 0, so a high `value` means a **rare**
item — see `spawn.js`'s `itemWeights` for the full formula, which also
tilts by depth or by the killed creature's tier (`CHEST_QUALITY_BY_DEPTH`)
and by scarcity (`SCARCITY`/`WEAPON_SCARCITY`/`POTION_SCARCITY` dials,
`src/sim/difficulty.js`). No fixed probability column below for that
reason — the split isn't a static pool any more.

| Item | Emoji | `value` | `kind` | Effect |
|---|---|---|---|---|
| health | 🥃 | 2 | potion | +3 HP (`POTION_HEAL`), capped at max — chests only |
| shield | 🛡️ | 3 | armour | **+3 armour** — a second bar, and it is spent — chests only |
| dagger | 🗡️ | 3 | weapon | +1 damage — monster drops (any tier), or chests via M19's guarantee only |
| axe | 🪓 | 4 | weapon | +2 damage — monster drops, tier >= `WEAPON_AXE_MIN_TIER` only |

**`kind` decides the source, not just a label — and M26/M27 (docs/backlog.md)
moved which source holds which, one kind at a time.** `itemWeights('chest',
...)` draws from `armour` and `potion` (shield, health); `itemWeights(
'monster', ...)` draws from `weapon` only (dagger, axe). Before M26,
weapons were the chest side's and potions the monster side's — both moves
were full swaps, not additions, and each was measured on its own before
the next was allowed to touch it (M27 was explicitly blocked from shipping
"with" M26, only "after" it — see `docs/backlog.md` M27). A chest can
still hold a weapon exactly once per descent: M19's own guarantee
(`spawn.js` step 4b) converts the nearest chest to a forced `dagger`,
never an `axe`, when the hero is unarmed — a deliberate exception to the
kind rule above, not a second source.

**Removing `potion` from monster's kind list had a side effect on
`weapon`, and it was measured rather than assumed away.** `itemWeights`
splits each source's mass evenly across its own kinds
(`shareEach = 1/kinds.length`) — with `weapon` as monster's only kind now,
`shareEach` doubled from 1/2 to 1/1, so weapon supply would have doubled
too at M26's unchanged scarcity. `WEAPON_SCARCITY` was raised 2 → 4 in the
same commit to cancel it out, holding M26's own already-measured
cumulative weapon damage rather than letting M27 silently move it. See
`WEAPON_SCARCITY`'s own comment in `difficulty.js` for the numbers.

| Name | Value | Status |
|---|---|---|
| `POTION_HEAL` | 3 | FAITHFUL (`engine.cljs:209`) |
| `CHEST_DIFFICULTY_SCALE` | 0.9 | FAITHFUL (`generator.cljs:238`) |
| `CHEST_LOOT_RICHER_FAR` | `true` | **INITIAL GUESS** |
| `CHEST_QUALITY_BY_DEPTH` | `true` | **INITIAL GUESS** |
| `CHEST_TABLE` | `[{ chest, 📦 }]` | **DIVERGENCE** — see below |
| `ITEM_TABLE` | 4 rows, above | **DIVERGENCE** — chestnut/mushroom/gem-stone removed |

`CHEST_LOOT_RICHER_FAR` is our fix for spec quirk §9.3.

- `true` (ours) — chests further from the player are **more** likely to hold
  loot, sweeping from 10% next to the spawn up to 100% at the far end.
- `false` — the original's behaviour, the same sweep in reverse.

Both directions chest the same probability range, so flipping it does not
change how much loot a map holds on average, only where it sits.

`CHEST_QUALITY_BY_DEPTH` makes depth buy BETTER loot, not merely more of
it. Off, a deep chest is likelier to hold something but draws from the same
pool as one by the front door. On, the within-kind weight becomes
`value^(2·depth − 1)`, so the axe is rare at the entrance, even money
halfway, and the common outcome at the shrine.

`CHEST_TABLE` is one row (`chest`, 📦) — DIVERGENCE: Rogule dresses these
as scenery (potted plant, rock, wood block) because there they are cover
the player kicks over. Here they are the reward container the map design
is built around, so they look like what they are. Still a table with one
row rather than a bare constant, so the pick still burns one RNG draw and
the streams stay aligned with runs recorded before the rename.

## Bot

Not used until P3. Listed here so there is one place to look.

| Name | Value | Status |
|---|---|---|
| `BOT_KNOWS_MONSTER_COUNT` | `true` | decided — see bot-strategy §4.1 |
| `STEP_COST_IN_HP` | 0.01 | **INITIAL GUESS** |
| `GOAL_STICKINESS` | 1.4 | **INITIAL GUESS** — raised from 1.15, see below |
| `UNKNOWN_MONSTER_ESTIMATE` | `{ xp: 4, hp: 7 }` | **INITIAL GUESS** |
| `CHEST_LOOT_CHANCE` | 0.60 | measured over 150 maps |
| `LOOT_CAMPAIGN_HORIZON` | 0.5 | **INITIAL GUESS** |
| `HOLD_RANGE` | 5 | **INITIAL GUESS** |
| `EXPOSURE_WEIGHT` | 0.5 | **INITIAL GUESS** |
| `REVERSAL_PENALTY` | 6 | **RAISED by B3** — the old verdict was measured on the wrong statistic, see below |
| `FRONTIER_REVEAL_WEIGHT` | 0.00002 | **B10 — built, measured inert, kept OFF (`frontierRouting`)**, see below |

`UNKNOWN_MONSTER_ESTIMATE` stands in for a monster the bot has not met yet.
It knows how many are unaccounted for but not what they are, and gear has
to be priced against them too — otherwise the bot values a shield at zero
in exactly the moment it should be stocking up. The values are the median
of `MONSTER_TABLE`, which happens to be the ogre.

`CHEST_LOOT_CHANCE` is what the bot assumes when deciding whether opening
a chest is worth the two turns it costs. Measured, not guessed, but it will
move if `CHEST_LOOT_RICHER_FAR` or the chest count changes.

`LOOT_CAMPAIGN_HORIZON` is what share of the REMAINING descent the bot
prices gear against. A sword taken on floor 3 is swung on floors 4–10, so
valuing it against floor 3 alone ignores the long game the map design is
built around — but counting all seven floors ahead at face value assumes
the hero survives to swing it, and only about 45% of dungeons are cleared.
0.5 is that clear rate rounded, used as a plain discount rather than a
modelled survival curve. At 0 the bot is myopic, which is how every
measurement before this item was taken.

`HOLD_RANGE` is how close a hunter must get before the bot stops walking
out to meet it and lets it come instead. Waiting costs no tempo — monsters
move after the player, so whoever closes the last tile, the player still
strikes first.

`EXPOSURE_WEIGHT` is how much an open tile multiplies the danger already on
it — a tile with four ways in is charged `(1 + 3 × this)` times its
menace, a dead end is charged plain. This is what makes the bot SEEK
corridors when hunted rather than merely tolerate them (bot-strategy §2).

`REVERSAL_PENALTY` charges hp for undoing the step just taken, meant to
stop the two-turn ping-pong where the plan says "attack", the veto refuses
and steps aside, then the plan says "go back" and the veto agrees. Traced
(bot-strategy §4.5): 61–64% of reversal episodes come from the TACTICAL
VETO overriding a stable goal, not from goal selection flipping.

`FRONTIER_REVEAL_WEIGHT` discounts a candidate tile's step cost, toward an
already-CHOSEN frontier goal only, by how much already-seen fog it would
graze — `wouldReveal`, scored only over tiles already in `belief.tiles` so
the discount cannot be earned by stepping onto ground never confirmed
walkable (that optimism is exactly what B3 found breaks route commitment).
Sized so the discount never exceeds half of `STEP_COST_IN_HP` even at the
theoretical maximum reveal — a pure tie-breaker, never a re-rank. Behind
`frontierRouting`, default OFF: measured n=60 on two seed families and
found essentially inert (every number identical to three figures on the
primary family) — a weighted-dijkstra shortest path on a real map almost
never has a second route of exactly equal cost to break a tie between, so
the discount rarely has anything to decide. Wall bumps did not rise on
either family, so the mechanism is not harmful, just rarely consulted —
same shape as B4's `exploreValue`. Kept rather than deleted, same house
rule as `chokepoint`/`exposurePricing`/B4's own flags.

**Shipped at 0 for a long time on a verdict that was wrong, and the error
is the useful part.** The old sweep read the POOLED reversal RATE
(0.238 → 0.205, "does not fix what it targets") — and B3 showed that
statistic is mostly a measurement of RUN LENGTH, not of dithering. A run
that dies early dithers less in absolute terms and scores well for the
wrong reason.

**Raised to 6 by B3** (`docs/backlog.md`), judged on the DISTRIBUTION —
turns spent inside reversal episodes — on top of B3's goal-layer fix,
n=60, two independent seed families:

| | seeds 800000: 0 → 6 | seeds 910000: 0 → 6 |
|---|---|---|
| turns inside episodes | 21.4% → **9.2%** | 25.5% → **7.5%** |
| pooled rate | 23.6% → 16.0% | 27.2% → 14.8% |
| median run's share | 9.0% → 5.6% | 5.5% → 2.8% |
| runs with an episode | 81.7% → 68.3% | 66.7% → 58.3% |
| veto-layer episodes | 135 → **0** | 150 → **0** |
| actions per run | 509 → 589 | 428 → 376 |
| finishes | 6.7% → 6.7% | 0% → 0% |
| median depth | 4 → 4 | 4 → **3** |

**The two families move run length in opposite directions and agree
anyway** — one gets 16% longer, the other 12% shorter, while turns inside
episodes falls by more than half in both. That opposition is what makes
this a dithering result rather than a length artefact. Veto-layer episodes
reaching exactly zero on both is a mechanism check, not a rate.

**The cost the old sweep reported did not reproduce** — finishes are
identical on the primary family and zero either side on the confirmation
family.

**Watch: median depth 4 → 3 on the confirmation family**, against 4 → 4 on
the primary. That is the one wobble to hold against this if depth slips
later.

### How to tune these

`run-ruler.html`/`run-lab.html`/`run-batch.html` were deleted with I8 —
`descentCheck` (`src/analysis/clustering.js`) is what a self-check calls
directly now; see `docs/backlog.md`'s GOAL_STICKINESS note for an example.
Sweep a setting across paired seeds so the comparison is apples to apples.

Two rules learned the hard way:

- **Confirm on seeds you did not tune against.** `DANGER_FALLOFF` 0.4
  looked best on seeds 400–479 and worst on 500–544. At 45–80 runs the
  confidence intervals still overlap enough to flip the ranking.
- **Read the behaviour columns, not just the win rate.** Win rate mixes bot
  quality with map difficulty; damage and blows per kill do not. Where win
  rate flapped between seed families, damage per kill fell monotonically
  with higher `DANGER_FALLOFF` in every family — that is the real signal.

### Danger and fighting

| Name | Value | Status |
|---|---|---|
| `DANGER_FALLOFF` | 0.5 | **INITIAL GUESS** |
| `CROWD_PENALTY` | 6 | **INITIAL GUESS** |
| `DUEL_SAFETY_MARGIN` | 0.7 | **INITIAL GUESS** |

`DANGER_FALLOFF` is how fast a monster's menace fades per tile. Lower makes
the bot bolder about squeezing past; higher makes it give a wide berth.
It is the single biggest lever on routing behaviour.

`CROWD_PENALTY` prices rule R2 — being reachable by two monsters at once.
It is a price rather than a ban because a ban can leave a goal unreachable.

### Tactical search (off by default)

| Name | Value | Status |
|---|---|---|
| `TACTICAL_DEPTH` | 1 | one turn of lookahead — deeper searches optimise for never closing, see bot-strategy §4.4 |
| `TACTICAL_RANGE` | 4 | **INITIAL GUESS** |
| `TACTICAL_OVERRIDE_MARGIN` | 0.5 | **INITIAL GUESS** |

These only matter with `tactical: true`, which is **off** — the search was
built, measured, and did not pay for itself. See bot-strategy §4.4 before
switching it on.

`STEP_COST_IN_HP` is the practical form of the λ dial from bot-strategy §0.
At 0.01 the bot walks 100 extra steps to save 1 hp. Raise it and it gets
hasty and reckless; lower it and it gets patient and slow. This is the
knob that shows up as personality on screen, and the main thing P4 sweeps.

`GOAL_STICKINESS` stops the bot dithering between two near-equal targets:
a new one has to be 40% better before it switches, raised from 15% — at
15% a new target only needed to be a little better to win, which was not
much stickiness at all.

**Only covers `monster` targets.** `chooseGoal` (`bot.js:314`) checks
`current.kind === 'monster'` before applying the stickiness comparison at
all — chest and item goals (`bot.js:270`, step 1) are re-picked by plain
best-net-value every single call, with no reference to the current target
and no hysteresis whatsoever. The real fix there would be extending the
hysteresis check to loot goals — not attempted here, reported instead.

**Self-checked (work agent, not a metrics-agent reading), and the null
result confirmed rather than assumed.** `descentCheck` (`clustering.js`),
12 runs, firstSeed 800000, paired: 1.15 and 1.4 produced BYTE-IDENTICAL
output on every field — reversal rate 44.56%, depths reached, kills, event
gaps, all of it. Not a caching artifact; the live `GOAL_STICKINESS` value
was read back from the module on each pass to confirm the edit had taken.
Consistent with the caveat above — these seeds' decision sequences never
turned on the 15%-vs-40% threshold for a `monster` target, so there was
nothing for the raise to move. A real read needs either more seeds or the
loot-goal extension; this one self-check does not distinguish "raise did
nothing" from "these 12 runs never hit the case it affects".
