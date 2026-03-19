import type { SourceStatus } from '../types.js';
import { stateNameToAbbr } from '../utils.js';

export interface StatePartial {
  totalCases: number | null;
  totalDeaths: number | null;
  newCases: number | null;
  newDeaths: number | null;
  casesPerMillion: number | null;
  deathsPerMillion: number | null;
  population: number | null;
  lastUpdated: string | null;
}

export interface CountyPartial {
  county: string;
  state: string;
  fips: string;
  totalCases: number | null;
  totalDeaths: number | null;
  lastUpdated: string | null;
}

const STATES_URL = 'https://disease.sh/v3/covid-19/states';
const COUNTIES_URL = 'https://disease.sh/v3/covid-19/nyt/counties';

type FetchFn = (url: string) => Promise<Response>;

export async function fetchDiseaseShStates(
  fetchFn: FetchFn,
): Promise<{ data: Map<string, StatePartial>; status: SourceStatus }> {
  const data = new Map<string, StatePartial>();

  try {
    const response = await fetchFn(STATES_URL);
    if (!response.ok) {
      return {
        data,
        status: {
          name: 'disease-sh-states',
          url: STATES_URL,
          success: false,
          recordCount: 0,
          error: `HTTP ${response.status}`,
        },
      };
    }

    const records: unknown[] = await response.json();

    if (!Array.isArray(records)) {
      return {
        data,
        status: {
          name: 'disease-sh-states',
          url: STATES_URL,
          success: true,
          recordCount: 0,
        },
      };
    }

    for (const rec of records) {
      const r = rec as Record<string, unknown>;
      const stateName = r.state as string | undefined;
      if (!stateName) continue;

      const abbr = stateNameToAbbr(stateName);
      if (!abbr) continue;

      const updated = r.updated as number | undefined;
      const lastUpdated = updated ? new Date(updated).toISOString() : null;

      data.set(abbr, {
        totalCases: (r.cases as number) ?? null,
        totalDeaths: (r.deaths as number) ?? null,
        newCases: (r.todayCases as number) ?? null,
        newDeaths: (r.todayDeaths as number) ?? null,
        casesPerMillion: (r.casesPerOneMillion as number) ?? null,
        deathsPerMillion: (r.deathsPerOneMillion as number) ?? null,
        population: (r.population as number) ?? null,
        lastUpdated,
      });
    }

    return {
      data,
      status: {
        name: 'disease-sh-states',
        url: STATES_URL,
        success: true,
        recordCount: data.size,
      },
    };
  } catch (err) {
    return {
      data,
      status: {
        name: 'disease-sh-states',
        url: STATES_URL,
        success: false,
        recordCount: 0,
        error: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

export async function fetchDiseaseShCounties(
  fetchFn: FetchFn,
): Promise<{ data: Map<string, CountyPartial>; status: SourceStatus }> {
  const data = new Map<string, CountyPartial>();

  try {
    const response = await fetchFn(COUNTIES_URL);
    if (!response.ok) {
      return {
        data,
        status: {
          name: 'disease-sh-counties',
          url: COUNTIES_URL,
          success: false,
          recordCount: 0,
          error: `HTTP ${response.status}`,
        },
      };
    }

    const records: unknown[] = await response.json();

    if (!Array.isArray(records)) {
      return {
        data,
        status: {
          name: 'disease-sh-counties',
          url: COUNTIES_URL,
          success: true,
          recordCount: 0,
        },
      };
    }

    // Group by FIPS, take the latest date for each
    const latestByFips = new Map<string, Record<string, unknown>>();

    for (const rec of records) {
      const r = rec as Record<string, unknown>;
      const rawFips = r.fips;
      if (rawFips == null) continue;

      const fips = String(rawFips).padStart(5, '0');
      const date = r.date as string | undefined;
      if (!date) continue;

      const existing = latestByFips.get(fips);
      if (!existing || (existing.date as string) < date) {
        latestByFips.set(fips, r);
      }
    }

    for (const [fips, r] of latestByFips) {
      const stateName = r.state as string | undefined;
      const stateAbbr = stateName ? stateNameToAbbr(stateName) ?? stateName : '';

      data.set(fips, {
        county: (r.county as string) ?? '',
        state: stateAbbr,
        fips,
        totalCases: (r.cases as number) ?? null,
        totalDeaths: (r.deaths as number) ?? null,
        lastUpdated: (r.date as string) ?? null,
      });
    }

    return {
      data,
      status: {
        name: 'disease-sh-counties',
        url: COUNTIES_URL,
        success: true,
        recordCount: data.size,
      },
    };
  } catch (err) {
    return {
      data,
      status: {
        name: 'disease-sh-counties',
        url: COUNTIES_URL,
        success: false,
        recordCount: 0,
        error: err instanceof Error ? err.message : String(err),
      },
    };
  }
}
