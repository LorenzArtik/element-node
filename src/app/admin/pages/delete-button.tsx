'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function DeletePageButton({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onDelete() {
    setLoading(true);
    const res = await fetch(`/api/pages/${id}`, { method: 'DELETE' });
    setLoading(false);
    if (res.ok) {
      toast.success('Pagina eliminata');
      setOpen(false);
      router.refresh();
    } else {
      toast.error('Errore durante l\'eliminazione');
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
            <DialogTitle>Eliminare la pagina?</DialogTitle>
            <DialogDescription>Stai per eliminare definitivamente <b>{title}</b>. L'azione non si può annullare.</DialogDescription>
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
