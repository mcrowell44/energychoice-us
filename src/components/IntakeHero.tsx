import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  MapPin,
  XCircle,
  Zap,
} from "lucide-react";
import {
  CONTRACT_TERMS,
  resolveUsageTier,
  USAGE_TIERS,
  type ContractTermMonths,
} from "../lib/compliance";
import {
  checkDeregulatedAreaEligibility,
  findTexasCityByZip,
  searchTexasDeregulatedCities,
  type TexasDeregulatedCity,
} from "../lib/texasDeregulatedCities";

interface IntakeHeroProps {
  onSearchRates: (
    zip: string,
    kwh: number,
    termMonths: ContractTermMonths,
    cityLabel?: string
  ) => void;
  onClearResults?: () => void;
  presetSelection?: { city: string; zip: string; nonce: number } | null;
  isLoading?: boolean;
}

const REALTIME_TIERS = USAGE_TIERS.filter((t) => t.isRealTime);
const CUSTOM_24HR_TIERS = USAGE_TIERS.filter((t) => !t.isRealTime);

export const IntakeHero: React.FC<IntakeHeroProps> = ({
  onSearchRates,
  onClearResults,
  presetSelection,
  isLoading = false,
}) => {
  const [cityInput, setCityInput] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [kwhUsage, setKwhUsage] = useState<number>(1000);
  const [customUsage, setCustomUsage] = useState("");
  const [selectedTerm, setSelectedTerm] = useState<ContractTermMonths>(18);
  const [error, setError] = useState<string | null>(null);

  // Out-of-list Power to Choose verification state:
  // "PROMPT" -> asks Yes / No
  // "DECLINED" -> shows polite "Sorry, we can't help business owners in your area."
  const [ptcCheckState, setPtcCheckState] = useState<
    "NONE" | "PROMPT" | "DECLINED"
  >("NONE");

  useEffect(() => {
    if (presetSelection) {
      setCityInput(presetSelection.city);
      setZipCode(presetSelection.zip);
      setError(null);
      setPtcCheckState("NONE");
      setShowSuggestions(false);
    }
  }, [presetSelection]);

  const effectiveUsage = customUsage ? parseInt(customUsage, 10) : kwhUsage;
  const validUsage = !isNaN(effectiveUsage) && effectiveUsage > 0;
  const activeTier = validUsage
    ? resolveUsageTier(effectiveUsage)
    : USAGE_TIERS[0];

  const citySuggestions: TexasDeregulatedCity[] =
    cityInput.trim().length >= 1
      ? searchTexasDeregulatedCities(cityInput, 8)
      : [];

  const handleSelectSuggestedCity = (city: TexasDeregulatedCity) => {
    setCityInput(city.name);
    setZipCode(city.zip);
    setShowSuggestions(false);
    setError(null);
    setPtcCheckState("NONE");
  };

  const handleZipChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 5);
    setZipCode(digits);
    setError(null);
    setPtcCheckState("NONE");
    if (digits.length === 5 && !cityInput.trim()) {
      const matched = findTexasCityByZip(digits);
      if (matched) {
        setCityInput(matched.name);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowSuggestions(false);

    if (!validUsage) {
      setError(
        "Please enter a valid monthly consumption in kWh/month (1 or higher)."
      );
      return;
    }

    if (!zipCode.trim() && !cityInput.trim()) {
      setError(
        "Please enter your 5-digit service ZIP code or Texas city name."
      );
      return;
    }

    if (zipCode.trim() && !/^\d{5}$/.test(zipCode.trim())) {
      setError("Please enter a valid 5-digit ZIP code.");
      return;
    }

    const eligibility = checkDeregulatedAreaEligibility(zipCode, cityInput);

    if (eligibility.inDeregulatedList) {
      setPtcCheckState("NONE");
      if (eligibility.resolvedZip !== zipCode) {
        setZipCode(eligibility.resolvedZip);
      }
      if (eligibility.matchedCity && !cityInput.trim()) {
        setCityInput(eligibility.matchedCity.name);
      }
      onSearchRates(
        eligibility.resolvedZip,
        effectiveUsage,
        selectedTerm,
        eligibility.matchedCity?.name || cityInput.trim() || undefined
      );
      return;
    }

    // Not in the Texas deregulated cities/ZIPs list -> Ask if they have Power to Choose (Yes / No)
    onClearResults?.();
    setPtcCheckState("PROMPT");
  };

  const handleConfirmPowerToChooseYes = () => {
    setError(null);
    if (!/^\d{5}$/.test(zipCode.trim())) {
      setError(
        "Please enter your 5-digit service ZIP code above so we can load signup options for your area."
      );
      return;
    }
    setPtcCheckState("NONE");
    onSearchRates(
      zipCode.trim(),
      effectiveUsage,
      selectedTerm,
      cityInput.trim() || undefined
    );
  };

  const handleConfirmPowerToChooseNo = () => {
    setError(null);
    onClearResults?.();
    setPtcCheckState("DECLINED");
  };

  return (
    <section className="ec-hero-surface relative overflow-hidden rounded-3xl border border-[#0e2d5c] p-6 sm:p-12 text-white shadow-2xl">
      {/* Logo-matched ambient cyan & cobalt glow orbs + bottom perspective grid */}
      <div className="pointer-events-none absolute -top-24 left-1/4 h-72 w-[32rem] rounded-full bg-[#00e5ff]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-1/4 h-72 w-[32rem] rounded-full bg-[#0077ff]/20 blur-3xl" />
      <div className="ec-perspective-grid pointer-events-none absolute inset-x-0 bottom-0 h-48" />

      {/* Top-Right Signature Cyan & Cobalt Chevrons from Logo */}
      <div className="pointer-events-none hidden sm:flex items-center gap-2 absolute top-0 right-10">
        <div className="ec-chevron-cyan h-3.5 w-20" />
        <div className="ec-chevron-blue h-3.5 w-24" />
      </div>

      {/* Bottom-Right Signature Cyan & Cobalt Chevrons from Logo */}
      <div className="pointer-events-none hidden sm:flex items-center gap-2 absolute bottom-0 right-10">
        <div className="ec-chevron-blue h-3 w-24" />
        <div className="ec-chevron-cyan h-3 w-20" />
      </div>

      <div className="relative max-w-4xl mx-auto text-center space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-400/10 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase text-[#00e5ff] border border-cyan-400/30 shadow-[0_0_20px_rgba(0,229,255,0.15)]">
          <Zap className="h-3.5 w-3.5 text-[#00e5ff]" />
          Energy Choice US • Automated Multi-Term Energy Procurement
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
          Access Real <span className="text-[#00e5ff]">Market</span> Commercial{" "}
          <span className="bg-gradient-to-r from-[#00e5ff] to-[#38bdf8] bg-clip-text text-transparent">
            Energy Rates
          </span>
        </h1>
        <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto">
          Dynamic{" "}
          <span className="text-[#00e5ff] font-semibold">
            live multi-term rate quotes
          </span>{" "}
          across{" "}
          <span className="text-white font-mono">
            18, 24, 36, 48, 60 &amp; 72-month
          </span>{" "}
          terms for all 6 annual usage tiers up to{" "}
          <span className="text-white font-mono">3,000,000 kWh/yr</span>
          —automatic signup for Tier 1 or{" "}
          <span className="text-sky-300 font-semibold">
            24-hour pricing &amp; usage validation
          </span>{" "}
          for Tiers 2–6.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6 text-left max-w-3xl mx-auto"
        >
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* City + ZIP + Exact Monthly Usage Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* City Input with Deregulated Texas Autocomplete */}
            <div className="relative">
              <label className="block text-xs uppercase tracking-wider font-mono text-cyan-300/90 mb-2">
                Service City (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Houston, Dallas, Waco"
                  value={cityInput}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 160);
                  }}
                  onChange={(e) => {
                    setCityInput(e.target.value);
                    setShowSuggestions(true);
                    setError(null);
                    setPtcCheckState("NONE");
                  }}
                  className="w-full rounded-xl border border-[#0e2d5c] bg-[#031129]/95 px-4 py-3.5 text-base font-mono text-white placeholder-slate-500 focus:border-[#00e5ff] focus:shadow-[0_0_15px_rgba(0,229,255,0.2)] focus:outline-none transition-all"
                />
                <MapPin className="h-4 w-4 text-cyan-400/70 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>

              {showSuggestions && citySuggestions.length > 0 && (
                <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-cyan-500/40 bg-[#031129] shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                  {citySuggestions.map((city) => (
                    <button
                      type="button"
                      key={city.slug}
                      onMouseDown={(ev) => {
                        ev.preventDefault();
                        handleSelectSuggestedCity(city);
                      }}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-cyan-400/15 transition-colors flex items-center justify-between gap-2 border-b border-[#0e2d5c]/70 last:border-b-0 cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">
                          {city.name}, TX
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {city.tdspName}
                        </div>
                      </div>
                      <span className="rounded-md bg-cyan-400/15 border border-cyan-400/35 px-2 py-0.5 text-[10px] font-mono text-[#00e5ff]">
                        {city.zip}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 5-Digit ZIP Input */}
            <div>
              <label className="block text-xs uppercase tracking-wider font-mono text-cyan-300/90 mb-2">
                Service ZIP Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={5}
                placeholder="e.g. 75068 or 77002"
                value={zipCode}
                onChange={(e) => handleZipChange(e.target.value)}
                className="w-full rounded-xl border border-[#0e2d5c] bg-[#031129]/95 px-4 py-3.5 text-lg font-mono text-white placeholder-slate-500 focus:border-[#00e5ff] focus:shadow-[0_0_15px_rgba(0,229,255,0.2)] focus:outline-none transition-all"
              />
            </div>

            {/* Exact Monthly Usage */}
            <div>
              <label className="block text-xs uppercase tracking-wider font-mono text-cyan-300/90 mb-2">
                Monthly Usage (kWh / Mo)
              </label>
              <input
                type="number"
                min={1}
                max={10000000}
                placeholder="e.g. 1200 or 18500"
                value={customUsage}
                onChange={(e) => setCustomUsage(e.target.value)}
                className="w-full rounded-xl border border-[#0e2d5c] bg-[#031129]/95 px-4 py-3.5 text-lg font-mono text-white placeholder-slate-500 focus:border-[#00e5ff] focus:shadow-[0_0_15px_rgba(0,229,255,0.2)] focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Out-of-Area Power to Choose Yes/No Gate */}
          {ptcCheckState === "PROMPT" && (
            <div
              role="region"
              aria-label="Power to Choose Verification"
              className="rounded-2xl border border-cyan-400/50 bg-[#051838]/95 p-5 space-y-4 shadow-xl"
            >
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center text-[#00e5ff] shrink-0 mt-0.5">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-mono uppercase tracking-wider text-[#00e5ff] font-semibold">
                    Service Area Deregulation Check
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {cityInput.trim() && zipCode.trim()
                      ? `${cityInput.trim()} (${zipCode.trim()})`
                      : cityInput.trim() || `ZIP ${zipCode.trim()}`}{" "}
                    isn&apos;t in our listed Texas deregulated cities area. Do
                    you have the Power to Choose?
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Some municipalities, electric cooperatives, or out-of-area
                    ZIP codes have special retail choice eligibility. Please
                    confirm whether your meter has the{" "}
                    <strong className="text-white">Power to Choose</strong> your
                    electricity supplier:
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleConfirmPowerToChooseYes}
                  className="ec-btn-cyan inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs sm:text-sm font-extrabold transition-all cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Yes, I Have the Power to Choose — Proceed with Signup
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPowerToChooseNo}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#0e2d5c] bg-[#031129] hover:border-rose-500/50 hover:bg-rose-500/10 px-5 py-3 text-xs sm:text-sm font-bold text-slate-200 transition-all cursor-pointer"
                >
                  <XCircle className="h-4 w-4 text-rose-400" />
                  No
                </button>
              </div>
            </div>
          )}

          {/* Polite Message When User Selects "No" */}
          {ptcCheckState === "DECLINED" && (
            <div
              role="alert"
              className="rounded-2xl border border-[#0e2d5c] bg-[#031129]/95 p-6 text-center space-y-3 shadow-xl"
            >
              <div className="mx-auto h-10 w-10 rounded-full bg-[#051838] border border-cyan-400/30 flex items-center justify-center text-[#00e5ff]">
                <MapPin className="h-5 w-5" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Sorry, we can&apos;t help business owners in your area.
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
                Thank you for checking with Energy Choice US. Because utilities
                without retail electric choice require service directly through
                your local municipal or cooperative provider, we are unable to
                enroll meters in regulated territories.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setPtcCheckState("NONE");
                    setCityInput("");
                    setZipCode("");
                  }}
                  className="text-xs font-mono text-[#00e5ff] hover:text-cyan-300 underline underline-offset-4 cursor-pointer"
                >
                  Check another Texas deregulated city or ZIP code →
                </button>
              </div>
            </div>
          )}

          {/* Contract Term Selector (18, 24, 36, 48, 60, 72 Months) */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-mono text-[#00e5ff]">
                <Calendar className="h-3.5 w-3.5" />
                Contract Term Length (18 – 72 Months)
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Rates dynamically adjust per term on live quote curve
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {CONTRACT_TERMS.map((term) => {
                const isSelected = selectedTerm === term;
                return (
                  <button
                    type="button"
                    key={term}
                    onClick={() => setSelectedTerm(term)}
                    className={`rounded-xl border py-2.5 px-3 text-center font-mono transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#00e5ff] bg-cyan-400/20 text-white font-bold shadow-[0_0_18px_rgba(0,229,255,0.22)]"
                        : "border-[#0e2d5c] bg-[#031129]/85 text-slate-300 hover:border-cyan-400/40 hover:text-white"
                    }`}
                  >
                    <div className="text-sm font-extrabold">{term} Mo</div>
                    <div className="text-[10px] text-slate-400">
                      {(term / 12).toFixed(term % 12 === 0 ? 0 : 1)} Yr
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group 1: Tier 1 Automatic Signup (1,000 – 49,999 kWh Annually) */}
          <div className="space-y-4">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-mono text-[#00e5ff]">
                  <Zap className="h-3.5 w-3.5" />
                  Tier 1 Automatic Signup (1,000 – 49,999 kWh Annually)
                </span>
                <span className="text-[11px] font-mono text-cyan-300/90">
                  Immediate Rate Lock &amp; Signup
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {REALTIME_TIERS.map((tier) => {
                  const isActive = validUsage && activeTier.id === tier.id;
                  return (
                    <button
                      type="button"
                      key={tier.id}
                      onClick={() => {
                        setKwhUsage(tier.presetKwh);
                        setCustomUsage(String(tier.presetKwh));
                      }}
                      className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                        isActive
                          ? "border-[#00e5ff] bg-cyan-400/15 text-white shadow-[0_0_24px_rgba(0,229,255,0.18)]"
                          : "border-[#0e2d5c] bg-[#031129]/85 text-slate-300 hover:border-cyan-400/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono uppercase text-[#00e5ff] font-semibold">
                          {tier.shortName} • Automatic Signup
                        </span>
                        <span className="rounded-full bg-cyan-400/20 border border-cyan-400/30 px-2 py-0.5 text-[10px] font-mono text-cyan-200">
                          Instant Lock
                        </span>
                      </div>
                      <div className="text-sm sm:text-base font-extrabold font-mono text-white mt-1">
                        {tier.rangeLabel}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {tier.subLabel}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Group 2: Tiers 2–6 Live Quotes — 24-Hour Turnaround for Pricing & Usage Validation (50,000 – 3,000,000 kWh Annually) */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-mono text-sky-300">
                  <Clock className="h-3.5 w-3.5 text-sky-400" />
                  Tiers 2–6 Live Quotes — 24-Hr Turnaround for Pricing &amp;
                  Usage Validation (50,000 – 3,000,000 kWh Annually)
                </span>
                <span className="text-[11px] font-mono text-sky-300/90">
                  See Live Quotes First • 24-Hr Validation &amp; Emailed Signup
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {CUSTOM_24HR_TIERS.map((tier) => {
                  const isActive = validUsage && activeTier.id === tier.id;
                  return (
                    <button
                      type="button"
                      key={tier.id}
                      onClick={() => {
                        setKwhUsage(tier.presetKwh);
                        setCustomUsage(String(tier.presetKwh));
                      }}
                      className={`rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                        isActive
                          ? "border-sky-400 bg-sky-500/20 text-white shadow-[0_0_24px_rgba(0,136,255,0.24)]"
                          : "border-[#0e2d5c] bg-[#031129]/85 text-slate-300 hover:border-sky-400/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-mono uppercase text-sky-300 font-semibold">
                          {tier.shortName}
                        </span>
                        <span className="rounded-full bg-sky-500/25 border border-sky-400/30 px-2 py-0.5 text-[10px] font-mono text-sky-200">
                          24-Hr Verify
                        </span>
                      </div>
                      <div className="text-xs font-extrabold font-mono text-white mt-1">
                        {tier.rangeLabel}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {tier.subLabel}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Active Tier Routing Summary Bar */}
          <div
            className={`rounded-2xl border px-4 py-3 text-xs font-mono flex flex-wrap items-center justify-between gap-2 ${
              activeTier.isRealTime
                ? "border-cyan-400/35 bg-cyan-400/10 text-cyan-200"
                : "border-sky-400/40 bg-sky-500/15 text-sky-200"
            }`}
          >
            <span>
              Active: <strong>{activeTier.shortName}</strong> (
              {activeTier.rangeLabel}) •{" "}
              {validUsage
                ? `${effectiveUsage.toLocaleString()} kWh/mo (${(effectiveUsage * 12).toLocaleString()} kWh/yr)`
                : "—"}{" "}
              • <strong>{selectedTerm} Months</strong>
            </span>
            <span>
              {activeTier.isRealTime
                ? `⚡ Automatic Signup (${selectedTerm}-Mo) → Bill Upload, LOE & Sign`
                : `⚡ Live ${selectedTerm}-Mo Quotes → Reserve Rate (24-Hr Pricing & Usage Validation)`}
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full rounded-xl py-4 px-6 font-extrabold transition-all disabled:opacity-50 disabled:cursor-wait active:scale-[0.99] cursor-pointer ${
              activeTier.isRealTime ? "ec-btn-cyan" : "ec-btn-cobalt"
            }`}
          >
            {isLoading
              ? "Gathering Live Multi-Term Supplier Quotes..."
              : activeTier.isRealTime
                ? `View Real-Time ${selectedTerm}-Month & Multi-Term Offers →`
                : `View Live ${selectedTerm}-Month Quotes to Reserve (${activeTier.rangeLabel}) →`}
          </button>
        </form>
      </div>
    </section>
  );
};
