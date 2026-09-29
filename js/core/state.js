/* The one shared state object + persistence for the parts that survive a reload. */
import { storage } from "./storage.js";
import { defaultBuilder } from "../logic/builder-model.js";

export const state = {
  view: "catalog",
  lastView: "#/catalog",
  favs: new Set(storage.get("favs", [])),
  saved: storage.get("saved", []),         // [{ name, q }]
  filter: { temps: new Set(), group: null, q: "", sort: "featured" },
  board: { mode: "intensity", temp: null, all: false },
  detail: null,                            // { id, milkId, decaf }
  builder: defaultBuilder(),
  builderInfo: null,
};

export const persist = {
  favs: () => storage.set("favs", [...state.favs]),
  saved: () => storage.set("saved", state.saved),
};
