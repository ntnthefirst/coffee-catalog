/* Customiser view: build a coffee with bars, swatches and toggles. */
import { $, $$, esc, on, ml, flash } from "../core/dom.js";
import { state, persist } from "../core/state.js";
import { icon } from "../render/icons.js";
import { cupSVG, visual, recipeCup } from "../render/cup.js";
import { mixBar } from "../render/mixbar.js";
import { milks, syrups, toppings } from "../data/ingredients.js";
import { CONSTS } from "../data/config.js";
import { RECIPE, MILK, SYRUP } from "../logic/lookup.js";
import { statsOf, toneOf } from "../logic/stats.js";
import { ingredientRows } from "../logic/describe.js";
import { makeSteps } from "../logic/steps.js";
import {
  analyse, bCtx, LIMITS, defaultBuilder, builderFromRecipe, randomBuilder, encodeBuilder, decodeBuilder,
} from "../logic/builder-model.js";
import { barSlider } from "./bar-slider.js";
import { segHTML, setSeg } from "./segmented.js";
import { toast } from "./toast.js";

const PRESETS = ["espresso", "cappuccino", "flat-white", "latte", "americano", "mocha", "iced-latte", "iced-americano", "vanilla-latte"];
const TOPPING_ICON = { whipped: "cloud", cocoa: "circle-dotted", cinnamon: "sparkles", cayenne: "pepper", caramel: "droplet", chocolate: "droplet", seasalt: "diamond" };
const LIGHT_TOPPINGS = new Set(["whipped", "seasalt"]);
const cubes = (n) => Array.from({ length: n }, () => icon("cube")).join("");
const cups = (n) => Array.from({ length: n }, () => icon("coffee")).join("");
const shortSyrup = (s) => s.label.replace(/\s*\(.*\)/, "").replace(/ sauce$/i, "").replace("Sweetened condensed milk", "Condensed").replace("Simple syrup", "Sugar").replace(/^Toasted marshmallow$/, "Marshmallow");

let sliders = {};      // splash, milk, foam, water
let pumpSliders = {};  // by syrup id
let built = false;

const section = (title, iconName, body, attrs = "") =>
  `<section class="bsec" ${attrs}><h3 class="bsec__h">${icon(iconName)}${title}</h3>${body}</section>`;

