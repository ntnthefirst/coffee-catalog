/* Global measurements used everywhere (all volumes are in ml, weights in g). */
export const CONSTS = {
  shotMl: 25,          // one espresso shot (Italian Espresso National Institute: 7 g -> 25 ml)
  pumpMl: 10,          // one syrup pump
  caffeinePerShot: 63, // mg, commonly cited figure per espresso shot
  decafPerShot: 4,     // mg
  singleDoseG: 8,      // Dedica pressurised (double-wall) single basket
  doubleDoseG: 15,     // Dedica pressurised (double-wall) double basket
};

/* Customiser rules. Volumes in ml, ice in g. */
export const BUILDER = {
  iceLevels: { none: 0, light: 80, normal: 150, lots: 220 },
  shotMl: { normal: 25, ristretto: 17, lungo: 45 },
  limits: { cold: 150, milk: 300, foam: 150, water: 200 },   // slider maximums
  hotCapacity: 370,     // biggest mug (400 ml) minus headroom
  icedCapacity: 500,    // biggest tall glass (550 ml) minus headroom, ice takes half its weight in room
  whippedRoom: 15,      // headroom needed for whipped cream
  steamMax: 300,        // steamed milk + foam + cold splash never exceed this
  dilution: 1.5,        // each ml of water "counts" 1.5 ml against the steamed-milk allowance
  step: 10,
};
