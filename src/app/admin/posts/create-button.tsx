'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function CreatePostButton({ postTypeSlug, typeName }: { postTypeSlug: string; typeName: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function create() {
    if (!title.trim()) { toast.error('Inserisci un titolo'); return; }
    setLoading(true);
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ postTypeSlug, title }),
    });
    setLoading(false);
    if (!res.ok) { toast.error('Errore creazione'); return; }
    const data = await res.json();
    toast.success('Creato');
    router.push(`/editor/post/${data.id}`);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nuovo {typeName}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo {typeName}</DialogTitle>
            <DialogDescription>Inserisci il titolo. Lo slug viene generato automaticamente e può essere modificato dopo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Titolo</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="Titolo del contenuto" />
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
