'use client';

import { useEffect, useState } from 'react';

type Cfg = { enabled: boolean; target: string; ftpHost: string };
type Result = { ok: boolean; log?: string; error?: string };

export default function PublishPage() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    fetch('/api/admin/static-publish')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCfg(d))
      .catch(() => setCfg({ enabled: false, target: '', ftpHost: '' }));
  }, []);

  async function publish() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/static-publish', { method: 'POST' });
      const json = await res.json();
      setResult(json);
    } catch (e) {
      setResult({ ok: false, error: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Pubblica sito</h1>
      <p style={{ color: '#6b7280', margin: '0 0 20px' }}>
        Genera la versione statica del sito e la pubblica sul dominio pubblico. Le modifiche fatte nel
        CMS diventano visibili online solo dopo la pubblicazione.
      </p>

      {cfg && !cfg.enabled && (
        <div style={{ padding: 16, borderRadius: 8, background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
          La pubblicazione statica non è configurata su questa installazione.
        </div>
      )}

      {cfg && cfg.enabled && (
        <div style={{ padding: 20, borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff' }}>
          <div style={{ fontSize: 14, color: '#374151', marginBottom: 16 }}>
            Destinazione: <strong>{cfg.target || '—'}</strong>
          </div>
          <button
            onClick={publish}
            disabled={loading}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 20px',
              borderRadius: 10, border: 'none', cursor: loading ? 'default' : 'pointer',
              background: loading ? '#9ca3af' : '#239B73', color: '#fff', fontWeight: 600, fontSize: 15,
            }}
          >
            {loading ? 'Pubblicazione in corso…' : 'Pubblica ora'}
          </button>
          {loading && (
            <div style={{ marginTop: 12, fontSize: 13, color: '#6b7280' }}>
              Sto generando e caricando le pagine… (di solito meno di un minuto).
            </div>
          )}

          {result && (
            <div style={{ marginTop: 20 }}>
              <div
                style={{
                  padding: 12, borderRadius: 8, fontWeight: 600,
                  background: result.ok ? '#DCFCE7' : '#FEE2E2',
                  color: result.ok ? '#166534' : '#991B1B',
                }}
              >
                {result.ok ? '✔ Sito pubblicato con successo.' : `✖ Errore: ${result.error || 'sconosciuto'}`}
              </div>
              {result.log && (
                <pre
                  style={{
                    marginTop: 12, padding: 12, borderRadius: 8, background: '#0b1020', color: '#d1d5db',
                    fontSize: 12, lineHeight: 1.5, overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: 320,
                  }}
                >
                  {result.log}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
