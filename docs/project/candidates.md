# Candidates and archived routes

Ideas with a reason attached but no slot, and routes that were measured
and dropped. Nothing here is scheduled. The task list is
`docs/backlog.md`.

## Candidates — recorded, not scheduled

Ideas with a reason attached, waiting for a slot. Nothing here has an
acceptance number yet; several would not survive contact with one. They sit
here rather than in the queue because the instrument question is unresolved —
today that is **`I11`**: whether the ruler still reads true once the starting
hero changes, which the shop already makes it do. Scheduling work against a
suspect instrument is the mistake the buffer target already made once. (`I5`
asked an earlier version of this and was deleted in a documentation cut; only
its live half was refiled.)

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

### M43 · the vault and the Butcher — a fixed room on floor 4

`owner idea` · **BEING BUILT** — the design record; the task list is in
`docs/backlog.md`

A fixed-layout room, always on floor 4, always a dead end off the mandatory
route, holding one hand-placed mini-boss and six extra chests. Diablo's
Butcher, in this engine's terms.

#### The diagnosis it answers, and it is not the one the owner started from

The owner's report was "the opening is boring because it is always easy."
Measured over 150 descents on the SHIPPED dials (`dial-overrides.json`, no
shop items), that is not what the numbers say:

| floor | reaches it | dies there |
|---|---|---|
| 1 | 100% | 3% |
| 2 | 97% | 13% |
| 3 | 84% | 10% |
| 4 | 75% | 16% |
| 5 | 63% | 14% |
| 6 | 55% | 13% |
| 7 | 47% | 24% |
| 8 | 36% | 33% |
| 9 | 24% | 64% |

**Floors 2 through 6 carry the same risk.** Not low — identical. Five floors
that tell no story, followed by a cliff. The defect is flatness, not
easiness, and a flat stretch is exactly what a fixed landmark fixes and what
a dial cannot.

Worth recording because the backlog's own note is stale in a way that
inverts the reading: "opening deaths" is quoted at 0.667, which is the CODE
DEFAULTS. On the dials that actually ship, runs over by traversal 3 measure
**24.7%** — the tripwire does not fire, and there is no opening-lethality
problem to fix here.

#### Why it fits the curve rather than fighting it

`map-design.md` says the middle's interest has to come from **variance of
reward, not of challenge** — a noisy middle destroys the one job that
stretch has, being legible enough to read whether the hero is on track. An
optional vault is precisely that: the mandatory route's pressure does not
move at all. Raising `MONSTERS_BASE` or `STRENGTH_GROWTH` on floors 3–4 to
get the same climax would break the property instead.

**And it answers an open item rather than only adding one.** This file and
`map-design.md` both record, with measurement, that the side-room gamble is
a free lunch: nothing is refusable, and what is missing is **on the cost
side, not the reward side** (`M36`). A detour that can end the run is the
cost side. That is the strongest argument for building it.

Three consequences to accept deliberately:

- **The hero's capacity peak moves earlier than floor 6.** The relief
  stretch shortens and the 7–10 ramp gets steeper. Wanted — but it means
  the deep floors need recalibrating after, not before.
- **Floor 9 already kills 64%.** The vault pushes that down by arming
  whoever survives it. Not a neutral side effect.
- **Whoever refuses ends up poorer than today**, not level, because the
  game's resource baseline starts including those who accepted.

#### The Butcher — measured, not guessed

Monte Carlo of the duel under the real rules in `combat.js`, 4000 duels a
row, against the hero who typically arrives on floor 4 (hp 8 + armour 4,
weapon +3):

| candidate | hero strikes first | boss first | +1 potion |
|---|---|---|---|
| hp 12 / xp 5 | 78% | 68% | 84% |
| hp 14 / xp 6 | 52% | 40% | 59% |
| **hp 16 / xp 6** | **41%** | **30%** | **48%** |
| hp 18 / xp 6 | 32% | 23% | 38% |
| dragon (15/8) | 26% | 17% | 28% |

**hp 16, xp 6, activation 12, 🧌.** The same creature against other hero
states: 6% for a poor hero (hp 6 + armour 1), 24% for a typical floor-3
one, 41% typical floor-4, 80% rich (hp 10 + armour 7, weapon +4). That
spread is the product — the outcome is **attributable**, which is what
`objectives.md` asks of a rare event and what a uniform 65% killer cannot
give.

