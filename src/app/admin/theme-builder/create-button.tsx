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

export function CreateBlockButton({ kind }: { kind: 'HEADER' | 'FOOTER' }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function create() {
    if (!name.trim()) {
      toast.error(t('Inserisci un nome', 'Enter a name'));
      return;
    }
    setLoading(true);
    const res = await fetch('/api/theme-blocks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, kind }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error(t('Errore creazione', 'Creation error'));
      return;
    }
    const data = await res.json();
    toast.success(t('Creato', 'Created'));
    setOpen(false);
    router.push(`/editor/theme-block/${data.id}`);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t('Nuovo', 'New')} {kind === 'HEADER' ? 'Header' : 'Footer'}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Nuovo', 'New')} {kind === 'HEADER' ? 'Header' : 'Footer'}</DialogTitle>
            <DialogDescription>{t('Dagli un nome riconoscibile (es. "Header principale", "Footer mobile").', 'Give it a recognizable name (e.g. "Main header", "Mobile footer").')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t('Nome', 'Name')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'HEADER' ? t('Header principale', 'Main header') : t('Footer principale', 'Main footer')} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('Annulla', 'Cancel')}</Button>
            <Button onClick={create} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Crea e apri editor', 'Create and open editor')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
