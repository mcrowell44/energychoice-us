// src/lib/compliance.ts
var STANDARD_DISCLOSURE = "This is a 100% automated system connected with major suppliers nationwide to provide the optimum search and opportunities available for users to cut time and research with a wide variety of options. Speed to need is the motto.";
var ADMIN_NOTIFICATION_EMAIL = "energychoiceus@cdmweb.store";
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
async function notifyAdminTier1Prospect(record) {
  const dossierEmail = resolveDossierEmail();
  const { mils, adderCentsPerKwh, adderDollarsPerKwh } = getMilsForMonthlyKwh(
    record.allocatedKwh
  );
  const rawSupplierCents = Number(
    (record.rateCents - adderCentsPerKwh).toFixed(2)
  );
  const offeredDollars = (record.rateCents / 100).toFixed(4);
  const rawDollars = (rawSupplierCents / 100).toFixed(4);
  const { monthlyMarginDollars, totalTermMarginDollars } = computeBrokerMarginRevenue(record.allocatedKwh, mils, record.termMonths);
  const subject = `[Tier 1 Lock \u2022 +${mils} Mils] ${record.provider} @ $${offeredDollars}/kWh (${record.termMonths}m) \u2014 ${record.contactEmail}`;
  const textBody = [
    `New Tier 1 Real-Time Rate Lock (${record.confirmationId})`,
    `------------------------------------------------------------`,
    `Timestamp: ${record.timestamp}`,
    `Prospect Email: ${record.contactEmail}`,
    `Prospect Phone: ${record.contactPhone}`,
    `ZIP / Territory: ${record.zipCode} (${record.territory})`,
    `Monthly Usage: ${record.allocatedKwh.toLocaleString()} kWh/mo (${record.appliedTierLabel})`,
    `Selected Plan: ${record.provider} \u2014 ${record.planName} (${record.termMonths} mos)`,
    ``,
    `--- INTERNAL BROKER MARGIN BREAKDOWN (PRIVATE) ---`,
    `Customer Offered Rate: $${offeredDollars}/kWh (${record.rateCents.toFixed(2)}\xA2/kWh)`,
    `Raw Supplier Basis:    $${rawDollars}/kWh (${rawSupplierCents.toFixed(2)}\xA2/kWh)`,
    `Embedded Tier 1 Mils:  +${mils} mils (+$${adderDollarsPerKwh.toFixed(3)}/kWh | +${adderCentsPerKwh.toFixed(2)}\xA2/kWh)`,
    `Est. Monthly Margin:   $${monthlyMarginDollars.toFixed(2)}/mo`,
    `Full ${record.termMonths}-Mo Margin:   $${totalTermMarginDollars.toFixed(2)}`,
    `--------------------------------------------------`
  ].join("\n");
  let emailDispatched = false;
  try {
    await sendHostingerSmtp({
      to: dossierEmail,
      replyTo: record.contactEmail,
      subject,
      text: textBody
    });
    emailDispatched = true;
  } catch (err) {
    console.error("Hostinger SMTP Tier 1 notification failed:", err);
  }
  return { adminEmail: dossierEmail, emailDispatched };
}

