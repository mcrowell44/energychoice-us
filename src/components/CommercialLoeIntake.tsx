import React, { useRef, useState } from "react";
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileUp,
  Layers,
  Lock,
  MapPin,
  Plus,
  ShieldCheck,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import {
  ADMIN_NOTIFICATION_EMAIL,
  CONTRACT_TERMS,
  STANDARD_DISCLOSURE,
  type CommercialLoePayload,
  type ContractTermMonths,
  type SiteAddressItem,
  type SparkPlan,
  type UploadedBillItem,
} from "../lib/compliance";

export interface AttachedBillItem {
  id: string;
  name: string;
  type: string;
  size: number;
  base64: string;
  siteLabel?: string;
}

export interface SiteAddressField {
  id: string;
  street: string;
  suiteOrUnit: string;
  city: string;
  state: string;
  zip: string;
  meterOrEsiId: string;
  monthlyKwh: string;
  label: string;
}

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
      savedBillPaths?: string[];
      billFilesCount?: number;
      siteAddressesCount?: number;
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
  // Step 2: LOE, Agreement Execution & Sign ("LOE_AND_SIGN") — unlocked only after at least 1 bill is attached
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

  // Multiple Utility Bills State
  const [billFiles, setBillFiles] = useState<AttachedBillItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multiple Site Addresses State (initialized with primary location from user search)
  const [siteAddresses, setSiteAddresses] = useState<SiteAddressField[]>([
    {
      id: "site-primary",
      street: "",
      suiteOrUnit: "",
      city: "",
      state: "TX",
      zip: zipCode || "",
      meterOrEsiId: "",
      monthlyKwh: kwh ? String(kwh) : "",
      label: "Primary Service Location",
    },
  ]);

  const [loeSigned, setLoeSigned] = useState(false);
  const [loeSignature, setLoeSignature] = useState("");
  const [loeInitials, setLoeInitials] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedRecord, setSubmittedRecord] = useState<
    | (Omit<CommercialLoePayload, "billBase64"> & {
        confirmationId: string;
        savedBillPath?: string;
        savedBillPaths?: string[];
        billFilesCount?: number;
        siteAddressesCount?: number;
      })
    | null
  >(null);

  // Total bytes across all uploaded bills
  const totalBillSizeBytes = billFiles.reduce((acc, b) => acc + b.size, 0);

  // Handle file selections (multiple at once or sequentially)
  const processSelectedFiles = (
    incoming: FileList | File[] | null | undefined
  ) => {
    setFormError(null);
    if (!incoming || incoming.length === 0) return;

    const filesArray = Array.from(incoming);

    for (const file of filesArray) {
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
          `"${file.name}" is not supported. Utility bills must be PDF, JPG, PNG, or WebP.`
        );
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setFormError(
          `"${file.name}" is over 5 MB. Please compress the file or attach summary pages.`
        );
        return;
      }
    }

    const currentTotalSize = billFiles.reduce((sum, b) => sum + b.size, 0);
    const incomingSize = filesArray.reduce((sum, f) => sum + f.size, 0);
    if (currentTotalSize + incomingSize > 15 * 1024 * 1024) {
      setFormError("Total size of all utility bills combined exceeds 15 MB.");
      return;
    }

    const newBills: AttachedBillItem[] = [];
    let processedCount = 0;

    filesArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          newBills.push({
            id: `bill-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            type: file.type || "application/pdf",
            size: file.size,
            base64: reader.result,
          });
        }
        processedCount++;
        if (processedCount === filesArray.length) {
          setBillFiles((prev) => [...prev, ...newBills]);
        }
      };
      reader.onerror = () => {
        setFormError(`Failed to read file "${file.name}". Please try again.`);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processSelectedFiles(e.target.files);
    // Reset file input value so user can re-upload or select same file name again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveBill = (id: string) => {
    setBillFiles((prev) => prev.filter((b) => b.id !== id));
  };

  const handleProceedToLoeStep = () => {
    setFormError(null);
    if (billFiles.length === 0) {
      setFormError(
        "Uploading at least one recent electric utility bill is required to proceed to LOE & Agreement Execution."
      );
      return;
    }
    setCurrentStep("LOE_AND_SIGN");
  };

  // Manage Multiple Site Addresses
  const handleAddSite = () => {
    const nextNum = siteAddresses.length + 1;
    setSiteAddresses((prev) => [
      ...prev,
      {
        id: `site-${Date.now()}-${nextNum}`,
        street: "",
        suiteOrUnit: "",
        city: "",
        state: "TX",
        zip: "",
        meterOrEsiId: "",
        monthlyKwh: "",
        label: `Location ${nextNum}`,
      },
    ]);
  };

  const handleUpdateSite = (
    id: string,
    field: keyof SiteAddressField,
    value: string
  ) => {
    setSiteAddresses((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleRemoveSite = (id: string) => {
    if (siteAddresses.length <= 1) return;
    setSiteAddresses((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (billFiles.length === 0) {
      setCurrentStep("BILL_UPLOAD");
      setFormError(
        "Please upload a copy of your recent electric utility bill to proceed."
      );
      return;
    }

    // Validate primary site address
    const primarySite = siteAddresses[0];
    if (!primarySite?.street?.trim()) {
      setFormError("Please enter the street address for your primary service location.");
      return;
    }
    if (!primarySite?.city?.trim()) {
      setFormError("Please enter the city for your primary service location.");
      return;
    }
    if (!/^\d{5}$/.test(primarySite?.zip?.trim() || "")) {
      setFormError("Please enter a valid 5-digit ZIP code for your primary service location.");
      return;
    }

    // Validate additional sites if any are filled out
    for (let i = 1; i < siteAddresses.length; i++) {
      const site = siteAddresses[i];
      if (site.street.trim() || site.zip.trim()) {
        if (!site.street.trim()) {
          setFormError(`Please enter a street address for Location ${i + 1}.`);
          return;
        }
        if (!site.city.trim()) {
          setFormError(`Please enter a city for Location ${i + 1}.`);
          return;
        }
        if (!/^\d{5}$/.test(site.zip.trim())) {
          setFormError(`Please enter a valid 5-digit ZIP code for Location ${i + 1}.`);
          return;
        }
      }
    }

    if (!loeSigned || !loeSignature.trim()) {
      setFormError(
        "Please check the LOE & Agreement Execution box and enter your full electronic signature."
      );
      return;
    }

    setSubmitting(true);

    const primaryBill = billFiles[0];
    const compositeBillName =
      billFiles.length > 1
        ? `${primaryBill.name} (+${billFiles.length - 1} more)`
        : primaryBill.name;

    const formattedSiteAddresses: SiteAddressItem[] = siteAddresses
      .filter((s) => s.street.trim().length > 0)
      .map((s, idx) => ({
        id: s.id,
        street: s.street.trim(),
        suiteOrUnit: s.suiteOrUnit.trim() || undefined,
        city: s.city.trim(),
        state: s.state.trim().toUpperCase() || "TX",
        zip: s.zip.trim(),
        meterOrEsiId: s.meterOrEsiId.trim() || undefined,
        monthlyKwh: s.monthlyKwh ? parseInt(s.monthlyKwh, 10) : undefined,
        label: s.label || `Location ${idx + 1}`,
      }));

    const formattedBillFiles: UploadedBillItem[] = billFiles.map((b) => ({
      id: b.id,
      name: b.name,
      type: b.type,
      sizeBytes: b.size,
      base64: b.base64,
      siteLabel: b.siteLabel,
    }));

    try {
      const res = await fetch("/api/submit-loe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zipCode: primarySite.zip.trim() || zipCode,
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
          siteAddresses: formattedSiteAddresses,
          billFiles: formattedBillFiles,
          billFileName: compositeBillName,
          billMimeType: primaryBill.type,
          billFileSizeBytes: totalBillSizeBytes,
          billBase64: primaryBill.base64,
          loeSigned,
          loeSignature: loeSignature.trim(),
          loeSignerInitials: loeInitials.trim(),
        }),
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          res.status >= 500
            ? "Submission desk is currently processing requests. Please retry in a moment."
            : "Unable to complete LOE & Agreement Execution."
        );
      }

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
      <section className="mt-10 rounded-3xl border border-cyan-400/50 bg-[#031129] p-8 text-white shadow-2xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#0e2d5c] pb-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-cyan-400/20 text-[#00e5ff] flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#00e5ff]">
                {isRealtimeLock
                  ? "Utility Bill(s) Verified • LOE & Rate Lock Agreement Executed"
                  : isReserved24HrQuote
                    ? "Rate Quote Reserved • 24-Hour Verification Active • Signup Emailed"
                    : "Utility Bill(s) Verified • 24-Hour Custom Quote & LOE Executed"}
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
          <div className="rounded-xl border border-cyan-400/35 bg-[#010a1a] px-3.5 py-2 text-xs font-mono text-[#00e5ff]">
            Confirmation: {submittedRecord.confirmationId}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="rounded-xl border border-[#0e2d5c] bg-[#010a1a] p-4">
            <div className="text-slate-400">ENTITY &amp; SIGNER</div>
            <div className="text-white font-semibold mt-1">
              {submittedRecord.businessName}
            </div>
            <div className="text-slate-300">
              {submittedRecord.authorizedSignerName} (
              {submittedRecord.signerTitle})
            </div>
          </div>
          <div className="rounded-xl border border-[#0e2d5c] bg-[#010a1a] p-4">
            <div className="text-slate-400">USAGE TIER &amp; TERM</div>
            <div className="text-sky-300 font-semibold mt-1">
              {submittedRecord.monthlyKwh.toLocaleString()} kWh/mo (
              {submittedRecord.tierRangeLabel})
            </div>
            <div className="text-slate-300">
              {isRealtimeLock
                ? `Locked Offer (${selectedPlan?.term_months} Mos)`
                : isReserved24HrQuote
                  ? `Reserved ${selectedPlan?.term_months}-Mo Quote (24-Hr Verify)`
                  : "Guaranteed 24-Hour Turnaround"}
            </div>
          </div>
          <div className="rounded-xl border border-[#0e2d5c] bg-[#010a1a] p-4">
            <div className="text-slate-400">BILL(S) &amp; SIGNATURE</div>
            <div className="text-[#00e5ff] font-semibold mt-1 truncate">
              {billFiles.length > 1
                ? `${billFiles.length} Bills Attached (${(totalBillSizeBytes / 1024).toFixed(1)} KB)`
                : submittedRecord.billFileName}
            </div>
            <div className="text-slate-300">
              {isReserved24HrQuote
                ? "Quote Reserved & LOE Signed ✓"
                : "LOE & Agreement Signed ✓"}
            </div>
          </div>
        </div>

        {/* Confirmed Service Locations Summary */}
        {siteAddresses.length > 0 && siteAddresses[0].street && (
          <div className="rounded-2xl border border-[#0e2d5c] bg-[#010a1a] p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono border-b border-[#0e2d5c] pb-2">
              <span className="uppercase text-[#00e5ff] font-bold tracking-wider flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                Service Locations Included in Agreement ({siteAddresses.filter((s) => s.street).length})
              </span>
              <span className="text-slate-400">Verified for Rate Lock</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              {siteAddresses
                .filter((s) => s.street.trim())
                .map((site, i) => (
                  <div
                    key={site.id}
                    className="rounded-xl border border-[#0e2d5c]/80 bg-[#031129]/80 p-3 space-y-1"
                  >
                    <div className="text-[#00e5ff] font-bold flex items-center justify-between">
                      <span>[{i + 1}] {site.label || `Location ${i + 1}`}</span>
                      {site.monthlyKwh && (
                        <span className="text-cyan-300 font-normal">
                          {parseInt(site.monthlyKwh, 10).toLocaleString()} kWh/mo
                        </span>
                      )}
                    </div>
                    <div className="text-white">
                      {site.street}
                      {site.suiteOrUnit ? ` Ste/Unit ${site.suiteOrUnit}` : ""}
                    </div>
                    <div className="text-slate-400">
                      {site.city}, {site.state} {site.zip}
                    </div>
                    {site.meterOrEsiId && (
                      <div className="text-sky-300 text-[11px]">
                        ESI ID / Meter: {site.meterOrEsiId}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        <p className="text-sm text-slate-200 leading-relaxed">
          {isRealtimeLock && selectedPlan ? (
            <>
              Your {selectedPlan.term_months}-month fixed rate lock of{" "}
              <span className="font-mono text-[#00e5ff] font-bold">
                ${(selectedPlan.rate_per_kwh_cents / 100).toFixed(4)}/kWh (
                {selectedPlan.rate_per_kwh_cents.toFixed(2)}¢/kWh)
              </span>{" "}
              with <strong>{selectedPlan.provider}</strong> has been paired with
              your uploaded utility bill(s), executed LOE, and binding electronic
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
              <span className="font-mono text-sky-300 font-bold">
                ${(selectedPlan.rate_per_kwh_cents / 100).toFixed(4)}/kWh (
                {selectedPlan.rate_per_kwh_cents.toFixed(2)}¢/kWh)
              </span>{" "}
              with <strong>{selectedPlan.provider}</strong> (
              {selectedPlan.term_months} months) is now{" "}
              <strong className="text-white">
                reserved for 24-hour meter &amp; load verification
              </strong>{" "}
              from your uploaded utility bill(s). Once verified, your{" "}
              <strong className="text-[#00e5ff]">
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
              profile from your uploaded bill(s) and soliciting competing fixed-rate
              bids across major suppliers. Your custom quote package will be
              delivered to{" "}
              <span className="font-mono text-white">
                {submittedRecord.contactEmail}
              </span>{" "}
              within <strong className="text-sky-300">24 hours</strong>.
            </>
          )}
        </p>

        <p className="text-xs font-mono text-slate-300">
          Procurement &amp; Admin Desk Notification:{" "}
          <a
            href={`mailto:${ADMIN_NOTIFICATION_EMAIL}`}
            className="text-[#00e5ff] hover:text-cyan-300 underline underline-offset-2"
          >
            {ADMIN_NOTIFICATION_EMAIL}
          </a>
        </p>

        <p className="text-[11px] font-mono text-slate-400">
          {STANDARD_DISCLOSURE}
        </p>
      </section>
    );
  }

  return (
    <section
      className={`mt-10 rounded-3xl border bg-[#031129] p-6 sm:p-10 text-white shadow-2xl ${
        isRealtimeLock ? "border-cyan-400/45" : "border-sky-400/45"
      }`}
    >
      {/* Header Banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#0e2d5c] pb-6 mb-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-mono ${
                isRealtimeLock
                  ? "bg-cyan-400/10 border-cyan-400/35 text-[#00e5ff]"
                  : "bg-sky-500/15 border-sky-400/35 text-sky-300"
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
              <span className="inline-flex items-center gap-1 rounded-full bg-[#051838] border border-[#0e2d5c] px-3 py-1 text-xs font-mono text-slate-200">
                <Building2 className="h-3.5 w-3.5 text-sky-400" />
                {commercialTierLabel}
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white pt-1">
            {currentStep === "BILL_UPLOAD"
              ? isReserved24HrQuote
                ? "Step 1 of 2: Upload Utility Bill(s) to Reserve Rate Quote (Required)"
                : "Step 1 of 2: Upload Electric Utility Bill(s) (Required to Proceed)"
              : isRealtimeLock && selectedPlan
                ? `Step 2 of 2: LOE, Agreement Execution & Sign ($${(selectedPlan.rate_per_kwh_cents / 100).toFixed(4)}/kWh)`
                : isReserved24HrQuote && selectedPlan
                  ? `Step 2 of 2: Reserve $${(selectedPlan.rate_per_kwh_cents / 100).toFixed(4)}/kWh Quote, LOE & Sign`
                  : "Step 2 of 2: LOE, Agreement Execution & Sign (24-Hr Quote)"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-mono">
            {territory} • ZIP {zipCode} • Volume: {kwh.toLocaleString()} kWh/mo
            ({annualizedKwh.toLocaleString()} kWh/yr)
          </p>
        </div>

        {hasSelectedQuote && selectedPlan ? (
          <div
            className={`rounded-2xl border bg-[#010a1a] px-5 py-3 text-right ${
              isRealtimeLock ? "border-cyan-400/40" : "border-sky-400/45"
            }`}
          >
            <div
              className={`text-[10px] font-mono uppercase tracking-wider ${
                isRealtimeLock ? "text-[#00e5ff]" : "text-sky-300"
              }`}
            >
              {isRealtimeLock
                ? `Selected ${selectedPlan.term_months}-Mo Rate (${selectedPlan.provider})`
                : `Reserved ${selectedPlan.term_months}-Mo Quote • 24-Hr Verify (${selectedPlan.provider})`}
            </div>
            <div
              className={`text-2xl font-extrabold font-mono mt-0.5 ${
                isRealtimeLock ? "text-[#00e5ff]" : "text-sky-300"
              }`}
            >
              ${(selectedPlan.rate_per_kwh_cents / 100).toFixed(4)}{" "}
              <span className="text-xs text-slate-400">/ kWh</span>
            </div>
            <div className="text-[11px] text-slate-300 font-mono">
              ({selectedPlan.rate_per_kwh_cents.toFixed(2)}¢ / kWh) • Est. $
              {selectedPlan.est_monthly_bill.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              /mo
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-sky-400/35 bg-[#010a1a] px-5 py-3 text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider text-sky-300">
              Quote Turnaround SLA
            </div>
            <div className="text-lg font-extrabold font-mono text-sky-300 mt-0.5">
              Within 24 Hours
            </div>
            {indicativeRateRange && (
              <div className="text-[11px] text-slate-300 font-mono">
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
              ? "border-[#00e5ff] bg-cyan-400/15 text-white shadow-[0_0_20px_rgba(0,229,255,0.18)]"
              : billFiles.length > 0
                ? "border-cyan-400/40 bg-[#010a1a] text-[#00e5ff]"
                : "border-[#0e2d5c] bg-[#010a1a] text-slate-400"
          }`}
        >
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#00e5ff]">
              Step 1 • Required Gate
            </div>
            <div className="text-xs sm:text-sm font-bold mt-0.5">
              {billFiles.length > 0
                ? `${billFiles.length} Utility Bill${billFiles.length > 1 ? "s" : ""} Attached (${(totalBillSizeBytes / 1024).toFixed(1)} KB)`
                : "Upload Recent Utility Bill(s)"}
            </div>
          </div>
          {billFiles.length > 0 ? (
            <CheckCircle2 className="h-5 w-5 text-[#00e5ff] shrink-0" />
          ) : (
            <FileUp className="h-5 w-5 text-[#00e5ff] shrink-0" />
          )}
        </button>

        <button
          type="button"
          disabled={billFiles.length === 0}
          onClick={() => {
            if (billFiles.length > 0) setCurrentStep("LOE_AND_SIGN");
          }}
          className={`rounded-2xl border p-3.5 text-left transition-all flex items-center justify-between gap-2 ${
            currentStep === "LOE_AND_SIGN"
              ? "border-[#00e5ff] bg-cyan-400/15 text-white shadow-[0_0_20px_rgba(0,229,255,0.18)] cursor-pointer"
              : billFiles.length > 0
                ? "border-cyan-400/35 bg-[#010a1a] text-slate-200 hover:border-[#00e5ff] cursor-pointer"
                : "border-[#0e2d5c] bg-[#010a1a]/60 text-slate-500 cursor-not-allowed"
          }`}
        >
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider">
              {billFiles.length > 0
                ? "Step 2 • Unlocked"
                : "Step 2 • Locked Until Bill Uploaded"}
            </div>
            <div className="text-xs sm:text-sm font-bold mt-0.5">
              LOE, Agreement Execution &amp; Sign
            </div>
          </div>
          {billFiles.length > 0 ? (
            <ShieldCheck className="h-5 w-5 text-[#00e5ff] shrink-0" />
          ) : (
            <Lock className="h-4 w-4 text-slate-500 shrink-0" />
          )}
        </button>
      </div>

      {/* Hidden File Input (supports multi-file selection) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,image/png,image/jpeg,image/webp"
        onChange={handleFilesChange}
        className="hidden"
      />

      {formError && (
        <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
          {formError}
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 1: REQUIRED UTILITY BILL(S) UPLOAD                               */}
      {/* ===================================================================== */}
      {currentStep === "BILL_UPLOAD" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#0e2d5c] bg-[#010a1a]/90 p-4 text-xs text-slate-300 font-mono leading-relaxed">
            <strong className="text-[#00e5ff]">
              Utility Bill(s) Required to Proceed:
            </strong>{" "}
            Please upload a copy of your most recent electric utility bill(s)
            (PDF or photo). If you operate <strong>multiple meters, locations, or facilities</strong>,
            you can upload multiple bills here at once to verify all ESI IDs,
            peak demand, and TDSP tariff schedules.
          </div>

          {/* Drag & Drop Area */}
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
              processSelectedFiles(e.dataTransfer.files);
            }}
            className={`rounded-3xl border-2 border-dashed p-8 sm:p-10 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-[#00e5ff] bg-cyan-400/15"
                : "border-[#0e2d5c] bg-[#010a1a] hover:border-cyan-400/60"
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-[#051838] border border-cyan-400/30 text-[#00e5ff] flex items-center justify-center">
                <FileUp className="h-8 w-8" />
              </div>
              <div className="text-base sm:text-lg font-bold text-white">
                {billFiles.length > 0
                  ? "Click or Drop to Add More Utility Bills / Statements"
                  : "Click or Drag & Drop Electric Utility Bill(s) *"}
              </div>
              <div className="text-xs font-mono text-slate-400 max-w-lg">
                Accepts PDF, JPG, PNG, or WebP • Upload single or multiple bills
                for all commercial meters (Max 5 MB per file • 15 MB combined).
              </div>
            </div>
          </div>

          {/* List of Attached Bills */}
          {billFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <span className="text-[#00e5ff] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck2 className="h-4 w-4" />
                  Attached Utility Bills ({billFiles.length})
                </span>
                <span className="text-slate-400">
                  Total Size: {(totalBillSizeBytes / 1024).toFixed(1)} KB
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {billFiles.map((b, index) => (
                  <div
                    key={b.id}
                    className="rounded-2xl border border-cyan-400/30 bg-[#010a1a] p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-cyan-400/15 text-[#00e5ff] flex items-center justify-center shrink-0">
                        <FileCheck2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-white truncate">
                          {b.name}
                        </div>
                        <div className="text-[11px] font-mono text-[#00e5ff]">
                          {(b.size / 1024).toFixed(1)} KB • Bill #{index + 1}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveBill(b.id);
                      }}
                      className="p-1.5 rounded-lg border border-[#0e2d5c] bg-[#051838] text-slate-400 hover:text-rose-400 hover:border-rose-500/50 transition-colors cursor-pointer"
                      title="Remove this bill"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-[#051838] hover:bg-cyan-400/10 px-3.5 py-2 text-xs font-mono text-[#00e5ff] transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  + Add Another Utility Bill
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={billFiles.length === 0}
            onClick={handleProceedToLoeStep}
            className={`w-full rounded-xl py-4 px-6 font-extrabold disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isRealtimeLock ? "ec-btn-cyan" : "ec-btn-cobalt"
            }`}
          >
            {billFiles.length > 0 ? (
              <>
                <span>
                  Proceed to LOE, Agreement Execution &amp; Sign ({billFiles.length} Bill{billFiles.length > 1 ? "s" : ""} Attached)
                </span>
                <ArrowRight className="h-5 w-5" />
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                <span>
                  Upload at Least One Utility Bill Above to Proceed
                </span>
              </>
            )}
          </button>

          <p className="text-center text-[11px] font-mono text-slate-400">
            {STANDARD_DISCLOSURE}
          </p>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 2: ACCOUNT DETAILS, MULTI-SITE, LOE & AGREEMENT EXECUTION        */}
      {/* ===================================================================== */}
      {currentStep === "LOE_AND_SIGN" && billFiles.length > 0 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Verified Bills Banner */}
          <div className="rounded-2xl border border-cyan-400/35 bg-cyan-400/10 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <span className="inline-flex items-center gap-2 text-[#00e5ff]">
              <FileCheck2 className="h-4 w-4 shrink-0" />
              <span>
                Step 1 Verified:{" "}
                <strong>
                  {billFiles.length} Utility Bill{billFiles.length > 1 ? "s" : ""}
                </strong>{" "}
                attached ({(totalBillSizeBytes / 1024).toFixed(1)} KB)
              </span>
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[#00e5ff] hover:text-white underline underline-offset-2 cursor-pointer"
            >
              + Attach More Bills
            </button>
          </div>

          {/* Optional Term Strip Selector only when no specific plan quote was selected */}
          {!hasSelectedQuote && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <h3 className="text-xs font-mono uppercase tracking-wider text-sky-300 inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Contract Term Quotes to Include (18 – 72 Months)
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
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
                          ? "border-sky-400 bg-sky-500/20 text-white font-bold"
                          : "border-[#0e2d5c] bg-[#010a1a] text-slate-400 hover:border-sky-400/40"
                      }`}
                    >
                      <div>{term} Months</div>
                      <div className="text-[10px] text-slate-400">
                        {active ? "Included ✓" : "Click to add"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 1: Business & Signer Details */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#00e5ff] mb-3">
              1. Business / Account Legal Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">
                  Business / Account Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Logistics LLC"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full rounded-xl border border-[#0e2d5c] bg-[#010a1a] px-4 py-3 text-sm text-white focus:border-[#00e5ff] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">
                  Current Electric Supplier (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. TXU, Reliant, Constellation, Unknown"
                  value={currentProvider}
                  onChange={(e) => setCurrentProvider(e.target.value)}
                  className="w-full rounded-xl border border-[#0e2d5c] bg-[#010a1a] px-4 py-3 text-sm text-white focus:border-[#00e5ff] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 1.1: Multiple Service Locations / Site Addresses */}
          <div className="rounded-2xl border border-[#0e2d5c] bg-[#010a1a]/70 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#0e2d5c] pb-3">
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#00e5ff] font-bold flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  Service Locations / Site Addresses ({siteAddresses.length})
                </h4>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Add all commercial sites, meters, or branches you want covered under this agreement
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddSite}
                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-[#051838] hover:bg-cyan-400/15 px-3 py-1.5 text-xs font-mono text-[#00e5ff] transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                + Add Another Site / Address
              </button>
            </div>

            <div className="space-y-4">
              {siteAddresses.map((site, index) => (
                <div
                  key={site.id}
                  className="rounded-2xl border border-[#0e2d5c] bg-[#031129] p-4 space-y-3"
                >
                  <div className="flex items-center justify-between text-xs font-mono border-b border-[#0e2d5c]/80 pb-2">
                    <span className="text-[#00e5ff] font-bold flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      {index === 0 ? "Primary Service Location *" : `Additional Location #${index + 1}`}
                    </span>
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSite(site.id)}
                        className="text-rose-400 hover:text-rose-300 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove Location
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs font-mono">
                    <div className="sm:col-span-8">
                      <label className="block text-slate-300 mb-1">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        required={index === 0}
                        placeholder="e.g. 1200 Commerce St"
                        value={site.street}
                        onChange={(e) =>
                          handleUpdateSite(site.id, "street", e.target.value)
                        }
                        className="w-full rounded-xl border border-[#0e2d5c] bg-[#010a1a] px-3.5 py-2.5 text-sm text-white focus:border-[#00e5ff] focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-slate-300 mb-1">
                        Suite / Unit # (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ste 400"
                        value={site.suiteOrUnit}
                        onChange={(e) =>
                          handleUpdateSite(site.id, "suiteOrUnit", e.target.value)
                        }
                        className="w-full rounded-xl border border-[#0e2d5c] bg-[#010a1a] px-3.5 py-2.5 text-sm text-white focus:border-[#00e5ff] focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-slate-300 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        required={index === 0}
                        placeholder="Dallas"
                        value={site.city}
                        onChange={(e) =>
                          handleUpdateSite(site.id, "city", e.target.value)
                        }
                        className="w-full rounded-xl border border-[#0e2d5c] bg-[#010a1a] px-3.5 py-2.5 text-sm text-white focus:border-[#00e5ff] focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-slate-300 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={site.state}
                        readOnly
                        className="w-full rounded-xl border border-[#0e2d5c] bg-[#010a1a]/60 px-3.5 py-2.5 text-sm text-slate-400"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-slate-300 mb-1">
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        required={index === 0}
                        maxLength={5}
                        placeholder="75149"
                        value={site.zip}
                        onChange={(e) =>
                          handleUpdateSite(
                            site.id,
                            "zip",
                            e.target.value.replace(/\D/g, "").slice(0, 5)
                          )
                        }
                        className="w-full rounded-xl border border-[#0e2d5c] bg-[#010a1a] px-3.5 py-2.5 text-sm text-white focus:border-[#00e5ff] focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-7">
                      <label className="block text-slate-300 mb-1">
                        ESI ID / Meter # (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 10443720000000000 or on bill"
                        value={site.meterOrEsiId}
                        onChange={(e) =>
                          handleUpdateSite(site.id, "meterOrEsiId", e.target.value)
                        }
                        className="w-full rounded-xl border border-[#0e2d5c] bg-[#010a1a] px-3.5 py-2.5 text-sm text-white focus:border-[#00e5ff] focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-slate-300 mb-1">
                        Est. Usage (kWh/mo)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 5000"
                        value={site.monthlyKwh}
                        onChange={(e) =>
                          handleUpdateSite(site.id, "monthlyKwh", e.target.value)
                        }
                        className="w-full rounded-xl border border-[#0e2d5c] bg-[#010a1a] px-3.5 py-2.5 text-sm text-white focus:border-[#00e5ff] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 1.2: Authorized Signer Contact Info */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#00e5ff] mb-3">
              1.2 Authorized Signer Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">
                  Authorized Signer Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Signers Name"
                  value={authorizedSignerName}
                  onChange={(e) => setAuthorizedSignerName(e.target.value)}
                  className="w-full rounded-xl border border-[#0e2d5c] bg-[#010a1a] px-4 py-3 text-sm text-white focus:border-[#00e5ff] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">
                  Title / Corporate Role *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Owner, Managing Director, Facilities Manager"
                  value={signerTitle}
                  onChange={(e) => setSignerTitle(e.target.value)}
                  className="w-full rounded-xl border border-[#0e2d5c] bg-[#010a1a] px-4 py-3 text-sm text-white focus:border-[#00e5ff] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">
                  Corporate Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="decisionmaker@company.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#0e2d5c] bg-[#010a1a] px-4 py-3 text-sm text-white focus:border-[#00e5ff] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">
                  Direct Contact Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(214) 555-0140"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full rounded-xl border border-[#0e2d5c] bg-[#010a1a] px-4 py-3 text-sm text-white focus:border-[#00e5ff] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Letter of Exclusivity (LOE) & Agreement Execution */}
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#00e5ff] mb-3">
              2. Binding Letter of Exclusivity (LOE) &amp; Agreement Execution *
            </h3>
            <div className="h-52 overflow-y-scroll rounded-xl border border-[#0e2d5c] bg-[#010a1a] p-4 text-xs text-slate-300 font-mono leading-relaxed space-y-2 mb-4">
              <p className="font-bold text-[#00e5ff]">
                LETTER OF EXCLUSIVITY (LOE) &amp; SUPPLY AGREEMENT EXECUTION
                AUTHORIZATION
              </p>
              <p>
                1. AUTHORIZATION TO VERIFY METERS &amp; USAGE DATA: By signing
                below,{" "}
                <span className="text-white">
                  {businessName || "[Customer Entity]"}
                </span>{" "}
                authorizes Energy Choice US (energychoice.us) and its licensed
                retail electric suppliers to verify all ESI IDs and meter numbers
                across all{" "}
                <strong className="text-white">
                  {siteAddresses.filter((s) => s.street).length || 1} designated service location(s)
                </strong>{" "}
                on the uploaded utility bills ({billFiles.length} file{billFiles.length > 1 ? "s" : ""} attached)
                and retrieve 12-month historical usage, interval data (IDR / Smart Meter),
                peak load contribution (PLC), and TDSP tariff classifications.
              </p>
              <p>
                2. RATE LOCK / RESERVATION &amp; EXECUTION:{" "}
                {isRealtimeLock && selectedPlan
                  ? `Customer hereby executes this authorization to lock the selected fixed rate of $${(selectedPlan.rate_per_kwh_cents / 100).toFixed(4)}/kWh (${selectedPlan.rate_per_kwh_cents.toFixed(2)}¢/kWh) for a ${selectedPlan.term_months}-month term with ${selectedPlan.provider} (${selectedPlan.plan_name}), subject to utility meter verification across all listed site addresses from the uploaded utility bills.`
                  : isReserved24HrQuote && selectedPlan
                    ? `Customer hereby reserves the quoted rate of $${(selectedPlan.rate_per_kwh_cents / 100).toFixed(4)}/kWh (${selectedPlan.rate_per_kwh_cents.toFixed(2)}¢/kWh) for a ${selectedPlan.term_months}-month term with ${selectedPlan.provider} (${selectedPlan.plan_name}) pending 24-hour meter and load verification from the uploaded utility bill(s). Final supplier signup execution documents will be emailed directly to Customer's email address upon 24-hour verification.`
                    : `Customer appoints Energy Choice US as its exclusive energy procurement representative for thirty (30) days to solicit custom supplier bids across ${requestedTerms.join(", ")}-month contract terms for the ${tierRangeLabel} usage tier with a target 24-hour quote turnaround.`}
              </p>
              <p>
                3. NOTICES &amp; ADMINISTRATION: All agreement confirmations,
                meter verifications, and written notices are administered
                through{" "}
                <span className="text-white">
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
                className="mt-1 h-4 w-4 rounded border-[#0e2d5c] bg-[#051838] text-[#00e5ff] focus:ring-0"
              />
              <span className="text-xs text-slate-200 leading-relaxed">
                I certify that I am an authorized representative of{" "}
                <strong>{businessName || "the named account"}</strong>, I have
                uploaded our electric utility bill(s) and listed all service addresses,
                and I agree that my electronic signature below legally executes this{" "}
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
                <label className="block text-[11px] font-mono uppercase text-slate-300 mb-1">
                  Electronic Signature (Type Full Name to Sign) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Signers Name"
                  value={loeSignature}
                  onChange={(e) => setLoeSignature(e.target.value)}
                  className="w-full rounded-xl border border-[#0e2d5c] bg-[#010a1a] px-4 py-3 text-sm font-serif italic text-[#00e5ff] focus:border-[#00e5ff] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-300 mb-1">
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
                  className="w-full rounded-xl border border-[#0e2d5c] bg-[#010a1a] px-4 py-3 text-sm font-mono text-center text-white focus:border-[#00e5ff] focus:outline-none"
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
              billFiles.length === 0 ||
              !loeSigned ||
              !loeSignature
            }
            className={`w-full rounded-xl py-4 px-6 font-extrabold disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isRealtimeLock ? "ec-btn-cyan" : "ec-btn-cobalt"
            }`}
          >
            <ShieldCheck className="h-5 w-5" />
            {submitting
              ? "Submitting Bill(s), Multi-Site LOE & Reservation..."
              : isRealtimeLock && selectedPlan
                ? `Execute LOE, Sign Agreement & Lock $${(selectedPlan.rate_per_kwh_cents / 100).toFixed(4)}/kWh (${siteAddresses.filter((s) => s.street).length || 1} Location${siteAddresses.filter((s) => s.street).length > 1 ? "s" : ""}) →`
                : isReserved24HrQuote && selectedPlan
                  ? `Reserve $${(selectedPlan.rate_per_kwh_cents / 100).toFixed(4)}/kWh Quote, Execute LOE & Sign (${siteAddresses.filter((s) => s.street).length || 1} Location${siteAddresses.filter((s) => s.street).length > 1 ? "s" : ""}) →`
                  : `Execute LOE & Sign Authorization for 24-Hour Custom Quote (${siteAddresses.filter((s) => s.street).length || 1} Location${siteAddresses.filter((s) => s.street).length > 1 ? "s" : ""}) →`}
          </button>
        </form>
      )}
    </section>
  );
};
