/**
 * Wrapper di accesso ai dati con cache per Server Components.
 * Usa `cache()` di React (per richiesta) + LRU in-memory (per processo, 60s).
 *
 * Tutti i fetcher invalidabili via `revalidateContent(tag)` su save.
 */

import { cache } from 'react';
import { prisma } from './db';
import { cached, CACHE_TAGS } from './cache';
import type { PageContent } from './widgets-schema';

/**
 * Page by slug. Cache 60s.
 */
export const getPublicPageBySlug = cache(async (slug: string) => {
  return cached(CACHE_TAGS.page(slug), async () => {
    return prisma.page.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: {
        id: true, title: true, slug: true, content: true, isHomepage: true,
        seoTitle: true, seoDesc: true, ogImage: true, updatedAt: true,
      },
    });
  }, 60_000);
});

export const getHomepage = cache(async () => {
  return cached('page:homepage', async () => {
    return prisma.page.findFirst({
      where: { isHomepage: true, status: 'PUBLISHED' },
      select: {
        id: true, title: true, slug: true, content: true,
        seoTitle: true, seoDesc: true, ogImage: true, updatedAt: true,
      },
    });
  }, 60_000);
});

/**
 * Lista pagine pubblicate. Cache 30s (cambia spesso).
 */
export const getPublishedPagesList = cache(async () => {
  return cached(CACHE_TAGS.pages, async () => {
    return prisma.page.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, isHomepage: true, updatedAt: true },
    });
  }, 30_000);
});

/**
 * Estrae solo PageContent JSON cached. Utile quando il widget ha bisogno solo del content.
 */
export async function getPageContent(slug: string): Promise<PageContent | null> {
  const p = await getPublicPageBySlug(slug);
  return (p?.content as unknown as PageContent) ?? null;
}
