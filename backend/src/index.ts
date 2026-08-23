import app from './app';
import { config } from './config';
import { initializeDb } from './db/connection';
import { seedDefaultData } from './db/seed';
import { cache } from './utils/cache';
import { logger } from './utils/logger';
import { cleanupOldLoginHistory } from './services/cleanupService';
import { startCleanupJob } from './jobs/cleanupJob';
import { startBackupJob } from './jobs/backupJob';

async function start() {
  try {
    await initializeDb();
    logger.info('Database connected successfully');

    await seedDefaultData();
    logger.info('Default data seeded');

    await cleanupOldLoginHistory();
    logger.info('Initial login history cleanup completed');

    startCleanupJob();
    startBackupJob();

    // Redis is optional — never block the HTTP server on it
    cache.connect().then(() => {
      logger.info(`Redis caching ${cache.isConnected ? 'enabled' : 'disabled'}`);
    });

    app.listen(config.port, () => {
      logger.info(`YDCS API server running on port ${config.port}`);
      logger.info(`Swagger docs available at http://localhost:${config.port}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

start();
