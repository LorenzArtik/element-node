import { prisma } from './db';
import { slugify } from './utils';

export interface PostListFilters {
  postTypeSlug?: string;
  postTypeId?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'PRIVATE' | 'SCHEDULED' | 'TRASH';
  authorId?: string;
  search?: string;
  termSlug?: string;
  termId?: string;
  taxonomySlug?: string;
  page?: number;
  perPage?: number;
  orderBy?: 'publishedAt' | 'createdAt' | 'updatedAt' | 'title';
  order?: 'asc' | 'desc';
}

export async function listPosts(filters: PostListFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(Math.max(1, filters.perPage ?? 12), 100);
  const where: Record<string, unknown> = {};

  if (filters.postTypeSlug) where.postType = { slug: filters.postTypeSlug };
  if (filters.postTypeId) where.postTypeId = filters.postTypeId;
  if (filters.status) where.status = filters.status;
  if (filters.authorId) where.authorId = filters.authorId;
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search } },
      { excerpt: { contains: filters.search } },
    ];
  }
  if (filters.termSlug || filters.termId) {
    where.terms = {
      some: filters.termId
        ? { termId: filters.termId }
        : { term: { slug: filters.termSlug, ...(filters.taxonomySlug ? { taxonomy: { slug: filters.taxonomySlug } } : {}) } },
    };
  }

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { [filters.orderBy ?? 'publishedAt']: filters.order ?? 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        author: { select: { id: true, name: true, email: true, avatarUrl: true } },
        postType: true,
        terms: { include: { term: { include: { taxonomy: true } } } },
      },
    }),
    prisma.post.count({ where }),
  ]);

  return {
    items,
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  };
}

export async function getPostBySlug(postTypeSlug: string, slug: string) {
  return prisma.post.findFirst({
    where: { slug, postType: { slug: postTypeSlug } },
    include: {
      author: true,
      postType: true,
      terms: { include: { term: { include: { taxonomy: true } } } },
    },
  });
}

export async function generateUniqueSlug(postTypeId: string, base: string): Promise<string> {
  let slug = slugify(base);
  if (!slug) slug = 'post';
  let n = 1;
  const root = slug;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await prisma.post.findUnique({ where: { postTypeId_slug: { postTypeId, slug } } });
    if (!exists) return slug;
    n++;
    slug = `${root}-${n}`;
  }
}
