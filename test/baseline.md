# The baseline bot

What a measurement compares against. When a reading says "better" or
"worse", this is the thing it is better or worse THAN — and a reading taken
against anything else is not comparable to one taken against this, however
similar the two look.

## THERE ARE TWO INSTRUMENTS NOW, AND THEIR NUMBERS DO NOT COMPARE

Read this before quoting a number from either.

| | plays | where |
|---|---|---|
| **the naked run** | independent runs, **empty hands every time** | `src/analysis/check.js` |
| **the chain** | a SESSION — runs in a row, **with the shop between them** | `src/analysis/chain.js` |

The naked run is the game with the shop switched OFF, and everything below
in this file describes it. It stays the baseline.

**The chain exists because that is not the game anyone plays.** Only the
FIRST run of a session is ever really naked: every run after it starts
holding whatever the shop bought with the coins the run before it earned —
win or lose, since the shop opens after a death too (`docs/rules.md` §9). So
the naked run is a **lower bound on a session**, not a description of one.

Two consequences, and neither is optional:

- **A depth from `check.js` and a depth from `chain.js` are two different
  games.** Same engine, same bot, one shops and one does not. Putting them
  in the same table is the error this section exists to prevent.
- **The unit of sampling changes.** A chain is one sample, not `L` of them:
  run `k` depends on how run `k-1` ended. `M` chains of length `L`, never
  `M × L` runs.

**Where they DO meet, on purpose:** run 1 of chain `m` uses seed
`firstSeed + m` — the same seed `check.js` measures at index `m` — so the
first run of every chain is paired with a naked run for free. That is the one
legitimate paired comparison between the two, and `chain.js`'s `seedOf` says
why it was worth giving up the page's own seed convention for it.

## The configuration IS the baseline

Not the numbers below it. The numbers rot; this list is what has to be held
fixed for two readings to mean the same thing.

| | what | where |
|---|---|---|
| hero | `HEROES.base` — the empty persona | `src/sim/heroes.js` |
| starting items | **none** | `startingItems: []` |
| Coragem | `DEFAULT_HERO.bravery` | `src/bot/config.js` |
| Ganância | `DEFAULT_HERO.sideAppetite` | `src/bot/config.js` |
| Cautela | `DEFAULT_HERO.caution` | `src/bot/config.js` |
| floor model | `DEFAULT_MODEL` + `dial-overrides.json` | repo root |
| seeds | `hashSeeds(20260814, 1..n)`, the same set in every cell | |

Values are deliberately not restated here — `docs/balance.md` owns them and
a copy is a copy that goes stale. Read them from the code.

**THOSE THREE NAMES WERE WRONG HERE UNTIL 2026-08-17, AND IT COST A SESSION.**
This file listed Coragem as `fightMargin` and Cautela as `DANGER_PERSISTENCE`.
Both were taken OFF the panel when M47/C1 split them — courage moved to
`bravery`, which bends the estimate instead of the bar, and `persistence`
became a decided constant inside the quantity `caution` multiplies, because
two dials pulling on one number is a confusion this project has paid for
twice. `tools/dial-sweep.mjs` carried the same stale names.

A session swept the stale ones and reported findings about "the player's
dials" that were findings about constants nobody can reach. **The three the
panel offers are the `kind: 'hero'` rows in `src/ui/dials.js`, and that file
is the source of truth for which they are.** When a dial is renamed or
retired, this row and `dial-sweep.mjs` change in the same commit.

Three of those are load-bearing in a way that has bitten before:

**Empty hands.** The shop item is a bonus paid AFTER a defeat, so a hero
holding one is not the hero a first run gets. Measuring with a starting item
moves every number and the owner had to correct this once already. **That is
still the rule for everything in this file** — what changed is that the
question "and what does the shop do to it" now has an instrument of its own
instead of being answered by quietly arming the baseline. See the two
instruments above.

**`HEROES.base` must stay empty.** It is the only entry of the cast that is
byte-identical to the game before personas existed. A sweep run as `pawa` or
`ricardo` measures that hero, not the game.

**`dial-overrides.json` layered over the code defaults is the shipped
game**, not `balance.js` alone. A sweep that reads the code only is
measuring a version nobody plays.

## Running it

```
node tools/measure.mjs --selftest        # first: is the vendored ROT.js faithful
node tools/dial-sweep.mjs                # all three dials, 250 runs a cell
node tools/dial-sweep.mjs 400 cautela    # one dial, more runs
```

