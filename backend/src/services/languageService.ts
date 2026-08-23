import { getDb } from '../db/connection';
import { languages, radioHomeGroups } from '../db/schema';
import { AppError } from '../middleware/errorHandler';
import { generateUUID } from '../utils/helpers';
import { eq, like, sql, count } from 'drizzle-orm';
import { cache } from '../utils/cache';

const CACHE_KEY = 'lookup:languages';
const CACHE_TTL = 300;

export class LanguageService {
  private async invalidate() {
    await cache.del(CACHE_KEY);
  }

  async create(name: string) {
    const db = getDb();
    const existing = await db.select().from(languages).where(eq(languages.name, name)).limit(1);
    if (existing.length > 0) return existing[0];

    const id = generateUUID();
    await db.insert(languages).values({ id, name });
    await this.invalidate();
    return { id, name };
  }

  async list() {
    const cached = await cache.get(CACHE_KEY);
    if (cached) return cached as (typeof languages.$inferSelect)[];

    const db = getDb();
    const items = await db.select().from(languages).orderBy(languages.name);
    await cache.set(CACHE_KEY, items, CACHE_TTL);
    return items;
  }

  async update(id: string, name: string) {
    const db = getDb();
    const [existing] = await db.select().from(languages).where(eq(languages.id, id)).limit(1);
    if (!existing) throw new AppError('Language not found', 404);

    const [duplicate] = await db.select().from(languages).where(eq(languages.name, name)).limit(1);
    if (duplicate && duplicate.id !== id) throw new AppError('Language name already exists', 409);

    await db.update(languages).set({ name }).where(eq(languages.id, id));
    await this.invalidate();
    return { id, name };
  }

  async remove(id: string) {
    const db = getDb();
    const [existing] = await db.select().from(languages).where(eq(languages.id, id)).limit(1);
    if (!existing) throw new AppError('Language not found', 404);

    const [usage] = await db.select({ n: count() }).from(radioHomeGroups).where(eq(radioHomeGroups.languageId, id));
    if (Number(usage?.n || 0) > 0) {
      throw new AppError('Cannot delete language: it is used by groups', 400);
    }

    await db.delete(languages).where(eq(languages.id, id));
    await this.invalidate();
  }

  async getOrCreate(name: string) {
    const db = getDb();
    const [existing] = await db.select().from(languages).where(eq(languages.name, name)).limit(1);
    if (existing) return existing;

    const id = generateUUID();
    await db.insert(languages).values({ id, name });
    await this.invalidate();
    return { id, name };
  }
}

export const languageService = new LanguageService();
