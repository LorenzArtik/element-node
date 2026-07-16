import { getSiteSettings } from './site-settings';
import type { RecaptchaScope } from './theme';

export interface RecaptchaConfig {
  enabled: boolean;
  siteKey: string;
}

/**
 * Configurazione client per uno scope (forms/login/register/forgot-password).
 * Ritorna `enabled: false` se non c'è chiave o lo scope non è abilitato.
 */
export async function getRecaptchaConfigFor(scope: RecaptchaScope): Promise<RecaptchaConfig> {
  try {
    const s = await getSiteSettings();
    const r = s.integrations.recaptcha;
    if (!r.siteKey || !r.enableOn.includes(scope)) return { enabled: false, siteKey: '' };
    return { enabled: true, siteKey: r.siteKey };
  } catch {
    return { enabled: false, siteKey: '' };
  }
}

/**
 * Verifica server-side del token. Ritorna { ok, score?, error? }.
 * Se reCAPTCHA non è configurato o non abilitato per lo scope: ritorna ok=true (skip silente).
 */
export async function verifyRecaptcha(token: string | undefined, scope: RecaptchaScope): Promise<{ ok: boolean; score?: number; error?: string }> {
  let secret = '';
  let threshold = 0.5;
  try {
    const s = await getSiteSettings();
    const r = s.integrations.recaptcha;
    if (!r.secretKey || !r.enableOn.includes(scope)) {
      return { ok: true }; // disabilitato per questo scope
    }
    secret = r.secretKey;
    threshold = r.threshold;
  } catch {
    return { ok: true };
  }
  if (!token) return { ok: false, error: 'recaptcha_token_missing' };

  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = await res.json() as { success: boolean; score?: number; 'error-codes'?: string[] };
    if (!data.success) return { ok: false, error: (data['error-codes'] ?? []).join(',') || 'recaptcha_failed' };
    if (typeof data.score === 'number' && data.score < threshold) {
      return { ok: false, score: data.score, error: 'low_score' };
    }
    return { ok: true, score: data.score };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
