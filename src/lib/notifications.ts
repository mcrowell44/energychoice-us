import {
  ADMIN_NOTIFICATION_EMAIL,
  type CommercialLoePayload,
  type Tier1ProspectPayload,
} from "./compliance";
import {
  computeBrokerMarginRevenue,
  getMilsForMonthlyKwh,
} from "./margin";
import {
  BROKER_DOSSIER_RECIPIENT,
  DEFAULT_FROM_ADDRESS,
  DEFAULT_FROM_NAME,
  sendHostingerSmtp,
} from "./hostingerSmtp";

export function resolveAdminEmail(): string {
  if (typeof process !== "undefined" && process.env?.ADMIN_NOTIFICATION_EMAIL) {
    const configured = process.env.ADMIN_NOTIFICATION_EMAIL.trim();
    if (configured) return configured;
  }
  return ADMIN_NOTIFICATION_EMAIL;
}

export function resolveDossierEmail(): string {
  if (typeof process !== "undefined" && process.env?.BROKER_DOSSIER_RECIPIENT) {
    const configured = process.env.BROKER_DOSSIER_RECIPIENT.trim();
    if (configured) return configured;
  }
  return BROKER_DOSSIER_RECIPIENT;
}

function buildCustomerReceiptText(
  record: CommercialLoePayload & { confirmationId: string }
): string {
  const isRealtime = record.turnaroundSla === "REAL_TIME";
  const rateDollars = record.selectedRateCents
    ? (record.selectedRateCents / 100).toFixed(4)
    : "—";

  return [
    `ENERGY CHOICE US — OFFICIAL CONFIRMATION RECEIPT`,
    `Confirmation ID: ${record.confirmationId}`,
    `------------------------------------------------------------`,
    `Business Name:         ${record.businessName}`,
    `Authorized Signer:     ${record.authorizedSignerName} (${record.signerTitle})`,
    `Service Territory:     ${record.territory} (ZIP ${record.zipCode})`,
    `Annual Usage Tier:     ${record.tierRangeLabel}`,
    `Selected Provider:     ${record.selectedProvider || "Custom 24-Hr Bidding Desk"}`,
    `Contract Term:         ${record.selectedTermMonths ? `${record.selectedTermMonths} Months` : "Multi-Term Bidding"}`,
    `Fixed Energy Rate:     $${rateDollars}/kWh (${record.selectedRateCents ? `${record.selectedRateCents.toFixed(2)}¢` : "Pending"})`,
    `Uploaded Bill:         ${record.billFileName}`,
    `Status:                ${isRealtime ? "Rate Lock & LOE Executed" : "Rate Quote Reserved • 24-Hr Validation Active"}`,
    ``,
    `NEXT STEPS:`,
    isRealtime
      ? `Your rate lock has been paired with your utility statement and submitted for final supplier registration. Enrollment copies will be finalized and sent to ${record.contactEmail}.`
      : `Your selected rate is held for 24-hour pricing & usage validation against your uploaded electric utility bill. Within 24 hours, our desk will verify meter compatibility and email your final contract documents directly to ${record.contactEmail}.`,
    ``,
    `------------------------------------------------------------`,
    `Energy Choice US Desk: ${DEFAULT_FROM_ADDRESS}`,
    `Website: https://energychoice.us`,
    `Speed to need is the motto.`,
  ].join("\n");
}

/**
 * Builds HTML for customer confirmation receipt (strictly energy rate, zero internal markup)
 */
