import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection';
import { users, regionalStates, refreshTokens, auditLogs } from '../db/schema';
import { config } from '../config';
import { JwtPayload } from '../types';
import { AppError } from '../middleware/errorHandler';
import { generateUUID } from '../utils/helpers';
import { resolveGeo } from '../utils/geo';
import { settingsService } from './settingsService';
import { eq } from 'drizzle-orm';

export class AuthService {
  async login(username: string, password: string, context?: { ipAddress?: string; userAgent?: string }) {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

    if (!user) {
      throw new AppError('Invalid username or password', 401);
    }

    if (user.status !== 'active') {
      throw new AppError('Account is inactive. Contact administrator.', 403);
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new AppError('Invalid username or password', 401);
    }

    const payload: JwtPayload = { userId: user.id, username: user.username, role: user.role, regionalStateId: user.regionalStateId ?? null };
    const accessToken = this.generateToken(payload);
    const refreshToken = uuidv4();

    await db.insert(refreshTokens).values({
      id: uuidv4(),
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const ipAddress = context?.ipAddress || null;
    const loginLoggingPaused = await settingsService.isLoginLoggingPaused();
    if (!loginLoggingPaused) {
      const geo = await resolveGeo(context?.ipAddress);
      await db.insert(auditLogs).values({
        id: generateUUID(),
        userId: user.id,
        action: 'LOGIN',
        entity: 'Auth',
        entityId: user.id,
        details: JSON.stringify({ method: 'POST', path: '/api/auth/login', username: user.username }),
        ipAddress,
        country: geo?.country ?? null,
        countryCode: geo?.countryCode ?? null,
        city: geo?.city ?? null,
        userAgent: context?.userAgent || null,
      });
    }

    let regionalStateName: string | null = null;
    if (user.regionalStateId) {
      const [state] = await db.select({ name: regionalStates.name }).from(regionalStates).where(eq(regionalStates.id, user.regionalStateId)).limit(1);
      regionalStateName = state?.name ?? null;
    }

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, fullName: user.fullName, username: user.username, role: user.role, phone: user.phone, email: user.email, regionalStateId: user.regionalStateId ?? null, regionalStateName },
    };
  }

  async refresh(token: string) {
    const db = getDb();
    const [stored] = await db.select().from(refreshTokens).where(eq(refreshTokens.token, token)).limit(1);
    if (!stored) throw new AppError('Invalid refresh token', 401);
    if (new Date(stored.expiresAt) < new Date()) throw new AppError('Refresh token expired', 401);

    const [user] = await db.select().from(users).where(eq(users.id, stored.userId)).limit(1);
    if (!user || user.status !== 'active') throw new AppError('User not found or inactive', 401);

    const payload: JwtPayload = { userId: user.id, username: user.username, role: user.role, regionalStateId: user.regionalStateId ?? null };
    const accessToken = this.generateToken(payload);
    const newRefreshToken = uuidv4();

    await db.update(refreshTokens)
      .set({ token: newRefreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
      .where(eq(refreshTokens.id, stored.id));

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(token: string) {
    const db = getDb();
    await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
  }

  async getProfile(userId: string) {
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
    }).from(users).leftJoin(regionalStates, eq(users.regionalStateId, regionalStates.id)).where(eq(users.id, userId)).limit(1);

    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  private generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as jwt.SignOptions);
  }
}

export const authService = new AuthService();
