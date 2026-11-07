# Energy Choice US (`energychoice.us`)

Automated multi-tier energy procurement engine providing instant real-time daily supplier offers and 24-hour custom commercial desk bidding.

- **Admin & Notification Desk:** `energychoiceus@cdmweb.store`

## Monthly Usage Tiers & Turnaround SLAs

1. **Real-Time Daily Offers (Instant On-Screen Pricing)**
   - **Tier 1 (`1 – 1,999 kWh/mo`):** Live daily provider seed (`500 / 1,000 / 2,000 kWh/mo` curve) with on-page prospect capture and official EFL / enrollment unlock.
   - **Tier 2 (`2,000 – 49,999 kWh/mo`):** Real-time commercial matrix offers locked on-page with Business Info, Utility Bill upload, and e-signed LOE consent.

2. **24-Hour Turnaround Custom Desk Quotes (Bill Upload + Signed LOE)**
   - **Tier 3 (`50,000 – 99,999 kWh/mo`)**
   - **Tier 4 (`100,000 – 499,999 kWh/mo`)**
   - **Tier 5 (`500,000 – 999,999 kWh/mo`)**
   - **Tier 6 (`1,000,000 – 3,000,000 kWh/mo`)**

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run automated 6-tier QA verification suite
npm run qa

# 3. Export daily real-time Tier 1 & Tier 2 seed CSV
npm run export-seed

# 4. Launch local dev server
npm run dev
```

## Notifications & Environment Variables (`.env`)

All prospect captures and signed commercial LOEs route notifications to `energychoiceus@cdmweb.store` via:
1. **Google Apps Script Bridge (`scripts/google-sheets-webhook.gs`):** Logs leads to Google Sheets, saves uploaded utility bills to Google Drive, and emails `energychoiceus@cdmweb.store` with the utility bill attached (`MailApp.sendEmail`).
2. **Optional Direct Resend API (`RESEND_API_KEY`):** Dispatches instant server-side email alerts (plus PDF/photo utility bill attachments) straight to `energychoiceus@cdmweb.store`.

```env
NEXT_PUBLIC_APP_URL="https://energychoice.us"
ADMIN_NOTIFICATION_EMAIL="energychoiceus@cdmweb.store"
GOOGLE_SHEETS_WEBHOOK_URL=""
RESEND_API_KEY=""
EXECUTION_WEBHOOK_URL=""
LOE_WEBHOOK_URL=""
```
