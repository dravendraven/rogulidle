# Backlog

The task list. Everything needed to pick up a task and finish it.

- **What we are doing and why** — `docs/project/objectives.md`
- **What was last measured** — `docs/kpi.md` (a record, not a set of goals)
- **Closed items with their results** — `docs/project/decisions.md`
- **Ideas with no slot** — `docs/project/candidates.md`

## How this works

**Watch the game. Fix what is wrong.** That is where items come from.

One item, one commit, and a test asserting the thing the item was for — "a
rat deals damage", "floor 5 is not cheaper than floor 4". Most items here
have a criterion you can check by looking or by asserting; the ruler is for
questions that are genuinely invisible.

Run the ruler when a batch lands, as a **regression check** — did something
break — not as a scoreboard. `run-ruler.html`, and put what it says in
`docs/kpi.md`.

Read your item in full before starting and report against what it asks for
rather than your own sense of finished. Say what you did, what you measured
if you measured anything, and what surprised you. If an item looks wrong,
say so instead of quietly doing something else.

If more than one session is running at once, claim your item by setting it
IN FLIGHT and committing that alone before anything else. With a single
session, skip it.

    READY       can be started
    IN FLIGHT   someone is on it
    BLOCKED     waiting on a named item
    REPORTED    done, written up
    DONE        reviewed and closed
    ARCHIVED    decided against, reason kept

| # | id | what gets done | feature | agent | status |
|---|---|---|---|---|---|
| 1 | M11 | Make floor n+1 never cheaper than floor n — floors 2 and 5 are today | map | work | READY · batch |
| 2 | M13 | Raise the tier floor with depth so rats stop appearing deep | map | work | READY · batch |
| 3 | M12 | Raise creature count and cluster size together, holding draws constant | map | work | READY · batch |
| 4 | M14 | Put one top-tier-for-the-floor creature next to the shrine | map | work | READY · batch |
| 5 | M15 | Give chests a creature nearby, spine included | map | work | READY · batch |
| 6 | M9 | Draw a monster's drop from its own tier instead of a table that ignores it | map | work | READY |
| 7 | E1 | Expose one resumable turn loop from src/sim so the four copies stop drifting | engine | work | READY |
| 8 | M4 | Scale the side-room risk and reward spread with depth instead of holding it flat | map | work | READY · M10 unblocked it |
| — | M10 | Allocate cluster zones against the mass quota so side rooms stop emptying | map | work | **DONE** · live, unflagged |
| — | M3 | Unlock the strength ceiling with small probability | map | work | **ARCHIVED** · pushes CV the wrong way |
| — | I6 | Build an instrument that reads what a floor holds, not what a probe picked up | map | metrics | **DONE** |
| — | M7 | Move difficulty off creature count onto strength and same-type clusters | map | work | **DONE** · adopted, flag ON |
| — | I7 | Measure capacity with death suppressed at PLAYER_HP, not on a 400 hp probe | map | metrics | **DONE** |
| — | I5 | Split buffer into capacity and attrition and measure each on its own terms | map | metrics | **DONE** |
| — | M6 | Grant max and current hp every N kills, mirroring the xp progression | map | work | **DONE** · built, flag OFF |
| — | M2 | Place creatures in clusters instead of independently | map | work | FOLDED into M7 |
| 9 | M5 | Add a rare high-value item to the loot table | map | work | READY · unblocked by I6 |
| — | I3 | Settle clustering with a sign test, a damage percentile and a CV re-read | map | metrics | **DONE** |
| — | B1 | Trace goal and action per turn to find which layer creates the ping-pong | bot | work | PARKED · reported |
| — | B2 | Characterise what the tactical veto alternates between, and why | bot | work | PARKED |
| — | B3 | Fix the ping-pong with the cheapest change the evidence supports | bot | work | PARKED |
| — | B4 | Give unexplored map an hp-denominated value so it competes with fighting | bot | work | PARKED |
| — | B5 | Retune the crowd penalty once clusters make crowded tiles common | bot | work | PARKED |
| — | B6 | Fix the bot's side-room discrimination once I4 shows the inversion is real | bot | work | PARKED |
| — | I4 | Measure the side-room inversion at a sample that settles whether it is real | bot | metrics | PARKED |
| — | I1 | Replace the modelled ruler with two frozen probes that play the floor | map | metrics | **DONE** |
| — | I2 | Retest clustering with a mortal hero, measuring lethality instead of cost | map | metrics | **DONE** |

