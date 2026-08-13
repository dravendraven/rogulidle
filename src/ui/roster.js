// The rail: who is playing, and who plays next. Five faces down the left of
// the board (src/sim/heroes.js), the one in play lit and the rest dim.
//
// WHY A RAIL AND NOT A MENU. This product is watched, not played — the
// spectator model never pauses for input, and a screen that demands a choice
// before anything moves teaches the opposite of what the game is. A rail is
// always there, always ignorable, and costs nothing to walk past.
//
// A CLICK QUEUES, IT DOES NOT SWITCH. A run is deterministic from its seed
// AND its hero; swapping mid-run would make the run being watched something
// no seed reproduces. So a pick lands on the NEXT run, marked ⏭, with a
// restart offered beside it for anyone who does not want to wait for the
// death that was coming anyway.
//
// localStorage only, the same rule score.js and wallet.js state: `step()`
// takes no storage access and determinism is the strongest rule in the repo.
// Nothing here is read by the engine; it only decides which config the page
// hands it.

import { HEROES } from '../sim/heroes.js';
import { tileSvg } from './tiles.js';

const KEY = 'rogulidle-hero';

// null means NEVER CHOSE, which is not the same as chose the ordinary hero:
// unset falls through to whatever `dial-overrides.json` ships as the default
// (src/ui/dials.js, "quem joga"), and '' is a visitor overriding that back to
// the plain hero. `getItem` returning null for an absent key gives us the
// distinction for free.
export function getChosenHero() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    // Private browsing or a full quota — the rail simply stops remembering
    // rather than breaking the page, same as score.js.
    return null;
  }
}

export function setChosenHero(name) {
  try {
    localStorage.setItem(KEY, name);
  } catch {
    // As above.
  }
}

// Order is deliberate: the ordinary hero first, because it is the one every
// measurement compares against and the one a visitor should be able to get
// back to without hunting.
const ORDER = ['base', 'vito', 'pawa', 'papazito', 'ricardo'];

// Builds the rail into `container` and returns the two setters the page
// needs. `onRestart` is what the ⏭ chip's restart offers — the page owns
// what "restart" means, since only it knows what a run in flight is.
export function buildRoster(container, { onPick, onRestart } = {}) {
  container.innerHTML = '';
  const chips = new Map();

  for (const key of ORDER) {
    const hero = HEROES[key];
    if (!hero) continue;

    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'roster-chip';
    chip.dataset.hero = hero.name;
    // The blurb is the whole personality, and it belongs on hover rather
    // than on screen: the rail has to stay quiet while the game is what you
    // are looking at.
    chip.title = `${hero.name} — ${hero.title}\n${hero.blurb}`;

    const face = document.createElement('span');
    face.className = 'roster-face';
    // The same baked SVG the board draws, not the system emoji font — a chip
    // that renders the hero differently from the tile is a different hero as
    // far as the eye is concerned.
    face.innerHTML = tileSvg(hero.emoji) || '';
    chip.append(face);

    const mark = document.createElement('span');
    mark.className = 'roster-mark';
    chip.append(mark);

    chip.addEventListener('click', () => {
      // `base` is stored as '' so the value is exactly what the run option
      // takes, and so the falsy default and an explicit "the plain hero"
      // are the same string everywhere downstream.
      const value = hero.name === 'base' ? '' : hero.name;
      setChosenHero(value);
      if (onPick) onPick(value);
    });

    container.append(chip);
    chips.set(hero.name, chip);
  }

  const restart = document.createElement('button');
  restart.type = 'button';
  restart.className = 'roster-now';
  restart.textContent = '↻ agora';
  restart.hidden = true;
  restart.addEventListener('click', () => { if (onRestart) onRestart(); });
  container.append(restart);

  // `playing` is the hero the run on screen is being played by; `queued` is
  // what the next one will use. They differ exactly while a pick is waiting,
  // which is the only moment the restart is worth offering.
  return function show(playing, queued) {
    const now = playing || 'base';
    const next = queued || 'base';
    for (const [name, chip] of chips) {
      chip.classList.toggle('playing', name === now);
      chip.classList.toggle('queued', name === next && next !== now);
      chip.querySelector('.roster-mark').textContent = name === next && next !== now ? '⏭' : '';
    }
    restart.hidden = next === now;
  };
}
