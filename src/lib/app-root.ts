import { existsSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Radice dell'installazione (dove stanno package.json, scripts/, .env).
 * In produzione il processo gira dentro .next/standalone → due livelli sopra.
 */
export function resolveAppRoot(): string {
  const candidates = [
    process.env.APP_ROOT,
    process.cwd(),
    resolve(process.cwd(), '../..'),
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    if (existsSync(join(c, 'scripts', 'self-update.mjs')) && existsSync(join(c, 'package.json'))) {
      return c;
    }
  }
  return process.cwd();
}