## M9 · tie the drop to the creature that carries it

`map` · `work agent` · **BLOCKED on I6** — the owner's preferred direction

`spawn.js:359` draws a monster's drop from a table that never looks at the
monster: `drawWeighted(state, 'spawn', monsterWeights)` ignores `template`.
**Killing a t-rex and killing a rat pay the same expected loot.**

In DCSS a monster's loot *is* its equipment — the orc warrior is dangerous
because it carries an axe, and the axe is what you get. Risk and reward are
the same object, so "is this fight worth it" is answerable by looking at the
monster. Here the payment does not know what you killed.

**And the share this affects grows with depth.** Chests are flat at 6 while
drops scale with creature count:

    floor 1     78% chest,  22% drop
    floor 10    26% chest,  74% drop

Every deliberate reward decision in the map design applies to **chests
only** — so the designed channel shrinks to a quarter of the loot exactly
where the design was meant to matter most, and the growing majority is
undifferentiated. This is also the likeliest reason the probe reads
`reward/challenge` as flat and about 1% of challenge: what it steps over
deep down is mostly generic drop.

Cheap to change — centre the drop's weight on the creature's own table index,
the same way the creature itself is chosen. But it moves reward, and reward
is the one quantity with **no instrument at all**; M5 is ON HOLD for exactly
that reason. Building here means moving a number nobody can read.

## M4 · scale the side-room bonus with depth

`map` · `work agent` · **READY** — fine tuning, only if M7 leaves a gap

`SIDE_ROOM_DEPTH_BONUS = 0.35` is fixed, so the only structural variance in
the game is constant across the descent.

**Why it matters.** It reuses machinery that already exists and was already
measured, and side rooms are the one place where risk and reward already
roll independently — `map-design.md` establishes why that independence is
what makes a detour a gamble rather than a free lunch.

**Acceptance.** CV per floor rises; the spine/side mass split stays at its
≥70% target; the average side room at floor 5 is not made harder, only the
spread widened. Measured on the probes.

## E1 · expose a resumable turn loop from src/sim

`engine` · `work agent` · **READY**

The descent loop has been reimplemented **four times** outside `src/sim/`:
`playFromState` in `clustering.js`, and `driveFloor`, `driveDescent` and
`driveDescentSuppressed` in `observed-ruler.js`. Every one was written for
the same reason and every one said so honestly — `playGame` runs a floor to
completion with no per-turn hook, and `playDungeon` takes a seed rather than
a starting hero. Anyone who needs to drive turns writes their own.

**This is not a tidiness item.** A copy of the loop has to stay in step with
the engine or whatever it measures stops describing the game, and that has
already happened: `clustering.js` diverged from `spawn.js` after M7 landed,
and it was found by the work agent tripping over it rather than by anything
noticing.

**What to build.** A resumable driver in `src/sim/` that accepts a starting
state and yields control per turn — the thing all four copies approximate.
Then the copies call it.

**Acceptance.**
- One loop, exported, with the four call sites using it.
- **Byte-identical results at every existing call site.** These functions
  produce every published number in `kpi.md`; if any of them moves, the
  refactor changed behaviour and the numbers behind it are no longer
  comparable. This is the whole risk of the item.
- No new RNG consumption anywhere, verified rather than argued.

**Watch.** `driveDescentSuppressed` clears `outcome`/`killedBy` back to null
between turns, which is why it needs a per-turn hook at all. Whatever the
shared driver looks like, that has to remain expressible without a special
case bolted on for one caller.

