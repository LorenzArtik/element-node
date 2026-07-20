import { tierForPlan, type LicenseTier } from './license-features';
import { prisma } from './db';
import { getSiteSettings } from './site-settings';
import { revalidateContent, CACHE_TAGS } from './cache';

const PORTAL = process.env.LICENSE_PORTAL_URL || 'https://elementnode.cloud';
const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12h

export interface LicenseInfo {
  key: string;
  valid: boolean;
  plan: string;
  reason: string;
  checkedAt: string;
  currentPeriodEnd: string | null;
}

function siteDomain(): string {
  const url = process.env.AUTH_URL || process.env.PUBLIC_URL || 'http://localhost:3000';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'localhost';
  }
}

/**
 * Stato licenza con cache 12h su Site.integrations.licenseCache.
 * Fail-open: su errori di rete mantiene l'ultimo stato noto (il CMS
 * funziona comunque senza licenza — la licenza gata solo gli update).
 */
export async function getLicenseInfo(): Promise<LicenseInfo> {
  const site = await getSiteSettings();
  const key = (site.integrations.licenseKey || '').trim();
  const cache = site.integrations.licenseCache;
  const empty: LicenseInfo = { key: '', valid: false, plan: '', reason: 'no_key', checkedAt: '', currentPeriodEnd: null };
  if (!key) return empty;

  const fresh = cache.checkedAt && Date.now() - Date.parse(cache.checkedAt) < CHECK_INTERVAL_MS;
  if (fresh) {
    return { key, valid: cache.valid, plan: cache.plan, reason: cache.reason, checkedAt: cache.checkedAt, currentPeriodEnd: cache.currentPeriodEnd };
  }

  let next = { ...cache, checkedAt: new Date().toISOString() };
  try {
    const res = await fetch(`${PORTAL}/api/license/validate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key, domain: siteDomain() }),
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (res.ok) {
      const j = (await res.json()) as { valid: boolean; plan?: string; reason?: string; currentPeriodEnd?: string | null };
      next = {
        valid: !!j.valid,
        plan: j.plan || '',
        reason: j.valid ? '' : j.reason || 'invalid',
        checkedAt: new Date().toISOString(),
        currentPeriodEnd: j.currentPeriodEnd ?? null,
      };
    }
  } catch {
    // rete assente: tieni l'ultimo stato, ritenta alla prossima finestra
  }

  try {
    const row = await prisma.site.findUnique({ where: { id: 1 } });
    const integrations = { ...((row?.integrations as Record<string, unknown>) ?? {}), licenseKey: key, licenseCache: next };
    await prisma.site.update({ where: { id: 1 }, data: { integrations: integrations as never } });
    revalidateContent(CACHE_TAGS.site);
  } catch {
    // best-effort
  }

  return { key, valid: next.valid, plan: next.plan, reason: next.reason, checkedAt: next.checkedAt, currentPeriodEnd: next.currentPeriodEnd };
}

/** Tier corrente per il gate widget (rendering pubblico ed editor). */
export async function getLicenseTier(): Promise<LicenseTier> {
  try {
    const info = await getLicenseInfo();
    return tierForPlan(info.plan, info.valid);
  } catch {
    return 'free';
  }
}
