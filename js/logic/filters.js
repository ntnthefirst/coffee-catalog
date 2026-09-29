/* Filter, search and sort definitions for the catalog + the filtering itself. */
import { SYRUP } from "./lookup.js";
import { types } from "../data/ingredients.js";
import { recipes } from "../data/recipes.js";
import { groupsOf, recipeStats } from "./stats.js";

export const TEMPS = [
  { id: "hot",  label: "Hot",  icon: "flame",     color: "var(--crimson)" },
  { id: "iced", label: "Iced", icon: "snowflake", color: "var(--purple)" },
];

export const GROUPS = [
  { id: "classic",   label: "Classics", icon: "star",     color: "var(--purple)" },
  { id: "black",     label: "Black",    icon: "coffee",   color: "var(--ink)" },
  { id: "milk",      label: "Milk",     icon: "milk",     color: "var(--pink)" },
  { id: "flavoured", label: "Flavour",  icon: "candy",    color: "var(--purple)" },
  { id: "spicy",     label: "Spicy",    icon: "pepper",   color: "var(--crimson)" },
  { id: "dessert",   label: "Dessert",  icon: "ice-cream-2", color: "var(--pink)" },
  { id: "fav",       label: "Saved",    icon: "heart",    color: "var(--crimson)" },
];

export const SORTS = [
  { id: "featured", label: "Featured",      icon: "layout-grid" },
  { id: "name",     label: "A – Z",         icon: "arrows-sort" },
  { id: "strength", label: "Most intense",  icon: "flame" },
  { id: "caffeine", label: "Most caffeine", icon: "bolt" },
  { id: "mild",     label: "Mildest",       icon: "leaf" },
  { id: "size",     label: "Smallest",      icon: "sort-ascending" },
  { id: "sizeDesc", label: "Largest",       icon: "sort-descending" },
];

const s = (r) => recipeStats(r);
const COMPARE = {
  featured: null,
  name: (a, b) => a.name.localeCompare(b.name),
  strength: (a, b) => s(b).per100 - s(a).per100 || s(b).caffeine - s(a).caffeine,
  caffeine: (a, b) => s(b).caffeine - s(a).caffeine || s(b).per100 - s(a).per100,
  mild: (a, b) => s(a).per100 - s(b).per100,
  size: (a, b) => s(a).volume - s(b).volume,
  sizeDesc: (a, b) => s(b).volume - s(a).volume,
};

function searchText(r) {
  const ingredients = r.ing.map((i) => (i.id && SYRUP[i.id] ? SYRUP[i.id].label : i.kind || (types[i.t] ? types[i.t].label : ""))).join(" ");
  return [r.name, r.alt, r.desc, r.origin || "", r.tags.join(" "), ingredients].join(" ").toLowerCase();
}

/** filter = { temps:Set, group:string|null, q:string, sort:string }, favs = Set of ids */
export function filterRecipes(filter, favs) {
  const q = filter.q.trim().toLowerCase();
  const list = recipes.filter((r) => {
    if (filter.temps.size && !filter.temps.has(r.temp)) return false;
    if (filter.group === "fav") { if (!favs.has(r.id)) return false; }
    else if (filter.group && !groupsOf(r).has(filter.group)) return false;
    if (q && !q.split(/\s+/).every((w) => searchText(r).includes(w))) return false;
    return true;
  });
  const cmp = COMPARE[filter.sort];
  return cmp ? list.slice().sort(cmp) : list;
}
