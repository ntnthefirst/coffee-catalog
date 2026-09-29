/* The customiser's data model: state -> ingredients, naming, URL encoding. */
import { recipes } from "../data/recipes.js";
import { milks, syrups, toppings } from "../data/ingredients.js";
import { CONSTS } from "../data/config.js";
import { clamp } from "../core/dom.js";
import { MILK, SYRUP, TOPPING } from "./lookup.js";
import { sumType, iceOf } from "./stats.js";
import { nameDrink } from "./naming.js";

import { BUILDER } from "../data/config.js";
export const ICE_LEVELS = BUILDER.iceLevels;
export const SHOT_ML = BUILDER.shotMl;
export const LIMITS = BUILDER.limits;

export function defaultBuilder() {
  return {
    temp: "hot", shots: 2, style: "normal", decaf: false,
    cold: 0, milk: 170, foam: 30, water: 0, ice: "normal",
    milkId: "whole", order: "e", fl: [], tops: [],
  };
}

/** builder state -> ingredient list (bottom of the glass to the top) */
export function bIngredients(b) {
  const hot = b.temp === "hot";
  const flavours = b.fl.filter((f) => f.id && f.p > 0).map((f) => ({ t: SYRUP[f.id].kind === "sauce" ? "sauce" : "syrup", id: f.id, ml: f.p * CONSTS.pumpMl }));
  const esp = { t: "espresso", ml: Math.round(b.shots * SHOT_ML[b.style]) };
  const milk = b.milk > 0 ? { t: "milk", ml: b.milk } : null;
  const splash = hot && b.cold > 0 ? { t: "milk", ml: b.cold, raw: true } : null;
  const foam = b.foam > 0 ? { t: hot ? "foam" : "coldfoam", ml: b.foam } : null;
  const water = b.water > 0 ? { t: "water", ml: b.water } : null;
  const ice = !hot && ICE_LEVELS[b.ice] > 0 ? { t: "ice", g: ICE_LEVELS[b.ice] } : null;

  const ing = [...flavours];
  const add = (...items) => items.forEach((x) => x && ing.push(x));
  if (b.order === "m") add(ice, splash, milk, water, esp, foam);
  else add(esp, water, ice, splash, milk, foam);
  b.tops.forEach((k) => ing.push({ t: "top", kind: k }));
  return ing;
}

export const bCtx = (b) => ({
  temp: b.temp, milkId: b.milkId, layered: b.order === "m",
  blend: b.order === "e" && !b.milk && !b.foam, shots: b.shots, seed: "builder",
});

/* ---------- naming: how close is this drink to a catalog recipe? ---------- */
function profile(ing) {
  const p = { esp: 0, milk: 0, foam: 0, water: 0, flav: new Set() };
  ing.forEach((i) => {
    if (i.t === "espresso") p.esp += i.ml;
    else if (i.t === "milk") p.milk += i.ml;
    else if (i.t === "foam" || i.t === "coldfoam") p.foam += i.ml;
    else if (i.t === "water") p.water += i.ml;
    else if ((i.t === "syrup" && i.id !== "sugar") || i.t === "sauce") p.flav.add(i.id);
    else if (i.t === "condensed") p.flav.add("condensed");
    else if (i.t === "chai") p.flav.add("chai");
  });
  return p;
}
const PROFILES = Object.fromEntries(recipes.map((r) => [r.id, profile(r.ing)]));

function score(a, r, withFlavour) {
  const p = PROFILES[r.id];
  let l1 = 0, tot = 0;
  ["esp", "milk", "foam", "water"].forEach((k) => { l1 += Math.abs(a[k] - p[k]); tot += a[k] + p[k]; });
  let s = tot ? 1 - l1 / tot : 0;
  if (withFlavour) {
    const inter = [...a.flav].filter((x) => p.flav.has(x)).length;
    const union = new Set([...a.flav, ...p.flav]).size;
    if (union) { const j = inter / union; s += 0.12 * j - 0.08 * (1 - j); }
  }
  return clamp(s, 0, 1);
}

/** -> { ing, name, blurb, ranked: [{r, s}] } */
export function analyse(b) {
  const ing = bIngredients(b);
  const a = profile(ing);
  const penalty = (r) => (r.temp === b.temp ? 0 : 0.25);
  const ranked = recipes.map((r) => ({ r, s: clamp(score(a, r, true) - penalty(r), 0, 1) })).sort((x, y) => y.s - x.s);
  const { name, blurb } = nameDrink(b);
  return { ing, name, blurb, ranked: ranked.slice(0, 3) };
}

