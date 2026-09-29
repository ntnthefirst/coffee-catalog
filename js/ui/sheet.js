/* Open / close a <dialog class="sheet"> with slide animations. */
import { $ } from "../core/dom.js";

export function openSheet(dialog) {
  if (dialog.open) return;
  dialog.classList.remove("is-closing");
  try { dialog.showModal(); } catch (e) { dialog.setAttribute("open", ""); }
  const scroller = $(".sheet__scroll", dialog);
  if (scroller) { scroller.tabIndex = -1; scroller.focus({ preventScroll: true }); }
}

export function closeSheet(dialog) {
  if (!dialog.open || dialog.classList.contains("is-closing")) return;
  dialog.classList.add("is-closing");
  const finish = () => {
    if (!dialog.open) return;
    dialog.classList.remove("is-closing");
    dialog.close();
  };
  dialog.addEventListener("animationend", finish, { once: true });
  setTimeout(finish, 420); // safety net (reduced motion, background tabs ...)
}

/** Clicking the dark backdrop asks the owner to close. */
export function onBackdropClick(dialog, close) {
  dialog.addEventListener("click", (e) => { if (e.target === dialog) close(); });
}
