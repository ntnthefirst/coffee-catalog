# Dedica Coffee

A minimal coffee app for the **De'Longhi Dedica Arte**: 100 hot and iced recipes with real
measurements, a strength ranking, a build-your-own customiser and two illustrated
guides (steam milk, pull a shot).

Static site (HTML, ES modules, SCSS compiled to CSS). No framework, no tracking, no
third-party requests: fonts and icons are served from `assets/`.

## What's inside

| | |
|---|---|
| **Coffee** | Search, icon filters (hot, iced, classics, black, milk, flavour, spicy, dessert, saved) and a sort menu. Every drink is drawn from its own recipe. |
| **Recipe sheet** | Ingredients as a colour bar and list, short steps for the Dedica, milk swatches (whole, oat, soy, almond ...), decaf toggle, share link. |
| **Strongest** | Ranked by intensity (mg per 100 ml), total caffeine, or gentlest first. |
| **Build** | Live cup, bar sliders for cold splash / steamed milk / foam / water, swatches for milk, flavour and toppings, shots, ice, layered or mixed. Everything shares one cup budget (300 ml of milk leaves no room for water), and every combination gets a real drink name (cortado, flat white, mocha, breve ...). The URL holds your recipe so you can share it. |
| **Tips** | Swipeable steps with animated illustrations. Shots: **8 g** single, **15 g** double in the double-wall baskets. |
| **About** | A separate page (`about.html`) with machine facts, the official numbers, sources and credits. |

All volumes are in **ml**, weights in **g**. Light theme only.

## Run it

Modules need a web server (opening `index.html` from disk will not work):

```bash
npm install          # only needed to change the styles
npm run serve        # python3 -m http.server 8000  ->  http://localhost:8000
npm test             # checks ~26,000 customiser combinations (cup budget, names, drawing)
```

## Change the styles

Styles are written in SCSS (`scss/`) and compiled to `css/main.css`, which is **committed**
so GitHub Pages can serve it as is.

```bash
npm run build        # scss/main.scss -> css/main.css
npm run watch        # rebuild on save
```

```
scss/
  abstracts/   variables, mixins
  base/        fonts, colour tokens, reset, typography, keyframes
  layout/      app shell (side rail, tab bar, views)
  components/  button, segmented, filters, bar-slider, swatch, sheet, menu, toast, cup, stats
  views/       catalog, detail, strongest, builder, tips, about
```

Palette (in `scss/base/_tokens.scss`): Majorelle Blue `#623CEA`, White `#FBFFFE`,
Bubblegum Tint `#F786AA`, Carbon Black `#1B1B1E`, Deep Crimson `#96031A`.
Fonts: Fredoka (headings, numbers) and Outfit (text), both from Google Fonts, self-hosted.

## Code layout

```
index.html / about.html
js/
  main.js            router + start-up
  data/              recipes.js, ingredients.js, tips.js, about.js, config.js
  core/              dom helpers, storage, colour maths, shared state
  logic/             stats, filters, ingredient rows, steps, customiser model
  render/            icons (SVG masks), cup illustration, ingredient bar
  ui/                catalog, detail, strongest, builder, tips, bar-slider, sheet, toast ...
assets/
  icons/             Tabler icons (MIT), one SVG per file
  tips/              12 animated step illustrations
  fonts/             Fredoka, Outfit (OFL)
```

## Add a coffee

Edit `js/data/recipes.js`. A recipe lists ingredients from the **bottom of the glass to the top**:

```js
{ id: "vanilla-latte", name: "Vanilla Latte", temp: "hot", shots: 2, tags: ["sweet"],
  ing: [SY("vanilla", 20), E(50), M(150), F(30)],   // syrup, espresso, steamed milk, foam (ml)
  desc: "…", tip: "…" }
```

| Helper | Meaning |
|---|---|
| `E(ml)` | espresso (shot = 25 ml, double = 50 ml) |
| `M(ml)` `F(ml)` `CF(ml)` | milk (steamed if hot, cold if iced), foam, cold foam |
| `W(ml)` | water |
| `I(g)` `IC(g)` | ice, ice cream |
| `SY(id, ml)` `SA(id, ml)` | syrup, sauce from `data/ingredients.js` (1 pump = 10 ml) |
| `L(type, ml)` | other liquid (tonic, orange juice, chai ...) |
| `TOP(kind)` `GAR(kind)` | topping, garnish |

Flags: `layered` (crisp layers), `blend` (mix espresso and water into one colour), `vessel`
(`demi`, `short`, `cup`, `mug`, `tall`), `milk` (default milk). Volume, caffeine, intensity,
the drawing, the ingredient list and the steps are all calculated from `ing`.

## Publish on GitHub Pages

Settings → Pages → **Deploy from branch** → `main` / `(root)`. All paths are relative,
so it works at `https://<user>.github.io/coffee-catalog/`. `.nojekyll` keeps GitHub from
processing the files.

## Where the numbers come from

Full list with links on the About page (`about.html`). In short:

- **Espresso** (7 g, 88 °C, 9 bar, 25 s, 25 ml) from the Italian Espresso National Institute,
  as quoted on Wikipedia and Home-Barista. Ristretto ≈ 20 ml and lungo ≈ 60 ml from Wikipedia.
- **Milk drinks**: SCA-style definitions reported by Perfect Daily Grind (cappuccino 150–180 ml,
  milk 55–65 °C) and espresso : milk : foam ratios from Coffee Bros.
- **Syrup**: about 20 ml per 240 ml (Monin and retailer guides).
- **Dedica Arte**: 15 bar, thermoblock, 1300 W, 149 × 330 × 305 mm, 4.2 kg, "My LatteArt" steam
  wand, 3 temperature levels, pressurised baskets (Tools & Toys, Manualshelf, retailers).

Honest caveats:

- Only espresso, ristretto and lungo have an official definition. Other drinks follow published
  ratios and common café practice.
- Caffeine (about 63 mg per shot) is a commonly quoted estimate. The Mayo Clinic page blocked
  automated access, so it could not be re-read.
- The 8 g / 15 g doses are the Dedica basket sizes; cup clearance, tank size and hot-water function
  were not confirmed and are left out. Check your manual.
- Steaming numbers (start volume, stretch times, plant-milk temperatures) are barista practice
  rather than a single standard.
- Drawings are diagrams generated from the recipe amounts, not photos.

## Privacy

Favourites and saved drinks live in your browser's `localStorage`. Nothing is sent
anywhere.
