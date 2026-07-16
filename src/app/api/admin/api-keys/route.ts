import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiError, handleApiError } from '@/lib/api-error';
import { assertCan } from '@/lib/permissions';
import { createApiKey, ALL_SCOPES, type ApiScope } from '@/lib/api-key';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'site.settings.read');
    const list = await prisma.apiKey.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, prefix: true, tail: true, scopes: true,
        lastUsedAt: true, revokedAt: true, expiresAt: true, createdAt: true,
        createdBy: { select: { email: true, name: true } },
      },
    });
    return NextResponse.json(list);
  } catch (e) {
    return handleApiError(e);
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  scopes: z.array(z.string()).min(1),
  expiresInDays: z.number().int().min(1).max(3650).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'site.settings.write');
    const body = createSchema.parse(await req.json());
    const validScopes = (body.scopes as ApiScope[]).filter((s) => ALL_SCOPES.includes(s as ApiScope));
    if (validScopes.length === 0) throw new ApiError('invalid_scopes', 'Nessuno scope valido', 400);
    const expiresAt = body.expiresInDays ? new Date(Date.now() + body.expiresInDays * 86400_000) : undefined;

    const key = await createApiKey(body.name, validScopes, session.user.id, expiresAt);

    await logAudit({
      actorId: session.user.id, actorEmail: session.user.email,
      action: 'api-key.create', entity: 'ApiKey', entityId: key.id, after: { name: key.name, scopes: validScopes },
    });

    // Plaintext mostrato SOLO una volta
    return NextResponse.json({
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      tail: key.tail,
      scopes: validScopes,
      plaintext: key.plaintext,
      message: 'Conserva questa chiave: non potrà più essere mostrata.',
    });
  } catch (e) {
    return handleApiError(e);
  }
}
