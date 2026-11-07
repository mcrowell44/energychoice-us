import React from "react";
import {
  ADMIN_NOTIFICATION_EMAIL,
  STANDARD_DISCLOSURE,
} from "../lib/compliance";

export const AutomatedBanner: React.FC = () => {
  return (
    <footer className="mt-16 border-t border-neutral-900 bg-neutral-950 py-8 px-4 text-center">
      <div className="max-w-4xl mx-auto space-y-2">
        <p className="text-xs text-neutral-500 leading-relaxed font-mono">
          {STANDARD_DISCLOSURE}
        </p>
        <p className="text-[11px] text-neutral-500 font-mono">
          Procurement &amp; Admin Desk:{" "}
          <a
            href={`mailto:${ADMIN_NOTIFICATION_EMAIL}`}
            className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
          >
            {ADMIN_NOTIFICATION_EMAIL}
          </a>
        </p>
        <p className="text-[11px] text-neutral-600">
          Real-Time Daily Offers (1–1,999 &amp; 2,000–49,999 kWh/mo) • Live
          Reservable C&amp;I Quotes &amp; 24-Hr Verification (50,000–3,000,000
          kWh/mo) • © {new Date().getFullYear()} energychoice.us
        </p>
      </div>
    </footer>
  );
};
