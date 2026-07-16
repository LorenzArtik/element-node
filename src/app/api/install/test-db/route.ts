import { NextResponse } from 'next/server';
import { lockExists } from '@/lib/install-status';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  if (lockExists()) {
    return NextResponse.json({ error: 'already_installed' }, { status: 409 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: 'missing_database_url',
      hint: 'Imposta DATABASE_URL nelle variabili ambiente di Plesk e riavvia.' }, { status: 400 });
  }
  try {
    const r = await prisma.$queryRawUnsafe<Array<{ v: number }>>('SELECT 1 as v');
    return NextResponse.json({ ok: true, ping: r?.[0]?.v ?? null,
      url: process.env.DATABASE_URL!.replace(/:[^:@/]+@/, ':***@') });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: 'connection_failed',
      message: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
