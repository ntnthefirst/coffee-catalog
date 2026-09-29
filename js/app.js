/* ==========================================================================
   app.js — UI for the Dedica Coffee Catalog.
   All content comes from js/coffees.js (window.COFFEE_DATA).
   No build step, no dependencies: works on GitHub Pages and file://.
   ========================================================================== */
(function () {
  "use strict";

  const D = window.COFFEE_DATA;
  const C = D.consts;

  /* ------------------------------------------------------------------ utils */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const round10 = (n) => Math.max(10, Math.round(n / 10) * 10);
  const SYR = byId(D.syrups), MILK = byId(D.milks), TOPS = byId(D.toppings), REC = byId(D.recipes);

  const store = {
    get(k, d) { try { const v = localStorage.getItem("dcc." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("dcc." + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };

  /* colour helpers */
  const hex2rgb = (h) => { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join(""); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgb2hex = (a) => "#" + a.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A.map((v, i) => v + (B[i] - v) * t)); };

  /* seeded random so a recipe always draws the same ice cubes */
  function rng(seed) {
    let h = 1779033703 ^ String(seed).length;
    for (let i = 0; i < String(seed).length; i++) { h = Math.imul(h ^ String(seed).charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return function () { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  }

  /* ------------------------------------------------------------------ state */
  const state = {
    units: store.get("units", "ml"),
    favs: new Set(store.get("favs", [])),
    saved: store.get("saved", []),
    filter: { temp: "all", group: "all", q: "", sort: "featured" },
    board: { mode: "intensity", temp: "all", all: false },
    tipTab: "milk",
    detail: null,               // { id, milkId, decaf }
    lastView: "#/catalog",
    view: "catalog",
    builder: defaultBuilder(),
    builderBuilt: false,
  };

  const fv = (ml) => state.units === "oz" ? (Math.round(ml / 29.5735 * 10) / 10) + " fl oz" : Math.round(ml) + " ml";
  const fg = (g) => state.units === "oz" ? (Math.round(g / 28.3495 * 10) / 10) + " oz" : Math.round(g) + " g";

  /* -------------------------------------------------------- recipe helpers */
  const MILKISH = new Set(["milk", "foam", "coldfoam", "condensed"]);
  const hasMilk = (r) => r.ing.some((i) => MILKISH.has(i.t) && i.t !== "condensed" || (i.t === "sauce" && i.id === "condensed"));
  const usesMilkChoice = (ing) => ing.some((i) => i.t === "milk" || i.t === "foam" || i.t === "coldfoam");

  function groupsOf(r) {
    const g = new Set();
    if (r.tags.includes("classic")) g.add("classic");
    if (!hasMilk(r) && !r.ing.some((i) => i.t === "icecream")) g.add("black");
    if (usesMilkChoice(r.ing) || hasMilk(r)) g.add("milk");
    if (r.ing.some((i) => (i.t === "syrup" && i.id !== "sugar") || i.t === "sauce" || i.t === "chai")) g.add("flavoured");
    if (r.tags.includes("spicy")) g.add("spicy");
    if (r.tags.includes("dessert")) g.add("dessert");
    return g;
  }

  function liquidTotal(ing) {
    return ing.reduce((s, i) => s + ((D.types[i.t] && D.types[i.t].liquid && i.ml) ? i.ml : 0), 0);
  }
  const sumT = (ing, t) => ing.filter((i) => i.t === t).reduce((s, i) => s + (i.ml || 0), 0);
  const iceOf = (ing) => sumT2(ing, "ice", "g");
  const scoopOf = (ing) => sumT2(ing, "icecream", "g");
  function sumT2(ing, t, k) { return ing.filter((i) => i.t === t).reduce((s, i) => s + (i[k] || 0), 0); }

  const LEVELS = ["Very mild", "Mild", "Medium", "Strong", "Intense"];
  function statsOf(ing, shots, decaf) {
    const volume = liquidTotal(ing) + scoopOf(ing) * 0.9;
    const caffeine = Math.round(shots * (decaf ? C.decafPerShot : C.caffeinePerShot));
    const per100 = volume ? caffeine / volume * 100 : 0;
    const raw = decaf ? 1 : per100 >= 150 ? 5 : per100 >= 90 ? 4 : per100 >= 55 ? 3 : per100 >= 35 ? 2 : 1;
    return { volume, caffeine, per100, level: raw, levelLabel: LEVELS[raw - 1] };
  }
  const statsR = (r, decaf) => statsOf(r.ing, r.shots, decaf);
  const STATS = {}; D.recipes.forEach((r) => { STATS[r.id] = statsR(r); });

  const BASIS = {
    standard:  { label: "Official / industry standard", short: "Standard", tip: "Measurements follow an official or widely published reference." },
    classic:   { label: "Classic café recipe",          short: "Classic",  tip: "Traditional recipe. Exact amounts vary a little between cafés." },
    flavoured: { label: "Syrup dosing per Monin guidance", short: "Flavoured", tip: "A classic base plus syrup at the standard ≈ 20 ml per 240 ml." },
    creative:  { label: "Modern / creative recipe",     short: "Creative", tip: "A popular café-style creation. Tweak to taste." },
  };

  /* -------------------------------------------------- ingredient description */
  const TOP_TEXT = { whipped: "≈ 20 ml (a swirl)", cocoa: "a light dusting", cinnamon: "a light dusting", cayenne: "a tiny pinch (a few grains)", caramel: "to drizzle", chocolate: "to drizzle", seasalt: "3–4 flakes" };
  const GAR_TEXT = { orange: "Orange peel or slice", lemon: "Lemon peel", lime: "Lime wedge", mint: "Fresh mint sprig", "cinnamon-stick": "Cinnamon stick" };
  const GAR_COL  = { orange: "#f39a1e", lemon: "#f5d63d", lime: "#8cc63f", mint: "#3f9a55", "cinnamon-stick": "#8a4b26" };

  function ingredientRows(ing, ctx) {
    const hot = ctx.temp === "hot";
    const milk = MILK[ctx.milkId];
    const rows = [];
    let espSeen = false;
    ing.forEach((i) => {
      const t = D.types[i.t] || {};
      let label = t.label, amount = "", detail = "", color = t.color;
      if (i.t === "espresso") {
        label = "Espresso";
        const n = ctx.shots;
        detail = espSeen ? "" : (n === 1 ? "single shot" : n === 2 ? "double shot" : n + " shots");
        amount = fv(i.ml); espSeen = true;
      } else if (i.t === "milk") { label = i.raw ? "Cold " + milk.label.toLowerCase() : (hot ? "Steamed " : "Cold ") + milk.label.toLowerCase(); detail = i.raw ? "splash, not steamed" : ""; amount = fv(i.ml); color = milk.color; }
      else if (i.t === "foam") { label = milk.short + " milk foam"; amount = fv(i.ml); color = mix(milk.color, "#ffffff", .55); }
      else if (i.t === "coldfoam") { label = "Cold " + milk.short.toLowerCase() + " foam"; amount = fv(i.ml); color = mix(milk.color, "#ffffff", .55); }
      else if (i.t === "water") { label = hot ? "Hot water" : "Cold water"; detail = hot ? "≈ 90 °C" : ""; amount = fv(i.ml); }
      else if (i.t === "syrup" || i.t === "sauce") { const s = SYR[i.id]; label = s.label + (s.kind === "syrup" && !/syrup/i.test(s.label) ? " syrup" : ""); color = s.color; amount = fv(i.ml); detail = "≈ " + Math.round(i.ml / C.pumpMl * 10) / 10 + " pump" + (Math.abs(i.ml / C.pumpMl - 1) < .01 ? "" : "s"); }
      else if (i.t === "ice") { amount = fg(i.g); }
      else if (i.t === "icecream") { amount = fg(i.g) + " (1 scoop)"; }
      else if (i.t === "top") { const tp = TOPS[i.kind]; label = tp.label; color = tp.color; amount = TOP_TEXT[i.kind] || ""; }
      else if (i.t === "garnish") { label = GAR_TEXT[i.kind] || i.kind; color = GAR_COL[i.kind] || "#888"; amount = "garnish"; }
      else { amount = fv(i.ml); }
      rows.push({ color, label, amount, detail, type: i.t });
    });
    return rows;
  }

  /* ---------------------------------------------------- "how to make it" */
  function makeSteps(ing, ctx) {
    const hot = ctx.temp === "hot";
    const milk = MILK[ctx.milkId];
    const mLabel = milk.label.toLowerCase();
    const steps = [];
    const espMl = sumT(ing, "espresso");
    const shots = ctx.shots;
    const milkMl = ing.filter((i) => i.t === "milk" && !i.raw).reduce((s, i) => s + i.ml, 0), foamMl = sumT(ing, "foam") + sumT(ing, "coldfoam");
    const total = milkMl + foamMl;
    let steamed = false;

    steps.push(hot
      ? "Preheat: put your cup on the Dedica’s top warming tray and run a blank shot of water through the empty portafilter."
      : "Chill a glass with ice water while you work (tip it out before building the drink).");

    let k = 0;
    while (k < ing.length) {
      const i = ing[k];
      if (i.t === "syrup" || i.t === "sauce") {
        const group = [];
        while (k < ing.length && (ing[k].t === "syrup" || ing[k].t === "sauce")) { group.push(ing[k]); k++; }
        const txt = group.map((g) => `${fv(g.ml)} ${SYR[g.id].label.toLowerCase()}${g.ml >= 5 ? " (≈ " + Math.round(g.ml / C.pumpMl * 10) / 10 + " pumps)" : ""}`).join(" + ");
        const later = ing.slice(k).some((x) => x.t === "espresso");
        steps.push(`Add ${txt} to the bottom of the ${hot ? "cup" : "glass"}${later ? " — the hot espresso will dissolve it." : "."}`);
        continue;
      }
      switch (i.t) {
        case "ice": steps.push(`Add ${fg(i.g)} of ice cubes.`); break;
        case "icecream": steps.push(`Scoop ${fg(i.g)} of vanilla ice cream into a small glass or bowl.`); break;
        case "espresso": {
          const perShot = shots ? i.ml / shots : i.ml;
          const q = perShot < C.shotMl * 0.85 ? " (a short, ristretto-style pull)" : perShot > C.shotMl * 1.5 ? " (a long pull)" : "";
          const basket = shots <= 1 ? "single basket (≈ 7 g)" : "double basket (≈ 14 g)";
          let s = `Pull the espresso: ${basket}, press the ${shots <= 1 ? "1-cup" : "2-cup"} button and stop at about ${fv(i.ml)}${q} — 25–30 seconds.`;
          if (ing.slice(0, k).some((x) => x.t === "milk" || x.t === "ice" || x.t === "tonic" || x.t === "oj" || x.t === "lemonade")) s += " Pour it slowly over the back of a spoon so it floats on top.";
          if (hot && !steamed && total > 0) s += " Switch on the steam right away so the thermoblock is ready when the shot ends.";
          steps.push(s);
          break;
        }
        case "cremafoam": steps.push("Shake the espresso hard with 3 ice cubes for 15 seconds, then strain it over fresh ice — the foamy top forms in the shaker."); break;
        case "water": steps.push(hot ? `Add ${fv(i.ml)} hot water (≈ 90 °C) from a kettle${ctx.blend ? " and stir gently" : ""}.` : `Add ${fv(i.ml)} cold water.`); break;
        case "milk":
        case "foam":
        case "coldfoam": {
          if (i.raw) { steps.push(`Add ${fv(i.ml)} cold ${mLabel} straight from the fridge (not steamed).`); break; }
          if (hot) {
            if (!steamed) {
              steamed = true;
              const cold = round10(total / (1 + 0.1 + 0.4 * (foamMl / (total || 1))));
              const secs = foamMl / (total || 1) < .15 ? "2–3" : foamMl / (total || 1) < .3 ? "3–5" : "8–10";
              steps.push(`Steam: pour about ${fv(cold)} of cold ${mLabel} into a steel pitcher and steam it to ${milk.dairy ? "60–65 °C, stretching for " + secs + " seconds" : "55–60 °C"} to get ≈ ${fv(milkMl)} silky milk${foamMl ? " and ≈ " + fv(foamMl) + " foam" : ""}. ${milk.dairy ? "" : milk.steam}`.trim());
            }
            if (i.t === "milk") steps.push(`Pour the steamed milk into the ${ing.some((x) => x.t === "espresso") ? "cup" : "cup"}${foamMl && ing.some((x) => x.t === "foam") ? ", holding the foam back with a spoon" : ""}. Swirl and tap the pitcher first for a glossy finish.`);
            else steps.push(`Spoon or pour the foam on top (${fv(i.ml)}).`);
          } else {
            if (i.t === "milk") steps.push(`Pour ${fv(i.ml)} cold ${mLabel}.`);
            else steps.push(`Cold foam: froth about ${fv(i.ml / 1.6)} of very cold ${mLabel} with a handheld frother for 20–30 s (the Dedica wand can’t make cold foam) and spoon it on top.`);
          }
          break;
        }
        case "top": case "garnish": break;
        default: steps.push(`Add ${fv(i.ml)} ${D.types[i.t].label.toLowerCase()}${hot && i.t === "chai" ? " (warm it first)" : ""}.`);
      }
      k++;
    }
    const tops = ing.filter((i) => i.t === "top").map((i) => (TOPS[i.kind].label.toLowerCase()) + (i.kind === "whipped" ? " (≈ 20 ml)" : ""));
    if (tops.length) steps.push("Finish with " + tops.join(", ") + ".");
    const gars = ing.filter((i) => i.t === "garnish").map((i) => (GAR_TEXT[i.kind] || i.kind).toLowerCase());
    if (gars.length) steps.push("Garnish with " + gars.join(" and ") + ".");
    const layeredHint = ctx.layered ? "Serve right away without stirring to keep the layers." : "Give it a gentle stir and enjoy.";
    steps.push(layeredHint);
    return steps;
  }

  /* ============================================================ CUP DRAWING */
  const VESSELS = {
    demi:  { wTop: 66, wBot: 48, h: 46,  handle: true,  saucer: true,  caps: [40, 60, 80, 100] },
    short: { wTop: 76, wBot: 64, h: 74,  handle: false, saucer: false, caps: [90, 120, 150, 190, 240] },
    cup:   { wTop: 112, wBot: 76, h: 82, handle: true,  saucer: true,  caps: [150, 180, 220, 260] },
    mug:   { wTop: 118, wBot: 98, h: 100, handle: true, saucer: false, caps: [280, 330, 400] },
    tall:  { wTop: 94, wBot: 74, h: 150, handle: false, saucer: false, caps: [250, 300, 360, 450, 550] },
  };
  const BLENDABLE = new Set(["espresso", "water", "syrup", "sauce", "chai"]);
  let uid = 0;

  /* turn an ingredient list into things the drawing function understands */
  function visual(ing, ctx) {
    const milk = MILK[ctx.milkId || "whole"];
    let layers = [];
    ing.forEach((i) => {
      const meta = D.types[i.t];
      if (!meta || !meta.liquid || !i.ml) return;
      let color = meta.color;
      if (i.t === "syrup" || i.t === "sauce") color = SYR[i.id].color;
      else if (i.t === "milk") color = milk.color;
      else if (i.t === "foam" || i.t === "coldfoam") color = mix(milk.color, "#fffdf7", .6);
      layers.push({ t: i.t, ml: i.ml, color });
    });

    if (ctx.blend) {                         // merge espresso + water + syrups into one shade
      const out = [];
      layers.forEach((l) => {
        const last = out[out.length - 1];
        if (last && last.blend && BLENDABLE.has(l.t)) { last.parts.push(l); last.ml += l.ml; }
        else if (BLENDABLE.has(l.t)) out.push({ t: "blend", blend: true, parts: [l], ml: l.ml, color: l.color });
        else out.push(l);
      });
      out.forEach((l) => {
        if (!l.blend) return;
        const esp = l.parts.filter((p) => p.t === "espresso").reduce((s, p) => s + p.ml, 0);
        if (!esp) { l.color = l.parts[0].color; return; }
        const other = l.ml - esp;
        l.color = mix(D.types.espresso.color, "#b98a5c", clamp(other / (other + esp * 2.2), 0, .85));
        l.hasEsp = true;
      });
      layers = out;
    } else if (!ctx.layered) {               // "latte" look: espresso bleeds into the milk
      layers.forEach((l, idx) => {
        const near = [layers[idx - 1], layers[idx + 1]].filter(Boolean);
        if (l.t === "espresso") {
          const m = near.find((n) => n.t === "milk" || n.t === "foam" || n.t === "coldfoam" || n.t === "condensed");
          if (m) l.color = mix(l.color, "#c8996a", .6);
        } else if (l.t === "milk" || l.t === "foam" || l.t === "coldfoam") {
          if (near.some((n) => n.t === "espresso")) l.color = mix(l.color, "#c8996a", .2);
        }
      });
    }

    const ice = iceOf(ing), scoop = scoopOf(ing);
    const liq = layers.reduce((s, l) => s + l.ml, 0);
    const tops = ing.filter((i) => i.t === "top").map((i) => i.kind);
    const gar = ing.filter((i) => i.t === "garnish").map((i) => i.kind);
    const iced = ctx.temp === "iced" || ice > 0;
    const kind = ctx.vessel || (iced ? "tall" : liq <= 70 ? "demi" : liq <= 240 ? "cup" : "mug");
    const need = liq + scoop * 0.9 + ice * 0.5 + (tops.includes("whipped") ? 15 : 0);
    const caps = VESSELS[kind].caps;
    const cap = caps.find((c) => c >= need * 1.08) || caps[caps.length - 1];
    const fl = clamp((liq + ice * 0.5) / cap, 0.12, 0.93);

    const top = layers[layers.length - 1];
    let surface = "#c9a27a";
    if (top) {
      if (top.t === "espresso") surface = "#b98650";
      else if (top.blend && top.hasEsp) surface = mix(top.color, "#e0b785", .35);
      else surface = mix(top.color, "#ffffff", .08);
    }
    return { layers, ice, scoop, tops, gar, kind, cap, fl, liq, hot: !iced, surface, seed: ctx.seed || "x", layered: !!ctx.layered };
  }

  function cupSVG(v, opts) {
    opts = opts || {};
    const id = "c" + (++uid);
    const V = VESSELS[v.kind];
    const { wTop, wBot, h } = V;
    const cx = 100, yb = 192, yt = yb - h;
    const rT = wTop / 2, rB = wBot / 2;
    const ryT = Math.max(5, wTop * 0.12), ryB = ryT * (rB / rT);
    const wall = 3, base = 6;
    const iT = rT - wall, iB = rB - wall, iryT = ryT - 1.5, iryB = ryB - 1.5;
    const yBot = yb - base, Hi = yBot - yt;
    const outer = `M${cx - rT} ${yt}L${cx - rB} ${yb}A${rB} ${ryB} 0 0 0 ${cx + rB} ${yb}L${cx + rT} ${yt}A${rT} ${ryT} 0 0 0 ${cx - rT} ${yt}Z`;
    const inner = `M${cx - iT} ${yt}L${cx - iB} ${yBot}A${iB} ${iryB} 0 0 0 ${cx + iB} ${yBot}L${cx + iT} ${yt}A${iT} ${iryT} 0 0 0 ${cx - iT} ${yt}Z`;
    const ys = yBot - v.fl * Hi;
    const hw = (y) => iB + (iT - iB) * ((yBot - y) / Hi);
    const rs = hw(ys), rys = rs * (iryT / iT);
    const r = rng(v.seed);

    let out = "";
    const defs = [`<clipPath id="${id}i"><path d="${inner}"/></clipPath>`];

    /* shadow + saucer */
    out += `<ellipse cx="${cx}" cy="${yb + 6}" rx="${rB * 1.25}" ry="5" fill="#000" opacity=".12"/>`;
    if (V.saucer) out += `<ellipse cx="${cx}" cy="${yb + 3}" rx="${rB * 1.55}" ry="7" class="g-fill g-line"/><ellipse cx="${cx}" cy="${yb + 1}" rx="${rB * 0.95}" ry="4" class="g-line" fill="none" opacity=".5"/>`;

    /* handle (behind the body) */
    if (V.handle) {
      const yA = yt + h * 0.2, yB = yt + h * 0.72;
      const xA = cx + rT + (rB - rT) * ((yA - yt) / h) - 1, xB = cx + rT + (rB - rT) * ((yB - yt) / h) - 1;
      const hwid = Math.max(14, h * 0.4);
      out += `<path d="M${xA} ${yA}C${xA + hwid} ${yA - 4} ${xB + hwid} ${yB + 4} ${xB} ${yB}" fill="none" class="g-line" stroke-width="7" stroke-linecap="round" opacity=".55"/>`;
      out += `<path d="M${xA} ${yA}C${xA + hwid} ${yA - 4} ${xB + hwid} ${yB + 4} ${xB} ${yB}" fill="none" stroke="var(--glass-in)" stroke-width="3.2" stroke-linecap="round"/>`;
    }

    /* glass body */
    out += `<path d="${outer}" class="g-fill"/>`;

    /* liquid */
    let liquid = "";
    const totalMl = v.layers.reduce((s, l) => s + l.ml, 0) || 1;
    const liqH = v.fl * Hi;
    let cursor = yBot + iryB + 2;
    const bounds = [];
    let cum = yBot;
    v.layers.forEach((l, idx) => {
      const lh = liqH * l.ml / totalMl;
      const top = cum - lh;
      const extra = idx === 0 ? iryB + 3 : 0;
      liquid += `<rect x="${cx - iT - 1}" y="${top.toFixed(2)}" width="${(iT * 2 + 2).toFixed(1)}" height="${(lh + extra + 0.6).toFixed(2)}" fill="${l.color}"/>`;
      if (idx < v.layers.length - 1) bounds.push({ y: top, up: v.layers[idx + 1], dn: l, lhU: liqH * v.layers[idx + 1].ml / totalMl, lhD: lh });
      cum = top;
    });
    bounds.forEach((b, n) => {
      if (v.layered) {
        liquid += `<rect x="${cx - iT}" y="${(b.y - 0.6).toFixed(2)}" width="${iT * 2}" height="1.2" fill="#fff" opacity=".35"/>`;
      } else {
        const half = Math.min(10, b.lhU / 2, b.lhD / 2);
        if (half < 1.5) return;
        const gid = `${id}g${n}`;
        defs.push(`<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b.up.color}"/><stop offset="1" stop-color="${b.dn.color}"/></linearGradient>`);
        liquid += `<rect x="${cx - iT - 1}" y="${(b.y - half).toFixed(2)}" width="${iT * 2 + 2}" height="${(half * 2).toFixed(2)}" fill="url(#${gid})"/>`;
      }
    });
    /* liquid surface */
    if (v.layers.length) {
      liquid += `<ellipse cx="${cx}" cy="${ys.toFixed(2)}" rx="${rs.toFixed(2)}" ry="${rys.toFixed(2)}" fill="${v.surface}"/>`;
      liquid += `<ellipse cx="${cx}" cy="${(ys - rys * 0.15).toFixed(2)}" rx="${(rs * 0.72).toFixed(2)}" ry="${(rys * 0.55).toFixed(2)}" fill="#fff" opacity=".16"/>`;
    }
    /* ice cubes */
    if (v.ice > 0) {
      const n = clamp(Math.round(v.ice / 13), 3, 18);
      const s = clamp(iB * 0.56, 12, 24);
      const perRow = Math.max(2, Math.floor((iB * 2) / (s * 1.05)));
      let cubes = "";
      for (let k = 0; k < n; k++) {
        const row = Math.floor(k / perRow), col = k % perRow;
        const x = cx - ((perRow - 1) / 2) * s * 1.05 + col * s * 1.05 + (row % 2 ? s * 0.35 : -s * 0.15) + (r() - .5) * 5;
        const y = yBot - s * 0.62 - row * s * 0.86 + (r() - .5) * 4;
        if (y < ys - s * 0.55) continue;
        const rot = ((r() - .5) * 34).toFixed(1);
        cubes += `<rect x="${(x - s / 2).toFixed(1)}" y="${(y - s / 2).toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" rx="3.5" transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})" fill="#e8f6ff" fill-opacity=".38" stroke="#fff" stroke-opacity=".75" stroke-width="1.2"/>`;
      }
      liquid += cubes;
    }
    out += `<g clip-path="url(#${id}i)">${liquid}</g>`;

    /* straw for tall iced glasses */
    if (v.kind === "tall" && v.ice > 0) {
      out += `<line x1="${cx + 8}" y1="${yBot - 12}" x2="${cx + 24}" y2="${yt - 34}" stroke="var(--accent)" stroke-width="4.5" stroke-linecap="round"/><line x1="${cx + 8}" y1="${yBot - 12}" x2="${cx + 24}" y2="${yt - 34}" stroke="#fff" stroke-opacity=".35" stroke-width="1.4" stroke-linecap="round"/>`;
    }

    /* glass outline, rim, highlight */
    out += `<path d="${outer}" fill="none" class="g-line" stroke-width="2" stroke-linejoin="round"/>`;
    out += `<ellipse cx="${cx}" cy="${yt}" rx="${rT}" ry="${ryT}" fill="none" class="g-line" stroke-width="2"/>`;
    out += `<path d="M${cx - rT + 7} ${yt + ryT + 4}L${cx - rB + 8} ${yb - 12}" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round" fill="none"/>`;
    out += `<path d="M${cx + rT - 8} ${yt + ryT + 10}L${cx + rB - 8} ${yb - 20}" stroke="#fff" stroke-opacity=".22" stroke-width="2" stroke-linecap="round" fill="none"/>`;

    /* condensation for cold drinks */
    if (!v.hot) {
      for (let k = 0; k < 7; k++) {
        const yy = yt + h * (0.25 + r() * 0.6);
        const half = rT + (rB - rT) * ((yy - yt) / h);
        const xx = cx + (r() > .5 ? 1 : -1) * (half - 5 - r() * 10);
        out += `<circle cx="${xx.toFixed(1)}" cy="${yy.toFixed(1)}" r="${(1.2 + r() * 1.5).toFixed(1)}" fill="#fff" opacity=".55"/>`;
      }
    }

    /* ice cream scoop */
    if (v.scoop > 0) {
      const sr = Math.min(rs * 0.68, 26);
      out += `<g><ellipse cx="${cx}" cy="${ys - 2}" rx="${sr * 1.05}" ry="${sr * 0.32}" fill="#f0dcae"/><circle cx="${cx}" cy="${ys - sr * 0.62}" r="${sr}" fill="#f8ecd0" stroke="#e6d3a8" stroke-width="1.2"/><circle cx="${cx - sr * 0.35}" cy="${ys - sr * 0.9}" r="${sr * 0.28}" fill="#fff" opacity=".55"/></g>`;
    }

    /* toppings */
    v.tops.forEach((k) => {
      const col = TOPS[k].color;
      if (k === "whipped") {
        const wr = rs * 0.86;
        out += `<g stroke="#e4d5b8" stroke-width="1" fill="#fffaf0"><ellipse cx="${cx}" cy="${ys - 2}" rx="${wr}" ry="${rys + 1}"/><ellipse cx="${cx}" cy="${ys - 10}" rx="${wr * 0.74}" ry="${rys * 0.8 + 4}"/><ellipse cx="${cx}" cy="${ys - 18}" rx="${wr * 0.5}" ry="${rys * 0.6 + 3.5}"/><path d="M${cx - 5} ${ys - 21}Q${cx + 2} ${ys - 34} ${cx + 5} ${ys - 24}Q${cx + 2} ${ys - 21} ${cx - 5} ${ys - 21}Z"/></g>`;
      } else if (k === "caramel" || k === "chocolate") {
        const yo = v.tops.includes("whipped") ? -14 : 0;
        const pts = [];
        for (let z = 0; z < 7; z++) pts.push(`${(cx - rs * 0.7 + z * (rs * 1.4 / 6)).toFixed(1)} ${(ys + yo + (z % 2 ? -rys * 0.55 : rys * 0.55)).toFixed(1)}`);
        out += `<polyline points="${pts.join(" ")}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity=".95"/>`;
      } else {
        const yo = v.tops.includes("whipped") ? -13 : 0;
        const n = k === "seasalt" ? 5 : k === "cayenne" ? 6 : 26;
        let dots = "";
        for (let z = 0; z < n; z++) {
          const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 0.8;
          dots += `<circle cx="${(cx + Math.cos(a) * rs * rr).toFixed(1)}" cy="${(ys + yo + Math.sin(a) * rys * rr).toFixed(1)}" r="${(k === "seasalt" ? 1.6 : k === "cayenne" ? 1.3 : 1 + r() * 0.9).toFixed(1)}" fill="${col}" opacity="${k === "seasalt" ? 1 : .85}"/>`;
        }
        out += dots;
      }
    });

    /* garnishes on the rim */
    v.gar.forEach((k, n) => {
      const gx = cx + rT * (0.62 - n * 0.5), gy = yt + 1;
      if (k === "orange" || k === "lemon" || k === "lime") {
        const c = { orange: ["#f39a1e", "#fbc45e"], lemon: ["#f2cf2c", "#faec8a"], lime: ["#7fb52f", "#c3e37b"] }[k];
        out += `<g transform="translate(${gx} ${gy})"><circle r="12" fill="${c[0]}"/><circle r="9.4" fill="${c[1]}"/><path d="M0 0L0 -9.4M0 0L8.2 -4.7M0 0L8.2 4.7M0 0L0 9.4M0 0L-8.2 4.7M0 0L-8.2 -4.7" stroke="${c[0]}" stroke-width="1.1"/></g>`;
      } else if (k === "mint") {
        out += `<g fill="#3f9a55" stroke="#2d7a41" stroke-width=".8"><ellipse cx="${gx - 6}" cy="${gy - 10}" rx="5" ry="9" transform="rotate(-28 ${gx - 6} ${gy - 10})"/><ellipse cx="${gx + 5}" cy="${gy - 11}" rx="5" ry="9" transform="rotate(22 ${gx + 5} ${gy - 11})"/><ellipse cx="${gx}" cy="${gy - 15}" rx="4.5" ry="8"/></g>`;
      } else if (k === "cinnamon-stick") {
        out += `<line x1="${cx + 6}" y1="${ys}" x2="${cx + 34}" y2="${yt - 26}" stroke="#8a4b26" stroke-width="6" stroke-linecap="round"/><line x1="${cx + 6}" y1="${ys}" x2="${cx + 34}" y2="${yt - 26}" stroke="#b56a3c" stroke-width="2" stroke-linecap="round"/>`;
      }
    });

    /* steam for hot drinks (no steam under whipped cream) */
    if (v.hot && !v.tops.includes("whipped") && !opts.noSteam) {
      const sy = yt - 12 - (v.scoop ? 30 : 0);
      out += `<g class="steam" fill="none" stroke="var(--steam)" stroke-width="3" stroke-linecap="round">` +
        [-1, 0, 1].map((d, n) => `<path style="animation-delay:${n * .55}s" d="M${cx + d * rT * .42} ${sy}c-6 -8 6 -14 0 -22s6 -14 0 -22"/>`).join("") + `</g>`;
    }

    /* viewBox tuned per vessel so every cup fills its frame */
    const vbH = h + 100, vbW = vbH * 0.9;
    const vbX = cx - vbW / 2 + (V.handle ? 9 : 0), vbY = yb + 18 - vbH;
    return `<svg class="cup" viewBox="${vbX.toFixed(1)} ${vbY.toFixed(1)} ${vbW.toFixed(1)} ${vbH}" role="img" aria-label="${esc(opts.label || "Illustration of the drink")}" preserveAspectRatio="xMidYMid meet"><defs>${defs.join("")}</defs>${out}</svg>`;
  }

  const recipeCtx = (r, milkId) => ({ temp: r.temp, milkId: milkId || r.milk || "whole", layered: r.layered, blend: r.blend, vessel: r.vessel, seed: r.id, shots: r.shots });
  const recipeCup = (r, milkId, o) => cupSVG(visual(r.ing, recipeCtx(r, milkId)), Object.assign({ label: r.name }, o));

  /* proportion bar under the cup */
  function mixBar(ing, milkId) {
    const v = visual(ing, { temp: "hot", milkId, layered: true });
    const tot = v.layers.reduce((s, l) => s + l.ml, 0);
    if (!tot) return "";
    return `<div class="mixbar" role="img" aria-label="Proportions of the liquid ingredients">` +
      v.layers.map((l) => `<span style="flex:${l.ml};background:${l.color}" title="${esc(D.types[l.t] ? D.types[l.t].label : l.t)} ${fv(l.ml)}"></span>`).join("") + `</div>`;
  }

  /* =============================================================== CATALOG */
  const HEART = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.1C.9 8.6 2.8 5 6.2 5c2 0 3.3 1 3.8 2 .5-1 1.8-2 3.8-2 3.4 0 5.3 3.6 3.8 6.9C19.500 16.400 12 21 12 21z" transform="translate(0 .5)"/></svg>`;
  const dots = (n) => `<span class="dots" aria-hidden="true">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</span>`;

  function cardHTML(r) {
    const st = STATS[r.id], fav = state.favs.has(r.id);
    return `<article class="card card--${r.temp}">
      <button class="fav ${fav ? "is-on" : ""}" type="button" data-fav="${r.id}" aria-pressed="${fav}" aria-label="${fav ? "Remove " : "Save "}${esc(r.name)} ${fav ? "from" : "to"} favourites">${HEART}</button>
      <div class="card__art">${recipeCup(r, null, { label: "" })}</div>
      <div class="card__body">
        <h3 class="card__title"><a class="card__link" href="#/coffee/${r.id}">${esc(r.name)}</a></h3>
        <p class="card__meta"><span class="pill pill--${r.temp}">${r.temp === "iced" ? "Iced" : "Hot"}</span><span>${fv(st.volume)}</span><span aria-hidden="true">·</span><span>${st.caffeine} mg</span></p>
        <p class="card__strength"><span class="sr-only">Intensity ${st.levelLabel}</span>${dots(st.level)}<span class="card__lvl">${st.levelLabel}</span></p>
      </div>
    </article>`;
  }

  const GROUPS = [
    ["all", "All"], ["classic", "Classics"], ["black", "Black"], ["milk", "With milk"],
    ["flavoured", "Flavoured"], ["spicy", "Spicy 🌶"], ["dessert", "Dessert"], ["fav", "♥ Saved"],
  ];
  const TEMPS = [["all", "Any"], ["hot", "🔥 Hot"], ["iced", "🧊 Iced"]];

  function renderChips() {
    $("#chips-temp").innerHTML = TEMPS.map(([v, l]) => `<button type="button" class="chip ${state.filter.temp === v ? "is-on" : ""}" data-temp="${v}" aria-pressed="${state.filter.temp === v}">${l}</button>`).join("");
    $("#chips-group").innerHTML = GROUPS.map(([v, l]) => `<button type="button" class="chip ${state.filter.group === v ? "is-on" : ""}" data-group="${v}" aria-pressed="${state.filter.group === v}">${l}</button>`).join("");
  }

  function filteredRecipes() {
    const f = state.filter, q = f.q.trim().toLowerCase();
    let list = D.recipes.filter((r) => {
      if (f.temp !== "all" && r.temp !== f.temp) return false;
      if (f.group === "fav") { if (!state.favs.has(r.id)) return false; }
      else if (f.group !== "all" && !groupsOf(r).has(f.group)) return false;
      if (q) {
        const hay = [r.name, r.alt, r.desc, r.origin || "", r.tags.join(" "), r.ing.map((i) => i.id ? (SYR[i.id] ? SYR[i.id].label : i.id) : (D.types[i.t] ? D.types[i.t].label : "")).join(" "), r.ing.filter((i) => i.t === "top" || i.t === "garnish").map((i) => i.kind).join(" ")].join(" ").toLowerCase();
        if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      return true;
    });
    const s = (r) => STATS[r.id];
    const by = {
      featured: null,
      name: (a, b) => a.name.localeCompare(b.name),
      strength: (a, b) => s(b).per100 - s(a).per100 || s(b).caffeine - s(a).caffeine,
      caffeine: (a, b) => s(b).caffeine - s(a).caffeine || s(b).per100 - s(a).per100,
      mild: (a, b) => s(a).per100 - s(b).per100,
      size: (a, b) => s(a).volume - s(b).volume,
      sizeDesc: (a, b) => s(b).volume - s(a).volume,
    }[f.sort];
    if (by) list = list.slice().sort(by);
    return list;
  }

  function renderCatalog() {
    const list = filteredRecipes();
    $("#grid").innerHTML = list.map(cardHTML).join("");
    $("#empty").hidden = list.length > 0;
    $("#count").textContent = list.length === D.recipes.length ? `${list.length} recipes` : `${list.length} of ${D.recipes.length} recipes`;
  }

  function renderHero() {
    const hot = D.recipes.filter((r) => r.temp === "hot").length, iced = D.recipes.length - hot;
    $("#hero-stats").innerHTML = [[D.recipes.length, "recipes"], [hot, "hot"], [iced, "iced"], [D.milks.length, "milks"], [D.syrups.length, "syrups"]]
      .map(([n, l]) => `<li><b>${n}</b><span>${l}</span></li>`).join("");
    $("#hero-art").innerHTML = `<div class="hero__cup hero__cup--a">${recipeCup(REC["cappuccino"])}</div><div class="hero__cup hero__cup--b">${recipeCup(REC["iced-caramel-macchiato"])}</div>`;
  }

  /* ============================================================ STRONGEST */
  function renderBoard() {
    const modes = [["intensity", "🔥 Most intense"], ["caffeine", "⚡ Most caffeine"], ["mild", "🌿 Gentlest"]];
    $("#board-mode").innerHTML = modes.map(([v, l]) => `<button type="button" class="seg__btn ${state.board.mode === v ? "is-on" : ""}" data-board-mode="${v}" aria-pressed="${state.board.mode === v}">${l}</button>`).join("");
    $("#board-temp").innerHTML = TEMPS.map(([v, l]) => `<button type="button" class="seg__btn ${state.board.temp === v ? "is-on" : ""}" data-board-temp="${v}" aria-pressed="${state.board.temp === v}">${l}</button>`).join("");

    const m = state.board.mode;
    let list = D.recipes.filter((r) => state.board.temp === "all" || r.temp === state.board.temp);
    const S = (r) => STATS[r.id];
    list.sort(m === "caffeine" ? (a, b) => S(b).caffeine - S(a).caffeine || S(b).per100 - S(a).per100
             : m === "intensity" ? (a, b) => S(b).per100 - S(a).per100 || S(b).caffeine - S(a).caffeine
             : (a, b) => S(a).per100 - S(b).per100 || S(a).caffeine - S(b).caffeine);
    const shown = state.board.all ? list : list.slice(0, 15);
    const max = Math.max(...list.map((r) => m === "caffeine" ? S(r).caffeine : S(r).per100)) || 1;
    $("#board").innerHTML = shown.map((r, idx) => {
      const st = S(r), val = m === "caffeine" ? st.caffeine : st.per100;
      const pct = clamp(val / max * 100, 3, 100);
      const valTxt = m === "caffeine" ? `${st.caffeine} mg` : `${Math.round(st.per100)} mg/100 ml`;
      const sub = m === "caffeine" ? `${Math.round(st.per100)} mg/100 ml · ${fv(st.volume)}` : `${st.caffeine} mg caffeine · ${fv(st.volume)}`;
      return `<li class="row ${idx < 3 && m !== "mild" ? "row--top" : ""}">
        <span class="row__rank">${idx + 1}</span>
        <span class="row__art">${recipeCup(r, null, { label: "", noSteam: true })}</span>
        <div class="row__main">
          <a class="row__name" href="#/coffee/${r.id}">${esc(r.name)}</a>
          <span class="row__sub"><span class="pill pill--${r.temp}">${r.temp === "iced" ? "Iced" : "Hot"}</span><span class="row__more">${sub}</span></span>
          <span class="bar"><i style="width:${pct}%"></i></span>
        </div>
        <span class="row__val"><b>${valTxt}</b><small>${st.levelLabel}</small></span>
      </li>`;
    }).join("") + (list.length > 15 ? `<li class="board__more"><button type="button" class="btn btn--ghost" data-action="board-more">${state.board.all ? "Show top 15" : `Show all ${list.length}`}</button></li>` : "");
  }

  /* ============================================================ DETAIL */
  const srcLinks = (keys) => (keys || []).map((k) => D.sources[k]).filter(Boolean)
    .map((s) => `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${esc(s.title.split(" — ")[0])}</a>`).join(" · ");

  function openDetail(id) {
    const r = REC[id];
    if (!r) return;
    if (!state.detail || state.detail.id !== id) state.detail = { id, milkId: r.milk || "whole", decaf: false };
    renderDetail();
    const dlg = $("#detail");
    if (!dlg.open) { try { dlg.showModal(); } catch (e) { dlg.setAttribute("open", ""); } focusSheet(dlg); }
    document.title = r.name + " · Dedica Coffee Catalog";
  }

  function renderDetail(keepScroll) {
    const { id, milkId, decaf } = state.detail;
    const r = REC[id];
    const dlg = $("#detail");
    const prev = $(".sheet__scroll", dlg);
    const scrollTop = keepScroll && prev ? prev.scrollTop : 0;
    const ctx = Object.assign(recipeCtx(r, milkId), { shots: r.shots });
    const st = statsR(r, decaf);
    const rows = ingredientRows(r.ing, ctx);
    const steps = makeSteps(r.ing, ctx);
    const milk = MILK[milkId];
    const b = BASIS[r.basis];
    const fav = state.favs.has(r.id);
    const milkChoice = usesMilkChoice(r.ing);

    dlg.innerHTML = `
      <div class="sheet__bar">
        <span class="sheet__grab" aria-hidden="true"></span>
        <button class="iconbtn" type="button" data-action="close-detail" aria-label="Close">✕</button>
      </div>
      <div class="sheet__scroll">
        <div class="detail">
          <div class="detail__art detail__art--${r.temp}">
            <div class="detail__cup">${cupSVG(visual(r.ing, ctx), { label: r.name })}</div>
            ${mixBar(r.ing, milkId)}
            <p class="detail__cap">${fv(st.volume)} in a ${VESSEL_NAME[visual(r.ing, ctx).kind]}</p>
          </div>
          <div class="detail__main">
            <p class="eyebrow">${esc([r.origin, r.alt].filter(Boolean).join(" · ") || (r.temp === "iced" ? "Iced coffee" : "Hot coffee"))}</p>
            <h2 class="detail__title">${esc(r.name)}</h2>
            <p class="lead">${esc(r.desc)}</p>
            <div class="badges">
              <span class="pill pill--${r.temp}">${r.temp === "iced" ? "🧊 Iced" : "🔥 Hot"}</span>
              <span class="badge"><b>${fv(st.volume)}</b> total</span>
              <span class="badge"><b>${st.caffeine} mg</b> caffeine${decaf ? " (decaf)" : ""}</span>
              <span class="badge" title="${Math.round(st.per100)} mg per 100 ml">${dots(st.level)} ${st.levelLabel}</span>
              <span class="badge badge--basis" title="${esc(b.tip)}">${esc(b.short)}</span>
            </div>

            ${milkChoice ? `<div class="variation"><h3>Milk</h3>
              <div class="chips chips--wrap" role="group" aria-label="Choose a milk">${D.milks.map((m) => `<button type="button" class="chip ${m.id === milkId ? "is-on" : ""}" data-detail-milk="${m.id}" aria-pressed="${m.id === milkId}">${esc(m.short)}</button>`).join("")}</div>
              <p class="variation__note">${esc(milk.note)}${milk.dairy ? "" : " <b>Dairy-free.</b>"}</p></div>` : ""}
            <label class="switch"><input type="checkbox" data-detail-decaf ${decaf ? "checked" : ""}><span class="switch__ui" aria-hidden="true"></span><span>Use decaf beans</span></label>

            <h3>Ingredients</h3>
            <ul class="ingredients">${rows.map((x) => `<li><span class="dot" style="background:${x.color}"></span><span class="ingredients__name">${esc(x.label)}${x.detail ? ` <small>${esc(x.detail)}</small>` : ""}</span><span class="ingredients__amt">${esc(x.amount)}</span></li>`).join("")}</ul>
            ${milkChoice && !milk.dairy ? `<p class="hint">🌱 <b>${esc(milk.label)}:</b> ${esc(milk.steam)}</p>` : ""}

            <h3>Make it on the Dedica</h3>
            <ol class="steps">${steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>

            <div class="tipbox"><span aria-hidden="true">💡</span><p><b>Barista tip.</b> ${esc(r.tip)}</p></div>

            <div class="actions">
              <button class="btn btn--accent" type="button" data-action="customise" data-id="${r.id}">🎛 Customise this</button>
              <button class="btn btn--ghost ${fav ? "is-on" : ""}" type="button" data-fav="${r.id}" aria-pressed="${fav}">${fav ? "♥ Saved" : "♡ Save"}</button>
              <button class="btn btn--ghost" type="button" data-action="share">🔗 Share</button>
            </div>
            <p class="srcline"><b>${esc(b.label)}.</b> Sources: ${srcLinks(r.src) || "—"}</p>
          </div>
        </div>
      </div>`;
    const sc = $(".sheet__scroll", dlg);
    if (sc && scrollTop) sc.scrollTop = scrollTop;
  }
  function focusSheet(dlg) { const sc = $(".sheet__scroll", dlg); if (sc) { sc.setAttribute("tabindex", "-1"); sc.focus({ preventScroll: true }); } }
  const VESSEL_NAME = { demi: "espresso cup", short: "small glass", cup: "cup", mug: "large cup", tall: "tall glass" };

  function closeDetail() {
    const dlg = $("#detail");
    if (dlg.open) dlg.close();
  }

  /* ================================================================= TIPS */
  function renderTips() {
    const dlg = $("#tips");
    const cur = D.tips.find((t) => t.id === state.tipTab) || D.tips[0];
    dlg.innerHTML = `
      <div class="sheet__bar">
        <span class="sheet__grab" aria-hidden="true"></span>
        <h2 class="sheet__title">Tips &amp; tricks</h2>
        <button class="iconbtn" type="button" data-action="close-tips" aria-label="Close tips">✕</button>
      </div>
      <div class="tabs" role="tablist" aria-label="Tip topics">${D.tips.map((t) => `<button role="tab" type="button" class="tab ${t.id === cur.id ? "is-on" : ""}" aria-selected="${t.id === cur.id}" data-tip="${t.id}"><span aria-hidden="true">${t.icon}</span> ${esc(t.title.replace(/ &.*|:.*$/, ""))}</button>`).join("")}</div>
      <div class="sheet__scroll" role="tabpanel">
        <div class="tips">
          <h3 class="tips__title"><span aria-hidden="true">${cur.icon}</span> ${esc(cur.title)}</h3>
          <p class="lead">${esc(cur.intro)}</p>
          <ol class="tips__list">${cur.items.map((it) => `<li><h4>${esc(it.h)}</h4><p>${esc(it.p)}</p></li>`).join("")}</ol>
          ${cur.id === "milks" ? `<div class="milk-table"><h4>Milk cheat-sheet</h4>${D.milks.map((m) => `<div class="milk-row"><span class="dot" style="background:${m.color}"></span><b>${esc(m.label)}</b><span class="foam" title="Foam quality">${dots(m.foam)}</span><small>${esc(m.steam)}</small></div>`).join("")}</div>` : ""}
        </div>
      </div>`;
  }

  /* ================================================================ GUIDE */
  function renderGuide() {
    const src = D.sources;
    const cheat = [
      ["1 espresso shot", `${fv(C.shotMl)} (7 g coffee)`], ["Double shot", `${fv(C.shotMl * 2)} (14 g coffee)`],
      ["1 syrup pump", `≈ ${fv(C.pumpMl)}`], ["Syrup per 240 ml drink", `≈ ${fv(20)} (2 pumps)`],
      ["Milk temperature", "55–65 °C (131–149 °F)"], ["1 fl oz", "29.57 ml"], ["Ice, 350 ml glass", "≈ 150 g"], ["Cappuccino / flat white", "150–180 ml"],
    ];
    $("#guide").innerHTML = `
      <div class="guide-grid">
        <section class="panel"><h3>🔧 Your machine — ${esc(D.machine.name)}</h3>
          <dl class="specs">${D.machine.specs.map((s) => `<div><dt>${esc(s.k)}</dt><dd>${esc(s.v)}</dd></div>`).join("")}</dl>
          <p class="hint">${esc(D.machine.note)}</p></section>
        <section class="panel"><h3>📏 Quick conversions</h3>
          <dl class="specs">${cheat.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
          <button class="btn btn--ghost btn--sm" type="button" data-action="units">Switch to ${state.units === "ml" ? "fl oz" : "ml"}</button></section>
        <section class="panel panel--wide"><h3>📚 Official standards &amp; reference numbers</h3>
          <div class="table" role="table" aria-label="Standards">${D.standards.map((s) => `<div class="table__row" role="row"><span role="cell">${esc(s.k)}</span><b role="cell">${esc(s.v)}</b><a role="cell" href="${src[s.src].url}" target="_blank" rel="noopener noreferrer">${esc(src[s.src].title.split(" — ")[0])}</a></div>`).join("")}</div></section>
        <section class="panel panel--wide"><h3>🏷 How solid is each recipe?</h3>
          <ul class="basis">${Object.values(BASIS).map((b) => `<li><b>${esc(b.short)}</b> — ${esc(b.tip)}</li>`).join("")}</ul>
          <p class="hint">Only espresso, ristretto and lungo have an official definition. Milk drinks vary by café, so recipes use published ratios (SCA / Coffee Bros) as their base. Flavoured drinks add syrup at the standard ≈ 20 ml per 240 ml, and “creative” drinks are popular modern recipes.</p></section>
        <section class="panel panel--wide"><h3>🔗 Sources</h3>
          <ul class="sources">${Object.values(src).map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a><span>${esc(s.note)}</span></li>`).join("")}</ul></section>
      </div>`;
  }

  /* ============================================================== BUILDER */
  const ICE_LEVELS = { none: 0, light: 80, normal: 150, lots: 220 };
  const SHOT_ML = { normal: C.shotMl, ristretto: 17, lungo: 45 };

  function defaultBuilder() {
    return { temp: "hot", shots: 2, style: "normal", decaf: false, milk: 170, foam: 30, cold: 0, water: 0, ice: "normal", milkId: "whole", order: "e", fl: [{ id: "", p: 0 }, { id: "", p: 0 }], tops: [] };
  }

  function bIngredients(b) {
    const hot = b.temp === "hot";
    const ing = [];
    const flavours = b.fl.filter((f) => f.id && f.p > 0).map((f) => (f.id === "condensed" ? SA(f) : SY(f)));
    function SY(f) { return { t: SYR[f.id].kind === "sauce" ? "sauce" : "syrup", id: f.id, ml: f.p * C.pumpMl }; }
    function SA(f) { return { t: "sauce", id: f.id, ml: f.p * C.pumpMl }; }
    const esp = { t: "espresso", ml: Math.round(b.shots * SHOT_ML[b.style]) };
    const milk = b.milk > 0 ? { t: "milk", ml: b.milk } : null;
    const splash = hot && b.cold > 0 ? { t: "milk", ml: b.cold, raw: true } : null;
    const foam = b.foam > 0 ? { t: hot ? "foam" : "coldfoam", ml: b.foam } : null;
    const water = b.water > 0 ? { t: "water", ml: b.water } : null;
    const ice = !hot && ICE_LEVELS[b.ice] > 0 ? { t: "ice", g: ICE_LEVELS[b.ice] } : null;
    ing.push(...flavours);
    if (b.order === "m") { if (ice) ing.push(ice); if (splash) ing.push(splash); if (milk) ing.push(milk); if (water) ing.push(water); ing.push(esp); if (foam) ing.push(foam); }
    else { ing.push(esp); if (water) ing.push(water); if (ice) ing.push(ice); if (splash) ing.push(splash); if (milk) ing.push(milk); if (foam) ing.push(foam); }
    b.tops.forEach((k) => ing.push({ t: "top", kind: k }));
    return ing;
  }
  const bCtx = (b) => ({ temp: b.temp, milkId: b.milkId, layered: b.order === "m", blend: b.order === "e" && !b.milk && !b.foam, shots: b.shots, seed: "builder" });

  /* how close is the user's drink to each catalog recipe? */
  function profile(ing) {
    const p = { esp: 0, milk: 0, foam: 0, water: 0, flav: new Set() };
    ing.forEach((i) => {
      if (i.t === "espresso") p.esp += i.ml; else if (i.t === "milk") p.milk += i.ml;
      else if (i.t === "foam" || i.t === "coldfoam") p.foam += i.ml; else if (i.t === "water") p.water += i.ml;
      else if ((i.t === "syrup" && i.id !== "sugar") || i.t === "sauce") p.flav.add(i.id);
      else if (i.t === "condensed") p.flav.add("condensed");
      else if (i.t === "chai") p.flav.add("chai");
    });
    return p;
  }
  const PROFILES = {}; D.recipes.forEach((r) => { PROFILES[r.id] = profile(r.ing); });
  const isBase = (r) => r.ing.every((i) => ["espresso", "milk", "foam", "coldfoam", "water", "ice", "top", "garnish"].includes(i.t));

  function score(a, r, withFlavour) {
    const p = PROFILES[r.id];
    const keys = ["esp", "milk", "foam", "water"];
    let l1 = 0, tot = 0;
    keys.forEach((k) => { l1 += Math.abs(a[k] - p[k]); tot += a[k] + p[k]; });
    let s = tot ? 1 - l1 / tot : 0;
    if (withFlavour) {
      const inter = [...a.flav].filter((x) => p.flav.has(x)).length;
      const union = new Set([...a.flav, ...p.flav]).size;
      if (union) { const j = inter / union; s += 0.12 * j - 0.08 * (1 - j); }
    }
    return clamp(s, 0, 1);
  }

  function analyse(b) {
    const ing = bIngredients(b);
    const a = profile(ing);
    const iced = b.temp === "iced";
    const pen = (r) => (r.temp === b.temp ? 0 : 0.25);
    const ranked = D.recipes.map((r) => ({ r, s: clamp(score(a, r, true) - pen(r), 0, 1) })).sort((x, y) => y.s - x.s);
    const bases = D.recipes.filter(isBase).map((r) => ({ r, s: clamp(score(a, r, false) - pen(r), 0, 1) })).sort((x, y) => y.s - x.s);
    const flavLabels = [...a.flav].filter((x) => x !== "chai").map((x) => SYR[x] ? SYR[x].label.replace(/\s*\(.*\)/, "").replace(/ sauce$/i, "").replace(/^Sweetened condensed milk$/i, "Condensed milk") : x);
    let name;
    const top = ranked[0];
    const sameFlav = top && [...a.flav].sort().join() === [...PROFILES[top.r.id].flav].sort().join();
    if (top && top.s >= 0.86 && sameFlav && top.r.temp === b.temp) name = top.r.name.replace(/ \(0 %\)/, "");
    else if (bases[0] && bases[0].s >= 0.5) {
      const base = bases[0].r.name.replace(/^Iced /, "").replace(/^Caffè /, "");
      name = [iced ? "Iced" : "", flavLabels.join(" & "), base].filter(Boolean).join(" ");
    } else name = [iced ? "Iced" : "", flavLabels.join(" & "), "Custom coffee"].filter(Boolean).join(" ");
    return { ing, name, ranked: ranked.slice(0, 3), match: top };
  }

  function builderHTML() {
    const b = state.builder;
    const grouped = {};
    D.syrups.forEach((s) => { (grouped[s.group] = grouped[s.group] || []).push(s); });
    const flavOptions = `<option value="">— none —</option>` + Object.keys(grouped).map((g) => `<optgroup label="${esc(g)}">${grouped[g].map((s) => `<option value="${s.id}">${esc(s.label)}</option>`).join("")}</optgroup>`).join("");
    const seg = (name, opts) => `<div class="seg" role="group" data-seg="${name}">${opts.map(([v, l, d]) => `<button type="button" class="seg__btn" data-b="${name}" data-v="${v}" aria-pressed="false">${l}${d ? `<small>${d}</small>` : ""}</button>`).join("")}</div>`;
    const slider = (name, labelHtml, aria, max, hint) => `<div class="slider"><label for="b-${name}"><span>${labelHtml}</span><output id="o-${name}"></output></label>
      <div class="slider__row"><button type="button" class="step" data-step="${name}" data-d="-10" aria-label="Less ${aria}">−</button><input id="b-${name}" type="range" min="0" max="${max}" step="10" data-range="${name}"><button type="button" class="step" data-step="${name}" data-d="10" aria-label="More ${aria}">+</button></div>
      ${hint ? `<p class="slider__hint">${hint}</p>` : ""}</div>`;
    return `
      <div class="builder__preview">
        <div class="preview">
          <div class="preview__art" id="b-art"></div>
          <div class="preview__info">
            <h3 id="b-name" aria-live="polite"></h3>
            <p class="preview__sub" id="b-sub"></p>
            <div id="b-mix"></div>
            <div class="badges" id="b-badges"></div>
            <div class="preview__actions">
              <button class="btn btn--accent btn--sm" type="button" data-action="b-save">♡ Save</button>
              <button class="btn btn--ghost btn--sm" type="button" data-action="share">🔗 Share</button>
              <button class="btn btn--ghost btn--sm" type="button" data-action="b-random">🎲 Surprise me</button>
              <button class="btn btn--ghost btn--sm" type="button" data-action="b-reset">↺ Reset</button>
            </div>
          </div>
        </div>
      </div>

      <div class="builder__panel">
        <div class="ctl">
          <h3><span class="num">0</span> Start from a classic <small>(optional)</small></h3>
          <div class="chips chips--wrap">${["espresso", "cappuccino", "flat-white", "latte", "americano", "mocha", "iced-latte", "iced-americano", "vanilla-latte", "espresso-tonic"].map((id) => `<button class="chip" type="button" data-preset="${id}">${esc(REC[id].name.replace("Caffè ", ""))}</button>`).join("")}</div>
        </div>
        <div class="ctl"><h3><span class="num">1</span> Hot or iced?</h3>${seg("temp", [["hot", "🔥 Hot"], ["iced", "🧊 Iced"]])}</div>
        <div class="ctl"><h3><span class="num">2</span> Espresso</h3>
          ${seg("shots", [["1", "1 shot", "25 ml"], ["2", "2 shots", "50 ml"]])}
          <div class="ctl__sub"><span class="ctl__label">Pull style</span>${seg("style", [["normal", "Normal"], ["ristretto", "Ristretto", "short"], ["lungo", "Lungo", "long"]])}</div>
          <label class="switch"><input type="checkbox" id="b-decaf"><span class="switch__ui" aria-hidden="true"></span><span>Decaf beans</span></label>
        </div>
        <div class="ctl"><h3><span class="num">3</span> Milk &amp; water</h3>
          <div class="chips chips--wrap" role="group" aria-label="Milk type">${D.milks.map((m) => `<button type="button" class="chip" data-b="milkId" data-v="${m.id}" aria-pressed="false">${esc(m.short)}</button>`).join("")}</div>
          <p class="hint" id="b-milknote"></p>
          <div id="w-cold">${slider("cold", "Cold milk splash <small>(not steamed)</small>", "cold milk", 150, "A splash straight from the fridge, added to the espresso.")}</div>
          ${slider("milk", '<span id="l-milk">Steamed milk</span>', "milk", 300)}
          ${slider("foam", '<span id="l-foam">Milk foam</span>', "foam", 150)}
          ${slider("water", '<span id="l-water">Hot water</span>', "water", 200, "For an americano-style drink.")}
          <div class="ctl__sub"><span class="ctl__label">Build order</span>${seg("order", [["e", "Espresso first", "mixed"], ["m", "Milk first", "layered"]])}</div>
        </div>
        <div class="ctl" id="ctl-ice"><h3><span class="num">4</span> Ice</h3>${seg("ice", [["none", "None"], ["light", "Light", "80 g"], ["normal", "Normal", "150 g"], ["lots", "Lots", "220 g"]])}</div>
        <div class="ctl"><h3><span class="num">5</span> Syrups &amp; sauces <small>1 pump ≈ 10 ml</small></h3>
          ${[0, 1].map((n) => `<div class="flav"><select id="b-fl${n}" data-flav="${n}" aria-label="Flavour ${n + 1}">${flavOptions}</select>
            <div class="seg seg--sm" role="group" aria-label="Pumps of flavour ${n + 1}">${[1, 2, 3, 4].map((p) => `<button type="button" class="seg__btn" data-pump="${n}" data-v="${p}" aria-pressed="false">${p}</button>`).join("")}</div></div>`).join("")}
          <p class="hint" id="b-flavnote"></p>
        </div>
        <div class="ctl"><h3><span class="num">6</span> Toppings</h3>
          <div class="chips chips--wrap" role="group" aria-label="Toppings">${D.toppings.map((t) => `<button type="button" class="chip" data-top="${t.id}" aria-pressed="false">${esc(t.label)}${t.spicy ? " 🌶" : ""}</button>`).join("")}</div>
        </div>

        <div class="ctl ctl--result">
          <h3>Your recipe</h3>
          <div id="b-ingredients"></div>
          <h4>Make it on the Dedica</h4>
          <ol class="steps" id="b-steps"></ol>
          <h4>Closest classics</h4>
          <div class="match" id="b-match"></div>
          <div id="b-saved-wrap"></div>
        </div>
      </div>`;
  }

  function ensureBuilder() {
    if (state.builderBuilt) return;
    $("#builder").innerHTML = builderHTML();
    state.builderBuilt = true;
  }

  function updateBuilder(opts) {
    ensureBuilder();
    opts = opts || {};
    const b = state.builder, hot = b.temp === "hot";
    const info = analyse(b);
    const ctx = bCtx(b);
    const st = statsOf(info.ing, b.shots * (b.style === "lungo" ? 1.25 : 1), b.decaf);
    const milk = MILK[b.milkId];

    /* controls */
    $$('[data-b="temp"]').forEach((el) => setOn(el, el.dataset.v === b.temp));
    $$('[data-b="shots"]').forEach((el) => setOn(el, +el.dataset.v === b.shots));
    $$('[data-b="style"]').forEach((el) => setOn(el, el.dataset.v === b.style));
    $$('[data-b="order"]').forEach((el) => setOn(el, el.dataset.v === b.order));
    $$('[data-b="ice"]').forEach((el) => setOn(el, el.dataset.v === b.ice));
    $$('[data-b="milkId"]').forEach((el) => setOn(el, el.dataset.v === b.milkId));
    $("#b-decaf").checked = b.decaf;
    $("#ctl-ice").hidden = hot;
    $("#l-milk").textContent = hot ? "Steamed milk" : "Cold milk";
    $("#l-foam").textContent = hot ? "Milk foam" : "Cold foam";
    $("#l-water").textContent = hot ? "Hot water" : "Cold water";
    $("#w-cold").hidden = !hot;
    ["cold", "milk", "foam", "water"].forEach((k) => { const el = $("#b-" + k); el.value = b[k]; $("#o-" + k).textContent = b[k] ? fv(b[k]) : "none"; el.style.setProperty("--pct", (b[k] / el.max * 100) + "%"); });
    $$("[data-flav]").forEach((el) => { el.value = b.fl[+el.dataset.flav].id; });
    $$("[data-pump]").forEach((el) => { const f = b.fl[+el.dataset.pump]; setOn(el, f.id && f.p === +el.dataset.v); el.disabled = !f.id; });
    $$("[data-top]").forEach((el) => setOn(el, b.tops.includes(el.dataset.top)));
    $("#b-milknote").textContent = (b.milk || b.foam || (hot && b.cold)) ? milk.note : "";
    const fset = b.fl.filter((f) => f.id && f.p);
    const fm = fset.reduce((s, f) => s + f.p * C.pumpMl, 0);
    $("#b-flavnote").textContent = fset.length ? `${fm} ml of flavouring in ≈ ${Math.round(st.volume)} ml — ${fm / st.volume * 240 > 32 ? "that’s on the sweet side" : "a balanced dose"} (standard ≈ 20 ml per 240 ml).` : "";

    /* preview */
    const vis = visual(info.ing, ctx);
    $("#b-art").className = "preview__art preview__art--" + b.temp;
    $("#b-art").innerHTML = cupSVG(vis, { label: info.name });
    $("#b-name").textContent = info.name;
    $("#b-sub").textContent = `${fv(st.volume)} in a ${VESSEL_NAME[vis.kind]}${vis.cap < st.volume + iceOf(info.ing) * .5 ? " — overflowing!" : ""}`;
    $("#b-mix").innerHTML = mixBar(info.ing, b.milkId);
    $("#b-badges").innerHTML = `<span class="badge"><b>${st.caffeine} mg</b> caffeine</span><span class="badge">${dots(st.level)} ${st.levelLabel}</span>` +
      (fset.length ? `<span class="badge">🍯 ${fm} ml syrup</span>` : "") + (b.tops.some((t) => TOPS[t].spicy) || fset.some((f) => SYR[f.id].spicy) ? `<span class="badge">🌶 spiced</span>` : "") + (milk.dairy || !(b.milk || b.foam) ? "" : `<span class="badge">🌱 dairy-free milk</span>`);

    /* recipe card */
    const rows = ingredientRows(info.ing, ctx);
    $("#b-ingredients").innerHTML = `<ul class="ingredients">${rows.map((x) => `<li><span class="dot" style="background:${x.color}"></span><span class="ingredients__name">${esc(x.label)}${x.detail ? ` <small>${esc(x.detail)}</small>` : ""}</span><span class="ingredients__amt">${esc(x.amount)}</span></li>`).join("")}</ul>`;
    $("#b-steps").innerHTML = makeSteps(info.ing, ctx).map((s) => `<li>${esc(s)}</li>`).join("");
    $("#b-match").innerHTML = info.ranked.map((m) => `<a class="match__item" href="#/coffee/${m.r.id}"><span class="match__art">${recipeCup(m.r, null, { label: "", noSteam: true })}</span><span><b>${esc(m.r.name)}</b><small>${Math.round(m.s * 100)}% similar</small></span></a>`).join("");
    renderSaved();

    if (!opts.noHash) { try { history.replaceState(null, "", "#/builder?" + encodeBuilder(b)); } catch (e) { /* file:// */ } }
    const saveBtn = $('[data-action="b-save"]');
    if (saveBtn) { const isSaved = state.saved.some((s) => s.q === encodeBuilder(b)); saveBtn.textContent = isSaved ? "♥ Saved" : "♡ Save"; }
    state.builderInfo = info;
  }
  const setOn = (el, on) => { el.classList.toggle("is-on", !!on); el.setAttribute("aria-pressed", String(!!on)); };

  function renderSaved() {
    const w = $("#b-saved-wrap");
    if (!state.saved.length) { w.innerHTML = ""; return; }
    w.innerHTML = `<h4>Your saved drinks</h4><div class="chips chips--wrap">${state.saved.map((s, i) => `<span class="chip chip--saved"><button type="button" data-load-saved="${i}">${esc(s.name)}</button><button type="button" class="chip__x" data-del-saved="${i}" aria-label="Delete ${esc(s.name)}">✕</button></span>`).join("")}</div>`;
  }

  /* builder <-> URL */
  function encodeBuilder(b) {
    const p = new URLSearchParams();
    p.set("t", b.temp); p.set("s", b.shots); p.set("st", b.style); if (b.decaf) p.set("d", 1);
    p.set("m", b.milk); p.set("f", b.foam); if (b.cold) p.set("c", b.cold); p.set("w", b.water); p.set("i", b.ice); p.set("mk", b.milkId); p.set("o", b.order);
    const fl = b.fl.filter((f) => f.id && f.p).map((f) => f.id + ":" + f.p).join(","); if (fl) p.set("fl", fl);
    if (b.tops.length) p.set("tp", b.tops.join(","));
    return p.toString();
  }
  function decodeBuilder(qs) {
    const p = new URLSearchParams(qs), b = defaultBuilder();
    const pick = (v, list, d) => (list.includes(v) ? v : d);
    b.temp = pick(p.get("t"), ["hot", "iced"], b.temp);
    b.shots = pick(p.get("s"), ["1", "2"], "2") === "1" ? 1 : 2;
    b.style = pick(p.get("st"), Object.keys(SHOT_ML), "normal");
    b.decaf = p.get("d") === "1";
    ["m", "f", "w"].forEach((k, n) => { const key = ["milk", "foam", "water"][n]; if (p.has(k)) b[key] = clamp(Math.round((+p.get(k) || 0) / 10) * 10, 0, key === "foam" ? 150 : key === "water" ? 200 : 300); else if (key === "water") b[key] = 0; });
    b.cold = clamp(Math.round((+p.get("c") || 0) / 10) * 10, 0, 150);
    b.ice = pick(p.get("i"), Object.keys(ICE_LEVELS), "normal");
    b.milkId = MILK[p.get("mk")] ? p.get("mk") : "whole";
    b.order = pick(p.get("o"), ["e", "m"], "e");
    (p.get("fl") || "").split(",").filter(Boolean).slice(0, 2).forEach((x, n) => { const [id, pp] = x.split(":"); if (SYR[id]) b.fl[n] = { id, p: clamp(+pp || 1, 1, 4) }; });
    b.tops = (p.get("tp") || "").split(",").filter((t) => TOPS[t]);
    return b;
  }

  function builderFromRecipe(r) {
    const b = defaultBuilder();
    b.temp = r.temp;
    b.shots = r.shots >= 1.5 ? 2 : 1;
    const esp = sumT(r.ing, "espresso"), per = esp / b.shots;
    b.style = per < C.shotMl * .85 ? "ristretto" : per > C.shotMl * 1.5 ? "lungo" : "normal";
    b.milk = sumT(r.ing, "milk"); b.foam = sumT(r.ing, "foam") + sumT(r.ing, "coldfoam"); b.water = sumT(r.ing, "water");
    b.milkId = r.milk || "whole";
    b.ice = iceOf(r.ing) ? (iceOf(r.ing) <= 100 ? "light" : iceOf(r.ing) >= 200 ? "lots" : "normal") : (r.temp === "iced" ? "none" : "normal");
    const ei = r.ing.findIndex((i) => i.t === "espresso"), mi = r.ing.findIndex((i) => i.t === "milk");
    b.order = r.layered && mi >= 0 && mi < ei ? "m" : r.layered && r.temp === "iced" ? "m" : "e";
    let n = 0;
    r.ing.forEach((i) => {
      if ((i.t === "syrup" || i.t === "sauce") && n < 2) { b.fl[n++] = { id: i.id, p: clamp(Math.round(i.ml / C.pumpMl), 1, 4) }; }
      else if (i.t === "condensed" && n < 2) { b.fl[n++] = { id: "condensed", p: clamp(Math.round(i.ml / C.pumpMl), 1, 4) }; }
    });
    b.tops = r.ing.filter((i) => i.t === "top").map((i) => i.kind);
    const dropped = r.ing.filter((i) => ["tonic", "oj", "lemonade", "lime", "soda", "chai", "cremafoam", "icecream"].includes(i.t));
    return { b, dropped };
  }

  function randomBuilder() {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const b = defaultBuilder();
    b.temp = Math.random() < .4 ? "iced" : "hot";
    b.shots = pick([1, 2, 2]); b.style = pick(["normal", "normal", "ristretto", "lungo"]);
    b.milk = pick([0, 60, 110, 150, 170, 200]); b.foam = b.milk ? pick([0, 20, 30, 50]) : 0;
    b.water = b.milk ? 0 : pick([0, 100, 130]);
    b.milkId = pick(D.milks.map((m) => m.id));
    b.order = pick(["e", "m"]); b.ice = pick(["light", "normal", "normal", "lots"]);
    const fl = D.syrups.filter((s) => s.id !== "sugar");
    b.fl[0] = { id: pick(fl).id, p: pick([1, 2, 2, 3]) };
    if (Math.random() < .3) b.fl[1] = { id: pick(fl).id, p: 1 };
    b.tops = Math.random() < .5 ? [pick(D.toppings).id] : [];
    return b;
  }

  /* ============================================================ ROUTING */
  const VIEW_TITLES = { catalog: "Dedica Coffee Catalog", strongest: "Strongest coffees · Dedica Coffee Catalog", builder: "Build your own coffee · Dedica Coffee Catalog", guide: "Guide & sources · Dedica Coffee Catalog" };

  function showView(name) {
    state.view = name;
    $$(".view").forEach((v) => { v.hidden = v.dataset.view !== name; });
    $$("[data-nav]").forEach((a) => { const on = a.dataset.nav === name; a.classList.toggle("is-on", on); if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    document.title = VIEW_TITLES[name];
  }

  function route() {
    const raw = location.hash || "#/catalog";
    const [pathPart, query] = raw.slice(2).split("?");
    const parts = pathPart.split("/");
    const head = parts[0] || "catalog";

    if (head === "coffee" && REC[parts[1]]) {
      if (!$(".view:not([hidden])")) showView("catalog");
      openDetail(parts[1]);
      return;
    }
    const wasOpen = $("#detail").open;
    if (wasOpen) closeDetail();
    if (!VIEW_TITLES[head]) { location.replace("#/catalog"); return; }

    const changed = state.view !== head || !$(".view:not([hidden])");
    showView(head);
    state.lastView = "#/" + head + (head === "builder" && query ? "?" + query : "");
    if (head === "builder") {
      ensureBuilder();
      if (query) state.builder = decodeBuilder(query);
      updateBuilder({ noHash: !!query });
    }
    if (head === "strongest") renderBoard();
    if (head === "guide") renderGuide();
    if (changed && !wasOpen) window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  /* ============================================================== EVENTS */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("is-on");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("is-on"), 2400);
  }

  function toggleFav(id) {
    if (state.favs.has(id)) state.favs.delete(id); else state.favs.add(id);
    store.set("favs", [...state.favs]);
    toast(state.favs.has(id) ? `Saved “${REC[id].name}” ♥` : "Removed from saved");
    $$(`[data-fav="${id}"]`).forEach((el) => { const on = state.favs.has(id); el.classList.toggle("is-on", on); el.setAttribute("aria-pressed", String(on)); if (el.classList.contains("btn")) el.textContent = on ? "♥ Saved" : "♡ Save"; });
    if (state.filter.group === "fav") renderCatalog();
  }

  function copyLink() {
    const url = location.href;
    const done = () => toast("Link copied — send it to a friend!");
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => toast(url));
    else toast(url);
  }

  function setTheme(next) {
    document.documentElement.setAttribute("data-theme", next);
    store.set("theme", next);
  }
  const currentTheme = () => document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  function refreshAll() {
    $("[data-units-label]").textContent = state.units === "oz" ? "oz" : "ml";
    renderCatalog();
    if (state.view === "strongest") renderBoard();
    if (state.view === "guide") renderGuide();
    if (state.view === "builder") updateBuilder();
    if ($("#detail").open && state.detail) renderDetail(true);
  }

  function bind() {
    document.addEventListener("click", (e) => {
      const t = e.target.closest("button, [data-tip], a");
      if (!t) return;
      const d = t.dataset;

      if (d.fav) { toggleFav(d.fav); return; }
      if (d.temp) { state.filter.temp = d.temp; renderChips(); renderCatalog(); return; }
      if (d.group) { state.filter.group = d.group; renderChips(); renderCatalog(); return; }
      if (d.boardMode) { state.board.mode = d.boardMode; renderBoard(); return; }
      if (d.boardTemp) { state.board.temp = d.boardTemp; renderBoard(); return; }
      if (d.detailMilk) { state.detail.milkId = d.detailMilk; renderDetail(true); return; }
      if (d.tip) { state.tipTab = d.tip; renderTips(); return; }
      if (d.preset) { const { b } = builderFromRecipe(REC[d.preset]); state.builder = b; updateBuilder(); return; }
      if (d.loadSaved) { state.builder = decodeBuilder(state.saved[+d.loadSaved].q); updateBuilder(); toast("Loaded"); return; }
      if (d.delSaved) { state.saved.splice(+d.delSaved, 1); store.set("saved", state.saved); updateBuilder(); return; }
      if (d.top) { const i = state.builder.tops.indexOf(d.top); if (i >= 0) state.builder.tops.splice(i, 1); else state.builder.tops.push(d.top); updateBuilder(); return; }
      if (d.pump !== undefined) { const f = state.builder.fl[+d.pump]; f.p = +d.v; updateBuilder(); return; }
      if (d.step) { const k = d.step, el = $("#b-" + k); state.builder[k] = clamp(state.builder[k] + +d.d, 0, +el.max); updateBuilder(); return; }
      if (d.b) {
        const b = state.builder, v = d.v;
        if (d.b === "shots") b.shots = +v; else if (d.b === "temp") { b.temp = v; if (v === "iced" && b.water === 0 && !b.milk && !b.foam) b.water = 0; } else b[d.b] = v;
        updateBuilder(); return;
      }

      switch (d.action) {
        case "tips": renderTips(); { const dlg = $("#tips"); if (!dlg.open) { try { dlg.showModal(); } catch (x) { dlg.setAttribute("open", ""); } focusSheet(dlg); } } break;
        case "close-tips": $("#tips").close(); break;
        case "close-detail": history.length > 1 && location.hash.startsWith("#/coffee/") ? (location.hash = state.lastView) : closeDetail(); break;
        case "units": state.units = state.units === "ml" ? "oz" : "ml"; store.set("units", state.units); refreshAll(); break;
        case "theme": setTheme(currentTheme() === "dark" ? "light" : "dark"); break;
        case "reset-filters": state.filter = { temp: "all", group: "all", q: "", sort: "featured" }; $("#q").value = ""; $("#sort").value = "featured"; renderChips(); renderCatalog(); break;
        case "board-more": state.board.all = !state.board.all; renderBoard(); break;
        case "share": copyLink(); break;
        case "customise": {
          const { b, dropped } = builderFromRecipe(REC[d.id]);
          state.builder = b;
          if (state.detail && state.detail.milkId) b.milkId = state.detail.milkId;
          state.lastView = "#/builder?" + encodeBuilder(b);
          location.hash = state.lastView;
          if (dropped.length) toast("Note: " + [...new Set(dropped.map((x) => D.types[x.t].label.toLowerCase()))].join(", ") + " can’t be set in the customiser.");
          break;
        }
        case "b-save": {
          const q = encodeBuilder(state.builder), i = state.saved.findIndex((s) => s.q === q);
          if (i >= 0) { state.saved.splice(i, 1); toast("Removed from your saved drinks"); }
          else { state.saved.push({ name: state.builderInfo.name, q }); toast(`Saved “${state.builderInfo.name}”`); }
          store.set("saved", state.saved); updateBuilder(); break;
        }
        case "b-reset": state.builder = defaultBuilder(); updateBuilder(); break;
        case "b-random": state.builder = randomBuilder(); updateBuilder(); break;
      }
    });

    /* sliders, selects, checkboxes */
    document.addEventListener("input", (e) => {
      const t = e.target;
      if (t.id === "q") { state.filter.q = t.value; renderCatalog(); }
      else if (t.dataset.range) { state.builder[t.dataset.range] = +t.value; updateBuilder(); }
    });
    document.addEventListener("change", (e) => {
      const t = e.target;
      if (t.id === "sort") { state.filter.sort = t.value; renderCatalog(); }
      else if (t.dataset.flav !== undefined) { const f = state.builder.fl[+t.dataset.flav]; f.id = t.value; if (f.id && !f.p) f.p = 2; if (!f.id) f.p = 0; updateBuilder(); }
      else if (t.id === "b-decaf") { state.builder.decaf = t.checked; updateBuilder(); }
      else if (t.matches("[data-detail-decaf]")) { state.detail.decaf = t.checked; renderDetail(true); }
    });

    /* dialogs: backdrop click + closing behaviour */
    ["#detail", "#tips"].forEach((sel) => {
      const dlg = $(sel);
      dlg.addEventListener("click", (e) => { if (e.target === dlg) { if (sel === "#detail") $('[data-action="close-detail"]', dlg).click(); else dlg.close(); } });
    });
    $("#detail").addEventListener("close", () => {
      state.detail = state.detail && { ...state.detail };
      if (location.hash.startsWith("#/coffee/")) { try { history.replaceState(null, "", state.lastView); } catch (e) { location.hash = state.lastView; } }
      document.title = VIEW_TITLES[state.view];
    });
    $("#detail").addEventListener("cancel", () => { /* Esc: let the dialog close, "close" handler fixes the URL */ });

    window.addEventListener("hashchange", route);
  }

  /* =============================================================== INIT */
  function init() {
    $("[data-units-label]").textContent = state.units;
    renderHero();
    renderChips();
    renderCatalog();
    $("#sort").value = state.filter.sort;
    bind();
    route();
  }
  init();
})();
