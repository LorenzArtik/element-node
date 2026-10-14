/**
 * Contatore anonimo di clic su «Iscriviti» (webinar) e «Prenota una demo»:
 * a ogni clic arriva UN'email a Lorenzo. Dal 14/10/2026 anche l'iscrizione al webinar COMPLETATA
 * (tipo webinar_iscritto, mandato dal modulo Eventbrite incorporato nella landing): email
 * «[ISCRIZIONE WEBINAR · fonte]», fuori dal tetto giornaliero dei clic. Nessun cookie, nessuna scrittura su DB, nessun identificatore salvato:
 * solo contatori in memoria (si azzerano a mezzanotte Europe/Rome e al riavvio).
 * Disattivazione immediata: variabile d'ambiente CTA_PING_DISABLED=1 (poi riavvio).
 */
import { createHash, randomBytes } from 'crypto';
import { sendEmail } from '@/lib/email';

export const CTA_PING_TO = 'lorenzo.lometti@2000net.it';
const DAILY_LIMIT = Math.max(1, Number(process.env.CTA_PING_DAILY_LIMIT) || 30);
const SALT = randomBytes(16).toString('hex');           // solo in memoria
const ALLOWED_HOSTS = new Set(['www.smartagency.cloud', 'smartagency.cloud', 'new.smartagency.cloud']);

export type Tipo = 'demo' | 'webinar' | 'webinar_iscritto';
export interface Ping { tipo: Tipo; pagina: string; fonte: string; campagna: string; contenuto: string }

const ipBuckets = new Map<string, { n: number; reset: number }>();
const dedup = new Map<string, number>();
let day = '';
let clickDay = 0;      // clic validi arrivati oggi
let iscrittiDay = 0;   // iscrizioni al webinar completate oggi
let sentDay = 0;       // email inviate oggi
let limitMailSent = false;

