/**
 * Per-sub-element style controls per widget (pattern Elementor).
 * Ogni widget complesso dichiara i suoi "elementi figli" stilabili separatamente.
 * I valori sono salvati in `element.settings._styles[key]` e applicati dai render.
 */

import type { WidgetType } from './widgets-schema';

export type StyleControlGroup = 'typography' | 'color' | 'spacing' | 'background' | 'border' | 'shadow';

export interface SubElementStyle {
  /** Key sotto _styles, es. 'title' */
  key: string;
  /** Label visibile nel Pannello Stile */
  label: string;
  /** Quali gruppi di controlli mostrare */
  controls: StyleControlGroup[];
}

export const WIDGET_STYLE_SECTIONS: Partial<Record<WidgetType, SubElementStyle[]>> = {
  // ── Atomic widgets ──
  'heading': [
    { key: 'self', label: 'Titolo', controls: ['typography', 'color', 'spacing'] },
  ],
  'text': [
    { key: 'self', label: 'Paragrafo', controls: ['typography', 'color', 'spacing'] },
  ],
  'button': [
    { key: 'self', label: 'Bottone', controls: ['typography', 'color', 'spacing', 'background', 'border', 'shadow'] },
  ],
  'image': [
    { key: 'self', label: 'Immagine', controls: ['spacing', 'border', 'shadow'] },
  ],
  'icon': [
    { key: 'self', label: 'Icona', controls: ['color', 'spacing'] },
  ],
  // ── Composite widgets ──
  'icon-box': [
    { key: 'icon', label: 'Icona', controls: ['color', 'spacing', 'background', 'border'] },
    { key: 'title', label: 'Titolo', controls: ['typography', 'color', 'spacing'] },
    { key: 'text', label: 'Descrizione', controls: ['typography', 'color', 'spacing'] },
    { key: 'card', label: 'Card (wrapper)', controls: ['background', 'border', 'spacing', 'shadow'] },
  ],
  'image-box': [
    { key: 'image', label: 'Immagine', controls: ['border', 'shadow', 'spacing'] },
    { key: 'title', label: 'Titolo', controls: ['typography', 'color', 'spacing'] },
    { key: 'text', label: 'Descrizione', controls: ['typography', 'color', 'spacing'] },
    { key: 'card', label: 'Card (wrapper)', controls: ['background', 'border', 'spacing', 'shadow'] },
  ],
  'testimonial': [
    { key: 'card', label: 'Card', controls: ['background', 'border', 'spacing', 'shadow'] },
    { key: 'rating', label: 'Stelle rating', controls: ['color', 'spacing'] },
    { key: 'text', label: 'Testo citazione', controls: ['typography', 'color', 'spacing'] },
    { key: 'author', label: 'Autore', controls: ['typography', 'color'] },
    { key: 'role', label: 'Ruolo / data', controls: ['typography', 'color'] },
    { key: 'avatar', label: 'Avatar', controls: ['border', 'spacing'] },
  ],
  'call-to-action': [
    { key: 'wrapper', label: 'Sfondo wrapper', controls: ['background', 'border', 'spacing', 'shadow'] },
    { key: 'title', label: 'Titolo', controls: ['typography', 'color', 'spacing'] },
    { key: 'text', label: 'Descrizione', controls: ['typography', 'color', 'spacing'] },
    { key: 'cta', label: 'Bottone CTA', controls: ['typography', 'color', 'background', 'spacing', 'border', 'shadow'] },
  ],
  'price-table': [
    { key: 'card', label: 'Card', controls: ['background', 'border', 'spacing', 'shadow'] },
    { key: 'title', label: 'Nome piano', controls: ['typography', 'color'] },
    { key: 'subtitle', label: 'Sottotitolo', controls: ['typography', 'color'] },
    { key: 'price', label: 'Prezzo', controls: ['typography', 'color'] },
    { key: 'features', label: 'Lista features', controls: ['typography', 'color', 'spacing'] },
    { key: 'cta', label: 'Bottone CTA', controls: ['typography', 'color', 'background', 'border', 'spacing'] },
  ],
  'counter': [
    { key: 'number', label: 'Numero', controls: ['typography', 'color', 'spacing'] },
    { key: 'label', label: 'Label', controls: ['typography', 'color'] },
  ],
  'alert': [
    { key: 'self', label: 'Alert', controls: ['background', 'color', 'border', 'spacing', 'typography'] },
  ],
};

/** Helper per applicare uno SubElementStyle a un React.CSSProperties */
export function applySubStyle(
  styles: Record<string, unknown> | undefined,
  key: string,
): React.CSSProperties {
  const s = (styles?.[key] as Record<string, unknown>) ?? {};
  return {
    fontFamily: (s.fontFamily as string) || undefined,
    fontSize: (s.fontSize as string) || undefined,
    fontWeight: (s.fontWeight as string) || undefined,
    lineHeight: (s.lineHeight as string) || undefined,
    letterSpacing: (s.letterSpacing as string) || undefined,
    textTransform: (s.textTransform as React.CSSProperties['textTransform']) || undefined,
    textAlign: (s.textAlign as React.CSSProperties['textAlign']) || undefined,
    color: (s.color as string) || undefined,
    background: (s.background as string) || undefined,
    margin: (s.margin as string) || undefined,
    padding: (s.padding as string) || undefined,
    border: (s.border as string) || undefined,
    borderRadius: (s.borderRadius as string) || undefined,
    boxShadow: (s.boxShadow as string) || undefined,
  };
}
