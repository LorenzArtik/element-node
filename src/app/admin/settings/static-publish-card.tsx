'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { UploadCloud, ChevronRight } from 'lucide-react';

/** Interruttore che attiva la feature "Pubblicazione statica". Quando è ON,
 *  compare la voce "Pubblica" nel menu e la pagina /admin/publish è operativa. */
export function StaticPublishCard() {
  const [integrations, setIntegrations] = useState<Record<string, unknown> | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings/site')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setIntegrations(d.integrations || {});
        setEnabled(!!d.integrations?.staticPublish?.enabled);
      })
      .catch(() => {});
  }, []);

  async function toggle(v: boolean) {
    if (!integrations || saving) return;
    setEnabled(v);
    setSaving(true);
    const sp = { ...((integrations.staticPublish as Record<string, unknown>) || {}), enabled: v };
    try {
      const res = await fetch('/api/settings/site', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ integrations: { ...integrations, staticPublish: sp } }),
      });
      if (res.ok) {
        const d = await res.json();
        setIntegrations(d.integrations);
      } else {
        setEnabled(!v);
      }
    } catch {
      setEnabled(!v);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <UploadCloud className="h-4 w-4" /> Pubblicazione statica
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Pubblica una copia statica del sito su un hosting FTP economico, tenendo questo CMS come sorgente.
            Attivala solo se serve: quando è attiva compare la voce “Pubblica” nel menu.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={(v) => toggle(Boolean(v))} disabled={saving || !integrations} />
      </CardHeader>
      {enabled && (
        <CardContent>
          <Link href="/admin/publish" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Configura hosting e pubblica <ChevronRight className="h-4 w-4" />
          </Link>
        </CardContent>
      )}
    </Card>
  );
}
