/* Bar slider: a row of coloured bars you drag left/right. One bar = one step.
   Works with mouse, touch and keyboard. */
import { esc, clamp } from "../core/dom.js";
import { icon } from "../render/icons.js";

/**
 * cfg: { id, label, icon, color, step, min, max, unit, value, chunky, onChange(value) }
 * value = n * step, where n is the number of filled bars.
 */
export function barSlider(cfg) {
  const { step, unit = "ml" } = cfg;
  const minN = Math.round((cfg.min || 0) / step);
  const maxN = Math.round(cfg.max / step);
  let n = Math.round(cfg.value / step);

  const root = document.createElement("div");
  root.className = "bs" + (cfg.chunky ? " bs--chunky" : "");
  root.style.setProperty("--c", cfg.color);
  root.dataset.bs = cfg.id;
  root.innerHTML = `
    <div class="bs__head">
      <span class="bs__ic">${icon(cfg.icon)}</span>
      <span class="bs__label">${esc(cfg.label)}</span>
      <span class="bs__val num"><b></b><span class="bs__unit">${esc(unit)}</span></span>
    </div>
    <div class="bs__track" role="slider" tabindex="0" aria-label="${esc(cfg.label)}" aria-valuemin="${cfg.min || 0}" aria-valuemax="${cfg.max}">
      ${Array.from({ length: maxN }, (_, j) => `<i class="bs__bar" style="--k:${maxN > 1 ? (j / (maxN - 1)).toFixed(3) : 1};--i:${j}"></i>`).join("")}
      <span class="bs__bubble"></span>
    </div>`;

  const track = root.querySelector(".bs__track");
  const bars = [...root.querySelectorAll(".bs__bar")];
  const valueEl = root.querySelector(".bs__val b");
  const bubble = root.querySelector(".bs__bubble");
  let waveTimer;

  function paint() {
    const value = n * step;
    bars.forEach((b, j) => b.classList.toggle("on", j < n));
    valueEl.textContent = value;
    track.setAttribute("aria-valuenow", value);
    track.setAttribute("aria-valuetext", `${value} ${unit}`);
    bubble.textContent = `${value} ${unit}`;
    bubble.style.setProperty("--x", `${(n / maxN) * 100}%`);
  }

  function wave() {
    root.classList.remove("is-wave");
    void root.offsetWidth;
    root.classList.add("is-wave");
    clearTimeout(waveTimer);
    waveTimer = setTimeout(() => root.classList.remove("is-wave"), 900);
  }

  function setN(next, { silent = false, animate = false } = {}) {
    next = clamp(next, minN, maxN);
    if (next === n && !animate) return;
    n = next;
    paint();
    if (animate) wave();
    if (!silent && cfg.onChange) cfg.onChange(n * step);
  }

  // fisheye: bars near the pointer grow a little
  function bulge(pos) {
    bars.forEach((b, j) => {
      const d = j + 0.5 - pos;
      b.style.setProperty("--s", pos == null ? 1 : (1 + 0.32 * Math.exp(-(d * d) / 7)).toFixed(3));
    });
  }
  const posFrom = (e) => {
    const r = track.getBoundingClientRect();
    return clamp((e.clientX - r.left) / r.width, 0, 1) * maxN;
  };

  let dragging = false;
  track.addEventListener("pointerdown", (e) => {
    dragging = true;
    track.setPointerCapture(e.pointerId);
    root.classList.add("is-active");
    const pos = posFrom(e);
    setN(Math.round(pos));
    bulge(pos);
  });
  track.addEventListener("pointermove", (e) => {
    const pos = posFrom(e);
    if (dragging) setN(Math.round(pos));
    bulge(pos);
  });
  const end = () => { dragging = false; root.classList.remove("is-active"); bulge(null); };
  track.addEventListener("pointerup", end);
  track.addEventListener("pointercancel", end);
  track.addEventListener("pointerleave", () => { if (!dragging) bulge(null); });

  track.addEventListener("keydown", (e) => {
    const keys = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 };
    if (e.key in keys) { e.preventDefault(); setN(n + keys[e.key], { animate: true }); }
    else if (e.key === "Home") { e.preventDefault(); setN(minN, { animate: true }); }
    else if (e.key === "End") { e.preventDefault(); setN(maxN, { animate: true }); }
  });

  paint();
  return {
    el: root,
    /** update from outside (presets, URL ...) without firing onChange */
    set(value, { animate = false } = {}) { setN(Math.round(value / step), { silent: true, animate }); },
    setColor(color) { root.style.setProperty("--c", color); },
    setLabel(text) { root.querySelector(".bs__label").textContent = text; track.setAttribute("aria-label", text); },
  };
}
