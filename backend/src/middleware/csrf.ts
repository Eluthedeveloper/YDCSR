import { Request, Response, NextFunction } from 'express';

// Double-submit CSRF protection for the cookie-based auth flow.
//
// Requests authenticated with an Authorization header (non-browser clients,
// API tooling) carry no CSRF risk, so they are skipped. Browser requests rely
// on the httpOnly auth cookies, and must prove they can read the csrf_token
// cookie by echoing it in the X-CSRF-Token header. A cross-site attacker cannot
// read that cookie, so the mismatch is rejected.
export function csrfProtect(req: Request, res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  // Login and refresh bootstrap/rotates the CSRF token, so exempt them.
  if (req.path.startsWith('/auth/login') || req.path.startsWith('/auth/refresh')) {
    return next();
  }

  if (req.headers.authorization) return next();

  const cookieToken = (req.cookies?.csrf_token as string) || '';
  const headerToken = (req.headers['x-csrf-token'] as string) || '';

  if (!cookieToken || cookieToken !== headerToken) {
    return res.status(403).json({ success: false, message: 'Invalid CSRF token' });
  }

  return next();
}