import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { settingsService } from '../services/settingsService';

export class SettingsController {
  async get(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const loginLoggingPaused = await settingsService.isLoginLoggingPaused();
      return res.json({ success: true, data: { loginLoggingPaused } });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { loginLoggingPaused } = req.body as { loginLoggingPaused?: unknown };
      if (typeof loginLoggingPaused !== 'boolean') {
        return res.status(400).json({ success: false, message: 'loginLoggingPaused must be a boolean' });
      }
      await settingsService.setLoginLoggingPaused(loginLoggingPaused);
      return res.json({ success: true, data: { loginLoggingPaused } });
    } catch (error) {
      next(error);
    }
  }
}

export const settingsController = new SettingsController();
