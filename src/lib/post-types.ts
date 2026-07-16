import { z } from 'zod';
import { prisma } from './db';
import { cached, invalidate } from './cache';

export const SUPPORTS_KEYS = ['title', 'editor', 'excerpt', 'featured', 'seo', 'taxonomies', 'comments', 'customFields'] as const;
export type SupportKey = (typeof SUPPORTS_KEYS)[number];

export const supportsSchema = z.array(z.enum(SUPPORTS_KEYS));
export type Supports = z.infer<typeof supportsSchema>;

export const DEFAULT_SUPPORTS: Supports = ['title', 'editor', 'excerpt', 'featured', 'seo', 'taxonomies'];

const CACHE_TAG_PT_LIST = 'post-types:list';
const cacheTagPt = (slug: string) => `post-type:${slug}`;

export interface PostTypeRow {
  id: string;
  slug: string;
  name: string;
  plural: string;
  icon: string;
  description: string | null;
  supports: Supports;
  urlPattern: string;
  showInMenu: boolean;
  publicSingle: boolean;
  publicArchive: boolean;
  restEnabled: boolean;
  menuPosition: number;
  defaultSingleTemplateId: string | null;
  defaultArchiveTemplateId: string | null;
}

function parseRow(row: { supports: unknown } & Omit<PostTypeRow, 'supports'>): PostTypeRow {
  const parsed = supportsSchema.safeParse(row.supports);
  return { ...row, supports: parsed.success ? parsed.data : DEFAULT_SUPPORTS };
}

export async function listPostTypes(): Promise<PostTypeRow[]> {
  return cached(CACHE_TAG_PT_LIST, async () => {
    const rows = await prisma.postType.findMany({
      orderBy: [{ menuPosition: 'asc' }, { name: 'asc' }],
    });
    return rows.map(parseRow);
  }, 60_000);
}

export async function getPostTypeBySlug(slug: string): Promise<PostTypeRow | null> {
  return cached(cacheTagPt(slug), async () => {
    const row = await prisma.postType.findUnique({ where: { slug } });
    return row ? parseRow(row) : null;
  }, 60_000);
}

export async function getPostTypeById(id: string): Promise<PostTypeRow | null> {
  const row = await prisma.postType.findUnique({ where: { id } });
  return row ? parseRow(row) : null;
}

export function invalidatePostTypeCache(slug?: string) {
  invalidate(CACHE_TAG_PT_LIST);
  if (slug) invalidate(cacheTagPt(slug));
}

/**
 * Crea il PostType "post" di default se non esiste, con tassonomie "category" e "tag".
 * Chiamato dalla seed e idempotente.
 */
export async function ensureDefaultPostType(): Promise<void> {
  const existing = await prisma.postType.findUnique({ where: { slug: 'post' } });
  if (existing) return;
  const pt = await prisma.postType.create({
    data: {
      slug: 'post',
      name: 'Articolo',
      plural: 'Articoli',
      icon: 'Newspaper',
      description: 'Post type predefinito per articoli/blog',
      supports: DEFAULT_SUPPORTS as never,
      menuPosition: 5,
    },
  });
  await prisma.taxonomy.createMany({
    data: [
      { slug: 'category', name: 'Categoria', plural: 'Categorie', hierarchical: true, postTypeId: pt.id },
      { slug: 'tag', name: 'Tag', plural: 'Tag', hierarchical: false, postTypeId: pt.id },
    ],
  });
}
