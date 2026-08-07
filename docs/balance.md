# Balance — single source of truth for every tunable number

> ⚠️ **The single-floor win-rate curve below predates the armour change**
> (spec §13.2) and needs re-measuring. The dungeon curve is current — see
> "the dungeon" immediately below.

## The whole difficulty model, in three constants

There is no calibration table any more. A floor is described by how many
creatures it holds, and everything else is a constant:

```
monsters(N) = 2 × 1.3^(N-1)    2, 3, 3, 4, 6, 7, 10, 13, 16, 21
covers      = 6                flat, every floor
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
rises**, so the hero is once more outgrowing the dungeon — six covers on a
three-creature floor is generous, and the gentle opening lets gear bank
cheaply. Covers are the obvious next lever, not the growth rate.

**Why count and not strength.** Clearing cost tracks `Σ hp × (xp − 1)`, so
individual strength scales cost quadratically — a strong monster hits harder
AND lasts longer, and those multiply — while count scales it linearly.
Linear is what a dial should be. Summing xp predicts nothing: six rats and
one genie both total 6, and one costs zero while the other costs 20.6.

**Why covers are flat.** Tying them to the creature count was tried and
fails: loot then grows at the same rate as threat, and since the hero
accumulates while each floor's threat is spent once, the hero wins. Measured
with `covers = monsters × 2`, floor ten handed over 64 items and capacity
reached 118 against a starting 10. Flat covers are what makes threat outpace
supply.

**Why strength is low.** At Rogule's 0.75 a floor with only two creatures
can still roll an ogre, and floor one killed 7 of 12 heroes. Strength still
varies WITHIN a map by distance from the entrance; what is fixed is the
ceiling.

Measured with these, 12 dungeons: 4 cleared, depths 2, 2, 2, 4, 5, 7, 7, 8,
10, 10, 10, 10. Capacity rises to 20.7 by floor 6 then grinds down to 10.8 by
floor 10 — the hero builds up and is worn away, which is the arc worth
having.

## The dungeon curve (previous, hand-tuned table)

Measured over 12 dungeons after armour became a spent second bar and passive
regeneration was removed. Net challenge is what the floor is expected to
cost divided by the hp+armour the hero walked in with; above 1.00 the floor
asks for more than the hero brought.

| floor | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| net challenge | 0.20 | 0.30 | 0.48 | 0.24 | 0.36 | 1.02 | 0.81 | 1.20 | 1.02 | 0.88 |
| deaths | 0 | 0 | 0 | 0 | 1 | 2 | 1 | 3 | 0 | 0 |
| capacity in | 10 | 11.3 | 14.6 | 16.3 | 19.7 | 17.9 | 18.9 | 15.5 | 15.0 | 17.6 |

5 of 12 dungeons cleared; depths 5, 6, 6, 7, 8, 8, 8, 10, 10, 10, 10, 10.

`LAST_LEVEL_DIFFICULTY` is 0.5, not 0.9. At 0.9 the net challenge crossed
1.00 by floor five and nobody reached the bottom — the dial has far more
bite now that floor cost genuinely climbs instead of being cancelled out by
stockpiled armour.

The wobble (floor 4 dips below floor 3) is sampling noise at n=12, not
structure. Re-measure with a different `firstSeed` before reading anything
into a single floor.

## The difficulty dial

One number, 0 to 1, sets how hard the floors are without touching the bot.
`src/sim/difficulty.js`; `index.html?difficulty=0.7` to watch it.

| dial | 0.00 | 0.25 | 0.50 | 0.75 | 1.00 |
|---|---|---|---|---|---|
| **win rate** | 95% | 70% | 45% | 17% | 0% |
| monsters | 3 | 5 | 6 | 9 | 22 |
| covers | 22 | 17 | 14 | 10 | 2 |
| difficulty scale | 0.35 | 0.6 | 0.75 | 0.9 | 1.0 |
| drop chance | 0.8 | 0.65 | 0.5 | 0.3 | 0.0 |

Measured over 30–40 held-out floors per point against bot v5. **Recalibrate
after any material change to the bot** — difficulty here is defined against
an opponent, not in the abstract.

Three things worth knowing before turning it:

- **Drop chance has to move too.** Piling on monsters also piles on their
  drops, so crowding the floor arms the player as well. Holding drops at 0.5
  the win rate bottomed out near 13% no matter how many monsters were added.
- **Roughly half of a run's outcome is combat dice, not the floor.** Playing
  the same map with nine different dice streams: 46.5% of the outcome
  variance came from the map, 53.5% from the rolls. Six maps out of 21 always
  gave the same result; seven were close to coin flips. So the dial sets a
  long-run rate, never a verdict on one run.
- **No formula from map features predicts much.** Correlations with winning
  top out around 0.3 (`optimalCost` −0.32, `gearPerThreat` +0.31, `sumXp`
  −0.30), and a fitted model reaches 64% accuracy against a 59% base rate.
  That is the dice ceiling above, not a modelling failure. Controlling
  generation works; predicting from it does not. `pressureOf()` in
  difficulty.js is the best single descriptive index if you want one.


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
| `COVER_COUNT` | 15 | FAITHFUL (`generator.cljs:326`) |
| `MONSTER_COUNT` | 5 | FAITHFUL (`generator.cljs:326`) |

`MONSTER_COUNT` and `COVER_COUNT` are the first dials to reach for in P4.
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
| `COVER_DIFFICULTY_SCALE` | 0.9 | FAITHFUL (`generator.cljs:238`) |
| `COVER_LOOT_RICHER_FAR` | `true` | **INITIAL GUESS** |

`COVER_LOOT_RICHER_FAR` is our fix for spec quirk §9.3.

- `true` (ours) — covers further from the player are **more** likely to hold
  loot, sweeping from 10% next to the spawn up to 100% at the far end.
- `false` — the original's behaviour, the same sweep in reverse.

Both directions cover the same probability range, so flipping it does not
change how much loot a map holds on average, only where it sits.

## Bot

Not used until P3. Listed here so there is one place to look.

| Name | Value | Status |
|---|---|---|
| `BOT_KNOWS_MONSTER_COUNT` | `true` | decided — see bot-strategy §4.1 |
| `STEP_COST_IN_HP` | 0.01 | **INITIAL GUESS** |
| `GOAL_STICKINESS` | 1.15 | **INITIAL GUESS** |
| `UNKNOWN_MONSTER_ESTIMATE` | `{ xp: 4, hp: 7 }` | **INITIAL GUESS** |
| `COVER_LOOT_CHANCE` | 0.60 | measured over 150 maps |

`UNKNOWN_MONSTER_ESTIMATE` stands in for a monster the bot has not met yet.
It knows how many are unaccounted for but not what they are, and gear has
to be priced against them too — otherwise the bot values a shield at zero
in exactly the moment it should be stocking up. The values are the median
of `MONSTER_TABLE`, which happens to be the ogre.

`COVER_LOOT_CHANCE` is what the bot assumes when deciding whether opening
a cover is worth the two turns it costs. Measured, not guessed, but it will
move if `COVER_LOOT_RICHER_FAR` or the cover count changes.

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
