/** State data: [FIPS code, abbreviation, full name] */
const STATE_DATA: readonly [string, string, string][] = [
  ['01', 'AL', 'Alabama'],
  ['02', 'AK', 'Alaska'],
  ['04', 'AZ', 'Arizona'],
  ['05', 'AR', 'Arkansas'],
  ['06', 'CA', 'California'],
  ['08', 'CO', 'Colorado'],
  ['09', 'CT', 'Connecticut'],
  ['10', 'DE', 'Delaware'],
  ['11', 'DC', 'District of Columbia'],
  ['12', 'FL', 'Florida'],
  ['13', 'GA', 'Georgia'],
  ['15', 'HI', 'Hawaii'],
  ['16', 'ID', 'Idaho'],
  ['17', 'IL', 'Illinois'],
  ['18', 'IN', 'Indiana'],
  ['19', 'IA', 'Iowa'],
  ['20', 'KS', 'Kansas'],
  ['21', 'KY', 'Kentucky'],
  ['22', 'LA', 'Louisiana'],
  ['23', 'ME', 'Maine'],
  ['24', 'MD', 'Maryland'],
  ['25', 'MA', 'Massachusetts'],
  ['26', 'MI', 'Michigan'],
  ['27', 'MN', 'Minnesota'],
  ['28', 'MS', 'Mississippi'],
  ['29', 'MO', 'Missouri'],
  ['30', 'MT', 'Montana'],
  ['31', 'NE', 'Nebraska'],
  ['32', 'NV', 'Nevada'],
  ['33', 'NH', 'New Hampshire'],
  ['34', 'NJ', 'New Jersey'],
  ['35', 'NM', 'New Mexico'],
  ['36', 'NY', 'New York'],
  ['37', 'NC', 'North Carolina'],
  ['38', 'ND', 'North Dakota'],
  ['39', 'OH', 'Ohio'],
  ['40', 'OK', 'Oklahoma'],
  ['41', 'OR', 'Oregon'],
  ['42', 'PA', 'Pennsylvania'],
  ['44', 'RI', 'Rhode Island'],
  ['45', 'SC', 'South Carolina'],
  ['46', 'SD', 'South Dakota'],
  ['47', 'TN', 'Tennessee'],
  ['48', 'TX', 'Texas'],
  ['49', 'UT', 'Utah'],
  ['50', 'VT', 'Vermont'],
  ['51', 'VA', 'Virginia'],
  ['53', 'WA', 'Washington'],
  ['54', 'WV', 'West Virginia'],
  ['55', 'WI', 'Wisconsin'],
  ['56', 'WY', 'Wyoming'],
  // Territories
  ['60', 'AS', 'American Samoa'],
  ['66', 'GU', 'Guam'],
  ['69', 'MP', 'Northern Mariana Islands'],
  ['72', 'PR', 'Puerto Rico'],
  ['78', 'VI', 'U.S. Virgin Islands'],
];

/** Map from abbreviation to [fips, name] */
const ABBR_MAP = new Map<string, { fips: string; name: string }>();
/** Map from FIPS to abbreviation */
const FIPS_MAP = new Map<string, string>();

for (const [fips, abbr, name] of STATE_DATA) {
  ABBR_MAP.set(abbr, { fips, name });
  FIPS_MAP.set(fips, abbr);
}

/**
 * Check if a string is a valid FIPS code.
 * Valid: 2-digit state FIPS or 5-digit county FIPS, all numeric.
 */
export function isValidFips(fips: string): boolean {
  return /^\d{2}$/.test(fips) || /^\d{5}$/.test(fips);
}

/** Map a two-letter state abbreviation to its FIPS code. */
export function stateAbbrToFips(abbr: string): string | undefined {
  return ABBR_MAP.get(abbr)?.fips;
}

/** Map a two-digit state FIPS code to its abbreviation. */
export function fipsToStateAbbr(fips: string): string | undefined {
  return FIPS_MAP.get(fips);
}

/** Map a two-letter state abbreviation to its full name. */
export function stateAbbrToName(abbr: string): string | undefined {
  return ABBR_MAP.get(abbr)?.name;
}

/** Map from full state name (lowercase) to abbreviation */
const NAME_MAP = new Map<string, string>();
for (const [, abbr, name] of STATE_DATA) {
  NAME_MAP.set(name.toLowerCase(), abbr);
}

/** Map a full state name to its two-letter abbreviation. Case-insensitive. */
export function stateNameToAbbr(name: string): string | undefined {
  return NAME_MAP.get(name.trim().toLowerCase());
}

/** Normalize a state abbreviation: trim whitespace and uppercase. */
export function normalizeStateAbbr(input: string): string {
  return input.trim().toUpperCase();
}
