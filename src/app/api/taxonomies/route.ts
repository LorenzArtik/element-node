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
    const postTypeSlug = url.searchParams.get('postTypeSlug');
    const where = postTypeSlug ? { postType: { slug: postTypeSlug } } : {};
    const list = await prisma.taxonomy.findMany({
      where,
      include: { _count: { select: { terms: true } } },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(list);
  } catch (e) {
    return handleApiError(e);
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(60),
  plural: z.string().min(1).max(60),
  slug: z.string().optional(),
  hierarchical: z.boolean().optional(),
  postTypeId: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'site.settings.write');
    const body = createSchema.parse(await req.json());
    const slug = slugify(body.slug || body.name);
    const created = await prisma.taxonomy.create({
      data: {
        slug, name: body.name, plural: body.plural,
        hierarchical: body.hierarchical ?? false,
        postTypeId: body.postTypeId ?? null,
      },
    });
    return NextResponse.json(created);
  } catch (e) {
    return handleApiError(e);
  }
}
