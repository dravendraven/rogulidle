# Backlog

The task list, and nothing else. The owner adds and orders items; a session
picks up the top one it can do. Closed items are removed — `git log` is the
archive, `docs/project/decisions.md` keeps the transferable lesson.

How to work an item: read it in full, one item one commit, a test for the
thing the item is for, and update the doc the change made stale
(`rules.md` / `bot.md` / `balance.md`) in the same commit.

## Order

1. **The return** — R2, R3, R4. Victory already requires nineteen traversals
   (R1), but the return is still structurally identical to the descent, so
   the second half of every run is the first half replayed. Two tripwires
   fire because of this ("wins too rare", "nothing gets deep").
2. **The opening** — "opening deaths" fires at 0.667 against its 0.5 bar
   since the kit was emptied (M41). Watch it, decide whether the answer is
   a dial (`EARLY_TIER_CUT`, `MONSTERS_BASE`, scarcities) or a design
   change. Nothing else is worth tuning while most runs end by traversal 3.
3. **The vault is built, measured and shipped** — V1 through V5, plus M44's
   `speed`. Floor 4 kills 45.6% against 8.7% without it, 43.5% of the runs
   that reach it go in, and 22% of the fights taken are won. Design in
   `docs/project/candidates.md` M43; results in `decisions.md` under M43,
   M44 and "the vault takes over its floor".

   **What is left is V6, and it is a judgement, not a task.** The room costs
   reach: floor 7 falls from 57.5% to 22.5% and floor 10 from 9.5% to 3.5%.
   About 60% of runs are now over by floor 4. `objectives.md` judges a
   sitting on how far attempts get, so this is the number to look at before
   anything else here is tuned — and the lever is the Butcher's `hp`, which
   is what `duelCost` reads and therefore what decides who enters.
4. Everything else below.

**Item 2 above is closed as written, and I3 is why.** The 0.667 it quotes
came from the code defaults; the wires now run on the shipped dials, where
the whole board reads clean at 60 runs — opening deaths 0.283, clears 0.05,
the shamble 0, nothing gets deep 0.067, the gamble 0.801. **No tripwire
fires.** There was never an opening-lethality problem; what floors 2–6 had
was five identical risks in a row, which is what the vault answered.

## Items

| id | what gets done | status |
|---|---|---|
| V6 | Decide whether the vault's cost to reach is the trade wanted: ~60% of runs now end by floor 4, and floor 7 falls from 57.5% to 22.5% | NEEDS THE OWNER, not a session |
| I3 | The tripwires ran on the CODE DEFAULTS, not the shipped dials | DONE — `check.js` takes `dials`; both callers pass them |
| R3 | The return has no chests | READY — today the return refills them |
| R2 | The return repopulates: same map seed, new creature seed | READY |
| R4 | Variance rises through the return (widen the band via the tail/spread dials) | after R2 |
| U7 | The player chooses which hero to play — UI over the existing `hero` config; the mechanism is built and tested, the roster is not | READY |
| B15 | Drinking reads the danger field before spending the turn | READY |
| B26 | A route may not cross a live creature for one `stepCost` | DONE — the tile costs its duel; an adjacent pursuer lands at price 0 and the bot finishes brawls instead of leaving them |
| C1 | How the bot prices the board: `sideAppetite` splits into risk appetite × greed, `cautela` prices exposure per turn, the dark stops being free, the frontier becomes a real candidate, the refuge gives the bot its first goal meaning "away", and a chest is valued by its room instead of alone. Eleven pieces, four already in — the design, the open debt, what was rejected and the build order are in `docs/project/rota-e-valor.md` | READY — start with the split, which ships as a no-op |
| B27 | The syringe fires when the melee costs MORE than one bar, which is the same test the fight gate uses to refuse it: in 30 of 84 injections the gate still refuses every adjacent creature with the rage already running. Fix is a condition, not a threshold — inject when the rage flips a refused fight into an accepted one — and it deletes `RAGE_AT` along with the greed ladder it buys | NEEDS THE OWNER — deletes a dial |
| M4 | Side-room risk/reward spread scales with depth | READY |
| M21 | Deep floors put a creature where the hero lands | READY |
| M36 | A detour has to be able to cost the run (the cost side of the gamble) | CLOSED by the vault — floor 4 kills 45.6% and skipping it costs the floor's whole reward |
| M45 | The spine has no doors, a side room does — so a door means "crossing this leaves the mandatory route", and the bot reads it off terrain it already sees | READY — six steps and the design in `docs/project/line-of-sight.md` |
| E2 | Line of sight: the hero stops seeing through walls | NOT SCHEDULED — scoped in `docs/project/line-of-sight.md`; M45e is the experiment that decides whether it is worth building |

Ideas with no slot stay in `docs/project/candidates.md`.
