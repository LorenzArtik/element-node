import { getSiteSettings } from '@/lib/site-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = (process.env.AUTH_URL || process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');
  const site = await getSiteSettings();

  // Se in manutenzione: blocca tutto
  if (site.maintenance) {
    return new Response(`User-agent: *\nDisallow: /\n`, { headers: { 'content-type': 'text/plain' } });
  }

  const txt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api
Disallow: /editor
Disallow: /login
Disallow: /reset-password
Disallow: /forgot-password

Sitemap: ${baseUrl}/sitemap.xml
`;
  return new Response(txt, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
