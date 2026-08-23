import { Request } from 'express';

export interface GeoInfo {
  ipAddress?: string;
  country: string | null;
  countryCode: string | null;
  city: string | null;
}

const GEO_CACHE_TTL = 24 * 60 * 60 * 1000;
const cache = new Map<string, { value: GeoInfo; expiresAt: number }>();

const LOCAL_IPS = new Set(['127.0.0.1', '::1']);

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first.replace(/^::ffff:/, '');
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    const first = forwarded[0].split(',')[0].trim();
    if (first) return first.replace(/^::ffff:/, '');
  }
  return (req.ip || '').replace(/^::ffff:/, '');
}

function isPrivateIp(ip: string): boolean {
  if (LOCAL_IPS.has(ip)) return true;
  if (/^127\./.test(ip)) return true;
  if (/^10\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  return false;
}

function localGeo(): GeoInfo {
  return { country: 'Local Network', countryCode: null, city: null };
}

export async function resolveGeo(ip?: string): Promise<GeoInfo | null> {
  if (!ip) return null;
  const clean = ip.replace(/^::ffff:/, '').trim();
  if (!clean) return null;

  if (isPrivateIp(clean)) return localGeo();

  const cached = cache.get(clean);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(clean)}?fields=status,country,countryCode,city`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    const data = (await res.json()) as { status: string; country?: string; countryCode?: string; city?: string };
    const value: GeoInfo = data.status === 'success'
      ? { country: data.country || null, countryCode: data.countryCode || null, city: data.city || null }
      : { country: 'Unknown', countryCode: null, city: null };
    cache.set(clean, { value, expiresAt: Date.now() + GEO_CACHE_TTL });
    return value;
  } catch {
    return { country: null, countryCode: null, city: null };
  }
}
