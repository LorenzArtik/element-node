import { WIDGETS, type WidgetType } from './widgets-schema';

/**
 * Gate funzionalità per piano licenza (soft gate: blocca solo l'inserimento
 * di nuovi widget nell'editor — i contenuti esistenti restano sempre
 * modificabili e renderizzati).
 *
 * free      → widget base + theme (32)
 * essential → base + 9 widget Pro (41)
 * full      → tutti i 49 (Advanced, Expert, Agency e licenze legacy)
 */
export type LicenseTier = 'free' | 'essential' | 'full';

const ESSENTIAL_PRO_WIDGETS: WidgetType[] = [
  'hero',
  'posts-grid',
  'contact-form',
  'gallery',
  'social-icons',
];

const FULL_PLANS = ['ADVANCED', 'EXPERT', 'AGENCY', 'LICENSE', 'MANAGED'];

export function tierForPlan(plan: string, valid: boolean): LicenseTier {
  if (!valid) return 'free';
  if (plan === 'ESSENTIAL') return 'essential';
  if (FULL_PLANS.includes(plan)) return 'full';
  return 'free';
}

export function isWidgetLocked(type: WidgetType, tier: LicenseTier): boolean {
  if (tier === 'full') return false;
  if (WIDGETS[type]?.category !== 'pro') return false;
  return tier === 'free' || !ESSENTIAL_PRO_WIDGETS.includes(type);
}

/** Piano minimo che sblocca il widget (per il messaggio di upsell). */
export function requiredPlanFor(type: WidgetType): 'Essential' | 'Advanced' {
  return ESSENTIAL_PRO_WIDGETS.includes(type) ? 'Essential' : 'Advanced';
}
