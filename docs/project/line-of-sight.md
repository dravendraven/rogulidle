# E2 · line of sight — the hero stops seeing through walls

**Status: scoped, NOT scheduled.** This is the design record and the scope.
Nothing here has been built, and several decisions below are the owner's,
not a session's. The task list, if this is ever scheduled, goes in
`docs/backlog.md` like every other item.

## What it is

Today visibility is DISTANCE ALONE: `isVisible` (`src/sim/observe.js`)
compares squared distance against `VISIBLE_DIST²` and stops there, so the
hero sees through walls. That is faithful to the original — `rogule-spec.md`
§12.1 — and deliberate.

The proposal is true line of sight: a tile is visible when nothing solid
stands between it and the hero. Everything already seen stays known, dimmed,
from memory. The viewport follows the same rule, so what the viewer sees is
what the bot sees.

## Why this is not a rendering change

Seeing through walls is load-bearing for the CURRENT design. It is what lets
the bot compare two rooms before committing to either, which is what makes
"take the detour or not" an informed choice. Remove it and the same dial
stops meaning what it means:

- `guardCost` prices a detour by the creatures it can SEE waiting there.
  Behind walls it sees nothing, returns ≈ 0, and `sideAppetite` goes inert.
- The bot's memory is trustworthy today because of one invariant: **close ⇒
  observed**. Anything within 9 tiles is refreshed every turn, so what
  survives in memory is far away, and far creatures are outside their chase
  radius and provably motionless (`docs/bot.md`). Line of sight breaks that
  invariant — a creature can be three tiles away, awake, moving, and
  invisible behind a wall.

So the feature is a design change with a rendering side effect, and the
owner's framing is the reason to want it: **the side room becomes a real
bet.** You do not know whether it holds two chests and nothing else or a
pack; the appetite dial stops pricing a known toll and starts buying risk.
That is a better dial than the one that exists. It is also why the two
halves — LOS and the re-meaning of `sideAppetite` — cannot ship separately.

## Requirements

**Perception**

- **E2-R1** Visibility is line of sight from the hero, bounded by the same
  radius. A tile blocked by a wall is not visible, however close.
- **E2-R2** Memory is unchanged in kind: terrain once seen stays known
  forever; entities are remembered where they were last seen.
- **E2-R3** A wall bounding a visible floor tile is itself visible, or the
  map reads as holes. No decision here, just a rule that has to exist.
- **E2-R4** ONE definition of "visible", produced by the engine and consumed
  by everyone. Today `src/ui/render.js` recomputes it by distance — a second
  copy of the rule, which LOS turns from redundant into wrong.
- **E2-R5** Determinism is untouched: field of view draws no randomness.
  Maps, rosters, spawns and replays stay byte-identical, and
  `tools/measure.mjs --selftest` keeps passing unchanged. If that selftest
  moves, something was built wrong.
