#!/usr/bin/env node
// introspect-cms.mjs — Genera un blueprint di test con TUTTI i widget di Element Node,
// lo importa come pagina /cms-introspection (status DRAFT), naviga in Playwright
// e dumpa: selettori CSS reali, struttura DOM e quali settings hanno effetto.
//
// Output: ../references/cms-introspection.json + ../references/cms-introspection.md
// Output: la pagina /cms-introspection rimane nel CMS come reference per debug
//         (puoi rilanciare lo script per aggiornarla).
//
// Usage:
//   node introspect-cms.mjs
//   node introspect-cms.mjs --keep   (non cancella la pagina alla fine)
//
// Env richieste:
//   EN_URL, EN_KEY                        (per importare/cancellare la pagina via Bearer)

import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const args = process.argv.slice(2);
const keepPage = args.includes('--keep');
const baseUrl = process.env.EN_URL || 'http://localhost:3000';
const key = process.env.EN_KEY;
if (!key) {
  console.error('Missing EN_KEY env var.');
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const referencesDir = resolve(__dirname, '..', 'references');

// ID generator semplice
let seq = 0;
const nid = (prefix) => `${prefix}_intro${(++seq).toString(36).padStart(3, '0')}`;

// === Lista completa widget Element Node (dal widgets-schema.ts) ===
const WIDGET_TYPES = [
  'heading', 'image', 'text', 'video', 'button',
  'divider', 'spacer', 'icon', 'image-box', 'icon-box', 'icon-list',
  'counter', 'progress', 'testimonial',
  'tabs', 'accordion', 'toggle', 'alert', 'html',
  'posts-grid', 'contact-form', 'gallery', 'countdown', 'price-table',
  'call-to-action', 'social-icons',
  'hero', 'hero-slider',
  'animated-headline', 'image-carousel', 'testimonial-carousel',
  'flip-box', 'share-buttons', 'reviews', 'lottie', 'mailchimp',
  'site-logo', 'site-title', 'nav-menu', 'search-form',
  'page-title', 'breadcrumbs',
];

// Default settings minimi per ogni widget per il render
const DEFAULT_SETTINGS = {
  heading: { text: 'Sample heading', tag: 'h2' },
  image: { src: 'https://placehold.co/600x400/2563EB/ffffff?text=Sample', alt: 'sample' },
  text: { html: '<p>Sample paragraph with <strong>inline HTML</strong>.</p>' },
  video: { src: 'https://www.youtube.com/embed/dQw4w9WgXcQ', type: 'youtube' },
  button: { text: 'Click me', url: '#', style: 'primary' },
  divider: { color: '#94a3b8', weight: 2 },
  spacer: { height: 40 },
  icon: { icon: 'Star', size: 64 },
  'image-box': { image: 'https://placehold.co/400x300/2563EB/fff?text=Box', title: 'Box title', text: 'Box descrizione' },
  'icon-box': { icon: 'Sparkles', iconSize: 48, title: 'Icon box title', text: 'Icon box text' },
  'icon-list': { items: [{ icon: 'Check', text: 'Item 1' }, { icon: 'Check', text: 'Item 2' }] },
  counter: { from: 0, to: 100, suffix: '+', label: 'Sample counter' },
  progress: { label: 'Progress', percent: 70 },
  testimonial: { text: 'Sample quote', author: 'Author', role: 'Role' },
  tabs: { items: [{ title: 'Tab 1', content: '<p>One</p>' }, { title: 'Tab 2', content: '<p>Two</p>' }] },
  accordion: { items: [{ title: 'Acc 1', content: '<p>A</p>' }, { title: 'Acc 2', content: '<p>B</p>' }] },
  toggle: { items: [{ title: 'Tog 1', content: '<p>X</p>' }] },
  alert: { variant: 'info', title: 'Alert', text: 'Alert text' },
  html: { code: '<div class="custom-html-block">RAW HTML</div>' },
  'posts-grid': { columns: 3, count: 3 },
  'contact-form': { submitText: 'Send', recipient: 'a@b.it' },
  gallery: { columns: 3, images: [{ src: 'https://placehold.co/300x200', alt: '1' }] },
  countdown: { dueDate: '2030-01-01T00:00:00' },
  'price-table': { title: 'Pro', price: '29', period: '/mo', features: [{ text: 'Feature' }] },
  'call-to-action': { title: 'CTA title', text: 'CTA text', ctaText: 'Go', ctaUrl: '#' },
  'social-icons': { items: [{ network: 'facebook', url: '#' }, { network: 'instagram', url: '#' }] },
  hero: { title: 'Hero title', subtitle: 'Hero subtitle', ctaText: 'CTA', ctaUrl: '#' },
  'hero-slider': { slides: [{ title: 'Slide 1', subtitle: 'Sub', ctaText: 'Go', ctaUrl: '#' }] },
  'animated-headline': { before: 'Build', animated: [{ value: 'fast' }, { value: 'right' }], after: 'now' },
  'image-carousel': { images: [{ src: 'https://placehold.co/600x400', alt: '1' }, { src: 'https://placehold.co/600x400', alt: '2' }] },
  'testimonial-carousel': { items: [{ text: 'T1', author: 'A1', role: 'R1', rating: 5 }] },
  'flip-box': { front: { title: 'F', text: 'front' }, back: { title: 'B', text: 'back' } },
  'share-buttons': { networks: [{ value: 'facebook' }, { value: 'twitter' }] },
  reviews: { title: 'Reviews', averageRating: 4.5, totalCount: 10, items: [{ author: 'A', rating: 5, date: '2026-01-01', text: 'Great' }] },
  lottie: { src: '', width: '100%', height: '200px' },
  mailchimp: { title: 'Subscribe', text: 'Get updates' },
  'site-logo': { variant: 'auto', maxHeight: 48 },
  'site-title': { tag: 'span' },
  'nav-menu': { items: [{ label: 'Home', url: '/' }, { label: 'About', url: '/about' }] },
  'search-form': { placeholder: 'Search…', buttonText: 'Search' },
  'page-title': { tag: 'h1' },
  breadcrumbs: { homeLabel: 'Home', separator: '/' },
};

// === Costruisce blueprint con TUTTI i widget, ognuno in sezione separata ===
// Ogni sezione ha data-anchor che permette di mappare DOM → widget type
function buildIntroBlueprint() {
  const sections = [];
  for (const type of WIDGET_TYPES) {
    const settings = DEFAULT_SETTINGS[type] || {};
    sections.push({
      id: nid('s'),
      type: 'section',
      settings: {
        paddingTop: 40,
        paddingBottom: 40,
        background: '#ffffff',
        anchor: `intro-${type}`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',     // tentativo: verifichiamo se viene reso
        borderRadius: '16px',                          // tentativo
      },
      columns: [
        {
          id: nid('c'),
          type: 'column',
          width: 100,
          settings: {
            padding: '20px',
            background: '#f8fafc',
            verticalAlign: 'center',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',   // tentativo a livello colonna
            borderRadius: '12px',
          },
          elements: [
            { id: nid('e'), type: 'heading', settings: { text: `[${type}]`, tag: 'h6', align: 'left', color: '#94a3b8', size: '12px', weight: '500' } },
            { id: nid('e'), type, settings },
          ],
        },
      ],
    });
  }
  return {
    version: '1.0',
    generator: 'introspect-cms',
    pages: [{
      slug: 'cms-introspection',
      title: 'CMS Introspection',
      isHomepage: false,
      status: 'DRAFT',
      content: { sections },
      seoTitle: null,
      seoDesc: null,
    }],
  };
}

// === Importa il blueprint via API ===
async function importIntroPage() {
  const blueprint = buildIntroBlueprint();
  const res = await fetch(`${baseUrl}/api/admin/import`, {
    method: 'POST',
    headers: { 'authorization': `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ blueprint, options: { dryRun: false, strategy: 'merge', skipSiteSettings: true } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Import failed: ${JSON.stringify(data).slice(0, 500)}`);
  return data;
}

// === Naviga la pagina importata e introspetta ===
async function inspect() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  // Provo la pagina dedicata; se la route dinamica del dev server è bloccata,
  // fallback sulla HOME (che ha widget reali del clone in corso).
  const candidateUrls = [
    `${baseUrl}/cms-introspection`,
    `${baseUrl}/`,   // fallback su home
  ];
  let pageUrl = null;
  for (const u of candidateUrls) {
    try {
      const r = await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 15000 });
      if (r && r.status() === 200) {
        pageUrl = u;
        await page.waitForTimeout(2000);
        break;
      }
    } catch (e) {
      console.warn(`    ⚠ ${u}: ${e.message.slice(0,80)}`);
    }
  }
  if (!pageUrl) {
    throw new Error('Nessuna pagina pubblica raggiungibile su ' + baseUrl);
  }
  console.log(`  · Navigato a ${pageUrl}`);
  const isHomeFallback = pageUrl === `${baseUrl}/`;
  await page.waitForTimeout(1500);

  // Dump DOM + style per OGNI widget (identificabile via anchor `intro-<type>`)
  const result = await page.evaluate((widgetTypes) => {
    function safeCs(el) {
      const cs = getComputedStyle(el);
      return {
        display: cs.display, position: cs.position,
        background: cs.background.slice(0, 200), backgroundColor: cs.backgroundColor,
        backgroundImage: cs.backgroundImage.slice(0, 200),
        color: cs.color, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
        padding: cs.padding, margin: cs.margin,
        borderRadius: cs.borderRadius, boxShadow: cs.boxShadow,
        border: cs.border,
        gap: cs.gap, alignItems: cs.alignItems, justifyContent: cs.justifyContent,
        flexDirection: cs.flexDirection, gridTemplateColumns: cs.gridTemplateColumns,
        width: cs.width, height: cs.height,
        textAlign: cs.textAlign,
      };
    }

    function describe(el, depth = 0, maxDepth = 3) {
      if (!el || depth > maxDepth) return null;
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        classes: el.className?.toString?.() || null,
        attrs: Object.fromEntries([...el.attributes].filter(a => !['style'].includes(a.name)).map(a => [a.name, a.value])),
        style: safeCs(el),
        children: [...el.children].slice(0, 8).map(c => describe(c, depth + 1, maxDepth)),
      };
    }

    const widgets = {};
    // Strategia A: cerca le sezioni con anchor intro-<type> (se introspettiamo cms-introspection)
    for (const type of widgetTypes) {
      const section = document.querySelector(`section[data-anchor="intro-${type}"], section#intro-${type}, [id="intro-${type}"]`);
      if (!section) { widgets[type] = { error: 'not in intro-anchor section, will fallback' }; continue; }
      const column = section.querySelector('div, section')?.children?.[0] || section.children[0];
      const widgetWrapper = column?.children?.[1] || column?.querySelector(':scope > :not(h6):not(.heading-label)');
      const target = widgetWrapper || column;
      widgets[type] = {
        source: 'intro-page',
        sectionInfo: {
          tag: section.tagName.toLowerCase(),
          classes: section.className?.toString?.() || null,
          style: safeCs(section),
          attrs: Object.fromEntries([...section.attributes].map(a => [a.name, a.value])),
        },
        columnInfo: column ? {
          classes: column.className?.toString?.() || null,
          style: safeCs(column),
        } : null,
        widgetDom: target ? describe(target, 0, 4) : null,
      };
    }
    // Strategia B (fallback): cerca i widget reali nella pagina corrente per tutti i type "errati"
    // basandoci sui tag/class che il render.tsx produce (es. button con classe .btn-, etc.)
    function findWidgetByType(type) {
      const queries = {
        heading: 'main h1, main h2, main h3',
        image: 'main img',
        text: 'main p, main [class*="prose"]',
        video: 'main iframe[src*="youtube"], main iframe[src*="vimeo"], main video',
        button: 'main a[class*="btn"], main button[class*="btn"], main [class*="button"]',
        divider: 'main hr, main [class*="divider"]',
        spacer: 'main [style*="height"][style*="px"]',
        icon: 'main svg',
        'image-box': 'main [class*="image-box"]',
        'icon-box': 'main [class*="icon-box"]',
        'icon-list': 'main [class*="icon-list"]',
        counter: 'main [class*="counter"]',
        progress: 'main [class*="progress"]',
        testimonial: 'main [class*="testimonial"]',
        tabs: 'main [class*="tabs"], main [role="tablist"]',
        accordion: 'main [class*="accordion"], main details',
        toggle: 'main [class*="toggle"]',
        alert: 'main [role="alert"], main [class*="alert"]',
        html: 'main [class*="html"]',
        gallery: 'main [class*="gallery"]',
        'call-to-action': 'main [class*="call-to-action"], main [class*="cta"]',
        'social-icons': 'main [class*="social"]',
        hero: 'main [class*="hero"]',
        'hero-slider': 'main [class*="hero-slider"]',
        'site-logo': 'header img, header [class*="logo"]',
        'site-title': 'header [class*="title"], header h1',
        'nav-menu': 'header nav, header [class*="nav"]',
        breadcrumbs: 'main [class*="breadcrumb"], main [aria-label*="breadcrumb"]',
        'price-table': 'main [class*="price"]',
      };
      const q = queries[type];
      if (!q) return null;
      return document.querySelector(q);
    }
    for (const type of widgetTypes) {
      if (widgets[type] && widgets[type].source === 'intro-page') continue;
      const el = findWidgetByType(type);
      if (!el) { widgets[type] = { error: 'not found' }; continue; }
      // risali fino al wrapper section/column più vicino
      const section = el.closest('section');
      const column = el.closest('[class*="column"], [class*="col-"], section > div');
      widgets[type] = {
        source: 'fallback-real-content',
        sectionInfo: section ? {
          tag: section.tagName.toLowerCase(),
          classes: section.className?.toString?.() || null,
          style: safeCs(section),
        } : null,
        columnInfo: column ? {
          classes: column.className?.toString?.() || null,
          style: safeCs(column),
        } : null,
        widgetDom: describe(el, 0, 4),
      };
    }

    // Bonus: dump del root .en-frontend e di una sezione qualsiasi
    const root = document.querySelector('.en-frontend, [class*="en-"]');
    const rootInfo = root ? {
      tag: root.tagName.toLowerCase(),
      classes: root.className?.toString?.() || null,
      style: safeCs(root),
    } : null;

    // Cattura anche le CSS variables del :root (theme tokens)
    const cssVars = {};
    const rs = getComputedStyle(document.documentElement);
    for (let i = 0; i < rs.length; i++) {
      const p = rs[i];
      if (p.startsWith('--en-') || p.startsWith('--')) {
        const v = rs.getPropertyValue(p).trim();
        if (v && v.length < 200) cssVars[p] = v;
      }
    }

    return { widgets, rootInfo, cssVars };
  }, WIDGET_TYPES);

  await browser.close();
  return result;
}

