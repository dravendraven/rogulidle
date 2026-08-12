// U11 — the two things a sitting can produce that a single run cannot.
//
// `docs/project/objectives.md` judges a sitting on the distribution of how
// far attempts get, and the history strip already shows that. What it
// cannot show is the FIRST time something happened, because a chip falls
// off the end after twelve runs. These two do not fall off.
//
// Deliberately two, and deliberately not a list that grows. An achievement
// per milestone turns into a checklist, and a checklist is a quantity to
// push — the shape `objectives.md` refuses. These are the two outcomes the
// game is actually about: the wall on the way down, and the bottom.
//
// localStorage only, same reasoning as score.js and wallet.js: `step()`
// takes no storage access, so this stays out of `src/sim/` in both
// directions. Nothing here is read by the engine and nothing here changes
// what a run does.

const KEY = 'rogulidle-achievements';

// `emoji` has to be a glyph `src/ui/tiles.js` carries a sprite for — the
// renderer draws Twemoji SVGs, not system emoji, and returns nothing for a
// glyph it does not know. That is how the Butcher shipped invisible.
export const ACHIEVEMENTS = [
  {
    id: 'butcher',
    emoji: '🐷',
    title: 'Açougue fechado',
    locked: 'o porco do andar 4 ainda está de pé',
    earned: 'você derrubou o Butcher',
  },
  {
    id: 'bottom',
    emoji: '🕳️',
    title: 'Fundo do poço',
    locked: 'dez andares. ninguém chegou ainda',
    earned: 'desceu até onde não há mais escada',
  },
];

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch {
    // Private browsing, quota, or corrupt JSON — the page just shows
    // everything locked rather than breaking.
    return {};
  }
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Same cases as load().
  }
}

export function getAchievements() {
  return load();
}

// Records `id` as earned on run `run`, and reports whether this was the
// FIRST time — which is what the page uses to decide whether to celebrate.
// Earning something twice is silent.
export function earn(id, run) {
  const data = load();
  if (data[id]) return false;
  data[id] = { run, at: Date.now() };
  save(data);
  return true;
}

export function resetAchievements() {
  save({});
  return {};
}

// What a finished run earned, read off `playDungeon`'s own result rather
// than from anything the page tracked separately — one source of truth for
// "did this happen", and it keeps this file out of the run loop.
//
// The vault's occupant is the roster row tagged `vault` (src/sim/spawn.js);
// `dead` is set by the engine when the hero lands the killing blow.
export function earnedBy(runResult) {
  const out = [];
  if (runResult.cleared) out.push('bottom');
  for (const level of runResult.levels) {
    if (level.roster.some((m) => m.vault && m.dead)) {
      out.push('butcher');
      break;
    }
  }
  return out;
}
