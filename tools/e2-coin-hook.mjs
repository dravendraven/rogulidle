// Node load hook for the E2 sweep ONLY: when the env var E2_COIN_RATE is
// set, the literal `COIN_RATE` in src/sim/balance.js is rewritten AT LOAD,
// inside this one Node process. Nothing in src/ changes, nothing ships, and
// the browser path is untouched — the same reasoning as rot-cdn-hook.mjs,
// which this copies.
//
// WHY A HOOK AND NOT A PARAMETER. `coinsFor` reads the constant directly
// (src/sim/dungeon.js), and threading a `coinRate` option through
// playDungeon to serve a sweep would be a shipped engine change for a
// measurement — the tail wagging the dog. Editing the file per cell would
// collide between parallel cells. A per-process rewrite has neither problem.
//
// LOUD WHEN IT DRIFTS: if the exact line is not found (someone renamed or
// moved the constant), this throws instead of silently measuring the
// shipped rate under a cell labelled otherwise.

const TARGET = /src[/\\]sim[/\\]balance\.js$/;
const LINE = /export const COIN_RATE = \d+;/;

export async function load(urlStr, context, nextLoad) {
  const rate = process.env.E2_COIN_RATE;
  if (!rate || !TARGET.test(new URL(urlStr).pathname)) {
    return nextLoad(urlStr, context);
  }
  const result = await nextLoad(urlStr, context);
  const source = result.source.toString();
  if (!LINE.test(source)) {
    throw new Error(
      'tools/e2-coin-hook.mjs: could not find "export const COIN_RATE = <n>;" '
      + 'in src/sim/balance.js — the constant moved and this hook did not. '
      + 'Refusing to run a cell labelled with a rate it is not applying.',
    );
  }
  return {
    ...result,
    source: source.replace(LINE, `export const COIN_RATE = ${Number(rate)};`),
  };
}
