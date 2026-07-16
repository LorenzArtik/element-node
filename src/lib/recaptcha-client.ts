'use client';

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
    __EN_RECAPTCHA_KEY__?: string;
  }
}

/**
 * Esegue reCAPTCHA v3 (se caricato) e ritorna il token.
 * Se non disponibile, ritorna stringa vuota (verifyRecaptcha lato server gestisce il fallback).
 */
export async function executeRecaptcha(action: string): Promise<string> {
  if (typeof window === 'undefined') return '';
  const siteKey = window.__EN_RECAPTCHA_KEY__;
  if (!siteKey || !window.grecaptcha) return '';
  return new Promise<string>((resolve) => {
    window.grecaptcha!.ready(async () => {
      try {
        const token = await window.grecaptcha!.execute(siteKey, { action });
        resolve(token);
      } catch {
        resolve('');
      }
    });
  });
}
