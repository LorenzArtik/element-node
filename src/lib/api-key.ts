import { createHash, randomBytes } from 'crypto';
import { prisma } from './db';

export const API_KEY_PREFIX = 'en_live_';

export type ApiScope =
  | '*'
  | 'site.read'
  | 'site.write'
  | 'site.import'
  | 'site.export'
  | 'page.read'
  | 'page.write'
  | 'post.read'
  | 'post.write'
  | 'media.write'
  | 'theme.write';

export const ALL_SCOPES: ApiScope[] = [
  '*',
  'site.read', 'site.write', 'site.import', 'site.export',
  'page.read', 'page.write', 'post.read', 'post.write',
  'media.write', 'theme.write',
];

export interface CreatedApiKey {
  id: string;
  name: string;
  prefix: string;
  tail: string;
  scopes: ApiScope[];
  /** Plaintext key — mostrata SOLO al momento della creazione */
  plaintext: string;
}

function hashKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

/**
 * Genera una nuova API key. Ritorna il plaintext UNA SOLA VOLTA.
 * Format: en_live_<32 hex chars> → tail = ultimi 4 char.
 */
export async function createApiKey(name: string, scopes: ApiScope[], userId?: string, expiresAt?: Date): Promise<CreatedApiKey> {
  const random = randomBytes(24).toString('hex'); // 48 chars
  const plaintext = `${API_KEY_PREFIX}${random}`;
  const hashedKey = hashKey(plaintext);
  const tail = random.slice(-4);

  const created = await prisma.apiKey.create({
    data: {
      name,
      hashedKey,
      prefix: API_KEY_PREFIX,
      tail,
      scopes: scopes as never,
      createdById: userId ?? null,
      expiresAt: expiresAt ?? null,
    },
  });

  return { id: created.id, name: created.name, prefix: created.prefix, tail: created.tail, scopes, plaintext };
}

/**
 * Verifica una bearer token. Ritorna { id, scopes } se valida e non revocata, altrimenti null.
 * Aggiorna `lastUsedAt` (non bloccante).
 */
export async function verifyApiKey(plaintext: string): Promise<{ id: string; scopes: ApiScope[] } | null> {
  if (!plaintext.startsWith(API_KEY_PREFIX)) return null;
  const hashedKey = hashKey(plaintext);
  const row = await prisma.apiKey.findUnique({ where: { hashedKey } });
  if (!row) return null;
  if (row.revokedAt) return null;
  if (row.expiresAt && row.expiresAt < new Date()) return null;
  // Aggiorna lastUsed in background
  prisma.apiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return { id: row.id, scopes: (row.scopes as ApiScope[]) ?? [] };
}

/**
 * Verifica che la chiave abbia almeno uno degli scopes richiesti (o '*').
 */
export function hasScope(scopes: ApiScope[], required: ApiScope): boolean {
  return scopes.includes('*') || scopes.includes(required);
}

/**
 * Estrae bearer token da headers Request.
 */
export function getBearerFromHeaders(headers: Headers): string | null {
  const auth = headers.get('authorization') || headers.get('x-api-key');
  if (!auth) return null;
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  if (auth.startsWith(API_KEY_PREFIX)) return auth.trim();
  return null;
}
