import { describe, it, expect, vi } from 'vitest';
import {
  fetchCdcCases,
  fetchHhsHospitalizations,
  fetchCdcVaccinations,
  fetchCdcCountyVaccinations,
} from '../src/sources/soda.js';

// Fixture imports
import cdcCasesMaxDate from './fixtures/cdc-cases-max-date.json';
import cdcCasesSample from './fixtures/cdc-cases-sample.json';
import hhsHospMaxDate from './fixtures/hhs-hospitalizations-max-date.json';
import hhsHospSample from './fixtures/hhs-hospitalizations-sample.json';
import cdcVaxMaxDate from './fixtures/cdc-vaccinations-max-date.json';
import cdcVaxSample from './fixtures/cdc-vaccinations-sample.json';
import cdcCountyVaxSample from './fixtures/cdc-county-vax-sample.json';

/** Helper: create a mock fetch that returns different responses per URL pattern */
function mockFetch(responses: Array<{ match: string; json: unknown }>): typeof globalThis.fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    for (const r of responses) {
      if (url.includes(r.match)) {
        return {
          ok: true,
          json: async () => r.json,
        } as Response;
      }
    }
    return { ok: false, status: 404, json: async () => ({}) } as unknown as Response;
  }) as unknown as typeof globalThis.fetch;
}

/** Helper: create a mock fetch that always rejects */
function failingFetch(): typeof globalThis.fetch {
  return vi.fn(async () => {
    throw new Error('Network error');
  }) as unknown as typeof globalThis.fetch;
}

