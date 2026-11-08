export const STANDARD_DISCLOSURE =
  "This is a 100% automated system connected with major suppliers nationwide to provide the optimum search and opportunities available for users to cut time and research with a wide variety of options. Speed to need is the motto.";

export const ADMIN_NOTIFICATION_EMAIL = "energychoiceus@cdmweb.store";

export const CONTRACT_TERMS = [18, 24, 36, 48, 60, 72] as const;
export type ContractTermMonths = (typeof CONTRACT_TERMS)[number];

export function normalizeContractTerm(raw: unknown): ContractTermMonths {
  const num = Number(raw);
  if ((CONTRACT_TERMS as readonly number[]).includes(num)) {
    return num as ContractTermMonths;
  }
  return 18;
}

export type UsageTierId =
  | "TIER_1"
  | "TIER_2"
  | "TIER_3"
  | "TIER_4"
  | "TIER_5"
  | "TIER_6";

export interface UsageTierSpec {
  id: UsageTierId;
  shortName: string;
  rangeLabel: string;
  subLabel: string;
  minAnnualKwh: number;
  maxAnnualKwh: number;
  minKwh: number;
  maxKwh: number;
  presetKwh: number;
  isRealTime: boolean;
  turnaroundLabel: string;
}

export const USAGE_TIERS: UsageTierSpec[] = [
  {
    id: "TIER_1",
    shortName: "Tier 1",
    rangeLabel: "12,000 – 49,999 kWh Annually",
    subLabel: "Automatic Signup (1,000 – 4,166 kWh/mo)",
    minAnnualKwh: 12000,
    maxAnnualKwh: 49999,
    minKwh: 1000,
    maxKwh: 4166,
    presetKwh: 2000,
    isRealTime: true,
    turnaroundLabel: "Automatic Real-Time Signup",
  },
  {
    id: "TIER_2",
    shortName: "Tier 2",
    rangeLabel: "50,000 – 99,999 kWh Annually",
    subLabel: "Small Commercial (~4,167 – 8,333 kWh/mo)",
    minAnnualKwh: 50000,
    maxAnnualKwh: 99999,
    minKwh: 4167,
    maxKwh: 8333,
    presetKwh: 6000,
    isRealTime: false,
    turnaroundLabel: "Live Quote • 24-Hr Validation",
  },
  {
    id: "TIER_3",
    shortName: "Tier 3",
    rangeLabel: "100,000 – 299,999 kWh Annually",
    subLabel: "Mid Commercial (~8,334 – 24,999 kWh/mo)",
    minAnnualKwh: 100000,
    maxAnnualKwh: 299999,
    minKwh: 8334,
    maxKwh: 24999,
    presetKwh: 15000,
    isRealTime: false,
    turnaroundLabel: "Live Quote • 24-Hr Validation",
  },
  {
    id: "TIER_4",
    shortName: "Tier 4",
    rangeLabel: "300,000 – 499,999 kWh Annually",
    subLabel: "Large Commercial (~25,000 – 41,666 kWh/mo)",
    minAnnualKwh: 300000,
    maxAnnualKwh: 499999,
    minKwh: 25000,
    maxKwh: 41666,
    presetKwh: 30000,
    isRealTime: false,
    turnaroundLabel: "Live Quote • 24-Hr Validation",
  },
  {
    id: "TIER_5",
    shortName: "Tier 5",
    rangeLabel: "500,000 – 999,999 kWh Annually",
    subLabel: "Heavy Commercial (~41,667 – 83,333 kWh/mo)",
    minAnnualKwh: 500000,
    maxAnnualKwh: 999999,
    minKwh: 41667,
    maxKwh: 83333,
    presetKwh: 60000,
    isRealTime: false,
    turnaroundLabel: "Live Quote • 24-Hr Validation",
  },
  {
    id: "TIER_6",
    shortName: "Tier 6",
    rangeLabel: "1,000,000 – 3,000,000 kWh Annually",
    subLabel: "Industrial / Megawatt (83,334 – 250,000+ kWh/mo)",
    minAnnualKwh: 1000000,
    maxAnnualKwh: 3000000,
    minKwh: 83334,
    maxKwh: 250000,
    presetKwh: 150000,
    isRealTime: false,
    turnaroundLabel: "Live Quote • 24-Hr Validation",
  },
];

export function resolveUsageTier(monthlyKwh: number): UsageTierSpec {
  const safeMonthly = Math.max(1, Math.floor(monthlyKwh));
  const annualKwh = safeMonthly * 12;
  if (annualKwh < 50000) return USAGE_TIERS[0];
  if (annualKwh < 100000) return USAGE_TIERS[1];
  if (annualKwh < 300000) return USAGE_TIERS[2];
  if (annualKwh < 500000) return USAGE_TIERS[3];
  if (annualKwh < 1000000) return USAGE_TIERS[4];
  return USAGE_TIERS[5];
}

export interface PlanTierBandColumn {
  label: string;
  rate_cents: number;
  is_active: boolean;
}

export interface SparkPlan {
  plan_id: string;
  provider: string;
  plan_name: string;
  term_months: number;
  rate_per_kwh_cents: number;
  rate_500_cents: number;
  rate_1000_cents: number;
  rate_2000_cents: number;
  tier_columns?: PlanTierBandColumn[];
  rate_structure_note?: string;
  applied_tier_label: string;
  est_monthly_bill: number;
  renewable_pct: number;
  cancellation_fee: number;
  company_logo?: string;
  source?:
  | "live-daily-feed"
  | "live-commercial-matrix"
  | "regional-daily-seed";
}

