// THE ONE SCREEN THAT ASKS FOR SOMETHING, and it asks once.
//
// Everything else in this product refuses to stop for input — the roster
// says it out loud: "a screen that demands a choice before anything moves
// teaches the opposite of what the game is". This one does exactly that, so
// it has to earn it, and it earns it by being over in one word and never
// coming back. The name is remembered; a returning visitor never sees this.
//
// WHY A NAME AT ALL. A save has to have an address before it can be looked
// up from anywhere but this browser
// (`docs/project/persistencia-e-login.md`). The name is that address, and
// nothing more — no password, no account. Today it buys one thing you can
// see: two names in one browser are two independent games.
//
// It promises NOTHING about another device yet, and the wording here is
// careful about that: the server that would make the same name open the
// same save elsewhere is the next piece of the study, not this one.

import { normalisePlayerName } from './save.js';

// Shows the gate and resolves with a normalised name — or with null when it
// was opened over a game that already has one and the player backed out.
//
// A promise rather than a callback because there are two callers and both
// want the same shape: `start()` cannot go on without an answer, and the
// header button cannot reload without one.
export function askPlayerName(container, { current = null } = {}) {
  return new Promise((resolve) => {
    container.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'player-card';

    const title = document.createElement('div');
    title.className = 'player-title';
    title.textContent = current ? 'trocar de jogador' : 'quem está jogando?';

    const form = document.createElement('form');
    form.className = 'player-form';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'player-input';
    input.placeholder = 'seu nome';
    input.maxLength = 24;          // before folding; the fold caps it shorter
    input.autocomplete = 'off';
    input.spellcheck = false;
    if (current) input.value = current;

    const go = document.createElement('button');
    go.type = 'submit';
    go.textContent = 'jogar';

    form.append(input, go);

    // What the name IS, said plainly, because a field with no explanation
    // reads as an account and this is not one.
    const note = document.createElement('div');
    note.className = 'player-note';
    note.textContent = 'um nome guarda um jogo, sem senha. outro nome começa outro jogo neste navegador.';

    // Only ever offered over a game that already has a player: on the first
    // visit there is nothing to go back to, and a gate that could be
    // dismissed would leave the page with no save to write into.
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'player-back';
    back.textContent = 'voltar';
    back.hidden = !current;

    card.append(title, form, note, back);
    container.append(card);
    container.hidden = false;

    const close = (value) => {
      container.hidden = true;
      container.innerHTML = '';
      resolve(value);
    };

    // The refusal is the placeholder going red rather than a line of text
    // appearing: the form is three elements tall and a fourth that shows up
    // only when you get it wrong would move the button under the cursor.
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const clean = normalisePlayerName(input.value);
      if (!clean) {
        input.value = '';
        input.classList.add('refused');
        input.focus();
        return;
      }
      close(clean);
    });

    input.addEventListener('input', () => input.classList.remove('refused'));
    back.addEventListener('click', () => close(null));

    input.focus();
    input.select();
  });
}
