import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cleanText, handlePing, originAllowed } from '@/lib/cta-ping';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  tipo: z.enum(['demo', 'webinar']),
  pagina: z.string().optional(), fonte: z.string().optional(), campagna: z.string().optional(), contenuto: z.string().optional(),
}).strip();

/** POST /api/cta-ping: contatore anonimo di clic (nessun cookie, nessun dato salvato). Risponde sempre in fretta. */
export async function POST(req: NextRequest) {
  if (!originAllowed(req.headers.get('origin'), req.headers.get('referer'))) return new NextResponse(null, { status: 403 });
  let raw = '';
  try { raw = (await req.text()).slice(0, 4000); } catch { return new NextResponse(null, { status: 400 }); }
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return new NextResponse(null, { status: 400 }); }
  const r = schema.safeParse(json);
  if (!r.success) return new NextResponse(null, { status: 400 });
  const d = r.data;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || '';
  const esito = handlePing(
    { tipo: d.tipo, pagina: cleanText(d.pagina), fonte: cleanText(d.fonte), campagna: cleanText(d.campagna), contenuto: cleanText(d.contenuto) },
    ip, req.headers.get('user-agent') || '',
  );
  return new NextResponse(null, { status: esito === 'rate-limited' ? 429 : 204 });
}
