import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, MapPin, Search, Zap } from "lucide-react";
import {
  FEATURED_TEXAS_CITIES,
  TEXAS_DEREGULATED_CITIES,
  type TexasDeregulatedCity,
} from "../lib/texasDeregulatedCities";

interface TexasDeregulatedCitiesDirectoryProps {
  activeCityName?: string;
  onSelectCity: (city: TexasDeregulatedCity) => void;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const TexasDeregulatedCitiesDirectory: React.FC<
  TexasDeregulatedCitiesDirectoryProps
> = ({ activeCityName, onSelectCity }) => {
  const [filterQuery, setFilterQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState<string>("ALL");
  const [expanded, setExpanded] = useState(false);

  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    for (const c of TEXAS_DEREGULATED_CITIES) {
      set.add(c.name[0].toUpperCase());
    }
    return set;
  }, []);

  const filteredCities = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    return TEXAS_DEREGULATED_CITIES.filter((city) => {
      if (activeLetter !== "ALL" && city.name[0].toUpperCase() !== activeLetter) {
        return false;
      }
      if (!q) return true;
      return (
        city.name.toLowerCase().includes(q) ||
        city.zip.startsWith(q) ||
        city.tdspName.toLowerCase().includes(q) ||
        city.aliases?.some((a) => a.toLowerCase().includes(q))
      );
    });
  }, [filterQuery, activeLetter]);

  const shouldShowAll =
    expanded || filterQuery.trim().length > 0 || activeLetter !== "ALL";
  const displayedCities = shouldShowAll
    ? filteredCities
    : filteredCities.slice(0, 60);

  return (
    <section
      id="texas-deregulated-cities"
      className="mt-14 rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 sm:p-10 text-white shadow-xl space-y-6"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-800 pb-6">
        <div className="space-y-2 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono text-emerald-300">
            <MapPin className="h-3.5 w-3.5" />
            {TEXAS_DEREGULATED_CITIES.length} Verified ERCOT Retail Choice
            Locations
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            The Complete List of Deregulated Cities in Texas
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Deregulated cities include Houston, Dallas, Fort Worth, Corpus
            Christi, Galveston, Waco, and many more. The complete list below
            reflects all the cities and towns in Texas with deregulated
            electricity markets—click any city to load instant{" "}
            <span className="text-emerald-300 font-mono">18–72 month</span>{" "}
            supplier quotes.
          </p>
        </div>

        {/* Search Input */}
        <div className="w-full sm:w-72">
          <div className="relative">
            <Search className="h-4 w-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter city, town, or ZIP..."
              value={filterQuery}
              onChange={(e) => {
                setFilterQuery(e.target.value);
                if (e.target.value.trim()) {
                  setActiveLetter("ALL");
                }
              }}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-10 pr-4 py-2.5 text-xs font-mono text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Featured Major Hubs */}
      <div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 mb-2.5 flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5" />
          Major Texas Deregulated Markets (Instant Rate Lookup)
        </div>
        <div className="flex flex-wrap gap-2">
          {FEATURED_TEXAS_CITIES.map((city) => {
            const isSelected =
              activeCityName?.toLowerCase() === city.name.toLowerCase();
            return (
              <button
                type="button"
                key={`featured-${city.slug}`}
                onClick={() => onSelectCity(city)}
                className={`rounded-full border px-3 py-1.5 text-xs font-mono transition-all cursor-pointer ${
                  isSelected
                    ? "border-emerald-400 bg-emerald-500/20 text-white font-bold"
                    : "border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-emerald-500/40 hover:text-emerald-300"
                }`}
              >
                {city.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* A-Z Index Bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-y border-neutral-800/80 py-3">
        <button
          type="button"
          onClick={() => setActiveLetter("ALL")}
          className={`rounded-lg px-2.5 py-1 text-xs font-mono transition-colors cursor-pointer ${
            activeLetter === "ALL"
              ? "bg-emerald-500 text-neutral-950 font-bold"
              : "bg-neutral-950 text-neutral-400 hover:text-white"
          }`}
        >
          All ({TEXAS_DEREGULATED_CITIES.length})
        </button>
        {ALPHABET.map((letter) => {
          const hasCities = availableLetters.has(letter);
          const isCurrent = activeLetter === letter;
          return (
            <button
              type="button"
              key={letter}
              disabled={!hasCities}
              onClick={() => setActiveLetter(letter)}
              className={`rounded-lg px-2 py-1 text-xs font-mono transition-colors ${
                !hasCities
                  ? "text-neutral-700 cursor-not-allowed"
                  : isCurrent
                    ? "bg-emerald-500 text-neutral-950 font-bold cursor-pointer"
                    : "bg-neutral-950 text-neutral-400 hover:text-white cursor-pointer"
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Complete City Grid */}
      {displayedCities.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-center text-xs font-mono text-neutral-400">
          No listed Texas deregulated city matched &ldquo;{filterQuery}&rdquo;.
          Enter your city or ZIP code in the rate search above to verify Power
          to Choose eligibility.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {displayedCities.map((city) => {
            const isSelected =
              activeCityName?.toLowerCase() === city.name.toLowerCase();
            return (
              <button
                type="button"
                key={city.slug}
                onClick={() => onSelectCity(city)}
                title={`View live electricity rates in ${city.name}, TX (${city.zip} • ${city.tdspName})`}
                className={`group rounded-xl border px-3 py-2 text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-500/15 text-white"
                    : "border-neutral-800/80 bg-neutral-950/70 text-neutral-300 hover:border-emerald-500/40 hover:bg-neutral-900"
                }`}
              >
                <span className="text-xs font-medium truncate group-hover:text-emerald-300 transition-colors">
                  {city.name}
                </span>
                <span className="text-[10px] font-mono text-neutral-500 group-hover:text-emerald-400 shrink-0">
                  {city.zip}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Expand / Collapse Full 360+ City List */}
      {!filterQuery.trim() &&
        activeLetter === "ALL" &&
        filteredCities.length > 60 && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-5 py-2.5 text-xs font-mono font-semibold text-emerald-300 transition-all cursor-pointer"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Collapse Directory Preview
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show All {TEXAS_DEREGULATED_CITIES.length} Deregulated Texas
                  Cities &amp; Towns (A–Z)
                </>
              )}
            </button>
          </div>
        )}
    </section>
  );
};

