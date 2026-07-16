'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Ban, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function RevokeApiKeyButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function revoke() {
    setLoading(true);
    const res = await fetch(`/api/admin/api-keys/${id}`, { method: 'PATCH' });
    setLoading(false);
    if (res.ok) { toast.success('Revocata'); setOpen(false); router.refresh(); }
    else toast.error('Errore');
  }
  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} title="Revoca"><Ban className="h-4 w-4 text-destructive" /></Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revocare la API key?</DialogTitle>
            <DialogDescription><b>{name}</b> non funzionerà più dopo la revoca.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
            <Button variant="destructive" onClick={revoke} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Revoca'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
