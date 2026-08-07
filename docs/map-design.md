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

## Measured — the CHOICE does not exist yet

This is the honest half. `requireClear` was added with three settings —
`spine` (exit opens once nothing mandatory is alive), `all` (the old hard R0),
`none` (bolt for the stairs anytime) — and **all three measure the same**:

```
                spine     all      none
cleared         9/20      9/20     9/20
avg depth        8.0       8.3      8.3
kills, floor 10 17.7      18.1     18.1   (of 21)
net, floor 10   0.54      0.60     0.61
```

The bot takes every detour regardless of the rule, so the side rooms are not
ignorable in practice. Two reasons, and they compound:

1. Chests are goals in their own right (rule 1: stock up before fighting), and
   a chest is nearly always worth its danger-priced walk.
2. Walking to that chest wakes the guards, which then qualify as targets
   because they are coming anyway.

So the map now *offers* a gamble the bot always accepts. Making it a real
decision means making the detour genuinely not worth it some of the time —
raise `SIDE_ROOM_DEPTH_BONUS`, or stop chest quality from paying so well.

## Side effect: the dungeon got easier

Net challenge on floor 10 fell from **0.71 to 0.54**, and capacity now peaks at
16.4 on floor 7 against 11.8 before. Better chests plus a smaller map mean more
gear per floor. That runs against the standing requirement that capacity should
fall across the descent, and it is the first thing to fix in the next tuning
pass.