- **E2-R6** The bot still reads Belief only, and no new field may carry an
  unrevealed answer (CLAUDE.md's channel rule). See D3 — the side flag is
  exactly the field this bites.

**Belief and staleness**

- **E2-R7** "Seen now" and "remembered" must be distinguishable — by the bot
  when it prices danger, and by the viewer on screen. Today the two are the
  same object with a dimmer opacity.
- **E2-R8** A remembered creature must be able to go stale. What "stale"
  costs is D4/D5; that it exists is a requirement, because the invariant in
  E2-R2 no longer covers the near-and-hidden case.

**The gamble**

- **E2-R9** The side-room bet is priced WITHOUT seeing inside it, from what
  the bot is already granted (creature and chest counts, `rules.md` §7) minus
  what it has already found.
- **E2-R10** No new balance dial for that price. `sideAppetite` carries it —
  changing what an existing parameter MEANS is the preferred move over adding
  one (CLAUDE.md). The only new dial is the switch in E2-R11.

**Operations**

- **E2-R11** The whole feature sits behind one lab switch, off by default
  until the owner decides, so the same seed can be watched and measured both
  ways. Precedent: the vault's `vaultLevel`, the return's `theReturn`.
- **E2-R12** Cost per turn stays inside the batch runner's budget.
  `observe()` runs every turn of every floor of every run in a sweep, and the
  router already floods unknown space optimistically; LOS enlarges the dark
  and therefore the flood.

## Decisions the owner has to take

**D1 · Does the radius stay 9?** Line of sight only ever REMOVES tiles, so
the lit area shrinks — in a corridor, to almost nothing. Keeping 9 is the
honest starting point; raising it is a balance change wearing a technical
disguise. Recommendation: keep 9, measure, decide after.

**D2 · Do monsters get line of sight too?** Activation is pure distance
today: a creature wakes when the hero is inside its radius, wall or no wall.
Giving creatures the same rule turns walls into stealth and is a much larger
game. Recommendation: NO — out of scope, stated explicitly so nobody
"fixes" the asymmetry later by accident.

**D3 · How does the bot learn a room is a side room?** ANSWERED by M45, the
door convention — see below. It supersedes the three options this decision
originally listed (grant it as terrain / grant it once the door is seen /
never tell it), all of which argued about what to put in the channel. The
door puts it in the WORLD instead, and the channel needs nothing new.

**D4 · How does a memory go stale?** None / by age / by whether the creature
was AWAKE when last seen. Recommendation: the third — a sleeping creature's
memory is still exact, and only the awake one can have moved.

**D5 · What does the danger field do with a stale memory?** Charge full
menace at the remembered tile, discount it with age, or spread it over the
room ("it is somewhere in there"). This is the single decision with the most
behavioural weight, and it is worth watching before deciding.

**D6 · Rebalance now or later?** Every shipped dial was tuned against
see-through vision. Recommendation: ship behind the switch, measure the A/B,
and let the numbers say what has to move — re-tuning blind, before the new
behaviour is watchable, is how "I changed the vision" and "I re-balanced the
game" become one indivisible change nobody can attribute.

**D7 · Where the divergence is recorded.** §12.1 is marked FAITHFUL and
`rogule-spec.md` §13's list of deliberate divergences is frozen. So this
needs a `rules.md` entry plus a `decisions.md` record, and the spec keeps
saying what the ORIGINAL did. Mechanical, but it has to be someone's line.

## Expected changes, by layer

| layer | what changes | size |
|---|---|---|
| perception (`src/sim/observe.js`) | `isVisible` becomes a field-of-view pass; the vendored ROT.js already ships one, so no raycaster gets written. `observe()` returns the same shape | small |
| perception, wall rule | walls bounding visible floor marked visible (E2-R3) | small |
| belief (`src/sim/observe.js`) | staleness: `lastSeenTurn` already exists and nothing reads it; D4/D5 turn it into something the bot uses | small code, big consequences |
| bot — danger (`src/bot/bot.js`) | `dangerField` learns the difference between a seen creature and a remembered one | medium |
| bot — the gamble | `guardCost` keeps working for what IS visible; a new term prices the unseen side room from the granted counts, gated by the same `sideBar` | medium |
| bot — pursuit | the chasing exemption is applied AFTER the bar filter today, so a side creature already hunting the hero can never be targeted at low appetite. Blind side rooms make that situation ordinary. One line, and it should land BEFORE the rest | trivial |
| renderer (`src/ui/render.js`) | stops recomputing visibility by distance and reads the engine's set; remembered creatures get their own treatment; optional lighting falloff (see below) | medium |
| lab (`src/ui/dials.js`) | one switch, and `dial-overrides.json` untouched until the owner flips the default | small |
| docs | `rules.md` (the perception rule), `bot.md` (what the bot now knows and does not), `decisions.md` (the divergence and the A/B result) | small |
| tests (`test/tests.js`) | three existing observation/belief tests are pinned to distance and will need rewriting; new ones for LOS symmetry, wall rule, and "no RNG consumed" | small |
| instruments | none new. The tripwires are the only metrics surface and they already read what matters | none |

## What the UI gets, and it is nearly free

The renderer already paints three states — full inside `CLEAR_DIST`, 0.75 in
the outer ring, 0.3 for memory. Turning that into a continuous falloff is
cosmetic and cheap. What LOS adds is the SHAPE: the lit region stops being a
circle and becomes a polygon, so a corridor reads as a slit of light and a
room opens up when the hero crosses the door. That is the atmosphere, and it
comes for free with the mechanic.

Two cautions, both about legibility in a game whose whole product is
watching:

- Dim the floor and the walls, not the creatures. The tiles are emoji; an
  entity at 40% opacity stops being identifiable, and identifying it is the
  viewer's only job.
- A remembered creature drawn like a seen one is a lie the screen tells. It
  is already true today and LOS makes it routine — which is an opportunity:
  ghost the remembered ones and the viewer gets to WATCH the bot be wrong,
  which is more interesting than watching it be right.

## Sequence — each step watchable on its own

1. **Fix the pursuit ordering.** One line, independent of everything here,
   and it stands on its own merits.
2. **LOS behind the switch, off by default**, plus the wall rule and the
   renderer reading the engine's visible set. Verifiable by turning it on and
   looking, and by `--selftest` still passing — generation must not move.
3. **Staleness** (D4/D5) and the ghost treatment on screen. Verifiable by
   watching: the ghost on the map, the creature somewhere else.
4. **The gamble re-meant** (D3 + E2-R9). Verifiable by contrast: with LOS on,
   appetite 0 and appetite 2 must produce visibly different routes; today,
   with LOS on and this step missing, they would produce nearly the same one.
5. **Measure the A/B** on the same seeds, switch off vs on. The wires to
   watch: "the shamble" (timeouts — exploration gets longer), "opening
   deaths", and above all "the gamble is dead", which is precisely the
   question of whether a blind bet is still a bet. Re-run the appetite-0
   freeze scan too: that defect was the exploration branch failing with a
   small dark, and this feature makes the dark much bigger.
6. **The owner decides the default**, then docs and the divergence record.

## Known landmines

- **Phantom danger** is the main technical risk, and it is not about corpses:
  a killed creature is remembered as dead, exactly and forever. It is the
  live creature that walked out of a room the bot can no longer see into.
  Both errors follow — detouring around danger that left, and walking into
  danger that arrived.
- **`refresh()` only forgets when the remembered TILE is visible**, so with
  LOS a ghost can survive for dozens of turns instead of one or two.
- **Turn budget.** Exploration stops being the fallback branch and becomes
  the main mode. `TURN_BUDGET` and `stepCost` are both suspects.
- **Frontier count and flood cost** both rise; see E2-R12.
- **The switch must be honest.** Off has to reproduce today's game exactly,
  bit for bit, or the A/B measures two changes instead of one.
