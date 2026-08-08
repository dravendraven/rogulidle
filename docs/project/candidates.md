# Candidates and archived routes

Ideas with a reason attached but no slot, and routes that were measured
and dropped. Nothing here is scheduled. The task list is
`docs/backlog.md`.

## Candidates — recorded, not scheduled

Ideas with a reason attached, waiting for a slot. Nothing here has an
acceptance number yet; several would not survive contact with one. They sit
here rather than in the queue because **I5 is unresolved** — it may show the
ruler cannot answer the questions these would be judged by, and scheduling
work against a suspect instrument is the mistake the buffer target already
made once.

Ids keep the feature prefix they would have anywhere else. Whether an item
is scheduled is what the section and the status say, not what it is called —
the same way M5 sits ON HOLD and M2 FOLDED without losing their M.

**Reward placement is not here**, though it came up in the same brainstorm.
Rogulidle already couples reward to risk — `SIDE_CHEST_BIAS` puts chests in
guarded side rooms, `CHEST_LOOT_RICHER_FAR` puts the good ones far,
`CHEST_QUALITY_BY_DEPTH` makes depth buy quality — and `map-design.md`
already derived the point DCSS gets from hand authorship, that risk and
reward must roll independently per room or the gamble is a free lunch. The
design exists; what is missing is evidence it works, and that is **I4**,
parked. No new item, just a measurement nobody has taken.

### U2 · live clear odds on screen

`product` · `metrics agent` then `ui agent` — instrument first, display after

A number on screen — "X% chance of reaching the bottom" — recomputed at each
floor transition from the hero's real state.

**Serves neither objective directly.** It is spectator legibility, not a
balance target. **Display, never a KPI** — nothing should ever be tuned to
move it.

**Mechanism: Monte Carlo rollout, not a fitted formula.** Predicting the
outcome from static map features was already measured and fails —
correlations top out near 0.3 and a fitted model reaches 64% against a 59%
base rate. So instead, at each floor transition run N headless simulations
from the current state (hp, floor, gear, creatures left) and take the
fraction reaching floor 10.

Use the **real bot**, not the probes. The probes exist to calibrate design
against a fixed reference player; the question here is about this bot
specifically.

**Success is calibration, not accuracy.** Across many runs where the display
read ~70%, about 70% should clear. Systematic divergence means the rollout
is biased — wrong player, or N too small.

### Three notes from review, added to the proposal

**Performance is the real risk, ahead of the RNG one.** `N × remaining
floors` headless descents at every transition is, on floor 1 with N = 50,
around 500 floor-plays — the same order as a balance sweep, which this repo
already documents as needing a visible tab and real time. Single-threaded in
a browser that stalls the run being watched. Solvable with a worker, which
is plain JS and inside the rules, but it belongs in the spec rather than
being discovered during implementation.

