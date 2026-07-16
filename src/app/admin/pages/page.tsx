import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, Edit3, Eye, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { DeletePageButton } from './delete-button';
import { DuplicateButton } from '@/components/admin/DuplicateButton';

export const dynamic = 'force-dynamic';

export default async function PagesPage() {
  const pages = await prisma.page.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { author: true },
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pagine</h1>
          <p className="text-muted-foreground">{pages.length} pagine totali</p>
        </div>
        <Button asChild size="lg">
          <Link href="/admin/pages/new"><Plus className="h-4 w-4" /> Nuova pagina</Link>
        </Button>
      </div>

      <Card>
        <div className="divide-y">
          <div className="grid grid-cols-[1fr_120px_120px_180px_120px] gap-4 px-6 py-3 text-xs font-medium uppercase text-muted-foreground bg-muted/40">
            <div>Titolo</div>
            <div>Stato</div>
            <div>Autore</div>
            <div>Aggiornata</div>
            <div className="text-right">Azioni</div>
          </div>
          {pages.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-4">Non hai ancora pagine.</p>
              <Button asChild><Link href="/admin/pages/new">Crea la prima</Link></Button>
            </div>
          ) : (
            pages.map((p) => (
              <div key={p.id} className="grid grid-cols-[1fr_120px_120px_180px_120px] gap-4 items-center px-6 py-4 hover:bg-muted/40 transition-colors">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {p.title}
                    {p.isHomepage && <Badge variant="secondary">Home</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">/{p.slug}</div>
                </div>
                <div><Badge variant={p.status === 'PUBLISHED' ? 'success' : 'outline'}>{p.status}</Badge></div>
                <div className="text-sm">{p.author.name ?? p.author.email}</div>
                <div className="text-sm text-muted-foreground">{formatDate(p.updatedAt)}</div>
                <div className="flex items-center justify-end gap-1">
                  <Button asChild variant="ghost" size="icon" title="Modifica nell'editor">
                    <Link href={`/editor/${p.id}`}><Edit3 className="h-4 w-4" /></Link>
                  </Button>
                  <Button asChild variant="ghost" size="icon" title="Anteprima">
                    <Link href={`/${p.slug === 'home' ? '' : p.slug}`} target="_blank"><Eye className="h-4 w-4" /></Link>
                  </Button>
                  <DuplicateButton endpoint={`/api/pages/${p.id}`} redirectTo="editor" />
                  <DeletePageButton id={p.id} title={p.title} />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
