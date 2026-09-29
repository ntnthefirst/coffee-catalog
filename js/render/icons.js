/* Icons are SVG files in assets/icons, drawn as CSS masks so they take any colour.
   icon("flame") -> <i class="ic" style="--ic:url(assets/icons/flame.svg)"></i> */
export const icon = (name, cls = "") =>
  `<i class="ic${cls ? " " + cls : ""}" style="--ic:url(assets/icons/${name}.svg)" aria-hidden="true"></i>`;
