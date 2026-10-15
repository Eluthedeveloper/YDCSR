import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { authService } from '../services/authService';
import { loginSchema } from '../validators';
import { config } from '../config';
import { getClientIp } from '../utils/geo';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}

export class AuthController {
  private baseCookieOptions(): Record<string, unknown> {
    return {
      httpOnly: true,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
      path: '/',
      ...(config.cookie.domain ? { domain: config.cookie.domain } : {}),
    };
  }

  private setAuthCookies(res: Response, tokens: AuthTokens) {
    const base = this.baseCookieOptions();
    res.cookie('access_token', tokens.accessToken, { ...base, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', tokens.refreshToken, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 });
    // CSRF double-submit token: readable by the frontend so it can echo it back.
    res.cookie('csrf_token', tokens.csrfToken, { ...base, httpOnly: false, maxAge: 7 * 24 * 60 * 60 * 1000 });
  }

  private refreshCsrfCookie(res: Response, csrfToken: string) {
    res.cookie('csrf_token', csrfToken, { ...this.baseCookieOptions(), httpOnly: false, maxAge: 7 * 24 * 60 * 60 * 1000 });
  }

  private clearAuthCookies(res: Response) {
    const base = this.baseCookieOptions();
    for (const name of ['access_token', 'refresh_token', 'csrf_token']) {
      res.clearCookie(name, { ...base, maxAge: undefined });
    }
  }

  async login(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = loginSchema.parse(req.body);
      const result = await authService.login(data.username, data.password, {
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });
      this.setAuthCookies(res, result);
      return res.json({ success: true, message: 'Login successful', data: result });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
      if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'Refresh token required' });
      }
      const result = await authService.refresh(refreshToken);
      this.setAuthCookies(res, result);
      return res.json({ success: true, message: 'Token refreshed', data: result });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;
      if (refreshToken) await authService.logout(refreshToken);
      this.clearAuthCookies(res);
      return res.json({ success: true, message: 'Logout successful' });
    } catch (error) {
      next(error);
    }
  }

  async profile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await authService.getProfile(req.user!.userId);
      // Keep the CSRF token fresh alongside the session.
      if (typeof req.cookies?.csrf_token === 'string') {
        this.refreshCsrfCookie(res, req.cookies.csrf_token);
      }
      return res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();