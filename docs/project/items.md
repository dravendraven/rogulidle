# Items, attributes and the shop

**What the hero carries, what it costs to carry it, and where it comes from.**

`docs/project/game-loop.md` defines the *skeleton* — how many purchases a tier
allows, what a purchase costs in coin and in optionality, when the tree resets.
**This document fills that skeleton.** Nothing here decides pacing; nothing
there decides contents.

**Every number is an INITIAL GUESS.** Nothing is implemented, and no number
moves to `docs/balance.md` until it is.

---

## Stamina — the currency the rest of this is paid in

**A step budget.** A third bar, the same shape as armour: consumed, and not
refilled by walking it off.

*Placement note: stamina is a hero resource, not an item, so it sits awkwardly
here. It lives in this document because it is the currency half the attributes
are priced in and the reason one of the items is possible at all. Once built it
belongs in `docs/rules.md` like any other rule.*

**The mechanism already exists with the wrong value.** Each floor already runs
under a turn cap, and running out of it is already a loss condition — today it
is a safety guard set so high it never fires. Turning it into a design
constraint is a changed value plus bot work, not a new system.

It also makes the bot's own step price stop being a fudge. The bot already
prices a step; it prices it at nearly nothing because a step costs nearly
nothing. Under a budget that price becomes a real conversion rate, and the
routing machinery already in the bot starts doing real work.

### Budget, not clock

A clock — threat arriving over time — needs floors long enough for arrivals to
accumulate. **Floors here clear in under a minute, so a clock has nothing to
work with.** A budget does not care: it is a routing constraint rather than an
attrition one, and a side room costs a countable number of steps out of a fixed
pool at the moment the decision is made.

**This is what gives the detour a price**, which `docs/map-design.md` names as
the largest open gap in the game — refusing is never correct while the downside
is bounded by nothing worse than a slower floor.

### What it unlocks

| | |
|---|---|
| the detour bargain | distance becomes a cost, so refusing can be right |
| **Magnitude** attributes | they had no real currency to be paid in |
| 🥾 boots | an item with no mechanic without it |
| 🏹 bow | **impossible without it** — see below |

**Open: per floor, or per run.** Per floor is simpler and keeps each floor
self-contained. Per run turns the whole descent into one allocation problem and
makes the return genuinely tense — and is far harder for the bot to plan
against.

---

## The three pools

Settled. This is a rule about **where things come from**, not what they do.

| pool | holds | comes from |
|---|---|---|
| **weapon** | 🗡️ dagger, 🪓 axe | **creature drops only** |
| **defensive** | 🛡️ shield, 🥃 potion | **chests only** |
| **rare** | 🌀 teleport, 🔮 barrier | chests, **only when luck opens them** |
| **shop** | the starting loadout | may sell what neither of the above produces |

Weapons staying on creatures is deliberate: it ties arming yourself to fighting,
causally. **Luck does not move weapons back into chests** — it creates a rare
chance at a pool nothing else can reach, so the rule stays the rule and the
exception stays an event.

## The items

| emoji | item | does | status |
|---|---|---|---|
| 🥃 | potion | heals, carried, drinking costs a turn | **in the game** |
| 🛡️ | shield | a second bar that is consumed | **in the game** |
| 🗡️ | dagger | damage; weapon damage sums the inventory | **in the game** |
| 🪓 | axe | more damage, same rule | **in the game** |
| 🍀 | luck amulet | a small chance a chest draws from the rare pool | **settled** |
| 🌀 | teleport | one use — leave a position that cannot be survived | **settled, expensive** |
| 🔮 | barrier | one use — immune for two turns | **settled, expensive** |
| 🥾 | boots | cheaper steps, against the stamina budget | proposed |
| 🏹 | bow | attacks before contact | proposed, costly, **depends on stamina** |

### 🌀 and 🔮 are the only items that answer a primary objective directly

The bot decides *before* a fight whether it is survivable and has no verb for
leaving one it has already entered. Surrounded, there is currently no move at
all — hope there is zero by absence of options, not by probability.

