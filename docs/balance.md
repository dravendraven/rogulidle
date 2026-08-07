# Balance — single source of truth for every tunable number

## The whole difficulty model, in three constants

There is no calibration table any more. A floor is described by how many
creatures it holds, and everything else is a constant:

```
monsters(N) = 2 × 1.3^(N-1)    2, 3, 3, 4, 6, 7, 10, 13, 16, 21
chests      = 6                flat, every floor
strength    = 0.35             how far up the monster table a floor reaches
```

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

## Strength ramp — the second way difficulty could grow

| Name | Value | Status |
|---|---|---|
| `STRENGTH_GROWTH` | 1.0 | **INITIAL GUESS** — 1.0 means OFF |

Lives in `src/sim/difficulty.js` beside `MONSTER_STRENGTH`, following the
convention already set there for the difficulty-model constants.

`strength(N) = MONSTER_STRENGTH × STRENGTH_GROWTH^(N−1)`, so at 1.0 every
floor keeps the flat 0.35 and nothing changes.

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
| `CORRIDOR_LENGTH` | `[1, 5]` | FAITHFUL (`generator.cljs:146`) |
| `VISIBLE_DIST` | 9 | FAITHFUL (`ui.cljs:27`) |
| `CLEAR_DIST` | 7 | FAITHFUL (`ui.cljs:29`) — cosmetic only |
| `CHEST_COUNT` | 15 | FAITHFUL (`generator.cljs:326`) |
| `MONSTER_COUNT` | 5 | FAITHFUL (`generator.cljs:326`) |

`MONSTER_COUNT` and `CHEST_COUNT` are the first dials to reach for in P4.
Five monsters on a 32×32 map is very sparse — see spec §10.2.

## Player

| Name | Value | Status |
|---|---|---|
| `PLAYER_HP` | 10 | FAITHFUL (`generator.cljs:216`) |
| `PLAYER_XP` | 3 | FAITHFUL (`generator.cljs:26`) |
| `XP_PER_KILLS` | 1 xp every 2 kills | FAITHFUL (`engine.cljs:272`) |

## Regeneration

| Name | Value | Status |
|---|---|---|
**There is none.** Rogule healed +1 hp every 100 turns, uncapped; we removed
it outright (spec §13.1). Waiting heals nothing, so the only source of hp is
a potion, and potions only fall off monsters.

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

FAITHFUL — `generator.cljs:76`. `xp` is both the damage stat and the number
drawn above the monster's head.

| # | Name | Emoji | `activation` | `xp` | `hp` |
|---|---|---|---|---|---|
| 0 | rat | 🐀 | 3 | 1 | 2 |
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

Weights are summed on collision at the table edges, which is our fix for
spec quirk §9.2 — the original overwrites and makes the target monster
*less* likely than its neighbour.

## Items

FAITHFUL — `generator.cljs:28`. Pick weight is `1 / value`, so a high
`value` means a **rare** item.

| Item | Emoji | `value` | weight | probability | Effect |
|---|---|---|---|---|---|
| chestnut | 🌰 | 1 | 1.000 | 32.9% | none (collectible) |
| mushroom | 🍄 | 2 | 0.500 | 16.4% | none (collectible) |
| health | 🥃 | 2 | 0.500 | 16.4% | +3 HP, capped at max |
| shield | 🛡️ | 3 | 0.333 | 11.0% | **+3 armour** — a second bar, and it is spent |
| dagger | 🗡️ | 3 | 0.333 | 11.0% | +1 damage |
| axe | 🪓 | 4 | 0.250 | 8.2% | +2 damage |
| gem-stone | 💎 | 8 | 0.125 | 4.1% | none (collectible) |

| Name | Value | Status |
|---|---|---|
| `POTION_HEAL` | 3 | FAITHFUL (`engine.cljs:209`) |
| `CHEST_DIFFICULTY_SCALE` | 0.9 | FAITHFUL (`generator.cljs:238`) |
| `CHEST_LOOT_RICHER_FAR` | `true` | **INITIAL GUESS** |

`CHEST_LOOT_RICHER_FAR` is our fix for spec quirk §9.3.

- `true` (ours) — chests further from the player are **more** likely to hold
  loot, sweeping from 10% next to the spawn up to 100% at the far end.
- `false` — the original's behaviour, the same sweep in reverse.

Both directions chest the same probability range, so flipping it does not
change how much loot a map holds on average, only where it sits.

## Bot

Not used until P3. Listed here so there is one place to look.

| Name | Value | Status |
|---|---|---|
| `BOT_KNOWS_MONSTER_COUNT` | `true` | decided — see bot-strategy §4.1 |
| `STEP_COST_IN_HP` | 0.01 | **INITIAL GUESS** |
| `GOAL_STICKINESS` | 1.15 | **INITIAL GUESS** |
| `UNKNOWN_MONSTER_ESTIMATE` | `{ xp: 4, hp: 7 }` | **INITIAL GUESS** |
| `CHEST_LOOT_CHANCE` | 0.60 | measured over 150 maps |

`UNKNOWN_MONSTER_ESTIMATE` stands in for a monster the bot has not met yet.
It knows how many are unaccounted for but not what they are, and gear has
to be priced against them too — otherwise the bot values a shield at zero
in exactly the moment it should be stocking up. The values are the median
of `MONSTER_TABLE`, which happens to be the ogre.

`CHEST_LOOT_CHANCE` is what the bot assumes when deciding whether opening
a chest is worth the two turns it costs. Measured, not guessed, but it will
move if `CHEST_LOOT_RICHER_FAR` or the chest count changes.

### How to tune these

Open `/run-batch.html`, put the setting in "sweep" with a few values, and
run. Every value plays the same seeds, so the comparison is paired.

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
| `TACTICAL_DEPTH` | 3 | **INITIAL GUESS** |
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
a new one has to be 15% better before it switches.
