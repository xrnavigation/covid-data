import type { SourceStatus } from '../types.js';

/** CDC Cases endpoint (dataset pwn4-m3yp) */
const CDC_CASES_URL = 'https://data.cdc.gov/resource/pwn4-m3yp.json';

/** HHS Hospitalizations endpoint (dataset g62h-syeh) */
const HHS_HOSP_URL = 'https://healthdata.gov/resource/g62h-syeh.json';

/** CDC Vaccinations endpoint (dataset unsk-b7fc) */
const CDC_VAX_URL = 'https://data.cdc.gov/resource/unsk-b7fc.json';

/** CDC County Vaccinations endpoint (dataset 8xkx-amqh) */
const CDC_COUNTY_VAX_URL = 'https://data.cdc.gov/resource/8xkx-amqh.json';

type FetchFn = typeof globalThis.fetch;

/** Parse a numeric string from SODA, returning 0 if missing/NaN */
function num(value: string | undefined | null): number {
  if (value == null || value === '') return 0;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

/** Parse a numeric string, returning null if missing/NaN */
function numOrNull(value: string | undefined | null): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

/** Extract a YYYY-MM-DD date from a SODA datetime string */
function extractDate(isoish: string): string {
  return isoish.slice(0, 10);
}

export interface CdcCasesEntry {
  totalCases: number;
  totalDeaths: number;
  newCases: number;
  newDeaths: number;
  lastUpdated: string;
}

export interface HhsHospEntry {
  hospitalizedCurrently: number | null;
  icuCurrently: number | null;
  lastUpdated: string;
}

export interface CdcVaxEntry {
  totalVaccinations: number;
  peopleVaccinated: number;
  peopleFullyVaccinated: number;
  vaccinationRate: number | null;
}

export interface CdcCountyVaxEntry {
  totalVaccinations: number;
  peopleFullyVaccinated: number;
  vaccinationRate: number | null;
  population: number | null;
}

/**
 * Fetch CDC case data from SODA API.
 * Step 1: find latest end_date, Step 2: fetch all rows for that date.
 */
export async function fetchCdcCases(
  fetchFn: FetchFn,
): Promise<{ data: Map<string, CdcCasesEntry>; status: SourceStatus }> {
  const sourceName = 'cdc-cases';
  const maxDateUrl = `${CDC_CASES_URL}?$select=MAX(end_date)&$limit=1`;

  try {
    const maxDateResp = await fetchFn(maxDateUrl);
    if (!maxDateResp.ok) throw new Error(`HTTP ${maxDateResp.status}`);
    const maxDateJson = (await maxDateResp.json()) as Array<Record<string, string>>;
    if (!maxDateJson.length || !maxDateJson[0].MAX_end_date) {
      return {
        data: new Map(),
        status: { name: sourceName, url: maxDateUrl, success: true, recordCount: 0 },
      };
    }

    const latestDate = extractDate(maxDateJson[0].MAX_end_date);
    const dataUrl = `${CDC_CASES_URL}?$where=end_date='${latestDate}'&$limit=100`;
    const dataResp = await fetchFn(dataUrl);
    if (!dataResp.ok) throw new Error(`HTTP ${dataResp.status}`);
    const rows = (await dataResp.json()) as Array<Record<string, string>>;

    const data = new Map<string, CdcCasesEntry>();
    for (const row of rows) {
      const state = row.state;
      if (!state) continue;
      data.set(state, {
        totalCases: num(row.tot_cases),
        totalDeaths: num(row.tot_deaths),
        newCases: num(row.new_cases),
        newDeaths: num(row.new_deaths),
        lastUpdated: latestDate,
      });
    }

    return {
      data,
      status: {
        name: sourceName,
        url: dataUrl,
        success: true,
        recordCount: data.size,
        dataThrough: latestDate,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      data: new Map(),
      status: { name: sourceName, url: maxDateUrl, success: false, error: message },
    };
  }
}

/**
 * Fetch HHS hospitalization data from SODA API.
 */
export async function fetchHhsHospitalizations(
  fetchFn: FetchFn,
): Promise<{ data: Map<string, HhsHospEntry>; status: SourceStatus }> {
  const sourceName = 'hhs-hospitalizations';
  const maxDateUrl = `${HHS_HOSP_URL}?$select=MAX(date)&$limit=1`;

  try {
    const maxDateResp = await fetchFn(maxDateUrl);
    if (!maxDateResp.ok) throw new Error(`HTTP ${maxDateResp.status}`);
    const maxDateJson = (await maxDateResp.json()) as Array<Record<string, string>>;
    if (!maxDateJson.length || !maxDateJson[0].MAX_date) {
      return {
        data: new Map(),
        status: { name: sourceName, url: maxDateUrl, success: true, recordCount: 0 },
      };
    }

    const latestDate = extractDate(maxDateJson[0].MAX_date);
    const dataUrl = `${HHS_HOSP_URL}?$where=date='${latestDate}'&$limit=100`;
    const dataResp = await fetchFn(dataUrl);
    if (!dataResp.ok) throw new Error(`HTTP ${dataResp.status}`);
    const rows = (await dataResp.json()) as Array<Record<string, string>>;

    const data = new Map<string, HhsHospEntry>();
    for (const row of rows) {
      const state = row.state;
      if (!state) continue;
      data.set(state, {
        hospitalizedCurrently: numOrNull(row.inpatient_beds_used_covid),
        icuCurrently: numOrNull(row.staffed_adult_icu_bed_occupancy),
        lastUpdated: latestDate,
      });
    }

    return {
      data,
      status: {
        name: sourceName,
        url: dataUrl,
        success: true,
        recordCount: data.size,
        dataThrough: latestDate,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      data: new Map(),
      status: { name: sourceName, url: maxDateUrl, success: false, error: message },
    };
  }
}

/**
 * Fetch CDC vaccination data from SODA API.
 */
export async function fetchCdcVaccinations(
  fetchFn: FetchFn,
): Promise<{ data: Map<string, CdcVaxEntry>; status: SourceStatus }> {
  const sourceName = 'cdc-vaccinations';
  const maxDateUrl = `${CDC_VAX_URL}?$select=MAX(date)&$limit=1`;

  try {
    const maxDateResp = await fetchFn(maxDateUrl);
    if (!maxDateResp.ok) throw new Error(`HTTP ${maxDateResp.status}`);
    const maxDateJson = (await maxDateResp.json()) as Array<Record<string, string>>;
    if (!maxDateJson.length || !maxDateJson[0].MAX_date) {
      return {
        data: new Map(),
        status: { name: sourceName, url: maxDateUrl, success: true, recordCount: 0 },
      };
    }

    const latestDate = extractDate(maxDateJson[0].MAX_date);
    const dataUrl = `${CDC_VAX_URL}?$where=date='${latestDate}'&$limit=100`;
    const dataResp = await fetchFn(dataUrl);
    if (!dataResp.ok) throw new Error(`HTTP ${dataResp.status}`);
    const rows = (await dataResp.json()) as Array<Record<string, string>>;

    const data = new Map<string, CdcVaxEntry>();
    for (const row of rows) {
      const location = row.location;
      if (!location) continue;
      const popPct = numOrNull(row.series_complete_pop_pct);
      data.set(location, {
        totalVaccinations: num(row.administered),
        peopleVaccinated: num(row.administered_dose1_recip),
        peopleFullyVaccinated: num(row.series_complete_yes),
        vaccinationRate: popPct != null ? popPct / 100 : null,
      });
    }

    return {
      data,
      status: {
        name: sourceName,
        url: dataUrl,
        success: true,
        recordCount: data.size,
        dataThrough: latestDate,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      data: new Map(),
      status: { name: sourceName, url: maxDateUrl, success: false, error: message },
    };
  }
}

/**
 * Fetch CDC county-level vaccination data from SODA API.
 * No date filter needed — dataset has one row per county.
 */
export async function fetchCdcCountyVaccinations(
  fetchFn: FetchFn,
): Promise<{ data: Map<string, CdcCountyVaxEntry>; status: SourceStatus }> {
  const sourceName = 'cdc-county-vaccinations';
  const dataUrl = `${CDC_COUNTY_VAX_URL}?$limit=50000`;

  try {
    const resp = await fetchFn(dataUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const rows = (await resp.json()) as Array<Record<string, string>>;

    const data = new Map<string, CdcCountyVaxEntry>();
    for (const row of rows) {
      const fips = row.fips;
      if (!fips) continue;
      const seriesComplete = numOrNull(row.series_complete_yes);
      const census = numOrNull(row.census2019);
      let vaccinationRate: number | null = null;
      if (seriesComplete != null && census != null && census > 0) {
        vaccinationRate = seriesComplete / census;
      }
      data.set(fips, {
        totalVaccinations: num(row.administered_dose1_recip),
        peopleFullyVaccinated: seriesComplete ?? 0,
        vaccinationRate,
        population: census,
      });
    }

    return {
      data,
      status: {
        name: sourceName,
        url: dataUrl,
        success: true,
        recordCount: data.size,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      data: new Map(),
      status: { name: sourceName, url: dataUrl, success: false, error: message },
    };
  }
}
