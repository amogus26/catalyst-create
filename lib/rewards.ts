/**
 * What a redeem code gives, in the launcher's own grammar (its `CodeGrant` in codes/Codes.kt):
 * `coins:500`, `sale:20:7`, `item:Moth Wings`, `special:Creator Cape`. The launcher applies the
 * reward; the site only stores it and hands it over. Pure, so the admin form can use it too.
 */

/**
 * The launcher's shop items, by the exact names its Cosmetics page uses (`shopItems` in
 * CosmeticsPage.kt). An `item:` code must name one of these or it grants nothing the player can see.
 */
export const SHOP_ITEMS = [
  "Prism Wings",
  "Molten Wings",
  "Frost Wings",
  "Moth Wings",
  "Emberfall Cape",
  "Sculk Cape",
  "Aurora Cape",
  "Nightfall Cape",
  "Verdant Cape",
] as const;

export type Reward =
  | { kind: "coins"; amount: number }
  | { kind: "sale"; percentOff: number; days: number }
  | { kind: "item"; name: string }
  | { kind: "special"; name: string };

/** The reward in the launcher's grammar - what the database stores and the launcher applies. */
export function rewardSpec(reward: Reward): string {
  switch (reward.kind) {
    case "coins":
      return `coins:${reward.amount}`;
    case "sale":
      return `sale:${reward.percentOff}:${reward.days}`;
    case "item":
      return `item:${reward.name}`;
    case "special":
      return `special:${reward.name}`;
  }
}

/** Reads a spec, with the launcher's own limits; null when the launcher would refuse it. */
export function parseReward(spec: string): Reward | null {
  const [kind, a, b] = spec.split(":").map((part) => part.trim());
  const whole = (value: string | undefined) => (value && /^\d+$/.test(value) ? Number(value) : NaN);
  switch (kind) {
    case "coins": {
      const amount = whole(a);
      return amount >= 1 && amount <= 1_000_000 && b === undefined ? { kind, amount } : null;
    }
    case "sale": {
      const percentOff = whole(a);
      const days = whole(b);
      return percentOff >= 1 && percentOff <= 90 && days >= 1 && days <= 365
        ? { kind, percentOff, days }
        : null;
    }
    case "item":
      return a && (SHOP_ITEMS as readonly string[]).includes(a) ? { kind, name: a } : null;
    case "special": {
      const name = spec.slice("special:".length).trim();
      return name.length >= 2 && name.length <= 40 ? { kind, name } : null;
    }
    default:
      return null;
  }
}

/** "500 coins", "20% off wings for 7 days" - the launcher says it the same way. */
export function describeReward(spec: string): string {
  const reward = parseReward(spec);
  if (!reward) return spec;
  switch (reward.kind) {
    case "coins":
      return `${reward.amount.toLocaleString("en-GB")} coins`;
    case "sale":
      return `${reward.percentOff}% off wings for ${reward.days} days`;
    case "item":
      return `${reward.name}, free`;
    case "special":
      return `${reward.name} (exclusive)`;
  }
}
