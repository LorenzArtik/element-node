import { NextResponse } from 'next/server';
import { lockExists } from '@/lib/install-status';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const lock = lockExists();
  let dbOk = false;
  let adminCount = 0;
  let siteOk = false;
  if (process.env.DATABASE_URL) {
    try {
      await prisma.$queryRawUnsafe('SELECT 1');
      dbOk = true;
      adminCount = await prisma.user.count({ where: { role: 'ADMIN' } }).catch(() => 0);
      siteOk = !!(await prisma.site.findFirst().catch(() => null));
    } catch {
      dbOk = false;
    }
  }
  return NextResponse.json({
    locked: lock,
    dbConfigured: !!process.env.DATABASE_URL,
    dbOk,
    adminExists: adminCount > 0,
    siteExists: siteOk,
    authSecretSet: !!process.env.AUTH_SECRET,
  });
}
