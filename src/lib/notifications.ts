import {
  ADMIN_NOTIFICATION_EMAIL,
  type CommercialLoePayload,
  type Tier1ProspectPayload,
} from "./compliance";
import {
  computeBrokerMarginRevenue,
  getMilsForMonthlyKwh,
} from "./margin";

export function resolveAdminEmail(): string {
  if (typeof process !== "undefined" && process.env?.ADMIN_NOTIFICATION_EMAIL) {
    const configured = process.env.ADMIN_NOTIFICATION_EMAIL.trim();
    if (configured) return configured;
  }
  return ADMIN_NOTIFICATION_EMAIL;
}

export async function notifyAdminTier1Prospect(
  record: Tier1ProspectPayload & { confirmationId: string }
): Promise<{ adminEmail: string; emailDispatched: boolean }> {
  const adminEmail = resolveAdminEmail();
  const resendKey =
    typeof process !== "undefined" ? process.env?.RESEND_API_KEY?.trim() : "";
  const fromAddress =
    (typeof process !== "undefined" &&
      process.env?.RESEND_FROM_EMAIL?.trim()) ||
    `Energy Choice US <${adminEmail}>`;

  const { mils, adderCentsPerKwh, adderDollarsPerKwh } = getMilsForMonthlyKwh(
    record.allocatedKwh
  );
  const rawSupplierCents = Number(
    (record.rateCents - adderCentsPerKwh).toFixed(2)
  );
  const offeredDollars = (record.rateCents / 100).toFixed(4);
  const rawDollars = (rawSupplierCents / 100).toFixed(4);
  const { monthlyMarginDollars, totalTermMarginDollars } =
    computeBrokerMarginRevenue(record.allocatedKwh, mils, record.termMonths);

  const subject = `[Tier 1 Lock • +${mils} Mils] ${record.provider} @ $${offeredDollars}/kWh (${record.termMonths}m) — ZIP ${record.zipCode}`;

  const textBody = [
    `New Tier 1 Real-Time Rate Lock (${record.confirmationId})`,
    `------------------------------------------------------------`,
    `Admin Desk: ${adminEmail}`,
    `Timestamp: ${record.timestamp}`,
    `Prospect Email: ${record.contactEmail}`,
    `Prospect Phone: ${record.contactPhone}`,
    `ZIP / Territory: ${record.zipCode} (${record.territory})`,
    `Monthly Usage: ${record.allocatedKwh.toLocaleString()} kWh/mo (${record.appliedTierLabel})`,
    `Selected Plan: ${record.provider} — ${record.planName} (${record.termMonths} mos)`,
    ``,
    `--- INTERNAL BROKER MARGIN BREAKDOWN (PRIVATE) ---`,
    `Customer Offered Rate: $${offeredDollars}/kWh (${record.rateCents.toFixed(2)}¢/kWh)`,
    `Raw Supplier Basis:    $${rawDollars}/kWh (${rawSupplierCents.toFixed(2)}¢/kWh)`,
    `Embedded Tier 1 Mils:  +${mils} mils (+$${adderDollarsPerKwh.toFixed(3)}/kWh | +${adderCentsPerKwh.toFixed(2)}¢/kWh)`,
    `Est. Monthly Margin:   $${monthlyMarginDollars.toFixed(2)}/mo`,
    `Full ${record.termMonths}-Mo Margin:   $${totalTermMarginDollars.toFixed(2)}`,
    `--------------------------------------------------`,
    `Supplier Reference EFL: ${record.factSheetUrl || "N/A"}`,
    `Supplier Reference URL: ${record.enrollUrl || "N/A"}`,
  ].join("\n");

  let emailDispatched = false;

  if (resendKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [adminEmail],
          reply_to: record.contactEmail,
          subject,
          text: textBody,
        }),
      });
      if (res.ok) emailDispatched = true;
    } catch {
      // Fallback handled by Google Sheets Apps Script MailApp / CRM webhooks
    }
  }

  return { adminEmail, emailDispatched };
}

