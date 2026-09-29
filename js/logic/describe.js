/* Turn an ingredient list into display rows: colour dot, label, amount. */
import { types } from "../data/ingredients.js";
import { mix } from "../core/color.js";
import { ml, grams } from "../core/dom.js";
import { CONSTS } from "../data/config.js";
import { MILK, SYRUP, TOPPING } from "./lookup.js";

const TOP_AMOUNT = { whipped: "swirl", cocoa: "dusting", cinnamon: "dusting", cayenne: "pinch", caramel: "drizzle", chocolate: "drizzle", seasalt: "3–4 flakes" };
const GARNISH = {
  orange: { label: "Orange", color: "#f39a1e" }, lemon: { label: "Lemon", color: "#f5d63d" }, lime: { label: "Lime", color: "#8cc63f" },
  mint: { label: "Mint", color: "#3f9a55" }, "cinnamon-stick": { label: "Cinnamon stick", color: "#8a4b26" },
};
export const garnishLabel = (kind) => (GARNISH[kind] ? GARNISH[kind].label : kind);

/** ctx = { temp, milkId, shots } */
export function ingredientRows(ing, ctx) {
  const hot = ctx.temp === "hot";
  const milk = MILK[ctx.milkId];
  let espSeen = false;

  return ing.map((i) => {
    const t = types[i.t] || {};
    let label = t.label, amount = "", detail = "", color = t.color;

    if (i.t === "espresso") {
      label = "Espresso";
      detail = espSeen ? "" : ctx.shots === 1 ? "single" : ctx.shots === 2 ? "double" : `${ctx.shots} shots`;
      amount = ml(i.ml); espSeen = true;
    } else if (i.t === "milk") {
      label = (i.raw ? "Cold " : hot ? "Steamed " : "Cold ") + milk.label.toLowerCase();
      detail = i.raw ? "splash" : "";
      amount = ml(i.ml); color = milk.color;
    } else if (i.t === "foam") {
      label = `${milk.short} foam`; amount = ml(i.ml); color = mix(milk.color, "#ffffff", .55);
    } else if (i.t === "coldfoam") {
      label = `Cold ${milk.short.toLowerCase()} foam`; amount = ml(i.ml); color = mix(milk.color, "#ffffff", .55);
    } else if (i.t === "water") {
      label = hot ? "Hot water" : "Cold water"; amount = ml(i.ml);
    } else if (i.t === "syrup" || i.t === "sauce") {
      const s = SYRUP[i.id];
      label = s.label; color = s.color; amount = ml(i.ml);
      const pumps = Math.round((i.ml / CONSTS.pumpMl) * 10) / 10;
      detail = `${pumps} pump${pumps === 1 ? "" : "s"}`;
    } else if (i.t === "ice") {
      amount = grams(i.g);
    } else if (i.t === "icecream") {
      amount = grams(i.g);
    } else if (i.t === "top") {
      const tp = TOPPING[i.kind];
      label = tp.label; color = tp.color; amount = TOP_AMOUNT[i.kind] || "";
    } else if (i.t === "garnish") {
      label = garnishLabel(i.kind); color = (GARNISH[i.kind] || {}).color || "#888"; amount = "garnish";
    } else {
      amount = ml(i.ml);
    }
    return { color, label, amount, detail, type: i.t };
  });
}
