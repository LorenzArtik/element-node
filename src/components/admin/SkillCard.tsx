'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Download, Loader2, CheckCircle2, Copy, Check } from 'lucide-react';

/**
 * Skill AI (element-node-builder) per Claude Code / coding agent.
 * La skill è open source su GitHub; da qui (piani a pagamento) si scarica
 * sempre l'ultima versione impacchettata. Riscaricarla È l'aggiornamento.
 */
export function SkillCard({ licenseKey }: { licenseKey?: string }) {
  const [version, setVersion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/admin/skill-download?check=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.version && setVersion(j.version as string))
      .catch(() => {});
  }, []);

  const key = (licenseKey || '').trim();
  const command = `bash <(curl -fsSL https://elementnode.cloud/install-skill.sh)${key ? ` ${key}` : ''}`;

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard non disponibile */
    }
  };

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
          insegna widget, layout e API di Element Node. È{' '}
          <a
            href="https://github.com/LorenzArtik/element-node/tree/main/skill"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            open source su GitHub
          </a>
          {' '}e gratuita per tutti; da qui scarichi sempre l&apos;ultima versione impacchettata.
          Riscaricarla è l&apos;aggiornamento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 max-w-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={download} disabled={busy}>
            {busy ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scarico…</>
            ) : done ? (
              <><CheckCircle2 className="h-4 w-4 mr-2" /> Scaricata</>
            ) : (
              <><Download className="h-4 w-4 mr-2" /> Scarica l&apos;ultima versione (zip)</>
            )}
          </Button>
          {version && (
            <span className="text-xs text-muted-foreground">Ultima versione: {version}</span>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            Oppure installala/aggiornala direttamente dal terminale (o incolla il comando a Claude Code):
          </p>
          <div className="flex items-center gap-1.5">
            <code className="flex-1 min-w-0 truncate rounded-md border bg-muted/50 px-2.5 py-1.5 text-[11px]" title={command}>
              {command}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={copyCommand} className="shrink-0">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          {!key && (
            <p className="text-[11px] text-muted-foreground">
              Senza chiave di licenza il comando installa la copia pubblica da GitHub; con la chiave
              (inseriscila qui sopra) scarica l&apos;ultima versione impacchettata dal license server.
            </p>
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
