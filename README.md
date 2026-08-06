# Rogulidle

A faithful copy of [Rogule](https://rogule.com) that plays itself. There is
nothing to press: a bot clears the dungeon while you watch, and the next run
starts the moment the last one ends.

## Status

**P1 — headless engine.** The rules run and are tested; there is nothing to
look at yet.

- [x] **P0** rules spec, reverse-engineered from the original
- [x] **P1** deterministic headless engine + fog-of-war belief model
- [ ] **P2** renderer, replay player, continuous run loop
- [ ] **P3** the bot
- [ ] **P4** batch tuning

## Running the tests

```
python tools/dev-server.py
```

Then open <http://localhost:8141/run-tests.html>. Opening the HTML file
directly will not work — ES modules need `http://`.

## Layout

```
docs/rogule-spec.md    the rules of Rogule, and where ours diverge (§13)
docs/bot-strategy.md   what the bot is trying to do, and why
docs/balance.md        every tunable number, in one place
src/sim/               the engine — pure, seeded, no DOM
test/tests.js          the rules, checked against the spec
```

The engine is deterministic: a seed plus a list of actions is a complete
replay of a run.

## Licence

AGPL-3.0. Rogule is by [Chris McCormick](https://github.com/chr15m/rogule.com)
and is AGPL-3.0; this is a derivative of it.
