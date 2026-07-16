import { getSiteSettings } from '@/lib/site-settings';
import { themeToCssVariables } from '@/lib/theme';

/**
 * Server component: legge le settings del sito e inietta nel <head>:
 * - CSS variables --en-* per tutti i widget
 * - Custom CSS site-wide
 *
 * Usato in:
 *   - app/layout.tsx (frontend pubblico)
 *   - app/admin/layout.tsx (così il backoffice mostra il branding)
 *   - app/editor/[pageId]/page.tsx (anteprima fedele)
 */
export async function ThemeStyles({ scope = 'global' }: { scope?: 'global' | 'editor' }) {
  const settings = await getSiteSettings();
  const vars = themeToCssVariables(settings.theme);
  const css = `:root{${vars};}
body{font-family:var(--en-font-body);font-size:var(--en-size-base);font-weight:var(--en-body-weight);font-style:var(--en-body-style,normal);line-height:var(--en-line-height);letter-spacing:var(--en-body-letter-spacing,normal);text-transform:var(--en-body-transform,none);color:var(--en-color-text);}
h1,h2,h3,h4,h5,h6{font-family:var(--en-font-heading);font-weight:var(--en-heading-weight);font-style:var(--en-heading-style,normal);line-height:var(--en-heading-line-height);letter-spacing:var(--en-heading-letter-spacing,normal);text-transform:var(--en-heading-transform,none);text-decoration:var(--en-heading-decoration,none);color:var(--en-color-text);}
p{font-family:var(--en-font-body);}
${settings.customCss ?? ''}`;

  // Auto-genera l'URL Google Fonts dai font configurati
  const fontFamilies = extractGoogleFonts([
    settings.theme.typography.fontHeading,
    settings.theme.typography.fontBody,
    settings.theme.typography.fontMono,
  ]);
  const googleFontsUrl = fontFamilies.length
    ? `https://fonts.googleapis.com/css2?${fontFamilies.map((f) => `family=${f.replace(/\s+/g, '+')}:wght@300;400;500;600;700;800;900`).join('&')}&display=swap`
    : null;

  return (
    <>
      {googleFontsUrl && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link rel="stylesheet" href={googleFontsUrl} />
        </>
      )}
      <style id={`en-theme-${scope}`} dangerouslySetInnerHTML={{ __html: css }} />
      {scope === 'global' && settings.headScripts && (
        <script id="en-head-scripts" dangerouslySetInnerHTML={{ __html: settings.headScripts }} />
      )}
    </>
  );
}

const SYSTEM_STACKS = ['system-ui', 'serif', 'sans-serif', 'monospace', '-apple-system', 'BlinkMacSystemFont', 'inherit'];

function extractGoogleFonts(stacks: string[]): string[] {
  const out = new Set<string>();
  for (const stack of stacks) {
    const primary = (stack || '').split(',')[0].trim().replace(/['"]/g, '');
    if (primary && !SYSTEM_STACKS.includes(primary)) out.add(primary);
  }
  return Array.from(out);
}

export async function BodyScripts() {
  const settings = await getSiteSettings();
  if (!settings.bodyScripts) return null;
  return <script id="en-body-scripts" dangerouslySetInnerHTML={{ __html: settings.bodyScripts }} />;
}
