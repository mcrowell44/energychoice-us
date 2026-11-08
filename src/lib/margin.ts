import { resolveUsageTier, type UsageTierId } from "./compliance";

/**
 * SERVER-ONLY BROKER MARGIN SCHEDULE (MILS)
 * 1 mil = $0.001 / kWh = 0.10¢ / kWh
 * Example: $0.065/kWh (6.50¢) + 10 mils ($0.010 / 1.00¢) = $0.075/kWh (7.50¢)
 *
 * Descending Mils by Usage Tier (Added to True Energy Cost Rate Only):
 * - Tier 1 (1 – 1,999 kWh/mo):             10 mils (+$0.010/kWh | +1.00¢/kWh)
 * - Tier 2 (2,000 – 49,999 kWh/mo):         8 mils (+$0.008/kWh | +0.80¢/kWh)
 * - Tier 3 (50,000 – 99,999 kWh/mo):        7 mils (+$0.007/kWh | +0.70¢/kWh)
 * - Tier 4 (100,000 – 499,999 kWh/mo):      5 mils (+$0.005/kWh | +0.50¢/kWh)
 * - Tier 5 (500,000 – 999,999 kWh/mo):      4 mils (+$0.004/kWh | +0.40¢/kWh)
 * - Tier 6 (1,000,000 – 3,000,000 kWh/mo):  3 mils (+$0.003/kWh | +0.30¢/kWh)
 */
export const TIER_MILS_SCHEDULE: Record<UsageTierId, number> = {
  TIER_1: 10,
  TIER_2: 8,
  TIER_3: 7,
  TIER_4: 5,
  TIER_5: 4,
  TIER_6: 3,
};

export function getTierMils(tierId: UsageTierId): number {
  return TIER_MILS_SCHEDULE[tierId];
}

export function getMilsForMonthlyKwh(monthlyKwh: number): {
  tierId: UsageTierId;
  mils: number;
  adderDollarsPerKwh: number;
  adderCentsPerKwh: number;
} {
  const tier = resolveUsageTier(monthlyKwh);
  const mils = TIER_MILS_SCHEDULE[tier.id];
  return {
    tierId: tier.id,
    mils,
    adderDollarsPerKwh: Number((mils * 0.001).toFixed(4)),
    adderCentsPerKwh: Number((mils * 0.1).toFixed(2)),
  };
}

/**
 * Adds tier mils (1 mil = 0.10¢/kWh = $0.001/kWh) to a raw ¢/kWh supplier rate.
 */
export function applyMilsToCentsRate(
  rawRateCents: number,
  mils: number
): number {
  return Number((rawRateCents + mils * 0.1).toFixed(2));
}

/**
 * Computes monthly and full-term broker margin revenue ($) for internal admin reporting.
 */
export function computeBrokerMarginRevenue(
  monthlyKwh: number,
  mils: number,
  termMonths: number
): {
  monthlyMarginDollars: number;
  totalTermMarginDollars: number;
} {
  const monthlyMarginDollars = Number((monthlyKwh * mils * 0.001).toFixed(2));
  const totalTermMarginDollars = Number(
    (monthlyMarginDollars * termMonths).toFixed(2)
  );
  return { monthlyMarginDollars, totalTermMarginDollars };
}

