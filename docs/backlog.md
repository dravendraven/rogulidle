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
3. **The vault** — V1–V4 are built and measured; V5 and V6 are what came
   out of it. It is a barrier (floor 4 doubled its deaths) and a real
   choice (43% take it, 57% walk past), and it costs half a floor of mean
   reach. Design in `docs/project/candidates.md` M43, results in
   `decisions.md`.
4. Everything else below.

**Item 2 above needs re-reading before anyone works it.** "Opening deaths
0.667" is the CODE DEFAULTS; on the dials that actually ship it measures
0.247 and the wire does not fire. There is no opening-lethality problem —
what floors 2–6 had was five identical risks in a row, which is what the
vault answers.

## Items

| id | what gets done | status |
|---|---|---|
| V5 | Walking toward the dark has no price, so the vault is entered by accident — a cautious hero gives up the reward and keeps the risk | READY — the finding is in `decisions.md`, "The vault and the Butcher" |
| V6 | Decide whether the vault's cost to reach (mean depth 5.9 → 5.3, floors 5–6 deadlier) is the trade the owner wants | NEEDS THE OWNER, not a session |
| R3 | The return has no chests | READY — today the return refills them |
| R2 | The return repopulates: same map seed, new creature seed | READY |
| R4 | Variance rises through the return (widen the band via the tail/spread dials) | after R2 |
| U7 | The player chooses which hero to play — UI over the existing `hero` config; the mechanism is built and tested, the roster is not | READY |
| B15 | Drinking reads the danger field before spending the turn | READY |
| M4 | Side-room risk/reward spread scales with depth | READY |
| M21 | Deep floors put a creature where the hero lands | READY |
| M36 | A detour has to be able to cost the run (the cost side of the gamble) | after R3 |

Ideas with no slot stay in `docs/project/candidates.md`.
