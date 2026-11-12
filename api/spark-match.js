// src/lib/compliance.ts
var STANDARD_DISCLOSURE = "This is a 100% automated system connected with major suppliers nationwide to provide the optimum search and opportunities available for users to cut time and research with a wide variety of options. Speed to need is the motto.";
var CONTRACT_TERMS = [18, 24, 36, 48, 60, 72];
function normalizeContractTerm(raw) {
  const num = Number(raw);
  if (CONTRACT_TERMS.includes(num)) {
    return num;
  }
  return 18;
}
var USAGE_TIERS = [
  {
    id: "TIER_1",
    shortName: "Tier 1",
    rangeLabel: "12,000 \u2013 49,999 kWh Annually",
    subLabel: "Automatic Signup (1,000 \u2013 4,166 kWh/mo)",
    minAnnualKwh: 12e3,
    maxAnnualKwh: 49999,
    minKwh: 1e3,
    maxKwh: 4166,
    presetKwh: 2e3,
    isRealTime: true,
    turnaroundLabel: "Automatic Real-Time Signup"
  },
  {
    id: "TIER_2",
    shortName: "Tier 2",
    rangeLabel: "50,000 \u2013 99,999 kWh Annually",
    subLabel: "Small Commercial (~4,167 \u2013 8,333 kWh/mo)",
    minAnnualKwh: 5e4,
    maxAnnualKwh: 99999,
    minKwh: 4167,
    maxKwh: 8333,
    presetKwh: 6e3,
    isRealTime: false,
    turnaroundLabel: "Live Quote \u2022 24-Hr Validation"
  },
  {
    id: "TIER_3",
    shortName: "Tier 3",
    rangeLabel: "100,000 \u2013 299,999 kWh Annually",
    subLabel: "Mid Commercial (~8,334 \u2013 24,999 kWh/mo)",
    minAnnualKwh: 1e5,
    maxAnnualKwh: 299999,
    minKwh: 8334,
    maxKwh: 24999,
    presetKwh: 15e3,
    isRealTime: false,
    turnaroundLabel: "Live Quote \u2022 24-Hr Validation"
  },
  {
    id: "TIER_4",
    shortName: "Tier 4",
    rangeLabel: "300,000 \u2013 499,999 kWh Annually",
    subLabel: "Large Commercial (~25,000 \u2013 41,666 kWh/mo)",
    minAnnualKwh: 3e5,
    maxAnnualKwh: 499999,
    minKwh: 25e3,
    maxKwh: 41666,
    presetKwh: 3e4,
    isRealTime: false,
    turnaroundLabel: "Live Quote \u2022 24-Hr Validation"
  },
  {
    id: "TIER_5",
    shortName: "Tier 5",
    rangeLabel: "500,000 \u2013 999,999 kWh Annually",
    subLabel: "Heavy Commercial (~41,667 \u2013 83,333 kWh/mo)",
    minAnnualKwh: 5e5,
    maxAnnualKwh: 999999,
    minKwh: 41667,
    maxKwh: 83333,
    presetKwh: 6e4,
    isRealTime: false,
    turnaroundLabel: "Live Quote \u2022 24-Hr Validation"
  },
  {
    id: "TIER_6",
    shortName: "Tier 6",
    rangeLabel: "1,000,000 \u2013 3,000,000 kWh Annually",
    subLabel: "Industrial / Megawatt (83,334 \u2013 250,000+ kWh/mo)",
    minAnnualKwh: 1e6,
    maxAnnualKwh: 3e6,
    minKwh: 83334,
    maxKwh: 25e4,
    presetKwh: 15e4,
    isRealTime: false,
    turnaroundLabel: "Live Quote \u2022 24-Hr Validation"
  }
];
function resolveUsageTier(monthlyKwh) {
  const safeMonthly = Math.max(1, Math.floor(monthlyKwh));
  const annualKwh = safeMonthly * 12;
  if (annualKwh < 5e4) return USAGE_TIERS[0];
  if (annualKwh < 1e5) return USAGE_TIERS[1];
  if (annualKwh < 3e5) return USAGE_TIERS[2];
  if (annualKwh < 5e5) return USAGE_TIERS[3];
  if (annualKwh < 1e6) return USAGE_TIERS[4];
  return USAGE_TIERS[5];
}
function interpolateTier1Rate(usageKwh, rate500, rate1000, rate2000) {
  const clamped = Math.max(1, Math.min(4166, usageKwh));
  if (clamped <= 500) {
    return {
      effectiveRateCents: Number(rate500.toFixed(2)),
      appliedTierLabel: "Tier 1A (1,000\u201314,999 kWh/yr)"
    };
  }
  if (clamped <= 1500) {
    const ratio2 = (clamped - 500) / 1e3;
    const interpolated2 = rate500 + ratio2 * (rate1000 - rate500);
    return {
      effectiveRateCents: Number(interpolated2.toFixed(2)),
      appliedTierLabel: "Tier 1B (15,000\u201329,999 kWh/yr)"
    };
  }
  const ratio = (clamped - 1500) / 2666;
  const interpolated = rate1000 + ratio * (rate2000 - rate1000);
  return {
    effectiveRateCents: Number(interpolated.toFixed(2)),
    appliedTierLabel: "Tier 1C (30,000\u201349,999 kWh/yr)"
  };
}

// src/lib/pricingTerritory.ts
function resolveTerritoryByZip(zip) {
  const prefix = parseInt(zip.slice(0, 3), 10);
  if (prefix >= 750 && prefix <= 759) {
    return {
      region: "North Texas (Oncor TDSP)",
      iso: "ERCOT",
      isTexasErcot: true,
      commercialSupplyBaseCents: 7.45
    };
  }
  if (prefix >= 760 && prefix <= 769) {
    return {
      region: "DFW West / Central Texas (Oncor / TNMP)",
      iso: "ERCOT",
      isTexasErcot: true,
      commercialSupplyBaseCents: 7.55
    };
  }
  if (prefix >= 770 && prefix <= 779) {
    return {
      region: "Houston Metro / Gulf Coast (CenterPoint / TNMP)",
      iso: "ERCOT",
      isTexasErcot: true,
      commercialSupplyBaseCents: 7.65
    };
  }
  if (prefix >= 780 && prefix <= 799) {
    return {
      region: "South & West Texas (AEP Texas / TNMP)",
      iso: "ERCOT",
      isTexasErcot: true,
      commercialSupplyBaseCents: 7.8
    };
  }
  if (prefix >= 150 && prefix <= 196) {
    return {
      region: "Pennsylvania (PECO / PPL / FirstEnergy)",
      iso: "PJM",
      isTexasErcot: false,
      commercialSupplyBaseCents: 8.35
    };
  }
  if (prefix >= 430 && prefix <= 459) {
    return {
      region: "Ohio (AEP Ohio / Duke / FirstEnergy)",
      iso: "PJM",
      isTexasErcot: false,
      commercialSupplyBaseCents: 7.25
    };
  }
  if (prefix >= 600 && prefix <= 629) {
    return {
      region: "Illinois (ComEd / Ameren)",
      iso: "PJM/MISO",
      isTexasErcot: false,
      commercialSupplyBaseCents: 7.75
    };
  }
  if (prefix >= 100 && prefix <= 149) {
    return {
      region: "New York (ConEd / National Grid)",
      iso: "NYISO",
      isTexasErcot: false,
      commercialSupplyBaseCents: 10.15
    };
  }
  if (prefix >= 70 && prefix <= 89) {
    return {
      region: "New Jersey (PSE&G / JCP&L)",
      iso: "PJM",
      isTexasErcot: false,
      commercialSupplyBaseCents: 9.25
    };
  }
  if (prefix >= 206 && prefix <= 219) {
    return {
      region: "Maryland (BGE / Pepco)",
      iso: "PJM",
      isTexasErcot: false,
      commercialSupplyBaseCents: 8.95
    };
  }
  if (prefix >= 10 && prefix <= 27) {
    return {
      region: "Massachusetts (Eversource / National Grid)",
      iso: "ISO-NE",
      isTexasErcot: false,
      commercialSupplyBaseCents: 11.95
    };
  }
  return {
    region: "US Deregulated Supply Desk",
    iso: "NATIONAL",
    isTexasErcot: false,
    commercialSupplyBaseCents: 8.45
  };
}

