#!/usr/bin/env node
/**
 * Self-update di Element Node CMS. Lanciato in modalità detached dall'API
 * /api/admin/self-update: sopravvive al riavvio dell'app e scrive il progresso
 * in tmp/update-state.json (+ log completo in tmp/update.log).
 *
 * Flusso: scarica il tarball di GitHub main → sovrascrive i sorgenti
 * (mai .env / public/uploads, che non stanno nel repo) → npm install →
 * prisma db push+generate → build → copia in .next/standalone → restart.
 * Se un passo fallisce PRIMA della copia finale, la versione in esecuzione
 * resta intatta.
 */
import { execFileSync, execSync } from 'child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

const TARBALL = 'https://codeload.github.com/LorenzArtik/element-node/tar.gz/refs/heads/main';
const ROOT = process.argv[2] || process.cwd();
const TMP = join(ROOT, 'tmp');
const STATE = join(TMP, 'update-state.json');
const LOCK = join(TMP, 'update.lock');
const LOG = join(TMP, 'update.log');

mkdirSync(TMP, { recursive: true });
const logStream = createWriteStream(LOG, { flags: 'w' });
let logBuf = '';

function log(line) {
  const msg = `[${new Date().toISOString()}] ${line}`;
  logStream.write(msg + '\n');
  logBuf = (logBuf + msg + '\n').slice(-4000);
}

function setState(patch) {
  let prev = {};
  try { prev = JSON.parse(readFileSync(STATE, 'utf8')); } catch { /* primo run */ }
  writeFileSync(STATE, JSON.stringify({ ...prev, ...patch, log: logBuf }, null, 2));
}

function run(cmd, args, opts = {}) {
  log(`$ ${cmd} ${args.join(' ')}`);
  const out = execFileSync(cmd, args, {
    cwd: ROOT,
    env: {
      // env minimale: ereditare quello del server Next in esecuzione rompe `next build`
      PATH: `${dirname(process.execPath)}:${process.env.PATH || '/usr/local/bin:/usr/bin:/bin'}`,
      HOME: process.env.HOME || ROOT,
      USER: process.env.USER || '',
      LANG: process.env.LANG || 'en_US.UTF-8',
      NODE_OPTIONS: '--max-old-space-size=2048',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024,
    ...opts,
  });
  const text = out?.toString() || '';
  if (text.trim()) log(text.trim().split('\n').slice(-15).join('\n'));
  return text;
}

const npm = existsSync(join(dirname(process.execPath), 'npm')) ? join(dirname(process.execPath), 'npm') : 'npm';
const npx = existsSync(join(dirname(process.execPath), 'npx')) ? join(dirname(process.execPath), 'npx') : 'npx';

const fromVersion = (() => {
  try { return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version; } catch { return '?'; }
})();

async function main() {
  writeFileSync(LOCK, String(process.pid));
  setState({ status: 'running', step: 'download', startedAt: new Date().toISOString(), finishedAt: null, error: null, fromVersion, toVersion: null });
  log(`Self-update avviato (da v${fromVersion}) in ${ROOT}`);

  // 1. download tarball
  const tarFile = join(TMP, 'update.tar.gz');
  const res = await fetch(TARBALL, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok || !res.body) throw new Error(`download fallito: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(tarFile));
  log('tarball scaricato');

  // 2. estrai in una dir temporanea e sovrascrivi i sorgenti (merge: uploads/.env intatti)
  setState({ step: 'extract' });
  const srcDir = join(TMP, 'update-src');
  rmSync(srcDir, { recursive: true, force: true });
  mkdirSync(srcDir, { recursive: true });
  run('tar', ['xzf', tarFile, '-C', srcDir, '--strip-components=1']);
  // file di deploy specifici dell'installazione: non vanno mai sovrascritti dal repo
  for (const skip of ['.htaccess', 'app.js', '.env']) rmSync(join(srcDir, skip), { force: true });
  execSync(`cp -a "${srcDir}/." "${ROOT}/"`, { cwd: ROOT });
  log('sorgenti aggiornati');
  const toVersion = (() => {
    try { return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version; } catch { return '?'; }
  })();
  setState({ toVersion });

  // 3. dipendenze
  setState({ step: 'install' });
  run(npm, ['install', '--no-audit', '--no-fund']);

  // 4a. backup automatico del database (mysqldump) prima di toccare lo schema
  setState({ step: 'backup' });
  try {
    const envText = readFileSync(join(ROOT, '.env'), 'utf8');
    const dbUrl = (envText.match(/^DATABASE_URL="?([^"\n]+)"?/m) || [])[1];
    if (dbUrl) {
      const u = new URL(dbUrl);
      const dumpFile = join(TMP, `pre-update-${fromVersion}-${Date.now()}.sql.gz`);
      execSync(
        `mysqldump -h ${u.hostname} -P ${u.port || 3306} -u ${decodeURIComponent(u.username)} -p'${decodeURIComponent(u.password)}' ${u.pathname.slice(1).split('?')[0]} | gzip > "${dumpFile}"`,
        { cwd: ROOT }
      );
      log(`backup DB creato: ${dumpFile}`);
      // tieni solo gli ultimi 3 backup
      const { readdirSync, statSync } = await import('fs');
      const backups = readdirSync(TMP).filter((n) => n.startsWith('pre-update-')).sort();
      while (backups.length > 3) {
        const old = backups.shift();
        rmSync(join(TMP, old), { force: true });
        log(`backup vecchio rimosso: ${old}`);
      }
    } else {
      log('DATABASE_URL non trovato: backup DB saltato');
    }
  } catch (e) {
    log(`backup DB non riuscito (proseguo comunque): ${e?.message || e}`);
  }

  // 4. schema DB (senza --accept-data-loss: se l'update perderebbe dati, ci si ferma qui)
  setState({ step: 'database' });
  run(npx, ['prisma', 'db', 'push', '--skip-generate']);
  run(npx, ['prisma', 'generate']);

  // 5. build (la versione in esecuzione continua a servire da .next/standalone)
  setState({ step: 'build' });
  run(npm, ['run', 'build']);

  // 6. swap: copia gli asset nel runtime standalone
  setState({ step: 'swap' });
  execSync(
    `cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public && cp .env .next/standalone/.env 2>/dev/null || true`,
    { cwd: ROOT }
  );

  // 7. restart (Passenger; con `npm start` serve riavvio manuale del processo)
  setState({ step: 'restart' });
  writeFileSync(join(TMP, 'restart.txt'), '');
  log(`Aggiornamento completato: v${fromVersion} → v${toVersion}`);

  rmSync(srcDir, { recursive: true, force: true });
  rmSync(tarFile, { force: true });
  setState({ status: 'ok', step: 'done', finishedAt: new Date().toISOString() });
}

main()
  .catch((e) => {
    log(`ERRORE: ${e?.message || e}`);
    setState({ status: 'error', error: String(e?.message || e), finishedAt: new Date().toISOString() });
    process.exitCode = 1;
  })
  .finally(() => {
    try { unlinkSync(LOCK); } catch { /* già rimosso */ }
    logStream.end();
  });
