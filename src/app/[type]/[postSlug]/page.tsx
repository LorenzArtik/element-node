import { notFound, redirect as redirectTo } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { getPostBySlug } from '@/lib/posts';
import { getSiteSettings } from '@/lib/site-settings';
import { getPostTypeBySlug } from '@/lib/post-types';
import { findRedirect, incrementHits } from '@/lib/redirects';
import { buildJsonLd } from '@/lib/seo';
import { PublicShell } from '@/components/public/PublicShell';
import MaintenancePage from '../../maintenance/page';
import type { PageContent } from '@/lib/widgets-schema';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ type: string; postSlug: string }> }): Promise<Metadata> {
  const { type, postSlug } = await params;
  // Pagine con slug annidato (es. "servizi/smart-agency-cloud") hanno priorità
  const nested = await prisma.page.findUnique({ where: { slug: `${type}/${postSlug}` } });
  if (nested) {
    return {
      title: nested.seoTitle || nested.title,
      description: nested.seoDesc || undefined,
      openGraph: {
        title: nested.seoTitle || nested.title,
        description: nested.seoDesc || undefined,
        images: nested.ogImage ? [nested.ogImage] : undefined,
      },
    };
  }
  const post = await getPostBySlug(type, postSlug);
  if (!post) return {};
  return {
    title: post.seoTitle || post.title,
    description: post.seoDesc || post.excerpt || undefined,
    openGraph: {
      title: post.seoTitle || post.title,
      description: post.seoDesc || post.excerpt || undefined,
      images: post.ogImage || post.featured ? [post.ogImage || post.featured!] : undefined,
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
    },
    robots: post.noindex ? { index: false } : undefined,
  };
}

export default async function SinglePostPage({ params }: { params: Promise<{ type: string; postSlug: string }> }) {
  const { type, postSlug } = await params;

  const r = await findRedirect(`/${type}/${postSlug}`);
  if (r) { incrementHits(r.fromPath); redirectTo(r.toPath); }

  const site = await getSiteSettings();
  if (site.maintenance) return <MaintenancePage />;

  // Pagine statiche con slug annidato (es. "servizi/smart-agency-cloud"): priorità sui post
  const nestedPage = await prisma.page.findUnique({ where: { slug: `${type}/${postSlug}` } });
  if (nestedPage && nestedPage.status === 'PUBLISHED') {
    return (
      <PublicShell
        content={nestedPage.content as unknown as PageContent}
        page={{ title: nestedPage.title, slug: nestedPage.slug, isHomepage: nestedPage.isHomepage, settings: nestedPage.settings as Record<string, unknown> | null }}
        path={`/${type}/${postSlug}`}
      />
    );
  }

  const pt = await getPostTypeBySlug(type);
  if (!pt || !pt.publicSingle) notFound();

  const post = await getPostBySlug(type, postSlug);
  if (!post || (post.status !== 'PUBLISHED' && post.status !== 'PRIVATE')) notFound();

  // Cerca template SINGLE associato
  let templateContent: PageContent | null = null;
  if (pt.defaultSingleTemplateId) {
    const tmpl = await prisma.template.findUnique({ where: { id: pt.defaultSingleTemplateId } });
    if (tmpl) templateContent = tmpl.content as unknown as PageContent;
  }

  // Priorità: post.content > template > fallback default
  const hasOwnContent = post.content && (post.content as unknown as PageContent).sections?.length;
  const content: PageContent = hasOwnContent
    ? (post.content as unknown as PageContent)
    : templateContent ?? defaultSinglePostFallback();

    const baseUrl = (process.env.AUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
  const ldData = buildJsonLd({
    type: 'Article',
    url: `${baseUrl}/${type}/${postSlug}`,
    siteName: site.name,
    title: post.title,
    description: post.seoDesc || post.excerpt || undefined,
    image: post.ogImage || post.featured,
    publishedAt: post.publishedAt?.toISOString(),
    author: post.author ? { name: post.author.name ?? post.author.email } : null,
    breadcrumbs: [
      { name: 'Home', url: baseUrl },
      { name: post.postType.plural, url: `${baseUrl}/${type}` },
      { name: post.title, url: `${baseUrl}/${type}/${postSlug}` },
    ],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldData) }} />
    <PublicShell
      content={content}
      page={{ title: post.title, slug: post.slug, isHomepage: false }}
      path={`/${type}/${postSlug}`}
      post={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        contentHtml: post.contentText,
        featured: post.featured,
        publishedAt: post.publishedAt?.toISOString() ?? null,
        postType: { slug: post.postType.slug, name: post.postType.name },
        author: post.author ? {
          id: post.author.id,
          name: post.author.name,
          email: post.author.email,
          avatarUrl: post.author.avatarUrl,
          bio: null,
        } : null,
        terms: post.terms.map((pt) => ({
          id: pt.term.id,
          name: pt.term.name,
          slug: pt.term.slug,
          taxonomy: { slug: pt.term.taxonomy.slug, name: pt.term.taxonomy.name },
        })),
      }}
    />
    </>
  );
}

function defaultSinglePostFallback(): PageContent {
  return {
    sections: [{
      id: 's_post', type: 'section',
      settings: { padding: '60px 20px', background: 'transparent' },
      columns: [{
        id: 'c_post', type: 'column', width: 100,
        settings: { padding: '0', align: 'left' },
        elements: [
          { id: 'e_fi', type: 'featured-image', settings: { ratio: '21/9', radius: '16px' } },
          { id: 'e_sp1', type: 'spacer', settings: { height: 32 } },
          { id: 'e_t', type: 'page-title', settings: { tag: 'h1', size: '56px', weight: '800', align: 'left' } },
          { id: 'e_sp2', type: 'spacer', settings: { height: 16 } },
          { id: 'e_m', type: 'post-meta', settings: { showDate: true, showAuthor: true, showCategories: true, separator: '·' } },
          { id: 'e_sp3', type: 'spacer', settings: { height: 24 } },
          { id: 'e_e', type: 'post-excerpt', settings: { size: '20px', lineHeight: '1.6' } },
          { id: 'e_sp4', type: 'spacer', settings: { height: 24 } },
          { id: 'e_c', type: 'post-content', settings: { proseSize: 'md' } },
          { id: 'e_sp5', type: 'spacer', settings: { height: 40 } },
          { id: 'e_a', type: 'author-box', settings: { layout: 'card', showAvatar: true, showBio: true } },
        ],
      }],
    }],
  };
}
