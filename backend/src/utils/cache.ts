// Simple in-memory TTL cache.
//
// This replaces the previous Redis client, which was hard-disabled for the
// cPanel shared host and never connected. The same interface is kept so the
// lookup/cache services work unchanged; the store is process-local, which is
// exactly right for the single-process deployment here.

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const MAX_ENTRIES = 2000;

class CacheService {
  private store = new Map<string, CacheEntry>();

  private evictIfNeeded() {
    if (this.store.size <= MAX_ENTRIES) return;
    const now = Date.now();
    // Drop expired entries first, then the oldest by insertion order.
    for (const [key, entry] of this.store) {
      if (entry.expiresAt <= now) this.store.delete(key);
    }
    while (this.store.size > MAX_ENTRIES) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey === undefined) break;
      this.store.delete(oldestKey);
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    this.evictIfNeeded();
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async delByPrefix(prefix: string): Promise<void> {
    for (const key of [...this.store.keys()]) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }
}

export const cache = new CacheService();