import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiError, handleApiError } from '@/lib/api-error';
import { assertCan } from '@/lib/permissions';
import { revalidateContent, CACHE_TAGS } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'redirect.write');
    const list = await prisma.redirect.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(list);
  } catch (e) {
    return handleApiError(e);
  }
}

const createSchema = z.object({
  fromPath: z.string().min(1).startsWith('/'),
  toPath: z.string().min(1),
  type: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]).default(301),
  enabled: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'redirect.write');
    const body = createSchema.parse(await req.json());
    const exists = await prisma.redirect.findUnique({ where: { fromPath: body.fromPath } });
    if (exists) throw new ApiError('exists', 'Redirect già esistente per questo path', 409);
    const created = await prisma.redirect.create({
      data: {
        fromPath: body.fromPath, toPath: body.toPath, type: body.type, enabled: body.enabled ?? true,
      },
    });
    revalidateContent(CACHE_TAGS.redirects);
    return NextResponse.json(created);
  } catch (e) {
    return handleApiError(e);
  }
}
