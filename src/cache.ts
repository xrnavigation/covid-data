/** A simple TTL (time-to-live) cache. Entries expire after the configured TTL. */
export class TTLCache<T> {
  private cache: Map<string, { value: T; expiresAt: number }>;
  private ttl: number;

  /** @param ttl Time-to-live in milliseconds */
  constructor(ttl: number) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  /** Get a value by key. Returns undefined if missing or expired. */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /** Set a value with the configured TTL. */
  set(key: string, value: T): void {
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttl });
  }

  /** Check if a key exists and is not expired. */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /** Delete a specific entry. Returns true if it existed. */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /** Remove all entries. */
  clear(): void {
    this.cache.clear();
  }
}