**Why it is worth doing now.** It unblocks U2 — live clear odds would be the
fifth copy, and the worst of them, since it would run during the watched run
rather than offline. With this in place the ui agent can build U2 alone:
import the loop, import `makeBot`, derive the rollout seed through
`hashSeeds`, and touch nothing outside `src/ui/`.

Serves neither objective directly. It is debt, and it is the kind that has
already cost something once.


### Review 2 — NOT adopted at this tuning. Flag stays off

    median damage        unchanged            PASS
    CV of challenge      unmoved, z = 0.8     FAIL — this was the point
    finishes             20.0% → 15.3%        harder, z = −1.1, not significant
    spike reaching hero  does not             FAIL, and measured awkwardly

**The catch on the way is worth more than the reading.** `clustering.js`
never threaded `outOfDepthChance` into the counts it builds per floor, so
the real-bot arm silently read "off" whatever it was told. It was caught
because the two arms came back byte-identical and `isolatedShape` had
already shown that could not be true — **two instruments checked against
each other**, which is the only way that class of bug gets found.

### Why it did not work, and the two answers are different

**The spike comparison is compositionally confounded.** Conditioned on
combat-adjacent turns, the combat-turn *sample nearly doubles* between arms —
reskinned monsters are tankier, so fights run longer. Percentiles taken over
a changed denominator are not comparing like with like, and the slight fall
is at least partly that. Third time this particular statistic has been
awkward to take.

**Hypothesis one: the tuning is simply too weak.** At
`OUT_OF_DEPTH_CHANCE_CAP = 0.15`, roughly one floor-10 visit in seven gets
**one** creature reskinned, on a floor that now holds about seven. One
stronger draw on 15% of floors is a small variance contribution, and z = 0.8
is what "too small to see at this n" looks like. All three constants are
marked INITIAL GUESS and the work agent explicitly asked for the probes to
set the cap rather than guessing. **Nobody has swept it.**

**Hypothesis two: the bot routes around it.** `refuseLostFights` stops the
bot starting a fight it prices as lost, so a monster reskinned near the top
of the table is a monster it declines. The blow gets bigger and never lands.
If that is what is happening, M3 cannot work against this bot at all, and
the difference shows on screen as *the bot avoiding something scary* rather
than nearly dying to it — a different product from the one the item was
written for.

The two are separable and one is cheap. **Sweep the cap first.** If CV moves
at a higher cap, hypothesis one was right and the question becomes what cap
costs an acceptable amount of finishes. If it does not move at any cap the
tail is still worth having, hypothesis two is live, and M3 waits on the bot
lane — which is parked.

**Not archived.** Its mechanism is built, tested, RNG-clean and off. What is
missing is a tuning nobody has looked for, and that is a sweep rather than a
rewrite.

### Metrics reading — the cap sweep

Measured at commit `ff708dc`. `isolatedShape`, default 60 seeds/level,
`floorPlanFn` built from `makeFloorPlan` with M7's params plus
`outOfDepthChancePerLevel: OUT_OF_DEPTH_CHANCE_PER_LEVEL` and
`outOfDepthChanceCap` swept — per "measured on the probes, not the real
bot," this is the probe reading only; hypothesis two (the bot routing
around a reskin) is not touched here.

**The cap saturates well inside the range that was worth sweeping.** At
`perLevel = 0.02` over 10 floors, the RAW chance (`perLevel × floor index`)
tops out at `0.18` on floor 10 — a cap at `0.30` or `0.50` is provably
identical to `0.18`, checked directly rather than assumed (`0.18`/`0.30`/
`0.50` all read `0.18` at floor 10). Swept `{0, 0.05, 0.10, 0.15, 0.18}` —
`0.15` is shipped, `0` is no-tail-at-all, `0.18` is as far as this dial can
ever reach.

    cap     CV growth (× / floor, fl 1-10)
    0       0.994 ±0.009
    0.05    0.986 ±0.008
    0.10    0.985 ±0.008
    0.15    0.984 ±0.008   (shipped)
    0.18    0.983 ±0.008   (ceiling — raising the cap further cannot move this)

