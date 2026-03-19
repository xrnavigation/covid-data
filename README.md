# @xrnavigation/covid-data

Isomorphic TypeScript client for US COVID-19 data from CDC, HHS, and NYT sources. Aggregates cases, deaths, hospitalizations, and vaccination data at state and county levels into a normalized interface with built-in caching and automatic source failover.

## Install

This package is published to GitHub Packages. Add a `.npmrc` to your project:

```
@xrnavigation:registry=https://npm.pkg.github.com
```

Then install:

```bash
npm install @xrnavigation/covid-data
```

## Usage

```typescript
import { CovidDataClient } from '@xrnavigation/covid-data';

const client = new CovidDataClient();

// Get state-level data
const stateResult = await client.getStateData();
for (const state of stateResult.data) {
  console.log(`${state.stateName}: ${state.totalCases} cases, ${state.vaccinationRate} vax rate`);
}

// Filter to specific states
const filtered = await client.getStateData({ states: ['CA', 'NY', 'TX'] });

// Get county-level data for a state
const countyResult = await client.getCountyData({ state: 'CA' });
for (const county of countyResult.data) {
  console.log(`${county.county}: ${county.totalCases} cases`);
}

// Filter to specific counties by FIPS
const la = await client.getCountyData({ state: 'CA', fips: ['06037'] });
```

## Data Sources

| Source | Data | Coverage |
|--------|------|----------|
| CDC (SODA API) | Cases, deaths (state-level) | Through 2024 |
| HHS (SODA API) | Hospitalizations, ICU (state-level) | Through 2024 |
| CDC (SODA API) | Vaccinations (state + county) | Through 2023 |
| NYT (GitHub CSV) | Cases, deaths (state + county fallback) | Through 2023 |

All sources are frozen historical data. The US government wound down routine COVID-19 data collection between 2022 and 2024. This library is useful for historical analysis but will not reflect current conditions.

## API Reference

### `CovidDataClient`

```typescript
const client = new CovidDataClient(options?: CovidDataClientOptions);
```

**Options:**
- `cacheTTL` - Cache duration in milliseconds (default: 3,600,000 = 1 hour)
- `fetch` - Custom fetch function for testing or custom HTTP clients

### `client.getStateData(options?)`

Returns `Promise<CovidDataResult<StateCovidData>>`.

**Options:**
- `states` - Array of two-letter state abbreviations to filter by

**StateCovidData fields:** `state`, `fips`, `stateName`, `totalCases`, `totalDeaths`, `newCases`, `newDeaths`, `hospitalizedCurrently`, `icuCurrently`, `totalVaccinations`, `peopleVaccinated`, `peopleFullyVaccinated`, `vaccinationRate`, `population`, `casesPerMillion`, `deathsPerMillion`, `lastUpdated`

### `client.getCountyData(options)`

Returns `Promise<CovidDataResult<CountyCovidData>>`.

**Options:**
- `state` - Two-letter state abbreviation (required)
- `fips` - Array of five-digit county FIPS codes to filter by

**CountyCovidData fields:** `fips`, `county`, `state`, `totalCases`, `totalDeaths`, `totalVaccinations`, `peopleFullyVaccinated`, `vaccinationRate`, `population`, `lastUpdated`

### `CovidDataResult<T>`

All data methods return this wrapper:

```typescript
interface CovidDataResult<T> {
  data: T[];              // Normalized records
  sources: SourceStatus[]; // Status of each source fetched
  fetchedAt: string;       // ISO timestamp
}
```

### Utility Exports

- `stateAbbrToFips(abbr)` - Convert state abbreviation to FIPS code
- `fipsToStateAbbr(fips)` - Convert FIPS code to state abbreviation
- `stateAbbrToName(abbr)` - Convert abbreviation to full state name
- `isValidFips(fips)` - Validate a FIPS code
- `TTLCache` - Generic TTL cache used internally

## License

MIT
