'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, RefreshCw, Trash2, Loader2 } from 'lucide-react';

interface Stats {
  size: number;
  max: number;
  keys: { key: string; expiresInMs: number }[];
}

export function CacheManager() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [purging, setPurging] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cache');
      if (res.ok) setStats(await res.json());
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function purge() {
    if (!confirm('Svuotare la cache in-memory? Le query verranno rifatte al prossimo accesso.')) return;
    setPurging(true);
    try {
      const res = await fetch('/api/admin/cache', { method: 'DELETE' });
      if (res.ok) {
        toast.success('Cache svuotata');
        await load();
      } else {
        toast.error('Errore');
      }
    } finally {
      setPurging(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><Database className="h-4 w-4" /> Cache in-memory</CardTitle>
            <CardDescription>LRU cache delle query DB più frequenti (TTL 60s default)</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Aggiorna
            </Button>
            <Button variant="destructive" size="sm" onClick={purge} disabled={purging}>
              {purging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Svuota cache
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!stats ? (
          <div className="text-sm text-muted-foreground">Caricamento...</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="border rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Entries</div>
                <div className="text-2xl font-bold mt-0.5">{stats.size}<span className="text-sm font-normal text-muted-foreground">/{stats.max}</span></div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Riempimento</div>
                <div className="text-2xl font-bold mt-0.5">{Math.round((stats.size / stats.max) * 100)}%</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Strategia</div>
                <div className="text-sm font-medium mt-1">FIFO + TTL</div>
              </div>
            </div>

            {stats.keys.length > 0 ? (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Chiavi attive</div>
                <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                  {stats.keys.map((k) => (
                    <div key={k.key} className="flex items-center justify-between px-3 py-1.5 text-xs">
                      <code className="font-mono truncate flex-1">{k.key}</code>
                      <span className="text-muted-foreground ml-2 shrink-0">scade in {Math.round(k.expiresInMs / 1000)}s</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">Cache vuota</div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