**Answer to hypothesis one: raising the cap is not the fix, at any
strength this dial can reach.** The trend across the full range is
monotonic but **backwards** from what would rescue the item — CV growth
gets slightly LOWER (CV falls a little faster, not slower) as the cap
rises — and even the two extremes, no-tail vs the hardest this dial can hit,
are not distinguishable (gap 0.011 ±0.012, z ≈ 0.9, under this project's own
2σ bar). Floor 10 alone shows the clearest move (CV 0.988 at cap 0 → 0.926
at cap 0.18) but it is not enough to carry the ladder-wide rate past noise.
**This rules out `OUT_OF_DEPTH_CHANCE_CAP` specifically** — it does not rule
out `OUT_OF_DEPTH_CHANCE_PER_LEVEL` or `_BASE`, neither of which this sweep
touched, so "the tuning is too weak" is narrowed, not closed: the cap was
never the binding constraint, the per-level ramp might still be.

**Hypothesis two is now the more likely story, by elimination rather than
by direct evidence** — this reading cannot see the bot at all. `M3` stays
where its Review 2 left it: not archived, waiting on whichever of (a) a
`per-level`/`base` sweep on the probes, or (b) the bot lane un-parking to
test avoidance directly, someone picks up next.

### Review 2 of M10 — the risk I flagged did not happen. Kept

CV growth **0.994 ±0.009**, bit-identical to the pre-M10 reading at the same
commit and consistent with M7's own 0.986. **M7's CV gain is intact and M10
gave none of it back.**

I predicted it would. The argument was sound — cutting a cluster short adds
a draw, and draws are M7's whole mechanism — and it was wrong about the
size. Effective cluster size runs **3.97–4.87** from floor 6 on, so floors
holding seven creatures still resolve to one or two clusters either way. The
split moved where clusters sit, not how many there are.

Worth keeping from that: `CLUSTER_SIZE = 6` never described what floors
hold, and now the real distribution is measured instead of assumed. Any
future argument about draws should use 4–5, not 6.

M10 is unflagged and already live. Nothing to adopt; it stays.

### M3 — ARCHIVED. The cap is not the lever, and nothing else here is either

    cap    0     0.05   0.10   0.15   0.18 (ceiling)
    CV   0.994  0.986  0.985  0.984  0.983

**Monotonic in the wrong direction.** More out-of-depth makes CV growth
slightly *lower*, not higher, and the extremes are not distinguishable
anyway (z ≈ 0.9). 0.18 is where `perLevel × floor` tops out — 0.30 and 0.50
read identical — so this is the mechanism at its maximum reachable
frequency, not an under-swept dial.

The likely reason is worth recording: the chance grows with depth, so the
tail fires most where cost is already highest. Raising the deep mean lowers
`sd/mean` even while raising `sd`. **The mechanism pushes the ratio the
wrong way by construction**, which no amount of tuning fixes.

`_PER_LEVEL` and `_BASE` were not swept, and the sweep does not formally
rule them out. But they change *where* the tail fires, not the fact that it
raises the mean of the floors it fires on, so the direction problem
survives them.

And M3's other half already failed: the bigger blow does not reach the hero,
whether because `refuseLostFights` declines the reskinned monster or because
longer fights change the sample. Two halves, neither delivering.

**Archived, not deleted** — built, tested, RNG-clean, flag off, and the
reason is here. Same treatment as `SIDE_ACTIVATION_CAP`.


## M11 · floor n+1 is never easier than floor n

`map` · `work agent` · **READY**

Measured, in the shipped game: challenge by floor runs 2.18, **1.97**, 5.28,
6.33, **5.70**, 8.10 — floors 2 and 5 cost less than the floor above them.

