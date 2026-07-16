import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { ApiError, handleApiError } from '@/lib/api-error';
import { consumeEmailToken } from '@/lib/email-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  token: z.string().min(8),
  password: z.string().min(8).max(120),
  type: z.enum(['RESET', 'INVITE']).default('RESET'),
});

export async function POST(req: NextRequest) {
  try {
    const { token, password, type } = schema.parse(await req.json());
    const consumed = await consumeEmailToken(token, type);
    if (!consumed) throw new ApiError('invalid_token', 'Token non valido o scaduto', 400);
    const passwordHash = await bcrypt.hash(password, 10);
    const data: Record<string, unknown> = { passwordHash };
    if (type === 'INVITE') data.verifiedAt = new Date();
    await prisma.user.update({ where: { id: consumed.userId }, data: data as never });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
