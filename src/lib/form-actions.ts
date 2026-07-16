import { sendEmail, emailLayout } from './email';
import { getSiteSettings } from './site-settings';
import type { FormAction } from './forms';
import { interpolateTemplate } from './forms';

export interface ActionLogEntry {
  type: string;
  ok: boolean;
  error?: string;
  durationMs: number;
}

interface RunActionsContext {
  formName: string;
  data: Record<string, unknown>;
  recipientFallback?: string | null;
}

export async function runActions(actions: FormAction[], ctx: RunActionsContext): Promise<{ log: ActionLogEntry[]; redirectUrl?: string }> {
  const log: ActionLogEntry[] = [];
  let redirectUrl: string | undefined;
  const site = await getSiteSettings().catch(() => null);
  const siteName = site?.name ?? 'Element Node';

  // Se non ci sono actions ma c'è recipientFallback, manda mail base
  const effectiveActions = actions.length > 0 ? actions : (
    ctx.recipientFallback ? [{ type: 'email' as const, to: ctx.recipientFallback, subject: `Submission da ${ctx.formName}`, template: undefined, cc: undefined, replyToField: undefined } as FormAction] : []
  );

  for (const a of effectiveActions) {
    const start = Date.now();
    try {
      if (a.type === 'email') {
        const subject = interpolateTemplate(a.subject || `Submission da {form}`, ctx.data, ctx.formName);
        const tpl = a.template ?? buildDefaultEmailBody(ctx.data);
        const html = emailLayout(siteName, `Nuova submission: ${ctx.formName}`, interpolateTemplate(tpl, ctx.data, ctx.formName));
        const res = await sendEmail({ to: a.to, subject, html });
        if (!res.ok) throw new Error(res.error ?? 'send fallito');
        log.push({ type: 'email', ok: true, durationMs: Date.now() - start });
      } else if (a.type === 'autoresponder') {
        const to = String(ctx.data[a.toField] ?? '');
        if (!to) throw new Error(`Campo "${a.toField}" mancante per autoresponder`);
        const subject = interpolateTemplate(a.subject, ctx.data, ctx.formName);
        const body = interpolateTemplate(a.body, ctx.data, ctx.formName);
        const html = emailLayout(siteName, subject, body.split('\n').map((l) => `<p>${escapeHtml(l)}</p>`).join(''));
        const res = await sendEmail({ to, subject, html });
        if (!res.ok) throw new Error(res.error ?? 'send fallito');
        log.push({ type: 'autoresponder', ok: true, durationMs: Date.now() - start });
      } else if (a.type === 'webhook') {
        const res = await fetch(a.url, {
          method: a.method,
          headers: { 'content-type': 'application/json', ...(a.headers ?? {}) },
          body: JSON.stringify({ form: ctx.formName, data: ctx.data, timestamp: new Date().toISOString() }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        log.push({ type: 'webhook', ok: true, durationMs: Date.now() - start });
      } else if (a.type === 'mailchimp') {
        const email = String(ctx.data[a.emailField] ?? '');
        if (!email) throw new Error(`Campo "${a.emailField}" mancante`);
        const dc = a.apiKey.split('-').pop();
        const url = `https://${dc}.api.mailchimp.com/3.0/lists/${a.listId}/members`;
        const merge: Record<string, string> = {};
        if (a.nameField && ctx.data[a.nameField]) merge.FNAME = String(ctx.data[a.nameField]);
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'authorization': `Basic ${Buffer.from(`anystring:${a.apiKey}`).toString('base64')}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ email_address: email, status: 'subscribed', merge_fields: merge }),
        });
        if (!res.ok) throw new Error(`Mailchimp HTTP ${res.status}`);
        log.push({ type: 'mailchimp', ok: true, durationMs: Date.now() - start });
      } else if (a.type === 'redirect') {
        redirectUrl = a.url;
        log.push({ type: 'redirect', ok: true, durationMs: Date.now() - start });
      } else if (a.type === 'db-only') {
        log.push({ type: 'db-only', ok: true, durationMs: Date.now() - start });
      }
    } catch (err) {
      log.push({ type: a.type, ok: false, error: (err as Error).message, durationMs: Date.now() - start });
    }
  }

  return { log, redirectUrl };
}

function buildDefaultEmailBody(data: Record<string, unknown>): string {
  return Object.entries(data)
    .filter(([k]) => !k.startsWith('_') && k !== 'honeypot')
    .map(([k, v]) => `<p><strong>${escapeHtml(k)}:</strong> ${escapeHtml(Array.isArray(v) ? v.join(', ') : String(v ?? ''))}</p>`)
    .join('');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
