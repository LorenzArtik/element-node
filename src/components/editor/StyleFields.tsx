'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
      {manual ? 'controlli visuali' : 'manuale'}
    </button>
  );
}

/* ═══════════════ BORDO ═══════════════ */

const BORDER_STYLES = [
  { value: 'none', label: 'Nessuno' },
  { value: 'solid', label: 'Solido' },
  { value: 'dashed', label: 'Tratteggiato' },
  { value: 'dotted', label: 'Punteggiato' },
  { value: 'double', label: 'Doppio' },
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
  { value: 'none', label: 'Nessuna', css: '' },
  { value: 'light', label: 'Leggera', css: '0 1px 3px rgba(0,0,0,0.10)' },
  { value: 'medium', label: 'Media', css: '0 6px 18px rgba(0,0,0,0.12)' },
  { value: 'strong', label: 'Forte', css: '0 14px 34px rgba(0,0,0,0.22)' },
  { value: 'custom', label: 'Personalizzata', css: '' },
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
                <span className="mb-0.5 block text-[9px] uppercase text-muted-foreground">{k === 'blur' ? 'Sfoc.' : k === 'spread' ? 'Esp.' : k.toUpperCase()}</span>
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
            <Label className="text-[10px]">Interna (inset)</Label>
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

function parseGradient(v: string): Grad | null {
  const m = (v || '').match(/^linear-gradient\(\s*(-?\d+)deg\s*,\s*(.+?)\s+[\d.]+%?\s*,\s*(.+?)\s+[\d.]+%?\s*\)$/);
  if (m) return { angle: parseInt(m[1]), from: m[2].trim(), to: m[3].trim() };
  const m2 = (v || '').match(/^linear-gradient\(\s*(-?\d+)deg\s*,\s*([^,]+)\s*,\s*([^,]+)\s*\)$/);
  if (m2) return { angle: parseInt(m2[1]), from: m2[2].trim(), to: m2[3].trim() };
  return null;
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
        {([['none', 'Nessuno'], ['color', 'Colore'], ['gradient', 'Gradiente']] as const).map(([k, lbl]) => (
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
              <span className="mb-0.5 block text-[9px] uppercase text-muted-foreground">Da</span>
              <MiniColor value={g.from} onChange={(c) => emitGrad({ from: c })} />
            </div>
            <div>
              <span className="mb-0.5 block text-[9px] uppercase text-muted-foreground">A</span>
              <MiniColor value={g.to} onChange={(c) => emitGrad({ to: c })} />
            </div>
          </div>
          <div>
            <span className="mb-0.5 block text-[9px] uppercase text-muted-foreground">Angolo: {g.angle}°</span>
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
