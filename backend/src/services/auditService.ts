import { getDb } from '../db/connection';
import { auditLogs, users } from '../db/schema';
import { calculatePagination } from '../utils/helpers';
import { eq, inArray, like, or, and, sql, desc, gte, lte } from 'drizzle-orm';

export class AuditService {
  async delete(id: string): Promise<boolean> {
    const db = getDb();
    const result = await db.delete(auditLogs).where(eq(auditLogs.id, id));
    return Number((result as any)[0]?.affectedRows ?? 0) > 0;
  }

  async deleteMany(ids: string[]): Promise<number> {
    const db = getDb();
    const result = await db.delete(auditLogs).where(inArray(auditLogs.id, ids));
    return Number((result as any)[0]?.affectedRows ?? 0);
  }

  async deleteLogins(): Promise<number> {
    const db = getDb();
    const result = await db.delete(auditLogs).where(eq(auditLogs.action, 'LOGIN'));
    return Number((result as any)[0]?.affectedRows ?? 0);
  }

  async deleteAll(): Promise<number> {
    const db = getDb();
    const result = await db.delete(auditLogs);
    return Number((result as any)[0]?.affectedRows ?? 0);
  }

  async list(params: {
    page: number;
    limit: number;
    search?: string;
    action?: string;
    entity?: string;
    userId?: string;
    from?: string;
    to?: string;
  }) {
    const db = getDb();
    const { page, limit, offset } = calculatePagination(params.page, params.limit);

    const conditions = [];
    if (params.search) {
      conditions.push(
        or(
          like(auditLogs.action, `%${params.search}%`),
          like(auditLogs.entity, `%${params.search}%`),
          like(users.fullName, `%${params.search}%`),
          like(users.username, `%${params.search}%`),
        )
      );
    }
    if (params.action) conditions.push(eq(auditLogs.action, params.action));
    if (params.entity) conditions.push(eq(auditLogs.entity, params.entity));
    if (params.userId) conditions.push(eq(auditLogs.userId, params.userId));
    if (params.from) conditions.push(gte(auditLogs.createdAt, new Date(params.from)));
    if (params.to) conditions.push(lte(auditLogs.createdAt, new Date(params.to)));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(where as any);
    const total = Number(totalResult?.count || 0);

    const items = await db.select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      userName: users.fullName,
      username: users.username,
      action: auditLogs.action,
      entity: auditLogs.entity,
      entityId: auditLogs.entityId,
      details: auditLogs.details,
      ipAddress: auditLogs.ipAddress,
      country: auditLogs.country,
      countryCode: auditLogs.countryCode,
      city: auditLogs.city,
      userAgent: auditLogs.userAgent,
      createdAt: auditLogs.createdAt,
    }).from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(where as any)
      .limit(limit).offset(offset)
      .orderBy(desc(auditLogs.createdAt));

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async logins(params: { page: number; limit: number; search?: string; from?: string; to?: string }) {
    return this.list({ ...params, action: 'LOGIN' });
  }

  async recent(limit = 10) {
    const db = getDb();
    return db.select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      userName: users.fullName,
      username: users.username,
      action: auditLogs.action,
      entity: auditLogs.entity,
      entityId: auditLogs.entityId,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
    }).from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .limit(Math.min(Math.max(limit, 1), 50))
      .orderBy(desc(auditLogs.createdAt));
  }
}

export const auditService = new AuditService();
