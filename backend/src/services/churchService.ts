import { getDb } from '../db/connection';
import { churches, regions, radioHomeGroups } from '../db/schema';
import { AppError } from '../middleware/errorHandler';
import { generateUUID, calculatePagination } from '../utils/helpers';
import { eq, like, or, and, sql } from 'drizzle-orm';
import { cache } from '../utils/cache';

const CACHE_KEY = 'lookup:churches';
const CACHE_TTL = 300;

export class ChurchService {
  private async invalidate() {
    await cache.del(CACHE_KEY);
  }

  async create(data: { name: string; regionId: string; address?: string; status?: 'active' | 'inactive' }) {
    const db = getDb();
    const [region] = await db.select().from(regions).where(eq(regions.id, data.regionId)).limit(1);
    if (!region) throw new AppError('Region not found', 404);

    const id = generateUUID();
    await db.insert(churches).values({
      id,
      name: data.name,
      regionId: data.regionId,
      address: data.address || null,
      status: data.status || 'active',
    });
    await this.invalidate();
    return this.getById(id);
  }

  async update(id: string, data: Partial<{ name: string; regionId: string; address: string; status: 'active' | 'inactive' }>) {
    const db = getDb();
    const [church] = await db.select().from(churches).where(eq(churches.id, id)).limit(1);
    if (!church) throw new AppError('Church not found', 404);

    if (data.regionId) {
      const [region] = await db.select().from(regions).where(eq(regions.id, data.regionId)).limit(1);
      if (!region) throw new AppError('Region not found', 404);
    }

    await db.update(churches).set(data).where(eq(churches.id, id));
    await this.invalidate();
    return this.getById(id);
  }

  async getById(id: string) {
    const db = getDb();
    const [church] = await db.select({
      id: churches.id,
      name: churches.name,
      regionId: churches.regionId,
      regionName: regions.name,
      address: churches.address,
      status: churches.status,
      createdAt: churches.createdAt,
      updatedAt: churches.updatedAt,
    }).from(churches)
      .leftJoin(regions, eq(churches.regionId, regions.id))
      .where(eq(churches.id, id)).limit(1);

    if (!church) throw new AppError('Church not found', 404);
    return church;
  }

  async list(params: { page?: number; limit?: number; search?: string; regionId?: string; status?: string }) {
    const db = getDb();
    const { page, limit, offset } = calculatePagination(params.page || 1, params.limit || 20);

    const conditions: any[] = [];
    if (params.search) {
      conditions.push(or(
        like(churches.name, `%${params.search}%`),
      ));
    }
    if (params.regionId) conditions.push(eq(churches.regionId, params.regionId));
    if (params.status) conditions.push(eq(churches.status, params.status as 'active' | 'inactive'));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(churches).where(where);
    const total = Number(totalResult?.count || 0);

    const items = await db.select({
      id: churches.id,
      name: churches.name,
      regionId: churches.regionId,
      regionName: regions.name,
      address: churches.address,
      status: churches.status,
      createdAt: churches.createdAt,
      updatedAt: churches.updatedAt,
    }).from(churches)
      .leftJoin(regions, eq(churches.regionId, regions.id))
      .where(where)
      .limit(limit).offset(offset)
      .orderBy(churches.name);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getAll() {
    const cached = await cache.get(CACHE_KEY);
    if (cached) return cached as {
      id: string;
      name: string;
      regionId: string | null;
      regionName: string | null;
      status: string;
    }[];

    const db = getDb();
    const items = await db.select({
      id: churches.id,
      name: churches.name,
      regionId: churches.regionId,
      regionName: regions.name,
      status: churches.status,
    }).from(churches)
      .leftJoin(regions, eq(churches.regionId, regions.id))
      .where(eq(churches.status, 'active'))
      .orderBy(churches.name);

    await cache.set(CACHE_KEY, items, CACHE_TTL);
    return items;
  }

  async delete(id: string) {
    const db = getDb();
    const [church] = await db.select().from(churches).where(eq(churches.id, id)).limit(1);
    if (!church) throw new AppError('Church not found', 404);
    const [usage] = await db.select({ count: sql<number>`count(*)` })
      .from(radioHomeGroups)
      .where(eq(radioHomeGroups.churchId, id));
    if (Number(usage?.count || 0) > 0) {
      throw new AppError('Cannot delete church: groups are assigned to it', 400);
    }
    await db.delete(churches).where(eq(churches.id, id));
    await this.invalidate();
  }
}

export const churchService = new ChurchService();
