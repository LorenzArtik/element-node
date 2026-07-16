import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { lockExists, writeLock } from '@/lib/install-status';

export const dynamic = 'force-dynamic';

export async function POST() {
  if (lockExists()) {
    return NextResponse.json({ error: 'already_installed' }, { status: 409 });
  }
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } }).catch(() => 0);
  if (adminCount === 0) {
    return NextResponse.json({ error: 'no_admin', hint: 'Crea prima un utente admin.' }, { status: 400 });
  }
  const site = await prisma.site.findFirst().catch(() => null);
  if (!site) {
    return NextResponse.json({ error: 'no_site', hint: 'Configura prima il sito.' }, { status: 400 });
  }
  writeLock({ admins: adminCount, siteId: site.id });
  return NextResponse.json({ ok: true });
}
