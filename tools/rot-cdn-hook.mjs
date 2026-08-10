// Node module-resolution hook: points `mapgen.js`'s CDN import of ROT.js at
// the vendored local copy, so the REAL engine runs headless unmodified.
//
// WHY THIS EXISTS. `src/sim/mapgen.js` imports ROT.js from jsDelivr, which is
// correct for the browser (the project ships by opening HTML files — no build
// step, no npm) and is the one thing Node's loader cannot follow: it resolves
// `file:` and `data:`, not `https:`. That single specifier is the ONLY reason
// the engine could not run outside a browser. Everything else in `src/` is
// plain ES modules Node 22 reads unchanged.
//
// The fix is a resolver hook rather than a source change on purpose. Nothing
// in `src/` moves, nothing ships, and the browser path is untouched — the
// substitution exists only inside a Node process that opted into it by
// calling `module.register()`. A `mapgen.js` edited to import locally would
// have been a shipped change to the engine to serve a measurement tool, which
// is the tail wagging the dog.
//
// PINNED, AND LOUD WHEN IT DRIFTS. The match is the exact specifier string,
// not a pattern. A pattern would keep working after someone bumps the version
// in `mapgen.js` — and would then silently feed the headless runner a
// DIFFERENT ROT.js than the browser gets, which is precisely the "second way
// to run the game that quietly disagrees with the first" this whole entry
// point exists to avoid. So an unrecognised rot-js CDN URL throws with
// instructions instead of being helpfully substituted.

const PINNED = 'https://cdn.jsdelivr.net/npm/rot-js@2.2.0/+esm';
const VENDORED = new URL('./vendor/rot-js-2.2.0.mjs', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === PINNED) {
    return { url: VENDORED, shortCircuit: true };
  }
  // Any OTHER rot-js CDN specifier means src/ moved and this file did not.
  // Fail rather than substitute: a near-miss version is the failure mode that
  // produces plausible wrong numbers instead of an error.
  if (specifier.includes('rot-js') && specifier.startsWith('https://')) {
    throw new Error(
      `tools/rot-cdn-hook.mjs is pinned to:\n  ${PINNED}\n`
      + `but src/ now imports:\n  ${specifier}\n\n`
      + 'Re-vendor and re-pin, both:\n'
      + `  curl -sSL "${specifier}" -o tools/vendor/<name>.mjs\n`
      + '  then update PINNED and VENDORED in tools/rot-cdn-hook.mjs\n\n'
      + 'Refusing to substitute a version the browser does not load — a\n'
      + 'headless runner that quietly disagrees with the page is worse than\n'
      + 'no runner.',
    );
  }
  return nextResolve(specifier, context);
}
