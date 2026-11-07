/**
 * Energy Choice US (energychoice.us) — Google Sheets + Google Drive + Email Notification Bridge
 * Bound Spreadsheet ID: 1D-9oW3-N7edHwB11_-faIyT7vLtjuA3giGGxkV24JSs
 * Admin & Notification Desk: energychoiceus@cdmweb.store
 *
 * Tiers Supported:
 * - Tier 1 (1–1,999 kWh/mo): Real-Time Offer -> Tier1_Prospects_1_1999kWh + Instant Email Alert
 * - Tier 2 (2,000–49,999 kWh/mo): Real-Time Offer + Bill & Signed LOE -> Tier2_Commercial_LOE_2000Plus + Drive Upload + Email w/ Bill Attachment
 * - Tiers 3–6 (50,000–3,000,000 kWh/mo): 24-Hr Custom Quote + Bill & Signed LOE -> Tier2_Commercial_LOE_2000Plus + Drive Upload + Email w/ Bill Attachment
 */

const SPREADSHEET_ID = "1D-9oW3-N7edHwB11_-faIyT7vLtjuA3giGGxkV24JSs";
const BILL_FOLDER_NAME = "Energy Choice US - Uploaded Utility Bills";
const DEFAULT_ADMIN_EMAIL = "energychoiceus@cdmweb.store";

function resolveMilsForKwh_(kwh) {
  const n = Number(kwh || 0);
  if (n < 2000) return 10;
  if (n < 50000) return 9;
  if (n < 100000) return 8;
  if (n < 500000) return 6;
  if (n < 1000000) return 5;
  return 3;
}

