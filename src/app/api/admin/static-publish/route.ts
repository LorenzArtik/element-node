import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { auth } from '@/lib/auth';
import { ApiError, handleApiError } from '@/lib/api-error';
import { resolveAppRoot } from '@/lib/app-root';
import { getSiteSettings } from '@/lib/site-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Legge una variabile core dall'ambiente, con fallback al file .env. */
function envVar(root: string, key: string): string {
  if (process.env[key]) return process.env[key] as string;
  try {
    const m = readFileSync(join(root, '.env'), 'utf8').match(new RegExp(`^\\s*${key}\\s*=\\s*"?([^"\\n]*)"?`, 'm'));
    return m ? m[1] : '';
  } catch {
    return '';
  }
}

/** Pubblica la versione statica del sito sull'hosting FTP configurato (solo ADMIN). */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    if ((session.user as { role?: string }).role !== 'ADMIN') {
      throw new ApiError('forbidden', 'Solo un amministratore può pubblicare', 403);
    }

    const site = await getSiteSettings();
    const cfg = site.integrations.staticPublish;
    if (!cfg?.enabled) {
      throw new ApiError('not_configured', 'Pubblicazione statica non attiva: configurala e salva, poi riprova.', 400);
    }
    if (!cfg.targetUrl || !cfg.ftpHost || !cfg.ftpUser || !cfg.ftpRemotePath) {
      throw new ApiError('not_configured', 'Configurazione FTP incompleta (dominio, host, utente e cartella sono obbligatori).', 400);
    }

    const root = resolveAppRoot();
    const script = join(root, 'scripts', 'static-publish.mjs');
    if (!existsSync(script)) throw new ApiError('not_supported', 'Script di pubblicazione non trovato', 500);

    const sa = site.integrations.siteAccess;
    const childEnv: NodeJS.ProcessEnv = {
      ...process.env,
      APP_ROOT: root,
      PATH: `${process.env.PATH || ''}:/usr/local/bin:/usr/bin:/bin`,
      PUBLIC_URL: envVar(root, 'PUBLIC_URL'),
      AUTH_SECRET: envVar(root, 'AUTH_SECRET'),
      STATIC_TARGET_URL: cfg.targetUrl,
      STATIC_SITE_PASSWORD: sa?.mode === 'password' ? sa.password : '',
      STATIC_FTP_HOST: cfg.ftpHost,
      STATIC_FTP_USER: cfg.ftpUser,
      STATIC_FTP_PASS: cfg.ftpPass,
      STATIC_FTP_REMOTE: cfg.ftpRemotePath,
      STATIC_FTP_SSL_ALLOW: cfg.ftpSsl ? 'yes' : 'no',
      STATIC_MAIL_TO: cfg.mailTo,
    };

    const result = await new Promise<{ stdout: string; stderr: string; code: number; killed: boolean }>((resolve) => {
      execFile(
        process.execPath,
        [script],
        { cwd: root, env: childEnv, timeout: 175000, maxBuffer: 4 * 1024 * 1024 },
        (err, stdout, stderr) => {
          const exitCode = err ? (typeof err.code === 'number' ? err.code : 1) : 0;
          resolve({ stdout: stdout || '', stderr: stderr || '', code: exitCode, killed: Boolean(err?.killed) });
        },
      );
    });

    const log = `${result.stdout}${result.stderr}`.trim();
    if (result.code !== 0 || result.killed) {
      return NextResponse.json(
        { ok: false, error: result.killed ? 'Timeout della pubblicazione' : 'Pubblicazione fallita', log },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, log });
  } catch (e) {
    return handleApiError(e);
  }
}