export async function notifyAdminCommercialLoe(
  record: CommercialLoePayload & { confirmationId: string }
): Promise<{ adminEmail: string; emailDispatched: boolean }> {
  const adminEmail = resolveAdminEmail();
  const resendKey =
    typeof process !== "undefined" ? process.env?.RESEND_API_KEY?.trim() : "";
  const fromAddress =
    (typeof process !== "undefined" &&
      process.env?.RESEND_FROM_EMAIL?.trim()) ||
    `Energy Choice US <${adminEmail}>`;

  const { mils, adderCentsPerKwh, adderDollarsPerKwh } = getMilsForMonthlyKwh(
    record.monthlyKwh
  );
  const benchmarkTerm = record.selectedTermMonths || 36;
  const { monthlyMarginDollars, totalTermMarginDollars } =
    computeBrokerMarginRevenue(record.monthlyKwh, mils, benchmarkTerm);

  const slaTag =
    record.turnaroundSla === "REAL_TIME"
      ? `${record.tierId === "TIER_1" ? "Tier 1" : "Tier 2"} Lock (+${mils} Mils • ${record.selectedProvider} @ $${((record.selectedRateCents || 0) / 100).toFixed(4)}/kWh)`
      : record.selectedProvider
        ? `24-Hr Quote Reservation (+${mils} Mils • ${record.selectedProvider} @ $${((record.selectedRateCents || 0) / 100).toFixed(4)}/kWh)`
        : `24-Hr Custom Desk (+${mils} Mils • ${record.tierRangeLabel})`;

  const subject = `[Commercial LOE] ${record.businessName} — ${record.monthlyKwh.toLocaleString()} kWh/mo — ${slaTag}`;

  const rawCommercialCents =
    record.selectedRateCents !== undefined
      ? Number((record.selectedRateCents - adderCentsPerKwh).toFixed(2))
      : undefined;

  const textBody = [
    `Commercial Utility Bill & Signed LOE Received (${record.confirmationId})`,
    `------------------------------------------------------------`,
    `Admin Desk: ${adminEmail}`,
    `SLA / Flow: ${slaTag}`,
    `Timestamp: ${record.timestamp}`,
    `Business Entity: ${record.businessName}`,
    `Authorized Signer: ${record.authorizedSignerName} (${record.signerTitle})`,
    `Contact Email: ${record.contactEmail}`,
    `Contact Phone: ${record.contactPhone}`,
    `Current Supplier: ${record.currentProvider || "Not Specified"}`,
    `ZIP / Territory: ${record.zipCode} (${record.territory})`,
    `Monthly Volume: ${record.monthlyKwh.toLocaleString()} kWh/mo (${record.annualizedKwh.toLocaleString()} kWh/yr)`,
    `Usage Tier: ${record.commercialTierLabel}`,
    record.selectedProvider
      ? `Selected Real-Time Offer: ${record.selectedProvider} — ${record.selectedPlanName} (${record.selectedTermMonths} mos)`
      : `Requested Custom Bid Terms: ${(record.requestedTerms || [18, 24, 36, 48, 60, 72]).join(", ")} Months`,
    ``,
    `--- INTERNAL BROKER MARGIN BREAKDOWN (PRIVATE) ---`,
    `Assigned Tier Margin:  +${mils} mils (+$${adderDollarsPerKwh.toFixed(3)}/kWh | +${adderCentsPerKwh.toFixed(2)}¢/kWh)`,
    ...(record.selectedRateCents !== undefined &&
    rawCommercialCents !== undefined
      ? [
          `Customer Locked Rate:  $${(record.selectedRateCents / 100).toFixed(4)}/kWh (${record.selectedRateCents.toFixed(2)}¢/kWh)`,
          `Raw Supplier Matrix:   $${(rawCommercialCents / 100).toFixed(4)}/kWh (${rawCommercialCents.toFixed(2)}¢/kWh)`,
        ]
      : [
          `Desk Pricing Rule:     Add +${mils} mils (+$${adderDollarsPerKwh.toFixed(3)}/kWh) to wholesale supplier bids before sending 24-hr quote.`,
        ]),
    `Est. Monthly Margin:   $${monthlyMarginDollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo`,
    `Est. ${benchmarkTerm}-Mo Margin:     $${totalTermMarginDollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `--------------------------------------------------`,
    `E-Signature: ${record.loeSignature} (Initials: ${record.loeSignerInitials})`,
    `Attached Bill: ${record.billFileName} (${Math.round(record.billFileSizeBytes / 1024)} KB)`,
  ].join("\n");

  let emailDispatched = false;

  if (resendKey) {
    try {
      const cleanBase64 = record.billBase64
        ? record.billBase64.replace(/^data:[^;]+;base64,/, "")
        : undefined;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [adminEmail],
          reply_to: record.contactEmail,
          subject,
          text: textBody,
          attachments: cleanBase64
            ? [
                {
                  filename: `${record.confirmationId}_${record.billFileName}`,
                  content: cleanBase64,
                },
              ]
            : undefined,
        }),
      });
      if (res.ok) emailDispatched = true;
    } catch {
      // Fallback handled by Google Sheets Apps Script MailApp / CRM webhooks
    }
  }

  return { adminEmail, emailDispatched };
}
