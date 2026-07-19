#!/usr/bin/env node
// tag-assets.mjs — Primo livello di asset tagging: passa euristica su asset scaricati
// da clone-site.mjs e produce un manifest per agent-assisted semantic labeling.
//
// Il labeling SEMANTICO ("questo è il logo Allianz" vs "questo è uno screenshot dashboard")
// è poi delegato all'agente comparatore o a un agent dedicato, che apre ogni file
// rilevante con il tool Read (vision) e completa le label nel manifest.
//
// Lo script NON inventa label: classifica per dimensione, formato, aspect ratio,
// nome originale, e lascia "needsVision: true" per quelli ambigui.
//
// Usage:
//   node tag-assets.mjs <clone-dir>
//
// Output: <clone-dir>/assets-labels.json
//
// Struttura output:
//   {
//     "version": 1,
//     "generatedAt": "...",
//     "assetMap": { "<originalUrl>": "assets/<hash>.<ext>" },
//     "labels": {
//       "<hash>.<ext>": {
//         "originalUrl": "...",
//         "localPath": "assets/...",
//         "uploadedUrl": null | "/uploads/X.ext",
//         "size": { "bytes": 123, "width": 200, "height": 80 },
//         "format": "png" | "svg" | ...,
//         "aspectRatio": 2.5,
//         "heuristic": {
//           "type": "logo-candidate" | "photo" | "icon" | "screenshot" | "unknown",
//           "confidence": 0.7,
//           "reasons": ["small dims", "wide AR", "name contains 'logo'"]
//         },
//         "semantic": null,           // PER agente: { "label": "Allianz logo", "kind": "brand-logo", "color": "blue" }
//         "needsVision": true | false
//       }
//     }
//   }

import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { resolve, join, extname, basename } from 'node:path';
import { createReadStream } from 'node:fs';

const cloneDir = process.argv[2];
if (!cloneDir) {
  console.error('Usage: node tag-assets.mjs <clone-dir>');
  process.exit(1);
}
const dir = resolve(cloneDir);

