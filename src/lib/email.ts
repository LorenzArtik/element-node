/**
 * Email sender pluggable. Provider supportati:
 *   - 'console'  → log su stderr (default per sviluppo, sempre OK)
 *   - 'smtp'     → nodemailer (richiede npm i nodemailer)
 *   - 'brevo'    → Brevo (ex Sendinblue) transactional API REST
 *
 * Selezione del provider:
 *   1. Site Settings → integrations.emailProvider (esplicito)
 *   2. Auto-detect: brevo se apiKey presente, smtp se SMTP_HOST/host configurato, altrimenti console
 *
 * Configurazione:
 *   - SMTP via Site Settings → integrations.smtp oppure .env SMTP_*
 *   - Brevo via Site Settings → integrations.brevo (apiKey/fromEmail/fromName)
 */

import { getSiteSettings, type SiteSettings } from './site-settings';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface EmailResult {
  ok: boolean;
  mode: 'console' | 'smtp' | 'brevo';
  error?: string;
}

let smtpTransporter: unknown = null;

async function getSmtpTransporter(siteSmtp: SiteSettings['integrations']['smtp']) {
  if (smtpTransporter !== null) return smtpTransporter;
  const host = siteSmtp.host || process.env.SMTP_HOST || '';
  if (!host) { smtpTransporter = false; return smtpTransporter; }
  try {
    const req = eval('require') as NodeRequire;
    const nodemailer = req('nodemailer');
    smtpTransporter = nodemailer.createTransport({
      host,
      port: Number(siteSmtp.port || process.env.SMTP_PORT || 587),
      secure: siteSmtp.secure || process.env.SMTP_SECURE === 'true',
      auth: (siteSmtp.user || process.env.SMTP_USER)
        ? { user: siteSmtp.user || process.env.SMTP_USER, pass: siteSmtp.pass || process.env.SMTP_PASS }
        : undefined,
    });
    return smtpTransporter;
  } catch (e) {
    console.warn('[email] SMTP init failed (nodemailer non installato?):', (e as Error).message);
    smtpTransporter = false;
    return smtpTransporter;
  }
}

async function resolveProvider(): Promise<{ provider: 'console' | 'smtp' | 'brevo'; site: SiteSettings | null }> {
  let site: SiteSettings | null = null;
  try {
    site = await getSiteSettings();
  } catch {}

  // Esplicito da settings
  if (site?.integrations.emailProvider && site.integrations.emailProvider !== 'console') {
    return { provider: site.integrations.emailProvider, site };
  }

  // Auto-detect: brevo se ha apikey, smtp se ha host, altrimenti console
  if (site?.integrations.brevo.apiKey) return { provider: 'brevo', site };
  if (site?.integrations.smtp.host || process.env.SMTP_HOST) return { provider: 'smtp', site };

  return { provider: 'console', site };
}

async function sendViaConsole(msg: EmailMessage): Promise<EmailResult> {
  const text = msg.text ?? msg.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📧 [console-mode] To: ${msg.to}`);
  console.log(`📧 [console-mode] Subject: ${msg.subject}`);
  console.log(`📧 [console-mode] Body:\n${text}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return { ok: true, mode: 'console' };
}

async function sendViaSmtp(msg: EmailMessage, site: SiteSettings | null): Promise<EmailResult> {
  const t = await getSmtpTransporter(site?.integrations.smtp ?? { host: '', port: '', user: '', pass: '', from: '', secure: false });
  if (!t) return sendViaConsole(msg);
  const from = site?.integrations.smtp.from || process.env.SMTP_FROM || `"${site?.name ?? 'Element Node'}" <noreply@example.com>`;
  try {
    await (t as { sendMail: (o: unknown) => Promise<unknown> }).sendMail({
      from, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text,
      replyTo: msg.replyTo,
    });
    return { ok: true, mode: 'smtp' };
  } catch (e) {
    return { ok: false, mode: 'smtp', error: (e as Error).message };
  }
}

async function sendViaBrevo(msg: EmailMessage, site: SiteSettings | null): Promise<EmailResult> {
  const cfg = site?.integrations.brevo;
  if (!cfg?.apiKey) {
    return { ok: false, mode: 'brevo', error: 'Brevo apiKey mancante' };
  }
  const fromEmail = cfg.fromEmail || 'noreply@example.com';
  const fromName = cfg.fromName || site?.name || 'Element Node';
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': cfg.apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: fromName },
        to: [{ email: msg.to }],
        subject: msg.subject,
        htmlContent: msg.html,
        textContent: msg.text,
        replyTo: msg.replyTo ? { email: msg.replyTo } : undefined,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { ok: false, mode: 'brevo', error: `HTTP ${res.status}: ${err.slice(0, 200)}` };
    }
    return { ok: true, mode: 'brevo' };
  } catch (e) {
    return { ok: false, mode: 'brevo', error: (e as Error).message };
  }
}

export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const { provider, site } = await resolveProvider();
  if (provider === 'brevo') return sendViaBrevo(msg, site);
  if (provider === 'smtp') return sendViaSmtp(msg, site);
  return sendViaConsole(msg);
}

/**
 * Verifica configurazione del provider email corrente.
 * Usato dall'health endpoint.
 */
export async function probeEmailProvider(): Promise<{ provider: 'console' | 'smtp' | 'brevo'; configured: boolean; details?: string }> {
  const { provider, site } = await resolveProvider();
  if (provider === 'console') {
    return { provider: 'console', configured: true, details: 'modalità sviluppo (log)' };
  }
  if (provider === 'smtp') {
    const host = site?.integrations.smtp.host || process.env.SMTP_HOST;
    return { provider: 'smtp', configured: !!host, details: host ? `host=${host}` : 'host mancante' };
  }
  if (provider === 'brevo') {
    const cfg = site?.integrations.brevo;
    return {
      provider: 'brevo',
      configured: !!cfg?.apiKey,
      details: cfg?.apiKey ? `from=${cfg.fromEmail || '?'}` : 'apiKey mancante',
    };
  }
  return { provider, configured: false };
}

export function emailLayout(siteName: string, title: string, body: string, ctaUrl?: string, ctaText?: string): string {
  const cta = ctaUrl && ctaText
    ? `<p style="text-align:center;margin:30px 0"><a href="${ctaUrl}" style="display:inline-block;padding:14px 28px;background:#92003b;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">${ctaText}</a></p>
       <p style="font-size:12px;color:#94a3b8;text-align:center">Se il pulsante non funziona, copia e incolla questo link:<br><span style="word-break:break-all">${ctaUrl}</span></p>`
    : '';
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:40px 20px">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
      <tr><td style="padding:32px 32px 0">
        <h1 style="margin:0;font-size:24px;color:#0f172a">${title}</h1>
      </td></tr>
      <tr><td style="padding:24px 32px;color:#334155;font-size:16px;line-height:1.6">
        ${body}
        ${cta}
      </td></tr>
      <tr><td style="padding:0 32px 32px;border-top:1px solid #e5e7eb;font-size:12px;color:#94a3b8;text-align:center;padding-top:24px">
        Inviato da ${siteName}
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}
