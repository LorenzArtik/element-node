import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authOrBearer } from '@/lib/auth-or-bearer';
import { ApiError, handleApiError } from '@/lib/api-error';
import { prisma } from '@/lib/db';
import { siteBlueprintSchema } from '@/lib/site-blueprint';
import { updateSiteSettings } from '@/lib/site-settings';
import { invalidatePostTypeCache } from '@/lib/post-types';
import { invalidateThemeBlocksCache } from '@/lib/theme-blocks';
import { invalidatePopupsCache } from '@/lib/popups';
import { materializeInlineForms } from '@/lib/materialize-forms';
import { revalidateContent, CACHE_TAGS, invalidateAll } from '@/lib/cache';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const requestSchema = z.object({
  blueprint: siteBlueprintSchema,
  options: z.object({
    dryRun: z.boolean().default(false),
    /** "merge": aggiorna esistenti, mantiene non presenti. "replace": cancella tutto prima di importare. */
    strategy: z.enum(['merge', 'replace']).default('merge'),
    /** Skip site settings (utile per importare solo content) */
    skipSiteSettings: z.boolean().default(false),
  }).default({ dryRun: false, strategy: 'merge', skipSiteSettings: false }),
});

interface ImportReport {
  dryRun: boolean;
  strategy: string;
  created: Record<string, number>;
  updated: Record<string, number>;
  skipped: Record<string, number>;
  errors: { entity: string; key?: string; message: string }[];
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await authOrBearer(req, 'site.import');
    const body = requestSchema.parse(await req.json());
    const { blueprint, options } = body;

    const report: ImportReport = {
      dryRun: options.dryRun,
      strategy: options.strategy,
      created: {}, updated: {}, skipped: {}, errors: [],
    };

    function bump(bucket: 'created' | 'updated' | 'skipped', entity: string) {
      report[bucket][entity] = (report[bucket][entity] ?? 0) + 1;
    }

    // ===== Replace strategy: cancella tutto prima =====
    if (options.strategy === 'replace' && !options.dryRun) {
      await prisma.popup.deleteMany();
      await prisma.themeBlock.deleteMany();
      await prisma.postTerm.deleteMany();
      await prisma.term.deleteMany();
      await prisma.taxonomy.deleteMany();
      await prisma.post.deleteMany();
      // PostType "post" è il default, non lo cancello mai
      await prisma.postType.deleteMany({ where: { slug: { not: 'post' } } });
      await prisma.page.deleteMany();
      await prisma.redirect.deleteMany();
      await prisma.form.deleteMany();
    }

    // ===== Site Settings =====
    if (blueprint.site && !options.skipSiteSettings) {
      if (!options.dryRun) {
        await updateSiteSettings({
          name: blueprint.site.name,
          tagline: blueprint.site.tagline ?? null,
          logoLight: blueprint.site.logoLight ?? null,
          logoDark: blueprint.site.logoDark ?? null,
          favicon: blueprint.site.favicon ?? null,
          theme: blueprint.site.theme,
          customCss: blueprint.site.customCss ?? null,
          headScripts: blueprint.site.headScripts ?? null,
          bodyScripts: blueprint.site.bodyScripts ?? null,
          defaultLocale: blueprint.site.defaultLocale,
        });
      }
      bump('updated', 'site');
    }

