import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CountyPartial, StatePartial } from '../src/sources/nyt.js';
import type { CdcCasesEntry, CdcCountyVaxEntry, CdcVaxEntry, HhsHospEntry } from '../src/sources/soda.js';
import type { SourceStatus } from '../src/types.js';

vi.mock('../src/sources/soda.js', () => ({
  fetchCdcCases: vi.fn(),
  fetchHhsHospitalizations: vi.fn(),
  fetchCdcVaccinations: vi.fn(),
  fetchCdcCountyVaccinations: vi.fn(),
}));

vi.mock('../src/sources/nyt.js', () => ({
  fetchNytCountyCases: vi.fn(),
  fetchNytStateCases: vi.fn(),
}));

import { CovidDataClient } from '../src/client.js';
import { fetchNytCountyCases, fetchNytStateCases } from '../src/sources/nyt.js';
import {
  fetchCdcCases,
  fetchCdcCountyVaccinations,
  fetchCdcVaccinations,
  fetchHhsHospitalizations,
} from '../src/sources/soda.js';

const mockedFetchCdcCases = vi.mocked(fetchCdcCases);
const mockedFetchHhsHosp = vi.mocked(fetchHhsHospitalizations);
const mockedFetchCdcVax = vi.mocked(fetchCdcVaccinations);
const mockedFetchCdcCountyVax = vi.mocked(fetchCdcCountyVaccinations);
const mockedFetchNytCounty = vi.mocked(fetchNytCountyCases);
const mockedFetchNytState = vi.mocked(fetchNytStateCases);

function okStatus(name: string, count: number, date?: string): SourceStatus {
  return { name, url: `https://example.com/${name}`, success: true, recordCount: count, dataThrough: date };
}

function errStatus(name: string, msg: string): SourceStatus {
  return { name, url: `https://example.com/${name}`, success: false, error: msg };
}

// Sample data
const cdcCasesData = new Map<string, CdcCasesEntry>([
  ['CA', { totalCases: 10000, totalDeaths: 200, newCases: 100, newDeaths: 5, lastUpdated: '2023-06-01' }],
  ['NY', { totalCases: 8000, totalDeaths: 300, newCases: 80, newDeaths: 3, lastUpdated: '2023-06-01' }],
]);

const hhsData = new Map<string, HhsHospEntry>([
  ['CA', { hospitalizedCurrently: 500, icuCurrently: 50, lastUpdated: '2023-06-02' }],
  ['NY', { hospitalizedCurrently: 400, icuCurrently: 40, lastUpdated: '2023-06-02' }],
]);

const vaxData = new Map<string, CdcVaxEntry>([
  ['CA', { totalVaccinations: 50000, peopleVaccinated: 40000, peopleFullyVaccinated: 35000, vaccinationRate: 0.75 }],
  ['NY', { totalVaccinations: 45000, peopleVaccinated: 38000, peopleFullyVaccinated: 33000, vaccinationRate: 0.72 }],
]);

const nytStateData = new Map<string, StatePartial>([
  ['CA', { totalCases: 9500, totalDeaths: 190, lastUpdated: '2023-05-30' }],
  ['NY', { totalCases: 7800, totalDeaths: 290, lastUpdated: '2023-05-30' }],
]);

const nytCountyData = new Map<string, CountyPartial>([
  [
    '06037',
    {
      county: 'Los Angeles',
      state: 'CA',
      fips: '06037',
      totalCases: 5000,
      totalDeaths: 100,
      lastUpdated: '2023-06-01',
    },
  ],
  [
    '06075',
    {
      county: 'San Francisco',
      state: 'CA',
      fips: '06075',
      totalCases: 2000,
      totalDeaths: 30,
      lastUpdated: '2023-06-01',
    },
  ],
  [
    '36061',
    { county: 'New York', state: 'NY', fips: '36061', totalCases: 4000, totalDeaths: 150, lastUpdated: '2023-06-01' },
  ],
]);

