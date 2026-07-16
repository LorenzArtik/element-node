import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiError, handleApiError } from '@/lib/api-error';
import { assertCan } from '@/lib/permissions';
import { invalidatePostTypeCache, supportsSchema } from '@/lib/post-types';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  plural: z.string().min(1).max(60).optional(),
  icon: z.string().max(40).optional(),
  description: z.string().max(2000).nullable().optional(),
  supports: supportsSchema.optional(),
  urlPattern: z.string().min(1).max(120).optional(),
  publicSingle: z.boolean().optional(),
  publicArchive: z.boolean().optional(),
  showInMenu: z.boolean().optional(),
  menuPosition: z.number().int().min(0).max(999).optional(),
  defaultSingleTemplateId: z.string().nullable().optional(),
  defaultArchiveTemplateId: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'site.settings.write');
    const { id } = await params;
    const before = await prisma.postType.findUnique({ where: { id } });
    if (!before) throw new ApiError('not_found', 'Post type non trovato', 404);
    const body = patchSchema.parse(await req.json());
    const data = body as Record<string, unknown>;
    if (data.supports) data.supports = data.supports as never;
    const updated = await prisma.postType.update({ where: { id }, data: data as never });
    invalidatePostTypeCache(updated.slug);
    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: 'post-type.update',
      entity: 'PostType',
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
  // Duplicate post type
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'site.settings.write');
    const { id } = await params;
    const src = await prisma.postType.findUnique({ where: { id } });
    if (!src) throw new ApiError('not_found', 'Post type non trovato', 404);
    let slug = `${src.slug}-copia`;
    let n = 1;
    while (await prisma.postType.findUnique({ where: { slug } })) {
      n++;
      slug = `${src.slug}-copia-${n}`;
    }
    const created = await prisma.postType.create({
      data: {
        slug,
        name: `${src.name} (copia)`,
        plural: `${src.plural} (copia)`,
        icon: src.icon,
        description: src.description,
        supports: src.supports as never,
        urlPattern: src.urlPattern,
        publicSingle: src.publicSingle,
        publicArchive: src.publicArchive,
        showInMenu: src.showInMenu,
        menuPosition: src.menuPosition + 1,
      },
    });
    invalidatePostTypeCache(slug);
    return NextResponse.json(created);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'site.settings.write');
    const { id } = await params;
    const before = await prisma.postType.findUnique({ where: { id } });
    if (!before) throw new ApiError('not_found', 'Post type non trovato', 404);
    if (before.slug === 'post') throw new ApiError('protected', 'Il post type "post" non si può eliminare', 400);
    await prisma.postType.delete({ where: { id } });
    invalidatePostTypeCache(before.slug);
    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: 'post-type.delete',
      entity: 'PostType',
      entityId: id,
      before,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
