/* Short "how to make it" steps for the Dedica. Each step = { icon, text }. */
import { types } from "../data/ingredients.js";
import { CONSTS } from "../data/config.js";
import { ml, grams, round10 } from "../core/dom.js";
import { MILK, SYRUP, TOPPING } from "./lookup.js";
import { sumType } from "./stats.js";
import { garnishLabel } from "./describe.js";

/** ctx = { temp, milkId, shots, layered, blend } */
export function makeSteps(ing, ctx) {
  const hot = ctx.temp === "hot";
  const milk = MILK[ctx.milkId];
  const milkName = milk.label.toLowerCase();
  const shots = ctx.shots;
  const steps = [];
  const step = (icon, text) => steps.push({ icon, text });

  const milkMl = ing.filter((i) => i.t === "milk" && !i.raw).reduce((s, i) => s + i.ml, 0);
  const foamMl = sumType(ing, "foam") + sumType(ing, "coldfoam");
  const steamTotal = milkMl + foamMl;
  let steamed = false;

  step(hot ? "flame" : "snowflake", hot ? "Warm the cup on the tray." : "Chill the glass with ice water.");

  let k = 0;
  while (k < ing.length) {
    const i = ing[k];

    if (i.t === "syrup" || i.t === "sauce") {
      const group = [];
      while (k < ing.length && (ing[k].t === "syrup" || ing[k].t === "sauce")) group.push(ing[k++]);
      const list = group.map((g) => `${ml(g.ml)} ${SYRUP[g.id].label.toLowerCase()}`).join(" + ");
      step("droplet", `${list} into the ${hot ? "cup" : "glass"}.`);
      continue;
    }

    switch (i.t) {
      case "ice": step("snowflake", `${grams(i.g)} ice.`); break;
      case "icecream": step("ice-cream-2", `Scoop ${grams(i.g)} vanilla ice cream.`); break;
      case "espresso": {
        const perShot = shots ? i.ml / shots : i.ml;
        const basket = shots <= 1 ? `single basket, ${CONSTS.singleDoseG} g` : `double basket, ${CONSTS.doubleDoseG} g`;
        const before = ing.slice(0, k).some((x) => ["milk", "ice", "tonic", "oj", "lemonade"].includes(x.t));
        let text = `Pull ${shots <= 1 ? "a single" : "a double"}: ${basket}, stop at ~${ml(i.ml)}.`;
        if (perShot < CONSTS.shotMl * 0.85) text = `Pull a short shot: ${basket}, stop at ~${ml(i.ml)}.`;
        if (before) text += " Pour over a spoon.";
        step("coffee", text);
        break;
      }
      case "cremafoam": step("wind", "Shake with ice for 15 s, strain over fresh ice."); break;
      case "water": step("droplets", hot ? `${ml(i.ml)} hot water (~90 °C).` : `${ml(i.ml)} cold water.`); break;
      case "milk":
      case "foam":
      case "coldfoam": {
        if (i.raw) { step("milk", `${ml(i.ml)} cold ${milkName}, straight from the fridge.`); break; }
        if (hot) {
          if (!steamed) {
            steamed = true;
            const cold = round10(steamTotal / (1 + 0.1 + 0.4 * (foamMl / (steamTotal || 1))));
            const ratio = foamMl / (steamTotal || 1);
            const secs = ratio < 0.15 ? "2–3" : ratio < 0.3 ? "3–5" : "8–10";
            step("wind", milk.dairy
              ? `Steam ~${ml(cold)} cold ${milkName} to 60–65 °C. Stretch ${secs} s.`
              : `Steam ~${ml(cold)} ${milkName} to 55–60 °C. Stretch 1–2 s.`);
          }
          if (i.t === "milk") step("milk", `Pour ${ml(i.ml)} steamed milk${foamMl && ing.some((x) => x.t === "foam") ? ", hold the foam back" : ""}.`);
          else step("cloud", `Spoon on ${ml(i.ml)} foam.`);
        } else if (i.t === "milk") {
          step("milk", `Pour ${ml(i.ml)} cold ${milkName}.`);
        } else {
          step("cloud", `Froth ~${ml(i.ml / 1.6)} cold ${milkName} by hand, spoon on top.`);
        }
        break;
      }
      case "top": case "garnish": break;
      default: step("droplet", `${ml(i.ml)} ${types[i.t].label.toLowerCase()}.`);
    }
    k++;
  }

  const tops = ing.filter((i) => i.t === "top").map((i) => TOPPING[i.kind].label.toLowerCase());
  if (tops.length) step("sparkles", `Finish with ${tops.join(", ")}.`);
  const gars = ing.filter((i) => i.t === "garnish").map((i) => garnishLabel(i.kind).toLowerCase());
  if (gars.length) step("leaf", `Garnish: ${gars.join(", ")}.`);
  step("check", ctx.layered ? "Serve. Don’t stir." : "Stir gently. Enjoy.");
  return steps;
}
