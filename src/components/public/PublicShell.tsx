import { auth } from '@/lib/auth';
import { getSiteSettings } from '@/lib/site-settings';
import { resolveActiveThemeBlock } from '@/lib/theme-blocks';
import type { PageContent } from '@/lib/widgets-schema';
import { PageRenderer } from './PageRenderer';
import { PublicProviderClient } from './PublicProviderClient';
import { PopupRunner } from './PopupRunner';
import { CookieBanner, type CookieBannerSettings } from './CookieBanner';
import { LockScreen } from './LockScreen';
import { resolveSiteAccess } from '@/lib/site-access';
import MaintenancePage from '@/app/maintenance/page';
import type { RenderPost } from './render-context';

interface Props {
  content: PageContent;
  page: { title: string; slug: string; isHomepage: boolean; settings?: Record<string, unknown> | null };
  path: string;
  post?: RenderPost;
}

export async function PublicShell({ content, page, path, post }: Props) {
  const [session, site] = await Promise.all([auth(), getSiteSettings()]);
  const { access, allowed } = await resolveSiteAccess();
  if (!allowed && access.mode === 'maintenance') {
    return <MaintenancePage />;
  }
  if (!allowed && access.mode === 'password') {
    return <LockScreen siteName={site.name} title={access.lockTitle || 'Sito in costruzione'} message={access.lockMessage || 'Questo sito è protetto. Inserisci la password per accedere all\'anteprima.'} />;
  }
  const userRole = session?.user?.role ?? null;
  const ctx = { path, isHomepage: page.isHomepage, pageSlug: page.slug, userRole };

  // Pagine con chrome proprio (landing): settings.hideHeader / hideFooter
  const ps = (page.settings ?? {}) as { hideHeader?: boolean; hideFooter?: boolean };
  const [header, footer] = await Promise.all([
    ps.hideHeader ? null : resolveActiveThemeBlock('HEADER', ctx),
    ps.hideFooter ? null : resolveActiveThemeBlock('FOOTER', ctx),
  ]);

  return (
    <PublicProviderClient site={site} page={page} post={post}>
      {header && (
        <header className="en-site-header">
          <PageRenderer content={header.content} />
        </header>
      )}
      <main>
        <PageRenderer content={content} />
      </main>
      {footer && (
        <footer className="en-site-footer">
          <PageRenderer content={footer.content} />
        </footer>
      )}
      <PopupRunner path={path} />
      {(site.integrations as { cookieBanner?: CookieBannerSettings }).cookieBanner?.enabled && (
        <CookieBanner settings={(site.integrations as { cookieBanner: CookieBannerSettings }).cookieBanner} path={path} />
      )}
    </PublicProviderClient>
  );
}