function html() {
  const milkSwatches = milks.map((m) => `<button type="button" class="sw sw--light" style="--c:${m.color}" data-milk="${m.id}" aria-pressed="false" title="${esc(m.label)}"><span class="sw__dot">${icon(m.icon)}</span><span>${esc(m.short)}</span></button>`).join("");
  const flavourSwatches = syrups.map((s) => `<button type="button" class="sw ${["sugar", "white-chocolate", "toasted-marshmallow", "coconut", "condensed", "peppermint", "mint"].includes(s.id) ? "sw--light" : ""}" style="--c:${s.color}" data-flav="${s.id}" aria-pressed="false" title="${esc(s.label)}"><span class="sw__dot"></span><span>${esc(shortSyrup(s))}</span></button>`).join("");
  const topSwatches = toppings.map((t) => `<button type="button" class="sw ${LIGHT_TOPPINGS.has(t.id) ? "sw--light" : ""}" style="--c:${t.color}" data-top="${t.id}" aria-pressed="false" title="${esc(t.label)}"><span class="sw__dot">${icon(TOPPING_ICON[t.id])}</span><span>${esc(t.label.replace(" drizzle", "").replace("Pinch of ", "").replace(" flakes", "").replace(" cream", "").replace(" dust", ""))}</span></button>`).join("");
  const presets = PRESETS.map((id) => `<button type="button" class="preset" data-preset="${id}" style="--tone:${toneOf(RECIPE[id])}">${recipeCup(RECIPE[id], null, { label: "", noSteam: true })}<span>${esc(RECIPE[id].name.replace("Caffè ", "").replace("Iced ", "Iced "))}</span></button>`).join("");

  return `
  <div class="bpreview" id="b-preview">
    <div class="bpreview__art" id="b-art"></div>
    <div class="bpreview__info">
      <h2 class="bpreview__name" id="b-name" aria-live="polite"></h2>
      <div class="bpreview__stats" id="b-stats"></div>
      <div class="bpreview__mix" id="b-mix"></div>
      <div class="bpreview__actions">
        <button type="button" class="iconbtn" data-act="save" aria-label="Save drink" title="Save">${icon("bookmark", "save__off")}${icon("bookmark-filled", "save__on")}</button>
        <button type="button" class="iconbtn" data-act="share" aria-label="Copy link" title="Share">${icon("share-2")}</button>
        <button type="button" class="iconbtn" data-act="random" aria-label="Surprise me" title="Surprise me">${icon("dice-3")}</button>
        <button type="button" class="iconbtn" data-act="reset" aria-label="Reset" title="Reset">${icon("refresh")}</button>
      </div>
    </div>
  </div>

  <div class="bcontrols">
    <div class="presets" aria-label="Start from a classic">${presets}</div>

    ${section("Temperature", "thermometer", segHTML("temp", [
      { v: "hot", label: "Hot", icon: "flame", color: "var(--crimson)" },
      { v: "iced", label: "Iced", icon: "snowflake", color: "var(--purple)" },
    ]))}

    ${section("Espresso", "coffee", `
      ${segHTML("shots", [{ v: "1", html: cups(1), label: "1 shot" }, { v: "2", html: cups(2), label: "2 shots" }])}
      <div class="bsec__row">
        ${segHTML("style", [{ v: "ristretto", label: "Short" }, { v: "normal", label: "Normal" }, { v: "lungo", label: "Long" }], "seg--sm seg--grow")}
        <button type="button" class="pill-toggle" data-act="decaf" aria-pressed="false">${icon("zzz")}Decaf</button>
      </div>`)}

    ${section("Milk", "milk", `
      <div class="swatches" role="group" aria-label="Milk type">${milkSwatches}</div>
      <div class="bsec__sliders" id="b-sliders"></div>
      ${segHTML("order", [{ v: "e", label: "Mixed", icon: "wave-sine" }, { v: "m", label: "Layered", icon: "stack-2" }], "seg--sm")}`)}

    ${section("Ice", "snowflake", segHTML("ice", [
      { v: "none", icon: "ban", title: "No ice" }, { v: "light", html: cubes(1), title: "Light ice" },
      { v: "normal", html: cubes(2), title: "Normal ice" }, { v: "lots", html: cubes(3), title: "Lots of ice" },
    ]), 'id="b-sec-ice"')}

    ${section("Flavour", "candy", `<div class="swatches" role="group" aria-label="Flavour">${flavourSwatches}</div><div class="bsec__sliders" id="b-pumps"></div>`)}

    ${section("Toppings", "sparkles", `<div class="swatches" role="group" aria-label="Toppings">${topSwatches}</div>`)}

    <section class="bsec bresult">
      <h3 class="bsec__h">${icon("list-details")}Recipe</h3>
      <ul class="ing" id="b-ing"></ul>
      <ol class="steps" id="b-steps"></ol>
      <div id="b-close"></div>
      <div id="b-saved"></div>
    </section>
  </div>`;
}

function buildSliders() {
  const mk = (id, label, ic, color, max) => barSlider({
    id, label, icon: ic, color, step: 10, max, value: state.builder[id === "splash" ? "cold" : id],
    onChange: (v) => { state.builder[id === "splash" ? "cold" : id] = v; update(); },
  });
  sliders = {
    splash: mk("splash", "Cold splash", "snowflake", "var(--crimson)", LIMITS.cold),
    milk: mk("milk", "Steamed milk", "milk", "var(--purple)", LIMITS.milk),
    foam: mk("foam", "Foam", "cloud", "var(--pink)", LIMITS.foam),
    water: mk("water", "Water", "droplets", "var(--ink)", LIMITS.water),
  };
  const host = $("#b-sliders");
  Object.values(sliders).forEach((s) => host.append(s.el));
}

/** one chunky bar slider per chosen flavour */
function syncPumpSliders() {
  const host = $("#b-pumps");
  const wanted = state.builder.fl.map((f) => f.id);
  Object.keys(pumpSliders).forEach((id) => { if (!wanted.includes(id)) { pumpSliders[id].el.remove(); delete pumpSliders[id]; } });
  state.builder.fl.forEach((f) => {
    if (!pumpSliders[f.id]) {
      const s = SYRUP[f.id];
      pumpSliders[f.id] = barSlider({
        id: `pump-${f.id}`, label: shortSyrup(s), icon: "droplet", color: s.color, step: 1, min: 1, max: 4, unit: "pumps", value: f.p, chunky: true,
        onChange: (v) => { state.builder.fl.find((x) => x.id === f.id).p = v; update(); },
      });
      pumpSliders[f.id].el.classList.add("bs--enter");
      host.append(pumpSliders[f.id].el);
    } else pumpSliders[f.id].set(f.p);
  });
}

