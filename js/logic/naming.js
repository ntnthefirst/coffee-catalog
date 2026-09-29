/* Gives every customiser drink a real coffee name and a one-line description.
   The name comes from the structure (ratios of espresso, milk, foam, water),
   then flavours, plant milk, toppings and extras are worked in the way cafés do. */
import { SYRUP, MILK } from "./lookup.js";

const MILK_CORES = new Set(["Latte", "Flat White", "Cappuccino", "Cortado", "Piccolo Latte", "Dry Cappuccino", "Café Breve", "Milky Latte", "Foamy Latte", "Café au Lait"]);
const ESPRESSO_CORES = new Set(["Espresso", "Doppio", "Ristretto", "Double Ristretto", "Lungo", "Double Lungo"]);

const BLURBS = {
  "Espresso": "One small, concentrated shot with a layer of crema.",
  "Doppio": "A double shot: the base of most café drinks.",
  "Ristretto": "A shorter, sweeter and more intense shot.",
  "Double Ristretto": "Two short, syrupy shots.",
  "Lungo": "A longer pull: lighter body, a little more bitterness.",
  "Double Lungo": "Two long shots in one cup.",
  "Allongé": "Espresso with a splash of hot water.",
  "Americano": "Espresso lengthened with hot water.",
  "Long Black": "Water first, espresso on top so the crema stays intact.",
  "White Americano": "An americano with a splash of cold milk.",
  "Café au Lait": "Espresso, a little water and lots of hot milk.",
  "Noisette": "Espresso ‘hazelnut-coloured’ by a dash of milk.",
  "Café con Leche": "Strong coffee with cold milk added.",
  "Macchiato": "Espresso ‘stained’ with a spoon of foam.",
  "Marocchino": "Cocoa, espresso and milk foam in a small glass.",
  "Cortado": "Espresso cut with about the same amount of warm milk.",
  "Piccolo Latte": "A small shot in a small glass with warm milk.",
  "Cappuccino": "Espresso, steamed milk and a thick layer of foam.",
  "Dry Cappuccino": "Mostly foam with only a little milk.",
  "Flat White": "A strong double shot under velvety microfoam.",
  "Latte": "Espresso with plenty of steamed milk and a thin cap of foam.",
  "Café Breve": "A latte made with half & half. Rich and silky.",
  "Milky Latte": "Lots of milk and a gentle hint of coffee.",
  "Foamy Latte": "A big latte with an extra airy cap of foam.",
  "Latte Macchiato": "Milk first, then espresso poured through the foam.",
  "Mocha": "A latte with chocolate.",
  "White Mocha": "A latte with white chocolate.",
  "Caramel Macchiato": "Vanilla, milk and espresso with caramel on top.",
  "Café Bombón": "Espresso with sweetened condensed milk.",
  "Cà Phê Sữa Đá": "Strong coffee with condensed milk over ice.",
  "Einspänner": "Strong coffee under a cap of whipped cream.",
  "Espresso con Panna": "A shot crowned with whipped cream.",
  "Espresso on Ice": "Hot espresso poured over ice.",
  "Café con Hielo": "Sweet espresso poured over ice, Spanish style.",
  "Freddo Espresso": "Greek-style shaken iced espresso.",
  "Freddo Cappuccino": "Freddo espresso under thick cold foam.",
  "Iced Macchiato": "Espresso on ice with a dollop of cold foam.",
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** structural core name for a hot drink */
function hotCore(x) {
  const { E, M, F, S, W, layered, shots, style } = x;
  const T = M + F + S;
  if (W > 0) {
    if (T === 0) return layered ? "Long Black" : W <= 40 ? "Allongé" : "Americano";
    if (M + F === 0) return "White Americano";
    return "Café au Lait";
  }
  if (T === 0) {
    if (style === "ristretto") return shots > 1 ? "Double Ristretto" : "Ristretto";
    if (style === "lungo") return shots > 1 ? "Double Lungo" : "Lungo";
    return shots > 1 ? "Doppio" : "Espresso";
  }
  if (M === 0 && F === 0) return S <= 40 ? "Noisette" : "Café con Leche";
  if (M === 0 && S === 0) return F <= 30 ? "Macchiato" : "Dry Cappuccino";

  const ratio = T / E;
  const foamShare = M + F ? F / (M + F) : 0;
  if (layered && T >= 100) return "Latte Macchiato";
  if (T <= 70 && E <= 30) return "Piccolo Latte";
  if (ratio <= 1.4) return foamShare >= 0.3 ? "Macchiato" : "Cortado";
  if (ratio <= 5) {
    if (foamShare >= 0.6) return "Dry Cappuccino";
    if (foamShare >= 0.35) return "Cappuccino";
    return ratio <= 3 ? "Flat White" : "Latte";
  }
  if (foamShare >= 0.5) return "Foamy Latte";
  return ratio > 9 ? "Milky Latte" : "Latte";
}

/** the same idea for iced drinks; returns { core, complete } (complete = needs no "Iced" prefix) */
function icedCore(x) {
  const { M, F, S, W, sugar } = x;
  const T = M + F + S;
  if (W > 0) {
    if (T === 0) return { core: "Americano" };
    return { core: M + F === 0 ? "White Americano" : "Café au Lait" };
  }
  if (T === 0) {
    if (sugar) return { core: "Café con Hielo", complete: true };
    return { core: x.shots > 1 ? "Espresso on Ice" : "Espresso", complete: x.shots > 1 };
  }
  if (M === 0 && S === 0) {
    if (F >= 60) return { core: "Freddo Cappuccino", complete: true };
    return { core: "Iced Macchiato", complete: true };
  }
  const core = hotCore({ ...x, layered: false, W: 0 });
  const map = { "Piccolo Latte": "Cortado", "Latte Macchiato": "Latte", Macchiato: "Cortado", Noisette: "Latte", "Café con Leche": "Latte" };
  return { core: map[core] || core };
}

const flavourLabel = (id) => {
  const s = SYRUP[id];
  const plain = s.label.replace(/\s*\(.*\)/, "").replace(/ sauce$/i, "").replace(/ syrup$/i, "").replace("Sweetened condensed milk", "Condensed milk").replace("Simple", "Sugar");
  return plain.replace(/\b([a-z])/g, (c) => c.toUpperCase());
};

/** b = builder state -> { name, blurb } */
export function nameDrink(b) {
  const hot = b.temp === "hot";
  const flav = new Set(b.fl.filter((f) => f.id && f.p > 0).map((f) => f.id));
  const x = {
    E: Math.max(1, Math.round(b.shots * (b.style === "ristretto" ? 17 : b.style === "lungo" ? 45 : 25))),
    shots: b.shots, style: b.style, M: b.milk, F: b.foam, S: hot ? b.cold : 0, W: b.water,
    layered: b.order === "m", sugar: flav.has("sugar"),
  };
  const milky = x.M + x.F + x.S > 0;
  const has = (id) => flav.has(id);
  const tops = b.tops;

  let core, complete = false;
  if (hot) core = hotCore(x);
  else ({ core, complete = false } = icedCore(x));
  let base = core;
  const flavours = new Set(flav);
  flavours.delete("sugar");
  const drop = (...ids) => ids.forEach((id) => flavours.delete(id));
  let prefix = "";

  // --- specials -----------------------------------------------------------
  if ((has("chocolate") || has("white-chocolate")) && MILK_CORES.has(base)) {
    base = (base === "Café au Lait" ? "Long " : "") + (has("white-chocolate") ? "White Mocha" : "Mocha");
    drop("chocolate", "white-chocolate");
  } else if (has("condensed")) {
    if (MILK_CORES.has(base) || base === "Latte Macchiato") { prefix = "Spanish"; drop("condensed"); }
    else if (ESPRESSO_CORES.has(base) || base === "Espresso" || base === "Espresso on Ice") {
      base = hot ? "Café Bombón" : "Cà Phê Sữa Đá"; complete = !hot; drop("condensed");
    }
  }
  if (base === "Latte Macchiato" && has("vanilla") && tops.includes("caramel")) { base = "Caramel Macchiato"; drop("vanilla", "caramel"); }
  if (hot && base === "Macchiato" && tops.includes("cocoa") && x.M === 0) base = "Marocchino";
  if (has("caramel") && tops.includes("seasalt")) { flavours.delete("caramel"); flavours.add("salted-caramel"); }
  if (b.milkId === "cream" && base === "Latte") base = "Café Breve";

  // whipped cream
  let suffix = "";
  if (tops.includes("whipped")) {
    if (hot && (base === "Doppio")) base = "Einspänner";
    else if (base === "Espresso" || base === "Doppio" || base === "Espresso on Ice") base = `${base} con Panna`.replace("Espresso on Ice con Panna", "Espresso on Ice with Cream");
    else if (base === "Espresso con Panna") { /* already */ }
    else suffix = " with Whipped Cream";
  }

  // --- assemble -----------------------------------------------------------
  const plant = milky && b.milkId !== "whole" && !MILK[b.milkId].dairy && b.milkId !== "cream"
    ? MILK[b.milkId].short : b.milkId === "cream" && base !== "Café Breve" && milky ? "Half & Half" : "";
  const flavourText = [...flavours].slice(0, 2).map(flavourLabel).join(" & ");
  const style = milky && b.style !== "normal" && !ESPRESSO_CORES.has(base) ? (b.style === "ristretto" ? "Ristretto" : "Lungo") : "";
  const spicy = tops.includes("cayenne") ? "Spicy" : "";
  const iced = !hot && !complete && !base.startsWith("Iced") ? "Iced" : "";

  const name = [iced, b.decaf ? "Decaf" : "", spicy, prefix, style, flavourText, plant, base].filter(Boolean).join(" ") + suffix;
  const blurb = (BLURBS[base] || `${cap(base.toLowerCase())}.`) + (iced ? " Served over ice." : "");
  return { name, blurb };
}
