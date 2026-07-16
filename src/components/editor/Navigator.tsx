'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import * as LucideIcons from 'lucide-react';
import { useDraggable, useDroppable, useDndMonitor } from '@dnd-kit/core';
import { useEditor, type SelectedNode } from '@/lib/editor-store';
import { WIDGETS, type SectionNode, type ColumnNode, type ElementNode } from '@/lib/widgets-schema';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator,
} from '@/components/ui/context-menu';
import {
  X, Search, ChevronDown, ChevronRight, Eye, EyeOff, Trash2, Copy, ArrowUp, ArrowDown,
  Layers, Columns, Box, GripVertical, ChevronsUpDown, ChevronsDownUp,
} from 'lucide-react';

interface NavigatorProps { onClose: () => void }

/** Selects a node + scrolls the canvas to it. */
function selectAndScroll(setSelected: (s: SelectedNode) => void, sel: SelectedNode) {
  setSelected(sel);
  if (!sel) return;
  const id = sel.kind === 'element' ? sel.elementId
    : sel.kind === 'column' ? sel.columnId
    : sel.sectionId;
  // Aspetta un tick perché il DOM aggiorni la classe `selected` prima di scrollare
  requestAnimationFrame(() => {
    const node = document.querySelector(`[data-en-id="${id}"]`)
      || document.getElementById(`en-node-${id}`);
    if (node) (node as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

export function Navigator({ onClose }: NavigatorProps) {
  const content = useEditor((s) => s.content);
  const selected = useEditor((s) => s.selected);
  const select = useEditor((s) => s.select);
  const [q, setQ] = useState('');
  // expanded[id] = true → la riga è aperta; default tutto chiuso
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const selectedRowRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingSection, setIsDraggingSection] = useState(false);

  useDndMonitor({
    onDragStart: (e) => {
      const k = (e.active.data.current as { kind?: string } | undefined)?.kind;
      if (k === 'section' || k === 'new-section') setIsDraggingSection(true);
    },
    onDragEnd: () => setIsDraggingSection(false),
    onDragCancel: () => setIsDraggingSection(false),
  });

  function toggle(id: string) { setExpanded((c) => ({ ...c, [id]: !c[id] })); }
  function expandAll() {
    const all: Record<string, boolean> = {};
    for (const s of content.sections) { all[s.id] = true; for (const c of s.columns) all[c.id] = true; }
    setExpanded(all);
  }
  function collapseAll() { setExpanded({}); }

  const onSelect = useCallback((s: SelectedNode) => selectAndScroll(select, s), [select]);

  // Quando cambia la selezione (anche dal canvas): espandi i parent e scrolla
  useEffect(() => {
    if (!selected) return;
    setExpanded((c) => {
      const next = { ...c };
      if (selected.kind === 'element' || selected.kind === 'column') next[selected.sectionId] = true;
      if (selected.kind === 'element') next[selected.columnId] = true;
      return next;
    });
    requestAnimationFrame(() => {
      selectedRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const id = selected.kind === 'element' ? selected.elementId
        : selected.kind === 'column' ? selected.columnId
        : selected.sectionId;
      const node = document.querySelector(`[data-en-id="${id}"]`)
        || document.getElementById(`en-node-${id}`);
      if (node) (node as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.kind === 'element' ? selected.elementId
        : selected?.kind === 'column' ? selected.columnId
        : selected?.kind === 'section' ? selected.sectionId : null]);

  // Filtra ricorsivamente per query
  const matches = useMemo(() => {
    if (!q.trim()) return null;
    const lower = q.toLowerCase();
    const ids = new Set<string>();
    for (const sec of content.sections) {
      for (const col of sec.columns) {
        for (const el of col.elements) {
          const label = WIDGETS[el.type]?.label?.toLowerCase() ?? '';
          const t = (el.settings.text as string)?.toLowerCase() ?? '';
          const title = (el.settings.title as string)?.toLowerCase() ?? '';
          if (label.includes(lower) || t.includes(lower) || title.includes(lower) || el.type.toLowerCase().includes(lower)) {
            ids.add(sec.id); ids.add(col.id); ids.add(el.id);
          }
        }
      }
    }
    return ids;
  }, [q, content.sections]);

  return (
    <aside className="w-[300px] bg-card border-l flex flex-col shrink-0 z-30">
      <div className="px-3 py-2.5 border-b flex items-center justify-between bg-muted/40">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[#92003b]" />
          <span className="text-sm font-semibold">Navigatore</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={expandAll} className="p-1 hover:bg-accent rounded transition-colors" title="Espandi tutto">
            <ChevronsUpDown className="h-3.5 w-3.5" />
          </button>
          <button onClick={collapseAll} className="p-1 hover:bg-accent rounded transition-colors" title="Comprimi tutto">
            <ChevronsDownUp className="h-3.5 w-3.5" />
          </button>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded transition-colors ml-1" title="Chiudi">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="px-3 py-2 border-b bg-card">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca..."
            className="pl-8 h-9 text-sm bg-muted/50"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-1">
          {content.sections.length === 0 && (
            <div className="text-center py-12 text-xs text-muted-foreground">
              <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Nessuna sezione
            </div>
          )}
          {content.sections.length > 0 && <SectionDropZone index={0} active={isDraggingSection} />}
          {content.sections.map((sec, idx) => (
            <div key={sec.id}>
              <SectionRow
                section={sec}
                index={idx}
                total={content.sections.length}
                selected={selected}
                onSelect={onSelect}
                expanded={expanded}
                toggle={toggle}
                filter={matches}
                selectedRowRef={selectedRowRef}
              />
              <SectionDropZone index={idx + 1} active={isDraggingSection} />
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}

// ─── Section row ────────────────────────────────────────────────────────────
function SectionRow({
  section, index, total, selected, onSelect, expanded, toggle, filter, selectedRowRef,
}: {
  section: SectionNode;
  index: number;
  total: number;
  selected: SelectedNode;
  onSelect: (s: SelectedNode) => void;
  expanded: Record<string, boolean>;
  toggle: (id: string) => void;
  filter: Set<string> | null;
  selectedRowRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  const removeSection = useEditor((s) => s.removeSection);
  const duplicateSection = useEditor((s) => s.duplicateSection);
  const moveSection = useEditor((s) => s.moveSection);
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `nav-section-${section.id}`,
    data: { kind: 'section', sectionId: section.id },
  });
  const isOpen = !!expanded[section.id];
  const isSelected = selected?.kind === 'section' && selected.sectionId === section.id;
  const matched = !filter || filter.has(section.id);
  if (!matched) return null;

  const anchor = (section.settings.anchor as string) || '';
  const label = anchor ? `Sezione · #${anchor}` : `Sezione ${index + 1}`;

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={(node) => { setDragRef(node); if (isSelected && node) selectedRowRef.current = node; }}
            className={`group flex items-center gap-1 pl-1 pr-2 py-1.5 cursor-pointer text-sm border-l-2 transition-colors ${
              isSelected ? 'bg-[#92003b]/10 border-[#92003b]' : 'border-transparent hover:bg-accent'
            } ${isDragging ? 'opacity-30' : ''}`}
            onClick={() => onSelect({ kind: 'section', sectionId: section.id })}
          >
            <button
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              className="p-0.5 hover:bg-black/10 rounded cursor-grab active:cursor-grabbing"
              title="Trascina per spostare"
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); toggle(section.id); }} className="p-0.5 hover:bg-black/10 rounded">
              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            <Layers className="h-3.5 w-3.5 text-[#92003b]" />
            <span className="flex-1 truncate text-xs font-medium">{label}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">{section.columns.length}c</span>
            <RowActions
              onDuplicate={() => duplicateSection(section.id)}
              onDelete={() => removeSection(section.id)}
              onMoveUp={index > 0 ? () => moveSection(section.id, 'up') : undefined}
              onMoveDown={index < total - 1 ? () => moveSection(section.id, 'down') : undefined}
            />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onSelect({ kind: 'section', sectionId: section.id })}>
            Seleziona
          </ContextMenuItem>
          <ContextMenuItem onClick={() => duplicateSection(section.id)}>
            <Copy className="h-3.5 w-3.5 mr-2" /> Duplica
          </ContextMenuItem>
          {index > 0 && (
            <ContextMenuItem onClick={() => moveSection(section.id, 'up')}>
              <ArrowUp className="h-3.5 w-3.5 mr-2" /> Sposta sopra
            </ContextMenuItem>
          )}
          {index < total - 1 && (
            <ContextMenuItem onClick={() => moveSection(section.id, 'down')}>
              <ArrowDown className="h-3.5 w-3.5 mr-2" /> Sposta sotto
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => removeSection(section.id)} className="text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Elimina
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {isOpen && section.columns.map((col, ci) => (
        <ColumnRow
          key={col.id}
          column={col}
          sectionId={section.id}
          index={ci}
          total={section.columns.length}
          selected={selected}
          onSelect={onSelect}
          expanded={expanded}
          toggle={toggle}
          filter={filter}
          selectedRowRef={selectedRowRef}
        />
      ))}
    </div>
  );
}

// ─── Column row ────────────────────────────────────────────────────────────
function ColumnRow({
  column, sectionId, index, total, selected, onSelect, expanded, toggle, filter, selectedRowRef,
}: {
  column: ColumnNode;
  sectionId: string;
  index: number;
  total: number;
  selected: SelectedNode;
  onSelect: (s: SelectedNode) => void;
  expanded: Record<string, boolean>;
  toggle: (id: string) => void;
  filter: Set<string> | null;
  selectedRowRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  const removeColumn = useEditor((s) => s.removeColumn);
  const duplicateColumn = useEditor((s) => s.duplicateColumn);
  const isOpen = !!expanded[column.id];
  const isSelected = selected?.kind === 'column' && selected.columnId === column.id;
  const matched = !filter || filter.has(column.id);
  if (!matched) return null;

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={isSelected ? selectedRowRef : undefined}
            className={`group flex items-center gap-1 pl-6 pr-2 py-1.5 cursor-pointer text-sm border-l-2 transition-colors ${
              isSelected ? 'bg-[#2196f3]/10 border-[#2196f3]' : 'border-transparent hover:bg-accent'
            }`}
            onClick={() => onSelect({ kind: 'column', sectionId, columnId: column.id })}
          >
            <button onClick={(e) => { e.stopPropagation(); toggle(column.id); }} className="p-0.5 hover:bg-black/10 rounded">
              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
            <Columns className="h-3.5 w-3.5 text-[#2196f3]" />
            <span className="flex-1 truncate text-xs">Colonna {index + 1} · {column.width}%</span>
            <span className="text-[10px] text-muted-foreground shrink-0">{column.elements.length}e</span>
            <RowActions
              onDuplicate={() => duplicateColumn(sectionId, column.id)}
              onDelete={total > 1 ? () => removeColumn(sectionId, column.id) : undefined}
            />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => onSelect({ kind: 'column', sectionId, columnId: column.id })}>Seleziona</ContextMenuItem>
          <ContextMenuItem onClick={() => duplicateColumn(sectionId, column.id)}>
            <Copy className="h-3.5 w-3.5 mr-2" /> Duplica
          </ContextMenuItem>
          {total > 1 && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => removeColumn(sectionId, column.id)} className="text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Elimina
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
      {isOpen && column.elements.map((el) => (
        <ElementRow
          key={el.id}
          element={el}
          sectionId={sectionId}
          columnId={column.id}
          selected={selected}
          onSelect={onSelect}
          filter={filter}
          selectedRowRef={selectedRowRef}
        />
      ))}
    </div>
  );
}

// ─── Element row ────────────────────────────────────────────────────────────
function ElementRow({
  element, sectionId, columnId, selected, onSelect, filter, selectedRowRef,
}: {
  element: ElementNode;
  sectionId: string;
  columnId: string;
  selected: SelectedNode;
  onSelect: (s: SelectedNode) => void;
  filter: Set<string> | null;
  selectedRowRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  const removeElement = useEditor((s) => s.removeElement);
  const duplicateElement = useEditor((s) => s.duplicateElement);
  const update = useEditor((s) => s.updateElementSettings);
  const desc = WIDGETS[element.type];
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[desc?.icon ?? 'Box'] ?? Box;
  const isSelected = selected?.kind === 'element' && selected.elementId === element.id;
  const matched = !filter || filter.has(element.id);
  if (!matched) return null;

  // Visibility toggle: nasconde su tutti i device
  const hideOn = (element.settings._hideOn as string[]) ?? [];
  const hidden = hideOn.length === 3;
  function toggleVisibility(e: React.MouseEvent) {
    e.stopPropagation();
    update(sectionId, columnId, element.id, { _hideOn: hidden ? [] : ['desktop', 'tablet', 'mobile'] });
  }

  // Trova un'etichetta concisa (testo del widget se disponibile)
  const text = (element.settings.text as string) || (element.settings.title as string) || '';
  const preview = text.replace(/<[^>]+>/g, '').slice(0, 28);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={isSelected ? selectedRowRef : undefined}
          className={`group flex items-center gap-1.5 pl-10 pr-2 py-1.5 cursor-pointer text-sm border-l-2 transition-colors ${
            isSelected ? 'bg-[#92003b]/10 border-[#92003b]' : 'border-transparent hover:bg-accent'
          } ${hidden ? 'opacity-40' : ''}`}
          onClick={() => onSelect({ kind: 'element', sectionId, columnId, elementId: element.id })}
        >
          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="flex-1 truncate text-xs">
            <span className="font-medium">{desc?.label ?? element.type}</span>
            {preview && <span className="text-muted-foreground ml-1.5">— {preview}</span>}
          </span>
          <button
            onClick={toggleVisibility}
            className="p-0.5 hover:bg-black/10 rounded opacity-0 group-hover:opacity-100"
            title={hidden ? 'Mostra' : 'Nascondi'}
          >
            {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
          <RowActions
            onDuplicate={() => duplicateElement(sectionId, columnId, element.id)}
            onDelete={() => removeElement(sectionId, columnId, element.id)}
          />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onSelect({ kind: 'element', sectionId, columnId, elementId: element.id })}>Seleziona</ContextMenuItem>
        <ContextMenuItem onClick={() => duplicateElement(sectionId, columnId, element.id)}>
          <Copy className="h-3.5 w-3.5 mr-2" /> Duplica
        </ContextMenuItem>
        <ContextMenuItem onClick={(e) => toggleVisibility(e as unknown as React.MouseEvent)}>
          {hidden ? <Eye className="h-3.5 w-3.5 mr-2" /> : <EyeOff className="h-3.5 w-3.5 mr-2" />}
          {hidden ? 'Mostra' : 'Nascondi'}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => removeElement(sectionId, columnId, element.id)} className="text-destructive">
          <Trash2 className="h-3.5 w-3.5 mr-2" /> Elimina
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ─── Inline row actions (mostrate al hover) ─────────────────────────────────
function SectionDropZone({ index, active }: { index: number; active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `nav-insert-section-${index}`,
    data: { kind: 'insert-section', index },
  });
  // Quando NON c'è drag in corso → invisibile (h-0)
  // Drag in corso ma non hovered → barra evidente 12px con linea sottile #92003b
  // Hovered → barra 32px con bg colorato + linea bold
  const cls = !active
    ? 'h-0'
    : isOver
      ? 'h-10 bg-[#92003b]/15 border-y-2 border-dashed border-[#92003b]'
      : 'h-3 bg-[#92003b]/5 hover:bg-[#92003b]/10 border-y border-dashed border-[#92003b]/40';
  return (
    <div
      ref={setNodeRef}
      className={`relative mx-1 my-0.5 rounded transition-all duration-150 ${cls}`}
    >
      {active && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`flex items-center gap-1.5 transition-opacity ${isOver ? 'opacity-100' : 'opacity-0'}`}>
            <div className="h-0.5 w-full bg-[#92003b]" />
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#92003b] whitespace-nowrap px-2">
              Rilascia qui
            </div>
            <div className="h-0.5 w-full bg-[#92003b]" />
          </div>
        </div>
      )}
    </div>
  );
}

function RowActions({
  onDuplicate, onDelete, onMoveUp, onMoveDown,
}: {
  onDuplicate?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
      {onMoveUp && (
        <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="p-0.5 hover:bg-black/10 rounded" title="Sposta sopra">
          <ArrowUp className="h-3 w-3" />
        </button>
      )}
      {onMoveDown && (
        <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="p-0.5 hover:bg-black/10 rounded" title="Sposta sotto">
          <ArrowDown className="h-3 w-3" />
        </button>
      )}
      {onDuplicate && (
        <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-0.5 hover:bg-black/10 rounded" title="Duplica">
          <Copy className="h-3 w-3" />
        </button>
      )}
      {onDelete && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-0.5 hover:bg-destructive/20 rounded text-destructive" title="Elimina">
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
