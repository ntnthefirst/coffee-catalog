# ☕ Dedica Coffee Catalog

A fast, mobile-friendly coffee catalog for the **De'Longhi Dedica Arte** (EC885).
57 hot and iced recipes with real measurements, a strength ranking, barista tips
for the steam wand, and a "build your own coffee" customiser that draws your cup.

Plain HTML, CSS and JavaScript: **no build step, no dependencies**. It works on
GitHub Pages as-is.

## Features

| | |
|---|---|
| **Catalog** | 57 recipes (40 hot, 17 iced): espresso family, milk drinks, Monin-style flavoured lattes, spicy drinks, iced and dessert coffees. Search, filter (hot/iced, classics, black, with milk, flavoured, spicy, dessert, saved) and sort. |
| **Cup illustrations** | Every drink is drawn from its own recipe: layers, ice, foam, toppings and garnish are proportional to the millilitres. Nothing is a stock photo, so the picture always matches the numbers. |
| **Recipe details** | Exact ingredients, step-by-step instructions for the Dedica, a barista tip, caffeine and intensity, and a tag showing how solid the source is. |
| **Milk variations** | Switch any recipe between whole, semi, skim, lactose-free, **oat, soy, almond and coconut** milk. The steaming advice changes with the milk. |
| **Strongest list** | Ranks every drink by intensity (mg caffeine per 100 ml), total caffeine, or gentlest first. |
| **Customiser** | Hot or iced, 1 or 2 shots, ristretto/normal/lungo, decaf, cold milk splash, steamed milk, foam, water, ice, 2 syrups/sauces (in pumps), 7 toppings. Live drawing, automatic name, closest classic recipes, and how to make it. State lives in the URL, so you can share a link to your creation. You can also save drinks. |
| **Tips button** | Steaming milk on the Dedica, pulling a shot, iced drinks, syrups and spices, plant milks, troubleshooting and care. |
| **Units** | Switch between ml/g and fl oz/oz. |
| **UI** | Light/dark theme, mobile bottom navigation, bottom-sheet dialogs on phones, keyboard and screen-reader friendly. |

## Run it locally

```bash
python3 -m http.server 8000     # or any static file server
# open http://localhost:8000
```

Opening `index.html` directly in a browser also works.

## Publish on GitHub Pages

1. Merge this branch into `main` (or choose this branch below).
2. In the repository go to **Settings → Pages**.
3. Under **Build and deployment** choose **Deploy from a branch**, select
   `main` and the `/ (root)` folder, then **Save**.
4. After about a minute the site is live at `https://<your-user>.github.io/coffee-catalog/`.

All paths are relative, so it works both at a user site and at a project
sub-path. The `.nojekyll` file tells GitHub to serve the files untouched.

## Project structure

```
index.html        page shell (header, dialogs, view containers)
css/styles.css    design system, light/dark themes, responsive layout
js/coffees.js     ALL the data: recipes, milks, syrups, toppings, tips, machine, standards, sources
js/app.js         UI: cup drawing, catalog, ranking, customiser, dialogs, routing
```

## Adding or editing a coffee

Everything is in `js/coffees.js`. A recipe is a list of ingredients from
**bottom of the glass to top**, using small helper functions:

```js
{ id: "vanilla-latte", name: "Vanilla Latte", temp: "hot", shots: 2,
  basis: "flavoured", src: ["monin", "cb"], tags: ["sweet"],
  ing: [SY("vanilla", 20), E(50), M(150), F(30)],       // syrup 20 ml, espresso 50 ml, steamed milk 150 ml, foam 30 ml
  desc: "…", tip: "…" }
```

| Helper | Meaning |
|---|---|
| `E(ml)` | espresso (a shot is 25 ml, a double is 50 ml) |
| `M(ml)` / `F(ml)` / `CF(ml)` | milk (steamed if hot, cold if iced) / foam / cold foam |
| `W(ml)` | water (hot or cold, depending on `temp`) |
| `I(g)` / `IC(g)` | ice / ice cream |
| `SY(id, ml)` / `SA(id, ml)` | syrup / sauce from the `syrups` list (1 pump = 10 ml) |
| `L(type, ml)` | any other liquid defined in `types` (tonic, orange juice, chai, …) |
| `TOP(kind)` / `GAR(kind)` | topping (whipped, cocoa, cinnamon, cayenne, caramel, chocolate, seasalt) / garnish (orange, lemon, lime, mint, cinnamon-stick) |

Optional flags: `layered: true` keeps crisp layers, `blend: true` mixes espresso
and water into one colour, `vessel` forces a glass (`demi`, `short`, `cup`,
`mug`, `tall`), `milk` sets the default milk. Volume, caffeine, intensity, the
illustration, the ingredient list and the Dedica steps are all calculated from
`ing`.

