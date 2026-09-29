/* About page: machine facts, official numbers, sources and credits. */
import { esc } from "./core/dom.js";
import { icon } from "./render/icons.js";
import { machine, standards, sources, credits } from "./data/about.js";

const kv = (rows) => rows.map(([k, v]) => `<div class="kv__row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
const links = (items) => items.map((s) =>
  `<li><a class="link" href="${s.url}" target="_blank" rel="noopener noreferrer"><span><b>${esc(s.title)}</b><small>${esc(s.note)}</small></span>${icon("external-link")}</a></li>`).join("");

document.getElementById("machine-name").textContent = machine.name;
document.getElementById("machine").innerHTML = kv(machine.specs);
document.getElementById("numbers").innerHTML = kv(standards);
document.getElementById("sources").innerHTML = links(sources);
document.getElementById("credits").innerHTML = links(credits);
