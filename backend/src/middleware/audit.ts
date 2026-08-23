import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { auditLogs } from '../db/schema';
import { getDb } from '../db/connection';
import { generateUUID } from '../utils/helpers';
import { getClientIp, resolveGeo } from '../utils/geo';

const SENSITIVE_KEYS = ['password', 'currentPassword', 'newPassword', 'refreshToken', 'accessToken'];

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = SENSITIVE_KEYS.includes(key) ? '[REDACTED]' : redact(val);
    }
    return out;
  }
  return value;
}

export function audit(action: string, entity: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      const statusCode = res.statusCode;
      if (statusCode < 400 && req.user) {
        const db = getDb();
        const entityId = req.params.id || (body as any)?.data?.id || null;
        const ipAddress = getClientIp(req);
        (async () => {
          const geo = await resolveGeo(ipAddress);
          await db.insert(auditLogs).values({
            id: generateUUID(),
            userId: req.user!.userId,
            action,
            entity,
            entityId: entityId as string | null | undefined,
            details: JSON.stringify({ method: req.method, path: req.path, body: redact(req.body) }),
            ipAddress,
            country: geo?.country ?? null,
            countryCode: geo?.countryCode ?? null,
            city: geo?.city ?? null,
            userAgent: req.headers['user-agent'],
          });
        })().catch(err => console.error('Audit log error:', err));
      }
      return originalJson(body);
    };
    next();
  };
}
