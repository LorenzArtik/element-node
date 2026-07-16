import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiError, handleApiError } from '@/lib/api-error';
import { assertCan } from '@/lib/permissions';
import { invalidateThemeBlocksCache, DEFAULT_CONDITIONS } from '@/lib/theme-blocks';
import { logAudit } from '@/lib/audit';
import { emptyPage } from '@/lib/widgets-schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'template.read');
    const url = new URL(req.url);
    const kind = url.searchParams.get('kind') as 'HEADER' | 'FOOTER' | null;
    const list = await prisma.themeBlock.findMany({
      where: kind ? { kind } : undefined,
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
    });
    return NextResponse.json(list);
  } catch (e) {
    return handleApiError(e);
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  kind: z.enum(['HEADER', 'FOOTER']),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'template.write');
    const body = createSchema.parse(await req.json());
    const created = await prisma.themeBlock.create({
      data: {
        name: body.name,
        kind: body.kind,
        content: emptyPage() as never,
        conditions: DEFAULT_CONDITIONS as never,
      },
    });
    invalidateThemeBlocksCache();
    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: 'theme-block.create',
      entity: 'ThemeBlock',
      entityId: created.id,
      after: created,
    });
    return NextResponse.json(created);
  } catch (e) {
    return handleApiError(e);
  }
}
