# Rogulidle

A faithful copy of Rogule that plays itself. The player does nothing but
watch a bot clear the dungeon, run after run, with no daily gate — the next
run starts the moment the last one ends.

## Before any work
Read, in this order:
1. `docs/rogule-spec.md` — the rules of Rogule, reverse-engineered from the
   original ClojureScript source. This is the source of truth for game
   behaviour. Deliberate divergences are in its §13.
2. `docs/bot-strategy.md` — what the bot is trying to do and why.
3. `docs/balance.md` — the single source of truth for ALL tuning numbers.
4. `docs/curve-shape.md` — what the difficulty, power, reward and buffer
   curves actually measure out as, and how each was defined.

Design questions get answered from those docs or by asking the owner, never
by inventing defaults.

**Current phase: P4** (update this line manually as phases complete)

- **P0** — rules spec. Done.
- **P1** — headless deterministic engine. Done.
- **P2** — renderer and replay player. Done.
- **P3** — the bot. Done.
- **P4** — tuning: difficulty model, map design, and the instruments to
  measure both. In progress.

P4 work is measurement-first: change one thing, measure it, write down what
the measurement said even when it says the change did nothing. Several
changes have been reverted on that basis and the reasons are kept in the
files rather than deleted — see `SIDE_ACTIVATION_CAP` in balance.js and
§2.1 of bot-strategy.md.

## Sessions and roles

Three sessions may run against this repo at once. Your opening prompt says
which one you are. If it does not, ask before touching anything.

- **project & design agent** — decides what to work on and why, proposes
  design direction, and writes the prompts for the other two. May edit
  `docs/`, never `src/`.
- **work agent** — changes game and bot code. Never redefines scope, and
  never changes what a metric means without saying so explicitly.
- **metrics agent** — builds and runs instruments, and reports baselines.
  Never touches `src/bot/` and never changes a balance value. It measures
  the real game and nothing else: it does not build a variant of the map or
  the bot in order to study one. If a question needs a change that does not
  exist yet, say so and wait — the work agent builds it behind an
  off-by-default flag first, and then both states get measured.

Work outside your role gets REPORTED, not done — even when it is a one-line
fix and you can see exactly what it should be. The measurement ruler and the
thing being measured are deliberately kept in different hands; a helpful fix
across that line is the failure mode this split exists to prevent.

`docs/balance.md` is the one file all three may touch. Different sections,
small commits, and say in the commit message which role you are.

`docs/backlog.md` holds the task list, what each task is worth, and its
acceptance criteria. Your opening prompt names your task — read that item in
full before starting, and report against ITS criteria rather than your own
sense of finished.

Your FIRST action on any task is to set it to IN FLIGHT and commit that
alone — three sessions share this repo and cannot see each other, so an
unclaimed item is one two agents can start at once. If it is already IN
FLIGHT, stop and say so. When you finish, set it to REPORTED and append a
`### Result` block — see the legend at the top of that file. Only the
project agent adds or reorders items, or promotes REPORTED to DONE; if an
item looks wrong, report that instead of editing it.

## Hard rules
- Vanilla JavaScript, ES modules. No frameworks, no npm, no build step,
  no TypeScript. Must run by opening HTML files / GitHub Pages as-is.
- ROT.js from CDN is the only external library.
- `Math.random()` is BANNED in `src/sim/`. All randomness goes through
  `src/sim/rng.js`. Determinism is sacred: same seed = same run, always.
- `step()` stays a pure function: no DOM, no `Date.now()`, no storage
  access inside `src/sim/`.
- No balance value may be hardcoded in logic files. Numbers live in
  `docs/balance.md` and are mirrored in `src/sim/balance.js`. If a needed
  number is missing, add it to balance.md first with an `INITIAL GUESS`
  comment, then use it.
- **The bot may only read `Observation` / `Belief`, never `GameState`.**
  Fog of war is a design decision, not decoration — see spec §12.
- The engine stays faithful to Rogule. Bot rules (like "kill everything
  before the shrine") are enforced in the bot, not in the engine, so that
  P4 can measure what relaxing them would cost. That rule has since been
  relaxed by owner decision — see bot-strategy.md §0.

## Running it
`python tools/dev-server.py` then open:

- `/index.html` — watch the bot play
- `/run-tests.html` — check the rules (46 tests)
- `/run-lab.html` — **the main instrument.** Every dial, the formulas they
  feed rendered from balance.js, and the descent measured on demand
- `/run-shape.html` — diagnostic only: the six curve quantities per floor,
  their growth rates and the four ratios. Changes nothing, just looks.
  **Superseded by run-ruler.html** — its challenge/reward numbers use the
  modelled `campaignCost`, not actual play. See docs/observed-ruler.md.
- `/run-ruler.html` — **the current instrument for challenge, reward,
  power and buffer.** Two frozen probes (`src/analysis/observed-ruler.js`)
  actually clear a floor twice — once collecting nothing, once collecting
  what's in the way — and the real damage taken is the ruler, not a duel
  formula. See docs/observed-ruler.md for the baseline and what this
  instrument cannot answer (map clustering needs its own).
- `/run-batch.html` — older single-floor sweeper, still useful for bot flags
- `/run-curve.html` — **superseded.** It reads the MODELLED net challenge
  from `src/analysis/curve.js`, which prices clean 1v1 duels and so read
  0.23 on a floor that killed four heroes of seven. run-lab measures the
  same quantity instead of modelling it. Kept only until curve.js goes.

Keep the measuring tab VISIBLE while it runs. Browsers clamp `setTimeout` to
about a second in a background tab, and the runner yields between chunks,
so hiding it makes a sweep take many times longer than it should.
Port 8141, because the sibling roguidle project already uses 8137 and 8138.
That server disables browser caching, so edits to `src/*.js` actually take
effect. Opening the file directly will not work — ES modules need `http://`.

`?seed=anything` makes the whole session reproducible.

## Measuring note — read before reporting a difference
A proportion measured over a few hundred samples has a standard error of
several points. A gap of 1.3 sigma was once reported here as a finding and
given a causal explanation within the hour; it later measured at 0.6 sigma
over a proper sample and turned out to be nothing. `descentCurve` returns a
`z` alongside every rate for this reason. **Do not explain a difference until
it clears 2 sigma.**

## Editing note
Do not rewrite text files with PowerShell `Get-Content` / `Set-Content`:
it reads UTF-8 as ANSI and turns every em dash into mojibake. Use the
editing tools.

## Stale-module note
Dynamic `import()` caches modules per page load. Re-importing after an edit
in the same page silently returns the OLD module, so a batch measured that
way is testing code you are not running. Always reload the page between an
edit and a measurement. This has already produced one round of confidently
wrong numbers.

## Workflow
- Small commits with clear messages after each working change.
- After building something, briefly explain what was created and where, in
  plain language (the maintainer is not a professional developer).
- If a request conflicts with the spec or the strategy doc, say so before
  coding.
- When tuning: change balance.md, rerun the batch simulator, report the
  before/after distributions. Never tune by feel alone.

## Owner context
Solo maintainer, basic coding knowledge, builds via Claude Code.
Prefer simple readable code over clever code.

Note: `roguidle` (one letter different) is a **separate project** in the
sibling directory. Do not confuse the two.

## Licence
Rogule is AGPL-3.0 and this is a derivative of it. Rogulidle is AGPL-3.0.