Nothing has ever targeted this. Every acceptance criterion so far has been
about growth *rates*, which are happily monotone on average while individual
steps go backwards.

**Do.** Make the expected cost of floor N+1 exceed floor N by construction,
not on average. The roster count is 2, 2, 3, 3, 3, 4, 5, 5, 6, 7 — flat
stretches are where it happens, since with count equal the tier roll decides
and can go either way.

**Assert.** A test that walks floors 1→10 and fails if expected cost ever
drops. Expected cost, not a sample — the point is that it cannot happen, not
that it usually does not.

## M12 · fill the floors back up

`map` · `work agent` · **READY**

Floor 10 holds 7 creatures on a 32×32 map. That is M7's doing — it cut count
growth from 1.3 to 1.15 to fight the CV decay — and the emptiness is the
price that was paid without anyone looking at it.

**It does not have to be paid.** CV depends on the number of independent
*draws*, not on the number of creatures, and clustering separated those two.
Raise the count **and raise cluster size with it**, holding
`creatures ÷ cluster size` roughly where it is, and the floors fill up while
the CV win survives.

Effective cluster size is currently 3.97–4.87 (measured, not the constant 6).
That ratio is the thing to hold.

**Assert.** Creatures per floor at 1, 5, 10 in the report. Draws per floor —
`creatures ÷ effective cluster size` — roughly unchanged from today.

## M13 · the tier floor rises with depth

`map` · `work agent` · **READY**

A creature's tier is `min(1, depthAt(pos) × difficultyScale)`, and `depthAt`
is position **within the map**, not the floor number. Near the entrance it
is ~0, so the index falls to 0 — **a rat** — on every floor including 10.

The floor's depth sets the **ceiling** and never the floor. That is why weak
creatures keep showing up deep.

**And rats cannot hurt anything.** `xp 1` means the damage roll is `0..0`,
exactly zero. `threat.js` skips them from the danger field and `duelCost`
returns 0. They are scenery that costs turns.

**Do.** Give the tier a per-floor **minimum** that rises with depth, so the
bottom of the table drops out as the descent goes on. Within-map position
still varies tier — it just varies between a floor and a ceiling instead of
between zero and a ceiling.

**Assert.** Lowest tier seen at floors 1, 5, 10 rises. No `xp 1` creature at
all past some floor.

## M14 · a guardian at the shrine

`map` · `work agent` · **READY**

Nothing guards the exit. Reaching the shrine is currently the moment the
floor stops being dangerous.

**Do.** Place one creature adjacent to the shrine, drawn at or near the top
of the tier that floor can reach — strong *relative to the floor*, not
absolutely. It replaces one of the floor's roster rather than adding to it,
so the budget does not move.

**Assert.** Every floor has exactly one, its tier is at or above every other
creature on that floor, and creature count is unchanged.

## M15 · loot rooms have a guard

`map` · `work agent` · **READY**

Rooms hold a chest and nothing else, so most of a floor is walking. Loot
that costs nothing to take is not a decision.

`SIDE_CHEST_BIAS` already puts chests in side rooms, which have guards — so
this may be smaller than it looks. What is missing is the spine, where
chests sit unguarded.

**Do.** Make a chest almost always have a creature within a short radius,
spine included. Reuse placement rather than adding creatures — the budget is
M12's, not this item's.

**Assert.** Fraction of chests with a live creature within N tiles, at
floors 1, 5, 10. It should be high and roughly flat with depth.


---

# Not active

Specs for items that are parked, held or folded. Kept here so the queue
table above resolves to something, but nothing here is startable.


## B4 · give exploration a value

`bot` · `work agent` · **READY**

Unexplored map is worth exactly zero to the bot. `frontierGoals` returns
`{kind, pos}` with no value (bot.js:121), and exploration is branch 3 of
`chooseGoal` — a fallback, never a competitor (bot.js:321). When it does
explore it picks the **cheapest** frontier to reach, not the most promising.

