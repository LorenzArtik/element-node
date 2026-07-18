import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { existsSync, mkdirSync, openSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { auth } from '@/lib/auth';
import { ApiError, handleApiError } from '@/lib/api-error';
import { getLicenseInfo } from '@/lib/license-client';
import { resolveAppRoot } from '@/lib/app-root';
import pkg from '../../../../../package.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LOCK_STALE_MS = 15 * 60 * 1000;

function readState(root: string) {
  try {
    return JSON.parse(readFileSync(join(root, 'tmp', 'update-state.json'), 'utf8'));
  } catch {
    return { status: 'idle' };
  }
}

function lockActive(root: string): boolean {
  const lock = join(root, 'tmp', 'update.lock');
  if (!existsSync(lock)) return false;
  return Date.now() - statSync(lock).mtimeMs < LOCK_STALE_MS;
}

/** Stato dell'updater + versione corrente. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);

    const root = resolveAppRoot();
    return NextResponse.json({
      current: (pkg as { version?: string }).version || '0.0.0',
      state: readState(root),
      running: lockActive(root),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/** Avvia l'aggiornamento 1-click (richiede licenza attiva e ruolo ADMIN). */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    if ((session.user as { role?: string }).role !== 'ADMIN') {
      throw new ApiError('forbidden', 'Solo un amministratore può aggiornare il CMS', 403);
    }

    const license = await getLicenseInfo();
    if (!license.valid) {
      throw new ApiError('license_required', 'Gli aggiornamenti 1-click richiedono una licenza attiva', 402);
    }

    const root = resolveAppRoot();
    const script = join(root, 'scripts', 'self-update.mjs');
    if (!existsSync(script)) {
      throw new ApiError('not_supported', 'Script di aggiornamento non trovato in questa installazione', 500);
    }
    if (lockActive(root)) {
      return NextResponse.json({ started: false, reason: 'already_running' }, { status: 409 });
    }

    // detached: sopravvive al riavvio dell'app durante lo swap finale
    mkdirSync(join(root, 'tmp'), { recursive: true });
    const out = openSync(join(root, 'tmp', 'update-spawn.log'), 'w');
    const child = spawn(process.execPath, [script, root], {
      cwd: root,
      detached: true,
      stdio: ['ignore', out, out],
      env: process.env,
    });
    child.unref();

    return NextResponse.json({ started: true });
  } catch (e) {
    return handleApiError(e);
  }
}
