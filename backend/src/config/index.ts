import dotenv from 'dotenv';
dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'production';
const isDevOrTest = nodeEnv === 'development' || nodeEnv === 'test';

// Fail hard whenever secrets are missing in a non-dev/test environment.
// NODE_ENV unset is treated as production, so an unconfigured deployment
// cannot silently fall back to publicly-known secrets.
if (!isDevOrTest && (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET)) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in non-development environments');
}

export const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'ydcs_radio_home',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-fallback-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-fallback-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSize: Number(process.env.MAX_FILE_SIZE) || 5242880,
  },
  backup: {
    dir: process.env.BACKUP_DIR || 'backups',
    cron: process.env.BACKUP_CRON || '0 2 * * *',
    keep: Number(process.env.BACKUP_KEEP) || 14,
  },
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean),
  },
  redis: {
    url: process.env.REDIS_URL || '',
    enabled: process.env.REDIS_ENABLED === 'true',
    ttl: Number(process.env.REDIS_TTL_SECONDS) || 60,
  },
};
