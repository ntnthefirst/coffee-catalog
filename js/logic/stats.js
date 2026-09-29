/* Volume, caffeine and intensity of a drink. */
import { types } from "../data/ingredients.js";
import { recipes } from "../data/recipes.js";
import { CONSTS } from "../data/config.js";

export const LEVELS = ["Very mild", "Mild", "Medium", "Strong", "Intense"];

export const sumType = (ing, t) => ing.filter((i) => i.t === t).reduce((s, i) => s + (i.ml || 0), 0);
export const sumField = (ing, t, key) => ing.filter((i) => i.t === t).reduce((s, i) => s + (i[key] || 0), 0);
export const iceOf = (ing) => sumField(ing, "ice", "g");
export const scoopOf = (ing) => sumField(ing, "icecream", "g");

export const liquidTotal = (ing) =>
  ing.reduce((s, i) => s + ((types[i.t] && types[i.t].liquid && i.ml) ? i.ml : 0), 0);

export const usesMilk = (ing) => ing.some((i) => i.t === "milk" || i.t === "foam" || i.t === "coldfoam");

/** volume (ml), caffeine (mg), intensity per 100 ml and a 1-5 level */
export function statsOf(ing, shots, decaf = false) {
  const volume = liquidTotal(ing) + scoopOf(ing) * 0.9;
  const caffeine = Math.round(shots * (decaf ? CONSTS.decafPerShot : CONSTS.caffeinePerShot));
  const per100 = volume ? (caffeine / volume) * 100 : 0;
  const level = decaf ? 1 : per100 >= 150 ? 5 : per100 >= 90 ? 4 : per100 >= 55 ? 3 : per100 >= 35 ? 2 : 1;
  return { volume, caffeine, per100, level, levelLabel: LEVELS[level - 1] };
}

const cache = {};
export const recipeStats = (r) => cache[r.id] || (cache[r.id] = statsOf(r.ing, r.shots));

/** category groups a recipe belongs to (used by the filter strip) */
export function groupsOf(r) {
  const has = (fn) => r.ing.some(fn);
  const dairyish = has((i) => i.t === "milk" || i.t === "foam" || i.t === "coldfoam" || i.t === "condensed" || (i.t === "sauce" && i.id === "condensed"));
  const g = new Set();
  if (r.tags.includes("classic")) g.add("classic");
  if (!dairyish && !has((i) => i.t === "icecream")) g.add("black");
  if (dairyish) g.add("milk");
  if (has((i) => (i.t === "syrup" && i.id !== "sugar") || i.t === "sauce" || i.t === "chai")) g.add("flavoured");
  if (r.tags.includes("spicy")) g.add("spicy");
  if (r.tags.includes("dessert")) g.add("dessert");
  return g;
}

/** background tone of a recipe tile: a CSS colour variable */
export function toneOf(r) {
  const g = groupsOf(r);
  if (r.temp === "iced") return "var(--purple-t2)";
  if (g.has("spicy")) return "var(--crimson-t2)";
  if (g.has("dessert")) return "var(--pink-t2)";
  if (g.has("flavoured")) return "var(--pink-t)";
  if (g.has("milk")) return "var(--purple-t)";
  return "var(--pink-t)";
}

export const allStats = () => recipes.map((r) => ({ r, s: recipeStats(r) }));
