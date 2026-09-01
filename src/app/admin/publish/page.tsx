'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type SP = {
  enabled: boolean; targetUrl: string; ftpHost: string; ftpUser: string;
  ftpPass: string; ftpRemotePath: string; ftpSsl: boolean; mailTo: string;
};
const EMPTY: SP = { enabled: false, targetUrl: '', ftpHost: '', ftpUser: '', ftpPass: '', ftpRemotePath: '/', ftpSsl: false, mailTo: '' };

export default function PublishPage() {
  const [integrations, setIntegrations] = useState<Record<string, unknown> | null>(null);
  const [sp, setSp] = useState<SP>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [savedErr, setSavedErr] = useState(false);
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
        setSavedErr(false);
        setSavedMsg('Configurazione salvata.');
      } else {
        setSavedErr(true);
        setSavedMsg('Errore nel salvataggio.');
      }
    } catch {
      setSavedErr(true);
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
    <div className="p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pubblica sito</h1>
        <p className="text-muted-foreground mt-1">
          Pubblica una copia statica del sito su un hosting FTP, tenendo questo CMS come sorgente.
          Le modifiche fatte qui diventano visibili online solo dopo la pubblicazione.
        </p>
      </div>

      {integrations && !sp.enabled && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          La pubblicazione statica non è attiva. Attivala in{' '}
          <a href="/admin/settings" className="font-medium underline">Impostazioni → Sistema</a>{' '}
          per mostrarla nel menu e poter pubblicare.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Configurazione hosting</CardTitle>
          <CardDescription>Dove viene caricata la copia statica del sito.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="sp-target">Dominio pubblico (target)</Label>
            <Input id="sp-target" placeholder="https://iltuosito.it" value={sp.targetUrl} onChange={(e) => upd('targetUrl', e.target.value)} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sp-host">Host FTP</Label>
              <Input id="sp-host" placeholder="ftp.iltuosito.it" value={sp.ftpHost} onChange={(e) => upd('ftpHost', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-remote">Cartella remota (docroot)</Label>
              <Input id="sp-remote" placeholder="/" value={sp.ftpRemotePath} onChange={(e) => upd('ftpRemotePath', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-user">Utente FTP</Label>
              <Input id="sp-user" value={sp.ftpUser} onChange={(e) => upd('ftpUser', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp-pass">Password FTP</Label>
              <Input id="sp-pass" type="password" value={sp.ftpPass} onChange={(e) => upd('ftpPass', e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch id="sp-ssl" checked={sp.ftpSsl} onCheckedChange={(v) => upd('ftpSsl', Boolean(v))} />
            <Label htmlFor="sp-ssl">Usa FTPS/TLS (lascia spento per FTP semplice)</Label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sp-mail">Email destinataria dei form</Label>
            <Input id="sp-mail" type="email" placeholder="info@iltuosito.it" value={sp.mailTo} onChange={(e) => upd('mailTo', e.target.value)} />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button variant="outline" onClick={save} disabled={saving}>
              {saving ? 'Salvo…' : 'Salva configurazione'}
            </Button>
            {savedMsg && <span className={`text-sm ${savedErr ? 'text-red-600' : 'text-green-600'}`}>{savedMsg}</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pubblicazione</CardTitle>
          <CardDescription>Genera e carica online la versione statica del sito (di solito meno di un minuto).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button size="lg" onClick={publish} disabled={publishing}>
            {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {publishing ? 'Pubblicazione in corso…' : 'Pubblica ora'}
          </Button>

          {result && (
            <div>
              <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {result.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {result.ok ? 'Sito pubblicato con successo.' : (result.error || 'Errore durante la pubblicazione.')}
              </div>
              {result.log && (
                <pre className="mt-3 max-h-80 overflow-x-auto whitespace-pre-wrap rounded-md bg-zinc-900 p-3 text-xs leading-relaxed text-zinc-100">
                  {result.log}
                </pre>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
