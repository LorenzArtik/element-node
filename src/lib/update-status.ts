import { cached } from './cache';
import pkg from '../../package.json';

const SOURCE = 'https://raw.githubusercontent.com/LorenzArtik/element-node/main/package.json';

/** Ultima versione pubblicata su GitHub, cache 6 ore (null se rete assente). */
export async function getLatestVersion(): Promise<string | null> {
  return cached('en-latest-version', async () => {
    try {
      const res = await fetch(SOURCE, { signal: AbortSignal.timeout(6000), cache: 'no-store' });
      if (!res.ok) return null;
      return ((await res.json()) as { version?: string }).version ?? null;
    } catch {
      return null;
    }
  }, 6 * 60 * 60 * 1000);
}

export function semverGt(a: string, b: string): boolean {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  }
  return false;
}

export function currentVersion(): string {
  return (pkg as { version?: string }).version || '0.0.0';
}
