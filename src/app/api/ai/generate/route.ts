import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getAnthropic, getAiModel, SYSTEM_PROMPT_EDITOR } from '@/lib/ai';
import { getSiteSettings } from '@/lib/site-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const imageSchema = z.object({
  base64: z.string().min(10),
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
});

const bodySchema = z.object({
  prompt: z.string().min(1).max(8000),
  context: z.enum(['page', 'section', 'element']).optional(),
  current: z.unknown().optional(),
  /** Layout completo della pagina/post in lavorazione (per AI context) */
  pageLayout: z.unknown().optional(),
  /** Immagini di riferimento per Claude vision */
  images: z.array(imageSchema).max(5).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Body non valido', details: parsed.error.flatten() }, { status: 400 });

  const { prompt, context = 'page', current, pageLayout, images } = parsed.data;

  // Site context dal DB
  const site = await getSiteSettings().catch(() => null);

  const systemPrompt = buildSystemPrompt(site);
  const userBlocks = buildUserBlocks(prompt, context, current, pageLayout, images);

  try {
    const client = await getAnthropic();
    const model = await getAiModel();
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userBlocks }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'Risposta AI vuota' }, { status: 500 });
    }

    const cleaned = textBlock.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    const json = JSON.parse(cleaned);
    const kind = inferKind(json, context);
    return NextResponse.json({ kind, result: json });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function buildSystemPrompt(site: Awaited<ReturnType<typeof getSiteSettings>> | null): string {
  let prompt = SYSTEM_PROMPT_EDITOR;
  if (site) {
    const c = site.theme.colors;
    const t = site.theme.typography;
    prompt += `\n\n=== CONTESTO SITO ===\nNome sito: ${site.name}`;
    if (site.tagline) prompt += `\nTagline: ${site.tagline}`;
    prompt += `\n\n=== BRAND COLORS ===
- Primario: ${c.primary} (var --en-color-primary)
- Secondario: ${c.secondary} (var --en-color-secondary)
- Accent: ${c.accent}
- Testo: ${c.text}
- Background: ${c.background}
- Surface: ${c.surface}

=== TIPOGRAFIA ===
Font heading: ${t.fontHeading}
Font body: ${t.fontBody}
Peso heading: ${t.headingWeight}

REGOLA IMPORTANTE: usa QUESTI colori e font del brand. Quando metti un colore, preferisci le CSS variables come 'var(--en-color-primary)'. Mantieni coerenza visiva con il brand.`;
  }
  return prompt;
}

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

function buildUserBlocks(
  prompt: string,
  context: string,
  current: unknown,
  pageLayout: unknown,
  images: { base64: string; mediaType: string }[] | undefined,
): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  // Immagini per primo (vision)
  if (images?.length) {
    for (const img of images) {
      const base64 = img.base64.replace(/^data:image\/\w+;base64,/, '');
      blocks.push({
        type: 'image',
        source: { type: 'base64', media_type: img.mediaType, data: base64 },
      });
    }
    blocks.push({
      type: 'text',
      text: `Le immagini sopra sono RIFERIMENTI VISIVI forniti dall'utente. Analizzale e usale come ispirazione per il layout, palette, tipografia e contenuti.`,
    });
  }

  // Page layout context
  if (pageLayout) {
    blocks.push({
      type: 'text',
      text: `=== LAYOUT ATTUALE DELLA PAGINA ===\n${JSON.stringify(pageLayout, null, 2)}\n\nQuesto è il contenuto già presente. Quando aggiungi una nuova sezione, mantieni coerenza con stile e struttura esistenti.`,
    });
  }

  // Selected element/section context
  blocks.push({
    type: 'text',
    text: [
      `Contesto target: ${context}`,
      current ? `Elemento corrente:\n${JSON.stringify(current, null, 2)}` : 'Elemento corrente: vuoto',
      '',
      `RICHIESTA UTENTE: ${prompt}`,
      '',
      context === 'page'
        ? 'Genera UNA struttura sezione completa (oggetto con id, type:"section", settings, columns:[...]). Se la richiesta è di rigenerare l\'intera pagina, restituisci { sections: [...] }. SOLO JSON, no markdown fence.'
        : context === 'section'
        ? 'Modifica/sostituisci la sezione, restituisci oggetto sezione completo. SOLO JSON.'
        : 'Modifica le settings dell\'elemento, restituisci elemento completo. SOLO JSON.',
    ].join('\n'),
  });

  return blocks;
}

function inferKind(json: unknown, context: string): 'page' | 'section' | 'element' {
  if (typeof json === 'object' && json !== null) {
    const obj = json as Record<string, unknown>;
    if (Array.isArray(obj.sections)) return 'page';
    if (obj.type === 'section') return 'section';
    if (typeof obj.type === 'string') return 'element';
  }
  return context as 'page' | 'section' | 'element';
}
