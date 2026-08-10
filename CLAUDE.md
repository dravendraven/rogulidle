# Rogulidle

A faithful copy of Rogule that plays itself. The player does nothing but
watch a bot clear the dungeon, run after run, with no daily gate — the next
run starts the moment the last one ends.

## Before any work
Read, in this order:
1. `docs/rules.md` — **what THIS game does. The source of truth for game
   behaviour.** States rules, never values, so it cannot drift into being
   wrong the way a document that restates numbers does.
2. `docs/bot-strategy.md` — the bot's objectives and how it currently
   pursues them.
3. `docs/balance.md` — the single source of truth for ALL tuning numbers.
4. `docs/rogule-spec.md` — **provenance, not behaviour.** The original
   Rogule reverse-engineered, plus the deliberate divergences in its §13.
   Read it to judge whether a change is legitimate, never to learn what the
   code does — several of its pre-§13 sections are now false for this game.

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
changes have been reverted on that basis and the reasons are kept rather than
deleted — every measured-and-rejected attempt is in
`docs/project/decisions.md`, and the flags that carry one are left in the
code with the number that killed them in the comment.

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

## Every report says what it made stale

Three documents describe behaviour, and each rots the moment code moves under
it. This has already happened twice: `bot-strategy.md` was organised around a
"Rule 1" that B11 falsified, and `rogule-spec.md` still states rules this game
stopped following.

| document | describes | goes stale when |
|---|---|---|
| `docs/rules.md` | what the GAME does | an engine or generation rule changes |
| `docs/bot-strategy.md` | what the BOT does and why | the bot's objectives or decision-making change |
| `docs/map-design.md` | why the map is shaped as it is | the spine/side bargain or its dials change |

**Every report ends with a line naming which of the three its change made
false, or saying plainly that none of them moved.** Not optional, and "none"
is a valid answer that still has to be written — the failure mode is never a
wrong answer, it is the question never being asked.

**Who updates it.** A purely descriptive correction — "the bot now ranks a
fight against loot instead of only after it" — update it yourself in the same
commit; you have the detail fresh and it needs no judgement. Anything that
needs restructuring, or that only makes sense against other items, report and
leave to the project agent. When unsure, report: a locally-correct paragraph
that contradicts the rest of the file is worse than a flagged gap.

**Two things that make "who owns which doc" the wrong question.**

**Bot dials do not live in the bot's directory.** Sixteen constants that are
purely bot behaviour — step cost, goal stickiness, reversal penalty, duel
safety margin, crowd penalty, the tactical dials — live in
`src/sim/balance.js`, which is the work agent's. B8 was a bot finding the work
agent had to commit. **Which document to update follows what CHANGED, never
whose directory the file sits in.**

**A change can make someone else's document stale.** M26 moved weapons onto
creatures and thereby changed what the bot should value, without touching
`src/bot/` at all — B9 exists because of that. And going the other way, B9
found a fog-of-war leak in the engine, which became M28. So the work agent can
invalidate `bot-strategy.md`, and the bot agent can find something wrong in
`rules.md`. Declare what your change made false, not what your role owns.

**Never restate a value in any of the three.** They state rules, orderings and
causes; `docs/balance.md`'s top table is the one place current values are
written. `rogule-spec.md` restated the monster table and now asserts numbers
the game abandoned — that is the disease, and it is avoidable by construction.


`docs/backlog.md` is the task list. Your prompt names your task; read that
item in full and report against what it asks for. Only the project agent
adds or reorders items — if one looks wrong, say so instead of editing it.

**Priority order right now**, owner-set:
1. **The shop** — `docs/backlog.md`'s U6 arc: U6e, then U6f.
2. **The lab** — `docs/lab-backlog.md`, the manual dungeon simulator.
3. The rest of `docs/backlog.md`.

The **bot agent** is outside this ordering entirely and works its own lane
in `docs/backlog.md` (B11 onward) in parallel.

Numbers come from `run-check.html`, run on demand. Nothing records them —
a written-down measurement goes stale and gets compared against anyway.

**Watch the game. Fix what is wrong.** Measure only when you cannot tell by
looking — `docs/project/objectives.md` states the rule;
`docs/project/decisions.md` has the history of why it exists and what the
alternative cost.