**Why it matters.** Three reasons, and the third may be the largest.

1. It cannot form "worth 2 hp of risk to see what is over there", which is a
   decision the game is built around.
2. It fights the map design directly. `CHEST_LOOT_RICHER_FAR = true`
   deliberately puts the good loot far from the spawn, sweeping 10% to 100%,
   and `CHEST_QUALITY_BY_DEPTH` makes depth buy quality. The map hides the
   reward far away; the bot explores by proximity at zero value.
3. It may be what feeds the ping-pong. B1 found the loop lives in the
   tactical veto, and the veto wins whenever the plan has no strong pull —
   which is exactly the state when every positive-valued goal is exhausted
   and only "do not stand here" is left. A positively-valued destination
   makes the plan harder to override.

**Acceptance.**
- Frontier carries an hp-denominated expected value and competes in the same
  comparison as chests and monsters, rather than being a fallback branch.
- Frontier goals stay sticky. Trading tile ping-pong for frontier ping-pong
  is not progress.
- The bot does not become a wanderer: turns per run must not blow up.
  `bot-strategy.md` §4.4 records a search that circled forever; the same
  failure is available here.

**How to measure.** Win rate, depth, turns per run, chests found per floor,
and the reversal rate from B1's instrumentation. Paired seeds, confirmed on
seeds not used for tuning.

**Machinery that already exists.** `expectedChestValue` prices an unseen
chest; `monstersAhead` and `LOOT_CAMPAIGN_HORIZON` already discount future
value. What is missing is an estimate of how many chests a dark region holds
— and the bot already knows `CHEST_COUNT` and how many it has seen.

**Interaction with B3.** B4 may resolve the ping-pong on its own. Measure
B4's effect on the reversal rate before concluding B3 still has work to do.

## M5 · a reward tail

`map` · `work agent` · **ON HOLD** — no instrument, therefore no acceptance number

The targets table has no entry for reward, and that is not an oversight: the
probes collect only what they step over, so their reward figure describes
their own policy rather than the design. Building to move a number that does
not yet mean anything is how a change gets adopted on a reading that cannot
support it.

Unblocking this needs an instrument first — a probe that detours for loot,
or reward measured as what the floor *contains* rather than what got picked
up. That is not scheduled; the CV and buffer targets come first.

The best item is `axe +2`. There is nothing rare enough to be an event, so
reward variance is bounded from above by the table itself.

**Why it matters.** Reward variance is the spectator's half of the lottery.
The measured CV of reward falls with depth just as challenge's does, and no
amount of work on the challenge side fixes that.

**Acceptance.** Mean reward per floor unchanged inside noise; CV of reward
stops falling. Pick weight is `1 / value`, so a high `value` means rare.
Measured on the probes.

**Watch.** `CHEST_LOOT_CHANCE = 0.60` is what the bot assumes when pricing a
chest, measured over 150 maps. Adding to the item table moves what a chest
is worth and that constant will need re-measuring.

## I4 · is the side-room inversion real

`bot` · `metrics agent` · **READY**

Over ~344 side chests on floors 5–8 the bot opened 46% of favourable rooms
against 53% of unfavourable ones. Not indifference — inversion. Four fixes
were implemented and none moved the ratio.

**The honest state.** At n = 196 / 148 the standard error on the difference
is about 5.4 points, and the measured gaps sit between 1.3 and 2.6 standard
errors across variants that **share seeds** and so are not independent
replays. The direction was consistent, which is suggestive. `map-design.md`
already retracts one wrong diagnosis of it.

**This task is a measurement and nothing else.** Enough seeds to put the
difference several standard errors clear of zero, or to show it was noise.
No fix, no diagnosis of cause. Report and stop.

**Why it matters.** The side-room risk/reward roll is the only source of
*structural* variance in the game today, and a player-facing exploration
dial would sit on top of this discrimination. If the bot cannot tell good
rooms from bad, a dial on top only scales the error. Nothing should be built
on this until it is known to be real.

