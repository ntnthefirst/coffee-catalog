/* Small DOM + number helpers shared by every module. */

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const round10 = (n) => Math.max(10, Math.round(n / 10) * 10);
export const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));

/** Volumes are always millilitres, weights always grams. */
export const ml = (n) => `${Math.round(n)} ml`;
export const grams = (n) => `${Math.round(n)} g`;

/** Restart a CSS animation class on an element (used for "pop" feedback). */
export function flash(el, cls = "is-flash") {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

/** Event delegation: on(document, "click", "[data-x]", (event, matchedEl) => ...) */
export function on(root, type, selector, handler) {
  root.addEventListener(type, (event) => {
    const match = event.target.closest(selector);
    if (match && root.contains(match)) handler(event, match);
  });
}
