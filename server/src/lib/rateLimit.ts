/**
 * Minimal in-memory fixed-window rate limiter, keyed by client IP.
 * Sufficient for local/POC and a single container instance. For multi-instance
 * production, swap the Map for a shared store (e.g. Redis) behind this same call.
 */

interface Window {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const buckets = new Map<string, Window>();

/** Returns true if the request is allowed; false if the limit is exceeded. */
export function allow(key: string, now = Date.now()): boolean {
  const w = buckets.get(key);
  if (!w || now >= w.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (w.count >= MAX_PER_WINDOW) return false;
  w.count += 1;
  return true;
}
