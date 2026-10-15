import app from './app';
import { config } from './config';

import { initializeDb, getPool } from './db/connection';
import { seedDefaultData } from './db/seed';

import { logger } from './utils/logger';
import { cleanupOldAuditLogs } from './services/cleanupService';

import { startCleanupJob } from './jobs/cleanupJob';
import { startBackupJob } from './jobs/backupJob';

async function ensureSchemaMigrations() {
  const pool = getPool();
  const [rows] = await pool.query<any>('SHOW COLUMNS FROM users LIKE ?', ['token_version']);
  if (rows.length === 0) {
    await pool.query('ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0');
    logger.info('✓ Added users.token_version column');
  }
}

async function ensurePhoneNormMigration() {
  const pool = getPool();
  try {
    const [cols] = await pool.query<any>('SHOW COLUMNS FROM radio_home_groups LIKE ?', ['group_leader_phone_norm']);
    if (cols.length === 0) {
      await pool.query(
        'ALTER TABLE radio_home_groups ADD COLUMN group_leader_phone_norm VARCHAR(30) NULL AFTER group_leader_phone'
      );
      logger.info('✓ Added radio_home_groups.group_leader_phone_norm column');
    }

    // Backfill missing values only (allows running while rows are being added).
    await pool.query(
      "UPDATE radio_home_groups SET group_leader_phone_norm = REGEXP_REPLACE(REGEXP_REPLACE(group_leader_phone, '[^0-9]', ''), '^0+', '') " +
      "WHERE group_leader_phone IS NOT NULL AND group_leader_phone <> '' AND (group_leader_phone_norm IS NULL OR group_leader_phone_norm = '')"
    );

    const [idx] = await pool.query<any>("SHOW INDEX FROM radio_home_groups WHERE Key_name = 'rhg_phone_norm_idx'");
    if (idx.length === 0) {
      await pool.query('CREATE INDEX rhg_phone_norm_idx ON radio_home_groups (group_leader_phone_norm)');
      logger.info('✓ Added rhg_phone_norm_idx index');
    }
  } catch (error) {
    // The table may not exist yet on a fresh deployment before db:push runs;
    // log it so the operator knows the manual migration step is still pending.
    logger.warn('Phone-normalization migration skipped:', error instanceof Error ? error.message : String(error));
  }
}

async function start() {
  try {
    logger.info('========================================');
    logger.info('Starting YDCS API...');
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`Port: ${config.port}`);
    logger.info('========================================');

    /* =====================================================
       DATABASE
    ===================================================== */

    logger.info('Connecting to database...');

    await initializeDb();

    logger.info('✓ Database connected successfully');

    /* =====================================================
       SCHEMA MIGRATIONS (idempotent)
    ===================================================== */

    logger.info('Checking database schema...');

    await ensureSchemaMigrations();

    logger.info('✓ Database schema up to date');

    /* =====================================================
       PHONE NORM MIGRATION
    ===================================================== */

    logger.info('Checking phone-normalization schema...');

    await ensurePhoneNormMigration();

    logger.info('✓ Phone-normalization schema ready');

    /* =====================================================
       SEED DEFAULT DATA
    ===================================================== */

    logger.info('Seeding default data...');

    await seedDefaultData();

    logger.info('✓ Default data seeded');

    /* =====================================================
       AUDIT LOG CLEANUP
    ===================================================== */

    logger.info('Cleaning old audit logs...');

    await cleanupOldAuditLogs();

    logger.info('✓ Initial audit log cleanup completed');

    /* =====================================================
       CLEANUP JOB
    ===================================================== */

    logger.info('Starting cleanup job...');

    startCleanupJob();

    logger.info('✓ Cleanup job started');

    /* =====================================================
       BACKUP JOB
    ===================================================== */

    logger.info('Starting backup job...');

    startBackupJob();

    logger.info('✓ Backup job started');

    /* =====================================================
       START SERVER
    ===================================================== */

    logger.info('Starting HTTP server...');

    const server = app.listen(config.port, () => {
      logger.info('========================================');
      logger.info('✓ YDCS API SERVER STARTED SUCCESSFULLY');
      logger.info('========================================');
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Port: ${config.port}`);
      logger.info(`Health: /api/health`);

      if (
        ['development', 'test'].includes(config.nodeEnv) ||
        process.env.ENABLE_SWAGGER === 'true'
      ) {
        logger.info(`Swagger: /api-docs`);
      }

      logger.info('========================================');
    });

    /* =====================================================
       SERVER ERROR
    ===================================================== */

    server.on('error', (error) => {
      logger.error('HTTP SERVER ERROR:', error);
    });

  } catch (error) {
    logger.error('========================================');
    logger.error('✗ FAILED TO START YDCS API');
    logger.error('========================================');
    logger.error(error instanceof Error ? error.message : String(error));

    process.exit(1);
  }
}

start();