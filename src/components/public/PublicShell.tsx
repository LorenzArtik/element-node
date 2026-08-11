import { auth } from '@/lib/auth';
import { getSiteSettings } from '@/lib/site-settings';
import { resolveActiveThemeBlock } from '@/lib/theme-blocks';
import type { PageContent } from '@/lib/widgets-schema';
import { PageRenderer } from './PageRenderer';
import { getLicenseTier } from '@/lib/license-client';
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
  const tier = await getLicenseTier();
  const [header, footer] = await Promise.all([
    ps.hideHeader ? null : resolveActiveThemeBlock('HEADER', ctx),
    ps.hideFooter ? null : resolveActiveThemeBlock('FOOTER', ctx),
  ]);

  return (
    <PublicProviderClient site={site} page={page} post={post}>
      {header && (
        <header className="en-site-header">
          <PageRenderer content={header.content} tier={tier} />
        </header>
      )}
      <main>
        <PageRenderer content={content} tier={tier} />
      </main>
      {footer && (
        <footer className="en-site-footer">
          <PageRenderer content={footer.content} tier={tier} />
        </footer>
      )}
      {tier === 'free' && (
        <div style={{ textAlign: 'center', padding: '14px 12px' }}>
          <a
            href="https://elementnode.cloud"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Made with Element Node"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: '9999px',
              background: 'rgba(139,92,246,0.12)',
              border: '1px solid rgba(139,92,246,0.28)',
              color: '#8b5cf6',
              fontSize: '12px',
              lineHeight: '1',
              fontWeight: 600,
              textDecoration: 'none',
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="#8b5cf6" />
            </svg>
            Made with Element Node
          </a>
        </div>
      )}
      <PopupRunner path={path} tier={tier} />
      {(site.integrations as { cookieBanner?: CookieBannerSettings }).cookieBanner?.enabled && (
        <CookieBanner settings={(site.integrations as { cookieBanner: CookieBannerSettings }).cookieBanner} path={path} />
      )}
    </PublicProviderClient>
  );
}
