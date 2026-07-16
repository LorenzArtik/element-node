import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { consumeEmailToken } from '@/lib/email-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const consumed = await consumeEmailToken(token, 'VERIFY');
  if (!consumed) return NextResponse.redirect(new URL('/login?verify=fail', process.env.AUTH_URL || 'http://localhost:3000'));
  await prisma.user.update({ where: { id: consumed.userId }, data: { verifiedAt: new Date() } });
  return NextResponse.redirect(new URL('/login?verify=ok', process.env.AUTH_URL || 'http://localhost:3000'));
}
