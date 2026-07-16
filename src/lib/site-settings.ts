import { prisma } from './db';
import { cached, CACHE_TAGS, revalidateContent } from './cache';
import { DEFAULT_THEME, themeSchema, integrationsSchema, DEFAULT_INTEGRATIONS, type Theme, type Integrations } from './theme';

export interface SiteSettings {
  id: number;
  name: string;
  tagline: string | null;
  logoLight: string | null;
  logoDark: string | null;
  favicon: string | null;
  theme: Theme;
  integrations: Integrations;
  customCss: string | null;
  headScripts: string | null;
  bodyScripts: string | null;
  defaultLocale: string;
  maintenance: boolean;
  maintenanceMessage: string | null;
}

/**
 * Restituisce le settings del sito. Singleton row id=1.
 * Cached in-memory per 60s, invalidata su save.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  return cached(CACHE_TAGS.site, async () => {
    let row = await prisma.site.findUnique({ where: { id: 1 } });
    if (!row) {
      try {
        row = await prisma.site.create({
          data: { id: 1, name: 'Element Node', theme: DEFAULT_THEME as never },
        });
      } catch {
        row = await prisma.site.findUnique({ where: { id: 1 } });
        if (!row) throw new Error('Site singleton unavailable');
      }
    }
    const themeParsed = themeSchema.safeParse(row.theme);
    const theme = themeParsed.success ? themeParsed.data : DEFAULT_THEME;
    const intParsed = integrationsSchema.safeParse((row as { integrations?: unknown }).integrations ?? {});
    const integrations = intParsed.success ? intParsed.data : DEFAULT_INTEGRATIONS;
    return {
      id: row.id,
      name: row.name,
      tagline: row.tagline,
      logoLight: row.logoLight,
      logoDark: row.logoDark,
      favicon: row.favicon,
      theme,
      integrations,
      customCss: row.customCss,
      headScripts: row.headScripts,
      bodyScripts: row.bodyScripts,
      defaultLocale: row.defaultLocale,
      maintenance: row.maintenance,
      maintenanceMessage: row.maintenanceMessage,
    };
  }, 60_000);
}

export type SiteSettingsPatch = Partial<{
  name: string;
  tagline: string | null;
  logoLight: string | null;
  logoDark: string | null;
  favicon: string | null;
  theme: Theme;
  integrations: Integrations;
  customCss: string | null;
  headScripts: string | null;
  bodyScripts: string | null;
  defaultLocale: string;
  maintenance: boolean;
  maintenanceMessage: string | null;
}>;

export async function updateSiteSettings(patch: SiteSettingsPatch): Promise<SiteSettings> {
  // Ensure singleton exists
  await getSiteSettings();

  const data: Record<string, unknown> = { ...patch };
  if (patch.theme) data.theme = patch.theme as never;
  if (patch.integrations) data.integrations = patch.integrations as never;

  await prisma.site.update({ where: { id: 1 }, data: data as never });
  revalidateContent(CACHE_TAGS.site);
  return getSiteSettings();
}
