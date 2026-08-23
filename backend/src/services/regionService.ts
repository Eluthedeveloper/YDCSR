import { getDb } from '../db/connection';
import { regions, regionalStates, churches, radioHomeGroups } from '../db/schema';
import { AppError } from '../middleware/errorHandler';
import { generateUUID, calculatePagination } from '../utils/helpers';
import { eq, like, or, and, sql } from 'drizzle-orm';
import { cache } from '../utils/cache';

const CACHE_KEY = 'lookup:regions';
const CACHE_TTL = 300;

export class RegionService {
  private async invalidate() {
    await cache.del(CACHE_KEY);
  }

  async create(data: { name: string; regionalStateId: string; status?: 'active' | 'inactive' }) {
    const db = getDb();
    const [rs] = await db.select().from(regionalStates).where(eq(regionalStates.id, data.regionalStateId)).limit(1);
    if (!rs) throw new AppError('Regional state not found', 404);

    const id = generateUUID();
    await db.insert(regions).values({ id, ...data, status: data.status || 'active' });
    await this.invalidate();
    return this.getById(id);
  }

  async update(id: string, data: Partial<{ name: string; regionalStateId: string; status: 'active' | 'inactive' }>) {
    const db = getDb();
    const [region] = await db.select().from(regions).where(eq(regions.id, id)).limit(1);
    if (!region) throw new AppError('Region not found', 404);

    if (data.regionalStateId) {
      const [rs] = await db.select().from(regionalStates).where(eq(regionalStates.id, data.regionalStateId)).limit(1);
      if (!rs) throw new AppError('Regional state not found', 404);
    }

    await db.update(regions).set(data).where(eq(regions.id, id));
    await this.invalidate();
    return this.getById(id);
  }

  async getById(id: string) {
    const db = getDb();
    const [region] = await db.select({
      id: regions.id,
      name: regions.name,
      regionalStateId: regions.regionalStateId,
      regionalStateName: regionalStates.name,
      regionalStateCode: regionalStates.code,
      status: regions.status,
      createdAt: regions.createdAt,
      updatedAt: regions.updatedAt,
    }).from(regions)
      .leftJoin(regionalStates, eq(regions.regionalStateId, regionalStates.id))
      .where(eq(regions.id, id)).limit(1);

    if (!region) throw new AppError('Region not found', 404);
    return region;
  }

  async list(params: { page?: number; limit?: number; search?: string; regionalStateId?: string; status?: string }) {
    const db = getDb();
    const { page, limit, offset } = calculatePagination(params.page || 1, params.limit || 50);

    const conditions: any[] = [];
    if (params.search) conditions.push(like(regions.name, `%${params.search}%`));
    if (params.regionalStateId) conditions.push(eq(regions.regionalStateId, params.regionalStateId));
    if (params.status) conditions.push(eq(regions.status, params.status as 'active' | 'inactive'));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(regions).where(where);
    const total = Number(totalResult?.count || 0);

    const items = await db.select({
      id: regions.id,
      name: regions.name,
      regionalStateId: regions.regionalStateId,
      regionalStateName: regionalStates.name,
      regionalStateCode: regionalStates.code,
      status: regions.status,
      createdAt: regions.createdAt,
      updatedAt: regions.updatedAt,
    }).from(regions)
      .leftJoin(regionalStates, eq(regions.regionalStateId, regionalStates.id))
      .where(where)
      .limit(limit).offset(offset)
      .orderBy(regionalStates.name, regions.name);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getByRegionalState(regionalStateId: string) {
    const db = getDb();
    return db.select().from(regions)
      .where(and(eq(regions.regionalStateId, regionalStateId), eq(regions.status, 'active')))
      .orderBy(regions.name);
  }

  async getAll() {
    const cached = await cache.get(CACHE_KEY);
    if (cached) return cached as {
      id: string;
      name: string;
      regionalStateId: string | null;
      regionalStateName: string | null;
      status: string;
    }[];

    const db = getDb();
    const items = await db.select({
      id: regions.id,
      name: regions.name,
      regionalStateId: regions.regionalStateId,
      regionalStateName: regionalStates.name,
      status: regions.status,
    }).from(regions)
      .leftJoin(regionalStates, eq(regions.regionalStateId, regionalStates.id))
      .where(eq(regions.status, 'active'))
      .orderBy(regions.name);

    await cache.set(CACHE_KEY, items, CACHE_TTL);
    return items;
  }

  async delete(id: string) {
    const db = getDb();
    const [region] = await db.select().from(regions).where(eq(regions.id, id)).limit(1);
    if (!region) throw new AppError('Region not found', 404);

    const churchesCount = await db.select({ count: sql<number>`count(*)` }).from(churches).where(eq(churches.regionId, id));
    if (Number(churchesCount[0]?.count || 0) > 0) {
      throw new AppError('Cannot delete region with associated churches', 400);
    }

    const groupsCount = await db.select({ count: sql<number>`count(*)` }).from(radioHomeGroups).where(eq(radioHomeGroups.regionId, id));
    if (Number(groupsCount[0]?.count || 0) > 0) {
      throw new AppError('Cannot delete region with associated groups', 400);
    }

    await db.delete(regions).where(eq(regions.id, id));
    await this.invalidate();
  }
}

export const regionService = new RegionService();
