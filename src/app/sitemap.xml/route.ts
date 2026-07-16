import { prisma } from '@/lib/db';
import { getSiteSettings } from '@/lib/site-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 600;

export async function GET() {
  const baseUrl = (process.env.AUTH_URL || process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');
  const site = await getSiteSettings();
  if (site.maintenance) {
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`, {
      headers: { 'content-type': 'application/xml; charset=utf-8' },
    });
  }

  // Pagine pubbliche
  const [pages, posts, postTypes] = await Promise.all([
    prisma.page.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, isHomepage: true, updatedAt: true } }),
    prisma.post.findMany({ where: { status: 'PUBLISHED', noindex: false }, select: { slug: true, updatedAt: true, postType: { select: { slug: true, publicSingle: true } } } }),
    prisma.postType.findMany({ where: { publicArchive: true }, select: { slug: true } }),
  ]);

  const urls: { loc: string; lastmod?: string; changefreq?: string; priority?: number }[] = [];

  // Homepage
  urls.push({ loc: baseUrl + '/', changefreq: 'daily', priority: 1.0 });

  for (const p of pages) {
    if (p.isHomepage) continue;
    urls.push({ loc: `${baseUrl}/${p.slug}`, lastmod: p.updatedAt.toISOString(), changefreq: 'weekly', priority: 0.8 });
  }

  for (const pt of postTypes) {
    urls.push({ loc: `${baseUrl}/${pt.slug}`, changefreq: 'daily', priority: 0.7 });
  }

  for (const p of posts) {
    if (!p.postType.publicSingle) continue;
    urls.push({ loc: `${baseUrl}/${p.postType.slug}/${p.slug}`, lastmod: p.updatedAt.toISOString(), changefreq: 'monthly', priority: 0.6 });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ''}${u.priority != null ? `<priority>${u.priority}</priority>` : ''}</url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=600, s-maxage=600',
    },
  });
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