// === Cancella la pagina di test (se non --keep) ===
async function deleteIntroPage() {
  // Recupera page id via export
  try {
    const exp = await fetch(`${baseUrl}/api/admin/export`, { headers: { 'authorization': `Bearer ${key}` } });
    const data = await exp.json();
    const page = (data.pages || []).find(p => p.slug === 'cms-introspection');
    if (!page) return;
    // Non c'è endpoint Bearer DELETE in `/api/admin/...` esplicito; usiamo import con --replace per blueprint vuoto?
    // Più semplice: marca lo status TRASH via import merge
    await fetch(`${baseUrl}/api/admin/import`, {
      method: 'POST',
      headers: { 'authorization': `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        blueprint: {
          version: '1.0',
          pages: [{ slug: 'cms-introspection', title: 'CMS Introspection', status: 'TRASH', content: { sections: [] } }],
        },
        options: { dryRun: false, strategy: 'merge', skipSiteSettings: true },
      }),
    });
    console.log('  · Pagina di test marcata TRASH');
  } catch (e) {
    console.warn('  ⚠ Cancellazione pagina test fallita:', e.message);
  }
}

// === Genera widget-quirks autogenerato dai dati ===
function generateQuirks(introspection) {
  const lines = [];
  lines.push('# Element Node — Widget rendering quirks (auto-generated)');
  lines.push('');
  lines.push('Output empirico di `introspect-cms.mjs`. Generato confrontando le settings inviate ai widget contro il CSS effettivamente renderizzato dal PageRenderer di Element Node.');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## CSS variables di brand (root)');
  lines.push('');
  lines.push('Sono le variabili che il PageRenderer espone. Usale in `customCss` con `var(--en-color-primary)` ecc.');
  lines.push('');
  lines.push('```');
  for (const [k, v] of Object.entries(introspection.cssVars || {})) {
    if (k.startsWith('--en-')) lines.push(`${k}: ${v};`);
  }
  lines.push('```');
  lines.push('');
  lines.push('## Selettori CSS reali per widget');
  lines.push('');
  lines.push('Quando scrivi `customCss` per stilare un widget, usa questi selettori. NON inventare classi.');
  lines.push('');
  lines.push('| Widget | Selettore sezione | Selettore widget (più stretto) |');
  lines.push('|---|---|---|');
  for (const [type, data] of Object.entries(introspection.widgets || {})) {
    if (data.error) {
      lines.push(`| \`${type}\` | ⚠ ${data.error} | — |`);
      continue;
    }
    const sectionSelector = `section[data-anchor="intro-${type}"]`;
    const widgetSelector = data.widgetDom
      ? `${sectionSelector} ${data.widgetDom.tag}${data.widgetDom.classes ? '.' + data.widgetDom.classes.split(/\s+/)[0] : ''}`
      : '—';
    lines.push(`| \`${type}\` | \`${sectionSelector}\` | \`${widgetSelector}\` |`);
  }
  lines.push('');
  lines.push('## Settings di sezione: cosa è renderizzato vs ignorato');
  lines.push('');
  lines.push('Verifica empirica: ogni sezione di test ha `boxShadow: \'0 4px 12px rgba(0,0,0,0.1)\'` e `borderRadius: \'16px\'`. Sono effettivamente applicate?');
  lines.push('');
  const sampleSection = Object.values(introspection.widgets || {})[0]?.sectionInfo;
  if (sampleSection) {
    const ss = sampleSection.style;
    lines.push(`- **section.settings.boxShadow**: rendered? **${ss.boxShadow !== 'none' ? 'YES' : 'NO'}** (computed: \`${ss.boxShadow}\`)`);
    lines.push(`- **section.settings.borderRadius**: rendered? **${ss.borderRadius !== '0px' ? 'YES' : 'NO'}** (computed: \`${ss.borderRadius}\`)`);
    lines.push(`- **section.settings.background**: computed \`${ss.backgroundColor}\``);
  }
  lines.push('');
  lines.push('## Settings di colonna: cosa è renderizzato vs ignorato');
  lines.push('');
  lines.push('Ogni colonna di test ha `boxShadow: \'0 2px 8px rgba(0,0,0,0.08)\'` e `borderRadius: \'12px\'`.');
  lines.push('');
  const sampleColumn = Object.values(introspection.widgets || {})[0]?.columnInfo;
  if (sampleColumn) {
    const cs = sampleColumn.style;
    lines.push(`- **column.settings.boxShadow**: rendered? **${cs.boxShadow !== 'none' ? 'YES' : 'NO'}** (computed: \`${cs.boxShadow}\`)`);
    lines.push(`- **column.settings.borderRadius**: rendered? **${cs.borderRadius !== '0px' ? 'YES' : 'NO'}** (computed: \`${cs.borderRadius}\`)`);
    lines.push(`- **column.settings.background**: computed \`${cs.backgroundColor}\``);
  }
  lines.push('');
  lines.push('## DOM tree per widget (per scrivere customCss mirato)');
  lines.push('');
  for (const [type, data] of Object.entries(introspection.widgets || {})) {
    if (data.error || !data.widgetDom) continue;
    lines.push(`### \`${type}\``);
    lines.push('```');
    lines.push(domSummary(data.widgetDom, 0));
    lines.push('```');
    lines.push('');
  }
  return lines.join('\n');
}

function domSummary(node, depth) {
  if (!node) return '';
  const indent = '  '.repeat(depth);
  const cls = node.classes ? `.${node.classes.split(/\s+/).slice(0, 2).join('.')}` : '';
  let s = `${indent}<${node.tag}${cls}>`;
  if (node.children?.length) {
    s += '\n' + node.children.map(c => domSummary(c, depth + 1)).filter(Boolean).join('\n');
    s += `\n${indent}</${node.tag}>`;
  }
  return s;
}

// === MAIN ===
console.log(`\n▶ CMS Introspection: ${baseUrl}\n`);
console.log('  · Importo blueprint di test con tutti i widget…');
const importReport = await importIntroPage();
console.log(`    ${JSON.stringify(importReport.created || {})} / ${JSON.stringify(importReport.updated || {})}`);

// La pagina è DRAFT, ma per renderla pubblicamente accessibile dobbiamo PUBLISH
console.log('  · Pubblico temporaneamente la pagina (status PUBLISHED)…');
await fetch(`${baseUrl}/api/admin/import`, {
  method: 'POST',
  headers: { 'authorization': `Bearer ${key}`, 'content-type': 'application/json' },
  body: JSON.stringify({
    blueprint: {
      version: '1.0',
      pages: [{ slug: 'cms-introspection', title: 'CMS Introspection', status: 'PUBLISHED', content: { sections: buildIntroBlueprint().pages[0].content.sections } }],
    },
    options: { dryRun: false, strategy: 'merge', skipSiteSettings: true },
  }),
});

console.log('  · Introspezione DOM via Playwright…');
const introspection = await inspect();

const outJson = join(referencesDir, 'cms-introspection.json');
await writeFile(outJson, JSON.stringify(introspection, null, 2));
console.log(`  · cms-introspection.json scritto (${(JSON.stringify(introspection).length / 1024).toFixed(1)}KB)`);

const outMd = join(referencesDir, 'cms-introspection.md');
await writeFile(outMd, generateQuirks(introspection));
console.log(`  · cms-introspection.md scritto`);

if (!keepPage) {
  console.log('  · Cleanup pagina di test…');
  await deleteIntroPage();
}

console.log(`\n✓ Done`);
console.log(`  references/cms-introspection.json + .md aggiornati.`);
console.log(`  ${Object.keys(introspection.widgets).length} widget introspettati.`);
const errors = Object.entries(introspection.widgets).filter(([_, d]) => d.error);
if (errors.length) {
  console.log(`  ⚠ ${errors.length} widget non trovati in DOM:`, errors.map(([t]) => t).join(', '));
}
