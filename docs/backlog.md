# Backlog

The task list. Everything needed to pick up a task and finish it.

> **Priority order, owner-set:** finish **the shop** first — U6e, then U6f.
> Then `docs/lab-backlog.md` (the manual dungeon simulator). Then the rest of
> this file.
>
> The **bot agent** is outside this ordering and works its own lane here
> (B11 onward) in parallel with all of it.

- **What we are doing and why** — `docs/project/objectives.md`
- **What was last measured** — `run-check.html` (a record, not a set of goals)
- **Closed items** — removed from this file once adopted. The transferable
  lesson goes to `docs/project/decisions.md`; the full report, result and
  review stay in the git history, where the commit message carries them.
- **Ideas with no slot** — `docs/project/candidates.md`

## How this works

**Every report names which behaviour document it made stale** — `rules.md`,
`bot-strategy.md` or `map-design.md` — or says plainly that none moved. See
`CLAUDE.md`. "None" is a valid answer that still has to be written.

**Watch the game. Fix what is wrong.** That is where items come from.

One item, one commit, and a test asserting the thing the item was for — "a
rat deals damage", "floor 5 is not cheaper than floor 4". Most items here
have a criterion you can check by looking or by asserting; the ruler is for
questions that are genuinely invisible.

Run the ruler when a batch lands, as a **regression check** — did something
break — not as a scoreboard. `run-ruler.html`, and put what it says in
`run-check.html`.

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

| # | id | what gets done | agent | status |
|---|---|---|---|---|
| 1 | U6e | The shop screen | ui | REPORTED |
| 2 | U6f | Watch a full loop, integration check | ui | READY |
| 3 | M33 | `finishes` has gone to zero and nothing measures it | work | READY |
| 4 | M31 | The M7 budget check is blind to earlyTierCapShare's real cost | work | READY |
| 5 | M21 | Deep floors put a creature where the hero lands | work | READY |
| 6 | X1 | Delete what nothing references | work | READY |
| 7 | X2 | 25 comments cite bot-strategy sections that no longer exist | work + bot | READY |
| 8 | X3 | Mark which dials tune the game and which tune only the bot | work | READY |
| 9 | D1 | The crowd-correction fit is overdue for its own redo | work | after M31 |
| 10 | M4 | Side-room risk/reward spread scales with depth | work | after M31 |
| 11 | E1 | One resumable turn loop in src/sim, instead of four copies | work | READY |
| 12 | M32 | Weapons become a tier ladder instead of a stack | work | BLOCKED on the lab |

The M11–M16 batch is done and closed — six items, one commit each, 89 tests
green. What it taught is in `docs/project/decisions.md`; the specs are in
git.

**Nothing has looked at `run-check.html` yet.** That was the checkpoint for
the batch and it is still owed, before M17 changes the same dials again.

Closed work is in `docs/project/decisions.md`. Parked and unscheduled is in
`docs/project/candidates.md`.





## X3 · mark which dials change the GAME and which change only THIS bot

`work agent` · READY · **small, comments and one doc column — no behaviour**

Sixteen constants in `src/sim/balance.js` are purely bot behaviour: step cost,
goal stickiness, reversal penalty, duel safety margin, crowd penalty, danger
falloff, exposure weight, hold range, the tactical dials, the frontier reveal
weight, the unknown-monster estimate, the loot horizon, the bot's chest-loot
belief, and whether the bot is told the monster count.

**They are in the work agent's directory and they are not the work agent's
concern.** B8 was a bot finding the work agent had to commit for that reason.

**This item does NOT move them.** Moving them would split the one thing
currently working: `docs/balance.md`'s top table is the project's defence
against value drift — spot-checked accurate, including dials changed the same
day — and it holds because every tunable lives in one of two known files. A
third source risks that to buy tidiness.

**The distinction worth making visible instead.** A game dial changes the
game: every player meets it, bot and both probes alike. A bot dial changes one
player's judgement while the game is identical — `makeSondaPolicy` does not
read `DUEL_SAFETY_MARGIN` at all. **A bot dial is not part of the game's
definition**, and nothing in the file or the table says so today.