**The map is fixed, which changes what the number means.** `playDungeon`
generates each floor from the seed, so a rollout of floors 9–10 produces the
*same* floors — only the combat dice vary. That is the right question ("given
this dungeon and this hero, what are the odds") but it has two consequences.
The number is **conditional on the map**, and since `balance.md` measured
roughly half of outcome variance as dice and half as map, the rollout
captures one half deliberately. It also means **N can be small** — with only
the dice varying, 20 may be plenty, which is most of the performance problem
answered.

**Showing the level may kill the drama the item exists to create.** Racing
shows odds and it works, but a screen reading 8% stops you caring and 95%
stops you watching, and sub-goal 3 wants the outcome uncertain and readable
for as long as possible. What probably works is the **movement**: "40% → 12%
on that floor" is drama; a static 12% is deflating. That is a design
decision to take before building, not after.

**Blocked on E1, and that changes who builds it.** As proposed this needs a
fifth reimplementation of the descent loop — and the worst of the five,
since it runs during the watched run rather than offline, where drifting
from the engine would make the odds quietly stop describing the game.
`clustering.js` already did exactly that after M7.

With E1 done — one resumable loop exported from `src/sim/` — the ui agent
can build U2 **alone**: import the loop, import `makeBot`, derive the
rollout seed through `hashSeeds`, and touch nothing outside `src/ui/`. No
metrics-agent half, no new instrument. The rule is that ui does not *edit*
`src/sim/`, not that it cannot import from it.

### M8 · layout variety, the way DCSS picks a builder per level

Nothing in the backlog touches map *structure*, and the arithmetic likes it
more than most of what is scheduled.

**Layout is floor-level variance.** A cave floor and a corridor floor cost
very different amounts with the same roster — open ground lets several
creatures engage at once, a corridor forces them into a queue. That is one
draw per floor, and floor-level draws do not dilute with `n`. It is the same
class as M4 and precisely the class M3 is not.

It also amplifies M7. In an open cave the bot **cannot** un-group a cluster
by backing into a corridor — which is the caveat I2's review raised, that
grouping only becomes a lever where the map prevents the escape.

Not expensive: ROT.js already ships Digger, Uniform, Cellular and Rogue. The
risk is whether `spine.js`'s spine/side classification survives layouts it
was never written against.

And it is the only candidate here that changes what is **seen**. Ten floors
out of the same digger are visually monotonous.

## Archived

### The count→strength route — UNARCHIVED, see M7

Reopened. The reasoning below is still correct and the numbers still hold;
what was wrong was the conclusion drawn from them.

Every playable point had the CV still falling, so the route was written off.
But converted to a rate per floor, count 1.10 reaches 0.970 against today's
0.944, and count 1.00 reaches 1.012 — the sign does flip. It flips only at
the degenerate corner, where a base of 2 and no growth means two creatures
on every floor.

So the route failed for **emptying the floor**, not for failing to move the
CV. Grouping fills exactly that gap: twelve creatures in four clusters are
four draws with twelve bodies. That combination was never swept, and it is
what M7 is.

Kept below as originally written.

### The count→strength route — measured, does not pay

Shifting the difficulty budget from creature count to individual strength,
holding the product constant. Measured across five points.

**Why it was dropped.** Every playable point still has the CV falling
(0.841 down to 0.49–0.64). Only the degenerate extreme reverses it, and that
extreme means two creatures on every floor — a dungeon that never grows.

**Worth keeping from it.** The real cost exponent in strength is 2.356, not
2, because strength indexes an 11-row table whose mass runs 0 to 108. And
the sweep is what exposed the ruler being wrong: modelled cost held constant
(×10.5 against ×9.8) while win rate moved 12–13 points across two
independent seed families.

---

## Parked — the bot lane, and reward

Set aside while the focus is the map. Nothing here was abandoned; the
reasoning stands and the specs are below.

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

## B5 · crowd blindness in the bot

`bot` · `bot agent` · **READY** — unblocked, clustering shipped with M7

`threat.js` records that tiles reachable by two awake monsters at once are
"rare enough that this term is not what steers the bot", and scaling
`CROWD_PENALTY` by threat changed literally nothing. That is true of the map
as it exists today.

Clustering makes those tiles common, at which point the term goes from inert
to dominant. **That is no longer hypothetical** — M7 shipped clustering at
`CLUSTER_SIZE` 10, so there is now something to tune against. Re-measure
before tuning: M12 found effective cluster size is 1.77-2.10, not the 4-plus
that was quoted at the time, so "two at once" may still be rarer than this
item assumed.

## B6 · fix side-room discrimination

`bot` · `work agent` · **BLOCKED on I4**

The bot appears to open more unfavourable side rooms than favourable ones.
Whether that effect is real is I4, and it belongs to the metrics agent — a
bot judged by whoever writes it is a weak counterweight.

Four fixes have already been implemented against this and none moved the
ratio, which is itself a reason to establish the effect exists before
attempting a fifth.

## U4 · a hero picker, persisting across deaths

`owner idea` · **UNSCHEDULED — spectator control, the territory already
flagged as deferred until bot/map base is done. Recorded, not blocking.**

### What it is

A pre-run menu, four heroes. The pick persists across deaths — die, and the
next run starts with the next hero already chosen, no click required. Same
non-blocking policy as the Extraction proposal: a pre-set rule, never a
pause waiting on the spectator.

**Real side benefit:** answers the between-run variety question that was
raised earlier with no instrument to measure it. Swapping hero is novelty
without touching balance.

### Ricardo's premise is wrong on both halves, and one of them is already
### a measured, written-down finding

The proposal describes Ricardo as reusing `tactical: true`, "hoje off por
padrão," with "lookahead melhor." Checked against the code and the docs:

**`tactical` is already ON by default** (`bot.js`, `makeBot`'s settings) —
not off. There is nothing to turn on.

**"Melhor lookahead" means deeper `TACTICAL_DEPTH`, and depth 3 was built,
measured, and is worse — on record, not a guess.** `bot-strategy.md` §4.4:
depth 1 wins 37/60 against 31/60 with the search off; depth 3 does not
improve win rate and its hits-per-kill triples (2.76 to 11.01) — **it does
not dodge, it hesitates**, absorbing weak hits against a monster instead of
resolving the fight, at 1.8x the per-run cost. The section's own "lesson
learned" box is directly on point: an earlier attempt discarded the whole
feature on win rate alone, which mixes bot quality with map difficulty, and
missed that depth 1 alone (the cheap variant) was never measured on its own
until it was.

**So "Ricardo is the optimal bot" cannot be built as deeper lookahead.**
Whatever makes Ricardo the calibrated-optimum persona, it is not
`TACTICAL_DEPTH` past 1 — that direction is closed, not open, and the
proposal's own sequencing note (calibrate `DUEL_SAFETY_MARGIN` first,
Ricardo second) is right in spirit but pointed at the wrong dial. If
`DUEL_SAFETY_MARGIN` sweep is the intended source of Ricardo's identity
instead, that stands — it just is not "reuse tactical, currently off."

**The `DUEL_SAFETY_MARGIN` calibration proposal referenced as "já enviada"
does not exist in any file this agent can see** — not in `backlog.md`, not
in `candidates.md`, not in `bot-strategy.md`. `DUEL_SAFETY_MARGIN = 0.7` is
tagged **INITIAL GUESS** in `balance.md` today, so the premise (it wants
calibrating) is correct — the item itself needs to actually be filed before
Ricardo can depend on it. Send it again, or confirm which session has it, so
this dependency points at something real.

### The other three heroes, as proposed, check out against the code

- **Pawa** — shield giving `armour 5` instead of the shipped `3` (`ITEM_TABLE`,
  `balance.js`) — correct baseline cited.
- **Vito** — axe giving `dmg +4` instead of the shipped `+2` — correct
  baseline cited.

### Pawa's behaviour, replaced — "eager to explore" is dead, three times over

The original proposal's behavioural hook for Pawa (discount
`UNKNOWN_MONSTER_ESTIMATE`, explore more eagerly because the extra armour
covers the surprise) leaned on exploration as a tunable lever. It is not
one, measured three independent ways in this session: `exploreValue`
(rank frontiers by reveal) read as inert, `exploreCompetes` (frontier bids
against known loot) was actively harmful, `frontierRouting` (weight the
path by reveal) read as inert again, for a specific, understood reason —
ties are too rare on a procedural map for a safe-sized tie-breaker to ever
decide anything. Building a fourth exploration-shaped behaviour on the same
premise is not worth trying again without a new mechanism, not just a new
dial.

