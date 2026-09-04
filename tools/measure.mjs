// The supported headless entry point. Runs the SHIPPED analysis modules in
// Node — no browser, same seeds, same numbers as the page.
//
// ── Run it ────────────────────────────────────────────────────────────────
//
//   node tools/measure.mjs --selftest
//   node tools/measure.mjs --list check
//   node tools/measure.mjs check tripwires '{"runs":24,"firstSeed":500000}'
//   node tools/measure.mjs src/sim/difficulty.js expectedFloorMass 3
//
// Bare module names resolve inside `src/analysis/`; anything with a `/` is
// repo-relative, so nothing is locked to one directory. Args are JSON — one
// value, or a JSON array for several positional args. Results go to stdout as
// JSON (`--pretty` to indent), diagnostics to stderr, so `| jq` works.
//
// **Run `--selftest` first on a machine that has not run this before**, and
// again after touching the hook, the vendored bundle, or anything in
// `src/sim/`. It is the whole reason to trust the rest.
//
// ── What this is, and the one thing it must never become ──────────────────
//
// A LOADER, not a measurement. No statistics, no descent loop, no floor model
// — it imports `src/analysis/*.js` and calls the same functions
// `run-check.html` calls, then prints what they return. Every number it can
// produce is produced by the code the page runs.
//
// That is not stylistic. A second way to run the game is a second thing that
// can drift from the first: the descent loop has already been reimplemented
// four times outside `src/sim/` (E1), and `clustering.js` drifted from the
// engine after M7. A headless runner that grew its own copy of a measurement
// would repeat that with a wider blast radius, because its numbers would look
// authoritative. **If a change to this file adds arithmetic about the game,
// that change is wrong** — it belongs in `src/analysis/`, where the page gets
// it too.
//
// ── Why Node can run the engine at all ────────────────────────────────────
//
// Node 22 reads the project's ES modules unchanged. The single obstacle was
// `src/sim/mapgen.js` importing ROT.js over https, which Node's loader cannot
// fetch; `tools/rot-cdn-hook.mjs` redirects that one specifier to a vendored
// copy. Nothing in `src/` changes and nothing ships — see that file for why
// the pin is exact and fails loudly rather than substituting a near-miss.
//
// ── The anchors, and why none of them drives the bot ──────────────────────
//
// U6f established this approach by reproducing an in-browser result headless:
// seed 1 through `playDungeon` giving `cleared:false, depth:2`. **That anchor
// is deliberately not reused here.** It runs the real bot, and B12 shipped
// after U6f recorded it — a bot-driven anchor goes stale every time bot
// behaviour legitimately changes, and then fails for a reason that has
// nothing to do with ROT.js. An anchor whose failures are usually false is an
// anchor people learn to ignore.
//
// What actually needs checking is narrower: **does the substituted ROT.js
// generate the same dungeons.** So the anchors below are pure generation
// (maps, rosters, spawn points) plus one real `run-check` measurement — both
// recorded FROM THE BROWSER, at the seeds named, and reproducible there by
// re-running the snippet in `browserSnippet()` below. The bot cannot perturb
// either one.

import module from 'node:module';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

module.register('./rot-cdn-hook.mjs', import.meta.url);

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ***** recorded observations — see the anchors note above ***** //
//
// UPDATE THESE only when a change to generation legitimately moves them, and
// re-record from the BROWSER (never from this runner — that would make the
// check circular and it would then pass forever).

// sha256 of tools/vendor/rot-js-2.2.0.mjs, confirmed byte-identical to a
// fresh independent fetch of the pinned CDN URL. Byte-identity is a stronger
// guarantee than any behavioural check: if the bytes match, the substituted
// module IS the module the browser loads.
const VENDOR_SHA256 = '0123bd2a96d26cadb328c986885e7e0e58e35a267b6fc87efac2e9b5a1eb34fe';

// Pure generation: `newGame(seed, floorPlan(level))` on an unplayed state.
//
// Re-recorded three times on 2026-08-31 and back where it started: a coin
// PILE consumed placement draws and moved s1 twice, and the coin CHEST that
// replaced it (since removed) consumed none, so these rosters are the
// original recordings — read off a RELOADED page all the same, because the
// earlier stale-cache misread is the reason the rite exists.
const GENERATION = {
  's1L1': {
    mapHash: '154f1525',
    rooms: 4,
    player: '14,15',
    shrine: '18,5',
    monsters: 'ghost@17,5|bat@7,3|bat@14,14|bat@6,2',
  },
  's1L5': {
    mapHash: '154f1525',
    rooms: 4,
    player: '14,15',
    shrine: '18,5',
    monsters: 'wolf@18,4|boar@19,4|boar@12,15',
  },
  's12345L1': {
    mapHash: '66529623',
    rooms: 4,
    player: '7,26',
    shrine: '22,18',
    monsters: 'rat@9,27|bat@14,16|rat@1,20|ghost@23,18',
  },
  's12345L5': {
    mapHash: '66529623',
    rooms: 4,
    player: '7,26',
    shrine: '22,18',
    monsters: 'wolf@23,18|bat@8,29|bat@5,25|ghost@2,20|ghost@14,18',
  },
};

