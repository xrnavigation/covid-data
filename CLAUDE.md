# CLAUDE.md

Project instructions for Claude Code when working with this repository.

## Essential Commands

```bash
npm install          # Install dependencies
npm run build        # Build ESM + CJS outputs
npm test             # Run tests (vitest)
npm run test:watch   # Watch mode
npm run test:coverage # With coverage
npm run lint         # Check with Biome
npm run lint:fix     # Auto-fix lint issues
npm run format       # Format with Biome
```

### Running a Single Test

```bash
npm test tests/soda.test.ts
npm test -- -t "fetchCdcCases"
```

## Architecture Overview

This is an **isomorphic TypeScript client** for US COVID-19 data. It fetches from multiple government sources (CDC, HHS, NYT) and normalizes them into a consistent interface.

### Key Components

- **`CovidDataClient`** (`src/client.ts`) - Main entry point. Orchestrates fetching from multiple sources, merges results, handles failover (CDC -> NYT for cases).
- **`src/sources/soda.ts`** - CDC and HHS data via SODA API (cases, hospitalizations, vaccinations).
- **`src/sources/nyt.ts`** - NYT COVID data from GitHub CSV files (county + state cases/deaths).
- **`src/cache.ts`** - Generic TTL cache for deduplicating requests.
- **`src/utils.ts`** - State FIPS/abbreviation/name mappings.
- **`src/types.ts`** - All TypeScript interfaces.

### Design Decisions

1. **Isomorphic** - Works in Node and browsers. Uses `globalThis.fetch`, accepts custom fetch for testing.
2. **Dual ESM/CJS** - Two tsconfig files produce both module formats.
3. **Source failover** - If CDC cases API fails, falls back to NYT CSV data.
4. **All fields nullable** - Sources may be unavailable; consumers handle nulls.

## Testing Approach

- Tests use mock fetch functions with fixture data in `tests/fixtures/`.
- No network calls in tests.
- `vitest` with Node environment.
- 73 tests across 5 test files covering all sources, the client, cache, and utilities.

## Release Process

1. `npm run build` - Verify compilation
2. Commit all changes
3. `npm version patch|minor|major` - Bump version and create tag
4. `git push && git push --tags` - CI builds, tests, and publishes to GitHub Packages
5. **Never run `npm publish` manually** - CI handles it on tag push
