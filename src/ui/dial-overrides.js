// Where the shipped dial values actually come from: the code constants in
// src/sim/balance.js, src/sim/difficulty.js and src/bot/config.js, UNLESS
// dial-overrides.json (repo root) sets one. That JSON is the one file dev
// mode writes — see docs/backlog.md's dev-mode note and dials.js's `dev`
// option.
//
// Deliberately a SEPARATE file from the code constants, never a rewrite of
// balance.js's prose. CLAUDE.md's one-source-of-truth rule still means a
// value worth PERMANENTLY keeping belongs in balance.md + the code, in its
// own commit — this file is for shipping a live experiment to every player
// quickly, not a replacement for that.
//
// Loaded unconditionally by every visitor before their first run is built,
// so a missing or malformed file must never break the page: every failure
// here returns {}, which reproduces the code defaults exactly — the same
// game as if this file did not exist.
export async function loadDialOverrides() {
  try {
    const res = await fetch('./dial-overrides.json', { cache: 'no-store' });
    if (!res.ok) return {};
    const json = await res.json();
    return (json && typeof json === 'object') ? json : {};
  } catch {
    return {};
  }
}
