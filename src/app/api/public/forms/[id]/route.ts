import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Endpoint pubblico: ritorna fields + settings utili al rendering del form.
 * Non espone actions, recipients, apiKey, ecc.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await prisma.form.findUnique({ where: { id } });
  if (!form || form.status !== 'ACTIVE') return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const settings = (form.settings as Record<string, unknown>) ?? {};
  return NextResponse.json({
    id: form.id,
    name: form.name,
    fields: form.fields,
    settings: {
      submitText: settings.submitText ?? 'Invia',
      successMessage: settings.successMessage ?? 'Grazie!',
      errorMessage: settings.errorMessage ?? 'Errore.',
      gdprText: settings.gdprText ?? null,
      captcha: settings.captcha ?? 'honeypot',
      recaptchaSiteKey: settings.recaptchaSiteKey ?? null,
    },
  });
}
