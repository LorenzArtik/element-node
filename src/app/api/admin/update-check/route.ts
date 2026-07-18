import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ApiError, handleApiError } from '@/lib/api-error';
import { getLicenseInfo } from '@/lib/license-client';
import pkg from '../../../../../package.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SOURCE = 'https://raw.githubusercontent.com/LorenzArtik/element-node/main/package.json';

/** Controllo aggiornamenti: disponibile solo con licenza valida. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);

    const license = await getLicenseInfo();
    const current = (pkg as { version?: string }).version || '0.0.0';
    if (!license.valid) {
      return NextResponse.json({ current, latest: null, updateAvailable: false, licensed: false, reason: license.reason });
    }

    let latest: string | null = null;
    try {
      const res = await fetch(SOURCE, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
      if (res.ok) latest = ((await res.json()) as { version?: string }).version ?? null;
    } catch {
      /* rete assente */
    }

    const cmp = (a: string, b: string) => {
      const pa = a.split('.').map(Number);
      const pb = b.split('.').map(Number);
      for (let i = 0; i < 3; i++) {
        if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
      }
      return 0;
    };
    const updateAvailable = !!latest && cmp(latest, current) > 0;
    return NextResponse.json({ current, latest, updateAvailable, licensed: true, plan: license.plan });
  } catch (e) {
    return handleApiError(e);
  }
}
