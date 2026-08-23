import { and, eq, lt } from 'drizzle-orm';
import { getDb } from '../db/connection';
import { auditLogs } from '../db/schema';
import { logger } from '../utils/logger';

const RETENTION_MONTHS = 3;

export async function cleanupOldLoginHistory(): Promise<number> {
  const db = getDb();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);

  const result = await db.delete(auditLogs)
    .where(and(
      eq(auditLogs.action, 'LOGIN'),
      lt(auditLogs.createdAt, cutoff),
    ));

  const deleted = Number((result as any)[0]?.affectedRows ?? 0);
  logger.info(`Login history cleanup: deleted ${deleted} record(s) older than ${cutoff.toISOString()}`);
  return deleted;
}
