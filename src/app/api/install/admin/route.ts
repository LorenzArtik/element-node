import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { lockExists } from '@/lib/install-status';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Min 8 caratteri'),
  name: z.string().min(1).max(80),
});

export async function POST(req: Request) {
  if (lockExists()) {
    return NextResponse.json({ error: 'already_installed' }, { status: 409 });
  }
  const existingAdmin = await prisma.user.count({ where: { role: 'ADMIN' } }).catch(() => -1);
  if (existingAdmin === -1) {
    return NextResponse.json({ error: 'db_not_ready', hint: 'Esegui prima il passo Database.' }, { status: 400 });
  }
  if (existingAdmin > 0) {
    return NextResponse.json({ error: 'admin_exists' }, { status: 409 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const { email, password, name } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email: email.toLowerCase(), passwordHash, name, role: 'ADMIN', emailVerified: new Date() },
    select: { id: true, email: true, name: true, role: true },
  });
  return NextResponse.json({ ok: true, user });
}
