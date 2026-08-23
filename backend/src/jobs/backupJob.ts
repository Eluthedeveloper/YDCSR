import cron from 'node-cron';
import { config } from '../config';
import { createBackup, pruneOldBackups } from '../services/backupService';
import { logger } from '../utils/logger';

export function startBackupJob() {
  cron.schedule(config.backup.cron, async () => {
    try {
      await createBackup('auto');
      await pruneOldBackups();
    } catch (error) {
      logger.error('Scheduled database backup failed', error);
    }
  });
  logger.info(
    `Database backup scheduled: "${config.backup.cron}" (keeping last ${config.backup.keep} backups in ${config.backup.dir}/)`
  );
}