`tools/measure.mjs check tripwires` stays what it always was — the only
fire-or-not surface. The sweep is for questions of the form "does this dial
do anything", which the tripwires cannot answer and which kept being
re-derived by hand.

## Reading the output

**The `delta pareado` column is the answer. The two means beside it are
not.** Each mean carries a standard error around 0.13 at n=250, so two of
them cannot resolve a 0.1-floor difference; the same runs differenced seed
by seed resolve it at a third of that. CLAUDE.md's "do not explain a
difference until it clears 2 sigma" applies to the paired sigma.

**`runs≠centro` is a different question from depth.** It counts runs that
came out differently at all. A dial can rewrite 99% of runs and move mean
depth by 0.04 — that is a dial that changes behaviour without changing
outcomes, and telling the two apart is most of what this file is for.

## Snapshot — 2026-08-14, at commit `c838763`

> **THIS SNAPSHOT IS OF THE OLD PARAMETERS.** Its "Coragem" is `fightMargin`
> and its "Cautela" is `persistence` — the two that later came off the panel.
> The numbers are still a true record of what those constants do; they are
> NOT a record of what the player's dials do, and the band shapes below must
> not be quoted as the panel's behaviour. Re-run `dial-sweep.mjs`, which now
> sweeps `bravery` and `caution`, for that.

Kept because the owner asked for a baseline to compare against, against
CLAUDE.md's usual rule that no measurement gets written down. It is a
DATED SNAPSHOT, not a target: if a reading disagrees with it, re-run the
sweep before believing either.

Centre: mean depth 4.62-4.68, reached floor 7+ in 17%, 21 chests and 21.6
kills a run, 462 turns.

Paired against that centre, n=300:

| candidate | delta | sigma |
|---|---|---|
| Coragem 0.364 | +0.147 ± 0.078 | 1.9 |
| Coragem 0.588 | +0.050 ± 0.037 | 1.4 |
| Ganância 0.84 | +0.063 ± 0.070 | 0.9 |
| Cautela 0.812 | +0.037 ± 0.080 | 0.5 |
| Cautela 1.036 | −0.007 ± 0.106 | 0.1 |

**Nothing clears 2 sigma, so all three centres are at their optimum as far
as this can see.** Coragem 0.364 is the only candidate that came close and
it did not clear the bar. This settles an older open question the other way:
Ganância's computed centre was suspected of reading ~2 sigma worse than
bands 0.52/0.84, and at n=300 paired it does not reproduce (0.9 sigma).

The band shape, from the same sweep at n=250 — the useful part, because it
is what the six named settings actually offer the player:

- **Coragem** — flat from 0.14 to 0.588 (4.62 / 4.79 / 4.66), then falls
  (1.036 reads 4.36). A plateau with a cliff on the high side.
- **Ganância** — a real interior peak at 0.84-1.0 (4.68), falling both ways:
  0.2 reads 3.63 and opens 6 chests a run against 21.
- **Cautela** — the largest span of the three, and all of it below the
  centre: 3.50 / 3.82 / 4.42 / 4.71 / 4.66 / 4.64. Rises, then flat from
  0.588 up. Going down costs 1.2 floors; going up does nothing.

## Known defect this sweep exposed — AND IT IS NOT IN THE PRODUCT

> **Re-read 2026-08-17: this defect is real arithmetic and reaches no
> player.** `persistence` is a decided constant off the panel, so nobody is
> ever offered these bands — they existed only because this file's own sweep
> generated them from a stale name. Confirmed still true of the maths today:
> at 1.26 a tile five steps from a creature prices 11.18 against 6.66 for one
> beside it. Worth keeping written down because anything that puts
> `persistence` back on a panel has to solve it first.

Cautela's top two bands are **incoherent, not merely inert**. The value is
the exponent in `menace = bite × persistence^distance`, and the centre of
0.7 puts bands 5 and 6 at 1.036 and 1.26 — above 1, where menace GROWS with
distance. Measured at the top band a tile 5 steps from a creature prices at
3.02 against 2.15 for a tile adjacent to it: the hero fears the far more
than the near, which is not caution. The band generator has no clamp
(`src/ui/dials.js`), and raising the centre from 0.5 to 0.7 is what pushed
the top of the scale past 1 without anything noticing.
