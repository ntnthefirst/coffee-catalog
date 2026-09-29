/* Stacked bar showing the proportions of the liquid ingredients. */
import { esc } from "../core/dom.js";
import { types } from "../data/ingredients.js";
import { visual } from "./cup.js";

export function mixBar(ing, milkId) {
  const v = visual(ing, { temp: "hot", milkId, layered: true });
  const total = v.layers.reduce((s, l) => s + l.ml, 0);
  if (!total) return "";
  const segs = v.layers.map((l, i) =>
    `<i style="flex:${l.ml};background:${l.color};--i:${i}" title="${esc(types[l.t] ? types[l.t].label : l.t)}"></i>`).join("");
  return `<div class="mixbar" role="img" aria-label="Proportions">${segs}</div>`;
}