function buildCustomerReceiptHtml(
  record: CommercialLoePayload & { confirmationId: string }
): string {
  const isRealtime = record.turnaroundSla === "REAL_TIME";
  const rateDollars = record.selectedRateCents
    ? (record.selectedRateCents / 100).toFixed(4)
    : "—";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #010a1a; color: #ffffff; padding: 24px; margin: 0; }
    .card { background-color: #031129; border: 1px solid #00e5ff; border-radius: 16px; max-width: 620px; margin: 0 auto; padding: 32px; box-shadow: 0 10px 30px rgba(0,229,255,0.15); }
    .badge { display: inline-block; background-color: rgba(0, 229, 255, 0.15); border: 1px solid #00e5ff; color: #00e5ff; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
    h1 { color: #ffffff; font-size: 24px; margin: 16px 0 8px 0; }
    .confirmation { color: #00e5ff; font-family: monospace; font-size: 14px; font-weight: bold; margin-bottom: 24px; }
    .grid { display: table; width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    .row { display: table-row; }
    .cell-label { display: table-cell; padding: 8px 0; color: #94a3b8; font-weight: 500; border-bottom: 1px solid #0e2d5c; }
    .cell-val { display: table-cell; padding: 8px 0; color: #ffffff; font-weight: 600; text-align: right; border-bottom: 1px solid #0e2d5c; font-family: monospace; }
    .highlight-box { background-color: #010a1a; border-left: 4px solid #00e5ff; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0; font-size: 13px; line-height: 1.6; color: #cbd5e1; }
    .footer { font-size: 11px; color: #64748b; text-align: center; margin-top: 32px; line-height: 1.5; font-family: monospace; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Energy Choice US • Official Receipt</span>
    <h1>${isRealtime ? "Rate Lock & LOE Executed" : "Rate Quote Reserved • 24-Hr Validation Active"}</h1>
    <div class="confirmation">Confirmation ID: ${record.confirmationId}</div>

    <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
      Dear ${record.authorizedSignerName},<br><br>
      Thank you for submitting your commercial energy procurement application for <strong>${record.businessName}</strong>. 
      Your electric utility bill (<code>${record.billFileName}</code>) and signed Letter of Exclusivity (LOE) have been securely logged.
    </p>

    <div class="grid">
      <div class="row">
        <div class="cell-label">Selected Provider</div>
        <div class="cell-val">${record.selectedProvider || "Custom 24-Hr Bidding Desk"}</div>
      </div>
      <div class="row">
        <div class="cell-label">Contract Term Length</div>
        <div class="cell-val">${record.selectedTermMonths ? `${record.selectedTermMonths} Months` : "Multi-Term Bidding"}</div>
      </div>
      <div class="row">
        <div class="cell-label">Fixed Energy Supply Rate</div>
        <div class="cell-val" style="color: #00e5ff;">$${rateDollars}/kWh (${record.selectedRateCents ? `${record.selectedRateCents.toFixed(2)}¢` : "Pending"})</div>
      </div>
      <div class="row">
        <div class="cell-label">Annual Usage Tier</div>
        <div class="cell-val">${record.tierRangeLabel}</div>
      </div>
      <div class="row">
        <div class="cell-label">Service Territory</div>
        <div class="cell-val">${record.territory}</div>
      </div>
      <div class="row">
        <div class="cell-label">Authorized Signer</div>
        <div class="cell-val">${record.authorizedSignerName} (${record.signerTitle})</div>
      </div>
    </div>

    <div class="highlight-box">
      <strong>Next Steps:</strong><br>
      ${
        isRealtime
          ? `Your rate lock has been paired with your utility statement and submitted for final supplier registration. Enrollment copies will be finalized and sent to ${record.contactEmail}.`
          : `Your selected rate is held for <strong>24-hour pricing & usage validation</strong> against your uploaded electric utility bill. Within 24 hours, our desk will verify meter compatibility and email your final contract documents directly to ${record.contactEmail}.`
      }
    </div>

    <div class="footer">
      Desk: ${DEFAULT_FROM_ADDRESS} • Energy Choice US<br>
      © ${new Date().getFullYear()} energychoice.us — Speed to need is the motto.
    </div>
  </div>
</body>
</html>
  `;
}

function buildBrokerDossierText(
  record: CommercialLoePayload & { confirmationId: string },
  mils: number,
  adderDollarsPerKwh: number,
  adderCentsPerKwh: number,
  monthlyMarginDollars: number,
  totalTermMarginDollars: number,
  benchmarkTerm: number,
  rawCommercialCents?: number
): string {
  const offeredDollars = record.selectedRateCents
    ? (record.selectedRateCents / 100).toFixed(4)
    : "Custom Bid";
  const rawDollars = rawCommercialCents
    ? (rawCommercialCents / 100).toFixed(4)
    : "—";

  return [
    `BROKER INTAKE DOSSIER — CONFIDENTIAL CORPORATE AUDIT`,
    `Confirmation ID: ${record.confirmationId}`,
    `Timestamp:       ${record.timestamp}`,
    `------------------------------------------------------------`,
    `1. CUSTOMER & ACCOUNT DETAILS`,
    `Business Name:       ${record.businessName}`,
    `Authorized Signer:   ${record.authorizedSignerName} (${record.signerTitle})`,
    `Contact Email:       ${record.contactEmail}`,
    `Contact Phone:       ${record.contactPhone}`,
    `Service Location:    ZIP ${record.zipCode} • ${record.territory}`,
    `Current Provider:    ${record.currentProvider || "Not Specified"}`,
    `Monthly Volume:      ${record.monthlyKwh.toLocaleString()} kWh/mo (${record.annualizedKwh.toLocaleString()} kWh/yr)`,
    `Usage Tier:          ${record.commercialTierLabel}`,
    `SLA / Flow:          ${record.turnaroundSla === "REAL_TIME" ? "Real-Time Automatic Lock" : "24-Hour Pricing & Usage Validation"}`,
    ``,
    `2. RATE QUOTE & SELECTED TERMS`,
    `Selected Supplier:   ${record.selectedProvider || "Custom 24-Hr Desk"}`,
    `Plan Name:           ${record.selectedPlanName || "Custom Bidding Strip"}`,
    `Contract Term:       ${record.selectedTermMonths ? `${record.selectedTermMonths} Months` : (record.requestedTerms || []).join(", ") + " Months"}`,
    `Customer Rate:       $${offeredDollars}/kWh (${record.selectedRateCents ? `${record.selectedRateCents.toFixed(2)}¢` : "Pending"})`,
    `Est. Monthly Bill:   $${record.estMonthlyBill ? record.estMonthlyBill.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}/mo`,
    ``,
    `3. CONFIDENTIAL CORPORATE BROKER MARGIN BREAKDOWN`,
    `Assigned Tier Mils:  +${mils} mils (+$${adderDollarsPerKwh.toFixed(3)}/kWh | +${adderCentsPerKwh.toFixed(2)}¢/kWh)`,
    `Customer Offered:    $${offeredDollars}/kWh`,
    `Raw Supplier Basis:  $${rawDollars}/kWh`,
    `Est. Monthly Margin: $${monthlyMarginDollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo`,
    `Est. Full-Term (${benchmarkTerm}m): $${totalTermMarginDollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    ``,
    `4. LOE LEGAL AUTHORIZATION & VERIFICATION`,
    `E-Signature:         ${record.loeSignature}`,
    `Signer Initials:     ${record.loeSignerInitials}`,
    `LOE Checkbox:        VERIFIED & EXECUTED ✓`,
    `Attached Bill:       ${record.billFileName} (${Math.round(record.billFileSizeBytes / 1024)} KB)`,
    `------------------------------------------------------------`,
  ].join("\n");
}

/**
 * Builds HTML for Broker Intake Dossier (containing full confidential markup breakdown)
 */
function buildBrokerDossierHtml(
  record: CommercialLoePayload & { confirmationId: string },
  mils: number,
  adderDollarsPerKwh: number,
  adderCentsPerKwh: number,
  monthlyMarginDollars: number,
  totalTermMarginDollars: number,
  benchmarkTerm: number,
  rawCommercialCents?: number
): string {
  const offeredDollars = record.selectedRateCents
    ? (record.selectedRateCents / 100).toFixed(4)
    : "—";
  const rawDollars = rawCommercialCents
    ? (rawCommercialCents / 100).toFixed(4)
    : "—";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #010a1a; color: #ffffff; padding: 24px; margin: 0; }
    .card { background-color: #031129; border: 1px solid #38bdf8; border-radius: 16px; max-width: 680px; margin: 0 auto; padding: 32px; }
    .badge { display: inline-block; background-color: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; color: #38bdf8; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
    h1 { color: #ffffff; font-size: 22px; margin: 16px 0 6px 0; }
    .sub { color: #94a3b8; font-size: 12px; font-family: monospace; margin-bottom: 24px; }
    .section-title { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #00e5ff; font-weight: bold; margin: 24px 0 12px 0; border-bottom: 1px solid #0e2d5c; padding-bottom: 6px; }
    .grid { display: table; width: 100%; border-collapse: collapse; font-size: 13px; }
    .row { display: table-row; }
    .cell-label { display: table-cell; padding: 8px 0; color: #94a3b8; border-bottom: 1px solid #0e2d5c; }
    .cell-val { display: table-cell; padding: 8px 0; color: #ffffff; font-weight: 600; text-align: right; border-bottom: 1px solid #0e2d5c; font-family: monospace; }
    .private-margin-box { background-color: #071938; border: 1px solid #38bdf8; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .margin-title { color: #f59e0b; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; font-family: monospace; }
    .att-note { background-color: #010a1a; border: 1px dashed #00e5ff; padding: 14px; border-radius: 8px; font-size: 12px; color: #00e5ff; font-family: monospace; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Broker Intake Dossier • Confidential</span>
    <h1>New Commercial Intake: ${record.businessName}</h1>
    <div class="sub">Confirmation ID: ${record.confirmationId} • Timestamp: ${record.timestamp}</div>

    <div class="section-title">1. Customer & Account Details</div>
    <div class="grid">
      <div class="row"><div class="cell-label">Business Name</div><div class="cell-val">${record.businessName}</div></div>
      <div class="row"><div class="cell-label">Authorized Signer</div><div class="cell-val">${record.authorizedSignerName} (${record.signerTitle})</div></div>
      <div class="row"><div class="cell-label">Contact Email</div><div class="cell-val">${record.contactEmail}</div></div>
      <div class="row"><div class="cell-label">Contact Phone</div><div class="cell-val">${record.contactPhone}</div></div>
      <div class="row"><div class="cell-label">Service ZIP & Territory</div><div class="cell-val">ZIP ${record.zipCode} • ${record.territory}</div></div>
      <div class="row"><div class="cell-label">Current Provider</div><div class="cell-val">${record.currentProvider || "Not Specified"}</div></div>
      <div class="row"><div class="cell-label">Monthly / Annual Volume</div><div class="cell-val">${record.monthlyKwh.toLocaleString()} kWh/mo (${record.annualizedKwh.toLocaleString()} kWh/yr)</div></div>
      <div class="row"><div class="cell-label">Annual Usage Tier</div><div class="cell-val">${record.commercialTierLabel}</div></div>
      <div class="row"><div class="cell-label">SLA / Flow</div><div class="cell-val">${record.turnaroundSla === "REAL_TIME" ? "Real-Time Automatic Lock" : "24-Hour Pricing & Usage Validation"}</div></div>
    </div>

    <div class="section-title">2. Rate Quote & Selected Terms</div>
    <div class="grid">
      <div class="row"><div class="cell-label">Selected Supplier</div><div class="cell-val">${record.selectedProvider || "Custom 24-Hr Desk"}</div></div>
      <div class="row"><div class="cell-label">Plan Name</div><div class="cell-val">${record.selectedPlanName || "Custom Bidding Strip"}</div></div>
      <div class="row"><div class="cell-label">Contract Term</div><div class="cell-val">${record.selectedTermMonths ? `${record.selectedTermMonths} Months` : (record.requestedTerms || []).join(", ") + " Months"}</div></div>
      <div class="row"><div class="cell-label">Customer Quoted Rate</div><div class="cell-val" style="color: #00e5ff;">$${offeredDollars}/kWh (${record.selectedRateCents ? `${record.selectedRateCents.toFixed(2)}¢` : "Pending"})</div></div>
      <div class="row"><div class="cell-label">Est. Monthly Bill</div><div class="cell-val">$${record.estMonthlyBill ? record.estMonthlyBill.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}/mo</div></div>
    </div>

    <div class="private-margin-box">
      <div class="margin-title">3. Confidential Corporate Broker Margin Breakdown</div>
      <div class="grid">
        <div class="row"><div class="cell-label">Assigned Tier Mils</div><div class="cell-val" style="color: #f59e0b;">+${mils} mils (+$${adderDollarsPerKwh.toFixed(3)}/kWh | +${adderCentsPerKwh.toFixed(2)}¢/kWh)</div></div>
        <div class="row"><div class="cell-label">Customer Offered Rate</div><div class="cell-val">$${offeredDollars}/kWh</div></div>
        <div class="row"><div class="cell-label">Raw True Supplier Basis</div><div class="cell-val">$${rawDollars}/kWh</div></div>
        <div class="row"><div class="cell-label">Est. Monthly Broker Margin</div><div class="cell-val" style="color: #10b981;">$${monthlyMarginDollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo</div></div>
        <div class="row"><div class="cell-label">Est. Full-Term (${benchmarkTerm}m) Margin</div><div class="cell-val" style="color: #10b981; font-size: 15px;">$${totalTermMarginDollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
      </div>
    </div>

    <div class="section-title">4. LOE Legal Authorization & Verification</div>
    <div class="grid">
      <div class="row"><div class="cell-label">Electronic Signature</div><div class="cell-val">${record.loeSignature}</div></div>
      <div class="row"><div class="cell-label">Signer Initials</div><div class="cell-val">${record.loeSignerInitials}</div></div>
      <div class="row"><div class="cell-label">LOE Consent Checkbox</div><div class="cell-val" style="color: #10b981;">VERIFIED & EXECUTED ✓</div></div>
    </div>

    <div class="att-note">
      📎 <strong>Attached Electric Utility Bill:</strong><br>
      File: ${record.billFileName} (${Math.round(record.billFileSizeBytes / 1024)} KB)<br>
      <em>The complete uploaded bill document has been attached to this email.</em>
    </div>
  </div>
</body>
</html>
  `;
}

export async function notifyAdminTier1Prospect(
  record: Tier1ProspectPayload & { confirmationId: string }
): Promise<{ adminEmail: string; emailDispatched: boolean }> {
  const dossierEmail = resolveDossierEmail();
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

  const subject = `[Tier 1 Lock • +${mils} Mils] ${record.provider} @ $${offeredDollars}/kWh (${record.termMonths}m) — ${record.contactEmail}`;

  const textBody = [
    `New Tier 1 Real-Time Rate Lock (${record.confirmationId})`,
    `------------------------------------------------------------`,
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
  ].join("\n");

  let emailDispatched = false;

  try {
    await sendHostingerSmtp({
      to: dossierEmail,
      replyTo: record.contactEmail,
      subject,
      text: textBody,
    });
    emailDispatched = true;
  } catch (err) {
    console.error("Hostinger SMTP Tier 1 notification failed:", err);
  }

  return { adminEmail: dossierEmail, emailDispatched };
}

export async function notifyAdminCommercialLoe(
  record: CommercialLoePayload & { confirmationId: string }
): Promise<{ adminEmail: string; emailDispatched: boolean }> {
  const dossierEmail = resolveDossierEmail();
  const customerEmail = record.contactEmail.trim();

  const { mils, adderCentsPerKwh, adderDollarsPerKwh } = getMilsForMonthlyKwh(
    record.monthlyKwh
  );
  const benchmarkTerm = record.selectedTermMonths || 36;
  const { monthlyMarginDollars, totalTermMarginDollars } =
    computeBrokerMarginRevenue(record.monthlyKwh, mils, benchmarkTerm);

  const rawCommercialCents =
    record.selectedRateCents !== undefined
      ? Number((record.selectedRateCents - adderCentsPerKwh).toFixed(2))
      : undefined;

  const offeredDollars = record.selectedRateCents
    ? `$${(record.selectedRateCents / 100).toFixed(4)}/kWh`
    : "Custom Bid";

  const isRealtime = record.turnaroundSla === "REAL_TIME";
  const subjectDossier = `[Broker Dossier] ${record.businessName} — ${record.monthlyKwh.toLocaleString()} kWh/mo (${record.tierRangeLabel}) — ${offeredDollars} (+${mils} Mils)`;
  const subjectCustomer = `Your Energy Choice US Confirmation Receipt (${record.confirmationId}) — ${record.businessName}`;

  // Clean Base64 attachment for utility bill
  const cleanBase64 = record.billBase64
    ? record.billBase64.replace(/^data:[^;]+;base64,/, "")
    : undefined;

  const billAttachment = cleanBase64
    ? [
        {
          filename: `${record.confirmationId}_${record.billFileName}`,
          contentType: record.billMimeType || "application/pdf",
          base64Content: cleanBase64,
        },
      ]
    : undefined;

  let emailDispatched = false;

  // 1. Dispatch Broker Intake Dossier to marcus@cdmweb.store (with attached bill & confidential margin)
  try {
    const dossierHtml = buildBrokerDossierHtml(
      record,
      mils,
      adderDollarsPerKwh,
      adderCentsPerKwh,
      monthlyMarginDollars,
      totalTermMarginDollars,
      benchmarkTerm,
      rawCommercialCents
    );
    const dossierText = buildBrokerDossierText(
      record,
      mils,
      adderDollarsPerKwh,
      adderCentsPerKwh,
      monthlyMarginDollars,
      totalTermMarginDollars,
      benchmarkTerm,
      rawCommercialCents
    );

    await sendHostingerSmtp({
      fromAddress: DEFAULT_FROM_ADDRESS,
      fromName: "Energy Choice US Broker Desk",
      to: dossierEmail,
      replyTo: customerEmail,
      subject: subjectDossier,
      text: dossierText,
      html: dossierHtml,
      attachments: billAttachment,
    });

    emailDispatched = true;
  } catch (err) {
    console.error("Failed to deliver broker intake dossier to", dossierEmail, err);
  }

  // 2. Dispatch Confirmation Receipt to customer email (if valid and not identical)
  if (customerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    try {
      const customerHtml = buildCustomerReceiptHtml(record);
      const customerText = buildCustomerReceiptText(record);

      await sendHostingerSmtp({
        fromAddress: DEFAULT_FROM_ADDRESS,
        fromName: DEFAULT_FROM_NAME,
        to: customerEmail,
        replyTo: DEFAULT_FROM_ADDRESS,
        subject: subjectCustomer,
        text: customerText,
        html: customerHtml,
      });
    } catch (err) {
      console.error("Failed to deliver customer receipt to", customerEmail, err);
    }
  }

  return { adminEmail: dossierEmail, emailDispatched };
}
