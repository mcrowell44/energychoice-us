import React, { useRef, useState } from "react";
import { Clock, Info, MapPin, Radio, Zap } from "lucide-react";
import { IntakeHero } from "./components/IntakeHero";
import { PlanComparisonGrid } from "./components/PlanComparisonGrid";
import { CommercialLoeIntake } from "./components/CommercialLoeIntake";
import { TexasDeregulatedCitiesDirectory } from "./components/TexasDeregulatedCitiesDirectory";
import { AutomatedBanner } from "./components/AutomatedBanner";
import {
  ADMIN_NOTIFICATION_EMAIL,
  STANDARD_DISCLOSURE,
  type ContractTermMonths,
  type ExecutionRecord,
  type SparkMatchResponse,
  type SparkPlan,
} from "./lib/compliance";
import type { TexasDeregulatedCity } from "./lib/texasDeregulatedCities";

export const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showDisclosureCard, setShowDisclosureCard] = useState(false);

  const [activeZip, setActiveZip] = useState<string>("");
  const [activeCity, setActiveCity] = useState<string | undefined>(undefined);
  const [activeKwh, setActiveKwh] = useState<number>(1000);
  const [activeTerm, setActiveTerm] = useState<ContractTermMonths>(18);
  const [presetSelection, setPresetSelection] = useState<{
    city: string;
    zip: string;
    nonce: number;
  } | null>(null);

  const [matchResult, setMatchResult] = useState<SparkMatchResponse | null>(
    null
  );
  const [selectedPlan, setSelectedPlan] = useState<SparkPlan | null>(null);
  const [capturedRecords, setCapturedRecords] = useState<ExecutionRecord[]>([]);

  const resultsRef = useRef<HTMLDivElement>(null);
  const checkoutRef = useRef<HTMLDivElement>(null);

  const handleClearResults = () => {
    setMatchResult(null);
    setSelectedPlan(null);
    setApiError(null);
  };

  const handleSearchRates = async (
    zip: string,
    kwh: number,
    termMonths: ContractTermMonths,
    cityLabel?: string
  ) => {
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
          term_months: termMonths,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to retrieve daily rates.");
      }

      const typedData = data as SparkMatchResponse;
      if (cityLabel) {
        typedData.territory = `${cityLabel}, TX • ${typedData.territory}`;
      }
      setActiveZip(zip);
      setActiveCity(cityLabel);
      setActiveKwh(kwh);
      setActiveTerm(typedData.selected_term_months || termMonths);
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

  const handleSelectDirectoryCity = (city: TexasDeregulatedCity) => {
    setPresetSelection({
      city: city.name,
      zip: city.zip,
      nonce: Date.now(),
    });
    handleSearchRates(city.zip, activeKwh, activeTerm, city.name);
  };

  const handleTermChange = (newTerm: ContractTermMonths) => {
    setActiveTerm(newTerm);
    if (selectedPlan && matchResult?.plans_by_term?.[String(newTerm)]) {
      const nextTermPlans = matchResult.plans_by_term[String(newTerm)];
      const sameSupplier = nextTermPlans.find(
        (p) => p.provider.toLowerCase() === selectedPlan.provider.toLowerCase()
      );
      setSelectedPlan(sameSupplier || nextTermPlans[0] || null);
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
                18 – 72 MO TERMS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-mono text-emerald-300">
              <Radio className="h-3 w-3" />
              Real-Time: 1 – 49,999 kWh (18–72m)
            </span>
            <span className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-mono text-amber-300">
              <Clock className="h-3 w-3" />
              Live Reserve + 24-Hr Verify: 50k – 3M kWh
            </span>
            <a
              href="#texas-deregulated-cities"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900 hover:border-emerald-500/40 px-3 py-1 text-xs text-neutral-300 transition-colors"
            >
              <MapPin className="h-3.5 w-3.5 text-emerald-400" />
              Texas Cities
            </a>
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
            <div className="max-w-4xl mx-auto text-xs text-emerald-300 font-mono text-center space-y-1">
              <div>“{STANDARD_DISCLOSURE}”</div>
              <div className="text-neutral-400">
                Admin &amp; Notification Desk:{" "}
                <a
                  href={`mailto:${ADMIN_NOTIFICATION_EMAIL}`}
                  className="text-emerald-300 underline underline-offset-2"
                >
                  {ADMIN_NOTIFICATION_EMAIL}
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        <IntakeHero
          onSearchRates={handleSearchRates}
          onClearResults={handleClearResults}
          presetSelection={presetSelection}
          isLoading={loading}
        />

        {apiError && (
          <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300 text-center">
            {apiError}
          </div>
        )}

        <div ref={resultsRef}>
          {/* Live Multi-Term Quote Grid Across ALL 6 Usage Tiers (1 kWh – 3,000,000+ kWh/mo) */}
          {matchResult && matchResult.plans.length > 0 && (
            <PlanComparisonGrid
              zipCode={activeZip}
              kwh={activeKwh}
              tierId={matchResult.tier_id}
              tierRangeLabel={matchResult.tier_range_label}
              territory={matchResult.territory}
              engine={matchResult.engine}
              fetchedAt={matchResult.fetched_at}
              activeTerm={activeTerm}
              onChangeTerm={handleTermChange}
              plans={matchResult.plans}
              plansByTerm={matchResult.plans_by_term}
              selectedPlanId={selectedPlan?.plan_id}
              onSelectPlan={handleSelectPlan}
            />
          )}
        </div>

        {/* Selected Quote Checkout (All 6 Tiers): Step 1 Required Bill Upload -> Step 2 LOE, Reservation/Execution & Sign */}
        <div ref={checkoutRef}>
          {selectedPlan && matchResult && (
            <CommercialLoeIntake
              key={`lock-${selectedPlan.plan_id}-${activeZip}-${activeKwh}`}
              zipCode={activeZip}
              kwh={activeKwh}
              territory={matchResult.territory}
              annualizedKwh={matchResult.annualized_kwh}
              tierRangeLabel={matchResult.tier_range_label}
              turnaroundSla={matchResult.turnaround_sla}
              commercialTierLabel={matchResult.commercial_tier_label}
              indicativeRateRange={matchResult.indicative_rate_range}
              initialTermMonths={activeTerm}
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
                      Tier 1 ({rec.termMonths}m) •{" "}
                      {rec.allocatedKwh.toLocaleString()} kWh/mo @{" "}
                      {rec.rateCents.toFixed(2)}¢ ({rec.provider})
                    </span>
                  ) : rec.flow === "TIER2_REALTIME_LOE" ? (
                    <span className="text-neutral-300">
                      Rate Lock ({rec.selectedTermMonths}m) •{" "}
                      {rec.businessName} • {rec.monthlyKwh.toLocaleString()}{" "}
                      kWh/mo @ $
                      {((rec.selectedRateCents || 0) / 100).toFixed(4)}/kWh (
                      {rec.selectedProvider})
                    </span>
                  ) : rec.selectedProvider && rec.selectedRateCents ? (
                    <span className="text-neutral-300">
                      Reserved Quote ({rec.selectedTermMonths}m • 24-Hr Verify)
                      • {rec.businessName} • {rec.monthlyKwh.toLocaleString()}{" "}
                      kWh/mo @ $
                      {(rec.selectedRateCents / 100).toFixed(4)}/kWh (
                      {rec.selectedProvider})
                    </span>
                  ) : (
                    <span className="text-neutral-300">
                      24-Hr Quote ({rec.tierRangeLabel} •{" "}
                      {(rec.requestedTerms || [18, 24, 36, 48, 60, 72]).join(
                        "/"
                      )}
                      m) • {rec.businessName}
                    </span>
                  )}
                  <span className="text-neutral-500">
                    {rec.contactEmail} • {rec.contactPhone}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Complete List of Deregulated Cities in Texas Directory */}
        <TexasDeregulatedCitiesDirectory
          activeCityName={activeCity}
          onSelectCity={handleSelectDirectoryCity}
        />
      </main>

      <AutomatedBanner />
    </div>
  );
};

export default App;
