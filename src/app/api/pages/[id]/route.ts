import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { materializeInlineForms } from '@/lib/materialize-forms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  title: z.string().optional(),
  slug: z.string().optional(),
  content: z.unknown().optional(),
  settings: z.unknown().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'PRIVATE', 'TRASH']).optional(),
  isHomepage: z.boolean().optional(),
  password: z.string().nullable().optional(),
  seoTitle: z.string().nullable().optional(),
  seoDesc: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(page);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (data.status === 'PUBLISHED') {
    const existing = await prisma.page.findUnique({ where: { id } });
    if (existing && !existing.publishedAt) data.publishedAt = new Date();
  }

  // Save revision before overwriting content
  if (parsed.data.content) {
    const pageRow = await prisma.page.findUnique({ where: { id }, select: { title: true } });
    await materializeInlineForms(parsed.data.content as never, (parsed.data as { title?: string }).title ?? pageRow?.title ?? 'Pagina');
    const previous = await prisma.page.findUnique({ where: { id } });
    if (previous) {
      await prisma.revision.create({
        data: { pageId: id, content: previous.content as never },
      });
    }
  }

  const updated = await prisma.page.update({ where: { id }, data: data as never });
  return NextResponse.json(updated);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Duplicate page
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const { id } = await params;
    const src = await prisma.page.findUnique({ where: { id } });
    if (!src) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    let slug = `${src.slug}-copia`;
    let n = 1;
    while (await prisma.page.findUnique({ where: { slug } })) {
      n++;
      slug = `${src.slug}-copia-${n}`;
    }
    const created = await prisma.page.create({
      data: {
        title: `${src.title} (copia)`,
        slug,
        status: 'DRAFT',
        content: src.content as never,
        settings: src.settings as never,
        seoTitle: src.seoTitle,
        seoDesc: src.seoDesc,
        ogImage: src.ogImage,
        authorId: session.user.id,
        isHomepage: false,
      },
    });
    return NextResponse.json(created);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  await prisma.page.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
