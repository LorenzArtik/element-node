import type { NextRequest } from 'next/server';
import { auth } from './auth';
import { verifyApiKey, getBearerFromHeaders, hasScope, type ApiScope } from './api-key';
import { ApiError } from './api-error';

export interface AuthContext {
  kind: 'session' | 'api-key';
  userId?: string;
  email?: string;
  role?: string;
  apiKeyId?: string;
  scopes?: ApiScope[];
}

/**
 * Autentica una richiesta accettando:
 *   1. Bearer token (Authorization: Bearer en_live_xxx) — preferito per M2M
 *   2. Session NextAuth (cookie) — per richieste browser
 *
 * Se richiesto, verifica che lo scope sia presente.
 */
export async function authOrBearer(req: NextRequest, requiredScope?: ApiScope): Promise<AuthContext> {
  // Prova bearer
  const bearer = getBearerFromHeaders(req.headers);
  if (bearer) {
    const key = await verifyApiKey(bearer);
    if (!key) throw new ApiError('invalid_api_key', 'API key non valida o revocata', 401);
    if (requiredScope && !hasScope(key.scopes, requiredScope)) {
      throw new ApiError('insufficient_scope', `Scope mancante: ${requiredScope}`, 403);
    }
    return { kind: 'api-key', apiKeyId: key.id, scopes: key.scopes };
  }
  // Fallback session
  const session = await auth();
  if (!session?.user) throw new ApiError('unauthorized', 'Autenticazione richiesta (Bearer token o session)', 401);
  // Per session usiamo il ruolo come gate, non gli scopes
  if (requiredScope && session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR') {
    throw new ApiError('forbidden', 'Permessi insufficienti', 403);
  }
  return { kind: 'session', userId: session.user.id, email: session.user.email, role: session.user.role };
}
