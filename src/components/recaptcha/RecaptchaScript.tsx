/**
 * Server component: inietta lo script reCAPTCHA v3 SE configurato per uno o più scope.
 * Uso tipico:
 *   <RecaptchaScript scopes={['forms','login','register','forgot-password']} />
 *
 * Carica lo script una sola volta se ALMENO uno scope è abilitato.
 * Il client component executeRecaptcha() leggerà __EN_RECAPTCHA_KEY__ globale.
 */
import { getSiteSettings } from '@/lib/site-settings';
import type { RecaptchaScope } from '@/lib/theme';

export async function RecaptchaScript({ scope, scopes }: { scope?: RecaptchaScope; scopes?: RecaptchaScope[] }) {
  const all = scopes ?? (scope ? [scope] : []);
  if (all.length === 0) return null;
  try {
    const s = await getSiteSettings();
    const r = s.integrations.recaptcha;
    const enabled = !!r.siteKey && all.some((sc) => r.enableOn.includes(sc));
    if (!enabled) return null;
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src={`https://www.google.com/recaptcha/api.js?render=${r.siteKey}`} async defer />
        <script
          id="en-recaptcha-config"
          dangerouslySetInnerHTML={{ __html: `window.__EN_RECAPTCHA_KEY__=${JSON.stringify(r.siteKey)};` }}
        />
      </>
    );
  } catch {
    return null;
  }
}