They are also what turns a lethal tail into drama rather than a sentence. **A
spike is only dramatic if escaping it was possible.**

### 🍀 buys certainty against variance, which nothing else does

One guaranteed use, or a chance at several. And luck only pays if the run lasts
long enough to open more chests — so **buying it is a bet on your own
survival**. That is the prediction skill turned into a purchase, and its correct
answer changes with the hero, the tier and the day.

### 🏹 the bow is the hardest one, and it is only balanceable because of stamina

Ranged attack in a game where all damage requires adjacency is enormous. From
range `R` the hero gets roughly `R` free shots as a creature closes — at melee
damage that kills most of the table before contact. Not strong: decisive.

Three things make it a trade rather than an upgrade, and only one of them is new:

| piece | what it is |
|---|---|
| **armour does nothing while it is equipped** | **the main cost, and it is new** |
| **low damage per shot** | a value, not a mechanism |
| **the kite is bounded** | free, from stamina |

**Armour disabled is the right cost because armour is a consumed bar, never a
reduction.** Turning it off sends every blow straight to hp, so the bow converts
steady chip damage into a binary: nothing, or death. **That is variance, not
power** — and it changes the shape of play rather than the size of a number.
Corridors become excellent, open rooms become suicidal, and it is obvious in
thirty seconds which build is running.

**Without stamina the bow cannot be balanced at all.** Creatures skip a turn
some of the time, so they are marginally slower than the hero — which means
open ground allows **unbounded kiting**: retreat, shoot, retreat, shoot. A step
budget makes kiting cost the run's scarcest resource, and the exploit closes by
construction. **If stamina does not ship, the bow does not either.**

### Rejected

**🔔 bell** — woke creatures from further away, for more fights and more drops.
Rejected: it sells a weaker version of what Vito already is, which is the same
defect that rules out a vision item (a weaker Papazito) or a loot-truth item (a
weaker Ricardo). The activation-radius hook it aimed at is still unused, but the
shape that fits there is *pulling one creature out of a group* rather than
waking all of them — and that overlaps the bow.

---

## Attributes — three ways to pay

Not three lists per item. **Three currencies**, each applying to any item.

| category | what it gives | what it costs |
|---|---|---|
| **Magnitude** | the item does more | the armour bar, or stamina |
| **Focus** | better in one context | worse in the complementary one |
| **Persistence** | more now | less later — it breaks, or does not carry |

**Magnitude was previously anchored on step cost, which is not a real cost** —
that dial is how the bot *prices* a step, not something the game charges. With
stamina it has two real currencies. Without stamina it has none.

**Focus is the category that carries the design**, because its value depends on
the day's nerf. Keen is excellent when the day adds strong creatures and poor
when it adds many.

| item | Magnitude | Focus | Persistence |
|---|---|---|---|
| 🪓 axe | **Heavy** — more damage, armour drains faster | **Keen** — better one-on-one, worse in crowds | **Notched** — much more damage, degrades per kill |
| 🗡️ dagger | **Honed** — more damage, starts with less armour | **Swift** — better outnumbered, worse alone | **Envenomed** — grows, then runs out |
| 🛡️ shield | **Banded** — more armour, costlier steps | **Braced** — double in crowds, half in duels | **Cracked** — much more, does not carry between floors |
| 🥃 potion | **Concentrated** — heals more, only below a threshold | **Slow** — heals over turns, bad mid-fight | **Split** — two smaller doses |
| 🍀 luck | **Charmed** — better odds, costlier steps | **Deep** — only on the descent | **Fading** — strong early, decays per floor |
| 🥾 boots | **Light** — cheaper steps, less armour | **Homeward** — cheap on the return, normal going down | **Worn** — very cheap, wears out |
| 🏹 bow | **Longbow** — more range, slower to fire | **Hunter's** — better at distance, worse adjacent | **Frayed** — limited shots |

**Deep and Homeward exist only because the run has two halves**, and Braced only
because the floor has crowds. They could not exist in another game — which is
the test that the attributes are hooked into this map rather than pasted on it.

---

## The generator

