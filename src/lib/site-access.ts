import { createHmac } from 'crypto';
import { cookies } from 'next/headers';
import { getSiteSettings } from './site-settings';
import { auth } from './auth';

/** Protezione sito in costruzione: cookie firmato con la password corrente. */
export const ACCESS_COOKIE = 'en-site-access';

export function accessToken(password: string): string {
  return createHmac('sha256', process.env.AUTH_SECRET || 'en').update(`access:${password}`).digest('base64url');
}

export interface SiteAccess {
  mode: 'public' | 'maintenance' | 'password';
  password: string;
  lockTitle: string;
  lockMessage: string;
}

/** true se il visitatore può vedere il sito (pubblico, admin loggato o password ok). */
export async function resolveSiteAccess(): Promise<{ access: SiteAccess; allowed: boolean }> {
  const site = await getSiteSettings();
  const access = (site.integrations as { siteAccess?: SiteAccess }).siteAccess
    ?? { mode: 'public', password: '', lockTitle: '', lockMessage: '' };
  if (access.mode === 'public') return { access, allowed: true };

  const session = await auth().catch(() => null);
  if (session?.user) return { access, allowed: true };

  if (access.mode === 'password' && access.password) {
    const store = await cookies();
    if (store.get(ACCESS_COOKIE)?.value === accessToken(access.password)) {
      return { access, allowed: true };
    }
  }
  return { access, allowed: false };
}
