'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Download, Loader2, CheckCircle2 } from 'lucide-react';

/**
 * Download della skill AI (element-node-builder) per Claude Code / coding
 * agent. Sempre l'ultima versione: riscaricarla È l'aggiornamento.
 */
export function SkillCard() {
  const [version, setVersion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/skill-download?check=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.version && setVersion(j.version as string))
      .catch(() => {});
  }, []);

  const download = async () => {
    setBusy(true);
    setError('');
    setDone(false);
    try {
      const res = await fetch('/api/admin/skill-download');
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'element-node-builder-skill.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDone(true);
      setTimeout(() => setDone(false), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download non riuscito');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4" /> Skill AI per Claude Code
        </CardTitle>
        <CardDescription>
          Costruisci il sito con un prompt dal tuo agente AI (Claude Code, Codex…): la skill gli
          insegna widget, layout e API di Element Node. La aggiorniamo di continuo — riscaricarla
          è l&apos;aggiornamento. Zip con istruzioni di installazione incluse.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={download} disabled={busy}>
            {busy ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scarico…</>
            ) : done ? (
              <><CheckCircle2 className="h-4 w-4 mr-2" /> Scaricata</>
            ) : (
              <><Download className="h-4 w-4 mr-2" /> Scarica l&apos;ultima versione</>
            )}
          </Button>
          {version && (
            <span className="text-xs text-muted-foreground">Ultima versione: {version}</span>
          )}
        </div>
        {error && (
          <div className="text-xs text-red-600 border border-red-200 bg-red-50 rounded-md px-3 py-2">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
