/* Id -> object maps for the data files. */
import { byId } from "../core/dom.js";
import { syrups, milks, toppings } from "../data/ingredients.js";
import { recipes } from "../data/recipes.js";

export const SYRUP = byId(syrups);
export const MILK = byId(milks);
export const TOPPING = byId(toppings);
export const RECIPE = byId(recipes);
