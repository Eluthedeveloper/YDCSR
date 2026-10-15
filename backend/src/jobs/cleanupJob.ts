import cron from 'node-cron';
import { cleanupOldAuditLogs } from '../services/cleanupService';
import { logger } from '../utils/logger';

export function startCleanupJob() {
  cron.schedule('0 3 1 * *', async () => {
    try {
      await cleanupOldAuditLogs();
    } catch (error) {
      logger.error('Scheduled audit log cleanup failed', error);
    }
  });
  logger.info('Audit log cleanup scheduled: 1st of each month at 03:00');
}