import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import EditorShell from '@/components/editor/EditorShell';
import type { PageContent } from '@/lib/widgets-schema';

export const dynamic = 'force-dynamic';

export default async function PostEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id }, include: { postType: true } });
  if (!post) notFound();
  return (
    <EditorShell
      entityKind="post"
      pageId={post.id}
      title={post.title}
      slug={post.slug}
      status={post.status}
      content={(post.content as unknown as PageContent) ?? { sections: [] }}
      postTypeSlug={post.postType.slug}
      seo={{
        seoTitle: post.seoTitle ?? '',
        seoDesc: post.seoDesc ?? '',
        ogImage: post.ogImage ?? '',
        noindex: post.noindex,
      }}
      pageMeta={{
        featured: post.featured,
        excerpt: post.excerpt,
        publishedAt: post.publishedAt?.toISOString() ?? null,
      }}
    />
  );
}
