import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { lockExists } from '@/lib/install-status';
import { themeSchema, integrationsSchema } from '@/lib/theme';

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
  // Theme e integrations DEVONO passare dagli schemi: getSiteSettings() li valida
  // con safeParse e una shape non conforme fa cadere tutto sui default (chiave
  // AI e colore del wizard persi silenziosamente).
  const baseTheme = themeSchema.parse({
    colors: {
      primary: primaryColor,
      primaryHover: darken(primaryColor),
    },
    typography: { scale: {} },
    layout: {},
    radius: {},
    buttons: {},
    forms: { focusColor: primaryColor },
  });
  const integrations = integrationsSchema.parse({
    recaptcha: {},
    smtp: {},
    brevo: {},
    ...(anthropicKey ? { anthropicApiKey: anthropicKey, anthropicModel } : {}),
  });

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

/** Scurisce un colore hex #rrggbb (per l'hover derivato dal primary del wizard). */
function darken(hex: string, factor = 0.82): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
