import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiError, handleApiError } from '@/lib/api-error';
import { assertCan } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Revoke = soft delete (revokedAt). Vero delete con DELETE method.
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'site.settings.write');
    const { id } = await params;
    const updated = await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
    await logAudit({
      actorId: session.user.id, actorEmail: session.user.email,
      action: 'api-key.revoke', entity: 'ApiKey', entityId: id,
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
    assertCan(session.user.role, 'site.settings.write');
    const { id } = await params;
    await prisma.apiKey.delete({ where: { id } });
    await logAudit({
      actorId: session.user.id, actorEmail: session.user.email,
      action: 'api-key.delete', entity: 'ApiKey', entityId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
