/**
 * Cache primitive a 2 livelli:
 * - in-memory LRU per dati frequenti (settings, redirects)
 * - revalidatePath/revalidateTag per ISR Next.js
 *
 * Usage:
 *   const settings = await cached('site:settings', () => fetchSettings(), 60_000);
 *   invalidate('site:settings');
 */

import { revalidateTag } from 'next/cache';

interface Entry<T> {
  value: T;
  expires: number;
}

const store = new Map<string, Entry<unknown>>();
const MAX_SIZE = 200;

export async function cached<T>(key: string, fetcher: () => Promise<T>, ttlMs = 60_000): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) {
    return hit.value as T;
  }
  const value = await fetcher();
  if (store.size >= MAX_SIZE) {
    // Rimuovi la prima chiave (FIFO; per LRU vero servirebbe Map ordinato)
    const firstKey = store.keys().next().value;
    if (firstKey) store.delete(firstKey);
  }
  store.set(key, { value, expires: now + ttlMs });
  return value;
}

export function invalidate(...keys: string[]): void {
  for (const k of keys) store.delete(k);
}

export function invalidateAll(): void {
  store.clear();
}

/**
 * Stats della cache in-memory (per pannello Performance admin)
 */
export function getCacheStats(): { size: number; max: number; keys: { key: string; expiresInMs: number }[] } {
  const now = Date.now();
  const keys: { key: string; expiresInMs: number }[] = [];
  for (const [k, v] of store.entries()) {
    keys.push({ key: k, expiresInMs: Math.max(0, v.expires - now) });
  }
  return { size: store.size, max: MAX_SIZE, keys };
}

/**
 * Invalida cache in-memory + tag ISR Next.js
 */
export function revalidateContent(...tags: string[]): void {
  for (const tag of tags) {
    invalidate(tag);
    try {
      revalidateTag(tag);
    } catch {
      // revalidateTag fa throw fuori da request scope; ignorabile
    }
  }
}

export const CACHE_TAGS = {
  site: 'site:settings',
  page: (slug: string) => `page:${slug}`,
  pages: 'pages:list',
  themeBlocks: 'theme-blocks',
  redirects: 'redirects',
} as const;
