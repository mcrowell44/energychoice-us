import React, { useRef, useState } from "react";
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileUp,
  Lock,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  ADMIN_NOTIFICATION_EMAIL,
  CONTRACT_TERMS,
  STANDARD_DISCLOSURE,
  type CommercialLoePayload,
  type ContractTermMonths,
  type SparkPlan,
} from "../lib/compliance";

interface CommercialLoeIntakeProps {
  zipCode: string;
  kwh: number;
  territory: string;
  annualizedKwh: number;
  tierRangeLabel: string;
  turnaroundSla: "REAL_TIME" | "24_HOUR_TURNAROUND";
  commercialTierLabel?: string;
  indicativeRateRange?: string;
  initialTermMonths?: ContractTermMonths;
  selectedPlan?: SparkPlan | null;
  onLoeSubmitted: (
    record: Omit<CommercialLoePayload, "billBase64"> & {
      confirmationId: string;
      savedBillPath?: string;
    }
  ) => void;
}

export const CommercialLoeIntake: React.FC<CommercialLoeIntakeProps> = ({
  zipCode,
  kwh,
  territory,
  annualizedKwh,
  tierRangeLabel,
  turnaroundSla,
  commercialTierLabel,
  indicativeRateRange,
  selectedPlan,
  onLoeSubmitted,
}) => {
  const isRealtimeLock =
    turnaroundSla === "REAL_TIME" && Boolean(selectedPlan);
  const isReserved24HrQuote =
    turnaroundSla === "24_HOUR_TURNAROUND" && Boolean(selectedPlan);
  const hasSelectedQuote = Boolean(selectedPlan);

  // Step 1: Required Utility Bill Upload ("BILL_UPLOAD")
  // Step 2: LOE, Agreement Execution & Sign ("LOE_AND_SIGN") — unlocked only after bill is attached
  const [currentStep, setCurrentStep] = useState<
    "BILL_UPLOAD" | "LOE_AND_SIGN"
  >("BILL_UPLOAD");
  const [isDragging, setIsDragging] = useState(false);

  const [requestedTerms, setRequestedTerms] = useState<ContractTermMonths[]>([
    ...CONTRACT_TERMS,
  ]);
  const [businessName, setBusinessName] = useState("");
  const [authorizedSignerName, setAuthorizedSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [currentProvider, setCurrentProvider] = useState("");

  const [billFile, setBillFile] = useState<{
    name: string;
    type: string;
    size: number;
    base64: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loeSigned, setLoeSigned] = useState(false);
  const [loeSignature, setLoeSignature] = useState("");
  const [loeInitials, setLoeInitials] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedRecord, setSubmittedRecord] = useState<
    | (Omit<CommercialLoePayload, "billBase64"> & {
        confirmationId: string;
        savedBillPath?: string;
      })
    | null
  >(null);

  const processSelectedFile = (file: File | undefined) => {
    setFormError(null);
    if (!file) return;

    if (
      !/\.(pdf|png|jpe?g|webp)$/i.test(file.name) &&
      ![
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
      ].includes(file.type)
    ) {
      setFormError(
        "Utility bill must be a PDF, JPG, PNG, or WebP document/photo."
      );
      return;
    }

    if (file.size > 3.2 * 1024 * 1024) {
      setFormError(
        "Utility bill file must be under 3.2 MB (compress PDF or attach summary pages)."
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setBillFile({
          name: file.name,
          type: file.type || "application/pdf",
          size: file.size,
          base64: reader.result,
        });
      }
    };
    reader.onerror = () => {
      setFormError("Could not read utility bill file. Please try again.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processSelectedFile(e.target.files?.[0]);
  };

  const handleProceedToLoeStep = () => {
    setFormError(null);
    if (!billFile) {
      setFormError(
        "Uploading a recent electric utility bill is required to proceed to LOE & Agreement Execution."
      );
      return;
    }
    setCurrentStep("LOE_AND_SIGN");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!billFile) {
      setCurrentStep("BILL_UPLOAD");
      setFormError(
        "Please upload a copy of your recent electric utility bill to proceed."
      );
      return;
    }

    if (!loeSigned || !loeSignature.trim()) {
      setFormError(
        "Please check the LOE & Agreement Execution box and enter your full electronic signature."
      );
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/submit-loe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zipCode,
          territory,
          monthlyKwh: kwh,
          selectedProvider: selectedPlan?.provider,
          selectedPlanName: selectedPlan?.plan_name,
          selectedRateCents: selectedPlan?.rate_per_kwh_cents,
          selectedTermMonths: selectedPlan?.term_months,
          requestedTerms: hasSelectedQuote
            ? [selectedPlan!.term_months]
            : requestedTerms,
          estMonthlyBill: selectedPlan?.est_monthly_bill,
          businessName: businessName.trim(),
          authorizedSignerName: authorizedSignerName.trim(),
          signerTitle: signerTitle.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          currentProvider: currentProvider.trim(),
          billFileName: billFile.name,
          billMimeType: billFile.type,
          billFileSizeBytes: billFile.size,
          billBase64: billFile.base64,
          loeSigned,
          loeSignature: loeSignature.trim(),
          loeSignerInitials: loeInitials.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || "Unable to complete LOE & Agreement Execution."
        );
      }

      setSubmittedRecord(data.record);
      onLoeSubmitted(data.record);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Failed to execute LOE & Agreement package."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedRecord) {
    return (
      <section className="mt-10 rounded-3xl border border-emerald-500/40 bg-neutral-900 p-8 text-white shadow-2xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                {isRealtimeLock
                  ? "Utility Bill Verified • LOE & Rate Lock Agreement Executed"
                  : isReserved24HrQuote
                    ? "Rate Quote Reserved • 24-Hour Verification Active • Signup Emailed"
                    : "Utility Bill Verified • 24-Hour Custom Quote & LOE Executed"}
              </span>
              <h3 className="text-2xl font-bold text-white">
                {isRealtimeLock && selectedPlan
                  ? `${selectedPlan.provider} @ $${(selectedPlan.rate_per_kwh_cents / 100).toFixed(4)}/kWh (${selectedPlan.rate_per_kwh_cents.toFixed(2)}¢) Executed`
                  : isReserved24HrQuote && selectedPlan
                    ? `${selectedPlan.provider} @ $${(selectedPlan.rate_per_kwh_cents / 100).toFixed(4)}/kWh (${selectedPlan.rate_per_kwh_cents.toFixed(2)}¢) Reserved`
                    : "24-Hour Turnaround Custom Bidding Active"}
              </h3>
            </div>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-neutral-950 px-3.5 py-2 text-xs font-mono text-emerald-300">
            Confirmation: {submittedRecord.confirmationId}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <div className="text-neutral-500">ENTITY &amp; SIGNER</div>
            <div className="text-white font-semibold mt-1">
              {submittedRecord.businessName}
            </div>
            <div className="text-neutral-400">
              {submittedRecord.authorizedSignerName} (
              {submittedRecord.signerTitle})
            </div>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <div className="text-neutral-500">USAGE TIER &amp; TERM</div>
            <div className="text-amber-300 font-semibold mt-1">
              {submittedRecord.monthlyKwh.toLocaleString()} kWh/mo (
              {submittedRecord.tierRangeLabel})
            </div>
            <div className="text-neutral-400">
              {isRealtimeLock
                ? `Locked Offer (${selectedPlan?.term_months} Mos)`
                : isReserved24HrQuote
                  ? `Reserved ${selectedPlan?.term_months}-Mo Quote (24-Hr Verify)`
                  : "Guaranteed 24-Hour Turnaround"}
            </div>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <div className="text-neutral-500">BILL, LOE &amp; SIGNATURE</div>
            <div className="text-emerald-300 font-semibold mt-1 truncate">
              {submittedRecord.billFileName}
            </div>
            <div className="text-neutral-400">
              {isReserved24HrQuote
                ? "Quote Reserved & LOE Signed ✓"
                : "LOE & Agreement Signed ✓"}
            </div>
          </div>
        </div>

        <p className="text-sm text-neutral-300 leading-relaxed">
          {isRealtimeLock && selectedPlan ? (
            <>
              Your {selectedPlan.term_months}-month fixed rate lock of{" "}
              <span className="font-mono text-emerald-400 font-bold">
                ${(selectedPlan.rate_per_kwh_cents / 100).toFixed(4)}/kWh (
                {selectedPlan.rate_per_kwh_cents.toFixed(2)}¢/kWh)
              </span>{" "}
              with <strong>{selectedPlan.provider}</strong> has been paired with
              your uploaded utility bill, executed LOE, and binding electronic
              signature. Final meter confirmation and enrollment copies are
              being sent to{" "}
              <span className="font-mono text-white">
                {submittedRecord.contactEmail}
              </span>
              .
            </>
          ) : isReserved24HrQuote && selectedPlan ? (
            <>
              Your live rate quote of{" "}
              <span className="font-mono text-amber-300 font-bold">
                ${(selectedPlan.rate_per_kwh_cents / 100).toFixed(4)}/kWh (
                {selectedPlan.rate_per_kwh_cents.toFixed(2)}¢/kWh)
              </span>{" "}
              with <strong>{selectedPlan.provider}</strong> (
              {selectedPlan.term_months} months) is now{" "}
              <strong className="text-white">
                reserved for 24-hour meter &amp; load verification
              </strong>{" "}
              from your uploaded utility bill. Once verified, your{" "}
              <strong className="text-emerald-300">
                final supplier signup documents will be emailed directly to{" "}
                <span className="font-mono text-white">
                  {submittedRecord.contactEmail}
                </span>{" "}
                within 24 hours
              </strong>
              .
            </>
          ) : (
            <>
              Because your facility is in the{" "}
              <strong className="text-white">
                {submittedRecord.tierRangeLabel}
              </strong>{" "}
              bracket, our custom pricing desk is pulling your interval load
              profile from your uploaded bill and soliciting competing fixed-rate
              bids across major suppliers. Your custom quote package will be
              delivered to{" "}
              <span className="font-mono text-white">
                {submittedRecord.contactEmail}
              </span>{" "}
              within <strong className="text-amber-300">24 hours</strong>.
            </>
          )}
        </p>

        <p className="text-xs font-mono text-neutral-400">
          Procurement &amp; Admin Desk Notification:{" "}
          <a
            href={`mailto:${ADMIN_NOTIFICATION_EMAIL}`}
            className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
          >
            {ADMIN_NOTIFICATION_EMAIL}
          </a>
        </p>

        <p className="text-[11px] font-mono text-neutral-500">
          {STANDARD_DISCLOSURE}
        </p>
      </section>
    );
  }

  return (
    <section
      className={`mt-10 rounded-3xl border bg-neutral-900 p-6 sm:p-10 text-white shadow-2xl ${
        isRealtimeLock ? "border-emerald-500/40" : "border-amber-500/30"
      }`}
    >
      {/* Header Banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-800 pb-6 mb-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-mono ${
                isRealtimeLock
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-300"
              }`}
            >
              {isRealtimeLock ? (
                <Zap className="h-3.5 w-3.5" />
              ) : (
                <Clock className="h-3.5 w-3.5" />
              )}
              <span>
                {isRealtimeLock
                  ? `Lock in Rate & LOE • ${tierRangeLabel}`
                  : isReserved24HrQuote
                    ? `Reserve Rate Quote (24-Hr Verification • Signup Emailed) • ${tierRangeLabel}`
                    : `24-Hour Turnaround Custom Quote & LOE • ${tierRangeLabel}`}
              </span>
            </span>

            {!isRealtimeLock && commercialTierLabel && (
              <span className="inline-flex items-center gap-1 rounded-full bg-neutral-800 px-3 py-1 text-xs font-mono text-neutral-300">
                <Building2 className="h-3.5 w-3.5 text-amber-400" />
                {commercialTierLabel}
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white pt-1">
            {currentStep === "BILL_UPLOAD"
              ? isReserved24HrQuote
                ? "Step 1 of 2: Upload Utility Bill to Reserve Rate Quote (Required)"
                : "Step 1 of 2: Upload Electric Utility Bill (Required to Proceed)"
              : isRealtimeLock && selectedPlan
                ? `Step 2 of 2: LOE, Agreement Execution & Sign ($${(selectedPlan.rate_per_kwh_cents / 100).toFixed(4)}/kWh)`
                : isReserved24HrQuote && selectedPlan
                  ? `Step 2 of 2: Reserve $${(selectedPlan.rate_per_kwh_cents / 100).toFixed(4)}/kWh Quote, LOE & Sign`
                  : "Step 2 of 2: LOE, Agreement Execution & Sign (24-Hr Quote)"}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 font-mono">
            {territory} • ZIP {zipCode} • Volume: {kwh.toLocaleString()} kWh/mo
            ({annualizedKwh.toLocaleString()} kWh/yr)
          </p>
        </div>

        {hasSelectedQuote && selectedPlan ? (
          <div
            className={`rounded-2xl border bg-neutral-950 px-5 py-3 text-right ${
              isRealtimeLock ? "border-emerald-500/30" : "border-amber-500/40"
            }`}
          >
            <div
              className={`text-[10px] font-mono uppercase tracking-wider ${
                isRealtimeLock ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {isRealtimeLock
                ? `Selected ${selectedPlan.term_months}-Mo Rate (${selectedPlan.provider})`
                : `Reserved ${selectedPlan.term_months}-Mo Quote • 24-Hr Verify (${selectedPlan.provider})`}
            </div>
            <div
              className={`text-2xl font-extrabold font-mono mt-0.5 ${
                isRealtimeLock ? "text-emerald-400" : "text-amber-300"
              }`}
            >
              ${(selectedPlan.rate_per_kwh_cents / 100).toFixed(4)}{" "}
              <span className="text-xs text-neutral-400">/ kWh</span>
            </div>
            <div className="text-[11px] text-neutral-400 font-mono">
              ({selectedPlan.rate_per_kwh_cents.toFixed(2)}¢ / kWh) • Est. $
              {selectedPlan.est_monthly_bill.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              /mo
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-500/30 bg-neutral-950 px-5 py-3 text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400">
              Quote Turnaround SLA
            </div>
            <div className="text-lg font-extrabold font-mono text-amber-300 mt-0.5">
              Within 24 Hours
            </div>
            {indicativeRateRange && (
              <div className="text-[11px] text-neutral-400 font-mono">
                Desk Benchmark: {indicativeRateRange}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2-Step Gate Indicator Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <button
          type="button"
          onClick={() => setCurrentStep("BILL_UPLOAD")}
          className={`rounded-2xl border p-3.5 text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
            currentStep === "BILL_UPLOAD"
              ? "border-emerald-500 bg-emerald-500/15 text-white"
              : billFile
                ? "border-emerald-500/40 bg-neutral-950 text-emerald-300"
                : "border-neutral-800 bg-neutral-950 text-neutral-400"
          }`}
        >
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
              Step 1 • Required Gate
            </div>
            <div className="text-xs sm:text-sm font-bold mt-0.5">
              Upload Recent Electric Utility Bill
            </div>
          </div>
          {billFile ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <FileUp className="h-5 w-5 text-emerald-400 shrink-0" />
          )}
        </button>

        <button
          type="button"
          disabled={!billFile}
          onClick={() => {
            if (billFile) setCurrentStep("LOE_AND_SIGN");
          }}
          className={`rounded-2xl border p-3.5 text-left transition-all flex items-center justify-between gap-2 ${
            currentStep === "LOE_AND_SIGN"
              ? "border-emerald-500 bg-emerald-500/15 text-white cursor-pointer"
              : billFile
                ? "border-neutral-700 bg-neutral-950 text-neutral-200 hover:border-emerald-500/40 cursor-pointer"
                : "border-neutral-800 bg-neutral-950/60 text-neutral-500 cursor-not-allowed"
          }`}
        >
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider">
              {billFile ? "Step 2 • Unlocked" : "Step 2 • Locked Until Bill Uploaded"}
            </div>
            <div className="text-xs sm:text-sm font-bold mt-0.5">
              LOE, Agreement Execution &amp; Sign
            </div>
          </div>
          {billFile ? (
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <Lock className="h-4 w-4 text-neutral-500 shrink-0" />
          )}
        </button>
      </div>

      {/* Hidden File Input (Shared Across Step 1 & Replace Button in Step 2) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {formError && (
        <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
          {formError}
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 1: REQUIRED UTILITY BILL UPLOAD                                  */}
      {/* ===================================================================== */}
      {currentStep === "BILL_UPLOAD" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4 text-xs text-neutral-300 font-mono leading-relaxed">
            <strong className="text-emerald-400">
              Utility Bill Required to Proceed:
            </strong>{" "}
            Please upload a copy of your most recent electric utility bill (PDF
            or photo) to verify your ESI ID / utility account number, service
            address, peak demand, and TDSP tariff schedule before proceeding to
            LOE, agreement execution, and electronic signature.
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              processSelectedFile(e.dataTransfer.files?.[0]);
            }}
            className={`rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center cursor-pointer transition-all ${
              billFile
                ? "border-emerald-500 bg-emerald-500/10"
                : isDragging
                  ? "border-emerald-400 bg-emerald-500/10"
                  : "border-neutral-700 bg-neutral-950 hover:border-emerald-400/60"
            }`}
          >
            {billFile ? (
              <div className="flex flex-col items-center gap-2">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <FileCheck2 className="h-8 w-8" />
                </div>
                <div className="text-base sm:text-lg font-extrabold text-white">
                  {billFile.name}
                </div>
                <div className="text-xs font-mono text-emerald-300">
                  {(billFile.size / 1024).toFixed(1)} KB attached &amp; verified
                  • Click or drop another file to replace
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-neutral-900 border border-neutral-800 text-emerald-400 flex items-center justify-center">
                  <FileUp className="h-8 w-8" />
                </div>
                <div className="text-base sm:text-lg font-bold text-white">
                  Click or Drag &amp; Drop Your Latest Electric Utility Bill *
                </div>
                <div className="text-xs font-mono text-neutral-400 max-w-lg">
                  Accepts PDF, JPG, PNG, or WebP (Max 3.2 MB • All pages
                  preferred). Uploading your bill unlocks Step 2 (LOE, Agreement
                  Execution &amp; Sign).
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={!billFile}
            onClick={handleProceedToLoeStep}
            className={`w-full rounded-xl py-4 px-6 font-extrabold text-neutral-950 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
              isRealtimeLock
                ? "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20"
                : "bg-amber-400 hover:bg-amber-300 shadow-amber-500/20"
            }`}
          >
            {billFile ? (
              <>
                <span>Proceed to LOE, Agreement Execution &amp; Sign</span>
                <ArrowRight className="h-5 w-5" />
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                <span>
                  Upload Utility Bill Above to Proceed to LOE &amp; Agreement
                </span>
              </>
            )}
          </button>

          <p className="text-center text-[11px] font-mono text-neutral-500">
            {STANDARD_DISCLOSURE}
          </p>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 2: ACCOUNT DETAILS, BINDING LOE, AGREEMENT EXECUTION & SIGN      */}
      {/* ===================================================================== */}
      {currentStep === "LOE_AND_SIGN" && billFile && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Verified Bill Banner */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <span className="inline-flex items-center gap-2 text-emerald-300">
              <FileCheck2 className="h-4 w-4 shrink-0" />
              <span>
                Step 1 Verified Bill: <strong>{billFile.name}</strong> (
                {(billFile.size / 1024).toFixed(1)} KB)
              </span>
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-emerald-300 hover:text-white underline underline-offset-2 cursor-pointer"
            >
              Replace Utility Bill
            </button>
          </div>

          {/* Optional Term Strip Selector only when no specific plan quote was selected */}
          {!hasSelectedQuote && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Contract Term Quotes to Include (18 – 72 Months)
                </h3>
                <span className="text-[11px] font-mono text-neutral-400">
                  Click terms to toggle (at least one required)
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
                {CONTRACT_TERMS.map((term) => {
                  const active = requestedTerms.includes(term);
                  return (
                    <button
                      type="button"
                      key={term}
                      onClick={() => {
                        setRequestedTerms((prev) => {
                          if (prev.includes(term)) {
                            return prev.length > 1
                              ? prev.filter((t) => t !== term)
                              : prev;
                          }
                          return [...prev, term].sort(
                            (a, b) => a - b
                          ) as ContractTermMonths[];
                        });
                      }}
                      className={`rounded-xl border py-2.5 px-2 text-center font-mono text-xs transition-all cursor-pointer ${
                        active
                          ? "border-amber-400 bg-amber-500/20 text-white font-bold"
                          : "border-neutral-800 bg-neutral-950 text-neutral-500 hover:border-neutral-700"
                      }`}
                    >
                      <div>{term} Months</div>
                      <div className="text-[10px] text-neutral-400">
                        {active ? "Included ✓" : "Click to add"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Account & Authorized Signer Info */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-400 mb-3">
              1. Business / Account &amp; Authorized Signer Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1.5">
                  Business / Account Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Logistics LLC"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1.5">
                  Current Electric Supplier (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. TXU, Reliant, Constellation, Unknown"
                  value={currentProvider}
                  onChange={(e) => setCurrentProvider(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1.5">
                  Authorized Signers Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Signers Name"
                  value={authorizedSignerName}
                  onChange={(e) => setAuthorizedSignerName(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1.5">
                  Title / Role *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Owner, Managing Partner, Authorized Account Holder"
                  value={signerTitle}
                  onChange={(e) => setSignerTitle(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="decisionmaker@company.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1.5">
                  Direct Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(214) 555-0140"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Letter of Exclusivity (LOE) & Supply Agreement Execution */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-400 mb-3">
              2. Binding Letter of Exclusivity (LOE) &amp; Agreement Execution *
            </h3>
            <div className="h-52 overflow-y-scroll rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-xs text-neutral-400 font-mono leading-relaxed space-y-2 mb-4">
              <p className="font-bold text-neutral-200">
                LETTER OF EXCLUSIVITY (LOE) &amp; SUPPLY AGREEMENT EXECUTION
                AUTHORIZATION
              </p>
              <p>
                1. AUTHORIZATION TO VERIFY METER &amp; USAGE DATA: By signing
                below,{" "}
                <span className="text-white">
                  {businessName || "[Customer Entity]"}
                </span>{" "}
                authorizes Energy Choice US (energychoice.us) and its licensed
                retail electric suppliers to verify all ESI IDs / meter numbers
                on the uploaded utility bill ({billFile.name}) and retrieve
                12-month historical usage, interval data (IDR / Smart Meter),
                peak load contribution (PLC), and TDSP tariff classifications.
              </p>
              <p>
                2. RATE LOCK / RESERVATION &amp; EXECUTION:{" "}
                {isRealtimeLock && selectedPlan
                  ? `Customer hereby executes this authorization to lock the selected fixed rate of $${(selectedPlan.rate_per_kwh_cents / 100).toFixed(4)}/kWh (${selectedPlan.rate_per_kwh_cents.toFixed(2)}¢/kWh) for a ${selectedPlan.term_months}-month term with ${selectedPlan.provider} (${selectedPlan.plan_name}), subject to utility meter verification from the uploaded bill.`
                  : isReserved24HrQuote && selectedPlan
                    ? `Customer hereby reserves the quoted rate of $${(selectedPlan.rate_per_kwh_cents / 100).toFixed(4)}/kWh (${selectedPlan.rate_per_kwh_cents.toFixed(2)}¢/kWh) for a ${selectedPlan.term_months}-month term with ${selectedPlan.provider} (${selectedPlan.plan_name}) pending 24-hour meter and load verification from the uploaded utility bill. Final supplier signup execution documents will be emailed directly to Customer's email address upon 24-hour verification.`
                    : `Customer appoints Energy Choice US as its exclusive energy procurement representative for thirty (30) days to solicit custom supplier bids across ${requestedTerms.join(", ")}-month contract terms for the ${tierRangeLabel} usage tier with a target 24-hour quote turnaround.`}
              </p>
              <p>
                3. NOTICES &amp; ADMINISTRATION: All agreement confirmations,
                meter verifications, and written notices are administered
                through{" "}
                <span className="text-neutral-200">
                  {ADMIN_NOTIFICATION_EMAIL}
                </span>
                .
              </p>
              <p>4. PLATFORM DISCLOSURE: {STANDARD_DISCLOSURE}</p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={loeSigned}
                onChange={(e) => setLoeSigned(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-emerald-500 focus:ring-0"
              />
              <span className="text-xs text-neutral-300 leading-relaxed">
                I certify that I am an authorized representative of{" "}
                <strong>{businessName || "the named account"}</strong>, I have
                uploaded our recent utility bill, and I agree that my electronic
                signature below legally executes this{" "}
                <strong>
                  Letter of Exclusivity (LOE) &amp;{" "}
                  {isRealtimeLock && selectedPlan
                    ? `${selectedPlan.term_months}-Month Rate Lock Agreement`
                    : isReserved24HrQuote && selectedPlan
                      ? `${selectedPlan.term_months}-Month Rate Quote Reservation (24-Hr Verification & Emailed Signup)`
                      : "Custom Procurement Authorization"}
                </strong>
                .
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                  Electronic Signature (Type Full Name to Sign) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Signers Name"
                  value={loeSignature}
                  onChange={(e) => setLoeSignature(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm font-serif italic text-emerald-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1">
                  Initials
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Initials"
                  value={loeInitials}
                  onChange={(e) =>
                    setLoeInitials(
                      e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase()
                    )
                  }
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm font-mono text-center text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={
              submitting ||
              !businessName ||
              !authorizedSignerName ||
              !signerTitle ||
              !contactEmail ||
              !contactPhone ||
              !billFile ||
              !loeSigned ||
              !loeSignature
            }
            className={`w-full rounded-xl py-4 px-6 font-extrabold text-neutral-950 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
              isRealtimeLock
                ? "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20"
                : "bg-amber-400 hover:bg-amber-300 shadow-amber-500/20"
            }`}
          >
            <ShieldCheck className="h-5 w-5" />
            {submitting
              ? "Submitting Bill, LOE & Reservation..."
              : isRealtimeLock && selectedPlan
                ? `Execute LOE, Sign Agreement & Lock $${(selectedPlan.rate_per_kwh_cents / 100).toFixed(4)}/kWh →`
                : isReserved24HrQuote && selectedPlan
                  ? `Reserve $${(selectedPlan.rate_per_kwh_cents / 100).toFixed(4)}/kWh Quote, Execute LOE & Sign (Signup Emailed in 24 Hrs) →`
                  : "Execute LOE & Sign Authorization for 24-Hour Custom Quote →"}
          </button>
        </form>
      )}
    </section>
  );
};
