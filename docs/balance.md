# Balance — single source of truth for every tunable number

Mirrored in `src/sim/balance.js`. Change here first, then there. Nothing in
`src/sim/*.js` may hardcode a number that belongs on this page.

Values marked **FAITHFUL** are copied from the original Rogule source and
should not be touched without a reason — changing them makes the copy stop
being a copy. Values marked **INITIAL GUESS** are ours and are what P4 tunes.

---

## World

| Name | Value | Status |
|---|---|---|
| `MAP_SIZE` | 32 × 32 | FAITHFUL (`ui.cljs:26`) |
| `CORRIDOR_LENGTH` | `[1, 5]` | FAITHFUL (`generator.cljs:146`) |
| `VISIBLE_DIST` | 9 | FAITHFUL (`ui.cljs:27`) |
| `CLEAR_DIST` | 7 | FAITHFUL (`ui.cljs:29`) — cosmetic only |
| `COVER_COUNT` | 15 | FAITHFUL (`generator.cljs:326`) |
| `MONSTER_COUNT` | 5 | FAITHFUL (`generator.cljs:326`) |

`MONSTER_COUNT` and `COVER_COUNT` are the first dials to reach for in P4.
Five monsters on a 32×32 map is very sparse — see spec §10.2.

## Player

| Name | Value | Status |
|---|---|---|
| `PLAYER_HP` | 10 | FAITHFUL (`generator.cljs:216`) |
| `PLAYER_XP` | 3 | FAITHFUL (`generator.cljs:26`) |
| `XP_PER_KILLS` | 1 xp every 2 kills | FAITHFUL (`engine.cljs:272`) |

## Regeneration

| Name | Value | Status |
|---|---|---|
| `REJUVINATION_RATE` | 100 turns per +1 HP | FAITHFUL (`engine.cljs:27`) |
| `REGEN_CAP_FRACTION` | 0.20 of max HP | **INITIAL GUESS** |

`REGEN_CAP_FRACTION` is our divergence from the original — see spec §13.1.
The original has no cap, which lets a bot camp in a cold zone and heal
forever. With `PLAYER_HP` 10 the cap is 2 HP per run, and spending it all
costs 200 turns.

These two numbers are coupled: together they decide whether the cap is even
reachable in a typical run. Tune them as a pair, never alone.

## Combat

| Name | Value | Status |
|---|---|---|
| `HIT_CHANCE` | 5/6 | FAITHFUL (`engine.cljs:257`) |
| damage roll | uniform `0 .. attacker.xp - 1` | FAITHFUL (`engine.cljs:258`) |
| damage formula | `max(0, (roll + weapons - armour) * hit)` | FAITHFUL (`engine.cljs:261`) |

## Monsters

FAITHFUL — `generator.cljs:76`. `xp` is both the damage stat and the number
drawn above the monster's head.

| # | Name | Emoji | `activation` | `xp` | `hp` |
|---|---|---|---|---|---|
| 0 | rat | 🐀 | 3 | 1 | 2 |
| 1 | bat | 🦇 | 10 | 2 | 3 |
| 2 | ghost | 👻 | 10 | 3 | 3 |
| 3 | boar | 🐗 | 15 | 3 | 4 |
| 4 | wolf | 🐺 | 20 | 4 | 5 |
| 5 | ogre | 👹 | 10 | 4 | 7 |
| 6 | zombie | 🧟 | 5 | 5 | 9 |
| 7 | vampire | 🧛 | 15 | 6 | 8 |
| 8 | genie | 🧞 | 20 | 6 | 10 |
| 9 | dragon | 🐉 | 10 | 8 | 15 |
| 10 | t-rex | 🦖 | 15 | 10 | 12 |

| Name | Value | Status |
|---|---|---|
| `MONSTER_SKIP_CHANCE` | 0.10 | FAITHFUL (`engine.cljs:353`) |
| `MONSTER_DROP_CHANCE` | 0.50 | FAITHFUL (`generator.cljs:275`) |
| `MONSTER_DIFFICULTY_SCALE` | 0.75 | FAITHFUL (`generator.cljs:262`) |
| `MONSTER_WEIGHTS` | offset 0→6, ±1→2, ±2→1 | FAITHFUL (`generator.cljs:267`) |

Weights are summed on collision at the table edges, which is our fix for
spec quirk §9.2 — the original overwrites and makes the target monster
*less* likely than its neighbour.

## Items

FAITHFUL — `generator.cljs:28`. Pick weight is `1 / value`, so a high
`value` means a **rare** item.

| Item | Emoji | `value` | weight | probability | Effect |
|---|---|---|---|---|---|
| chestnut | 🌰 | 1 | 1.000 | 32.9% | none (collectible) |
| mushroom | 🍄 | 2 | 0.500 | 16.4% | none (collectible) |
| health | 🥃 | 2 | 0.500 | 16.4% | +3 HP, capped at max |
| shield | 🛡️ | 3 | 0.333 | 11.0% | +1 armour |
| dagger | 🗡️ | 3 | 0.333 | 11.0% | +1 damage |
| axe | 🪓 | 4 | 0.250 | 8.2% | +2 damage |
| gem-stone | 💎 | 8 | 0.125 | 4.1% | none (collectible) |

| Name | Value | Status |
|---|---|---|
| `POTION_HEAL` | 3 | FAITHFUL (`engine.cljs:209`) |
| `COVER_DIFFICULTY_SCALE` | 0.9 | FAITHFUL (`generator.cljs:238`) |
| `COVER_LOOT_RICHER_FAR` | `true` | **INITIAL GUESS** |

`COVER_LOOT_RICHER_FAR` is our fix for spec quirk §9.3.

- `true` (ours) — covers further from the player are **more** likely to hold
  loot, sweeping from 10% next to the spawn up to 100% at the far end.
- `false` — the original's behaviour, the same sweep in reverse.

Both directions cover the same probability range, so flipping it does not
change how much loot a map holds on average, only where it sits.

## Bot

Not used until P3. Listed here so there is one place to look.

| Name | Value | Status |
|---|---|---|
| `BOT_KNOWS_MONSTER_COUNT` | `true` | decided — see bot-strategy §4.1 |
| `STEP_COST_IN_HP` | 0.01 | **INITIAL GUESS** |
| `GOAL_STICKINESS` | 1.15 | **INITIAL GUESS** |
| `UNKNOWN_MONSTER_ESTIMATE` | `{ xp: 4, hp: 7 }` | **INITIAL GUESS** |
| `COVER_LOOT_CHANCE` | 0.60 | measured over 150 maps |

`UNKNOWN_MONSTER_ESTIMATE` stands in for a monster the bot has not met yet.
It knows how many are unaccounted for but not what they are, and gear has
to be priced against them too — otherwise the bot values a shield at zero
in exactly the moment it should be stocking up. The values are the median
of `MONSTER_TABLE`, which happens to be the ogre.

`COVER_LOOT_CHANCE` is what the bot assumes when deciding whether opening
a cover is worth the two turns it costs. Measured, not guessed, but it will
move if `COVER_LOOT_RICHER_FAR` or the cover count changes.

`STEP_COST_IN_HP` is the practical form of the λ dial from bot-strategy §0.
At 0.01 the bot walks 100 extra steps to save 1 hp. Raise it and it gets
hasty and reckless; lower it and it gets patient and slow. This is the
knob that shows up as personality on screen, and the main thing P4 sweeps.

`GOAL_STICKINESS` stops the bot dithering between two near-equal targets:
a new one has to be 15% better before it switches.
