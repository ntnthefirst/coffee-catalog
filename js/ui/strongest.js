/* Strongest view: ranked list with animated bars. */
import { $, esc, on } from "../core/dom.js";
import { state } from "../core/state.js";
import { icon } from "../render/icons.js";
import { recipeCup } from "../render/cup.js";
import { recipes } from "../data/recipes.js";
import { recipeStats, toneOf } from "../logic/stats.js";
import { segHTML, setSeg } from "./segmented.js";

const MODES = [
  { v: "intensity", label: "Intense", icon: "flame", color: "var(--crimson)", title: "Most intense (mg per 100 ml)" },
  { v: "caffeine", label: "Caffeine", icon: "bolt", color: "var(--purple)", title: "Most caffeine per cup" },
  { v: "mild", label: "Gentle", icon: "leaf", color: "var(--pink)", title: "Gentlest first" },
];
const TEMP_BUTTONS = [
  { id: "hot", icon: "flame", color: "var(--crimson)", label: "Hot drinks" },
  { id: "iced", icon: "snowflake", color: "var(--purple)", label: "Iced drinks" },
];
const LIMIT = 12;

function sorted(mode, temp) {
  const s = (r) => recipeStats(r);
  const list = recipes.filter((r) => !temp || r.temp === temp);
  const cmp = {
    caffeine: (a, b) => s(b).caffeine - s(a).caffeine || s(b).per100 - s(a).per100,
    intensity: (a, b) => s(b).per100 - s(a).per100 || s(b).caffeine - s(a).caffeine,
    mild: (a, b) => s(a).per100 - s(b).per100 || s(a).caffeine - s(b).caffeine,
  }[mode];
  return list.sort(cmp);
}

export function renderStrongest() {
  const { mode, temp, all } = state.board;
  setSeg($("#board-controls"), "mode", mode);
  $("#board-controls").querySelectorAll("[data-board-temp]").forEach((b) => {
    const on = b.dataset.boardTemp === temp;
    b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on));
  });

  const list = sorted(mode, temp);
  const shown = all ? list : list.slice(0, LIMIT);
  const value = (r) => (mode === "caffeine" ? recipeStats(r).caffeine : recipeStats(r).per100);
  const max = Math.max(...list.map(value)) || 1;

  $("#board").innerHTML = shown.map((r, i) => {
    const st = recipeStats(r);
    const w = Math.max(0.04, value(r) / max);
    return `<li class="rank rank--${r.temp} ${i < 3 && mode !== "mild" ? "rank--top" : ""}" style="--i:${i};--w:${w.toFixed(3)}">
      <span class="rank__n num">${i + 1}</span>
      <a class="rank__art" href="#/coffee/${r.id}" style="--tone:${toneOf(r)}" aria-label="${esc(r.name)}">${recipeCup(r, null, { label: "", noSteam: true })}</a>
      <div class="rank__main">
        <a class="rank__name" href="#/coffee/${r.id}">${esc(r.name)}</a>
        <span class="rank__bar"><i></i></span>
      </div>
      <div class="rank__val"><b class="num">${mode === "caffeine" ? st.caffeine : Math.round(st.per100)}</b><small>${mode === "caffeine" ? "mg" : "mg/100 ml"}</small></div>
    </li>`;
  }).join("");

  const more = $("#board-more");
  more.hidden = list.length <= LIMIT;
  more.innerHTML = all ? `${icon("chevron-up")}Show less` : `${icon("chevron-down")}Show all ${list.length}`;
}

export function initStrongest() {
  $("#board-controls").innerHTML =
    segHTML("mode", MODES, "seg--grow") +
    `<div class="tempbtns">${TEMP_BUTTONS.map((t) => `<button type="button" class="iconbtn iconbtn--tog" style="--c:${t.color}" data-board-temp="${t.id}" aria-pressed="false" aria-label="${t.label}" title="${t.label}">${icon(t.icon)}</button>`).join("")}</div>`;

  on($("#board-controls"), "click", "[data-seg='mode']", (e, el) => { state.board.mode = el.dataset.v; renderStrongest(); });
  on($("#board-controls"), "click", "[data-board-temp]", (e, el) => {
    state.board.temp = state.board.temp === el.dataset.boardTemp ? null : el.dataset.boardTemp;
    renderStrongest();
  });
  $("#board-more").addEventListener("click", () => { state.board.all = !state.board.all; renderStrongest(); });
}
