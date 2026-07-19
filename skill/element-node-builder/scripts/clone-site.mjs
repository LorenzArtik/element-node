#!/usr/bin/env node
// clone-site.mjs — Raccoglie dati grezzi da un sito target per consentire a Claude
// di ricostruire un blueprint Element Node a mano (sezione per sezione).
//
// NON genera blueprint automaticamente. Le euristiche su class CSS sono troppo
// fragili tra siti diversi: il mapping audit → widget DEVE essere fatto da Claude,
// che legge gli screenshot e l'audit ed è l'unico in grado di ragionare per
// "questa è una griglia di icon-box", "questa è un testimonial-carousel", ecc.
//
// Usage:
//   node clone-site.mjs <url> [--out <dir>] [--no-assets] [--no-section-shots] [--viewport 1440x900]
//
// Output: clones/<hostname>-<timestamp>/
//   - audit.json                 ← dati grezzi per sezione (struttura, contenuti, stili)
//   - audit-summary.md           ← TOC leggibile per Claude (panoramica + lista sezioni)
//   - assets/                    ← immagini scaricate (mapping in audit.json._meta.assetMap)
//   - screenshots/
//       desktop.png              (full-page desktop 1440x900)
//       mobile.png               (full-page mobile 375x812)
//       section-NN.png           (viewport screenshot di ogni sezione, una per file)
//
// Next steps (DEVE farli Claude, non lo script):
//   1. Leggere audit-summary.md per panoramica
//   2. Aprire screenshot section-NN.png e screenshot desktop full per ogni sezione
//   3. Leggere audit.json sections[N] per i dati grezzi
//   4. Scrivere blueprint sezione per sezione (NON tutto insieme)
//   5. Importare con merge (non replace) e fare diff visivo sezione per sezione

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { resolve, join, extname } from 'node:path';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--') && a.startsWith('http'));
if (!url) {
  console.error('Usage: node clone-site.mjs <url> [--out <dir>] [--no-assets] [--no-section-shots] [--viewport 1440x900]');
  process.exit(1);
}
const outArg = (() => { const i = args.indexOf('--out'); return i >= 0 ? args[i + 1] : null; })();
const skipAssets = args.includes('--no-assets');
const skipSectionShots = args.includes('--no-section-shots');
const viewport = (() => {
  const i = args.indexOf('--viewport');
  if (i < 0) return { width: 1440, height: 900 };
  const [w, h] = args[i + 1].split('x').map(Number);
  return { width: w, height: h };
})();

const hostname = new URL(url).hostname.replace(/^www\./, '');
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const outDir = outArg
  ? resolve(outArg)
  : resolve(process.cwd(), 'clones', `${hostname}-${stamp}`);
const assetsDir = join(outDir, 'assets');
const shotsDir = join(outDir, 'screenshots');
await mkdir(assetsDir, { recursive: true });
await mkdir(shotsDir, { recursive: true });

console.log(`\n▶ Cloning data collection: ${url}`);
console.log(`  → Output: ${outDir}\n`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport,
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
});
const page = await ctx.newPage();

const networkImages = new Set();
page.on('response', (resp) => {
  const u = resp.url();
  const ct = resp.headers()['content-type'] || '';
  if (ct.startsWith('image/') && resp.status() === 200) networkImages.add(u);
});

console.log('  · Caricamento pagina…');
try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
} catch (e) {
  console.warn(`  ⚠ networkidle timeout, continuo con DOM corrente: ${e.message}`);
}
await page.waitForTimeout(1500);

console.log('  · Scroll progressivo per lazy-load…');
await page.evaluate(async () => {
  await new Promise((res) => {
    let y = 0;
    const step = () => {
      window.scrollBy(0, 400);
      y += 400;
      if (y < document.body.scrollHeight + 200) setTimeout(step, 80);
      else { window.scrollTo(0, 0); setTimeout(res, 500); }
    };
    step();
  });
});
await page.waitForTimeout(800);