## Where the numbers come from

Only espresso, ristretto and lungo have an official definition; every other drink
varies from café to café. So each recipe is labelled in the app with a basis:

| Tag | Meaning |
|---|---|
| **Standard** | follows an official or widely published reference (espresso, ristretto, lungo, cappuccino, flat white, latte) |
| **Classic** | traditional recipe; amounts vary a little between cafés |
| **Flavoured** | a classic base plus syrup at the standard ≈ 20 ml per 240 ml |
| **Creative** | popular modern / café-style recipes (espresso tonic, shaken espresso, spicy lattes…) |

### Sources

I looked these up while building the site. Links are also shown in the app on the
**Guide & sources** page.

- **Italian Espresso National Institute (INEI) parameters**: 7 g ± 0.5 g coffee,
  88 ± 2 °C, 9 ± 1 bar, 25 ± 5 s, 25 ± 2.5 ml in the cup, 67 ± 3 °C in the cup,
  under 100 mg caffeine. Via [Wikipedia: Espresso](https://en.wikipedia.org/wiki/Espresso),
  cross-checked with [Home-Barista](https://www.home-barista.com/knockbox/what-is-traditional-italian-espresso-t68306.html).
  This is why one shot is **25 ml** here.
- **Ristretto ≈ 20 ml and lungo ≈ 60 ml**:
  [Wikipedia: Ristretto](https://en.wikipedia.org/wiki/Ristretto), [Lungo](https://en.wikipedia.org/wiki/Lungo).
- **Milk-drink volumes and definitions** (macchiato 30–40 ml, latte ≈ 250 ml,
  cappuccino 150–180 ml, americano, affogato, mocha): Wikipedia's espresso article.
- **SCA-style definitions** (cappuccino 150–180 ml with about 1 cm of foam, milk
  at 55–65 °C, brew ratio 1 : 1 to 1 : 2, flat white ≈ 50 ml espresso + ≈ 130 ml milk):
  [Perfect Daily Grind, standardising milk drinks](https://perfectdailygrind.com/2026/07/standardise-size-of-coffee-milk-drinks-flat-white/).
  *I could only read this through search-result excerpts, not the full article.*
- **Espresso : milk : foam ratios** for macchiato, cortado, flat white, cappuccino,
  latte and mocha: [Coffee Bros, espresso drinks explained](https://coffeebros.com/blogs/coffee/espresso-drinks-explained-cappuccino-vs-latte-vs-flat-white-vs-cortado).
- **Syrup dosing** (2 pumps ≈ 20 ml per 8 oz, 3 for 12 oz, 4 for 16 oz):
  [Monin, syrup pump guide](https://monin.us/blogs/blog/how-to-use-monin-syrup-pumps-pump-care-101)
  and [Font Coffee Roasters](https://font-mag.com/blogs/news/coffee-syrup-ratio-guide-lattes).
  Pump output varies by bottle (Monin states about ¼ fl oz ≈ 7 ml; many café
  guides use 10 ml). This site uses **1 pump = 10 ml**, so weigh your own pump.
- **De'Longhi Dedica Arte facts** (15-bar pump, thermoblock, 1300 W,
  149 × 330 × 305 mm, 4.2 kg, "My LatteArt" steam wand, 3 temperature levels,
  pressurised baskets, metal tamper):
  [Tools & Toys review](https://toolsandtoys.net/delonghi-ec885-dedica-arte-espresso-machine/),
  [Manualshelf spec sheet](https://www.manualshelf.com/manual/delonghi/ec885m/specifications-sheet-english.html)
  and retailer listings.

### What is estimated or unverified

Being upfront about the soft spots:

- **Caffeine** uses the commonly quoted **≈ 63 mg per espresso shot**
  (Mayo Clinic figure). Their page blocked my automated request, so I could not
  re-read it while building. Real values depend on bean, roast and dose, so treat
  caffeine and the intensity rating as estimates.
- **Dedica details I could not confirm** (cup clearance, water tank size, whether
  your unit has a hot-water function) are deliberately *not* stated as facts.
  The recipes suggest a kettle for hot water. Check your manual.
- **Steaming numbers** (start volume, stretch times, plant-milk temperatures)
  are widely used barista practice rather than a single published standard.
- **Flavoured and spicy recipes** follow Monin-style dosing, but exact flavour
  names differ per brand. Cardamom and chili-honey are marked *homemade*
  (recipes are in the Tips).
- Cup illustrations are generated from the recipe amounts. They are
  diagrams, not photographs.

## Notes

- Google Fonts (Fraunces, Inter) are loaded for typography; the site falls back
  to system fonts if they are unavailable.
- Favourites, saved drinks, theme and unit choice are stored in your browser's
  `localStorage`. Nothing is sent anywhere.
