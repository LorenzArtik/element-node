import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiError, handleApiError } from '@/lib/api-error';
import { assertCan } from '@/lib/permissions';
import { invalidatePopupsCache, triggerSchema, popupSettingsSchema } from '@/lib/popups';
import { conditionsSchema } from '@/lib/theme-blocks';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  content: z.unknown().optional(),
  trigger: triggerSchema.optional(),
  conditions: conditionsSchema.optional(),
  settings: popupSettingsSchema.optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'template.read');
    const { id } = await params;
    const row = await prisma.popup.findUnique({ where: { id } });
    if (!row) throw new ApiError('not_found', 'Popup non trovato', 404);
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
    const before = await prisma.popup.findUnique({ where: { id } });
    if (!before) throw new ApiError('not_found', 'Popup non trovato', 404);
    const data: Record<string, unknown> = { ...body };
    if (body.status === 'PUBLISHED' && !before.publishedAt) data.publishedAt = new Date();
    const updated = await prisma.popup.update({ where: { id }, data: data as never });
    invalidatePopupsCache();
    await logAudit({
      actorId: session.user.id, actorEmail: session.user.email,
      action: 'popup.update', entity: 'Popup', entityId: id, before, after: updated,
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
    const before = await prisma.popup.findUnique({ where: { id } });
    if (!before) throw new ApiError('not_found', 'Popup non trovato', 404);
    await prisma.popup.delete({ where: { id } });
    invalidatePopupsCache();
    await logAudit({
      actorId: session.user.id, actorEmail: session.user.email,
      action: 'popup.delete', entity: 'Popup', entityId: id, before,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
