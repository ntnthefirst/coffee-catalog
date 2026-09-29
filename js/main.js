/* Entry point: routing between views and wiring the modules together. */
import { $, $$, on } from "./core/dom.js";
import { state } from "./core/state.js";
import { RECIPE } from "./logic/lookup.js";
import { initCatalog } from "./ui/catalog.js";
import { initDetail, openDetail, closeDetail, isDetailOpen } from "./ui/detail.js";
import { initStrongest, renderStrongest } from "./ui/strongest.js";
import { showBuilder } from "./ui/builder.js";
import { initTips, openTips } from "./ui/tips.js";

const TITLES = { catalog: "Dedica Coffee", strongest: "Strongest · Dedica Coffee", builder: "Build · Dedica Coffee" };

function showView(name) {
  const changed = state.view !== name || $$(".view:not([hidden])").length !== 1;
  state.view = name;
  $$(".view").forEach((v) => { v.hidden = v.dataset.view !== name; });
  $$("[data-nav]").forEach((a) => {
    const active = a.dataset.nav === name;
    a.classList.toggle("is-on", active);
    if (active) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  document.title = TITLES[name];
  return changed;
}

function route() {
  const raw = location.hash || "#/catalog";
  const [path, query] = raw.slice(2).split("?");
  const [head, id] = path.split("/");

  if (head === "coffee" && RECIPE[id]) {
    if (!$$(".view:not([hidden])").length) showView("catalog");
    openDetail(id);
    return;
  }

  const wasOpen = isDetailOpen();
  if (wasOpen) closeDetail();
  if (!TITLES[head]) { location.replace("#/catalog"); return; }

  const changed = showView(head);
  state.lastView = `#/${head}${head === "builder" && query ? `?${query}` : ""}`;
  if (head === "strongest") renderStrongest();
  if (head === "builder") showBuilder(query);
  if (changed && !wasOpen) window.scrollTo(0, 0);
}

initCatalog();
initDetail();
initStrongest();
initTips();
on(document, "click", "[data-action='tips']", () => openTips());
window.addEventListener("hashchange", route);
route();
