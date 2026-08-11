import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getSiteSettings } from '@/lib/site-settings';
import { getLicenseInfo } from '@/lib/license-client';
import { tierForPlan } from '@/lib/license-features';
import { ApiError, handleApiError } from '@/lib/api-error';
import { assertCan } from '@/lib/permissions';
import { revalidateContent, CACHE_TAGS } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Stato licenza completo + tier, per la pagina /admin/license. */
async function currentInfo() {
  const info = await getLicenseInfo();
  return { ...info, tier: tierForPlan(info.plan, info.valid) };
}

/**
 * Salva la chiave e azzera la cache (checkedAt vuoto) così il prossimo
 * getLicenseInfo() rivalida subito contro il license server. Scrive
 * direttamente su Site.integrations preservando gli altri campi
 * (stessa strategia di license-client).
 */
async function saveKeyAndBustCache(key: string) {
  const row = await prisma.site.findUnique({ where: { id: 1 } });
  const integrations = {
    ...((row?.integrations as Record<string, unknown>) ?? {}),
    licenseKey: key,
    licenseCache: { valid: false, plan: '', reason: '', checkedAt: '', currentPeriodEnd: null },
  };
  await prisma.site.update({ where: { id: 1 }, data: { integrations: integrations as never } });
  revalidateContent(CACHE_TAGS.site);
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'site.settings.read');
    return NextResponse.json(await currentInfo());
  } catch (e) {
    return handleApiError(e);
  }
}

const bodySchema = z.object({
  action: z.enum(['set', 'remove', 'recheck']),
  key: z.string().trim().max(200).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'site.settings.write');

    const { action, key } = bodySchema.parse(await req.json());
    if (action === 'set') {
      await saveKeyAndBustCache((key || '').trim());
    } else if (action === 'remove') {
      await saveKeyAndBustCache('');
    } else {
      const site = await getSiteSettings();
      await saveKeyAndBustCache((site.integrations.licenseKey || '').trim());
    }
    // getLicenseInfo() con cache azzerata → validazione fresca
    return NextResponse.json(await currentInfo());
  } catch (e) {
    return handleApiError(e);
  }
}
