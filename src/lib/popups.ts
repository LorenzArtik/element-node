import { z } from 'zod';
import { prisma } from './db';
import { cached, invalidate } from './cache';
import { conditionsSchema, matchesConditions, type RenderContext } from './theme-blocks';
import type { PageContent } from './widgets-schema';

export const triggerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('page-load'), delayMs: z.number().int().min(0).max(120_000).default(1000) }),
  z.object({ type: z.literal('scroll-percent'), percent: z.number().int().min(1).max(100).default(50) }),
  z.object({ type: z.literal('exit-intent') }),
  z.object({ type: z.literal('click-selector'), selector: z.string().min(1) }),
  z.object({ type: z.literal('inactivity'), idleMs: z.number().int().min(1_000).max(600_000).default(30_000) }),
  z.object({ type: z.literal('after-seconds'), seconds: z.number().int().min(1).max(600).default(15) }),
]);
export type Trigger = z.infer<typeof triggerSchema>;

export const popupSettingsSchema = z.object({
  width: z.string().default('480px'),
  maxWidth: z.string().default('92vw'),
  height: z.string().default('auto'),
  maxHeight: z.string().default('85vh'),
  position: z.enum(['center', 'top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right']).default('center'),
  overlayColor: z.string().default('rgba(0,0,0,0.6)'),
  overlayBlur: z.string().default('4px'),
  animation: z.enum(['fade', 'zoom', 'slide-up', 'slide-down', 'none']).default('zoom'),
  borderRadius: z.string().default('16px'),
  dismissible: z.boolean().default(true),
  closeOnEscape: z.boolean().default(true),
  closeOnOverlay: z.boolean().default(true),
  // Frequency cap: dopo essere chiuso una volta, non riapparire per N millisecondi (per utente, via localStorage)
  frequencyMs: z.number().int().min(0).max(31_536_000_000).default(86_400_000), // default: 1 giorno
});
export type PopupSettings = z.infer<typeof popupSettingsSchema>;

export const DEFAULT_POPUP_SETTINGS: PopupSettings = popupSettingsSchema.parse({});

export interface PopupResolved {
  id: string;
  name: string;
  content: PageContent;
  trigger: Trigger;
  conditions: ReturnType<typeof conditionsSchema.parse>;
  settings: PopupSettings;
  priority: number;
}

const CACHE_KEY = 'popups:active';

async function getPublishedPopups(): Promise<PopupResolved[]> {
  return cached(CACHE_KEY, async () => {
    const rows = await prisma.popup.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { priority: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      content: r.content as unknown as PageContent,
      trigger: triggerSchema.parse(r.trigger),
      conditions: conditionsSchema.parse(r.conditions),
      settings: popupSettingsSchema.parse(r.settings),
      priority: r.priority,
    }));
  }, 60_000);
}

export async function resolveActivePopups(ctx: RenderContext): Promise<PopupResolved[]> {
  const all = await getPublishedPopups();
  return all.filter((p) => matchesConditions(p.conditions, ctx));
}

export function invalidatePopupsCache() {
  invalidate(CACHE_KEY);
}
