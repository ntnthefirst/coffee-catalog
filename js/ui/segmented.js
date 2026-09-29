/* Segmented control with a sliding indicator. */
import { esc } from "../core/dom.js";
import { icon } from "../render/icons.js";

/** options: [{ v, label?, icon?, color?, title? }] */
export function segHTML(name, options, extraClass = "") {
  const buttons = options.map((o) =>
    `<button type="button" class="seg__btn" data-seg="${name}" data-v="${o.v}" ${o.color ? `style="--c:${o.color}"` : ""} aria-pressed="false" ${o.title ? `title="${esc(o.title)}" aria-label="${esc(o.title)}"` : ""}>` +
    `${o.icon ? icon(o.icon) : ""}${o.label ? `<span>${esc(o.label)}</span>` : ""}</button>`).join("");
  return `<div class="seg ${extraClass}" data-seg-group="${name}" style="--n:${options.length};--idx:0"><span class="seg__ind"></span>${buttons}</div>`;
}

/** highlight the option whose data-v equals value and slide the indicator */
export function setSeg(root, name, value) {
  const group = root.querySelector(`[data-seg-group="${name}"]`);
  if (!group) return;
  const buttons = [...group.querySelectorAll(".seg__btn")];
  const idx = Math.max(0, buttons.findIndex((b) => b.dataset.v === String(value)));
  group.style.setProperty("--idx", idx);
  buttons.forEach((b, i) => { b.classList.toggle("is-on", i === idx); b.setAttribute("aria-pressed", String(i === idx)); });
}
