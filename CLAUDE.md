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

Usually one session at a time. When more than one runs, the boundaries are:

- **project & design** — decides what to work on, writes the prompts,
  reviews results. Edits `docs/`, never `src/`.
- **work** — the engine and the map: `src/sim/`.
- **bot** — `src/bot/` only. Split out from work once the two ran in
  parallel; if only one session is running, it does both.
- **ui** — `src/ui/`, `index.html`, `style.css`.
- **metrics** — `src/analysis/` and the instruments. Occasional now, not a
  standing role.

`test/tests.js` is the one file every role writes to. Small commits, and
rebase rather than force if two sessions collide there.

Work outside your role gets reported, not done. The one boundary worth
keeping strictly: **whoever built a change does not decide whether it
worked** — that is what a review is for.

`docs/backlog.md` is the task list. Your prompt names your task; read that
item in full and report against what it asks for. Only the project agent
adds or reorders items — if one looks wrong, say so instead of editing it.

Numbers come from `run-check.html`, run on demand. Nothing records them —
a written-down measurement goes stale and gets compared against anyway.

**Watch the game. Fix what is wrong.** Measure only when you cannot tell by
looking — `docs/project/objectives.md` has the history of why that rule
exists and what the alternative cost.

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
- `/run-tests.html` — check the rules (tests, not metrics — stays no
  matter what happens to the pages below)
- `/run-check.html` — **the only metrics page.** "Is this any good?" in
  twelve numbers, three levels (product, map, bot), four each — one
  success number and three health numbers per level, every one explained
  in plain language and its good direction stated on the page itself.
  Totals, not exponents; no standard errors, no growth rates. Small default
  sample, tuned to run in seconds — raise it for a steadier read. Numbers
  come from `src/analysis/observed-ruler.js` and `src/analysis/clustering.js`;
  this page calls them, it does not compute anything itself. See I8 in
  `docs/backlog.md` for why it replaced `run-ruler.html`/`run-lab.html`/
  `run-batch.html` (deleted — nine quantities, four ratios and growth
  exponents settled arguments but never told anyone whether the game was
  worth watching) and `docs/observed-ruler.md` for the two-probe method
  those modules still use underneath.
- `/run-shape.html` — diagnostic only, unrelated to run-check's method:
  the six curve quantities per floor, their growth rates and the four
  ratios, still reading the MODELLED `campaignCost` rather than actual
  play. Superseded in spirit by the real-play numbers `run-check.html`
  shows; kept only for whatever this specific diagnostic view is still
  used for.
- `/run-curve.html` — **superseded.** It reads the MODELLED net challenge
  from `src/analysis/curve.js`, which prices clean 1v1 duels and so read
  0.23 on a floor that killed four heroes of seven. `run-check.html`
  measures the same kind of quantity from real play instead of modelling
  it. Kept only until curve.js goes.

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
