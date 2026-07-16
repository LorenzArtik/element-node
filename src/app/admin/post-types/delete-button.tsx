'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function DeletePostTypeButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onDelete() {
    setLoading(true);
    const res = await fetch(`/api/post-types/${id}`, { method: 'DELETE' });
    setLoading(false);
    if (res.ok) {
      toast.success('Eliminato');
      setOpen(false);
      router.refresh();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error('Errore', { description: err?.error?.message });
    }
  }

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} title="Elimina">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminare {name}?</DialogTitle>
            <DialogDescription>Verranno eliminati anche tutti i contenuti associati. Operazione irreversibile.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
            <Button variant="destructive" onClick={onDelete} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Elimina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
