import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getAnthropic, getAiModel } from '@/lib/ai';
import { getSiteSettings } from '@/lib/site-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  title: z.string().max(300).default(''),
  slug: z.string().max(300).default(''),
  /** Sezioni della pagina (JSON dell'editor) da cui estrarre il testo */
  content: z.unknown().optional(),
  focusKeyword: z.string().max(120).optional(),
});

/** Campi testuali noti dei widget: raccolti ricorsivamente per dare contesto all'AI. */
const TEXT_KEYS = new Set([
  'text', 'html', 'title', 'subtitle', 'label', 'caption', 'content',
  'description', 'excerpt', 'author', 'role', 'prefix', 'suffix', 'alt',
]);

function extractText(node: unknown, out: string[], depth = 0): void {
  if (depth > 12 || out.join(' ').length > 9000) return;
  if (Array.isArray(node)) {
    for (const item of node) extractText(item, out, depth + 1);
    return;
  }
  if (typeof node !== 'object' || node === null) return;
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (typeof v === 'string' && TEXT_KEYS.has(k) && v.trim()) {
      // strip tag html inline
      const plain = v.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (plain) out.push(plain);
    } else if (typeof v === 'object' && v !== null) {
      extractText(v, out, depth + 1);
    }
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Body non valido', details: parsed.error.flatten() }, { status: 400 });
  }
  const { title, slug, content, focusKeyword } = parsed.data;

  const texts: string[] = [];
  extractText(content, texts);
  const pageText = texts.join('\n').slice(0, 9000);

  const site = await getSiteSettings().catch(() => null);

  const system = `Sei un esperto SEO. Dato il contenuto di una pagina web, produci i meta tag ottimali.
Rispondi SOLO con JSON valido, senza markdown fence:
{ "seoTitle": "...", "seoDesc": "...", "focusKeyword": "..." }

Regole:
- seoTitle: max 60 caratteri, include il concetto principale della pagina; se il nome del sito è corto puoi chiuderlo con " | <nome sito>" restando nei 60.
- seoDesc: 140-155 caratteri, frase compiuta e invogliante con una call-to-action implicita. Niente elenco di keyword.
- focusKeyword: la keyword principale (2-4 parole) con cui la pagina dovrebbe posizionarsi.
- SCRIVI NELLA STESSA LINGUA del contenuto della pagina.
- Non inventare fatti non presenti nel contenuto.`;

  const user = [
    site ? `Sito: ${site.name}${site.tagline ? ` — ${site.tagline}` : ''}` : '',
    `Titolo pagina: ${title || '(senza titolo)'}`,
    `Slug: /${slug}`,
    focusKeyword ? `Focus keyword indicata dall'utente (rispettala): ${focusKeyword}` : '',
    '',
    '=== CONTENUTO PAGINA ===',
    pageText || '(pagina vuota: basati su titolo e slug)',
  ].filter(Boolean).join('\n');

  try {
    const client = await getAnthropic();
    const model = await getAiModel();
    // max_tokens generoso: i modelli recenti ragionano prima di rispondere e il
    // budget deve coprire anche quello, non solo il JSON finale.
    const response = await client.messages.create({
      model,
      max_tokens: 2000,
      system,
      messages: [{ role: 'user', content: user }],
    });
    const text = response.content
      .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
      .map((b) => b.text)
      .join('');
    if (!text.trim()) {
      return NextResponse.json({ error: 'Risposta AI vuota' }, { status: 500 });
    }
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    const json = JSON.parse(cleaned) as { seoTitle?: string; seoDesc?: string; focusKeyword?: string };
    return NextResponse.json({
      seoTitle: (json.seoTitle || '').slice(0, 70),
      seoDesc: (json.seoDesc || '').slice(0, 170),
      focusKeyword: (json.focusKeyword || '').slice(0, 80),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
