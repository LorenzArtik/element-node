import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { ApiError, handleApiError } from '@/lib/api-error';
import { getLicenseInfo } from '@/lib/license-client';
import { tierForPlan } from '@/lib/license-features';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Tier licenza corrente per il gate widget nell'editor. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);

    const license = await getLicenseInfo();
    return NextResponse.json({ tier: tierForPlan(license.plan, license.valid), plan: license.plan });
  } catch (e) {
    return handleApiError(e);
  }
}