**Meat, not bite, and the reason is watchability.** A t-rex (hp 12, xp 10)
produces almost the same win rate (29%) and is a worse design: bite 10
settles the duel in three turns and can take 9 of 10 hp in one blow — a coin
flip, no reversal, hope reaching zero all at once. At xp 6 the biggest
possible blow is 5 against 10 hp, so **it can never one-shot a full hero**,
and the duel runs about ten turns with the bar moving both ways.

**Floor 4, not 3.** 41% against 24%; 75% of runs get there; and
`WEAPON_AXE_MIN_TIER` is 4 (wolf), which is exactly floor 4's own ceiling —
so a guaranteed axe there pulls the item forward by roughly two floors
without being off-schedule. Measured, the shipped game's mean `dmgMin` is
0.20 at floor 5 and 0.51 at floor 6: the axe is genuinely late today.

**The bot commits and breaks off on its own, with no new rule.** `duelCost`
falls with the monster's remaining hp; the bar it is compared against falls
with the hero's effective hp. Winning, the cost falls faster and the bot
stays; losing, the bar falls faster and it disengages mid-fight. The
reversal is already in the machinery.

#### The room, and why the pillars are not decoration

9×9 with four pillars, one door, six chests. Larger than any generated room
(`ROOM_WIDTH` [5,9] × `ROOM_HEIGHT` [4,7]).

```
c . . . . . . . c
. # . . . . . # .
. . . . . . . . .
. . . . . . . . .
. . c . B . c . .
. . . . . . . . .
. . . . . . . . .
. # . . . . . # .
c . . .[+]. . . c        [+] the only door
```

**The pillars were justified with a mechanism that turned out not to exist,
and the correction is the useful part.** The claim was that `dangerField`
floods from the creature through walkable ground, so a pillar forces the
flood around itself and leaves a cheap pocket behind it. Measured tile by
tile, with the pillars and without: **the two price grids are identical.**
On a 4-connected grid an isolated one-tile obstacle never lengthens a
route, because every monotone way around it is the same length. There are
no pockets, and there was never going to be a way to get them without
turning the hall into a maze.

**The gradient that is real is plain distance from the centre**, and it is
steep enough on its own — menace halves every step, so the Butcher's own
tile prices at 2.08 hp a turn, the flanks at 0.52 and the corners at 0.01,
a two-hundredfold range inside one room.

**And what gates the chests is not that gradient at all.** `guardCost`
charges the whole duel against every chest inside the creature's chase
radius, which is the entire room, so the six are refused or accepted
**together**. One bet, six payouts — cleaner than six small ones, and
legible in a way six separate rolls would not be. What the gradient decides
is the ORDER once the bet is taken: corners first, and the two beside the
Butcher only by dealing with it.

**So the pillars are kept for legibility, and that is a real job rather
than a consolation.** The badge under a creature shows xp and never hp, so
a 16-hp Butcher looks exactly like a vampire until it refuses to die. The
room has to be the warning label. Vision is by distance and ignores walls
(`VISIBLE_DIST` 9), so the hero sees the whole hall from the door — a
pillared room full of chests is the tell, and nothing else in the game
looks like it.

#### How it is stamped, and the three properties that fall out for free

`src/sim/vault.js`, called from `populate()` after `classifyRooms` (step 3b)
and before the chests. A deterministic grid scan finds a 9×9 rectangle of
undug ground with a one-tile margin, then a straight tunnel from any
position on any of its four sides out to a tile **on the hero→shrine path**.

- **Side by construction, not by probability.** One door, a dead end, and
  the shrine was already placed before the vault existed — so the
  hero→shrine path can never enter it. No dial, no chance.
- **Seen by construction.** The door opens onto the mandatory route, so the
  hero walks past it. That is the "informed" clause of what a choice has to
  be.
- **No randomness at all.** The scan consumes no draw, so seeds, replays
  and every stream stay aligned — the same property that makes `spine.js`
  safe, and the reason `classifyRooms` can simply be re-run after the stamp
  instead of being patched.

Measured over 200 floor-4 maps on the shipped dials:

