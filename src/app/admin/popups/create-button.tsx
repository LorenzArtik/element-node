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

export function CreatePopupButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function create() {
    if (!name.trim()) return toast.error(t('Nome richiesto', 'Name required'));
    setLoading(true);
    const res = await fetch('/api/popups', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setLoading(false);
    if (!res.ok) return toast.error(t('Errore', 'Error'));
    const data = await res.json();
    router.push(`/editor/popup/${data.id}`);
  }
  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t('Nuovo popup', 'New popup')}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Nuovo popup', 'New popup')}</DialogTitle>
            <DialogDescription>{t('Dagli un nome (es. "Newsletter exit-intent")', 'Give it a name (e.g. "Newsletter exit-intent")')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2"><Label>{t('Nome', 'Name')}</Label><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('Annulla', 'Cancel')}</Button>
            <Button onClick={create} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Crea', 'Create')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
