import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSiteSettings } from '@/lib/site-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Dice all'editor se l'AI è utilizzabile (chiave Anthropic presente). */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  let configured = Boolean(process.env.ANTHROPIC_API_KEY);
  try {
    const s = await getSiteSettings();
    if (s.integrations.anthropicApiKey) configured = true;
  } catch {}
  return NextResponse.json({ configured });
}
