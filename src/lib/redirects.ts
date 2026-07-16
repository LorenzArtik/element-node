import { prisma } from './db';
import { cached, CACHE_TAGS } from './cache';

export interface RedirectRule {
  fromPath: string;
  toPath: string;
  type: number;
}

/**
 * Restituisce una mappa fromPath -> rule di tutti i redirect attivi.
 * Cache 60s.
 */
export async function getActiveRedirects(): Promise<Map<string, RedirectRule>> {
  return cached(CACHE_TAGS.redirects, async () => {
    const rows = await prisma.redirect.findMany({ where: { enabled: true } });
    const map = new Map<string, RedirectRule>();
    for (const r of rows) {
      map.set(r.fromPath, { fromPath: r.fromPath, toPath: r.toPath, type: r.type });
    }
    return map;
  }, 60_000);
}

export async function findRedirect(path: string): Promise<RedirectRule | null> {
  const map = await getActiveRedirects();
  return map.get(path) ?? null;
}

export async function incrementHits(fromPath: string): Promise<void> {
  // Best effort, no await blocking
  prisma.redirect.update({ where: { fromPath }, data: { hits: { increment: 1 } } }).catch(() => {});
}
