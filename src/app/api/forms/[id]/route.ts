import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiError, handleApiError } from '@/lib/api-error';
import { assertCan } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { formFieldSchema, actionSchema, formSettingsSchema } from '@/lib/forms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().nullable().optional(),
  fields: z.array(formFieldSchema).optional(),
  actions: z.array(actionSchema).optional(),
  settings: formSettingsSchema.optional(),
  recipients: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'template.read');
    const { id } = await params;
    const form = await prisma.form.findUnique({ where: { id }, include: { _count: { select: { submissions: true } } } });
    if (!form) throw new ApiError('not_found', 'Form non trovato', 404);
    return NextResponse.json(form);
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
    const before = await prisma.form.findUnique({ where: { id } });
    if (!before) throw new ApiError('not_found', 'Form non trovato', 404);
    const data: Record<string, unknown> = { ...body };
    if (body.fields) data.fields = body.fields as never;
    if (body.actions) data.actions = body.actions as never;
    if (body.settings) data.settings = body.settings as never;
    const updated = await prisma.form.update({ where: { id }, data: data as never });
    await logAudit({
      actorId: session.user.id, actorEmail: session.user.email,
      action: 'form.update', entity: 'Form', entityId: id, before, after: updated,
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
    const before = await prisma.form.findUnique({ where: { id } });
    if (!before) throw new ApiError('not_found', 'Form non trovato', 404);
    await prisma.form.delete({ where: { id } });
    await logAudit({
      actorId: session.user.id, actorEmail: session.user.email,
      action: 'form.delete', entity: 'Form', entityId: id, before,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
