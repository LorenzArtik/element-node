'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function CreateRedirectButton() {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState('/');
  const [to, setTo] = useState('/');
  const [type, setType] = useState('301');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function create() {
    if (!from.startsWith('/')) { toast.error('Path "Da" deve iniziare con /'); return; }
    setLoading(true);
    const res = await fetch('/api/redirects', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fromPath: from, toPath: to, type: Number(type) }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error('Errore', { description: err?.error?.message });
      return;
    }
    toast.success('Creato');
    setOpen(false);
    router.refresh();
  }
  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nuovo redirect</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo redirect</DialogTitle>
            <DialogDescription>Reindirizza un vecchio path verso uno nuovo</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Da (path)</Label><Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="/vecchio-path" /></div>
            <div className="space-y-1.5"><Label>A (URL o path)</Label><Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="/nuovo-path" /></div>
            <div className="space-y-1.5">
              <Label>Tipo HTTP</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="301">301 — Permanente</SelectItem>
                  <SelectItem value="302">302 — Temporaneo</SelectItem>
                  <SelectItem value="307">307 — Temporaneo (preserva metodo)</SelectItem>
                  <SelectItem value="308">308 — Permanente (preserva metodo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
            <Button onClick={create} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crea'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