const strengthBars = (level) =>
  `<span class="strength strength--lg">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= level ? "on" : ""}" style="--n:${n}"></i>`).join("")}</span>`;

/** Recompute everything from state.builder. opts: { noHash, wobble, animate, wave } */
export function update(opts = {}) {
  ensureBuilt();
  const root = $("#builder");
  const b = state.builder, hot = b.temp === "hot";
  const info = analyse(b);
  const ctx = bCtx(b);
  const st = statsOf(info.ing, b.shots * (b.style === "lungo" ? 1.25 : 1), b.decaf);
  const milk = MILK[b.milkId];
  state.builderInfo = info;

  // controls
  ["temp", "ice", "order", "style"].forEach((k) => setSeg(root, k, b[k]));
  setSeg(root, "shots", String(b.shots));
  $$("[data-milk]", root).forEach((el) => setOn(el, el.dataset.milk === b.milkId));
  $$("[data-flav]", root).forEach((el) => {
    const idx = b.fl.findIndex((f) => f.id === el.dataset.flav);
    setOn(el, idx >= 0);
    el.querySelector(".sw__badge")?.remove();
    if (idx >= 0) el.querySelector(".sw__dot").insertAdjacentHTML("beforeend", `<span class="sw__badge">${idx + 1}</span>`);
  });
  $$("[data-top]", root).forEach((el) => setOn(el, b.tops.includes(el.dataset.top)));
  setOn($('[data-act="decaf"]', root), b.decaf);
  $("#b-sec-ice").hidden = hot;
  sliders.splash.el.hidden = !hot;
  sliders.milk.setLabel(hot ? "Steamed milk" : "Milk");
  sliders.foam.setLabel(hot ? "Foam" : "Cold foam");
  sliders.water.setLabel(hot ? "Hot water" : "Water");
  const wave = { animate: !!opts.wave };
  sliders.splash.set(b.cold, wave); sliders.milk.set(b.milk, wave); sliders.foam.set(b.foam, wave); sliders.water.set(b.water, wave);
  syncPumpSliders();

  // preview
  const vis = visual(info.ing, ctx);
  const art = $("#b-art");
  art.className = `bpreview__art bpreview__art--${b.temp}`;
  art.innerHTML = cupSVG(vis, { label: info.name, pour: !!opts.animate, wobble: !!opts.wobble });
  $("#b-name").textContent = info.name;
  $("#b-stats").innerHTML =
    `<span class="meta">${icon("droplet")}${Math.round(st.volume)} ml</span>` +
    `<span class="meta">${icon("bolt")}${st.caffeine} mg</span>` +
    `<span class="meta" title="${st.levelLabel}">${strengthBars(st.level)}</span>`;
  $("#b-mix").innerHTML = mixBar(info.ing, b.milkId);

  // recipe card
  const rows = ingredientRows(info.ing, ctx);
  $("#b-ing").innerHTML = rows.map((x) => `<li><span class="dot" style="background:${x.color}"></span><span class="ing__name">${esc(x.label)}${x.detail ? `<small>${esc(x.detail)}</small>` : ""}</span><span class="ing__amt num">${esc(x.amount)}</span></li>`).join("");
  $("#b-steps").innerHTML = makeSteps(info.ing, ctx).map((s) => `<li><span class="steps__ic">${icon(s.icon)}</span><span class="steps__txt">${esc(s.text)}</span></li>`).join("");
  $("#b-close").innerHTML = `<h4 class="dt-h">Closest classics</h4><div class="closest">${info.ranked.map((m) =>
    `<a class="closest__item" href="#/coffee/${m.r.id}" style="--tone:${toneOf(m.r)}"><span class="closest__art">${recipeCup(m.r, null, { label: "", noSteam: true })}</span><span><b>${esc(m.r.name)}</b><small class="num">${Math.round(m.s * 100)}%</small></span></a>`).join("")}</div>`;
  renderSaved();

  const q = encodeBuilder(b);
  const saved = state.saved.some((s) => s.q === q);
  const saveBtn = $('[data-act="save"]', root);
  saveBtn.classList.toggle("is-on", saved);
  if (!opts.noHash) { try { history.replaceState(null, "", `#/builder?${q}`); } catch (e) { /* ignore */ } state.lastView = `#/builder?${q}`; }
}