| outcome | share |
|---|---|
| stamped, door on the spine | 86.0% |
| stamped, door off the spine (fallback) | 13.5% |
| no free rectangle — no vault this seed | 0.5% |

Tunnel length: median 2, max 8. The off-spine fallback exists because a
vault that is merely harder to find is better than a floor that sometimes
has none; the 0.5% follows the same failure rule the shrine guardian
already uses — skip it rather than force a tile conflict.

#### The decisions that are load-bearing, and would be easy to get wrong

**The vault's chests and creature must NOT be added to the counts granted
to the bot** (`rules.md` §7). Granted, the bot explores until it finds them
and the detour becomes mandatory. Left out, the existing rules already give
the wanted behaviour: the hero sees the room, `guardCost` prices the
Butcher at about 12.5 hp against `sideBar = sideAppetite × fightMargin ×
ehp ≈ 6.3`, and refuses. **Refusing is the default; taking it is the dial.**

**`sideAppetite`'s slider needs a wider range to express the choice.**
Accepting needs `sideAppetite × fightMargin ≳ 0.98` and both sliders stop
at 1.0, so today only absolute maximum courage takes the fight. Widening
`sideAppetite` to [0, 2] is a range change rather than a new parameter, and
its meaning is honest: above 1 the hero risks more on the optional than on
the mandatory, which is what greedy means.

**Six chests pay more than it looks, and they were built authored rather
than rolled.** Three shields and three potions, the same every seed: about
+9 armour and +9 healing against a hero who reaches floor 4 holding roughly
4 armour, on top of the axe. Rolling them the ordinary way would have
landed near the same place (~4.5 items) at the cost of eighteen draws and a
payout nobody can know in advance.

**The tension in fixing it is real and is recorded rather than resolved.**
`map-design.md` asks the middle of the run to carry variance of REWARD, and
a constant payout carries none. It is fixed anyway because a choice has to
be **informed**, and the variance that actually matters here is whether the
hero collects any of it — 6% to 80% depending on the state it arrives in.
If the vault ever reads as a vending machine, `VAULT_CHEST_ITEMS` is the
one thing to change.

**The Butcher's mass is excluded from the floor's own curve.** hp × (xp−1)
is 80, larger than all of floor 4's ordinary roster together, so counting
it would wreck both `spineShare()` and the monotonic-mass guarantee.
Refusable mass does not belong to the floor's pressure. Tagged `vault` and
skipped by both.

**No leash, deliberately.** The Butcher follows the hero out of the room,
which is what makes the detour able to cost the run — the `M36` half.
The failure to watch for is a Butcher that camps the stairs; the fix if it
happens is a lower `activation`, never a leash, and never a second verb.

#### What was refused up front

Phases, ranged attacks, summons, regeneration. The engine has one verb —
walk into a thing — and a second verb is a second system.

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

### Cycles — a hypothesis, with a mechanism that already exists

`owner idea` · **UNSCHEDULED** · moved here from `objectives.md`, which is the
root document and states no mechanism

The owner's suggestion: alternating stretches of winning, of failing, and of
trading wins and losses would make a better experience than a flat rate.

**Worth recording that nothing needs building for this, and that it is already
gated on the same thing.** Runs are independent draws — each seed is derived
from the session seed and the run number, so nothing in the engine creates a
cycle. But the shop does: coins bank on a clear, buy gear, make the next run
easier, which earns more coins. **That is a ratchet.** And the owner's own death
rule — lose the balance and the held items — is the crash that resets it. A
ratchet with a reset is a sawtooth, which is the cycle structure described.

**Two honest caveats.** The ratchet only engages once runs are winnable at all,
so today the mechanism is inert for the same reason everything else is. And if
compounding outruns the reset, cycles become a runaway instead — win once,
snowball, win always, which is the *other* named failure. The death reset is
the only brake, and nobody has checked it is strong enough.

**Still judged by watching.** None of these is measured today, and the project
has already paid once for treating a proxy as the thing.

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

### U11 · O inferno — a branch at floor 10, and one seed the whole world shares

`owner idea` · **UNSCHEDULED** · recorded whole; the four parts cost wildly
different amounts and only one of them is expensive

