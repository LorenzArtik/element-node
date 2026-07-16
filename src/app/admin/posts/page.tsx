import Link from 'next/link';
import { listPostTypes } from '@/lib/post-types';
import { listPosts } from '@/lib/posts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Plus, Edit3, Eye, FileText } from 'lucide-react';
import { CreatePostButton } from './create-button';
import { DeletePostButton } from './delete-button';
import { DuplicateButton } from '@/components/admin/DuplicateButton';

export const dynamic = 'force-dynamic';

export default async function PostsListPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const sp = await searchParams;
  const types = await listPostTypes();
  const activeType = sp.type || types[0]?.slug || 'post';
  const data = await listPosts({ postTypeSlug: activeType, perPage: 50, orderBy: 'updatedAt' });
  const currentType = types.find((t) => t.slug === activeType);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{currentType?.plural ?? 'Contenuti'}</h1>
          <p className="text-muted-foreground">{data.total} contenuti totali</p>
        </div>
        {currentType && <CreatePostButton postTypeSlug={currentType.slug} typeName={currentType.name} />}
      </div>

      {/* Tabs per post type */}
      <div className="flex gap-1 border-b">
        {types.map((t) => (
          <Link
            key={t.id}
            href={`/admin/posts?type=${t.slug}`}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              t.slug === activeType
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.plural}
          </Link>
        ))}
        <Link
          href="/admin/post-types"
          className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground ml-auto"
        >
          + Gestisci tipi
        </Link>
      </div>

      <Card>
        <div className="divide-y">
          <div className="grid grid-cols-[1fr_120px_120px_180px_120px] gap-4 px-6 py-3 text-xs font-medium uppercase text-muted-foreground bg-muted/40">
            <div>Titolo</div>
            <div>Stato</div>
            <div>Autore</div>
            <div>Aggiornato</div>
            <div className="text-right">Azioni</div>
          </div>
          {data.items.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">Nessun contenuto.</p>
              {currentType && <CreatePostButton postTypeSlug={currentType.slug} typeName={currentType.name} />}
            </div>
          ) : (
            data.items.map((p) => (
              <div key={p.id} className="grid grid-cols-[1fr_120px_120px_180px_120px] gap-4 items-center px-6 py-4 hover:bg-muted/40 transition-colors">
                <div>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-muted-foreground">/{p.postType.slug}/{p.slug}</div>
                </div>
                <Badge variant={p.status === 'PUBLISHED' ? 'success' : 'outline'}>{p.status}</Badge>
                <div className="text-sm">{p.author?.name ?? p.author?.email ?? '—'}</div>
                <div className="text-sm text-muted-foreground">{formatDate(p.updatedAt)}</div>
                <div className="flex justify-end gap-1">
                  <Button asChild variant="ghost" size="icon" title="Apri editor">
                    <Link href={`/editor/post/${p.id}`}><Edit3 className="h-4 w-4" /></Link>
                  </Button>
                  <Button asChild variant="ghost" size="icon" title="Anteprima">
                    <Link href={`/${p.postType.slug}/${p.slug}`} target="_blank"><Eye className="h-4 w-4" /></Link>
                  </Button>
                  <DuplicateButton endpoint={`/api/posts/${p.id}`} redirectTo="editor" />
                  <DeletePostButton id={p.id} title={p.title} />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