// A real measurement off the page: `tripwires({ runs: 3, firstSeed: 500000 })`
// from `src/analysis/check.js`, the same call `run-check.html` makes.
// Small on purpose — it is a fidelity check, not a reading. Only the VALUES
// are anchored; whether a wire fires is a threshold question, and moving a
// threshold must never fail the substitution check.
// Re-recorded from the browser whenever GENERATION legitimately moves it.
//
// Re-recorded for B25 — LOOT_VALUE and sideAppetite are code defaults,
// and this anchor deliberately runs on code defaults, so moving them moves it.
// Anchored on the CODE DEFAULTS, deliberately — this call passes no
// `dials`. I3 made readings run on the shipped `dial-overrides.json`, and
// briefly anchored this on them too, which meant every tuning edit broke
// the fidelity check and taught people to re-record on autopilot. This
// asks one question — does the substituted ROT.js produce the browser's
// dungeons — and that question has nothing to do with how the game is
// tuned. Readings still default to the shipped game; see main().
// Re-recorded when the vault wire was added — a SEVENTH value, and the
// other six are unchanged, which is the check working: adding an
// instrument moved the instrument list and nothing else.
// Re-recorded when `guardCost` started charging a guard by DISTANCE instead
// of by presence. Two wires moved (`nothing gets deep` 0 -> 0.333, `the
// gamble is dead` 1 -> 0.667) because the BOT chooses differently, not
// because generation did — the four generation checks above never moved.
// Read off `run-check.html` in a browser, which returned exactly what the
// headless runner returned, which is the fidelity this check is for.
// Re-recorded when the chest gate started sharing the WALK across everything
// one trip collects (C1 §11). The bot chooses differently; generation did not
// move, and the four checks above say so. Read off a RELOADED `run-check.html`
// — the first read returned the old numbers because `import()` caches modules
// per page load and the stale `bot.js` was still in there, which is the trap
// CLAUDE.md warns about and it caught me.
// Re-recorded a third time when C1 §1 gained its uncertainty term and the
// caution centre moved from 15.9 to 8.3. Read off a RELOADED page.
// Re-recorded before that for C1 §1, where the danger field stopped weighing a
// creature by its bite and `caution` became the exchange rate. Every route
// price in the game moved, so this anchor had to; generation did not, and the
// four checks above are what say so. Read off a RELOADED page, for the reason
// the note above gives.
// Re-recorded for coin chests (2026-08-31), and these values SURVIVED the
// chest's removal (2026-09-04) — the selftest still passes on them, so no
// re-record. Read off a freshly served page, per the rule above.
const MEASUREMENT = {
  call: { module: 'check', fn: 'tripwires', args: { runs: 3, firstSeed: 500000 } },
  values: [0, 0.333, 0.333, 0, 0.333, 1, 1],
};

// The exact snippet that produced GENERATION, for re-recording in a browser
// console on any page served from the repo root.
function browserSnippet() {
  return `(async () => {
  const { newGame } = await import('/src/sim/game.js');
  const { floorPlan } = await import('/src/sim/dungeon.js');
  const out = {};
  for (const seed of [1, 12345]) for (const level of [1, 5]) {
    const s = newGame(seed, floorPlan(level));
    const tiles = s.map.tiles.map(t => t === null ? '.' : String(t)[0]).join('');
    let h = 2166136261;
    for (let i = 0; i < tiles.length; i++) { h ^= tiles.charCodeAt(i); h = Math.imul(h, 16777619); }
    out['s' + seed + 'L' + level] = {
      mapHash: (h >>> 0).toString(16), rooms: s.map.rooms.length,
      player: s.player.pos.join(','), shrine: s.shrine.pos.join(','),
      monsters: s.monsters.map(m => m.name + '@' + m.pos[0] + ',' + m.pos[1]).join('|'),
    };
  }
  return out;
})()`;
}

