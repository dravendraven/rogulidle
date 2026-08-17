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

   **V6 is answered: the room stays hard, and nothing about it gets softened
   to buy reach.** Owner, 2026-08-17 — the reasoning is in `decisions.md`
   under "V6". Do not reopen it by reading a depth number and concluding the
   vault is too expensive; that trade was made on purpose. The line this item
   used to carry — "the lever is the Butcher's `hp`" — is retracted: that
   lever was measured and does not work (`docs/project/vault-irrecusavel.md`).
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
| V6 | Decide whether the vault's cost to reach is the trade wanted | ANSWERED by the owner — the room stays hard. `decisions.md`, "V6" |
| I3 | The tripwires ran on the CODE DEFAULTS, not the shipped dials | DONE — `check.js` takes `dials`; both callers pass them |
| R3 | The return has no chests | READY — today the return refills them |
| R2 | The return repopulates: same map seed, new creature seed | READY |
| R4 | Variance rises through the return (widen the band via the tail/spread dials) | after R2 |
| U7 | The player chooses which hero to play — UI over the existing `hero` config; the mechanism is built and tested, the roster is not | READY |
| U13 | The unattended shop spent one item, drawn by price, and threw the change away — so the game charged for not watching, and the player had no say in what it bought | DONE — the balance is spent DOWN a declared order (rules.md §9), dearest first by default, and the Lab's new "Loja" block is where the player reorders it. The default order is derived from the price table rather than written, so it has no value of its own |
| B15 | Drinking reads the danger field before spending the turn | READY |
| B26 | A route may not cross a live creature for one `stepCost` | DONE — the tile costs its duel; an adjacent pursuer lands at price 0 and the bot finishes brawls instead of leaving them |
| C1 | How the bot prices the board: `sideAppetite` splits into risk appetite × greed, `cautela` prices exposure per turn, the dark stops being free, the frontier becomes a real candidate, the refuge gives the bot its first goal meaning "away", and a chest is valued by its room instead of alone. Eleven pieces, four already in — the design, the open debt, what was rejected and the build order are in `docs/project/rota-e-valor.md` | READY — start with the split, which ships as a no-op |
| B27 | The syringe fired above the same bar the fight gate uses to refuse | DONE — it is a condition now: inject when raging flips a refused fight into an accepted one. `RAGE_AT` deleted |
| B28 | B27 traded away greed's grip on the syringe — the item's timing carried no trait | DONE — greed is a reserve PRICE on the flip: the sober duel must cost at least `fightBar × sideAppetite`. No new constant; the low half of the dial is inert because the flip already floors it |
| B29 | The trigger priced the fight but not the turn the syringe costs — 22 of 63 injections were the hero's last act, at 1 hp, landing no blow | DONE — the enraged reading carries one free blow from the adjacent creature, same arithmetic `duelCost` charges its own turns with. Waste fell (1,05 → 1,39 golpes por injeção); the cost is the top of greed's range, which "affordable enraged" already capped at one bar |
| B30 | The syringe was triggered by EXPENSE when the only thing worth one use per descent is not dying | DONE — survival, not efficiency: the duel kills him sober and leaves him standing enraged, both read against the whole of `effectiveHp`. Greed now means how CERTAIN the death must be. No "hold it for floor 7" term — a hero who dies here has no floor 7; the owner asked for one and the reasoning against it is in `docs/bot.md` |
| B31 | The enraged reading asked only "does this not quite kill me", which at 3 hp is a coin flip | REJECTED — demanded the enraged duel clear the fight gate's bar instead. Injections fell 49 -> 15 per 300 runs with no gain in outcome; reverted the same session. The trigger was never what was failing |
| B32 | Three triggers failed the same way because all three stand on the same estimate: the target holds a median 12 hp against a guess of 9 | DONE (owner's call, against the arithmetic) — the item got shorter and harder instead. Per 300 runs the hero now kills the target and survives the floor 16 times against 9, and dies inside the window 28% of the time against 37%. The window expires unresolved slightly more, 43% against 39% |
| M4 | Side-room risk/reward spread scales with depth | READY |
| M21 | Deep floors put a creature where the hero lands | READY |
| M36 | A detour has to be able to cost the run (the cost side of the gamble) | CLOSED by the vault — floor 4 kills 45.6% and skipping it costs the floor's whole reward |
| M45 | The spine has no doors, a side room does — so a door means "crossing this leaves the mandatory route", and the bot reads it off terrain it already sees | READY — six steps and the design in `docs/project/line-of-sight.md` |
| E2 | Line of sight: the hero stops seeing through walls | NOT SCHEDULED — scoped in `docs/project/line-of-sight.md`; M45e is the experiment that decides whether it is worth building |

Ideas with no slot stay in `docs/project/candidates.md`.
