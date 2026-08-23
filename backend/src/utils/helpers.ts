import { v4 as uuidv4 } from 'uuid';
import { getDb, getPool } from '../db/connection';
import { serialSequences } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { AppError } from '../middleware/errorHandler';

export function generateUUID(): string {
  return uuidv4();
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function parseDate(dateString: string): Date {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new AppError('Invalid date format', 400);
  }
  return date;
}

export async function generateSerialNumber(regionCode: string): Promise<string> {
  const code = (regionCode.trim().toUpperCase() || 'RS');
  const db = getDb();
  const pool = getPool();

  await db.insert(serialSequences)
    .values({ id: uuidv4(), regionCode: code, lastNumber: 0 })
    .onDuplicateKeyUpdate({ set: { lastNumber: sql`last_number` } });

  // LAST_INSERT_ID() is connection-scoped, so both statements MUST run on the
  // same connection; otherwise concurrent calls can produce duplicate serials.
  const conn = await pool.getConnection();
  try {
    await conn.execute(
      'UPDATE serial_sequences SET last_number = LAST_INSERT_ID(last_number + 1) WHERE region_code = ?',
      [code]
    );
    const [rows2] = await conn.execute('SELECT LAST_INSERT_ID() as num');
    const num = Number((rows2 as any[])[0]?.num || 1);
    const width = Math.max(4, String(num).length);
    const padded = String(num).padStart(width, '0');
    return `${code}-${padded}`;
  } finally {
    conn.release();
  }
}

export function calculatePagination(page: number, limit: number, maxLimit: number = 1000) {
  const p = Math.max(1, page);
  const l = Math.min(Math.max(1, limit), maxLimit);
  return {
    page: p,
    limit: l,
    offset: (p - 1) * l,
  };
}