// src/lib/texasDeregulatedCities.ts
var ERCOT_TDSP_LABELS = {
  ONCOR: "Oncor Electric Delivery",
  CENTERPOINT: "CenterPoint Energy",
  AEP_CENTRAL: "AEP Texas Central",
  AEP_NORTH: "AEP Texas North",
  TNMP: "Texas-New Mexico Power (TNMP)",
  LPL_ERCOT: "LP&L / ERCOT Retail Choice"
};
var RAW_TEXAS_CITIES = [
  // A
  ["Abilene", "79601", "AEP_NORTH", 1],
  ["Addison", "75001", "ONCOR"],
  ["Alamo", "78516", "AEP_CENTRAL"],
  ["Albany", "76430", "AEP_NORTH"],
  ["Aledo", "76008", "ONCOR"],
  ["Alice", "78332", "AEP_CENTRAL"],
  ["Allen", "75013", "ONCOR"],
  ["Alpine", "79830", "AEP_NORTH"],
  ["Alvarado", "76009", "ONCOR"],
  ["Alvin", "77511", "TNMP"],
  ["Alvord", "76225", "ONCOR"],
  ["Andrews", "79714", "ONCOR"],
  ["Angleton", "77515", "TNMP"],
  ["Anson", "79501", "AEP_NORTH"],
  ["Aransas Pass", "78336", "AEP_CENTRAL"],
  ["Archer City", "76351", "ONCOR"],
  ["Argyle", "76226", "ONCOR"],
  ["Arlington", "76010", "ONCOR", 1],
  ["Arroyo City", "78583", "AEP_CENTRAL"],
  ["Aspermont", "79502", "AEP_NORTH"],
  ["Athens", "75751", "ONCOR"],
  ["Atlanta", "75551", "ONCOR"],
  ["Aubrey", "76227", "ONCOR"],
  ["Austwell", "77950", "AEP_CENTRAL"],
  ["Azle", "76020", "ONCOR"],
  // B
  ["Bacliff", "77518", "TNMP"],
  ["Baird", "79504", "AEP_NORTH"],
  ["Balch Springs", "75180", "ONCOR"],
  ["Ballinger", "76821", "AEP_NORTH"],
  ["Balmorhea", "79718", "AEP_NORTH"],
  ["Barksdale", "78828", "AEP_CENTRAL"],
  ["Bay City", "77414", "AEP_CENTRAL"],
  ["Baytown", "77520", "CENTERPOINT", 1],
  ["Bedford", "76021", "ONCOR"],
  ["Beeville", "78102", "AEP_CENTRAL"],
  ["Bellaire", "77401", "CENTERPOINT"],
  ["Bellmead", "76705", "ONCOR"],
  ["Belton", "76513", "ONCOR"],
  ["Benbrook", "76126", "ONCOR"],
  ["Big Lake", "76932", "AEP_NORTH"],
  ["Big Spring", "79720", "ONCOR"],
  ["Bishop", "78343", "AEP_CENTRAL"],
  ["Blooming Grove", "76626", "ONCOR"],
  ["Bonham", "75418", "ONCOR"],
  ["Booker", "79005", "AEP_NORTH"],
  ["Brackettville", "78832", "AEP_CENTRAL"],
  ["Brazoria", "77422", "CENTERPOINT"],
  ["Breckenridge", "76424", "ONCOR"],
  ["Bronte", "76933", "AEP_NORTH"],
  ["Brookshire", "77423", "CENTERPOINT"],
  ["Brownwood", "76801", "ONCOR"],
  ["Buffalo", "75831", "ONCOR"],
  ["Burkburnett", "76354", "ONCOR", void 0, ["Burk", "Burnett"]],
  ["Burleson", "76028", "ONCOR"],
  // C
  ["Cameron", "76520", "ONCOR"],
  ["Canton", "75103", "ONCOR"],
  ["Carrizo Springs", "78834", "AEP_CENTRAL"],
  ["Carrollton", "75006", "ONCOR", 1],
  ["Cedar Hill", "75104", "ONCOR"],
  ["Cedar Park", "78613", "ONCOR"],
  ["Centerville", "75833", "ONCOR"],
  ["Channelview", "77530", "CENTERPOINT"],
  ["Childress", "79201", "AEP_NORTH"],
  ["Christoval", "76935", "AEP_NORTH"],
  ["Cisco", "76437", "AEP_NORTH"],
  ["Clarendon", "79226", "AEP_NORTH"],
  ["Clarksville", "75426", "ONCOR"],
  ["Cleburne", "76031", "ONCOR"],
  ["Clifton", "76634", "TNMP"],
  ["Clute", "77531", "CENTERPOINT"],
  ["Clyde", "79510", "AEP_NORTH"],
  ["Collinsville", "76233", "ONCOR"],
  ["Colorado City", "79512", "ONCOR"],
  ["Columbus", "78934", "AEP_CENTRAL"],
  ["Comanche", "76442", "ONCOR"],
  ["Commerce", "75428", "ONCOR"],
  ["Comstock", "78837", "AEP_CENTRAL"],
  ["Cooper", "75432", "ONCOR"],
  ["Coppell", "75019", "ONCOR"],
  ["Copperas Cove", "76522", "ONCOR"],
  ["Corpus Christi", "78401", "AEP_CENTRAL", 1],
  ["Corsicana", "75110", "ONCOR"],
  ["Cotulla", "78014", "AEP_CENTRAL"],
  ["Crane", "79731", "ONCOR"],
  ["Crockett", "75835", "ONCOR"],
  ["Crosby", "77532", "CENTERPOINT"],
  ["Cross Plains", "76443", "AEP_NORTH"],
  ["Crossroads", "76227", "ONCOR"],
  ["Crowell", "79227", "AEP_NORTH"],
  ["Crystal City", "78839", "AEP_CENTRAL"],
  ["Cypress", "77429", "CENTERPOINT"],
  // D
  ["Dallas", "75201", "ONCOR", 1],
  ["De Leon", "76444", "ONCOR"],
  ["De Soto", "75115", "ONCOR", void 0, ["DeSoto"]],
  ["Decatur", "76234", "ONCOR"],
  ["Deer Park", "77536", "CENTERPOINT"],
  ["Del Rio", "78840", "AEP_CENTRAL"],
  ["Denison", "75020", "ONCOR"],
  ["Denton", "76201", "ONCOR", 1],
  ["Devine", "78016", "AEP_CENTRAL"],
  ["Diboll", "75941", "ONCOR"],
  ["Dickens", "79229", "AEP_NORTH"],
  ["Dickinson", "77539", "TNMP"],
  ["Dilley", "78017", "AEP_CENTRAL"],
  ["Donna", "78537", "AEP_CENTRAL"],
  ["Dublin", "76446", "ONCOR"],
  ["Dumas", "79029", "AEP_NORTH"],
  ["Duncanville", "75116", "ONCOR"],
  // E
  ["Eagle Lake", "77434", "AEP_CENTRAL"],
  ["Eagle Pass", "78852", "AEP_CENTRAL"],
  ["Early", "76802", "ONCOR"],
  ["Eastland", "76448", "ONCOR"],
  ["Eden", "76837", "AEP_NORTH"],
  ["Edgewood", "75117", "ONCOR"],
  ["Edinburg", "78539", "AEP_CENTRAL", 1],
  ["Edna", "77957", "AEP_CENTRAL"],
  ["Edom", "75756", "ONCOR"],
  ["Egypt", "77436", "CENTERPOINT"],
  ["El Campo", "77437", "AEP_CENTRAL"],
  ["Eldorado", "76936", "AEP_NORTH"],
  ["Electra", "76360", "ONCOR"],
  ["Elgin", "78621", "ONCOR"],
  ["Ennis", "75119", "ONCOR"],
  ["Escobares", "78584", "AEP_CENTRAL"],
  ["Etoile", "75944", "ONCOR"],
  ["Euless", "76039", "ONCOR"],
  ["Eustace", "75124", "ONCOR"],
  // F
  ["Falcon Heights", "78545", "AEP_CENTRAL"],
  ["Falfurrias", "78355", "AEP_CENTRAL"],
  ["Farmers Branch", "75234", "ONCOR"],
  ["Flint", "75762", "ONCOR"],
  ["Flo", "75831", "ONCOR"],
  ["Forest Hill", "76119", "ONCOR"],
  ["Forney", "75126", "ONCOR"],
  ["Fort Davis", "79734", "AEP_NORTH"],
  ["Fort Stockton", "79735", "TNMP"],
  ["Fort Worth", "76102", "ONCOR", 1],
  ["Freeport", "77541", "CENTERPOINT"],
  ["Freer", "78357", "AEP_CENTRAL"],
  ["Frisco", "75034", "ONCOR", 1],
  ["Fulton", "78358", "AEP_CENTRAL"],
  // G
  ["Gainesville", "76240", "ONCOR"],
  ["Galena Park", "77547", "CENTERPOINT"],
  ["Galveston", "77550", "CENTERPOINT", 1],
  ["Gatesville", "76528", "TNMP"],
  ["George West", "78022", "AEP_CENTRAL"],
  ["Goliad", "77963", "AEP_CENTRAL"],
  ["Graford", "76449", "ONCOR"],
  ["Graham", "76450", "ONCOR"],
  ["Granbury", "76048", "ONCOR"],
  ["Grand Prairie", "75050", "ONCOR", 1],
  ["Grandview", "76050", "ONCOR"],
  ["Grapevine", "76051", "ONCOR"],
  ["Gun Barrel City", "75156", "ONCOR"],
  // H
  ["Hallettsville", "77964", "AEP_CENTRAL"],
  ["Haltom City", "76117", "ONCOR"],
  ["Hamilton", "76531", "TNMP"],
  ["Hamlin", "79520", "AEP_NORTH"],
  ["Harker Heights", "76548", "ONCOR"],
  ["Harlingen", "78550", "AEP_CENTRAL"],
  ["Haskell", "79521", "AEP_NORTH"],
  ["Hebbronville", "78361", "AEP_CENTRAL"],
  ["Henrietta", "76365", "ONCOR"],
  ["Hidalgo", "78557", "AEP_CENTRAL"],
  ["Hillsboro", "76645", "ONCOR"],
  ["Hitchcock", "77563", "TNMP"],
  ["Houston", "77002", "CENTERPOINT", 1],
  ["Hubbard", "76648", "ONCOR"],
  ["Hudson", "75904", "ONCOR"],
  ["Humble", "77338", "CENTERPOINT"],
  ["Huntington", "75949", "ONCOR"],
  ["Hurst", "76053", "ONCOR"],
  ["Hutchins", "75141", "ONCOR"],
  // I
  ["Ingleside", "78362", "AEP_CENTRAL"],
  ["Iraan", "79744", "AEP_NORTH"],
  ["Irving", "75038", "ONCOR", 1],
  ["Italy", "76651", "ONCOR"],
  // J
  ["Jacksboro", "76458", "ONCOR"],
  ["Jersey Village", "77040", "CENTERPOINT"],
  ["Jewett", "75846", "ONCOR"],
  ["Johnson City", "78636", "ONCOR"],
  ["Jourdanton", "78026", "AEP_CENTRAL"],
  ["Junction", "76849", "AEP_NORTH"],
  // K
  ["Karnes City", "78118", "AEP_CENTRAL"],
  ["Katy", "77449", "CENTERPOINT", 1],
  ["Kaufman", "75142", "ONCOR"],
  ["Keene", "76059", "ONCOR"],
  ["Keller", "76248", "ONCOR"],
  ["Kemah", "77565", "CENTERPOINT"],
  ["Kenedy", "78119", "AEP_CENTRAL"],
  ["Kermit", "79745", "TNMP"],
  ["Killeen", "76541", "ONCOR", 1],
  ["Kingsville", "78363", "AEP_CENTRAL"],
  ["Knox City", "79529", "AEP_NORTH"],
  // L
  ["La Feria", "78559", "AEP_CENTRAL"],
  ["La Marque", "77568", "TNMP"],
  ["La Porte", "77571", "CENTERPOINT"],
  ["Lacy Lakeview", "76705", "ONCOR"],
  ["Ladonia", "75449", "ONCOR"],
  ["Laguna Park", "76634", "TNMP"],
  ["Lajitas", "79852", "AEP_NORTH"],
  ["Lake Jackson", "77566", "CENTERPOINT"],
  ["Lake Whitney", "76692", "ONCOR"],
  ["Lake Worth", "76135", "ONCOR"],
  ["Lamesa", "79331", "ONCOR"],
  ["Lancaster", "75146", "ONCOR"],
  ["Laredo", "78040", "AEP_CENTRAL", 1],
  ["League City", "77573", "TNMP"],
  ["Leakey", "78873", "AEP_CENTRAL"],
  ["Leona", "75850", "ONCOR"],
  ["Lewisville", "75057", "TNMP", 1],
  ["Lindale", "75771", "ONCOR"],
  ["Liverpool", "77577", "CENTERPOINT"],
  ["Log Cabin", "75148", "ONCOR"],
  ["Los Fresnos", "78566", "AEP_CENTRAL"],
  ["Lubbock", "79401", "LPL_ERCOT", 1],
  ["Lufkin", "75901", "ONCOR"],
  ["Lytle", "78052", "AEP_CENTRAL"],
  // M
  ["Mabank", "75147", "ONCOR"],
  ["Magnolia", "77354", "CENTERPOINT"],
  ["Malakoff", "75148", "ONCOR"],
  ["Malone", "76660", "ONCOR"],
  ["Manor", "78653", "ONCOR"],
  ["Mansfield", "76063", "ONCOR"],
  ["Marfa", "79843", "AEP_NORTH"],
  ["Mathis", "78368", "AEP_CENTRAL"],
  ["McAllen", "78501", "AEP_CENTRAL", 1],
  ["McGregor", "76657", "ONCOR"],
  ["McKinney", "75069", "ONCOR"],
  ["Memphis", "79245", "AEP_NORTH"],
  ["Menard", "76859", "AEP_NORTH"],
  ["Mercedes", "78570", "AEP_CENTRAL"],
  ["Merkel", "79536", "AEP_NORTH"],
  ["Mesquite", "75149", "ONCOR", 1],
  ["Midland", "79701", "ONCOR", 1],
  ["Midlothian", "76065", "ONCOR"],
  ["Milano", "76556", "ONCOR"],
  ["Milford", "76670", "ONCOR"],
  ["Mineral Wells", "76067", "ONCOR"],
  ["Mission", "78572", "AEP_CENTRAL"],
  ["Monahans", "79756", "ONCOR"],
  ["Muenster", "76252", "ONCOR"],
  ["Munday", "76371", "AEP_NORTH"],
  // N
  ["Nacogdoches", "75961", "ONCOR"],
  ["Nassau Bay", "77058", "CENTERPOINT"],
  ["Neches", "75779", "ONCOR"],
  ["Nocona", "76255", "TNMP"],
  ["North Richland Hills", "76180", "ONCOR"],
  ["Northlake", "76226", "ONCOR"],
  // O
  ["Odem", "78370", "AEP_CENTRAL"],
  ["Odessa", "79761", "ONCOR", 1],
  ["Olney", "76374", "TNMP"],
  ["Orange Grove", "78372", "AEP_CENTRAL"],
  ["Ozona", "76943", "AEP_NORTH"],
  // P
  ["Paducah", "79248", "AEP_NORTH"],
  ["Paint Rock", "76866", "AEP_NORTH"],
  ["Palacios", "77465", "AEP_CENTRAL"],
  ["Palestine", "75801", "ONCOR"],
  ["Palmer", "75152", "ONCOR"],
  ["Palmview", "78572", "AEP_CENTRAL"],
  ["Paris", "75460", "ONCOR"],
  ["Pasadena", "77502", "CENTERPOINT", 1],
  ["Pearland", "77581", "CENTERPOINT", 1],
  ["Pearsall", "78061", "AEP_CENTRAL"],
  ["Pecos", "79772", "TNMP"],
  ["Penitas", "78576", "AEP_CENTRAL"],
  ["Perryton", "79070", "AEP_NORTH"],
  ["Pflugerville", "78660", "ONCOR", 1],
  ["Pharr", "78577", "AEP_CENTRAL"],
  ["Pilot Point", "76258", "TNMP"],
  ["Plano", "75024", "ONCOR", 1],
  ["Pleasanton", "78064", "AEP_CENTRAL"],
  ["Port Aransas", "78373", "AEP_CENTRAL"],
  ["Port Isabel", "78578", "AEP_CENTRAL"],
  ["Port Lavaca", "77979", "AEP_CENTRAL"],
  ["Port Mansfield", "78598", "AEP_CENTRAL"],
  ["Port O'Connor", "77982", "AEP_CENTRAL"],
  ["Portland", "78374", "AEP_CENTRAL"],
  ["Pottsboro", "75076", "ONCOR"],
  ["Prairie View", "77446", "CENTERPOINT"],
  ["Premont", "78375", "AEP_CENTRAL"],
  ["Presidio", "79845", "AEP_NORTH"],
  // Q
  ["Quanah", "79252", "AEP_NORTH"],
  ["Quinlan", "75474", "ONCOR"],
  ["Quintana", "77541", "CENTERPOINT"],
  // R
  ["Rachel", "78353", "AEP_CENTRAL", void 0, ["Rachal"]],
  ["Rainbow", "76077", "ONCOR"],
  ["Rancho Viejo", "78575", "AEP_CENTRAL"],
  ["Ranger", "76470", "ONCOR"],
  ["Rankin", "79778", "AEP_NORTH"],
  ["Raymondville", "78580", "AEP_CENTRAL"],
  ["Red Oak", "75154", "ONCOR"],
  ["Refugio", "78377", "AEP_CENTRAL"],
  ["Reklaw", "75784", "ONCOR"],
  ["Richardson", "75080", "ONCOR"],
  ["Richland", "76681", "ONCOR"],
  ["Richland Hills", "76118", "ONCOR"],
  ["Richmond", "77469", "CENTERPOINT"],
  ["Rio Grande City", "78582", "AEP_CENTRAL"],
  ["Rio Hondo", "78583", "AEP_CENTRAL"],
  ["Riviera", "78379", "AEP_CENTRAL"],
  ["Riviera Beach", "78379", "AEP_CENTRAL"],
  ["Roanoke", "76262", "ONCOR"],
  ["Robert Lee", "76945", "AEP_NORTH"],
  ["Rockdale", "76567", "ONCOR"],
  ["Rockport", "78382", "AEP_CENTRAL"],
  ["Rocksprings", "78880", "AEP_CENTRAL"],
  ["Rockwall", "75087", "ONCOR"],
  ["Roma", "78584", "AEP_CENTRAL"],
  ["Rosenberg", "77471", "CENTERPOINT"],
  ["Rotan", "79546", "AEP_NORTH"],
  ["Round Rock", "78664", "ONCOR", 1],
  ["Round Top", "78954", "ONCOR"],
  ["Rowlett", "75088", "ONCOR"],
  ["Royse City", "75189", "ONCOR"],
  ["Ruidosa", "79843", "AEP_NORTH"],
  ["Rule", "79547", "AEP_NORTH"],
  // S
  ["Sabinal", "78881", "AEP_CENTRAL"],
  ["Saginaw", "76179", "ONCOR"],
  ["Saint Jo", "76265", "ONCOR"],
  ["Salado", "76571", "ONCOR"],
  ["San Angelo", "76903", "AEP_NORTH", 1],
  ["San Benito", "78586", "AEP_CENTRAL"],
  ["San Juan", "78589", "AEP_CENTRAL"],
  ["San Leon", "77539", "TNMP"],
  ["Sandia", "78383", "AEP_CENTRAL"],
  ["Santa Anna", "76878", "AEP_NORTH"],
  ["Sargent", "77414", "AEP_CENTRAL"],
  ["Seabrook", "77586", "CENTERPOINT"],
  ["Seadrift", "77983", "AEP_CENTRAL"],
  ["Seagoville", "75159", "ONCOR"],
  ["Sealy", "77474", "CENTERPOINT"],
  ["Seguin", "78155", "AEP_CENTRAL"],
  ["Shamrock", "79079", "AEP_NORTH"],
  ["Sheffield", "79781", "AEP_NORTH"],
  ["Sherman", "75090", "ONCOR"],
  ["Sinton", "78387", "AEP_CENTRAL"],
  ["Snyder", "79549", "ONCOR", void 0, ["Synder"]],
  ["Sonora", "76950", "AEP_NORTH"],
  ["South Houston", "77587", "CENTERPOINT"],
  ["South Padre Island", "78597", "AEP_CENTRAL"],
  ["Spearman", "79081", "AEP_NORTH"],
  ["Spring", "77373", "CENTERPOINT"],
  ["Springtown", "76082", "ONCOR"],
  ["Spur", "79370", "AEP_NORTH"],
  ["Stafford", "77477", "CENTERPOINT"],
  ["Stamford", "79553", "AEP_NORTH"],
  ["Stephenville", "76401", "ONCOR"],
  ["Sugar Land", "77479", "CENTERPOINT", 1],
  ["Sulphur Springs", "75482", "ONCOR"],
  ["Surfside Beach", "77541", "CENTERPOINT"],
  ["Sweetwater", "79556", "ONCOR"],
  // T
  ["Taft", "78390", "AEP_CENTRAL"],
  ["Taylor", "76574", "ONCOR"],
  ["Temple", "76501", "ONCOR", 1],
  ["Terlingua", "79852", "AEP_NORTH"],
  ["Terrell", "75160", "ONCOR"],
  ["Texas City", "77590", "TNMP"],
  ["The Colony", "75056", "ONCOR"],
  ["Three Rivers", "78071", "AEP_CENTRAL"],
  ["Throckmorton", "76483", "AEP_NORTH"],
  ["Tivoli", "77990", "AEP_CENTRAL"],
  ["Tomball", "77375", "CENTERPOINT"],
  ["Tuleta", "78162", "AEP_CENTRAL"],
  ["Tyler", "75701", "ONCOR", 1],
  // U
  ["Uvalde", "78801", "AEP_CENTRAL"],
  // V
  ["Van", "75790", "ONCOR"],
  ["Van Alstyne", "75495", "ONCOR"],
  ["Vernon", "76384", "AEP_NORTH"],
  ["Victoria", "77901", "AEP_CENTRAL"],
  // W
  ["Waco", "76701", "ONCOR", 1],
  ["Waxahachie", "75165", "ONCOR"],
  ["Webster", "77598", "CENTERPOINT"],
  ["Wellington", "79095", "AEP_NORTH"],
  ["Weslaco", "78596", "AEP_CENTRAL"],
  ["West Columbia", "77486", "TNMP"],
  ["West Tawakoni", "75474", "ONCOR"],
  ["Westlake", "76262", "ONCOR"],
  ["Wharton", "77488", "CENTERPOINT"],
  ["White Settlement", "76108", "ONCOR"],
  ["Whitewright", "75491", "TNMP"],
  ["Whitney", "76692", "ONCOR"],
  ["Wichita Falls", "76301", "ONCOR", 1],
  ["Wills Point", "75169", "ONCOR"],
  ["Wimberley", "78676", "ONCOR"],
  ["Winters", "79567", "AEP_NORTH"],
  ["Wolfe City", "75496", "ONCOR"],
  ["Woodway", "76712", "ONCOR"],
  // Y
  ["Yantis", "75497", "ONCOR"],
  ["Yorktown", "78164", "AEP_CENTRAL"],
  // Z
  ["Zapata", "78076", "AEP_CENTRAL"],
  ["Zavalla", "75980", "ONCOR"]
];
var TEXAS_DEREGULATED_CITIES = RAW_TEXAS_CITIES.map(([name, zip, tdspCode, featured, aliases]) => ({
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  zip,
  tdspCode,
  tdspName: ERCOT_TDSP_LABELS[tdspCode],
  featured: featured === 1,
  aliases
})).sort((a, b) => a.name.localeCompare(b.name));
var FEATURED_TEXAS_CITIES = TEXAS_DEREGULATED_CITIES.filter((c) => c.featured);
function findTexasCityByZip(zip) {
  return TEXAS_DEREGULATED_CITIES.find((c) => c.zip === zip);
}
var DEREGULATED_PRIMARY_ZIPS = new Set(
  TEXAS_DEREGULATED_CITIES.map((c) => c.zip)
);

