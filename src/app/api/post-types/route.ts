import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiError, handleApiError } from '@/lib/api-error';
import { assertCan } from '@/lib/permissions';
import { invalidatePostTypeCache, listPostTypes, supportsSchema, DEFAULT_SUPPORTS } from '@/lib/post-types';
import { slugify } from '@/lib/utils';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'page.read');
    return NextResponse.json(await listPostTypes());
  } catch (e) {
    return handleApiError(e);
  }
}

const createSchema = z.object({
  slug: z.string().min(1).max(40).optional(),
  name: z.string().min(1).max(60),
  plural: z.string().min(1).max(60),
  icon: z.string().max(40).optional(),
  description: z.string().max(2000).optional().nullable(),
  supports: supportsSchema.optional(),
  publicSingle: z.boolean().optional(),
  publicArchive: z.boolean().optional(),
  showInMenu: z.boolean().optional(),
  menuPosition: z.number().int().min(0).max(999).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'site.settings.write');
    const body = createSchema.parse(await req.json());
    const slug = slugify(body.slug || body.name);
    if (!slug) throw new ApiError('invalid_slug', 'Slug non valido', 400);
    const exists = await prisma.postType.findUnique({ where: { slug } });
    if (exists) throw new ApiError('slug_exists', 'Slug già usato', 409);
    const created = await prisma.postType.create({
      data: {
        slug,
        name: body.name,
        plural: body.plural,
        icon: body.icon ?? 'FileText',
        description: body.description ?? null,
        supports: (body.supports ?? DEFAULT_SUPPORTS) as never,
        publicSingle: body.publicSingle ?? true,
        publicArchive: body.publicArchive ?? true,
        showInMenu: body.showInMenu ?? true,
        menuPosition: body.menuPosition ?? 20,
      },
    });
    invalidatePostTypeCache(slug);
    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: 'post-type.create',
      entity: 'PostType',
      entityId: created.id,
      after: created,
    });
    return NextResponse.json(created);
  } catch (e) {
    return handleApiError(e);
  }
}
