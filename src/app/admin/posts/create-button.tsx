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

export function CreatePostButton({ postTypeSlug, typeName }: { postTypeSlug: string; typeName: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function create() {
    if (!title.trim()) { toast.error(t('Inserisci un titolo', 'Enter a title')); return; }
    setLoading(true);
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ postTypeSlug, title }),
    });
    setLoading(false);
    if (!res.ok) { toast.error(t('Errore creazione', 'Creation error')); return; }
    const data = await res.json();
    toast.success(t('Creato', 'Created'));
    router.push(`/editor/post/${data.id}`);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t('Nuovo', 'New')} {typeName}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Nuovo', 'New')} {typeName}</DialogTitle>
            <DialogDescription>{t('Inserisci il titolo. Lo slug viene generato automaticamente e può essere modificato dopo.', 'Enter the title. The slug is generated automatically and can be changed later.')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t('Titolo', 'Title')}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder={t('Titolo del contenuto', 'Content title')} />
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
