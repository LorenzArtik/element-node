import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Tag } from 'lucide-react';
import { TaxonomyManager } from './manager';

export const dynamic = 'force-dynamic';

export default async function TaxonomiesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { id } = await params;
  const pt = await prisma.postType.findUnique({ where: { id } });
  if (!pt) notFound();
  const taxonomies = await prisma.taxonomy.findMany({
    where: { postTypeId: pt.id },
    include: { _count: { select: { terms: true } }, terms: { include: { _count: { select: { posts: true } } }, orderBy: { name: 'asc' } } },
    orderBy: { name: 'asc' },
  });
  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <Button asChild variant="ghost" size="sm">
        <Link href="/admin/post-types"><ArrowLeft className="h-4 w-4" /> Tipi di contenuto</Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tassonomie · {pt.plural}</h1>
        <p className="text-muted-foreground">Categorie, tag e altre tassonomie associate a questo tipo di contenuto</p>
      </div>

      <TaxonomyManager postTypeId={pt.id} initial={taxonomies.map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        plural: t.plural,
        hierarchical: t.hierarchical,
        termsCount: t._count.terms,
        terms: t.terms.map((tm) => ({ id: tm.id, name: tm.name, slug: tm.slug, postsCount: tm._count.posts })),
      }))} />
    </div>
  );
}