function getOrCreateBillFolder_() {
  const folders = DriveApp.getFoldersByName(BILL_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(BILL_FOLDER_NAME);
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const adminEmail = payload.adminNotificationEmail || DEFAULT_ADMIN_EMAIL;

    if (
      payload.flow === "TIER2_REALTIME_LOE" ||
      payload.flow === "CUSTOM_24HR_LOE"
    ) {
      const sheet = ss.getSheetByName("Tier2_Commercial_LOE_2000Plus");
      let billDriveUrl = "";
      let billBlob = null;

      if (payload.billBase64 && payload.billFileName) {
        const cleanBase64 = payload.billBase64.replace(/^data:[^;]+;base64,/, "");
        const bytes = Utilities.base64Decode(cleanBase64);
        billBlob = Utilities.newBlob(
          bytes,
          payload.billMimeType || "application/pdf",
          payload.confirmationId + "_" + payload.billFileName
        );
        const folder = getOrCreateBillFolder_();
        const file = folder.createFile(billBlob);
        billDriveUrl = file.getUrl();
      }

      const requestedTermsLabel = Array.isArray(payload.requestedTerms)
        ? payload.requestedTerms.join("/") + "m"
        : "18/24/36/48/60/72m";
      const selectedSummary = payload.selectedProvider
        ? payload.selectedProvider +
          " @ " +
          payload.selectedRateCents +
          "¢ (" +
          payload.selectedTermMonths +
          "m)"
        : "24-Hr Custom Desk Bid (" + requestedTermsLabel + ")";

      sheet.appendRow([
        payload.confirmationId || "",
        payload.timestamp || new Date().toISOString(),
        payload.zipCode || "",
        payload.territory || "",
        payload.monthlyKwh || 0,
        payload.annualizedKwh || 0,
        payload.tierRangeLabel || payload.commercialTierLabel || "",
        payload.turnaroundSla || "",
        selectedSummary,
        payload.businessName || "",
        payload.authorizedSignerName || "",
        payload.signerTitle || "",
        payload.contactEmail || "",
        payload.contactPhone || "",
        payload.currentProvider || "",
        payload.billFileName || "",
        billDriveUrl,
        payload.loeSignature || "",
        payload.status || "",
      ]);

      // Dispatch instant email notification + attached utility bill to energychoiceus@cdmweb.store
      let emailSent = false;
      try {
        const mailOptions = {
          to: adminEmail,
          replyTo: payload.contactEmail || adminEmail,
          subject:
            "[Energy Choice US LOE] " +
            (payload.businessName || "Commercial Lead") +
            " — " +
            Number(payload.monthlyKwh || 0).toLocaleString() +
            " kWh/mo (" +
            selectedSummary +
            ")",
          body: [
            "Commercial Utility Bill & Signed LOE Submitted",
            "================================================",
            "Confirmation ID: " + (payload.confirmationId || ""),
            "Turnaround SLA: " + (payload.turnaroundSla || ""),
            "Usage Bracket: " + (payload.commercialTierLabel || payload.tierRangeLabel || ""),
            "Selected Offer: " + selectedSummary,
            "",
            "Business Entity: " + (payload.businessName || ""),
            "Authorized Signer: " + (payload.authorizedSignerName || "") + " (" + (payload.signerTitle || "") + ")",
            "Contact Email: " + (payload.contactEmail || ""),
            "Contact Phone: " + (payload.contactPhone || ""),
            "Current Provider: " + (payload.currentProvider || "Not Specified"),
            "ZIP / Territory: " + (payload.zipCode || "") + " (" + (payload.territory || "") + ")",
            "Monthly Volume: " + Number(payload.monthlyKwh || 0).toLocaleString() + " kWh/mo (" + Number(payload.annualizedKwh || 0).toLocaleString() + " kWh/yr)",
            "Assigned Tier Margin: +" + resolveMilsForKwh_(payload.monthlyKwh) + " mils ($" + (Number(payload.monthlyKwh || 0) * resolveMilsForKwh_(payload.monthlyKwh) * 0.001).toFixed(2) + "/mo est. commission)",
            "",
            "Binding E-Signature: " + (payload.loeSignature || "") + " [" + (payload.loeSignerInitials || "") + "]",
            "Google Drive Bill Link: " + (billDriveUrl || "Attached"),
          ].join("\n"),
        };
        if (billBlob) {
          mailOptions.attachments = [billBlob];
        }
        MailApp.sendEmail(mailOptions);
        emailSent = true;
      } catch (_mailErr) {
        // Sheet + Drive succeeded even if MailApp quota is temporarily unavailable
      }

      return ContentService.createTextOutput(
        JSON.stringify({
          ok: true,
          billDriveUrl: billDriveUrl,
          notifiedAdmin: adminEmail,
          emailSent: emailSent,
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Tier 1 (1–1,999 kWh/mo) Real-Time Prospect Capture
    const t1Sheet = ss.getSheetByName("Tier1_Prospects_1_1999kWh");
    t1Sheet.appendRow([
      payload.confirmationId || "",
      payload.timestamp || new Date().toISOString(),
      payload.zipCode || "",
      payload.territory || "",
      payload.allocatedKwh || 0,
      payload.appliedTierLabel || "",
      payload.provider || "",
      payload.planName || "",
      payload.termMonths || 18,
      payload.rateCents || 0,
      payload.rate500Cents || 0,
      payload.rate1000Cents || 0,
      payload.rate2000Cents || 0,
      payload.estMonthlyBill || 0,
      payload.contactEmail || "",
      payload.contactPhone || "",
      payload.signerInitials || "",
      payload.factSheetUrl || "",
      payload.enrollUrl || "",
      payload.status || "PROSPECT_CAPTURED_TIER1",
    ]);

    let t1EmailSent = false;
    try {
      MailApp.sendEmail({
        to: adminEmail,
        replyTo: payload.contactEmail || adminEmail,
        subject:
          "[Energy Choice US Tier 1] " +
          (payload.provider || "Provider") +
          " @ " +
          (payload.rateCents || 0) +
          "¢/kWh — ZIP " +
          (payload.zipCode || ""),
        body: [
          "New Tier 1 (1–1,999 kWh/mo) Real-Time Prospect Captured",
          "========================================================",
          "Confirmation ID: " + (payload.confirmationId || ""),
          "Prospect Email: " + (payload.contactEmail || ""),
          "Prospect Phone: " + (payload.contactPhone || ""),
          "ZIP / Territory: " + (payload.zipCode || "") + " (" + (payload.territory || "") + ")",
          "Monthly Usage: " + Number(payload.allocatedKwh || 0).toLocaleString() + " kWh/mo (" + (payload.appliedTierLabel || "") + ")",
          "Selected Plan: " + (payload.provider || "") + " — " + (payload.planName || "") + " (" + (payload.termMonths || 12) + " mos)",
          "Rate / Est Bill: $" + (Number(payload.rateCents || 0) / 100).toFixed(4) + "/kWh (" + (payload.rateCents || 0) + "¢/kWh • $" + (payload.estMonthlyBill || 0) + "/mo)",
          "Embedded Tier 1 Margin: +10 mils (+$0.010/kWh • $" + (Number(payload.allocatedKwh || 0) * 0.01).toFixed(2) + "/mo commission)",
          "Official EFL: " + (payload.factSheetUrl || "N/A"),
          "Enrollment URL: " + (payload.enrollUrl || "N/A"),
        ].join("\n"),
      });
      t1EmailSent = true;
    } catch (_mailErr) {
      // Sheet append succeeded
    }

    return ContentService.createTextOutput(
      JSON.stringify({
        ok: true,
        notifiedAdmin: adminEmail,
        emailSent: t1EmailSent,
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
