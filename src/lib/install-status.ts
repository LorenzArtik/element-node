import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { prisma } from './db';

const LOCK_PATH = path.join(process.cwd(), '.install.lock');

export function lockExists() {
  return existsSync(LOCK_PATH);
}

export function writeLock(payload: Record<string, unknown> = {}) {
  mkdirSync(path.dirname(LOCK_PATH), { recursive: true });
  writeFileSync(
    LOCK_PATH,
    JSON.stringify({ installedAt: new Date().toISOString(), ...payload }, null, 2),
  );
}

export async function isInstalled(): Promise<boolean> {
  if (lockExists()) return true;
  try {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount > 0) {
      writeLock({ inferredFromAdmin: true });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