**Note for whoever runs it.** The bot will change under B4 while this is
open. Measure against a stated bot version and say which — a result against
a moving bot is not reusable.

## B2 · characterise the veto loop

`bot` · `work agent` · **BLOCKED on B1 review**

B1 answered "tactical veto", which is the branch whose spec was thin. Being
rewritten against that answer.

Spec deliberately not written yet.

## B3 · fix the ping-pong

`bot` · `work agent` · **BLOCKED on B2**

The cheapest fix the evidence supports. `REVERSAL_PENALTY` already lives in
this layer and already failed a sweep (0 / 1.5 / 6 moved the reversal rate
only 0.238 → 0.205 and cost win rate), so the fix is not "more of that".

**Known side effect to watch when the spec is written.** If it ends up
adding hysteresis to loot goals, it pushes against I4's question: more
commitment to a target means less chance of abandoning a bad room after
starting to walk to it.

**Measurement will include** reversal rate before and after, win rate, depth,
turns per run, and above all the **distribution**: a fall in the mean can
hide the pathological case surviving intact.

## M2 · clustering

`map` · `work agent` · **FOLDED into M7** — kept for its reasoning, not as work

Grouping is now one of M7's three levers rather than its own item. It cannot
be attributed apart from the other two: the three share one difficulty
budget, so moving grouping forces count and strength to move with it. The
argument below is why grouping is in that budget at all, and it still
stands — only the packaging changed.

The third axis, never tested: same roster, different spatial distribution.

**Why it is the main candidate.** Variance of a sum falls as `1/√n` in the
number of independent draws. Eighteen creatures spread out are eighteen
draws that cancel; the same eighteen in four groups are four draws. It cuts
the sample count **without emptying the floor** — which is why the
count→strength route only worked at the degenerate point where floors held
two creatures.

**And it buys the damage spike for free.** The individual blow stays capped
by the table, but three adjacent creatures strike in the same turn. Damage
per *turn* grows with damage per *blow* frozen — DCSS's shrinking reaction
window obtained by placement, without touching `MONSTER_TABLE` (FAITHFUL,
11 rows, whose ceiling nearly bit the strength sweep).

**Machinery exists.** `spine.js` classifies rooms, `spawn.js` distributes
against a running mass share, and `activation` radii already create de facto
groups — waking one wakes its neighbours.

Unlike M3–M5 this one is **not** probe-measurable: the effect is on
lethality, and the probes cannot die.

**A shadow implementation already exists, and reconciling it is part of this
item.** I2 built `src/analysis/clustering.js`, which generates the roster
with the shipped `populate()` and then rewrites monster positions into
clusters. That was correct for an instrument — it changed nothing in
`src/sim/` — but it means the grouping logic now lives outside the engine.

When M2 lands, the two must not drift apart in silence, because the moment
they do, every clustering measurement stops describing the game. Either the
analysis file calls the engine's placement, or the difference between them
is written down deliberately. Decide which, and say so.

Note also what the instrument's version ignores by design: the spine/side
split, and cluster size fixed at 3. Those are M2's to settle, not carried
over as defaults.

## B5 · crowd blindness in the bot

`bot` · `work agent` · **BLOCKED on M2**

`threat.js` records that tiles reachable by two awake monsters at once are
"rare enough that this term is not what steers the bot", and scaling
`CROWD_PENALTY` by threat changed literally nothing. That is true of the map
as it exists today.

Clustering makes those tiles common, at which point the term goes from inert
to dominant. Do not touch this before M2 exists — today there is nothing to
tune against.

## B6 · fix side-room discrimination

`bot` · `work agent` · **BLOCKED on I4**

The bot appears to open more unfavourable side rooms than favourable ones.
Whether that effect is real is I4, and it belongs to the metrics agent — a
bot judged by whoever writes it is a weak counterweight.

Four fixes have already been implemented against this and none moved the
ratio, which is itself a reason to establish the effect exists before
attempting a fifth.
