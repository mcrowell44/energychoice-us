// src/lib/compliance.ts
var STANDARD_DISCLOSURE = "This is a 100% automated system connected with major suppliers nationwide to provide the optimum search and opportunities available for users to cut time and research with a wide variety of options. Speed to need is the motto.";
var ADMIN_NOTIFICATION_EMAIL = "energychoiceus@cdmweb.store";
var CONTRACT_TERMS = [18, 24, 36, 48, 60, 72];
var USAGE_TIERS = [
  {
    id: "TIER_1",
    shortName: "Tier 1",
    rangeLabel: "12,000 \u2013 49,999 kWh Annually",
    subLabel: "Automatic Signup (1,000 \u2013 4,166 kWh/mo)",
    minAnnualKwh: 12e3,
    maxAnnualKwh: 49999,
    minKwh: 1e3,
    maxKwh: 4166,
    presetKwh: 2e3,
    isRealTime: true,
    turnaroundLabel: "Automatic Real-Time Signup"
  },
  {
    id: "TIER_2",
    shortName: "Tier 2",
    rangeLabel: "50,000 \u2013 99,999 kWh Annually",
    subLabel: "Small Commercial (~4,167 \u2013 8,333 kWh/mo)",
    minAnnualKwh: 5e4,
    maxAnnualKwh: 99999,
    minKwh: 4167,
    maxKwh: 8333,
    presetKwh: 6e3,
    isRealTime: false,
    turnaroundLabel: "Live Quote \u2022 24-Hr Validation"
  },
  {
    id: "TIER_3",
    shortName: "Tier 3",
    rangeLabel: "100,000 \u2013 299,999 kWh Annually",
    subLabel: "Mid Commercial (~8,334 \u2013 24,999 kWh/mo)",
    minAnnualKwh: 1e5,
    maxAnnualKwh: 299999,
    minKwh: 8334,
    maxKwh: 24999,
    presetKwh: 15e3,
    isRealTime: false,
    turnaroundLabel: "Live Quote \u2022 24-Hr Validation"
  },
  {
    id: "TIER_4",
    shortName: "Tier 4",
    rangeLabel: "300,000 \u2013 499,999 kWh Annually",
    subLabel: "Large Commercial (~25,000 \u2013 41,666 kWh/mo)",
    minAnnualKwh: 3e5,
    maxAnnualKwh: 499999,
    minKwh: 25e3,
    maxKwh: 41666,
    presetKwh: 3e4,
    isRealTime: false,
    turnaroundLabel: "Live Quote \u2022 24-Hr Validation"
  },
  {
    id: "TIER_5",
    shortName: "Tier 5",
    rangeLabel: "500,000 \u2013 999,999 kWh Annually",
    subLabel: "Heavy Commercial (~41,667 \u2013 83,333 kWh/mo)",
    minAnnualKwh: 5e5,
    maxAnnualKwh: 999999,
    minKwh: 41667,
    maxKwh: 83333,
    presetKwh: 6e4,
    isRealTime: false,
    turnaroundLabel: "Live Quote \u2022 24-Hr Validation"
  },
  {
    id: "TIER_6",
    shortName: "Tier 6",
    rangeLabel: "1,000,000 \u2013 3,000,000 kWh Annually",
    subLabel: "Industrial / Megawatt (83,334 \u2013 250,000+ kWh/mo)",
    minAnnualKwh: 1e6,
    maxAnnualKwh: 3e6,
    minKwh: 83334,
    maxKwh: 25e4,
    presetKwh: 15e4,
    isRealTime: false,
    turnaroundLabel: "Live Quote \u2022 24-Hr Validation"
  }
];
function resolveUsageTier(monthlyKwh) {
  const safeMonthly = Math.max(1, Math.floor(monthlyKwh));
  const annualKwh = safeMonthly * 12;
  if (annualKwh < 5e4) return USAGE_TIERS[0];
  if (annualKwh < 1e5) return USAGE_TIERS[1];
  if (annualKwh < 3e5) return USAGE_TIERS[2];
  if (annualKwh < 5e5) return USAGE_TIERS[3];
  if (annualKwh < 1e6) return USAGE_TIERS[4];
  return USAGE_TIERS[5];
}

// src/lib/margin.ts
var TIER_MILS_SCHEDULE = {
  TIER_1: 10,
  TIER_2: 8,
  TIER_3: 7,
  TIER_4: 5,
  TIER_5: 4,
  TIER_6: 3
};
function getMilsForMonthlyKwh(monthlyKwh) {
  const tier = resolveUsageTier(monthlyKwh);
  const mils = TIER_MILS_SCHEDULE[tier.id];
  return {
    tierId: tier.id,
    mils,
    adderDollarsPerKwh: Number((mils * 1e-3).toFixed(4)),
    adderCentsPerKwh: Number((mils * 0.1).toFixed(2))
  };
}
function computeBrokerMarginRevenue(monthlyKwh, mils, termMonths) {
  const monthlyMarginDollars = Number((monthlyKwh * mils * 1e-3).toFixed(2));
  const totalTermMarginDollars = Number(
    (monthlyMarginDollars * termMonths).toFixed(2)
  );
  return { monthlyMarginDollars, totalTermMarginDollars };
}

