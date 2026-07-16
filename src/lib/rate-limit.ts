/**
 * Rate limiter in-memory semplice. Utile per /api/forms/submit, /api/auth/forgot-password, ecc.
 * Per produzione su più istanze: usare Redis.
 */

interface Bucket { count: number; resetAt: number }
const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    const fresh = { count: 1, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return { allowed: true, remaining: max - 1, resetAt: fresh.resetAt };
  }
  b.count++;
  return { allowed: b.count <= max, remaining: Math.max(0, max - b.count), resetAt: b.resetAt };
}

// Cleanup periodico
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
  }, 60_000).unref?.();
}
