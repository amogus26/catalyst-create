/**
 * Everything the site says about Catalyst, in one place, taken from the launcher and client code
 * rather than made up here. Each block names the file it mirrors: when that file changes, change this.
 * Numbers that the launcher works out (a pack's bonus, the best-value pack, a sale price, the pass's
 * coin return) are worked out here the same way, never typed in.
 *
 * Launcher: github.com/amogus26/launcher (Kotlin). Client: github.com/amogus26/client (Fabric mod).
 */

// --- colour -----------------------------------------------------------------------------------------

/** The launcher's fixed colours (theme/Palette.kt) - an item is the same colour on every theme. */
export const PALETTE = {
  blue: "#4FA8E8",
  success: "#5FBF87",
  busy: "#D98A5A",
  danger: "#C24C55",
  launchActive: "#B9C0CC",
  launchReady: "#3AC960",
  sculkBase: "#0C191E",
  sculkPatch: "#132A31",
  sculkFleck: "#1E9AA1",
  coin: "#F0B429",
  modrinth: "#1BD96A",
} as const;

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255) as [number, number, number];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/** Palette.kt's `Color.lighten`: each channel moved [fraction] of the way to white. */
export function lighten(hex: string, fraction = 0.08): string {
  return toHex(channels(hex).map((c) => c + (1 - c) * fraction) as [number, number, number]);
}

/** Palette.kt's `Color.darken`: each channel scaled towards black by [fraction]. */
export function darken(hex: string, fraction = 0.12): string {
  return toHex(channels(hex).map((c) => c * (1 - fraction)) as [number, number, number]);
}

/** CosmeticArt.kt's `ramp`: an item's colours as gradient stops; one colour becomes a ramp of itself. */
export function ramp(colors: string[]): string[] {
  if (colors.length === 0) return ["#7E879B", "#7E879B"];
  if (colors.length === 1) return [lighten(colors[0], 0.25), colors[0], darken(colors[0], 0.35)];
  return colors;
}

// --- versions -----------------------------------------------------------------------------------------

/** What the Launch button starts today (launch/DevLaunch.kt GAME_VERSION; client gradle.properties). */
export const GAME_VERSION = "1.21.4";
export const LOADER = "Fabric";

/**
 * Where the installers will be downloaded from. PLACEHOLDER: there is no public build yet, so both
 * are null and the Download page says "coming soon". Put the real URLs here when a release exists -
 * every download button on the site reads these two.
 */
export const DOWNLOAD_URLS: { windows: string | null; macos: string | null } = {
  windows: null,
  macos: null,
};

// --- the shop ----------------------------------------------------------------------------------------

/** Rarity and its colour (CosmeticsPage.kt `Rarity`, Palette.kt's rarity family). */
export const RARITY = {
  common: { label: "Common", color: "#9AA4B5" },
  rare: { label: "Rare", color: "#5B7CFF" },
  epic: { label: "Epic", color: "#B36BFF" },
  legendary: { label: "Legendary", color: "#FF9F2E" },
} as const;
export type Rarity = keyof typeof RARITY;

export type ShopKind = "wings" | "cape" | "gauntlet";

export interface ShopItem {
  id: string;
  name: string;
  kind: ShopKind;
  rarity: Rarity;
  /** Coins, or null while the item has no price yet ("Price not out yet" in the launcher). */
  price: number | null;
  colors: string[];
  lore: string;
  tag?: { kind: "new" } | { kind: "deal"; percentOff: number };
  /**
   * The model the client draws it with, worn by the 3D player here too: a box model (the gauntlets, the
   * Stoneheart Wings) or a Blender model (the other wings). Capes have none - they are drawn from colours.
   */
  model?: { type: "box" | "glb"; file: string };
  /** Its picture: a still of that model, rendered by scripts/render-cosmetics.py into public/cosmetics. */
  picture?: string;
}

const P = PALETTE;

/**
 * The launcher's shop, in its order (CosmeticsPage.kt `shopItems`): wings, gauntlets and capes. Only
 * wings have prices so far (shop/Economy.kt WING_PRICES, 1,500-2,500 coins); the rest say "Price not out
 * yet", and while the store is a preview everything can be worn in game for free.
 */