// src/api/execute-agreement.ts
async function archiveTier1Locally(record) {
  if (typeof process === "undefined" || !process.versions?.node) return;
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const dataDir = path.resolve(process.cwd(), "data");
    await fs.mkdir(dataDir, { recursive: true });
    const ledgerPath = path.join(dataDir, "tier1-prospects.json");
    let existing = [];
    try {
      const raw = await fs.readFile(ledgerPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) existing = parsed;
    } catch {
      existing = [];
    }
    existing.unshift(record);
    await fs.writeFile(ledgerPath, JSON.stringify(existing, null, 2), "utf-8");
  } catch {
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
    const allocatedKwh = Number(body.allocatedKwh ?? 0);
    const appliedTierLabel = String(body.appliedTierLabel ?? "1\u20131,999 kWh Tier");
    const provider = String(body.provider ?? "").trim();
    const planName = String(body.planName ?? "Fixed Rate Plan").trim();
    const termMonths = Math.max(18, Number(body.termMonths ?? 18));
    const rateCents = Number(body.rateCents ?? 0);
    const rate500Cents = Number(body.rate500Cents ?? rateCents);
    const rate1000Cents = Number(body.rate1000Cents ?? rateCents);
    const rate2000Cents = Number(body.rate2000Cents ?? rateCents);
    const estMonthlyBill = Number(
      body.estMonthlyBill ?? (rateCents * allocatedKwh / 100).toFixed(2)
    );
    const contactEmail = String(body.contactEmail ?? "").trim();
    const contactPhone = String(body.contactPhone ?? "").trim();
    const signerInitials = String(body.signerInitials ?? "").trim().toUpperCase().slice(0, 6);
    const factSheetUrl = body.factSheetUrl ? String(body.factSheetUrl) : void 0;
    const enrollUrl = body.enrollUrl ? String(body.enrollUrl) : void 0;
    const enrollPhone = body.enrollPhone ? String(body.enrollPhone) : void 0;
    if (!/^\d{5}$/.test(zipCode)) {
      return new Response(JSON.stringify({ error: "Invalid 5-digit ZIP code." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!(allocatedKwh >= 1 && allocatedKwh < 2e3)) {
      return new Response(
        JSON.stringify({
          error: "Tier 1 prospect capture applies to 1\u20131,999 kWh/month. Accounts at 2,000+ kWh/month require Commercial LOE submission."
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return new Response(
        JSON.stringify({ error: "Please enter a valid email address." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (contactPhone.replace(/\D/g, "").length < 10) {
      return new Response(
        JSON.stringify({ error: "Please enter a valid 10-digit phone number." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const confirmationId = `EC-T1-${Date.now().toString(36).toUpperCase()}-${zipCode}`;
    const adminEmail = resolveAdminEmail();
    const cleanRecord = {
      confirmationId,
      flow: "TIER1_1_1999_KWH",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      zipCode,
      territory,
      allocatedKwh,
      appliedTierLabel,
      provider,
      planName,
      termMonths,
      rateCents,
      rate500Cents,
      rate1000Cents,
      rate2000Cents,
      estMonthlyBill,
      contactEmail,
      contactPhone,
      signerInitials: signerInitials || "VERIFIED",
      factSheetUrl,
      enrollUrl,
      enrollPhone,
      adminNotificationEmail: adminEmail,
      status: "PROSPECT_CAPTURED_TIER1"
    };
    await archiveTier1Locally(cleanRecord);
    const { emailDispatched } = await notifyAdminTier1Prospect(cleanRecord);
    const hooks = [
      process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim(),
      process.env.EXECUTION_WEBHOOK_URL?.trim()
    ].filter((u) => Boolean(u));
    let webhookDelivered = false;
    for (const url of hooks) {
      try {
        const hookRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanRecord)
        });
        if (hookRes.ok) webhookDelivered = true;
      } catch {
      }
    }
    return new Response(
      JSON.stringify({
        ok: true,
        record: cleanRecord,
        notificationEmail: adminEmail,
        emailDispatched,
        webhookDelivered,
        disclosure: process.env.DEFAULT_DISCLOSURE || STANDARD_DISCLOSURE
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Execution error";
    return new Response(
      JSON.stringify({ error: "Prospect Capture Failure", details: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// src/api/entrypoints/execute-agreement.ts
async function handler2(req, res) {
  if (res && typeof res.status === "function") {
    try {
      const url = `https://${req.headers?.host || "localhost"}${req.url || "/api/execute-agreement"}`;
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
      return res.status(500).json({ error: "Execution Error", details: msg });
    }
  }
  try {
    return await handler(req);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: "Execution Error", details: msg }),
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
