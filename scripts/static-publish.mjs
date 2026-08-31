#!/usr/bin/env node
/*
 * Element Node — Static Publish.
 * Genera una copia statica del sito (crawlando il render del CMS, con bypass
 * del lock via cookie) e la carica su un hosting via FTP (lftp). Pensato per
 * pubblicare su hosting economico PHP/statico tenendo il CMS come sorgente.
 *
 * Config via env (le passa la rotta /api/admin/static-publish leggendo .env):
 *   AUTH_SECRET            (per il cookie di bypass del site-access)
 *   PUBLIC_URL             origine da crawlare (es. https://praticelli.artiko.ai)
 *   STATIC_TARGET_URL      dominio pubblico finale (es. https://ipraticelli.com)
 *   STATIC_SITE_PASSWORD   password del site-access (modalità password) per il bypass
 *   STATIC_FTP_HOST/USER/PASS/REMOTE   destinazione FTP
 *   STATIC_FTP_SSL_ALLOW   'no' per FTP semplice (default 'no')
 *   STATIC_MAIL_TO         (opz.) destinatario del form → scritto in submit.php
 *   APP_ROOT               root dell'app (per tmp/)
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';

const ORIGIN = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
const TARGET = (process.env.STATIC_TARGET_URL || '').replace(/\/+$/, '');
const ROOT = process.env.APP_ROOT || process.cwd();
const OUT = path.join(ROOT, 'tmp', 'static-out');
const MAIL_TO = process.env.STATIC_MAIL_TO || 'info@thecanaryweb.com';
const FTP = {
  host: process.env.STATIC_FTP_HOST || '',
  user: process.env.STATIC_FTP_USER || '',
  pass: process.env.STATIC_FTP_PASS || '',
  remote: process.env.STATIC_FTP_REMOTE || '',
  ssl: process.env.STATIC_FTP_SSL_ALLOW || 'no',
};
const HOST_ORIGIN = ORIGIN ? new URL(ORIGIN).host : '';
const HOST_TARGET = TARGET ? new URL(TARGET).host : '';

function die(m) { console.error('ERRORE: ' + m); process.exit(1); }
if (!ORIGIN || !TARGET) die('PUBLIC_URL o STATIC_TARGET_URL mancanti');
if (!FTP.host || !FTP.user || !FTP.remote) die('config FTP incompleta');

const cookieTok = process.env.STATIC_SITE_PASSWORD
  ? crypto.createHmac('sha256', process.env.AUTH_SECRET || 'en').update('access:' + process.env.STATIC_SITE_PASSWORD).digest('base64url')
  : '';
const headers = { 'user-agent': 'EN-static-publish/1.0', ...(cookieTok ? { cookie: 'en-site-access=' + cookieTok } : {}) };
const log = (...a) => console.log(...a);
const ASSET_RE = /\.(css|js|mjs|map|png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|otf|eot|mp4|webm|ogg|pdf|json|xml)$/i;
const rewriteText = (t) => t.split(ORIGIN).join(TARGET).split('http://' + HOST_ORIGIN).join(TARGET).split('//' + HOST_ORIGIN).join('//' + HOST_TARGET).split(HOST_ORIGIN).join(HOST_TARGET);
const ensureDir = (f) => fs.mkdirSync(path.dirname(f), { recursive: true });
function pagePath(u) { let p = u.split('?')[0].split('#')[0]; if (p === '' || p === '/') return path.join(OUT, 'index.html'); p = p.replace(/^\/+/, '').replace(/\/+$/, ''); return path.join(OUT, p, 'index.html'); }
function assetPath(u) { const p = u.split('?')[0].split('#')[0].replace(/^\/+/, ''); let d; try { d = decodeURIComponent(p); } catch { d = p; } return path.join(OUT, d); }
const get = (u) => fetch(u, { headers, redirect: 'manual' });

const pages = new Set(), assets = new Set(), forms = new Set();
function harvest(html) {
  const re = /(?:src|href)\s*=\s*["']([^"']+)["']|url\(\s*['"]?([^"')]+)['"]?\s*\)/gi; let m;
  while ((m = re.exec(html))) {
    let u = (m[1] || m[2] || '').trim();
    if (!u || u.startsWith('data:') || u.startsWith('mailto:') || u.startsWith('tel:') || u.startsWith('#')) continue;
    if (u.startsWith('//')) u = 'https:' + u;
    if (u.startsWith(ORIGIN)) u = u.slice(ORIGIN.length) || '/';
    if (u.startsWith('http') || !u.startsWith('/')) continue;
    const clean = u.split('?')[0].split('#')[0];
    if (u.startsWith('/_next/') || u.startsWith('/uploads/') || ASSET_RE.test(clean)) assets.add(u);
    else if (clean.startsWith('/') && !clean.startsWith('/api/') && !clean.includes('.')) pages.add(clean.replace(/\/+$/, '') || '/');
  }
  for (const mm of html.matchAll(/\/uploads\/[A-Za-z0-9_.\-]+\.[A-Za-z0-9]+/g)) assets.add(mm[0]);
  for (const mm of html.matchAll(/\/_next\/(?:static|image)\/[^"'\\)\s?]+/g)) assets.add(mm[0]);
  const fre = /formId\\?["']?\s*:\s*\\?["']([A-Za-z0-9_-]{6,})|\/api\/public\/forms\/([A-Za-z0-9_-]{6,})/g;
  while ((m = fre.exec(html))) { const id = m[1] || m[2]; if (id) forms.add(id); }
}
async function savePage(u) {
  const r = await get(ORIGIN + u);
  if (r.status >= 300 && r.status < 400) return;
  if (!r.ok) { log('page FAIL', u, r.status); return; }
  const html = rewriteText(await r.text()); harvest(html);
  const f = pagePath(u); ensureDir(f); fs.writeFileSync(f, html);
}
async function saveAsset(u) {
  const f = assetPath(u); if (fs.existsSync(f)) return;
  const r = await get(ORIGIN + u); if (!r.ok) { log('asset FAIL', u, r.status); return; }
  const ext = path.extname(u.split('?')[0]).toLowerCase(); ensureDir(f);
  if (/\.(css|js|mjs|map|svg|json|xml|txt)$/i.test(ext)) {
    const t = rewriteText(await r.text()); fs.writeFileSync(f, t);
    if (/\.(css|js|mjs)$/i.test(ext)) { const re = /url\(\s*['"]?([^"')]+)['"]?\s*\)|["'](\/_next\/[^"']+)["']/g; let m; while ((m = re.exec(t))) { const a = (m[1] || m[2] || '').trim(); if (a.startsWith('/_next/') || a.startsWith('/uploads/')) assets.add(a.split('?')[0]); } }
  } else { fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); }
}
async function saveForm(id) {
  const r = await get(ORIGIN + '/api/public/forms/' + id); if (!r.ok) return;
  const f = path.join(OUT, 'api', 'public', 'forms', id); ensureDir(f); fs.writeFileSync(f, await r.text());
}
const SUBMIT_PHP = `<?php
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['ok'=>false]); exit; }
$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) { http_response_code(400); echo json_encode(['ok'=>false]); exit; }
if (!empty($in['honeypot']) && trim((string)$in['honeypot']) !== '') { echo json_encode(['ok'=>true,'message'=>'Grazie!']); exit; }
$data = (isset($in['data']) && is_array($in['data'])) ? $in['data'] : [];
if (count($data) > 60) { http_response_code(400); echo json_encode(['ok'=>false]); exit; }
$to = '__MAIL_TO__';
$from = 'noreply@__TARGET_HOST__';
$replyTo = ''; $lines = [];
foreach ($data as $k => $v) {
  if (is_array($v)) $v = implode(', ', $v);
  $k = preg_replace('/[\\r\\n]+/', ' ', (string)$k);
  $v = trim(preg_replace('/[\\r\\n]+/', ' ', (string)$v));
  if ($replyTo === '' && stripos($k,'mail') !== false && filter_var($v, FILTER_VALIDATE_EMAIL)) $replyTo = $v;
  $lines[] = ucfirst($k).': '.$v;
}
$body = "Nuova richiesta dal sito __TARGET_HOST__:\\n\\n".implode("\\n", $lines)."\\n";
@file_put_contents(__DIR__.'/_submissions.log', date('c').' '.json_encode($data, JSON_UNESCAPED_UNICODE)."\\n", FILE_APPEND|LOCK_EX);
$headers = "From: __TARGET_HOST__ <$from>\\r\\n";
if ($replyTo) $headers .= "Reply-To: $replyTo\\r\\n";
$headers .= "MIME-Version: 1.0\\r\\nContent-Type: text/plain; charset=UTF-8\\r\\n";
@mail($to, '=?UTF-8?B?'.base64_encode('Nuovo messaggio dal sito __TARGET_HOST__').'?=', $body, $headers, "-f$from");
echo json_encode(['ok'=>true,'message'=>'Grazie!']);
`;
const HTACCESS = `Options -MultiViews -Indexes +FollowSymLinks
DirectoryIndex index.html
DirectorySlash Off
AddDefaultCharset UTF-8
RewriteEngine On
RewriteRule ^api/forms/submit/?$ /api/forms/submit.php [L]
RewriteCond %{REQUEST_FILENAME} -d
RewriteCond %{REQUEST_FILENAME}/index.html -f
RewriteRule ^(.+?)/?$ /$1/index.html [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{DOCUMENT_ROOT}/$1/index.html -f
RewriteRule ^(.+?)/?$ /$1/index.html [L]
<IfModule mod_headers.c>
  <FilesMatch "\\.html$">
    Header set Cache-Control "no-cache, must-revalidate"
  </FilesMatch>
</IfModule>
`;

async function generate() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const sm = await get(ORIGIN + '/sitemap.xml');
  if (sm.ok) { const xml = await sm.text(); for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) { try { const u = new URL(m[1]); if (u.host === HOST_ORIGIN) pages.add(u.pathname.replace(/\/+$/, '') || '/'); } catch {} } }
  pages.add('/');
  for (let pass = 0; pass < 2; pass++) for (const u of [...pages]) { try { await savePage(u); } catch (e) { log('page err', u, e.message); } }
  const done = new Set(); let pend = [...assets];
  while (pend.length) { for (const a of pend) { if (done.has(a)) continue; done.add(a); try { await saveAsset(a); } catch (e) { log('asset err', a, e.message); } } pend = [...assets].filter(a => !done.has(a)); }
  for (const id of forms) { try { await saveForm(id); } catch {} }
  const submitF = path.join(OUT, 'api', 'forms', 'submit.php'); ensureDir(submitF);
  fs.writeFileSync(submitF, SUBMIT_PHP.split('__MAIL_TO__').join(MAIL_TO).split('__TARGET_HOST__').join(HOST_TARGET));
  fs.writeFileSync(path.join(OUT, 'api', 'forms', '.htaccess'), '<Files "_submissions.log">\n  Require all denied\n</Files>\n');
  fs.writeFileSync(path.join(OUT, '.htaccess'), HTACCESS);
  fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${TARGET}/sitemap.xml\n`);
  if (sm.ok) { const sm2 = await get(ORIGIN + '/sitemap.xml'); if (sm2.ok) fs.writeFileSync(path.join(OUT, 'sitemap.xml'), rewriteText(await sm2.text())); }
  const n = fs.readdirSync(OUT).length;
  const total = execFileSync('find', [OUT, '-type', 'f']).toString().trim().split('\n').filter(Boolean).length;
  if (!fs.existsSync(path.join(OUT, 'index.html')) || total < 40) die(`output sospetto (${total} file)`);
  log(`Generati ${total} file (${pages.size} pagine, ${done.size} asset, ${forms.size} form).`);
  return total;
}

function upload() {
  const cmds = [
    `set ftp:ssl-allow ${FTP.ssl}`,
    'set ftp:passive-mode true',
    'set net:timeout 25',
    'set net:max-retries 2',
    'set mirror:parallel-transfer-count 3',
    `mirror -R --delete --no-perms --exclude ^old/ --exclude-glob _submissions.log ${OUT}/ ${FTP.remote}/`,
    'bye',
  ].join('\n') + '\n';
  log('Carico su ' + FTP.host + FTP.remote + ' …');
  execFileSync('lftp', ['-u', `${FTP.user},${FTP.pass}`, `ftp://${FTP.host}`], { input: cmds, stdio: ['pipe', 'inherit', 'inherit'], timeout: 180000 });
  log('Upload completato.');
}

(async () => {
  log('== Static Publish ==');
  log('Sorgente: ' + ORIGIN + '  →  Destinazione: ' + TARGET);
  await generate();
  upload();
  log('✔ Pubblicato su ' + TARGET);
})().catch((e) => die(e.message || String(e)));
