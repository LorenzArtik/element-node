#!/usr/bin/env node
// upload-assets.mjs — Carica gli asset scaricati da clone-site.mjs su /api/media
// del CMS Element Node e riscrive gli URL nel blueprint.
//
// Usage:
//   node upload-assets.mjs <clone-dir>
//
// Richiede env:
//   EN_URL=http://localhost:3000
//   EN_EMAIL=admin@example.com
//   EN_PASSWORD=admin1234
//
// Note: /api/media/upload usa NextAuth (session cookie), non Bearer token.
// Lo script fa login Credentials e usa il cookie di sessione.

import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join, basename, extname, resolve } from 'node:path';

const cloneDir = process.argv[2];
if (!cloneDir) {
  console.error('Usage: node upload-assets.mjs <clone-dir>');
  process.exit(1);
}
const dir = resolve(cloneDir);

const baseUrl = process.env.EN_URL || 'http://localhost:3000';
const email = process.env.EN_EMAIL;
const password = process.env.EN_PASSWORD;
if (!email || !password) {
  console.error('Mancano EN_EMAIL e EN_PASSWORD. Esempio:\n  export EN_EMAIL="admin@example.com"\n  export EN_PASSWORD="admin1234"');
  process.exit(1);
}

console.log(`\n▶ Upload assets da: ${dir}`);
console.log(`  → CMS: ${baseUrl}\n`);

// ===== STEP 1: leggi blueprint + asset map =====
const draftPath = join(dir, 'blueprint-draft.json');
const blueprint = JSON.parse(await readFile(draftPath, 'utf-8'));
const assetMap = blueprint._meta?.assetMap || {};
const assetsDir = join(dir, 'assets');

let assets;
try {
  assets = (await readdir(assetsDir)).filter((f) => !f.startsWith('.'));
} catch {
  console.warn(`  ⚠ Directory assets/ non trovata in ${dir}, salto upload.`);
  await writeFile(join(dir, 'blueprint.json'), JSON.stringify(blueprint, null, 2));
  process.exit(0);
}
console.log(`  · ${assets.length} asset da caricare\n`);

// ===== STEP 2: login NextAuth Credentials → cookie =====
console.log('  · Login NextAuth…');
const cookieJar = new Map();
const fetchWithCookies = async (url, opts = {}) => {
  const headers = new Headers(opts.headers || {});
  if (cookieJar.size > 0) {
    headers.set('cookie', [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join('; '));
  }
  const res = await fetch(url, { ...opts, headers, redirect: 'manual' });
  const setCookies = res.headers.getSetCookie?.() || [];
  for (const sc of setCookies) {
    const [pair] = sc.split(';');
    const [k, ...v] = pair.split('=');
    if (k && v.length) cookieJar.set(k.trim(), v.join('=').trim());
  }
  return res;
};

// 1. CSRF token
const csrfRes = await fetchWithCookies(`${baseUrl}/api/auth/csrf`);
const { csrfToken } = await csrfRes.json();
if (!csrfToken) {
  console.error('✗ Impossibile ottenere csrfToken da /api/auth/csrf');
  process.exit(1);
}

// 2. Login Credentials
const loginBody = new URLSearchParams({
  email, password, csrfToken,
  callbackUrl: `${baseUrl}/admin`,
  json: 'true',
});
const loginRes = await fetchWithCookies(`${baseUrl}/api/auth/callback/credentials`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: loginBody.toString(),
});
// NextAuth ritorna 302 in caso di success
if (loginRes.status >= 400) {
  console.error(`✗ Login fallito: HTTP ${loginRes.status}`);
  console.error(await loginRes.text().catch(() => ''));
  process.exit(1);
}
// Verifica session
const sessionRes = await fetchWithCookies(`${baseUrl}/api/auth/session`);
const session = await sessionRes.json().catch(() => null);
if (!session?.user) {
  console.error('✗ Sessione non valida dopo login. Verifica EN_EMAIL/EN_PASSWORD.');
  process.exit(1);
}
console.log(`    ✓ Loggato come ${session.user.email}\n`);

// ===== STEP 3: upload ogni asset =====
const mime = (ext) => {
  const m = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.png': 'image/png', '.gif': 'image/gif',
    '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.avif': 'image/avif', '.ico': 'image/x-icon',
  };
  return m[ext.toLowerCase()] || 'application/octet-stream';
};

const uploaded = {}; // localFilename → CMS URL
let okCount = 0, errCount = 0;

for (const fname of assets) {
  const fpath = join(assetsDir, fname);
  const st = await stat(fpath);
  if (!st.isFile()) continue;
  const ext = extname(fname);
  const buf = await readFile(fpath);
  const blob = new Blob([buf], { type: mime(ext) });

  const fd = new FormData();
  fd.append('file', blob, fname);

  const res = await fetchWithCookies(`${baseUrl}/api/media/upload`, {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) {
    errCount++;
    const err = await res.text().catch(() => '');
    console.warn(`    ✗ ${fname} → HTTP ${res.status} ${err.slice(0, 100)}`);
    continue;
  }
  const json = await res.json();
  uploaded[fname] = json.url; // es. "/uploads/abc123.jpg"
  okCount++;
  if (okCount % 10 === 0) process.stdout.write(`    · ${okCount} uploaded…\n`);
}
console.log(`\n    ${okCount} OK, ${errCount} errori\n`);

// ===== STEP 4: riscrivi gli URL nel blueprint =====
console.log('  · Riscrittura URL nel blueprint…');
const remap = (val) => {
  if (typeof val !== 'string') return val;
  for (const [origUrl, relPath] of Object.entries(assetMap)) {
    const fname = relPath.replace(/^assets\//, '');
    if (uploaded[fname]) {
      if (val === origUrl) return uploaded[fname];
      if (val === relPath) return uploaded[fname];
      // path relativo/URL originale dentro stringhe (es. html widget con PIÙ immagini):
      // sostituisci e CONTINUA il loop — un widget html può referenziare molti asset diversi
      if (val.includes(relPath)) val = val.split(relPath).join(uploaded[fname]);
      if (val.includes(origUrl)) val = val.split(origUrl).join(uploaded[fname]);
    }
  }
  return val;
};

function walk(obj) {
  if (Array.isArray(obj)) return obj.map(walk);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = walk(v);
    return out;
  }
  return remap(obj);
}

const final = walk(blueprint);
delete final._meta;

const outFile = join(dir, 'blueprint.json');
await writeFile(outFile, JSON.stringify(final, null, 2));

console.log(`\n✓ Done`);
console.log(`  Blueprint pronto: ${outFile}`);
console.log(`  ${okCount} URL asset rimappati sul CMS\n`);
console.log(`Next step:`);
console.log(`  node ${import.meta.url.replace('upload-assets.mjs', 'import.mjs')} ${outFile} --dry-run`);
console.log(`  node ${import.meta.url.replace('upload-assets.mjs', 'import.mjs')} ${outFile}`);
