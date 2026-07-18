'use client';

import { useEffect, useState } from 'react';

/**
 * Banner cookie nativo. Stato in localStorage ('en-cookie-consent': 'accepted'|'declined');
 * al cambio emette l'evento 'en-consent-changed' che sblocca gli embed con consentGate.
 */
export interface CookieBannerSettings {
  enabled: boolean;
  title: string;
  message: string;
  acceptLabel: string;
  declineLabel: string;
  policyUrl: string;
  cookiePolicyUrl?: string;
  titleEn?: string;
  messageEn?: string;
  acceptLabelEn?: string;
  declineLabelEn?: string;
  policyUrlEn?: string;
  cookiePolicyUrlEn?: string;
  position: 'bottom-bar' | 'bottom-left' | 'bottom-right';
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
  radius?: string;
}

export const CONSENT_KEY = 'en-cookie-consent';

export function getConsent(): string | null {
  try { return localStorage.getItem(CONSENT_KEY); } catch { return null; }
}

export function setConsent(value: 'accepted' | 'declined') {
  try { localStorage.setItem(CONSENT_KEY, value); } catch { /* storage bloccato */ }
  window.dispatchEvent(new CustomEvent('en-consent-changed', { detail: value }));
}

export function CookieBanner({ settings, path }: { settings: CookieBannerSettings; path: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (settings.enabled && !getConsent()) setVisible(true);
  }, [settings.enabled]);

  if (!visible) return null;

  const en = path === '/en' || path.startsWith('/en/');
  const t = {
    title: (en && settings.titleEn) || settings.title,
    message: (en && settings.messageEn) || settings.message,
    accept: (en && settings.acceptLabelEn) || settings.acceptLabel,
    decline: (en && settings.declineLabelEn) || settings.declineLabel,
    policy: (en && settings.policyUrlEn) || settings.policyUrl,
    cookiePolicy: (en && settings.cookiePolicyUrlEn) || settings.cookiePolicyUrl || '',
  };

  const choose = (v: 'accepted' | 'declined') => {
    setConsent(v);
    setVisible(false);
  };

  const isBar = settings.position === 'bottom-bar';
  const wrapStyle: React.CSSProperties = {
    position: 'fixed', zIndex: 9999, bottom: 16,
    ...(isBar
      ? { left: 16, right: 16 }
      : settings.position === 'bottom-left'
        ? { left: 16, maxWidth: 420 }
        : { right: 16, maxWidth: 420 }),
  };

  return (
    <div style={wrapStyle} role="dialog" aria-live="polite" aria-label={t.title}>
      <div style={{
        background: settings.bgColor || 'var(--en-color-surface, #fff)',
        color: settings.textColor || 'var(--en-color-text, #1b1b1b)',
        border: '1px solid var(--en-color-border, #e5e7eb)',
        borderRadius: settings.radius || 14,
        boxShadow: '0 18px 50px -18px rgba(0,0,0,.35)',
        padding: '18px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 14,
        fontSize: 14,
        lineHeight: 1.5,
      }}>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <strong style={{ fontFamily: 'var(--en-font-heading)', display: 'block', marginBottom: 2 }}>{t.title}</strong>
          <span>
            {t.message}{' '}
            {t.policy && (
              <a href={t.policy} style={{ color: settings.accentColor || 'var(--en-color-primary)', textDecoration: 'underline' }}>
                Privacy
              </a>
            )}
            {t.cookiePolicy && (
              <>
                {' · '}
                <a href={t.cookiePolicy} style={{ color: settings.accentColor || 'var(--en-color-primary)', textDecoration: 'underline' }}>
                  Cookie Policy
                </a>
              </>
            )}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => choose('declined')}
            style={{
              border: '1px solid var(--en-color-border, #e5e7eb)', background: 'transparent',
              color: 'inherit', borderRadius: 10, padding: '9px 16px', fontSize: 14, cursor: 'pointer',
            }}
          >
            {t.decline}
          </button>
          <button
            onClick={() => choose('accepted')}
            style={{
              border: 0, background: settings.accentColor || 'var(--en-color-primary, #92003b)', color: '#fff',
              borderRadius: 10, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {t.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
