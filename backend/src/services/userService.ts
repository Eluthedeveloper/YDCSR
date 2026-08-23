import bcrypt from 'bcrypt';
import { getDb } from '../db/connection';
import { users, regionalStates, radioHomeGroups, media, reports } from '../db/schema';
import { AppError } from '../middleware/errorHandler';
import { generateUUID, calculatePagination } from '../utils/helpers';
import { eq, like, or, and, sql } from 'drizzle-orm';

export class UserService {
  async create(data: {
    fullName: string;
    username: string;
    phone: string;
    email?: string;
    password: string;
    role: 'admin' | 'data_entry' | 'viewer' | 'radio_assistant';
    regionalStateId?: string;
    status?: 'active' | 'inactive';
  }) {
    const db = getDb();
    const existing = await db.select().from(users).where(eq(users.username, data.username)).limit(1);
    if (existing.length > 0) throw new AppError('Username already exists', 409);

    let regionalStateId: string | null = null;
    if (data.regionalStateId) {
      const [state] = await db.select({ id: regionalStates.id }).from(regionalStates).where(eq(regionalStates.id, data.regionalStateId)).limit(1);
      if (!state) throw new AppError('Regional state not found', 404);
      regionalStateId = data.regionalStateId;
    } else if (data.role === 'data_entry') {
      throw new AppError('Regional state is required for data entry clerks', 400);
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const id = generateUUID();

    await db.insert(users).values({
      id,
      fullName: data.fullName,
      username: data.username,
      phone: data.phone,
      email: data.email || null,
      password: hashedPassword,
      role: data.role,
      regionalStateId,
      status: data.status || 'active',
    });

    return this.getById(id);
  }

  private async countActiveAdmins() {
    const db = getDb();
    const [row] = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.role, 'admin'), eq(users.status, 'active')));
    return Number(row?.count || 0);
  }

  async update(id: string, data: Partial<{
    fullName: string;
    username: string;
    phone: string;
    email: string;
    password: string;
    role: 'admin' | 'data_entry' | 'viewer' | 'radio_assistant';
    regionalStateId?: string;
    status: 'active' | 'inactive';
  }>, requesterId?: string) {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) throw new AppError('User not found', 404);

    const isSelf = requesterId && requesterId === id;
    if (isSelf) {
      if (data.role && data.role !== user.role) throw new AppError('You cannot change your own role', 400);
      if (data.status && data.status !== user.status) throw new AppError('You cannot change your own status', 400);
    }

    const isDemote = data.role && data.role !== 'admin' && user.role === 'admin';
    const isDeactivate = data.status === 'inactive';
    if (user.role === 'admin' && (isDemote || isDeactivate)) {
      const adminCount = await this.countActiveAdmins();
      if (adminCount <= 1) {
        throw new AppError('Cannot demote or deactivate the last active admin', 400);
      }
    }

    if (data.username && data.username !== user.username) {
      const existing = await db.select().from(users).where(eq(users.username, data.username)).limit(1);
      if (existing.length > 0) throw new AppError('Username already exists', 409);
    }

    const updateData: Record<string, unknown> = {};
    if (data.fullName) updateData.fullName = data.fullName;
    if (data.username) updateData.username = data.username;
    if (data.phone) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.role) updateData.role = data.role;
    if (data.status) updateData.status = data.status;
    if (data.password) updateData.password = await bcrypt.hash(data.password, 12);
    if (data.regionalStateId !== undefined) {
      if (data.regionalStateId) {
        const [state] = await db.select({ id: regionalStates.id }).from(regionalStates).where(eq(regionalStates.id, data.regionalStateId)).limit(1);
        if (!state) throw new AppError('Regional state not found', 404);
        updateData.regionalStateId = data.regionalStateId;
      } else {
        updateData.regionalStateId = null;
      }
    }

    const effectiveRole = data.role || user.role;
    if (effectiveRole === 'data_entry') {
      const effectiveState = updateData.regionalStateId !== undefined ? updateData.regionalStateId : user.regionalStateId;
      if (!effectiveState) throw new AppError('Regional state is required for data entry clerks', 400);
    }

    await db.update(users).set(updateData).where(eq(users.id, id));
    return this.getById(id);
  }

  async getById(id: string) {
    const db = getDb();
    const [user] = await db.select({
      id: users.id,
      fullName: users.fullName,
      username: users.username,
      phone: users.phone,
      email: users.email,
      role: users.role,
      regionalStateId: users.regionalStateId,
      regionalStateName: regionalStates.name,
      status: users.status,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).leftJoin(regionalStates, eq(users.regionalStateId, regionalStates.id)).where(eq(users.id, id)).limit(1);

    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async list(params: { page: number; limit: number; search?: string; role?: string; status?: string }) {
    const db = getDb();
    const { page, limit, offset } = calculatePagination(params.page, params.limit);

    const conditions = [];
    if (params.search) {
      conditions.push(
        or(
          like(users.fullName, `%${params.search}%`),
          like(users.username, `%${params.search}%`),
          like(users.phone, `%${params.search}%`),
        )
      );
    }
    if (params.role) conditions.push(eq(users.role, params.role as any));
    if (params.status) conditions.push(eq(users.status, params.status as any));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(users).where(where as any);
    const total = Number(totalResult?.count || 0);

    const items = await db.select({
      id: users.id,
      fullName: users.fullName,
      username: users.username,
      phone: users.phone,
      email: users.email,
      role: users.role,
      regionalStateId: users.regionalStateId,
      regionalStateName: regionalStates.name,
      status: users.status,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).leftJoin(regionalStates, eq(users.regionalStateId, regionalStates.id)).where(where as any)
      .limit(limit).offset(offset)
      .orderBy(users.createdAt);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async listClerks() {
    const db = getDb();
    return db.select({
      id: users.id,
      fullName: users.fullName,
      username: users.username,
      regionalStateName: regionalStates.name,
    }).from(users)
      .leftJoin(regionalStates, eq(users.regionalStateId, regionalStates.id))
      .where(and(eq(users.role, 'data_entry'), eq(users.status, 'active')))
      .orderBy(users.fullName);
  }

  async delete(id: string, requesterId?: string) {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) throw new AppError('User not found', 404);
    if (requesterId && requesterId === id) throw new AppError('You cannot delete your own account', 400);
    if (user.role === 'admin' && user.status === 'active') {
      const adminCount = await this.countActiveAdmins();
      if (adminCount <= 1) throw new AppError('Cannot delete the last active admin', 400);
    }

    const [groups] = await db.select({ count: sql<number>`count(*)` }).from(radioHomeGroups).where(eq(radioHomeGroups.createdBy, id));
    const [mediaRefs] = await db.select({ count: sql<number>`count(*)` }).from(media).where(eq(media.createdBy, id));
    const [reportRefs] = await db.select({ count: sql<number>`count(*)` }).from(reports).where(eq(reports.createdBy, id));
    const references = [
      Number(groups?.count || 0) > 0 ? `${groups.count} groups` : '',
      Number(mediaRefs?.count || 0) > 0 ? `${mediaRefs.count} media items` : '',
      Number(reportRefs?.count || 0) > 0 ? `${reportRefs.count} reports` : '',
    ].filter(Boolean);
    if (references.length > 0) {
      throw new AppError(`Cannot delete user: they created ${references.join(', ')}. Remove those records first.`, 400);
    }

    await db.delete(users).where(eq(users.id, id));
  }
}

export const userService = new UserService();
