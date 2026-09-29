/* Draws a drink as an inline SVG from its ingredient list.
   Layers are proportional to millilitres; ice, foam, toppings and garnish are drawn too. */
import { types, } from "../data/ingredients.js";
import { mix, rng } from "../core/color.js";
import { esc, clamp } from "../core/dom.js";
import { MILK, SYRUP, TOPPING } from "../logic/lookup.js";
import { iceOf, scoopOf } from "../logic/stats.js";

const VESSELS = {
  demi:  { wTop: 66,  wBot: 48, h: 46,  handle: true,  saucer: true,  caps: [40, 60, 80, 100], name: "espresso cup" },
  short: { wTop: 76,  wBot: 64, h: 74,  handle: false, saucer: false, caps: [90, 120, 150, 190, 240], name: "small glass" },
  cup:   { wTop: 112, wBot: 76, h: 82,  handle: true,  saucer: true,  caps: [150, 180, 220, 260], name: "cup" },
  mug:   { wTop: 118, wBot: 98, h: 100, handle: true,  saucer: false, caps: [280, 330, 400], name: "mug" },
  tall:  { wTop: 94,  wBot: 74, h: 150, handle: false, saucer: false, caps: [250, 300, 360, 450, 550], name: "tall glass" },
};
export const vesselName = (kind) => VESSELS[kind].name;

const BLENDABLE = new Set(["espresso", "water", "syrup", "sauce", "chai"]);
const CREAMY = new Set(["milk", "foam", "coldfoam", "condensed"]);
let uid = 0;