export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "stoneheart-gauntlet", name: "Stoneheart Gauntlet", kind: "gauntlet", rarity: "legendary", price: null,
    colors: ["#E0A83A"], lore: "Five stones round a golden heart.", tag: { kind: "new" },
    model: { type: "box", file: "gauntlet" }, picture: "/cosmetics/stoneheart-gauntlet.webp",
  },
  {
    id: "stoneheart-wings", name: "Stoneheart Wings", kind: "wings", rarity: "legendary", price: 2500,
    colors: ["#F2C23A", "#B8841E"], lore: "A golden heart, flying.", tag: { kind: "new" },
    model: { type: "box", file: "stoneheart_wings" }, picture: "/cosmetics/stoneheart-wings.webp",
  },
  {
    id: "arcane-iron-gauntlet", name: "Arcane Iron Gauntlet", kind: "gauntlet", rarity: "legendary", price: null,
    colors: ["#3B4048", "#46FF8C"], lore: "Cold iron, green fire.", tag: { kind: "new" },
    model: { type: "box", file: "arcane_gauntlet" }, picture: "/cosmetics/arcane-iron-gauntlet.webp",
  },
  {
    id: "raven-wings", name: "Raven Wings", kind: "wings", rarity: "legendary", price: 2200,
    colors: [P.launchActive, darken(P.launchActive, 0.85)], lore: "Every feather a moonless night.", tag: { kind: "new" },
    model: { type: "glb", file: "raven_wings" }, picture: "/cosmetics/raven-wings.webp",
  },
  {
    id: "wyvern-wings", name: "Wyvern Wings", kind: "wings", rarity: "legendary", price: 2500,
    colors: ["#2E2A34", "#121015"], lore: "Borrowed from something much bigger.", tag: { kind: "new" },
    model: { type: "glb", file: "wyvern_wings" }, picture: "/cosmetics/wyvern-wings.webp",
  },
  {
    id: "seraph-wings", name: "Seraph Wings", kind: "wings", rarity: "legendary", price: 2300,
    colors: ["#F4F6FA", "#B9C0CC"], lore: "Light as the first snow.", tag: { kind: "new" },
    model: { type: "glb", file: "seraph_wings" }, picture: "/cosmetics/seraph-wings.webp",
  },
  {
    id: "void-butterfly-wings", name: "Void Butterfly Wings", kind: "wings", rarity: "legendary", price: 2200,
    colors: ["#8A4AE0", "#1A1024"], lore: "Hatched where the End begins.", tag: { kind: "new" },
    model: { type: "glb", file: "void_butterfly_wings" }, picture: "/cosmetics/void-butterfly-wings.webp",
  },
  {
    id: "emberfall-cape", name: "Emberfall Cape", kind: "cape", rarity: "rare", price: null,
    colors: [P.busy, darken(P.danger, 0.3)], lore: "Woven from the last light of autumn.",
  },
  {
    id: "sculk-cape", name: "Sculk Cape", kind: "cape", rarity: "rare", price: null,
    colors: [P.sculkFleck, P.sculkPatch], lore: "It hums when no one is near.", tag: { kind: "new" },
  },
  {
    id: "shattered-wings", name: "Shattered Wings", kind: "wings", rarity: "epic", price: 1900,
    colors: ["#3A3A44", "#15151A"], lore: "Broken, and flying anyway.", tag: { kind: "new" },
    model: { type: "glb", file: "shattered_wings" }, picture: "/cosmetics/shattered-wings.webp",
  },
  {
    id: "crow-wings", name: "Crow Wings", kind: "wings", rarity: "epic", price: 1600,
    colors: ["#2A2D38", "#101116"], lore: "Small, sharp, and always watching.", tag: { kind: "new" },
    model: { type: "glb", file: "crow_wings" }, picture: "/cosmetics/crow-wings.webp",
  },
  {
    id: "aurora-cape", name: "Aurora Cape", kind: "cape", rarity: "rare", price: null,
    colors: [P.success, P.blue, darken(P.blue, 0.4)], lore: "Stitched from the northern sky.",
  },
  {
    id: "nightfall-cape", name: "Nightfall Cape", kind: "cape", rarity: "common", price: null,
    colors: [darken(P.blue, 0.2), darken(P.blue, 0.7)], lore: "Pulls the dusk in close.",
  },
  {
    id: "verdant-cape", name: "Verdant Cape", kind: "cape", rarity: "common", price: null,
    colors: [P.launchReady, darken(P.success, 0.5)], lore: "Smells faintly of rain.",
  },
];

/** What an item costs today: its price less any deal (ShopItem.salePrice), or null with no price. */
export function salePrice(item: ShopItem): number | null {
  if (item.price === null) return null;
  return item.tag?.kind === "deal" ? Math.floor((item.price * (100 - item.tag.percentOff)) / 100) : item.price;
}

// --- coins ---------------------------------------------------------------------------------------------

/** The coin shop's shelf, cheapest first (shop/CoinPacks.kt). Prices in US cents. */
export const COIN_PACKS = [
  { coins: 500, priceCents: 499 },
  { coins: 1_000, priceCents: 799 },
  { coins: 2_500, priceCents: 1_499 },
  { coins: 3_500, priceCents: 2_199 },
  { coins: 4_000, priceCents: 2_499 },
  { coins: 8_000, priceCents: 3_999 },
] as const;
export type CoinPack = (typeof COIN_PACKS)[number];

