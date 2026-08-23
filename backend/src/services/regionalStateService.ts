import { getDb } from '../db/connection';
import { regionalStates, regions } from '../db/schema';
import { AppError } from '../middleware/errorHandler';
import { generateUUID, calculatePagination } from '../utils/helpers';
import { eq, like, or, and, sql } from 'drizzle-orm';
import { cache } from '../utils/cache';

const CACHE_KEY = 'lookup:regional-states';
const CACHE_TTL = 300;

export class RegionalStateService {
  private async invalidate() {
    await cache.del(CACHE_KEY);
  }

  async create(data: { name: string; code: string; defaultLanguage: string; status?: 'active' | 'inactive' }) {
    const db = getDb();
    const existingName = await db.select().from(regionalStates).where(eq(regionalStates.name, data.name)).limit(1);
    if (existingName.length > 0) throw new AppError('Regional state name already exists', 409);

    const existingCode = await db.select().from(regionalStates).where(eq(regionalStates.code, data.code)).limit(1);
    if (existingCode.length > 0) throw new AppError('Regional state code already exists', 409);

    const id = generateUUID();
    await db.insert(regionalStates).values({ id, ...data, status: data.status || 'active' });
    await this.invalidate();
    return this.getById(id);
  }

  async update(id: string, data: Partial<{ name: string; code: string; defaultLanguage: string; status: 'active' | 'inactive' }>) {
    const db = getDb();
    const [rs] = await db.select().from(regionalStates).where(eq(regionalStates.id, id)).limit(1);
    if (!rs) throw new AppError('Regional state not found', 404);

    if (data.name && data.name !== rs.name) {
      const existing = await db.select().from(regionalStates).where(eq(regionalStates.name, data.name)).limit(1);
      if (existing.length > 0) throw new AppError('Regional state name already exists', 409);
    }
    if (data.code && data.code !== rs.code) {
      const existing = await db.select().from(regionalStates).where(eq(regionalStates.code, data.code)).limit(1);
      if (existing.length > 0) throw new AppError('Regional state code already exists', 409);
    }

    await db.update(regionalStates).set(data).where(eq(regionalStates.id, id));
    await this.invalidate();
    return this.getById(id);
  }

  async getById(id: string) {
    const db = getDb();
    const [rs] = await db.select().from(regionalStates).where(eq(regionalStates.id, id)).limit(1);
    if (!rs) throw new AppError('Regional state not found', 404);
    return rs;
  }

  async list(params: { page?: number; limit?: number; search?: string; status?: string }) {
    const db = getDb();
    const { page, limit, offset } = calculatePagination(params.page || 1, params.limit || 50);

    const conditions: any[] = [];
    if (params.search) {
      conditions.push(or(
        like(regionalStates.name, `%${params.search}%`),
        like(regionalStates.code, `%${params.search}%`),
      ));
    }
    if (params.status) conditions.push(eq(regionalStates.status, params.status as 'active' | 'inactive'));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(regionalStates).where(where);
    const total = Number(totalResult?.count || 0);

    const items = await db.select().from(regionalStates).where(where)
      .limit(limit).offset(offset).orderBy(regionalStates.name);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getAll() {
    const cached = await cache.get(CACHE_KEY);
    if (cached) return cached as (typeof regionalStates.$inferSelect)[];

    const db = getDb();
    const items = await db.select().from(regionalStates).where(eq(regionalStates.status, 'active')).orderBy(regionalStates.name);
    await cache.set(CACHE_KEY, items, CACHE_TTL);
    return items;
  }

  async delete(id: string) {
    const db = getDb();
    const [rs] = await db.select().from(regionalStates).where(eq(regionalStates.id, id)).limit(1);
    if (!rs) throw new AppError('Regional state not found', 404);

    const regionsCount = await db.select({ count: sql<number>`count(*)` }).from(regions).where(eq(regions.regionalStateId, id));
    if (Number(regionsCount[0]?.count || 0) > 0) {
      throw new AppError('Cannot delete regional state with associated regions', 400);
    }

    await db.delete(regionalStates).where(eq(regionalStates.id, id));
    await this.invalidate();
  }
}

export const regionalStateService = new RegionalStateService();