const countyVaxData = new Map<string, CdcCountyVaxEntry>([
  ['06037', { totalVaccinations: 20000, peopleFullyVaccinated: 15000, vaccinationRate: 0.7, population: 10000000 }],
  ['06075', { totalVaccinations: 8000, peopleFullyVaccinated: 6000, vaccinationRate: 0.68, population: 870000 }],
  ['36061', { totalVaccinations: 15000, peopleFullyVaccinated: 12000, vaccinationRate: 0.73, population: 1600000 }],
]);

const dummyFetch = vi.fn() as unknown as typeof globalThis.fetch;

beforeEach(() => {
  vi.clearAllMocks();

  mockedFetchCdcCases.mockResolvedValue({ data: cdcCasesData, status: okStatus('cdc-cases', 2, '2023-06-01') });
  mockedFetchHhsHosp.mockResolvedValue({ data: hhsData, status: okStatus('hhs-hospitalizations', 2, '2023-06-02') });
  mockedFetchCdcVax.mockResolvedValue({ data: vaxData, status: okStatus('cdc-vaccinations', 2) });
  mockedFetchCdcCountyVax.mockResolvedValue({ data: countyVaxData, status: okStatus('cdc-county-vaccinations', 3) });
  mockedFetchNytCounty.mockResolvedValue({ data: nytCountyData, status: okStatus('nyt-counties', 3, '2023-06-01') });
  mockedFetchNytState.mockResolvedValue({ data: nytStateData, status: okStatus('nyt-states', 2, '2023-05-30') });
});

describe('CovidDataClient - getStateData', () => {
  it('merges CDC cases + HHS + CDC vax into complete StateCovidData records', async () => {
    const client = new CovidDataClient({ fetch: dummyFetch });
    const result = await client.getStateData();

    expect(result.data.length).toBe(2);
    const ca = result.data.find((d) => d.state === 'CA');
    expect(ca).toBeDefined();
    expect(ca!.totalCases).toBe(10000);
    expect(ca!.totalDeaths).toBe(200);
    expect(ca!.hospitalizedCurrently).toBe(500);
    expect(ca!.icuCurrently).toBe(50);
    expect(ca!.totalVaccinations).toBe(50000);
    expect(ca!.peopleFullyVaccinated).toBe(35000);
    expect(ca!.vaccinationRate).toBe(0.75);
    expect(ca!.fips).toBe('06');
    expect(ca!.stateName).toBe('California');
  });

  it('returns correct field mappings for newCases, newDeaths, peopleVaccinated', async () => {
    const client = new CovidDataClient({ fetch: dummyFetch });
    const result = await client.getStateData();
    const ny = result.data.find((d) => d.state === 'NY')!;
    expect(ny.newCases).toBe(80);
    expect(ny.newDeaths).toBe(3);
    expect(ny.peopleVaccinated).toBe(38000);
  });

  it('falls back to NYT when CDC cases fails', async () => {
    mockedFetchCdcCases.mockResolvedValue({ data: new Map(), status: errStatus('cdc-cases', 'Network error') });

    const client = new CovidDataClient({ fetch: dummyFetch });
    const result = await client.getStateData();

    expect(result.data.length).toBe(2);
    const ca = result.data.find((d) => d.state === 'CA')!;
    expect(ca.totalCases).toBe(9500);
    expect(ca.totalDeaths).toBe(190);
    // NYT doesn't have newCases/newDeaths
    expect(ca.newCases).toBeNull();
    expect(ca.newDeaths).toBeNull();
    // Should still have HHS data
    expect(ca.hospitalizedCurrently).toBe(500);
    // Check that NYT state fetcher was called
    expect(mockedFetchNytState).toHaveBeenCalledOnce();
  });

  it('filters by options.states when provided', async () => {
    const client = new CovidDataClient({ fetch: dummyFetch });
    const result = await client.getStateData({ states: ['CA'] });

    expect(result.data.length).toBe(1);
    expect(result.data[0].state).toBe('CA');
  });

  it('returns all SourceStatus entries', async () => {
    const client = new CovidDataClient({ fetch: dummyFetch });
    const result = await client.getStateData();

    expect(result.sources.length).toBe(3);
    expect(result.sources.map((s) => s.name).sort()).toEqual(['cdc-cases', 'cdc-vaccinations', 'hhs-hospitalizations']);
    expect(result.sources.every((s) => s.success)).toBe(true);
  });

  it('uses cache on second call', async () => {
    const client = new CovidDataClient({ fetch: dummyFetch });
    await client.getStateData();
    await client.getStateData();

    // Source fetchers should only be called once
    expect(mockedFetchCdcCases).toHaveBeenCalledTimes(1);
    expect(mockedFetchHhsHosp).toHaveBeenCalledTimes(1);
    expect(mockedFetchCdcVax).toHaveBeenCalledTimes(1);
  });

  it('handles all sources failing gracefully', async () => {
    mockedFetchCdcCases.mockResolvedValue({ data: new Map(), status: errStatus('cdc-cases', 'fail') });
    mockedFetchHhsHosp.mockResolvedValue({ data: new Map(), status: errStatus('hhs-hospitalizations', 'fail') });
    mockedFetchCdcVax.mockResolvedValue({ data: new Map(), status: errStatus('cdc-vaccinations', 'fail') });
    mockedFetchNytState.mockResolvedValue({ data: new Map(), status: errStatus('nyt-states', 'fail') });

    const client = new CovidDataClient({ fetch: dummyFetch });
    const result = await client.getStateData();

    expect(result.data).toEqual([]);
    // CDC cases fail + NYT fallback fail + HHS fail + vax fail = 4 statuses
    expect(result.sources.length).toBe(4);
    expect(result.sources.every((s) => !s.success)).toBe(true);
    expect(result.fetchedAt).toBeTruthy();
  });

  it('computes lastUpdated as latest date across sources', async () => {
    const client = new CovidDataClient({ fetch: dummyFetch });
    const result = await client.getStateData();
    const ca = result.data.find((d) => d.state === 'CA')!;
    // HHS has the latest date: 2023-06-02
    expect(ca.lastUpdated).toBe('2023-06-02');
  });
});

