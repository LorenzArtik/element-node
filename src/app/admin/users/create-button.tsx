'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ROLE_LABELS } from '@/lib/permissions';

export function CreateUserButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('EDITOR');
  const [password, setPassword] = useState('');
  const [sendInvite, setSendInvite] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function create() {
    if (!email) { toast.error('Email richiesta'); return; }
    if (!sendInvite && !password) { toast.error('Specifica una password o attiva l\'invio invito'); return; }
    setLoading(true);
    const res = await fetch('/api/users', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, name: name || undefined, role, password: password || undefined, sendInvite }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error('Errore', { description: err?.error?.message });
      return;
    }
    toast.success(sendInvite ? 'Utente creato. Invito inviato.' : 'Utente creato.');
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nuovo utente</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo utente</DialogTitle>
            <DialogDescription>Aggiungi un membro al team o un cliente</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Opzionale" /></div>
            <div className="space-y-1.5">
              <Label>Ruolo</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>Invia link di invito</Label>
                <p className="text-xs text-muted-foreground mt-0.5">L'utente imposterà la password dal link email</p>
              </div>
              <Switch checked={sendInvite} onCheckedChange={setSendInvite} />
            </div>
            {!sendInvite && (
              <div className="space-y-1.5"><Label>Password iniziale</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            )}
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