**Do.** Group the sixteen under a header in `balance.js` saying plainly that
they tune the bot and not the game, and mark them in `docs/balance.md`'s top
table (a column, or a separate table — reader's clarity decides). Then a
crossing is legible in advance rather than discovered: "this is a bot dial
living in a work file, expect the bot agent to need a hand."

**Assert.** No value changes and no import moves — a diff touching anything
but comments and the doc has gone wrong. Tests green.

**If moving them ever becomes right** — frequent collisions on `balance.js`
would be the signal — the refactor has a clean proof available that most do
not: byte-identical bot traces on fixed seeds, the same proof E1 needs.

## D1 · the crowd-correction fit is overdue for the redo it asked for

`work agent` · READY · **sequence after M29, M30 AND M31** — the first two
moved the same strength/tier dials this fit is refit against; M31 may move
the M7 band itself, which is what "refit against the ramp as shipped" needs
to be stable before it means anything.

The crowd-correction fit carries its own escape clause in `docs/balance.md`:
*"if [the ramp] is ever switched on, this fit has to be redone."* **M17
switched it on.** Found by M25 while writing up something else; nobody owns
it, which is why it is now an item.

**Do.** Refit against the ramp as it actually ships today, or — if the
refit lands close enough to the current numbers to not matter — say so and
delete the escape clause, so the next person does not re-find it.

**Assert.** Whatever the fit predicts against what real play does, at the
shipped dials. If nothing moves, that is a result and gets written down.

**Also owed, smaller:** `balance.md`'s headline block still states the count
law as `2 × 1.3^(N-1)`, stale since M17. M25 flagged it rather than
rewriting someone else's record. Fix it here.



## M31 · the M7 budget check has a blind spot

`work agent` · READY · **found by M30's own review, not requested by the
owner — small, and worth doing before another item drifts through the same
gap**

M30 found this directly: the M7 ratio-formula check (`MONSTER_GROWTH_REBALANCED
× STRENGTH_GROWTH_REBALANCED^2.356 / MONSTER_GROWTH`) does not include
`earlyTierCapShare`, so it reads 14.35%/15%, unchanged from M29 — while the
actual end-to-end growth rate, read from the same `expectedFloorMass` closed
form the ratio check is supposed to approximate, moved to 1.3955, outside
the 1.34 ±0.03 band that check exists to protect. **The test passed while
the thing it is a proxy for did not.**

**Do.** Either fold `earlyTierCapShare` (and any future floor-local clamp
in the same family) into the ratio-formula check so it stops being blind to
this class of dial, or replace the check's formula with a direct read of
`expectedFloorMass(9)/expectedFloorMass(0)` — the number M30 already showed
is the more complete one — so the check tracks the quantity that actually
matters instead of a proxy formula that can drift out of step with it.

**Do not silently re-widen the band to make M30's 1.3955 pass.** That would
launder the exact finding this item exists to act on. If the band itself
needs revisiting, that is a separate, explicit decision — same discipline
M29's review insisted on for its own budget question.

**Assert.** Re-run the (fixed) check against M29 and M30's shipped state —
confirm it now correctly flags M30 as outside band, or, if the owner
decides the band should widen to accommodate M30, that the widening is a
recorded decision and not a side effect of the fix. Confirm the check still
passes clean on everything shipped before M30 that was never near this
edge.


## M32 · weapons become a tier ladder instead of a stack

`work agent` · **BLOCKED on the lab** (`docs/lab-backlog.md`) · owner
decision, deferred deliberately

U6e ships with flat prices and multi-buy, which makes the second weapon poor
value and shield-spam the rational purchase. That is accepted for now and is
recorded in U6e as deliberate. **This item is the real fix, and it is
deferred because it is not a shop change.**

### Why it is a whole-game change, not a pricing tweak

The diminishing return is arithmetic, not tuning: damage per turn is
perfectly linear in weapon points (`5/6 × (xp + weapons − 1) / 2`), but hp
*saved* goes as 1/dps, because turns-to-kill is `monster hp ÷ damage per
turn`. Measured: dagger (1 point) 15.75 hp, axe (2 points) 23.6 hp — **the
second point is worth 7.85, half the first.** No flat-damage weapon avoids
this.

So the fix is structural. Weapons stop stacking and become a ladder: one
weapon slot, tiers, each tier strictly better, price rising with tier. That
touches:

- **M26's creature drops**, which already gate weapons by creature tier
  (`WEAPON_AXE_MIN_TIER`) — a 5-tier ladder is a continuation of that
  mechanism, not a new one, but it changes what every drop is worth.
- **`weaponDamage`**, which sums the inventory today and would become
  `max()`. Small change, real one — it is combat.
- **The difficulty ramp**, since how fast the hero arms up is half of
  whether a floor is survivable.

### Why after the lab, specifically

Judging a change of this size needs the instrument that does not exist yet.
The lab is exactly that instrument — hand-tune the dials, run the same seed
against Sonda A, Sonda B and the bot, and read finish rate and median depth
against a known baseline. Doing this before the lab means tuning in the
dark, which is what M29 already cost a session to.

### Do not break this when you get here

`valueByItemName` (`loot.js`) prices a weapon as a **marginal delta** —
`campaignCost(player) − campaignCost(player + item)`. That is already
correct and already handles diminishing returns automatically. With
`max()` it keeps working and starts correctly valuing a worse weapon at
zero. **Whatever the ladder looks like, that marginal computation must
survive it.**

### Assert

Finish rate and median depth against the pre-change baseline, on paired
seeds, two families — via the lab. Cumulative weapon damage by floor 10.
And the shop question that started this: with a ladder, is there a real
choice between shields and the next weapon tier, or does one still
dominate?

## M33 · `finishes` has gone to zero, and nothing is measuring it any more

`work agent` · READY · **found by B11's review; blocks nothing, breaks
everything downstream that reads a finish rate**

`finishes` — the share of runs clearing all ten floors, the product's one
headline success metric — reads **0% on every arm of every recent
measurement**. B11's own safety rule ("stop if finishes falls") was
therefore incapable of firing, and it is the second item in a row where
that guard was decorative.

**This is not sampling noise.** Traced through this session's own reports:

    B3 / B4 era        5.0% -> 6.7%
    B9 (post-M29)      1.3%  /  0.0%
    B11                0%  on all four arms

The drop lands on **M29**, which turned `GUARANTEE_FIRST_WEAPON` off.
**M29 reported mean death floor and share-dying-by-floor-2 — never
`finishes`.** Its review adopted the change as "ties baseline" on those two
numbers, and the owner accepted parity on that basis. Nobody checked what
it did to the metric the whole product is judged by, so the trade was
accepted without its largest cost on the table. That is the finding, and it
is a review failure as much as an item one.

**Why it matters beyond bookkeeping.** A metric stuck at 0 cannot
discriminate between changes — every future item's safety check against it
is vacuous, exactly as B11's was. And `docs/lab-backlog.md`'s **L9 reports
finish rate as a dashboard headline**, so the lab would ship with a number
that is always zero unless this is resolved first.

**Do.** Establish what `finishes` actually is at a sample big enough to
read a low rate at all — a rate near 1% needs far more than n=60 to
distinguish from 0. Then decide, explicitly and with the owner: is ~0%
acceptable as the shipped difficulty, or is this the point where the
M29 parity decision gets revisited with the missing number in hand?

**Do not quietly re-tune to make the number move.** The decision about how
hard the game should be is the owner's, and M29's own review recorded the
options (spend past the M7 band, revisit floor 10's pin, restore the
guarantee). This item's job is to put the measurement on the table, not to
pick.

**Assert.** `finishes` at a sample that can actually resolve a low rate,
on both seed families, against the pre-M29 state as a reference point.
Report the sample size needed rather than assuming n=60 was ever enough.

## M21 · deep floors have something waiting where you land

`work agent` · **BLOCKED on M19**

The hero lands and has a moment to look around. On floor 1 that is an
opening; on floor 10 it is a free turn the floor should not be giving away.

**Do.** Make the chance that the spawn room holds a creature rise with
depth — near zero at the top, near certain at the bottom.

**What it costs the hero, and it is not the creature.** Tier comes from
`depthAt(pos, 'risk')`, which is distance from the hero, so anything in the
spawn room is drawn from the *bottom* of that floor's range. The danger is
not that it is strong — M13's tier floor decides that — it is that the bot
starts a floor **in contact, with no map**. Fog of war means it has seen
nothing yet and has to commit before it knows where anything is.

That is the whole reason it is interesting to watch, and also the reason it
might be too much: a bot that opens floor 10 already fighting has no
information to route with.

**Blocked on M24 now — M19 landed and paid the original debt.** What remains is narrower: this item places a creature next to where the hero lands, and M24 changes the tier of what can legally be there. Building it first means placing against a table that is about to change.

The old reasoning, kept for the record: `run-check` at n=30 says
**14 of 30 runs die on floor 1** and 24 of 30 by floor 2. Putting a creature
where the hero lands, before the hero can survive landing, is piling onto a
wall. M19 has to make the opening survivable first — then this becomes a
real escalation instead of a second lock on the same door.

Also after M20, which moves the spawn to a room centre. Placing creatures
relative to a spawn point that is about to move is work done twice.

**Assert.** Share of floors whose spawn room holds a live creature, at 1, 5
and 10 — near zero, middling, near certain. And `finishes`, because this is
one more thing making the descent harder at a moment when it is already at
zero.



## X2 · 25 code comments point at bot-strategy sections that no longer exist

`work agent` + `bot agent` · READY · **small, mechanical, and my fault —
filed by the project agent that caused it**

`docs/bot-strategy.md` was rewritten from "formalisation of the 3 rules" into
a description of what the bot actually does. The old section numbers went with
it, and **25 comments across `src/` still cite them** — `§1`, `§2`, `§2.1`,
`§3`, `§4.0`, `§4.3`, `§4.4`, `§4.5`, plus "rule 1" by name.

Spread: `src/bot/` (bot.js, duel.js, nav.js, tactics.js, threat.js,
placeholder.js), `src/sim/` (balance.js, combat.js, monsters.js, observe.js),
`src/analysis/` (observed-ruler.js, winnable.js).

**Do not repoint them at new section numbers.** They would break again on the
next rewrite, which is exactly how this happened. Two better targets
depending on what the comment is actually citing:

- **Reasoning about something that failed or was measured** → point at
  `docs/project/decisions.md`, which is where that now lives permanently and
  is organised by finding rather than by section.
- **Reasoning about what the bot currently does** → point at
  `docs/bot-strategy.md` with no section number, or name the function
  (`worthStarting`, `campaignCost`) instead. A named function survives
  reorganisation; a section number does not.

Some may turn out to cite something worth stating inline in two lines rather
than by reference at all — that is a better outcome than a pointer.

**Split by role:** `src/bot/` is the bot agent's; `src/sim/` and
`src/analysis/` are the work agent's. Either can go first, no ordering.
`placeholder.js` is on X1's delete list, so its reference may resolve by
deletion.

**Assert.** No `bot-strategy` reference in `src/` cites a section number.
Tests green — this is comments only, and a diff that touches anything but
comments has gone wrong.

## X1 · delete what nothing uses

**`run-zigzag.html` and `run-b9.html` are both clear to delete now** —
B3's condition (keep only if B8 has not shipped) and B9's (not meant to
outlive the item) have both resolved: B8 and B9 are DONE.

**Before deleting `run-zigzag.html`, decide where its wall-bump counter
goes.** B10 added a general-purpose "did this step pass a turn" counter to
that page — useful for any future routing change, not specific to B10 —
while the rest of the page's reason to exist (B3/B8) is closed. Losing the
counter by reflex when the page goes is the trap; port it into
`run-check.html` or wherever the next routing item's instrument lives, or
say explicitly it is not worth keeping and let it go.

`work agent` · **READY** — list refreshed after the metrics agent's own pass

The metrics agent already deleted `run-ruler.html`, `run-lab.html` and
`run-batch.html` when `run-check.html` replaced them. What remains:

**Pages of closed items — delete.**

    run-curve.html      superseded, sole user of curve.js
    run-shape.html      built on the retired campaignCost
    run-cluster.html    served I2, closed
    run-i3.html         served I3, closed
    run-zigzag.html     served B3, temporary by its own author
    run-b9.html         served B9, temporary by its own author
    run-b11.html        served B11, temporary by its own author
    run-axe2x.html      ad-hoc chat sim (axe/dagger value multiplier),
                        never a backlog item, safe to drop with the rest

**Modules — re-verify with a grep before deleting, the list is not proof.**

    src/analysis/curve.js       dies with run-curve
    src/analysis/batch.js       0 references at last check
    src/analysis/features.js    0 references
    src/analysis/winnable.js    0 references
    src/analysis/power.js       0 references
    src/bot/placeholder.js      0 references

**Trap:** `shape.js` is NOT orphaned — `observed-ruler.js` and
`test/tests.js` import from it. The page dies, the module stays. Check what
they import before touching anything.

**Stands after:** `index.html`, `run-check.html`, `run-tests.html`. And
`hardness.js`, which has three consumers including `src/sim/dungeon.js`.

**Assert.** Tests green, `index.html` plays a descent, `run-check.html`
produces numbers. Anything that turns out referenced stays, and gets
reported.

## M4 · scale the side-room bonus with depth

`map` · `work agent` · **READY, but sequence after M29, M30 AND M31** —
M29 left 0.65 points of a 15% band; M30 spent more of it, and M31 found
the band's own check is blind to what M30 actually cost. Size this
against whatever the M7 check reads once M31 fixes it, not against a
number that may currently be wrong.

`SIDE_ROOM_DEPTH_BONUS = 0.35` is fixed, so the only structural variance in
the game is constant across the descent.

**Why it matters.** It reuses machinery that already exists and was already
measured, and side rooms are the one place where risk and reward already
roll independently — `map-design.md` establishes why that independence is
what makes a detour a gamble rather than a free lunch.

**Acceptance.** CV per floor rises; the spine/side mass split stays at its
≥70% target; the average side room at floor 5 is not made harder, only the
spread widened. Measured on the probes.






## U6e · the shop screen

`ui agent` · **IN FLIGHT** — U6d's shield gap is fixed, see its Fix section · fifth of six

Three purchase options at run end, priced per the table already fixed
(shield 1, dagger 5, axe 8 — `docs/project/candidates.md`'s old U6 has the
derivation, now folded into this arc). Buying sets U6a's held-item slot for
the run about to start; U6d's option carries it in.

### Multiple copies are allowed — owner decision, with one thing to watch

Buy the same item more than once: 5 coins is 5 shields **or** one dagger.
Mechanically free, both already stack — `weaponDamage` sums the inventory,
and `player.armour +=` accumulates. **U6a's held-item slot has to become a
held-item LIST** for this, which is the one structural change it implies.

**The stacking curves are not the same shape, and the asymmetry is real:**

- **Armour stacks linearly, uncapped.** `effectiveHp = hp + armour` and
  nothing caps `player.armour`, so N shields is exactly 3N extra effective
  hp. No diminishing return, by construction.
- **Weapons stack with a sharply diminishing hp value.** Damage per turn is
  perfectly linear in weapon points (`5/6 × (xp + weapons − 1) / 2`), but
  hp *saved* goes as 1/dps, because turns-to-kill is `monster hp ÷ damage
  per turn`. The measured numbers show it: dagger (1 dmg point) 15.75 hp,
  axe (2 points) 23.6 hp — **the second point is worth 7.85, half the
  first.** That is arithmetic, not a tuning artifact; no flat-damage weapon
  can avoid it.

**At the owner's own example the exchange rate holds** — 5 shields is 15 hp
against one dagger's 15.75. **It breaks at larger balances:** 25 coins buys
25 shields, 75 armour on a 10 hp hero, against 5 daggers worth far less than
5 × 15.75. Shield-spam becoming the dominant purchase would make three
options one option with decoration.

**Owner decision: ship it knowingly wrong, and do not fix it here.** The
second weapon will be poor value and buying several shields will beat it.
That is accepted, on purpose, for a good reason: **the weapon curve is a
whole-game balance question, not a shop question** — it changes what every
creature drop is worth (M26), what the bot's marginal valuation computes
against, and how the difficulty ramp reads. Changing it belongs *after* the
lab exists, because the lab is the instrument for judging a whole-game
balance change. Filed as **M32**, blocked on the lab.

**So do not "fix" the pricing while building this item.** Flat prices,
multi-buy allowed, dominance accepted. If it looks wrong while you are in
here, it is meant to.

**One consequence that is bigger here than in an ordinary game, and needs a
deliberate answer before this ships.** Rogulidle plays itself — nobody is
guaranteed to be watching when the shop appears. Whatever the no-input
default is, **that is what actually happens in most runs**, not a fallback.
With flat pricing, a "cheapest affordable" default means *every run buys
shields*, forever, and the shop is three options that only ever resolve to
one. Pick the default deliberately with that in mind — varying it, or
weighting it toward the more interesting purchase, keeps the screen worth
watching while the pricing is knowingly wrong.

**One thing weapons are NOT being credited for yet.** The coin formula is
`xpEarned ÷ turns × 10`, so a weapon that kills faster earns *more coins per
floor*. The 15.75/23.6 prices came from `campaignCost`, which is hp only —
so a weapon's real worth, once this arc ships, is hp saved **plus** coin
yield, and the current prices understate it. Worth measuring before
concluding weapons are underpowered relative to shields.

### The bot already handles all of this correctly — checked, not assumed

Flagged because it looks like it should be a problem and is not.
`valueByItemName` (`loot.js`) prices a weapon as a **marginal delta against
the hero's live inventory**: `campaignCost(player) − campaignCost(player +
item)`. Hold five weapons and `withItem` builds a six-weapon hero, so the
smaller marginal value falls out automatically. B9's
`expectedMonsterDropValue` consumes that same map, recomputed every turn.

And armour is deliberately priced at fixed face value in the same function
— correct precisely *because* armour is linear. **The asymmetry above is
already encoded in the bot.** Nothing here needs a bot change, and any
future redesign of the weapon curve must not break that marginal
computation.

**Do.** Offer screen: three items, current balance, afford/cannot-afford
state. Purchase deducts from the persisted balance immediately (not
reversible by refusing to start the run — the coin is spent the moment the
purchase is made, matching the owner's original "buying means the next run
starts already holding it" framing).

**Must not block.** Same non-blocking spectator rule as U5 and the
hero-picker proposal: a default choice (skip / cheapest affordable / last
choice) if nothing is picked in time, never a pause waiting on input.

**Assert.** Balance decreases by the right amount on purchase. Skipping
leaves balance untouched and the next run starts unarmed, same as today.

### Independent price validation, and a number for later — not this item's
### to spend

Metrics agent, from a side conversation, reported without touching code.
Priced armour/dagger/axe against `loot.js`'s real `campaignCost` and got
3.00 / 3.15 / 2.95 hp per coin — independent confirmation the shipped table
(shield 1, dagger 5, axe 8) is not a coincidence, all three land within 5%
of the same exchange rate.

**A real number now exists for xp's hp-value: 0.117 hp per xp point**,
from Sonda A's measured 0.39 hp/turn baseline (no-pickup probe, n=20/floor,
1-10) run through the same coin formula U5/U6b already use (`3 ×
0.39 ÷ 10`).

**Do not use 0.117 to make the bot value killing for xp/gold mid-run when
that question eventually comes up.** That is the same mistake B9 already
made once with drop value — pricing an estimate into `chooseGoal` reordered
even mandatory fights and cost depth, before B9's own re-measurement
reversed the verdict. The recommendation, and it is a sound one: **price
any future gold-seeking bot behaviour the same way weapon/armour already
are — a real `campaignCost` delta with the gear equipped for the NEXT run
vs. without — not the coin formula**, which exists for `run-check.html`
diagnostics, not as a decision price. `0.117` measures something true
about the game; it was never built to be read by `chooseGoal`.

**Not this item's to act on.** No item yet asks the bot to risk hp for
xp/gold within a run — filed here as the note to find when one does, per
the sequencing metrics itself proposed: persistence and shop first (this
arc), measure real purchased-gear effect second, decide whether the bot
should spend hp chasing gold third.

## U6f · watch a full loop, coins to gear to next run to death to reset

`ui agent` · READY · **sixth of six, the integration check — closes the
arc**

Not new logic — confirms U6a through U6e agree with each other end to end,
which none of the individual items can prove alone.

**U6c owes you one thing: nobody has watched a real clear bank its coin.**
U6c verified the banking arithmetic synthetically because a real ten-floor
clear is roughly 1 in 20-30 full descents. This item is where that finally
gets observed rather than computed — budget for the wait, or say plainly it
was not observed here either.

**Assert, by playing it, not by reading code.** Earn coin across a run,
survive to the shop, buy the dagger, watch the next run start already
armed, die, confirm balance/item both reset to zero (flag off, default).
Repeat with the flag on and confirm the opposite. If any step disagrees
with what its own item asserted, the bug is in the seam between two items,
not in either one — say which seam.

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
  produce every number `run-check.html` shows; if any of them moves, the
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

