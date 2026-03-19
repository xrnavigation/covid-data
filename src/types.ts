/** Normalized state-level COVID data record */
export interface StateCovidData {
  /** Two-letter state abbreviation (e.g., "CA") */
  state: string;
  /** Two-digit state FIPS code (e.g., "06") */
  fips: string;
  /** Full state name */
  stateName: string;
  /** Total confirmed cases */
  totalCases: number | null;
  /** Total confirmed deaths */
  totalDeaths: number | null;
  /** New cases (latest reporting period) */
  newCases: number | null;
  /** New deaths (latest reporting period) */
  newDeaths: number | null;
  /** Currently hospitalized with COVID */
  hospitalizedCurrently: number | null;
  /** Currently in ICU with COVID */
  icuCurrently: number | null;
  /** Total vaccinations administered */
  totalVaccinations: number | null;
  /** People with at least one dose */
  peopleVaccinated: number | null;
  /** People fully vaccinated */
  peopleFullyVaccinated: number | null;
  /** Vaccination rate (0-1 scale, fully vaccinated / population) */
  vaccinationRate: number | null;
  /** State population */
  population: number | null;
  /** Cases per million population */
  casesPerMillion: number | null;
  /** Deaths per million population */
  deathsPerMillion: number | null;
  /** ISO date string of latest data */
  lastUpdated: string | null;
}

/** Normalized county-level COVID data record */
export interface CountyCovidData {
  /** Five-digit county FIPS code (e.g., "06037") */
  fips: string;
  /** County name */
  county: string;
  /** Two-letter state abbreviation */
  state: string;
  /** Total confirmed cases */
  totalCases: number | null;
  /** Total confirmed deaths */
  totalDeaths: number | null;
  /** Total vaccinations administered */
  totalVaccinations: number | null;
  /** People fully vaccinated */
  peopleFullyVaccinated: number | null;
  /** Vaccination rate (0-1 scale) */
  vaccinationRate: number | null;
  /** County population */
  population: number | null;
  /** ISO date string of latest data */
  lastUpdated: string | null;
}

/** Metadata about a single data source fetch */
export interface SourceStatus {
  /** Source identifier (e.g., "cdc-cases", "hhs-hospitalizations") */
  name: string;
  /** URL that was fetched */
  url: string;
  /** Whether the fetch succeeded */
  success: boolean;
  /** Number of records returned */
  recordCount?: number;
  /** Error message if fetch failed */
  error?: string;
  /** Latest date present in the data */
  dataThrough?: string;
}

/** Wrapper for all COVID data responses */
export interface CovidDataResult<T> {
  /** Array of normalized data records */
  data: T[];
  /** Status of each data source used */
  sources: SourceStatus[];
  /** ISO timestamp when data was fetched */
  fetchedAt: string;
}

/** Options for CovidDataClient constructor */
export interface CovidDataClientOptions {
  /** Cache TTL in milliseconds (default: 3600000 = 1 hour) */
  cacheTTL?: number;
  /** Custom fetch function (for testing or custom HTTP clients) */
  fetch?: typeof globalThis.fetch;
}

/** Options for getStateData() */
export interface StateDataOptions {
  /** Filter to specific state abbreviations. If omitted, returns all states. */
  states?: string[];
}

/** Options for getCountyData() */
export interface CountyDataOptions {
  /** Filter to a specific state abbreviation (required for county data) */
  state: string;
  /** Filter to specific county FIPS codes */
  fips?: string[];
}
