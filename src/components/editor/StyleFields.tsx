'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { t } from '@/lib/admin-i18n';

/**
 * Controlli stile Elementor per valori CSS espressi come stringa:
 * BorderField ("1px solid #rgba…"), ShadowField ("0 14px 34px rgba…"),
 * BackgroundField (colore piatto o linear-gradient). Parse best-effort dei
 * valori esistenti; se il valore non è riconoscibile si può sempre passare
 * alla modalità manuale (input raw) senza perdere nulla.
 */

/* ── color swatch + testo (compatto, riusabile) ── */
function MiniColor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const hexForPicker = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : '#000000';
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <input
        type="color"
        value={hexForPicker}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-8 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0.5"
      />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="#000 / rgba(…)" className="h-7 text-xs" />
    </div>
  );
}

function ManualToggle({ manual, setManual }: { manual: boolean; setManual: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => setManual(!manual)}
      className="text-[10px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
    >
      {manual ? t('controlli visuali', 'visual controls') : t('manuale', 'manual')}
    </button>
  );
}

/* ═══════════════ BORDO ═══════════════ */

const BORDER_STYLES = [
  { value: 'none', label: t('Nessuno', 'None') },
  { value: 'solid', label: t('Solido', 'Solid') },
  { value: 'dashed', label: t('Tratteggiato', 'Dashed') },
  { value: 'dotted', label: t('Punteggiato', 'Dotted') },
  { value: 'double', label: t('Doppio', 'Double') },
];

function parseBorder(v: string): { width: number; style: string; color: string } | null {
  const t = (v || '').trim();
  if (!t) return { width: 1, style: 'none', color: '#000000' };
  const m = t.match(/^(\d*\.?\d+)px\s+(solid|dashed|dotted|double)\s+(.+)$/i);
  if (!m) return null;
  return { width: parseFloat(m[1]), style: m[2].toLowerCase(), color: m[3].trim() };
}

export function BorderField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsed = useMemo(() => parseBorder(value), [value]);
  const [manual, setManual] = useState(parsed === null);
  const p = parsed ?? { width: 1, style: 'solid', color: '#000000' };

  const emit = (patch: Partial<typeof p>) => {
    const next = { ...p, ...patch };
    onChange(next.style === 'none' ? '' : `${next.width}px ${next.style} ${next.color}`);
  };

  if (manual) {
    return (
      <div className="space-y-1">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="1px solid #e2e8f0" className="h-8 text-xs" />
        <ManualToggle manual setManual={setManual} />
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_72px] gap-1.5">
        <Select value={p.style} onValueChange={(s) => emit({ style: s })}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {BORDER_STYLES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0}
            value={p.width}
            onChange={(e) => emit({ width: Number(e.target.value) })}
            disabled={p.style === 'none'}
            className="h-7 text-xs"
          />
          <span className="text-[10px] text-muted-foreground">px</span>
        </div>
      </div>
      {p.style !== 'none' && <MiniColor value={p.color} onChange={(c) => emit({ color: c })} />}
      <ManualToggle manual={false} setManual={setManual} />
    </div>
  );
}

/* ═══════════════ OMBRA ═══════════════ */

interface Shadow { x: number; y: number; blur: number; spread: number; color: string; inset: boolean }

const SHADOW_PRESETS: { value: string; label: string; css: string }[] = [
  { value: 'none', label: t('Nessuna', 'None'), css: '' },
  { value: 'light', label: t('Leggera', 'Light'), css: '0 1px 3px rgba(0,0,0,0.10)' },
  { value: 'medium', label: t('Media', 'Medium'), css: '0 6px 18px rgba(0,0,0,0.12)' },
  { value: 'strong', label: t('Forte', 'Strong'), css: '0 14px 34px rgba(0,0,0,0.22)' },
  { value: 'custom', label: t('Personalizzata', 'Custom'), css: '' },
];

function parseShadow(v: string): Shadow | null {
  const t = (v || '').trim();
  if (!t) return { x: 0, y: 6, blur: 18, spread: 0, color: 'rgba(0,0,0,0.12)', inset: false };
  const inset = /\binset\b/.test(t);
  const body = t.replace(/\binset\b/, '').trim();
  const m = body.match(/^(-?\d*\.?\d+)(?:px)?\s+(-?\d*\.?\d+)(?:px)?\s+(-?\d*\.?\d+)(?:px)?(?:\s+(-?\d*\.?\d+)(?:px)?)?\s+(.+)$/);
  if (!m) return null;
  return { x: parseFloat(m[1]), y: parseFloat(m[2]), blur: parseFloat(m[3]), spread: m[4] ? parseFloat(m[4]) : 0, color: m[5].trim(), inset };
}

function shadowCss(s: Shadow): string {
  return `${s.inset ? 'inset ' : ''}${s.x}px ${s.y}px ${s.blur}px${s.spread ? ` ${s.spread}px` : ''} ${s.color}`;
}

