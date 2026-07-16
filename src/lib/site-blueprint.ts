/**
 * Site Blueprint = formato JSON canonico per export/import di un sito Element Node.
 * Usato da:
 *   - GET /api/admin/export → dump completo
 *   - POST /api/admin/import → ricreazione/aggiornamento bulk
 *   - Skill Claude Code element-node-builder → genera questo formato
 */

import { z } from 'zod';
import { themeSchema, integrationsSchema } from './theme';
import { conditionsSchema } from './theme-blocks';
import { triggerSchema, popupSettingsSchema } from './popups';
import { supportsSchema } from './post-types';

// PageContent JSON tree schema (loose, non valida i widget specifici)
const pageContentSchema: z.ZodType<unknown> = z.object({
  sections: z.array(z.object({
    id: z.string(),
    type: z.literal('section'),
    settings: z.record(z.string(), z.unknown()),
    columns: z.array(z.object({
      id: z.string(),
      type: z.literal('column'),
      width: z.number(),
      settings: z.record(z.string(), z.unknown()),
      elements: z.array(z.object({
        id: z.string(),
        type: z.string(),
        settings: z.record(z.string(), z.unknown()),
      })),
    })),
  })),
});

export const siteBlueprintSchema = z.object({
  version: z.literal('1.0'),
  generatedAt: z.string().optional(),
  generator: z.string().optional(), // es. "claude-code-skill v1"

  site: z.object({
    name: z.string(),
    tagline: z.string().nullable().optional(),
    logoLight: z.string().nullable().optional(),
    logoDark: z.string().nullable().optional(),
    favicon: z.string().nullable().optional(),
    theme: themeSchema.optional(),
    integrations: integrationsSchema.partial().optional(),
    customCss: z.string().nullable().optional(),
    headScripts: z.string().nullable().optional(),
    bodyScripts: z.string().nullable().optional(),
    defaultLocale: z.string().optional(),
  }).optional(),

  postTypes: z.array(z.object({
    slug: z.string(),
    name: z.string(),
    plural: z.string(),
    icon: z.string().optional(),
    description: z.string().nullable().optional(),
    supports: supportsSchema.optional(),
    publicSingle: z.boolean().optional(),
    publicArchive: z.boolean().optional(),
    showInMenu: z.boolean().optional(),
    menuPosition: z.number().int().optional(),
  })).optional(),

  taxonomies: z.array(z.object({
    slug: z.string(),
    name: z.string(),
    plural: z.string(),
    hierarchical: z.boolean().optional(),
    postTypeSlug: z.string().nullable().optional(),
    terms: z.array(z.object({
      slug: z.string(),
      name: z.string(),
      description: z.string().nullable().optional(),
    })).optional(),
  })).optional(),

  pages: z.array(z.object({
    slug: z.string(),
    title: z.string(),
    isHomepage: z.boolean().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'PRIVATE', 'TRASH']).optional(),
    content: pageContentSchema,
    // Page-level settings (es. hideHeader/hideFooter per landing con chrome proprio)
    settings: z.record(z.string(), z.unknown()).nullable().optional(),
    seoTitle: z.string().nullable().optional(),
    seoDesc: z.string().nullable().optional(),
    ogImage: z.string().nullable().optional(),
    password: z.string().nullable().optional(),
  })).optional(),

  posts: z.array(z.object({
    postTypeSlug: z.string(),
    slug: z.string(),
    title: z.string(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'PRIVATE', 'SCHEDULED', 'TRASH']).optional(),
    excerpt: z.string().nullable().optional(),
    content: pageContentSchema.optional().nullable(),
    contentText: z.string().nullable().optional(),
    featured: z.string().nullable().optional(),
    seoTitle: z.string().nullable().optional(),
    seoDesc: z.string().nullable().optional(),
    ogImage: z.string().nullable().optional(),
    publishedAt: z.string().nullable().optional(),
    termSlugs: z.array(z.string()).optional(), // riferimenti tassonomie per slug
  })).optional(),

  themeBlocks: z.array(z.object({
    kind: z.enum(['HEADER', 'FOOTER']),
    name: z.string(),
    content: pageContentSchema,
    conditions: conditionsSchema.optional(),
    priority: z.number().int().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  })).optional(),

  popups: z.array(z.object({
    name: z.string(),
    content: pageContentSchema,
    trigger: triggerSchema,
    conditions: conditionsSchema.optional(),
    settings: popupSettingsSchema.partial().optional(),
    priority: z.number().int().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  })).optional(),

  redirects: z.array(z.object({
    fromPath: z.string(),
    toPath: z.string(),
    type: z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]).optional(),
    enabled: z.boolean().optional(),
  })).optional(),

  forms: z.array(z.object({
    name: z.string(),
    description: z.string().nullable().optional(),
    fields: z.array(z.unknown()),
    actions: z.array(z.unknown()).optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
    status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']).optional(),
  })).optional(),
});

export type SiteBlueprint = z.infer<typeof siteBlueprintSchema>;
