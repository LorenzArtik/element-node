import { NextResponse } from 'next/server';
import { getSiteSettings } from '@/lib/site-settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getSiteSettings();
  return NextResponse.json({ theme: s.theme });
}
