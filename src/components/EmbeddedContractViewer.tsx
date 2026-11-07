import React, { useState } from "react";
import { CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import {
  ADMIN_NOTIFICATION_EMAIL,
  STANDARD_DISCLOSURE,
  type SparkPlan,
  type Tier1ProspectPayload,
} from "../lib/compliance";

interface AgreementProps {
  zipCode: string;
  territory: string;
  kwh: number;
  plan: SparkPlan;
  onSignComplete: (
    docPayload: Tier1ProspectPayload & { confirmationId: string }
  ) => void;
}

export const EmbeddedContractViewer: React.FC<AgreementProps> = ({
  zipCode,
  territory,
  kwh,
  plan,
  onSignComplete,
}) => {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [initials, setInitials] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [capturedRecord, setCapturedRecord] = useState<
    (Tier1ProspectPayload & { confirmationId: string }) | null
  >(null);
  const [execError, setExecError] = useState<string | null>(null);

  const dollarRate = (plan.rate_per_kwh_cents / 100).toFixed(4);

  const handleCaptureProspect = async () => {
    if (!acknowledged || !email || !phone) return;
    setSubmitting(true);
    setExecError(null);

    const payload = {
      zipCode,
      territory,
      allocatedKwh: kwh,
      appliedTierLabel: plan.applied_tier_label,
      provider: plan.provider,
      planName: plan.plan_name,
      termMonths: plan.term_months,
      rateCents: plan.rate_per_kwh_cents,
      rate500Cents: plan.rate_500_cents,
      rate1000Cents: plan.rate_1000_cents,
      rate2000Cents: plan.rate_2000_cents,
      estMonthlyBill: plan.est_monthly_bill,
      contactEmail: email.trim(),
      contactPhone: phone.trim(),
      signerInitials: initials.trim() || "OK",
    };

    try {
      const res = await fetch("/api/execute-agreement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to register rate selection.");
      }

      const finalRecord = data.record as Tier1ProspectPayload & {
        confirmationId: string;
      };
      setCapturedRecord(finalRecord);
      onSignComplete(finalRecord);
    } catch (err: unknown) {
      setExecError(
        err instanceof Error ? err.message : "Rate selection capture failed."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (capturedRecord) {
    return (
      <div className="rounded-3xl border border-emerald-500/40 bg-neutral-900 p-6 sm:p-8 text-white space-y-5 mt-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">
                Tier 1 Rate Lock Request Registered ({plan.term_months} Months)
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                {plan.provider} — {plan.plan_name}
              </h3>
            </div>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-neutral-950 px-3.5 py-2 text-xs font-mono text-emerald-300 self-start sm:self-auto">
            Confirmation: {capturedRecord.confirmationId}
          </div>
        </div>

        <p className="text-sm text-neutral-300 leading-relaxed">
          Your {plan.term_months}-month fixed rate selection of{" "}
          <span className="text-emerald-400 font-mono font-bold">
            ${dollarRate}/kWh ({plan.rate_per_kwh_cents.toFixed(2)}¢/kWh)
          </span>{" "}
          — est.{" "}
          <span className="font-mono text-white font-semibold">
            ${plan.est_monthly_bill.toFixed(2)}/mo
          </span>{" "}
          at {kwh.toLocaleString()} kWh/mo — has been registered for{" "}
          <span className="font-mono text-white">
            {capturedRecord.contactEmail}
          </span>{" "}
          and{" "}
          <span className="font-mono text-white">
            {capturedRecord.contactPhone}
          </span>
          . Our enrollment desk is dispatching your meter execution package
          shortly.
        </p>

        <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-xs font-mono text-neutral-300 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-emerald-400" />
            Enrollment &amp; Rate Desk Support:
          </span>
          <a
            href={`mailto:${ADMIN_NOTIFICATION_EMAIL}`}
            className="text-emerald-300 font-bold underline underline-offset-2"
          >
            {ADMIN_NOTIFICATION_EMAIL}
          </a>
        </div>

        <p className="text-[11px] text-neutral-500 font-mono pt-1">
          {STANDARD_DISCLOSURE}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-3xl border border-emerald-500/30 bg-neutral-900 p-6 sm:p-8 text-white shadow-xl mt-8">
      <div className="flex flex-wrap items-center justify-between border-b border-neutral-800 pb-4 mb-6 gap-4">
        <div>
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
            Step 2 • Confirm {plan.term_months}-Month Fixed Rate Selection
          </span>
          <h4 className="text-xl font-bold mt-0.5">
            {plan.provider} — {plan.plan_name}
          </h4>
          <p className="text-xs text-neutral-400 font-mono mt-0.5">
            ZIP {zipCode} ({territory}) • Term: {plan.term_months} Months •{" "}
            {plan.applied_tier_label}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-extrabold text-emerald-400 font-mono">
            ${dollarRate}{" "}
            <span className="text-xs text-neutral-400">/ kWh</span>
          </div>
          <p className="text-xs text-neutral-400 font-mono">
            ({plan.rate_per_kwh_cents.toFixed(2)}¢/kWh) • Est. Bill: $
            {plan.est_monthly_bill.toFixed(2)}/mo
          </p>
        </div>
      </div>

      {/* Sub-tier rate recap */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-xs text-neutral-400 font-mono mb-6 space-y-1.5">
        <div className="text-neutral-200 font-semibold">
          SELECTED {plan.term_months}-MONTH PLAN SCHEDULE (
          {plan.provider.toUpperCase()}):
        </div>
        <div>
          • Sub-Tiers: 500 kWh = ${(plan.rate_500_cents / 100).toFixed(4)} |
          1,000 kWh = ${(plan.rate_1000_cents / 100).toFixed(4)} | 2,000 kWh = $
          {(plan.rate_2000_cents / 100).toFixed(4)}
        </div>
        <div>
          • Term: {plan.term_months} Months Fixed • Renewable:{" "}
          {plan.renewable_pct}% • Early Exit Fee: ${plan.cancellation_fee}
        </div>
        <div className="text-[11px] text-neutral-500 pt-1">
          {STANDARD_DISCLOSURE}
        </div>
      </div>

      {execError && (
        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
          {execError}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase font-mono text-neutral-400 mb-1.5">
              Email Address (For Rate Lock Confirmation) *
            </label>
            <input
              type="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs uppercase font-mono text-neutral-400 mb-1.5">
              Mobile / Direct Phone *
            </label>
            <input
              type="tel"
              placeholder="(214) 555-0199"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-neutral-700 bg-neutral-800 text-emerald-500 focus:ring-0"
          />
          <span className="text-xs text-neutral-300 leading-relaxed">
            I confirm my interest in locking today&apos;s{" "}
            <strong>
              ${dollarRate}/kWh ({plan.rate_per_kwh_cents.toFixed(2)}¢/kWh)
            </strong>{" "}
            {plan.term_months}-month fixed rate with{" "}
            <strong>{plan.provider}</strong> and consent to receive my plan
            confirmation and enrollment execution follow-up.
          </span>
        </label>

        <div className="flex flex-col sm:flex-row gap-3 items-center pt-2">
          <input
            type="text"
            placeholder="Initials"
            maxLength={6}
            value={initials}
            onChange={(e) =>
              setInitials(
                e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase()
              )
            }
            className="w-full sm:w-1/4 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3.5 text-sm font-mono text-center text-white focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCaptureProspect}
            disabled={!acknowledged || !email || !phone || submitting}
            className="w-full sm:w-3/4 rounded-xl bg-emerald-500 py-3.5 px-6 font-bold text-neutral-950 hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2"
          >
            <ShieldCheck className="h-4 w-4" />
            {submitting
              ? "Registering Rate Lock..."
              : `Confirm ${plan.term_months}-Month Rate Lock ($${dollarRate}/kWh) →`}
          </button>
        </div>
      </div>
    </div>
  );
};
