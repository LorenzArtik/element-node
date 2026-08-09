'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { t } from '@/lib/admin-i18n';

export function DeletePostTypeButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onDelete() {
    setLoading(true);
    const res = await fetch(`/api/post-types/${id}`, { method: 'DELETE' });
    setLoading(false);
    if (res.ok) {
      toast.success(t('Eliminato', 'Deleted'));
      setOpen(false);
      router.refresh();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(t('Errore', 'Error'), { description: err?.error?.message });
    }
  }

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} title={t('Elimina', 'Delete')}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Eliminare', 'Delete')} {name}?</DialogTitle>
            <DialogDescription>{t('Verranno eliminati anche tutti i contenuti associati. Operazione irreversibile.', 'All associated content will also be deleted. This cannot be undone.')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('Annulla', 'Cancel')}</Button>
            <Button variant="destructive" onClick={onDelete} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Elimina', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