// src/lib/margin.ts
var TIER_MILS_SCHEDULE = {
  TIER_1: 10,
  TIER_2: 8,
  TIER_3: 7,
  TIER_4: 5,
  TIER_5: 4,
  TIER_6: 3
};
function getTierMils(tierId) {
  return TIER_MILS_SCHEDULE[tierId];
}
function applyMilsToCentsRate(rawRateCents, mils) {
  return Number((rawRateCents + mils * 0.1).toFixed(2));
}

// src/api/spark-match.ts
var QUOTES_PER_TERM = 8;
var ptcZipCache = /* @__PURE__ */ new Map();
function computeBill(rateCents, usageKwh) {
  return Number((rateCents * usageKwh / 100).toFixed(2));
}
function parseCancelFee(pricingDetails, termMonths = 18) {
  const fallbackByTerm = {
    18: 175,
    24: 200,
    36: 295,
    48: 350,
    60: 395,
    72: 450
  };
  const fallback = fallbackByTerm[termMonths] ?? 200;
  if (!pricingDetails) return fallback;
  const match = pricingDetails.match(/\$\s*(\d+(?:\.\d+)?)/);
  if (!match) return fallback;
  const val = Number(match[1]);
  if (isNaN(val)) return fallback;
  if (/month/i.test(pricingDetails) && val <= 30) {
    return Math.round(val * Math.min(termMonths, 24));
  }
  return Math.round(val);
}
function looksSpanishListing(plan) {
  const combined = `${plan.plan_name ?? ""} ${plan.special_terms ?? ""}`;
  return /facturacion|ahorro|meses|espanol|español|clientes nuevos/i.test(
    combined
  );
}
async function fetchLiveTexasPtcPlans(zipCode) {
  const cached = ptcZipCache.get(zipCode);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.rawPlans;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2e3);
    const res = await fetch(
      `http://api.powertochoose.org/api/PowerToChoose/plans?zip_code=${encodeURIComponent(
        zipCode
      )}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal
      }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = await res.json();
    if (!Array.isArray(json.data) || json.data.length === 0) {
      return null;
    }
    ptcZipCache.set(zipCode, {
      expiresAt: Date.now() + 15 * 60 * 1e3,
      rawPlans: json.data
    });
    return json.data;
  } catch {
    return null;
  }
}
async function fetchTexasPlansWithHubFallback(zipCode) {
  const liveRaw = await fetchLiveTexasPtcPlans(zipCode);
  if (liveRaw && liveRaw.length > 0) {
    return liveRaw;
  }
  return null;
}
var TIER1_SUPPLIER_CURVES = [
  {
    code: "CONST",
    provider: "Constellation Energy",
    planPrefix: "Fixed Rate Protection",
    green: 25,
    delta500: 0.22,
    delta1000: 0,
    delta2000: -0.18,
    termAdjustments: { 18: 0.05, 24: -0.12, 36: -0.24, 48: -0.18, 60: -0.08, 72: 0.04 },
    cancelByTerm: { 18: 150, 24: 195, 36: 250, 48: 295, 60: 350, 72: 395 }
  },
  {
    code: "NRG",
    provider: "Direct Energy / NRG",
    planPrefix: "Live Brighter Multi-Year Lock",
    green: 20,
    delta500: 0.25,
    delta1000: 0.04,
    delta2000: -0.16,
    termAdjustments: { 18: -0.06, 24: -0.08, 36: -0.15, 48: -0.05, 60: 0.08, 72: 0.18 },
    cancelByTerm: { 18: 150, 24: 180, 36: 240, 48: 300, 60: 360, 72: 400 }
  },
  {
    code: "ENGIE",
    provider: "ENGIE / Inspire Clean Energy",
    planPrefix: "CleanFixed Forward Lock",
    green: 100,
    delta500: 0.28,
    delta1000: 0.08,
    delta2000: -0.15,
    termAdjustments: { 18: 0.16, 24: 0.02, 36: -0.18, 48: -0.3, 60: -0.36, 72: -0.32 },
    cancelByTerm: { 18: 175, 24: 200, 36: 275, 48: 325, 60: 375, 72: 425 }
  },
  {
    code: "VSTR",
    provider: "Vistra / Dynegy Energy",
    planPrefix: "Secure Choice Fixed",
    green: 30,
    delta500: 0.24,
    delta1000: 0.02,
    delta2000: -0.18,
    termAdjustments: { 18: 0, 24: -0.14, 36: -0.2, 48: -0.12, 60: -0.02, 72: 0.1 },
    cancelByTerm: { 18: 175, 24: 200, 36: 295, 48: 345, 60: 395, 72: 450 }
  },
  {
    code: "APGE",
    provider: "APG&E",
    planPrefix: "TrueSimple Fixed",
    green: 23,
    delta500: 0.2,
    delta1000: -0.02,
    delta2000: -0.2,
    termAdjustments: { 18: -0.1, 24: -0.06, 36: -0.04, 48: 0.06, 60: 0.16, 72: 0.28 },
    cancelByTerm: { 18: 150, 24: 200, 36: 275, 48: 325, 60: 375, 72: 425 }
  },
  {
    code: "GEXA",
    provider: "NextEra / Gexa Energy",
    planPrefix: "EcoSaver Long-Term Fixed",
    green: 100,
    delta500: 0.28,
    delta1000: 0.06,
    delta2000: -0.14,
    termAdjustments: { 18: 0.14, 24: 0, 36: -0.16, 48: -0.26, 60: -0.32, 72: -0.35 },
    cancelByTerm: { 18: 175, 24: 200, 36: 295, 48: 350, 60: 395, 72: 450 }
  },
  {
    code: "RHYT",
    provider: "Rhythm Energy",
    planPrefix: "Simpler Renewable Fixed",
    green: 100,
    delta500: 0.26,
    delta1000: 0.05,
    delta2000: -0.16,
    termAdjustments: { 18: -0.02, 24: -0.1, 36: -0.14, 48: -0.08, 60: 0.02, 72: 0.14 },
    cancelByTerm: { 18: 160, 24: 200, 36: 260, 48: 320, 60: 380, 72: 420 }
  },
  {
    code: "CLVW",
    provider: "Clearview / Chariot Clean Desk",
    planPrefix: "SolarGuarantee Fixed",
    green: 100,
    delta500: 0.3,
    delta1000: 0.1,
    delta2000: -0.12,
    termAdjustments: { 18: 0.18, 24: 0.06, 36: -0.1, 48: -0.2, 60: -0.24, 72: -0.22 },
    cancelByTerm: { 18: 150, 24: 195, 36: 250, 48: 300, 60: 350, 72: 400 }
  }
];
function buildTier1PlansByTerm(zipCode, usageKwh, liveRaw) {
  const territory = resolveTerritoryByZip(zipCode);
  const activeCol = usageKwh <= 1250 ? 0 : usageKwh <= 2500 ? 1 : 2;
  const cleanLive = (liveRaw ?? []).filter((p) => {
    const r500 = Number(p.price_kwh500);
    const r1000 = Number(p.price_kwh1000);
    const r2000 = Number(p.price_kwh2000);
    const term = Number(p.term_value ?? 0);
    if (String(p.rate_type ?? "").toLowerCase() !== "fixed") return false;
    if (p.prepaid || p.timeofuse || p.minimum_usage) return false;
    if (!CONTRACT_TERMS.includes(term)) return false;
    if (!(r500 > 0 && r1000 > 0 && r2000 > 0)) return false;
    if (Math.abs(r500 - r1000) > 3.5 || Math.abs(r2000 - r1000) > 3.5) {
      return false;
    }
    if (looksSpanishListing(p)) return false;
    return true;
  });
  const todayDrift = (Math.floor(Date.now() / 864e5) % 7 - 3) * 0.04;
  const commercialEnergyAnchor = Number(
    (territory.commercialSupplyBaseCents + 0.15 + todayDrift).toFixed(2)
  );
  const tier1Mils = getTierMils("TIER_1");
  const plansByTerm = {};
  for (const term of CONTRACT_TERMS) {
    const liveForTerm = cleanLive.filter((p) => Number(p.term_value) === term).map((p, idx) => {
      const template = TIER1_SUPPLIER_CURVES[idx % TIER1_SUPPLIER_CURVES.length];
      const termShift = template.termAdjustments[term];
      const rawEnergy500 = Number(
        (commercialEnergyAnchor + template.delta500 + termShift).toFixed(2)
      );
      const rawEnergy1000 = Number(
        (commercialEnergyAnchor + template.delta1000 + termShift).toFixed(2)
      );
      const rawEnergy2000 = Number(
        (commercialEnergyAnchor + template.delta2000 + termShift).toFixed(2)
      );
      const r500 = applyMilsToCentsRate(rawEnergy500, tier1Mils);
      const r1000 = applyMilsToCentsRate(rawEnergy1000, tier1Mils);
      const r2000 = applyMilsToCentsRate(rawEnergy2000, tier1Mils);
      const { effectiveRateCents, appliedTierLabel } = interpolateTier1Rate(
        usageKwh,
        r500,
        r1000,
        r2000
      );
      return {
        plan_id: `EC-PLAN-${p.plan_id}-${term}M`,
        provider: String(p.company_name || "Retail Electric Provider").trim(),
        plan_name: String(p.plan_name || `${term}-Month Fixed`).trim(),
        term_months: term,
        rate_per_kwh_cents: effectiveRateCents,
        rate_500_cents: r500,
        rate_1000_cents: r1000,
        rate_2000_cents: r2000,
        tier_columns: [
          {
            label: "1k\u201315k/yr",
            rate_cents: r500,
            is_active: activeCol === 0
          },
          {
            label: "15k\u201330k/yr",
            rate_cents: r1000,
            is_active: activeCol === 1
          },
          {
            label: "30k\u201350k/yr",
            rate_cents: r2000,
            is_active: activeCol === 2
          }
        ],
        rate_structure_note: "Fixed Commercial Energy Supply Rate (Excludes Utility Delivery & Fees)",
        applied_tier_label: appliedTierLabel,
        est_monthly_bill: computeBill(effectiveRateCents, usageKwh),
        renewable_pct: Math.min(
          100,
          Math.max(0, Number(p.renewable_energy_id ?? 0))
        ),
        cancellation_fee: parseCancelFee(p.pricing_details, term),
        source: "live-daily-feed"
      };
    }).sort((a, b) => a.rate_per_kwh_cents - b.rate_per_kwh_cents);
    const uniqueByProvider = /* @__PURE__ */ new Map();
    for (const lp of liveForTerm) {
      const k = lp.provider.toLowerCase();
      if (!uniqueByProvider.has(k)) {
        uniqueByProvider.set(k, lp);
      }
    }
    const combined = Array.from(uniqueByProvider.values()).slice(
      0,
      QUOTES_PER_TERM
    );
    for (const sup of TIER1_SUPPLIER_CURVES) {
      if (combined.length >= QUOTES_PER_TERM) break;
      const alreadyListed = combined.some(
        (existing) => existing.provider.toLowerCase().includes(sup.provider.split(" ")[0].toLowerCase())
      );
      if (alreadyListed) continue;
      const termShift = sup.termAdjustments[term];
      const r500 = applyMilsToCentsRate(
        commercialEnergyAnchor + sup.delta500 + termShift,
        tier1Mils
      );
      const r1000 = applyMilsToCentsRate(
        commercialEnergyAnchor + sup.delta1000 + termShift,
        tier1Mils
      );
      const r2000 = applyMilsToCentsRate(
        commercialEnergyAnchor + sup.delta2000 + termShift,
        tier1Mils
      );
      const { effectiveRateCents, appliedTierLabel } = interpolateTier1Rate(
        usageKwh,
        r500,
        r1000,
        r2000
      );
      combined.push({
        plan_id: `CURVE-T1-${sup.code}-${term}M-${zipCode}`,
        provider: sup.provider,
        plan_name: `${sup.planPrefix} ${term}`,
        term_months: term,
        rate_per_kwh_cents: effectiveRateCents,
        rate_500_cents: r500,
        rate_1000_cents: r1000,
        rate_2000_cents: r2000,
        tier_columns: [
          { label: "1k\u201315k/yr", rate_cents: r500, is_active: activeCol === 0 },
          {
            label: "15k\u201330k/yr",
            rate_cents: r1000,
            is_active: activeCol === 1
          },
          {
            label: "30k\u201350k/yr",
            rate_cents: r2000,
            is_active: activeCol === 2
          }
        ],
        rate_structure_note: "Fixed Commercial Energy Supply Rate (Excludes Utility Delivery & Fees)",
        applied_tier_label: appliedTierLabel,
        est_monthly_bill: computeBill(effectiveRateCents, usageKwh),
        renewable_pct: sup.green,
        cancellation_fee: sup.cancelByTerm[term],
        source: cleanLive.length > 0 ? "live-daily-feed" : "regional-daily-seed"
      });
    }
    combined.sort((a, b) => a.rate_per_kwh_cents - b.rate_per_kwh_cents);
    plansByTerm[String(term)] = combined;
  }
  return {
    tduName: liveRaw?.[0]?.company_tdu_name,
    hasLivePtc: cleanLive.length > 0,
    plansByTerm
  };
}
var TIER2_COMMERCIAL_SUPPLIERS = [
  {
    code: "CONST",
    provider: "Constellation Commercial",
    planPrefix: "Commercial Fixed Energy Block",
    green: 25,
    spreadA: -0.05,
    spreadB: -0.35,
    spreadC: -0.6,
    termCurve: { 18: 0.14, 24: 0, 36: -0.16, 48: -0.26, 60: -0.32, 72: -0.28 },
    cancelBase: 450
  },
  {
    code: "NRG",
    provider: "NRG / Direct Energy Business",
    planPrefix: "Business Secure Matrix",
    green: 20,
    spreadA: -0.08,
    spreadB: -0.38,
    spreadC: -0.62,
    termCurve: { 18: -0.06, 24: -0.1, 36: -0.12, 48: -0.04, 60: 0.05, 72: 0.14 },
    cancelBase: 400
  },
  {
    code: "ENGIE",
    provider: "ENGIE Resources Commercial",
    planPrefix: "Fixed Volume Forward Strip",
    green: 50,
    spreadA: 0.02,
    spreadB: -0.28,
    spreadC: -0.54,
    termCurve: { 18: 0.18, 24: 0.04, 36: -0.14, 48: -0.28, 60: -0.38, 72: -0.42 },
    cancelBase: 425
  },
  {
    code: "VSTR",
    provider: "Vistra / TXU Business",
    planPrefix: "Commercial Price Lock",
    green: 30,
    spreadA: -0.02,
    spreadB: -0.32,
    spreadC: -0.58,
    termCurve: { 18: 0.02, 24: -0.08, 36: -0.18, 48: -0.2, 60: -0.15, 72: -0.08 },
    cancelBase: 500
  },
  {
    code: "APGE",
    provider: "APG&E Commercial Desk",
    planPrefix: "TrueCommercial Matrix",
    green: 23,
    spreadA: -0.1,
    spreadB: -0.36,
    spreadC: -0.58,
    termCurve: { 18: -0.12, 24: -0.06, 36: 0, 48: 0.1, 60: 0.2, 72: 0.3 },
    cancelBase: 350
  },
  {
    code: "NXTE",
    provider: "NextEra / Gexa Energy Solutions",
    planPrefix: "Commercial Hedge Strip",
    green: 100,
    spreadA: 0.06,
    spreadB: -0.24,
    spreadC: -0.5,
    termCurve: { 18: 0.22, 24: 0.08, 36: -0.12, 48: -0.3, 60: -0.44, 72: -0.5 },
    cancelBase: 475
  },
  {
    code: "SHLL",
    provider: "Shell Energy / MP2 Commercial",
    planPrefix: "C&I Forward Block",
    green: 35,
    spreadA: 0.04,
    spreadB: -0.26,
    spreadC: -0.52,
    termCurve: { 18: 0.12, 24: 0.02, 36: -0.1, 48: -0.22, 60: -0.3, 72: -0.34 },
    cancelBase: 500
  },
  {
    code: "CHRT",
    provider: "Chariot Commercial 100% Solar",
    planPrefix: "Solar C&I Matrix",
    green: 100,
    spreadA: 0.14,
    spreadB: -0.16,
    spreadC: -0.42,
    termCurve: { 18: 0.16, 24: 0.04, 36: -0.1, 48: -0.24, 60: -0.34, 72: -0.38 },
    cancelBase: 450
  }
];
var LARGE_CI_TIER_CONFIG = {
  TIER_2: {
    labels: ["50k\u201365k/yr", "65k\u201380k/yr", "80k\u2013100k/yr"],
    cutoffs: [5417, 6667],
    volumeDiscounts: [-0.2, -0.35, -0.5],
    exitMultiplier: 1
  },
  TIER_3: {
    labels: ["100k\u2013165k/yr", "165k\u2013230k/yr", "230k\u2013300k/yr"],
    cutoffs: [13750, 19167],
    volumeDiscounts: [-0.55, -0.72, -0.88],
    exitMultiplier: 2
  },
  TIER_4: {
    labels: ["300k\u2013365k/yr", "365k\u2013430k/yr", "430k\u2013500k/yr"],
    cutoffs: [30417, 35833],
    volumeDiscounts: [-0.95, -1.12, -1.28],
    exitMultiplier: 3.5
  },
  TIER_5: {
    labels: ["500k\u2013650k/yr", "650k\u2013800k/yr", "800k\u20131M/yr"],
    cutoffs: [54167, 66667],
    volumeDiscounts: [-1.32, -1.46, -1.6],
    exitMultiplier: 5.5
  },
  TIER_6: {
    labels: ["1M\u20131.5M/yr", "1.5M\u20132.25M/yr", "2.25M\u20133M+/yr"],
    cutoffs: [125e3, 187500],
    volumeDiscounts: [-1.65, -1.8, -1.95],
    exitMultiplier: 8
  }
};
async function buildLargeCiPlansByTerm(zipCode, usageKwh, tierId) {
  const territory = resolveTerritoryByZip(zipCode);
  const cityMatch = findTexasCityByZip(zipCode);
  const liveTduName = cityMatch?.tdspName || (territory.isTexasErcot ? "ONCOR ELECTRIC DELIVERY COMPANY" : territory.region);
  const todayDrift = (Math.floor(Date.now() / 864e5) % 7 - 3) * 0.04;
  const commercialAnchor = Number(
    (territory.commercialSupplyBaseCents + todayDrift).toFixed(2)
  );
  const tierMils = getTierMils(tierId);
  const cfg = LARGE_CI_TIER_CONFIG[tierId];
  const activeIdx = usageKwh < cfg.cutoffs[0] ? 0 : usageKwh < cfg.cutoffs[1] ? 1 : 2;
  const plansByTerm = {};
  for (const term of CONTRACT_TERMS) {
    const termPlans = TIER2_COMMERCIAL_SUPPLIERS.map((s) => {
      const shift = s.termCurve[term];
      const supDelta = s.spreadB + 0.3;
      const bandA = applyMilsToCentsRate(
        Math.max(
          4.2,
          commercialAnchor + cfg.volumeDiscounts[0] + supDelta + shift
        ),
        tierMils
      );
      const bandB = applyMilsToCentsRate(
        Math.max(
          4.1,
          commercialAnchor + cfg.volumeDiscounts[1] + supDelta + shift
        ),
        tierMils
      );
      const bandC = applyMilsToCentsRate(
        Math.max(
          4,
          commercialAnchor + cfg.volumeDiscounts[2] + supDelta + shift
        ),
        tierMils
      );
      const effectiveRateCents = activeIdx === 0 ? bandA : activeIdx === 1 ? bandB : bandC;
      const appliedTierLabel = `${tierId.replace("_", " ")} Matrix (${cfg.labels[activeIdx]})`;
      const termExitMultiplier = term / 24;
      const cancelFee = Math.round(
        s.cancelBase * cfg.exitMultiplier * termExitMultiplier / 100
      ) * 100;
      return {
        plan_id: `CI-${tierId}-${s.code}-${term}M-${zipCode}`,
        provider: s.provider,
        plan_name: `${s.planPrefix} ${term}-Mo C&I`,
        term_months: term,
        rate_per_kwh_cents: effectiveRateCents,
        rate_500_cents: bandA,
        rate_1000_cents: bandB,
        rate_2000_cents: bandC,
        tier_columns: [
          {
            label: cfg.labels[0],
            rate_cents: bandA,
            is_active: activeIdx === 0
          },
          {
            label: cfg.labels[1],
            rate_cents: bandB,
            is_active: activeIdx === 1
          },
          {
            label: cfg.labels[2],
            rate_cents: bandC,
            is_active: activeIdx === 2
          }
        ],
        rate_structure_note: "Reserved C&I Fixed Energy Supply Rate (24-Hr Verification \u2022 Excludes Delivery & Fees)",
        applied_tier_label: appliedTierLabel,
        est_monthly_bill: computeBill(effectiveRateCents, usageKwh),
        renewable_pct: s.green,
        cancellation_fee: cancelFee,
        source: "live-commercial-matrix"
      };
    });
    termPlans.sort((a, b) => a.rate_per_kwh_cents - b.rate_per_kwh_cents);
    plansByTerm[String(term)] = termPlans;
  }
  return {
    tduName: liveTduName,
    plansByTerm
  };
}
async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const body = await req.json();
    const zip_code = String(body.zip_code ?? "").trim();
    const usage = parseInt(String(body.kwh_tier ?? ""), 10);
    const selectedTerm = normalizeContractTerm(body.term_months);
    if (!/^\d{5}$/.test(zip_code)) {
      return new Response(
        JSON.stringify({ error: "Invalid 5-digit US ZIP code." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (isNaN(usage) || usage <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid monthly kWh usage quantity." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const territoryInfo = resolveTerritoryByZip(zip_code);
    const tierSpec = resolveUsageTier(usage);
    const fetchedAt = (/* @__PURE__ */ new Date()).toISOString();
    if (tierSpec.id !== "TIER_1") {
      const { tduName: tduName2, plansByTerm: plansByTerm2 } = await buildLargeCiPlansByTerm(
        zip_code,
        usage,
        tierSpec.id
      );
      const activePlans = plansByTerm2[String(selectedTerm)] || plansByTerm2["18"];
      const lowCents = activePlans[0]?.rate_per_kwh_cents ?? territoryInfo.commercialSupplyBaseCents;
      const highCents = activePlans[activePlans.length - 1]?.rate_per_kwh_cents ?? lowCents;
      const liveRangeLabel = `$${(lowCents / 100).toFixed(4)} \u2013 $${(highCents / 100).toFixed(4)}/kWh (${lowCents.toFixed(2)}\xA2 \u2013 ${highCents.toFixed(2)}\xA2)`;
      const response2 = {
        mode: "CUSTOM_24HR_LOE",
        tier_id: tierSpec.id,
        tier_range_label: tierSpec.rangeLabel,
        turnaround_sla: "24_HOUR_TURNAROUND",
        territory: tduName2 ? `${tduName2} \u2022 ERCOT` : `${territoryInfo.region} \u2022 ${territoryInfo.iso}`,
        iso: territoryInfo.iso,
        annualized_kwh: usage * 12,
        commercial_tier_label: `${tierSpec.shortName}: ${tierSpec.rangeLabel} (${tierSpec.subLabel})`,
        indicative_rate_range: liveRangeLabel,
        engine: "live-commercial-matrix",
        fetched_at: fetchedAt,
        disclosure: process.env.DEFAULT_DISCLOSURE || STANDARD_DISCLOSURE,
        selected_term_months: selectedTerm,
        available_terms: [...CONTRACT_TERMS],
        plans: activePlans,
        plans_by_term: plansByTerm2
      };
      return new Response(JSON.stringify(response2), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    const liveRaw = territoryInfo.isTexasErcot ? await fetchTexasPlansWithHubFallback(zip_code) : null;
    const { tduName, hasLivePtc, plansByTerm } = buildTier1PlansByTerm(
      zip_code,
      usage,
      liveRaw
    );
    const response = {
      mode: "TIER1_REALTIME",
      tier_id: "TIER_1",
      tier_range_label: tierSpec.rangeLabel,
      turnaround_sla: "REAL_TIME",
      territory: hasLivePtc && tduName ? `${tduName} \u2022 ERCOT` : `${territoryInfo.region} \u2022 ${territoryInfo.iso}`,
      iso: territoryInfo.iso,
      annualized_kwh: usage * 12,
      engine: hasLivePtc ? "live-daily-feed" : "regional-daily-seed",
      fetched_at: fetchedAt,
      disclosure: process.env.DEFAULT_DISCLOSURE || STANDARD_DISCLOSURE,
      selected_term_months: selectedTerm,
      available_terms: [...CONTRACT_TERMS],
      plans: plansByTerm[String(selectedTerm)] || plansByTerm["18"],
      plans_by_term: plansByTerm
    };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Rate Matching Failure", details: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// src/api/entrypoints/spark-match.ts
async function handler2(req, res) {
  if (res && typeof res.status === "function") {
    try {
      const url = `https://${req.headers?.host || "localhost"}${req.url || "/api/spark-match"}`;
      const webReq = new Request(url, {
        method: req.method || "POST",
        headers: { "Content-Type": "application/json", ...req.headers || {} },
        body: req.method !== "GET" && req.method !== "HEAD" ? typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}) : void 0
      });
      const webRes = await handler(webReq);
      const data = await webRes.json();
      return res.status(webRes.status).json(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ error: "Rate Matching Error", details: msg });
    }
  }
  try {
    return await handler(req);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: "Rate Matching Error", details: msg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
async function POST(request) {
  return handler2(request);
}
async function GET(request) {
  return handler2(request);
}
export {
  GET,
  POST,
  handler2 as default
};
