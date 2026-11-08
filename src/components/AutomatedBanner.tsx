import React from "react";
import {
  ADMIN_NOTIFICATION_EMAIL,
  STANDARD_DISCLOSURE,
} from "../lib/compliance";

export const AutomatedBanner: React.FC = () => {
  return (
    <footer className="mt-16 border-t border-[#0e2d5c] bg-[#010a1a] py-8 px-4 text-center">
      <div className="max-w-4xl mx-auto space-y-2">
        <p className="text-xs text-slate-400 leading-relaxed font-mono">
          {STANDARD_DISCLOSURE}
        </p>
        <p className="text-[11px] text-slate-400 font-mono">
          Procurement &amp; Admin Desk:{" "}
          <a
            href={`mailto:${ADMIN_NOTIFICATION_EMAIL}`}
            className="text-[#00e5ff] hover:text-cyan-300 underline underline-offset-2"
          >
            {ADMIN_NOTIFICATION_EMAIL}
          </a>
        </p>
        <p className="text-[11px] text-slate-500">
          Automatic Signup (Tier 1: 1,000–49,999 kWh Annually) • Live
          Reservable Quotes &amp; 24-Hr Pricing/Usage Validation (Tiers 2–6:
          50,000–3,000,000 kWh Annually) • © {new Date().getFullYear()}{" "}
          energychoice.us
        </p>
      </div>
    </footer>
  );
};