function romeDay(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
function rollDay() {
  const t = romeDay();
  if (t !== day) { day = t; clickDay = 0; iscrittiDay = 0; sentDay = 0; limitMailSent = false; }
}
const hash = (s: string) => createHash('sha256').update(SALT + s).digest('hex').slice(0, 24);

export function originAllowed(origin: string | null, referer: string | null): boolean {
  if (process.env.CTA_PING_ALLOW_LOCAL === '1') return true;   // solo per i collaudi locali
  for (const v of [origin, referer]) {
    if (!v) continue;
    try { return ALLOWED_HOSTS.has(new URL(v).hostname); } catch { return false; }
  }
  return false;
}

export function cleanText(s: unknown, max = 200): string {
  if (typeof s !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function device(ua: string): 'mobile' | 'desktop' {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? 'mobile' : 'desktop';
}

/** Nome breve della fonte per l'oggetto dell'email: utm_source come lo scrivono i nostri annunci. */
function fonteBreve(f: string): string {
  const s = f.trim().toLowerCase();
  if (!s) return 'senza campagna';
  if (/^(meta|facebook|fb|instagram|ig)$/.test(s)) return 'Meta';
  if (s === 'youtube') return 'YouTube';
  if (s === 'google') return 'Google Ads';
  return f.trim().slice(0, 30);
}

export type Esito = 'sent' | 'limit-mail' | 'over-limit' | 'duplicate' | 'rate-limited' | 'disabled';

/** Elabora un ping già validato. Non attende l'invio dell'email. */
export function handlePing(p: Ping, ip: string, ua: string): Esito {
  if (process.env.CTA_PING_DISABLED === '1') return 'disabled';
  rollDay();
  const now = Date.now();
  const ih = hash(ip || 'sconosciuto');

  // 10 richieste al minuto per IP (hash volatile)
  const b = ipBuckets.get(ih);
  if (!b || b.reset < now) ipBuckets.set(ih, { n: 1, reset: now + 60_000 });
  else { b.n++; if (b.n > 10) return 'rate-limited'; }

  // antiduplicato: stessa coppia tipo+pagina dallo stesso IP entro 60 secondi
  const dk = `${ih}|${p.tipo}|${p.pagina}`;
  const last = dedup.get(dk);
  if (last && now - last < 60_000) return 'duplicate';
  dedup.set(dk, now);
  if (dedup.size > 5000) for (const [k, t] of dedup) if (now - t > 60_000) dedup.delete(k);

  const ora = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'medium' }).format(new Date());
  if (p.tipo === 'webinar_iscritto') {
    // rara e importante: sempre, anche oltre il tetto dei clic
    iscrittiDay++;
    const righe: [string, string][] = [
      ['Azione', 'Iscrizione al webinar completata'], ['Pagina', p.pagina || '(non indicata)'],
      ['Fonte (utm_source)', p.fonte || '-'], ['Campagna (utm_campaign)', p.campagna || '-'], ['Annuncio (utm_content)', p.contenuto || '-'],
      ['Ora (Italia)', ora], ['Dispositivo', device(ua)], ['Iscrizioni oggi da questo modulo', String(iscrittiDay)],
    ];
    void deliver(`[ISCRIZIONE WEBINAR · ${fonteBreve(p.fonte)}] ${p.pagina || ''}`.trim(), testo(righe), tabella(righe));
    return 'sent';
  }
  clickDay++;
  if (sentDay >= DAILY_LIMIT) {
    if (!limitMailSent) {
      limitMailSent = true;
      void deliver(`[Clic] Limite giornaliero di notifiche raggiunto (${DAILY_LIMIT})`,
        `Oggi sono arrivati ${DAILY_LIMIT} avvisi di clic su Iscriviti e Prenota demo. Per non riempire la casella, da qui a mezzanotte non ne invio altri.\nClic ricevuti finora: ${clickDay}.`,
        `<p>Oggi sono arrivati <b>${DAILY_LIMIT}</b> avvisi di clic su Iscriviti e Prenota demo. Per non riempire la casella, da qui a mezzanotte non ne invio altri.</p><p>Clic ricevuti finora: ${clickDay}.</p>`);
      return 'limit-mail';
    }
    return 'over-limit';
  }
  sentDay++;

  const titolo = p.tipo === 'webinar' ? 'Iscriviti al webinar' : 'Prenota una demo';
  const righe: [string, string][] = [
    ['Azione', titolo], ['Pagina di provenienza', p.pagina || '(non indicata)'],
    ['Fonte (utm_source)', p.fonte || '-'], ['Campagna (utm_campaign)', p.campagna || '-'], ['Annuncio (utm_content)', p.contenuto || '-'],
    ['Ora (Italia)', ora], ['Dispositivo', device(ua)], ['Clic oggi', String(clickDay)],
  ];
  void deliver(`[Clic] ${titolo}`, testo(righe), tabella(righe));
  return 'sent';
}

const testo = (righe: [string, string][]) => righe.map(([k, v]) => `${k}: ${v}`).join('\n') + '\n\nMessaggio automatico: non contiene dati del visitatore.';
const tabella = (righe: [string, string][]) => `<table style="font:14px system-ui,sans-serif;border-collapse:collapse">${righe.map(([k, v]) => `<tr><td style="padding:4px 14px 4px 0;color:#64708a">${esc(k)}</td><td style="padding:4px 0"><b>${esc(v)}</b></td></tr>`).join('')}</table><p style="font:12px system-ui,sans-serif;color:#64708a">Messaggio automatico: non contiene dati del visitatore.</p>`;

function deliver(subject: string, text: string, html: string): Promise<void> {
  if (process.env.CTA_PING_DRY_RUN === '1') { console.log(`[cta-ping dry-run] ${subject}`); return Promise.resolve(); }
  return sendEmail({ to: CTA_PING_TO, subject, text, html })
    .then((r) => { if (!r.ok) console.warn('[cta-ping] invio fallito:', r.error); })
    .catch((e) => console.warn('[cta-ping] errore invio:', (e as Error).message));
}
