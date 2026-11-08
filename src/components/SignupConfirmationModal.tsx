import React from "react";
import {
  CheckCircle2,
  FileCheck2,
  Printer,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";
import {
  ADMIN_NOTIFICATION_EMAIL,
  STANDARD_DISCLOSURE,
  type CommercialLoePayload,
} from "../lib/compliance";

export type ConfirmationRecord = Omit<CommercialLoePayload, "billBase64"> & {
  confirmationId: string;
  savedBillPath?: string;
};

interface SignupConfirmationModalProps {
  record: ConfirmationRecord;
  onClose: () => void;
}

export const SignupConfirmationModal: React.FC<
  SignupConfirmationModalProps
> = ({ record, onClose }) => {
  const isRealtimeLock =
    record.turnaroundSla === "REAL_TIME" && Boolean(record.selectedProvider);
  const isReserved24HrQuote =
    record.turnaroundSla === "24_HOUR_TURNAROUND" &&
    Boolean(record.selectedProvider);
  const rateCents = record.selectedRateCents ?? 0;
  const rateDollars = (rateCents / 100).toFixed(4);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-page-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#010a1a]/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6"
    >
      <div className="relative w-full max-w-3xl rounded-3xl border border-cyan-400/50 bg-[#031129] p-6 sm:p-10 text-white shadow-[0_0_60px_rgba(0,229,255,0.22)] space-y-6 my-8">
        {/* Top Accent Strip */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 rounded-t-3xl bg-gradient-to-r from-[#00e5ff] via-[#0088ff] to-[#0051cc]" />

        {/* Top Bar: Brand + Close CTA */}
        <div className="flex items-center justify-between gap-4 border-b border-[#0e2d5c] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-cyan-400/15 border border-cyan-400/40 flex items-center justify-center text-[#00e5ff]">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-extrabold tracking-wider uppercase text-[#00e5ff]">
                ENERGY CHOICE US • OFFICIAL CONFIRMATION PAGE
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Issued {new Date(record.timestamp).toLocaleString()}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Confirmation Page"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#0e2d5c] bg-[#010a1a] hover:border-cyan-400/50 hover:text-[#00e5ff] px-3.5 py-2 text-xs font-mono font-bold text-slate-200 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>

        {/* Status Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#0e2d5c] pb-5">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-cyan-400/20 border border-cyan-400/40 text-[#00e5ff] flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#00e5ff] font-semibold">
                {isRealtimeLock
                  ? "Utility Bill Verified • Automatic Rate Lock & LOE Executed"
                  : isReserved24HrQuote
                    ? "Rate Quote Reserved • 24-Hour Validation Active • Signup Emailed"
                    : "Utility Bill Verified • 24-Hour Validation & LOE Executed"}
              </span>
              <h2
                id="confirmation-page-title"
                className="text-xl sm:text-2xl font-extrabold text-white mt-0.5"
              >
                {isRealtimeLock && record.selectedProvider
                  ? `${record.selectedProvider} @ $${rateDollars}/kWh (${rateCents.toFixed(2)}¢) Locked`
                  : isReserved24HrQuote && record.selectedProvider
                    ? `${record.selectedProvider} @ $${rateDollars}/kWh (${rateCents.toFixed(2)}¢) Reserved`
                    : "24-Hour Pricing & Usage Validation Active"}
              </h2>
            </div>
          </div>

          <div className="rounded-xl border border-cyan-400/40 bg-[#010a1a] px-4 py-2.5 text-xs font-mono text-[#00e5ff] font-bold">
            Confirmation ID: {record.confirmationId}
          </div>
        </div>

        {/* Summary Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="rounded-2xl border border-[#0e2d5c] bg-[#010a1a] p-4 space-y-1">
            <div className="text-slate-400">ENTITY &amp; AUTHORIZED SIGNER</div>
            <div className="text-white font-bold text-sm">
              {record.businessName}
            </div>
            <div className="text-slate-300">
              {record.authorizedSignerName} ({record.signerTitle})
            </div>
            <div className="text-cyan-300/90 pt-1 truncate">
              {record.contactEmail}
            </div>
          </div>

          <div className="rounded-2xl border border-[#0e2d5c] bg-[#010a1a] p-4 space-y-1">
            <div className="text-slate-400">ANNUAL TIER &amp; USAGE</div>
            <div className="text-[#00e5ff] font-bold text-sm">
              {record.monthlyKwh.toLocaleString()} kWh/mo (
              {record.annualizedKwh.toLocaleString()} kWh/yr)
            </div>
            <div className="text-sky-300 font-semibold">
              {record.tierRangeLabel}
            </div>
            <div className="text-slate-300">
              {record.selectedTermMonths
                ? `${record.selectedTermMonths}-Month Fixed Term`
                : "Multi-Term Validation"}
            </div>
          </div>

          <div className="rounded-2xl border border-[#0e2d5c] bg-[#010a1a] p-4 space-y-1">
            <div className="text-slate-400">BILL, LOE &amp; E-SIGNATURE</div>
            <div className="text-[#00e5ff] font-bold text-sm truncate">
              {record.billFileName}
            </div>
            <div className="text-slate-300 flex items-center gap-1.5">
              <FileCheck2 className="h-3.5 w-3.5 text-[#00e5ff] shrink-0" />
              <span>
                Signed by {record.loeSignature} ({record.loeSignerInitials})
              </span>
            </div>
            <div className="text-cyan-300/90 pt-1">
              ZIP {record.zipCode} • {record.territory}
            </div>
          </div>
        </div>

        {/* Next Steps Explanation */}
        <div className="rounded-2xl border border-[#0e2d5c] bg-[#010a1a]/90 p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#00e5ff] font-semibold">
            <ShieldCheck className="h-4 w-4" />
            <span>What Happens Next</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            {isRealtimeLock && record.selectedProvider ? (
              <>
                Your <strong>{record.selectedTermMonths}-month</strong> fixed
                commercial energy supply rate of{" "}
                <span className="font-mono text-[#00e5ff] font-bold">
                  ${rateDollars}/kWh ({rateCents.toFixed(2)}¢/kWh)
                </span>{" "}
                with <strong>{record.selectedProvider}</strong> has been paired
                with your uploaded utility bill, executed Letter of Exclusivity
                (LOE), and electronic signature. Final confirmation and
                enrollment copies are routed to{" "}
                <span className="font-mono text-white font-semibold">
                  {record.contactEmail}
                </span>{" "}
                and our desk at{" "}
                <span className="font-mono text-[#00e5ff]">
                  {ADMIN_NOTIFICATION_EMAIL}
                </span>
                .
              </>
            ) : (
              <>
                Your reserved rate quote of{" "}
                <span className="font-mono text-sky-300 font-bold">
                  ${rateDollars}/kWh ({rateCents.toFixed(2)}¢/kWh)
                </span>{" "}
                with <strong>{record.selectedProvider}</strong> (
                {record.selectedTermMonths} Months) is now held for{" "}
                <strong>24-hour pricing &amp; usage validation</strong> against
                your uploaded utility statement. Once meter verification is
                complete within 24 hours, your final signup package will be
                emailed directly to{" "}
                <span className="font-mono text-white font-semibold">
                  {record.contactEmail}
                </span>
                .
              </>
            )}
          </p>
        </div>

        {/* Action Buttons: Print Receipt + Close Confirmation CTA */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-[#0e2d5c] bg-[#010a1a] hover:border-cyan-400/50 px-5 py-3.5 text-xs sm:text-sm font-mono font-bold text-slate-200 transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4 text-[#00e5ff]" />
            Print / Save Confirmation Copy
          </button>

          <button
            type="button"
            onClick={onClose}
            className="ec-btn-cyan inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-xs sm:text-sm font-extrabold transition-all cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            Close Confirmation &amp; Return to Home
          </button>
        </div>

        <p className="text-[11px] font-mono text-slate-400 text-center pt-1">
          {STANDARD_DISCLOSURE}
        </p>
      </div>
    </div>
  );
};

