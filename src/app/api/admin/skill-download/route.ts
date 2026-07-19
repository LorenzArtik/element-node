import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSiteSettings } from '@/lib/site-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LICENSE_SERVER = process.env.LICENSE_SERVER_URL || 'https://elementnode.cloud';

/**
 * Scarica (o ri-scarica: è sempre l'ultima versione) la skill AI per
 * Claude Code / coding agent. Proxy verso il license server: la chiave
 * di licenza resta lato server e non passa mai dal browser.
 *
 * GET            → stream dello zip
 * GET ?check=1   → info ultima versione disponibile { version, updated }
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  if (req.nextUrl.searchParams.get('check')) {
    try {
      const res = await fetch(`${LICENSE_SERVER}/api/skill/version`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return NextResponse.json(await res.json());
    } catch {
      return NextResponse.json({ version: null }, { status: 200 });
    }
  }

  const site = await getSiteSettings().catch(() => null);
  const key = (site?.integrations.licenseKey || '').trim();
  if (!key) {
    return NextResponse.json(
      { error: 'Nessuna chiave di licenza configurata. Inseriscila qui sopra e salva.' },
      { status: 403 }
    );
  }

  try {
    const res = await fetch(
      `${LICENSE_SERVER}/api/skill/download?key=${encodeURIComponent(key)}`,
      { cache: 'no-store', signal: AbortSignal.timeout(30_000) }
    );
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      return NextResponse.json(
        { error: j.message || `Download non riuscito (HTTP ${res.status})` },
        { status: res.status === 403 ? 403 : 502 }
      );
    }
    const zip = await res.arrayBuffer();
    return new NextResponse(zip, {
      headers: {
        'content-type': 'application/zip',
        'content-disposition': 'attachment; filename="element-node-builder-skill.zip"',
        'cache-control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'License server non raggiungibile. Riprova tra poco.' }, { status: 502 });
  }
}