    // ===== Post Types =====
    const postTypeIdBySlug = new Map<string, string>();
    if (blueprint.postTypes) {
      for (const pt of blueprint.postTypes) {
        try {
          const existing = await prisma.postType.findUnique({ where: { slug: pt.slug } });
          if (existing) {
            if (!options.dryRun) {
              const updated = await prisma.postType.update({
                where: { id: existing.id },
                data: {
                  name: pt.name, plural: pt.plural, icon: pt.icon ?? existing.icon,
                  description: pt.description ?? null,
                  supports: (pt.supports ?? existing.supports) as never,
                  publicSingle: pt.publicSingle ?? existing.publicSingle,
                  publicArchive: pt.publicArchive ?? existing.publicArchive,
                  showInMenu: pt.showInMenu ?? existing.showInMenu,
                  menuPosition: pt.menuPosition ?? existing.menuPosition,
                },
              });
              postTypeIdBySlug.set(pt.slug, updated.id);
            } else postTypeIdBySlug.set(pt.slug, existing.id);
            bump('updated', 'postType');
          } else {
            if (!options.dryRun) {
              const created = await prisma.postType.create({
                data: {
                  slug: pt.slug, name: pt.name, plural: pt.plural,
                  icon: pt.icon ?? 'FileText',
                  description: pt.description ?? null,
                  supports: (pt.supports ?? ['title','editor','excerpt','featured','seo','taxonomies']) as never,
                  publicSingle: pt.publicSingle ?? true,
                  publicArchive: pt.publicArchive ?? true,
                  showInMenu: pt.showInMenu ?? true,
                  menuPosition: pt.menuPosition ?? 20,
                },
              });
              postTypeIdBySlug.set(pt.slug, created.id);
            }
            bump('created', 'postType');
          }
        } catch (e) {
          report.errors.push({ entity: 'postType', key: pt.slug, message: (e as Error).message });
        }
      }
    }

    // Auto-popola map per slug 'post' (sempre presente)
    if (!postTypeIdBySlug.has('post')) {
      const def = await prisma.postType.findUnique({ where: { slug: 'post' } });
      if (def) postTypeIdBySlug.set('post', def.id);
    }

    // ===== Taxonomies + Terms =====
    const termIdBySlug = new Map<string, string>(); // taxonomySlug:termSlug -> termId
    if (blueprint.taxonomies) {
      for (const tx of blueprint.taxonomies) {
        try {
          const ptId = tx.postTypeSlug ? postTypeIdBySlug.get(tx.postTypeSlug) ?? null : null;
          let taxonomy = await prisma.taxonomy.findUnique({ where: { slug: tx.slug } });
          if (taxonomy) {
            if (!options.dryRun) {
              taxonomy = await prisma.taxonomy.update({
                where: { id: taxonomy.id },
                data: { name: tx.name, plural: tx.plural, hierarchical: tx.hierarchical ?? false, postTypeId: ptId },
              });
            }
            bump('updated', 'taxonomy');
          } else {
            if (!options.dryRun) {
              taxonomy = await prisma.taxonomy.create({
                data: { slug: tx.slug, name: tx.name, plural: tx.plural, hierarchical: tx.hierarchical ?? false, postTypeId: ptId },
              });
            }
            bump('created', 'taxonomy');
          }
          // Terms
          if (taxonomy && tx.terms) {
            for (const term of tx.terms) {
              const existingTerm = await prisma.term.findUnique({ where: { taxonomyId_slug: { taxonomyId: taxonomy.id, slug: term.slug } } });
              if (existingTerm) {
                if (!options.dryRun) await prisma.term.update({ where: { id: existingTerm.id }, data: { name: term.name, description: term.description ?? null } });
                termIdBySlug.set(`${tx.slug}:${term.slug}`, existingTerm.id);
                bump('updated', 'term');
              } else {
                if (!options.dryRun) {
                  const created = await prisma.term.create({
                    data: { taxonomyId: taxonomy.id, slug: term.slug, name: term.name, description: term.description ?? null },
                  });
                  termIdBySlug.set(`${tx.slug}:${term.slug}`, created.id);
                }
                bump('created', 'term');
              }
            }
          }
        } catch (e) {
          report.errors.push({ entity: 'taxonomy', key: tx.slug, message: (e as Error).message });
        }
      }
    }

