'use client';

import { useState } from 'react';

/** Schermata password per sito in costruzione (bypass: admin loggati). */
export function LockScreen({ siteName, title, message }: { siteName: string; title: string; message: string }) {
  const [pw, setPw] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending');
    try {
      const res = await fetch('/api/site-access', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) window.location.reload();
      else setState('error');
    } catch {
      setState('error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--en-color-background, #f6f6f5)', padding: 24,
                  fontFamily: 'var(--en-font-body, system-ui)' }}>
      <div style={{ maxWidth: 420, width: '100%', background: 'var(--en-color-surface, #fff)',
                    border: '1px solid var(--en-color-border, #e5e7eb)', borderRadius: 18,
                    padding: '40px 36px', textAlign: 'center',
                    boxShadow: '0 24px 60px -30px rgba(0,0,0,.25)' }}>
        <div style={{ width: 52, height: 52, margin: '0 auto 18px', borderRadius: 14,
                      background: 'var(--en-color-primary, #92003b)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <p style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase',
                    color: 'var(--en-color-text-muted, #6b7280)', margin: '0 0 6px' }}>{siteName}</p>
        <h1 style={{ fontFamily: 'var(--en-font-heading)', fontSize: 24, margin: '0 0 10px',
                     color: 'var(--en-color-text, #111)' }}>{title}</h1>
        <p style={{ fontSize: 14.5, color: 'var(--en-color-text-muted, #6b7280)', margin: '0 0 22px', lineHeight: 1.6 }}>{message}</p>
        <form onSubmit={submit} style={{ display: 'flex', gap: 8 }}>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" autoFocus
                 style={{ flex: 1, height: 44, borderRadius: 10, border: '1px solid var(--en-color-border, #d1d5db)',
                          padding: '0 14px', fontSize: 15 }} />
          <button type="submit" disabled={state === 'sending'}
                  style={{ height: 44, padding: '0 20px', borderRadius: 10, border: 0, cursor: 'pointer',
                           background: 'var(--en-color-primary, #92003b)', color: '#fff', fontWeight: 600, fontSize: 15 }}>
            Entra
          </button>
        </form>
        {state === 'error' && <p style={{ color: '#dc2626', fontSize: 13, margin: '12px 0 0' }}>Password errata.</p>}
      </div>
    </div>
  );
}
