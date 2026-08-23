import { createClient, type RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from './logger';

class CacheService {
  private client: RedisClientType | null = null;
  private connected = false;
  private enabled = config.redis.enabled && !!config.redis.url;

  async connect() {
    if (!this.enabled || this.client) return;
    const client = createClient({
      url: config.redis.url,
      socket: {
        connectTimeout: 2000,
        reconnectStrategy: (retries) => {
          if (retries >= 3) return new Error('Redis reconnect limit reached');
          return Math.min(retries * 250, 1000);
        },
      },
    });
    client.on('error', (err) => {
      this.connected = false;
      logger.error('Redis error:', err.message);
    });
    client.on('ready', () => {
      this.connected = true;
      logger.info('Redis connected');
    });
    this.client = client;
    try {
      await client.connect();
    } catch (err) {
      this.connected = false;
      logger.error('Redis connection failed, caching disabled:', (err as Error).message);
    }
  }

  get isConnected() {
    return this.connected && !!this.client;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;
    try {
      const raw = await this.client!.get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      logger.error('Cache get error:', (err as Error).message);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = config.redis.ttl): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client!.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch (err) {
      logger.error('Cache set error:', (err as Error).message);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client!.del(key);
    } catch (err) {
      logger.error('Cache del error:', (err as Error).message);
    }
  }

  async delByPrefix(prefix: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      const keys = await this.client!.keys(`${prefix}*`);
      if (keys.length > 0) await this.client!.del(keys);
    } catch (err) {
      logger.error('Cache delByPrefix error:', (err as Error).message);
    }
  }
}

export const cache = new CacheService();
