'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function DeletePostButton({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onDelete() {
    setLoading(true);
    const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    setLoading(false);
    if (res.ok) {
      toast.success('Eliminato');
      setOpen(false);
      router.refresh();
    } else toast.error('Errore');
  }

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} title="Elimina">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminare?</DialogTitle>
            <DialogDescription>Stai per eliminare <b>{title}</b>. Operazione irreversibile.</DialogDescription>
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
