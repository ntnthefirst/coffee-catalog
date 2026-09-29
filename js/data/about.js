/* Facts and sources shown on the About page. */

export const machine = {
  name: "De’Longhi Dedica Arte (EC885)",
  specs: [
    ["Pump", "15 bar"],
    ["Heating", "Thermoblock, ready in 1–2 min"],
    ["Power", "1300 W"],
    ["Size", "149 × 330 × 305 mm"],
    ["Weight", "4.2 kg"],
    ["Steam wand", "Manual, “My LatteArt”"],
    ["Temperature", "3 levels"],
    ["Baskets", "Double-wall (pressurised), ESE pods too"],
  ],
};

export const standards = [
  ["Italian espresso (INEI)", "7 g · 88 °C · 9 bar · 25 s · 25 ml"],
  ["Ristretto", "≈ 20 ml"],
  ["Lungo", "≈ 60 ml"],
  ["Cappuccino (SCA)", "150–180 ml, ≥ 1 cm foam"],
  ["Flat white", "≈ 50 ml espresso + 130 ml milk"],
  ["Milk temperature (SCA)", "55–65 °C"],
  ["Syrup", "≈ 20 ml per 240 ml"],
  ["Caffeine", "≈ 63 mg per shot"],
];

export const sources = [
  { title: "Wikipedia: Espresso", url: "https://en.wikipedia.org/wiki/Espresso", note: "INEI parameters (7 g, 88 °C, 9 bar, 25 s, 25 ml) and drink definitions." },
  { title: "Home-Barista: What is traditional Italian espresso", url: "https://www.home-barista.com/knockbox/what-is-traditional-italian-espresso-t68306.html", note: "Second reference for the INEI numbers." },
  { title: "Wikipedia: Ristretto", url: "https://en.wikipedia.org/wiki/Ristretto", note: "Ristretto ≈ 20 ml, lungo ≈ 60 ml." },
  { title: "Wikipedia: Cortado", url: "https://en.wikipedia.org/wiki/Cortado", note: "Equal parts espresso and warm milk." },
  { title: "Perfect Daily Grind: standardising milk drinks", url: "https://perfectdailygrind.com/2026/07/standardise-size-of-coffee-milk-drinks-flat-white/", note: "SCA definitions: cappuccino 150–180 ml, milk 55–65 °C, ratio 1:1–1:2. Read via search excerpts only." },
  { title: "Coffee Bros: espresso drinks explained", url: "https://coffeebros.com/blogs/coffee/espresso-drinks-explained-cappuccino-vs-latte-vs-flat-white-vs-cortado", note: "Espresso : milk : foam ratios." },
  { title: "Monin: syrup pump guide", url: "https://monin.us/blogs/blog/how-to-use-monin-syrup-pumps-pump-care-101", note: "2 pumps (≈ 20 ml) per 8 oz." },
  { title: "Font Coffee Roasters: latte syrup ratio", url: "https://font-mag.com/blogs/news/coffee-syrup-ratio-guide-lattes", note: "15–20 ml for 12 oz, 20–25 ml for 16 oz." },
  { title: "Tools & Toys: Dedica Arte review", url: "https://toolsandtoys.net/delonghi-ec885-dedica-arte-espresso-machine/", note: "15 bar, thermoblock, metal tamper." },
  { title: "Manualshelf: EC885M spec sheet", url: "https://www.manualshelf.com/manual/delonghi/ec885m/specifications-sheet-english.html", note: "Size, weight, power." },
  { title: "Mayo Clinic: caffeine content", url: "https://www.mayoclinic.org/healthy-lifestyle/nutrition-and-healthy-eating/in-depth/caffeine/art-20049372", note: "≈ 63 mg per shot. Blocked automated access, so quoted as commonly cited." },
];

export const credits = [
  { title: "Tabler Icons", url: "https://tabler.io/icons", note: "MIT license. Files in assets/icons." },
  { title: "Outfit font", url: "https://fonts.google.com/specimen/Outfit", note: "SIL Open Font License. Self-hosted in assets/fonts." },
];
