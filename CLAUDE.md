# Rogulidle

A roguelike that plays itself, derived from Rogule. The player does nothing but
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

## Sessions

**A session per FRONT OF WORK** — the map, the bot, the shop — not per task
and not per day. A new one is opened when the subject changes or the old one
runs out of context, never merely because a piece of work finished.

Context is the expensive thing here, not the branch. A session that already
knows what was tried and rejected reaches "the dials were never the problem"
in one step; a fresh one re-runs the sweeps to get there. **Sessions are
still never split by specialty** — the parallel-roles era produced more
coordination machinery than work, and this file used to be mostly that
machinery.

**What crosses between sessions is the REPO, not the session.** Before a
session ends, what it learned is in a file or it is lost: `decisions.md` for
what was measured and rejected, the describing doc for what a thing now
does, `docs/project/` for a study written before the code (e.g.
`dcss-layouts.md`). That is what makes a fresh session cheap.

### More than one at a time

They do run concurrently now, whatever the paragraph above used to claim,
and that is fine — with one rule, learned by breaking it:

> **Every session works in its own worktree, and nobody works in the main
> directory.** Before touching git, LOOK at which branch each worktree is
> on. Do not assume.

`git worktree add -b <name> .claude/worktrees/<name> origin/main` to start,
`git worktree remove` plus `git branch -d` once it is merged. The directory
is gitignored, so a worktree never shows up in anyone's `git status` — which
is exactly why the assuming is dangerous.

What breaking it looked like: a session created a branch in the MAIN
directory while another was working there, moving the ground under it. And
the main directory has since stopped being on `main` at all without anyone
announcing it, so "the main directory is on main" is not a fact, it is a
guess.

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

`run-check.html` (or `node tools/measure.mjs`) is the only metrics surface: a
handful of tripwires, each printing its own firing condition. A tripwire
fires or it does not; when it fires there is a defect to find. Nothing is a
quantity to push, and no measurement gets written down — a recorded number
goes stale and gets compared against anyway.

**It holds TWO instruments, and their numbers are not interchangeable.**
Same engine, same bot; one plays with the shop and one without.

| | plays | |
|---|---|---|
| `check tripwires` | independent runs, **empty hands every time** | the baseline |
| `chain chains` | a SESSION — runs in a row, **the shop between them** | the game people play |

Only the FIRST run of a session is ever naked: every run after it starts
holding what the shop bought with the coins the run before it earned, win or
lose (`rules.md` §9). So the naked run is a **lower bound on a session**, not
a description of one — and a depth from one instrument does not belong in a
table beside a depth from the other. `test/baseline.md` says which question is
whose, and how the two are legitimately paired.

Six of the wires are SHARED (`runWires` in `src/analysis/check.js`) so the
bars live in one place; the difference between the two readings of the same
bar is the comparison. **A chain is ONE sample, not one per run** — run `k`
depends on how `k-1` ended.

Three measuring notes, each learned the hard way:
- **Do not explain a difference until it clears 2 sigma.** A proportion over
  a few hundred runs has a standard error of several points.
- Dynamic `import()` caches modules per page load — always reload the page
  between an edit and a measurement.
- A new metrics export must be added to `NEEDS_DIALS` in
  `tools/measure.mjs`, or it silently measures the CODE DEFAULTS instead of
  the shipped dials. That mistake once kept a non-existent defect in the
  backlog for weeks.

## Running it
`python tools/dev-server.py` (port 8139), then:

- `/index.html` — watch the bot play. `?seed=anything` reproduces a session.
  The 🧪 Lab button opens the dial panel (`src/ui/dials.js`) beside it.
  `?events=off` silences the floating signals (`src/ui/events.js`, U10).
- `/run-tests.html` — the rules (tests, not metrics).
- `/run-check.html` — the tripwires, both instruments, one section each.
  Keep the tab visible while it runs.

`run-lab.html` was removed — it duplicated the same dial panel `index.html`
already opens behind the Lab button. Link to `/index.html` instead.

`index.html` reads `dial-overrides.json` (repo root) before its first run: a
value it sets wins over the code default, for EVERY visitor, whether or not
they ever open the Lab (`src/ui/dial-overrides.js`). It ships with model overrides that ARE the tuned game — a visitor
without it plays the code defaults, which are not the same thing.

Its `model` may carry a `floors` list — the curve in pieces, one entry per
ANCHOR, each written whole. A file without it is one anchor at floor 1,
which is what every file before this was. `docs/map-design.md` has the shape
and the two inheritance rules.

**Dev mode**: `?dev=1` on `/index.html` — no button anywhere invites this —
auto-opens the Lab and adds one more button, "💾 salvar como padrão", which
downloads the CURRENT form as a new `dial-overrides.json`. A page cannot
write into the repo GitHub Pages serves (no server, no build step to hook
into); replacing the file with the download and pushing is what actually
ships it. That push is the real security boundary — anyone who finds
`?dev=1` can only change their own downloads folder.

Dev mode also takes **`&hold=axe,shield,shield`** — it arms the hero with
those items and lets you WATCH a loaded run. The chain instrument finds piles
of a dozen-odd items after a streak of clears, and reaching one by playing
takes a run of wins the game hands out roughly never, so the one state a
snowball would show up in was the one state nobody could look at. It writes
the ordinary wallet, so what plays is a real loadout down the real path — and
it persists into the next run like a purchase and is cleared by a death like
one.

Ordinary lab edits (no `?dev=1`) still persist nothing; the shipped values
stay in the code (or in `dial-overrides.json`, once one exists). A change
worth keeping FOREVER is still a `balance.md` + code edit, same as ever —
the overrides file is for shipping a live experiment fast, not a
replacement for that.

Headless: `node tools/measure.mjs --selftest` first (it proves the vendored
ROT.js is faithful), then e.g. `node tools/measure.mjs check tripwires
'{"runs":24}'` or `node tools/measure.mjs chain chains
'{"chains":8,"length":12}'`. Same functions the pages call, same numbers.
The whole test suite runs here too — `node tools/measure.mjs test/tests.js
runAll` — with six failures expected off the page, all `localStorage`.
Headless is for sweeps and regressions — it is not a licence to stop
watching the game.

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
