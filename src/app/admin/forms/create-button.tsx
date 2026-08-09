'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { t } from '@/lib/admin-i18n';

export function CreateFormButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function create() {
    if (!name.trim()) return toast.error(t('Nome richiesto', 'Name required'));
    setLoading(true);
    const res = await fetch('/api/forms', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setLoading(false);
    if (!res.ok) return toast.error(t('Errore', 'Error'));
    const data = await res.json();
    setOpen(false);
    router.push(`/admin/forms/${data.id}`);
  }
  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t('Nuovo form', 'New form')}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Nuovo form', 'New form')}</DialogTitle>
            <DialogDescription>{t('Inizia con un form base (3 campi: nome, email, messaggio).', 'Start with a basic form (3 fields: name, email, message).')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2"><Label>{t('Nome', 'Name')}</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('es. Contatti', 'e.g. Contact')} autoFocus /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('Annulla', 'Cancel')}</Button>
            <Button onClick={create} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Crea', 'Create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
