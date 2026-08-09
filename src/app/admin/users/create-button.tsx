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
import { t } from '@/lib/admin-i18n';

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
    if (!email) { toast.error(t('Email richiesta', 'Email required')); return; }
    if (!sendInvite && !password) { toast.error(t('Specifica una password o attiva l\'invio invito', 'Provide a password or enable the invite email')); return; }
    setLoading(true);
    const res = await fetch('/api/users', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, name: name || undefined, role, password: password || undefined, sendInvite }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(t('Errore', 'Error'), { description: err?.error?.message });
      return;
    }
    toast.success(sendInvite ? t('Utente creato. Invito inviato.', 'User created. Invite sent.') : t('Utente creato.', 'User created.'));
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t('Nuovo utente', 'New user')}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Nuovo utente', 'New user')}</DialogTitle>
            <DialogDescription>{t('Aggiungi un membro al team o un cliente', 'Add a team member or a client')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>{t('Nome', 'Name')}</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Opzionale', 'Optional')} /></div>
            <div className="space-y-1.5">
              <Label>{t('Ruolo', 'Role')}</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>{t('Invia link di invito', 'Send invite link')}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{t("L'utente imposterà la password dal link email", 'The user will set their password from the email link')}</p>
              </div>
              <Switch checked={sendInvite} onCheckedChange={setSendInvite} />
            </div>
            {!sendInvite && (
              <div className="space-y-1.5"><Label>{t('Password iniziale', 'Initial password')}</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('Annulla', 'Cancel')}</Button>
            <Button onClick={create} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Crea', 'Create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
