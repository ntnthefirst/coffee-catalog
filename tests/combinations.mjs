/* Brute-force check of the customiser: every combination must fit the cup,
   get a real name, and produce ingredients, steps and a drawing without errors.
   Run with:  npm test */
import { defaultBuilder, bIngredients, bCtx, analyse } from "../js/logic/builder-model.js";
import { normalize, capacity, fixedMl, usedMl, maxFor } from "../js/logic/capacity.js";
import { makeSteps } from "../js/logic/steps.js";
import { ingredientRows } from "../js/logic/describe.js";
import { statsOf } from "../js/logic/stats.js";
import { visual, cupSVG } from "../js/render/cup.js";
import { BUILDER } from "../js/data/config.js";
import { milks, syrups, toppings } from "../js/data/ingredients.js";

const problems = [];
const names = new Map();
let count = 0;

const flavourSets = [[], [{ id: "vanilla", p: 2 }], [{ id: "chocolate", p: 2 }], [{ id: "white-chocolate", p: 3 }],
  [{ id: "condensed", p: 3 }], [{ id: "caramel", p: 2 }, { id: "hazelnut", p: 1 }], [{ id: "sugar", p: 1 }],
  [{ id: "pumpkin", p: 3 }], [{ id: "chocolate", p: 2 }, { id: "peppermint", p: 1 }], [{ id: "honey", p: 2 }, { id: "cinnamon", p: 1 }]];
const topSets = [[], ["whipped"], ["cocoa"], ["cayenne"], ["caramel", "seasalt"], ["whipped", "chocolate", "cinnamon"]];
const pick = (o, i) => o[i % o.length];

for (const temp of ["hot", "iced"])
  for (const shots of [1, 2])
    for (const style of ["ristretto", "normal", "lungo"])
      for (const milk of [0, 40, 110, 170, 250, 300])
        for (const foam of [0, 20, 50, 100, 150])
          for (const cold of [0, 30, 100])
            for (const water of [0, 60, 130, 200])
              for (const order of ["e", "m"])
                for (const ice of ["none", "normal", "lots"]) {
                  const n = count++;
                  const b = Object.assign(defaultBuilder(), {
                    temp, shots, style, milk, foam, cold, water, order, ice,
                    milkId: pick(milks, n).id, fl: pick(flavourSets, n).map((f) => ({ ...f })), tops: pick(topSets, n >> 1).slice(),
                    decaf: n % 7 === 0,
                  });
                  const tag = JSON.stringify(b);
                  try {
                    normalize(b);
                    const cap = capacity(b) - fixedMl(b);
                    if (usedMl(b) > cap) problems.push(`over capacity ${usedMl(b)}>${cap}: ${tag}`);
                    if (b.cold + b.milk + b.foam + BUILDER.dilution * b.water > BUILDER.steamMax) problems.push(`steam+water too much: ${tag}`);
                    for (const k of ["cold", "milk", "foam", "water"]) if (b[k] > maxFor(k, b) + 0.001 && b[k] > 0) problems.push(`${k}=${b[k]} above its max ${maxFor(k, b)}: ${tag}`);

                    const info = analyse(b);
                    if (!info.name || /undefined|Iced Iced|\s{2}|Custom/.test(info.name)) problems.push(`bad name "${info.name}": ${tag}`);
                    if (!info.blurb) problems.push(`no blurb: ${tag}`);
                    if (!info.ing.some((i) => i.t === "espresso")) problems.push(`no espresso: ${tag}`);
                    const ctx = bCtx(b);
                    if (!makeSteps(info.ing, ctx).length) problems.push(`no steps: ${tag}`);
                    if (!ingredientRows(info.ing, ctx).length) problems.push(`no rows: ${tag}`);
                    const st = statsOf(info.ing, b.shots, b.decaf);
                    if (!(st.volume > 0)) problems.push(`no volume: ${tag}`);
                    const svg = cupSVG(visual(info.ing, ctx), { label: info.name });
                    if (!svg.startsWith("<svg")) problems.push(`bad svg: ${tag}`);
                    names.set(info.name, (names.get(info.name) || 0) + 1);
                  } catch (e) {
                    problems.push(`THROW ${e.message}: ${tag}`);
                  }
                }

// every catalog recipe must load into the builder and stay a valid drink
import { recipes } from "../js/data/recipes.js";
import { builderFromRecipe } from "../js/logic/builder-model.js";
for (const r of recipes) {
  try {
    const { b } = builderFromRecipe(r);
    normalize(b);
    const info = analyse(b);
    if (!info.name || usedMl(b) > capacity(b) - fixedMl(b)) problems.push(`recipe ${r.id} does not load cleanly (${info.name})`);
    if (r.id === "noisette" && b.cold !== 10 && b.cold !== 20) problems.push(`noisette splash not loaded (cold=${b.cold})`);
  } catch (e) { problems.push(`recipe ${r.id} THROW ${e.message}`); }
}
console.log(`${recipes.length} catalog recipes load into the builder.`);

const list = [...names.entries()].sort((a, b) => b[1] - a[1]);
console.log(`${count} combinations checked, ${names.size} distinct drink names`);
console.log("Most common:", list.slice(0, 14).map(([n, c]) => `${n} (${c})`).join(", "));
console.log("Sample of rarer names:", list.filter((x) => x[1] < 40).slice(0, 18).map(([n]) => n).join(" | "));
if (problems.length) {
  console.log(`\n${problems.length} PROBLEMS, first 12:`);
  problems.slice(0, 12).forEach((p) => console.log(" -", p.slice(0, 260)));
  process.exit(1);
}
console.log("All combinations are valid.");
