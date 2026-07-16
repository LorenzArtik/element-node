import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { unlink } from 'node:fs/promises';
import { join, basename } from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads';

const patchSchema = z.object({
  filename: z.string().min(1).max(255).optional(),
  alt: z.string().max(500).nullable().optional(),
});

/** GET singolo media con info "used in" (referenze nelle pagine/themeBlocks/posts). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Trova riferimenti dell'url in pages/themeBlocks/posts (basic: scan JSON content per substring)
  const usedIn: { kind: 'page' | 'themeBlock' | 'post'; id: string; title: string }[] = [];
  const pages = await prisma.page.findMany({ select: { id: true, title: true, content: true } });
  for (const p of pages) {
    if (JSON.stringify(p.content).includes(media.url)) {
      usedIn.push({ kind: 'page', id: p.id, title: p.title });
    }
  }
  const tbs = await prisma.themeBlock.findMany({ select: { id: true, name: true, content: true } });
  for (const t of tbs) {
    if (JSON.stringify(t.content).includes(media.url)) {
      usedIn.push({ kind: 'themeBlock', id: t.id, title: t.name });
    }
  }
  const posts = await prisma.post.findMany({ select: { id: true, title: true, content: true, featured: true } });
  for (const p of posts) {
    if ((p.content && JSON.stringify(p.content).includes(media.url)) || p.featured === media.url) {
      usedIn.push({ kind: 'post', id: p.id, title: p.title });
    }
  }

  return NextResponse.json({ ...media, usedIn });
}

/** PATCH — rinomina filename / aggiorna alt */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = patchSchema.parse(await req.json());

  const data: { filename?: string; alt?: string | null } = {};
  if (body.filename) data.filename = body.filename;
  if (body.alt !== undefined) data.alt = body.alt;

  const updated = await prisma.media.update({ where: { id }, data });
  return NextResponse.json(updated);
}

/** DELETE — cancella file disco + DB row. ?force=1 per skippare check riferimenti. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const force = new URL(req.url).searchParams.get('force') === '1';
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Check uso (a meno di force)
  if (!force) {
    const pagesUsing = await prisma.page.count({
      where: { content: { string_contains: media.url } as never },
    }).catch(() => 0);
    if (pagesUsing > 0) {
      return NextResponse.json({
        error: 'in_use',
        message: `Questo media è usato in ${pagesUsing} pagina/e. Aggiungi ?force=1 per cancellare comunque.`,
        usedInPages: pagesUsing,
      }, { status: 409 });
    }
  }

  // Cancella file disco (best-effort; variants tutte sotto stesso UPLOAD_DIR)
  try {
    const filename = basename(media.url);
    await unlink(join(UPLOAD_DIR, filename));
  } catch {}
  // Variants WebP
  if (media.variants && typeof media.variants === 'object') {
    for (const v of Object.values(media.variants as Record<string, string>)) {
      try {
        if (typeof v === 'string') await unlink(join(UPLOAD_DIR, basename(v)));
      } catch {}
    }
  }

  await prisma.media.delete({ where: { id } });
  return NextResponse.json({ ok: true, deleted: id });
}
