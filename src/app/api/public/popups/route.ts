import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { resolveActivePopups } from '@/lib/popups';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Endpoint pubblico chiamato dal client al mount per ottenere i popup attivi
 * per il path corrente. Non richiede autenticazione.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.searchParams.get('path') || '/';
  const isHomepage = path === '/';
  const session = await auth().catch(() => null);
  const userRole = session?.user?.role ?? null;

  const popups = await resolveActivePopups({
    path, isHomepage,
    pageSlug: isHomepage ? undefined : path.replace(/^\//, '').split('/')[0],
    userRole,
  });

  return NextResponse.json({
    items: popups.map((p) => ({
      id: p.id,
      name: p.name,
      content: p.content,
      trigger: p.trigger,
      settings: p.settings,
    })),
  });
}
