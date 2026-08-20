# Backlog

The task list, and nothing else. The owner adds and orders items; a session
picks up the top one it can do. Closed items are removed — `git log` is the
archive, `docs/project/decisions.md` keeps the transferable lesson.

How to work an item: read it in full, one item one commit, a test for the
thing the item is for, and update the doc the change made stale
(`rules.md` / `bot.md` / `balance.md`) in the same commit.

## Order

Reordered 2026-08-20 with the owner, after the chained-session analysis
(`decisions.md`, "Stamina, measured over chains") found the difficulty in
the wrong place: the pig falls in minutes while the strategy loop the game
is built around — farm coins, buy well, beat the wall — does not exist,
because in-run loot alone beats the vault. Economy first; everything else
stacks on it.

1. **E1 · Measure the economy gap.** Coins a median session accumulates by
   the time the pig kills it, against the price of a loadout that beats the
   pig; then sweep shallow-loot scarcity and shop prices over CHAINS with
   the right metric — the distribution of "first pig kill" in runs, which
   is the owner's "hours, not minutes" target as a number. Analysis only.
2. **E2 · Rebalance the economy** until the naked pig is ~unbeatable and
   the bought pig is rare. Value changes (shop prices, chest scarcity /
   quality), chains re-measured, owner watches. This creates the
   farm→buy→win loop; the infernal coin (U11) is priced in gold and only
   works after this does.
3. **Hero gates, two rungs** — pig unlocks pawa/ricardo; the FIRST CLEAR
   unlocks vito/papazito. The chained analysis measured papazito dominant
   (information beats force on the themed maps), so the strong pair moves
   behind the harder key. Cheap, self-contained, UI/achievements front —
   a session of its own, only meaningful after E2.
4. **The inferno (U11)** — its own session, reading U11 fresh: the design
   is complete there (daily seed, barrier bosses, the infernal coin, the
   wallet-cap question). Downstream of E2 by its own arithmetic.
5. **The return** — R2, R3, R4. Still wanted, still OFF in the shipped
   game; doing it before E2 would re-tune everything twice, and nineteen
   traversals × the stamina budget is a coupling E2 moves.
6. Everything else below.

Closed entries the old order carried, kept for their lessons: **the
opening** ("opening deaths" at 0.667) was I3's artifact — the wires ran on
code defaults; on shipped dials nothing fired. **The vault** is built,
measured and shipped (V1–V5, M44); **V6 is answered by the owner — the
room stays hard** (`decisions.md`, "V6"), and "the lever is the Butcher's
hp" is retracted (`vault-irrecusavel.md`). Do not reopen either by reading
a number.

**The old item 2's own note, kept:** The 0.667 it quotes
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
| B33 | A third of injections were the hero dying on the turn he spent the item — the free blow was charged at its AVERAGE, at 2 to 3 effective hp | REJECTED — charged it at the top of the creature's die instead. The defect went to zero and took the item with it: 75 injections per 300 runs fell to 15, and the target fell twice. Reverted the same session; at the hp the trigger fires on, any single blow can kill, so pessimism forbids the play entirely |
| B34 | The syringe was spent INSIDE the melee — measured against the vault boss, the hero reached him with 8 effective hp, spent three turns being chased, and injected with 4 against a boss at full health | DONE (owner's rule) — one step from the melee, never in it. Median hp at injection 4 -> 8, the boss falls in 20% of injections against 13%, and the injection-turn deaths went 35% -> 6%. It DELETED B29's free-blow term (nothing is adjacent to land one) and forced the test back from "this kills me" to the fight gate's own refusal, because "this kills me" is false while he is still healthy |
| B35 | The syringe was worth less than half the scholar's book, and the reason was a parity accident: a gap both of them are walking shuts by TWO a turn, so an odd one goes 5, 3, 1 and the window at distance two never happens. 248 of 500 runs only ever met a refused fight already in melee | DONE — three counts too when the creature is closing. Use went 21% -> 30%, the target falls in 52% of injections against 44%, and the paired A/B went `+0.072` to `+0.152 ± 0.039` against the book's `+0.164 ± 0.028`. PARITY WITH NO DIAL CHANGE: the whole gap was the defect. `RAGE_MULT` 4 was measured at `+0.330`, double the book, and rejected as unnecessary |
| M4 | Side-room risk/reward spread scales with depth | READY |
| M21 | Deep floors put a creature where the hero lands | READY |
| M36 | A detour has to be able to cost the run (the cost side of the gamble) | CLOSED by the vault — floor 4 kills 45.6% and skipping it costs the floor's whole reward |
| M45 | The spine has no doors, a side room does — so a door means "crossing this leaves the mandatory route", and the bot reads it off terrain it already sees | READY — six steps and the design in `docs/project/line-of-sight.md` |
| E2 | Line of sight: the hero stops seeing through walls | NOT SCHEDULED — scoped in `docs/project/line-of-sight.md`; M45e is the experiment that decides whether it is worth building |
| M50 | **The generator learns the second spine** — a floor layout guaranteeing TWO routes hero→hole: disjoint except at the ends, one meaningfully shorter, and every tile classified at generation (short-route / long-route / side) so placement can read the classification: the short route takes the denser mass share, the long one the sparser. The map's own philosophy section ("The owner's target shape", `docs/map-design.md`) is the spec. STRUCTURAL, not tuning: no dial values move, map size stays where it is (growing it is a separate, later value change). Tests prove the topology (two routes, disjointness, length asymmetry, placement asymmetry); the run trace records which route the hero walked, so "does route choice fall out of caution × dangerField for free" — the design's load-bearing bet — becomes measurable the day this lands. `layout-hub.js`'s rings (two ways around by construction) are the starting point | **BUILT, WATCHED, REFUSED in this form** — 2026-08-18, owner. Too predictable between seeds; a fixed route pair reads as ordering when the bot clears the floor. `decisions.md` M50 has the verdict; the classification/trace machinery survives, generator-agnostic; the ring stays as one catalogue entry, off. The direction that replaces it is M51 below |
| M51 | **The thematic catalogue** — a shelf of map identities to test in the Lab before the final design is chosen: cripta (Uniform), grade (Rogue, loops by construction), caverna (Cellular, open), plus the existing anel and central, and 'sorteio' drawing one per floor from the map's own stream. One dial (`MAP_THEME`, the ONE layout selector — the hubEvery/ringEvery modulo dials were later deleted as redundant), one Lab slider, shipped at 0 | **BUILT, shipped OFF** — 2026-08-18. 232 tests; the 12-run hash still reads byte-identical to pre-M50. All three new themes verified distinct between seeds in ASCII and running in the browser without console errors. NOT judged — the owner tests identities in the Lab (`?dev=1`, "Tema do mapa") and decides what the final map design is |

Ideas with no slot stay in `docs/project/candidates.md`.