Rule-governed, not random. Same shape as the map generator: draw, constrain,
validate-or-retry.

```
1. draw a budget B from [floor, ceiling], scaled by the node's depth
2. draw the buff's axis and attribute
3. draw the buff magnitude so that price(buff) ≈ B
4. draw the nerf from an axis ADJACENT to the buff's — never the same, never unrelated
5. draw the nerf magnitude so that price(nerf) ≈ B × (1 − margin)
6. reject and redraw if the pair is incoherent or duplicates something already offered
```

**The coefficient has to be a price table, not one number.** A budget that
balances magnitude does not balance value: in this game weapon damage is the
only permanent power and armour is a consumed bar, so a point of each is not the
same currency. The budget is spent in **price**, never in points.

**Adjacent axis, never the same one.** Same-axis pairing cancels and produces an
item with no identity — more damage and less damage is a wash. Adjacent pairing
produces character: heavy but slow, precise but fragile.

**The margin is net-positive on purpose.** Not generosity — if attributes were
net-zero, buying would not raise the odds, and the approach to the challenge
would stop being legible. It is also a dial that **compounds** across a full
tree.

> **Tripwire: if two generated items produce the same run, the generator made
> variety on paper and noise in play.** The test is watching and being able to
> say which is equipped, not reading the tooltip.

---

## The shop — what is fixed and what is drawn

| | fixed | drawn per day |
|---|---|---|
| item bases | **yes** | |
| attributes | **yes** | |
| the purchase skeleton | **yes** — it belongs to the loop | |
| the price curve | **yes** | |
| **which combinations are on offer** | | **yes** |

> **Randomise the offer. Never the vocabulary.**

You learn what Keen does and never unlearn it. You never learn what will appear.
Knowledge transfers; the answer does not — the same balance the daily
configuration needs, applied to the shop.

**This is what stops the daily from being solvable.** A fixed shop plus a known
nerf has one right answer, found once and repeated forever. A drawn shop plus a
known nerf has a best *available* answer, which is a different problem every day.
It turns the tree from a plan into a draft.

Two costs, honestly stated: a drawn offer is **not a tree** — branches whose
children are drawn are a stream, and "I chose this path" weakens. And a
generated item cannot be hand-checked for dominance the way four written ones
can, so the guarantee moves into the generator, which is harder to trust.

### Why no item is a no-brainer — the nerf decides

| the day's nerf | what answers it |
|---|---|
| creatures hit harder | 🛡️ shield |
| more creatures per floor | 🥃 potion, and 🏹 bow becomes dangerous |
| chests are empty on the descent | 🍀 luck, 🥃 potion |
| less stamina | 🥾 boots |
| more creatures above their band | 🌀 teleport, 🔮 barrier |

Equal in expectation across all days. **Unequal against any given day.** That
gap is the whole reason the morning's announcement is worth reading.

**And the shop must not sell what a persona already is.** A vision item is a
weaker Papazito; a loot-truth item is a weaker Ricardo. The items on offer are
chosen against the roster, never independently of it — the same collision `U7`
already names between Vito and Ricardo.

---

## The vocabulary, across the whole game

| pool | total for the whole game | per tier |
|---|---|---|
| item bases | **12–16** | 4 on offer, drawn |
| attributes | **~6, in 3 categories** | up to 3–5 per item, set by tier |

**The dungeon is the variety engine; items are the vocabulary.** Seeing a tier-2
item again at tier 7 is not repetition — it is the same item against a different
dungeon and a different nerf. A vocabulary of a dozen well-shaped items beats
forty that are variations on "+2 to something".

---

## Open

| # | question | why it matters |
|---|---|---|
| 1 | **the price table** | the generator cannot be built without it, and it is balance work rather than generator work |
| 2 | stamina per floor or per run | changes how hard the bot has to plan |
| 3 | are 🥾 and 🏹 in at all | both depend on stamina; the bow depends on it absolutely |
| 4 | three more item bases | the pools above hold seven; the vocabulary wants a dozen |
| 5 | where stamina finally lives | a hero resource in a document about items — see the note at the top |
