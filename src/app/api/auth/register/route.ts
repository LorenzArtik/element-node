import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { ApiError, handleApiError } from '@/lib/api-error';
import { createEmailToken } from '@/lib/email-tokens';
import { sendEmail, emailLayout } from '@/lib/email';
import { getSiteSettings } from '@/lib/site-settings';
import { verifyRecaptcha } from '@/lib/recaptcha';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(120).optional(),
  recaptchaToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // TODO: aggiungere flag in Site settings per abilitare/disabilitare registrazione pubblica
    const parsed = schema.parse(await req.json());
    const captcha = await verifyRecaptcha(parsed.recaptchaToken, 'register');
    if (!captcha.ok) throw new ApiError('captcha_failed', 'Verifica anti-bot fallita', 400);
    const { email, password, name } = parsed;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw new ApiError('email_exists', 'Email già registrata', 409);
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name: name ?? null, passwordHash, role: 'SUBSCRIBER' },
    });
    // Email di verifica
    const token = await createEmailToken(user.id, 'VERIFY');
    const site = await getSiteSettings();
    const url = `${process.env.AUTH_URL || 'http://localhost:3000'}/verify-email/${token}`;
    await sendEmail({
      to: email,
      subject: `Benvenuto su ${site.name}`,
      html: emailLayout(site.name, `Benvenuto, ${name ?? email}!`,
        `<p>Conferma la tua email cliccando sul pulsante per attivare il tuo account.</p>`,
        url, 'Verifica email'),
    });
    return NextResponse.json({ ok: true, userId: user.id });
  } catch (e) {
    return handleApiError(e);
  }
}
