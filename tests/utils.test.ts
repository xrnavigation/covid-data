import { describe, it, expect } from 'vitest';
import {
  isValidFips,
  stateAbbrToFips,
  fipsToStateAbbr,
  stateAbbrToName,
  normalizeStateAbbr,
} from '../src/utils.js';

describe('isValidFips', () => {
  it('accepts valid 2-digit state FIPS codes', () => {
    expect(isValidFips('06')).toBe(true);
    expect(isValidFips('36')).toBe(true);
    expect(isValidFips('01')).toBe(true);
    expect(isValidFips('11')).toBe(true);
  });

  it('accepts valid 5-digit county FIPS codes', () => {
    expect(isValidFips('06037')).toBe(true);
    expect(isValidFips('36061')).toBe(true);
    expect(isValidFips('01001')).toBe(true);
  });

  it('rejects invalid FIPS codes', () => {
    expect(isValidFips('')).toBe(false);
    expect(isValidFips('6')).toBe(false);
    expect(isValidFips('123')).toBe(false);
    expect(isValidFips('1234')).toBe(false);
    expect(isValidFips('123456')).toBe(false);
    expect(isValidFips('ab')).toBe(false);
    expect(isValidFips('abcde')).toBe(false);
  });
});

describe('stateAbbrToFips', () => {
  it('maps state abbreviations to FIPS codes', () => {
    expect(stateAbbrToFips('CA')).toBe('06');
    expect(stateAbbrToFips('NY')).toBe('36');
    expect(stateAbbrToFips('TX')).toBe('48');
    expect(stateAbbrToFips('DC')).toBe('11');
  });

  it('returns undefined for invalid abbreviations', () => {
    expect(stateAbbrToFips('ZZ')).toBeUndefined();
    expect(stateAbbrToFips('')).toBeUndefined();
    expect(stateAbbrToFips('CALIFORNIA')).toBeUndefined();
  });
});

describe('fipsToStateAbbr', () => {
  it('maps FIPS codes to state abbreviations', () => {
    expect(fipsToStateAbbr('06')).toBe('CA');
    expect(fipsToStateAbbr('36')).toBe('NY');
    expect(fipsToStateAbbr('48')).toBe('TX');
    expect(fipsToStateAbbr('11')).toBe('DC');
  });

  it('returns undefined for invalid FIPS codes', () => {
    expect(fipsToStateAbbr('99')).toBeUndefined();
    expect(fipsToStateAbbr('')).toBeUndefined();
    expect(fipsToStateAbbr('00')).toBeUndefined();
  });
});

describe('stateAbbrToName', () => {
  it('maps abbreviations to full names', () => {
    expect(stateAbbrToName('CA')).toBe('California');
    expect(stateAbbrToName('NY')).toBe('New York');
    expect(stateAbbrToName('DC')).toBe('District of Columbia');
    expect(stateAbbrToName('TX')).toBe('Texas');
  });

  it('returns undefined for invalid abbreviations', () => {
    expect(stateAbbrToName('ZZ')).toBeUndefined();
    expect(stateAbbrToName('')).toBeUndefined();
  });
});

describe('normalizeStateAbbr', () => {
  it('uppercases and trims input', () => {
    expect(normalizeStateAbbr(' ca ')).toBe('CA');
    expect(normalizeStateAbbr('ny')).toBe('NY');
    expect(normalizeStateAbbr('  tx  ')).toBe('TX');
    expect(normalizeStateAbbr('Ca')).toBe('CA');
  });
});
