import { describe, it, expect, vi } from 'vitest';
import { fetchDiseaseShStates, fetchDiseaseShCounties } from '../src/sources/disease-sh.js';
import statesFixture from './fixtures/disease-sh-states-sample.json';
import countiesFixture from './fixtures/disease-sh-counties-sample.json';
import { stateNameToAbbr } from '../src/utils.js';

function mockFetchOk(data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockFetchError() {
  return vi.fn().mockRejectedValue(new Error('Network failure'));
}

function mockFetchHttpError(status: number) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({}),
  });
}

describe('stateNameToAbbr', () => {
  it('maps full state names to abbreviations', () => {
    expect(stateNameToAbbr('California')).toBe('CA');
    expect(stateNameToAbbr('New York')).toBe('NY');
    expect(stateNameToAbbr('Texas')).toBe('TX');
    expect(stateNameToAbbr('District of Columbia')).toBe('DC');
  });

  it('is case-insensitive', () => {
    expect(stateNameToAbbr('california')).toBe('CA');
    expect(stateNameToAbbr('CALIFORNIA')).toBe('CA');
  });

  it('trims whitespace', () => {
    expect(stateNameToAbbr('  California  ')).toBe('CA');
  });

  it('returns undefined for unknown names', () => {
    expect(stateNameToAbbr('Narnia')).toBeUndefined();
    expect(stateNameToAbbr('')).toBeUndefined();
  });
});

describe('fetchDiseaseShStates', () => {
  it('returns correct Map entries from fixture data', async () => {
    const fetchFn = mockFetchOk(statesFixture);
    const result = await fetchDiseaseShStates(fetchFn);

    expect(result.data.size).toBe(5);
    expect(result.data.has('CA')).toBe(true);
    expect(result.data.has('TX')).toBe(true);
    expect(result.data.has('FL')).toBe(true);
    expect(result.data.has('NY')).toBe(true);
    expect(result.data.has('IL')).toBe(true);
  });

  it('maps state names to abbreviations correctly', async () => {
    const fetchFn = mockFetchOk(statesFixture);
    const result = await fetchDiseaseShStates(fetchFn);

    // Should not have full state names as keys
    expect(result.data.has('California')).toBe(false);
    expect(result.data.has('New York')).toBe(false);
  });

  it('maps fields correctly', async () => {
    const fetchFn = mockFetchOk(statesFixture);
    const result = await fetchDiseaseShStates(fetchFn);

    const ca = result.data.get('CA')!;
    expect(ca.totalCases).toBe(12711918);
    expect(ca.totalDeaths).toBe(112443);
    expect(ca.casesPerMillion).toBe(321721);
    expect(ca.deathsPerMillion).toBe(2846);
    expect(ca.population).toBe(39512223);
    expect(ca.lastUpdated).toBe(new Date(1773942671924).toISOString());
  });

  it('sets newCases/newDeaths to null when not present', async () => {
    const fetchFn = mockFetchOk(statesFixture);
    const result = await fetchDiseaseShStates(fetchFn);

    const ca = result.data.get('CA')!;
    // Fixture has no todayCases/todayDeaths fields
    expect(ca.newCases).toBeNull();
    expect(ca.newDeaths).toBeNull();
  });

  it('returns success SourceStatus with correct metadata', async () => {
    const fetchFn = mockFetchOk(statesFixture);
    const result = await fetchDiseaseShStates(fetchFn);

    expect(result.status.name).toBe('disease-sh-states');
    expect(result.status.url).toBe('https://disease.sh/v3/covid-19/states');
    expect(result.status.success).toBe(true);
    expect(result.status.recordCount).toBe(5);
  });

  it('handles fetch failure gracefully', async () => {
    const fetchFn = mockFetchError();
    const result = await fetchDiseaseShStates(fetchFn);

    expect(result.data.size).toBe(0);
    expect(result.status.success).toBe(false);
    expect(result.status.error).toBe('Network failure');
    expect(result.status.recordCount).toBe(0);
  });

  it('handles HTTP error response', async () => {
    const fetchFn = mockFetchHttpError(500);
    const result = await fetchDiseaseShStates(fetchFn);

    expect(result.data.size).toBe(0);
    expect(result.status.success).toBe(false);
    expect(result.status.error).toBe('HTTP 500');
  });

  it('handles empty response gracefully', async () => {
    const fetchFn = mockFetchOk([]);
    const result = await fetchDiseaseShStates(fetchFn);

    expect(result.data.size).toBe(0);
    expect(result.status.success).toBe(true);
    expect(result.status.recordCount).toBe(0);
  });
});

