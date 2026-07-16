import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiError, handleApiError } from '@/lib/api-error';
import { assertCan } from '@/lib/permissions';
import { invalidatePopupsCache, DEFAULT_POPUP_SETTINGS } from '@/lib/popups';
import { DEFAULT_CONDITIONS } from '@/lib/theme-blocks';
import { logAudit } from '@/lib/audit';
import { emptyPage } from '@/lib/widgets-schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'template.read');
    const list = await prisma.popup.findMany({ orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }] });
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
    const created = await prisma.popup.create({
      data: {
        name: body.name,
        content: emptyPage() as never,
        trigger: { type: 'page-load', delayMs: 1500 } as never,
        conditions: DEFAULT_CONDITIONS as never,
        settings: DEFAULT_POPUP_SETTINGS as never,
      },
    });
    invalidatePopupsCache();
    await logAudit({
      actorId: session.user.id, actorEmail: session.user.email,
      action: 'popup.create', entity: 'Popup', entityId: created.id, after: created,
    });
    return NextResponse.json(created);
  } catch (e) {
    return handleApiError(e);
  }
}