## Hard rules
- Vanilla JavaScript, ES modules. No frameworks, no npm, no build step,
  no TypeScript. Must run by opening HTML files / GitHub Pages as-is.
- ROT.js from CDN is the only external library.
- `Math.random()` is BANNED in `src/sim/`. All randomness goes through
  `src/sim/rng.js`. Determinism is sacred: same seed = same run, always.
- `step()` stays a pure function: no DOM, no `Date.now()`, no storage
  access inside `src/sim/`.
- No balance value may be hardcoded in logic files. Every tunable lives in
  `src/sim/balance.js` or `src/sim/difficulty.js`, and **the table at the
  top of `docs/balance.md` is the one place their current values are
  written**. Change a dial, change that row in the same commit.
  **Never restate a value in prose** — the prose records why a dial exists
  and what was measured, and those numbers age into history the moment the
  dial moves. That is what let this file drift for months.
- **Fix a problem with the fewest moving parts you can, and never add a
  parameter to compensate for a parameter.** In order of preference:
  change an existing value; change what an existing parameter *means* or how
  far it can reach; delete the thing that is fighting you; and only then add
  something new. Adding is the last option, not the first.

  **The test, because "keep it simple" is not actionable:** does the new
  parameter express a distinction that already exists in the game, or does it
  express a concept the code already has? Splitting one scarcity dial into
  weapon/armour/potion was right — those are genuinely separate pools that
  needed to move independently. Three tier-clamp systems were not: they all
  say "bound the drawn slot", and `tierCeilingShare` and `earlyTierCapShare`
  are **literally the same expression** with different constants —
  `Math.max(0, Math.min(cap, base + perLevel * level))` in both. M30's own
  comment says "same shape as tierCeilingShare" and then duplicated it. The
  `Math.max(0, ...)` is the only thing making a second function necessary; a
  signed share in the first one would have covered both directions with zero
  new dials.

  Nine dials now decide which of eleven table rows a creature comes from, and
  at the sample sizes here they cannot be told apart — while a single extra
  term in the crowd correction was refused, in writing, for exactly that
  reason. See X5 and X6.

  **This does not conflict with the rule above it.** "No hardcoded balance
  value" means a number you need must be a named dial; it does not mean a
  change needs a *new* one. When a report adds a parameter, it says in one
  line why an existing one could not carry it.
- **The bot may only read `Observation` / `Belief`, never `GameState`.**
  Fog of war is a design decision, not decoration — see `docs/rules.md` §7.
  The rule is about the CHANNEL: a field that carries an unrevealed answer
  has leaked it even if nothing reads that field.
- **Bot rules live in the bot, engine rules live in the engine.** "Kill
  everything before the shrine" was never an engine rule — the engine lets
  the shrine be taken at any time — precisely so P4 could measure what
  relaxing it costs. It has since been relaxed to spine-only by owner
  decision. The engine is no longer faithful to Rogule in general: the
  deliberate divergences are listed in `docs/rules.md` and reasoned in
  `docs/rogule-spec.md` §13.

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

## Measuring without a browser
`node tools/measure.mjs` runs the **same** `src/analysis/` functions
`run-check.html` calls, headless. For sweeps, regressions and any session
whose browser tooling is unavailable — three items in a row lost theirs, which
is why it exists (I10).

```
node tools/measure.mjs --selftest
node tools/measure.mjs --list observed-ruler
node tools/measure.mjs observed-ruler rewardShape '{"runs":6,"firstSeed":500000}'
```

Node 22, no npm, no build, nothing in `src/` modified: the only obstacle was
`mapgen.js` importing ROT.js over https, and `tools/rot-cdn-hook.mjs`
redirects that one specifier to a vendored copy of the identical bundle.

**Run `--selftest` before trusting a number from it**, and again after
touching `src/sim/`, the hook or the vendored bundle. It checks the
substitution is FAITHFUL, not merely non-crashing — generation fingerprints
and a real `rewardShape` call, both recorded from a browser, at fixed seeds.
A runner that quietly produces different numbers is worse than no runner.

**It is not a licence to stop watching the game.** Headless numbers are for
sweeps and regressions; whether the overlay appears, the click lands or the
run reads well still needs a person and a page.

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
