import { notFound, redirect as redirectTo } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { PublicShell } from '@/components/public/PublicShell';
import { getSiteSettings } from '@/lib/site-settings';
import { getPostTypeBySlug } from '@/lib/post-types';
import { findRedirect, incrementHits } from '@/lib/redirects';
import MaintenancePage from '../maintenance/page';
import type { PageContent } from '@/lib/widgets-schema';

export const dynamic = 'force-dynamic';

const RESERVED = new Set(['admin', 'login', 'editor', 'api', 'uploads', 'maintenance']);

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params;
  const pt = await getPostTypeBySlug(type);
  if (pt && pt.publicArchive) {
    return { title: pt.plural, description: pt.description ?? undefined };
  }
  const page = await prisma.page.findUnique({ where: { slug: type } });
  if (!page) return {};
  return {
    title: page.seoTitle || page.title,
    description: page.seoDesc || undefined,
    openGraph: {
      title: page.seoTitle || page.title,
      description: page.seoDesc || undefined,
      images: page.ogImage ? [page.ogImage] : undefined,
    },
  };
}

export default async function PublicPage({ params }: { params: Promise<{ type: string }> }) {
  const { type: slug } = await params;
  if (RESERVED.has(slug)) notFound();

  // Check redirect rules prima di tutto
  const r = await findRedirect(`/${slug}`);
  if (r) {
    incrementHits(r.fromPath);
    redirectTo(r.toPath);
  }

  const site = await getSiteSettings();
  if (site.maintenance) return <MaintenancePage />;

  // Priority 1: archivio post type (es. /post → archivio Articoli)
  const pt = await getPostTypeBySlug(slug);
  if (pt && pt.publicArchive) {
    const content: PageContent = {
      sections: [{
        id: 's_arch', type: 'section',
        settings: { padding: '60px 20px', background: 'transparent' },
        columns: [{
          id: 'c_arch', type: 'column', width: 100,
          settings: { padding: '0', align: 'left' },
          elements: [
            { id: 'e_at', type: 'heading', settings: { text: pt.plural, tag: 'h1', size: '48px', weight: '800', align: 'left' } },
            { id: 'e_asp', type: 'spacer', settings: { height: 32 } },
            { id: 'e_alist', type: 'posts-list', settings: { postType: pt.slug, count: 24, layout: 'grid', columns: 3, showImage: true, showExcerpt: true, showMeta: true } },
          ],
        }],
      }],
    };
    return (
      <PublicShell
        content={content}
        page={{ title: pt.plural, slug, isHomepage: false }}
        path={`/${slug}`}
      />
    );
  }

  // Priority 2: pagina statica
  const page = await prisma.page.findUnique({ where: { slug } });
  if (!page || page.status !== 'PUBLISHED') notFound();

  return (
    <PublicShell
      content={page.content as unknown as PageContent}
      page={{ title: page.title, slug: page.slug, isHomepage: page.isHomepage, settings: page.settings as Record<string, unknown> | null }}
      path={`/${slug}`}
    />
  );
}
