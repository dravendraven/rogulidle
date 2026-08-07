# What we are doing

Rogulidle is a copy of Rogule that plays itself. The player watches a bot
descend ten floors, run after run. **The product is the spectacle.**

So the goal is: **a run should be worth watching.** That is not measurable
and there is no plan to make it measurable. It is judged by watching.

## How work gets found

**Watch the game. Fix what is wrong.**

That is the whole method. It is not a fallback from something better — it
has outperformed the alternative by a wide margin, and the record is worth
keeping because it was expensive to learn.

## What the measurement programme cost, and what it bought

For a long stretch this project was organised around approaching DCSS's
difficulty curve: challenge, power, reward, buffer, and the coefficient of
variation, each with a target and a bound.

Twelve items closed under that programme. **Seven were instruments** — the
ruler, the probes, buffer turning out to be two quantities, reward measured
twenty times wrong, capacity confounded with the probe's own size. Three
were changes to the game. **One of those stuck**: M7, which moved CV from
0.941 to 0.994.

Most of the effort was the measuring apparatus repairing itself.

Then the owner watched the bot play for one session and found six real
defects — rats that deal literally zero damage, floors cheaper than the
floor above them, empty maps, an unguarded exit. **Not one had shown up in
any metric.**

**The mistake was the anchor.** "Approach DCSS's curve" used numbers derived
from attribute scales rather than observed play, and it was never
established that CV is what makes a run worth watching. Everything
downstream inherited that: targets, bounds, two-pass reviews, flag
protocols. CV went up. Nobody can say the game got better to watch.

## What survives

- **M7 is adopted** and its CV gain is real. It is recorded as achieved and
  nobody chases it further.
- **M10** fixed the side-room regression M7 caused.
- **The instruments exist and are cheap to run.** They stay, as a
  **regression check** — "did something break" — not as a scoreboard. They
  caught real things: `campaignCost` mispricing crowds, reward being read
  twenty times low, `clustering.js` drifting from the engine.
- **Numbers are produced on demand** by `run-check.html`, not written down.
  A recorded measurement goes stale and gets compared against anyway — the
  old `kpi.md` baseline failed to reproduce, which is why it is gone.

## What is gone

- **The targets table.** No number is a goal any more.
- **The four ratios** as an organising frame.
- **Two-pass review, the flag protocol, the claim protocol** — those exist to
  coordinate parallel sessions and to attribute changes that share a budget.
  Reintroduce them if either problem comes back; do not run them by default.

## The rule that replaces all of it

**Measure only when you cannot tell by looking.**

Most of what is wrong with this game is visible in thirty seconds of
watching. Reach for an instrument when a question is genuinely invisible —
"is this floor actually harder than that one", "did that change break
something three floors down" — and not before.