const setOn = (el, on) => { if (!el) return; el.classList.toggle("is-on", !!on); el.setAttribute("aria-pressed", String(!!on)); };

function renderSaved() {
  const host = $("#b-saved");
  if (!state.saved.length) { host.innerHTML = ""; return; }
  host.innerHTML = `<h4 class="dt-h">Saved</h4><div class="savedlist">${state.saved.map((s, i) =>
    `<span class="chipx"><button type="button" data-act="load-saved" data-i="${i}">${esc(s.name)}</button><button type="button" class="chipx__x" data-act="del-saved" data-i="${i}" aria-label="Delete ${esc(s.name)}">${icon("x")}</button></span>`).join("")}</div>`;
}

function ensureBuilt() {
  if (built) return;
  $("#builder").innerHTML = html();
  built = true;
  buildSliders();
  bind();
}

/** load state from a URL query (or leave as is) and refresh */
export function showBuilder(query) {
  ensureBuilt();
  if (query) state.builder = decodeBuilder(query);
  update({ noHash: !!query, animate: true });
}

function bind() {
  const root = $("#builder");
  const set = (fn, opts = { wobble: true }) => { fn(state.builder); update(opts); };

  on(root, "click", "[data-seg]", (e, el) => {
    const k = el.dataset.seg, v = el.dataset.v;
    set((b) => {
      if (k === "shots") b.shots = +v;
      else if (k === "temp") { b.temp = v; if (v === "iced" && b.ice === "none" && false) b.ice = "normal"; }
      else b[k] = v;
    });
  });
  on(root, "click", "[data-milk]", (e, el) => set((b) => { b.milkId = el.dataset.milk; }));
  on(root, "click", "[data-top]", (e, el) => set((b) => {
    const i = b.tops.indexOf(el.dataset.top);
    i >= 0 ? b.tops.splice(i, 1) : b.tops.push(el.dataset.top);
  }));
  on(root, "click", "[data-flav]", (e, el) => set((b) => {
    const id = el.dataset.flav, i = b.fl.findIndex((f) => f.id === id);
    if (i >= 0) b.fl.splice(i, 1);
    else { if (b.fl.length >= 2) b.fl.shift(); b.fl.push({ id, p: 2 }); }
  }));
  on(root, "click", "[data-preset]", (e, el) => {
    const { b } = builderFromRecipe(RECIPE[el.dataset.preset]);
    state.builder = b;
    update({ wobble: true, wave: true });
  });
  on(root, "click", "[data-act]", (e, el) => {
    const act = el.dataset.act;
    if (act === "decaf") set((b) => { b.decaf = !b.decaf; });
    else if (act === "reset") { state.builder = defaultBuilder(); update({ wobble: true, wave: true }); }
    else if (act === "random") { state.builder = randomBuilder(); update({ wobble: true, wave: true }); flash($('[data-act="random"]', root)); }
    else if (act === "share") copyLink();
    else if (act === "save") saveCurrent();
    else if (act === "load-saved") { state.builder = decodeBuilder(state.saved[+el.dataset.i].q); update({ wobble: true, wave: true }); }
    else if (act === "del-saved") { state.saved.splice(+el.dataset.i, 1); persist.saved(); update({ noHash: true }); }
  });
}

function saveCurrent() {
  const q = encodeBuilder(state.builder), i = state.saved.findIndex((s) => s.q === q);
  if (i >= 0) { state.saved.splice(i, 1); toast("Removed", "x"); }
  else { state.saved.push({ name: state.builderInfo.name, q }); toast(`${state.builderInfo.name} saved`, "bookmark"); }
  persist.saved();
  update({ noHash: true });
  flash($('[data-act="save"]'));
}

function copyLink() {
  const url = location.href;
  const done = () => toast("Link copied", "link");
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => toast(url));
  else toast(url);
}
