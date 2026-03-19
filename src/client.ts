import { TTLCache } from './cache.js';
import { fetchNytCountyCases, fetchNytStateCases } from './sources/nyt.js';
import {
  fetchCdcCases,
  fetchCdcCountyVaccinations,
  fetchCdcVaccinations,
  fetchHhsHospitalizations,
} from './sources/soda.js';
import type {
  CountyCovidData,
  CountyDataOptions,
  CovidDataClientOptions,
  CovidDataResult,
  SourceStatus,
  StateCovidData,
  StateDataOptions,
} from './types.js';
import { stateAbbrToFips, stateAbbrToName } from './utils.js';

type FetchFn = typeof globalThis.fetch;

export class CovidDataClient {
  private fetchFn: FetchFn;
  private cache: TTLCache<CovidDataResult<unknown>>;

  constructor(options?: CovidDataClientOptions) {
    this.fetchFn = options?.fetch ?? globalThis.fetch;
    const cacheTTL = options?.cacheTTL ?? 3_600_000;
    this.cache = new TTLCache(cacheTTL);
  }

  async getStateData(options?: StateDataOptions): Promise<CovidDataResult<StateCovidData>> {
    const cacheKey = options?.states?.length ? `states:${[...options.states].sort().join(',')}` : 'states';

    const cached = this.cache.get(cacheKey) as CovidDataResult<StateCovidData> | undefined;
    if (cached) return cached;

    const sources: SourceStatus[] = [];

    // Fetch all three sources in parallel
    const [cdcCasesResult, hhsResult, vaxResult] = await Promise.all([
      fetchCdcCases(this.fetchFn),
      fetchHhsHospitalizations(this.fetchFn),
      fetchCdcVaccinations(this.fetchFn),
    ]);

    let casesData = cdcCasesResult.data;
    let casesHaveNewFields = true;
    sources.push(cdcCasesResult.status);

    // If CDC cases failed, fall back to NYT
    if (!cdcCasesResult.status.success) {
      const nytResult = await fetchNytStateCases(this.fetchFn);
      sources.push(nytResult.status);
      // Convert NYT StatePartial to the same shape as CdcCasesEntry
      casesData = new Map();
      casesHaveNewFields = false;
      for (const [abbr, entry] of nytResult.data) {
        casesData.set(abbr, {
          totalCases: entry.totalCases ?? 0,
          totalDeaths: entry.totalDeaths ?? 0,
          newCases: 0,
          newDeaths: 0,
          lastUpdated: entry.lastUpdated ?? '',
        });
      }
    }

    sources.push(hhsResult.status);
    sources.push(vaxResult.status);

    // Collect all state abbreviations
    const allStates = new Set<string>();
    for (const abbr of casesData.keys()) allStates.add(abbr);
    for (const abbr of hhsResult.data.keys()) allStates.add(abbr);
    for (const abbr of vaxResult.data.keys()) allStates.add(abbr);

    const data: StateCovidData[] = [];

    for (const abbr of allStates) {
      if (options?.states && !options.states.includes(abbr)) continue;

      const cases = casesData.get(abbr);
      const hosp = hhsResult.data.get(abbr);
      const vax = vaxResult.data.get(abbr);

      // Determine lastUpdated as the latest date across all sources for this state
      const dates = [cases?.lastUpdated, hosp?.lastUpdated].filter(Boolean) as string[];
      const lastUpdated = dates.length > 0 ? dates.sort().pop()! : null;

      const totalCases = cases?.totalCases ?? null;
      const totalDeaths = cases?.totalDeaths ?? null;

      data.push({
        state: abbr,
        fips: stateAbbrToFips(abbr) ?? '',
        stateName: stateAbbrToName(abbr) ?? abbr,
        totalCases,
        totalDeaths,
        newCases: casesHaveNewFields ? (cases?.newCases ?? null) : null,
        newDeaths: casesHaveNewFields ? (cases?.newDeaths ?? null) : null,
        hospitalizedCurrently: hosp?.hospitalizedCurrently ?? null,
        icuCurrently: hosp?.icuCurrently ?? null,
        totalVaccinations: vax?.totalVaccinations ?? null,
        peopleVaccinated: vax?.peopleVaccinated ?? null,
        peopleFullyVaccinated: vax?.peopleFullyVaccinated ?? null,
        vaccinationRate: vax?.vaccinationRate ?? null,
        population: null,
        casesPerMillion: null,
        deathsPerMillion: null,
        lastUpdated,
      });
    }

    const result: CovidDataResult<StateCovidData> = {
      data,
      sources,
      fetchedAt: new Date().toISOString(),
    };

    this.cache.set(cacheKey, result as CovidDataResult<unknown>);
    return result;
  }

  async getCountyData(options: CountyDataOptions): Promise<CovidDataResult<CountyCovidData>> {
    const cacheKey = `counties:${options.state}`;

    const cached = this.cache.get(cacheKey) as CovidDataResult<CountyCovidData> | undefined;
    if (cached) {
      // Apply FIPS filter even on cached results
      if (options.fips) {
        const fipsSet = new Set(options.fips);
        return { ...cached, data: cached.data.filter((d) => fipsSet.has(d.fips)) };
      }
      return cached;
    }

    const [nytResult, countyVaxResult] = await Promise.all([
      fetchNytCountyCases(this.fetchFn),
      fetchCdcCountyVaccinations(this.fetchFn),
    ]);

    const sources: SourceStatus[] = [nytResult.status, countyVaxResult.status];

    // Collect all FIPS codes
    const allFips = new Set<string>();
    for (const fips of nytResult.data.keys()) allFips.add(fips);
    for (const fips of countyVaxResult.data.keys()) allFips.add(fips);

    const data: CountyCovidData[] = [];

    for (const fips of allFips) {
      const nyt = nytResult.data.get(fips);
      const vax = countyVaxResult.data.get(fips);

      // Determine state from NYT data (it has county-to-state mapping)
      const stateAbbr = nyt?.state;
      if (!stateAbbr) continue; // Can't determine state without NYT data

      // Filter to specified state
      if (stateAbbr !== options.state) continue;

      data.push({
        fips,
        county: nyt?.county ?? '',
        state: stateAbbr,
        totalCases: nyt?.totalCases ?? null,
        totalDeaths: nyt?.totalDeaths ?? null,
        totalVaccinations: vax?.totalVaccinations ?? null,
        peopleFullyVaccinated: vax?.peopleFullyVaccinated ?? null,
        vaccinationRate: vax?.vaccinationRate ?? null,
        population: vax?.population ?? null,
        lastUpdated: nyt?.lastUpdated ?? null,
      });
    }

    const result: CovidDataResult<CountyCovidData> = {
      data,
      sources,
      fetchedAt: new Date().toISOString(),
    };

    this.cache.set(cacheKey, result as CovidDataResult<unknown>);

    // Apply FIPS filter
    if (options.fips) {
      const fipsSet = new Set(options.fips);
      return { ...result, data: result.data.filter((d) => fipsSet.has(d.fips)) };
    }

    return result;
  }
}
