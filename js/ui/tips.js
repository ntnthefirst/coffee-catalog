/* Tips sheet: two guides (steam milk, pull a shot) as swipeable illustrated steps. */
import { $, esc, on } from "../core/dom.js";
import { icon } from "../render/icons.js";
import { tips } from "../data/tips.js";
import { segHTML, setSeg } from "./segmented.js";
import { openSheet, closeSheet, onBackdropClick } from "./sheet.js";

let current = tips[0].id;
const dialog = () => $("#tips");

function slidesHTML(guide) {
  return guide.steps.map((s, i) => `
    <article class="slide" aria-roledescription="slide" aria-label="Step ${i + 1} of ${guide.steps.length}">
      <div class="slide__art"><img src="assets/tips/${s.img}.svg" alt="" width="320" height="240" loading="lazy"><span class="slide__n num">${i + 1}</span></div>
      <h3 class="slide__title">${esc(s.title)}</h3>
      <p class="slide__text">${esc(s.text)}</p>
    </article>`).join("");
}

function render() {
  const guide = tips.find((t) => t.id === current);
  const dlg = dialog();
  dlg.style.setProperty("--guide", guide.color);
  dlg.innerHTML = `
    <span class="sheet__handle"></span>
    <div class="sheet__bar"><span></span><button class="iconbtn iconbtn--light" type="button" data-act="close" aria-label="Close">${icon("x")}</button></div>
    <div class="sheet__scroll">
      <div class="tp">
        <h2 class="tp__title">Tips</h2>
        ${segHTML("guide", tips.map((t) => ({ v: t.id, label: t.title, icon: t.icon, color: t.color })))}
        <ul class="facts" aria-label="Key numbers">${guide.facts.map((f, i) => `
          <li style="--i:${i}">${icon(f.icon)}<b class="num">${esc(f.value)}</b><small>${esc(f.label)}</small></li>`).join("")}</ul>
        <div class="slides" id="tp-slides" tabindex="0" aria-label="${esc(guide.title)} steps">${slidesHTML(guide)}</div>
        <div class="tp__nav">
          <button class="iconbtn" type="button" data-act="prev" aria-label="Previous step">${icon("chevron-left")}</button>
          <div class="dots" id="tp-dots">${guide.steps.map((_, i) => `<button type="button" class="dots__d ${i === 0 ? "is-on" : ""}" data-go="${i}" aria-label="Step ${i + 1}"></button>`).join("")}</div>
          <button class="iconbtn iconbtn--ink" type="button" data-act="next" aria-label="Next step">${icon("chevron-right")}</button>
        </div>
        ${guide.plant ? `<p class="tp__note">${icon("leaf")}${esc(guide.plant)}</p>` : ""}
      </div>
    </div>`;
  setSeg(dlg, "guide", current);
  const sc = $(".sheet__scroll", dlg);
  if (sc) sc.tabIndex = -1;
  wireSlides();
}

function wireSlides() {
  const slides = $("#tp-slides");
  const dots = $("#tp-dots");
  const count = slides.children.length;
  const index = () => Math.round(slides.scrollLeft / slides.clientWidth);
  const go = (i) => slides.scrollTo({ left: Math.max(0, Math.min(count - 1, i)) * slides.clientWidth, behavior: "smooth" });

  slides.addEventListener("scroll", () => {
    const i = index();
    [...dots.children].forEach((d, n) => d.classList.toggle("is-on", n === i));
    slides.parentElement.querySelector('[data-act="prev"]').disabled = i === 0;
    slides.parentElement.querySelector('[data-act="next"]').disabled = i === count - 1;
  }, { passive: true });

  slides.parentElement.querySelector('[data-act="prev"]').disabled = true;
  dots.addEventListener("click", (e) => { const d = e.target.closest("[data-go]"); if (d) go(+d.dataset.go); });
  slides.parentElement.querySelector('[data-act="prev"]').addEventListener("click", () => go(index() - 1));
  slides.parentElement.querySelector('[data-act="next"]').addEventListener("click", () => go(index() + 1));
  slides.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(index() + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(index() - 1); }
  });
}

export function openTips() {
  render();
  openSheet(dialog());
}

export function initTips() {
  const dlg = dialog();
  onBackdropClick(dlg, () => closeSheet(dlg));
  dlg.addEventListener("cancel", (e) => { e.preventDefault(); closeSheet(dlg); });
  on(dlg, "click", "[data-act='close']", () => closeSheet(dlg));
  on(dlg, "click", "[data-seg='guide']", (e, el) => { current = el.dataset.v; render(); });
}
