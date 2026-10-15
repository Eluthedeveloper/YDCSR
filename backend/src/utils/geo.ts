import { Request } from 'express';

export interface GeoInfo {
  ipAddress?: string;
  country: string | null;
  countryCode: string | null;
  city: string | null;
}

const GEO_CACHE_TTL = 24 * 60 * 60 * 1000;
const cache = new Map<string, { value: GeoInfo; expiresAt: number }>();

const LOCAL_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

function isPublicIpv4(ip: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return false;
  const parts = m.slice(1).map(Number);
  if (parts.some((n) => n > 255)) return false;
  const [a, b, c] = parts;
  if (a === 0 || a === 255) return false;
  if (a >= 224) return false;
  if (a === 10) return false;
  if (a === 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  return true;
}

export function getClientIp(req: Request): string {
  // Cloudflare terminates the public connection and carries the real visitor IP
  // in CF-Connecting-IP. Without it, req.ip resolves to a Cloudflare edge
  // (Anycast) address and the geo lookup logs the datacenter location (e.g.
  // Marseille, Djibouti) instead of the actual visitor.
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && isPublicIpv4(cfIp.trim())) {
    return cfIp.trim().replace(/^::ffff:/, '');
  }
  // The app sets `trust proxy = 1`, so Express already resolves the real client
  // IP from the right-most (proxy-trusted) X-Forwarded-For hop. Reading the
  // first XFF value instead would let a direct client spoof its address.
  let ip = (req.ip || req.socket.remoteAddress || '').replace(/^::ffff:/, '');
  // Only when the request arrived over loopback (cPanel proxy terminating on
  // the same host) fall back to the final XFF entry added by that proxy.
  if (LOCAL_IPS.has(ip) && req.headers['x-forwarded-for']) {
    const raw = req.headers['x-forwarded-for'];
    const chain = (Array.isArray(raw) ? raw : [raw]).join(',').split(',');
    const last = chain[chain.length - 1]?.trim();
    if (last) ip = last.replace(/^::ffff:/, '');
  }
  return ip;
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