// src/lib/hostingerSmtp.ts
import tls from "node:tls";
var HOSTINGER_SMTP_HOST = "smtp.hostinger.com";
var HOSTINGER_SMTP_PORT = 465;
var DEFAULT_FROM_ADDRESS = "energychoiceus@cdmweb.store";
var DEFAULT_FROM_NAME = "Energy Choice US";
var BROKER_DOSSIER_RECIPIENT = "marcus@cdmweb.store";
var TIMEOUT_MS = 25e3;
var SmtpError = class extends Error {
  code;
  hard;
  constructor(message, code, hard) {
    super(message);
    this.name = "SmtpError";
    this.code = code;
    this.hard = hard;
  }
};
var b64 = (s) => Buffer.from(s, "utf8").toString("base64");
var header = (v) => /^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`;
function buildMimeMessage(opts, messageId) {
  const fromName = opts.fromName || DEFAULT_FROM_NAME;
  const fromAddr = opts.fromAddress || DEFAULT_FROM_ADDRESS;
  const toList = Array.isArray(opts.to) ? opts.to.join(", ") : opts.to;
  const hasAttachments = Boolean(opts.attachments && opts.attachments.length > 0);
  const hasHtml = Boolean(opts.html);
  const hasText = Boolean(opts.text);
  const mixedBoundary = `----=_Part_Mixed_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const altBoundary = `----=_Part_Alt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const baseHeaders = [
    `From: ${header(fromName)} <${fromAddr}>`,
    `To: ${toList}`,
    opts.replyTo ? `Reply-To: <${opts.replyTo}>` : "",
    `Subject: ${header(opts.subject)}`,
    `Date: ${(/* @__PURE__ */ new Date()).toUTCString()}`,
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
    "Auto-Submitted: auto-generated",
    "X-Mailer: Energy Choice US Intake Engine"
  ].filter(Boolean);
  if (hasAttachments) {
    baseHeaders.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`, "");
    const parts = [];
    if (hasHtml && hasText) {
      parts.push(
        `--${mixedBoundary}`,
        `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
        "",
        `--${altBoundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        "Content-Transfer-Encoding: base64",
        "",
        Buffer.from(opts.text, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n"),
        `--${altBoundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        "Content-Transfer-Encoding: base64",
        "",
        Buffer.from(opts.html, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n"),
        `--${altBoundary}--`
      );
    } else if (hasHtml) {
      parts.push(
        `--${mixedBoundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        "Content-Transfer-Encoding: base64",
        "",
        Buffer.from(opts.html, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n")
      );
    } else {
      parts.push(
        `--${mixedBoundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        "Content-Transfer-Encoding: base64",
        "",
        Buffer.from(opts.text || "", "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n")
      );
    }
    for (const att of opts.attachments) {
      const mime = att.contentType || "application/octet-stream";
      parts.push(
        `--${mixedBoundary}`,
        `Content-Type: ${mime}; name="${header(att.filename)}"`,
        `Content-Disposition: attachment; filename="${header(att.filename)}"`,
        "Content-Transfer-Encoding: base64",
        "",
        att.base64Content.replace(/.{1,76}/g, "$&\r\n")
      );
    }
    parts.push(`--${mixedBoundary}--`, "");
    return baseHeaders.join("\r\n") + "\r\n" + parts.join("\r\n");
  }
  if (hasHtml && hasText) {
    baseHeaders.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`, "");
    const parts = [
      `--${altBoundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.from(opts.text, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n"),
      `--${altBoundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.from(opts.html, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n"),
      `--${altBoundary}--`,
      ""
    ];
    return baseHeaders.join("\r\n") + "\r\n" + parts.join("\r\n");
  }
  if (hasHtml) {
    baseHeaders.push(
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      ""
    );
    return baseHeaders.join("\r\n") + "\r\n" + Buffer.from(opts.html, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n") + "\r\n";
  }
  baseHeaders.push(
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    ""
  );
  return baseHeaders.join("\r\n") + "\r\n" + Buffer.from(opts.text || "", "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n") + "\r\n";
}
async function sendHostingerSmtp(options) {
  const user = process.env.SMTP_USER?.trim() || process.env.HOSTINGER_SMTP_USER?.trim() || DEFAULT_FROM_ADDRESS;
  const pass = process.env.SMTP_PASS?.trim() || process.env.HOSTINGER_SMTP_PASS?.trim() || "";
  if (!pass) {
    throw new SmtpError(
      "Hostinger SMTP password is not configured (SMTP_PASS missing).",
      0,
      false
    );
  }
  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  const cleanRecipients = recipients.map((r) => r.trim()).filter((r) => r.length > 0);
  if (cleanRecipients.length === 0) {
    throw new SmtpError("No recipient email specified.", 0, true);
  }
  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@cdmweb.store>`;
  const socket = tls.connect({
    host: HOSTINGER_SMTP_HOST,
    port: HOSTINGER_SMTP_PORT,
    servername: HOSTINGER_SMTP_HOST
  });
  socket.setEncoding("utf8");
  let buffer = "";
  let waiter = null;
  let failure = null;
  const tryResolve = () => {
    if (!waiter) return;
    const lines = buffer.split("\r\n");
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i] ?? "";
      if (/^\d{3} /.test(line)) {
        const text = lines.slice(0, i + 1).join("\n");
        buffer = lines.slice(i + 1).join("\r\n");
        const w = waiter;
        waiter = null;
        w({ code: Number(line.slice(0, 3)), text });
        return;
      }
    }
  };
  socket.on("data", (d) => {
    buffer += d;
    tryResolve();
  });
  socket.on("error", (e) => {
    failure = e;
    waiter?.(e);
    waiter = null;
  });
  const read = () => new Promise((resolve, reject) => {
    if (failure) return reject(failure);
    const t = setTimeout(() => {
      waiter = null;
      reject(new SmtpError("Hostinger SMTP did not respond in time.", 0, false));
    }, TIMEOUT_MS);
    waiter = (r) => {
      clearTimeout(t);
      r instanceof Error ? reject(new SmtpError(`Hostinger SMTP connection error: ${r.message}`, 0, false)) : resolve(r);
    };
    tryResolve();
  });
  const step = async (cmd, expect, stage) => {
    if (cmd !== null) socket.write(cmd + "\r\n");
    const r = await read();
    if (r.code !== expect) {
      const hard = r.code >= 500;
      throw new SmtpError(
        `Hostinger SMTP ${stage} failed [${r.code}]: ${r.text}`,
        r.code,
        hard
      );
    }
    return r;
  };
  try {
    await step(null, 220, "greeting");
    await step("EHLO energychoice.us", 250, "EHLO");
    await step("AUTH LOGIN", 334, "AUTH LOGIN");
    await step(Buffer.from(user).toString("base64"), 334, "USERNAME");
    await step(Buffer.from(pass).toString("base64"), 235, "PASSWORD");
    const senderAddress = options.fromAddress || user;
    await step(`MAIL FROM:<${senderAddress}>`, 250, "MAIL FROM");
    for (const rcpt of cleanRecipients) {
      await step(`RCPT TO:<${rcpt}>`, 250, `RCPT TO (${rcpt})`);
    }
    await step("DATA", 354, "DATA");
    const rawMessage = buildMimeMessage(options, messageId).replace(
      /\r\n\./g,
      "\r\n.."
    );
    await step(`${rawMessage}\r
.`, 250, "MESSAGE BODY");
    socket.write("QUIT\r\n");
    return { messageId };
  } catch (err) {
    console.error("Hostinger SMTP delivery failed:", err);
    throw err instanceof SmtpError ? err : new SmtpError(String(err), 0, false);
  } finally {
    socket.end();
  }
}

// src/lib/notifications.ts
function resolveAdminEmail() {
  if (typeof process !== "undefined" && process.env?.ADMIN_NOTIFICATION_EMAIL) {
    const configured = process.env.ADMIN_NOTIFICATION_EMAIL.trim();
    if (configured) return configured;
  }
  return ADMIN_NOTIFICATION_EMAIL;
}
function resolveDossierEmail() {
  if (typeof process !== "undefined" && process.env?.BROKER_DOSSIER_RECIPIENT) {
    const configured = process.env.BROKER_DOSSIER_RECIPIENT.trim();
    if (configured) return configured;
  }
  return BROKER_DOSSIER_RECIPIENT;
}
function buildCustomerReceiptText(record) {
  const isRealtime = record.turnaroundSla === "REAL_TIME";
  const rateDollars = record.selectedRateCents ? (record.selectedRateCents / 100).toFixed(4) : "\u2014";
  const sitesText = record.siteAddresses && record.siteAddresses.length > 0 ? [
    ``,
    `SERVICE LOCATIONS (${record.siteAddresses.length} Location${record.siteAddresses.length > 1 ? "s" : ""}):`,
    ...record.siteAddresses.map(
      (s, i) => `  [${i + 1}] ${s.label || `Location ${i + 1}`}: ${s.street}${s.suiteOrUnit ? ` Ste/Unit ${s.suiteOrUnit}` : ""}, ${s.city}, ${s.state} ${s.zip}${s.meterOrEsiId ? ` (ESI/Meter: ${s.meterOrEsiId})` : ""}${s.monthlyKwh ? ` \u2022 ${s.monthlyKwh.toLocaleString()} kWh/mo` : ""}`
    )
  ] : [];
  const billsSummary = record.billFiles && record.billFiles.length > 1 ? `${record.billFiles.length} Utility Bills Attached (${record.billFiles.map((b) => b.name).join(", ")})` : record.billFileName;
  return [
    `ENERGY CHOICE US \u2014 OFFICIAL CONFIRMATION RECEIPT`,
    `Confirmation ID: ${record.confirmationId}`,
    `------------------------------------------------------------`,
    `Business Name:         ${record.businessName}`,
    `Authorized Signer:     ${record.authorizedSignerName} (${record.signerTitle})`,
    `Primary Service Area:  ${record.territory} (ZIP ${record.zipCode})`,
    `Annual Usage Tier:     ${record.tierRangeLabel}`,
    `Selected Provider:     ${record.selectedProvider || "Custom 24-Hr Bidding Desk"}`,
    `Contract Term:         ${record.selectedTermMonths ? `${record.selectedTermMonths} Months` : "Multi-Term Bidding"}`,
    `Fixed Energy Rate:     $${rateDollars}/kWh (${record.selectedRateCents ? `${record.selectedRateCents.toFixed(2)}\xA2` : "Pending"})`,
    `Attached Bills:        ${billsSummary}`,
    ...sitesText,
    `Status:                ${isRealtime ? "Rate Lock & LOE Executed" : "Rate Quote Reserved \u2022 24-Hr Validation Active"}`,
    ``,
    `NEXT STEPS:`,
    isRealtime ? `Your rate lock has been paired with your utility statement and submitted for final supplier registration. Enrollment copies will be finalized and sent to ${record.contactEmail}.` : `Your selected rate is held for 24-hour pricing & usage validation against your uploaded electric utility bill. Within 24 hours, our desk will verify meter compatibility and email your final contract documents directly to ${record.contactEmail}.`,
    ``,
    `------------------------------------------------------------`,
    `Energy Choice US Desk: ${DEFAULT_FROM_ADDRESS}`,
    `Website: https://energychoice.us`,
    `Speed to need is the motto.`
  ].join("\n");
}
function buildCustomerReceiptHtml(record) {
  const isRealtime = record.turnaroundSla === "REAL_TIME";
  const rateDollars = record.selectedRateCents ? (record.selectedRateCents / 100).toFixed(4) : "\u2014";
  const billsHtml = record.billFiles && record.billFiles.length > 1 ? `<div style="font-size: 12px; color: #00e5ff; font-family: monospace;">${record.billFiles.length} Bills Attached: ${record.billFiles.map((b) => b.name).join(", ")}</div>` : `<div style="font-size: 12px; color: #00e5ff; font-family: monospace;">${record.billFileName}</div>`;
  const sitesSectionHtml = record.siteAddresses && record.siteAddresses.length > 0 ? `
        <div style="margin-top: 20px; border-top: 1px solid #0e2d5c; padding-top: 14px;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #00e5ff; font-weight: bold; margin-bottom: 8px;">
            Service Locations (${record.siteAddresses.length} Location${record.siteAddresses.length > 1 ? "s" : ""})
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            ${record.siteAddresses.map(
    (s, i) => `
                <tr style="border-bottom: 1px solid #071938;">
                  <td style="padding: 6px 0; color: #94a3b8; width: 25%;">[${i + 1}] ${s.label || `Location ${i + 1}`}</td>
                  <td style="padding: 6px 0; color: #ffffff; font-weight: 500;">
                    ${s.street}${s.suiteOrUnit ? ` Ste/Unit ${s.suiteOrUnit}` : ""}, ${s.city}, ${s.state} ${s.zip}
                    ${s.meterOrEsiId ? `<span style="color: #38bdf8; font-family: monospace; margin-left: 8px;">(ESI/Meter: ${s.meterOrEsiId})</span>` : ""}
                  </td>
                  <td style="padding: 6px 0; color: #00e5ff; text-align: right; font-family: monospace;">
                    ${s.monthlyKwh ? `${s.monthlyKwh.toLocaleString()} kWh/mo` : ""}
                  </td>
                </tr>
              `
  ).join("")}
          </table>
        </div>
      ` : "";
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
    <span class="badge">Energy Choice US \u2022 Official Receipt</span>
    <h1>${isRealtime ? "Rate Lock & LOE Executed" : "Rate Quote Reserved \u2022 24-Hr Validation Active"}</h1>
    <div class="confirmation">Confirmation ID: ${record.confirmationId}</div>

    <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
      Dear ${record.authorizedSignerName},<br><br>
      Thank you for submitting your commercial energy procurement application for <strong>${record.businessName}</strong>. 
      Your electric utility bill package and signed Letter of Exclusivity (LOE) have been securely logged.
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
        <div class="cell-val" style="color: #00e5ff;">$${rateDollars}/kWh (${record.selectedRateCents ? `${record.selectedRateCents.toFixed(2)}\xA2` : "Pending"})</div>
      </div>
      <div class="row">
        <div class="cell-label">Annual Usage Tier</div>
        <div class="cell-val">${record.tierRangeLabel}</div>
      </div>
      <div class="row">
        <div class="cell-label">Primary Territory</div>
        <div class="cell-val">${record.territory}</div>
      </div>
      <div class="row">
        <div class="cell-label">Authorized Signer</div>
        <div class="cell-val">${record.authorizedSignerName} (${record.signerTitle})</div>
      </div>
      <div class="row">
        <div class="cell-label">Attached Utility Bill(s)</div>
        <div class="cell-val">${billsHtml}</div>
      </div>
    </div>

    ${sitesSectionHtml}

    <div class="highlight-box">
      <strong>Next Steps:</strong><br>
      ${isRealtime ? `Your rate lock has been paired with your utility statement and submitted for final supplier registration. Enrollment copies will be finalized and sent to ${record.contactEmail}.` : `Your selected rate is held for <strong>24-hour pricing & usage validation</strong> against your uploaded electric utility bill. Within 24 hours, our desk will verify meter compatibility and email your final contract documents directly to ${record.contactEmail}.`}
    </div>

    <div class="footer">
      Desk: ${DEFAULT_FROM_ADDRESS} \u2022 Energy Choice US<br>
      \xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} energychoice.us \u2014 Speed to need is the motto.
    </div>
  </div>
</body>
</html>
  `;
}
function buildBrokerDossierText(record, mils, adderDollarsPerKwh, adderCentsPerKwh, monthlyMarginDollars, totalTermMarginDollars, benchmarkTerm, rawCommercialCents) {
  const offeredDollars = record.selectedRateCents ? (record.selectedRateCents / 100).toFixed(4) : "Custom Bid";
  const rawDollars = rawCommercialCents ? (rawCommercialCents / 100).toFixed(4) : "\u2014";
  const sitesText = record.siteAddresses && record.siteAddresses.length > 0 ? [
    ``,
    `SERVICE LOCATIONS & METERS (${record.siteAddresses.length} Location${record.siteAddresses.length > 1 ? "s" : ""}):`,
    ...record.siteAddresses.map(
      (s, i) => `  [Location ${i + 1}: ${s.label || `Site ${i + 1}`}]
   Address:     ${s.street}${s.suiteOrUnit ? ` Ste/Unit ${s.suiteOrUnit}` : ""}, ${s.city}, ${s.state} ${s.zip}
   Meter / ESI: ${s.meterOrEsiId || "Refer to Attached Bill"}
   Est. Volume: ${s.monthlyKwh ? `${s.monthlyKwh.toLocaleString()} kWh/mo` : "Pro-rated"}`
    )
  ] : [];
  const billsSummary = record.billFiles && record.billFiles.length > 0 ? record.billFiles.map(
    (b, i) => `  [${i + 1}] ${b.name} (${Math.round(b.sizeBytes / 1024)} KB)${b.siteLabel ? ` \u2022 ${b.siteLabel}` : ""}`
  ).join("\n") : `  [1] ${record.billFileName} (${Math.round(record.billFileSizeBytes / 1024)} KB)`;
  return [
    `BROKER INTAKE DOSSIER \u2014 CONFIDENTIAL CORPORATE AUDIT`,
    `Confirmation ID: ${record.confirmationId}`,
    `Timestamp:       ${record.timestamp}`,
    `------------------------------------------------------------`,
    `1. CUSTOMER & ACCOUNT DETAILS`,
    `Business Name:       ${record.businessName}`,
    `Authorized Signer:   ${record.authorizedSignerName} (${record.signerTitle})`,
    `Contact Email:       ${record.contactEmail}`,
    `Contact Phone:       ${record.contactPhone}`,
    `Primary Location:    ZIP ${record.zipCode} \u2022 ${record.territory}`,
    `Current Provider:    ${record.currentProvider || "Not Specified"}`,
    `Monthly Volume:      ${record.monthlyKwh.toLocaleString()} kWh/mo (${record.annualizedKwh.toLocaleString()} kWh/yr)`,
    `Usage Tier:          ${record.commercialTierLabel}`,
    `SLA / Flow:          ${record.turnaroundSla === "REAL_TIME" ? "Real-Time Automatic Lock" : "24-Hour Pricing & Usage Validation"}`,
    ...sitesText,
    ``,
    `2. RATE QUOTE & SELECTED TERMS`,
    `Selected Supplier:   ${record.selectedProvider || "Custom 24-Hr Desk"}`,
    `Plan Name:           ${record.selectedPlanName || "Custom Bidding Strip"}`,
    `Contract Term:       ${record.selectedTermMonths ? `${record.selectedTermMonths} Months` : (record.requestedTerms || []).join(", ") + " Months"}`,
    `Customer Rate:       $${offeredDollars}/kWh (${record.selectedRateCents ? `${record.selectedRateCents.toFixed(2)}\xA2` : "Pending"})`,
    `Est. Monthly Bill:   $${record.estMonthlyBill ? record.estMonthlyBill.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "\u2014"}/mo`,
    ``,
    `3. CONFIDENTIAL CORPORATE BROKER MARGIN BREAKDOWN`,
    `Assigned Tier Mils:  +${mils} mils (+$${adderDollarsPerKwh.toFixed(3)}/kWh | +${adderCentsPerKwh.toFixed(2)}\xA2/kWh)`,
    `Customer Offered:    $${offeredDollars}/kWh`,
    `Raw Supplier Basis:  $${rawDollars}/kWh`,
    `Est. Monthly Margin: $${monthlyMarginDollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mo`,
    `Est. Full-Term (${benchmarkTerm}m): $${totalTermMarginDollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    ``,
    `4. LOE LEGAL AUTHORIZATION & VERIFICATION`,
    `E-Signature:         ${record.loeSignature}`,
    `Signer Initials:     ${record.loeSignerInitials}`,
    `LOE Checkbox:        VERIFIED & EXECUTED \u2713`,
    `Attached Utility Bills:`,
    billsSummary,
    `------------------------------------------------------------`
  ].join("\n");
}
function buildBrokerDossierHtml(record, mils, adderDollarsPerKwh, adderCentsPerKwh, monthlyMarginDollars, totalTermMarginDollars, benchmarkTerm, rawCommercialCents) {
  const offeredDollars = record.selectedRateCents ? (record.selectedRateCents / 100).toFixed(4) : "\u2014";
  const rawDollars = rawCommercialCents ? (rawCommercialCents / 100).toFixed(4) : "\u2014";
  const sitesSectionHtml = record.siteAddresses && record.siteAddresses.length > 0 ? `
        <div class="section-title">1.1 Service Locations & Meters (${record.siteAddresses.length})</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px;">
          <tr style="border-bottom: 1px solid #0e2d5c; color: #94a3b8; text-align: left;">
            <th style="padding: 6px 0;">Site</th>
            <th style="padding: 6px 0;">Service Address</th>
            <th style="padding: 6px 0;">ESI ID / Meter</th>
            <th style="padding: 6px 0; text-align: right;">Est. Monthly</th>
          </tr>
          ${record.siteAddresses.map(
    (s, i) => `
              <tr style="border-bottom: 1px solid #071938;">
                <td style="padding: 8px 0; color: #38bdf8; font-weight: bold;">[${i + 1}] ${s.label || `Site ${i + 1}`}</td>
                <td style="padding: 8px 0; color: #ffffff;">${s.street}${s.suiteOrUnit ? ` Ste/Unit ${s.suiteOrUnit}` : ""}, ${s.city}, ${s.state} ${s.zip}</td>
                <td style="padding: 8px 0; color: #cbd5e1; font-family: monospace;">${s.meterOrEsiId || "Refer to Bill"}</td>
                <td style="padding: 8px 0; color: #00e5ff; text-align: right; font-family: monospace;">${s.monthlyKwh ? `${s.monthlyKwh.toLocaleString()} kWh` : "\u2014"}</td>
              </tr>
            `
  ).join("")}
        </table>
      ` : "";
  const billsListHtml = record.billFiles && record.billFiles.length > 0 ? record.billFiles.map(
    (b, i) => `
            <div style="padding: 4px 0; font-family: monospace;">
              \u{1F4C4} [${i + 1}] <strong>${b.name}</strong> (${Math.round(b.sizeBytes / 1024)} KB)
              ${b.siteLabel ? `<span style="color: #38bdf8; margin-left: 6px;">[${b.siteLabel}]</span>` : ""}
            </div>
          `
  ).join("") : `\u{1F4C4} <strong>${record.billFileName}</strong> (${Math.round(record.billFileSizeBytes / 1024)} KB)`;
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
    <span class="badge">Broker Intake Dossier \u2022 Confidential</span>
    <h1>New Commercial Intake: ${record.businessName}</h1>
    <div class="sub">Confirmation ID: ${record.confirmationId} \u2022 Timestamp: ${record.timestamp}</div>

    <div class="section-title">1. Customer & Account Details</div>
    <div class="grid">
      <div class="row"><div class="cell-label">Business Name</div><div class="cell-val">${record.businessName}</div></div>
      <div class="row"><div class="cell-label">Authorized Signer</div><div class="cell-val">${record.authorizedSignerName} (${record.signerTitle})</div></div>
      <div class="row"><div class="cell-label">Contact Email</div><div class="cell-val">${record.contactEmail}</div></div>
      <div class="row"><div class="cell-label">Contact Phone</div><div class="cell-val">${record.contactPhone}</div></div>
      <div class="row"><div class="cell-label">Primary Territory</div><div class="cell-val">ZIP ${record.zipCode} \u2022 ${record.territory}</div></div>
      <div class="row"><div class="cell-label">Current Provider</div><div class="cell-val">${record.currentProvider || "Not Specified"}</div></div>
      <div class="row"><div class="cell-label">Monthly / Annual Volume</div><div class="cell-val">${record.monthlyKwh.toLocaleString()} kWh/mo (${record.annualizedKwh.toLocaleString()} kWh/yr)</div></div>
      <div class="row"><div class="cell-label">Annual Usage Tier</div><div class="cell-val">${record.commercialTierLabel}</div></div>
      <div class="row"><div class="cell-label">SLA / Flow</div><div class="cell-val">${record.turnaroundSla === "REAL_TIME" ? "Real-Time Automatic Lock" : "24-Hour Pricing & Usage Validation"}</div></div>
    </div>

    ${sitesSectionHtml}

    <div class="section-title">2. Rate Quote & Selected Terms</div>
    <div class="grid">
      <div class="row"><div class="cell-label">Selected Supplier</div><div class="cell-val">${record.selectedProvider || "Custom 24-Hr Desk"}</div></div>
      <div class="row"><div class="cell-label">Plan Name</div><div class="cell-val">${record.selectedPlanName || "Custom Bidding Strip"}</div></div>
      <div class="row"><div class="cell-label">Contract Term</div><div class="cell-val">${record.selectedTermMonths ? `${record.selectedTermMonths} Months` : (record.requestedTerms || []).join(", ") + " Months"}</div></div>
      <div class="row"><div class="cell-label">Customer Quoted Rate</div><div class="cell-val" style="color: #00e5ff;">$${offeredDollars}/kWh (${record.selectedRateCents ? `${record.selectedRateCents.toFixed(2)}\xA2` : "Pending"})</div></div>
      <div class="row"><div class="cell-label">Est. Monthly Bill</div><div class="cell-val">$${record.estMonthlyBill ? record.estMonthlyBill.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "\u2014"}/mo</div></div>
    </div>

    <div class="private-margin-box">
      <div class="margin-title">3. Confidential Corporate Broker Margin Breakdown</div>
      <div class="grid">
        <div class="row"><div class="cell-label">Assigned Tier Mils</div><div class="cell-val" style="color: #f59e0b;">+${mils} mils (+$${adderDollarsPerKwh.toFixed(3)}/kWh | +${adderCentsPerKwh.toFixed(2)}\xA2/kWh)</div></div>
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
      <div class="row"><div class="cell-label">LOE Consent Checkbox</div><div class="cell-val" style="color: #10b981;">VERIFIED & EXECUTED \u2713</div></div>
    </div>

    <div class="att-note">
      \u{1F4CE} <strong>Attached Electric Utility Bill Documents:</strong><br>
      ${billsListHtml}
      <div style="margin-top: 6px; font-size: 11px; color: #94a3b8;">
        <em>All uploaded utility bills are attached to this email transmission.</em>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
async function notifyAdminCommercialLoe(record) {
  const dossierEmail = resolveDossierEmail();
  const customerEmail = record.contactEmail.trim();
  const { mils, adderCentsPerKwh, adderDollarsPerKwh } = getMilsForMonthlyKwh(
    record.monthlyKwh
  );
  const benchmarkTerm = record.selectedTermMonths || 36;
  const { monthlyMarginDollars, totalTermMarginDollars } = computeBrokerMarginRevenue(record.monthlyKwh, mils, benchmarkTerm);
  const rawCommercialCents = record.selectedRateCents !== void 0 ? Number((record.selectedRateCents - adderCentsPerKwh).toFixed(2)) : void 0;
  const offeredDollars = record.selectedRateCents ? `$${(record.selectedRateCents / 100).toFixed(4)}/kWh` : "Custom Bid";
  const isRealtime = record.turnaroundSla === "REAL_TIME";
  const subjectDossier = `[Broker Dossier] ${record.businessName} \u2014 ${record.monthlyKwh.toLocaleString()} kWh/mo (${record.tierRangeLabel}) \u2014 ${offeredDollars} (+${mils} Mils)`;
  const subjectCustomer = `Your Energy Choice US Confirmation Receipt (${record.confirmationId}) \u2014 ${record.businessName}`;
  const billAttachments = [];
  if (record.billFiles && record.billFiles.length > 0) {
    for (let i = 0; i < record.billFiles.length; i++) {
      const b = record.billFiles[i];
      if (b.base64) {
        const clean = b.base64.replace(/^data:[^;]+;base64,/, "");
        const safeName = b.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        billAttachments.push({
          filename: `${record.confirmationId}_${i + 1}_${safeName}`,
          contentType: b.type || "application/pdf",
          base64Content: clean
        });
      }
    }
  } else if (record.billBase64) {
    const cleanBase64 = record.billBase64.replace(/^data:[^;]+;base64,/, "");
    const safeName = record.billFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    billAttachments.push({
      filename: `${record.confirmationId}_${safeName}`,
      contentType: record.billMimeType || "application/pdf",
      base64Content: cleanBase64
    });
  }
  let emailDispatched = false;
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
      attachments: billAttachments.length > 0 ? billAttachments : void 0
    });
    emailDispatched = true;
  } catch (err) {
    console.error("Failed to deliver broker intake dossier to", dossierEmail, err);
  }
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
        html: customerHtml
      });
    } catch (err) {
      console.error("Failed to deliver customer receipt to", customerEmail, err);
    }
  }
  return { adminEmail: dossierEmail, emailDispatched };
}

