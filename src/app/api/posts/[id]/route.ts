import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiError, handleApiError } from '@/lib/api-error';
import { assertCan } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { revalidateContent, CACHE_TAGS } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'PRIVATE', 'SCHEDULED', 'TRASH']).optional(),
  excerpt: z.string().nullable().optional(),
  content: z.unknown().optional(),
  contentText: z.string().nullable().optional(),
  featured: z.string().nullable().optional(),
  seoTitle: z.string().nullable().optional(),
  seoDesc: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  noindex: z.boolean().optional(),
  customFields: z.record(z.string(), z.unknown()).nullable().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  termIds: z.array(z.string()).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'page.read');
    const { id } = await params;
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        postType: true,
        terms: { include: { term: { include: { taxonomy: true } } } },
        author: true,
      },
    });
    if (!post) throw new ApiError('not_found', 'Post non trovato', 404);
    return NextResponse.json(post);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'page.update');
    const { id } = await params;
    const body = patchSchema.parse(await req.json());
    const before = await prisma.post.findUnique({ where: { id } });
    if (!before) throw new ApiError('not_found', 'Post non trovato', 404);

    const data: Record<string, unknown> = { ...body };
    delete data.termIds;
    if (body.content !== undefined) data.content = body.content as never;
    if (body.publishedAt !== undefined) data.publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;
    if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    if (body.status === 'PUBLISHED' && !before.publishedAt) {
      data.publishedAt = new Date();
    }

    // Save revision before overwrite
    if (body.content !== undefined || body.contentText !== undefined) {
      await prisma.postRevision.create({
        data: { postId: id, content: before.content as never, contentText: before.contentText },
      });
    }

    const updated = await prisma.post.update({ where: { id }, data: data as never });

    if (body.termIds !== undefined) {
      await prisma.postTerm.deleteMany({ where: { postId: id } });
      if (body.termIds.length > 0) {
        await prisma.postTerm.createMany({
          data: body.termIds.map((termId) => ({ postId: id, termId })),
        });
      }
    }

    revalidateContent(CACHE_TAGS.page(updated.slug));

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: 'post.update',
      entity: 'Post',
      entityId: id,
      before,
      after: updated,
    });
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Duplicate post
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'page.create');
    const { id } = await params;
    const src = await prisma.post.findUnique({ where: { id } });
    if (!src) throw new ApiError('not_found', 'Post non trovato', 404);
    let slug = `${src.slug}-copia`;
    let n = 1;
    while (await prisma.post.findUnique({ where: { postTypeId_slug: { postTypeId: src.postTypeId, slug } } })) {
      n++;
      slug = `${src.slug}-copia-${n}`;
    }
    const created = await prisma.post.create({
      data: {
        postTypeId: src.postTypeId,
        title: `${src.title} (copia)`,
        slug,
        status: 'DRAFT',
        excerpt: src.excerpt,
        content: src.content as never,
        contentText: src.contentText,
        featured: src.featured,
        seoTitle: src.seoTitle,
        seoDesc: src.seoDesc,
        ogImage: src.ogImage,
        authorId: session.user.id,
      },
    });
    return NextResponse.json(created);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'page.delete');
    const { id } = await params;
    const before = await prisma.post.findUnique({ where: { id } });
    if (!before) throw new ApiError('not_found', 'Post non trovato', 404);
    await prisma.post.delete({ where: { id } });
    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: 'post.delete',
      entity: 'Post',
      entityId: id,
      before,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
