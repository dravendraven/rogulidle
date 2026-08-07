// U4 — docs/backlog.md. A lifetime score, paid only on a full clear:
//
//     award = xpEarned / (turns * 0.01)
//
// localStorage only, and never anywhere near src/sim/: step() takes no
// storage access, and "same seed = same run, always" is the strongest rule
// in this repo. A score that could feed back into a run would break it —
// this is a number on the screen and nothing else.
//
// Pure functions, no DOM. That makes them callable straight from the
// console — `award(200, 1700)` should land near 12 — which is the "way to
// verify without waiting" the item asks for: finishes reads near 0 right
// now, so waiting for a real clear to check this isn't practical yet.

const KEY = 'rogulidle-score';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      total: Number(parsed.total) || 0,
      clears: Number(parsed.clears) || 0,
      last: Number.isFinite(parsed.last) ? parsed.last : null,
    };
  } catch {
    // Private browsing, storage quota, or corrupt JSON — the score just
    // doesn't persist rather than breaking the page.
    return { total: 0, clears: 0, last: null };
  }
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Same cases as load() — nothing to do about it here.
  }
}

export function readScore() {
  return load();
}

export function resetScore() {
  save({ total: 0, clears: 0, last: null });
  return readScore();
}

// The caller is the one who knows what a "cleared" run is — this module
// only knows xp and turns, so the gate that makes the formula safe (only a
// full clear pays) lives in spectator.js, not here.
export function award(xpEarned, turns) {
  const points = turns > 0 ? xpEarned / (turns * 0.01) : 0;
  const data = load();
  data.total += points;
  data.clears += 1;
  data.last = points;
  save(data);
  return data;
}