At floor 10 the hero may meet an entity offering two portals. One goes back:
pocket the coins, descend again stronger. The other goes down — twenty more
floors of hell, the Balrog at the bottom. Reaching the Balrog is meant to be
nearly impossible and beating it nearly impossible on top of that, so the real
objective becomes **how deep into hell you got**. **Only the descent** runs on a seed drawn per
day and shared by every player — floors 1-10 stay private and random, one new
seed per run, the way they are today. The scoreboard is who went deepest on
today's seed.

**What it solves is the open risk in the owner's own philosophy.** The stated
position is a deliberately hard baseline with power unlocked through
achievements — and the unanswered half of that is what stops the unlocks from
eventually trivialising the game. An unreachable victory is an infinite power
sink. Every fraction of power moves the deepest floor a little and none of them
ever finishes anything, which is a licence to ship power without first proving
it did not break the curve. This project has never had that licence and it is
why every dial change turns into a measurement cycle.

It is also the shape `objectives.md` already asks for. "A permanent unlock is
safest when it buys a different way to lose rather than a lower chance of
losing" — a boss nobody beats converts every gain into *losing deeper*, which
is that sentence with the sign flipped and nothing else changed.

**How many descents a day is the decision this rests on, and it is not
anti-grind.** With no cap the floor-10 choice is not a choice: descending is
free and there are forty more attempts today, so the portal home is never taken
and the entity is a button. A small cap — three — makes "spend one now or go
back and return stronger" the push-your-luck the whole thing is for.
`objectives.md` says the same in its own words: an option with no real weakness
is not an option. The cap also settles the leaderboard's other distortion,
since best-of-N ranks whoever left the tab open longest whenever N is
unbounded.

**The daily seed is the strongest part, and not for the obvious reason.** Not
because dailies are engaging; because THE BOT PLAYS. Sharing the seed removes
the map from the comparison, and what is left is the only thing the player
touches: the build — dials, hero, unlocks. It turns a scoreboard into a
comparison of CONFIGURATIONS, which is exactly the thing the Lab has never had
a reason to matter for. Rogule's own daily compares play; this one compares
preparation, and preparation is what a game that plays itself can actually
offer. The engine needs nothing new for it: same seed, same run, always
(`src/sim/rng.js`).

**The private 1-10 does not break that, because the game is idle.** Two players
enter the same hell with different gear, so a single descent compares build AND
the luck of the preparation run. Over a day of continuous play the board records
the BEST descent, which is the maximum of many draws — and the shape of that
maximum's tail is the configuration, not the luck. Sorting by best-of-N is what
converts a noisy per-run comparison into a comparison of builds. It is also why
the cap above matters: it fixes N for everyone.

**It does not reintroduce the daily gate.** The product line is "no daily gate
— the next run starts the moment the last one ends", and "desafio diário" reads
exactly like the thing that was refused. It is not: hell is a BRANCH off the
ordinary loop. The main descent stays ungated and endless, and the dated seed
governs one optional door inside it.

#### The blockers, hardest last

**The floor-10 branch is invisible today, and that orders the whole feature.**
Mean depth for the base hero is around 4.6 and floor 7+ happens in 17% of runs;
floor 10 is effectively never reached. So this sits DOWNSTREAM of the unlock
system rather than beside it — building the door before anyone can walk to it
is building nothing.

**Twenty floors of content almost nobody sees** is the worst work-to-eyes ratio
available — the vault took a whole cycle for one room on one floor. Unless hell
is not content: `makeFloorPlan` already turns a model into arbitrarily harsh
floors, so hell as a MODEL with the dials pushed is nearly free, and that has to
be the first version. New tiles, new bestiary and a named boss are a later
argument, not this one.

**The Balrog is a design problem this project has already measured and lost
once.** `decisions.md`: entry and survival are the same number — whether the
bot takes a fight is `duelCost <= bar` and whether it survives one is roughly
`duelCost / effectiveHp`, so anything that makes a fight deadlier makes the bot
REFUSE it instead of losing it. An unbeatable boss is a boss the bot walks away
from; the run then ends on the turn budget, which is the dullest possible
ending. The Butcher needed `speed` precisely because it was the one property
found that moves what a fight COSTS without moving what it is PRICED at. The
Balrog needs that trick, or a rule that deletes the choice — no retreat, or a
floor whose only exit is through it.

