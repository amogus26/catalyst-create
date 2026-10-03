import { FLAG_PRICE, FLAGS, flagName } from "./flags.ts";

/**
 * Everything the launcher's Store sells, at the price the account server charges. This is the price
 * list: the launcher shows these (GET /api/v1/shop/prices) and buying charges them, so a price changed
 * here is changed everywhere. The launcher's own copy (CosmeticsPage.kt `shopItems`, Economy.kt) is only
 * what it shows before the list has arrived.
 *
 * No `@/` imports, so `npm run check:codes` can run this file with plain `node`.
 */

export type ItemKind = "wings" | "cape" | "gauntlet" | "hat" | "pet";

export interface CatalogItem {
  name: string;
  kind: ItemKind;
  price: number;
}

const item = (name: string, kind: ItemKind, price: number): CatalogItem => ({ name, kind, price });

export const CATALOG: readonly CatalogItem[] = [
  // Wings: the premium item.
  item("Stoneheart Wings", "wings", 2500),
  item("Raven Wings", "wings", 2200),
  item("Wyvern Wings", "wings", 2500),
  item("Seraph Wings", "wings", 2300),
  item("Void Butterfly Wings", "wings", 2200),
  item("Shattered Wings", "wings", 1900),
  item("Crow Wings", "wings", 1600),
  // Gauntlets.
  item("Stoneheart Gauntlet", "gauntlet", 2800),
  item("Arcane Iron Gauntlet", "gauntlet", 2400),
  // Capes: the season's, the classics, and the memes.
  item("Emberfall Cape", "cape", 800),
  item("Sculk Cape", "cape", 800),
  item("Aurora Cape", "cape", 900),
  item("Nightfall Cape", "cape", 500),
  item("Verdant Cape", "cape", 400),
  item("Miner Cape", "cape", 600),
  item("Gem Cape", "cape", 700),
  item("Torchlight Cape", "cape", 500),
  item("Heart Cape", "cape", 500),
  item("Starfall Cape", "cape", 600),
  item("Thunder Cape", "cape", 600),
  item("Moonrise Cape", "cape", 600),
  item("Swordsman Cape", "cape", 700),
  item("Skill Issue Cape", "cape", 400),
  item("GG EZ Cape", "cape", 400),
  item("Touch Grass Cape", "cape", 400),
  item("AFK Cape", "cape", 300),
  item("Error 404 Cape", "cape", 400),
  item("Low Battery Cape", "cape", 400),
  item("Loading Cape", "cape", 400),
  item("Bruh Cape", "cape", 300),
  item("Stonks Cape", "cape", 500),
  item("Such Cape", "cape", 500),
  item("NPC Cape", "cape", 400),
  item("One Heart Cape", "cape", 400),
  // Hats: the cheap ones are daily rewards too (lib/daily.ts).
  item("Party Hat", "hat", 300),
  item("Knit Beanie", "hat", 350),
  item("Baseball Cap", "hat", 350),
  item("Straw Hat", "hat", 400),
  item("Propeller Cap", "hat", 450),
  item("Chef Hat", "hat", 450),
  item("Top Hat", "hat", 700),
  item("Wizard Hat", "hat", 800),
  // Pets, on the shoulder. The hamsters are also a month's last daily reward.
  item("Golden Hamster", "pet", 900),
  item("Snowball Hamster", "pet", 900),
  item("Panda Hamster", "pet", 1000),
  item("Capybara", "pet", 1400),
  item("Penguin", "pet", 1400),
  item("Red Panda", "pet", 1500),
  // A flag for every country we can sell one for (lib/flags.ts).
  ...FLAGS.map(([, country]) => item(flagName(country), "cape", FLAG_PRICE)),
];

const BY_NAME = new Map(CATALOG.map((entry) => [entry.name, entry]));

export function catalogItem(name: string): CatalogItem | undefined {
  return BY_NAME.get(name);
}

/**
 * What [name] costs today for a player with [salePercent] off wings (from a sale code, still running):
 * the price, less the sale on wings only - the launcher's `ShopItem.salePrice`.
 */
export function priceFor(name: string, salePercent: number): number | null {
  const entry = BY_NAME.get(name);
  if (!entry) return null;
  return entry.kind === "wings" && salePercent > 0 ? Math.floor((entry.price * (100 - salePercent)) / 100) : entry.price;
}

/** Things only a battle pass, a daily reward or a code can give - never sold. */
export const NOT_SOLD = ["Ember hat", "Ember gauntlet", "Emberfall Wings"] as const;
