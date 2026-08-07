#!/usr/bin/env node
// Element Node MCP server — espone il CMS agli agenti AI via Model Context Protocol.
// Env richieste:
//   ELEMENT_NODE_URL       es. https://mio-sito.it
//   ELEMENT_NODE_API_KEY   Bearer key (scopes site.import/site.export) — per import/export
//   ELEMENT_NODE_EMAIL / ELEMENT_NODE_PASSWORD  admin CMS — per pagine, media, settings
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE = (process.env.ELEMENT_NODE_URL || '').replace(/\/$/, '');
const API_KEY = process.env.ELEMENT_NODE_API_KEY || '';
const EMAIL = process.env.ELEMENT_NODE_EMAIL || '';
const PASSWORD = process.env.ELEMENT_NODE_PASSWORD || '';
const GH_RAW = 'https://raw.githubusercontent.com/LorenzArtik/element-node/main';

if (!BASE) {
  console.error('ELEMENT_NODE_URL mancante');
  process.exit(1);
}

// ---- session cookie (lazy login, come documentato in api-quickref) ----
const jar = new Map();
function cookieHeader() {
  return [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
}
function absorb(res) {
  for (const sc of res.headers.getSetCookie?.() || []) {
    const [pair] = sc.split(';');
    const eq = pair.indexOf('=');
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}
let sessionReady = false;
async function ensureSession() {
  if (sessionReady) return;
  if (!EMAIL || !PASSWORD) throw new Error('ELEMENT_NODE_EMAIL/PASSWORD mancanti (richiesti per questo tool)');
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  absorb(csrfRes);
  const { csrfToken } = await csrfRes.json();
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: cookieHeader() },
    body: new URLSearchParams({ csrfToken, email: EMAIL, password: PASSWORD }).toString(),
  });
  absorb(res);
  const sess = await fetch(`${BASE}/api/auth/session`, { headers: { cookie: cookieHeader() } });
  absorb(sess);
  const j = await sess.json().catch(() => ({}));
  if (!j?.user) throw new Error('login CMS fallito: controlla ELEMENT_NODE_EMAIL/PASSWORD');
  sessionReady = true;
}
async function sessionFetch(path, opts = {}) {
  await ensureSession();
  const headers = { ...(opts.headers || {}), cookie: cookieHeader() };
  return fetch(`${BASE}${path}`, { ...opts, headers });
}
async function bearerFetch(path, opts = {}) {
  if (!API_KEY) throw new Error('ELEMENT_NODE_API_KEY mancante (richiesta per questo tool)');
  const headers = { ...(opts.headers || {}), authorization: `Bearer ${API_KEY}` };
  return fetch(`${BASE}${path}`, { ...opts, headers });
}
function text(t) {
  return { content: [{ type: 'text', text: typeof t === 'string' ? t : JSON.stringify(t, null, 2) }] };
}
async function jsonOrThrow(res) {
  const body = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${body.slice(0, 500)}`);
  try { return JSON.parse(body); } catch { return body; }
}

const server = new McpServer({ name: 'element-node', version: '0.1.0' });

server.tool(
  'site_export',
  'Esporta il Site Blueprint completo del sito (pagine, theme blocks, form, popup, settings). Usalo per capire la struttura attuale prima di modificare.',
  {},
  async () => text(await jsonOrThrow(await bearerFetch('/api/admin/export')))
);

server.tool(
  'site_import',
  'Importa un Site Blueprint (crea/aggiorna pagine, theme blocks, form, popup). strategy "merge" aggiorna solo ciò che è nel blueprint (default), "replace" azzera e ricrea. Con dryRun true valida senza scrivere. ⚠️ In merge NON includere themeBlocks se non modificati (si duplicano). ⚠️ Ometti site.theme (schema completo richiesto): usa update_theme.',
  {
    blueprint: z.record(z.any()).describe('Site Blueprint JSON (version "1.0", pages[], …)'),
    strategy: z.enum(['merge', 'replace']).optional(),
    dryRun: z.boolean().optional(),
  },
  async ({ blueprint, strategy = 'merge', dryRun = false }) =>
    text(await jsonOrThrow(await bearerFetch('/api/admin/import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ blueprint, options: { strategy, dryRun } }),
    })))
);

server.tool(
  'list_pages',
  'Elenca le pagine del sito (id, titolo, slug, stato pubblicazione).',
  {},
  async () => text(await jsonOrThrow(await sessionFetch('/api/pages')))
);

server.tool(
  'get_page',
  'Legge una pagina completa (contenuto a sezioni/colonne/widget inclusi).',
  { id: z.string().describe('id pagina (da list_pages)') },
  async ({ id }) => text(await jsonOrThrow(await sessionFetch(`/api/pages/${id}`)))
);

server.tool(
  'create_page',
  'Crea una pagina vuota. Per costruire il contenuto usa poi site_import in merge (consigliato) o update_page.',
  {
    title: z.string(),
    slug: z.string().optional(),
    isHomepage: z.boolean().optional(),
  },
  async (args) => text(await jsonOrThrow(await sessionFetch('/api/pages', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(args),
  })))
);

server.tool(
  'update_page',
  'Aggiorna una pagina (title, slug, content, settings, seo, isHomepage, password…). Passa SOLO i campi da cambiare.',
  {
    id: z.string(),
    patch: z.record(z.any()).describe('campi da aggiornare, es. {"title":"Nuovo"} o {"content":{…}}'),
  },
  async ({ id, patch }) => text(await jsonOrThrow(await sessionFetch(`/api/pages/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  })))
);

