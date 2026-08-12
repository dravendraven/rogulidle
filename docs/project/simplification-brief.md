# Simplification brief — prompt for the cleanup session

Paste everything below the line into a fresh session opened at the repo root.

---

# Task: reduce this project to the smallest thing that still satisfies `docs/project/objectives.md`

## Context

Rogulidle is a self-playing roguelike. It works. The problem is not bugs — it
is that the project grew a parameter, a module, a document and a metric for
every question anyone ever asked, and that growth outran the goals it was
supposed to serve. Where it stands today:

- 104 exported tuning dials across `src/sim/balance.js` (76) and
  `src/sim/difficulty.js` (28), including ten dead boolean flags kept only so
  a rejected experiment stays "measurable"
- nine of those dials decide which of eleven monster-table rows a creature
  comes from — `CLAUDE.md` already admits they cannot be told apart at these
  sample sizes, and that two of the clamp families are literally the same
  expression with different constants
- pairs where a rebalanced constant shadows the original it replaced, both
  still exported
- 1,707 lines of bot across seven modules, whose tuning dials live in the
  *engine's* balance file rather than the bot's
- nine `src/analysis/` modules, three of which `CLAUDE.md` itself describes as
  superseded, plus a spread of one-off `run-*.html` measurement pages
- 8,630 lines of documentation across fourteen files, three of which are
  declared to go stale whenever code moves, with a hand-written protocol for
  keeping them in sync
- five agent roles, most of the sync protocol existing because they run in
  parallel and invalidate each other

None of that is a bug. All of it is drag. The work is to remove the drag
without losing what the drag was protecting.

## The invariant

`docs/project/objectives.md` is the root document. It may not be changed,
weakened, or traded away for simplicity. Read it first and in full. The test
for every candidate removal is: *which objective would notice if this were
gone?* "None" means it goes. If one would notice, name it, and keep the
smallest thing that still serves it.

Non-negotiable, from `CLAUDE.md`: vanilla JS and ES modules, no npm, no build
step, runs from `http://` as-is; `Math.random()` banned in `src/sim/` and same
seed always means same run; `step()` stays pure; the bot reads
`Observation`/`Belief` and never `GameState`. Everything else in `CLAUDE.md`
is open to revision, including `CLAUDE.md` itself.

## What needs to be true when this is done

### The bot follows simple rules

Its objectives, in strict priority order:

1. survive the current floor
2. arrive at the next floor with as many resources as possible — hp, weapon,
   armour, potions, xp
3. spend as few steps as possible while still doing 1 and 2

**Why:** the owner can currently not predict or explain what the bot will do,
which breaks the objective that a run's outcome be *attributable*. A bot whose
behaviour follows from three ordered goals can be reasoned about from the
couch; one spread across seven modules cannot.

The bot also has to be **configurable**, in the sense that a hero with special
characteristics is a different configuration of the same bot rather than
different code. **Why:** heroes with distinct traits are a planned choice
layer, and a choice layer built as branches multiplies the thing that is
already too big. The mechanism has to exist and be proven; the roster does not.

The bot's tuning numbers belong to the bot.

### The map is configurable in a handful of dials

A floor should be describable by a few dials the owner can each explain in one
sentence: how many creatures, how threatening the average one is, how much
that threat varies, how clustered they are, how much loot there is, and how
much the route branches.

**Why:** those are the qualities the owner actually wants to steer per floor
and per dungeon tier. The current dials do not map onto them — several
express the same idea at different scales, and at the sample sizes available
their effects are indistinguishable from each other, which means the project
is paying for control it does not really have.

Route branching carries an objective on its own: several routes must be able
to win, and the good one must be hard to find. It must survive the collapse.

### Difficulty follows one coherent curve

The floor dials should fall out of depth, and a harder dungeon tier should be
a modification of that same curve rather than a parallel system.

**Why:** the curve is what objectives.md is asking for when it says most
attempts must not end in the opening and a decided run must end quickly.
Neither property can be reasoned about while difficulty is the emergent sum
of a hundred independent numbers.

### Success and health are a very few numbers

Few enough to read at a glance, each one a *tripwire* in the sense
objectives.md defines: it states its own firing condition, and when it fires
there is a defect to find. None of them a quantity to push.

**Why:** measuring became the work. The instruments outgrew the questions, and
the volume of numbers made it harder, not easier, to answer "is this any
good?" Correctness tests are not measurement and are not what this is about.

### One agent, few documents

One main session doing the work, new sessions opened when the old one runs
out, not concurrent sessions split by specialty. Documentation small enough
that keeping it true is not a protocol.

**Why:** the parallel roles produced most of the coordination machinery in
`CLAUDE.md`, and the measurement-heavy handoffs between them are where the
time goes. The history of rejected experiments belongs in prose, which is what
frees the code to stop carrying dead flags.

## Out of scope

Do not build what has not been built: a roster of heroes, item unlocks, new
dungeons, a shop, meta-progression. The goal is to leave a shape those can
drop into later — a configurable bot and a configurable map. Building them now
is exactly how the project got here.

## Judgement

The approach is the working agent's to choose. Two things the owner asks for
regardless of approach: **a plan before the deleting starts**, and **an
explicit list of what cannot be simplified without losing an objective** —
that list is the most valuable output of the analysis, and it should be short.