// ---------------------------------------------------------------------------
// fetchCdcCases
// ---------------------------------------------------------------------------
describe('fetchCdcCases', () => {
  it('returns correct Map entries from fixture data', async () => {
    const fn = mockFetch([
      { match: 'MAX(end_date)', json: cdcCasesMaxDate },
      { match: '$where', json: cdcCasesSample },
    ]);
    const { data, status } = await fetchCdcCases(fn);

    expect(data.size).toBe(5);
    expect(data.has('AK')).toBe(true);
    expect(data.has('AL')).toBe(true);
    expect(data.has('AR')).toBe(true);
    expect(data.has('AS')).toBe(true);
    expect(data.has('AZ')).toBe(true);
  });

  it('maps field names correctly', async () => {
    const fn = mockFetch([
      { match: 'MAX(end_date)', json: cdcCasesMaxDate },
      { match: '$where', json: cdcCasesSample },
    ]);
    const { data } = await fetchCdcCases(fn);
    const ak = data.get('AK')!;

    expect(ak).toEqual({
      totalCases: 297588,
      totalDeaths: 1468,
      newCases: 199,
      newDeaths: 0,
      lastUpdated: '2023-05-10',
    });
  });

  it('parses numeric strings to numbers', async () => {
    const fn = mockFetch([
      { match: 'MAX(end_date)', json: cdcCasesMaxDate },
      { match: '$where', json: cdcCasesSample },
    ]);
    const { data } = await fetchCdcCases(fn);
    const az = data.get('AZ')!;

    expect(typeof az.totalCases).toBe('number');
    expect(typeof az.newCases).toBe('number');
    expect(typeof az.totalDeaths).toBe('number');
    expect(typeof az.newDeaths).toBe('number');
    expect(az.totalCases).toBe(2474154);
  });

  it('returns success SourceStatus with correct metadata', async () => {
    const fn = mockFetch([
      { match: 'MAX(end_date)', json: cdcCasesMaxDate },
      { match: '$where', json: cdcCasesSample },
    ]);
    const { status } = await fetchCdcCases(fn);

    expect(status.name).toBe('cdc-cases');
    expect(status.success).toBe(true);
    expect(status.recordCount).toBe(5);
    expect(status.dataThrough).toBe('2023-05-10');
  });

  it('handles fetch failure gracefully', async () => {
    const { data, status } = await fetchCdcCases(failingFetch());

    expect(data.size).toBe(0);
    expect(status.success).toBe(false);
    expect(status.error).toBe('Network error');
    expect(status.name).toBe('cdc-cases');
  });

  it('handles empty response gracefully', async () => {
    const fn = mockFetch([
      { match: 'MAX(end_date)', json: [{ MAX_end_date: '2023-05-10T00:00:00.000' }] },
      { match: '$where', json: [] },
    ]);
    const { data, status } = await fetchCdcCases(fn);

    expect(data.size).toBe(0);
    expect(status.success).toBe(true);
    expect(status.recordCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// fetchHhsHospitalizations
// ---------------------------------------------------------------------------
describe('fetchHhsHospitalizations', () => {
  it('returns correct Map entries from fixture data', async () => {
    const fn = mockFetch([
      { match: 'MAX(date)', json: hhsHospMaxDate },
      { match: '$where', json: hhsHospSample },
    ]);
    const { data } = await fetchHhsHospitalizations(fn);

    expect(data.size).toBe(5);
    expect(data.has('VI')).toBe(true);
    expect(data.has('SC')).toBe(true);
    expect(data.has('IN')).toBe(true);
    expect(data.has('FL')).toBe(true);
    expect(data.has('NH')).toBe(true);
  });

  it('maps field names correctly', async () => {
    const fn = mockFetch([
      { match: 'MAX(date)', json: hhsHospMaxDate },
      { match: '$where', json: hhsHospSample },
    ]);
    const { data } = await fetchHhsHospitalizations(fn);

    // SC has inpatient_beds_used_covid=144, staffed_adult_icu_bed_occupancy is missing
    const sc = data.get('SC')!;
    expect(sc.hospitalizedCurrently).toBe(144);
    // SC doesn't have staffed_adult_icu_bed_occupancy in fixture
    expect(sc.icuCurrently).toBeNull();
    expect(sc.lastUpdated).toBe('2024-04-27');

    // VI has no inpatient_beds_used_covid, but has staffed_adult_icu_bed_occupancy=5
    const vi = data.get('VI')!;
    expect(vi.hospitalizedCurrently).toBeNull();
    expect(vi.icuCurrently).toBe(5);
  });

  it('parses numeric strings to numbers', async () => {
    const fn = mockFetch([
      { match: 'MAX(date)', json: hhsHospMaxDate },
      { match: '$where', json: hhsHospSample },
    ]);
    const { data } = await fetchHhsHospitalizations(fn);
    const fl = data.get('FL')!;

    expect(typeof fl.hospitalizedCurrently).toBe('number');
    expect(fl.hospitalizedCurrently).toBe(289);
  });

  it('returns success SourceStatus with correct metadata', async () => {
    const fn = mockFetch([
      { match: 'MAX(date)', json: hhsHospMaxDate },
      { match: '$where', json: hhsHospSample },
    ]);
    const { status } = await fetchHhsHospitalizations(fn);

    expect(status.name).toBe('hhs-hospitalizations');
    expect(status.success).toBe(true);
    expect(status.recordCount).toBe(5);
    expect(status.dataThrough).toBe('2024-04-27');
  });

  it('handles fetch failure gracefully', async () => {
    const { data, status } = await fetchHhsHospitalizations(failingFetch());

    expect(data.size).toBe(0);
    expect(status.success).toBe(false);
    expect(status.error).toBe('Network error');
  });

  it('handles empty response gracefully', async () => {
    const fn = mockFetch([
      { match: 'MAX(date)', json: [{ MAX_date: '2024-04-27T00:00:00.000' }] },
      { match: '$where', json: [] },
    ]);
    const { data, status } = await fetchHhsHospitalizations(fn);

    expect(data.size).toBe(0);
    expect(status.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// fetchCdcVaccinations
// ---------------------------------------------------------------------------
describe('fetchCdcVaccinations', () => {
  it('returns correct Map entries from fixture data', async () => {
    const fn = mockFetch([
      { match: 'MAX(date)', json: cdcVaxMaxDate },
      { match: '$where', json: cdcVaxSample },
    ]);
    const { data } = await fetchCdcVaccinations(fn);

    expect(data.size).toBe(5);
    expect(data.has('NE')).toBe(true);
    expect(data.has('LA')).toBe(true);
    expect(data.has('GA')).toBe(true);
    expect(data.has('WY')).toBe(true);
    expect(data.has('CO')).toBe(true);
  });

  it('maps field names correctly', async () => {
    const fn = mockFetch([
      { match: 'MAX(date)', json: cdcVaxMaxDate },
      { match: '$where', json: cdcVaxSample },
    ]);
    const { data } = await fetchCdcVaccinations(fn);
    const co = data.get('CO')!;

    expect(co.totalVaccinations).toBe(13033446);
    expect(co.peopleVaccinated).toBe(4837792);
    expect(co.peopleFullyVaccinated).toBe(4248431);
    expect(co.vaccinationRate).toBeCloseTo(0.738, 3);
  });

  it('parses numeric strings to numbers', async () => {
    const fn = mockFetch([
      { match: 'MAX(date)', json: cdcVaxMaxDate },
      { match: '$where', json: cdcVaxSample },
    ]);
    const { data } = await fetchCdcVaccinations(fn);
    const ne = data.get('NE')!;

    expect(typeof ne.totalVaccinations).toBe('number');
    expect(typeof ne.peopleVaccinated).toBe('number');
    expect(typeof ne.peopleFullyVaccinated).toBe('number');
    expect(typeof ne.vaccinationRate).toBe('number');
  });

  it('returns success SourceStatus with correct metadata', async () => {
    const fn = mockFetch([
      { match: 'MAX(date)', json: cdcVaxMaxDate },
      { match: '$where', json: cdcVaxSample },
    ]);
    const { status } = await fetchCdcVaccinations(fn);

    expect(status.name).toBe('cdc-vaccinations');
    expect(status.success).toBe(true);
    expect(status.recordCount).toBe(5);
    expect(status.dataThrough).toBe('2023-05-10');
  });

  it('handles fetch failure gracefully', async () => {
    const { data, status } = await fetchCdcVaccinations(failingFetch());

    expect(data.size).toBe(0);
    expect(status.success).toBe(false);
    expect(status.error).toBe('Network error');
  });

  it('handles empty response gracefully', async () => {
    const fn = mockFetch([
      { match: 'MAX(date)', json: [{ MAX_date: '2023-05-10T00:00:00.000' }] },
      { match: '$where', json: [] },
    ]);
    const { data, status } = await fetchCdcVaccinations(fn);

    expect(data.size).toBe(0);
    expect(status.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// fetchCdcCountyVaccinations
// ---------------------------------------------------------------------------
describe('fetchCdcCountyVaccinations', () => {
  it('returns correct Map entries keyed by FIPS', async () => {
    const fn = mockFetch([
      { match: '8xkx-amqh', json: cdcCountyVaxSample },
    ]);
    const { data } = await fetchCdcCountyVaccinations(fn);

    expect(data.size).toBe(5);
    expect(data.has('55129')).toBe(true);  // Washburn County, WI
    expect(data.has('19173')).toBe(true);  // Taylor County, IA
    expect(data.has('36059')).toBe(true);  // Nassau County, NY
    expect(data.has('48281')).toBe(true);  // Lampasas County, TX
    expect(data.has('26145')).toBe(true);  // Saginaw County, MI
  });

  it('maps field names correctly', async () => {
    const fn = mockFetch([
      { match: '8xkx-amqh', json: cdcCountyVaxSample },
    ]);
    const { data } = await fetchCdcCountyVaccinations(fn);
    const nassau = data.get('36059')!;

    expect(nassau.totalVaccinations).toBe(1391226);
    expect(nassau.peopleFullyVaccinated).toBe(1179481);
    expect(nassau.population).toBe(1356924);
    // vaccinationRate = 1179481 / 1356924
    expect(nassau.vaccinationRate).toBeCloseTo(1179481 / 1356924, 5);
  });

  it('computes vaccinationRate from series_complete_yes / census2019', async () => {
    const fn = mockFetch([
      { match: '8xkx-amqh', json: cdcCountyVaxSample },
    ]);
    const { data } = await fetchCdcCountyVaccinations(fn);
    const washburn = data.get('55129')!;

    expect(washburn.vaccinationRate).toBeCloseTo(10325 / 15720, 5);
    expect(washburn.population).toBe(15720);
  });

  it('parses numeric strings to numbers', async () => {
    const fn = mockFetch([
      { match: '8xkx-amqh', json: cdcCountyVaxSample },
    ]);
    const { data } = await fetchCdcCountyVaccinations(fn);
    const tx = data.get('48281')!;

    expect(typeof tx.totalVaccinations).toBe('number');
    expect(typeof tx.peopleFullyVaccinated).toBe('number');
    expect(typeof tx.population).toBe('number');
    expect(typeof tx.vaccinationRate).toBe('number');
  });

  it('returns success SourceStatus with correct metadata', async () => {
    const fn = mockFetch([
      { match: '8xkx-amqh', json: cdcCountyVaxSample },
    ]);
    const { status } = await fetchCdcCountyVaccinations(fn);

    expect(status.name).toBe('cdc-county-vaccinations');
    expect(status.success).toBe(true);
    expect(status.recordCount).toBe(5);
  });

  it('handles fetch failure gracefully', async () => {
    const { data, status } = await fetchCdcCountyVaccinations(failingFetch());

    expect(data.size).toBe(0);
    expect(status.success).toBe(false);
    expect(status.error).toBe('Network error');
  });

  it('handles empty response gracefully', async () => {
    const fn = mockFetch([
      { match: '8xkx-amqh', json: [] },
    ]);
    const { data, status } = await fetchCdcCountyVaccinations(fn);

    expect(data.size).toBe(0);
    expect(status.success).toBe(true);
    expect(status.recordCount).toBe(0);
  });
});
