import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { lockExists } from '@/lib/install-status';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  name: z.string().min(1).max(120),
  tagline: z.string().max(200).optional().default(''),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#92003b'),
  anthropicKey: z.string().optional().default(''),
  anthropicModel: z.string().optional().default('claude-sonnet-5'),
});

export async function POST(req: Request) {
  if (lockExists()) {
    return NextResponse.json({ error: 'already_installed' }, { status: 409 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const { name, tagline, primaryColor, anthropicKey, anthropicModel } = parsed.data;

  const existing = await prisma.site.findFirst().catch(() => null);
  const baseTheme = {
    colors: {
      primary: primaryColor,
      secondary: '#1f2937',
      accent: '#0ea5e9',
      text: '#111827',
      background: '#ffffff',
    },
    typography: { headingFont: 'Inter', bodyFont: 'Inter' },
  };
  const integrations = {
    ...(anthropicKey ? { anthropic: { apiKey: anthropicKey, model: anthropicModel } } : {}),
  };

  if (existing) {
    await prisma.site.update({
      where: { id: existing.id },
      data: { name, tagline, theme: baseTheme as never, integrations: integrations as never },
    });
  } else {
    await prisma.site.create({
      data: { name, tagline, theme: baseTheme as never, integrations: integrations as never },
    });
  }
  return NextResponse.json({ ok: true });
}
