# Rogulidle

A faithful copy of Rogule that plays itself. The player does nothing but
watch a bot clear the dungeon, run after run, with no daily gate — the next
run starts the moment the last one ends.

## Before any work
Read, in this order:
1. `docs/project/objectives.md` — **the root document.** What the product
   has to be. Everything else derives from it.
2. `docs/rules.md` — what THIS game does. The source of truth for game
   behaviour. States rules, never values.
3. `docs/bot.md` — the bot's three objectives and how it pursues them.
4. `docs/balance.md` — the single source of truth for ALL tuning values.

`docs/rogule-spec.md` is provenance — the original Rogule reverse-engineered.
Read it only to judge whether a change is legitimate; several of its
sections are deliberately false for this game (its §13 lists why).
`docs/project/decisions.md` is what was tried, measured and rejected — read
the relevant entry BEFORE reintroducing anything that looks like a good idea.

Design questions get answered from those docs or by asking the owner, never
by inventing defaults.

## One session

One main session does the work; when it runs out of context, a new one is
opened. Sessions are never split by specialty and never run concurrently —
the parallel-roles era produced more coordination machinery than work, and
this file used to be mostly that machinery.

Two habits replace the old protocol:

- **A change that alters behaviour updates the describing doc in the same
  commit** (`rules.md` for the game, `bot.md` for the bot, `balance.md`'s
  table for values). The docs are now small enough that this is an edit,
  not a project.
- **Whoever built a change still does not decide whether it worked.** State
  what you did and what you measured; the owner watches and judges.

`docs/backlog.md` is the task list. The owner adds and orders items; if one
looks wrong, say so instead of quietly doing something else.

## Hard rules
- Vanilla JavaScript, ES modules. No frameworks, no npm, no build step,
  no TypeScript. Must run by opening HTML files / GitHub Pages as-is.
  ROT.js from CDN is the only external library.
- `Math.random()` is BANNED in `src/sim/`. All randomness goes through
  `src/sim/rng.js`. Determinism is sacred: same seed = same run, always.
- `step()` stays a pure function: no DOM, no `Date.now()`, no storage
  access inside `src/sim/`.
- **The bot may only read `Observation` / `Belief`, never `GameState`.**
  Fog of war is a design decision. The rule is about the CHANNEL: a field
  that carries an unrevealed answer has leaked it even if nothing reads it.
- **Bot rules live in the bot, engine rules live in the engine** — and the
  bot's numbers live in `src/bot/config.js`, the game's in
  `src/sim/balance.js` / `difficulty.js`. No balance value may be hardcoded
  in logic files, and the table at the top of `docs/balance.md` is the one
  place current values are written. Change a dial, change that row in the
  same commit. Never restate a value in prose.
- **Fix a problem with the fewest moving parts, and never add a parameter
  to compensate for a parameter.** In order of preference: change an
  existing value; change what an existing parameter means; delete the thing
  that is fighting you; only then add something new. A report that adds a
  parameter says in one line why an existing one could not carry it.
- **A hero is a configuration, not a branch.** Special heroes are
  `DEFAULT_HERO` overrides handed to `makeBot`; a harder dungeon tier is a
  model handed to `makeFloorPlan`. Building either as separate code paths
  is how the project bloated the first time.

## The method

**Watch the game. Fix what is wrong.** Measure only when you cannot tell by
looking — `docs/project/objectives.md` states the rule, `decisions.md` the
history of what the alternative cost.

`run-check.html` (or `node tools/measure.mjs check tripwires`) is the ONLY
metrics surface: a handful of tripwires, each printing its own firing
condition. A tripwire fires or it does not; when it fires there is a defect
to find. Nothing is a quantity to push, and no measurement gets written
down — a recorded number goes stale and gets compared against anyway.

Two measuring notes that were each learned the hard way:
- **Do not explain a difference until it clears 2 sigma.** A proportion over
  a few hundred runs has a standard error of several points.
