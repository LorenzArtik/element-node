import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { lockExists } from '@/lib/install-status';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function runPrisma(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const bin = path.join(process.cwd(), 'node_modules', '.bin', 'prisma');
    const child = spawn(bin, args, { cwd: process.cwd(), env: process.env });
    let stdout = '', stderr = '';
    child.stdout.on('data', (b) => (stdout += b.toString()));
    child.stderr.on('data', (b) => (stderr += b.toString()));
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
    child.on('error', (e) => resolve({ code: 1, stdout, stderr: stderr + '\n' + String(e) }));
  });
}

export async function POST() {
  if (lockExists()) {
    return NextResponse.json({ error: 'already_installed' }, { status: 409 });
  }
  const r = await runPrisma(['db', 'push', '--skip-generate', '--accept-data-loss']);
  if (r.code !== 0) {
    return NextResponse.json({ ok: false, error: 'migrate_failed',
      stdout: r.stdout, stderr: r.stderr }, { status: 500 });
  }
  return NextResponse.json({ ok: true, log: r.stdout });
}
