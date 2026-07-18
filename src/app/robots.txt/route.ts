import { getSiteSettings } from '@/lib/site-settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  let mode = 'public';
  let base = process.env.PUBLIC_URL || '';
  try {
    const site = await getSiteSettings();
    mode = (site.integrations as { siteAccess?: { mode?: string } }).siteAccess?.mode ?? 'public';
  } catch { /* pre-install */ }
  const body = mode !== 'public'
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n${base ? `Sitemap: ${base.replace(/\/$/, '')}/sitemap.xml\n` : ''}`;
  return new Response(body, { headers: { 'content-type': 'text/plain' } });
}
