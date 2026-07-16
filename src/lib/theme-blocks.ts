import { z } from 'zod';
import { prisma } from './db';
import { cached, CACHE_TAGS, revalidateContent } from './cache';
import type { PageContent } from './widgets-schema';

/**
 * Display conditions per theme blocks (header/footer/popup).
 *
 * Esempi:
 * { include: [{type:'all-site'}], exclude: [{type:'page-slug', slug:'landing-bf'}] }
 *   → applica ovunque tranne sulla landing.
 * { include: [{type:'homepage'}, {type:'url-prefix', prefix:'/blog'}], exclude:[] }
 *   → applica su homepage e tutto /blog/*.
 */
export const conditionRuleSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('all-site') }),
  z.object({ type: z.literal('homepage') }),
  z.object({ type: z.literal('not-homepage') }),
  z.object({ type: z.literal('page-slug'), slug: z.string() }),
  z.object({ type: z.literal('url-prefix'), prefix: z.string() }),
  z.object({ type: z.literal('url-exact'), path: z.string() }),
  z.object({ type: z.literal('url-regex'), pattern: z.string() }),
  z.object({ type: z.literal('role'), role: z.enum(['ADMIN', 'EDITOR', 'VIEWER', 'guest']) }),
  z.object({ type: z.literal('logged-in') }),
  z.object({ type: z.literal('logged-out') }),
  z.object({ type: z.literal('device'), device: z.enum(['desktop', 'tablet', 'mobile']) }),
]);

export type ConditionRule = z.infer<typeof conditionRuleSchema>;

export const conditionsSchema = z.object({
  include: z.array(conditionRuleSchema).default([{ type: 'all-site' }]),
  exclude: z.array(conditionRuleSchema).default([]),
});

export type Conditions = z.infer<typeof conditionsSchema>;

export const DEFAULT_CONDITIONS: Conditions = { include: [{ type: 'all-site' }], exclude: [] };

export interface RenderContext {
  path: string;          // es: '/chi-siamo' o '/'
  isHomepage: boolean;
  pageSlug?: string;
  userRole?: string | null; // ADMIN/EDITOR/VIEWER o null per guest
  device?: 'desktop' | 'tablet' | 'mobile';
}

function ruleMatches(rule: ConditionRule, ctx: RenderContext): boolean {
  switch (rule.type) {
    case 'all-site': return true;
    case 'homepage': return ctx.isHomepage;
    case 'not-homepage': return !ctx.isHomepage;
    case 'page-slug': return ctx.pageSlug === rule.slug;
    case 'url-prefix': return ctx.path.startsWith(rule.prefix);
    case 'url-exact': return ctx.path === rule.path;
    case 'url-regex':
      try { return new RegExp(rule.pattern).test(ctx.path); }
      catch { return false; }
    case 'role':
      if (rule.role === 'guest') return !ctx.userRole;
      return ctx.userRole === rule.role;
    case 'logged-in': return !!ctx.userRole;
    case 'logged-out': return !ctx.userRole;
    case 'device': return ctx.device === rule.device;
  }
}

export function matchesConditions(conditions: Conditions, ctx: RenderContext): boolean {
  const includeOk = conditions.include.length === 0 || conditions.include.some((r) => ruleMatches(r, ctx));
  if (!includeOk) return false;
  const excluded = conditions.exclude.some((r) => ruleMatches(r, ctx));
  return !excluded;
}

export interface ThemeBlockResolved {
  id: string;
  kind: 'HEADER' | 'FOOTER';
  name: string;
  content: PageContent;
  conditions: Conditions;
  priority: number;
}

/**
 * Restituisce TUTTI i theme-block pubblicati di un certo tipo.
 * Cached per 60s (invalidato su save).
 */
async function getAllPublishedThemeBlocks(kind: 'HEADER' | 'FOOTER'): Promise<ThemeBlockResolved[]> {
  return cached(`${CACHE_TAGS.themeBlocks}:${kind}`, async () => {
    const rows = await prisma.themeBlock.findMany({
      where: { kind, status: 'PUBLISHED' },
      orderBy: { priority: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      name: r.name,
      content: r.content as unknown as PageContent,
      conditions: conditionsSchema.parse(r.conditions),
      priority: r.priority,
    }));
  }, 60_000);
}

/**
 * Risolve l'unico header/footer attivo per il context corrente.
 * Strategia: il primo blocco (priority desc) le cui conditions matchano.
 */
export async function resolveActiveThemeBlock(
  kind: 'HEADER' | 'FOOTER',
  ctx: RenderContext,
): Promise<ThemeBlockResolved | null> {
  const all = await getAllPublishedThemeBlocks(kind);
  return all.find((b) => matchesConditions(b.conditions, ctx)) ?? null;
}

export function invalidateThemeBlocksCache(): void {
  revalidateContent(`${CACHE_TAGS.themeBlocks}:HEADER`, `${CACHE_TAGS.themeBlocks}:FOOTER`, CACHE_TAGS.themeBlocks);
}
