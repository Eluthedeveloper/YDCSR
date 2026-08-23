import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { config } from '../config';
import * as schema from './schema';

let pool: mysql.Pool;
let db: ReturnType<typeof drizzle>;

export async function initializeDb() {
  try {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.name,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    db = drizzle(pool, { schema, mode: 'default' }) as unknown as ReturnType<typeof drizzle>;
    console.log('Database connected successfully');
    return { pool, db };
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export function getPool() {
  if (!pool) {
    throw new Error('Pool not initialized');
  }
  return pool;
}

export async function closeDb() {
  if (pool) {
    await pool.end();
  }
}