// src/api/submit-loe.ts
var ALLOWED_BILL_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
];
async function archiveCommercialLoeLocally(record) {
  if (typeof process === "undefined" || !process.versions?.node) return {};
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const dataDir = path.resolve(process.cwd(), "data");
    const billsDir = path.join(dataDir, "uploaded-bills");
    await fs.mkdir(billsDir, { recursive: true });
    const savedBillPaths = [];
    if (record.billFiles && record.billFiles.length > 0) {
      for (let i = 0; i < record.billFiles.length; i++) {
        const item = record.billFiles[i];
        if (item.base64) {
          const clean = item.base64.replace(/^data:[^;]+;base64,/, "");
          const safeName = item.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const targetPath = path.join(
            billsDir,
            `${record.confirmationId}_${i + 1}_${safeName}`
          );
          await fs.writeFile(targetPath, Buffer.from(clean, "base64"));
          savedBillPaths.push(targetPath);
        }
      }
    } else if (record.billBase64) {
      const cleanBase64 = record.billBase64.replace(
        /^data:[^;]+;base64,/,
        ""
      );
      const safeName = record.billFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fullBillPath = path.join(
        billsDir,
        `${record.confirmationId}_${safeName}`
      );
      await fs.writeFile(fullBillPath, Buffer.from(cleanBase64, "base64"));
      savedBillPaths.push(fullBillPath);
    }
    const savedBillPath = savedBillPaths[0];
    const ledgerPath = path.join(dataDir, "commercial-loe-leads.json");
    let existing = [];
    try {
      const raw = await fs.readFile(ledgerPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) existing = parsed;
    } catch {
      existing = [];
    }
    const { billBase64: _omitted, billFiles: rawBillFiles, ...metadataRecord } = record;
    void _omitted;
    const strippedBillFiles = rawBillFiles?.map(({ base64: _b64, ...rest }) => rest);
    existing.unshift({
      ...metadataRecord,
      billFiles: strippedBillFiles,
      savedBillPath,
      savedBillPaths
    });
    await fs.writeFile(ledgerPath, JSON.stringify(existing, null, 2), "utf-8");
    return { savedBillPath, savedBillPaths };
  } catch {
    return {};
  }
}
async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const body = await req.json();
    const zipCode = String(body.zipCode ?? "").trim();
    const territory = String(body.territory ?? "").trim();
    const monthlyKwh = Number(body.monthlyKwh ?? 0);
    const businessName = String(body.businessName ?? "").trim();
    const authorizedSignerName = String(body.authorizedSignerName ?? "").trim();
    const signerTitle = String(body.signerTitle ?? "").trim();
    const contactEmail = String(body.contactEmail ?? "").trim();
    const contactPhone = String(body.contactPhone ?? "").trim();
    const currentProvider = String(body.currentProvider ?? "").trim();
    const rawSites = Array.isArray(body.siteAddresses) ? body.siteAddresses : [];
    const siteAddresses = rawSites.map((s, idx) => ({
      id: String(s.id || `site-${idx + 1}`),
      street: String(s.street ?? "").trim(),
      suiteOrUnit: s.suiteOrUnit ? String(s.suiteOrUnit).trim() : void 0,
      city: String(s.city ?? "").trim(),
      state: String(s.state ?? "TX").trim().toUpperCase() || "TX",
      zip: String(s.zip ?? "").trim(),
      meterOrEsiId: s.meterOrEsiId ? String(s.meterOrEsiId).trim() : void 0,
      monthlyKwh: s.monthlyKwh ? Number(s.monthlyKwh) : void 0,
      label: s.label ? String(s.label).trim() : `Location ${idx + 1}`
    })).filter((s) => s.street.length > 0 || s.zip.length > 0);
    for (const site of siteAddresses) {
      if (site.zip && !/^\d{5}$/.test(site.zip)) {
        return new Response(
          JSON.stringify({
            error: `Invalid 5-digit ZIP code for site location: ${site.label || site.street || site.zip}`
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }
    const rawBillFiles = Array.isArray(body.billFiles) ? body.billFiles : [];
    let billFiles = rawBillFiles.map((b, idx) => ({
      id: String(b.id || `bill-${idx + 1}`),
      name: String(b.name ?? `bill_${idx + 1}.pdf`).trim(),
      type: String(b.type ?? "application/pdf").trim().toLowerCase(),
      sizeBytes: Number(b.sizeBytes ?? b.size ?? 0),
      base64: b.base64 ? String(b.base64) : void 0,
      siteLabel: b.siteLabel ? String(b.siteLabel).trim() : void 0
    })).filter((b) => Boolean(b.base64));
    const singleBillName = String(body.billFileName ?? "").trim();
    const singleBillMime = String(body.billMimeType ?? "").trim().toLowerCase();
    const singleBillSize = Number(body.billFileSizeBytes ?? 0);
    const singleBillBase64 = body.billBase64 ? String(body.billBase64) : void 0;
    if (billFiles.length === 0 && singleBillName && singleBillBase64) {
      billFiles = [
        {
          id: "bill-1",
          name: singleBillName,
          type: singleBillMime || "application/pdf",
          sizeBytes: singleBillSize,
          base64: singleBillBase64
        }
      ];
    }
    const primaryBill = billFiles[0];
    const totalBillSizeBytes = billFiles.reduce((acc, b) => acc + (b.sizeBytes || 0), 0) || singleBillSize;
    const billFileName = billFiles.length > 1 ? `${primaryBill?.name || "Utility_Bill.pdf"} (+${billFiles.length - 1} more)` : primaryBill?.name || singleBillName;
    const billMimeType = primaryBill?.type || singleBillMime || "application/pdf";
    const billBase64 = primaryBill?.base64 || singleBillBase64;
    const selectedProvider = body.selectedProvider ? String(body.selectedProvider).trim() : void 0;
    const selectedPlanName = body.selectedPlanName ? String(body.selectedPlanName).trim() : void 0;
    const selectedRateCents = body.selectedRateCents !== void 0 && body.selectedRateCents !== null ? Number(body.selectedRateCents) : void 0;
    const selectedTermMonths = body.selectedTermMonths !== void 0 && body.selectedTermMonths !== null ? Number(body.selectedTermMonths) : void 0;
    const requestedTerms = Array.isArray(body.requestedTerms) ? body.requestedTerms.map((t) => Number(t)).filter((t) => CONTRACT_TERMS.includes(t)) : [...CONTRACT_TERMS];
    const estMonthlyBill = body.estMonthlyBill !== void 0 && body.estMonthlyBill !== null ? Number(body.estMonthlyBill) : void 0;
    const loeSigned = Boolean(body.loeSigned);
    const loeSignature = String(body.loeSignature ?? "").trim();
    const loeSignerInitials = String(body.loeSignerInitials ?? "").trim().toUpperCase().slice(0, 6);
    if (!/^\d{5}$/.test(zipCode)) {
      return new Response(JSON.stringify({ error: "Invalid 5-digit ZIP code." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!(monthlyKwh >= 1)) {
      return new Response(
        JSON.stringify({
          error: "Monthly consumption must be 1 kWh/mo or higher."
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!businessName || !authorizedSignerName || !signerTitle) {
      return new Response(
        JSON.stringify({
          error: "Business Name, Authorized Signer Name, and Title are required for binding LOE authorization."
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return new Response(
        JSON.stringify({ error: "Valid business email address is required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (contactPhone.replace(/\D/g, "").length < 10) {
      return new Response(
        JSON.stringify({ error: "Valid 10-digit contact phone is required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (billFiles.length === 0 || !primaryBill?.base64) {
      return new Response(
        JSON.stringify({
          error: "Please attach at least one recent electric utility bill (PDF, PNG, JPG, or WebP)."
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    for (const b of billFiles) {
      if (b.type && !ALLOWED_BILL_TYPES.includes(b.type) && !/\.(pdf|png|jpe?g|webp)$/i.test(b.name)) {
        return new Response(
          JSON.stringify({
            error: `Utility bill "${b.name}" must be a PDF, JPG, PNG, or WebP file.`
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }
    if (totalBillSizeBytes > 15 * 1024 * 1024) {
      return new Response(
        JSON.stringify({
          error: "Total utility bill files size must be under 15 MB."
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!loeSigned || !loeSignature) {
      return new Response(
        JSON.stringify({
          error: "Electronic signature and Letter of Exclusivity (LOE) consent checkbox are required."
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const tierSpec = resolveUsageTier(monthlyKwh);
    const isRealtimeLock = tierSpec.isRealTime && Boolean(selectedProvider);
    const prefixTag = isRealtimeLock ? tierSpec.id === "TIER_1" ? "EC-T1LOCK" : "EC-T2LOCK" : "EC-24HR";
    const confirmationId = `${prefixTag}-${Date.now().toString(36).toUpperCase()}-${zipCode}`;
    const adminEmail = resolveAdminEmail();
    const fullRecord = {
      confirmationId,
      flow: isRealtimeLock ? "TIER2_REALTIME_LOE" : "CUSTOM_24HR_LOE",
      tierId: tierSpec.id,
      tierRangeLabel: tierSpec.rangeLabel,
      turnaroundSla: tierSpec.isRealTime ? "REAL_TIME" : "24_HOUR_TURNAROUND",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      zipCode,
      territory,
      monthlyKwh,
      annualizedKwh: monthlyKwh * 12,
      commercialTierLabel: `${tierSpec.shortName}: ${tierSpec.rangeLabel} (${tierSpec.subLabel})`,
      selectedProvider,
      selectedPlanName,
      selectedRateCents,
      selectedTermMonths,
      requestedTerms: requestedTerms.length > 0 ? requestedTerms : [...CONTRACT_TERMS],
      estMonthlyBill,
      businessName,
      authorizedSignerName,
      signerTitle,
      contactEmail,
      contactPhone,
      currentProvider: currentProvider || void 0,
      siteAddresses: siteAddresses.length > 0 ? siteAddresses : void 0,
      billFiles: billFiles.length > 0 ? billFiles : void 0,
      billFileName,
      billMimeType: billMimeType || "application/octet-stream",
      billFileSizeBytes: totalBillSizeBytes,
      billBase64,
      loeSigned: true,
      loeSignature,
      loeSignerInitials: loeSignerInitials || authorizedSignerName.split(/\s+/).map((w) => w[0] || "").join("").toUpperCase().slice(0, 4),
      adminNotificationEmail: adminEmail,
      status: isRealtimeLock ? "LOE_REALTIME_RATE_LOCK" : "LOE_24HR_CUSTOM_QUOTE"
    };
    const { savedBillPath, savedBillPaths } = await archiveCommercialLoeLocally(fullRecord);
    const { emailDispatched } = await notifyAdminCommercialLoe(fullRecord);
    const hooks = [
      process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim(),
      process.env.LOE_WEBHOOK_URL?.trim(),
      process.env.EXECUTION_WEBHOOK_URL?.trim()
    ].filter((u) => Boolean(u));
    let webhookDelivered = false;
    for (const url of hooks) {
      try {
        const hookRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fullRecord)
        });
        if (hookRes.ok) webhookDelivered = true;
      } catch {
      }
    }
    const { billBase64: _stripped, billFiles: _rawBf, ...clientSafeRecord } = fullRecord;
    void _stripped;
    void _rawBf;
    return new Response(
      JSON.stringify({
        ok: true,
        record: {
          ...clientSafeRecord,
          billFilesCount: billFiles.length,
          siteAddressesCount: siteAddresses.length,
          savedBillPath,
          savedBillPaths
        },
        notificationEmail: adminEmail,
        emailDispatched,
        webhookDelivered,
        disclosure: process.env.DEFAULT_DISCLOSURE || STANDARD_DISCLOSURE
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "LOE submission error";
    return new Response(
      JSON.stringify({ error: "LOE Submission Failure", details: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// src/api/entrypoints/submit-loe.ts
async function handler2(req, res) {
  if (res && typeof res.status === "function") {
    try {
      const url = `https://${req.headers?.host || "localhost"}${req.url || "/api/submit-loe"}`;
      const webReq = new Request(url, {
        method: req.method || "POST",
        headers: { "Content-Type": "application/json", ...req.headers || {} },
        body: req.method !== "GET" && req.method !== "HEAD" ? typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}) : void 0
      });
      const webRes = await handler(webReq);
      const data = await webRes.json();
      return res.status(webRes.status).json(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ error: "LOE Submission Error", details: msg });
    }
  }
  try {
    return await handler(req);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: "LOE Submission Error", details: msg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
async function POST(request) {
  return handler2(request);
}
async function GET(request) {
  return handler2(request);
}
export {
  GET,
  POST,
  handler2 as default
};
