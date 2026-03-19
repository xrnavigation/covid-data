import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fetchNytCountyCases, fetchNytStateCases } from '../src/sources/nyt.js';

const countiesCSV = readFileSync(
  resolve(__dirname, 'fixtures/nyt-counties-sample.csv'),
  'utf-8',
);
const statesCSV = readFileSync(
  resolve(__dirname, 'fixtures/nyt-states-sample.csv'),
  'utf-8',
);

function mockFetchOk(text: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(text),
  });
}

function mockFetchError() {
  return vi.fn().mockRejectedValue(new Error('Network failure'));
}

function mockFetchHttpError(status: number) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    text: () => Promise.resolve(''),
  });
}

describe('fetchNytCountyCases', () => {
  it('parses CSV correctly into Map entries', async () => {
    const fetchFn = mockFetchOk(countiesCSV);
    const result = await fetchNytCountyCases(fetchFn);

    expect(result.data.size).toBe(5);
    expect(result.data.has('06037')).toBe(true);
    expect(result.data.has('06073')).toBe(true);
    expect(result.data.has('36061')).toBe(true);
    expect(result.data.has('17031')).toBe(true);
    expect(result.data.has('48201')).toBe(true);
  });

  it('takes latest date per FIPS', async () => {
    const fetchFn = mockFetchOk(countiesCSV);
    const result = await fetchNytCountyCases(fetchFn);

    const la = result.data.get('06037')!;
    expect(la.totalCases).toBe(3654321);
    expect(la.totalDeaths).toBe(35123);
    expect(la.lastUpdated).toBe('2023-03-23');

    const sd = result.data.get('06073')!;
    expect(sd.totalCases).toBe(987654);
    expect(sd.totalDeaths).toBe(5432);
    expect(sd.lastUpdated).toBe('2023-03-23');
  });

  it('maps state names to abbreviations', async () => {
    const fetchFn = mockFetchOk(countiesCSV);
    const result = await fetchNytCountyCases(fetchFn);

    const la = result.data.get('06037')!;
    expect(la.state).toBe('CA');
    expect(la.county).toBe('Los Angeles');

    const cook = result.data.get('17031')!;
    expect(cook.state).toBe('IL');

    const nyc = result.data.get('36061')!;
    expect(nyc.state).toBe('NY');

    const harris = result.data.get('48201')!;
    expect(harris.state).toBe('TX');
  });

  it('pads FIPS to 5 digits', async () => {
    // Fixture already has 5-digit FIPS; test with shorter value
    const csv = 'date,county,state,fips,cases,deaths\n2023-03-23,Autauga,Alabama,1001,15863,216\n';
    const fetchFn = mockFetchOk(csv);
    const result = await fetchNytCountyCases(fetchFn);

    expect(result.data.has('01001')).toBe(true);
    expect(result.data.get('01001')!.fips).toBe('01001');
  });

  it('skips rows with empty FIPS', async () => {
    const csv =
      'date,county,state,fips,cases,deaths\n2023-03-23,Unknown,Alabama,,100,5\n2023-03-23,Cook,Illinois,17031,1000,10\n';
    const fetchFn = mockFetchOk(csv);
    const result = await fetchNytCountyCases(fetchFn);

    expect(result.data.size).toBe(1);
    expect(result.data.has('17031')).toBe(true);
  });

  it('returns success SourceStatus with dataThrough', async () => {
    const fetchFn = mockFetchOk(countiesCSV);
    const result = await fetchNytCountyCases(fetchFn);

    expect(result.status.name).toBe('nyt-counties');
    expect(result.status.url).toContain('nytimes');
    expect(result.status.success).toBe(true);
    expect(result.status.recordCount).toBe(5);
    expect(result.status.dataThrough).toBe('2023-03-23');
  });

  it('handles fetch failure gracefully', async () => {
    const fetchFn = mockFetchError();
    const result = await fetchNytCountyCases(fetchFn);

    expect(result.data.size).toBe(0);
    expect(result.status.success).toBe(false);
    expect(result.status.error).toBe('Network failure');
    expect(result.status.recordCount).toBe(0);
  });

  it('handles HTTP error response', async () => {
    const fetchFn = mockFetchHttpError(404);
    const result = await fetchNytCountyCases(fetchFn);

    expect(result.data.size).toBe(0);
    expect(result.status.success).toBe(false);
    expect(result.status.error).toBe('HTTP 404');
  });

  it('handles empty CSV (just headers)', async () => {
    const csv = 'date,county,state,fips,cases,deaths\n';
    const fetchFn = mockFetchOk(csv);
    const result = await fetchNytCountyCases(fetchFn);

    expect(result.data.size).toBe(0);
    expect(result.status.success).toBe(true);
    expect(result.status.recordCount).toBe(0);
  });
});

describe('fetchNytStateCases', () => {
  it('parses CSV correctly into Map entries', async () => {
    const fetchFn = mockFetchOk(statesCSV);
    const result = await fetchNytStateCases(fetchFn);

    expect(result.data.size).toBe(3);
    expect(result.data.has('CA')).toBe(true);
    expect(result.data.has('NY')).toBe(true);
    expect(result.data.has('IL')).toBe(true);
  });

  it('takes latest date per state', async () => {
    const fetchFn = mockFetchOk(statesCSV);
    const result = await fetchNytStateCases(fetchFn);

    const ca = result.data.get('CA')!;
    expect(ca.totalCases).toBe(10234567);
    expect(ca.totalDeaths).toBe(101234);
    expect(ca.lastUpdated).toBe('2023-03-23');
  });

  it('maps state names to abbreviations', async () => {
    const fetchFn = mockFetchOk(statesCSV);
    const result = await fetchNytStateCases(fetchFn);

    // Keys should be abbreviations, not full names
    expect(result.data.has('California')).toBe(false);
    expect(result.data.has('CA')).toBe(true);
  });

  it('returns success SourceStatus with dataThrough', async () => {
    const fetchFn = mockFetchOk(statesCSV);
    const result = await fetchNytStateCases(fetchFn);

    expect(result.status.name).toBe('nyt-states');
    expect(result.status.url).toContain('nytimes');
    expect(result.status.success).toBe(true);
    expect(result.status.recordCount).toBe(3);
    expect(result.status.dataThrough).toBe('2023-03-23');
  });

  it('handles fetch failure gracefully', async () => {
    const fetchFn = mockFetchError();
    const result = await fetchNytStateCases(fetchFn);

    expect(result.data.size).toBe(0);
    expect(result.status.success).toBe(false);
    expect(result.status.error).toBe('Network failure');
  });

  it('handles HTTP error response', async () => {
    const fetchFn = mockFetchHttpError(500);
    const result = await fetchNytStateCases(fetchFn);

    expect(result.data.size).toBe(0);
    expect(result.status.success).toBe(false);
    expect(result.status.error).toBe('HTTP 500');
  });

  it('handles empty CSV (just headers)', async () => {
    const csv = 'date,state,fips,cases,deaths\n';
    const fetchFn = mockFetchOk(csv);
    const result = await fetchNytStateCases(fetchFn);

    expect(result.data.size).toBe(0);
    expect(result.status.success).toBe(true);
    expect(result.status.recordCount).toBe(0);
  });

  it('skips states that cannot be mapped to abbreviations', async () => {
    const csv =
      'date,state,fips,cases,deaths\n2023-03-23,Narnia,99,100,5\n2023-03-23,California,06,1000,10\n';
    const fetchFn = mockFetchOk(csv);
    const result = await fetchNytStateCases(fetchFn);

    expect(result.data.size).toBe(1);
    expect(result.data.has('CA')).toBe(true);
  });
});
