/* The two tip guides shown in the Tips sheet. Illustrations live in assets/tips/. */
import { CONSTS } from "./config.js";

export const tips = [
  {
    id: "milk",
    title: "Steam milk",
    icon: "milk",
    color: "#3d8bff",
    facts: [
      { icon: "snowflake", value: "4 °C", label: "start" },
      { icon: "thermometer", value: "60–65 °C", label: "stop" },
      { icon: "clock", value: "3–10 s", label: "air" },
    ],
    steps: [
      { img: "milk-1-pour", title: "Cold milk", text: "Fridge-cold milk in a cold steel jug. Fill to just under the spout." },
      { img: "milk-2-purge", title: "Purge", text: "Open the steam for 1–2 s into the drip tray to clear the water." },
      { img: "milk-3-position", title: "Tip in", text: "Tip just under the surface, slightly off-centre." },
      { img: "milk-4-stretch", title: "Stretch", text: "Keep it near the surface. Soft “tss” for 3–5 s (latte) or 8–10 s (cappuccino)." },
      { img: "milk-5-roll", title: "Roll", text: "Sink the tip. Let the milk spin until the jug is hot, about 60–65 °C." },
      { img: "milk-6-pour", title: "Swirl & pour", text: "Wipe the wand, purge, tap and swirl until glossy. Pour right away." },
    ],
    plant: "Plant milks: steam to 55–60 °C with less air (1–3 s). Choose “barista” editions.",
  },
  {
    id: "shot",
    title: "Pull a shot",
    icon: "coffee",
    color: "#ff6b35",
    facts: [
      { icon: "scale", value: `${CONSTS.singleDoseG} g`, label: "single" },
      { icon: "scale", value: `${CONSTS.doubleDoseG} g`, label: "double" },
      { icon: "stopwatch", value: "25–30 s", label: "time" },
    ],
    steps: [
      { img: "shot-1-preheat", title: "Preheat", text: "Cups on the warming tray. Run a blank shot through the empty portafilter." },
      { img: "shot-2-dose", title: "Dose", text: `${CONSTS.singleDoseG} g in the single basket, ${CONSTS.doubleDoseG} g in the double. Both are double-wall baskets.` },
      { img: "shot-3-tamp", title: "Level & tamp", text: "Level the grounds, then tamp evenly with the metal tamper." },
      { img: "shot-4-brew", title: "Brew", text: "Lock in the portafilter, press 1 cup (single) or 2 cup (double)." },
      { img: "shot-5-yield", title: "Stop", text: "About 25–30 ml for a single, 50–60 ml for a double, in 25–30 s." },
      { img: "shot-6-taste", title: "Taste", text: "Sour: grind finer or use more coffee. Bitter: grind coarser or use less." },
    ],
    plant: "",
  },
];
