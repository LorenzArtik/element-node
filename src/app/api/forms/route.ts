import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiError, handleApiError } from '@/lib/api-error';
import { assertCan } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { DEFAULT_FORM_FIELDS, DEFAULT_FORM_SETTINGS } from '@/lib/forms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'template.read');
    const list = await prisma.form.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { submissions: true } } },
    });
    return NextResponse.json(list);
  } catch (e) {
    return handleApiError(e);
  }
}

const createSchema = z.object({ name: z.string().min(1).max(120) });

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'template.write');
    const body = createSchema.parse(await req.json());
    const created = await prisma.form.create({
      data: {
        name: body.name,
        fields: DEFAULT_FORM_FIELDS as never,
        actions: [{ type: 'db-only' }] as never,
        settings: DEFAULT_FORM_SETTINGS as never,
      },
    });
    await logAudit({
      actorId: session.user.id, actorEmail: session.user.email,
      action: 'form.create', entity: 'Form', entityId: created.id, after: created,
    });
    return NextResponse.json(created);
  } catch (e) {
    return handleApiError(e);
  }
}