**The shared scoreboard needs a server, and the project has refused one.** "No
frameworks, no npm, no build step... must run by opening HTML files / GitHub
Pages as-is." A leaderboard is state written by many clients and read by all,
which is the one thing a static host cannot do. Every way around it breaks a
rule that is currently load-bearing. This is the real cost of the feature — not
the hell floors, not the boss — and it is worth knowing that BEFORE any of the
cheap parts get built, because the cheap parts are worth building even if this
never is.

#### The order that makes it cheap

Hell as a difficulty model, not as content. Then the floor-10 choice. Then a
date-derived seed with a LOCAL best, which delivers the daily's real mechanic —
everyone comparing the same map — to anyone willing to screenshot. The shared
scoreboard last, if ever.

**Relationship to U8/U9, which nobody should re-derive later.** U8 already cuts
a run into blocks and U9 already puts a hold-or-bank decision at each boundary.
This is that shape with the stakes moved: one boundary instead of five, and the
"extract" side is the ordinary game rather than a harder block. If U9 lands
first, this is a configuration of it and not a second system — and U9's own
blocker, a balance that is readable and spendable mid-run, is this feature's
blocker too, since "pocket the coins" is the same machine.

### U12 · The board — a name, a date, and a seed anyone can replay

`owner idea` · **UNSCHEDULED** · U11's expensive blocker, priced down to about
half a day by dropping accounts

The cheap version of the scoreboard U11 needs. **No login, no accounts, no
sessions, no device locking.** The player types a name, it lives in
`localStorage` beside the six stores already there, and using the same name
means being the same person. That is trust, chosen deliberately: the game is
played among friends, and every mechanism that would enforce identity costs
more than the problem.

**What gets submitted is `{name, date, config, runSeed}`** — never a score.
Not for anti-cheat (the trust is granted) but because the seed is shared and the
simulation is deterministic, so those four fields let ANY browser replay the
run and arrive at the same number. Watching how a friend reached hell floor 31
falls out of what already exists. `runSeed` is the private 1-10 seed and it has
to be in there: without it the arrival state is unknown and nothing is
reproducible, since only the hell half is shared.

**Derive the daily seed from the UTC date, not the local one.** A friend in
another timezone otherwise plays yesterday's or tomorrow's map and the board
silently compares different dungeons. One line, and the kind of thing that
surfaces only when somebody travels.

#### The cross-device conflict dissolves, and it is worth knowing why

The worry was two devices on one account picking different seeds and corrupting
each other's progress. With a date-derived seed there is nothing to reconcile:
both devices compute the same seed without talking. No lease, no heartbeat, no
single-instance lock, none of the edge cases those drag in (closed laptop,
offline play, clock skew, takeover flow).

**The consequence to accept on purpose:** with no account, progression stays PER
DEVICE. Wallet and achievements on the phone are not the ones on the desktop, so
a hero unlocked on one is locked on the other. For a game played among friends
that is probably fine — but it is a decision, not a detail, and it is the whole
price of dropping accounts.

#### What it still costs

A server, and this would be the first one. "Must run by opening HTML files /
GitHub Pages as-is" becomes false the moment a board exists. The rule can be
preserved where it actually matters — the game stays fully playable anonymous
and offline, with name and board purely additive — but that has to be written
down rather than left as a consequence. With accounts dropped the server is a
table with an insert policy and a select; the re-simulation that would have
been needed for trust is optional, and worth keeping only for replay.

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

## U8 · Estratos — blocks of ten floors inside one run

`owner idea` · **UNSCHEDULED, outside P4** · recorded so the hard part is not
lost

A fifty-floor run as five blocks of ten, each recalibrated, so entering a new
block is a fresh start without leaving the run.

### The "naive version fails" argument survives, but not as written

**One of its two pillars is wrong.** The proposal says `HP_FROM_KILLS` is on
and counts kills across the whole run. It ships **false** — `balance.md`'s own
line reads "BUILT, NOT ADOPTED — briefly on, then reverted by the owner". Max
hp does not grow with kills at all, so that pillar carries nothing.

