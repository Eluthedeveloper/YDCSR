import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { authService } from '../services/authService';
import { loginSchema } from '../validators';
import { getClientIp } from '../utils/geo';

export class AuthController {
  async login(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = loginSchema.parse(req.body);
      const result = await authService.login(data.username, data.password, {
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });
      return res.json({ success: true, message: 'Login successful', data: result });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'Refresh token required' });
      }
      const result = await authService.refresh(refreshToken);
      return res.json({ success: true, message: 'Token refreshed', data: result });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) await authService.logout(refreshToken);
      return res.json({ success: true, message: 'Logout successful' });
    } catch (error) {
      next(error);
    }
  }

  async profile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await authService.getProfile(req.user!.userId);
      return res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
