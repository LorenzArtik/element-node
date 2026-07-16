'use client';

import { useEffect, useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@radix-ui/react-popover';

const POPULAR_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Source Sans 3', 'Raleway',
  'Nunito', 'Playfair Display', 'Merriweather', 'Lora', 'Oswald', 'Ubuntu', 'Mulish', 'Work Sans',
  'Manrope', 'Plus Jakarta Sans', 'DM Sans', 'Outfit', 'Space Grotesk', 'Bricolage Grotesque',
  'Roboto Mono', 'JetBrains Mono', 'Fira Code', 'IBM Plex Sans', 'IBM Plex Mono',
  'Bebas Neue', 'Anton', 'Caveat', 'Pacifico', 'Dancing Script',
  'system-ui', 'serif', 'sans-serif', 'monospace',
];

const SYSTEM_STACKS = ['system-ui', 'serif', 'sans-serif', 'monospace'];

/**
 * Carica un font Google Fonts nella head se non già presente.
 */
function loadGoogleFont(family: string) {
  if (SYSTEM_STACKS.includes(family)) return;
  const id = `gf-${family.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/\s+/g, '+')}:wght@300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}

export function FontPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Estrai famiglia primaria dallo stack (es. "Inter, system-ui, sans-serif" → "Inter")
  const primaryFamily = (value || '').split(',')[0].trim().replace(/['"]/g, '');

  // Carica preview di tutte le opzioni quando si apre il dropdown
  useEffect(() => {
    if (!open) return;
    POPULAR_FONTS.forEach(loadGoogleFont);
  }, [open]);

  // Carica il font selezionato globalmente
  useEffect(() => {
    if (primaryFamily) loadGoogleFont(primaryFamily);
  }, [primaryFamily]);

  function pick(family: string) {
    const isSystem = SYSTEM_STACKS.includes(family);
    const stack = isSystem ? family : `${family}, system-ui, sans-serif`;
    onChange(stack);
    setOpen(false);
    if (!isSystem) loadGoogleFont(family);
  }

  const filtered = search
    ? POPULAR_FONTS.filter((f) => f.toLowerCase().includes(search.toLowerCase()))
    : POPULAR_FONTS;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 border rounded-md bg-card text-sm hover:border-primary transition-colors"
      >
        <span style={{ fontFamily: value || 'inherit' }} className="truncate">{primaryFamily || 'Seleziona font...'}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 z-40 bg-card border rounded-md shadow-lg max-h-[400px] overflow-hidden flex flex-col">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cerca font Google..."
                  className="pl-8 h-8"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 max-h-80">
              {filtered.map((f) => {
                const active = primaryFamily === f;
                return (
                  <button
                    key={f}
                    onClick={() => pick(f)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent transition-colors ${active ? 'bg-accent' : ''}`}
                    style={{ fontFamily: SYSTEM_STACKS.includes(f) ? f : `"${f}", system-ui, sans-serif` }}
                  >
                    <span>{f}</span>
                    {active && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="p-6 text-center text-xs text-muted-foreground">Nessun font trovato</div>
              )}
            </div>
            <div className="p-2 border-t text-[10px] text-muted-foreground">
              Powered by Google Fonts (caricati on-demand)
            </div>
          </div>
        </>
      )}
    </div>
  );
}
