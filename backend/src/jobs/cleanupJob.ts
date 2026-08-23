import cron from 'node-cron';
import { cleanupOldLoginHistory } from '../services/cleanupService';
import { logger } from '../utils/logger';

export function startCleanupJob() {
  cron.schedule('0 3 1 * *', async () => {
    try {
      await cleanupOldLoginHistory();
    } catch (error) {
      logger.error('Scheduled login history cleanup failed', error);
    }
  });
  logger.info('Login history cleanup scheduled: 1st of each month at 03:00');
}
