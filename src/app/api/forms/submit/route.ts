import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handleApiError, ApiError } from '@/lib/api-error';
import { formFieldSchema, formSettingsSchema, actionSchema, validateSubmission, type FormField, type FormSettings, type FormAction } from '@/lib/forms';
import { runActions } from '@/lib/form-actions';
import { rateLimit } from '@/lib/rate-limit';
import { verifyRecaptcha } from '@/lib/recaptcha';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  formId: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
  // Anti-bot honeypot field name (campo nascosto che deve restare vuoto)
  honeypot: z.string().optional(),
  recaptchaToken: z.string().optional(),
  recipient: z.string().optional(), // legacy fallback
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const ua = req.headers.get('user-agent') || '';

    const parsed = schema.parse(await req.json());

    // reCAPTCHA v3 (se abilitato per scope 'forms')
    const captcha = await verifyRecaptcha(parsed.recaptchaToken, 'forms');
    if (!captcha.ok) throw new ApiError('captcha_failed', 'Verifica anti-bot fallita', 400);

    // Honeypot: se compilato è bot
    if (parsed.honeypot && parsed.honeypot.trim() !== '') {
      // Salva come SPAM ma rispondi 200 per non rivelare al bot che è bloccato
      if (parsed.formId) {
        await prisma.formSubmission.create({
          data: {
            formId: parsed.formId,
            data: parsed.data as never,
            status: 'SPAM',
            ip, ua,
          },
        }).catch(() => {});
      }
      return NextResponse.json({ ok: true, message: 'Grazie!' });
    }

    // Carica form (se formId)
    let form: {
      id: string; name: string; fields: FormField[]; actions: FormAction[]; settings: FormSettings; recipients: string | null; status: string;
    } | null = null;
    if (parsed.formId) {
      const row = await prisma.form.findUnique({ where: { id: parsed.formId } });
      if (!row) throw new ApiError('not_found', 'Form non trovato', 404);
      if (row.status !== 'ACTIVE') throw new ApiError('inactive', 'Form non attivo', 403);
      form = {
        id: row.id, name: row.name,
        fields: z.array(formFieldSchema).safeParse(row.fields).data ?? [],
        actions: z.array(actionSchema).safeParse(row.actions).data ?? [],
        settings: formSettingsSchema.safeParse(row.settings).data ?? formSettingsSchema.parse({}),
        recipients: row.recipients,
        status: row.status,
      };
    }

    // Rate limit per IP+formId
    const rateKey = `form-submit:${ip}:${parsed.formId ?? 'inline'}`;
    const limit = form?.settings.rateLimitPerIp ?? 20;
    if (limit > 0) {
      const rl = rateLimit(rateKey, limit, 24 * 60 * 60 * 1000);
      if (!rl.allowed) throw new ApiError('rate_limit', 'Troppe submission. Riprova più tardi.', 429);
    }

    // Validation
    if (form) {
      const errors = validateSubmission(form.fields, parsed.data);
      if (Object.keys(errors).length > 0) {
        return NextResponse.json({ ok: false, errors }, { status: 422 });
      }
    }

    // Save submission
    let submission = null;
    if (form) {
      submission = await prisma.formSubmission.create({
        data: { formId: form.id, data: parsed.data as never, ip, ua },
      });
      await prisma.form.update({
        where: { id: form.id },
        data: { submissionCount: { increment: 1 } },
      }).catch(() => {});
    } else {
      // Legacy fallback (no formId): salva su default form
      const def = await prisma.form.findFirst({ where: { name: 'Default (legacy)' } })
        ?? await prisma.form.create({ data: { name: 'Default (legacy)', fields: [] as never } });
      submission = await prisma.formSubmission.create({
        data: { formId: def.id, data: parsed.data as never, ip, ua },
      });
    }

    // Run actions
    const { log, redirectUrl } = await runActions(form?.actions ?? [], {
      formName: form?.name ?? 'Form',
      data: parsed.data,
      recipientFallback: form?.recipients ?? parsed.recipient ?? null,
    });

    if (submission && log.length > 0) {
      await prisma.formSubmission.update({
        where: { id: submission.id },
        data: { actionLog: log as never },
      }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      message: form?.settings.successMessage ?? 'Grazie!',
      redirectUrl: redirectUrl ?? form?.settings.redirectUrl ?? null,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