/* ---------- URL sharing ---------- */
export function encodeBuilder(b) {
  const p = new URLSearchParams();
  p.set("t", b.temp); p.set("s", b.shots); p.set("st", b.style);
  if (b.decaf) p.set("d", 1);
  p.set("m", b.milk); p.set("f", b.foam);
  if (b.cold) p.set("c", b.cold);
  if (b.water) p.set("w", b.water);
  p.set("i", b.ice); p.set("mk", b.milkId); p.set("o", b.order);
  const fl = b.fl.filter((f) => f.id && f.p).map((f) => `${f.id}:${f.p}`).join(",");
  if (fl) p.set("fl", fl);
  if (b.tops.length) p.set("tp", b.tops.join(","));
  return p.toString();
}

export function decodeBuilder(qs) {
  const p = new URLSearchParams(qs), b = defaultBuilder();
  const pick = (v, list, d) => (list.includes(v) ? v : d);
  const step10 = (key, max) => clamp(Math.round((+p.get(key) || 0) / 10) * 10, 0, max);
  b.temp = pick(p.get("t"), ["hot", "iced"], b.temp);
  b.shots = p.get("s") === "1" ? 1 : 2;
  b.style = pick(p.get("st"), Object.keys(SHOT_ML), "normal");
  b.decaf = p.get("d") === "1";
  if (p.has("m")) b.milk = step10("m", LIMITS.milk);
  if (p.has("f")) b.foam = step10("f", LIMITS.foam);
  b.cold = step10("c", LIMITS.cold);
  b.water = step10("w", LIMITS.water);
  b.ice = pick(p.get("i"), Object.keys(ICE_LEVELS), "normal");
  b.milkId = MILK[p.get("mk")] ? p.get("mk") : "whole";
  b.order = pick(p.get("o"), ["e", "m"], "e");
  b.fl = (p.get("fl") || "").split(",").filter(Boolean).slice(0, 2)
    .map((x) => x.split(":")).filter(([id]) => SYRUP[id]).map(([id, n]) => ({ id, p: clamp(+n || 1, 1, 4) }));
  b.tops = (p.get("tp") || "").split(",").filter((t) => TOPPING[t]);
  return b;
}

/* ---------- start from a catalog recipe / random ---------- */
export function builderFromRecipe(r) {
  const b = defaultBuilder();
  b.temp = r.temp;
  b.shots = r.shots >= 1.5 ? 2 : 1;
  const per = sumType(r.ing, "espresso") / b.shots;
  b.style = per < CONSTS.shotMl * 0.85 ? "ristretto" : per > CONSTS.shotMl * 1.5 ? "lungo" : "normal";
  b.milk = sumType(r.ing, "milk");
  b.foam = sumType(r.ing, "foam") + sumType(r.ing, "coldfoam");
  b.water = sumType(r.ing, "water");
  b.milkId = r.milk || "whole";
  const ice = iceOf(r.ing);
  b.ice = ice ? (ice <= 100 ? "light" : ice >= 200 ? "lots" : "normal") : (r.temp === "iced" ? "none" : "normal");
  const ei = r.ing.findIndex((i) => i.t === "espresso"), mi = r.ing.findIndex((i) => i.t === "milk");
  b.order = r.layered && ((mi >= 0 && mi < ei) || r.temp === "iced") ? "m" : "e";
  r.ing.forEach((i) => {
    if ((i.t === "syrup" || i.t === "sauce" || i.t === "condensed") && b.fl.length < 2) {
      b.fl.push({ id: i.t === "condensed" ? "condensed" : i.id, p: clamp(Math.round(i.ml / CONSTS.pumpMl), 1, 4) });
    }
  });
  b.tops = r.ing.filter((i) => i.t === "top").map((i) => i.kind);
  const dropped = r.ing.filter((i) => ["tonic", "oj", "lemonade", "lime", "soda", "chai", "cremafoam", "icecream"].includes(i.t));
  return { b, dropped };
}

export function randomBuilder() {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const b = defaultBuilder();
  b.temp = Math.random() < 0.4 ? "iced" : "hot";
  b.shots = pick([1, 2, 2]); b.style = pick(["normal", "normal", "ristretto", "lungo"]);
  b.milk = pick([0, 60, 110, 150, 170, 200]); b.foam = b.milk ? pick([0, 20, 30, 50]) : 0;
  b.water = b.milk ? 0 : pick([0, 100, 130]);
  b.milkId = pick(milks.map((m) => m.id));
  b.order = pick(["e", "m"]); b.ice = pick(["light", "normal", "normal", "lots"]);
  const pool = syrups.filter((s) => s.id !== "sugar");
  b.fl.push({ id: pick(pool).id, p: pick([1, 2, 2, 3]) });
  if (Math.random() < 0.3) b.fl.push({ id: pick(pool).id, p: 1 });
  b.tops = Math.random() < 0.5 ? [pick(toppings).id] : [];
  return b;
}
