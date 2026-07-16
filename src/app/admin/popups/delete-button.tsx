'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function DeletePopupButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function onDelete() {
    setLoading(true);
    const res = await fetch(`/api/popups/${id}`, { method: 'DELETE' });
    setLoading(false);
    if (res.ok) { setOpen(false); router.refresh(); toast.success('Eliminato'); }
    else toast.error('Errore');
  }
  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} title="Elimina"><Trash2 className="h-4 w-4 text-destructive" /></Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminare?</DialogTitle><DialogDescription>{name}</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
            <Button variant="destructive" onClick={onDelete} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Elimina'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
