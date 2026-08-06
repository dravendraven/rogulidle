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

**Current phase: P2** (update this line manually as phases complete)

- **P0** — rules spec. Done.
- **P1** — headless deterministic engine. `step()` and the belief model,
  no rendering. Done.
- **P2** — renderer and replay player: emoji grid, spectator controls,
  continuous run loop.
- **P3** — the bot.
- **P4** — batch tuning against win rate and step counts.

Only build what the current phase requires.

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
  P4 can measure what relaxing them would cost.

## Running it
`python tools/dev-server.py` then open <http://localhost:8141/index.html>
to watch, `/run-tests.html` to check the rules, or `/run-batch.html` to
measure the bot over many games and sweep a setting.

Keep the batch tab VISIBLE while it runs. Browsers clamp `setTimeout` to
about a second in a background tab, and the runner yields between chunks,
so hiding it makes a sweep take many times longer than it should.
Port 8141, because the sibling roguidle project already uses 8137 and 8138.
That server disables browser caching, so edits to `src/*.js` actually take
effect. Opening the file directly will not work — ES modules need `http://`.

`?seed=anything` on either page makes the whole session reproducible.

## Editing note
Do not rewrite text files with PowerShell `Get-Content` / `Set-Content`:
it reads UTF-8 as ANSI and turns every em dash into mojibake. Use the
editing tools.

## Measuring note
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
