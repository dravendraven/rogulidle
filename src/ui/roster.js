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

import { HEROES, heroLabel } from '../sim/heroes.js';
import { tileSvg } from './tiles.js';
import { HERO_GATE, isEarned, lockedReason } from './achievements.js';

const KEY = 'rogulidle-hero';

// THE GATE. Choosing a hero is earned, not given: until `butcher` is down
// the cast is visible but shut, which is the first rung of the ladder in
// `docs/project/candidates.md` (U11). Visible-but-shut rather than hidden on
// purpose — a locked face with a reason under it is the thing that tells a
// spectator there is something to play FOR, and a picker that grew from one
// chip to five overnight would just look like a bug.
//
// Only the PLAYER'S pick is gated, never `dial-overrides.json`'s `who`. The
// overrides file is the factory setting every visitor gets and it has to
// stay able to ship any hero; today it ships none, so a clean browser lands
// on the base hero through the ordinary default path rather than through a
// second rule that says so.
export function heroesUnlocked() {
  return isEarned(HERO_GATE);
}

export function heroLockReason() {
  return lockedReason(HERO_GATE);
}

// The whole line, in ONE place, because two call sites print it — the card's
// blurb slot and the chip's tooltip — and a wording that differs between
// them would read as two different rules.
//
// The word "bloqueado" is here and NOT in the achievement's own `locked`
// sentence: that sentence is shared with the achievements strip
// (src/ui/render.js), where the row is already visibly unearned and saying
// "blocked" under it would be describing the row rather than the gate.
function lockLine() {
  return `🔒bloqueado - ${heroLockReason()}`;
}

// `base` is stored as '' — see setChosenHero's callers — so both spellings
// of the ordinary hero pass the gate.
function allowed(name) {
  return heroesUnlocked() || name === '' || name === 'base';
}

// null means NEVER CHOSE, which is not the same as chose the ordinary hero:
// unset falls through to whatever `dial-overrides.json` ships as the default,
// and '' is a visitor overriding that back to the plain hero. `getItem`
// returning null for an absent key gives us the distinction for free.
//
// A pick the gate no longer allows reads as '' — the plain hero, explicitly.
// That is the one case that matters for anyone who was here before the gate
// existed: they picked Vito when the picker was open, and they go back to
// base until the pig falls. The stored value is NOT erased, so the day it
// does fall their old pick is simply theirs again.
export function getChosenHero() {
  const stored = read();
  return stored !== null && !allowed(stored) ? '' : stored;
}

function read() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    // Private browsing or a full quota — the picker simply stops remembering
    // rather than breaking the page, same as score.js.
    return null;
  }
}

// Back to NEVER CHOSE, which is not the same as choosing the plain hero:
// the key is removed rather than set to '', so the next load falls through
// to `dial-overrides.json`'s default exactly as a fresh browser would. The
// reset button is the only caller — a stale pick surviving a reset would
// re-select itself the moment the gate is earned again, which is the last
// thing the word "reset" should mean.
export function clearChosenHero() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // As below.
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
// back to without hunting. Exported so any other list of the cast — the
// highscore table's rows, for one — uses the same order instead of growing
// a second copy that could drift from it.
export const ORDER = ['base', 'vito', 'pawa', 'papazito', 'ricardo'];

export function buildRoster(container, { onPick, onRestart, onPreview } = {}) {
  // WHO THE CARD IS SHOWING, when that is not who plays next. Only ever a
  // locked hero: picking an open one clears it. It survives across runs on
  // purpose — a spectator reading about a hero should not have the card
  // yanked away because a run ended — and the lock line under it is what
  // stops that reading as "this is who is playing".
  let preview = null;
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
    chip.title = heroLabel(hero);
    chip.innerHTML = tileSvg(hero.emoji) || '';

    chip.addEventListener('click', () => {
      // A SHUT GATE NOW BROWSES INSTEAD OF REFUSING. Clicking a locked hero
      // opens his card — face, name — and the blurb slot says why he cannot
      // be had yet. Nothing is stored and nothing is queued, so the gate is
      // exactly as shut as it was; what changed is that a spectator can read
      // what is behind it, which is the entire reason a locked cast is shown
      // rather than hidden.
      //
      // Enforced HERE and not only on `disabled`: the flag is a rendering,
      // this is the rule, and the rule is now "you may look".
      if (!allowed(hero.name)) {
        preview = hero.name;
        if (onPreview) onPreview();
        return;
      }
      // Picking for real ends the browsing — the card has to go back to
      // answering "who plays next" the moment that question has an answer.
      preview = null;
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

  // The standalone lock line used to sit here, under the row. It went: the
  // card's own blurb slot already says why the cast is shut whenever a
  // locked face is being read, and the line repeated it under the ordinary
  // hero where nothing was being asked. One fact, one place.
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

    // Re-read on every call rather than once at build: the Butcher can fall
    // during the run being watched, and `show` is called again as the next
    // one is built — so the cast opens by itself, with no reload.
    const open = heroesUnlocked();
    // The gate opening ends any browsing: what was a locked face is now a
    // real choice, and leaving the card in preview would show a hero the
    // player could have picked but has not.
    if (open) preview = null;

    // The card shows the PREVIEW when there is one, otherwise who plays
    // next. `showing` is the hero on the card; `next` is still the one the
    // run will use, and the two only differ while browsing a locked hero.
    const showing = preview || next;
    const browsing = Boolean(preview);

    for (const [key, chip] of chips) {
      const shut = !allowed(key);
      // NOT `disabled` any more — a locked chip is clickable, it just
      // cannot be chosen. Disabling it would take the click that opens the
      // card, which is the whole change.
      chip.classList.toggle('locked', shut);
      chip.title = shut
        ? `${heroLabel(HEROES[key])} — ${lockLine()}`
        : heroLabel(HEROES[key]);
      // `playing` and `queued` follow the RUN, never the card. That is what
      // keeps the ordinary hero lit while a locked face is being read: he
      // is still the one playing, and the lit chip is the only thing on
      // screen that says so.
      chip.classList.toggle('playing', key === now && !waiting);
      chip.classList.toggle('queued', key === next && waiting);
      chip.classList.toggle('reading', browsing && key === showing);
    }

    const hero = HEROES[showing] || HEROES.base;
    face.innerHTML = tileSvg(hero.emoji) || '';
    name.textContent = heroLabel(hero);

    // THE BLURB SLOT CARRIES THE LOCK. A locked hero's card says why he
    // cannot be had instead of what he does — the reason belongs where the
    // eye already is, and describing a hero the player cannot use reads as
    // an offer.
    const shutHero = !allowed(showing);
    blurb.textContent = shutHero ? lockLine() : hero.blurb;
    blurb.classList.toggle('locked', shutHero);

    // Nothing is queued and nothing can be restarted while browsing: there
    // is no pick behind either button, so offering them would promise a
    // change that will not happen.
    pending.hidden = !waiting || browsing;
    pending.textContent = (waiting && !browsing) ? '⏭ entra na próxima run' : '';
    restart.hidden = !waiting || browsing;
  };
}
