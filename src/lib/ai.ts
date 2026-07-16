import Anthropic from '@anthropic-ai/sdk';
import { getSiteSettings } from './site-settings';

/**
 * Restituisce un client Anthropic usando come priorità:
 *   1. Site Settings (integrations.anthropicApiKey)
 *   2. process.env.ANTHROPIC_API_KEY
 *
 * Il client non è cached perché la chiave può cambiare a runtime via UI.
 */
export async function getAnthropic(): Promise<Anthropic> {
  let apiKey = process.env.ANTHROPIC_API_KEY ?? '';
  try {
    const s = await getSiteSettings();
    if (s.integrations.anthropicApiKey) apiKey = s.integrations.anthropicApiKey;
  } catch {}
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY non configurata. Impostala in /admin/settings/site → Integrazioni o nel .env');
  }
  return new Anthropic({ apiKey });
}

export async function getAiModel(): Promise<string> {
  try {
    const s = await getSiteSettings();
    if (s.integrations.anthropicModel) return s.integrations.anthropicModel;
  } catch {}
  return process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
}

// Backwards-compat: tools che importavano AI_MODEL come constante.
// Ora va usato `await getAiModel()`.
export const AI_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

export const SYSTEM_PROMPT_EDITOR = `Sei l'assistente AI integrato in Element Node, un CMS visuale moderno.
Il tuo compito è generare o modificare strutture di pagina rappresentate da JSON.

Schema:
- Sezione: { id, type: "section", settings: { padding, background, color, gap }, columns: [...] }
- Colonna: { id, type: "column", width: 1-100, settings: { align, padding, background }, elements: [...] }
- Elemento (widget): { id, type: <widget>, settings: {...} }

Widget disponibili e settings principali:
- heading: { text, tag (h1-h6), align, color, size, weight }
- text: { html, color, size, lineHeight, align }
- button: { text, url, target, align, style ("primary"|"secondary"|"outline"), size, fullWidth }
- image: { src, alt, width, height, align, caption }
- video: { src, type ("youtube"|"vimeo"|"mp4"), poster, autoplay, loop, controls }
- spacer: { height }
- divider: { color, weight, style }
- icon-box: { icon (lucide name), title, text, align, iconColor, iconSize }
- image-box: { image, title, text, align, link }
- testimonial: { text, author, role, avatar, rating }
- tabs: { items: [{ title, content (html) }], align }
- accordion: { items: [{ title, content (html) }] }
- counter: { from, to, duration, prefix, suffix, label }
- progress: { percent, label, color, height }
- html: { code }
- contact-form: { fields: [{ name, label, type, required }], submitText, recipient }
- posts-grid: { columns, count, category, showImage, showExcerpt }
- gallery: { images: [{ src, alt }], columns, gap }

Linee guida:
1. Genera ID univoci con prefisso semantico (es. "s_hero", "c_main", "e_title").
2. Privilegia copy in italiano se il prompt è in italiano.
3. Crea design moderni: spaziature generose, gerarchia visiva chiara.
4. Quando l'utente chiede una "sezione" tornala completa di columns ed elements.
5. Risposta SEMPRE in formato JSON valido, senza markdown fence, senza spiegazioni.

REGOLA FONDAMENTALE — EREDITÀ DAL BRAND:
Per "color", "size", "weight", "lineHeight", "background", "iconColor" lascia STRINGA VUOTA "" nei widget che ereditano dal brand globale (heading, text, icon-box, counter, progress, button, ecc.). L'utente potrà sovrascrivere il singolo widget dal pannello come fa Elementor.
- Specifica un colore SOLO se serve contrasto (testo bianco "#fff" su sfondo scuro), o se l'utente lo chiede.
- Per i pulsanti usa style:"primary"/"secondary"/"outline" (ereditano).
- Per sezioni con sfondo colorato USA CSS var: background:"var(--en-color-primary)", "var(--en-color-secondary)". NON hex hardcoded.

Esempio heading default (eredita dal brand):
{ "id":"e_t", "type":"heading", "settings":{ "text":"Titolo", "tag":"h1", "align":"center", "color":"", "size":"", "weight":"" } }

Esempio sezione hero scura (contrast esplicito):
{ "type":"section", "settings":{"padding":"80px 20px","background":"var(--en-color-secondary)","color":"#fff"}, "columns":[...] }`;

export interface AIGenerateRequest {
  prompt: string;
  context?: 'page' | 'section' | 'element';
  current?: unknown;
}
