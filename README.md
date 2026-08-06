# Rogulidle

A faithful copy of [Rogule](https://rogule.com) that plays itself. There is
nothing to press: a bot clears the dungeon while you watch, and the next run
starts the moment the last one ends.

## Status

**P2 — watchable.** Runs play out on screen, one after another. The thing
playing them is still a placeholder that wanders at random; the real bot is
P3.

- [x] **P0** rules spec, reverse-engineered from the original
- [x] **P1** deterministic headless engine + fog-of-war belief model
- [x] **P2** renderer, replay player, continuous run loop
- [ ] **P3** the bot
- [ ] **P4** batch tuning

## Running it

```
python tools/dev-server.py
```

Then open <http://localhost:8141/index.html> to watch, or
<http://localhost:8141/run-tests.html> to check the rules. Opening the HTML
files directly will not work — ES modules need `http://`.

Add `?seed=anything` to make a whole session reproducible.

Dimmed tiles on screen are what the bot *remembers* rather than what it can
currently see — monsters shown there may already have moved.

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
