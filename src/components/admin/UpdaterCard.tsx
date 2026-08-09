'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DownloadCloud, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { t } from '@/lib/admin-i18n';

interface UpdateState {
  status?: 'idle' | 'running' | 'ok' | 'error';
  step?: string;
  error?: string | null;
  fromVersion?: string;
  toVersion?: string | null;
  finishedAt?: string | null;
  log?: string;
}

interface CheckInfo {
  current: string;
  latest: string | null;
  updateAvailable: boolean;
  licensed: boolean;
}

const STEP_LABELS: Record<string, string> = {
  download: t('Scarico la nuova versione…', 'Downloading the new version…'),
  backup: t('Backup automatico del database…', 'Automatic database backup…'),
  extract: t('Aggiorno i file…', 'Updating files…'),
  install: t('Installo le dipendenze…', 'Installing dependencies…'),
  database: t('Aggiorno lo schema del database…', 'Updating the database schema…'),
  build: t('Compilo (2-3 minuti)…', 'Building (2-3 minutes)…'),
  swap: t('Attivo la nuova versione…', 'Activating the new version…'),
  restart: t('Riavvio…', 'Restarting…'),
  done: t('Completato', 'Done'),
};

export function UpdaterCard() {
  const [check, setCheck] = useState<CheckInfo | null>(null);
  const [state, setState] = useState<UpdateState>({ status: 'idle' });
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasRunning = useRef(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/self-update');
      if (!res.ok) return;
      const j = (await res.json()) as { current: string; state: UpdateState; running: boolean };
      setState(j.state);
      setRunning(j.running);
      if (wasRunning.current && !j.running && j.state.status === 'ok') {
        // aggiornamento finito: ricarica per servire la nuova versione del pannello
        setTimeout(() => window.location.reload(), 2500);
      }
      wasRunning.current = j.running;
    } catch {
      /* il riavvio può far fallire qualche poll: riproviamo al giro dopo */
    }
  }, []);

  useEffect(() => {
    fetch('/api/admin/update-check')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setCheck(j))
      .catch(() => {});
    poll();
  }, [poll]);

  useEffect(() => {
    if (running || starting) {
      pollRef.current = setInterval(poll, 3000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [running, starting, poll]);

  const start = async () => {
    setStarting(true);
    try {
      const res = await fetch('/api/admin/self-update', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      if (res.ok) {
        setRunning(true);
        wasRunning.current = true;
        setState({ status: 'running', step: 'download' });
      } else {
        const j = (await res.json().catch(() => ({}))) as { message?: string; error?: { message?: string } };
        setState({ status: 'error', error: j?.error?.message || j?.message || t(`Avvio non riuscito (HTTP ${res.status})`, `Start failed (HTTP ${res.status})`) });
      }
    } catch {
      setState({ status: 'error', error: t('Avvio non riuscito: rete non raggiungibile', 'Start failed: network unreachable') });
    } finally {
      setStarting(false);
    }
  };

  const busy = running || starting || state.status === 'running';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DownloadCloud className="h-4 w-4 text-primary" /> {t('Aggiornamenti', 'Updates')}
        </CardTitle>
        <CardDescription>
          {t('Versione installata:', 'Installed version:')} <strong>v{check?.current ?? '…'}</strong>
          {check?.latest && (
            <>
              {' · '}{t('ultima disponibile:', 'latest available:')} <strong>v{check.latest}</strong>
            </>
          )}
          {check && !check.licensed && t(' · Richiede una licenza attiva.', ' · Requires an active license.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 max-w-2xl">
        {busy ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            <span>{STEP_LABELS[state.step ?? ''] ?? t('Aggiornamento in corso…', 'Update in progress…')}</span>
          </div>
        ) : state.status === 'ok' ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              {t('Aggiornato a', 'Updated to')} v{state.toVersion ?? check?.current}
              {state.finishedAt ? ` (${new Date(state.finishedAt).toLocaleString('it-IT')})` : ''}
            </span>
            <button type="button" onClick={() => window.location.reload()} className="ml-auto rounded-md border border-emerald-300 px-2.5 py-1 text-xs font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900">
              {t('Ricarica il pannello', 'Reload the panel')}
            </button>
          </div>
        ) : state.status === 'error' ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> {t('Aggiornamento non riuscito', 'Update failed')}</p>
            <p className="mt-1">{state.error}</p>
            <p className="mt-1 text-xs opacity-80">{t('La versione precedente è ancora in esecuzione.', 'The previous version is still running.')}</p>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <Button onClick={start} disabled={busy || (check ? !check.licensed : false)}>
            <DownloadCloud className="mr-2 h-4 w-4" />
            {check?.updateAvailable ? t(`Aggiorna a v${check.latest}`, `Update to v${check.latest}`) : t('Reinstalla ultima versione', 'Reinstall latest version')}
          </Button>
          {(state.log || busy) && (
            <button type="button" onClick={() => setShowLog((v) => !v)} className="text-xs text-muted-foreground underline underline-offset-2">
              {showLog ? t('Nascondi log', 'Hide log') : t('Mostra log', 'Show log')}
            </button>
          )}
        </div>

        {showLog && state.log && (
          <pre className="max-h-56 overflow-auto rounded-lg border border-border bg-muted/40 p-3 text-[11px] leading-relaxed">
            {state.log}
          </pre>
        )}
        <p className="text-xs text-muted-foreground">
          {t('Durante l\'aggiornamento il sito resta online: la nuova versione viene attivata solo a build riuscita. Prima di toccare il database viene creato un backup automatico in', 'During the update the site stays online: the new version is activated only after a successful build. Before touching the database, an automatic backup is created in')} <code>tmp/</code> {t('(ultimi 3 conservati). Si consiglia comunque un backup completo di file e database prima di aggiornare.', '(last 3 kept). A full backup of files and database before updating is still recommended.')}
        </p>
      </CardContent>
    </Card>
  );
}
