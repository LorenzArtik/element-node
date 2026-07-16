'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Palette, Type, ExternalLink, Copy, Check, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { FontPicker } from '@/components/admin/FontPicker';

interface SiteTheme {
  colors: Record<string, string>;
  typography: {
    fontHeading: string; fontBody: string; fontMono: string;
    sizeBase: string; lineHeight?: string; headingLineHeight?: string;
    headingWeight?: string; bodyWeight?: string;
    headingTransform?: string; bodyTransform?: string;
    headingStyle?: string; bodyStyle?: string;
    headingLetterSpacing?: string; bodyLetterSpacing?: string;
    headingDecoration?: string;
    scale?: Record<string, string>;
  };
  layout?: Record<string, string>;
  radius?: Record<string, string>;
  buttons?: Record<string, string>;
  forms?: Record<string, string>;
}

const COLOR_LABELS: Record<string, string> = {
  primary: 'Primario',
  primaryHover: 'Primario hover',
  secondary: 'Secondario',
  accent: 'Accent',
  text: 'Testo',
  textMuted: 'Testo muted',
  textInverse: 'Testo inverso',
  background: 'Background',
  surface: 'Surface',
  border: 'Bordo',
  success: 'Success',
  warning: 'Warning',
  danger: 'Danger',
  info: 'Info',
  custom1: 'Custom 1',
  custom2: 'Custom 2',
  custom3: 'Custom 3',
};

