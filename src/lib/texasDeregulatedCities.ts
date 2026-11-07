export type ErcotTdspCode =
  | "ONCOR"
  | "CENTERPOINT"
  | "AEP_CENTRAL"
  | "AEP_NORTH"
  | "TNMP"
  | "LPL_ERCOT";

export const ERCOT_TDSP_LABELS: Record<ErcotTdspCode, string> = {
  ONCOR: "Oncor Electric Delivery",
  CENTERPOINT: "CenterPoint Energy",
  AEP_CENTRAL: "AEP Texas Central",
  AEP_NORTH: "AEP Texas North",
  TNMP: "Texas-New Mexico Power (TNMP)",
  LPL_ERCOT: "LP&L / ERCOT Retail Choice",
};

export interface TexasDeregulatedCity {
  name: string;
  slug: string;
  zip: string;
  tdspCode: ErcotTdspCode;
  tdspName: string;
  featured: boolean;
  aliases?: string[];
}

type RawCityTuple = [
  name: string,
  zip: string,
  tdsp: ErcotTdspCode,
  featured?: 1,
  aliases?: string[],
];

/**
 * Complete List of Deregulated Cities & Towns in Texas (ERCOT Retail Choice).
 * Every entry maps directly on-platform to its primary Texas ZIP code and TDSP
 * delivery territory for instant 18–72 month quote generation.
 */
const RAW_TEXAS_CITIES: RawCityTuple[] = [
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
  ["Burkburnett", "76354", "ONCOR", undefined, ["Burk", "Burnett"]],
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
  ["De Soto", "75115", "ONCOR", undefined, ["DeSoto"]],
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
  ["Rachel", "78353", "AEP_CENTRAL", undefined, ["Rachal"]],
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
  ["Snyder", "79549", "ONCOR", undefined, ["Synder"]],
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
  ["Zavalla", "75980", "ONCOR"],
];

export const TEXAS_DEREGULATED_CITIES: TexasDeregulatedCity[] =
  RAW_TEXAS_CITIES.map(([name, zip, tdspCode, featured, aliases]) => ({
    name,
    slug: name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    zip,
    tdspCode,
    tdspName: ERCOT_TDSP_LABELS[tdspCode],
    featured: featured === 1,
    aliases,
  })).sort((a, b) => a.name.localeCompare(b.name));

export const FEATURED_TEXAS_CITIES: TexasDeregulatedCity[] =
  TEXAS_DEREGULATED_CITIES.filter((c) => c.featured);

export function searchTexasDeregulatedCities(
  rawQuery: string,
  limit = 12
): TexasDeregulatedCity[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];

  const startsWith: TexasDeregulatedCity[] = [];
  const contains: TexasDeregulatedCity[] = [];

  for (const city of TEXAS_DEREGULATED_CITIES) {
    const lowerName = city.name.toLowerCase();
    const aliasMatch = city.aliases?.some((a) =>
      a.toLowerCase().includes(q)
    );
    if (lowerName.startsWith(q) || city.zip.startsWith(q)) {
      startsWith.push(city);
    } else if (lowerName.includes(q) || aliasMatch) {
      contains.push(city);
    }
  }

  return [...startsWith, ...contains].slice(0, limit);
}

export function findTexasCityByZip(
  zip: string
): TexasDeregulatedCity | undefined {
  return TEXAS_DEREGULATED_CITIES.find((c) => c.zip === zip);
}

export function findExactTexasCityByName(
  rawInput: string
): TexasDeregulatedCity | undefined {
  const cleaned = rawInput
    .replace(/,\s*tx$/i, "")
    .replace(/,\s*texas$/i, "")
    .trim()
    .toLowerCase();
  if (!cleaned) return undefined;
  return TEXAS_DEREGULATED_CITIES.find(
    (c) =>
      c.name.toLowerCase() === cleaned ||
      c.aliases?.some((a) => a.toLowerCase() === cleaned)
  );
}

const DEREGULATED_PRIMARY_ZIPS = new Set<string>(
  TEXAS_DEREGULATED_CITIES.map((c) => c.zip)
);

/**
 * Checks whether a 5-digit ZIP code falls within the Texas deregulated
 * cities/ERCOT retail choice area vs regulated munis/co-ops or out-of-area ZIPs.
 */
