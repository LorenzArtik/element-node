import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handleApiError } from '@/lib/api-error';
import { createEmailToken } from '@/lib/email-tokens';
import { sendEmail, emailLayout } from '@/lib/email';
import { getSiteSettings } from '@/lib/site-settings';
import { verifyRecaptcha } from '@/lib/recaptcha';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ email: z.string().email(), recaptchaToken: z.string().optional() });

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const captcha = await verifyRecaptcha(body.recaptchaToken, 'forgot-password');
    if (!captcha.ok) return NextResponse.json({ ok: true }); // silent fail anti-enum
    const { email } = body;
    const user = await prisma.user.findUnique({ where: { email } });
    // Risposta sempre OK per non rivelare se l'email esiste (anti-enum)
    if (user && !user.locked) {
      const token = await createEmailToken(user.id, 'RESET');
      const site = await getSiteSettings();
      const url = `${process.env.AUTH_URL || 'http://localhost:3000'}/reset-password/${token}`;
      await sendEmail({
        to: email,
        subject: `Reset password — ${site.name}`,
        html: emailLayout(site.name, 'Reimposta la tua password',
          `<p>Hai richiesto di reimpostare la password per ${email}. Il link scade in un'ora.</p>`,
          url, 'Reimposta password'),
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
