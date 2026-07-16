import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiError, handleApiError } from '@/lib/api-error';
import { assertCan } from '@/lib/permissions';
import { invalidateThemeBlocksCache, conditionsSchema } from '@/lib/theme-blocks';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  content: z.unknown().optional(),
  conditions: conditionsSchema.optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'template.read');
    const { id } = await params;
    const row = await prisma.themeBlock.findUnique({ where: { id } });
    if (!row) throw new ApiError('not_found', 'Theme block non trovato', 404);
    return NextResponse.json(row);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'template.write');
    const { id } = await params;
    const body = patchSchema.parse(await req.json());
    const before = await prisma.themeBlock.findUnique({ where: { id } });
    if (!before) throw new ApiError('not_found', 'Theme block non trovato', 404);

    const data: Record<string, unknown> = { ...body };
    if (body.status === 'PUBLISHED' && !before.publishedAt) {
      data.publishedAt = new Date();
    }
    const updated = await prisma.themeBlock.update({ where: { id }, data: data as never });
    invalidateThemeBlocksCache();
    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: 'theme-block.update',
      entity: 'ThemeBlock',
      entityId: id,
      before,
      after: updated,
    });
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'template.delete');
    const { id } = await params;
    const before = await prisma.themeBlock.findUnique({ where: { id } });
    if (!before) throw new ApiError('not_found', 'Theme block non trovato', 404);
    await prisma.themeBlock.delete({ where: { id } });
    invalidateThemeBlocksCache();
    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: 'theme-block.delete',
      entity: 'ThemeBlock',
      entityId: id,
      before,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