export function isTexasDeregulatedZip(zip: string): boolean {
  if (!/^\d{5}$/.test(zip)) return false;
  if (DEREGULATED_PRIMARY_ZIPS.has(zip)) return true;

  const num = parseInt(zip, 10);
  // Outside Texas ZIP range (75001 – 79999)
  if (num < 75001 || num > 79999) return false;

  const prefix3 = Math.floor(num / 100);

  // Major regulated Texas municipal / non-ERCOT utility 3-digit prefixes:
  // 787 = Austin Energy, 782 = CPS Energy (San Antonio), 799 = El Paso Electric,
  // 791 = Xcel/SPS (Amarillo), 776-777 = Entergy Texas (Beaumont/Port Arthur/Orange),
  // 778 = BTU/CSU/Entergy (Bryan/College Station/Brenham), 756 = SWEPCO (Longview/Marshall)
  if (
    prefix3 === 787 ||
    prefix3 === 782 ||
    prefix3 === 799 ||
    prefix3 === 791 ||
    prefix3 === 776 ||
    prefix3 === 777 ||
    prefix3 === 778 ||
    prefix3 === 756
  ) {
    return false;
  }

  // Texarkana / NE Texas SWEPCO (755xx except 75551 Atlanta in list)
  if (prefix3 === 755) return false;

  // Panhandle & South Plains SPS/co-op prefixes (790xx, 793xx) except listed cities
  if (prefix3 === 790 || prefix3 === 793) return false;

  // Specific regulated municipal / Entergy / co-op 5-digit bands inside mixed 3-digit prefixes:
  const regulatedRanges: Array<[number, number]> = [
    [75040, 75049], // Garland (GP&L)
    [75401, 75404], // Greenville (GEUS)
    [77301, 77306], // Conroe (Entergy Texas)
    [77316, 77320], // Montgomery / Huntsville (Entergy)
    [77327, 77328], // Cleveland (Entergy)
    [77340, 77349], // Huntsville (Entergy)
    [77351, 77351], // Livingston (Entergy / Sam Houston EC)
    [77356, 77359], // Montgomery / New Waverly / Willis (Entergy)
    [77378, 77387], // Willis & The Woodlands (Entergy Texas)
    [78006, 78006], // Boerne (Boerne Utilities)
    [78015, 78015], // Boerne
    [78028, 78029], // Kerrville (KPUB)
    [78130, 78135], // New Braunfels (NBU)
    [78520, 78526], // Brownsville (BPUB)
    [78602, 78602], // Bastrop
    [78611, 78611], // Burnet
    [78624, 78624], // Fredericksburg
    [78626, 78628], // Georgetown
    [78633, 78633], // Georgetown
    [78644, 78644], // Lockhart
    [78654, 78654], // Marble Falls
    [78666, 78667], // San Marcos
  ];

  for (const [low, high] of regulatedRanges) {
    if (num >= low && num <= high) return false;
  }

  return true;
}

export interface DeregulatedCheckResult {
  inDeregulatedList: boolean;
  matchedCity?: TexasDeregulatedCity;
  resolvedZip: string;
  reason?: "CITY_NOT_IN_LIST" | "ZIP_NOT_IN_LIST";
}

/**
 * Evaluates user-entered ZIP code and/or City against the Complete List of
 * Deregulated Cities in Texas.
 * - If a listed city is matched and no conflicting non-deregulated ZIP is entered,
 *   returns inDeregulatedList: true (filling the city's primary ZIP if ZIP was blank).
 * - If either the entered city or entered ZIP is outside the deregulated Texas list,
 *   returns inDeregulatedList: false so the UI prompts:
 *   "Do you have the Power to Choose? (Yes / No)"
 */
export function checkDeregulatedAreaEligibility(
  zipInput: string,
  cityInput = ""
): DeregulatedCheckResult {
  const cleanZip = zipInput.trim();
  const cleanCity = cityInput.trim();
  const matchedCityByName = cleanCity
    ? findExactTexasCityByName(cleanCity)
    : undefined;
  const matchedCityByZip = cleanZip ? findTexasCityByZip(cleanZip) : undefined;

  // If user typed a city name that is NOT in the deregulated Texas list
  if (cleanCity && !matchedCityByName) {
    return {
      inDeregulatedList: false,
      resolvedZip: cleanZip,
      reason: "CITY_NOT_IN_LIST",
    };
  }

  // If user typed a valid city from the list and left ZIP blank, use city's primary ZIP
  const effectiveZip = cleanZip || matchedCityByName?.zip || "";

  // If ZIP is provided, verify ZIP is in the deregulated Texas area
  if (effectiveZip && !isTexasDeregulatedZip(effectiveZip)) {
    return {
      inDeregulatedList: false,
      matchedCity: matchedCityByName,
      resolvedZip: effectiveZip,
      reason: "ZIP_NOT_IN_LIST",
    };
  }

  if (!effectiveZip) {
    return {
      inDeregulatedList: false,
      resolvedZip: "",
      reason: "ZIP_NOT_IN_LIST",
    };
  }

  return {
    inDeregulatedList: true,
    matchedCity: matchedCityByName ?? matchedCityByZip,
    resolvedZip: effectiveZip,
  };
}