// Same fingerprint the browser snippet computes. A checksum of engine output,
// not a model of anything — the one piece of arithmetic allowed in this file.
function fingerprint(state) {
  const tiles = state.map.tiles.map((t) => (t === null ? '.' : String(t)[0])).join('');
  let h = 2166136261;
  for (let i = 0; i < tiles.length; i++) {
    h ^= tiles.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return {
    mapHash: (h >>> 0).toString(16),
    rooms: state.map.rooms.length,
    player: state.player.pos.join(','),
    shrine: state.shrine.pos.join(','),
    monsters: state.monsters.map((m) => `${m.name}@${m.pos[0]},${m.pos[1]}`).join('|'),
  };
}

// The SHIPPED dials, resolved the same way `run-check.html` resolves them:
// `dial-overrides.json` layered over the code constants, through the one
// function that knows how that layering works. Reading a config file is
// loading, not arithmetic — this stays a loader.
//
// It exists because the page and this runner reach the file differently
// (fetch there, disk here), and `src/ui/dial-overrides.js`'s fetch of a
// relative path silently returns {} under Node. Without this, the headless
// numbers would describe the code defaults while the page described the
// shipped game, and both would look fine.
async function shippedDials() {
  const { resolvedDefaults } = await import(moduleUrl('src/ui/dials.js'));
  const file = path.join(REPO, 'dial-overrides.json');
  let overrides = {};
  if (fs.existsSync(file)) {
    try {
      overrides = JSON.parse(fs.readFileSync(file, 'utf8')) || {};
    } catch {
      overrides = {};              // same failure rule the page uses
    }
  }
  return resolvedDefaults(overrides);
}

// Every `module.export` that is a METRICS SURFACE, and so has to be handed
// `dial-overrides.json` layered over the code constants rather than reading
// the constants alone. See where it is used for what happens when one is
// missing from here.
const NEEDS_DIALS = new Set([
  'check.tripwires',
  'chain.chains',
]);

function moduleUrl(name) {
  const rel = name.includes('/') || name.endsWith('.js') ? name : `src/analysis/${name}.js`;
  return pathToFileURL(path.join(REPO, rel)).href;
}

function die(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const near = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-9;

async function selftest() {
  const out = [];
  const fails = [];
  const say = (line) => out.push(line);

  // 1. the vendored bundle is the CDN bundle
  const vendorPath = path.join(REPO, 'tools/vendor/rot-js-2.2.0.mjs');
  if (!fs.existsSync(vendorPath)) {
    die(`missing ${vendorPath}\nRe-vendor:\n`
      + '  curl -sSL "https://cdn.jsdelivr.net/npm/rot-js@2.2.0/+esm" -o tools/vendor/rot-js-2.2.0.mjs');
  }
  const sha = crypto.createHash('sha256').update(fs.readFileSync(vendorPath)).digest('hex');
  if (sha === VENDOR_SHA256) {
    say('  ok   vendored ROT.js matches the recorded CDN bundle (sha256)');
  } else {
    fails.push('vendored ROT.js is not the bundle this was checked against');
    say(`  FAIL vendored ROT.js sha256\n         expected ${VENDOR_SHA256}\n         got      ${sha}`);
  }

  // 2. the substituted ROT.js generates the browser's dungeons
  const { newGame } = await import(moduleUrl('src/sim/game.js'));
  const { floorPlan } = await import(moduleUrl('src/sim/dungeon.js'));
  for (const [key, want] of Object.entries(GENERATION)) {
    const [, seed, level] = key.match(/^s(\d+)L(\d+)$/).map(Number);
    const got = fingerprint(newGame(seed, floorPlan(level)));
    const bad = Object.keys(want).filter((k) => String(got[k]) !== String(want[k]));
    if (!bad.length) {
      say(`  ok   generation ${key} matches the browser (map, rooms, spawn, shrine, roster)`);
    } else {
      fails.push(`generation ${key} differs from the browser`);
      say(`  FAIL generation ${key}`);
      for (const k of bad) say(`         ${k}: browser ${want[k]}  |  headless ${got[k]}`);
    }
  }

  // 3. a real run-check measurement reproduces, same seeds
  const mod = await import(moduleUrl(MEASUREMENT.call.module));
  const result = mod[MEASUREMENT.call.fn](MEASUREMENT.call.args);
  const got = result.tripwires.map((w) => w.value);
  const want = MEASUREMENT.values;
  const off = [];
  for (let i = 0; i < want.length; i++) {
    if (!near(got[i], want[i])) {
      off.push(`${result.tripwires[i]?.name ?? i}: browser ${want[i]}  |  headless ${got[i]}`);
    }
  }
  if (got.length !== want.length) off.push(`wire count: browser ${want.length} | headless ${got.length}`);
  if (!off.length) {
    say(`  ok   ${MEASUREMENT.call.fn} — every wire's value matches the page`);
  } else {
    fails.push(`${MEASUREMENT.call.fn} differs from the page`);
    say(`  FAIL ${MEASUREMENT.call.fn}`);
    for (const line of off) say(`         ${line}`);
  }

  const ok = fails.length === 0;
  process.stderr.write(
    `${ok ? 'PASS' : 'FAIL'} — headless runner vs the browser\n${out.join('\n')}\n`
    + (ok
      ? '\nThe vendored ROT.js generates the same dungeons and the same page\nnumbers. Numbers from this runner can be trusted.\n'
      : '\nDo NOT trust numbers from this runner until this passes.\n'
        + 'If generation moved for a legitimate reason, re-record the anchors\n'
        + 'FROM A BROWSER (never from this runner) — the snippet is in\n'
        + 'tools/measure.mjs, printed by --snippet.\n'),
  );
  process.stdout.write(`${JSON.stringify({ selftest: ok ? 'pass' : 'fail', failures: fails })}\n`);
  process.exit(ok ? 0 : 1);
}

async function list(name) {
  if (!name) die('--list needs a module, e.g. --list check');
  const mod = await import(moduleUrl(name));
  const functions = Object.keys(mod).filter((k) => typeof mod[k] === 'function').sort();
  const values = Object.keys(mod).filter((k) => typeof mod[k] !== 'function').sort();
  process.stdout.write(`${JSON.stringify({ module: name, functions, values }, null, 2)}\n`);
}

async function main() {
  const argv = process.argv.slice(2);
  const pretty = argv.includes('--pretty');
  const args = argv.filter((a) => a !== '--pretty');

  if (args.includes('--selftest')) return selftest();
  if (args.includes('--snippet')) {
    process.stdout.write(`${browserSnippet()}\n`);
    return undefined;
  }
  if (args[0] === '--list') return list(args[1]);
  if (!args.length || args.includes('--help')) {
    process.stdout.write(
      'node tools/measure.mjs --selftest            check this runner against the browser\n'
      + 'node tools/measure.mjs --list <module>       show a module\'s exports\n'
      + 'node tools/measure.mjs --snippet             print the anchor-recording snippet\n'
      + 'node tools/measure.mjs <module> <export> [jsonArgs] [--pretty]\n\n'
      + 'Bare module name -> src/analysis/<name>.js; a path with "/" is\n'
      + 'repo-relative. jsonArgs is one JSON value, or a JSON array for\n'
      + 'several positional arguments.\n',
    );
    return undefined;
  }

  const [name, exportName, rawArgs] = args;
  if (!exportName) die(`no export named. Try: node tools/measure.mjs --list ${name}`);

  const mod = await import(moduleUrl(name));
  if (typeof mod[exportName] !== 'function') {
    die(`${name} has no exported function "${exportName}". `
      + `Try: node tools/measure.mjs --list ${name}`);
  }

  let callArgs = [];
  if (rawArgs !== undefined) {
    let parsed;
    try {
      parsed = JSON.parse(rawArgs);
    } catch (error) {
      die(`arguments are not valid JSON: ${error.message}`);
    }
    callArgs = Array.isArray(parsed) ? parsed : [parsed];
  }

  // A metrics surface describes the SHIPPED game unless the caller says
  // otherwise, same as the page. An explicit `dials` in the JSON args wins.
  //
  // A LIST, not an `if`, because there are two instruments now and the `if`
  // silently excluded the second one. Reading the code defaults instead of
  // the shipped dials is not a small error: the backlog carried "opening
  // deaths 0.667" as a live defect for weeks while the shipped game read
  // 0.247 (I3). One line per instrument, and an instrument missing from here
  // is obvious the first time its numbers look wrong.
  if (NEEDS_DIALS.has(`${name}.${exportName}`)) {
    const given = callArgs[0] && typeof callArgs[0] === 'object' ? callArgs[0] : {};
    callArgs = [{ dials: await shippedDials(), ...given }];
  }

  const started = Date.now();
  const result = await mod[exportName](...callArgs);
  process.stderr.write(`${name}.${exportName} — ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
  process.stdout.write(`${JSON.stringify(result, null, pretty ? 2 : 0)}\n`);
  return undefined;
}

main().catch((error) => {
  process.stderr.write(`${error && error.stack ? error.stack : error}\n`);
  process.exit(1);
});
