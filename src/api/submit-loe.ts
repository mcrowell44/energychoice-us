import {
  CONTRACT_TERMS,
  resolveUsageTier,
  STANDARD_DISCLOSURE,
  type CommercialLoePayload,
  type SiteAddressItem,
  type UploadedBillItem,
} from "../lib/compliance";
import {
  notifyAdminCommercialLoe,
  resolveAdminEmail,
} from "../lib/notifications";

const ALLOWED_BILL_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

async function archiveCommercialLoeLocally(
  record: CommercialLoePayload & { confirmationId: string }
): Promise<{ savedBillPath?: string; savedBillPaths?: string[] }> {
  if (typeof process === "undefined" || !process.versions?.node) return {};
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const dataDir = path.resolve(process.cwd(), "data");
    const billsDir = path.join(dataDir, "uploaded-bills");
    await fs.mkdir(billsDir, { recursive: true });

    const savedBillPaths: string[] = [];

    // Save all multiple uploaded bill files
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
    let existing: unknown[] = [];
    try {
      const raw = await fs.readFile(ledgerPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) existing = parsed;
    } catch {
      existing = [];
    }

    const { billBase64: _omitted, billFiles: rawBillFiles, ...metadataRecord } = record;
    void _omitted;
    // Strip heavy base64 strings before writing JSON ledger
    const strippedBillFiles = rawBillFiles?.map(({ base64: _b64, ...rest }) => rest);
    existing.unshift({
      ...metadataRecord,
      billFiles: strippedBillFiles,
      savedBillPath,
      savedBillPaths,
    });
    await fs.writeFile(ledgerPath, JSON.stringify(existing, null, 2), "utf-8");
    return { savedBillPath, savedBillPaths };
  } catch {
    return {};
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;

    const zipCode = String(body.zipCode ?? "").trim();
    const territory = String(body.territory ?? "").trim();
    const monthlyKwh = Number(body.monthlyKwh ?? 0);
    const businessName = String(body.businessName ?? "").trim();
    const authorizedSignerName = String(body.authorizedSignerName ?? "").trim();
    const signerTitle = String(body.signerTitle ?? "").trim();
    const contactEmail = String(body.contactEmail ?? "").trim();
    const contactPhone = String(body.contactPhone ?? "").trim();
    const currentProvider = String(body.currentProvider ?? "").trim();

    // Parse Multiple Site Addresses (if provided)
    const rawSites = Array.isArray(body.siteAddresses) ? body.siteAddresses : [];
    const siteAddresses: SiteAddressItem[] = rawSites
      .map((s: any, idx: number) => ({
        id: String(s.id || `site-${idx + 1}`),
        street: String(s.street ?? "").trim(),
        suiteOrUnit: s.suiteOrUnit ? String(s.suiteOrUnit).trim() : undefined,
        city: String(s.city ?? "").trim(),
        state: String(s.state ?? "TX").trim().toUpperCase() || "TX",
        zip: String(s.zip ?? "").trim(),
        meterOrEsiId: s.meterOrEsiId ? String(s.meterOrEsiId).trim() : undefined,
        monthlyKwh: s.monthlyKwh ? Number(s.monthlyKwh) : undefined,
        label: s.label ? String(s.label).trim() : `Location ${idx + 1}`,
      }))
      .filter((s: SiteAddressItem) => s.street.length > 0 || s.zip.length > 0);

    // Validate additional site address fields if any are present
    for (const site of siteAddresses) {
      if (site.zip && !/^\d{5}$/.test(site.zip)) {
        return new Response(
          JSON.stringify({
            error: `Invalid 5-digit ZIP code for site location: ${site.label || site.street || site.zip}`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Parse Multiple Bill Uploads (if provided)
    const rawBillFiles = Array.isArray(body.billFiles) ? body.billFiles : [];
    let billFiles: UploadedBillItem[] = rawBillFiles
      .map((b: any, idx: number) => ({
        id: String(b.id || `bill-${idx + 1}`),
        name: String(b.name ?? `bill_${idx + 1}.pdf`).trim(),
        type: String(b.type ?? "application/pdf").trim().toLowerCase(),
        sizeBytes: Number(b.sizeBytes ?? b.size ?? 0),
        base64: b.base64 ? String(b.base64) : undefined,
        siteLabel: b.siteLabel ? String(b.siteLabel).trim() : undefined,
      }))
      .filter((b: UploadedBillItem) => Boolean(b.base64));

    // Fallback: If billFiles array not sent or empty, adopt single bill fields
    const singleBillName = String(body.billFileName ?? "").trim();
    const singleBillMime = String(body.billMimeType ?? "").trim().toLowerCase();
    const singleBillSize = Number(body.billFileSizeBytes ?? 0);
    const singleBillBase64 = body.billBase64 ? String(body.billBase64) : undefined;

    if (billFiles.length === 0 && singleBillName && singleBillBase64) {
      billFiles = [
        {
          id: "bill-1",
          name: singleBillName,
          type: singleBillMime || "application/pdf",
          sizeBytes: singleBillSize,
          base64: singleBillBase64,
        },
      ];
    }

    // Consolidated bill attributes for backward compatibility
    const primaryBill = billFiles[0];
    const totalBillSizeBytes = billFiles.reduce((acc, b) => acc + (b.sizeBytes || 0), 0) || singleBillSize;
    const billFileName =
      billFiles.length > 1
        ? `${primaryBill?.name || "Utility_Bill.pdf"} (+${billFiles.length - 1} more)`
        : primaryBill?.name || singleBillName;
    const billMimeType = primaryBill?.type || singleBillMime || "application/pdf";
    const billBase64 = primaryBill?.base64 || singleBillBase64;

    // Optional selected real-time commercial offer (for Tier 2: 2,000–49,999 kWh/mo)
    const selectedProvider = body.selectedProvider
      ? String(body.selectedProvider).trim()
      : undefined;
    const selectedPlanName = body.selectedPlanName
      ? String(body.selectedPlanName).trim()
      : undefined;
    const selectedRateCents =
      body.selectedRateCents !== undefined && body.selectedRateCents !== null
        ? Number(body.selectedRateCents)
        : undefined;
    const selectedTermMonths =
      body.selectedTermMonths !== undefined && body.selectedTermMonths !== null
        ? Number(body.selectedTermMonths)
        : undefined;
    const requestedTerms = Array.isArray(body.requestedTerms)
      ? body.requestedTerms
          .map((t) => Number(t))
          .filter((t) => (CONTRACT_TERMS as readonly number[]).includes(t))
      : [...CONTRACT_TERMS];
    const estMonthlyBill =
      body.estMonthlyBill !== undefined && body.estMonthlyBill !== null
        ? Number(body.estMonthlyBill)
        : undefined;

    const loeSigned = Boolean(body.loeSigned);
    const loeSignature = String(body.loeSignature ?? "").trim();
    const loeSignerInitials = String(body.loeSignerInitials ?? "")
      .trim()
      .toUpperCase()
      .slice(0, 6);

    if (!/^\d{5}$/.test(zipCode)) {
      return new Response(JSON.stringify({ error: "Invalid 5-digit ZIP code." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!(monthlyKwh >= 1)) {
      return new Response(
        JSON.stringify({
          error:
            "Monthly consumption must be 1 kWh/mo or higher.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!businessName || !authorizedSignerName || !signerTitle) {
      return new Response(
        JSON.stringify({
          error:
            "Business Name, Authorized Signer Name, and Title are required for binding LOE authorization.",
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
          error:
            "Please attach at least one recent electric utility bill (PDF, PNG, JPG, or WebP).",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    for (const b of billFiles) {
      if (
        b.type &&
        !ALLOWED_BILL_TYPES.includes(b.type) &&
        !/\.(pdf|png|jpe?g|webp)$/i.test(b.name)
      ) {
        return new Response(
          JSON.stringify({
            error: `Utility bill "${b.name}" must be a PDF, JPG, PNG, or WebP file.`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    if (totalBillSizeBytes > 15 * 1024 * 1024) {
      return new Response(
        JSON.stringify({
          error: "Total utility bill files size must be under 15 MB.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!loeSigned || !loeSignature) {
      return new Response(
        JSON.stringify({
          error:
            "Electronic signature and Letter of Exclusivity (LOE) consent checkbox are required.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const tierSpec = resolveUsageTier(monthlyKwh);
    const isRealtimeLock = tierSpec.isRealTime && Boolean(selectedProvider);
    const prefixTag = isRealtimeLock
      ? tierSpec.id === "TIER_1"
        ? "EC-T1LOCK"
        : "EC-T2LOCK"
      : "EC-24HR";
    const confirmationId = `${prefixTag}-${Date.now().toString(36).toUpperCase()}-${zipCode}`;

    const adminEmail = resolveAdminEmail();

    const fullRecord: CommercialLoePayload & { confirmationId: string } = {
      confirmationId,
      flow: isRealtimeLock ? "TIER2_REALTIME_LOE" : "CUSTOM_24HR_LOE",
      tierId: tierSpec.id,
      tierRangeLabel: tierSpec.rangeLabel,
      turnaroundSla: tierSpec.isRealTime ? "REAL_TIME" : "24_HOUR_TURNAROUND",
      timestamp: new Date().toISOString(),
      zipCode,
      territory,
      monthlyKwh,
      annualizedKwh: monthlyKwh * 12,
      commercialTierLabel: `${tierSpec.shortName}: ${tierSpec.rangeLabel} (${tierSpec.subLabel})`,
      selectedProvider,
      selectedPlanName,
      selectedRateCents,
      selectedTermMonths,
      requestedTerms:
        requestedTerms.length > 0 ? requestedTerms : [...CONTRACT_TERMS],
      estMonthlyBill,
      businessName,
      authorizedSignerName,
      signerTitle,
      contactEmail,
      contactPhone,
      currentProvider: currentProvider || undefined,
      siteAddresses: siteAddresses.length > 0 ? siteAddresses : undefined,
      billFiles: billFiles.length > 0 ? billFiles : undefined,
      billFileName,
      billMimeType: billMimeType || "application/octet-stream",
      billFileSizeBytes: totalBillSizeBytes,
      billBase64,
      loeSigned: true,
      loeSignature,
      loeSignerInitials:
        loeSignerInitials ||
        authorizedSignerName
          .split(/\s+/)
          .map((w) => w[0] || "")
          .join("")
          .toUpperCase()
          .slice(0, 4),
      adminNotificationEmail: adminEmail,
      status: isRealtimeLock
        ? "LOE_REALTIME_RATE_LOCK"
        : "LOE_24HR_CUSTOM_QUOTE",
    };

    const { savedBillPath, savedBillPaths } = await archiveCommercialLoeLocally(fullRecord);
    const { emailDispatched } = await notifyAdminCommercialLoe(fullRecord);

    const hooks = [
      process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim(),
      process.env.LOE_WEBHOOK_URL?.trim(),
      process.env.EXECUTION_WEBHOOK_URL?.trim(),
    ].filter((u): u is string => Boolean(u));

    let webhookDelivered = false;
    for (const url of hooks) {
      try {
        const hookRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fullRecord),
        });
        if (hookRes.ok) webhookDelivered = true;
      } catch {
        // Continue
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
          savedBillPaths,
        },
        notificationEmail: adminEmail,
        emailDispatched,
        webhookDelivered,
        disclosure: process.env.DEFAULT_DISCLOSURE || STANDARD_DISCLOSURE,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "LOE submission error";
    return new Response(
      JSON.stringify({ error: "LOE Submission Failure", details: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
