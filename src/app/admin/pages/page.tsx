import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, Edit3, Eye, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { DeletePageButton } from './delete-button';
import { DuplicateButton } from '@/components/admin/DuplicateButton';
import { AiFirstRun } from '@/components/admin/AiFirstRun';
import { t } from '@/lib/admin-i18n';

export const dynamic = 'force-dynamic';

const PER_PAGE = 12;

export default async function PagesPage({ searchParams }: { searchParams: Promise<{ q?: string; p?: string }> }) {
  const { q = '', p = '1' } = await searchParams;
  const pageNum = Math.max(1, parseInt(p, 10) || 1);
  const where = q
    ? { OR: [{ title: { contains: q } }, { slug: { contains: q } }] }
    : {};
  const [total, pages] = await Promise.all([
    prisma.page.count({ where }),
    prisma.page.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { author: true },
      skip: (pageNum - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const pageUrl = (n: number) => `/admin/pages?${new URLSearchParams({ ...(q ? { q } : {}), p: String(n) })}`;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('Pagine', 'Pages')}</h1>
          <p className="text-muted-foreground">{t(`${total} pagine totali`, `${total} total pages`)}</p>
        </div>
        <Button asChild size="lg">
          <Link href="/admin/pages/new"><Plus className="h-4 w-4" /> {t('Nuova pagina', 'New page')}</Link>
        </Button>
      </div>

      <form method="get" action="/admin/pages" className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          defaultValue={q}
          placeholder={t('Cerca per titolo o slug…', 'Search by title or slug…')}
          className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
        />
      </form>

      <Card>
        <div className="divide-y">
          <div className="grid grid-cols-[1fr_120px_120px_180px_120px] gap-4 px-6 py-3 text-xs font-medium uppercase text-muted-foreground bg-muted/40">
            <div>{t('Titolo', 'Title')}</div>
            <div>{t('Stato', 'Status')}</div>
            <div>{t('Autore', 'Author')}</div>
            <div>{t('Aggiornata', 'Updated')}</div>
            <div className="text-right">{t('Azioni', 'Actions')}</div>
          </div>
          {pages.length === 0 ? (
            q ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-4">{t(`Nessuna pagina trovata per «${q}».`, `No pages found for “${q}”.`)}</p>
                <Button asChild><Link href="/admin/pages">{t('Mostra tutte', 'Show all')}</Link></Button>
              </div>
            ) : (
              <div className="py-12 px-6">
                <AiFirstRun />
              </div>
            )
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
                  <Button asChild variant="ghost" size="icon" title={t("Modifica nell'editor", 'Edit in editor')}>
                    <Link href={`/editor/${p.id}`}><Edit3 className="h-4 w-4" /></Link>
                  </Button>
                  <Button asChild variant="ghost" size="icon" title={t('Anteprima', 'Preview')}>
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t(`Pagina ${pageNum} di ${totalPages}`, `Page ${pageNum} of ${totalPages}`)}</span>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" disabled={pageNum <= 1}>
              <Link href={pageUrl(Math.max(1, pageNum - 1))} aria-disabled={pageNum <= 1}><ChevronLeft className="h-4 w-4" /> {t('Precedente', 'Previous')}</Link>
            </Button>
            <Button asChild variant="outline" size="sm" disabled={pageNum >= totalPages}>
              <Link href={pageUrl(Math.min(totalPages, pageNum + 1))} aria-disabled={pageNum >= totalPages}>{t('Successiva', 'Next')} <ChevronRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
