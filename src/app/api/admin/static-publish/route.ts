import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { auth } from '@/lib/auth';
import { ApiError, handleApiError } from '@/lib/api-error';
import { resolveAppRoot } from '@/lib/app-root';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Legge le variabili da .env dell'app (il runtime standalone non sempre le espone tutte). */
function readEnvFile(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"]*)"?\s*$/);
      if (m) out[m[1]] = m[2];
    }
  } catch {
    /* nessun .env leggibile */
  }
  return out;
}

function isEnabled(env: Record<string, string>): boolean {
  const v = (env.STATIC_PUBLISH_ENABLED ?? process.env.STATIC_PUBLISH_ENABLED ?? '').toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

/** Info di configurazione (per la UI). */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    const env = readEnvFile(resolveAppRoot());
    return NextResponse.json({
      enabled: isEnabled(env),
      target: env.STATIC_TARGET_URL || process.env.STATIC_TARGET_URL || '',
      ftpHost: env.STATIC_FTP_HOST || '',
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/** Pubblica la versione statica del sito sull'hosting configurato (solo ADMIN). */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    if ((session.user as { role?: string }).role !== 'ADMIN') {
      throw new ApiError('forbidden', 'Solo un amministratore può pubblicare', 403);
    }
    const root = resolveAppRoot();
    const env = readEnvFile(root);
    if (!isEnabled(env)) throw new ApiError('not_configured', 'Pubblicazione statica non configurata su questo sito', 400);

    const script = join(root, 'scripts', 'static-publish.mjs');
    if (!existsSync(script)) throw new ApiError('not_supported', 'Script di pubblicazione non trovato', 500);

    const childEnv: NodeJS.ProcessEnv = {
      ...process.env,
      ...env,
      APP_ROOT: root,
      PATH: `${process.env.PATH || ''}:/usr/local/bin:/usr/bin:/bin`,
    };

    const result = await new Promise<{ stdout: string; stderr: string; code: number; killed: boolean }>((resolve) => {
      execFile(
        process.execPath,
        [script],
        { cwd: root, env: childEnv, timeout: 175000, maxBuffer: 4 * 1024 * 1024 },
        (err, stdout, stderr) => {
          const exitCode = err ? (typeof err.code === 'number' ? err.code : 1) : 0;
          resolve({
            stdout: stdout || '',
            stderr: stderr || '',
            code: exitCode,
            killed: Boolean(err?.killed),
          });
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
