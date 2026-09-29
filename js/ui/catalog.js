/* Catalog view: search, icon filters, sort menu and the tile grid. */
import { $, $$, esc, on, ml } from "../core/dom.js";
import { state } from "../core/state.js";
import { icon } from "../render/icons.js";
import { recipeCup } from "../render/cup.js";
import { TEMPS, GROUPS, SORTS, filterRecipes } from "../logic/filters.js";
import { recipeStats, toneOf } from "../logic/stats.js";
import { toggleFavorite } from "./favorites.js";

const strengthBars = (level) =>
  `<span class="strength" aria-hidden="true">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= level ? "on" : ""}" style="--n:${n}"></i>`).join("")}</span>`;

function tileHTML(r, i) {
  const st = recipeStats(r);
  const fav = state.favs.has(r.id);
  return `<article class="tile" style="--tone:${toneOf(r)};--i:${i}">
    <button class="iconbtn iconbtn--light fav ${fav ? "is-on" : ""}" type="button" data-fav="${r.id}" aria-pressed="${fav}" aria-label="Save ${esc(r.name)}">${icon("heart", "fav__off")}${icon("heart-filled", "fav__on")}</button>
    <div class="tile__art">${recipeCup(r, null, { label: "" })}<span class="tile__strength" title="${st.levelLabel}">${strengthBars(st.level)}</span></div>
    <h3 class="tile__name"><a class="tile__link" href="#/coffee/${r.id}">${esc(r.name)}</a></h3>
    <p class="tile__meta">
      <span class="meta meta--${r.temp}">${icon(r.temp === "iced" ? "snowflake" : "flame")}</span>
      <span class="meta">${icon("droplet")}${Math.round(st.volume)}</span>
      <span class="meta">${icon("bolt")}${st.caffeine}</span>
    </p>
  </article>`;
}

function renderStrip() {
  const f = state.filter;
  const btn = (kind, o, isOn) => `<button type="button" class="fbtn ${isOn ? "is-on" : ""}" style="--c:${o.color}" data-filter="${kind}:${o.id}" aria-pressed="${isOn}">
      <span class="fbtn__dot">${icon(o.icon)}</span><span>${o.label}</span></button>`;
  $("#strip").innerHTML =
    TEMPS.map((o) => btn("temp", o, f.temps.has(o.id))).join("") +
    `<span class="strip__sep"></span>` +
    GROUPS.map((o) => btn("group", o, f.group === o.id)).join("");
}

export function renderCatalog() {
  const list = filterRecipes(state.filter, state.favs);
  $("#tiles").innerHTML = list.map(tileHTML).join("");
  $("#empty").hidden = list.length > 0;
  $("#count").textContent = `${list.length} ${list.length === 1 ? "drink" : "drinks"}`;
  $("#q-clear").classList.toggle("is-on", !!state.filter.q);
}

function closeSortMenu() {
  $$(".menu").forEach((m) => m.remove());
  $("#sort-btn").setAttribute("aria-expanded", "false");
}

function openSortMenu() {
  closeSortMenu();
  const menu = document.createElement("div");
  menu.className = "menu";
  menu.setAttribute("role", "menu");
  menu.style.cssText = "right:0;top:calc(100% + 8px)";
  menu.innerHTML = SORTS.map((o) =>
    `<button type="button" role="menuitem" class="menu__item ${state.filter.sort === o.id ? "is-on" : ""}" data-sort="${o.id}">${icon(o.icon)}<span>${o.label}</span></button>`).join("");
  $(".searchbar").append(menu);
  $("#sort-btn").setAttribute("aria-expanded", "true");
}

export function initCatalog() {
  renderStrip();
  renderCatalog();

  $("#q").addEventListener("input", (e) => { state.filter.q = e.target.value; renderCatalog(); });
  $("#q-clear").addEventListener("click", () => { state.filter.q = ""; $("#q").value = ""; renderCatalog(); $("#q").focus(); });

  on($("#strip"), "click", "[data-filter]", (e, el) => {
    const [kind, id] = el.dataset.filter.split(":");
    if (kind === "temp") { state.filter.temps.has(id) ? state.filter.temps.delete(id) : state.filter.temps.add(id); }
    else state.filter.group = state.filter.group === id ? null : id;
    renderStrip();
    renderCatalog();
  });

  on($("#tiles"), "click", "[data-fav]", (e, el) => {
    e.preventDefault();
    toggleFavorite(el.dataset.fav, () => { if (state.filter.group === "fav") renderCatalog(); });
  });

  $("#sort-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    $(".menu") ? closeSortMenu() : openSortMenu();
  });
  document.addEventListener("click", (e) => {
    const item = e.target.closest("[data-sort]");
    if (item) { state.filter.sort = item.dataset.sort; closeSortMenu(); renderCatalog(); return; }
    if (!e.target.closest(".menu")) closeSortMenu();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSortMenu(); });

  $("#reset-filters").addEventListener("click", () => {
    state.filter = { temps: new Set(), group: null, q: "", sort: "featured" };
    $("#q").value = "";
    renderStrip();
    renderCatalog();
  });
}