    // ===== Pages =====
    if (blueprint.pages) {
      for (const p of blueprint.pages) {
        try {
          const existing = await prisma.page.findUnique({ where: { slug: p.slug } });
          if (!options.dryRun && p.content) {
            await materializeInlineForms(p.content as never, p.title);
          }
          if (p.isHomepage && !options.dryRun) {
            await prisma.page.updateMany({ where: { isHomepage: true, slug: { not: p.slug } }, data: { isHomepage: false } });
          }
          if (existing) {
            if (!options.dryRun) {
              await prisma.page.update({
                where: { id: existing.id },
                data: {
                  title: p.title, status: p.status ?? existing.status,
                  content: p.content as never,
                  settings: p.settings !== undefined ? (p.settings as never) : (existing.settings as never),
                  isHomepage: p.isHomepage ?? false,
                  seoTitle: p.seoTitle ?? null, seoDesc: p.seoDesc ?? null, ogImage: p.ogImage ?? null,
                  password: p.password ?? null,
                  publishedAt: (p.status ?? existing.status) === 'PUBLISHED' && !existing.publishedAt ? new Date() : existing.publishedAt,
                },
              });
            }
            bump('updated', 'page');
          } else {
            if (!options.dryRun) {
              const authorId = ctx.userId ?? (await prisma.user.findFirst({ where: { role: 'ADMIN' } }))?.id;
              if (!authorId) throw new Error('Nessun utente ADMIN trovato');
              await prisma.page.create({
                data: {
                  slug: p.slug, title: p.title, status: p.status ?? 'DRAFT',
                  content: p.content as never,
                  settings: (p.settings as never) ?? undefined,
                  isHomepage: p.isHomepage ?? false,
                  seoTitle: p.seoTitle ?? null, seoDesc: p.seoDesc ?? null, ogImage: p.ogImage ?? null,
                  password: p.password ?? null,
                  authorId,
                  publishedAt: (p.status ?? 'DRAFT') === 'PUBLISHED' ? new Date() : null,
                },
              });
            }
            bump('created', 'page');
          }
          revalidateContent(CACHE_TAGS.page(p.slug));
        } catch (e) {
          report.errors.push({ entity: 'page', key: p.slug, message: (e as Error).message });
        }
      }
    }

    // ===== Posts =====
    if (blueprint.posts) {
      for (const p of blueprint.posts) {
        try {
          const ptId = postTypeIdBySlug.get(p.postTypeSlug);
          if (!ptId) throw new Error(`Post type "${p.postTypeSlug}" non trovato`);
          const existing = await prisma.post.findUnique({ where: { postTypeId_slug: { postTypeId: ptId, slug: p.slug } } });
          const data = {
            title: p.title, status: (p.status ?? 'DRAFT') as 'DRAFT'|'PUBLISHED'|'PRIVATE'|'SCHEDULED'|'TRASH',
            excerpt: p.excerpt ?? null,
            content: (p.content ?? null) as never,
            contentText: p.contentText ?? null,
            featured: p.featured ?? null,
            seoTitle: p.seoTitle ?? null, seoDesc: p.seoDesc ?? null, ogImage: p.ogImage ?? null,
            publishedAt: p.publishedAt ? new Date(p.publishedAt) : ((p.status ?? 'DRAFT') === 'PUBLISHED' ? new Date() : null),
          };
          let post;
          if (existing) {
            if (!options.dryRun) post = await prisma.post.update({ where: { id: existing.id }, data });
            else post = existing;
            bump('updated', 'post');
          } else {
            if (!options.dryRun) {
              const authorId = ctx.userId ?? (await prisma.user.findFirst({ where: { role: 'ADMIN' } }))?.id;
              if (!authorId) throw new Error('Nessun utente ADMIN trovato');
              post = await prisma.post.create({ data: { ...data, slug: p.slug, postTypeId: ptId, authorId } });
            }
            bump('created', 'post');
          }
          // Term associations
          if (post && p.termSlugs && !options.dryRun) {
            await prisma.postTerm.deleteMany({ where: { postId: post.id } });
            for (const ts of p.termSlugs) {
              // Trova il termId tra tutti taxonomies (potrebbe non avere prefix taxonomy)
              const termId = Array.from(termIdBySlug.entries()).find(([k]) => k.endsWith(`:${ts}`))?.[1];
              if (termId) await prisma.postTerm.create({ data: { postId: post.id, termId } });
            }
          }
        } catch (e) {
          report.errors.push({ entity: 'post', key: `${p.postTypeSlug}/${p.slug}`, message: (e as Error).message });
        }
      }
    }

