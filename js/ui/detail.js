/* Recipe detail sheet (bottom sheet on phones, side panel on desktop). */
import { $, esc, ml } from "../core/dom.js";
import { state } from "../core/state.js";
import { icon } from "../render/icons.js";
import { cupSVG, visual, recipeCtx } from "../render/cup.js";
import { mixBar } from "../render/mixbar.js";
import { milks } from "../data/ingredients.js";
import { RECIPE, MILK } from "../logic/lookup.js";
import { statsOf, toneOf, usesMilk } from "../logic/stats.js";
import { ingredientRows } from "../logic/describe.js";
import { makeSteps } from "../logic/steps.js";
import { builderFromRecipe, encodeBuilder } from "../logic/builder-model.js";
import { openSheet, closeSheet, onBackdropClick } from "./sheet.js";
import { toggleFavorite } from "./favorites.js";
import { toast } from "./toast.js";

const dialog = () => $("#detail");

const strengthBars = (level) =>
  `<span class="strength strength--lg">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= level ? "on" : ""}" style="--n:${n}"></i>`).join("")}</span>`;

export function openDetail(id) {
  const r = RECIPE[id];
  if (!r) return;
  if (!state.detail || state.detail.id !== id) state.detail = { id, milkId: r.milk || "whole", decaf: false };
  render({ animate: true });
  openSheet(dialog());
  document.title = `${r.name} · Dedica Coffee`;
}

export function closeDetail() { closeSheet(dialog()); }
export const isDetailOpen = () => dialog().open;

/** Ask the router to leave the detail route (it closes the sheet). */
function requestClose() { location.hash = state.lastView; }

function render({ animate = false } = {}) {
  const { id, milkId, decaf } = state.detail;
  const r = RECIPE[id];
  const dlg = dialog();
  const keep = $(".sheet__scroll", dlg);
  const scrollTop = keep && !animate ? keep.scrollTop : 0;

  const ctx = { ...recipeCtx(r, milkId), shots: r.shots };
  const st = statsOf(r.ing, r.shots, decaf);
  const rows = ingredientRows(r.ing, ctx);
  const steps = makeSteps(r.ing, ctx);
  const fav = state.favs.has(id);
  const choosesMilk = usesMilk(r.ing);

  dlg.innerHTML = `
    <span class="sheet__handle"></span>
    <div class="sheet__bar">
      <button class="iconbtn iconbtn--light" type="button" data-act="close" aria-label="Close">${icon("x")}</button>
      <button class="iconbtn iconbtn--light fav ${fav ? "is-on" : ""}" type="button" data-fav="${id}" aria-pressed="${fav}" aria-label="Save">${icon("heart", "fav__off")}${icon("heart-filled", "fav__on")}</button>
    </div>
    <div class="sheet__scroll">
      <div class="dt-hero" style="--tone:${toneOf(r)}">${cupSVG(visual(r.ing, ctx), { label: r.name, pour: animate })}</div>
      <div class="dt-body">
        <header>
          <h2 class="dt-title">${esc(r.name)}</h2>
          <p class="dt-sub">${esc(r.desc)}</p>
        </header>

        <div class="dt-stats">
          <div class="stat" style="--c:var(--purple);--t:var(--purple-t)">${icon("droplet")}<b class="num">${Math.round(st.volume)}</b><small>ml</small></div>
          <div class="stat" style="--c:var(--crimson);--t:var(--crimson-t)">${icon("bolt")}<b class="num">${st.caffeine}</b><small>mg caffeine</small></div>
          <div class="stat" style="--c:var(--pink);--t:var(--pink-t)">${icon(r.temp === "iced" ? "snowflake" : "flame")}${strengthBars(st.level)}<small>${st.levelLabel}</small></div>
        </div>

        <div class="dt-row">
          ${choosesMilk ? `<div class="swatches" role="group" aria-label="Milk">${milks.map((m) => `
            <button type="button" class="sw sw--light ${m.id === milkId ? "is-on" : ""}" style="--c:${m.color}" data-milk="${m.id}" aria-pressed="${m.id === milkId}" title="${esc(m.label)}">
              <span class="sw__dot">${icon(m.icon)}</span><span>${esc(m.short)}</span></button>`).join("")}</div>` : ""}
          <button type="button" class="pill-toggle ${decaf ? "is-on" : ""}" data-act="decaf" aria-pressed="${decaf}">${icon("zzz")}Decaf</button>
        </div>
        ${choosesMilk && !MILK[milkId].dairy ? `<p class="dt-note">${icon("leaf")}${esc(MILK[milkId].steam)}</p>` : ""}

        <section>
          <h4 class="dt-h">Ingredients</h4>
          ${mixBar(r.ing, milkId)}
          <ul class="ing">${rows.map((x, i) => `
            <li style="--i:${i}"><span class="dot" style="background:${x.color}"></span>
              <span class="ing__name">${esc(x.label)}${x.detail ? `<small>${esc(x.detail)}</small>` : ""}</span>
              <span class="ing__amt num">${esc(x.amount)}</span></li>`).join("")}</ul>
        </section>

        <section>
          <h4 class="dt-h">Make it</h4>
          <ol class="steps">${steps.map((s, i) => `<li style="--i:${i}"><span class="steps__ic">${icon(s.icon)}</span><span class="steps__txt">${esc(s.text)}</span></li>`).join("")}</ol>
        </section>

        <div class="dt-tip">${icon("bulb")}<p>${esc(r.tip)}</p></div>
      </div>
    </div>
    <div class="sheet__actions">
      <button class="btn btn--primary btn--block" type="button" data-act="customise">${icon("adjustments-horizontal")}Customise</button>
      <button class="iconbtn iconbtn--lg" type="button" data-act="share" aria-label="Copy link">${icon("share-2")}</button>
    </div>`;

  const sc = $(".sheet__scroll", dlg);
  if (sc) { sc.tabIndex = -1; if (scrollTop) sc.scrollTop = scrollTop; }
}

export function initDetail() {
  const dlg = dialog();
  onBackdropClick(dlg, requestClose);
  dlg.addEventListener("cancel", (e) => { e.preventDefault(); requestClose(); });
  dlg.addEventListener("close", () => { document.title = "Dedica Coffee"; });

  dlg.addEventListener("click", (e) => {
    const fav = e.target.closest("[data-fav]");
    if (fav) { toggleFavorite(fav.dataset.fav); return; }
    const milk = e.target.closest("[data-milk]");
    if (milk) { state.detail.milkId = milk.dataset.milk; render(); return; }
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "close") requestClose();
    else if (act === "decaf") { state.detail.decaf = !state.detail.decaf; render(); }
    else if (act === "share") { copyLink(); }
    else if (act === "customise") customise();
  });
}

function copyLink() {
  const url = location.href;
  const done = () => toast("Link copied", "link");
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => toast(url));
  else toast(url);
}

function customise() {
  const r = RECIPE[state.detail.id];
  const { b, dropped } = builderFromRecipe(r);
  b.milkId = state.detail.milkId;
  b.decaf = state.detail.decaf;
  state.builder = b;
  state.lastView = `#/builder?${encodeBuilder(b)}`;
  location.hash = state.lastView;
  if (dropped.length) toast("Some extras aren’t in the builder", "info-circle");
}
