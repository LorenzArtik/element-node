import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiError, handleApiError } from '@/lib/api-error';
import { assertCan } from '@/lib/permissions';
import { revalidateContent, CACHE_TAGS } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  fromPath: z.string().startsWith('/').optional(),
  toPath: z.string().optional(),
  type: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]).optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'redirect.write');
    const { id } = await params;
    const body = patchSchema.parse(await req.json());
    const updated = await prisma.redirect.update({ where: { id }, data: body });
    revalidateContent(CACHE_TAGS.redirects);
    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'redirect.write');
    const { id } = await params;
    await prisma.redirect.delete({ where: { id } });
    revalidateContent(CACHE_TAGS.redirects);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
