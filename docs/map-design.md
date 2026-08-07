# Map design — the spine and its detours

The goal, in the owner's words: a floor should offer **one mostly-linear
mandatory path holding at least 70% of the threat mass**, plus **side rooms
worth about 30%** that can be skipped — fewer but nastier creatures, better
chests. Take the safe road, or gamble for gear you will want three floors
down.

## Nothing new is dug

The digger already produces maps with a route from hero to shrine and rooms
hanging off it. We simply never read that structure. `src/sim/spine.js` is a
**classification pass over a finished map**: a room is *spine* when the
hero→shrine path crosses its rectangle, *side* otherwise.

Because it only reads, it cannot fail to produce a floor, and it consumes no
randomness. The one generation change is `MAP_DUG_PERCENTAGE = 0.15` (ROT's
default is 0.2), which digs fewer and smaller rooms so that a mandatory path
exists at all — at 0.2 there were usually several equivalent ways through.

## One constant does the whole bargain

`SIDE_ROOM_DEPTH_BONUS = 0.35`. A side room is treated as if it sat that much
deeper than it is.

That single number is the entire risk/reward design, because **depth already
drives both halves**: it picks the monster tier *and* sets chest quality. Push
it up and detours get more dangerous and better paid, together. Set it to zero
and side rooms become ordinary.

Supporting dials:

| Constant | Value | What it does |
|---|---|---|
| `SPINE_THREAT_SHARE` | 0.7 | Share of threat **mass** on the mandatory route |
| `MIN_ROSTER_FOR_SIDE` | 4 | Below this, everything goes on the spine |
| `SIDE_CHEST_BIAS` | 3 | How much likelier a chest lands in a side room |
| `CHEST_QUALITY_BY_DEPTH` | true | Depth buys better loot, not just more |

**Mass, not headcount.** Cost tracks `hp × (xp − 1)`, so a floor can put 70% of
its *bodies* on the spine and still hide the dangerous half in a side room.
Placement is greedy against a running mass share, which converges without
needing to know the roster total in advance. Combined with the depth bonus this
produces the intended shape by itself: side rooms fill a smaller mass budget
with fewer, heavier creatures.

**Chest quality** is `value^(2·depth − 1)` within a kind — rare-strong at the
entrance, flat half way, and inverted at the shrine. At depth 0 it reproduces
the old `1/value` rule exactly, so the feature can be switched off and the pool
is provably unchanged.

`MIN_ROSTER_FOR_SIDE` exists because the split is too coarse on small floors:
with two creatures, one in a side room is already half the mass, which measured
68% and 63% spine on floors 1 and 3 against the 70% target.

## Measured — the structure is right

25 maps per floor:

| floor | spine mass | side rooms | side creatures | chests in side rooms |
|---|---|---|---|---|
| 1 | 100% | 29% | 0% | 45% |
| 3 | 100% | 29% | 0% | 45% |
| 5 | 70% | 29% | 23% | 45% |
| 7 | 73% | 29% | 22% | 45% |
| 10 | 74% | 29% | 18% | 45% |

Every floor meets the ≥70% requirement. Side rooms are 29% of rooms, holding
18–23% of the *bodies* but ~30% of the mass — fewer, stronger, as designed.
Chest drops shifted from 43% axes to 60% axes.

## Risk and reward roll separately

The first version gave every side room the same `SIDE_ROOM_DEPTH_BONUS`, which
meant **risk and reward were perfectly correlated**. Every detour offered the
same ratio, and a gamble with a fixed favourable ratio is not a gamble — it is
a free lunch, always correct to take. That is why forbidding, requiring and
permitting the detour all produced identical dungeons.

Each side room now draws two independent numbers over `[0, 2 × bonus]`: one
feeds the monster tier, one feeds chest quality. The **average** side room is
exactly where it was; individual ones range from a den of ogres guarding a
dagger to a lone bat sitting on an axe. `edge = reward − risk` is recorded on
everything placed in the room, so a measurement can ask the only question that
matters.

**The bot also needed a longer ruler.** It priced gear against the current
floor alone, so it was structurally incapable of valuing "useful three floors
from now" — the exact thing the design is about. `LOOT_CAMPAIGN_HORIZON = 0.5`
now counts the creatures still ahead in the descent, discounted by roughly the
measured clear rate, because counting all of them at face value assumes the
hero lives to swing the sword.

Both together, against the single-bonus version:

```
                    single bonus   +variance   +variance +horizon
cleared                 9/20          2/20          5/20
net challenge, floor 10  0.54          0.74          0.98
capacity, floor 10      12.5          15.5          11.4
```

Variance alone just punished the bot — it walked into the bad rooms without
noticing. The horizon is what turned it into something the bot could weigh, and
the pair finally produce the curve the difficulty work has been chasing: floor
10 costs essentially everything the hero brought, and capacity **falls**.

## Measured — the CHOICE still does not exist

This is the honest half, and it is a **negative result with a diagnosis**.

Measuring which chests actually get opened, split by whether the room's roll
was favourable (`edge > 0`) or not, over ~340 side chests on floors 5–8:

```
                        spine   favourable   unfavourable
chests opened            71%       46%           53%
```

The bot opens **more of the bad rooms than the good ones**. Not indifference —
inversion.

Four candidate fixes were implemented and measured. **None moved the ratio:**

| attempt | favourable | unfavourable |
|---|---|---|
| baseline | 47% | 60% |
| campaign horizon | 47% | 60% |
| + guard pricing (charge the detour for the guards it wakes) | 45% | 53% |
| + side activation capped to 4 ("a guard guards") | 54% | 68% |
| + crowd penalty scaled by threat instead of flat | 46% | 53% |

Guard pricing helped slightly and was kept. The activation cap made it worse
and is off. The crowd scaling changed literally nothing and was reverted.

**That nothing in the bot moves this is the finding.** The cause is on the map
side, and it is the mass budget:

```
side room       creatures   mean xp   mass
favourable        2.05       2.72     13.0
unfavourable      1.88       3.13     16.3
```

Side rooms are filled to a **mass** budget, so a low-risk room needs *more
bodies* to fill its share. Every danger signal the bot has is a sum over
monsters — summed menace along the route — so two weak creatures price higher
than one strong one. The safe room looks more dangerous than the deadly one,
and the bot is behaving correctly given what it is shown.

**The fix is to stop the mass budget inverting headcount:** give each side room
a mass share proportional to its own risk roll, instead of having all side
rooms compete greedily for one global 30%. Then a high-risk room holds more
mass *and* more bodies, risk stops being anti-correlated with crowding, and
the bot's existing pricing points the right way with no bot change at all.
That is the next thing to build here.
