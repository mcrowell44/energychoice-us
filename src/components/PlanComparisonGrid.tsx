import React from "react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Leaf,
  Radio,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  CONTRACT_TERMS,
  STANDARD_DISCLOSURE,
  type ContractTermMonths,
  type SparkPlan,
  type UsageTierId,
} from "../lib/compliance";

interface PlanComparisonGridProps {
  zipCode: string;
  kwh: number;
  tierId: UsageTierId;
  tierRangeLabel: string;
  territory?: string;
  engine?: string;
  fetchedAt?: string;
  activeTerm: ContractTermMonths;
  onChangeTerm: (term: ContractTermMonths) => void;
  plans: SparkPlan[];
  plansByTerm?: Record<string, SparkPlan[]>;
  selectedPlanId?: string;
  onSelectPlan: (plan: SparkPlan) => void;
}

export const PlanComparisonGrid: React.FC<PlanComparisonGridProps> = ({
  zipCode,
  kwh,
  tierId,
  tierRangeLabel,
  territory,
  engine,
  fetchedAt,
  activeTerm,
  onChangeTerm,
  plans,
  plansByTerm,
  selectedPlanId,
  onSelectPlan,
}) => {
  const displayedPlans =
    plansByTerm?.[String(activeTerm)] &&
    plansByTerm[String(activeTerm)].length > 0
      ? plansByTerm[String(activeTerm)]
      : plans;

  if (!displayedPlans.length) return null;

  const isTier1 = tierId === "TIER_1";
  const isReserve24Hr =
    tierId === "TIER_3" ||
    tierId === "TIER_4" ||
    tierId === "TIER_5" ||
    tierId === "TIER_6";
  const isCommercialMatrix = !isTier1;

  return (
    <section className="mt-10 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/70 px-6 py-4">
        <div>
          <div
            className={`flex items-center gap-2 text-xs font-mono uppercase tracking-wider ${
              isReserve24Hr ? "text-amber-400" : "text-emerald-400"
            }`}
          >
            {isCommercialMatrix ? (
              <Building2 className="h-3.5 w-3.5" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            <span>
              {isReserve24Hr
                ? `${tierId.replace("_", " ")} Live C&I Quotes • Reserve for 24-Hr Verification (${tierRangeLabel})`
                : isCommercialMatrix
                  ? `Tier 2 Real-Time Commercial Matrix • ${tierRangeLabel}`
                  : `Tier 1 Real-Time Daily Provider Seed • ${tierRangeLabel}`}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            {isReserve24Hr
              ? `${activeTerm}-Month Reservable C&I Rate Quotes — ZIP ${zipCode}`
              : isCommercialMatrix
                ? `${activeTerm}-Month Commercial Matrix Quotes — ZIP ${zipCode}`
                : `${activeTerm}-Month Competing Provider Quotes — ZIP ${zipCode}`}
          </h2>
          {territory && (
            <p className="text-xs text-neutral-400 font-mono mt-0.5">
              {territory} • Volume:{" "}
              <span className="text-emerald-300 font-semibold">
                {kwh.toLocaleString()} kWh/month
              </span>{" "}
              ({(kwh * 12).toLocaleString()} kWh/yr •{" "}
              {displayedPlans[0]?.applied_tier_label})
            </p>
          )}
          {isReserve24Hr && (
            <p className="text-xs text-amber-300 font-mono mt-1.5">
              Select a live rate quote below to reserve it for 24-hour meter
              verification — final signup documents will be emailed directly to
              you.
            </p>
          )}
        </div>

        <div className="text-right space-y-1">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-mono ${
              isReserve24Hr
                ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {engine === "live-daily-feed" ||
            engine === "live-commercial-matrix" ? (
              <>
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                {isReserve24Hr
                  ? "Live C&I Curve • 24-Hr Verify"
                  : isCommercialMatrix
                    ? "Live Commercial Forward Curve"
                    : "Live Multi-Term Supplier Feed"}
              </>
            ) : (
              <>
                <ShieldCheck className="h-3.5 w-3.5" />
                Daily Calibrated Multi-Term Seed
              </>
            )}
          </span>
          {fetchedAt && (
            <p className="text-[10px] font-mono text-neutral-500">
              {displayedPlans.length} Quotes @ {activeTerm} Mos • Seeded{" "}
              {new Date(fetchedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Interactive Real-Time Contract Term Bar (18, 24, 36, 48, 60, 72 Months) */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-emerald-400">
            <Calendar className="h-3.5 w-3.5" />
            Select Contract Term — Pricing Updates Live by Term (18 – 72 Months)
          </span>
          <span className="text-[11px] font-mono text-neutral-400">
            Showing {displayedPlans.length} competing {activeTerm}-month quotes
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {CONTRACT_TERMS.map((term) => {
            const termPlans = plansByTerm?.[String(term)] || [];
            const leadPlan = termPlans[0];
            const isActive = activeTerm === term;

            return (
              <button
                type="button"
                key={term}
                onClick={() => onChangeTerm(term)}
                className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                  isActive
                    ? "border-emerald-500 bg-emerald-500/15 text-white shadow-lg shadow-emerald-500/10"
                    : "border-neutral-800 bg-neutral-950/80 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-sm font-extrabold font-mono text-white">
                    {term} Months
                  </span>
                  {isActive && (
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  )}
                </div>
                {leadPlan ? (
                  <>
                    <div
                      className={`text-sm font-mono font-bold mt-1 ${
                        isActive ? "text-emerald-300" : "text-emerald-400/80"
                      }`}
                    >
                      ${(leadPlan.rate_per_kwh_cents / 100).toFixed(4)}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-500 truncate">
                      {leadPlan.rate_per_kwh_cents.toFixed(2)}¢ • $
                      {leadPlan.est_monthly_bill.toLocaleString("en-US", {
                        maximumFractionDigits: 0,
                      })}
                      /mo
                    </div>
                  </>
                ) : (
                  <div className="text-[11px] font-mono text-neutral-500 mt-1">
                    {(term / 12).toFixed(term % 12 === 0 ? 0 : 1)}-Year Lock
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expanded Quote Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayedPlans.map((plan, idx) => {
          const isSelected = selectedPlanId === plan.plan_id;
          const totalContractEst = plan.est_monthly_bill * plan.term_months;
          const columns = plan.tier_columns || [
            {
              label: "500 kWh",
              rate_cents: plan.rate_500_cents,
              is_active: kwh <= 650,
            },
            {
              label: "1,000 kWh",
              rate_cents: plan.rate_1000_cents,
              is_active: kwh > 650 && kwh <= 1350,
            },
            {
              label: "2,000 kWh",
              rate_cents: plan.rate_2000_cents,
              is_active: kwh > 1350,
            },
          ];

          return (
            <div
              key={plan.plan_id}
              className={`relative flex flex-col justify-between rounded-3xl border p-5 transition-all ${
                isSelected
                  ? "border-emerald-500 bg-neutral-900 shadow-xl shadow-emerald-500/10"
                  : "border-neutral-800 bg-neutral-900/80 hover:border-neutral-700"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-3">
                  {idx === 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                      Lowest {plan.term_months}-Mo Rate
                    </span>
                  ) : plan.renewable_pct >= 100 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/15 border border-teal-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-teal-300">
                      100% Renewable
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-800 px-2.5 py-0.5 text-[10px] font-mono text-neutral-300">
                      Fixed Supply Lock
                    </span>
                  )}
                  <span className="rounded-lg border border-emerald-500/30 bg-neutral-950 px-2 py-0.5 text-[11px] font-mono font-bold text-emerald-300">
                    {plan.term_months} Mos
                  </span>
                </div>

                <h3 className="text-base font-bold text-white leading-snug">
                  {plan.provider}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
                  {plan.plan_name}
                </p>

                <div className="my-3.5 border-y border-neutral-800 py-3.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold font-mono text-emerald-400">
                      ${(plan.rate_per_kwh_cents / 100).toFixed(4)}
                    </span>
                    <span className="text-xs text-neutral-400 font-mono">
                      / kWh
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-300/80 font-mono mt-0.5">
                    ({plan.rate_per_kwh_cents.toFixed(2)}¢ / kWh)
                  </p>
                  <p className="text-xs text-neutral-300 mt-1 font-mono">
                    Est. Monthly:{" "}
                    <span className="text-white font-semibold">
                      $
                      {plan.est_monthly_bill.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      /mo
                    </span>
                  </p>
                  <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                    {plan.term_months}-Mo Est. Total: $
                    {totalContractEst.toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>

                {/* Sub-Tier / Matrix Band Schedule */}
                <div className="mb-3.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
                    {isCommercialMatrix
                      ? "Matrix Sub-Bands ($/kWh)"
                      : "Usage Sub-Tiers ($/kWh)"}
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center font-mono text-[11px]">
                    {columns.map((col) => (
                      <div
                        key={col.label}
                        className={`rounded-lg border px-1 py-1 ${
                          col.is_active
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            : "border-neutral-800 bg-neutral-950 text-neutral-400"
                        }`}
                      >
                        <div className="text-[9px] text-neutral-500 truncate">
                          {col.label}
                        </div>
                        <div className="font-semibold">
                          ${(col.rate_cents / 100).toFixed(4)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <ul className="space-y-1 text-xs text-neutral-400 mb-5">
                  <li className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1">
                      <Leaf className="h-3 w-3 text-emerald-400" />
                      Renewable
                    </span>
                    <span className="font-mono text-neutral-200">
                      {plan.renewable_pct}%
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Term Length</span>
                    <span className="font-mono text-white font-semibold">
                      {plan.term_months} Months
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Early Exit Fee</span>
                    <span className="font-mono text-neutral-200">
                      ${plan.cancellation_fee}
                    </span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => onSelectPlan(plan)}
                className={`w-full rounded-xl py-3 px-3.5 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? isReserve24Hr
                      ? "bg-amber-300 text-neutral-950"
                      : "bg-emerald-400 text-neutral-950"
                    : isReserve24Hr
                      ? "bg-amber-400 text-neutral-950 hover:bg-amber-300 shadow-md shadow-amber-500/15"
                      : "bg-emerald-500 text-neutral-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/15"
                }`}
              >
                {isSelected ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    {isReserve24Hr
                      ? "Quote Reserved — Upload Bill Below"
                      : "Rate Selected — Upload Bill Below"}
                  </>
                ) : isReserve24Hr ? (
                  `Reserve Rate Quote & LOE →`
                ) : (
                  `Lock in Rate & LOE →`
                )}
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[11px] text-neutral-500 font-mono px-4">
        {STANDARD_DISCLOSURE}
      </p>
    </section>
  );
};
