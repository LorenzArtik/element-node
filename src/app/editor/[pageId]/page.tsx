import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import EditorShell from '@/components/editor/EditorShell';
import type { PageContent } from '@/lib/widgets-schema';

export const dynamic = 'force-dynamic';

export default async function EditorPage({ params }: { params: Promise<{ pageId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { pageId } = await params;
  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) notFound();

  return (
    <EditorShell
      pageId={page.id}
      title={page.title}
      slug={page.slug}
      status={page.status}
      content={(page.content as unknown as PageContent) ?? { sections: [] }}
      seo={{
        seoTitle: page.seoTitle ?? '',
        seoDesc: page.seoDesc ?? '',
        ogImage: page.ogImage ?? '',
      }}
      pageMeta={{
        isHomepage: page.isHomepage,
        password: page.password,
        settings: (page.settings as Record<string, unknown>) ?? {},
      }}
    />
  );
}