**The other pillar is right, and the corrected version is stronger than the
original.** Gear persists across floors, chests are flat per floor, and
`docs/rules.md` establishes that **weapons are the only thing that makes the
hero permanently stronger** — and `weaponDamage` sums the inventory with no
cap. So the unbounded accumulator is not hp, it is weapon damage, and it is
unbounded by construction rather than by a flag setting. A hero entering block
three carries twenty floors of it.

The conclusion holds: block one calibrated, later blocks progressively easier
at the opening, which is the opposite of encapsulated difficulty.

### The minimum-change question the proposal does not ask

`k_tier` is a new parameter. `CLAUDE.md`'s rule says say why an existing one
cannot carry it — and here one plausibly can. A stratum is a **restart of the
floor index**, and what already sets the count curve against that index is
`MONSTERS_BASE` with its growth. "Entering block three is like floor one with a
bigger base" is the same statement as "multiply the count by `k_tier`", but
expressed in a dial that exists and is already measured, sweptable and
documented.

Not a refusal — a question to answer before building. If a multiplier really is
different from a rebased count, one line saying how.

**Count rather than strength is correct** and does not need re-arguing: cost
tracks count linearly and strength superlinearly, which `balance.md` derives.

**Measured rather than derived is also correct**, and for the recorded reason:
nothing predicts outcome from map attributes — correlations top out near 0.3
and a fitted model reached 64% against a 59% base rate. Controlling generation
works; predicting from it does not.

### The dependency is real, and the item it names is gone

The proposal blocks this on `I5`. **`I5` was a real filed item and was deleted**
in a documentation cut (`e05b878`), and its framing — the ruler cannot see the
buffer where the target lives — is obsolete anyway, since buffer targets no
longer exist.

**The live question inside it survives and is now `I11`**, refiled: does the
ruler still read true when the starting hero changes? That matters here because
a stratum boundary is exactly a changed starting hero — and it is already live
for a reason that has nothing to do with this feature. See `I11`.

### The cheaper alternative, honestly stated by the proposal

Full hero reset at the boundary reproduces the curve exactly, because it
recreates the conditions the curve was calibrated under, at almost no cost —
but it makes the run five concatenated runs with a shared scoreboard, which
gives up the point. Correctly recorded rather than quietly preferred.

## U9 · Extração — the decision at a stratum boundary

`owner idea` · **UNSCHEDULED** · blocked on U8, and on the same mid-run balance
U7's Pawa needs

Push-your-luck at each block boundary: hold the gear and go deeper, or extract
and bank the gain, starting the next block harder but clean.

### The best thing in the proposal is a dependency nobody had spotted

Extraction needs a balance that is **readable and spendable mid-run**. U6c
settles only at run boundaries. **U7's Pawa needs exactly the same thing** —
that was recorded in U7's own review and nobody connected the two. One piece of
work unblocks both features, and finding that before either was scheduled is
worth more than either.

**And the banking machinery mostly exists.** U6c already does bank-or-clear at
a boundary; this adds a decision point mid-run to a machine that runs, rather
than a new system.

### The load-bearing argument is not established, and its own source says so

The proposal is right that **the asymmetry is what stops this collapsing into a
no-brainer** — if the rescale is perfect, both paths are equally hard by
construction and there is no choice. It then argues the asymmetry already
exists: gear is flat and rots against exponential growth, so holding is better
now and worse later, while experience compounds between runs.

**Checked, and the cited source says something different.** `balance.md`
measures the arc as **a hump, not a decay**: *"Capacity rises to 20.7 by floor 6
then grinds down to 10.8 by floor 10 — the hero builds up and is worn away."*

That is not "gear rots". It accumulates through the first half and is ground
down in the second — which means **at a boundary the hero arrives at the bottom
of the wear-down, not the top**. The choice may still be interesting (keep
depleted gear, or reset clean) but it is a *different* choice than the one
argued, and the proposal cites the same passage for two incompatible readings:
"capacity rises" as a problem to contain, and "gear rots" as the engine of the
feature.

**And the figure carries a warning the proposal did not carry over.**
`balance.md` flags immediately below it that the ruler changed **twice** and
every cost figure above that point was measured with the superseded model. So
the number is pre-change on top of not saying what it was cited for.

