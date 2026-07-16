'use client';

import { useState, useEffect, useMemo } from 'react';
import { Link2, Unlink } from 'lucide-react';
import { Input } from '@/components/ui/input';

/**
 * Controllo CSS multi-side stile Elementor (padding/margin/border-radius).
 *
 * UI:
 * - 4 input solo numerici (T R B L oppure TL TR BR BL)
 * - Selettore unità globale (px/em/rem/%/vw/vh) a destra
 * - Pulsante link che sincronizza tutti i lati
 *
 * Output stringa CSS, es. "10px 20px 10px 20px" o "10px" se all uguali e linked.
 * Importante: l'input mostra SOLO il numero, l'unità è gestita dal select separato.
 */
const UNITS = ['px', 'em', 'rem', '%', 'vw', 'vh'] as const;
type Unit = (typeof UNITS)[number];

interface Props {
  value: string;
  onChange: (v: string) => void;
  labels?: [string, string, string, string];
  placeholder?: string;
}

const DEFAULT_LABELS_TRBL: [string, string, string, string] = ['T', 'R', 'B', 'L'];

const NUM_RE = /^(-?\d*\.?\d*)/;
const UNIT_RE = /(px|em|rem|%|vw|vh)$/i;

function splitNumUnit(token: string): { num: string; unit: Unit | null } {
  if (!token.trim()) return { num: '', unit: null };
  const m = token.match(UNIT_RE);
  const unit = (m?.[1].toLowerCase() ?? null) as Unit | null;
  const numMatch = token.match(NUM_RE);
  const num = numMatch?.[1] ?? '';
  return { num, unit };
}

interface Parsed { values: [string, string, string, string]; unit: Unit }

function parseValue(v: string): Parsed {
  const trimmed = (v || '').trim();
  if (!trimmed) return { values: ['', '', '', ''], unit: 'px' };
  const tokens = trimmed.split(/\s+/);
  let detectedUnit: Unit = 'px';
  for (const t of tokens) {
    const { unit } = splitNumUnit(t);
    if (unit) { detectedUnit = unit; break; }
  }
  const parts = tokens.map((t) => splitNumUnit(t).num);
  let values: [string, string, string, string];
  if (parts.length === 1) values = [parts[0], parts[0], parts[0], parts[0]];
  else if (parts.length === 2) values = [parts[0], parts[1], parts[0], parts[1]];
  else if (parts.length === 3) values = [parts[0], parts[1], parts[2], parts[1]];
  else values = [parts[0] ?? '', parts[1] ?? '', parts[2] ?? '', parts[3] ?? ''];
  return { values, unit: detectedUnit };
}

function buildValue(values: [string, string, string, string], unit: Unit, linked: boolean): string {
  const formatted = values.map((v) => v === '' ? '' : `${v}${unit}`);
  if (linked) return formatted[0] || '';
  if (formatted.every((p) => p === formatted[0]) && formatted[0]) return formatted[0];
  if (formatted[0] === formatted[2] && formatted[1] === formatted[3] && formatted[0] && formatted[1]) {
    return `${formatted[0]} ${formatted[1]}`;
  }
  return formatted.map((p) => p || '0').join(' ');
}

export function DimensionsField({ value, onChange, labels = DEFAULT_LABELS_TRBL, placeholder = '0' }: Props) {
  const parsed = useMemo(() => parseValue(value), [value]);
  const allSame = parsed.values[0] === parsed.values[1] && parsed.values[1] === parsed.values[2] && parsed.values[2] === parsed.values[3];
  const [linked, setLinked] = useState(allSame);
  const [values, setValues] = useState<[string, string, string, string]>(parsed.values);
  const [unit, setUnit] = useState<Unit>(parsed.unit);

  useEffect(() => {
    const next = parseValue(value);
    if (next.values.join('|') !== values.join('|')) setValues(next.values);
    if (next.unit !== unit) setUnit(next.unit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function commit(newValues: [string, string, string, string], newUnit: Unit, isLinked: boolean) {
    onChange(buildValue(newValues, newUnit, isLinked));
  }

  function setOne(idx: number, raw: string) {
    // SOLO numeri (anche negativi e decimali). Niente "px" automatico.
    const cleaned = raw.replace(/[^\d.\-]/g, '');
    if (linked) {
      const next: [string, string, string, string] = [cleaned, cleaned, cleaned, cleaned];
      setValues(next);
      commit(next, unit, true);
    } else {
      const next = [...values] as [string, string, string, string];
      next[idx] = cleaned;
      setValues(next);
      commit(next, unit, false);
    }
  }

  function changeUnit(u: Unit) {
    setUnit(u);
    commit(values, u, linked);
  }

  function toggleLink() {
    if (!linked) {
      const t = values[0] || values[1] || values[2] || values[3] || '';
      const next: [string, string, string, string] = [t, t, t, t];
      setValues(next);
      commit(next, unit, true);
    }
    setLinked(!linked);
  }

  return (
    <div className="flex items-stretch gap-1.5">
      <div className="grid grid-cols-4 gap-1 flex-1">
        {values.map((v, i) => (
          <div key={i} className="relative">
            <Input
              type="text"
              inputMode="decimal"
              value={v}
              onChange={(e) => setOne(i, e.target.value)}
              placeholder={placeholder}
              className="h-9 text-center text-xs px-1 pb-3.5"
            />
            <span className="absolute bottom-0.5 left-0 right-0 text-center text-[8px] uppercase tracking-wider text-muted-foreground pointer-events-none">
              {labels[i]}
            </span>
          </div>
        ))}
      </div>
      <select
        value={unit}
        onChange={(e) => changeUnit(e.target.value as Unit)}
        className="h-9 text-xs border border-input rounded-md px-1.5 bg-card hover:bg-accent transition-colors cursor-pointer"
        title="Unità di misura"
      >
        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
      </select>
      <button
        type="button"
        onClick={toggleLink}
        className={`h-9 w-9 flex items-center justify-center rounded-md border transition-colors shrink-0 ${
          linked ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-accent'
        }`}
        title={linked ? 'Lati linkati (clicca per scollegare)' : 'Lati indipendenti (clicca per linkare)'}
      >
        {linked ? <Link2 className="h-3.5 w-3.5" /> : <Unlink className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

/**
 * Slider con valore numerico + unit selezionabile.
 */
export function SliderWithUnit({
  value, onChange, min = 0, max = 200, step = 1, units = ['px', 'em', 'rem', '%'],
}: {
  value: string;
  onChange: (v: string) => void;
  min?: number; max?: number; step?: number;
  units?: string[];
}) {
  const num = parseFloat(value) || 0;
  const unit = (value || '').replace(/^[\d.\-]+/, '').trim() || units[0];
  return (
    <div className="flex items-center gap-2">
      <input type="range" min={min} max={max} step={step} value={num} onChange={(e) => onChange(`${e.target.value}${unit}`)} className="flex-1" />
      <Input type="number" value={num} onChange={(e) => onChange(`${e.target.value}${unit}`)} className="w-16 h-7 text-xs text-right" />
      <select value={unit} onChange={(e) => onChange(`${num}${e.target.value}`)} className="h-7 text-xs border rounded px-1 bg-card">
        {units.map((u) => <option key={u} value={u}>{u}</option>)}
      </select>
    </div>
  );
}
