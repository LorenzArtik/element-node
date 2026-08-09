'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { slugify } from '@/lib/utils';
import { t } from '@/lib/admin-i18n';

export default function NewPagePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [isHomepage, setIsHomepage] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onCreate() {
    if (!title.trim()) {
      toast.error(t('Inserisci un titolo', 'Enter a title'));
      return;
    }
    setLoading(true);
    const res = await fetch('/api/pages', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, slug: slug || slugify(title), isHomepage }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error(t('Errore durante la creazione', 'Error while creating'));
      return;
    }
    const data = await res.json();
    toast.success(t('Pagina creata', 'Page created'));
    router.push(`/editor/${data.id}`);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/admin/pages"><ArrowLeft className="h-4 w-4" /> {t('Torna alle pagine', 'Back to pages')}</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{t('Nuova pagina', 'New page')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>{t('Titolo', 'Title')}</Label>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slug) setSlug(slugify(e.target.value));
              }}
              placeholder={t('es. Chi siamo', 'e.g. About us')}
            />
          </div>
          <div className="space-y-2">
            <Label>Slug (URL)</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/</span>
              <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder={t('chi-siamo', 'about-us')} />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label>{t('Imposta come homepage', 'Set as homepage')}</Label>
              <p className="text-xs text-muted-foreground">{t('Sostituirà la homepage attuale', 'This will replace the current homepage')}</p>
            </div>
            <Switch checked={isHomepage} onCheckedChange={setIsHomepage} />
          </div>
          <div className="flex gap-3">
            <Button onClick={onCreate} disabled={loading} size="lg" className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Crea e apri editor', 'Create and open editor')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
