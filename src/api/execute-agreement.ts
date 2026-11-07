import {
  STANDARD_DISCLOSURE,
  type Tier1ProspectPayload,
} from "../lib/compliance";
import {
  notifyAdminTier1Prospect,
  resolveAdminEmail,
} from "../lib/notifications";

async function archiveTier1Locally(
  record: Tier1ProspectPayload & { confirmationId: string }
): Promise<void> {
  if (typeof process === "undefined" || !process.versions?.node) return;
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const dataDir = path.resolve(process.cwd(), "data");
    await fs.mkdir(dataDir, { recursive: true });
    const ledgerPath = path.join(dataDir, "tier1-prospects.json");

    let existing: unknown[] = [];
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
    // Non-persistent serverless environment; webhook handles persistence
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
    const allocatedKwh = Number(body.allocatedKwh ?? 0);
    const appliedTierLabel = String(body.appliedTierLabel ?? "1–1,999 kWh Tier");
    const provider = String(body.provider ?? "").trim();
    const planName = String(body.planName ?? "Fixed Rate Plan").trim();
    const termMonths = Math.max(18, Number(body.termMonths ?? 18));
    const rateCents = Number(body.rateCents ?? 0);
    const rate500Cents = Number(body.rate500Cents ?? rateCents);
    const rate1000Cents = Number(body.rate1000Cents ?? rateCents);
    const rate2000Cents = Number(body.rate2000Cents ?? rateCents);
    const estMonthlyBill = Number(
      body.estMonthlyBill ?? ((rateCents * allocatedKwh) / 100).toFixed(2)
    );
    const contactEmail = String(body.contactEmail ?? "").trim();
    const contactPhone = String(body.contactPhone ?? "").trim();
    const signerInitials = String(body.signerInitials ?? "")
      .trim()
      .toUpperCase()
      .slice(0, 6);
    const factSheetUrl = body.factSheetUrl
      ? String(body.factSheetUrl)
      : undefined;
    const enrollUrl = body.enrollUrl ? String(body.enrollUrl) : undefined;
    const enrollPhone = body.enrollPhone ? String(body.enrollPhone) : undefined;

    if (!/^\d{5}$/.test(zipCode)) {
      return new Response(JSON.stringify({ error: "Invalid 5-digit ZIP code." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!(allocatedKwh >= 1 && allocatedKwh < 2000)) {
      return new Response(
        JSON.stringify({
          error:
            "Tier 1 prospect capture applies to 1–1,999 kWh/month. Accounts at 2,000+ kWh/month require Commercial LOE submission.",
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

    const cleanRecord: Tier1ProspectPayload & { confirmationId: string } = {
      confirmationId,
      flow: "TIER1_1_1999_KWH",
      timestamp: new Date().toISOString(),
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
      status: "PROSPECT_CAPTURED_TIER1",
    };

    await archiveTier1Locally(cleanRecord);
    const { emailDispatched } = await notifyAdminTier1Prospect(cleanRecord);

    const hooks = [
      process.env.GOOGLE_SHEETS_WEBHOOK_URL?.trim(),
      process.env.EXECUTION_WEBHOOK_URL?.trim(),
    ].filter((u): u is string => Boolean(u));

    let webhookDelivered = false;
    for (const url of hooks) {
      try {
        const hookRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanRecord),
        });
        if (hookRes.ok) webhookDelivered = true;
      } catch {
        // Continue if secondary webhook fails
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        record: cleanRecord,
        notificationEmail: adminEmail,
        emailDispatched,
        webhookDelivered,
        disclosure: process.env.DEFAULT_DISCLOSURE || STANDARD_DISCLOSURE,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Execution error";
    return new Response(
      JSON.stringify({ error: "Prospect Capture Failure", details: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
