import React, { useRef, useState } from "react";
import { Clock, Info, Radio, Zap } from "lucide-react";
import { IntakeHero } from "./components/IntakeHero";
import { PlanComparisonGrid } from "./components/PlanComparisonGrid";
import { EmbeddedContractViewer } from "./components/EmbeddedContractViewer";
import { CommercialLoeIntake } from "./components/CommercialLoeIntake";
import { AutomatedBanner } from "./components/AutomatedBanner";
import {
  STANDARD_DISCLOSURE,
  type ExecutionRecord,
  type SparkMatchResponse,
  type SparkPlan,
} from "./lib/compliance";

export const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showDisclosureCard, setShowDisclosureCard] = useState(false);

  const [activeZip, setActiveZip] = useState<string>("");
  const [activeKwh, setActiveKwh] = useState<number>(1000);

  const [matchResult, setMatchResult] = useState<SparkMatchResponse | null>(
    null
  );
  const [selectedPlan, setSelectedPlan] = useState<SparkPlan | null>(null);
  const [capturedRecords, setCapturedRecords] = useState<ExecutionRecord[]>([]);

  const resultsRef = useRef<HTMLDivElement>(null);
  const checkoutRef = useRef<HTMLDivElement>(null);

  const handleSearchRates = async (zip: string, kwh: number) => {
    setLoading(true);
    setApiError(null);
    setSelectedPlan(null);

    try {
      const res = await fetch("/api/spark-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zip_code: zip,
          kwh_tier: kwh,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to retrieve daily rates.");
      }

      const typedData = data as SparkMatchResponse;
      setActiveZip(zip);
      setActiveKwh(kwh);
      setMatchResult(typedData);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: unknown) {
      setApiError(
        err instanceof Error ? err.message : "Failed to query supplier rates."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan: SparkPlan) => {
    setSelectedPlan(plan);
    setTimeout(() => {
      checkoutRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-white">
      {/* Header */}
      <header className="border-b border-neutral-900 bg-neutral-950/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-white">
                energychoice<span className="text-emerald-400">.us</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] font-mono text-neutral-500">
                SPEED TO NEED
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-mono text-emerald-300">
              <Radio className="h-3 w-3" />
              Real-Time: 1 â€“ 49,999 kWh
            </span>
            <span className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-mono text-amber-300">
              <Clock className="h-3 w-3" />
              24-Hr Quote: 50k â€“ 3M kWh
            </span>
            <button
              type="button"
              onClick={() => setShowDisclosureCard((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900 hover:border-emerald-500/40 px-3 py-1 text-xs text-neutral-300 transition-colors cursor-pointer"
            >
              <Info className="h-3.5 w-3.5 text-emerald-400" />
              Platform Operations
            </button>
          </div>
        </div>

        {showDisclosureCard && (
          <div className="border-t border-neutral-900 bg-neutral-900/95 px-4 py-3">
            <div className="max-w-4xl mx-auto text-xs text-emerald-300 font-mono text-center">
              â€œ{STANDARD_DISCLOSURE}â€
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        <IntakeHero onSearchRates={handleSearchRates} isLoading={loading} />

        {apiError && (
          <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300 text-center">
            {apiError}
          </div>
        )}

        <div ref={resultsRef}>
          {/* Real-Time Offer Grid: Tier 1 (1â€“1,999 kWh/mo) & Tier 2 (2,000â€“49,999 kWh/mo) */}
          {matchResult &&
            (matchResult.mode === "TIER1_REALTIME" ||
              matchResult.mode === "TIER2_REALTIME_LOE") && (
              <PlanComparisonGrid
                zipCode={activeZip}
                kwh={activeKwh}
                tierId={matchResult.tier_id}
                tierRangeLabel={matchResult.tier_range_label}
                territory={matchResult.territory}
                engine={matchResult.engine}
                fetchedAt={matchResult.fetched_at}
                plans={matchResult.plans}
                selectedPlanId={selectedPlan?.plan_id}
                onSelectPlan={handleSelectPlan}
              />
            )}

          {/* Tiers 3â€“6 (50,000 â€“ 3,000,000 kWh/mo): Direct 24-Hour Custom Quote + Bill & LOE Intake */}
          {matchResult && matchResult.mode === "CUSTOM_24HR_LOE" && (
            <CommercialLoeIntake
              key={`loe-24hr-${activeZip}-${activeKwh}`}
              zipCode={activeZip}
              kwh={activeKwh}
              territory={matchResult.territory}
              annualizedKwh={matchResult.annualized_kwh}
              tierRangeLabel={matchResult.tier_range_label}
              turnaroundSla="24_HOUR_TURNAROUND"
              commercialTierLabel={matchResult.commercial_tier_label}
              indicativeWholesaleRange={matchResult.indicative_wholesale_range}
              onLoeSubmitted={(record) =>
                setCapturedRecords((prev) => [record, ...prev])
              }
            />
          )}
        </div>

        {/* Selected Plan Checkout: Tier 1 Instant Prospect Capture OR Tier 2 Real-Time Lock with Bill + LOE */}
        <div ref={checkoutRef}>
          {selectedPlan && matchResult?.mode === "TIER1_REALTIME" && (
            <EmbeddedContractViewer
              key={`t1-${selectedPlan.plan_id}-${activeZip}-${activeKwh}`}
              zipCode={activeZip}
              territory={matchResult.territory}
              kwh={activeKwh}
              plan={selectedPlan}
              onSignComplete={(record) =>
                setCapturedRecords((prev) => [record, ...prev])
              }
            />
          )}

          {selectedPlan && matchResult?.mode === "TIER2_REALTIME_LOE" && (
            <CommercialLoeIntake
              key={`t2-${selectedPlan.plan_id}-${activeZip}-${activeKwh}`}
              zipCode={activeZip}
              kwh={activeKwh}
              territory={matchResult.territory}
              annualizedKwh={matchResult.annualized_kwh}
              tierRangeLabel={matchResult.tier_range_label}
              turnaroundSla="REAL_TIME"
              commercialTierLabel={matchResult.commercial_tier_label}
              selectedPlan={selectedPlan}
              onLoeSubmitted={(record) =>
                setCapturedRecords((prev) => [record, ...prev])
              }
            />
          )}
        </div>

        {/* Captured Prospects & Executed LOEs Session Ledger */}
        {capturedRecords.length > 0 && (
          <section className="mt-10 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
            <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-3">
              Captured Prospects &amp; Executed LOEs (Session Pipeline)
            </h4>
            <div className="space-y-2">
              {capturedRecords.map((rec, i) => (
                <div
                  key={`${rec.confirmationId}-${i}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-xs font-mono"
                >
                  <span
                    className={
                      rec.flow === "CUSTOM_24HR_LOE"
                        ? "text-amber-300 font-semibold"
                        : "text-emerald-400 font-semibold"
                    }
                  >
                    {rec.confirmationId}
                  </span>
                  {rec.flow === "TIER1_1_1999_KWH" ? (
                    <span className="text-neutral-300">
                      Tier 1 â€¢ {rec.allocatedKwh.toLocaleString()} kWh/mo @{" "}
                      {rec.rateCents.toFixed(2)}Â¢ ({rec.provider})
                    </span>
                  ) : rec.flow === "TIER2_REALTIME_LOE" ? (
                    <span className="text-neutral-300">
                      Tier 2 Lock â€¢ {rec.businessName} â€¢{" "}
                      {rec.monthlyKwh.toLocaleString()} kWh/mo @{" "}
                      {rec.selectedRateCents?.toFixed(2)}Â¢ (
                      {rec.selectedProvider})
                    </span>
                  ) : (
                    <span className="text-neutral-300">
                      24-Hr Quote ({rec.tierRangeLabel}) â€¢ {rec.businessName} â€¢{" "}
                      {rec.monthlyKwh.toLocaleString()} kWh/mo
                    </span>
                  )}
                  <span className="text-neutral-500">
                    {rec.contactEmail} â€¢ {rec.contactPhone}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <AutomatedBanner />
    </div>
  );
};

export default App;
