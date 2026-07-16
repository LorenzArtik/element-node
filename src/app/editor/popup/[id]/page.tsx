import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import EditorShell from '@/components/editor/EditorShell';
import type { PageContent } from '@/lib/widgets-schema';

export const dynamic = 'force-dynamic';

export default async function PopupEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { id } = await params;
  const row = await prisma.popup.findUnique({ where: { id } });
  if (!row) notFound();
  return (
    <EditorShell
      entityKind="popup"
      pageId={row.id}
      title={row.name}
      slug=""
      status={row.status}
      content={(row.content as unknown as PageContent) ?? { sections: [] }}
    />
  );
}
