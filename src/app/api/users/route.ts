import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiError, handleApiError } from '@/lib/api-error';
import { assertCan } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';
import { sendEmail, emailLayout } from '@/lib/email';
import { getSiteSettings } from '@/lib/site-settings';
import { createEmailToken } from '@/lib/email-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'user.read');
    const url = new URL(req.url);
    const role = url.searchParams.get('role');
    const search = url.searchParams.get('q');
    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (search) where.OR = [{ email: { contains: search } }, { name: { contains: search } }];

    const list = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, locked: true, verifiedAt: true, lastLoginAt: true, createdAt: true, slug: true },
    });
    return NextResponse.json(list);
  } catch (e) {
    return handleApiError(e);
  }
}

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional(),
  role: z.enum(['ADMIN', 'EDITOR', 'AUTHOR', 'VIEWER', 'SUBSCRIBER']),
  password: z.string().min(8).optional(),
  sendInvite: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'user.write');
    const body = createSchema.parse(await req.json());

    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) throw new ApiError('email_exists', 'Email già registrata', 409);

    // Se non c'è password e non c'è invito → rifiuta
    if (!body.password && !body.sendInvite) {
      throw new ApiError('password_required', 'Specificare password o sendInvite=true', 400);
    }

    const passwordHash = body.password
      ? await bcrypt.hash(body.password, 10)
      : await bcrypt.hash(crypto.randomUUID(), 10); // password random se solo invite

    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name ?? null,
        role: body.role,
        passwordHash,
        // Se l'admin ha impostato direttamente la password (no invito) → considerato verificato
        verifiedAt: body.password ? new Date() : null,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    if (body.sendInvite) {
      const token = await createEmailToken(user.id, 'INVITE');
      const site = await getSiteSettings();
      const url = `${process.env.AUTH_URL || 'http://localhost:3000'}/reset-password/${token}?invite=1`;
      await sendEmail({
        to: user.email,
        subject: `Invito a ${site.name}`,
        html: emailLayout(site.name, `Benvenuto su ${site.name}`,
          `<p>Sei stato invitato come <strong>${body.role}</strong> su ${site.name}.</p><p>Imposta la tua password cliccando il pulsante qui sotto. L'invito scade tra 7 giorni.</p>`,
          url, 'Imposta password'),
      });
    }

    await logAudit({
      actorId: session.user.id, actorEmail: session.user.email,
      action: 'user.create', entity: 'User', entityId: user.id, after: user,
    });
    return NextResponse.json(user);
  } catch (e) {
    return handleApiError(e);
  }
}
