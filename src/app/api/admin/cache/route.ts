import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ApiError, handleApiError } from '@/lib/api-error';
import { assertCan } from '@/lib/permissions';
import { getCacheStats, invalidateAll } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'site.settings.read');
    return NextResponse.json(getCacheStats());
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'site.settings.write');
    invalidateAll();
    return NextResponse.json({ ok: true, message: 'Cache svuotata' });
  } catch (e) {
    return handleApiError(e);
  }
}
