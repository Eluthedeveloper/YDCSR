import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { createHash, randomBytes } from 'crypto';
import { getDb, getPool } from '../db/connection';
import { users, regionalStates, refreshTokens, auditLogs } from '../db/schema';
import { config } from '../config';
import { JwtPayload } from '../types';
import { AppError } from '../middleware/errorHandler';
import { generateUUID } from '../utils/helpers';
import { resolveGeo } from '../utils/geo';
import { settingsService } from './settingsService';
import { eq } from 'drizzle-orm';

// Only the SHA-256 hash of a refresh token is persisted, so a database leak
// does not expose usable bearer tokens. The raw token is the 7-day credential.
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

    const payload: JwtPayload = { userId: user.id, username: user.username, role: user.role, regionalStateId: user.regionalStateId ?? null, tokenVersion: user.tokenVersion };
    const accessToken = this.generateToken(payload);
    const refreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    const csrfToken = randomBytes(32).toString('hex');

    await db.insert(refreshTokens).values({
      id: uuidv4(),
      userId: user.id,
      token: hashToken(refreshToken),
      expiresAt,
    });

    const ipAddress = context?.ipAddress || null;
    const loginLoggingPaused = await settingsService.isLoginLoggingPaused();
    if (!loginLoggingPaused) {
      const auditLogId = generateUUID();
      await db.insert(auditLogs).values({
        id: auditLogId,
        userId: user.id,
        action: 'LOGIN',
        entity: 'Auth',
        entityId: user.id,
        details: JSON.stringify({ method: 'POST', path: '/api/auth/login', username: user.username }),
        ipAddress,
        country: null,
        countryCode: null,
        city: null,
        userAgent: context?.userAgent || null,
      });
      // Geo lookup calls an external API, so enrich the row in the background
      // rather than delaying the login response.
      void resolveGeo(context?.ipAddress)
        .then((geo) => {
          if (!geo?.country) return;
          return db.update(auditLogs)
            .set({ country: geo.country, countryCode: geo.countryCode, city: geo.city })
            .where(eq(auditLogs.id, auditLogId));
        })
        .catch(() => {});
    }

    let regionalStateName: string | null = null;
    if (user.regionalStateId) {
      const [state] = await db.select({ name: regionalStates.name }).from(regionalStates).where(eq(regionalStates.id, user.regionalStateId)).limit(1);
      regionalStateName = state?.name ?? null;
    }

    return {
      accessToken,
      refreshToken,
      csrfToken,
      user: { id: user.id, fullName: user.fullName, username: user.username, role: user.role, phone: user.phone, email: user.email, regionalStateId: user.regionalStateId ?? null, regionalStateName },
    };
  }

  async refresh(token: string) {
    const db = getDb();
    const hash = hashToken(token);

    const [stored] = await db.select().from(refreshTokens).where(eq(refreshTokens.token, hash)).limit(1);
    if (!stored) throw new AppError('Invalid refresh token', 401);
    if (new Date(stored.expiresAt) < new Date()) {
      await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));
      throw new AppError('Refresh token expired', 401);
    }

    const [user] = await db.select().from(users).where(eq(users.id, stored.userId)).limit(1);
    if (!user || user.status !== 'active') {
      await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));
      throw new AppError('User not found or inactive', 401);
    }

    const payload: JwtPayload = { userId: user.id, username: user.username, role: user.role, regionalStateId: user.regionalStateId ?? null, tokenVersion: user.tokenVersion };
    const accessToken = this.generateToken(payload);
    const newRefreshToken = uuidv4();
    const newHash = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    // Atomic rotation: the UPDATE takes a row lock on the matching row, so two
    // concurrent refreshes with the same token cannot both succeed - the second
    // matches 0 rows and is rejected (reuse detection).
    const conn = await getPool().getConnection();
    try {
      const [result] = await conn.execute(
        'UPDATE refresh_tokens SET token = ?, expires_at = ? WHERE id = ? AND token = ?',
        [newHash, expiresAt, stored.id, hash]
      );
      const affectedRows = (result as { affectedRows?: number }).affectedRows ?? 0;
      if (affectedRows !== 1) {
        throw new AppError('Invalid refresh token', 401);
      }
    } finally {
      conn.release();
    }

    const csrfToken = randomBytes(32).toString('hex');
    return { accessToken, refreshToken: newRefreshToken, csrfToken };
  }

  async logout(token: string) {
    const db = getDb();
    await db.delete(refreshTokens).where(eq(refreshTokens.token, hashToken(token)));
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
