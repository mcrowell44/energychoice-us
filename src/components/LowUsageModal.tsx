import React from "react";
import { STANDARD_DISCLOSURE } from "../lib/compliance";

interface LowUsageModalProps {
  isOpen: boolean;
  onAcceptPoolPricing: () => void;
  onClose: () => void;
  reportedKwh: number;
  isLoading?: boolean;
}

export const LowUsageModal: React.FC<LowUsageModalProps> = ({
  isOpen,
  onAcceptPoolPricing,
  onClose,
  reportedKwh,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-3xl border border-emerald-500/30 bg-neutral-900 p-6 sm:p-8 shadow-2xl text-white">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
          <span>⚡ Same-Day Aggregated Volume Allocation</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-3">
          Special Volume Rate Access
        </h3>

        <p className="text-neutral-300 text-sm leading-relaxed mb-6">
          This corporate model is actually designed for higher usage entities
          due to the shopping required and personal relationship with account
          managers for each account; however, we want to meet everyone&apos;s
          needs. If you are prepared to see and sign up for today’s volume
          price, we can display and deliver an agreement based on previous
          clients from earlier today that are already secured.
        </p>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 mb-6">
          <div className="flex justify-between items-center text-xs text-neutral-400 mb-1">
            <span>Reported Monthly Usage:</span>
            <span className="font-mono text-neutral-200">
              {reportedKwh.toLocaleString()} kWh/mo
            </span>
          </div>
          <div className="flex justify-between items-center text-xs text-emerald-400 font-medium">
            <span>Procurement Status:</span>
            <span>Unlocked via Aggregated Pool</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onAcceptPoolPricing}
            disabled={isLoading}
            className="w-full rounded-xl bg-emerald-500 py-4 font-bold text-neutral-950 hover:bg-emerald-400 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] cursor-pointer"
          >
            {isLoading
              ? "Allocating Secured Pool Block..."
              : "Unlock & Review Today's Secured Agreement"}
          </button>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-full py-2 text-xs text-neutral-500 hover:text-neutral-400 cursor-pointer"
          >
            Return to Usage Adjustment
          </button>

          <p className="mt-2 text-center text-[11px] text-neutral-500 leading-tight">
            {STANDARD_DISCLOSURE}
          </p>
        </div>
      </div>
    </div>
  );
};

