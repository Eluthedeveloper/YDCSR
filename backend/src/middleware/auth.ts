import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { config } from '../config';
import { getDb } from '../db/connection';
import { users } from '../db/schema';
import { AuthRequest, JwtPayload, UserRole } from '../types';
import { logger } from '../utils/logger';

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    let token =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : undefined;

    // Fall back to the httpOnly access_token cookie set on login/refresh.
    if (!token && req.cookies?.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    const db = getDb();
    const [user] = await db.select({ status: users.status, tokenVersion: users.tokenVersion })
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (!user || user.status !== 'active' || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Authentication failed', error);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    next();
  };
}
