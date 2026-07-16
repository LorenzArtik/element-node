'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function CreateBlockButton({ kind }: { kind: 'HEADER' | 'FOOTER' }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function create() {
    if (!name.trim()) {
      toast.error('Inserisci un nome');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/theme-blocks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, kind }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error('Errore creazione');
      return;
    }
    const data = await res.json();
    toast.success('Creato');
    setOpen(false);
    router.push(`/editor/theme-block/${data.id}`);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nuovo {kind === 'HEADER' ? 'Header' : 'Footer'}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo {kind === 'HEADER' ? 'Header' : 'Footer'}</DialogTitle>
            <DialogDescription>Dagli un nome riconoscibile (es. "Header principale", "Footer mobile").</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'HEADER' ? 'Header principale' : 'Footer principale'} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
            <Button onClick={create} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crea e apri editor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
