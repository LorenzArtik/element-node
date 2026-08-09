'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { slugify } from '@/lib/utils';
import { t } from '@/lib/admin-i18n';

export function CreatePostTypeButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [plural, setPlural] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('FileText');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function create() {
    if (!name.trim() || !plural.trim()) { toast.error(t('Nome e plurale richiesti', 'Name and plural are required')); return; }
    setLoading(true);
    const res = await fetch('/api/post-types', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, plural, slug: slug || slugify(plural), icon }),
    });
    setLoading(false);
    if (!res.ok) { toast.error(t('Errore creazione', 'Creation error')); return; }
    toast.success(t('Creato', 'Created'));
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t('Nuovo tipo', 'New type')}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Nuovo Custom Post Type', 'New Custom Post Type')}</DialogTitle>
            <DialogDescription>{t('Definisce un nuovo tipo di contenuto (es. "Prodotto", "Evento").', 'Defines a new content type (e.g. "Product", "Event").')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>{t('Nome (singolare)', 'Name (singular)')}</Label><Input value={name} onChange={(e) => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }} placeholder={t('es. Prodotto', 'e.g. Product')} /></div>
            <div className="space-y-1.5"><Label>{t('Plurale', 'Plural')}</Label><Input value={plural} onChange={(e) => setPlural(e.target.value)} placeholder={t('es. Prodotti', 'e.g. Products')} /></div>
            <div className="space-y-1.5"><Label>Slug URL</Label><Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder={t('es. prodotti', 'e.g. products')} /></div>
            <div className="space-y-1.5"><Label>{t('Icona Lucide', 'Lucide icon')}</Label><Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder={t('es. ShoppingBag', 'e.g. ShoppingBag')} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('Annulla', 'Cancel')}</Button>
            <Button onClick={create} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Crea', 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
