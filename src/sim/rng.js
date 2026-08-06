// Seeded PRNG (mulberry32) and helpers. ALL randomness in src/sim flows
// through here — Math.random() is banned (CLAUDE.md).
//
// The whole generator state is one 32-bit int, which is what lets step()
// stay pure: the game state carries the ints, and every draw reads one and
// writes back the advanced one. Same seed = same run, always.

// Returns a function yielding floats in [0, 1), fully determined by seed.
export function makeRng(seed) {
  let a = seed >>> 0;
  function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  rng.getState = () => a >>> 0;
  rng.setState = (s) => { a = s >>> 0; };
  return rng;
}

// Derive an independent seed from two integers. Same inputs, same output.
export function hashSeeds(a, b) {
  let h = (a ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = (h + Math.imul(b | 0, 0xc2b2ae35)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0x27d4eb2f) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

// Turn any string into a seed int, so runs can be named ("2026-08-05").
export function seedFromString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

// ***** stream draws *****
// A "stream" is a named independent RNG living on the game state, so that
// (say) combat rolls never shift because map generation drew one more number.
// Streams: 'map' (seeds ROT), 'spawn' (placement), 'combat' (rolls + AI).

export function draw(state, stream) {
  const rng = makeRng(state.rng[stream]);
  const value = rng();
  state.rng[stream] = rng.getState();
  return value;
}

// Integer in [min, max] inclusive.
export function drawInt(state, stream, min, max) {
  return min + Math.floor(draw(state, stream) * (max - min + 1));
}

// True with probability p.
export function drawChance(state, stream, p) {
  return draw(state, stream) < p;
}

export function drawPick(state, stream, arr) {
  return arr[Math.floor(draw(state, stream) * arr.length)];
}

// entries: [[item, weight], ...] — picks proportionally to weight.
export function drawWeighted(state, stream, entries) {
  let total = 0;
  for (const [, w] of entries) total += w;
  let r = draw(state, stream) * total;
  for (const [item, w] of entries) {
    r -= w;
    if (r < 0) return item;
  }
  return entries[entries.length - 1][0];
}
