import type { SourceStatus } from '../types.js';
import { stateNameToAbbr } from '../utils.js';

export interface CountyPartial {
  county: string;
  state: string; // abbreviation
  fips: string; // 5-digit
  totalCases: number | null;
  totalDeaths: number | null;
  lastUpdated: string | null; // date string from CSV
}

export interface StatePartial {
  totalCases: number | null;
  totalDeaths: number | null;
  lastUpdated: string | null;
}

const COUNTIES_URL = 'https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv';
const STATES_URL = 'https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-states.csv';

type FetchFn = (url: string) => Promise<Response>;

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
}

function toNumberOrNull(value: string | undefined): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export async function fetchNytCountyCases(
  fetchFn: FetchFn,
): Promise<{ data: Map<string, CountyPartial>; status: SourceStatus }> {
  const data = new Map<string, CountyPartial>();

  try {
    const response = await fetchFn(COUNTIES_URL);
    if (!response.ok) {
      return {
        data,
        status: {
          name: 'nyt-counties',
          url: COUNTIES_URL,
          success: false,
          recordCount: 0,
          error: `HTTP ${response.status}`,
        },
      };
    }

    const text = await response.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      return {
        data,
        status: {
          name: 'nyt-counties',
          url: COUNTIES_URL,
          success: true,
          recordCount: 0,
        },
      };
    }

    // Group by FIPS, take the row with the latest date
    const latestByFips = new Map<string, Record<string, string>>();

    for (const row of rows) {
      const rawFips = row.fips;
      if (!rawFips || rawFips === '') continue;

      const fips = rawFips.padStart(5, '0');
      const date = row.date;
      if (!date) continue;

      const existing = latestByFips.get(fips);
      if (!existing || existing.date < date) {
        latestByFips.set(fips, { ...row, fips });
      }
    }

    let latestDate = '';

    for (const [fips, row] of latestByFips) {
      const stateName = row.state;
      const stateAbbr = stateName ? (stateNameToAbbr(stateName) ?? stateName) : '';

      if (row.date > latestDate) {
        latestDate = row.date;
      }

      data.set(fips, {
        county: row.county ?? '',
        state: stateAbbr,
        fips,
        totalCases: toNumberOrNull(row.cases),
        totalDeaths: toNumberOrNull(row.deaths),
        lastUpdated: row.date ?? null,
      });
    }

    return {
      data,
      status: {
        name: 'nyt-counties',
        url: COUNTIES_URL,
        success: true,
        recordCount: data.size,
        dataThrough: latestDate || undefined,
      },
    };
  } catch (err) {
    return {
      data,
      status: {
        name: 'nyt-counties',
        url: COUNTIES_URL,
        success: false,
        recordCount: 0,
        error: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

export async function fetchNytStateCases(
  fetchFn: FetchFn,
): Promise<{ data: Map<string, StatePartial>; status: SourceStatus }> {
  const data = new Map<string, StatePartial>();

  try {
    const response = await fetchFn(STATES_URL);
    if (!response.ok) {
      return {
        data,
        status: {
          name: 'nyt-states',
          url: STATES_URL,
          success: false,
          recordCount: 0,
          error: `HTTP ${response.status}`,
        },
      };
    }

    const text = await response.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      return {
        data,
        status: {
          name: 'nyt-states',
          url: STATES_URL,
          success: true,
          recordCount: 0,
        },
      };
    }

    // Group by state name, take latest date
    const latestByState = new Map<string, Record<string, string>>();

    for (const row of rows) {
      const stateName = row.state;
      if (!stateName) continue;

      const date = row.date;
      if (!date) continue;

      const existing = latestByState.get(stateName);
      if (!existing || existing.date < date) {
        latestByState.set(stateName, row);
      }
    }

    let latestDate = '';

    for (const [stateName, row] of latestByState) {
      const abbr = stateNameToAbbr(stateName);
      if (!abbr) continue;

      if (row.date > latestDate) {
        latestDate = row.date;
      }

      data.set(abbr, {
        totalCases: toNumberOrNull(row.cases),
        totalDeaths: toNumberOrNull(row.deaths),
        lastUpdated: row.date ?? null,
      });
    }

    return {
      data,
      status: {
        name: 'nyt-states',
        url: STATES_URL,
        success: true,
        recordCount: data.size,
        dataThrough: latestDate || undefined,
      },
    };
  } catch (err) {
    return {
      data,
      status: {
        name: 'nyt-states',
        url: STATES_URL,
        success: false,
        recordCount: 0,
        error: err instanceof Error ? err.message : String(err),
      },
    };
  }
}
