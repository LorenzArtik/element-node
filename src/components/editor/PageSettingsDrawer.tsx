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
import { t } from '@/lib/admin-i18n';

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
      toast.success(t('Impostazioni salvate', 'Settings saved'));
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      toast.error(t('Errore', 'Error'), { description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isPage ? t('Impostazioni pagina', 'Page settings') : isPost ? t('Impostazioni articolo', 'Post settings') : t(`Impostazioni ${entityKind}`, `${entityKind} settings`)}</DialogTitle>
          <DialogDescription>{t('Titolo, URL, stato di pubblicazione, attributi avanzati', 'Title, URL, publication status, advanced attributes')}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">{t('Generale', 'General')}</TabsTrigger>
            {(isPage || isPost) && <TabsTrigger value="publish">{t('Pubblicazione', 'Publishing')}</TabsTrigger>}
            {isPost && <TabsTrigger value="featured">{t('In evidenza', 'Featured')}</TabsTrigger>}
            {isPage && <TabsTrigger value="protect">{t('Protezione', 'Protection')}</TabsTrigger>}
          </TabsList>

          <TabsContent value="general" className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label>{t('Titolo', 'Title')}</Label>
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
                <Label>{t('Estratto', 'Excerpt')}</Label>
                <Textarea rows={3} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder={t('Breve descrizione (per archive list)', 'Short description (for archive lists)')} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="publish" className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label>{t('Stato', 'Status')}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">{t('Bozza', 'Draft')}</SelectItem>
                  <SelectItem value="PUBLISHED">{t('Pubblicato', 'Published')}</SelectItem>
                  <SelectItem value="PRIVATE">{t('Privato', 'Private')}</SelectItem>
                  {isPost && <SelectItem value="SCHEDULED">{t('Programmato', 'Scheduled')}</SelectItem>}
                  <SelectItem value="TRASH">{t('Cestino', 'Trash')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isPage && (
              <>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>{t('Imposta come homepage', 'Set as homepage')}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('Sostituirà la homepage corrente', 'This will replace the current homepage')}</p>
                </div>
                <Switch checked={isHomepage} onCheckedChange={setIsHomepage} />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="text-xs">{t('Nascondi header', 'Hide header')}</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t("La pagina esce senza l'header del tema (landing con chrome proprio)", 'The page renders without the theme header (landing with its own chrome)')}</p>
                </div>
                <Switch checked={hideHeader} onCheckedChange={setHideHeader} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="text-xs">{t('Nascondi footer', 'Hide footer')}</Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t('La pagina esce senza il footer del tema', 'The page renders without the theme footer')}</p>
                </div>
                <Switch checked={hideFooter} onCheckedChange={setHideFooter} />
              </div>
              </>
            )}
            {isPost && (
              <div className="space-y-1.5">
                <Label>{t('Data pubblicazione', 'Publish date')}</Label>
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
                <Label>{t('Immagine in evidenza', 'Featured image')}</Label>
                <MediaField value={featured} onChange={setFeatured} />
                <p className="text-[10px] text-muted-foreground">{t('Usata da widget Featured Image, OG image, archivi', 'Used by the Featured Image widget, OG image, archives')}</p>
              </div>
            </TabsContent>
          )}

          {isPage && (
            <TabsContent value="protect" className="space-y-4 pt-3">
              <div className="space-y-1.5">
                <Label>{t('Password (opzionale)', 'Password (optional)')}</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('Lascia vuoto per accesso libero', 'Leave empty for open access')} />
                <p className="text-[10px] text-muted-foreground">{t('Protegge la pagina con una password (richiesta per visitarla)', 'Protects the page with a password (required to view it)')}</p>
              </div>
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Annulla', 'Cancel')}</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('Salva', 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
