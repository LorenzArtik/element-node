#!/usr/bin/env node
// visual-diff.mjs — Cattura screenshot di target e clone in coppia,
// salvati con la stessa convenzione di nome così il comparatore può
// confrontarli fianco-a-fianco.
//
// Usage:
//   node visual-diff.mjs <url-target> <url-clone> [--out <dir>] [--per-section]
//
// Output: <dir>/
//   - target-full.png         (full-page desktop)
//   - clone-full.png          (full-page desktop)
//   - target-mobile.png
//   - clone-mobile.png
//   - (con --per-section)
//   - target-sec-NN.png       (slice per sezione del target)
//   - clone-sec-NN.png        (slice della stessa Y/H sul clone, anche se la
//                              struttura del clone non coincide — utile per
//                              individuare sezioni "mancanti" o "vuote")

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const args = process.argv.slice(2);
const [targetUrl, cloneUrl] = args.filter((a) => a.startsWith('http'));
if (!targetUrl || !cloneUrl) {
  console.error('Usage: node visual-diff.mjs <url-target> <url-clone> [--out <dir>] [--per-section]');
  process.exit(1);
}
const outArg = (() => { const i = args.indexOf('--out'); return i >= 0 ? args[i + 1] : null; })();
const perSection = args.includes('--per-section');
const outDir = outArg ? resolve(outArg) : resolve(process.cwd(), 'visual-diff');
await mkdir(outDir, { recursive: true });

console.log(`\n▶ Visual diff:`);
console.log(`  Target: ${targetUrl}`);
console.log(`  Clone:  ${cloneUrl}`);
console.log(`  Out:    ${outDir}\n`);

async function shoot(url, label, sizes) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: sizes.desktop });
  const page = await ctx.newPage();
  try { await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }); }
  catch { /* continue */ }
  await page.waitForTimeout(1500);
  // scroll trigger lazy-load + counter animations triggering
  await page.evaluate(async () => {
    await new Promise((res) => {
      let y = 0;
      const step = () => {
        window.scrollBy(0, 400);
        y += 400;
        if (y < document.body.scrollHeight + 200) setTimeout(step, 80);
        else { window.scrollTo(0, 0); setTimeout(res, 400); }
      };
      step();
    });
  });
  // Settle delle animazioni: counter, fade-in, ecc. Servono ~3s.
  await page.waitForTimeout(3500);
  // Secondo scroll bottom→top per assicurarsi che tutti i counter siano in viewport
  await page.evaluate(async () => {
    await new Promise((res) => {
      window.scrollTo(0, document.body.scrollHeight);
      setTimeout(() => { window.scrollTo(0, 0); setTimeout(res, 1500); }, 1500);
    });
  });

  // Full desktop
  await page.screenshot({ path: join(outDir, `${label}-full.png`), fullPage: true });

  // Sezioni (per target SOLO, per ottenere i range Y reali)
  let sectionRanges = null;
  if (perSection && label === 'target') {
    sectionRanges = await page.evaluate(() => {
      const main = document.querySelector('main, [role="main"]') || document.body;
      const out = [];
      for (const child of main.children) {
        if (child.closest('header,footer')) continue;
        const r = child.getBoundingClientRect();
        if (r.height < 100 || r.width < 300) continue;
        out.push({ y: Math.round(window.scrollY + r.y), h: Math.round(r.height) });
      }
      return out;
    });
    if (sectionRanges.length <= 2) {
      // Fallback: scendi di un livello
      sectionRanges = await page.evaluate(() => {
        const candidates = [];
        const main = document.querySelector('main, [role="main"]') || document.body;
        for (const w of main.children) {
          for (const c of w.children) {
            if (c.closest('header,footer')) continue;
            const r = c.getBoundingClientRect();
            if (r.height < 100 || r.width < 300) continue;
            candidates.push({ y: Math.round(window.scrollY + r.y), h: Math.round(r.height) });
          }
        }
        return candidates;
      });
    }

    for (let i = 0; i < sectionRanges.length; i++) {
      const { y, h } = sectionRanges[i];
      await page.evaluate((sy) => window.scrollTo(0, sy), Math.max(0, y));
      await page.waitForTimeout(300);
      const clipH = Math.min(h, 2400);
      await page.screenshot({
        path: join(outDir, `${label}-sec-${String(i).padStart(2, '0')}.png`),
        clip: { x: 0, y: 0, width: sizes.desktop.width, height: Math.min(sizes.desktop.height, clipH) },
      });
    }
  }

  // Mobile
  await page.setViewportSize(sizes.mobile);
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(outDir, `${label}-mobile.png`), fullPage: true });

  await browser.close();
  return sectionRanges;
}

const sizes = { desktop: { width: 1440, height: 900 }, mobile: { width: 375, height: 812 } };

console.log('  · Target…');
const targetRanges = await shoot(targetUrl, 'target', sizes);

console.log('  · Clone…');
await shoot(cloneUrl, 'clone', sizes);

// Se per-section attivo, riapro il clone per fare gli stessi crop ai medesimi Y
// del target, così il comparatore può confrontare "questa è la sezione 3 del
// target → questo è quello che c'è alla stessa altezza nel clone".
if (perSection && targetRanges) {
  console.log(`  · Clone slices alle Y del target (${targetRanges.length} sezioni)…`);
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: sizes.desktop });
  const page = await ctx.newPage();
  try { await page.goto(cloneUrl, { waitUntil: 'networkidle', timeout: 45000 }); }
  catch {}
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

  for (let i = 0; i < targetRanges.length; i++) {
    const { y, h } = targetRanges[i];
    await page.evaluate((sy) => window.scrollTo(0, sy), Math.max(0, y));
    await page.waitForTimeout(300);
    const clipH = Math.min(h, 2400);
    await page.screenshot({
      path: join(outDir, `clone-sec-${String(i).padStart(2, '0')}.png`),
      clip: { x: 0, y: 0, width: sizes.desktop.width, height: Math.min(sizes.desktop.height, clipH) },
    });
  }
  await browser.close();
}

console.log(`\n✓ Screenshot pronti in ${outDir}\n`);
console.log(`File chiave:`);
console.log(`  target-full.png + clone-full.png       (panoramica)`);
console.log(`  target-mobile.png + clone-mobile.png   (mobile)`);
if (perSection) {
  console.log(`  target-sec-NN.png + clone-sec-NN.png   (per sezione, stessa Y)`);
}
