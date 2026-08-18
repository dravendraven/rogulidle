# Rogulidle

A roguelike that plays itself, derived from [Rogule](https://rogule.com). There is
nothing to press: a bot clears the dungeon while you watch, and the next run
starts the moment the last one ends.

## Running it

```
python tools/dev-server.py
```

Then open <http://localhost:8141/index.html> to watch,
<http://localhost:8141/run-tests.html> to check the rules, or
<http://localhost:8141/run-check.html> for the metrics tripwires (both
instruments — naked runs and chained sessions with the shop).

Opening the HTML files directly will not work — ES modules need `http://`.

Headless: `node tools/measure.mjs --selftest` first, then e.g.
`node tools/measure.mjs check tripwires '{"runs":24}'`.

## What it has

A ten-floor dungeon with fog of war, a bot that fights and loots its way
down, a shop between runs, a vault on floor 4 with a mini-boss (the
Butcher), an achievement that unlocks on the first kill, and a dial panel
where the visitor's rolled settings shape how the bot plays.

`?seed=anything` on the URL reproduces a session. `?dev=1` opens the lab
panel with dial overrides.

## Layout

```
docs/project/objectives.md   what the product has to be
docs/rules.md                what the game does (rules, never values)
docs/bot.md                  the bot's objectives and pursuit
docs/balance.md              every tuning value, in one table
docs/rogule-spec.md          provenance — the original Rogule, reverse-engineered
src/sim/                     the engine — pure, seeded, no DOM
src/bot/                     the bot — reads observations, never game state
src/ui/                      renderer, spectator, dial panel
test/tests.js                the rules, checked against the spec
```

The engine is deterministic: a seed plus a list of actions is a complete
replay of a run.

## Licence

AGPL-3.0. Rogule is by [Chris McCormick](https://github.com/chr15m/rogule.com)
and is AGPL-3.0; this is a derivative of it.
