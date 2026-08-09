'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/admin-i18n';

interface CheckResult { ok: boolean; ms: number; error?: string; meta?: Record<string, unknown> }
interface Health {
  ok: boolean; uptime: number; nodeVersion: string; ms: number;
  checks: Record<string, CheckResult>;
}

export function HealthWidget() {
  const [data, setData] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/health');
      setData(await res.json());
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (!data && loading) return <Card><CardContent className="p-6 text-sm text-muted-foreground">{t('Caricamento health...', 'Loading health...')}</CardContent></Card>;
  if (!data) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className={`h-4 w-4 ${data.ok ? 'text-emerald-500' : 'text-red-500'}`} />
          System Health
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={load} className="h-7 w-7"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></Button>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Uptime: {formatUptime(data.uptime)} · Node {data.nodeVersion}
        </div>
        <div className="space-y-1.5">
          {Object.entries(data.checks).map(([key, c]) => (
            <div key={key} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
              <div className="flex items-center gap-1.5">
                {c.ok ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                <span className="font-medium capitalize">{key}</span>
              </div>
              <div className="text-muted-foreground">{formatMeta(key, c)}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function formatUptime(s: number): string {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return t(`${Math.floor(s / 86400)}g`, `${Math.floor(s / 86400)}d`);
}

function formatMeta(key: string, c: CheckResult): string {
  if (key === 'db' && c.meta) return t(`${c.ms}ms · ${c.meta.pages} pagine`, `${c.ms}ms · ${c.meta.pages} pages`);
  if (key === 'memory' && c.meta) return `${c.meta.heapUsedMB}MB`;
  if (key === 'email' && c.meta) return c.meta.mode as string;
  if (key === 'ai') return c.ok ? t('configurato', 'configured') : t('non configurato', 'not configured');
  return c.ok ? 'OK' : (c.error ?? t('errore', 'error'));
}
