// Who is playing, and who plays next — the card and the picker as ONE block
// (src/sim/heroes.js). It is the most important control on the page, so it
// sits at the top of the left column and, unlike the dials under it, never
// hides.
//
// WHY A PICKER AND NOT A MENU. This product is watched, not played — the
// spectator model never pauses for input, and a screen that demands a choice
// before anything moves teaches the opposite of what the game is. A block
// that is always there and always ignorable costs nothing to walk past.
//
// A CLICK QUEUES, IT DOES NOT SWITCH. A run is deterministic from its seed
// AND its hero; swapping mid-run would make the run being watched something
// no seed reproduces. So a pick lands on the NEXT run, said out loud on the
// card, with a restart offered for anyone who does not want to wait for the
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
// unset falls through to whatever `dial-overrides.json` ships as the default,
// and '' is a visitor overriding that back to the plain hero. `getItem`
// returning null for an absent key gives us the distinction for free.
export function getChosenHero() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    // Private browsing or a full quota — the picker simply stops remembering
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

export function buildRoster(container, { onPick, onRestart } = {}) {
  container.innerHTML = '';

  const heading = document.createElement('h2');
  heading.className = 'roster-title';
  heading.textContent = 'Herói';
  container.append(heading);

  // ***** the card: what the current choice MEANS *****
  const card = document.createElement('div');
  card.className = 'roster-card';
  const face = document.createElement('div');
  face.className = 'roster-card-face';
  const name = document.createElement('div');
  name.className = 'roster-card-name';
  card.append(face, name);
  container.append(card);

  // Full width under the card rather than beside the face, so the longest
  // blurb has room to be read. Its height is FIXED in CSS: the block sits
  // directly above the picker, and letting it grow and shrink per hero
  // would shove the five faces up and down under the cursor.
  const blurb = document.createElement('div');
  blurb.className = 'roster-card-blurb';
  container.append(blurb);

  // Said out loud rather than left to the ⏭ mark alone: a picker whose
  // choice does not take effect yet has to admit it in words, or the next
  // thirty seconds look like a bug.
  const pending = document.createElement('div');
  pending.className = 'roster-pending';
  pending.hidden = true;

  // ***** the picker *****
  const row = document.createElement('div');
  row.className = 'roster-chips';
  const chips = new Map();

  for (const key of ORDER) {
    const hero = HEROES[key];
    if (!hero) continue;

    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'roster-chip';
    chip.dataset.hero = hero.name;
    chip.title = `${hero.name}, ${hero.title}`;
    chip.innerHTML = tileSvg(hero.emoji) || '';

    chip.addEventListener('click', () => {
      // `base` is stored as '' so the value is exactly what the run option
      // takes, and so the falsy default and an explicit "the plain hero" are
      // the same string everywhere downstream.
      const value = hero.name === 'base' ? '' : hero.name;
      setChosenHero(value);
      if (onPick) onPick(value);
    });

    row.append(chip);
    chips.set(hero.name, chip);
  }
  container.append(row, pending);

  const restart = document.createElement('button');
  restart.type = 'button';
  restart.className = 'roster-now';
  restart.textContent = '↻ começar agora';
  restart.hidden = true;
  restart.addEventListener('click', () => { if (onRestart) onRestart(); });
  container.append(restart);

  // `playing` is the hero the run on screen is being played by; `queued` is
  // what the next one will use. The CARD follows the queued one — it is the
  // answer to "what did I just pick", and a card that ignored the click for
  // a whole run would read as broken.
  return function show(playing, queued) {
    const now = playing || 'base';
    const next = queued || 'base';
    const waiting = next !== now;

    for (const [key, chip] of chips) {
      chip.classList.toggle('playing', key === now && !waiting);
      chip.classList.toggle('queued', key === next && waiting);
    }

    const hero = HEROES[next] || HEROES.base;
    face.innerHTML = tileSvg(hero.emoji) || '';
    name.textContent = `${hero.name}, ${hero.title}`;
    blurb.textContent = hero.blurb;

    pending.hidden = !waiting;
    pending.textContent = waiting ? '⏭ entra na próxima run' : '';
    restart.hidden = !waiting;
  };
}
