import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getSiteSettings, updateSiteSettings } from '@/lib/site-settings';
import { themeSchema } from '@/lib/theme';
import { ApiError, handleApiError } from '@/lib/api-error';
import { assertCan } from '@/lib/permissions';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'site.settings.read');
    const data = await getSiteSettings();
    return NextResponse.json(data);
  } catch (e) {
    return handleApiError(e);
  }
}

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  tagline: z.string().max(255).nullable().optional(),
  logoLight: z.string().url().nullable().optional().or(z.string().startsWith('/').nullable().optional()),
  logoDark: z.string().url().nullable().optional().or(z.string().startsWith('/').nullable().optional()),
  favicon: z.string().nullable().optional(),
  theme: themeSchema.optional(),
  customCss: z.string().max(50_000).nullable().optional(),
  headScripts: z.string().max(50_000).nullable().optional(),
  bodyScripts: z.string().max(50_000).nullable().optional(),
  defaultLocale: z.string().min(2).max(8).optional(),
  maintenance: z.boolean().optional(),
  maintenanceMessage: z.string().max(2_000).nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'site.settings.write');

    const body = patchSchema.parse(await req.json());
    const before = await getSiteSettings();
    const after = await updateSiteSettings(body);

    await logAudit({
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: 'site.settings.update',
      entity: 'Site',
      entityId: '1',
      before,
      after,
      ip: req.headers.get('x-forwarded-for'),
      ua: req.headers.get('user-agent'),
    });

    return NextResponse.json(after);
  } catch (e) {
    return handleApiError(e);
  }
}
