import { $$ } from "../core/dom.js";
import { state, persist } from "../core/state.js";
import { RECIPE } from "../logic/lookup.js";
import { toast } from "./toast.js";

/** Toggle a favourite and update every heart button for that recipe. */
export function toggleFavorite(id, onChange) {
  if (state.favs.has(id)) state.favs.delete(id); else state.favs.add(id);
  persist.favs();
  const on = state.favs.has(id);
  $$(`[data-fav="${id}"]`).forEach((el) => {
    el.classList.toggle("is-on", on);
    el.setAttribute("aria-pressed", String(on));
    el.classList.remove("is-flash"); void el.offsetWidth; el.classList.add("is-flash");
  });
  toast(on ? `${RECIPE[id].name} saved` : "Removed", on ? "heart" : "x");
  if (onChange) onChange();
}
