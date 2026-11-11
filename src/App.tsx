import React, { useRef, useState } from "react";
import { Clock, Info, MapPin, Radio } from "lucide-react";
import { IntakeHero } from "./components/IntakeHero";
import { PlanComparisonGrid } from "./components/PlanComparisonGrid";
import { CommercialLoeIntake } from "./components/CommercialLoeIntake";
import {
  SignupConfirmationModal,
  type ConfirmationRecord,
} from "./components/SignupConfirmationModal";
import { TexasDeregulatedCitiesDirectory } from "./components/TexasDeregulatedCitiesDirectory";
import { AutomatedBanner } from "./components/AutomatedBanner";
import {
  ADMIN_NOTIFICATION_EMAIL,
  STANDARD_DISCLOSURE,
  type ContractTermMonths,
  type SparkMatchResponse,
  type SparkPlan,
} from "./lib/compliance";
import type { TexasDeregulatedCity } from "./lib/texasDeregulatedCities";

const CONFIRMATION_STORAGE_KEY = "ec_active_confirmation";

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
  const [activeConfirmation, setActiveConfirmation] =
    useState<ConfirmationRecord | null>(() => {
      try {
        const saved = sessionStorage.getItem(CONFIRMATION_STORAGE_KEY);
        return saved ? (JSON.parse(saved) as ConfirmationRecord) : null;
      } catch {
        return null;
      }
    });

  const resultsRef = useRef<HTMLDivElement>(null);
  const checkoutRef = useRef<HTMLDivElement>(null);

  const handleOpenConfirmation = (record: ConfirmationRecord) => {
    try {
      sessionStorage.setItem(CONFIRMATION_STORAGE_KEY, JSON.stringify(record));
    } catch {
      // Ignore storage quota issues
    }
    setSelectedPlan(null);
    setMatchResult(null);
    setActiveConfirmation(record);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCloseConfirmation = () => {
    try {
      sessionStorage.removeItem(CONFIRMATION_STORAGE_KEY);
    } catch {
      // Ignore
    }
    setActiveConfirmation(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          res.status >= 500
            ? "Live pricing desk is currently refreshing market rates. Please try again in a moment."
            : "Unable to retrieve daily rates. Please try again."
        );
      }

      if (!res.ok) {
        throw new Error(data.error || data.details || "Unable to retrieve daily rates.");
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
    <div className="min-h-screen flex flex-col bg-[#010a1a] text-white">
      {/* Top Signature Cyan-to-Cobalt Accent Strip */}
      <div className="h-1 w-full bg-gradient-to-r from-[#00e5ff] via-[#0088ff] to-[#0051cc]" />

      {/* Header */}
      <header className="border-b border-[#0e2d5c]/80 bg-[#010a1a]/92 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/apple-touch-icon.png"
              alt="Energy Choice US Lightning Emblem"
              className="h-10 w-10 rounded-xl border border-cyan-400/40 shadow-[0_0_18px_rgba(0,229,255,0.3)] object-cover"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wider text-sm sm:text-base text-[#00e5ff] uppercase">
                  ENERGY CHOICE US
                </span>
                <span className="hidden sm:inline-block rounded-md border border-cyan-400/25 bg-[#051838] px-2 py-0.5 text-[10px] font-mono text-cyan-300">
                  18 – 72 MO TERMS
                </span>
              </div>
              <div className="text-[11px] text-slate-300 font-medium tracking-tight">
                Access Real <span className="text-[#00e5ff] font-bold">Market</span> Commercial Energy Rates
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-cyan-400/35 bg-cyan-400/10 px-3 py-1 text-[11px] font-mono text-cyan-300">
              <Radio className="h-3 w-3 text-[#00e5ff]" />
              Auto Signup: 1,000 – 49,999 kWh/yr
            </span>
            <span className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-sky-400/35 bg-sky-500/15 px-3 py-1 text-[11px] font-mono text-sky-200">
              <Clock className="h-3 w-3 text-sky-400" />
              24-Hr Validation: 50k – 3M kWh/yr
            </span>
            <a
              href="#texas-deregulated-cities"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#0e2d5c] bg-[#031129] hover:border-cyan-400/50 px-3 py-1 text-xs text-slate-200 transition-colors"
            >
              <MapPin className="h-3.5 w-3.5 text-[#00e5ff]" />
              Texas Cities
            </a>
            <button
              type="button"
              onClick={() => setShowDisclosureCard((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#0e2d5c] bg-[#031129] hover:border-cyan-400/50 px-3 py-1 text-xs text-slate-200 transition-colors cursor-pointer"
            >
              <Info className="h-3.5 w-3.5 text-[#00e5ff]" />
              Platform Operations
            </button>
          </div>
        </div>

        {showDisclosureCard && (
          <div className="border-t border-[#0e2d5c]/80 bg-[#031129]/95 px-4 py-3">
            <div className="max-w-4xl mx-auto text-xs text-cyan-300 font-mono text-center space-y-1">
              <div>“{STANDARD_DISCLOSURE}”</div>
              <div className="text-slate-400">
                Admin &amp; Notification Desk:{" "}
                <a
                  href={`mailto:${ADMIN_NOTIFICATION_EMAIL}`}
                  className="text-[#00e5ff] underline underline-offset-2"
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
              onLoeSubmitted={handleOpenConfirmation}
            />
          )}
        </div>

        {/* Dedicated Full-Screen Confirmation Page / Popup Modal with Close CTA */}
        {activeConfirmation && (
          <SignupConfirmationModal
            record={activeConfirmation}
            onClose={handleCloseConfirmation}
          />
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
