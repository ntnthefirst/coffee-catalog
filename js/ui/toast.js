import { $, esc } from "../core/dom.js";
import { icon } from "../render/icons.js";

let timer;
export function toast(message, iconName = "check") {
  const el = $("#toast");
  el.innerHTML = `${icon(iconName)}<span>${esc(message)}</span>`;
  el.classList.add("is-on");
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove("is-on"), 2200);
}