- Dynamic `import()` caches modules per page load — always reload the page
  between an edit and a measurement.

## Running it
`python tools/dev-server.py` (port 8141), then:

- `/index.html` — watch the bot play. `?seed=anything` reproduces a session.
  The 🧪 Lab button opens the dial panel (`src/ui/dials.js`) beside it.
  `?events=off` silences the floating signals (`src/ui/events.js`, U10).
- `/run-tests.html` — the rules (tests, not metrics).
- `/run-check.html` — the tripwires. Keep the tab visible while it runs.

`run-lab.html` was removed — it duplicated the same dial panel `index.html`
already opens behind the Lab button. Link to `/index.html` instead.

`index.html` reads `dial-overrides.json` (repo root) before its first run: a
value it sets wins over the code default, for EVERY visitor, whether or not
they ever open the Lab (`src/ui/dial-overrides.js`). It starts as `{}` and
ships no different from not existing at all.

**Dev mode**: `?dev=1` on `/index.html` — no button anywhere invites this —
auto-opens the Lab and adds one more button, "💾 salvar como padrão", which
downloads the CURRENT form as a new `dial-overrides.json`. A page cannot
write into the repo GitHub Pages serves (no server, no build step to hook
into); replacing the file with the download and pushing is what actually
ships it. That push is the real security boundary — anyone who finds
`?dev=1` can only change their own downloads folder.

Ordinary lab edits (no `?dev=1`) still persist nothing; the shipped values
stay in the code (or in `dial-overrides.json`, once one exists). A change
worth keeping FOREVER is still a `balance.md` + code edit, same as ever —
the overrides file is for shipping a live experiment fast, not a
replacement for that.

Headless: `node tools/measure.mjs --selftest` first (it proves the vendored
ROT.js is faithful), then e.g. `node tools/measure.mjs check tripwires
'{"runs":24}'`. Same functions the pages call, same numbers. Headless is for
sweeps and regressions — it is not a licence to stop watching the game.

Opening files directly will not work; ES modules need `http://`.

## Workflow
- Small commits with clear messages after each working change.
- If a request conflicts with the rules or the objectives, say so before
  coding.

### How a session reports back

**Every session working on rogulidle answers in this shape**, in plain
language — the maintainer is not a professional developer, and the point of
the shape is that the risks never get left out because the work went well.

```
<título, no máximo 12 palavras>

<o que foi feito> — parágrafo de no máximo 50 palavras

<benefícios>
<UM bullet point>

<riscos>
<UM bullet point>

<próximos passos sugeridos> <relação valor/risco>
```

The limits are the point, and each one is doing a job:

- **One bullet, not a list.** A list lets everything in and ranks nothing;
  one slot forces the question "what is the single biggest one" to actually
  be answered. If the second item mattered as much, say that instead.
- **Riscos is never empty and never a formality.** What was measured but not
  established, what shipped without being watched, what a number cannot
  say — the project's method is "whoever built a change does not decide
  whether it worked", and this is the slot where that survives a good day.
  "No risks" is a claim; make it one you can defend.
- **Benefícios is what the OWNER gets**, not what the code now does. "The
  bot reads a book" is a changelog line; "the scholar finally has a
  behaviour you can recognise by watching" is a benefit.
- **Every next step carries its value against its risk.** A suggestion
  without that is a wish list — the owner is choosing what to spend a
  session on, and the ranking is most of the information.
- **Fifty words is short on purpose.** What does not fit belongs in the
  commit message, which is where the reasoning is supposed to live anyway.

## Owner context
Solo maintainer, basic coding knowledge, builds via Claude Code.
Prefer simple readable code over clever code.

Note: `roguidle` (one letter different) is a **separate project** in the
sibling directory. Do not confuse the two.

## Licence
Rogule is AGPL-3.0 and this is a derivative of it. Rogulidle is AGPL-3.0.
