import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { slugify } from '@/lib/utils';
import { emptyPage } from '@/lib/widgets-schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const published = url.searchParams.get('published');
  const limit = Number(url.searchParams.get('limit') ?? 20);

  const pages = await prisma.page.findMany({
    where: published ? { status: 'PUBLISHED' } : undefined,
    orderBy: { publishedAt: 'desc' },
    take: Math.min(limit, 100),
    select: { id: true, title: true, slug: true, seoDesc: true, ogImage: true, publishedAt: true },
  });
  return NextResponse.json(pages);
}

const createSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  isHomepage: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const { title, isHomepage } = parsed.data;
  let slug = slugify(parsed.data.slug || title);
  // Ensure unique slug
  let suffix = 1;
  const base = slug;
  while (await prisma.page.findUnique({ where: { slug } })) {
    slug = `${base}-${++suffix}`;
  }

  if (isHomepage) {
    await prisma.page.updateMany({ where: { isHomepage: true }, data: { isHomepage: false } });
  }

  const page = await prisma.page.create({
    data: {
      title,
      slug,
      content: emptyPage() as never,
      authorId: session.user.id,
      isHomepage: !!isHomepage,
    },
  });

  return NextResponse.json(page);
}