**What this does not mean.** The feature is not dead — the asymmetry might be
real at the new scale, and a hump repeating per block is arguably a *better*
rhythm than monotone decay. It means the asymmetry is **an open measurement,
not an established fact**, and it is the piece the whole design rests on. It
cannot be settled before U8 exists, since it is about behaviour across a
boundary that does not exist yet.

### The rest checks out

**Experience as the currency**, with what it buys deferred, avoids inventing
content and is cheap — a counter and a bar.

**Non-blocking by default**, with a pre-set policy applied automatically at the
boundary and any live override optional. Same rule U5, U6e and U7 already
follow, and correctly cited rather than reinvented.

**The bot decides for now.** Spectator control is deferred territory and
swapping who presses the button later does not change the mechanic underneath.

## U7 · a hero picker, persisting across deaths

`owner idea` · **UNSCHEDULED — spectator control, the territory already
flagged as deferred until bot/map base is done. Recorded, not blocking.**

**Status changed at the premise level, not here.** `objectives.md` was
rewritten around a premise in which the player chooses a hero, so U7 now has a
**filed backlog item** carrying the premise, the three tests a choice has to
pass, and the two dependencies. **This section is unchanged and remains the
build spec** — the four heroes, what each does, what was checked against the
code. Read the backlog item for why it is being built; read this for what to
build.

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

### Vito's behaviour, pinned down — "fearless" made concrete and checked
### against what shipped since the original proposal

The original pitch said `DUEL_SAFETY_MARGIN`/`DANGER_FALLOFF` loosened,
`STEP_COST_IN_HP` high — fearless, prioritises combat and time. Still the
right shape, but one premise underneath it changed: **B9 shipped
`priceDrops` ON by default**, so "fights more because of loot value" is now
BASE BOT behaviour, not a Vito differentiator. He needs more of it than the
base bot gets, not the same amount.

**Do — reuse existing dials, no new mechanism.** `DUEL_SAFETY_MARGIN` and
`TACTICAL_OVERRIDE_MARGIN`, both already real settings threaded through
`makeBot`, set looser for Vito specifically. Tied causally to his own trait
rather than bolted on: the axe's `dmg +4` kills faster, so a fight costs him
less hp than the same fight costs the base bot, which is what makes
accepting a marginal fight safer FOR HIM specifically — and taking more
fights means more chances at a weapon drop, which stacks (`weaponDamage`
sums the inventory) and compounds: more weapons kill even faster, which
makes the next marginal fight safer still.

**Must not collide with Ricardo.** Ricardo's margin (once the
`DUEL_SAFETY_MARGIN` calibration item is actually filed and run) will be
the CALIBRATED OPTIMUM. Vito's is deliberately looser than optimal — accepts
worse odds on purpose for more action, a real "fearless" rather than "plays
well." If both personas end up at the same number, they have collapsed into
each other; the two need to land at visibly different values or the
distinction is cosmetic.

**Open empirical question, not assumed either way.** B9's clean
re-measurement found `priceDrops` safe at the base bot's calibration — side
kills +18-31%, depth/finishes unchanged. Whether that holds once the
safety margin is ALSO loosened on top is a different, untested question;
the earlier contaminated B9 reading that suggested reordering hurts
mandatory fights is the shape of failure to watch for specifically.

**Simpler dependency than Pawa's.** Blocked on U7's base persona-as-state
work only — no `U6` dependency, since this is pure bot-search/combat
tuning, not the coin economy.

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
alongside U6e's between-run shop. This is causally tied to his actual trait
(more armour per shield) rather than a bolted-on preference, which
"explore more" never was.

**Blocked on both U6 and U7 landing, not just U7.** Needs a coin balance
that is readable and spendable MID-RUN — U6c today only settles the
balance at run boundaries (bank on clear, reset-or-carry on death per the
flag) — and needs the persona system itself, since only Pawa gets the
option. Sequence: U6 (all six parts) and U7's base persona-as-state-
parameter work land first; this is additive on top of both, not a seventh
U6 item and not foldable into U7's first pass.

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

Distinct behavioural signatures per persona (Pawa's armour-purchase timing
and its effect on fights survived, Vito fights more/floor) via batch
comparison, before this counts as done.
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
