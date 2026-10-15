import { and, eq, lt, ne } from 'drizzle-orm';
import { getDb } from '../db/connection';
import { auditLogs } from '../db/schema';
import { logger } from '../utils/logger';

const LOGIN_RETENTION_MONTHS = 3;
const GENERAL_RETENTION_MONTHS = 6;

export async function cleanupOldAuditLogs(): Promise<{ loginDeleted: number; generalDeleted: number }> {
  const db = getDb();
  const now = new Date();

  const loginCutoff = new Date(now);
  loginCutoff.setMonth(now.getMonth() - LOGIN_RETENTION_MONTHS);
  const generalCutoff = new Date(now);
  generalCutoff.setMonth(now.getMonth() - GENERAL_RETENTION_MONTHS);

  const loginResult = await db.delete(auditLogs)
    .where(and(eq(auditLogs.action, 'LOGIN'), lt(auditLogs.createdAt, loginCutoff)));
  const loginDeleted = Number((loginResult as any)[0]?.affectedRows ?? 0);

  const generalResult = await db.delete(auditLogs)
    .where(and(ne(auditLogs.action, 'LOGIN'), lt(auditLogs.createdAt, generalCutoff)));
  const generalDeleted = Number((generalResult as any)[0]?.affectedRows ?? 0);

  logger.info(
    `Audit log cleanup: deleted ${loginDeleted} login record(s) older than ` +
    `${LOGIN_RETENTION_MONTHS} months and ${generalDeleted} general record(s) older than ` +
    `${GENERAL_RETENTION_MONTHS} months`
  );
  return { loginDeleted, generalDeleted };
}