**Replacement: Pawa can buy armour at every floor transition, not only
between runs.** No new item type — buying a shield still grants his own
`armour 5`, the same mechanic every other persona's shield pickup uses.
The only new thing is a second purchase trigger (floor transition, mid-run)
alongside U3e's between-run shop. This is causally tied to his actual trait
(more armour per shield) rather than a bolted-on preference, which
"explore more" never was.

**Blocked on both U3 and U4 landing, not just U4.** Needs a coin balance
that is readable and spendable MID-RUN — U3c today only settles the
balance at run boundaries (bank on clear, reset-or-carry on death per the
flag) — and needs the persona system itself, since only Pawa gets the
option. Sequence: U3 (all six parts) and U4's base persona-as-state-
parameter work land first; this is additive on top of both, not a seventh
U3 item and not foldable into U4's first pass.

**The purchase decision has to be autonomous, and its rule is not
decided.** The project's whole spectator model is non-blocking — nothing
pauses for input — so Pawa's bot code decides whether to spend at each
floor transition, not a UI prompt. Whether to spend the moment it is
affordable, or hoard for a later floor, is a real trade-off (same shape as
M25's own dial sweep) and should be swept and measured when this is built,
not picked by feel. **Watch `finishes` and mean death floor against the
base bot** — the failure mode to rule out is Pawa spending down to zero
early and getting no benefit from it later, the same shape of trap B9
found on the loot-pricing side.

### Papazito and Ricardo, converged on after several rounds — two
### independent switches, not one big exception

Settled shape, refined across the conversation that filed this item:
**position/type visibility** and **loot-content visibility** are two
separate axes, and no persona sits at "sees everything" on both.

|              | position + type            | loot content (drop / hasLoot) |
|--------------|-----------------------------|--------------------------------|
| base/Pawa/Vito | normal fog of war (`VISIBLE_DIST`) | hidden, always — M28's fix |
| **Papazito** | **whole map, always**      | hidden, same as everyone      |
| **Ricardo**  | normal fog of war          | **revealed, for whatever he can already see** |

**Papazito is a bigger viewport, nothing more.** He knows where every
monster and chest is and what kind it is (type comes bundled with position
in `Belief` for anyone), map-wide — which is what lets him plan room order
in advance. He does **not** know what a chest holds or what a monster will
drop until it is opened or killed, same rule as the base bot.

**Ricardo is the opposite trade: normal reach, deeper knowledge of what is
already in view.** Once a chest or monster is within his ordinary fog of
war, he knows its true loot value instead of the tier-based expectation
`expectedMonsterDropValue` (B9) computes for everyone else. The player is
never told why — the persona is sold as "the smart one," not "the one who
cheats," and the only observable signature is behavioural: he never opens
an empty chest, never detours for a creature carrying nothing.

**Neither one needs a `GameState` exception, which is a real simplification
from the original framing.** `observe()` (`src/sim/observe.js`) already
legitimately bridges `GameState` into `Belief` — that is its job. Papazito
is `observe()` called with an unbounded visibility radius instead of
`VISIBLE_DIST`; Ricardo is `observe()`/`copyEntity` called without M28's
content strip. Both personas still only ever hand the bot a `Belief` object
— the boundary `CLAUDE.md` protects (bot code never touches `state`
directly) is untouched by either. This is worth noting as a persona-scoped
parameter to `observe()`, in the spec's own §13 divergence style, rather
than as the rule exception the first draft of this item called for — lighter
sign-off, not none, since it is still fog of war behaving differently by
design.

**Ricardo's open empirical question, carried over from B9.** B9 shipped its
drop-pricing OFF because pricing an *expected* drop reordered even mandatory
fights and the bot died sooner. Ricardo prices a *known* drop instead of an
estimate — whether perfect information avoids that harm (no more wasted
detours toward creatures that turn out to carry nothing) or reproduces it
(the reordering itself was the problem, not the uncertainty) is not
knowable in advance and should be measured when Ricardo is built, not
assumed either way.

### The architecture note is correctly flagged as a decision, not a detail

Making the buff a real item constant rather than a bot-side weight is the
right call — `effectiveHp`, `duelCost`, `worthStarting` already read from
the live inventory, so a correct item value propagates through every risk
calculation for free, instead of a second copy of the logic living in the
bot.

**The `step()` purity cost is real and is exactly what `CLAUDE.md`'s hard
rule protects.** `step()` stays pure today: same seed, same result, no
external state. Adding persona as a second run-state parameter (alongside
seed) keeps *that* determinism — same seed AND same persona still replays
identically — but it is a second axis a reader now has to hold in mind
everywhere `step()` is called, including every test, every bot search branch
that calls `step()` internally (`tactics.js`'s `bestValue`), and the
frozen-probe instruments that assume one run = one seed. Flagging this only
means: state it as a decision when this is scoped, not discover it mid-build.

### Validation gate, as proposed, is the right one and should not be
### skipped

Distinct behavioural signatures per persona (Pawa explores more tiles/turn,
Vito fights more/floor) via batch comparison, before this counts as done.
Same discipline as `bot-strategy.md` §4.4's own lesson: a single aggregate
number (like win rate) can hide the real effect or invent a fake one.

### Roles, as scoped in the proposal

`src/sim/` (persona as state parameter, item constants, `observe()`'s
visibility-radius and content-strip becoming persona-aware) — work agent.
`src/ui/` (picker) — ui agent. Ricardo's combat tuning blocked on a real,
filed `DUEL_SAFETY_MARGIN` calibration item — see above, that item does not
exist yet; his loot awareness is buildable independently and rides on M28's
mechanism directly. Papazito needs the owner's sign-off on the lighter
`observe()`-parameter framing above, in place of the earlier `GameState`-
exception framing.

## Dropped from the queue

### M9 — tie a monster's drop to its own tier

Scheduled, then removed by the owner before it was started. Nothing was
measured against it and nothing about the reasoning was refuted — it simply
lost its slot when the focus moved to what watching turned up.

The finding behind it stands and is worth keeping: `spawn.js` draws a
monster's drop from a table that never looks at the monster, so a t-rex and
a rat pay the same expected loot. In DCSS a monster's loot *is* its
equipment, which is what makes "is this fight worth it" answerable by
looking at the creature.

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

## Discarded

### M22 — two routes to the shrine

Dropped by the owner before it was started. Nothing was measured against it.

The reasoning is worth keeping because two pieces of it are true regardless.
**A fork only poses a question if being short is worth something** — the bot
reads Belief only, `belief.shrine` is null until seen, and with turns nearly
free the quiet branch always wins. That dependency became `B7`.

And **raising `dugPercentage` is the lever that creates alternate routes** —
M16 measured it (0.20 drops floor 7's spine share to 0.70) and treated it as
the thing to avoid. Under any future branch design that is the mechanism,
not the hazard. The measurement is already done; only its sign would change.

## M22 · two routes to the shrine, told apart by what is in them

`work agent` · **NEEDS DECISION first — see the dependency**

Instead of a single mandatory route with dead-end detours hanging off it,
give the floor a **fork**: two ways to the shrine, one short and populated,
one long and quiet. The decision stops being "is this side room worth a
round trip" and becomes "which way do I go", which is legible on screen in a
way a detour never is.

It is compatible with the shrine being the furthest room — distance and
branching are independent.

### The dependency that decides whether this works at all

**The bot cannot see down either branch, and has no reason to prefer the
short one.** It reads `Observation`/`Belief` only, and `belief.shrine` is
null until it has actually seen the shrine — so at a fork it does not know
where the exit is, how long either branch runs, or what is in them.

What it *can* see, once M16's bigger rooms are in play, is **creatures at
the mouth of the populated branch**. So the visible choice is "walk toward
what I can see is dangerous" against "walk toward what I cannot see".

And with `STEP_COST_IN_HP = 0.01`, **turns are nearly free**, so it will
always take the quiet one. The long safe branch wins every time and the
short dangerous one is never used — the same "nobody takes the detour"
problem in a new shape.

**So this needs turns to cost something first — that is `B7`.** That is the idea that came
up under the xp-per-turn discussion and was never written down: the bot
dawdles — 162 turns a floor, 47% reversal — because nothing charges it for
time. Branching without a clock is a fork where one side is always correct.

**That decision comes before this item, not inside it.**

### What it does to the rest of the map queue

**It obsoletes `M4`.** Side rooms as currently defined stop existing; there
is nothing to scale the spread of.

**It may resolve `M20`'s spine-share breach for free.** A room is spine
because the mandatory path crosses it — with two routes, neither is fully
mandatory, so the spine set shrinks on its own. The 95/5 split M20 produced
could come back toward the 70/30 the design asks for, without touching M20.

**It reuses a lever M16 already measured, in the opposite direction.** M16
found that raising `dugPercentage` to ROT's 0.20 drops floor 7's spine share
to 0.70, and treated that as the thing to avoid. **Under a branch design
that is the mechanism you want** — more connections mean more than one way
through. The measurement is already done; only its sign changes.

`M19`, `M21` and `M16` are unaffected.

### What to build, once the clock question is settled

- Map generation that produces a genuine second route to the shrine, most
  likely by putting `dugPercentage` back up.
- `spine.js` reworked. "On the shortest path" stops meaning anything useful;
  what matters is which rooms are on *some* route and which are on neither.
- Threat distributed so the branches **differ in character rather than
  merely existing** — one short and populated, one long and quiet. Two
  identical branches are a coin flip, not a choice.

**Assert.** Both branches actually reach the shrine. They differ measurably
in length and in threat. And the one that matters: **how often the bot takes
each.** If it is 95/5, the fork is decoration.

### B7 — raise STEP_COST_IN_HP so turns cost the bot something

Dropped by the owner, and the reason is worth more than the item was.

`STEP_COST_IN_HP` is not a game rule — it is the bot's exchange rate between
time and health, the λ from `bot-strategy` §0, the only way it can compare
"walk ten steps" against "take one damage". Raising it would have made the
bot act **as if** turns cost hp, when they do not, so its model would
diverge from the game and any reading of "is this trade right" would sit on
a false premise.

**The real finding underneath: nothing converts.**

    XP_FROM_KILLS   false    the hero's damage no longer grows with kills
    HP_FROM_KILLS   false    M6, built and reverted

A kill gives the hero nothing in-run — no damage, no capacity, only the drop
and one fewer threat. `dungeon.js` records that xp was frozen deliberately,
as part of stopping capacity running away. And the lifetime score from U4
has no effect on anything either.

So the bot has no reason to hurry because **hurrying buys nothing that
exists.** Any future attempt to make it hurry has to create the thing first
— decay, a turn limit, or letting kills compound again — rather than tell
the bot to believe in one.

## B7 · turn the clock on

`work agent` · **READY** — after M19

The score in U4 rewards finishing fast: `xpEarned / (turns × 0.01)`. The bot
does not read it, and it never will — it optimises survival, not score.

**But the bot already has a time cost, and it is switched off.**
`STEP_COST_IN_HP = 0.01`, which `balance.md` describes as *"the knob that
shows up as personality on screen, and the main thing P4 sweeps"* — and
which nobody has swept.

At 0.01 the bot walks a hundred extra steps to save one hp. Across 162 turns
a floor that is 1.6 hp of perceived cost against a 10 hp hero: it ignores
time completely, and the screen shows it.

**Do.** Raise it, and sweep rather than guess. `0.01 → 0.03 → 0.05` is
20–5 steps per hp instead of 100. Report turns per floor and finishes at
each.

**The alignment does not have to be exact, and should not be attempted.**
The meta-score rewards speed; the step cost makes the bot prefer speed. Two
different functions pushing the same way is enough, and trying to make the
bot literally optimise the score means giving it knowledge of a meta layer
it has no business seeing.

### Two things this might resolve on its own

**The pacing.** Reversal rate reads 47%. The bot paces because pacing is
free — every step back costs 0.01 hp and buys a moment's safety. Charge for
turns and the trade changes on its own. `B3` exists to fix this directly and
is parked; this may make it unnecessary, or may not, but it is one constant
against a rewrite.

**M22's fork.** Two routes to the shrine only pose a question if short is
worth something. With turns free, the quiet branch always wins and the fork
is decoration. This is the dependency M22 names.

### The caveat, and it decides the order

`balance.md` says raising this makes the bot *"hasty and reckless"*.
Finishes is at 0% and 14 of 30 runs die on floor 1. **Do this after M19**,
or a bot that already dies at the door will die at it faster.

**Assert.** Turns per floor, reversal rate, finishes and median depth at
each swept value. Reversal falling would be the interesting result — it
would mean the ping-pong was an economics problem rather than a bug.
