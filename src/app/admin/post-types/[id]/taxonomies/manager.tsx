'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Tag, FolderTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { t } from '@/lib/admin-i18n';

interface Term { id: string; name: string; slug: string; postsCount: number }
interface Taxonomy {
  id: string; slug: string; name: string; plural: string; hierarchical: boolean;
  termsCount: number; terms: Term[];
}

export function TaxonomyManager({ postTypeId, initial }: { postTypeId: string; initial: Taxonomy[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <div className="flex items-center justify-end">
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> {t('Nuova tassonomia', 'New taxonomy')}</Button>
      </div>

      {initial.length === 0 ? (
        <Card className="p-12 text-center">
          <FolderTree className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">{t('Nessuna tassonomia configurata.', 'No taxonomies configured.')}</p>
          <p className="text-xs text-muted-foreground">{t('Le tassonomie permettono di organizzare i contenuti (es. categorie, tag, generi).', 'Taxonomies let you organize content (e.g. categories, tags, genres).')}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {initial.map((t) => <TaxonomyCard key={t.id} tax={t} />)}
        </div>
      )}

      <CreateTaxonomyDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        postTypeId={postTypeId}
        onCreated={() => { setShowCreate(false); router.refresh(); }}
      />
    </>
  );
}

function TaxonomyCard({ tax }: { tax: Taxonomy }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [newTermName, setNewTermName] = useState('');
  const [loading, setLoading] = useState(false);

  async function addTerm() {
    if (!newTermName.trim()) return;
    setLoading(true);
    const res = await fetch('/api/terms', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ taxonomyId: tax.id, name: newTermName }),
    });
    setLoading(false);
    if (!res.ok) { toast.error(t('Errore', 'Error')); return; }
    toast.success(t('Voce aggiunta', 'Term added'));
    setNewTermName('');
    setShowAdd(false);
    router.refresh();
  }

  async function deleteTerm(termId: string, name: string) {
    if (!confirm(t(`Eliminare "${name}"?`, `Delete "${name}"?`))) return;
    const res = await fetch(`/api/terms/${termId}`, { method: 'DELETE' });
    if (res.ok) { toast.success(t('Eliminata', 'Deleted')); router.refresh(); }
    else toast.error(t('Errore', 'Error'));
  }

  async function deleteTaxonomy() {
    if (!confirm(t(`Eliminare la tassonomia "${tax.plural}" e tutte le sue voci?`, `Delete the taxonomy "${tax.plural}" and all its terms?`))) return;
    const res = await fetch(`/api/taxonomies/${tax.id}`, { method: 'DELETE' });
    if (res.ok) { toast.success(t('Eliminata', 'Deleted')); router.refresh(); }
    else toast.error(t('Errore', 'Error'));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              {tax.plural}
              <Badge variant="outline">/{tax.slug}</Badge>
              {tax.hierarchical && <Badge variant="secondary" className="text-[10px]">{t('Gerarchica', 'Hierarchical')}</Badge>}
            </CardTitle>
            <CardDescription>{tax.termsCount} {tax.termsCount === 1 ? t('voce', 'term') : t('voci', 'terms')}</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}><Plus className="h-3 w-3" /> {t('Voce', 'Term')}</Button>
            <Button size="icon" variant="ghost" onClick={deleteTaxonomy} title={t('Elimina tassonomia', 'Delete taxonomy')}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {tax.terms.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{t('Nessuna voce.', 'No terms.')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tax.terms.map((tm) => (
              <div key={tm.id} className="flex items-center gap-1 border rounded-md px-2 py-1 bg-muted/50">
                <span className="text-sm">{tm.name}</span>
                <span className="text-[10px] text-muted-foreground">({tm.postsCount})</span>
                <button
                  onClick={() => deleteTerm(tm.id, tm.name)}
                  className="ml-1 text-muted-foreground hover:text-destructive"
                  title={t('Elimina', 'Delete')}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Nuova voce in', 'New term in')} &quot;{tax.plural}&quot;</DialogTitle>
            <DialogDescription>{t('Es. una nuova categoria o tag', 'E.g. a new category or tag')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t('Nome', 'Name')}</Label>
            <Input
              value={newTermName}
              onChange={(e) => setNewTermName(e.target.value)}
              autoFocus
              placeholder={tax.slug === 'category' ? t('es. Cucina', 'e.g. Cooking') : tax.slug === 'tag' ? t('es. ricette-veloci', 'e.g. quick-recipes') : t('Nome', 'Name')}
              onKeyDown={(e) => { if (e.key === 'Enter' && !loading) addTerm(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>{t('Annulla', 'Cancel')}</Button>
            <Button onClick={addTerm} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Aggiungi', 'Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function CreateTaxonomyDialog({ open, onOpenChange, postTypeId, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void; postTypeId: string; onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [plural, setPlural] = useState('');
  const [slug, setSlug] = useState('');
  const [hierarchical, setHierarchical] = useState(false);
  const [loading, setLoading] = useState(false);

  async function create() {
    if (!name.trim() || !plural.trim()) return toast.error(t('Compila tutti i campi', 'Fill in all fields'));
    setLoading(true);
    const res = await fetch('/api/taxonomies', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, plural, slug, hierarchical, postTypeId }),
    });
    setLoading(false);
    if (!res.ok) { toast.error(t('Errore', 'Error')); return; }
    toast.success(t('Tassonomia creata', 'Taxonomy created'));
    setName(''); setPlural(''); setSlug(''); setHierarchical(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Nuova tassonomia', 'New taxonomy')}</DialogTitle>
          <DialogDescription>{t('Es. "Categorie", "Tag", "Generi"', 'E.g. "Categories", "Tags", "Genres"')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>{t('Nome (singolare)', 'Name (singular)')}</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Categoria', 'Category')} /></div>
          <div className="space-y-1.5"><Label>{t('Plurale', 'Plural')}</Label><Input value={plural} onChange={(e) => setPlural(e.target.value)} placeholder={t('Categorie', 'Categories')} /></div>
          <div className="space-y-1.5"><Label>{t('Slug URL (opzionale)', 'Slug URL (optional)')}</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={t('auto da plurale', 'auto from plural')} /></div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label>{t('Gerarchica', 'Hierarchical')}</Label>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t('Le voci possono avere genitori (es. categorie WP)', 'Terms can have parents (e.g. WP categories)')}</p>
            </div>
            <Switch checked={hierarchical} onCheckedChange={setHierarchical} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Annulla', 'Cancel')}</Button>
          <Button onClick={create} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Crea', 'Create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
