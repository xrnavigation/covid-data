import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TTLCache } from '../src/cache.js';

describe('TTLCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns undefined for missing keys', () => {
    const cache = new TTLCache<string>(1000);
    expect(cache.get('missing')).toBeUndefined();
  });

  it('stores and retrieves values', () => {
    const cache = new TTLCache<string>(1000);
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('expires entries after TTL', () => {
    const cache = new TTLCache<string>(5000);
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');

    vi.advanceTimersByTime(4999);
    expect(cache.get('key1')).toBe('value1');

    vi.advanceTimersByTime(2);
    expect(cache.get('key1')).toBeUndefined();
  });

  it('has() returns true for existing keys', () => {
    const cache = new TTLCache<number>(1000);
    cache.set('a', 42);
    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
  });

  it('has() respects TTL', () => {
    const cache = new TTLCache<number>(500);
    cache.set('a', 42);
    expect(cache.has('a')).toBe(true);

    vi.advanceTimersByTime(501);
    expect(cache.has('a')).toBe(false);
  });

  it('clear() removes all entries', () => {
    const cache = new TTLCache<string>(1000);
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
    expect(cache.has('a')).toBe(false);
  });

  it('delete() removes a specific entry', () => {
    const cache = new TTLCache<string>(1000);
    cache.set('a', '1');
    cache.set('b', '2');
    const result = cache.delete('a');
    expect(result).toBe(true);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe('2');
  });

  it('delete() returns false for missing keys', () => {
    const cache = new TTLCache<string>(1000);
    expect(cache.delete('nonexistent')).toBe(false);
  });
});
