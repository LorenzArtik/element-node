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

export function CreatePostTypeButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [plural, setPlural] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('FileText');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function create() {
    if (!name.trim() || !plural.trim()) { toast.error('Nome e plurale richiesti'); return; }
    setLoading(true);
    const res = await fetch('/api/post-types', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, plural, slug: slug || slugify(plural), icon }),
    });
    setLoading(false);
    if (!res.ok) { toast.error('Errore creazione'); return; }
    toast.success('Creato');
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nuovo tipo</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo Custom Post Type</DialogTitle>
            <DialogDescription>Definisce un nuovo tipo di contenuto (es. "Prodotto", "Evento").</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nome (singolare)</Label><Input value={name} onChange={(e) => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }} placeholder="es. Prodotto" /></div>
            <div className="space-y-1.5"><Label>Plurale</Label><Input value={plural} onChange={(e) => setPlural(e.target.value)} placeholder="es. Prodotti" /></div>
            <div className="space-y-1.5"><Label>Slug URL</Label><Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="es. prodotti" /></div>
            <div className="space-y-1.5"><Label>Icona Lucide</Label><Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="es. ShoppingBag" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
            <Button onClick={create} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
