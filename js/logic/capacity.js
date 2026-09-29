/* The cup is finite: espresso, syrups, milk, foam, splash and water share one budget,
   and some combinations make no sense in a real drink (300 ml of milk AND 200 ml of water).
   These rules give every slider a dynamic maximum. */
import { BUILDER, CONSTS } from "../data/config.js";

const { limits, step } = BUILDER;
const floorStep = (n) => Math.max(0, Math.floor(n / step) * step);
const KEYS = ["cold", "milk", "foam", "water"];

export const espressoMl = (b) => Math.round(b.shots * BUILDER.shotMl[b.style]);
export const flavourMl = (b) => b.fl.filter((f) => f.id && f.p > 0).reduce((s, f) => s + f.p * CONSTS.pumpMl, 0);
export const fixedMl = (b) => espressoMl(b) + flavourMl(b);

/** how much liquid the glass can hold for this drink */
export function capacity(b) {
  let cap = b.temp === "hot" ? BUILDER.hotCapacity : BUILDER.icedCapacity - BUILDER.iceLevels[b.ice] * 0.5;
  if (b.tops.includes("whipped")) cap -= BUILDER.whippedRoom;
  return floorStep(cap);
}

const val = (b, k) => (k === "cold" && b.temp !== "hot" ? 0 : b[k]);
export const usedMl = (b) => KEYS.reduce((s, k) => s + val(b, k), 0);
export const roomLeft = (b) => Math.max(0, capacity(b) - fixedMl(b) - usedMl(b));
const foamLimit = (b) => Math.max(60, b.milk * 1.2);   // foam needs milk to come from

/** the largest value slider `key` may take right now */
export function maxFor(key, b) {
  if (key === "cold" && b.temp !== "hot") return 0;
  const steamOthers = (skip) => ["cold", "milk", "foam"].reduce((s, k) => s + (k === skip ? 0 : val(b, k)), 0);
  let lim = limits[key];
  lim = Math.min(lim, capacity(b) - fixedMl(b) - (usedMl(b) - val(b, key)));
  if (key === "water") lim = Math.min(lim, (BUILDER.steamMax - steamOthers(null)) / BUILDER.dilution);
  else lim = Math.min(lim, BUILDER.steamMax - BUILDER.dilution * b.water - steamOthers(key));
  if (key === "foam") lim = Math.min(lim, foamLimit(b));
  return floorStep(lim);
}

/** bring any builder state (URL, preset, control change) back to something a cup can hold */
export function normalize(b) {
  KEYS.forEach((k) => { b[k] = Math.min(limits[k], floorStep(Math.round(b[k] / step) * step)); });
  if (b.temp !== "hot") b.cold = 0;
  b.foam = Math.min(b.foam, floorStep(foamLimit(b)));

  const steam = () => b.cold + b.milk + b.foam;
  while (b.water > 0 && steam() + BUILDER.dilution * b.water > BUILDER.steamMax) b.water -= step;
  for (const k of ["foam", "cold", "milk"]) {
    while (steam() + BUILDER.dilution * b.water > BUILDER.steamMax && b[k] > 0) b[k] -= step;
  }

  const room = capacity(b) - fixedMl(b);
  for (const k of ["water", "cold", "foam", "milk"]) {
    while (usedMl(b) > room && b[k] > 0) b[k] -= step;
  }
  b.foam = Math.min(b.foam, floorStep(foamLimit(b)));
  return b;
}