/** ingredient list -> layers + vessel + fill level */
export function visual(ing, ctx) {
  const milk = MILK[ctx.milkId || "whole"];
  let layers = [];
  ing.forEach((i) => {
    const meta = types[i.t];
    if (!meta || !meta.liquid || !i.ml) return;
    let color = meta.color;
    if (i.t === "syrup" || i.t === "sauce") color = SYRUP[i.id].color;
    else if (i.t === "milk") color = milk.color;
    else if (i.t === "foam" || i.t === "coldfoam") color = mix(milk.color, "#fffdf7", .6);
    layers.push({ t: i.t, ml: i.ml, color });
  });

  if (ctx.blend) {
    // merge espresso + water + syrups into one shade
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
      l.color = mix(types.espresso.color, "#b98a5c", clamp(other / (other + esp * 2.2), 0, .85));
      l.hasEsp = true;
    });
    layers = out;
  } else if (!ctx.layered) {
    // "latte" look: espresso bleeds into the milk
    layers.forEach((l, idx) => {
      const near = [layers[idx - 1], layers[idx + 1]].filter(Boolean);
      if (l.t === "espresso") { if (near.some((n) => CREAMY.has(n.t))) l.color = mix(l.color, "#c8996a", .6); }
      else if (CREAMY.has(l.t) && near.some((n) => n.t === "espresso")) l.color = mix(l.color, "#c8996a", .2);
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

/** opts: { label, noSteam, pour (grow-in animation), wobble } */
export function cupSVG(v, opts = {}) {
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
  const defs = [`<clipPath id="${id}i"><path d="${inner}"/></clipPath>`];
  let out = "";

  // shadow + saucer
  out += `<ellipse cx="${cx}" cy="${yb + 6}" rx="${rB * 1.25}" ry="5" fill="#1B1B1E" opacity=".1"/>`;
  if (V.saucer) out += `<ellipse cx="${cx}" cy="${yb + 3}" rx="${rB * 1.55}" ry="7" class="g-fill g-line"/>`;

  // handle (behind the body)
  if (V.handle) {
    const yA = yt + h * 0.2, yB = yt + h * 0.72;
    const xA = cx + rT + (rB - rT) * ((yA - yt) / h) - 1, xB = cx + rT + (rB - rT) * ((yB - yt) / h) - 1;
    const hwid = Math.max(14, h * 0.4);
    const d = `M${xA} ${yA}C${xA + hwid} ${yA - 4} ${xB + hwid} ${yB + 4} ${xB} ${yB}`;
    out += `<path d="${d}" fill="none" class="g-line" stroke-width="7" stroke-linecap="round" opacity=".6"/><path d="${d}" fill="none" stroke="var(--glass-in)" stroke-width="3.2" stroke-linecap="round"/>`;
  }

  out += `<path d="${outer}" class="g-fill"/>`;

  // liquid layers
  let liquid = "";
  const totalMl = v.layers.reduce((s, l) => s + l.ml, 0) || 1;
  const liqH = v.fl * Hi;
  const bounds = [];
  let cum = yBot;
  v.layers.forEach((l, idx) => {
    const lh = liqH * l.ml / totalMl;
    const top = cum - lh;
    const extra = idx === 0 ? iryB + 3 : 0;
    liquid += `<rect class="liq" style="--k:${idx}" x="${cx - iT - 1}" y="${top.toFixed(2)}" width="${(iT * 2 + 2).toFixed(1)}" height="${(lh + extra + 0.6).toFixed(2)}" fill="${l.color}"/>`;
    if (idx < v.layers.length - 1) bounds.push({ y: top, up: v.layers[idx + 1], dn: l, lhU: liqH * v.layers[idx + 1].ml / totalMl, lhD: lh });
    cum = top;
  });
  bounds.forEach((b, n) => {
    if (v.layered) {
      liquid += `<rect x="${cx - iT}" y="${(b.y - 0.6).toFixed(2)}" width="${iT * 2}" height="1.2" fill="#fff" opacity=".4"/>`;
    } else {
      const half = Math.min(10, b.lhU / 2, b.lhD / 2);
      if (half < 1.5) return;
      const gid = `${id}g${n}`;
      defs.push(`<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${b.up.color}"/><stop offset="1" stop-color="${b.dn.color}"/></linearGradient>`);
      liquid += `<rect x="${cx - iT - 1}" y="${(b.y - half).toFixed(2)}" width="${iT * 2 + 2}" height="${(half * 2).toFixed(2)}" fill="url(#${gid})"/>`;
    }
  });
  if (v.layers.length) liquid += `<ellipse cx="${cx}" cy="${ys.toFixed(2)}" rx="${rs.toFixed(2)}" ry="${rys.toFixed(2)}" fill="${v.surface}"/>`;

  // ice cubes
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
      cubes += `<rect style="--r:${rot}deg;--d:${(r() * 2).toFixed(2)}" x="${(x - s / 2).toFixed(1)}" y="${(y - s / 2).toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" rx="3.5" fill="#eaf2ff" fill-opacity=".45" stroke="#fff" stroke-opacity=".8" stroke-width="1.2"/>`;
    }
    liquid += `<g class="ice">${cubes}</g>`;
  }
  out += `<g clip-path="url(#${id}i)">${liquid}</g>`;

  // straw for tall iced glasses
  if (v.kind === "tall" && v.ice > 0) {
    out += `<line x1="${cx + 8}" y1="${yBot - 12}" x2="${cx + 24}" y2="${yt - 34}" stroke="#F786AA" stroke-width="4.5" stroke-linecap="round"/><line x1="${cx + 8}" y1="${yBot - 12}" x2="${cx + 24}" y2="${yt - 34}" stroke="#fff" stroke-opacity=".4" stroke-width="1.4" stroke-linecap="round"/>`;
  }

  // glass outline, rim, highlight
  out += `<path d="${outer}" fill="none" class="g-line" stroke-width="2" stroke-linejoin="round"/>`;
  out += `<ellipse cx="${cx}" cy="${yt}" rx="${rT}" ry="${ryT}" fill="none" class="g-line" stroke-width="2"/>`;
  out += `<path d="M${cx - rT + 7} ${yt + ryT + 4}L${cx - rB + 8} ${yb - 12}" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round" fill="none"/>`;

  // condensation on cold drinks
  if (!v.hot) {
    for (let k = 0; k < 6; k++) {
      const yy = yt + h * (0.25 + r() * 0.6);
      const half = rT + (rB - rT) * ((yy - yt) / h);
      const xx = cx + (r() > .5 ? 1 : -1) * (half - 5 - r() * 10);
      out += `<circle cx="${xx.toFixed(1)}" cy="${yy.toFixed(1)}" r="${(1.2 + r() * 1.4).toFixed(1)}" fill="#fff" opacity=".7"/>`;
    }
  }

  // ice-cream scoop
  if (v.scoop > 0) {
    const sr = Math.min(rs * 0.68, 26);
    out += `<g><ellipse cx="${cx}" cy="${ys - 2}" rx="${sr * 1.05}" ry="${sr * 0.32}" fill="#f0dcae"/><circle cx="${cx}" cy="${ys - sr * 0.62}" r="${sr}" fill="#f8ecd0" stroke="#e6d3a8" stroke-width="1.2"/><circle cx="${cx - sr * 0.35}" cy="${ys - sr * 0.9}" r="${sr * 0.28}" fill="#fff" opacity=".6"/></g>`;
  }

  // toppings
  v.tops.forEach((k) => {
    const col = TOPPING[k].color;
    const lift = v.tops.includes("whipped") ? -14 : 0;
    if (k === "whipped") {
      const wr = rs * 0.86;
      out += `<g stroke="#e4d5b8" stroke-width="1" fill="#fffaf0"><ellipse cx="${cx}" cy="${ys - 2}" rx="${wr}" ry="${rys + 1}"/><ellipse cx="${cx}" cy="${ys - 10}" rx="${wr * 0.74}" ry="${rys * 0.8 + 4}"/><ellipse cx="${cx}" cy="${ys - 18}" rx="${wr * 0.5}" ry="${rys * 0.6 + 3.5}"/><path d="M${cx - 5} ${ys - 21}Q${cx + 2} ${ys - 34} ${cx + 5} ${ys - 24}Q${cx + 2} ${ys - 21} ${cx - 5} ${ys - 21}Z"/></g>`;
    } else if (k === "caramel" || k === "chocolate" || k === "honey") {
      const pts = [];
      for (let z = 0; z < 7; z++) pts.push(`${(cx - rs * 0.7 + z * (rs * 1.4 / 6)).toFixed(1)} ${(ys + lift + (z % 2 ? -rys * 0.55 : rys * 0.55)).toFixed(1)}`);
      out += `<polyline points="${pts.join(" ")}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    } else {
      const n = k === "seasalt" ? 5 : k === "cayenne" ? 6 : 26;
      for (let z = 0; z < n; z++) {
        const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * 0.8;
        out += `<circle cx="${(cx + Math.cos(a) * rs * rr).toFixed(1)}" cy="${(ys + lift + Math.sin(a) * rys * rr).toFixed(1)}" r="${(k === "seasalt" ? 1.6 : k === "cayenne" ? 1.3 : 1 + r() * 0.9).toFixed(1)}" fill="${col}" opacity=".9"/>`;
      }
    }
  });

  // garnishes on the rim
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

  // steam for hot drinks
  if (v.hot && !v.tops.includes("whipped") && !opts.noSteam) {
    const sy = yt - 12 - (v.scoop ? 30 : 0);
    out += `<g class="steam" fill="none" stroke="var(--steam)" stroke-width="3" stroke-linecap="round">` +
      [-1, 0, 1].map((d, n) => `<path style="animation-delay:${n * .55}s" d="M${cx + d * rT * .42} ${sy}c-6 -8 6 -14 0 -22s6 -14 0 -22"/>`).join("") + `</g>`;
  }

  // viewBox tuned per vessel so every cup fills its frame
  const vbH = h + 100, vbW = vbH * 0.9;
  const vbX = cx - vbW / 2 + (V.handle ? 9 : 0), vbY = yb + 18 - vbH;
  const cls = ["cup", opts.pour ? "cup--pour" : "", opts.wobble ? "cup--wobble" : ""].filter(Boolean).join(" ");
  return `<svg class="${cls}" viewBox="${vbX.toFixed(1)} ${vbY.toFixed(1)} ${vbW.toFixed(1)} ${vbH}" role="img" aria-label="${esc(opts.label || "")}" preserveAspectRatio="xMidYMid meet"><defs>${defs.join("")}</defs>${out}</svg>`;
}

export const recipeCtx = (r, milkId) => ({
  temp: r.temp, milkId: milkId || r.milk || "whole", layered: r.layered, blend: r.blend, vessel: r.vessel, seed: r.id, shots: r.shots,
});

export const recipeCup = (r, milkId, opts = {}) => cupSVG(visual(r.ing, recipeCtx(r, milkId)), { label: r.name, ...opts });
