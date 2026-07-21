'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MediaField } from './MediaField';
import { slugify } from '@/lib/utils';

export type EditorEntityKind = 'page' | 'theme-block' | 'post' | 'popup';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entityKind: EditorEntityKind;
  entityId: string;
  initial: {
    title: string;
    slug: string;
    status: string;
    isHomepage?: boolean;
    password?: string | null;
    settings?: Record<string, unknown> | null;
    featured?: string | null;
    excerpt?: string | null;
    publishedAt?: string | null;
  };
}

export function PageSettingsDrawer({ open, onOpenChange, entityKind, entityId, initial }: Props) {
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [status, setStatus] = useState(initial.status);
  const [isHomepage, setIsHomepage] = useState(!!initial.isHomepage);
  const [password, setPassword] = useState(initial.password ?? '');
  const [hideHeader, setHideHeader] = useState(!!(initial.settings as { hideHeader?: boolean } | null)?.hideHeader);
  const [hideFooter, setHideFooter] = useState(!!(initial.settings as { hideFooter?: boolean } | null)?.hideFooter);
  const [featured, setFeatured] = useState(initial.featured ?? '');
  const [excerpt, setExcerpt] = useState(initial.excerpt ?? '');
  const [publishedAt, setPublishedAt] = useState(initial.publishedAt ?? '');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const isPage = entityKind === 'page';
  const isPost = entityKind === 'post';

  const apiBase =
    entityKind === 'page' ? '/api/pages'
    : entityKind === 'post' ? '/api/posts'
    : entityKind === 'theme-block' ? '/api/theme-blocks'
    : '/api/popups';

  async function save() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { title, slug, status };
      if (isPage) {
        payload.isHomepage = isHomepage;
        payload.password = password || null;
        payload.settings = { ...(initial.settings ?? {}), hideHeader, hideFooter };
      }
      if (isPost) {
        payload.featured = featured || null;
        payload.excerpt = excerpt || null;
        if (publishedAt) payload.publishedAt = new Date(publishedAt).toISOString();
      }
      // theme-block / popup → solo name+status
      if (entityKind === 'theme-block' || entityKind === 'popup') {
        delete payload.slug;
        delete payload.title;
        (payload as Record<string, unknown>).name = title;
      }
      const res = await fetch(`${apiBase}/${entityId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Impostazioni salvate');
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      toast.error('Errore', { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Impostazioni {isPage ? 'pagina' : isPost ? 'articolo' : entityKind}</DialogTitle>
          <DialogDescription>Titolo, URL, stato di pubblicazione, attributi avanzati</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">Generale</TabsTrigger>
            {(isPage || isPost) && <TabsTrigger value="publish">Pubblicazione</TabsTrigger>}
            {isPost && <TabsTrigger value="featured">In evidenza</TabsTrigger>}
            {isPage && <TabsTrigger value="protect">Protezione</TabsTrigger>}
          </TabsList>

          <TabsContent value="general" className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label>Titolo</Label>
              <Input value={title} onChange={(e) => {
                setTitle(e.target.value);
                if (slug === slugify(initial.title)) setSlug(slugify(e.target.value));
              }} />
            </div>
            {(isPage || isPost) && (
              <div className="space-y-1.5">
                <Label>Slug URL</Label>
                <div className="flex gap-2">
                  <span className="text-sm text-muted-foreground self-center">
                    {isPost ? '/articolo/' : '/'}
                  </span>
                  <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} />
                </div>
              </div>
            )}
            {isPost && (
              <div className="space-y-1.5">
                <Label>Estratto</Label>
                <Textarea rows={3} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Breve descrizione (per archive list)" />
              </div>
            )}
          </TabsContent>

          <TabsContent value="publish" className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label>Stato</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Bozza</SelectItem>
                  <SelectItem value="PUBLISHED">Pubblicato</SelectItem>
                  <SelectItem value="PRIVATE">Privato</SelectItem>
                  {isPost && <SelectItem value="SCHEDULED">Programmato</SelectItem>}
                  <SelectItem value="TRASH">Cestino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isPage && (
              <>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>Imposta come homepage</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Sostituirà la homepage corrente</p>
                </div>
                <Switch checked={isHomepage} onCheckedChange={setIsHomepage} />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="text-xs">Nascondi header</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">La pagina esce senza l'header del tema (landing con chrome proprio)</p>
                </div>
                <Switch checked={hideHeader} onCheckedChange={setHideHeader} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="text-xs">Nascondi footer</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">La pagina esce senza il footer del tema</p>
                </div>
                <Switch checked={hideFooter} onCheckedChange={setHideFooter} />
              </div>
              </>
            )}
            {isPost && (
              <div className="space-y-1.5">
                <Label>Data pubblicazione</Label>
                <Input
                  type="datetime-local"
                  value={publishedAt ? publishedAt.slice(0, 16) : ''}
                  onChange={(e) => setPublishedAt(e.target.value)}
                />
              </div>
            )}
          </TabsContent>

          {isPost && (
            <TabsContent value="featured" className="space-y-4 pt-3">
              <div className="space-y-1.5">
                <Label>Immagine in evidenza</Label>
                <MediaField value={featured} onChange={setFeatured} />
                <p className="text-[10px] text-muted-foreground">Usata da widget Featured Image, OG image, archivi</p>
              </div>
            </TabsContent>
          )}

          {isPage && (
            <TabsContent value="protect" className="space-y-4 pt-3">
              <div className="space-y-1.5">
                <Label>Password (opzionale)</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Lascia vuoto per accesso libero" />
                <p className="text-[10px] text-muted-foreground">Protegge la pagina con una password (richiesta per visitarla)</p>
              </div>
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
