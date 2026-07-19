#!/usr/bin/env node
// diff-clone.mjs — Confronta sito originale vs sito clonato.
// Restituisce uno score 0-100 + lista gap concreti da patchare.
//
// Usage:
//   node diff-clone.mjs <url-originale> <url-clone> [--out report.json] [--no-pixel]

import { chromium } from 'playwright';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const [origUrl, cloneUrl] = args.filter((a) => a.startsWith('http'));
if (!origUrl || !cloneUrl) {
  console.error('Usage: node diff-clone.mjs <url-originale> <url-clone> [--out report.json] [--no-pixel]');
  process.exit(1);
}
const outArg = (() => { const i = args.indexOf('--out'); return i >= 0 ? args[i + 1] : null; })();
const skipPixel = args.includes('--no-pixel');

console.log(`\n▶ Diff:`);
console.log(`  Originale: ${origUrl}`);
console.log(`  Clone:     ${cloneUrl}\n`);

async function inspect(url, label) {
  console.log(`  · Analisi ${label}…`);
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  } catch {
    /* continue with current DOM */
  }
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    await new Promise((res) => {
      let y = 0;
      const step = () => {
        window.scrollBy(0, 400);
        y += 400;
        if (y < document.body.scrollHeight + 200) setTimeout(step, 60);
        else { window.scrollTo(0, 0); setTimeout(res, 400); }
      };
      step();
    });
  });

  const data = await page.evaluate(() => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const sectionEls = [...document.querySelectorAll('section, main > div')]
      .filter((s) => {
        const r = s.getBoundingClientRect();
        return r.height > 150 && r.width > 300 && !s.closest('header,footer');
      });
    const sections = sectionEls.map((s) => ({
      headings: [...s.querySelectorAll('h1,h2,h3')].map((h) => norm(h.innerText)).filter(Boolean),
      cards: s.querySelectorAll('[class*=card],[class*=service],[class*=feature],[class*=item],[class*=box]').length,
      buttons: [...s.querySelectorAll('a.btn,a.button,button,a[class*="cta" i]')]
        .filter((b) => b.innerText.trim()).map((b) => norm(b.innerText)),
      images: s.querySelectorAll('img').length,
      iframes: s.querySelectorAll('iframe').length,
      videos: s.querySelectorAll('video').length,
      stats: [...s.querySelectorAll('[class*=stat],[class*=counter],[class*=number]')]
        .map((x) => x.innerText.trim()).filter((t) => /\d/.test(t)),
    }));
    const fullText = norm(document.body.innerText);
    const palette = (() => {
      const counts = new Map();
      for (const el of [...document.querySelectorAll('section,header,footer,h1,h2,h3,button,a.btn,a.button')].slice(0, 200)) {
        const cs = getComputedStyle(el);
        for (const v of [cs.backgroundColor, cs.color]) {
          if (!v || v === 'rgba(0, 0, 0, 0)') continue;
          counts.set(v, (counts.get(v) || 0) + 1);
        }
      }
      return [...counts.entries()].sort(([, a], [, b]) => b - a).slice(0, 8).map(([color]) => color);
    })();
    return {
      sections,
      fullText,
      title: document.title,
      headerHeight: document.querySelector('header')?.offsetHeight || 0,
      footerHeight: document.querySelector('footer')?.offsetHeight || 0,
      footerCols: [...(document.querySelector('footer')?.querySelectorAll('h2,h3,h4,strong') || [])].map((h) => h.innerText.trim()),
      navItems: [...(document.querySelector('header')?.querySelectorAll('a') || [])]
        .filter((a) => a.innerText.trim().length > 0 && a.innerText.trim().length < 40)
        .map((a) => a.innerText.trim()),
      palette,
    };
  });

  let screenshot = null;
  if (!skipPixel) {
    const tmp = await mkdtemp(join(tmpdir(), 'diff-'));
    const p = join(tmp, 'shot.png');
    await page.screenshot({ path: p, fullPage: true });
    screenshot = p;
  }
  await browser.close();
  return { data, screenshot };
}

const orig = await inspect(origUrl, 'originale');
const clone = await inspect(cloneUrl, 'clone');

// ===== SCORING =====
const gaps = [];
let score = 100;

function gap(severity, msg) {
  gaps.push({ severity, msg });
  score -= severity;
}

// 1. Numero sezioni
const origSections = orig.data.sections.length;
const cloneSections = clone.data.sections.length;
if (origSections !== cloneSections) {
  gap(15, `Sezioni: originale ${origSections} vs clone ${cloneSections} (diff ${Math.abs(origSections - cloneSections)})`);
}

// 2. Heading per sezione
const minLen = Math.min(origSections, cloneSections);
for (let i = 0; i < minLen; i++) {
  const o = orig.data.sections[i].headings;
  const c = clone.data.sections[i].headings;
  if (o.length !== c.length) {
    gap(3, `Sezione #${i + 1}: heading count ${o.length} vs ${c.length}`);
  }
  // confronto testuale dei heading
  const missing = o.filter((h) => !c.some((x) => x.includes(h.slice(0, 20)) || h.includes(x.slice(0, 20))));
  for (const m of missing.slice(0, 3)) gap(4, `Sezione #${i + 1}: heading mancante nel clone — "${m.slice(0, 60)}"`);
}

