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
| Curiosidade | `DEFAULT_HERO.curiosity` | `src/bot/config.js` |
| floor model | `DEFAULT_MODEL` + `dial-overrides.json` | repo root |
| seeds | `hashSeeds(20260814, 1..n)`, the same set in every cell | |

Values are deliberately not restated here — `docs/balance.md` owns them and
a copy is a copy that goes stale. Read them from the code.

**THOSE THREE NAMES WERE WRONG HERE UNTIL 2026-08-17, AND IT COST A SESSION.**
This file listed Coragem as `fightMargin` and Cautela as `DANGER_PERSISTENCE`.
Both were taken OFF the panel when M47/C1 split them — courage moved to
`bravery`, which bends the estimate instead of the bar, and `persistence`
became a decided constant inside the quantity the exposure price multiplies,
because two dials pulling on one number is a confusion this project has paid
for twice. `tools/dial-sweep.mjs` carried the same stale names. (And the
third name changed AGAIN when Cautela became Curiosidade — `caution` split
into the decided constant `EXPOSURE_STEPS` and the trait `curiosity`, which
kept only the price of the unknown.)

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
node tools/dial-sweep.mjs 400 curiosidade    # one dial, more runs
```

`tools/measure.mjs check tripwires` stays what it always was — the only
fire-or-not surface. The sweep is for questions of the form "does this dial
do anything", which the tripwires cannot answer and which kept being
re-derived by hand.

> **THE SWEEP ABOVE MEASURES RESULT, AND RESULT IS THE WRONG CRITERION FOR A
> DIAL.** It cannot tell an inert dial from a situational one — both read
> flat. `docs/project/dials.md` has the owner's guidance (isolated, the bands
> should be EQUIVALENT in effectiveness; what must change is behaviour) and a
> behaviour metric per dial. Read it before concluding that a dial does
> nothing. A session concluded exactly that about two of the three, and was
> wrong on both.

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

## What was learned from old sweeps, without the numbers

The snapshot that used to live here (commit `c838763`, 2026-08-14) swept
`fightMargin` and `persistence` — two constants that later came off the
panel. Its numbers measured those constants, not the player’s dials, and a
session quoted them as dial behaviour and lost a day. The numbers belong to
the commit that produced them, not to this file.

**One finding survives because it is a mechanism, not a measurement:**
`persistence` is the exponent in `menace = bite × persistence^distance`.
Any value above 1 makes menace GROW with distance — the hero fears the far
more than the near, which inverts what the exposure price means. The band generator
has no clamp, so a centre that pushes the top band past 1 silently breaks
the dial. Anything that puts `persistence` back on a panel has to solve
this first.
