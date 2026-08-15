// The one thing the player tells the shop: in what order the coins get
// spent when the timer runs out and nobody clicked (src/ui/shop.js).
//
// WHY THIS IS NOT A DIAL. Every control in dials.js is a number with a
// range — a slider, a banded slider, a checkbox — and `read()` walks them
// all expecting `input.value` to BE the value. An order is a permutation:
// no minimum, no maximum, nothing between two settings. Putting it in that
// panel would mean a fifth shape in a builder that already branches four
// ways, plus special cases in `read()`, in `resolvedDefaults()` and in the
// dev-mode save button, for one control.
//
// So it follows roster.js instead, which is the precedent for exactly this:
// a control that is not a dial, living in the same column, owning its own
// store. It borrows the dials' CSS classes on purpose — it should read as
// part of that panel, because that is what it is.
//
// It hides and shows with the Lab (spectator.js's `show`), but sits OUTSIDE
// the scrolling drawer: in dev mode the drawer holds thirty rows of map
// dials, and a control buried under all of them is one nobody finds.

import { SHOP_ITEMS, getShopOrder, setShopOrder } from './shop.js';
import { tileSvg } from './tiles.js';

const entryOf = (name) => SHOP_ITEMS.find((e) => e.item.name === name);

// Fills `container` and returns nothing — the store IS the state, and the
// only reader (showShop) asks it fresh every time the shop opens. There is
// no value to hand back and nothing to keep in sync.
//
// `onChange` exists for the page, not for the shop: it lets index.html
// repaint anything that shows the order elsewhere. Nothing uses it today.
export function buildShopOrder(container, { onChange } = {}) {
  if (!container) return;
  container.innerHTML = '';

  const section = document.createElement('div');
  section.className = 'dial-section';
  container.append(section);

  const heading = document.createElement('h2');
  heading.textContent = 'Loja';
  section.append(heading);

  // Said out loud because the timing is the one thing a player cannot see:
  // the shop is between runs, so a change made now lands at the end of the
  // run on screen rather than "sometime later".
  const caption = document.createElement('div');
  caption.className = 'shop-order-caption';
  caption.textContent = 'em que ordem as moedas são gastas se ninguém clicar — '
    + 'vale já para a loja no fim desta run';
  section.append(caption);

  const list = document.createElement('div');
  list.className = 'shop-order-list';
  section.append(list);

  const effect = document.createElement('div');
  effect.className = 'dial-effect';
  section.append(effect);

  let order = getShopOrder();

  const move = (from, to) => {
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[from], next[to]] = [next[to], next[from]];
    order = setShopOrder(next);
    draw();
    if (onChange) onChange(order);
  };

  function draw() {
    list.innerHTML = '';
    order.forEach((name, index) => {
      const entry = entryOf(name);
      if (!entry) return;

      const row = document.createElement('div');
      row.className = 'shop-order-row';

      const rank = document.createElement('span');
      rank.className = 'shop-order-rank';
      rank.textContent = String(index + 1);

      const icon = document.createElement('span');
      icon.className = 'shop-order-icon';
      icon.innerHTML = tileSvg(entry.item.emoji) || '';

      const label = document.createElement('span');
      label.className = 'shop-order-name';
      label.textContent = entry.item.name;

      const price = document.createElement('span');
      price.className = 'shop-order-price';
      price.textContent = `${entry.price}🪙`;

      // Two buttons rather than drag-and-drop. Drag is nicer with a mouse
      // and worse with everything else — this page already caps touch
      // targets at 44px for phones (style.css), and a four-row list is two
      // presses from any order to any other.
      const up = document.createElement('button');
      up.type = 'button';
      up.className = 'shop-order-move';
      up.textContent = '▲';
      up.disabled = index === 0;
      up.setAttribute('aria-label', `subir ${entry.item.name}`);
      up.addEventListener('click', () => move(index, index - 1));

      const down = document.createElement('button');
      down.type = 'button';
      down.className = 'shop-order-move';
      down.textContent = '▼';
      down.disabled = index === order.length - 1;
      down.setAttribute('aria-label', `descer ${entry.item.name}`);
      down.addEventListener('click', () => move(index, index + 1));

      row.append(rank, icon, label, price, up, down);
      list.append(row);
    });

    // One live line, the same shape every dial carries: what this setting is
    // doing NOW, not what it could do. The two ends are the whole of it — the
    // top is what the balance is saved for, the bottom is where the change
    // goes — and both prices are read off the table rather than written here,
    // so the sentence follows a price change on its own.
    const first = entryOf(order[0]);
    const last = entryOf(order[order.length - 1]);
    effect.textContent = (first && last)
      ? `gasta primeiro em ${first.item.name} · ${first.price}🪙, e desce a lista `
        + `até o troco virar ${last.item.name} · ${last.price}🪙`
      : '';
  }

  draw();
}
