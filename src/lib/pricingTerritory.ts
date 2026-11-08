/**
 * SERVER-ONLY TERRITORY PRICING ANCHORS
 * True Commercial Energy-Only Supply Cost Rates (¢/kWh) before Tier Mils Markup.
 * Excludes all TDSP/utility delivery charges, surcharges, and residential fees.
 * Never import this module into client-side components.
 */
export interface TerritoryCommercialProfile {
  region: string;
  iso: string;
  isTexasErcot: boolean;
  commercialSupplyBaseCents: number;
}

export function resolveTerritoryByZip(zip: string): TerritoryCommercialProfile {
  const prefix = parseInt(zip.slice(0, 3), 10);

  if (prefix >= 750 && prefix <= 759) {
    return {
      region: "North Texas (Oncor TDSP)",
      iso: "ERCOT",
      isTexasErcot: true,
      commercialSupplyBaseCents: 7.45,
    };
  }
  if (prefix >= 760 && prefix <= 769) {
    return {
      region: "DFW West / Central Texas (Oncor / TNMP)",
      iso: "ERCOT",
      isTexasErcot: true,
      commercialSupplyBaseCents: 7.55,
    };
  }
  if (prefix >= 770 && prefix <= 779) {
    return {
      region: "Houston Metro / Gulf Coast (CenterPoint / TNMP)",
      iso: "ERCOT",
      isTexasErcot: true,
      commercialSupplyBaseCents: 7.65,
    };
  }
  if (prefix >= 780 && prefix <= 799) {
    return {
      region: "South & West Texas (AEP Texas / TNMP)",
      iso: "ERCOT",
      isTexasErcot: true,
      commercialSupplyBaseCents: 7.8,
    };
  }
  if (prefix >= 150 && prefix <= 196) {
    return {
      region: "Pennsylvania (PECO / PPL / FirstEnergy)",
      iso: "PJM",
      isTexasErcot: false,
      commercialSupplyBaseCents: 8.35,
    };
  }
  if (prefix >= 430 && prefix <= 459) {
    return {
      region: "Ohio (AEP Ohio / Duke / FirstEnergy)",
      iso: "PJM",
      isTexasErcot: false,
      commercialSupplyBaseCents: 7.25,
    };
  }
  if (prefix >= 600 && prefix <= 629) {
    return {
      region: "Illinois (ComEd / Ameren)",
      iso: "PJM/MISO",
      isTexasErcot: false,
      commercialSupplyBaseCents: 7.75,
    };
  }
  if (prefix >= 100 && prefix <= 149) {
    return {
      region: "New York (ConEd / National Grid)",
      iso: "NYISO",
      isTexasErcot: false,
      commercialSupplyBaseCents: 10.15,
    };
  }
  if (prefix >= 70 && prefix <= 89) {
    return {
      region: "New Jersey (PSE&G / JCP&L)",
      iso: "PJM",
      isTexasErcot: false,
      commercialSupplyBaseCents: 9.25,
    };
  }
  if (prefix >= 206 && prefix <= 219) {
    return {
      region: "Maryland (BGE / Pepco)",
      iso: "PJM",
      isTexasErcot: false,
      commercialSupplyBaseCents: 8.95,
    };
  }
  if (prefix >= 10 && prefix <= 27) {
    return {
      region: "Massachusetts (Eversource / National Grid)",
      iso: "ISO-NE",
      isTexasErcot: false,
      commercialSupplyBaseCents: 11.95,
    };
  }

  return {
    region: "US Deregulated Supply Desk",
    iso: "NATIONAL",
    isTexasErcot: false,
    commercialSupplyBaseCents: 8.45,
  };
}