server.tool(
  'get_site_settings',
  'Legge le impostazioni sito (theme completo, integrazioni, SEO globale).',
  {},
  async () => text(await jsonOrThrow(await sessionFetch('/api/settings/site')))
);

server.tool(
  'update_theme',
  'Aggiorna il tema in modo NON distruttivo: fa GET, merge dei soli campi passati, PATCH. colors/typography sono merge parziali (es. {"primary":"#2563EB"}).',
  {
    colors: z.record(z.string()).optional(),
    typography: z.record(z.any()).optional(),
    buttons: z.record(z.any()).optional(),
  },
  async ({ colors, typography, buttons }) => {
    const cur = await jsonOrThrow(await sessionFetch('/api/settings/site'));
    const theme = {
      ...cur.theme,
      ...(colors ? { colors: { ...cur.theme.colors, ...colors } } : {}),
      ...(typography ? { typography: { ...cur.theme.typography, ...typography } } : {}),
      ...(buttons ? { buttons: { ...cur.theme.buttons, ...buttons } } : {}),
    };
    return text(await jsonOrThrow(await sessionFetch('/api/settings/site', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ theme }),
    })));
  }
);

server.tool(
  'list_media',
  'Elenca i media caricati (id, url, mime, dimensioni). Gli url /uploads/… vanno usati nei blueprint.',
  {},
  async () => text(await jsonOrThrow(await sessionFetch('/api/media')))
);

server.tool(
  'upload_media_from_url',
  'Scarica un file da un URL pubblico e lo carica nella media library del CMS. Ritorna l’url /uploads/… da usare nelle pagine.',
  { url: z.string().url(), filename: z.string().optional() },
  async ({ url, filename }) => {
    const src = await fetch(url);
    if (!src.ok) throw new Error(`download fallito: HTTP ${src.status}`);
    const buf = Buffer.from(await src.arrayBuffer());
    const name = filename || new URL(url).pathname.split('/').pop() || 'file';
    const fd = new FormData();
    fd.append('file', new Blob([buf], { type: src.headers.get('content-type') || 'application/octet-stream' }), name);
    return text(await jsonOrThrow(await sessionFetch('/api/media/upload', { method: 'POST', body: fd })));
  }
);

server.tool(
  'widget_reference',
  'Documentazione aggiornata dei widget del CMS (campi, control, estensioni, esempi). Leggila PRIMA di scrivere blueprint.',
  {},
  async () => {
    const res = await fetch(`${GH_RAW}/skill/element-node-builder/references/widget-reference.md`);
    return text(await res.text());
  }
);

server.tool(
  'widget_quirks',
  'Lezioni empiriche e gotcha reali del renderer (cosa NON funziona come sembra). Consultala quando un widget non rende come previsto.',
  {},
  async () => {
    const res = await fetch(`${GH_RAW}/skill/element-node-builder/references/widget-quirks.md`);
    return text(await res.text());
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`element-node-mcp pronto su ${BASE}`);