// ===== Read audit.json per assetMap =====
let audit = null;
try {
  audit = JSON.parse(await readFile(join(dir, 'audit.json'), 'utf-8'));
} catch {
  console.warn('⚠ audit.json non trovato; lavorerò solo con i file in assets/');
}
const assetMap = audit?._meta?.assetMap || {};
// inverse map: localPath → originalUrl
const reverseMap = {};
for (const [origUrl, localRel] of Object.entries(assetMap)) {
  const fname = localRel.replace(/^assets\//, '');
  reverseMap[fname] = origUrl;
}

// ===== Read blueprint.json (se esiste) per uploaded URLs =====
let blueprint = null;
try {
  blueprint = JSON.parse(await readFile(join(dir, 'blueprint.json'), 'utf-8'));
} catch {}

// ===== Lista asset =====
const assetsDir = join(dir, 'assets');
let files = [];
try { files = (await readdir(assetsDir)).filter((f) => !f.startsWith('.')); }
catch { console.error(`✗ Directory ${assetsDir} non trovata`); process.exit(1); }

console.log(`\n▶ Tagging assets in ${assetsDir}`);
console.log(`  · ${files.length} file da analizzare\n`);

// ===== PNG dimensions parser (no dependencies) =====
async function pngDimensions(filepath) {
  const fd = await readFile(filepath);
  if (fd[0] !== 0x89 || fd[1] !== 0x50 || fd[2] !== 0x4E) return null; // not PNG
  // IHDR chunk inizia a byte 8, width/height a byte 16/20
  const w = fd.readUInt32BE(16);
  const h = fd.readUInt32BE(20);
  return { width: w, height: h };
}

async function jpegDimensions(filepath) {
  const fd = await readFile(filepath);
  if (fd[0] !== 0xFF || fd[1] !== 0xD8) return null;
  let i = 2;
  while (i < fd.length) {
    if (fd[i] !== 0xFF) return null;
    const marker = fd[i + 1];
    const len = fd.readUInt16BE(i + 2);
    // SOF markers (0xC0-0xCF except 0xC4, 0xC8, 0xCC)
    if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
      return { height: fd.readUInt16BE(i + 5), width: fd.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  return null;
}

async function svgDimensions(filepath) {
  const txt = await readFile(filepath, 'utf-8');
  const wm = txt.match(/<svg[^>]+width="?([0-9.]+)/i);
  const hm = txt.match(/<svg[^>]+height="?([0-9.]+)/i);
  const vbm = txt.match(/viewBox="([^"]+)"/i);
  if (wm && hm) return { width: parseFloat(wm[1]), height: parseFloat(hm[1]) };
  if (vbm) {
    const [, , w, h] = vbm[1].split(/\s+/).map(parseFloat);
    if (w && h) return { width: w, height: h };
  }
  return null;
}

async function gifDimensions(filepath) {
  const fd = await readFile(filepath);
  if (fd.toString('utf-8', 0, 3) !== 'GIF') return null;
  return { width: fd.readUInt16LE(6), height: fd.readUInt16LE(8) };
}

async function webpDimensions(filepath) {
  const fd = await readFile(filepath);
  if (fd.toString('utf-8', 0, 4) !== 'RIFF') return null;
  if (fd.toString('utf-8', 8, 12) !== 'WEBP') return null;
  // VP8X chunk con dimensioni a byte 24/27 (24-bit little-endian + 1)
  const chunk = fd.toString('utf-8', 12, 16);
  if (chunk === 'VP8X') {
    const w = (fd.readUIntLE(24, 3)) + 1;
    const h = (fd.readUIntLE(27, 3)) + 1;
    return { width: w, height: h };
  }
  if (chunk === 'VP8 ') {
    return { width: fd.readUInt16LE(26) & 0x3fff, height: fd.readUInt16LE(28) & 0x3fff };
  }
  return null;
}

async function getDimensions(filepath, ext) {
  const e = ext.toLowerCase();
  try {
    if (e === '.png') return await pngDimensions(filepath);
    if (e === '.jpg' || e === '.jpeg') return await jpegDimensions(filepath);
    if (e === '.svg') return await svgDimensions(filepath);
    if (e === '.gif') return await gifDimensions(filepath);
    if (e === '.webp') return await webpDimensions(filepath);
  } catch { return null; }
  return null;
}

// ===== Heuristics =====
function classify(meta) {
  const reasons = [];
  let type = 'unknown';
  let confidence = 0.0;
  let needsVision = true;

  const { format, size, originalUrl } = meta;
  const w = size.width, h = size.height;
  const ar = w && h ? w / h : null;
  const url = (originalUrl || '').toLowerCase();
  const fname = basename(meta.localPath || '').toLowerCase();

  // SVG = quasi sempre logo/icon
  if (format === 'svg') {
    type = 'logo-candidate';
    confidence = 0.6;
    reasons.push('SVG format');
    if (ar && (ar > 1.5 || ar < 0.7)) reasons.push(`AR ${ar.toFixed(2)}`);
  }

  // Favicon
  if (format === 'ico' || (w === h && w <= 64)) {
    type = 'favicon';
    confidence = 0.9;
    reasons.push('square small');
    needsVision = false;
  }

  // Filename hints (URL originale)
  if (/logo/i.test(url)) { type = 'logo-candidate'; confidence = Math.max(confidence, 0.7); reasons.push('URL contains "logo"'); }
  if (/favicon/i.test(url)) { type = 'favicon'; confidence = 0.95; reasons.push('URL contains "favicon"'); needsVision = false; }
  if (/icon/i.test(url) && !type.startsWith('logo')) { type = 'icon'; confidence = 0.5; reasons.push('URL contains "icon"'); }
  if (/avatar|profile|user/i.test(url)) { type = 'avatar'; confidence = 0.6; reasons.push('URL contains avatar/profile'); }

  // Dimension-based
  if (w && h) {
    // Loghi tipicamente larghi-bassi, dim 100-600px
    if (w >= 80 && w <= 600 && h >= 30 && h <= 200 && ar >= 1.5) {
      if (type === 'unknown') { type = 'logo-candidate'; confidence = 0.6; }
      reasons.push(`logo-shape ${w}x${h}`);
    }
    // Icone: piccole quadrate
    else if (w === h && w <= 128) {
      if (type === 'unknown') { type = 'icon'; confidence = 0.5; }
      reasons.push(`small square ${w}px`);
    }
    // Foto/screenshot grandi
    else if (w >= 800 && h >= 400) {
      if (type === 'unknown') {
        type = ar >= 1.4 && ar <= 2.0 ? 'screenshot' : 'photo';
        confidence = 0.5;
      }
      reasons.push(`large ${w}x${h}`);
    }
    // Medium photos
    else if (w >= 300 && h >= 200) {
      if (type === 'unknown') { type = 'photo'; confidence = 0.4; }
      reasons.push(`medium ${w}x${h}`);
    }
  } else {
    reasons.push('dimensions unknown');
  }

  // File size hint
  if (meta.size.bytes < 8000 && type !== 'unknown') {
    confidence = Math.min(confidence + 0.1, 1);
    reasons.push('small file');
  }

  // Vision raccomandata se: confidence bassa, oppure type=logo/photo (semantica utile)
  if (confidence < 0.7 || ['logo-candidate', 'photo', 'screenshot', 'avatar'].includes(type)) {
    needsVision = true;
  } else {
    needsVision = false;
  }

  return { type, confidence: Math.round(confidence * 100) / 100, reasons, needsVision };
}

// ===== Find uploaded URL from blueprint =====
function findUploadedUrl(localPath) {
  if (!blueprint) return null;
  const search = (val) => {
    if (typeof val === 'string' && val.startsWith('/uploads/')) {
      // confronto basico: il path locale era assets/<hash>.<ext>, l'upload usa nanoid.<ext> — non c'è corrispondenza diretta
      // Per ora non possiamo ricollegare automaticamente. L'utente di tag-assets vedrà solo che il file è stato uploadato in qualche modo.
    }
    return null;
  };
  // TODO: se serve, implementare matching su contenuto (hash file vs media table)
  return null;
}

// ===== MAIN =====
const labels = {};
for (const fname of files) {
  const fpath = join(assetsDir, fname);
  const st = await stat(fpath);
  if (!st.isFile()) continue;
  const ext = extname(fname);
  const fmt = ext.replace(/^\./, '').toLowerCase();
  const dims = await getDimensions(fpath, ext);
  const meta = {
    originalUrl: reverseMap[fname] || null,
    localPath: `assets/${fname}`,
    uploadedUrl: findUploadedUrl(`assets/${fname}`),
    size: { bytes: st.size, width: dims?.width || null, height: dims?.height || null },
    format: fmt,
    aspectRatio: dims?.width && dims?.height ? Math.round((dims.width / dims.height) * 100) / 100 : null,
  };
  meta.heuristic = classify(meta);
  meta.semantic = null;  // popolato dall'agente
  meta.needsVision = meta.heuristic.needsVision;
  labels[fname] = meta;
}

const out = {
  version: 1,
  generatedAt: new Date().toISOString(),
  cloneDir: dir,
  totals: {
    files: files.length,
    byType: Object.values(labels).reduce((acc, l) => {
      const t = l.heuristic.type;
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {}),
    needsVision: Object.values(labels).filter((l) => l.needsVision).length,
  },
  assetMap,
  labels,
};

const outFile = join(dir, 'assets-labels.json');
await writeFile(outFile, JSON.stringify(out, null, 2));

console.log(`✓ Manifest scritto: ${outFile}`);
console.log(`  Totale: ${files.length} asset`);
console.log(`  Per type:`);
for (const [t, n] of Object.entries(out.totals.byType)) console.log(`    ${t}: ${n}`);
console.log(`  ${out.totals.needsVision} richiedono passata vision dell'agente.`);
console.log(`\nNext step (Claude / agente comparatore):`);
console.log(`  Per ogni asset con needsVision:true e heuristic.type in [logo-candidate, photo, screenshot, avatar]:`);
console.log(`    1. Read del file PNG/SVG/JPG`);
console.log(`    2. Identificare semanticamente (es. "logo Allianz", "dashboard screenshot", "team member John")`);
console.log(`    3. Aggiornare il campo semantic = { label, kind, color, notes } nel manifest`);
console.log(`    4. (opzionale) Riscrivere il file con il manifest aggiornato`);
console.log(`\nCosì l'agente builder può mappare correttamente "logo partner Allianz" all'asset giusto nel blueprint.`);
