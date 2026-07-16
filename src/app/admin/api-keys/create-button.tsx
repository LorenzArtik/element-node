'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Loader2, Copy, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ALL_SCOPES } from '@/lib/api-key';

export function CreateApiKeyButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['site.export', 'site.import']);
  const [expiresInDays, setExpiresInDays] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{ name: string; plaintext: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  function reset() {
    setName(''); setScopes(['site.export', 'site.import']); setExpiresInDays(''); setCreated(null); setCopied(false);
  }

  async function create() {
    if (!name.trim()) return toast.error('Inserisci un nome');
    if (scopes.length === 0) return toast.error('Seleziona almeno uno scope');
    setLoading(true);
    const payload: Record<string, unknown> = { name, scopes };
    if (expiresInDays) payload.expiresInDays = Number(expiresInDays);
    const res = await fetch('/api/admin/api-keys', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) return toast.error('Errore creazione');
    const data = await res.json();
    setCreated({ name: data.name, plaintext: data.plaintext });
    router.refresh();
  }

  function copyKey() {
    if (!created) return;
    navigator.clipboard.writeText(created.plaintext);
    setCopied(true);
    toast.success('Copiata');
    setTimeout(() => setCopied(false), 2000);
  }

  function toggleScope(s: string) {
    setScopes((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]);
  }

  function close() {
    setOpen(false);
    setTimeout(reset, 200);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nuova API key</Button>
      <Dialog open={open} onOpenChange={(v) => { if (!v) close(); else setOpen(v); }}>
        <DialogContent className="max-w-2xl">
          {!created ? (
            <>
              <DialogHeader>
                <DialogTitle>Nuova API key</DialogTitle>
                <DialogDescription>
                  Le API key permettono accesso programmatico al CMS via header <code>Authorization: Bearer ...</code>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nome (descrittivo)</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="es. Claude Code site builder" autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label>Scopes</Label>
                  <div className="grid grid-cols-2 gap-1.5 p-2 border rounded max-h-60 overflow-y-auto">
                    {ALL_SCOPES.map((s) => (
                      <label key={s} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer text-xs">
                        <input type="checkbox" checked={scopes.includes(s)} onChange={() => toggleScope(s)} />
                        <code>{s}</code>
                        {s === '*' && <span className="text-[10px] text-amber-500 ml-auto">(full access)</span>}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Scadenza (giorni, vuoto = mai)</Label>
                  <Input type="number" value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} placeholder="365" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={close}>Annulla</Button>
                <Button onClick={create} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crea API key'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>API key creata</DialogTitle>
                <DialogDescription className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Questa è l&apos;UNICA volta che vedrai la chiave. Copiala ora.</span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">{created.name}</Label>
                  <div className="flex gap-2 mt-1.5">
                    <code className="flex-1 p-3 bg-muted rounded font-mono text-xs break-all">{created.plaintext}</code>
                    <Button size="icon" variant="outline" onClick={copyKey}>
                      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Esempio uso: <code className="bg-muted px-1.5 py-0.5 rounded">curl -H &quot;Authorization: Bearer {created.plaintext.slice(0, 15)}…&quot; http://localhost:3000/api/admin/export</code>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={close}>Ho salvato la chiave</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
