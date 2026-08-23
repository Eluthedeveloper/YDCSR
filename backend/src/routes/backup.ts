import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { audit } from '../middleware/audit';
import { config } from '../config';
import {
  createBackup, listBackups, deleteBackup, getBackupFilePath,
} from '../services/backupService';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const items = await listBackups();
    return res.json({
      success: true,
      data: { items, schedule: config.backup.cron, keep: config.backup.keep },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', audit('CREATE', 'Backup'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const backup = await createBackup('manual');
    return res.json({ success: true, message: 'Backup created', data: backup });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Backup failed' });
  }
});

router.get('/download/:name', (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const filePath = getBackupFilePath(String(req.params.name));
    if (!filePath) {
      return res.status(404).json({ success: false, message: 'Backup not found' });
    }
    return res.download(filePath);
  } catch (error) {
    next(error);
  }
});

router.delete('/:name', audit('DELETE', 'Backup'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const deleted = await deleteBackup(String(req.params.name));
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Backup not found' });
    }
    return res.json({ success: true, message: 'Backup deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