export interface SparkMatchResponse {
  mode: "TIER1_REALTIME" | "TIER2_REALTIME_LOE" | "CUSTOM_24HR_LOE";
  tier_id: UsageTierId;
  tier_range_label: string;
  turnaround_sla: "REAL_TIME" | "24_HOUR_TURNAROUND";
  territory: string;
  iso: string;
  annualized_kwh: number;
  commercial_tier_label?: string;
  indicative_rate_range?: string;
  engine:
  | "live-daily-feed"
  | "live-commercial-matrix"
  | "regional-daily-seed"
  | "custom-24hr-desk";
  fetched_at: string;
  disclosure: string;
  selected_term_months: ContractTermMonths;
  available_terms: ContractTermMonths[];
  plans: SparkPlan[];
  plans_by_term?: Record<string, SparkPlan[]>;
}

export interface Tier1ProspectPayload {
  flow: "TIER1_1_1999_KWH";
  timestamp: string;
  zipCode: string;
  territory: string;
  allocatedKwh: number;
  appliedTierLabel: string;
  provider: string;
  planName: string;
  termMonths: number;
  rateCents: number;
  rate500Cents: number;
  rate1000Cents: number;
  rate2000Cents: number;
  estMonthlyBill: number;
  contactEmail: string;
  contactPhone: string;
  signerInitials: string;
  factSheetUrl?: string;
  enrollUrl?: string;
  enrollPhone?: string;
  adminNotificationEmail?: string;
  status: "PROSPECT_CAPTURED_TIER1";
}

export interface CommercialLoePayload {
  flow: "TIER2_REALTIME_LOE" | "CUSTOM_24HR_LOE";
  tierId: UsageTierId;
  tierRangeLabel: string;
  turnaroundSla: "REAL_TIME" | "24_HOUR_TURNAROUND";
  timestamp: string;
  zipCode: string;
  territory: string;
  monthlyKwh: number;
  annualizedKwh: number;
  commercialTierLabel: string;
  selectedProvider?: string;
  selectedPlanName?: string;
  selectedRateCents?: number;
  selectedTermMonths?: number;
  requestedTerms?: number[];
  estMonthlyBill?: number;
  businessName: string;
  authorizedSignerName: string;
  signerTitle: string;
  contactEmail: string;
  contactPhone: string;
  currentProvider?: string;
  billFileName: string;
  billMimeType: string;
  billFileSizeBytes: number;
  billBase64?: string;
  loeSigned: boolean;
  loeSignature: string;
  loeSignerInitials: string;
  adminNotificationEmail?: string;
  status: "LOE_REALTIME_RATE_LOCK" | "LOE_24HR_CUSTOM_QUOTE";
}

export type ExecutionRecord =
  | (Tier1ProspectPayload & { confirmationId: string; savedBillPath?: string })
  | (Omit<CommercialLoePayload, "billBase64"> & {
    confirmationId: string;
    savedBillPath?: string;
  });

/**
 * Computes the effective ¢/kWh rate across the Tier 1 sub-bands
 * for Tier 1 (12,000 – 49,999 kWh Annually | 1,000 – 4,166 kWh/month) meters.
 */
export function interpolateTier1Rate(
  usageKwh: number,
  rate500: number,
  rate1000: number,
  rate2000: number
): { effectiveRateCents: number; appliedTierLabel: string } {
  const clamped = Math.max(1, Math.min(4166, usageKwh));

  if (clamped <= 500) {
    return {
      effectiveRateCents: Number(rate500.toFixed(2)),
      appliedTierLabel: "Tier 1A (1,000–14,999 kWh/yr)",
    };
  }

  if (clamped <= 1500) {
    const ratio = (clamped - 500) / 1000;
    const interpolated = rate500 + ratio * (rate1000 - rate500);
    return {
      effectiveRateCents: Number(interpolated.toFixed(2)),
      appliedTierLabel: "Tier 1B (15,000–29,999 kWh/yr)",
    };
  }

  const ratio = (clamped - 1500) / 2666;
  const interpolated = rate1000 + ratio * (rate2000 - rate1000);
  return {
    effectiveRateCents: Number(interpolated.toFixed(2)),
    appliedTierLabel: "Tier 1C (30,000–49,999 kWh/yr)",
  };
}

/**
 * Computes the real-time commercial matrix rate across sub-bands inside
 * Tier 2 (2,000 – 49,999 kWh/month):
 * - Sub-band A: 2,000 – 9,999 kWh/mo
 * - Sub-band B: 10,000 – 24,999 kWh/mo
 * - Sub-band C: 25,000 – 49,999 kWh/mo
 */
export function computeTier2MatrixRate(
  usageKwh: number,
  band2kTo10k: number,
  band10kTo25k: number,
  band25kTo50k: number
): {
  effectiveRateCents: number;
  appliedTierLabel: string;
  activeBandIndex: 0 | 1 | 2;
} {
  if (usageKwh < 10000) {
    return {
      effectiveRateCents: Number(band2kTo10k.toFixed(2)),
      appliedTierLabel: "Tier 2A Matrix (2,000–9,999 kWh/mo)",
      activeBandIndex: 0,
    };
  }
  if (usageKwh < 25000) {
    return {
      effectiveRateCents: Number(band10kTo25k.toFixed(2)),
      appliedTierLabel: "Tier 2B Matrix (10,000–24,999 kWh/mo)",
      activeBandIndex: 1,
    };
  }
  return {
    effectiveRateCents: Number(band25kTo50k.toFixed(2)),
    appliedTierLabel: "Tier 2C Matrix (25,000–49,999 kWh/mo)",
    activeBandIndex: 2,
  };
}