export const STARTER_PACK: CoinPack = COIN_PACKS.reduce((a, b) => (b.priceCents < a.priceCents ? b : a));

export function coinsPerDollar(pack: CoinPack): number {
  return (pack.coins * 100) / pack.priceCents;
}

/** Most coins per dollar; a tie goes to the cheaper pack (CoinPacks.bestValue). */
export const BEST_VALUE_PACK: CoinPack = [...COIN_PACKS].sort(
  (a, b) => coinsPerDollar(b) - coinsPerDollar(a) || a.priceCents - b.priceCents,
)[0];

/** The coins [pack] gives over the starter pack's rate (CoinPacks.bonus) - integer maths on cents. */
export function packBonus(pack: CoinPack): number {
  const base = Math.floor((STARTER_PACK.coins * pack.priceCents) / STARTER_PACK.priceCents);
  return Math.max(0, pack.coins - base);
}

/** "$14.99" (shop/Money.kt usdLabel) - always a dot, always US dollars. */
export function usd(cents: number): string {
  return `$${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

/** The balance rules (shop/Economy.kt). */
export const ECONOMY = {
  passPriceCents: 899,
  wingPrices: [1_500, 2_500] as const,
  freeLaneCoins: 50,
  premiumLaneCoins: 15,
  dailyMonthMax: 1_000,
  freeMonthMax: 1_499,
  yearGiftCoins: 10_000,
  plusMonthlyCoins: 1_000,
} as const;

/** Catalyst Plus (shop/CatalystPlus.kt). Display only in the launcher too - no billing exists. */
export const CATALYST_PLUS = {
  name: "Catalyst Plus",
  priceCents: 999,
  period: "month",
  benefits: [`${ECONOMY.plusMonthlyCoins.toLocaleString("en-US")} coins a month`, "No ads", "Plus hat and gauntlet", "Plus name tag badge"],
} as const;

// --- daily rewards ----------------------------------------------------------------------------------------

/** The 30-day calendar (daily/DailyRewardsStore.kt DailyRewardTable) - the launcher's sample rewards. */
export const DAILY_REWARDS: { day: number; kind: "coins" | "cosmetic"; name: string; amount: number }[] = [
  { day: 1, kind: "coins", name: "Pocket change", amount: 10 },
  { day: 2, kind: "coins", name: "Small coin pouch", amount: 15 },
  { day: 3, kind: "cosmetic", name: "Ember Spark trail", amount: 0 },
  { day: 4, kind: "coins", name: "Coin pouch", amount: 15 },
  { day: 5, kind: "cosmetic", name: "Ashen Banner", amount: 0 },
  { day: 6, kind: "coins", name: "Coin pouch", amount: 20 },
  { day: 7, kind: "cosmetic", name: "Weekly: Cinder Cloak", amount: 25 },
  { day: 8, kind: "coins", name: "Coin pouch", amount: 20 },
  { day: 9, kind: "cosmetic", name: "Soot Particle set", amount: 0 },
  { day: 10, kind: "coins", name: "Coin satchel", amount: 30 },
  { day: 11, kind: "coins", name: "Coin pouch", amount: 20 },
  { day: 12, kind: "cosmetic", name: "Forge Sparks emote", amount: 0 },
  { day: 13, kind: "coins", name: "Coin satchel", amount: 30 },
  { day: 14, kind: "cosmetic", name: "Fortnight: Molten Crown", amount: 40 },
  { day: 15, kind: "coins", name: "Half-month bonus", amount: 60 },
  { day: 16, kind: "coins", name: "Coin satchel", amount: 30 },
  { day: 17, kind: "cosmetic", name: "Wisp Lantern charm", amount: 0 },
  { day: 18, kind: "coins", name: "Coin satchel", amount: 30 },
  { day: 19, kind: "cosmetic", name: "Emberfall name tag", amount: 0 },
  { day: 20, kind: "coins", name: "Coin chest", amount: 40 },
  { day: 21, kind: "cosmetic", name: "Third week: Ashwalker boots", amount: 40 },
  { day: 22, kind: "coins", name: "Coin satchel", amount: 35 },
  { day: 23, kind: "cosmetic", name: "Scorched Pickaxe skin", amount: 0 },
  { day: 24, kind: "coins", name: "Coin chest", amount: 40 },
  { day: 25, kind: "cosmetic", name: "Cinder Pup companion", amount: 0 },
  { day: 26, kind: "coins", name: "Coin chest", amount: 45 },
  { day: 27, kind: "cosmetic", name: "Molten Aura", amount: 0 },
  { day: 28, kind: "coins", name: "Coin chest", amount: 50 },
  { day: 29, kind: "cosmetic", name: "Emberfall Halo", amount: 0 },
  { day: 30, kind: "cosmetic", name: "Emberfall Legend bundle", amount: 150 },
];

/** Every coin a month of daily rewards pays, lucky days aside. */
export const DAILY_MONTH_COINS = DAILY_REWARDS.reduce((sum, r) => sum + r.amount, 0);

/** Lucky days (daily/LuckyDays.kt): one in each ten-day stretch, on a paying day, pays double. */
export const LUCKY_DAYS = { perMonth: 3, multiplier: 2, stretches: [[1, 10], [11, 20], [21, 29]] as const };

/** The most a month can pay: every lucky day landing on its stretch's best-paying day. */
export const DAILY_MONTH_MAX_COINS =
  DAILY_MONTH_COINS +
  LUCKY_DAYS.stretches.reduce((sum, [from, to]) => {
    const best = Math.max(...DAILY_REWARDS.filter((r) => r.day >= from && r.day <= to).map((r) => r.amount));
    return sum + best * (LUCKY_DAYS.multiplier - 1);
  }, 0);

/** Streak-saves a month (DailyRewardsStore.MAX_STREAK_SAVES). */
export const STREAK_SAVES = 4;

/** The year gift (DailyRewardsStore.kt YearGift), for opening every day of all twelve months. */
export const YEAR_GIFT = {
  name: "Catalyst Eternal bundle",
  contents: "10,000 coins, the Eternal cape and halo, and a gold name tag",
  coins: ECONOMY.yearGiftCoins,
} as const;

// --- battle pass ----------------------------------------------------------------------------------------------

/** The season (ui/pages/BattlePassPage.kt `Season`) and its levels (launch/BattlePass.kt). */
export const SEASON = {
  number: 4,
  name: "Emberfall",
  priceCents: ECONOMY.passPriceCents,
  headline: "Emberfall Wings",
  headlineColors: [lighten(P.busy, 0.35), P.busy, P.danger],
  /**
   * The headline wings' 3D model - phoenix feathers in the season's ember colours, built like the store's
   * wings (launcher art/wings/build_wings.py emberfall_wings) and worn by the client by that name - and its
   * picture (scripts/render-cosmetics.py).
   */
  headlineModel: { type: "glb", file: "emberfall_wings" },
  headlinePicture: "/cosmetics/emberfall-wings.webp",
  levels: 50,
  earlyLevels: 25,
  earlyLevelXp: 150,
  lateLevelXp: 200,
} as const;

export const SEASON_MAX_XP = SEASON.earlyLevels * SEASON.earlyLevelXp + (SEASON.levels - SEASON.earlyLevels) * SEASON.lateLevelXp;

/** XP to go from level-1 to [level]. */
export function levelCost(level: number): number {
  return level <= SEASON.earlyLevels ? SEASON.earlyLevelXp : SEASON.lateLevelXp;
}

/** The day's quests (launch/BattlePass.kt `Quest`). "Play for 2 hours" opens once the first is claimed. */
export const QUESTS = [
  { title: "Play for 1 hour", xp: 100 },
  { title: "Play for 2 hours", xp: 100 },
  { title: "Play 2 sessions", xp: 25 },
  { title: "Claim your daily reward", xp: 50 },
] as const;

export const QUEST_XP_PER_DAY = QUESTS.reduce((sum, q) => sum + q.xp, 0);

export type PassReward =
  | { kind: "coins"; amount: number }
  | { kind: "cape"; name: string; colors: string[]; texture?: string; front?: string }
  | { kind: "wings"; name: string; colors: string[]; picture?: string }
  | { kind: "choice"; name: string; options: string[] };

/**
 * The pass capes are painted by hand (the client's art/capes/design_capes.py writes them into
 * public/cosmetics/capes, and the same files into the client and the launcher): `texture` is the whole HD
 * cape texture for 3D, `front` its outside face for pictures. "Kindle Cape" is kindle_cape.png.
 */
function paintedCape(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return { texture: `/cosmetics/capes/${slug}.png`, front: `/cosmetics/capes/${slug}-front.png` };
}

/** Renders of the box-model pieces (scripts/render-cosmetics.py), by name - the level-25 pick's. */
export const PIECE_PICTURES: Record<string, string> = {
  "Ember hat": "/cosmetics/ember-hat.webp",
  "Ember gauntlet": "/cosmetics/ember-gauntlet.webp",
};

/** The premium lane's cosmetics by level (BattlePassPage.kt `passCosmetics`). */
const PASS_COSMETICS: Record<number, PassReward> = {
  5: { kind: "cape", name: "Kindle Cape", colors: [lighten(P.busy, 0.3), darken(P.busy, 0.3)], ...paintedCape("Kindle Cape") },
  10: { kind: "cape", name: "Spark Cape", colors: [lighten(P.busy, 0.55), P.busy], ...paintedCape("Spark Cape") },
  15: { kind: "cape", name: "Ashen Cape", colors: [P.launchActive, darken(P.launchActive, 0.55)], ...paintedCape("Ashen Cape") },
  20: { kind: "cape", name: "Ash Mantle", colors: [lighten(P.launchActive, 0.3), darken(P.launchActive, 0.5)], ...paintedCape("Ash Mantle") },
  25: { kind: "choice", name: "Pick one", options: ["Ember hat", "Ember gauntlet"] },
  30: { kind: "cape", name: "Flare Cape", colors: [lighten(P.danger, 0.3), lighten(P.busy, 0.3)], ...paintedCape("Flare Cape") },
  35: { kind: "cape", name: "Smoulder Cape", colors: [darken(P.busy, 0.2), darken(P.danger, 0.6)], ...paintedCape("Smoulder Cape") },
  40: { kind: "cape", name: "Cinder Veil", colors: [P.danger, darken(P.danger, 0.5)], ...paintedCape("Cinder Veil") },
  45: { kind: "cape", name: "Blaze Cape", colors: [lighten(P.busy, 0.5), P.busy, P.danger], ...paintedCape("Blaze Cape") },
  50: { kind: "wings", name: SEASON.headline, colors: [...SEASON.headlineColors], picture: SEASON.headlinePicture },
};

/** Every level: everyone's reward and pass holders' (BattlePassPage.kt `passTiers`, Economy.kt lanes). */
export const PASS_TIERS: { level: number; free: PassReward | null; premium: PassReward | null }[] = Array.from(
  { length: SEASON.levels },
  (_, i) => {
    const level = i + 1;
    return {
      level,
      free: level % 5 === 0 ? { kind: "coins", amount: ECONOMY.freeLaneCoins } : null,
      premium:
        PASS_COSMETICS[level] ??
        (level % 2 === 0 && level % 5 !== 0 ? { kind: "coins", amount: ECONOMY.premiumLaneCoins } : null),
    };
  },
);

function laneCoins(pick: (t: (typeof PASS_TIERS)[number]) => PassReward | null): number {
  return PASS_TIERS.reduce((sum, t) => {
    const reward = pick(t);
    return sum + (reward?.kind === "coins" ? reward.amount : 0);
  }, 0);
}
export const FREE_LANE_TOTAL = laneCoins((t) => t.free);
export const PREMIUM_LANE_TOTAL = laneCoins((t) => t.premium);

// --- other cosmetics: earned, never sold ----------------------------------------------------------------------

/** Rewards that aren't in the shop - where each one comes from (launcher daily table, pass, Plus). */
export const EARNED_COSMETICS: { name: string; from: string }[] = [
  { name: SEASON.headline, from: `Battle pass · level ${SEASON.levels}` },
  { name: "Ember hat", from: "Battle pass · level 25 pick" },
  { name: "Ember gauntlet", from: "Battle pass · level 25 pick" },
  ...DAILY_REWARDS.filter((r) => r.kind === "cosmetic").map((r) => ({
    name: r.name.replace(/^(Weekly|Fortnight|Third week): /, ""),
    from: `Daily reward · day ${r.day}`,
  })),
  { name: "Plus hat", from: "Catalyst Plus" },
  { name: "Plus gauntlet", from: "Catalyst Plus" },
];

// --- redeem codes --------------------------------------------------------------------------------------

/** Codes (launcher codes/Codes.kt, this site's lib/codes.ts). */
export const CODE_FORMAT = {
  example: "CATL-7KQ4-M9XH-3TRE",
  alphabetNote: "Twelve letters and digits, with no 0, O, 1, I or L - so nothing is misread.",
  where: "Launcher → Store → Coins → Redeem code",
} as const;

// --- the client ------------------------------------------------------------------------------------------

export type ModuleCategory = "HUD" | "Visual" | "PvP" | "World" | "Misc";

/**
 * The client's modules as its Right Shift menu lists them (every `Module` subclass in the client's
 * source, name and description as written there). The Title Screen module is customised on the title
 * screen itself, so the menu - and this list - leaves it out: 47.
 */
export const CLIENT_MODULES: { name: string; category: ModuleCategory; description: string }[] = [
  { name: "Armour Status", category: "HUD", description: "Durability of each armour piece, with a warning before one breaks." },
  { name: "Boss Bar", category: "HUD", description: "Move, resize, or hide the boss health bar." },
  { name: "Cooldowns", category: "HUD", description: "Shows every item on cooldown and how long it has left." },
  { name: "Coordinates", category: "HUD", description: "Your X, Y and Z position." },
  { name: "CPS", category: "HUD", description: "Left- and right-click rate over the last second." },
  { name: "Custom Crosshair", category: "HUD", description: "Your own crosshair - shape, colour, size and outline." },
  { name: "Eat Time", category: "HUD", description: "How long the food in your hand takes to finish eating." },
  { name: "FPS", category: "HUD", description: "Your frame rate." },
  { name: "Health Helper", category: "HUD", description: "Highlights golden apples in your inventory when your health drops low." },
  { name: "Hotbar Animations", category: "HUD", description: "The selection slides between slots and the chosen item pops." },
  { name: "Minimap", category: "HUD", description: "A map of the terrain around you." },
  { name: "Ping", category: "HUD", description: "Your network latency to the server." },
  { name: "Playtime", category: "HUD", description: "Time spent this session and in total." },
  { name: "Saturation", category: "HUD", description: "Shows hidden saturation as a gold outline on your hunger bar." },
  { name: "Custom Hand", category: "Visual", description: "Move, turn and resize the item you hold in first person." },
  { name: "Damage Numbers", category: "Visual", description: "Shows floating damage numbers above entities that take damage." },
  { name: "Fire Overlay", category: "Visual", description: "How much of your screen the fire effect covers, and how see-through it is." },
  { name: "Hitbox Outline", category: "Visual", description: "Outlines the hitboxes of players, mobs and more, in your colours." },
  { name: "Inventory Colour", category: "Visual", description: "Recolours the background of inventory and container screens." },
  { name: "Item Physics", category: "Visual", description: "Dropped items tumble as they fall and lie flat on the ground." },
  { name: "Particles", category: "Visual", description: "Hide the game's particles, or add a trail, an aura and hit effects of your own." },
  { name: "Shield Size", category: "Visual", description: "Make the raised shield take up less of your screen." },
  { name: "Projectile Prediction", category: "PvP", description: "Shows the path a projectile will fly while you aim." },
  { name: "Totem Pops & Health", category: "PvP", description: "Each player's health and totems popped, above their head." },
  { name: "Block Outline", category: "World", description: "Customise the outline box drawn on the block you're looking at." },
  { name: "Block Overlay", category: "World", description: "Fills the targeted block's own faces with a translucent overlay." },
  { name: "Clear Water", category: "World", description: "See as far under water as above it, without the murky overlay." },
  { name: "Custom Sky", category: "World", description: "Lavender days, pink dusks and starry nights with the Milky Way - your screen only." },
  { name: "Ender Pearl Trail", category: "World", description: "A glowing trail behind ender pearls in flight." },
  { name: "Fog Customiser", category: "World", description: "Choose how far the fog sits, how soft it is and its colour - or turn it off." },
  { name: "Free Look", category: "World", description: "Hold a key to look around your player without turning them." },
  { name: "Sky Shaders", category: "World", description: "Animated skies drawn by your graphics card: aurora, nebula, galaxy, End beams, caustics or a black hole - your screen only." },
  { name: "Fullbright", category: "World", description: "See in the dark - caves, nights and the Nether lit as if by day." },
  { name: "Time Changer", category: "World", description: "Locks the sky to a time of day you choose - your screen only." },
  { name: "Waypoints", category: "World", description: "Mark places with beams of light, and find your way back to where you died." },
  { name: "Zoom", category: "World", description: "Hold a key to zoom in." },
  { name: "Auto Sprint", category: "Misc", description: "Always sprint while moving forward." },
  { name: "Auto Text", category: "Misc", description: "Press a key to send a message or run a command." },
  { name: "Clear Inventory", category: "Misc", description: "Hold a key to drop your whole inventory." },
  { name: "Custom Controls", category: "Misc", description: "Plays the custom sounds and shows the inventory background picked in the launcher." },
  { name: "Hide Own Info", category: "Misc", description: "Redacts your username and coordinates, for streaming or screenshots." },
  { name: "Item Highlighter", category: "Misc", description: "Chosen items get a coloured background in your inventory." },
  { name: "Reminder", category: "Misc", description: "Set yourself a note with a timer, and get notified when it's up." },
  { name: "Shulker Preview", category: "Misc", description: "Hold a key over a shulker box to see inside." },
  { name: "Slot Lock", category: "Misc", description: "Chosen hotbar slots can't be dropped with Q." },
  { name: "Take / Deposit", category: "Misc", description: "Arrow buttons beside chest and inventory rows to move or drop items." },
  { name: "Toggle Sneak/Sprint", category: "Misc", description: "Press once instead of holding to sneak or sprint." },
];

export const MODULE_CATEGORIES: ModuleCategory[] = ["HUD", "Visual", "PvP", "World", "Misc"];

/** Sky Shaders' skies, as its Sky setting names them (client sky/SkyShader.java). */
export const SKY_SHADERS = ["Aurora", "Nebula", "Galaxy", "End Beams", "Caustics", "Black Hole"] as const;

/**
 * Minecraft sign-in (launcher auth/MicrosoftAuth.kt): Microsoft's own page in the browser, then Xbox Live,
 * then Minecraft's services - which only sign players in for launchers Mojang has put on its allow list.
 * Mojang reviewed Catalyst's app and approved it on this date. That is permission to use Minecraft
 * sign-in, not an endorsement of Catalyst, and the pages that mention it say so.
 */
export const SIGN_IN = {
  approvedOn: "28 September 2026",
  /** Microsoft's own page for seeing, and taking back, what an app may do with your account. */
  manageUrl: "https://account.live.com/consent/Manage",
} as const;

/** The mods every player starts with, kept up to date (launcher mods/PreinstalledMods.kt). */
export const PREINSTALLED_MODS = ["Sodium", "Lithium", "Dynamic FPS"] as const;

/**
 * The launcher's colour schemes and their dark-mode accents (theme/ThemePresets.kt); any colour works too.
 * Default has been sky blue in an indigo dark since 29 September 2026 (its DEFAULT_COLOUR).
 */
export const THEME_PRESETS = [
  { name: "Default", accent: "#2FABF5" },
  { name: "Deepslate", accent: "#BCC5D0" },
  { name: "Amethyst", accent: "#B888FA" },
  { name: "Cherry", accent: "#FA86B6" },
  { name: "Redstone", accent: "#F65754" },
  { name: "Copper", accent: "#F18E4C" },
  { name: "Emerald", accent: "#3BD68E" },
  { name: "Prismarine", accent: "#44D6D6" },
] as const;

// --- release notes ---------------------------------------------------------------------------------------

/** The newest stories on the launcher's News page (ui/pages/NewsPage.kt `newsItems`), word for word. */
export const RELEASE_NOTES: { title: string; date: string; tag: "Launcher" | "Client" | "Store"; excerpt: string; points: string[] }[] = [
  {
    title: "Sign in with Microsoft",
    date: "1 October 2026",
    tag: "Launcher",
    excerpt: "Catalyst now signs you in with your Microsoft account - Mojang has reviewed the app and allowed it. Sign in once on Microsoft's own page, and Play starts the game as you.",
    points: [
      "Add account opens Microsoft's sign-in page in your browser - Catalyst never sees your email or password.",
      "Microsoft asks which account to use, so you can pick the one that owns Minecraft.",
      "Play starts the game as your account: your name, your skin, and online servers.",
      "Your sign-in renews itself when it runs out, so you rarely have to sign in again.",
      "Switch account signs in with another account; Sign out forgets it on this computer.",
    ],
  },
  {
    title: "CurseForge is on",
    date: "1 October 2026",
    tag: "Launcher",
    excerpt: "The Mods page searches CurseForge as well as Modrinth.",
    points: [
      "The CurseForge tab shows its mods for your profile's Minecraft version and loader, with categories and sorting.",
      "All shows both platforms at once, each row saying where a mod is from.",
      "Install on a CurseForge mod links to its CurseForge page for now - installing straight from CurseForge comes once CurseForge confirms it.",
    ],
  },
  {
    title: "A new colour picker",
    date: "1 October 2026",
    tag: "Client",
    excerpt: "Picking a colour in the Right Shift menu is bigger and simpler - and it asks before throwing a change away.",
    points: [
      "A large colour field, hue and opacity sliders, and a before-and-after swatch - click its left half to go back.",
      "Type a colour as HEX, or as R, G, B and A.",
      "Sixteen preset colours, one click each.",
      "Save keeps the colour. Leaving with a change unsaved asks: save, discard, or keep editing.",
    ],
  },
  {
    title: "Sky Shaders, and a box behind your HUD",
    date: "30 September 2026",
    tag: "Client",
    excerpt: "Six animated skies, a background behind every HUD element, and an Edit HUD that is easier to arrange.",
    points: [
      "Sky Shaders: an aurora, a nebula, a galaxy, End beams, caustics or a black hole, drawn by your graphics card - your screen only.",
      "Choose its colour, brightness, speed and stars, or keep it for the night.",
      "Every HUD element can have a background box, in your colour, opacity, corners and padding.",
      "Edit HUD: elements are easier to grab, snap to each other and to the screen's edges, and stick together when dropped close.",
      "Shift and the arrow keys nudge an element; Ctrl+Z undoes a move.",
    ],
  },
  {
    title: "3D wings and gauntlets",
    date: "28 September 2026",
    tag: "Store",
    excerpt: "Wings modelled in 3D, the Stoneheart set and the Arcane Iron Gauntlet - worn in game, on your own player.",
    points: [
      "Raven, Wyvern, Seraph, Void Butterfly, Shattered and Crow Wings: 3D wings that beat, glide and fold as you move.",
      "The Stoneheart Wings and Stoneheart Gauntlet: gold, set with glowing stones that shed sparks.",
      "The Arcane Iron Gauntlet: cold iron and green fire.",
      "Wear in game, from the Store - a cape, wings and a gauntlet at once. For now only you see them.",
      "Free to wear while the Store is a preview.",
    ],
  },
  {
    title: "Mods from Modrinth and CurseForge, into the profile you pick",
    date: "26 September 2026",
    tag: "Launcher",
    excerpt: "Search both platforms at once, install into a profile with everything a mod needs, and keep mods up to date - all from the launcher.",
    points: [
      "All, Modrinth and CurseForge tabs, with filters for Minecraft version, loader, category and sort.",
      "Every row shows where a mod is from, its loader and the Minecraft versions it is made for.",
      "Install shows what will be installed - the mods it needs, and optional ones to tick - before anything is downloaded.",
      "A mod that doesn't fit your profile says why, and offers to make a profile it does fit.",
      "Downloads are checked against their hashes, and a failed update keeps the version that worked.",
      "Installed shows the updates available for your mods, each with Update.",
      "CurseForge turns on once the design site has its key; until then Modrinth works alone.",
    ],
  },
  {
    title: "A calmer launcher, and Modrinth mods",
    date: "25 September 2026",
    tag: "Launcher",
    excerpt: "Fewer boxes everywhere, a Mods page that browses and installs mods from Modrinth, and redeem codes that work the moment they are made.",
    points: [
      "Settings, Play, Controls and News rebuilt without a box round every row - plain rows parted by thin lines.",
      "Mods now browses Modrinth: search, sort and filter Fabric mods for 1.21.4, and install them with one click.",
      "Redeem codes are checked online, so a new code works straight away and can only be used once.",
      "Memory shows what your computer has and what the running game really got.",
      "A new battle pass icon, a brighter Shop and Coins tab, and real updates on this page.",
    ],
  },
  {
    title: "Minimap and projectile prediction",
    date: "25 September 2026",
    tag: "Client",
    excerpt: "A map of the terrain around you, the path your projectiles will fly, and colours of your own for highlighted items.",
    points: [
      "Minimap: a map of the terrain around you in the corner - square or round, and it can turn with you.",
      "Projectile Prediction: while you aim, see the path of arrows, tridents, pearls, snowballs, potions, bottles and wind charges, with a ball where they land.",
      "Item Highlighter: every chosen item can have its own colour, picked straight from the item list.",
      "Shulker Preview takes on the colour of the box you hover.",
    ],
  },
  {
    title: "Redeem codes, prices and the battle pass",
    date: "25 September 2026",
    tag: "Store",
    excerpt: "Codes for coins, sales, free items and exclusives - plus prices for wings and a battle pass that costs $8.99.",
    points: [
      "Redeem a code from the Coins tab: coins, a sale on wings, a free item or a code-only exclusive.",
      "Wings now have prices: Moth 1,500, Frost 2,000, Molten 2,400 and Prism 2,500 coins.",
      "The battle pass is $8.99, with a choice of a hat or a gauntlet at level 25 and wings at level 50.",
      "Daily rewards are a row of cards with pixel prizes, a lucky block on lucky days and streak saves.",
    ],
  },
  {
    title: "Fullbright, Clear Water and better hitboxes",
    date: "24 September 2026",
    tag: "Client",
    excerpt: "See in the dark without a potion, see through water, and hitboxes that follow F3+B.",
    points: [
      "Fullbright: dark places lit as if by day - no potion effect and no gamma change.",
      "Clear Water: water fog pushed out to your render distance, and no murky overlay under water.",
      "Hitbox Outline and F3+B are now one switch, and replace the game's white boxes while on.",
      "Custom Crosshair is drawn in Minecraft's own pixels, with a new Invert Like Vanilla blend.",
    ],
  },
  {
    title: "A title screen that is yours",
    date: "24 September 2026",
    tag: "Client",
    excerpt: "Drag, resize and recolour every button, star your favourite servers, and pick a moving background.",
    points: [
      "Edit mode: drag any button, resize it from its corner, set its opacity and colour.",
      "A glass dock you can move anywhere and turn sideways.",
      "Favourite servers under Realms and Mods, with live ping, and Quick Play.",
      "A background picker with nine shader backgrounds and pictures that drift under rolling fog.",
    ],
  },
];
