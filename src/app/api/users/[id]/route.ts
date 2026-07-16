import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiError, handleApiError } from '@/lib/api-error';
import { assertCan } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  name: z.string().min(1).max(120).nullable().optional(),
  role: z.enum(['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER', 'SUBSCRIBER']).optional(),
  bio: z.string().max(2000).nullable().optional(),
  slug: z.string().min(1).max(60).nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  socials: z.record(z.string(), z.string()).nullable().optional(),
  locked: z.boolean().optional(),
  newPassword: z.string().min(8).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    const { id } = await params;
    if (id !== session.user.id) assertCan(session.user.role, 'user.read');
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, bio: true, slug: true, socials: true, locked: true, verifiedAt: true, createdAt: true, lastLoginAt: true },
    });
    if (!user) throw new ApiError('not_found', 'Utente non trovato', 404);
    return NextResponse.json(user);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    const { id } = await params;
    const isSelf = id === session.user.id;
    if (!isSelf) assertCan(session.user.role, 'user.write');
    const body = patchSchema.parse(await req.json());

    // Self-edit restrictions: nessuno self-promote
    if (isSelf && body.role && body.role !== session.user.role) {
      throw new ApiError('forbidden', 'Non puoi cambiare il tuo ruolo', 403);
    }

    const before = await prisma.user.findUnique({ where: { id } });
    if (!before) throw new ApiError('not_found', 'Utente non trovato', 404);

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.role !== undefined) data.role = body.role;
    if (body.bio !== undefined) data.bio = body.bio;
    if (body.slug !== undefined) data.slug = body.slug;
    if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl;
    if (body.socials !== undefined) data.socials = body.socials as never;
    if (body.locked !== undefined) data.locked = body.locked;
    if (body.newPassword) data.passwordHash = await bcrypt.hash(body.newPassword, 10);

    const updated = await prisma.user.update({
      where: { id }, data: data as never,
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, bio: true, slug: true, socials: true, locked: true },
    });

    await logAudit({
      actorId: session.user.id, actorEmail: session.user.email,
      action: 'user.update', entity: 'User', entityId: id, before, after: updated,
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
    assertCan(session.user.role, 'user.delete');
    const { id } = await params;
    if (id === session.user.id) throw new ApiError('self_delete', 'Non puoi eliminare te stesso', 400);
    const before = await prisma.user.findUnique({ where: { id } });
    if (!before) throw new ApiError('not_found', 'Utente non trovato', 404);
    await prisma.user.delete({ where: { id } });
    await logAudit({
      actorId: session.user.id, actorEmail: session.user.email,
      action: 'user.delete', entity: 'User', entityId: id, before,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
