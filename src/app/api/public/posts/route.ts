import { NextRequest, NextResponse } from 'next/server';
import { listPosts } from '@/lib/posts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const data = await listPosts({
    postTypeSlug: url.searchParams.get('type') || 'post',
    status: 'PUBLISHED',
    page: Number(url.searchParams.get('page') || 1),
    perPage: Number(url.searchParams.get('perPage') || 12),
    termSlug: url.searchParams.get('term') || undefined,
    taxonomySlug: url.searchParams.get('taxonomy') || undefined,
  });
  // Espone solo i campi pubblici
  return NextResponse.json({
    items: data.items.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      featured: p.featured,
      publishedAt: p.publishedAt,
      postType: { slug: p.postType.slug, name: p.postType.name },
    })),
    page: data.page,
    perPage: data.perPage,
    total: data.total,
    totalPages: data.totalPages,
  });
}
