import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { nanoid } from 'nanoid';
import { processImage } from '@/lib/image-pipeline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file mancante' }, { status: 400 });

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const id = nanoid(12);
  const safeName = `${id}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  const path = join(UPLOAD_DIR, safeName);
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path, buf);

  const url = `/uploads/${safeName}`;
  const isImage = file.type.startsWith('image/') && file.type !== 'image/svg+xml' && file.type !== 'image/gif';

  let width: number | null = null;
  let height: number | null = null;
  let variants: Record<string, string> | null = null;

  if (isImage) {
    const result = await processImage(buf, id);
    width = result.width || null;
    height = result.height || null;
    variants = Object.keys(result.variants).length ? result.variants as Record<string, string> : null;
  }

  const item = await prisma.media.create({
    data: {
      filename: file.name,
      url,
      mime: file.type || 'application/octet-stream',
      size: buf.length,
      width,
      height,
      variants: variants as never,
      uploaderId: session.user.id,
    },
  });
  return NextResponse.json(item);
}