describe('CovidDataClient - getCountyData', () => {
  it('merges NYT county + CDC county vax into CountyCovidData records', async () => {
    const client = new CovidDataClient({ fetch: dummyFetch });
    const result = await client.getCountyData({ state: 'CA' });

    expect(result.data.length).toBe(2);
    const la = result.data.find((d) => d.fips === '06037')!;
    expect(la.county).toBe('Los Angeles');
    expect(la.totalCases).toBe(5000);
    expect(la.totalDeaths).toBe(100);
    expect(la.totalVaccinations).toBe(20000);
    expect(la.peopleFullyVaccinated).toBe(15000);
    expect(la.vaccinationRate).toBe(0.7);
    expect(la.population).toBe(10000000);
  });

  it('filters to specified state', async () => {
    const client = new CovidDataClient({ fetch: dummyFetch });
    const result = await client.getCountyData({ state: 'CA' });

    expect(result.data.length).toBe(2);
    expect(result.data.every((d) => d.state === 'CA')).toBe(true);
  });

  it('filters by FIPS when provided', async () => {
    const client = new CovidDataClient({ fetch: dummyFetch });
    const result = await client.getCountyData({ state: 'CA', fips: ['06037'] });

    expect(result.data.length).toBe(1);
    expect(result.data[0].fips).toBe('06037');
    expect(result.data[0].county).toBe('Los Angeles');
  });

  it('returns SourceStatus entries', async () => {
    const client = new CovidDataClient({ fetch: dummyFetch });
    const result = await client.getCountyData({ state: 'CA' });

    expect(result.sources.length).toBe(2);
    expect(result.sources.map((s) => s.name).sort()).toEqual(['cdc-county-vaccinations', 'nyt-counties']);
  });

  it('handles source failure gracefully', async () => {
    mockedFetchNytCounty.mockResolvedValue({ data: new Map(), status: errStatus('nyt-counties', 'fail') });
    mockedFetchCdcCountyVax.mockResolvedValue({
      data: new Map(),
      status: errStatus('cdc-county-vaccinations', 'fail'),
    });

    const client = new CovidDataClient({ fetch: dummyFetch });
    const result = await client.getCountyData({ state: 'CA' });

    expect(result.data).toEqual([]);
    expect(result.sources.length).toBe(2);
    expect(result.sources.every((s) => !s.success)).toBe(true);
  });
});
