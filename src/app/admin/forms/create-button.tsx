'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function CreateFormButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function create() {
    if (!name.trim()) return toast.error('Nome richiesto');
    setLoading(true);
    const res = await fetch('/api/forms', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setLoading(false);
    if (!res.ok) return toast.error('Errore');
    const data = await res.json();
    setOpen(false);
    router.push(`/admin/forms/${data.id}`);
  }
  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nuovo form</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo form</DialogTitle>
            <DialogDescription>Inizia con un form base (3 campi: nome, email, messaggio).</DialogDescription>
          </DialogHeader>
          <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="es. Contatti" autoFocus /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
            <Button onClick={create} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crea'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
