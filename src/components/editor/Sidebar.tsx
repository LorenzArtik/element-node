'use client';

import { useEffect, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { WIDGETS, WIDGET_CATEGORIES, WidgetType, WidgetCategory, getWidgetsByCategory } from '@/lib/widgets-schema';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, LayoutGrid, Globe, Sparkles, ChevronDown, Grip, Lock } from 'lucide-react';
import { isWidgetLocked, requiredPlanFor, type LicenseTier } from '@/lib/license-features';
import { useEditor } from '@/lib/editor-store';
import { PropertyPanelContent } from './PropertyPanel';
import { GlobalsPanel } from './GlobalsPanel';

function WidgetCard({ type, tier }: { type: WidgetType; tier: LicenseTier }) {
  const w = WIDGETS[type];
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[w.icon] ?? LucideIcons.Box;
  const locked = isWidgetLocked(type, tier);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `widget-${type}`,
    data: { kind: 'new-widget', widgetType: type },
    disabled: locked,
  });

  if (locked) {
    return (
      <button
        onClick={() => window.open('https://elementnode.cloud/it/pricing', '_blank', 'noopener')}
        className="group relative flex flex-col items-center justify-center gap-1.5 p-3 rounded-md bg-card border border-transparent opacity-60 hover:opacity-100 hover:border-amber-300/60 transition-all select-none"
        title={`${w.label} — disponibile dal piano ${requiredPlanFor(type)}. Clicca per i piani.`}
      >
        <Lock className="absolute right-1.5 top-1.5 h-3 w-3 text-amber-500" />
        <Icon className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
        <div className="text-[11px] font-medium text-center leading-tight text-muted-foreground">{w.label}</div>
      </button>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`group cursor-grab active:cursor-grabbing flex flex-col items-center justify-center gap-1.5 p-3 rounded-md bg-card border border-transparent hover:border-[#92003b]/30 hover:shadow-[0_2px_8px_rgba(146,0,59,0.15)] transition-all select-none ${
        isDragging ? 'opacity-30' : ''
      }`}
      title={`${w.label} — trascina sul canvas`}
    >
      <Icon className="h-6 w-6 text-muted-foreground group-hover:text-[#92003b] transition-colors" strokeWidth={1.5} />
      <div className="text-[11px] font-medium text-center leading-tight text-muted-foreground group-hover:text-foreground">{w.label}</div>
    </div>
  );
}

function CategorySection({ category, widgets, tier }: { category: WidgetCategory; widgets: typeof WIDGETS[WidgetType][]; tier: LicenseTier }) {
  const [open, setOpen] = useState(true);
  const cat = WIDGET_CATEGORIES.find((c) => c.key === category);
  if (widgets.length === 0) return null;
  return (
    <div className="border-b border-[#e6e9ec]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-foreground bg-muted hover:bg-accent transition-colors"
      >
        <span className="flex items-center gap-1.5">
          {category === 'pro' && <Sparkles className="h-3 w-3 text-[#92003b]" />}
          {cat?.label}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-px bg-border p-px">
          {widgets.map((w) => <WidgetCard key={w.type} type={w.type} tier={tier} />)}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const selected = useEditor((s) => s.selected);
  const [forceList, setForceList] = useState(false);

  // Quando l'utente seleziona qualcosa di nuovo, esci dalla "modalità widgets forzata"
  // e mostra automaticamente le proprietà del nuovo elemento.
  useEffect(() => {
    if (selected) setForceList(false);
  }, [selected]);

  const showProperties = !!selected && !forceList;

  return (
    <aside className="w-[300px] bg-muted border-r border-border flex flex-col shrink-0">
      {showProperties ? (
        <>
          <button
            onClick={() => setForceList(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b border-border bg-card hover:bg-accent transition-colors group"
            title="Torna alla lista widget"
          >
            <Grip className="h-3.5 w-3.5 text-[#92003b]" />
            <span className="text-foreground">Widget</span>
            <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground group-hover:text-foreground">← Indietro</span>
          </button>
          <PropertyPanelContent />
        </>
      ) : (
        <WidgetsListView />
      )}
    </aside>
  );
}

function WidgetsListView() {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'elements' | 'globals'>('elements');
  const [tier, setTier] = useState<LicenseTier>('full');
  useEffect(() => {
    fetch('/api/admin/license-tier')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.tier) setTier(j.tier as LicenseTier); })
      .catch(() => { /* fail-open: senza risposta non blocchiamo nulla */ });
  }, []);
  const allWidgets = Object.values(WIDGETS);
  const filtered = allWidgets.filter((w) => w.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="flex border-b border-border bg-card">
        <button
          onClick={() => setTab('elements')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
            tab === 'elements'
              ? 'text-[#92003b] border-b-2 border-[#92003b]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5" /> Elementi
        </button>
        <button
          onClick={() => setTab('globals')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors ${
            tab === 'globals'
              ? 'text-[#92003b] border-b-2 border-[#92003b]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Globe className="h-3.5 w-3.5" /> Globali
        </button>
      </div>

      {tab === 'elements' && (
        <>
          <div className="p-3 border-b border-border bg-card">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cerca widget..."
                className="pl-8 h-9 bg-muted/50 border-border text-sm"
              />
            </div>
          </div>

          {!q && (
            <div className="p-3 border-b border-border bg-card">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Struttura</div>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((n) => <SectionCard key={n} cols={n} />)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">Click o trascina sul canvas</p>
            </div>
          )}

          <ScrollArea className="flex-1">
            {q ? (
              <div className="p-px grid grid-cols-2 gap-px bg-border">
                {filtered.map((w) => <WidgetCard key={w.type} type={w.type} tier={tier} />)}
                {filtered.length === 0 && (
                  <div className="col-span-2 p-8 text-center text-xs text-muted-foreground">Nessun risultato per &ldquo;{q}&rdquo;</div>
                )}
              </div>
            ) : (
              <>
                {WIDGET_CATEGORIES.map((cat) => (
                  <CategorySection key={cat.key} category={cat.key} widgets={getWidgetsByCategory(cat.key)} tier={tier} />
                ))}
              </>
            )}
          </ScrollArea>
        </>
      )}

      {tab === 'globals' && <GlobalsPanel />}
    </>
  );
}

function StructureIcon({ cols }: { cols: number }) {
  return (
    <div className="flex gap-0.5 w-7 h-5">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="flex-1 bg-[#6d7882]" />
      ))}
    </div>
  );
}

function SectionCard({ cols }: { cols: number }) {
  const addSection = useEditor((s) => s.addSection);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `new-section-${cols}`,
    data: { kind: 'new-section', columns: cols },
  });
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => addSection(cols)}
      className={`aspect-square flex items-center justify-center rounded border border-border hover:border-[#92003b] hover:bg-[#92003b]/5 transition-colors cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}
      title={`Trascina o clicca per aggiungere ${cols} colonn${cols === 1 ? 'a' : 'e'}`}
    >
      <StructureIcon cols={cols} />
    </button>
  );
}
