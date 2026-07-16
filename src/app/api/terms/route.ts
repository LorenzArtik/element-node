import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiError, handleApiError } from '@/lib/api-error';
import { assertCan } from '@/lib/permissions';
import { slugify } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'page.read');
    const url = new URL(req.url);
    const taxonomyId = url.searchParams.get('taxonomyId');
    const taxonomySlug = url.searchParams.get('taxonomy');
    const where: Record<string, unknown> = {};
    if (taxonomyId) where.taxonomyId = taxonomyId;
    if (taxonomySlug) where.taxonomy = { slug: taxonomySlug };
    const list = await prisma.term.findMany({
      where,
      include: { _count: { select: { posts: true } }, taxonomy: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(list);
  } catch (e) {
    return handleApiError(e);
  }
}

const createSchema = z.object({
  taxonomyId: z.string(),
  name: z.string().min(1).max(120),
  slug: z.string().optional(),
  description: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'page.update');
    const body = createSchema.parse(await req.json());
    let slug = slugify(body.slug || body.name);
    let n = 1;
    const root = slug;
    // Ensure unique within taxonomy
    while (await prisma.term.findUnique({ where: { taxonomyId_slug: { taxonomyId: body.taxonomyId, slug } } })) {
      n++;
      slug = `${root}-${n}`;
    }
    const created = await prisma.term.create({
      data: {
        taxonomyId: body.taxonomyId,
        name: body.name,
        slug,
        description: body.description ?? null,
        parentId: body.parentId ?? null,
      },
    });
    return NextResponse.json(created);
  } catch (e) {
    return handleApiError(e);
  }
}
