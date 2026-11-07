import sparkMatchHandler from "../src/api/spark-match";
import { ADMIN_NOTIFICATION_EMAIL } from "../src/lib/compliance";

interface TargetRegion {
  name: string;
  zip: string;
}

export async function runDailyPulse() {
  const regions: TargetRegion[] = [
    { name: "North Texas (Oncor)", zip: "75068" },
    { name: "Houston Metro (CenterPoint)", zip: "77002" },
    { name: "South Texas (AEP Central)", zip: "78401" },
    { name: "Pennsylvania (PJM)", zip: "19104" },
    { name: "Ohio Commercial Desk (AEP)", zip: "43215" },
  ];

  const dayIndex = Math.floor(Date.now() / 86_400_000) % regions.length;
  const target = regions[dayIndex];

  // Query live Tier 1 1,000 kWh/mo benchmark rate
  const mockReq = new Request("http://localhost/api/spark-match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      zip_code: target.zip,
      kwh_tier: 1000,
    }),
  });

  const res = await sparkMatchHandler(mockReq);
  const data = await res.json();
  const leadPlan = data?.plans?.[0];
  const rateBadge = leadPlan
    ? ` Live 1,000 kWh/mo fixed rates starting at ${leadPlan.rate_per_kwh_cents.toFixed(2)}¢/kWh (${leadPlan.provider}).`
    : "";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://energychoice.us";
  const postText = `⚡ Daily Rate Alert — ${target.name} (${target.zip}):${rateBadge} Real-time daily offers for 1–49,999 kWh/mo; 24-hr custom quotes for 50,000–3,000,000 kWh/mo (${ADMIN_NOTIFICATION_EMAIL}). Speed to need is the motto.\n\nCheck your monthly usage tier:\n${appUrl}`;

  console.log("=== Energy Choice US — Daily Market Pulse ===");
  console.log(postText);
  console.log("=============================================");

  const xToken = process.env.X_BEARER_TOKEN?.trim();
  if (xToken) {
    const xRes = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${xToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: postText }),
    });
    console.log(`X API v2 status: ${xRes.status}`);
  }

  const socialWebhook = process.env.SOCIAL_WEBHOOK_URL?.trim();
  if (socialWebhook) {
    const whRes = await fetch(socialWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region: target.name,
        zip: target.zip,
        text: postText,
        adminEmail: ADMIN_NOTIFICATION_EMAIL,
        timestamp: new Date().toISOString(),
      }),
    });
    console.log(`Social Webhook status: ${whRes.status}`);
  }
}

runDailyPulse().catch((err) => {
  console.error("Daily Market Pulse failed:", err);
  process.exit(1);
});