export function GlobalsPanel() {
  const [theme, setTheme] = useState<SiteTheme | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch('/api/site/theme', { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setTheme(d.theme))
      .catch(() => {});
  }, []);

  function persist(next: SiteTheme) {
    setTheme(next);
    setDirty(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        const res = await fetch('/api/settings/site', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ theme: next }),
        });
        if (!res.ok) throw new Error();
        setDirty(false);
        // Aggiorna le CSS vars live nel DOM dell'editor
        applyVarsLive(next);
        toast.success('Globali salvati');
      } catch {
        toast.error('Errore salvataggio');
      } finally {
        setSaving(false);
      }
    }, 500);
  }

  function setColor(key: string, hex: string) {
    if (!theme) return;
    persist({ ...theme, colors: { ...theme.colors, [key]: hex } });
  }
  function setFont(key: 'fontHeading' | 'fontBody' | 'fontMono', v: string) {
    if (!theme) return;
    persist({ ...theme, typography: { ...theme.typography, [key]: v } });
  }
  function setTypoField(key: keyof SiteTheme['typography'], v: string) {
    if (!theme) return;
    persist({ ...theme, typography: { ...theme.typography, [key]: v } });
  }
  function setBaseSize(v: string) { setTypoField('sizeBase', v); }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success(`${text} copiato`);
    setTimeout(() => setCopied(null), 1500);
  }

  if (!theme) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Caricamento tema…
      </div>
    );
  }

  const colorEntries = Object.entries(theme.colors).filter(([k]) => COLOR_LABELS[k]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b bg-card flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tema globale</span>
        <div className="flex items-center gap-2">
          {saving && <Loader2 className="h-3 w-3 animate-spin text-[#92003b]" />}
          {!saving && dirty && <span className="text-[10px] text-amber-600">non salvato</span>}
          {!saving && !dirty && <Check className="h-3 w-3 text-emerald-500" />}
          <Link
            href="/admin/settings/site"
            target="_blank"
            className="flex items-center gap-1 text-[11px] text-[#92003b] hover:underline"
            title="Apri pagina completa"
          >
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {/* Palette colori — editabile con UX più chiara */}
        <div>
          <h4 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            <Palette className="h-3 w-3" /> Palette colori
          </h4>
          <p className="text-[10px] text-muted-foreground mb-2 px-1">Click sullo swatch per aprire il color picker, oppure modifica l&apos;hex.</p>
          <div className="space-y-1.5">
            {colorEntries.map(([key, hex]) => {
              const cssVar = `var(--en-color-${camelToKebab(key)})`;
              return (
                <div key={key} className="flex items-center gap-2 px-2 py-1.5 rounded border bg-card hover:border-[#92003b]/30 hover:shadow-sm transition-all group">
                  <label className="relative w-9 h-9 rounded-md border-2 shadow-sm shrink-0 cursor-pointer overflow-hidden hover:scale-105 transition-transform" style={{ background: hex, borderColor: 'rgba(0,0,0,.1)' }}>
                    <input
                      type="color"
                      value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : '#000000'}
                      onChange={(e) => setColor(key, e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title={`Modifica ${COLOR_LABELS[key]}`}
                    />
                  </label>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{COLOR_LABELS[key]}</div>
                    <input
                      type="text"
                      value={hex}
                      onChange={(e) => setColor(key, e.target.value)}
                      className="w-full text-[11px] font-mono bg-transparent text-muted-foreground border-0 p-0 focus:outline-none focus:text-foreground"
                    />
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
                    <button onClick={() => copy(hex, `${key}-hex`)} className="p-1 hover:bg-black/10 rounded" title="Copia hex">
                      {copied === `${key}-hex` ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                    <button onClick={() => copy(cssVar, `${key}-var`)} className="p-1 hover:bg-black/10 rounded" title={`Copia ${cssVar}`}>
                      <span className="text-[10px] font-mono">var()</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tipografia — pieni controlli per Heading e Body (Elementor-style) */}
        <div>
          <h4 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            <Type className="h-3 w-3" /> Tipografia
          </h4>
          <div className="space-y-3">
            <FontFieldFull
              label="Heading"
              family={theme.typography.fontHeading}
              weight={theme.typography.headingWeight ?? '700'}
              transform={theme.typography.headingTransform ?? 'none'}
              style={theme.typography.headingStyle ?? 'normal'}
              decoration={theme.typography.headingDecoration ?? 'none'}
              lineHeight={theme.typography.headingLineHeight ?? '1.2'}
              letterSpacing={theme.typography.headingLetterSpacing ?? 'normal'}
              onChangeFamily={(v) => setFont('fontHeading', v)}
              onChangeWeight={(v) => setTypoField('headingWeight', v)}
              onChangeTransform={(v) => setTypoField('headingTransform', v)}
              onChangeStyle={(v) => setTypoField('headingStyle', v)}
              onChangeDecoration={(v) => setTypoField('headingDecoration', v)}
              onChangeLineHeight={(v) => setTypoField('headingLineHeight', v)}
              onChangeLetterSpacing={(v) => setTypoField('headingLetterSpacing', v)}
              showDecoration
              sample="Aa Bb Cc"
              sizePx={22}
            />
            <FontFieldFull
              label="Body"
              family={theme.typography.fontBody}
              weight={theme.typography.bodyWeight ?? '400'}
              transform={theme.typography.bodyTransform ?? 'none'}
              style={theme.typography.bodyStyle ?? 'normal'}
              lineHeight={theme.typography.lineHeight ?? '1.6'}
              letterSpacing={theme.typography.bodyLetterSpacing ?? 'normal'}
              onChangeFamily={(v) => setFont('fontBody', v)}
              onChangeWeight={(v) => setTypoField('bodyWeight', v)}
              onChangeTransform={(v) => setTypoField('bodyTransform', v)}
              onChangeStyle={(v) => setTypoField('bodyStyle', v)}
              onChangeLineHeight={(v) => setTypoField('lineHeight', v)}
              onChangeLetterSpacing={(v) => setTypoField('bodyLetterSpacing', v)}
              sample="Lorem ipsum dolor sit amet"
              sizePx={14}
            />
            <FontFieldSimple
              label="Mono"
              family={theme.typography.fontMono}
              onChangeFamily={(v) => setFont('fontMono', v)}
              sample="const x = 42"
              sizePx={13}
            />
            <div className="flex items-center justify-between gap-2 px-1 pt-1 border-t">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Base size</label>
              <input
                type="text"
                value={theme.typography.sizeBase}
                onChange={(e) => setBaseSize(e.target.value)}
                className="w-20 px-2 py-1 text-xs font-mono bg-card border rounded focus:outline-none focus:ring-2 focus:ring-[#92003b]/40"
                placeholder="16px"
              />
            </div>
          </div>
        </div>

        <div className="text-[10px] text-muted-foreground border-t pt-3 leading-relaxed">
          Le modifiche si salvano in automatico (debounce 500ms). Le CSS vars vengono aggiornate live; ricarica il canvas per vedere i widget con stili agganciati alle var.
        </div>
      </div>
    </div>
  );
}

function FontFieldSimple({ label, family, onChangeFamily, sample, sizePx }: {
  label: string; family: string; onChangeFamily: (v: string) => void; sample: string; sizePx: number;
}) {
  return (
    <div className="border rounded-md p-2 bg-card">
      <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">{label}</div>
      <FontPicker value={family} onChange={onChangeFamily} />
      <div style={{ fontFamily: family, fontSize: sizePx }} className="truncate mt-2 px-1">{sample}</div>
    </div>
  );
}

const WEIGHTS = [
  { v: '100', l: '100 Thin' }, { v: '200', l: '200 Extra Light' }, { v: '300', l: '300 Light' },
  { v: '400', l: '400 Regular' }, { v: '500', l: '500 Medium' }, { v: '600', l: '600 SemiBold' },
  { v: '700', l: '700 Bold' }, { v: '800', l: '800 ExtraBold' }, { v: '900', l: '900 Black' },
];
const TRANSFORMS = [
  { v: 'none', l: 'Default' }, { v: 'uppercase', l: 'UPPERCASE' },
  { v: 'lowercase', l: 'lowercase' }, { v: 'capitalize', l: 'Capitalize' },
];
const STYLES = [{ v: 'normal', l: 'Normale' }, { v: 'italic', l: 'Corsivo' }];
const DECORATIONS = [
  { v: 'none', l: 'Nessuna' }, { v: 'underline', l: 'Sottolineato' },
  { v: 'line-through', l: 'Barrato' }, { v: 'overline', l: 'Soprallineato' },
];

function FontFieldFull(props: {
  label: string; family: string; weight: string; transform: string; style: string;
  decoration?: string; lineHeight: string; letterSpacing: string;
  onChangeFamily: (v: string) => void;
  onChangeWeight: (v: string) => void;
  onChangeTransform: (v: string) => void;
  onChangeStyle: (v: string) => void;
  onChangeDecoration?: (v: string) => void;
  onChangeLineHeight: (v: string) => void;
  onChangeLetterSpacing: (v: string) => void;
  showDecoration?: boolean;
  sample: string; sizePx: number;
}) {
  return (
    <div className="border rounded-md p-2.5 bg-card space-y-2">
      <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{props.label}</div>

      <SelectField label="Family">
        <FontPicker value={props.family} onChange={props.onChangeFamily} />
      </SelectField>

      <div className="grid grid-cols-2 gap-2">
        <SelectField label="Weight">
          <select value={props.weight} onChange={(e) => props.onChangeWeight(e.target.value)} className="w-full h-8 px-2 text-xs border rounded bg-card">
            {WEIGHTS.map((w) => <option key={w.v} value={w.v}>{w.l}</option>)}
          </select>
        </SelectField>
        <SelectField label="Style">
          <select value={props.style} onChange={(e) => props.onChangeStyle(e.target.value)} className="w-full h-8 px-2 text-xs border rounded bg-card">
            {STYLES.map((w) => <option key={w.v} value={w.v}>{w.l}</option>)}
          </select>
        </SelectField>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SelectField label="Transform">
          <select value={props.transform} onChange={(e) => props.onChangeTransform(e.target.value)} className="w-full h-8 px-2 text-xs border rounded bg-card">
            {TRANSFORMS.map((w) => <option key={w.v} value={w.v}>{w.l}</option>)}
          </select>
        </SelectField>
        {props.showDecoration && props.onChangeDecoration ? (
          <SelectField label="Decoration">
            <select value={props.decoration ?? 'none'} onChange={(e) => props.onChangeDecoration!(e.target.value)} className="w-full h-8 px-2 text-xs border rounded bg-card">
              {DECORATIONS.map((w) => <option key={w.v} value={w.v}>{w.l}</option>)}
            </select>
          </SelectField>
        ) : <div />}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SelectField label="Line height">
          <input type="text" value={props.lineHeight} onChange={(e) => props.onChangeLineHeight(e.target.value)} className="w-full h-8 px-2 text-xs font-mono border rounded bg-card" placeholder="1.4" />
        </SelectField>
        <SelectField label="Letter spacing">
          <input type="text" value={props.letterSpacing} onChange={(e) => props.onChangeLetterSpacing(e.target.value)} className="w-full h-8 px-2 text-xs font-mono border rounded bg-card" placeholder="normal o 0.05em" />
        </SelectField>
      </div>

      <div
        style={{
          fontFamily: props.family,
          fontWeight: props.weight as React.CSSProperties['fontWeight'],
          fontSize: props.sizePx,
          fontStyle: props.style,
          textTransform: props.transform as React.CSSProperties['textTransform'],
          textDecoration: props.decoration,
          lineHeight: props.lineHeight,
          letterSpacing: props.letterSpacing,
        }}
        className="px-1 py-2 mt-1 border-t truncate"
      >
        {props.sample}
      </div>
    </div>
  );
}

function SelectField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</div>
      {children}
    </div>
  );
}

/** Aggiorna le CSS variables live sul document, così l'editor riflette i cambi prima del refresh. */
function applyVarsLive(theme: SiteTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(theme.colors)) {
    root.style.setProperty(`--en-color-${camelToKebab(k)}`, v);
  }
  const t = theme.typography;
  if (t.fontHeading) root.style.setProperty('--en-font-heading', t.fontHeading);
  if (t.fontBody) root.style.setProperty('--en-font-body', t.fontBody);
  if (t.fontMono) root.style.setProperty('--en-font-mono', t.fontMono);
  if (t.sizeBase) root.style.setProperty('--en-size-base', t.sizeBase);
  if (t.headingWeight) root.style.setProperty('--en-heading-weight', t.headingWeight);
  if (t.bodyWeight) root.style.setProperty('--en-body-weight', t.bodyWeight);
  if (t.headingTransform) root.style.setProperty('--en-heading-transform', t.headingTransform);
  if (t.bodyTransform) root.style.setProperty('--en-body-transform', t.bodyTransform);
  if (t.headingStyle) root.style.setProperty('--en-heading-style', t.headingStyle);
  if (t.bodyStyle) root.style.setProperty('--en-body-style', t.bodyStyle);
  if (t.headingLineHeight) root.style.setProperty('--en-heading-line-height', t.headingLineHeight);
  if (t.lineHeight) root.style.setProperty('--en-line-height', t.lineHeight);
  if (t.headingLetterSpacing) root.style.setProperty('--en-heading-letter-spacing', t.headingLetterSpacing);
  if (t.bodyLetterSpacing) root.style.setProperty('--en-body-letter-spacing', t.bodyLetterSpacing);
  if (t.headingDecoration) root.style.setProperty('--en-heading-decoration', t.headingDecoration);
}

function camelToKebab(s: string): string {
  return s.replace(/[A-Z0-9]/g, (m) => `-${m.toLowerCase()}`);
}
