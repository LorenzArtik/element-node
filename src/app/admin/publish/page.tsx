'use client';

import { useEffect, useState } from 'react';

type SP = {
  enabled: boolean; targetUrl: string; ftpHost: string; ftpUser: string;
  ftpPass: string; ftpRemotePath: string; ftpSsl: boolean; mailTo: string;
};
const EMPTY: SP = { enabled: false, targetUrl: '', ftpHost: '', ftpUser: '', ftpPass: '', ftpRemotePath: '/', ftpSsl: false, mailTo: '' };

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', margin: '14px 0 4px' } as const;
const inputStyle = { width: '100%', maxWidth: 460, padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' } as const;

export default function PublishPage() {
  const [integrations, setIntegrations] = useState<Record<string, unknown> | null>(null);
  const [sp, setSp] = useState<SP>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; log?: string; error?: string } | null>(null);

  useEffect(() => {
    fetch('/api/settings/site')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setIntegrations(d.integrations || {});
        setSp({ ...EMPTY, ...(d.integrations?.staticPublish || {}) });
      })
      .catch(() => {});
  }, []);

  function upd<K extends keyof SP>(k: K, v: SP[K]) {
    setSp((s) => ({ ...s, [k]: v }));
    setSavedMsg('');
  }

  async function save() {
    if (!integrations) return;
    setSaving(true);
    setSavedMsg('');
    try {
      const res = await fetch('/api/settings/site', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ integrations: { ...integrations, staticPublish: sp } }),
      });
      if (res.ok) {
        const d = await res.json();
        setIntegrations(d.integrations);
        setSavedMsg('Configurazione salvata.');
      } else {
        setSavedMsg('Errore nel salvataggio.');
      }
    } catch {
      setSavedMsg('Errore nel salvataggio.');
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    setPublishing(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/static-publish', { method: 'POST' });
      setResult(await res.json());
    } catch (e) {
      setResult({ ok: false, error: (e as Error).message });
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Pubblica sito</h1>
      <p style={{ color: '#6b7280', margin: '0 0 20px' }}>
        Pubblica una copia statica del sito su un hosting FTP, tenendo questo CMS come sorgente. Le modifiche
        fatte qui diventano visibili online solo dopo la pubblicazione.
      </p>

      <div style={{ padding: 20, borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Configurazione hosting</h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 14, fontWeight: 600 }}>
          <input type="checkbox" checked={sp.enabled} onChange={(e) => upd('enabled', e.target.checked)} /> Pubblicazione statica attiva
        </label>

        <label style={labelStyle}>Dominio pubblico (target)</label>
        <input style={inputStyle} placeholder="https://iltuosito.it" value={sp.targetUrl} onChange={(e) => upd('targetUrl', e.target.value)} />

        <label style={labelStyle}>Host FTP</label>
        <input style={inputStyle} placeholder="ftp.iltuosito.it" value={sp.ftpHost} onChange={(e) => upd('ftpHost', e.target.value)} />

        <label style={labelStyle}>Utente FTP</label>
        <input style={inputStyle} value={sp.ftpUser} onChange={(e) => upd('ftpUser', e.target.value)} />

        <label style={labelStyle}>Password FTP</label>
        <input style={inputStyle} type="password" value={sp.ftpPass} onChange={(e) => upd('ftpPass', e.target.value)} />

        <label style={labelStyle}>Cartella remota (docroot)</label>
        <input style={inputStyle} placeholder="/" value={sp.ftpRemotePath} onChange={(e) => upd('ftpRemotePath', e.target.value)} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 14 }}>
          <input type="checkbox" checked={sp.ftpSsl} onChange={(e) => upd('ftpSsl', e.target.checked)} /> Usa FTPS/TLS (lascia spento per FTP semplice)
        </label>

        <label style={labelStyle}>Email destinataria dei form</label>
        <input style={inputStyle} type="email" placeholder="info@iltuosito.it" value={sp.mailTo} onChange={(e) => upd('mailTo', e.target.value)} />

        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={save} disabled={saving} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontWeight: 600, cursor: saving ? 'default' : 'pointer' }}>
            {saving ? 'Salvo…' : 'Salva configurazione'}
          </button>
          {savedMsg && <span style={{ fontSize: 13, color: savedMsg.includes('Errore') ? '#b91c1c' : '#166534' }}>{savedMsg}</span>}
        </div>
      </div>

      <div style={{ padding: 20, borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>Pubblicazione</h2>
        <button onClick={publish} disabled={publishing} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 10, border: 'none', cursor: publishing ? 'default' : 'pointer', background: publishing ? '#9ca3af' : '#239B73', color: '#fff', fontWeight: 700, fontSize: 15 }}>
          {publishing ? 'Pubblicazione in corso…' : 'Pubblica ora'}
        </button>
        {publishing && <div style={{ marginTop: 12, fontSize: 13, color: '#6b7280' }}>Genero e carico le pagine… (di solito meno di un minuto).</div>}
        {result && (
          <div style={{ marginTop: 18 }}>
            <div style={{ padding: 12, borderRadius: 8, fontWeight: 600, background: result.ok ? '#DCFCE7' : '#FEE2E2', color: result.ok ? '#166534' : '#991B1B' }}>
              {result.ok ? '✔ Sito pubblicato con successo.' : `✖ ${result.error || 'Errore'}`}
            </div>
            {result.log && (
              <pre style={{ marginTop: 12, padding: 12, borderRadius: 8, background: '#0b1020', color: '#d1d5db', fontSize: 12, lineHeight: 1.5, overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: 320 }}>
                {result.log}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