    // ===== Theme Blocks =====
    if (blueprint.themeBlocks) {
      for (const b of blueprint.themeBlocks) {
        try {
          if (!options.dryRun) {
            await prisma.themeBlock.create({
              data: {
                kind: b.kind, name: b.name, content: b.content as never,
                conditions: (b.conditions ?? { include: [{ type: 'all-site' }], exclude: [] }) as never,
                priority: b.priority ?? 10,
                status: b.status ?? 'DRAFT',
                publishedAt: (b.status ?? 'DRAFT') === 'PUBLISHED' ? new Date() : null,
              },
            });
          }
          bump('created', 'themeBlock');
        } catch (e) {
          report.errors.push({ entity: 'themeBlock', key: b.name, message: (e as Error).message });
        }
      }
    }

    // ===== Popups =====
    if (blueprint.popups) {
      for (const p of blueprint.popups) {
        try {
          if (!options.dryRun) {
            await prisma.popup.create({
              data: {
                name: p.name, content: p.content as never,
                trigger: p.trigger as never,
                conditions: (p.conditions ?? { include: [{ type: 'all-site' }], exclude: [] }) as never,
                settings: (p.settings ?? {}) as never,
                priority: p.priority ?? 10, status: p.status ?? 'DRAFT',
                publishedAt: (p.status ?? 'DRAFT') === 'PUBLISHED' ? new Date() : null,
              },
            });
          }
          bump('created', 'popup');
        } catch (e) {
          report.errors.push({ entity: 'popup', key: p.name, message: (e as Error).message });
        }
      }
    }

    // ===== Redirects =====
    if (blueprint.redirects) {
      for (const r of blueprint.redirects) {
        try {
          const existing = await prisma.redirect.findUnique({ where: { fromPath: r.fromPath } });
          if (existing) {
            if (!options.dryRun) await prisma.redirect.update({ where: { id: existing.id }, data: { toPath: r.toPath, type: r.type ?? 301, enabled: r.enabled ?? true } });
            bump('updated', 'redirect');
          } else {
            if (!options.dryRun) await prisma.redirect.create({ data: { fromPath: r.fromPath, toPath: r.toPath, type: r.type ?? 301, enabled: r.enabled ?? true } });
            bump('created', 'redirect');
          }
        } catch (e) {
          report.errors.push({ entity: 'redirect', key: r.fromPath, message: (e as Error).message });
        }
      }
    }

    // ===== Forms =====
    if (blueprint.forms) {
      for (const f of blueprint.forms) {
        try {
          if (!options.dryRun) {
            await prisma.form.create({
              data: {
                name: f.name, description: f.description ?? null,
                fields: f.fields as never,
                actions: (f.actions ?? []) as never,
                settings: (f.settings ?? {}) as never,
                status: f.status ?? 'ACTIVE',
              },
            });
          }
          bump('created', 'form');
        } catch (e) {
          report.errors.push({ entity: 'form', key: f.name, message: (e as Error).message });
        }
      }
    }

    if (!options.dryRun) {
      invalidateAll();
      invalidatePostTypeCache();
      invalidateThemeBlocksCache();
      invalidatePopupsCache();
    }

    await logAudit({
      actorId: ctx.userId, actorEmail: ctx.email,
      action: 'site.import', entity: 'Site',
      after: report,
    });

    return NextResponse.json(report);
  } catch (e) {
    return handleApiError(e);
  }
}