export function ShadowField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsed = useMemo(() => parseShadow(value), [value]);
  const [manual, setManual] = useState(parsed === null);
  const [custom, setCustom] = useState(false);
  const s = parsed ?? { x: 0, y: 6, blur: 18, spread: 0, color: 'rgba(0,0,0,0.12)', inset: false };

  const activePreset = useMemo(() => {
    if (!value?.trim()) return 'none';
    const hit = SHADOW_PRESETS.find((pz) => pz.css === value.trim());
    return hit ? hit.value : 'custom';
  }, [value]);

  if (manual) {
    return (
      <div className="space-y-1">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="0 6px 18px rgba(0,0,0,0.12)" className="h-8 text-xs" />
        <ManualToggle manual setManual={setManual} />
      </div>
    );
  }

  const showCustom = custom || activePreset === 'custom';

  return (
    <div className="space-y-2">
      <Select
        value={activePreset}
        onValueChange={(pv) => {
          if (pv === 'custom') { setCustom(true); onChange(shadowCss(s)); return; }
          setCustom(false);
          onChange(SHADOW_PRESETS.find((z) => z.value === pv)?.css ?? '');
        }}
      >
        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {SHADOW_PRESETS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>

      {showCustom && (
        <div className="space-y-2 rounded-md border p-2">
          <div className="grid grid-cols-4 gap-1.5">
            {(['x', 'y', 'blur', 'spread'] as const).map((k) => (
              <div key={k}>
                <span className="mb-0.5 block text-[9px] uppercase text-muted-foreground">{k === 'blur' ? t('Sfoc.', 'Blur') : k === 'spread' ? t('Esp.', 'Spread') : k.toUpperCase()}</span>
                <Input
                  type="number"
                  value={s[k]}
                  onChange={(e) => onChange(shadowCss({ ...s, [k]: Number(e.target.value) }))}
                  className="h-7 px-1.5 text-xs"
                />
              </div>
            ))}
          </div>
          <MiniColor value={s.color} onChange={(c) => onChange(shadowCss({ ...s, color: c }))} />
          <div className="flex items-center justify-between">
            <Label className="text-[10px]">{t('Interna (inset)', 'Inner (inset)')}</Label>
            <Switch checked={s.inset} onCheckedChange={(v) => onChange(shadowCss({ ...s, inset: v }))} />
          </div>
        </div>
      )}
      <ManualToggle manual={false} setManual={setManual} />
    </div>
  );
}

/* ═══════════════ SFONDO ═══════════════ */

interface Grad { angle: number; from: string; to: string }

/** Split sulle virgole di primo livello (ignora quelle dentro rgba()/hsl()). */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

function parseGradient(v: string): Grad | null {
  const m = (v || '').trim().match(/^linear-gradient\((.+)\)$/s);
  if (!m) return null;
  const parts = splitTop(m[1]);
  if (parts.length < 3) return null;
  const am = parts[0].match(/^(-?\d+(?:\.\d+)?)deg$/);
  if (!am) return null;
  const stripStop = (s: string) => s.replace(/\s+[\d.]+%$/, '').trim();
  // multi-stop: prendiamo primo e ultimo colore (i controlli gestiscono 2 stop)
  return { angle: Math.round(parseFloat(am[1])), from: stripStop(parts[1]), to: stripStop(parts[parts.length - 1]) };
}

export function BackgroundField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const grad = useMemo(() => parseGradient(value), [value]);
  const isGradient = !!grad;
  const isColor = !isGradient && !!value?.trim() && !value.includes('(');
  const unparseable = !!value?.trim() && !isGradient && !isColor;
  const [manual, setManual] = useState(unparseable);
  const [tab, setTab] = useState<'none' | 'color' | 'gradient'>(isGradient ? 'gradient' : isColor ? 'color' : 'none');
  const g = grad ?? { angle: 160, from: '#16264A', to: '#0B1B3A' };

  const emitGrad = (patch: Partial<Grad>) => {
    const next = { ...g, ...patch };
    onChange(`linear-gradient(${next.angle}deg, ${next.from} 0%, ${next.to} 100%)`);
  };

  if (manual) {
    return (
      <div className="space-y-1">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="#0f172a / linear-gradient(…)" className="h-8 text-xs" />
        <ManualToggle manual setManual={setManual} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1 rounded-md border p-0.5">
        {([['none', t('Nessuno', 'None')], ['color', t('Colore', 'Color')], ['gradient', t('Gradiente', 'Gradient')]] as const).map(([k, lbl]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setTab(k);
              if (k === 'none') onChange('');
              if (k === 'color') onChange(isColor ? value : '#f8fafc');
              if (k === 'gradient') emitGrad({});
            }}
            className={`rounded px-1 py-1 text-[10px] font-medium transition-colors ${
              tab === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {tab === 'color' && <MiniColor value={isColor ? value : '#f8fafc'} onChange={onChange} />}

      {tab === 'gradient' && (
        <div className="space-y-2 rounded-md border p-2">
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <span className="mb-0.5 block text-[9px] uppercase text-muted-foreground">{t('Da', 'From')}</span>
              <MiniColor value={g.from} onChange={(c) => emitGrad({ from: c })} />
            </div>
            <div>
              <span className="mb-0.5 block text-[9px] uppercase text-muted-foreground">{t('A', 'To')}</span>
              <MiniColor value={g.to} onChange={(c) => emitGrad({ to: c })} />
            </div>
          </div>
          <div>
            <span className="mb-0.5 block text-[9px] uppercase text-muted-foreground">{t('Angolo', 'Angle')}: {g.angle}°</span>
            <input
              type="range"
              min={0}
              max={360}
              value={g.angle}
              onChange={(e) => emitGrad({ angle: Number(e.target.value) })}
              className="w-full"
            />
          </div>
          <div className="h-6 rounded" style={{ background: `linear-gradient(${g.angle}deg, ${g.from} 0%, ${g.to} 100%)` }} />
        </div>
      )}
      <ManualToggle manual={false} setManual={setManual} />
    </div>
  );
}
