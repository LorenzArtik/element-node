import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiError, handleApiError } from '@/lib/api-error';
import { assertCan } from '@/lib/permissions';
import { listPosts, generateUniqueSlug } from '@/lib/posts';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'page.read');
    const url = new URL(req.url);
    const data = await listPosts({
      postTypeSlug: url.searchParams.get('type') || undefined,
      status: (url.searchParams.get('status') as 'DRAFT' | 'PUBLISHED' | 'PRIVATE' | 'SCHEDULED' | 'TRASH') || undefined,
      search: url.searchParams.get('q') || undefined,
      page: Number(url.searchParams.get('page') || 1),
      perPage: Number(url.searchParams.get('perPage') || 20),
    });
    return NextResponse.json(data);
  } catch (e) {
    return handleApiError(e);
  }
}

const createSchema = z.object({
  postTypeSlug: z.string().min(1),
  title: z.string().min(1).max(255),
  slug: z.string().optional(),
  excerpt: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'page.create');
    const body = createSchema.parse(await req.json());
    const pt = await prisma.postType.findUnique({ where: { slug: body.postTypeSlug } });
    if (!pt) throw new ApiError('not_found', 'Post type non trovato', 404);
    const slug = await generateUniqueSlug(pt.id, body.slug || body.title);
    const created = await prisma.post.create({
      data: {
        postTypeId: pt.id,
        title: body.title,
        slug,
        excerpt: body.excerpt ?? null,
        status: 'DRAFT',
        content: { sections: [] } as never,
        authorId: session.user.id,
      },
    });
    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: 'post.create',
      entity: 'Post',
      entityId: created.id,
      after: created,
    });
    return NextResponse.json(created);
  } catch (e) {
    return handleApiError(e);
  }
}