// 3. Buttons CTA mancanti
for (let i = 0; i < minLen; i++) {
  const o = orig.data.sections[i].buttons;
  const c = clone.data.sections[i].buttons;
  const missing = o.filter((b) => !c.includes(b)).slice(0, 3);
  for (const b of missing) gap(2, `Sezione #${i + 1}: CTA mancante — "${b.slice(0, 40)}"`);
}

// 4. Cards count
for (let i = 0; i < minLen; i++) {
  const oCards = orig.data.sections[i].cards;
  const cCards = clone.data.sections[i].cards;
  if (oCards > 0 && Math.abs(oCards - cCards) > 1) {
    gap(3, `Sezione #${i + 1}: card count ${oCards} vs ${cCards}`);
  }
}

// 5. Video / iframes
for (let i = 0; i < minLen; i++) {
  const oVideo = orig.data.sections[i].iframes + orig.data.sections[i].videos;
  const cVideo = clone.data.sections[i].iframes + clone.data.sections[i].videos;
  if (oVideo !== cVideo) gap(4, `Sezione #${i + 1}: video/iframe ${oVideo} vs ${cVideo}`);
}

// 6. Stats
const allOrigStats = orig.data.sections.flatMap((s) => s.stats);
const allCloneStats = clone.data.sections.flatMap((s) => s.stats);
if (allOrigStats.length > 0 && allCloneStats.length === 0) {
  gap(6, `Stats counters mancanti completamente nel clone (originale: ${allOrigStats.length})`);
}

// 7. Header nav
const navMissing = orig.data.navItems.filter((n) => !clone.data.navItems.includes(n));
for (const n of navMissing.slice(0, 5)) gap(2, `Nav item mancante: "${n}"`);

// 8. Footer columns
if (orig.data.footerCols.length > 0 && clone.data.footerCols.length === 0) {
  gap(4, `Footer: colonne con heading mancanti (originale: ${orig.data.footerCols.length})`);
}

// 9. Pixel diff (opzionale, leggero)
let pixelDiffPct = null;
if (orig.screenshot && clone.screenshot && !skipPixel) {
  try {
    const { default: pixelmatch } = await import('pixelmatch');
    const { PNG } = await import('pngjs');
    const img1 = PNG.sync.read(await readFile(orig.screenshot));
    const img2 = PNG.sync.read(await readFile(clone.screenshot));
    if (img1.width === img2.width && img1.height === img2.height) {
      const diff = new PNG({ width: img1.width, height: img1.height });
      const numDiff = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, { threshold: 0.2 });
      pixelDiffPct = (numDiff / (img1.width * img1.height)) * 100;
      if (pixelDiffPct > 30) gap(5, `Pixel-diff alto: ${pixelDiffPct.toFixed(1)}% (>30%)`);
      else if (pixelDiffPct > 15) gap(2, `Pixel-diff moderato: ${pixelDiffPct.toFixed(1)}% (>15%)`);
    } else {
      gap(2, `Dimensioni screenshot diverse: orig ${img1.width}x${img1.height} vs clone ${img2.width}x${img2.height}`);
    }
  } catch (e) {
    console.warn(`  ⚠ Pixel-diff non disponibile (manca pixelmatch/pngjs?): ${e.message}`);
  }
}

score = Math.max(0, Math.round(score));

const report = {
  generatedAt: new Date().toISOString(),
  origUrl,
  cloneUrl,
  score,
  pixelDiffPct,
  summary: {
    origSections,
    cloneSections,
    origHeadings: orig.data.sections.reduce((acc, s) => acc + s.headings.length, 0),
    cloneHeadings: clone.data.sections.reduce((acc, s) => acc + s.headings.length, 0),
    origStats: allOrigStats.length,
    cloneStats: allCloneStats.length,
    navMissing: navMissing.length,
  },
  gaps,
};

const outFile = outArg ? outArg : 'diff-report.json';
await writeFile(outFile, JSON.stringify(report, null, 2));

console.log(`\n=== Fedeltà clone ===`);
console.log(`  Score: ${score}/100`);
if (pixelDiffPct != null) console.log(`  Pixel-diff: ${pixelDiffPct.toFixed(1)}%`);
console.log(`  Sezioni: ${origSections} → ${cloneSections}`);
console.log(`  Heading: ${report.summary.origHeadings} → ${report.summary.cloneHeadings}`);
console.log(`  Stats counter: ${report.summary.origStats} → ${report.summary.cloneStats}\n`);

if (gaps.length === 0) {
  console.log(`✓ Nessun gap rilevato`);
} else {
  console.log(`Gap rilevati (${gaps.length}):`);
  for (const g of gaps) console.log(`  [-${g.severity}] ${g.msg}`);
}
console.log(`\nReport salvato: ${outFile}\n`);

if (score < 90) {
  console.log(`⚠ Score sotto soglia 90. Patcha il blueprint e re-importa.\n`);
  process.exit(1);
}
