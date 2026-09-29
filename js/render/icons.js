/* Icons are SVG files in assets/icons, drawn as CSS masks so they take any colour.
   icon("flame") -> <i class="ic" style="mask-image:url(assets/icons/flame.svg)"></i>
   The url is set inline (not via a CSS variable) so it resolves against the page, on any base path. */
export const icon = (name, cls = "") => {
  const url = `url(assets/icons/${name}.svg)`;
  return `<i class="ic${cls ? " " + cls : ""}" style="-webkit-mask-image:${url};mask-image:${url}" aria-hidden="true"></i>`;
};