// ===== AUDIT DOM (dati grezzi, niente mapping a widget) =====
console.log('  · Estrazione audit DOM…');
const audit = await page.evaluate(() => {
  const px = (s) => parseFloat(s) || 0;

  function styleInfo(el) {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      bg: cs.backgroundColor, bgImage: cs.backgroundImage.slice(0, 400),
      bgSize: cs.backgroundSize, bgPosition: cs.backgroundPosition,
      color: cs.color, font: cs.fontFamily, fontSize: cs.fontSize, fontWeight: cs.fontWeight,
      paddingTop: px(cs.paddingTop), paddingBottom: px(cs.paddingBottom),
      paddingLeft: px(cs.paddingLeft), paddingRight: px(cs.paddingRight),
      borderRadius: cs.borderRadius, boxShadow: cs.boxShadow,
      position: cs.position, textAlign: cs.textAlign,
      letterSpacing: cs.letterSpacing, textTransform: cs.textTransform,
    };
  }

  const meta = {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.content || null,
    ogTitle: document.querySelector('meta[property="og:title"]')?.content || null,
    ogDescription: document.querySelector('meta[property="og:description"]')?.content || null,
    ogImage: document.querySelector('meta[property="og:image"]')?.content || null,
    siteName: document.querySelector('meta[property="og:site_name"]')?.content || null,
    lang: document.documentElement.lang || null,
    canonical: document.querySelector('link[rel="canonical"]')?.href || null,
    favicon:
      document.querySelector('link[rel="icon"]')?.href ||
      document.querySelector('link[rel="shortcut icon"]')?.href || null,
  };

  const fonts = {
    body: getComputedStyle(document.body).fontFamily,
    h1: document.querySelector('h1') ? getComputedStyle(document.querySelector('h1')).fontFamily : null,
    h2: document.querySelector('h2') ? getComputedStyle(document.querySelector('h2')).fontFamily : null,
    googleFonts: [...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].map((l) => l.href),
  };

  // CSS custom variables del root (Tailwind, --primary, ecc.)
  const cssVars = {};
  const rs = getComputedStyle(document.documentElement);
  for (let i = 0; i < rs.length; i++) {
    const p = rs[i];
    if (p.startsWith('--')) {
      const v = rs.getPropertyValue(p).trim();
      if (v && v.length < 120) cssVars[p] = v;
    }
  }

  // ===== HEADER / FOOTER =====
  const headerEl = document.querySelector('header, [role="banner"]');
  const header = headerEl ? {
    ...styleInfo(headerEl),
    height: headerEl.offsetHeight,
    sticky: ['sticky', 'fixed'].includes(getComputedStyle(headerEl).position),
    outerHTML: headerEl.outerHTML.slice(0, 4000),
    nav: [...headerEl.querySelectorAll('a')]
      .filter((a) => a.innerText.trim().length > 0 && a.innerText.trim().length < 40)
      .slice(0, 20)
      .map((a) => ({
        label: a.innerText.trim(), href: a.getAttribute('href'),
        color: getComputedStyle(a).color, classes: a.className?.toString?.().slice(0, 80) || '',
      })),
    logo: (() => {
      const img = headerEl.querySelector('img[src*="logo" i], img[alt*="logo" i], a[href="/"] img');
      return img ? { src: img.src, alt: img.alt, width: img.naturalWidth, height: img.naturalHeight } : null;
    })(),
  } : null;

  const footerEl = document.querySelector('footer, [role="contentinfo"]');
  const footer = footerEl ? {
    ...styleInfo(footerEl),
    height: footerEl.offsetHeight,
    outerHTML: footerEl.outerHTML.slice(0, 6000),
    cols: [...footerEl.querySelectorAll('h2,h3,h4,strong')].map((h) => h.innerText.trim()).filter(Boolean),
    links: [...footerEl.querySelectorAll('a')].slice(0, 50)
      .map((a) => ({ label: a.innerText.trim(), href: a.getAttribute('href') })),
    social: [...footerEl.querySelectorAll('a[href*="facebook"],a[href*="instagram"],a[href*="twitter"],a[href*="x.com"],a[href*="linkedin"],a[href*="youtube"],a[href*="tiktok"],a[href*="whatsapp"]')]
      .map((a) => ({ network: (a.href.match(/(facebook|instagram|twitter|x\.com|linkedin|youtube|tiktok|whatsapp)/) || [])[1], url: a.href }))
      .filter((s) => s.network),
    images: [...footerEl.querySelectorAll('img')].map((i) => ({ src: i.currentSrc || i.src, alt: i.alt || '' })),
  } : null;

  // ===== SEZIONI =====
  // Strategia: prendiamo TUTTI gli elementi top-level del main che hanno
  // altezza significativa, senza filtrare per nome di classe.
  function findSections() {
    const main = document.querySelector('main, [role="main"]') || document.body;
    const candidates = [];
    // Primo: figli diretti di main, filtrati per altezza
    for (const child of main.children) {
      if (child.closest('header,footer')) continue;
      const r = child.getBoundingClientRect();
      if (r.height < 100 || r.width < 300) continue;
      candidates.push(child);
    }
    // Se main ha pochi figli (es. 1 wrapper unico), scendiamo di un livello
    if (candidates.length <= 2) {
      const wrappers = candidates.length ? candidates : [main];
      const deeper = [];
      for (const w of wrappers) {
        for (const c of w.children) {
          if (c.closest('header,footer')) continue;
          const r = c.getBoundingClientRect();
          if (r.height < 100 || r.width < 300) continue;
          deeper.push(c);
        }
      }
      if (deeper.length > candidates.length) return deeper;
    }
    return candidates;
  }

  const sectionEls = findSections();

  function nodeSnippet(el) {
    // outerHTML capped, with src/href absoluti
    const clone = el.cloneNode(true);
    // strip script/style/svg path data per ridurre il rumore
    for (const tag of ['script', 'style', 'noscript']) {
      for (const x of clone.querySelectorAll(tag)) x.remove();
    }
    return clone.outerHTML.slice(0, 8000);
  }

  function extractSection(el, idx) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const headings = [...el.querySelectorAll('h1,h2,h3,h4,h5,h6')].slice(0, 40).map((h) => ({
      tag: h.tagName.toLowerCase(), text: h.innerText.trim(),
      color: getComputedStyle(h).color, fontSize: getComputedStyle(h).fontSize,
      fontWeight: getComputedStyle(h).fontWeight, align: getComputedStyle(h).textAlign,
    })).filter((h) => h.text);
    const paragraphs = [...el.querySelectorAll('p, li')]
      .map((p) => p.innerText.trim()).filter((t) => t.length > 5).slice(0, 80);
    const buttons = [...el.querySelectorAll('a, button')]
      .filter((b) => {
        const t = b.innerText.trim();
        if (!t || t.length > 80) return false;
        const cs2 = getComputedStyle(b);
        const hasButtonStyle =
          cs2.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
          cs2.borderWidth !== '0px' ||
          /btn|button|cta|primary/i.test(b.className?.toString() || '');
        return hasButtonStyle;
      })
      .slice(0, 20)
      .map((b) => ({
        text: b.innerText.trim(), href: b.getAttribute('href'),
        bg: getComputedStyle(b).backgroundColor, color: getComputedStyle(b).color,
        radius: getComputedStyle(b).borderRadius,
        textTransform: getComputedStyle(b).textTransform,
        classes: b.className?.toString?.().slice(0, 80) || '',
      }));
    const images = [...el.querySelectorAll('img')].slice(0, 50).map((i) => ({
      src: i.currentSrc || i.src, alt: i.alt || '',
      width: i.naturalWidth, height: i.naturalHeight,
      classes: i.className?.toString?.().slice(0, 80) || '',
    }));
    const iframes = [...el.querySelectorAll('iframe')].map((f) => ({
      src: f.src || f.getAttribute('data-src'), title: f.title,
    }));
    const videos = [...el.querySelectorAll('video')].map((v) => ({ src: v.src, poster: v.poster }));
    const svgs = el.querySelectorAll('svg').length;

    // GRID DETECTION: cerca container con > 1 figlio diretto della stessa
    // dimensione approssimativa (NIENTE classi specifiche).
    function detectGrids(root) {
      const grids = [];
      for (const container of root.querySelectorAll('*')) {
        const kids = [...container.children].filter((c) => c.getBoundingClientRect().height > 30);
        if (kids.length < 2 || kids.length > 16) continue;
        const widths = kids.map((c) => c.getBoundingClientRect().width).filter((w) => w > 50);
        if (widths.length < 2) continue;
        const avg = widths.reduce((a, b) => a + b, 0) / widths.length;
        const spread = Math.max(...widths) - Math.min(...widths);
        if (spread > avg * 0.3) continue; // figli troppo eterogenei → non è una grid
        // skip se i figli sono inline (es. <li> dentro nav)
        if (kids.every((k) => ['LI','SPAN','A'].includes(k.tagName) && k.getBoundingClientRect().height < 60)) continue;
        // skip se è un container annidato dentro un'altra grid già trovata
        const cs2 = getComputedStyle(container);
        if (cs2.display !== 'grid' && cs2.display !== 'flex' && !cs2.gridTemplateColumns) {
          // non sembra un grid container vero
          continue;
        }
        grids.push({
          containerTag: container.tagName.toLowerCase(),
          containerClasses: container.className?.toString?.().slice(0, 120) || '',
          display: cs2.display, gridTemplateColumns: cs2.gridTemplateColumns, gap: cs2.gap,
          itemCount: kids.length,
          itemWidth: Math.round(avg),
          items: kids.slice(0, 12).map((k) => {
            const kcs = getComputedStyle(k);
            return {
              tag: k.tagName.toLowerCase(),
              classes: k.className?.toString?.().slice(0, 80) || '',
              bg: kcs.backgroundColor, radius: kcs.borderRadius, shadow: kcs.boxShadow,
              h: Math.round(k.getBoundingClientRect().height),
              title: k.querySelector('h2,h3,h4,h5')?.innerText.trim() || null,
              text: k.querySelector('p')?.innerText.trim() || null,
              image: (() => { const i = k.querySelector('img'); return i ? { src: i.currentSrc || i.src, alt: i.alt } : null; })(),
              icon: (() => { const s = k.querySelector('svg'); return s ? { hasClass: s.className?.toString?.().slice(0, 80) || '' } : null; })(),
              link: k.querySelector('a')?.href || null,
              innerText: k.innerText.replace(/\s+/g, ' ').trim().slice(0, 300),
            };
          }),
        });
      }
      // de-dup: rimuovi grid annidate (un grid che contiene un altro grid → tieni solo l'esterno)
      const filtered = [];
      const seenContainers = [];
      for (const g of grids) {
        if (seenContainers.some((s) => s.itemCount > g.itemCount && s.items.some((it) => it.innerText.includes(g.items[0]?.innerText?.slice(0,80) || '___')))) continue;
        filtered.push(g);
        seenContainers.push(g);
      }
      return filtered.slice(0, 6); // max 6 grid per sezione (case rari)
    }

    return {
      idx,
      anchor: el.id || el.getAttribute('data-anchor') || null,
      tag: el.tagName.toLowerCase(),
      classes: el.className?.toString?.().slice(0, 200) || '',
      style: {
        bg: cs.backgroundColor, bgImage: cs.backgroundImage.slice(0, 400),
        color: cs.color,
        paddingTop: px(cs.paddingTop), paddingBottom: px(cs.paddingBottom),
        rect: { y: Math.round(r.y), h: Math.round(r.height) },
        textAlign: cs.textAlign,
      },
      headings, paragraphs, buttons, images, iframes, videos, svgs,
      grids: detectGrids(el),
      innerText: el.innerText.replace(/\s+/g, ' ').trim().slice(0, 5000),
      outerHTMLSnippet: nodeSnippet(el),
    };
  }

  const sections = sectionEls.map((el, i) => extractSection(el, i));

  // Background images globali (NIENTE inferenze di gradient/colore)
  const bgImages = (() => {
    const urls = new Set();
    for (const el of document.querySelectorAll('*')) {
      const bi = getComputedStyle(el).backgroundImage;
      if (bi && bi.includes('url(')) {
        const m = bi.match(/url\(["']?([^"')]+)["']?\)/g);
        if (m) for (const u of m) urls.add(u.replace(/url\(["']?|["']?\)/g, ''));
      }
    }
    return [...urls];
  })();

  const internalLinks = (() => {
    const origin = location.origin;
    const out = new Set();
    for (const a of document.querySelectorAll('a[href]')) {
      const h = a.getAttribute('href');
      if (!h || h.startsWith('#') || h.startsWith('mailto:') || h.startsWith('tel:') || h.startsWith('javascript:')) continue;
      try {
        const u = new URL(h, origin);
        if (u.origin === origin && u.pathname !== '/' && !u.pathname.match(/\.(jpg|png|pdf|zip)$/i)) {
          out.add(u.pathname + (u.search || ''));
        }
      } catch {}
    }
    return [...out].slice(0, 60);
  })();

  return { meta, fonts, cssVars, header, footer, sections, bgImages, internalLinks };
});

// ===== SCREENSHOT FULL =====
console.log('  · Screenshot desktop + mobile…');
await page.screenshot({ path: join(shotsDir, 'desktop.png'), fullPage: true });
await page.setViewportSize({ width: 375, height: 812 });
await page.waitForTimeout(800);
await page.screenshot({ path: join(shotsDir, 'mobile.png'), fullPage: true });
await page.setViewportSize(viewport);
await page.waitForTimeout(500);

// ===== SCREENSHOT PER-SEZIONE =====
// Una per ogni sezione, con scroll mirato. Permette a Claude di guardare la
// sezione in isolamento prima di scrivere il blueprint.
if (!skipSectionShots) {
  console.log(`  · Screenshot per-sezione (${audit.sections.length})…`);
  for (let i = 0; i < audit.sections.length; i++) {
    const s = audit.sections[i];
    const y = s.style.rect.y;
    const h = Math.min(s.style.rect.h, 2400);
    await page.evaluate((scrollY) => window.scrollTo(0, Math.max(0, scrollY)), y);
    await page.waitForTimeout(400);
    await page.screenshot({
      path: join(shotsDir, `section-${String(i).padStart(2, '0')}.png`),
      clip: { x: 0, y: 0, width: viewport.width, height: Math.min(viewport.height, h + 200) },
    });
  }
}

await browser.close();

// ===== ASSET DOWNLOAD =====
let assetMap = {};
if (!skipAssets) {
  console.log('\n  · Download asset…');
  const allUrls = new Set();
  for (const s of audit.sections) {
    for (const i of s.images) if (i.src) allUrls.add(i.src);
    for (const g of s.grids) for (const it of g.items) if (it.image?.src) allUrls.add(it.image.src);
  }
  if (audit.header?.logo?.src) allUrls.add(audit.header.logo.src);
  for (const i of audit.footer?.images || []) if (i.src) allUrls.add(i.src);
  if (audit.meta.favicon) allUrls.add(audit.meta.favicon);
  if (audit.meta.ogImage) allUrls.add(audit.meta.ogImage);
  for (const u of audit.bgImages) {
    try { allUrls.add(new URL(u, url).href); } catch {}
  }
  for (const u of networkImages) allUrls.add(u);

  let downloaded = 0, failed = 0;
  for (const src of allUrls) {
    if (!src.startsWith('http')) continue;
    try {
      const r = await fetch(src);
      if (!r.ok) { failed++; continue; }
      const ct = r.headers.get('content-type') || '';
      if (!ct.startsWith('image/') && !ct.includes('svg')) { failed++; continue; }
      const ext = extname(new URL(src).pathname) || '.' + ct.split('/')[1].split(';')[0];
      const hash = createHash('sha1').update(src).digest('hex').slice(0, 12);
      const fname = `${hash}${ext}`;
      await pipeline(r.body, createWriteStream(join(assetsDir, fname)));
      assetMap[src] = `assets/${fname}`;
      downloaded++;
    } catch {
      failed++;
    }
  }
  console.log(`    ${downloaded} asset scaricati, ${failed} falliti`);
}

audit._meta = { sourceUrl: url, assetMap, generatedAt: new Date().toISOString() };

// ===== OUTPUT =====
await writeFile(join(outDir, 'audit.json'), JSON.stringify(audit, null, 2));

// audit-summary.md — TOC per Claude
const summary = [];
summary.push(`# Audit summary — ${url}`);
summary.push('');
summary.push(`Generated: ${new Date().toISOString()}`);
summary.push('');
summary.push('## Meta');
summary.push(`- Title: ${audit.meta.title}`);
summary.push(`- Description: ${audit.meta.description || '—'}`);
summary.push(`- Lang: ${audit.meta.lang || '—'}`);
summary.push(`- Favicon: ${audit.meta.favicon || '—'}`);
summary.push('');
summary.push('## Tipografia');
summary.push(`- Body: ${audit.fonts.body}`);
summary.push(`- H1: ${audit.fonts.h1 || '—'}`);
summary.push(`- H2: ${audit.fonts.h2 || '—'}`);
summary.push('');
if (audit.header) {
  summary.push('## Header');
  summary.push(`- Sticky: ${audit.header.sticky}, height ${audit.header.height}px`);
  summary.push(`- Bg: \`${audit.header.bg}\``);
  summary.push(`- Logo: ${audit.header.logo?.src || '—'}`);
  summary.push(`- Nav items (${audit.header.nav?.length || 0}): ${audit.header.nav?.map((n) => n.label).join(' · ') || '—'}`);
  summary.push('');
}
if (audit.footer) {
  summary.push('## Footer');
  summary.push(`- Height ${audit.footer.height}px, bg \`${audit.footer.bg}\``);
  summary.push(`- Columns title: ${audit.footer.cols.join(' · ') || '—'}`);
  summary.push(`- Social: ${audit.footer.social.map((s) => s.network).join(' · ') || '—'}`);
  summary.push('');
}
summary.push('## Sezioni');
summary.push(`Trovate ${audit.sections.length} sezioni top-level. Per ognuna, vedi \`screenshots/section-NN.png\` e \`audit.json sections[N]\` per i dati grezzi.`);
summary.push('');
for (const s of audit.sections) {
  const idx = String(s.idx).padStart(2, '0');
  const mainH = s.headings[0]?.text || '(no heading)';
  summary.push(`### Sezione ${idx} — ${mainH}`);
  summary.push(`- Screenshot: \`screenshots/section-${idx}.png\``);
  summary.push(`- Tag: \`${s.tag}\` | bg \`${s.style.bg}\` | y=${s.style.rect.y} h=${s.style.rect.h}px`);
  if (s.style.bgImage && s.style.bgImage !== 'none') summary.push(`- BG image: \`${s.style.bgImage.slice(0, 100)}…\``);
  if (s.headings.length > 1) summary.push(`- Heading: ${s.headings.map((h) => `${h.tag}: "${h.text.slice(0, 50)}"`).slice(0, 5).join(' / ')}`);
  if (s.grids.length) {
    for (const g of s.grids) {
      const sample = g.items[0]?.title || g.items[0]?.innerText?.slice(0, 40) || '?';
      summary.push(`- **GRID** ${g.itemCount} items × ~${g.itemWidth}px (display: ${g.display}) — es. "${sample}"`);
    }
  }
  if (s.buttons.length) summary.push(`- Buttons: ${s.buttons.map((b) => `"${b.text}"`).slice(0, 5).join(', ')}`);
  if (s.iframes.length) summary.push(`- Iframes: ${s.iframes.map((f) => f.src?.slice(0, 60)).join(' | ')}`);
  if (s.videos.length) summary.push(`- Videos: ${s.videos.length}`);
  if (s.images.length) summary.push(`- Images: ${s.images.length}`);
  summary.push('');
}
summary.push('## Pagine secondarie');
for (const l of audit.internalLinks) summary.push(`- ${l}`);
summary.push('');
summary.push('---');
summary.push('## Next steps (per Claude)');
summary.push('1. Apri `screenshots/desktop.png` per vista d\'insieme.');
summary.push('2. Per ogni sezione: apri `screenshots/section-NN.png` + leggi `audit.json sections[N]`.');
summary.push('3. Decidi widget Element Node appropriati (vedi `references/widget-reference.md`).');
summary.push('4. Scrivi blueprint sezione per sezione, importa in MERGE (non replace) dopo ogni sezione, verifica visivamente con `diff-clone.mjs` a metà strada.');
summary.push('5. NON copiare l\'intera struttura in un colpo solo — il rendimento per-token degrada.');

await writeFile(join(outDir, 'audit-summary.md'), summary.join('\n'));

console.log(`\n✓ Done\n`);
console.log(`  Output dir: ${outDir}`);
console.log(`  - audit.json            (${audit.sections.length} sezioni, ${Object.keys(assetMap).length} asset)`);
console.log(`  - audit-summary.md      (TOC leggibile per Claude)`);
console.log(`  - screenshots/`);
console.log(`      desktop.png + mobile.png + ${audit.sections.length} section-NN.png`);
console.log(`  - assets/               (${Object.keys(assetMap).length} file)\n`);

console.log(`⚠ Niente blueprint auto-generato. Tocca a Claude:`);
console.log(`  1. Leggere audit-summary.md`);
console.log(`  2. Aprire screenshots/desktop.png per panoramica`);
console.log(`  3. Aprire screenshots/section-NN.png + audit.json per ogni sezione`);
console.log(`  4. Scrivere blueprint sezione per sezione`);
console.log(`  5. Importare incrementalmente con merge\n`);
