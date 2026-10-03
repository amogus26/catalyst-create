import { CATALOG, NOT_SOLD } from "./catalog.ts";
/**
 * What a redeem code gives, in the launcher's own grammar (its `CodeGrant` in codes/Codes.kt):
 * `coins:500`, `sale:20:7`, `item:Raven Wings`, `special:Creator Cape`. The launcher applies the
 * reward; the site only stores it and hands it over. Pure, so the admin form can use it too.
 */

/**
 * What an `item:` code may give: anything in the shop (lib/catalog.ts) and the few things never sold. An
 * `item:` code must name one of these or it grants nothing the player can see.
 */
export const SHOP_ITEMS: readonly string[] = [...CATALOG.map((entry) => entry.name), ...NOT_SOLD];

export type Reward =
  | { kind: "coins"; amount: number }
  | { kind: "plus"; days: number }
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
    case "plus":
      return `plus:${reward.days}`;
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
      return a && SHOP_ITEMS.includes(a) ? { kind, name: a } : null;
    case "plus": {
      const days = whole(a);
      return days >= 1 && days <= 366 && b === undefined ? { kind, days } : null;
    }
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
    case "plus":
      return `${reward.days} days of Catalyst Plus`;
  }
}
