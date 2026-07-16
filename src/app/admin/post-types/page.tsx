import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import { listPostTypes } from '@/lib/post-types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings2, FileText, Layers as LayersIcon } from 'lucide-react';
import { CreatePostTypeButton } from './create-button';
import { DeletePostTypeButton } from './delete-button';
import { DuplicateButton } from '@/components/admin/DuplicateButton';

export const dynamic = 'force-dynamic';

export default async function PostTypesPage() {
  const types = await listPostTypes();
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tipi di contenuto</h1>
          <p className="text-muted-foreground">Crea Custom Post Types (es. articoli, prodotti, eventi)</p>
        </div>
        <CreatePostTypeButton />
      </div>

      <Card>
        <div className="divide-y">
          <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-6 py-3 text-xs font-medium uppercase text-muted-foreground bg-muted/40">
            <div>Tipo</div>
            <div>URL pattern</div>
            <div>Supporta</div>
            <div className="text-right">Azioni</div>
          </div>
          {types.map((t) => {
            const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[t.icon] ?? FileText;
            return (
              <div key={t.id} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 items-center px-6 py-4 hover:bg-muted/40">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {t.plural}
                    <span className="text-xs text-muted-foreground">/{t.slug}</span>
                  </div>
                  {t.description && <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>}
                </div>
                <div className="text-xs font-mono text-muted-foreground">{t.urlPattern}</div>
                <div className="flex flex-wrap gap-1">
                  {t.supports.map((s) => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                </div>
                <div className="flex gap-1">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/posts?type=${t.slug}`}>Apri lista</Link>
                  </Button>
                  <Button asChild variant="ghost" size="icon" title="Tassonomie">
                    <Link href={`/admin/post-types/${t.id}/taxonomies`}><LayersIcon className="h-4 w-4" /></Link>
                  </Button>
                  <Button asChild variant="ghost" size="icon" title="Impostazioni">
                    <Link href={`/admin/post-types/${t.id}`}><Settings2 className="h-4 w-4" /></Link>
                  </Button>
                  <DuplicateButton endpoint={`/api/post-types/${t.id}`} />
                  {t.slug !== 'post' && <DeletePostTypeButton id={t.id} name={t.plural} />}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
