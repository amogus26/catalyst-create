import { createHash } from "node:crypto";

/**
 * The daily rewards, as the account server pays them - the launcher's `DailyRewardTable` and
 * `LuckyDays` (daily/DailyRewardsStore.kt, daily/LuckyDays.kt), to the coin. Both are pinned to the same
 * vectors: `npm run check:codes` here and DailyRewardsTest there.
 *
 * A month: coins most days, a hat on the 7th, 14th and 21st, and on its last day a hamster with the
 * biggest coins. The hats and hamsters come round in turn, month by month, so every month gives
 * different ones; a hat or hamster already owned pays [DUPLICATE_COINS] instead. Three lucky days a
 * month pay double, picked from the month's name, so every machine and the server agree on them.
 *
 * No `@/` imports, so `npm run check:codes` can run this file with plain `node`.
 */

export const DAILY_HATS = ["Party Hat", "Knit Beanie", "Baseball Cap", "Straw Hat", "Propeller Cap", "Chef Hat"] as const;
export const DAILY_PETS = ["Golden Hamster", "Snowball Hamster", "Panda Hamster"] as const;

const HAT_DAYS = [7, 14, 21] as const;

/** Coins for days 1-30; day 30 only when it is not the month's last. */
const COINS = [
  10, 10, 15, 15, 15, 20, 20, 15, 20, 20,
  20, 25, 25, 30, 40, 25, 25, 25, 30, 30,
  30, 30, 30, 30, 30, 35, 35, 35, 35, 35,
] as const;

export const FINALE_COINS = 90;
export const LUCKY_MULTIPLIER = 2;
export const YEAR_GIFT_COINS = 10_000;

/** What a hat or hamster already owned pays instead. */
export const DUPLICATE_COINS = { hat: 10, pet: 20 } as const;

export interface DailyReward {
  day: number;
  coins: number;
  item: string | null;
  kind: "coins" | "hat" | "pet";
  lucky: boolean;
}

function parseMonth(monthKey: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) throw new Error(`Not a month: ${monthKey}`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

export function daysInMonth(monthKey: string): number {
  const { year, month } = parseMonth(monthKey);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function monthIndex(monthKey: string): number {
  const { year, month } = parseMonth(monthKey);
  return year * 12 + (month - 1);
}

/** Days that pay only coins: what a lucky day may land on. */
function plainCoinDay(monthKey: string, day: number): boolean {
  return day < daysInMonth(monthKey) && !(HAT_DAYS as readonly number[]).includes(day);
}

/** The month's three lucky days, one in each of 1-10, 11-20 and 21-29, from SHA-256("lucky-days:" + month). */
export function luckyDays(monthKey: string): Set<number> {
  const bytes = createHash("sha256").update(`lucky-days:${monthKey}`, "utf8").digest();
  const stretches = [
    [1, 10],
    [11, 20],
    [21, 29],
  ] as const;
  const days = new Set<number>();
  stretches.forEach(([from, to], i) => {
    const paying: number[] = [];
    for (let day = from; day <= to; day++) if (plainCoinDay(monthKey, day)) paying.push(day);
    if (paying.length > 0) days.add(paying[(bytes[2 * i] * 256 + bytes[2 * i + 1]) % paying.length]);
  });
  return days;
}

/** What [day] of [monthKey] ("2026-10") gives. */
export function dailyReward(monthKey: string, day: number): DailyReward {
  const last = daysInMonth(monthKey);
  if (!Number.isInteger(day) || day < 1 || day > last) throw new Error(`${monthKey} has no day ${day}`);
  const index = monthIndex(monthKey);
  if (day === last) {
    return { day, coins: FINALE_COINS, item: DAILY_PETS[index % DAILY_PETS.length], kind: "pet", lucky: false };
  }
  const hat = (HAT_DAYS as readonly number[]).indexOf(day);
  if (hat >= 0) {
    return { day, coins: COINS[day - 1], item: DAILY_HATS[(index * HAT_DAYS.length + hat) % DAILY_HATS.length], kind: "hat", lucky: false };
  }
  const lucky = luckyDays(monthKey).has(day);
  return { day, coins: COINS[day - 1] * (lucky ? LUCKY_MULTIPLIER : 1), item: null, kind: "coins", lucky };
}

/** The most a month can pay: every card, lucky days doubled, every hat and hamster a duplicate. */
export function monthMaxCoins(monthKey: string): number {
  let total = 0;
  for (let day = 1; day <= daysInMonth(monthKey); day++) {
    const reward = dailyReward(monthKey, day);
    total += reward.coins + (reward.kind === "coins" ? 0 : DUPLICATE_COINS[reward.kind]);
  }
  return total;
}
