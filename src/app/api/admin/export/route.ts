import { NextRequest, NextResponse } from 'next/server';
import { authOrBearer } from '@/lib/auth-or-bearer';
import { handleApiError } from '@/lib/api-error';
import { prisma } from '@/lib/db';
import { getSiteSettings } from '@/lib/site-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Esporta il sito completo come Site Blueprint JSON.
 * Auth: bearer en_live_xxx con scope 'site.export' o '*', oppure session admin.
 */
export async function GET(req: NextRequest) {
  try {
    await authOrBearer(req, 'site.export');

    const [site, postTypes, taxonomies, pages, posts, themeBlocks, popups, redirects, forms] = await Promise.all([
      getSiteSettings(),
      prisma.postType.findMany(),
      prisma.taxonomy.findMany({ include: { terms: true } }),
      prisma.page.findMany(),
      prisma.post.findMany({ include: { postType: true, terms: { include: { term: true } } } }),
      prisma.themeBlock.findMany(),
      prisma.popup.findMany(),
      prisma.redirect.findMany(),
      prisma.form.findMany(),
    ]);

    const blueprint = {
      version: '1.0' as const,
      generatedAt: new Date().toISOString(),
      generator: 'element-node-export',

      site: {
        name: site.name,
        tagline: site.tagline,
        logoLight: site.logoLight,
        logoDark: site.logoDark,
        favicon: site.favicon,
        theme: site.theme,
        integrations: site.integrations,
        customCss: site.customCss,
        headScripts: site.headScripts,
        bodyScripts: site.bodyScripts,
        defaultLocale: site.defaultLocale,
      },

      postTypes: postTypes.map((pt) => ({
        slug: pt.slug, name: pt.name, plural: pt.plural, icon: pt.icon, description: pt.description,
        supports: pt.supports, publicSingle: pt.publicSingle, publicArchive: pt.publicArchive,
        showInMenu: pt.showInMenu, menuPosition: pt.menuPosition,
      })),

      taxonomies: taxonomies.map((t) => ({
        slug: t.slug, name: t.name, plural: t.plural, hierarchical: t.hierarchical,
        postTypeSlug: t.postTypeId ? postTypes.find((pt) => pt.id === t.postTypeId)?.slug ?? null : null,
        terms: t.terms.map((tm) => ({ slug: tm.slug, name: tm.name, description: tm.description })),
      })),

      pages: pages.map((p) => ({
        slug: p.slug, title: p.title, isHomepage: p.isHomepage, status: p.status,
        content: p.content, seoTitle: p.seoTitle, seoDesc: p.seoDesc, ogImage: p.ogImage,
        password: p.password,
      })),

      posts: posts.map((p) => ({
        postTypeSlug: p.postType.slug, slug: p.slug, title: p.title, status: p.status,
        excerpt: p.excerpt, content: p.content, contentText: p.contentText, featured: p.featured,
        seoTitle: p.seoTitle, seoDesc: p.seoDesc, ogImage: p.ogImage,
        publishedAt: p.publishedAt?.toISOString() ?? null,
        termSlugs: p.terms.map((pt) => pt.term.slug),
      })),

      themeBlocks: themeBlocks.map((b) => ({
        kind: b.kind, name: b.name, content: b.content, conditions: b.conditions,
        priority: b.priority, status: b.status,
      })),

      popups: popups.map((p) => ({
        name: p.name, content: p.content, trigger: p.trigger, conditions: p.conditions,
        settings: p.settings, priority: p.priority, status: p.status,
      })),

      redirects: redirects.map((r) => ({
        fromPath: r.fromPath, toPath: r.toPath, type: r.type, enabled: r.enabled,
      })),

      forms: forms.map((f) => ({
        name: f.name, description: f.description, fields: f.fields, actions: f.actions,
        settings: f.settings, status: f.status,
      })),
    };

    return NextResponse.json(blueprint, {
      headers: {
        'content-disposition': `attachment; filename="element-node-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
