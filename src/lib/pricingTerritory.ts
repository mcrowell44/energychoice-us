/**
 * SERVER-ONLY TERRITORY PRICING ANCHORS
 * Never import this module into client-side components.
 */
export function resolveTerritoryByZip(zip: string): {
  region: string;
  iso: string;
  isTexasErcot: boolean;
  tdspDeliveryEstimateCents: number;
  tier1Base1000Cents: number;
  tier2CommercialBaseCents: number;
  deskRangeBasis: string;
} {
  const prefix = parseInt(zip.slice(0, 3), 10);

  if (prefix >= 750 && prefix <= 759) {
    return {
      region: "North Texas (Oncor TDSP)",
      iso: "ERCOT",
      isTexasErcot: true,
      tdspDeliveryEstimateCents: 4.35,
      tier1Base1000Cents: 11.9,
      tier2CommercialBaseCents: 7.45,
      deskRangeBasis: "6.1¢ – 7.3¢ / kWh",
    };
  }
  if (prefix >= 760 && prefix <= 769) {
    return {
      region: "DFW West / Central Texas (Oncor / TNMP)",
      iso: "ERCOT",
      isTexasErcot: true,
      tdspDeliveryEstimateCents: 4.45,
      tier1Base1000Cents: 12.1,
      tier2CommercialBaseCents: 7.55,
      deskRangeBasis: "6.2¢ – 7.4¢ / kWh",
    };
  }
  if (prefix >= 770 && prefix <= 779) {
    return {
      region: "Houston Metro / Gulf Coast (CenterPoint / TNMP)",
      iso: "ERCOT",
      isTexasErcot: true,
      tdspDeliveryEstimateCents: 4.55,
      tier1Base1000Cents: 12.3,
      tier2CommercialBaseCents: 7.65,
      deskRangeBasis: "6.3¢ – 7.6¢ / kWh",
    };
  }
  if (prefix >= 780 && prefix <= 799) {
    return {
      region: "South & West Texas (AEP Texas / TNMP)",
      iso: "ERCOT",
      isTexasErcot: true,
      tdspDeliveryEstimateCents: 4.75,
      tier1Base1000Cents: 12.6,
      tier2CommercialBaseCents: 7.8,
      deskRangeBasis: "6.4¢ – 7.8¢ / kWh",
    };
  }
  if (prefix >= 150 && prefix <= 196) {
    return {
      region: "Pennsylvania (PECO / PPL / FirstEnergy)",
      iso: "PJM",
      isTexasErcot: false,
      tdspDeliveryEstimateCents: 0,
      tier1Base1000Cents: 10.4,
      tier2CommercialBaseCents: 8.35,
      deskRangeBasis: "6.9¢ – 8.2¢ / kWh",
    };
  }
  if (prefix >= 430 && prefix <= 459) {
    return {
      region: "Ohio (AEP Ohio / Duke / FirstEnergy)",
      iso: "PJM",
      isTexasErcot: false,
      tdspDeliveryEstimateCents: 0,
      tier1Base1000Cents: 8.9,
      tier2CommercialBaseCents: 7.25,
      deskRangeBasis: "5.9¢ – 7.1¢ / kWh",
    };
  }
  if (prefix >= 600 && prefix <= 629) {
    return {
      region: "Illinois (ComEd / Ameren)",
      iso: "PJM/MISO",
      isTexasErcot: false,
      tdspDeliveryEstimateCents: 0,
      tier1Base1000Cents: 9.4,
      tier2CommercialBaseCents: 7.75,
      deskRangeBasis: "6.4¢ – 7.6¢ / kWh",
    };
  }
  if (prefix >= 100 && prefix <= 149) {
    return {
      region: "New York (ConEd / National Grid)",
      iso: "NYISO",
      isTexasErcot: false,
      tdspDeliveryEstimateCents: 0,
      tier1Base1000Cents: 12.8,
      tier2CommercialBaseCents: 10.15,
      deskRangeBasis: "8.5¢ – 10.1¢ / kWh",
    };
  }
  if (prefix >= 70 && prefix <= 89) {
    return {
      region: "New Jersey (PSE&G / JCP&L)",
      iso: "PJM",
      isTexasErcot: false,
      tdspDeliveryEstimateCents: 0,
      tier1Base1000Cents: 11.6,
      tier2CommercialBaseCents: 9.25,
      deskRangeBasis: "7.8¢ – 9.1¢ / kWh",
    };
  }
  if (prefix >= 206 && prefix <= 219) {
    return {
      region: "Maryland (BGE / Pepco)",
      iso: "PJM",
      isTexasErcot: false,
      tdspDeliveryEstimateCents: 0,
      tier1Base1000Cents: 11.1,
      tier2CommercialBaseCents: 8.95,
      deskRangeBasis: "7.5¢ – 8.8¢ / kWh",
    };
  }
  if (prefix >= 10 && prefix <= 27) {
    return {
      region: "Massachusetts (Eversource / National Grid)",
      iso: "ISO-NE",
      isTexasErcot: false,
      tdspDeliveryEstimateCents: 0,
      tier1Base1000Cents: 14.4,
      tier2CommercialBaseCents: 11.95,
      deskRangeBasis: "10.2¢ – 11.8¢ / kWh",
    };
  }

  return {
    region: "US Deregulated Supply Desk",
    iso: "NATIONAL",
    isTexasErcot: false,
    tdspDeliveryEstimateCents: 0,
    tier1Base1000Cents: 11.2,
    tier2CommercialBaseCents: 8.45,
    deskRangeBasis: "6.8¢ – 8.3¢ / kWh",
  };
}

