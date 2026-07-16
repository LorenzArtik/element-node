import { auth } from '@/lib/auth';
import { getSiteSettings } from '@/lib/site-settings';
import { resolveActiveThemeBlock } from '@/lib/theme-blocks';
import type { PageContent } from '@/lib/widgets-schema';
import { PageRenderer } from './PageRenderer';
import { PublicProviderClient } from './PublicProviderClient';
import { PopupRunner } from './PopupRunner';
import type { RenderPost } from './render-context';

interface Props {
  content: PageContent;
  page: { title: string; slug: string; isHomepage: boolean; settings?: Record<string, unknown> | null };
  path: string;
  post?: RenderPost;
}

export async function PublicShell({ content, page, path, post }: Props) {
  const [session, site] = await Promise.all([auth(), getSiteSettings()]);
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
    </PublicProviderClient>
  );
}