describe('fetchDiseaseShCounties', () => {
  it('returns correct Map entries from fixture data', async () => {
    const fetchFn = mockFetchOk(countiesFixture);
    const result = await fetchDiseaseShCounties(fetchFn);

    expect(result.data.size).toBe(10);
    expect(result.data.has('01001')).toBe(true);
    expect(result.data.has('01003')).toBe(true);
    expect(result.data.has('01019')).toBe(true);
  });

  it('maps state names to abbreviations for counties', async () => {
    const fetchFn = mockFetchOk(countiesFixture);
    const result = await fetchDiseaseShCounties(fetchFn);

    const autauga = result.data.get('01001')!;
    expect(autauga.state).toBe('AL');
    expect(autauga.county).toBe('Autauga');
  });

  it('maps fields correctly', async () => {
    const fetchFn = mockFetchOk(countiesFixture);
    const result = await fetchDiseaseShCounties(fetchFn);

    const autauga = result.data.get('01001')!;
    expect(autauga.totalCases).toBe(15863);
    expect(autauga.totalDeaths).toBe(216);
    expect(autauga.fips).toBe('01001');
    expect(autauga.lastUpdated).toBe('2022-05-13');
  });

  it('handles FIPS padding for counties', async () => {
    // Create fixture with numeric (non-padded) FIPS
    const unpadded = [
      {
        date: '2022-05-13',
        county: 'Test County',
        state: 'Alabama',
        fips: 1001,
        cases: 100,
        deaths: 5,
      },
    ];
    const fetchFn = mockFetchOk(unpadded);
    const result = await fetchDiseaseShCounties(fetchFn);

    expect(result.data.has('01001')).toBe(true);
    expect(result.data.get('01001')!.fips).toBe('01001');
  });

  it('takes latest date per county FIPS', async () => {
    const multiDate = [
      {
        date: '2022-05-12',
        county: 'Autauga',
        state: 'Alabama',
        fips: '01001',
        cases: 15000,
        deaths: 210,
      },
      {
        date: '2022-05-13',
        county: 'Autauga',
        state: 'Alabama',
        fips: '01001',
        cases: 15863,
        deaths: 216,
      },
      {
        date: '2022-05-11',
        county: 'Autauga',
        state: 'Alabama',
        fips: '01001',
        cases: 14900,
        deaths: 205,
      },
    ];
    const fetchFn = mockFetchOk(multiDate);
    const result = await fetchDiseaseShCounties(fetchFn);

    expect(result.data.size).toBe(1);
    const autauga = result.data.get('01001')!;
    expect(autauga.totalCases).toBe(15863);
    expect(autauga.totalDeaths).toBe(216);
    expect(autauga.lastUpdated).toBe('2022-05-13');
  });

  it('returns success SourceStatus with correct metadata', async () => {
    const fetchFn = mockFetchOk(countiesFixture);
    const result = await fetchDiseaseShCounties(fetchFn);

    expect(result.status.name).toBe('disease-sh-counties');
    expect(result.status.url).toBe('https://disease.sh/v3/covid-19/nyt/counties');
    expect(result.status.success).toBe(true);
    expect(result.status.recordCount).toBe(10);
  });

  it('handles fetch failure gracefully', async () => {
    const fetchFn = mockFetchError();
    const result = await fetchDiseaseShCounties(fetchFn);

    expect(result.data.size).toBe(0);
    expect(result.status.success).toBe(false);
    expect(result.status.error).toBe('Network failure');
  });

  it('handles empty response gracefully', async () => {
    const fetchFn = mockFetchOk([]);
    const result = await fetchDiseaseShCounties(fetchFn);

    expect(result.data.size).toBe(0);
    expect(result.status.success).toBe(true);
    expect(result.status.recordCount).toBe(0);
  });

  it('skips entries with null FIPS', async () => {
    const nullFips = [
      {
        date: '2022-05-13',
        county: 'Unknown',
        state: 'Alabama',
        fips: null,
        cases: 100,
        deaths: 5,
      },
    ];
    const fetchFn = mockFetchOk(nullFips);
    const result = await fetchDiseaseShCounties(fetchFn);

    expect(result.data.size).toBe(0);
  });
});
