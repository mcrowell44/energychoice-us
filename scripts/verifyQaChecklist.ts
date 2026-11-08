import fs from "node:fs";
import path from "node:path";
import sparkMatchHandler from "../src/api/spark-match";
import executeAgreementHandler from "../src/api/execute-agreement";
import submitLoeHandler from "../src/api/submit-loe";
import {
  ADMIN_NOTIFICATION_EMAIL,
  CONTRACT_TERMS,
  STANDARD_DISCLOSURE,
} from "../src/lib/compliance";
import {
  TIER_MILS_SCHEDULE,
  applyMilsToCentsRate,
  computeBrokerMarginRevenue,
  getMilsForMonthlyKwh,
} from "../src/lib/margin";
import {
  TEXAS_DEREGULATED_CITIES,
  checkDeregulatedAreaEligibility,
} from "../src/lib/texasDeregulatedCities";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`QA Check Failed: ${message}`);
  }
}

async function queryTier(zip: string, kwh: number) {
  const res = await sparkMatchHandler(
    new Request("http://localhost/api/spark-match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zip_code: zip, kwh_tier: kwh }),
    })
  );
  assert(res.status === 200, `${kwh} kWh/mo request must return 200`);
  return res.json();
}

async function runQaSuite() {
  console.log("Running Energy Choice US 6-Tier Automated QA Suite...\n");

  // 1. Tier 1 (1,000 – 49,999 kWh Annually | ~83 – 4,166 kWh/mo): Automatic Real-Time Offer Across 18, 24, 36, 48, 60, 72 Mos
  const t1 = await queryTier("75068", 1250); // 15,000 kWh/yr
  const t1High = await queryTier("75068", 4000); // 48,000 kWh/yr (still Tier 1)
  assert(
    t1.mode === "TIER1_REALTIME" &&
      t1.tier_id === "TIER_1" &&
      t1.tier_range_label === "1,000 – 49,999 kWh Annually" &&
      t1.turnaround_sla === "REAL_TIME" &&
      t1.plans.length === 8,
    "Tier 1 (1,250 kWh/mo = 15,000 kWh/yr) must return TIER1_REALTIME with 8 expanded competing plans"
  );
  assert(
    t1High.mode === "TIER1_REALTIME" &&
      t1High.tier_id === "TIER_1" &&
      t1High.plans[0].rate_per_kwh_cents < t1.plans[0].rate_per_kwh_cents,
    "4,000 kWh/mo (48,000 kWh/yr) must remain in Tier 1 and receive lower sub-band rate than 1,250 kWh/mo"
  );
  for (const term of CONTRACT_TERMS) {
    const list = t1.plans_by_term?.[String(term)] || [];
    assert(
      list.length === 8 && list.every((p: { term_months: number }) => p.term_months === term),
      `Tier 1 must provide 8 quotes for ${term}-month term (got ${list.length})`
    );
  }
  const t1RatesAcrossTerms = CONTRACT_TERMS.map(
    (term) => t1.plans_by_term[String(term)][0].rate_per_kwh_cents
  );
  assert(
    new Set(t1RatesAcrossTerms).size >= 3,
    "Tier 1 lead rates must dynamically vary across 18–72 month terms"
  );
  console.log(
    `✅ [PASS] Tier 1 Automatic Signup (1,000–49,999 kWh/yr • 8 per term) — Lead Curve: ${CONTRACT_TERMS.map((tm, i) => `${tm}m=${t1RatesAcrossTerms[i]}¢`).join(" | ")}`
  );

  // 2 & 3. Tiers 2, 3, 4, 5, 6 (50,000 – 3,000,000 kWh Annually): Live Multi-Term Quotes to Reserve for 24-Hour Pricing & Usage Validation
  const expected24Hr: Array<[number, string, string]> = [
    [4200, "TIER_2", "50,000 – 99,999 kWh Annually"], // 50,400 kWh/yr
    [8000, "TIER_2", "50,000 – 99,999 kWh Annually"], // 96,000 kWh/yr
    [10000, "TIER_3", "100,000 – 299,999 kWh Annually"], // 120,000 kWh/yr
    [24000, "TIER_3", "100,000 – 299,999 kWh Annually"], // 288,000 kWh/yr
    [26000, "TIER_4", "300,000 – 499,999 kWh Annually"], // 312,000 kWh/yr
    [40000, "TIER_4", "300,000 – 499,999 kWh Annually"], // 480,000 kWh/yr
    [45000, "TIER_5", "500,000 – 999,999 kWh Annually"], // 540,000 kWh/yr
    [80000, "TIER_5", "500,000 – 999,999 kWh Annually"], // 960,000 kWh/yr
    [90000, "TIER_6", "1,000,000 – 3,000,000 kWh Annually"], // 1,080,000 kWh/yr
    [200000, "TIER_6", "1,000,000 – 3,000,000 kWh Annually"], // 2,400,000 kWh/yr
  ];

  const tierLeadRates: Record<string, number> = {};
  let sampleT2Plan: {
    provider: string;
    plan_name: string;
    rate_per_kwh_cents: number;
    term_months: number;
    est_monthly_bill: number;
  } | null = null;
  let sampleT4Plan: {
    provider: string;
    plan_name: string;
    rate_per_kwh_cents: number;
    term_months: number;
    est_monthly_bill: number;
  } | null = null;

  for (const [kwh, expectedId, expectedLabel] of expected24Hr) {
    const res = await queryTier("75068", kwh);
    assert(
      res.mode === "CUSTOM_24HR_LOE" &&
        res.tier_id === expectedId &&
        res.tier_range_label === expectedLabel &&
        res.turnaround_sla === "24_HOUR_TURNAROUND" &&
        res.plans.length === 8,
      `${kwh} kWh/mo (${kwh * 12} kWh/yr) must return 8 live reservable quotes with 24_HOUR_TURNAROUND for ${expectedId}`
    );
    for (const term of CONTRACT_TERMS) {
      const list = res.plans_by_term?.[String(term)] || [];
      assert(
        list.length === 8 &&
          list.every((p: { term_months: number }) => p.term_months === term),
        `${expectedId} (${kwh} kWh/mo) must return 8 live quotes for ${term}m`
      );
    }
    if (tierLeadRates[expectedId] === undefined) {
      tierLeadRates[expectedId] = res.plans[0].rate_per_kwh_cents;
    }
    if (expectedId === "TIER_2" && !sampleT2Plan) {
      sampleT2Plan = res.plans[0];
    }
    if (expectedId === "TIER_4" && !sampleT4Plan) {
      sampleT4Plan = res.plans[0];
    }
  }
  assert(
    t1.plans[0].rate_per_kwh_cents < 10.0 &&
      t1.plans[0].rate_per_kwh_cents > tierLeadRates.TIER_2 &&
      tierLeadRates.TIER_2 > tierLeadRates.TIER_3 &&
      tierLeadRates.TIER_3 > tierLeadRates.TIER_4 &&
      tierLeadRates.TIER_4 > tierLeadRates.TIER_5 &&
      tierLeadRates.TIER_5 > tierLeadRates.TIER_6,
    "Live lead rates must be true energy-only supply rates (<10¢) and monotonically scale down across Tiers 1 -> 2 -> 3 -> 4 -> 5 -> 6"
  );
  console.log(
    `✅ [PASS] Tiers 2–6 Live Reservable Quotes (24-Hr Validation, 50k–3M kWh/yr) — T2=${tierLeadRates.TIER_2}¢ | T3=${tierLeadRates.TIER_3}¢ | T4=${tierLeadRates.TIER_4}¢ | T5=${tierLeadRates.TIER_5}¢ | T6=${tierLeadRates.TIER_6}¢`
  );

  // 4. Tier 1 Prospect Capture
  const t1Lead = t1.plans[0];
  const t1CaptureRes = await executeAgreementHandler(
    new Request("http://localhost/api/execute-agreement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zipCode: "75068",
        territory: t1.territory,
        allocatedKwh: 1250,
        appliedTierLabel: t1Lead.applied_tier_label,
        provider: t1Lead.provider,
        planName: t1Lead.plan_name,
        termMonths: t1Lead.term_months,
        rateCents: t1Lead.rate_per_kwh_cents,
        rate500Cents: t1Lead.rate_500_cents,
        rate1000Cents: t1Lead.rate_1000_cents,
        rate2000Cents: t1Lead.rate_2000_cents,
        estMonthlyBill: t1Lead.est_monthly_bill,
        contactEmail: "prospect@energychoice.us",
        contactPhone: "2145550188",
        signerInitials: "SN",
      }),
    })
  );
  const t1CaptureJson = await t1CaptureRes.json();
  assert(
    t1CaptureRes.status === 200 &&
      t1CaptureJson.notificationEmail === ADMIN_NOTIFICATION_EMAIL &&
      t1CaptureJson.record?.adminNotificationEmail === ADMIN_NOTIFICATION_EMAIL,
    "Tier 1 capture must return 200 and route notifications to energychoiceus@cdmweb.store"
  );
  console.log(
    `✅ [PASS] Tier 1 Prospect Capture & Notification Routing (${t1CaptureJson.notificationEmail}) Verified`
  );

  // 5. Tier 2 Reserved Quote (6,000 kWh/mo = 72,000 kWh/yr) + Bill + Signed LOE (24-Hr Validation)
  const samplePdfBase64 =
    "data:application/pdf;base64," +
    Buffer.from("%PDF-1.4 Sample Commercial Statement").toString("base64");

  const t2Plan = sampleT2Plan!;
  const t2LockRes = await submitLoeHandler(
    new Request("http://localhost/api/submit-loe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zipCode: "75068",
        territory: t1.territory,
        monthlyKwh: 6000,
        selectedProvider: t2Plan.provider,
        selectedPlanName: t2Plan.plan_name,
        selectedRateCents: t2Plan.rate_per_kwh_cents,
        selectedTermMonths: t2Plan.term_months,
        estMonthlyBill: t2Plan.est_monthly_bill,
        businessName: "Metro Retail Group LLC",
        authorizedSignerName: "Signers Name",
        signerTitle: "Authorized Representative",
        contactEmail: "tier2@energychoice.us",
        contactPhone: "2145550191",
        billFileName: "retail_bill.pdf",
        billMimeType: "application/pdf",
        billFileSizeBytes: 1024,
        billBase64: samplePdfBase64,
        loeSigned: true,
        loeSignature: "Signers Name",
      }),
    })
  );
  const t2LockJson = await t2LockRes.json();
  assert(
    t2LockRes.status === 200 &&
      t2LockJson.record?.status === "LOE_24HR_CUSTOM_QUOTE" &&
      t2LockJson.record?.turnaroundSla === "24_HOUR_TURNAROUND" &&
      t2LockJson.notificationEmail === ADMIN_NOTIFICATION_EMAIL &&
      t2LockJson.record?.adminNotificationEmail === ADMIN_NOTIFICATION_EMAIL,
    "Tier 2 (72,000 kWh/yr) LOE must return LOE_24HR_CUSTOM_QUOTE with 24_HOUR_TURNAROUND and route to energychoiceus@cdmweb.store"
  );
  console.log(
    `✅ [PASS] Tier 2 Reserved Quote + Bill & Signed LOE (${t2LockJson.record.confirmationId})`
  );

  // 6. Tier 4 (30,000 kWh/mo = 360,000 kWh/yr) Reserved Live Rate Quote + Bill + Signed LOE (24-Hr Validation)
  const t4Res = await submitLoeHandler(
    new Request("http://localhost/api/submit-loe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zipCode: "77002",
        territory: "Houston Metro • ERCOT",
        monthlyKwh: 30000,
        selectedProvider: sampleT4Plan?.provider,
        selectedPlanName: sampleT4Plan?.plan_name,
        selectedRateCents: sampleT4Plan?.rate_per_kwh_cents,
        selectedTermMonths: sampleT4Plan?.term_months,
        estMonthlyBill: sampleT4Plan?.est_monthly_bill,
        businessName: "Gulf Industrial Cold Storage Inc",
        authorizedSignerName: "Signers Name",
        signerTitle: "Authorized Officer",
        contactEmail: "industrial@energychoice.us",
        contactPhone: "7135550144",
        billFileName: "industrial_statement.pdf",
        billMimeType: "application/pdf",
        billFileSizeBytes: 2048,
        billBase64: samplePdfBase64,
        loeSigned: true,
        loeSignature: "Signers Name",
      }),
    })
  );
  const t4Json = await t4Res.json();
  assert(
    t4Res.status === 200 &&
      t4Json.record?.status === "LOE_24HR_CUSTOM_QUOTE" &&
      t4Json.record?.turnaroundSla === "24_HOUR_TURNAROUND" &&
      t4Json.record?.selectedProvider === sampleT4Plan?.provider &&
      t4Json.record?.selectedRateCents === sampleT4Plan?.rate_per_kwh_cents &&
      t4Json.notificationEmail === ADMIN_NOTIFICATION_EMAIL,
    "360,000 kWh/yr Reserved Quote LOE must preserve selected quote, 24_HOUR_TURNAROUND, and route to energychoiceus@cdmweb.store"
  );
  console.log(
    `✅ [PASS] Tier 4 Reserved Live Quote + Bill & Signed LOE (${t4Json.record.confirmationId} @ $${((sampleT4Plan?.rate_per_kwh_cents || 0) / 100).toFixed(4)}/kWh)`
  );

  // 7. Standard Automated Disclosure Verification
  for (const relFile of [
    "src/components/EmbeddedContractViewer.tsx",
    "src/components/CommercialLoeIntake.tsx",
    "src/components/PlanComparisonGrid.tsx",
    "src/components/AutomatedBanner.tsx",
  ]) {
    const content = fs.readFileSync(path.resolve(relFile), "utf-8");
    assert(
      content.includes("STANDARD_DISCLOSURE"),
      `${relFile} must display STANDARD_DISCLOSURE`
    );
  }
  console.log("✅ [PASS] Standard Automated Disclosure Verified");

  // 8. Descending 6-Tier Mils Schedule (10, 8, 7, 5, 4, 3) & Client-Bundle Privacy Check
  assert(
    TIER_MILS_SCHEDULE.TIER_1 === 10 &&
      TIER_MILS_SCHEDULE.TIER_2 === 8 &&
      TIER_MILS_SCHEDULE.TIER_3 === 7 &&
      TIER_MILS_SCHEDULE.TIER_4 === 5 &&
      TIER_MILS_SCHEDULE.TIER_5 === 4 &&
      TIER_MILS_SCHEDULE.TIER_6 === 3,
    "TIER_MILS_SCHEDULE must strictly equal [10, 8, 7, 5, 4, 3]"
  );
  assert(
    getMilsForMonthlyKwh(2000).mils === 10 && // 24,000 kWh/yr -> Tier 1
      getMilsForMonthlyKwh(6000).mils === 8 && // 72,000 kWh/yr -> Tier 2
      getMilsForMonthlyKwh(15000).mils === 7 && // 180,000 kWh/yr -> Tier 3
      getMilsForMonthlyKwh(30000).mils === 5 && // 360,000 kWh/yr -> Tier 4
      getMilsForMonthlyKwh(60000).mils === 4 && // 720,000 kWh/yr -> Tier 5
      getMilsForMonthlyKwh(150000).mils === 3, // 1,800,000 kWh/yr -> Tier 6
    "getMilsForMonthlyKwh must map each of the 6 annual kWh tiers to [10, 8, 7, 5, 4, 3]"
  );
  // $0.065/kWh (6.50¢) + 10 mils ($0.010 / 1.00¢) === $0.075/kWh (7.50¢)
  assert(
    applyMilsToCentsRate(6.5, 10) === 7.5,
    "$0.065/kWh (6.50¢) + 10 mils must equal $0.075/kWh (7.50¢)"
  );
  const sampleMargin = computeBrokerMarginRevenue(6000, 8, 24);
  assert(
    sampleMargin.monthlyMarginDollars === 48 &&
      sampleMargin.totalTermMarginDollars === 1152,
    "computeBrokerMarginRevenue must accurately compute monthly ($48) and 24m ($1,152) margin"
  );

  // Ensure client components, shared modules & API responses NEVER expose markup, margin, mils, raw EFL links, or raw basis anchors
  const t3Sample = await queryTier("77002", 15000);
  for (const [label, payload] of [
    ["Tier 1 /api/spark-match", t1],
    ["Tier 3 /api/spark-match", t3Sample],
    ["Tier 2 /api/submit-loe", t2LockJson],
    ["Tier 4 /api/submit-loe", t4Json],
  ] as const) {
    const serialized = JSON.stringify(payload).toLowerCase();
    assert(
      !/\b(mils|mills|markup|margin|commission|broker|wholesale|fact_sheet_url|enroll_url|powertochoose)\b/i.test(
        serialized
      ) && !serialized.includes("mark up"),
      `Public API response (${label}) must never leak markup, margin, mils, or raw EFL links`
    );
  }

  for (const clientFile of [
    "src/App.tsx",
    "src/lib/compliance.ts",
    "src/lib/texasDeregulatedCities.ts",
    ...fs
      .readdirSync(path.resolve("src/components"))
      .filter((f) => f.endsWith(".tsx"))
      .map((f) => `src/components/${f}`),
  ]) {
    const srcText = fs.readFileSync(path.resolve(clientFile), "utf-8");
    assert(
      !srcText.includes("lib/margin") &&
        !srcText.includes("lib/pricingTerritory") &&
        !srcText.toLowerCase().includes("mark up") &&
        !/\b(mils|mills|markup|margin|commission|broker|wholesale|powertochoose)\b/i.test(
          srcText
        ),
      `${clientFile} must never import server-only pricing/margin modules or mention markup/margin/mils`
    );
  }
  console.log(
    "✅ [PASS] Zero-Leak Client & API Privacy Check Verified (Markup 100% Hidden from Users)"
  );

  // 9. Complete Texas Deregulated Cities Directory & Power-to-Choose Yes/No Gate
  assert(
    TEXAS_DEREGULATED_CITIES.length >= 350 &&
      TEXAS_DEREGULATED_CITIES.every((c) => /^\d{5}$/.test(c.zip)),
    `TEXAS_DEREGULATED_CITIES must contain 350+ valid 5-digit ZIP entries (got ${TEXAS_DEREGULATED_CITIES.length})`
  );
  for (const listedCity of [
    "Abilene",
    "Houston",
    "Dallas",
    "Fort Worth",
    "Corpus Christi",
    "Galveston",
    "Waco",
    "Lubbock",
    "Zavalla",
  ]) {
    const res = checkDeregulatedAreaEligibility("", listedCity);
    assert(
      res.inDeregulatedList && /^\d{5}$/.test(res.resolvedZip),
      `Listed deregulated city ${listedCity} must pass eligibility and resolve ZIP`
    );
  }
  assert(
    checkDeregulatedAreaEligibility("75068", "").inDeregulatedList &&
      checkDeregulatedAreaEligibility("77002", "Houston").inDeregulatedList,
    "Deregulated Texas ZIPs 75068 and 77002 must pass eligibility"
  );
  for (const [unlistedZip, unlistedCity] of [
    ["78701", "Austin"],
    ["78205", "San Antonio"],
    ["79901", "El Paso"],
    ["33101", "Miami"],
    ["90210", ""],
    ["", "Austin"],
  ]) {
    const res = checkDeregulatedAreaEligibility(unlistedZip, unlistedCity);
    assert(
      !res.inDeregulatedList,
      `Unlisted/regulated area (${unlistedCity || unlistedZip}) must trigger Power to Choose Yes/No check`
    );
  }
  const heroSrc = fs.readFileSync(
    path.resolve("src/components/IntakeHero.tsx"),
    "utf-8"
  );
  assert(
    heroSrc.includes("Do") &&
      heroSrc.includes("Power to Choose") &&
      heroSrc.includes("can&apos;t help business owners in your area"),
    "IntakeHero.tsx must include Power to Choose Yes/No check and polite decline message"
  );
  console.log(
    `✅ [PASS] Complete Texas Deregulated Cities Directory (${TEXAS_DEREGULATED_CITIES.length} cities) & Power-to-Choose Yes/No Gate Verified`
  );

  // 10. Step-Gated Required Bill Upload -> LOE, Agreement Execution & Sign Across All Tiers
  const t1BillLoeRes = await submitLoeHandler(
    new Request("http://localhost/api/submit-loe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zipCode: "75068",
        territory: t1.territory,
        monthlyKwh: 1250,
        selectedProvider: t1Lead.provider,
        selectedPlanName: t1Lead.plan_name,
        selectedRateCents: t1Lead.rate_per_kwh_cents,
        selectedTermMonths: t1Lead.term_months,
        estMonthlyBill: t1Lead.est_monthly_bill,
        businessName: "Small Office Suite LLC",
        authorizedSignerName: "Signers Name",
        signerTitle: "Owner",
        contactEmail: "tier1lock@energychoice.us",
        contactPhone: "2145550199",
        billFileName: "tier1_utility_bill.pdf",
        billMimeType: "application/pdf",
        billFileSizeBytes: 1024,
        billBase64: samplePdfBase64,
        loeSigned: true,
        loeSignature: "Signers Name",
      }),
    })
  );
  const t1BillLoeJson = await t1BillLoeRes.json();
  assert(
    t1BillLoeRes.status === 200 &&
      t1BillLoeJson.record?.confirmationId?.startsWith("EC-T1LOCK-") &&
      t1BillLoeJson.record?.status === "LOE_REALTIME_RATE_LOCK",
    "Tier 1 Lock in Rate & LOE must verify uploaded bill and execute LOE & Agreement"
  );
  const gridSrc = fs.readFileSync(
    path.resolve("src/components/PlanComparisonGrid.tsx"),
    "utf-8"
  );
  const loeSrc = fs.readFileSync(
    path.resolve("src/components/CommercialLoeIntake.tsx"),
    "utf-8"
  );
  assert(
    gridSrc.includes("Lock in Rate & LOE") &&
      loeSrc.includes("BILL_UPLOAD") &&
      loeSrc.includes("LOE_AND_SIGN") &&
      loeSrc.includes("Proceed to LOE, Agreement Execution"),
    "Lock in Rate & LOE CTA must route to Step 1 Required Bill Upload before unlocking Step 2 LOE & Agreement Execution & Sign"
  );
  console.log(
    `✅ [PASS] Step-Gated Bill Upload -> LOE, Agreement Execution & Sign Verified (${t1BillLoeJson.record.confirmationId})\n`
  );
  console.log(
    "🎉 All 6 Usage Tiers, Mils Schedule, Texas Cities & Bill-Gated LOE Execution Verified!"
  );
}

runQaSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
